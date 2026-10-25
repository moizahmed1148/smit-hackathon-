
import mongoose from "mongoose";

const attendanceCorrectionSchema = new mongoose.Schema(
  {
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    attendance: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attendance",
      default: null,
    },
    date: {
      type: String,
      required: true,
    },
    requestedCheckIn: {
      type: Date,
      default: null,
    },
    requestedCheckOut: {
      type: Date,
      default: null,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      index: true,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewComment: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "",
    },
  },
  { timestamps: true }
);

attendanceCorrectionSchema.index({
  company: 1,
  employee: 1,
  date: 1,
  status: 1,
});

const AttendanceCorrection = mongoose.model(
  "AttendanceCorrection",
  attendanceCorrectionSchema
);

export default AttendanceCorrection;
