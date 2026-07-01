const express = require('express');
const router = express.Router();
const ReadyProduct = require('../models/ReadyProducts');

// تمام اسٹاک حاصل کریں
router.get('/all', async (req, res) => {
  try {
    const products = await ReadyProduct.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// نیا اسٹاک ایڈ کریں
router.post('/add', async (req, res) => {
  const newProduct = new ReadyProduct(req.body);
  try {
    const saved = await newProduct.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// اپڈیٹ کریں
router.put('/update/:id', async (req, res) => {
  try {
    const updated = await ReadyProduct.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ڈیلیٹ کریں
router.delete('/delete/:id', async (req, res) => {
  try {
    await ReadyProduct.findByIdAndDelete(req.params.id);
    res.json({ message: "Stock entry deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;