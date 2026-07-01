const mongoose = require('mongoose');

const warehouseSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: { type: String, required: true },
  capacity: { type: String, required: true }, // مثال: "80%"
  status: { type: String, default: 'Active', enum: ['Active', 'Full'] }
}, { timestamps: true });

module.exports = mongoose.model('Warehouse', warehouseSchema);