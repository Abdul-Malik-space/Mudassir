const mongoose = require('mongoose');

const PrintingSchema = new mongoose.Schema({
  jobCardId: { type: String, trim: true, default: '' },
  product: { type: String, required: true, trim: true },
  employee: { type: String, required: true, trim: true },
  qty: { type: Number, required: true },
  impressions: { type: Number, default: 0 },
  platesCount: { type: Number, default: 4 },
  rate: { type: Number, default: 0 },
  wastageQty: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  machine: { type: String, required: true, trim: true },
  paperSize: { type: String, trim: true, default: '' },
  side: { type: String, enum: ['1-side', '2-side'], default: '1-side' },
  time: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Printing', PrintingSchema);
