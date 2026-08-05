const mongoose = require("mongoose");

const headerSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      default: "main",
      index: true,
    },

    adminLabel: {
      type: String,
      trim: true,
      default: "Admin",
      maxlength: 60,
    },

    searchPlaceholder: {
      type: String,
      trim: true,
      default: "Search Anything",
      maxlength: 120,
    },

    darkMode: {
      type: Boolean,
      default: false,
    },

    notificationPollSeconds: {
      type: Number,
      min: 10,
      max: 300,
      default: 30,
    },

    lastNotificationReadAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

module.exports = mongoose.model("Header", headerSchema);
