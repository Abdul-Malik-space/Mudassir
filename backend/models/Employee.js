const mongoose = require('mongoose');

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  baseSalary: { type: Number, required: true },
  bonus: { type: Number, default: 0 },
  deduction: { type: Number, default: 0 },
  dateAdded: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Employee', employeeSchema);