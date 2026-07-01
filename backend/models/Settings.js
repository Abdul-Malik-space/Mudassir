const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  companyName: { type: String, default: 'My Enterprise' },
  email: { type: String, required: true },
  phone: { type: String },
  logoUrl: { type: String }, // لوگو کا پاتھ یا URL
  theme: { type: String, default: 'Light Mode' },
  language: { type: String, default: 'English' }
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);