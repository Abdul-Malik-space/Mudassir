const mongoose = require('mongoose');

const pastingSchema = new mongoose.Schema({
  jobCardId: { type: String, trim: true, default: '' },
  product: { type: String, required: true, trim: true },
  employee: { type: String, required: true, trim: true },
  pieces: { type: Number, required: true },
  rate: { type: Number, default: 0 },
  totalAmount: { type: Number, default: 0 },
  adhesive: { type: String, default: 'Hot Glue' },
  side: { type: String, default: '1' },
  time: { type: String, default: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Pasting', pastingSchema);
