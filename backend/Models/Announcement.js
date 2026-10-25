import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 5000,
    },
    audience: {
      type: String,
      enum: ["All", "HR", "Employee"],
      default: "All",
      required: true,
    },
    status: {
      type: String,
      enum: ["Draft", "Published"],
      default: "Draft",
      required: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

announcementSchema.index({
  company: 1,
  status: 1,
  publishedAt: -1,
});

const Announcement = mongoose.model(
  "Announcement",
  announcementSchema
);

export default Announcement;
