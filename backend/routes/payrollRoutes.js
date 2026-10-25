import { Router } from "express";
import Joi from "joi";
import mongoose from "mongoose";
import Payroll from "../Models/Payroll.js";
import User from "../Models/User.js";
import { authenticate, allowRoles } from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

const objectIdSchema = Joi.string().hex().length(24);

const payrollSchema = Joi.object({
  employeeId: objectIdSchema.required(),
  payPeriod: Joi.string()
    .pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
    .required(),
  baseSalary: Joi.number().min(0).required(),
  allowances: Joi.number().min(0).default(0),
  deductions: Joi.number().min(0).default(0),
});

const publicPayroll = (record) => ({
  id: record._id,
  employee: record.employee,
  payPeriod: record.payPeriod,
  baseSalary: record.baseSalary,
  allowances: record.allowances,
  deductions: record.deductions,
  netSalary: record.netSalary,
  status: record.status,
  paidAt: record.paidAt,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

// CREATE PAYROLL — Admin/HR only
router.post("/", allowRoles("Admin", "HR"), async (req, res) => {
  try {
    const { error, value } = payrollSchema.validate(req.body, {
      abortEarly: false,
      convert: true,
    });

    if (error) {
      return res.status(400).json({
        message: error.details.map((item) => item.message).join(", "),
      });
    }

    const {
      employeeId,
      payPeriod,
      baseSalary,
      allowances,
      deductions,
    } = value;

    const employee = await User.findOne({
      _id: employeeId,
      company: req.user.companyId,
      role: "Employee",
      isActive: true,
    });

    if (!employee) {
      return res.status(404).json({
        message: "Active employee not found in your company",
      });
    }

    const netSalary = baseSalary + allowances - deductions;

    if (!Number.isFinite(netSalary) || netSalary < 0) {
      return res.status(400).json({
        message: "Deductions cannot exceed base salary plus allowances",
      });
    }

    const payroll = await Payroll.create({
      company: req.user.companyId,
      employee: employee._id,
      payPeriod,
      baseSalary,
      allowances,
      deductions,
      netSalary,
      status: "Processed",
      createdBy: req.user.userId,
    });

    const populated = await Payroll.findById(payroll._id)
      .populate("employee", "name email department jobTitle");

    return res.status(201).json({
      message: "Payroll record created successfully",
      payroll: publicPayroll(populated),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        message: "Payroll already exists for this employee and pay period",
      });
    }

    console.error("Create payroll error:", error);
    return res.status(500).json({ message: "Failed to create payroll" });
  }
});

// LIST PAYROLL — Employees see only their own records
router.get("/", async (req, res) => {
  try {
    const filter = { company: req.user.companyId };

    if (req.user.role === "Employee") {
      filter.employee = req.user.userId;
    } else if (["Admin", "HR"].includes(req.user.role)) {
      if (req.query.employeeId) {
        const { error, value } = objectIdSchema.validate(
          req.query.employeeId
        );

        if (error) {
          return res.status(400).json({
            message: "Invalid employeeId",
          });
        }

        filter.employee = new mongoose.Types.ObjectId(value);
      }
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    if (req.query.payPeriod) {
      const { error, value } = Joi.string()
        .pattern(/^\d{4}-(0[1-9]|1[0-2])$/)
        .validate(req.query.payPeriod);

      if (error) {
        return res.status(400).json({
          message: "payPeriod must use YYYY-MM format",
        });
      }

      filter.payPeriod = value;
    }

    const records = await Payroll.find(filter)
      .populate("employee", "name email department jobTitle")
      .sort({ payPeriod: -1 })
      .limit(200);

    return res.json({ payroll: records.map(publicPayroll) });
  } catch (error) {
    console.error("List payroll error:", error);
    return res.status(500).json({ message: "Failed to fetch payroll" });
  }
});

// GET A SINGLE PAYSLIP — company and employee ownership enforced
router.get("/:id/payslip", async (req, res) => {
  try {
    const { error } = objectIdSchema.validate(req.params.id);

    if (error) {
      return res.status(400).json({ message: "Invalid payroll ID" });
    }

    const filter = {
      _id: req.params.id,
      company: req.user.companyId,
    };

    if (req.user.role === "Employee") {
      filter.employee = req.user.userId;
    } else if (!["Admin", "HR"].includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    const record = await Payroll.findOne(filter)
      .populate("employee", "name email department jobTitle joinDate");

    if (!record) {
      return res.status(404).json({ message: "Payslip not found" });
    }

    return res.json({
      payslip: publicPayroll(record),
      currency: "PKR",
    });
  } catch (error) {
    console.error("Get payslip error:", error);
    return res.status(500).json({ message: "Failed to fetch payslip" });
  }
});

// MARK AS PAID — Admin/HR only
router.patch(
  "/:id/pay",
  allowRoles("Admin", "HR"),
  async (req, res) => {
    try {
      const { error } = objectIdSchema.validate(req.params.id);

      if (error) {
        return res.status(400).json({ message: "Invalid payroll ID" });
      }

      const payroll = await Payroll.findOneAndUpdate(
        {
          _id: req.params.id,
          company: req.user.companyId,
          status: "Processed",
        },
        {
          $set: {
            status: "Paid",
            paidAt: new Date(),
          },
        },
        { new: true, runValidators: true }
      ).populate("employee", "name email department jobTitle");

      if (!payroll) {
        return res.status(404).json({
          message: "Unpaid payroll record not found",
        });
      }

      return res.json({
        message: "Payroll marked as paid",
        payroll: publicPayroll(payroll),
      });
    } catch (error) {
      console.error("Mark payroll paid error:", error);
      return res.status(500).json({ message: "Failed to update payroll" });
    }
  }
);

export default router;