
import mongoose from "mongoose";

const companySettingsSchema = new mongoose.Schema(
  {
    timezone: {
      type: String,
      default: "Asia/Karachi",
      trim: true,
    },
    officeStartTime: {
      type: String,
      default: "09:00",
    },
    officeEndTime: {
      type: String,
      default: "17:00",
    },
    gracePeriodMinutes: {
      type: Number,
      default: 10,
      min: 0,
      max: 180,
    },
    weekendDays: {
      type: [String],
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
      default: ["Sunday"],
    },
    officeLatitude: {
      type: Number,
      default: null,
      min: -90,
      max: 90,
    },
    officeLongitude: {
      type: Number,
      default: null,
      min: -180,
      max: 180,
    },
    attendanceRadiusMeters: {
      type: Number,
      default: 100,
      min: 10,
      max: 10000,
    },
  },
  { _id: false }
);

const companySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    settings: {
      type: companySettingsSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

companySchema.index({ email: 1 }, { unique: true });

const Company = mongoose.model("Company", companySchema);

export default Company;
