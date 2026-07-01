const mongoose = require('mongoose');

const otherWorkSchema = new mongoose.Schema({
  jobCode: { type: String, trim: true, default: '' },
  item: { type: String, required: true, trim: true },
  processType: { type: String, trim: true, default: 'UV Coating' },
  vendor: { type: String, trim: true, default: '' },
  quantity: { type: Number, default: 0 },
  rate: { type: Number, default: 0 },
  cost: { type: Number, required: true, default: 0 },
  status: { type: String, default: 'Pending' },
  date: { type: String },
  desc: { type: String, default: '' },
  time: { type: String, default: () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('OtherWork', otherWorkSchema);
