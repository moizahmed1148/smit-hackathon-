
import { Router } from "express";
import Joi from "joi";
import mongoose from "mongoose";

import Attendance from "../Models/Attendance.js";
import AttendanceCorrection from "../Models/AttendanceCorrection.js";
import User from "../Models/User.js";
import Company from "../Models/Company.js";
import {
  authenticate,
  allowRoles,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

const requestSchema = Joi.object({
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required(),

  requestedCheckIn: Joi.date().iso().allow(null).optional(),
  requestedCheckOut: Joi.date().iso().allow(null).optional(),

  reason: Joi.string().trim().min(5).max(500).required(),
}).custom((value, helpers) => {
  if (!value.requestedCheckIn && !value.requestedCheckOut) {
    return helpers.error("any.invalid");
  }

  if (
    value.requestedCheckIn &&
    value.requestedCheckOut &&
    new Date(value.requestedCheckOut) <=
      new Date(value.requestedCheckIn)
  ) {
    return helpers.error("any.invalid");
  }

  return value;
});

function getLocalDate(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function getMinutes(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return Number(values.hour) * 60 + Number(values.minute);
}

function calculateStatus(checkIn, settings) {
  const timezone = settings.timezone || "Asia/Karachi";
  const officeStart = settings.officeStartTime || "09:00";
  const [hours, minutes] = officeStart.split(":").map(Number);
  const allowedTime = hours * 60 + minutes +
    (settings.gracePeriodMinutes ?? 10);

  return getMinutes(checkIn, timezone) > allowedTime
    ? "Late"
    : "Present";
}

async function getEmployee(req) {
  return User.findOne({
    _id: req.user.userId,
    company: req.user.companyId,
    isActive: true,
    role: "Employee",
  });
}

// Employee submits a correction request
router.post("/", allowRoles("Employee"), async (req, res) => {
  try {
    const { error, value } = requestSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        message:
          "Provide a valid date, a check-in or check-out time, and a reason. Check-out must be after check-in.",
      });
    }

    const employee = await getEmployee(req);

    if (!employee) {
      return res.status(403).json({
        message: "Active employee account required",
      });
    }

    const company = await Company.findById(employee.company).select(
      "settings"
    );

    if (!company) {
      return res.status(404).json({ message: "Company not found" });
    }

    const timezone = company.settings?.timezone || "Asia/Karachi";
    const today = getLocalDate(new Date(), timezone);

    if (value.date > today) {
      return res.status(400).json({
        message: "Future attendance corrections are not allowed",
      });
    }

    const checkIn = value.requestedCheckIn
      ? new Date(value.requestedCheckIn)
      : null;

    const checkOut = value.requestedCheckOut
      ? new Date(value.requestedCheckOut)
      : null;

    for (const time of [checkIn, checkOut]) {
      if (time && getLocalDate(time, timezone) !== value.date) {
        return res.status(400).json({
          message: "Requested times must fall on the selected local date",
        });
      }
    }

    const attendance = await Attendance.findOne({
      company: employee.company,
      employee: employee._id,
      date: value.date,
    });

    if (attendance) {
      if (
        attendance.checkIn &&
        checkIn &&
        attendance.checkIn.getTime() !== checkIn.getTime()
      ) {
        // A changed check-in requires review; it is allowed in the request.
      }

      if (
        attendance.checkOut &&
        checkOut &&
        checkOut <= attendance.checkIn
      ) {
        return res.status(400).json({
          message: "Check-out must be after the recorded check-in",
        });
      }
    }

    const pending = await AttendanceCorrection.findOne({
      company: employee.company,
      employee: employee._id,
      date: value.date,
      status: "Pending",
    });

    if (pending) {
      return res.status(409).json({
        message: "You already have a pending request for this date",
      });
    }

    const correction = await AttendanceCorrection.create({
      company: employee.company,
      employee: employee._id,
      attendance: attendance?._id || null,
      date: value.date,
      requestedCheckIn: checkIn,
      requestedCheckOut: checkOut,
      reason: value.reason,
    });

    return res.status(201).json({
      message: "Correction request submitted for review",
      request: correction,
    });
  } catch (error) {
    console.error("Submit correction error:", error.message);

    return res.status(500).json({
      message: "Unable to submit correction request",
    });
  }
});

