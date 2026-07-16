const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

const Item = require("../models/Item");
const StockLedger = require("../models/StockLedger");
const Counter = require("../models/Counter");
const { postStockMovement } = require("../utils/stockService");

const cleanPayload = (body = {}) => {
  return {
    code: body.code ? String(body.code).trim().toUpperCase() : undefined,
    name: String(body.name || "").trim(),
    category: String(body.category || "General").trim(),
    brand: String(body.brand || "").trim(),
    unit: String(body.unit || "Pcs").trim(),
    purchasePrice: Number(body.purchasePrice || 0),
    salePrice: Number(body.salePrice || 0),
    openingStock: Number(body.openingStock || 0),
    minStock: Number(body.minStock || 0),
    status: ["Active", "Inactive"].includes(body.status)
      ? body.status
      : "Active",
    notes: String(body.notes || "").trim(),
  };
};

const getNextItemCode = async () => {
  let code = "";

  for (let i = 0; i < 5; i++) {
    const counter = await Counter.findOneAndUpdate(
      { name: "itemCode" },
      { $inc: { seq: 1 } },
      {
        returnDocument: "after",
        upsert: true,
      }
    );

    code = `ITM-${String(counter.seq).padStart(4, "0")}`;

    const exists = await Item.findOne({ code });
    if (!exists) return code;
  }

  throw new Error("Unable to generate unique item code");
};

const getStockMap = async () => {
  const rows = await StockLedger.aggregate([
    {
      $group: {
        _id: "$item",
        qtyIn: { $sum: "$qtyIn" },
        qtyOut: { $sum: "$qtyOut" },
      },
    },
  ]);

  const map = new Map();

  rows.forEach((row) => {
    map.set(String(row._id), {
      qtyIn: Number(row.qtyIn || 0),
      qtyOut: Number(row.qtyOut || 0),
      currentStock: Number(row.qtyIn || 0) - Number(row.qtyOut || 0),
    });
  });

  return map;
};

router.get("/next-code", async (req, res) => {
  try {
    const counter = await Counter.findOne({ name: "itemCode" });
    const nextSeq = counter ? counter.seq + 1 : 1;

    res.status(200).json({
      success: true,
      code: `ITM-${String(nextSeq).padStart(4, "0")}`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Item code generate nahi hua",
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
        message: "Item name required hai",
      });
    }

    if (!payload.code) {
      payload.code = await getNextItemCode();
    }

    const item = await Item.create(payload);

    if (payload.openingStock > 0) {
      await postStockMovement({
        item: item._id,
        warehouse: "Main Godown",
        movementType: "Opening Stock",
        sourceModule: "Item Master",
        referenceModel: "Item",
        referenceId: item._id,
        referenceNo: item.code,
        qtyIn: payload.openingStock,
        rate: payload.purchasePrice,
        remarks: "Opening stock from item master",
      });
    }

    res.status(201).json({
      success: true,
      message: "Item added successfully",
      data: item,
    });
  } catch (error) {
    console.error("Item Add Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ye item code already used hai",
      });
    }

    res.status(500).json({
      success: false,
      message: "Item save nahi hua",
      error: error.message,
    });
  }
});

router.get("/all", async (req, res) => {
  try {
    const { search = "", status = "", category = "" } = req.query;

    const query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
        { brand: { $regex: search, $options: "i" } },
      ];
    }

    const items = await Item.find(query).sort({ createdAt: -1 });
    const stockMap = await getStockMap();

    const itemsWithStock = items.map((item) => {
      const stock = stockMap.get(String(item._id)) || {
        qtyIn: 0,
        qtyOut: 0,
        currentStock: 0,
      };

      return {
        ...item.toObject(),
        qtyIn: stock.qtyIn,
        qtyOut: stock.qtyOut,
        currentStock: stock.currentStock,
      };
    });

    res.status(200).json(itemsWithStock);
  } catch (error) {
    console.error("Items Load Error:", error);

    res.status(500).json({
      success: false,
      message: "Items load nahi huay",
      error: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const stockRows = await StockLedger.aggregate([
      {
        $match: {
          item: new mongoose.Types.ObjectId(req.params.id),
        },
      },
      {
        $group: {
          _id: "$item",
          qtyIn: { $sum: "$qtyIn" },
          qtyOut: { $sum: "$qtyOut" },
        },
      },
    ]);

    const row = stockRows[0] || { qtyIn: 0, qtyOut: 0 };

    res.status(200).json({
      success: true,
      data: {
        ...item.toObject(),
        qtyIn: Number(row.qtyIn || 0),
        qtyOut: Number(row.qtyOut || 0),
        currentStock: Number(row.qtyIn || 0) - Number(row.qtyOut || 0),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Item load nahi hua",
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
        message: "Item name required hai",
      });
    }

    if (!payload.code) {
      delete payload.code;
    }

    const item = await Item.findByIdAndUpdate(req.params.id, payload, {
      returnDocument: "after",
      runValidators: true,
    });

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Item updated successfully",
      data: item,
    });
  } catch (error) {
    console.error("Item Update Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ye item code already used hai",
      });
    }

    res.status(500).json({
      success: false,
      message: "Item update nahi hua",
      error: error.message,
    });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    const hasStockMovement = await StockLedger.exists({
      item: req.params.id,
    });

    if (hasStockMovement) {
      return res.status(400).json({
        success: false,
        message:
          "Is item ka stock ledger exist karta hai. Delete ke bajaye item ko Inactive karein.",
      });
    }

    const deletedItem = await Item.findByIdAndDelete(req.params.id);

    if (!deletedItem) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Item deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Item delete nahi hua",
      error: error.message,
    });
  }
});

module.exports = router;