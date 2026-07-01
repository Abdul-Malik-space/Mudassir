const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { type: String, enum: ['PDF', 'XLS', 'CSV'], required: true },
  size: { type: String, required: true },
  category: { type: String, required: true }, // e.g., 'Production', 'Financial'
  fileUrl: { type: String }, // اصل فائل کا لنک
}, { timestamps: true });

module.exports = mongoose.model('Report', reportSchema);