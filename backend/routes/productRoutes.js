const express = require("express");
const router = express.Router();
const Product = require("../models/Product"); // پروڈکٹ ماڈل امپورٹ کریں

// 1. تمام پروڈکٹس حاصل کریں (نئی پروڈکٹس پہلے آئیں گی)
router.get("/all", async (req, res) => {
  try {
    // اگر آپ برانڈ کی تفصیلات بھی ساتھ دکھانا چاہتے ہیں تو .populate('brandId') استعمال کر سکتے ہیں
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. نئی پروڈکٹ شامل کریں
router.post("/add", async (req, res) => {
  try {
    const newProduct = new Product(req.body);
    await newProduct.save();
    res.status(201).json(newProduct);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 3. پروڈکٹ اپڈیٹ کریں (قیمت، اسٹاک، یا نام وغیرہ تبدیل کرنے کے لیے)
router.put("/update/:id", async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true } // یہ اپڈیٹ شدہ ڈیٹا واپس کرے گا
    );
    res.json(updatedProduct);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. پروڈکٹ ڈیلیٹ کریں
router.delete("/delete/:id", async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product Deleted Successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;