const express = require("express");
const router = express.Router();
const Lamination = require("../models/Lamination");

// تمام ڈیٹا حاصل کریں
router.get("/all", async (req, res) => {
  try {
    const data = await Lamination.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// نیا اندراج شامل کریں
router.post("/add", async (req, res) => {
  const entry = new Lamination(req.body);
  try {
    const newEntry = await entry.save();
    res.status(201).json(newEntry);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// اپڈیٹ کریں
router.put("/update/:id", async (req, res) => {
  try {
    const updated = await Lamination.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ڈیلیٹ کریں
router.delete("/delete/:id", async (req, res) => {
  await Lamination.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

module.exports = router;