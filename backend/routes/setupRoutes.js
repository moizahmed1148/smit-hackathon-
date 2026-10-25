
import { Router } from "express";
import bcrypt from "bcryptjs";
import Joi from "joi";
import Company from "../Models/Company.js";
import User from "../Models/User.js";

const router = Router();

const setupSchema = Joi.object({
  companyName: Joi.string().trim().min(2).max(100).required(),
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().lowercase().required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .required(),
});

router.post("/", async (req, res) => {
  let company;

  try {
    const { error, value } = setupSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        message: error.details[0].message,
      });
    }

    const email = value.email.toLowerCase();

    if (await User.exists({ email })) {
      return res.status(409).json({
        message: "This email is already registered",
      });
    }

    company = await Company.create({
      name: value.companyName,
      email,
    });

    const passwordHash = await bcrypt.hash(value.password, 12);

    const admin = await User.create({
      name: value.name,
      email,
      passwordHash,
      role: "Admin",
      company: company._id,
    });

    return res.status(201).json({
      message: "Company and Admin created successfully",
      company: {
        id: company._id,
        name: company.name,
      },
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    });
  } catch (error) {
    if (company?._id) {
      await Company.findByIdAndDelete(company._id).catch(() => {});
    }

    if (error.code === 11000) {
      return res.status(409).json({
        message: "This email is already registered",
      });
    }

    console.error("Setup error:", error.message);

    return res.status(500).json({
      message: "Unable to complete company setup",
    });
  }
});

export default router;
