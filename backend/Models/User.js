
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
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
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["Admin", "HR", "Employee"],
      required: true,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    department: {
  type: String,
  trim: true,
  default: "General",
    },
    jobTitle: {
    type: String,
    trim: true,
    default: "Employee",
    },
    phone: {
    type: String,
    trim: true,
    default: "",
    },
    joinDate: {
    type: Date,
    default: Date.now,
    },
  },
  { timestamps: true }
);

userSchema.index({ email: 1 }, { unique: true });

const User = mongoose.model("User", userSchema);

export default User;
