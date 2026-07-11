const mongoose = require("mongoose");

const purchaseItemSchema = new mongoose.Schema(
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

    grnAcceptedQty: {
      type: Number,
      default: 0,
      min: 0,
    },

    purchaseQty: {
      type: Number,
      required: [true, "Purchase quantity is required"],
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

    grossAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    discount: {
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

const purchaseSchema = new mongoose.Schema(
  {
    purchaseNo: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },

    grn: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GRN",
      required: [true, "GRN is required"],
      unique: true,
    },

    grnNo: {
      type: String,
      required: true,
      trim: true,
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

    purchaseDate: {
      type: String,
      required: [true, "Purchase date is required"],
    },

    dueDate: {
      type: String,
      default: "",
    },

    vendorInvoiceNo: {
      type: String,
      required: [true, "Vendor invoice no is required"],
      trim: true,
    },

    supplierBillNo: {
      type: String,
      trim: true,
      default: "",
    },

    challanNo: {
      type: String,
      trim: true,
      default: "",
    },

    warehouse: {
      type: String,
      trim: true,
      default: "Main Warehouse",
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
      type: [purchaseItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "At least one purchase item is required",
      },
    },

    subtotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    itemDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    overallDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    totalDiscount: {
      type: Number,
      default: 0,
      min: 0,
    },

    taxableAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    salesTax: {
      type: Number,
      default: 0,
      min: 0,
    },

    freightCharges: {
      type: Number,
      default: 0,
      min: 0,
    },

    otherCharges: {
      type: Number,
      default: 0,
      min: 0,
    },

    grandTotal: {
      type: Number,
      default: 0,
      min: 0,
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    balance: {
      type: Number,
      default: 0,
    },

    paymentMethod: {
      type: String,
      enum: ["Cash", "Bank", "Cheque", "Credit", "Other"],
      default: "Credit",
    },

    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Partially Paid", "Paid"],
      default: "Unpaid",
    },

    postingStatus: {
      type: String,
      enum: ["Draft", "Posted"],
      default: "Draft",
    },

    status: {
      type: String,
      enum: ["Draft", "Completed", "Cancelled"],
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

module.exports = mongoose.model("Purchase", purchaseSchema);