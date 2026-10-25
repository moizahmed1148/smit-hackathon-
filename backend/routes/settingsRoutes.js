
import { Router } from "express";
import Joi from "joi";
import Company from "../Models/Company.js";
import {
  authenticate,
  allowRoles,
} from "../middleware/authMiddleware.js";

const router = Router();

router.use(authenticate);

const settingsSchema = Joi.object({
  timezone: Joi.string().trim().min(1).max(100),
  officeStartTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/),
  officeEndTime: Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/),
  gracePeriodMinutes: Joi.number().integer().min(0).max(180),
  weekendDays: Joi.array()
    .items(
      Joi.string().valid(
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
      )
    )
    .unique()
    .max(7),
  officeLatitude: Joi.number().min(-90).max(90).allow(null),
  officeLongitude: Joi.number().min(-180).max(180).allow(null),
  attendanceRadiusMeters: Joi.number().integer().min(10).max(10000),
}).min(1);

function getSettings(company) {
  return {
    timezone: company.settings?.timezone ?? "Asia/Karachi",
    officeStartTime: company.settings?.officeStartTime ?? "09:00",
    officeEndTime: company.settings?.officeEndTime ?? "17:00",
    gracePeriodMinutes:
      company.settings?.gracePeriodMinutes ?? 10,
    weekendDays: company.settings?.weekendDays ?? ["Sunday"],
    officeLatitude: company.settings?.officeLatitude ?? null,
    officeLongitude: company.settings?.officeLongitude ?? null,
    attendanceRadiusMeters:
      company.settings?.attendanceRadiusMeters ?? 100,
  };
}

// Admin and HR can view their own company's settings.
router.get(
  "/",
  allowRoles("Admin", "HR"),
  async (req, res) => {
    try {
      const company = await Company.findById(req.user.companyId);

      if (!company) {
        return res.status(404).json({
          message: "Company not found",
        });
      }

      return res.json({
        company: {
          id: company._id,
          name: company.name,
          email: company.email,
        },
        settings: getSettings(company),
      });
    } catch (error) {
      console.error("Get settings error:", error.message);

      return res.status(500).json({
        message: "Unable to retrieve company settings",
      });
    }
  }
);

// Only Admin can update settings.
router.patch(
  "/",
  allowRoles("Admin"),
  async (req, res) => {
    try {
      const { error, value } = settingsSchema.validate(req.body, {
        abortEarly: true,
        convert: true,
      });

      if (error) {
        return res.status(400).json({
          message: error.details[0].message,
        });
      }

      if (
        (value.officeLatitude == null) !==
        (value.officeLongitude == null)
      ) {
        return res.status(400).json({
          message: "Provide both office latitude and longitude, or neither",
        });
      }

      if (
        value.officeStartTime &&
        value.officeEndTime &&
        value.officeStartTime === value.officeEndTime
      ) {
        return res.status(400).json({
          message: "Office start and end times must be different",
        });
      }

      const company = await Company.findById(req.user.companyId);

      if (!company) {
        return res.status(404).json({
          message: "Company not found",
        });
      }

      const currentSettings = getSettings(company);

      company.settings = {
        ...currentSettings,
        ...value,
      };

      await company.save();

      return res.json({
        message: "Company settings saved successfully",
        settings: getSettings(company),
      });
    } catch (error) {
      console.error("Update settings error:", error.message);

      return res.status(500).json({
        message: "Unable to save company settings",
      });
    }
  }
);

export default router;
