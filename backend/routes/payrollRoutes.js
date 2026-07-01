const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');

// تمام ملازمین کا ڈیٹا حاصل کریں
router.get('/all', async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json(employees);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// نیا ملازم شامل کریں
router.post('/add', async (req, res) => {
  const employee = new Employee({
    name: req.body.name,
    baseSalary: req.body.baseSalary
  });
  try {
    const newEmployee = await employee.save();
    res.status(201).json(newEmployee);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// بونس، کٹوتی یا تنخواہ اپڈیٹ کریں
router.put('/update/:id', async (req, res) => {
  try {
    const updated = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ملازم کو سسٹم سے ختم کریں
router.delete('/delete/:id', async (req, res) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: "Employee removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;