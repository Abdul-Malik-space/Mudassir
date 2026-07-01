const express = require("express");
const router = express.Router();
const Brand = require("../models/Brand");

// 1. تمام برانڈز حاصل کریں
router.get("/all", async (req, res) => {
  try {
    const brands = await Brand.find().sort({ createdAt: -1 });
    res.json(brands);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. نیا برانڈ شامل کریں
router.post("/add", async (req, res) => {
  try {
    const newBrand = new Brand(req.body);
    await newBrand.save();
    res.status(201).json(newBrand);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. برانڈ اپڈیٹ کریں
router.put("/update/:id", async (req, res) => {
  try {
    const updated = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. برانڈ ڈیلیٹ کریں
router.delete("/delete/:id", async (req, res) => {
  try {
    await Brand.findByIdAndDelete(req.params.id);
    res.json({ message: "Brand Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;