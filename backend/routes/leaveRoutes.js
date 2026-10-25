
import { Router } from "express";
import Joi from "joi";
import LeaveRequest from "../Models/LeaveRequest.js";
import User from "../Models/User.js";
import {
  authenticate,
  allowRoles,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

const leaveSchema = Joi.object({
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().min(Joi.ref("startDate")).required(),
  leaveType: Joi.string()
    .valid("Annual", "Sick", "Casual", "Unpaid")
    .required(),
  reason: Joi.string().trim().min(3).max(1000).required(),
});

// Submit a leave request
router.post("/", async (req, res) => {
  try {
    if (req.user.role !== "Employee") {
      return res.status(403).json({
        message: "Only employees can submit leave requests",
      });
    }

    const { error, value } = leaveSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
      });
    }

    const employee = await User.findOne({
      _id: req.user.userId,
      company: req.user.companyId,
      role: "Employee",
      isActive: true,
    });

    if (!employee) {
      return res.status(403).json({
        message: "Active employee account required",
      });
    }

    const startDate = new Date(value.startDate);
    const endDate = new Date(value.endDate);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime()) ||
      endDate < startDate
    ) {
      return res.status(400).json({
        message: "Invalid leave date range",
      });
    }

    const request = await LeaveRequest.create({
      ...value,
      startDate,
      endDate,
      company: employee.company,
      employee: employee._id,
    });

    return res.status(201).json({
      message: "Leave request submitted",
      leave: request,
    });
  } catch (error) {
    console.error("Leave request error:", error.message);
    return res.status(500).json({
      message: "Unable to submit leave request",
    });
  }
});

// Employee sees own requests; HR/Admin see company requests
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
    }

    if (req.query.status) {
      if (!["Pending", "Approved", "Rejected"].includes(req.query.status)) {
        return res.status(400).json({
          message: "Invalid leave status",
        });
      }

      filter.status = req.query.status;
    }

    const leaves = await LeaveRequest.find(filter)
      .populate("employee", "name email department")
      .populate("reviewedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(200);

    return res.json({ leaves });
  } catch (error) {
    console.error("List leaves error:", error.message);
    return res.status(500).json({
      message: "Unable to retrieve leave requests",
    });
  }
});

// HR/Admin review a pending request
router.patch(
  "/:id/review",
  allowRoles("Admin", "HR"),
  async (req, res) => {
    try {
      const schema = Joi.object({
        status: Joi.string().valid("Approved", "Rejected").required(),
      });

      const { error, value } = schema.validate(req.body);

      if (error) {
        return res.status(400).json({
          message: error.details[0].message,
        });
      }

      const reviewer = await User.findOne({
        _id: req.user.userId,
        company: req.user.companyId,
        isActive: true,
        role: { $in: ["Admin", "HR"] },
      });

      if (!reviewer) {
        return res.status(403).json({
          message: "Active HR/Admin account required",
        });
      }

      const leave = await LeaveRequest.findOneAndUpdate(
        {
          _id: req.params.id,
          company: req.user.companyId,
          status: "Pending",
        },
        {
          $set: {
            status: value.status,
            reviewedBy: reviewer._id,
            reviewedAt: new Date(),
          },
        },
        { new: true }
      ).populate("employee", "name email");

      if (!leave) {
        return res.status(404).json({
          message: "Pending leave request not found",
        });
      }

      return res.json({
        message: `Leave request ${value.status.toLowerCase()}`,
        leave,
      });
    } catch (error) {
      console.error("Review leave error:", error.message);
      return res.status(500).json({
        message: "Unable to review leave request",
      });
    }
  }
);

export default router;
