const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 60,
      match: [/^[a-z0-9._-]+$/, "Username contains unsupported characters"],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
      maxlength: 150,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    passwordHistory: {
      type: [String],
      default: [],
      select: false,
    },
    role: {
      type: String,
      required: true,
      enum: [
        "super_admin",
        "admin",
        "manager",
        "accountant",
        "purchase_officer",
        "sales_officer",
        "production_officer",
        "viewer",
      ],
      default: "viewer",
    },
    extraPermissions: {
      type: [String],
      default: [],
    },
    deniedPermissions: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
      index: true,
    },
    mustChangePassword: {
      type: Boolean,
      default: true,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0,
      select: false,
    },
    lockUntil: {
      type: Date,
      default: null,
      select: false,
    },
    passwordChangedAt: {
      type: Date,
      default: Date.now,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastLoginIp: {
      type: String,
      default: "",
    },
    lastNotificationReadAt: {
      type: Date,
      default: null,
    },
    preferences: {
      darkMode: {
        type: Boolean,
        default: false,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index(
  { email: 1 },
  {
    unique: true,
    partialFilterExpression: { email: { $type: "string", $gt: "" } },
  }
);

module.exports = mongoose.model("User", userSchema);
