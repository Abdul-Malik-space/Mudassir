const mongoose = require("mongoose");

const grnItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      default: null,
    },

    description: {
      type: String,
      required: [true, "Item description is required"],
      trim: true,
    },

    size: {
      type: String,
      trim: true,
      default: "",
    },

    orderedQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    receivedQty: {
      type: Number,
      required: [true, "Received quantity is required"],
      min: 0,
    },

    rejectedQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    acceptedQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    pendingQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    unit: {
      type: String,
      trim: true,
      default: "Pcs",
    },

    unitPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { _id: false }
);

const grnSchema = new mongoose.Schema(
  {
    grnNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    purchaseOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PurchaseOrder",
      required: [true, "Purchase Order is required"],
    },

    purchaseOrderNo: {
      type: String,
      required: true,
      trim: true,
    },

    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: [true, "Vendor is required"],
    },

    vendorName: {
      type: String,
      required: true,
      trim: true,
    },

    vendorPhone: {
      type: String,
      trim: true,
      default: "",
    },

    vendorEmail: {
      type: String,
      trim: true,
      default: "",
    },

    vendorAddress: {
      type: String,
      trim: true,
      default: "",
    },

    receivedDate: {
      type: String,
      required: [true, "Received date is required"],
    },

    challanNo: {
      type: String,
      trim: true,
      default: "",
    },

    invoiceNo: {
      type: String,
      trim: true,
      default: "",
    },

    vehicleNo: {
      type: String,
      trim: true,
      default: "",
    },

    warehouse: {
      type: String,
      trim: true,
      default: "Main Warehouse",
    },

    receivedBy: {
      type: String,
      trim: true,
      default: "",
    },

    checkedBy: {
      type: String,
      trim: true,
      default: "",
    },

    inspectionStatus: {
      type: String,
      enum: ["Pending", "Passed", "Failed", "Partial"],
      default: "Pending",
    },

    status: {
      type: String,
      enum: ["Draft", "Received", "Posted", "Cancelled"],
      default: "Received",
    },

    purchaseStatus: {
      type: String,
      enum: ["Not Purchased", "Purchased"],
      default: "Not Purchased",
    },

    items: {
      type: [grnItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "At least one GRN item is required",
      },
    },

    totalOrderedQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalReceivedQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalRejectedQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalAcceptedQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalPendingQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GRN", grnSchema);