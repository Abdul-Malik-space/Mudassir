const express = require("express");
const router = express.Router();

const Header = require("../models/Header");


// GET ALL
router.get("/all", async (req, res) => {
  try {
    const headers = await Header.find();

    res.status(200).json(headers);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});


// ADD
router.post("/add", async (req, res) => {
  try {
    const newHeader = new Header(req.body);

    await newHeader.save();

    res.status(201).json({
      message: "Header Added Successfully",
      data: newHeader
    });
  } catch (err) {
    res.status(400).json({
      error: err.message
    });
  }
});


// UPDATE
router.put("/update/:id", async (req, res) => {
  try {
    const updated = await Header.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    res.status(200).json(updated);
  } catch (err) {
    res.status(400).json({
      error: err.message
    });
  }
});


// DELETE
router.delete("/delete/:id", async (req, res) => {
  try {
    await Header.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: "Deleted Successfully"
    });
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

module.exports = router;