
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Joi from "joi";
import User from "../Models/User.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = Router();

const loginSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required(),
});

router.post("/login", async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        message: "Please provide a valid email and password",
      });
    }

    const user = await User.findOne({
      email: value.email.toLowerCase(),
    }).select("+passwordHash");

    if (
      !user ||
      !user.isActive ||
      !(await bcrypt.compare(value.password, user.passwordHash))
    ) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not configured");
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        companyId: user.company.toString(),
        role: user.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.company,
      },
    });
  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      message: "Unable to log in",
    });
  }
});

router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.user.userId,
      company: req.user.companyId,
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        message: "User account is unavailable",
      });
    }

    return res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.company,
      },
    });
  } catch (error) {
    console.error("Current user error:", error.message);

    return res.status(500).json({
      message: "Unable to retrieve user",
    });
  }
});

export default router;
