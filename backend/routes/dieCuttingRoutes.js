// routes/dieCutting.js
const express = require('express');
const router = express.Router();
const DieCutting = require('../models/DieCutting');

// --- 1. تمام ریکارڈز حاصل کریں (GET) ---
router.get('/all', async (req, res) => {
  try {
    const entries = await DieCutting.find().sort({ createdAt: -1 });
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: "ڈیٹا لوڈ کرنے میں مسئلہ ہے" });
  }
});

// --- 2. نیا ریکارڈ شامل کریں (POST) ---
router.post('/add', async (req, res) => {
  const newEntry = new DieCutting({
    ...req.body,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  try {
    const savedEntry = await newEntry.save();
    res.status(201).json(savedEntry);
  } catch (err) {
    res.status(400).json({ message: "ڈیٹا سیو نہیں ہو سکا" });
  }
});

// --- 3. ریکارڈ اپڈیٹ کریں (PUT) ---
router.put('/update/:id', async (req, res) => {
  try {
    const updated = await DieCutting.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: "اپڈیٹ میں ناکامی" });
  }
});

// --- 4. ریکارڈ ڈیلیٹ کریں (DELETE) ---
router.delete('/delete/:id', async (req, res) => {
  try {
    await DieCutting.findByIdAndDelete(req.params.id);
    res.json({ message: "ریکارڈ ختم کر دیا گیا" });
  } catch (err) {
    res.status(500).json({ message: "ڈیلیٹ نہیں ہو سکا" });
  }
});

module.exports = router;