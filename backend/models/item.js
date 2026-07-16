const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },

    category: {
      type: String,
      trim: true,
      default: "General",
    },

    brand: {
      type: String,
      trim: true,
      default: "",
    },

    unit: {
      type: String,
      trim: true,
      default: "Pcs",
    },

    purchasePrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    salePrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    openingStock: {
      type: Number,
      default: 0,
      min: 0,
    },

    minStock: {
      type: Number,
      default: 0,
      min: 0,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
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

itemSchema.pre("save", function () {
  this.purchasePrice = Number(this.purchasePrice || 0);
  this.salePrice = Number(this.salePrice || 0);
  this.openingStock = Number(this.openingStock || 0);
  this.minStock = Number(this.minStock || 0);
});

itemSchema.pre("findOneAndUpdate", function () {
  const update = this.getUpdate() || {};

  if (update.code) update.code = String(update.code).trim().toUpperCase();

  if (update.purchasePrice !== undefined) {
    update.purchasePrice = Number(update.purchasePrice || 0);
  }

  if (update.salePrice !== undefined) {
    update.salePrice = Number(update.salePrice || 0);
  }

  if (update.openingStock !== undefined) {
    update.openingStock = Number(update.openingStock || 0);
  }

  if (update.minStock !== undefined) {
    update.minStock = Number(update.minStock || 0);
  }

  this.setUpdate(update);
});

module.exports = mongoose.model("Item", itemSchema);