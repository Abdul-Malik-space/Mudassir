const mongoose = require("mongoose");

const salesOrderItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    size: { type: String, trim: true, default: "" },
    cartons: { type: Number, default: 0 },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, default: "Rolls", trim: true },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const salesOrderSchema = new mongoose.Schema(
  {
    salesOrderNo: { type: String, required: true, unique: true, trim: true },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
    },

    customerName: { type: String, required: true, trim: true },
    customerPhone: { type: String, trim: true, default: "" },
    customerEmail: { type: String, trim: true, default: "" },
    customerAddress: { type: String, trim: true, default: "" },

    orderDate: { type: String, required: true },
    deliveryDate: { type: String, default: "" },
    poNo: { type: String, trim: true, default: "" },

    taxType: {
      type: String,
      enum: ["without-tax", "with-tax"],
      default: "without-tax",
    },

    taxRate: { type: Number, default: 0 },

    items: {
      type: [salesOrderItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "At least one item is required",
      },
    },

    subtotal: { type: Number, default: 0 },
    salesTax: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    advance: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },

    status: {
      type: String,
      enum: [
        "Draft",
        "Confirmed",
        "In Production",
        "Ready",
        "Delivered",
        "Invoiced",
        "Cancelled",
      ],
      default: "Draft",
    },

    remarks: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SalesOrder", salesOrderSchema);