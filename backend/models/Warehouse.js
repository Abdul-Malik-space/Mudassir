const mongoose = require("mongoose");

const warehouseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Warehouse name is required"],
      trim: true,
      unique: true,
    },

    location: {
      type: String,
      trim: true,
      default: "",
    },

    capacity: {
      type: String,
      trim: true,
      default: "",
    },

    capacityPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Full"],
      default: "Active",
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

warehouseSchema.pre("save", function () {
  this.name = String(this.name || "").trim();
  this.location = String(this.location || "").trim();
  this.capacity = String(this.capacity || "").trim();
  this.capacityPercent = Number(this.capacityPercent || 0);
});

warehouseSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() || {};

  if (update.name !== undefined) {
    update.name = String(update.name || "").trim();
  }

  if (update.location !== undefined) {
    update.location = String(update.location || "").trim();
  }

  if (update.capacity !== undefined) {
    update.capacity = String(update.capacity || "").trim();
  }

  if (update.capacityPercent !== undefined) {
    update.capacityPercent = Number(update.capacityPercent || 0);
  }

  this.setUpdate(update);
});

module.exports = mongoose.model("Warehouse", warehouseSchema);