const express = require("express");
const router = express.Router();
const Vendor = require("../models/vendor");

// تمام وینڈرز حاصل کریں
router.get("/all", async (req, res) => {
  try {
    const vendors = await Vendor.find();
    res.status(200).json(vendors);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// نیا وینڈر ایڈ کریں
router.post("/add", async (req, res) => {
  try {
    const newVendor = new Vendor(req.body);
    await newVendor.save();
    res.status(201).json({ message: "Vendor added successfully!", data: newVendor });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


// وینڈر اپڈیٹ کریں
router.put("/update/:id", async (req, res) => {
  try {
    const updatedVendor = await Vendor.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updatedVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({
      message: "Vendor updated successfully!",
      data: updatedVendor
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});




// وینڈر ڈیلیٹ کریں
router.delete("/delete/:id", async (req, res) => {
  try {
    const deletedVendor = await Vendor.findByIdAndDelete(req.params.id);

    if (!deletedVendor) {
      return res.status(404).json({ message: "Vendor not found" });
    }

    res.status(200).json({
      message: "Vendor deleted successfully!"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;