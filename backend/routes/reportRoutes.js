const express = require('express');
const router = express.Router();
const Report = require('../models/Report');

// 1. تمام ریپورٹس کی لسٹ حاصل کریں
router.get('/all', async (req, res) => {
  try {
    const reports = await Report.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. نئی ریپورٹ کا ریکارڈ شامل کریں (Testing کے لیے)
router.post('/generate', async (req, res) => {
  const report = new Report(req.body);
  try {
    const newReport = await report.save();
    res.status(201).json(newReport);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;