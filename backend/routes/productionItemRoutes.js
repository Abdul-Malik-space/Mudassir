const express = require("express");
const router = express.Router();

// 🔴 1. کمنٹ ہٹا کر ماڈل امپورٹ کریں (چیک کر لیں کہ آپ کا ماڈل اسی فولڈر اور نام سے بنا ہوا ہے)
const ProductionItem = require("../models/ProductionItem"); 

// 1. نیا پروڈکشن آئٹم / جاب کارڈ ایڈ کرنے کا راؤٹ
router.post("/add", async (req, res) => {
  try {
    console.log("Incoming Production Data:", req.body);

    // 🔴 2. کمنٹ ہٹا دیا تاکہ ڈیٹا بیس میں سیو ہو
    const newItem = new ProductionItem(req.body);
    await newItem.save();

    res.status(201).json({
      success: true,
      message: "Production item/Job Card added successfully!",
      data: newItem
    });

  } catch (err) {
    console.error("🔴 PRODUCTION ERROR:", err.message);
    res.status(400).json({ 
      success: false, 
      error: err.message 
    });
  }
});

// 2. تمام پروڈکشن آئٹمز گیٹ (Get) کرنے کا راؤٹ
router.get("/all", async (req, res) => {
  try {
    // 🔴 3. ڈیٹا بیس سے تمام آئٹمز نکالیں
    const items = await ProductionItem.find().sort({ createdAt: -1 });
    
    // 🔴 4. فرنٹ اینڈ کو براہِ راست ایرے (Array) بھیجیں تاکہ فرنٹ اینڈ کریش نہ ہو
    res.status(200).json(items); 

  } catch (err) {
    console.error("🔴 FETCH ERROR:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


// 3. جاب کارڈ کو اپڈیٹ (Update) کرنے کا راؤٹ
router.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params; // یو آر ایل سے آئی ڈی نکالی
    
    // آئی ڈی کی مدد سے ڈیٹا بیس میں ڈھونڈ کر نیا ڈیٹا اپڈیٹ کریں
    const updatedItem = await ProductionItem.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true } // {new: true} سے اپڈیٹڈ ڈیٹا فوراً واپس ملتا ہے
    );

    if (!updatedItem) {
      return res.status(404).json({ success: false, message: "Job Card not found!" });
    }

    res.status(200).json({
      success: true,
      message: "Job Card updated successfully!",
      data: updatedItem
    });

  } catch (err) {
    console.error("🔴 UPDATE ERROR:", err.message);
    res.status(400).json({ success: false, error: err.message });
  }
});

// 4. جاب کارڈ کو ڈیلیٹ (Delete) کرنے کا راؤٹ
router.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params; // یو آر ایل سے آئی ڈی نکالی

    // آئی ڈی کی مدد سے ڈیٹا بیس سے ڈیلیٹ کریں
    const deletedItem = await ProductionItem.findByIdAndDelete(id);

    if (!deletedItem) {
      return res.status(404).json({ success: false, message: "Job Card not found!" });
    }

    res.status(200).json({
      success: true,
      message: "Job Card deleted successfully!"
    });

  } catch (err) {
    console.error("🔴 DELETE ERROR:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});
module.exports = router;