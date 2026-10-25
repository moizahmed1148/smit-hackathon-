
import { Router } from "express";
import bcrypt from "bcryptjs";
import Joi from "joi";
import User from "../Models/User.js";
import {
  authenticate,
  allowRoles,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

const employeeSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().lowercase().required(),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string()
    .valid("Employee", "HR")
    .default("Employee"),
  department: Joi.string().trim().max(100).default("General"),
  jobTitle: Joi.string().trim().max(100).default("Employee"),
  phone: Joi.string().trim().max(25).allow("").default(""),
});

function publicEmployee(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    jobTitle: user.jobTitle,
    phone: user.phone,
    joinDate: user.joinDate,
    isActive: user.isActive,
  };
}

// Create employee

router.post(
  "/",
  allowRoles("Admin", "HR"),
  async (req, res) => {
    try {
      const { error, value } = employeeSchema.validate(req.body);

      if (error) {
        return res.status(400).json({
          message: error.details[0].message,
        });
      }

      const email = value.email.toLowerCase();

      // Check whether this email already exists in the company.
      if (
        await User.exists({
          email,
          company: req.user.companyId,
        })
      ) {
        return res.status(409).json({
          message: "An account with this email already exists",
        });
      }

      // Only Admins can create HR accounts.
      if (value.role === "HR" && req.user.role !== "Admin") {
        return res.status(403).json({
          message: "Only an Admin can create HR accounts",
        });
      }

      // Hash the password before saving it.
      const passwordHash = await bcrypt.hash(value.password, 12);

      // Create the account with the validated fields.
      const employee = await User.create({
        name: value.name,
        email,
        passwordHash,
        role: value.role,
        department: value.department,
        jobTitle: value.jobTitle,
        phone: value.phone,
        company: req.user.companyId,
      });

      return res.status(201).json({
        message:
          value.role === "HR"
            ? "HR account created successfully"
            : "Employee created successfully",
        employee: publicEmployee(employee),
      });
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          message: "This email is already registered",
        });
      }

      console.error("Create employee error:", error.message);

      return res.status(500).json({
        message: "Unable to create account",
      });
    }
  }
);


// List employees in this company
router.get(
  "/",
  allowRoles("Admin", "HR"),
  async (req, res) => {
    try {
      const employees = await User.find({
        company: req.user.companyId,
        role: "Employee",
      }).sort({ createdAt: -1 });

      return res.json({
        employees: employees.map(publicEmployee),
      });
    } catch (error) {
      console.error("List employees error:", error.message);
      return res.status(500).json({
        message: "Unable to retrieve employees",
      });
    }
  }
);

// Update employee details
router.put(
  "/:id",
  allowRoles("Admin", "HR"),
  async (req, res) => {
    try {
      const schema = Joi.object({
        name: Joi.string().trim().min(2).max(100),
        department: Joi.string().trim().max(100),
        jobTitle: Joi.string().trim().max(100),
        phone: Joi.string().trim().max(25).allow(""),
      }).min(1);

      const { error, value } = schema.validate(req.body);

      if (error) {
        return res.status(400).json({
          message: error.details[0].message,
        });
      }

      const employee = await User.findOneAndUpdate(
        {
          _id: req.params.id,
          company: req.user.companyId,
          role: "Employee",
        },
        { $set: value },
        { new: true, runValidators: true }
      );

      if (!employee) {
        return res.status(404).json({
          message: "Employee not found",
        });
      }

      return res.json({
        message: "Employee updated successfully",
        employee: publicEmployee(employee),
      });
    } catch (error) {
      console.error("Update employee error:", error.message);
      return res.status(500).json({
        message: "Unable to update employee",
      });
    }
  }
);

// Deactivate employee instead of deleting their history
router.patch(
  "/:id/deactivate",
  allowRoles("Admin", "HR"),
  async (req, res) => {
    try {
      const employee = await User.findOneAndUpdate(
        {
          _id: req.params.id,
          company: req.user.companyId,
          role: "Employee",
        },
        { $set: { isActive: false } },
        { new: true }
      );

      if (!employee) {
        return res.status(404).json({
          message: "Employee not found",
        });
      }

      return res.json({
        message: "Employee deactivated successfully",
      });
    } catch (error) {
      console.error("Deactivate employee error:", error.message);
      return res.status(500).json({
        message: "Unable to deactivate employee",
      });
    }
  }
);

export default router;
