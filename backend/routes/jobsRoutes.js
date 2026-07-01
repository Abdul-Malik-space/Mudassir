const express = require("express");
const router = express.Router();
const ProductionItem = require("../models/ProductionItem");

router.get("/active", async (req, res) => {
  try {
    const jobs = await ProductionItem.find({ status: "Active" })
      .select("code name customerName quantity status createdAt")
      .sort({ createdAt: -1 });

    res.json(
      jobs.map((job) => ({
        jobCode: job.code,
        itemName: job.name,
        customerName: job.customerName,
        quantity: job.quantity,
        status: job.status,
      }))
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
