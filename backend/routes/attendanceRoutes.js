
import { Router } from "express";
import Attendance from "../Models/Attendance.js";
import User from "../Models/User.js";
import Company from "../Models/Company.js";
import {
  authenticate,
  allowRoles,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

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

function getLocalTime(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.hour}:${values.minute}`;
}

function getLocalWeekday(date, timezone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  }).format(date);
}

function getMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function getStatus(checkIn, settings) {
  const timezone = settings.timezone || "Asia/Karachi";
  const checkInTime = getMinutes(getLocalTime(checkIn, timezone));
  const officeStart = getMinutes(settings.officeStartTime || "09:00");
  const grace = settings.gracePeriodMinutes ?? 10;

  return checkInTime > officeStart + grace ? "Late" : "Present";
}

async function getCompanySettings(companyId) {
  const company = await Company.findById(companyId).select("settings");

  if (!company) {
    throw new Error("Company not found");
  }

  return {
    timezone: company.settings?.timezone || "Asia/Karachi",
    officeStartTime: company.settings?.officeStartTime || "09:00",
    officeEndTime: company.settings?.officeEndTime || "17:00",
    gracePeriodMinutes: company.settings?.gracePeriodMinutes ?? 10,
    weekendDays: company.settings?.weekendDays || ["Sunday"],
  };
}

// Employee checks in
router.post("/check-in", async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.user.userId,
      company: req.user.companyId,
      isActive: true,
    });

    if (!user || user.role !== "Employee") {
      return res.status(403).json({
        message: "Active employee account required",
      });
    }

    const settings = await getCompanySettings(user.company);
    const now = new Date();
    const date = getLocalDate(now, settings.timezone);
    const weekday = getLocalWeekday(now, settings.timezone);
    const isWeekend = settings.weekendDays.includes(weekday);

    const existing = await Attendance.findOne({
      company: user.company,
      employee: user._id,
      date,
    });

    if (existing) {
      return res.status(409).json({
        message: "You have already checked in today",
      });
    }

    const status = getStatus(now, settings);

    const record = await Attendance.create({
      company: user.company,
      employee: user._id,
      date,
      checkIn: now,
      status,
    });

    return res.status(201).json({
      message: isWeekend
        ? "Checked in successfully (configured weekend)"
        : status === "Late"
          ? "Checked in successfully (late arrival)"
          : "Checked in successfully",
      attendance: record,
      isWeekend,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "You have already checked in today",
      });
    }

    console.error("Check-in error:", error.message);
    return res.status(500).json({
      message: "Unable to check in",
    });
  }
});

// Employee checks out
router.patch("/check-out", async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.user.userId,
      company: req.user.companyId,
      role: "Employee",
      isActive: true,
    });

    if (!user) {
      return res.status(403).json({
        message: "Active employee account required",
      });
    }

    const settings = await getCompanySettings(user.company);
    const date = getLocalDate(new Date(), settings.timezone);

    const record = await Attendance.findOneAndUpdate(
      {
        company: user.company,
        employee: user._id,
        date,
        checkOut: null,
        checkIn: { $ne: null },
      },
      { $set: { checkOut: new Date() } },
      { new: true }
    );

    if (!record) {
      return res.status(404).json({
        message: "No open check-in found for today",
      });
    }

    return res.json({
      message: "Checked out successfully",
      attendance: record,
    });
  } catch (error) {
    console.error("Check-out error:", error.message);
    return res.status(500).json({
      message: "Unable to check out",
    });
  }
});

// Employee views own records; HR/Admin can view company records
router.get("/", async (req, res) => {
  try {
    const filter = {
      company: req.user.companyId,
    };

    if (req.user.role === "Employee") {
      filter.employee = req.user.userId;
    } else if (!["Admin", "HR"].includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied",
      });
    } else if (req.query.employeeId) {
      filter.employee = req.query.employeeId;
    }

    if (req.query.date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
        return res.status(400).json({
          message: "Date must use YYYY-MM-DD format",
        });
      }

      filter.date = req.query.date;
    }

    const records = await Attendance.find(filter)
      .populate("employee", "name email department")
      .sort({ date: -1, checkIn: -1 })
      .limit(200);

    return res.json({ attendance: records });
  } catch (error) {
    console.error("Attendance list error:", error.message);
    return res.status(500).json({
      message: "Unable to retrieve attendance",
    });
  }
});

export default router;