// Employee views their requests; HR/Admin can view company requests
router.get("/", async (req, res) => {
  try {
    if (!["Admin", "HR", "Employee"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const filter = { company: req.user.companyId };

    if (req.user.role === "Employee") {
      filter.employee = req.user.userId;
    }

    if (req.query.status) {
      if (!["Pending", "Approved", "Rejected"].includes(req.query.status)) {
        return res.status(400).json({ message: "Invalid status filter" });
      }

      filter.status = req.query.status;
    }

    const requests = await AttendanceCorrection.find(filter)
      .populate("employee", "name email department")
      .populate("reviewedBy", "name")
      .sort({ createdAt: -1 })
      .limit(200);

    return res.json({ requests });
  } catch (error) {
    console.error("List corrections error:", error.message);

    return res.status(500).json({
      message: "Unable to retrieve correction requests",
    });
  }
});

// HR/Admin approves or rejects a request
router.patch(
  "/:id/review",
  allowRoles("Admin", "HR"),
  async (req, res) => {
    const session = await mongoose.startSession();

    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid request ID" });
      }

      const schema = Joi.object({
        decision: Joi.string()
          .valid("Approved", "Rejected")
          .required(),
        reviewComment: Joi.string().trim().max(500).allow("").default(""),
      });

      const { error, value } = schema.validate(req.body);

      if (error) {
        return res.status(400).json({
          message: "Decision must be Approved or Rejected",
        });
      }

      let result;

      await session.withTransaction(async () => {
        const correction = await AttendanceCorrection.findOne({
          _id: req.params.id,
          company: req.user.companyId,
          status: "Pending",
        }).session(session);

        if (!correction) {
          const reviewError = new Error(
            "Pending correction request not found"
          );
          reviewError.status = 404;
          throw reviewError;
        }

        if (value.decision === "Approved") {
          let attendance = await Attendance.findOne({
            _id: correction.attendance,
            company: correction.company,
            employee: correction.employee,
            date: correction.date,
          }).session(session);

          if (!attendance) {
            attendance = new Attendance({
              company: correction.company,
              employee: correction.employee,
              date: correction.date,
            });
          }

          if (correction.requestedCheckIn) {
            attendance.checkIn = correction.requestedCheckIn;
            attendance.status = calculateStatus(
              correction.requestedCheckIn,
              (await Company.findById(correction.company)
                .select("settings")
                .session(session))?.settings || {}
            );
          }

          if (correction.requestedCheckOut) {
            const effectiveCheckIn =
              correction.requestedCheckIn || attendance.checkIn;

            if (
              !effectiveCheckIn ||
              correction.requestedCheckOut <= effectiveCheckIn
            ) {
              const timeError = new Error(
                "A valid check-in is required and check-out must be later"
              );
              timeError.status = 400;
              throw timeError;
            }

            attendance.checkOut = correction.requestedCheckOut;
          }

          await attendance.save({ session });
          correction.attendance = attendance._id;
        }

        correction.status = value.decision;
        correction.reviewedBy = req.user.userId;
        correction.reviewedAt = new Date();
        correction.reviewComment = value.reviewComment;

        await correction.save({ session });

        result = correction;
      });

      return res.json({
        message: `Correction request ${value.decision.toLowerCase()}`,
        request: result,
      });
    } catch (error) {
      if (error.status) {
        return res.status(error.status).json({
          message: error.message,
        });
      }

      console.error("Review correction error:", error.message);

      return res.status(500).json({
        message: "Unable to review correction request",
      });
    } finally {
      await session.endSession();
    }
  }
);

export default router;
