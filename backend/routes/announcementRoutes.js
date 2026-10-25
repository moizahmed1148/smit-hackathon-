
import { Router } from "express";
import Joi from "joi";
import Announcement from "../Models/Announcement.js";
import {
  authenticate,
  allowRoles,
} from "../middleware/authMiddleware.js";
const router = Router();

router.use(authenticate);

const announcementSchema = Joi.object({
  title: Joi.string().trim().min(3).max(150).required(),
  message: Joi.string().trim().min(3).max(5000).required(),
  audience: Joi.string().valid("All", "HR", "Employee").default("All"),
  status: Joi.string().valid("Draft", "Published").default("Draft"),
});

// Create an announcement
router.post(
  "/",
  allowRoles("Admin", "HR"),
  async (req, res) => {
    try {
      const { error, value } = announcementSchema.validate(req.body, {
        abortEarly: false,
      });

      if (error) {
        return res.status(400).json({
          message: error.details.map((detail) => detail.message).join(", "),
        });
      }

      const announcement = await Announcement.create({
        ...value,
        company: req.user.companyId,
        createdBy: req.user.userId,
        publishedAt: value.status === "Published" ? new Date() : null,
      });

      return res.status(201).json({
        message: "Announcement created successfully",
        announcement,
      });
    } catch (error) {
      console.error("Create announcement error:", error);
      return res.status(500).json({
        message: "Failed to create announcement",
      });
    }
  }
);

// List announcements according to role
router.get("/", async (req, res) => {
  try {
    const { role, companyId, userId } = req.user;

    const filter = { company: companyId };

    if (role === "Employee") {
      filter.status = "Published";
      filter.audience = { $in: ["All", "Employee"] };
    } else if (role === "HR") {
      filter.$or = [
        { status: "Published", audience: { $in: ["All", "HR"] } },
        { status: "Draft", createdBy: userId },
      ];
    } else if (role === "Admin") {
      // Admin can manage all announcements for their company.
    } else {
      return res.status(403).json({ message: "Access denied" });
    }

    const announcements = await Announcement.find(filter)
      .populate("createdBy", "name email role")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.json({ announcements });
  } catch (error) {
    console.error("List announcements error:", error);
    return res.status(500).json({
      message: "Failed to fetch announcements",
    });
  }
});

// Update an announcement

 // Update an announcement
router.patch(
  "/:id",
  allowRoles("Admin", "HR"),
  async (req, res) => {
    try {
      const allowedFields = ["title", "message", "audience", "status"];
      const updates = {};

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field];
        }
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({
          message: "No valid fields provided",
        });
      }

      // Validate only the fields being updated.
      const updateSchema = Joi.object({
        title: Joi.string().trim().min(3).max(150),
        message: Joi.string().trim().min(3).max(5000),
        audience: Joi.string().valid("All", "HR", "Employee"),
        status: Joi.string().valid("Draft", "Published"),
      }).min(1);

      const { error, value } = updateSchema.validate(updates, {
        abortEarly: false,
        convert: true,
      });

      if (error) {
        return res.status(400).json({
          message: error.details.map((detail) => detail.message).join(", "),
        });
      }

      const filter = {
        _id: req.params.id,
        company: req.user.companyId,
      };

      // HR can manage only announcements they created.
      if (req.user.role === "HR") {
        filter.createdBy = req.user.userId;
      }

      const existing = await Announcement.findOne(filter);

      if (!existing) {
        return res.status(404).json({
          message: "Announcement not found",
        });
      }

      // Preserve the existing content when only status is changed.
      const wasPublished = existing.status === "Published";

      Object.assign(existing, value);

      if (value.status === "Published" && !wasPublished) {
        existing.publishedAt = new Date();
      } else if (value.status === "Draft") {
        existing.publishedAt = null;
      }

      await existing.save();

      return res.json({
        message: "Announcement updated successfully",
        announcement: existing,
      });
    } catch (error) {
      console.error("Update announcement error:", error);
      return res.status(500).json({
        message: "Failed to update announcement",
      });
    }
  }
);


// Delete an announcement
router.delete(
  "/:id",
  allowRoles("Admin", "HR"),
  async (req, res) => {
    try {
      const filter = {
        _id: req.params.id,
        company: req.user.companyId,
      };

      if (req.user.role === "HR") {
        filter.createdBy = req.user.userId;
      }

      const announcement = await Announcement.findOneAndDelete(filter);

      if (!announcement) {
        return res.status(404).json({
          message: "Announcement not found",
        });
      }

      return res.json({
        message: "Announcement deleted successfully",
      });
    } catch (error) {
      console.error("Delete announcement error:", error);
      return res.status(500).json({
        message: "Failed to delete announcement",
      });
    }
  }
);

export default router;
