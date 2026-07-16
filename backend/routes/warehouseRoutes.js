const express = require("express");
const router = express.Router();

const Warehouse = require("../models/Warehouse");
const StockLedger = require("../models/StockLedger");

const cleanPayload = (body = {}) => {
  return {
    name: String(body.name || "").trim(),
    location: String(body.location || "").trim(),
    capacity: String(body.capacity || "").trim(),
    capacityPercent: Number(body.capacityPercent || 0),
    status: ["Active", "Inactive", "Full"].includes(body.status)
      ? body.status
      : "Active",
    notes: String(body.notes || "").trim(),
  };
};

router.get("/all", async (req, res) => {
  try {
    const { search = "", status = "" } = req.query;

    const query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { capacity: { $regex: search, $options: "i" } },
      ];
    }

    const warehouses = await Warehouse.find(query).sort({ createdAt: -1 });

    res.status(200).json(warehouses);
  } catch (error) {
    console.error("Warehouses Load Error:", error);

    res.status(500).json({
      success: false,
      message: "Warehouses load nahi huay",
      error: error.message,
    });
  }
});

router.get("/active", async (req, res) => {
  try {
    const warehouses = await Warehouse.find({
      status: { $in: ["Active", "Full"] },
    }).sort({ name: 1 });

    res.status(200).json(warehouses);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Active warehouses load nahi huay",
      error: error.message,
    });
  }
});

router.post("/add", async (req, res) => {
  try {
    const payload = cleanPayload(req.body);

    if (!payload.name) {
      return res.status(400).json({
        success: false,
        message: "Warehouse name required hai",
      });
    }

    const warehouse = await Warehouse.create(payload);

    res.status(201).json({
      success: true,
      message: "Warehouse added successfully",
      data: warehouse,
    });
  } catch (error) {
    console.error("Warehouse Add Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ye warehouse name already used hai",
      });
    }

    res.status(500).json({
      success: false,
      message: "Warehouse save nahi hua",
      error: error.message,
    });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    const payload = cleanPayload(req.body);

    if (!payload.name) {
      return res.status(400).json({
        success: false,
        message: "Warehouse name required hai",
      });
    }

    const updatedWarehouse = await Warehouse.findByIdAndUpdate(
      req.params.id,
      payload,
      {
        returnDocument: "after",
        runValidators: true,
      }
    );

    if (!updatedWarehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Warehouse updated successfully",
      data: updatedWarehouse,
    });
  } catch (error) {
    console.error("Warehouse Update Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ye warehouse name already used hai",
      });
    }

    res.status(500).json({
      success: false,
      message: "Warehouse update nahi hua",
      error: error.message,
    });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    const hasStockMovement = await StockLedger.exists({
      warehouse: warehouse.name,
    });

    if (hasStockMovement) {
      return res.status(400).json({
        success: false,
        message:
          "Is warehouse ki stock ledger entries exist karti hain. Delete ke bajaye Inactive karein.",
      });
    }

    await Warehouse.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Warehouse deleted successfully",
    });
  } catch (error) {
    console.error("Warehouse Delete Error:", error);

    res.status(500).json({
      success: false,
      message: "Warehouse delete nahi hua",
      error: error.message,
    });
  }
});

module.exports = router;