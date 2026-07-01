const express = require('express');
const router = express.Router();
const Warehouse = require('../models/Warehouse');

// 1. تمام گودام حاصل کریں
router.get('/all', async (req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({ createdAt: -1 });
    res.json(warehouses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 2. نیا گودام شامل کریں
router.post('/add', async (req, res) => {
  const warehouse = new Warehouse(req.body);
  try {
    const newWarehouse = await warehouse.save();
    res.status(201).json(newWarehouse);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 3. گودام اپڈیٹ کریں
router.put('/update/:id', async (req, res) => {
  try {
    const updatedWarehouse = await Warehouse.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { returnDocument: 'after' }
    );
    res.json(updatedWarehouse);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// 4. گودام ڈیلیٹ کریں
router.delete('/delete/:id', async (req, res) => {
  try {
    await Warehouse.findByIdAndDelete(req.params.id);
    res.json({ message: "Warehouse Deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;