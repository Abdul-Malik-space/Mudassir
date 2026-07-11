const mongoose = require("mongoose");

const purchaseOrderItemSchema = new mongoose.Schema(
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

    cartons: {
      type: Number,
      default: 0,
      min: 0,
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: 0,
    },

    unit: {
      type: String,
      trim: true,
      default: "Pcs",
    },

    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: 0,
    },

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    receivedQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    pendingQty: {
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

const purchaseOrderSchema = new mongoose.Schema(
  {
    purchaseOrderNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
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

    vendorCity: {
      type: String,
      trim: true,
      default: "",
    },

    vendorNtn: {
      type: String,
      trim: true,
      default: "",
    },

    vendorStrn: {
      type: String,
      trim: true,
      default: "",
    },

    orderDate: {
      type: String,
      required: [true, "Order date is required"],
    },

    expectedDate: {
      type: String,
      default: "",
    },

    referenceNo: {
      type: String,
      trim: true,
      default: "",
    },

    taxType: {
      type: String,
      enum: ["without-tax", "with-tax"],
      default: "without-tax",
    },

    taxRate: {
      type: Number,
      default: 0,
      min: 0,
    },

    items: {
      type: [purchaseOrderItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "At least one item is required",
      },
    },

    totalCartons: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    salesTax: {
      type: Number,
      default: 0,
      min: 0,
    },

    grandTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    advance: {
      type: Number,
      default: 0,
      min: 0,
    },

    balance: {
      type: Number,
      default: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Partially Paid", "Paid"],
      default: "Unpaid",
    },

    status: {
      type: String,
      enum: [
        "Draft",
        "Ordered",
        "Partially Received",
        "Received",
        "Cancelled",
      ],
      default: "Draft",
    },

    remarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);