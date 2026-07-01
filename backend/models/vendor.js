const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema({
  vendorName: { type: String, required: true },
  phoneNumber: String,
  alternatePhone: String,
  email: String,
  address: String,
  city: String,
  openingBalance: { type: Number, default: 0 },
  status: { type: String, default: "Active" },
  notes: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Vendor", vendorSchema);