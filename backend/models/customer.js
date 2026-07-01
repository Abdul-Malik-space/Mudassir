const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: String,
  alternatePhone: String,
  address: String,
  city: String,
  openingBalance: { type: Number, default: 0 },
  status: { type: String, default: "Active" },
  notes: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Customer", customerSchema);