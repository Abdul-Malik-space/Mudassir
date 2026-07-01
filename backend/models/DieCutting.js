const mongoose = require('mongoose');

const DieCuttingSchema = new mongoose.Schema({
  jobCardId: { type: String, trim: true, default: '' },
  product: { type: String, required: true, trim: true },
  operator: { type: String, required: true, trim: true },
  qty: { type: Number, required: true },
  rate: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  pressure: { type: String, default: 'N/A' },
  type: {
    type: String,
    enum: ['Single Side', 'Double Side'],
    default: 'Single Side'
  },
  time: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('DieCutting', DieCuttingSchema);
