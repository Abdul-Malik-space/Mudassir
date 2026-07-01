const express = require("express");
const router = express.Router();
const Trader = require("../models/trader");

// 1. تمام ٹریڈرز حاصل کریں (GET)
router.get("/all", async (req, res) => {
  try {
    const traders = await Trader.find();
    res.status(200).json(traders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. نیا ٹریڈر ایڈ کریں (POST) - یہ آپ کے کوڈ میں مسنگ تھا!
router.post("/add", async (req, res) => {
  try {
    console.log("Frontend سے آنے والا ڈیٹا:", req.body); // ٹرمینل میں چیک کریں
    const newTrader = new Trader(req.body);
    await newTrader.save();
    res.status(201).json({ message: "Success", data: newTrader });
  } catch (error) {
    console.log("بیکنڈ میں اصل غلطی یہ ہے:", error.message); // یہ ٹرمینل میں دیکھیں
    res.status(400).json({ error: error.message });
  }
});

// 3. ٹریڈر اپڈیٹ کریں (PUT)
router.put("/update/:id", async (req, res) => {
  try {
    const updatedTrader = await Trader.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true } 
    );
    res.status(200).json({ message: "Trader updated!", data: updatedTrader });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 4. ٹریڈر ڈیلیٹ کریں (DELETE)
router.delete("/delete/:id", async (req, res) => {
  try {
    await Trader.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Trader deleted successfully!" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;