const express = require("express");
const router = express.Router();
const Customer = require("../models/customer"); // کسٹمر ماڈل


router.post("/add", async (req, res) => {
  try {
    const newCustomer = new Customer(req.body);
    await newCustomer.save();
    res.status(201).json({ message: "Customer added successfully!", data: newCustomer });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 2. تمام کسٹمرز کی لسٹ دیکھنے کے لیے (GET) -> /api/customers/all
router.get("/all", async (req, res) => {
  try {
    const customers = await Customer.find().sort({ createdAt: -1 }); // نئے کسٹمرز اوپر آئیں گے
    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// 3. کسٹمر کا ڈیٹا اپڈیٹ کرنے کے لیے (PUT) -> /api/customers/update/:id
router.put("/update/:id", async (req, res) => {
  try {
    const updatedCustomer = await Customer.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true } // نیا ڈیٹا واپس کرے گا اور ویلیڈیشن بھی چیک کرے گا
    );

    if (!updatedCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json({ message: "Customer updated successfully!", data: updatedCustomer });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 4. کسٹمر ڈیلیٹ کرنے کے لیے (DELETE) -> /api/customers/delete/:id
router.delete("/delete/:id", async (req, res) => {
  try {
    const deletedCustomer = await Customer.findByIdAndDelete(req.params.id);

    if (!deletedCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    res.status(200).json({ message: "Customer deleted successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;