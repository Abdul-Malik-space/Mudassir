const express = require('express');
const router = express.Router();
const OtherWork = require('../models/OtherWork');

// تمام ریکارڈز حاصل کریں
router.get('/all', async (req, res) => {
  try {
    const entries = await OtherWork.find().sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// نیا ریکارڈ محفوظ کریں
router.post('/add', async (req, res) => {
  const entry = new OtherWork(req.body);
  try {
    const newEntry = await entry.save();
    res.status(201).json(newEntry);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// اپڈیٹ کریں
router.put('/update/:id', async (req, res) => {
  try {
    const updated = await OtherWork.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ڈیلیٹ کریں
router.delete('/delete/:id', async (req, res) => {
  try {
    await OtherWork.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;