const mongoose = require("mongoose");

const ProductionItemSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, "Item/Job name is required"],
      trim: true,
    },
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    customerPO: {
      type: String,
      trim: true,
      default: "",
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    unit: {
      type: String,
      enum: ["Boxes", "Cartons", "Labels", "Pieces", "Sheets"],
      default: "Boxes",
    },
    paperType: {
      type: String,
      required: [true, "Paper type is required"],
      trim: true,
    },
    gsm: {
      type: Number,
      required: [true, "GSM is required"],
    },
    sheetSize: {
      type: String,
      required: [true, "Sheet size (Open) is required"],
      trim: true,
    },
    finishedSize: {
      type: String,
      trim: true,
      default: "",
    },
    totalSheets: {
      type: Number,
      default: 0,
    },
    noOfColors: {
      type: String,
      trim: true,
      default: "",
    },
    dieNo: {
      type: String,
      trim: true,
      default: "",
    },
    deliveryDate: {
      type: Date,
      required: false, // اگر لازمی کرنا ہو تو true کر دیں
    },
    priority: {
      type: String,
      enum: ["Normal", "Urgent", "High"],
      default: "Normal",
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
    // Production Checklist Status (Booleans)
    requirePrinting: {
      type: Boolean,
      default: true,
    },
    requireLamination: {
      type: Boolean,
      default: false,
    },
    requireDieCutting: {
      type: Boolean,
      default: false,
    },
    requirePasting: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    }
  },
  {
    timestamps: true, // یہ خودکار طور پر 'createdAt' اور 'updatedAt' فیلڈز بنا دے گا
  }
);

module.exports = mongoose.model("ProductionItem", ProductionItemSchema);