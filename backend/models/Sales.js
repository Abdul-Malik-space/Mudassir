const mongoose = require("mongoose");

const salesSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true, trim: true },
    invoiceNo: { type: String, required: true, trim: true },
    jobCardId: { type: String, trim: true, default: "" },
    product: { type: String, trim: true, default: "" },
    qty: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    received: { type: Number, default: 0, min: 0 },
    paymentMethod: { type: String, default: "Cash", trim: true },
    totalAmount: { type: Number, default: 0 },
    balance: { type: Number, default: 0 },
    time: { type: String, default: () => new Date().toLocaleDateString("en-GB") },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Sales", salesSchema);
