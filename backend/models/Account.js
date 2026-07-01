const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  cash: { type: Number, default: 0 },
  bank: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Account', accountSchema);