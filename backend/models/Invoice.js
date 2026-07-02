const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    size: { type: String, trim: true, default: "" },
    cartons: { type: Number, default: 0 },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, trim: true, default: "Rolls" },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNo: { type: String, required: true, unique: true, trim: true },

    deliveryChallan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryChallan",
      required: true,
    },

    challanNo: { type: String, required: true, trim: true },

    salesOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SalesOrder",
      required: true,
    },

    salesOrderNo: { type: String, required: true, trim: true },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true, default: "" },
    customerEmail: { type: String, trim: true, default: "" },
    customerAddress: { type: String, trim: true, default: "" },

    invoiceDate: { type: String, required: true },
    poNo: { type: String, trim: true, default: "" },

    taxType: {
      type: String,
      enum: ["without-tax", "with-tax"],
      default: "without-tax",
    },

    taxRate: { type: Number, default: 0 },

    salesTaxRegNo: { type: String, trim: true, default: "" },
    nationalTaxNo: { type: String, trim: true, default: "" },

    items: {
      type: [invoiceItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "At least one invoice item is required",
      },
    },

    subtotal: { type: Number, default: 0 },
    salesTax: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    paidAmount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },

    paymentStatus: {
      type: String,
      enum: ["Unpaid", "Partial", "Paid"],
      default: "Unpaid",
    },

    status: {
      type: String,
      enum: ["Draft", "Issued", "Paid", "Cancelled"],
      default: "Draft",
    },

    remarks: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Invoice", invoiceSchema);