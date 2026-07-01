const express = require('express');
const router = express.Router();
const Printing = require('../models/Printing');


router.get('/all', async (req, res) => {
  try {
    const entries = await Printing.find().sort({ createdAt: -1 }); // تازہ ترین پہلے
    res.json(entries);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. نیا ریکارڈ محفوظ کریں (POST)
router.post('/add', async (req, res) => {
  const entry = new Printing(req.body);
  try {
    const newEntry = await entry.save();
    res.status(201).json(newEntry);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 3. ریکارڈ اپڈیٹ کریں (PUT)
router.put('/update/:id', async (req, res) => {
  try {
    const updatedEntry = await Printing.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true } // اپڈیٹ شدہ ڈیٹا واپس بھیجے
    );
    res.json(updatedEntry);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 4. ریکارڈ ڈیلیٹ کریں (DELETE)
router.delete('/delete/:id', async (req, res) => {
  try {
    await Printing.findByIdAndDelete(req.params.id);
    res.json({ message: "Entry Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;