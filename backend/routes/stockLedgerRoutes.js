const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Item = require("../models/Item");
const StockLedger = require("../models/StockLedger");
const { postStockMovement } = require("../utils/stockService");

const todayDate = () => new Date().toISOString().slice(0, 10);

router.get("/all", async (req, res) => {
  try {
    const { item = "", warehouse = "", movementType = "" } = req.query;

    const query = {};

    if (item) query.item = item;
    if (warehouse) query.warehouse = warehouse;
    if (movementType) query.movementType = movementType;

    const rows = await StockLedger.find(query)
      .populate("item", "code name unit category brand")
      .sort({ createdAt: -1 });

    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Stock ledger load nahi hua",
      error: error.message,
    });
  }
});

router.get("/balances", async (req, res) => {
  try {
    const rows = await StockLedger.aggregate([
      {
        $group: {
          _id: {
            item: "$item",
            warehouse: "$warehouse",
          },
          itemCode: { $first: "$itemCode" },
          itemName: { $first: "$itemName" },
          unit: { $first: "$unit" },
          qtyIn: { $sum: "$qtyIn" },
          qtyOut: { $sum: "$qtyOut" },
        },
      },
      {
        $project: {
          item: "$_id.item",
          warehouse: "$_id.warehouse",
          itemCode: 1,
          itemName: 1,
          unit: 1,
          qtyIn: 1,
          qtyOut: 1,
          currentStock: { $subtract: ["$qtyIn", "$qtyOut"] },
        },
      },
      {
        $sort: {
          itemName: 1,
          warehouse: 1,
        },
      },
    ]);

    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Stock balances load nahi huay",
      error: error.message,
    });
  }
});

router.get("/item/:itemId", async (req, res) => {
  try {
    const item = await Item.findById(req.params.itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const rows = await StockLedger.find({
      item: req.params.itemId,
    }).sort({ createdAt: -1 });

    const qtyIn = rows.reduce((s, r) => s + Number(r.qtyIn || 0), 0);
    const qtyOut = rows.reduce((s, r) => s + Number(r.qtyOut || 0), 0);

    res.status(200).json({
      success: true,
      item,
      qtyIn,
      qtyOut,
      currentStock: qtyIn - qtyOut,
      ledger: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Item stock load nahi hua",
      error: error.message,
    });
  }
});

router.post("/manual", async (req, res) => {
  try {
    const {
      item,
      type,
      quantity,
      warehouse,
      rate,
      remarks,
      date,
    } = req.body;

    if (!item) {
      return res.status(400).json({
        success: false,
        message: "Item required hai",
      });
    }

    const qty = Number(quantity || 0);

    if (qty <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity zero se zyada honi chahiye",
      });
    }

    if (!["IN", "OUT"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type IN ya OUT hona chahiye",
      });
    }

    const ledger = await postStockMovement({
      item,
      warehouse: warehouse || "Main Godown",
      date: date || todayDate(),
      movementType: type === "IN" ? "Adjustment In" : "Adjustment Out",
      sourceModule: "Manual Stock Adjustment",
      referenceModel: "StockLedger",
      referenceId: null,
      referenceNo: "",
      qtyIn: type === "IN" ? qty : 0,
      qtyOut: type === "OUT" ? qty : 0,
      rate: Number(rate || 0),
      remarks: remarks || "",
    });

    res.status(201).json({
      success: true,
      message:
        type === "IN"
          ? "Stock plus successfully"
          : "Stock minus successfully",
      data: ledger,
    });
  } catch (error) {
    console.error("Manual Stock Error:", error);

    res.status(400).json({
      success: false,
      message: "Stock adjustment nahi hui",
      error: error.message,
    });
  }
});

module.exports = router;