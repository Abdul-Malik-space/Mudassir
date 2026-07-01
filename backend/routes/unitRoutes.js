const express = require("express");
const router = express.Router();
const Unit = require("../models/Unit");

// 1. تمام یونٹس حاصل کریں
router.get("/all", async (req, res) => {
  try {
    const units = await Unit.find().sort({ createdAt: -1 });
    res.json(units);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. نیا یونٹ شامل کریں
router.post("/add", async (req, res) => {
  try {
    const newUnit = new Unit(req.body);
    await newUnit.save();
    res.status(201).json(newUnit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. یونٹ اپڈیٹ کریں
router.put("/update/:id", async (req, res) => {
  try {
    const updatedUnit = await Unit.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedUnit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. یونٹ ڈیلیٹ کریں
router.delete("/delete/:id", async (req, res) => {
  try {
    await Unit.findByIdAndDelete(req.params.id);
    res.json({ message: "Unit Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;