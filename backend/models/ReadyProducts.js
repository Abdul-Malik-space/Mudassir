const mongoose = require('mongoose');

const readyProductSchema = new mongoose.Schema({
  jobCardId: { type: String, trim: true, default: '' },
  product: { type: String, required: true, trim: true },
  process: { type: String, required: true },
  qty: { type: Number, required: true },
  location: { type: String, default: 'Main Store' },
  packaging: { type: String, default: '' },
  employee: { type: String, default: '' },
  time: { type: String, default: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('ReadyProduct', readyProductSchema);
