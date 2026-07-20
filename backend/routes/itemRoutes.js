const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Item = require("../models/Item");
const StockLedger = require("../models/StockLedger");
const Counter = require("../models/Counter");

const { postStockMovement } = require("../utils/stockService");

const RAW_MATERIAL_GODOWN = "Raw Material Godown";
const FINISHED_GOODS_GODOWN = "Finished Goods Godown";

const VALID_ITEM_TYPES = [
  "Raw Material",
  "Packing Material",
  "Finished Good",
  "Consumable",
  "Service",
];

const VALID_STATUSES = ["Active", "Inactive"];

const ITEM_TYPE_ALIASES = {
  RAW_MATERIAL: "Raw Material",
  RAWMATERIAL: "Raw Material",

  PACKING_MATERIAL: "Packing Material",
  PACKINGMATERIAL: "Packing Material",

  FINISHED_GOOD: "Finished Good",
  FINISHED_GOODS: "Finished Good",
  FINISHEDGOOD: "Finished Good",
  FINISHEDGOODS: "Finished Good",
  FINISHED_PRODUCT: "Finished Good",
  FINISHEDPRODUCT: "Finished Good",

  CONSUMABLE: "Consumable",
  CONSUMABLES: "Consumable",

  SERVICE: "Service",
  SERVICES: "Service",
};

const normalizeItemType = (value) => {
  if (value === undefined || value === null || value === "") {
    return "Raw Material";
  }

  const originalValue = String(value).trim();

  const normalizedKey = originalValue
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

  return ITEM_TYPE_ALIASES[normalizedKey] || originalValue;
};

const normalizeStatus = (value) => {
  if (value === undefined || value === null || value === "") {
    return "Active";
  }

  const normalizedValue = String(value).trim().toLowerCase();

  if (normalizedValue === "active") return "Active";
  if (normalizedValue === "inactive") return "Inactive";

  return String(value).trim();
};

const nonNegativeNumber = (value, defaultValue = 0) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return defaultValue;
  }

  return number < 0 ? 0 : number;
};

const getDefaultWarehouse = (itemType) => {
  if (itemType === "Finished Good") {
    return FINISHED_GOODS_GODOWN;
  }

  if (itemType === "Service") {
    return "";
  }

  return RAW_MATERIAL_GODOWN;
};

const isValidItemId = (id) => {
  return mongoose.isValidObjectId(id);
};

const cleanCreatePayload = (body = {}) => {
  const itemType = normalizeItemType(body.itemType);

  const payload = {
    code: body.code
      ? String(body.code).trim().toUpperCase()
      : undefined,

    name: String(body.name || "").trim(),

    itemType,

    category:
      String(body.category || "").trim() || "General",

    brand: String(body.brand || "").trim(),

    unit:
      String(body.unit || "").trim() || "Pcs",

    purchasePrice: nonNegativeNumber(body.purchasePrice),

    salePrice: nonNegativeNumber(body.salePrice),

    openingStock: nonNegativeNumber(body.openingStock),

    minStock: nonNegativeNumber(body.minStock),

    stockManaged: itemType !== "Service",

    status: normalizeStatus(body.status),

    notes: String(body.notes || "").trim(),
  };

  if (itemType === "Service") {
    payload.stockManaged = false;
    payload.openingStock = 0;
    payload.minStock = 0;
  }

  return payload;
};

const cleanUpdatePayload = (body = {}) => {
  const payload = {};

  if (body.code !== undefined) {
    payload.code = String(body.code || "")
      .trim()
      .toUpperCase();
  }

  if (body.name !== undefined) {
    payload.name = String(body.name || "").trim();
  }

  if (body.itemType !== undefined) {
    payload.itemType = normalizeItemType(body.itemType);
  }

  if (body.category !== undefined) {
    payload.category =
      String(body.category || "").trim() || "General";
  }

  if (body.brand !== undefined) {
    payload.brand = String(body.brand || "").trim();
  }

  if (body.unit !== undefined) {
    payload.unit =
      String(body.unit || "").trim() || "Pcs";
  }

  if (body.purchasePrice !== undefined) {
    payload.purchasePrice = nonNegativeNumber(
      body.purchasePrice
    );
  }

  if (body.salePrice !== undefined) {
    payload.salePrice = nonNegativeNumber(
      body.salePrice
    );
  }

  if (body.minStock !== undefined) {
    payload.minStock = nonNegativeNumber(body.minStock);
  }

  if (body.status !== undefined) {
    payload.status = normalizeStatus(body.status);
  }

  if (body.notes !== undefined) {
    payload.notes = String(body.notes || "").trim();
  }

  /*
   * Opening stock update سے تبدیل نہیں ہوگا۔
   * بعد کی stock corrections Manual Stock Adjustment سے ہوں گی۔
   */
  delete payload.openingStock;
  delete payload.openingStockPosted;

  return payload;
};

const getNextItemCode = async () => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const counter = await Counter.findOneAndUpdate(
      { name: "itemCode" },
      { $inc: { seq: 1 } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    const code = `ITM-${String(counter.seq).padStart(
      4,
      "0"
    )}`;

    const alreadyExists = await Item.exists({ code });

    if (!alreadyExists) {
      return code;
    }
  }

  throw new Error("Unable to generate unique item code");
};

const getStockMap = async () => {
  const rows = await StockLedger.aggregate([
    {
      $group: {
        _id: "$item",
        qtyIn: {
          $sum: {
            $ifNull: ["$qtyIn", 0],
          },
        },
        qtyOut: {
          $sum: {
            $ifNull: ["$qtyOut", 0],
          },
        },
      },
    },
  ]);

  const stockMap = new Map();

  rows.forEach((row) => {
    const qtyIn = Number(row.qtyIn || 0);
    const qtyOut = Number(row.qtyOut || 0);

    stockMap.set(String(row._id), {
      qtyIn,
      qtyOut,
      currentStock: qtyIn - qtyOut,
    });
  });

  return stockMap;
};

const getItemWarehouseBalances = async (itemId) => {
  const rows = await StockLedger.aggregate([
    {
      $match: {
        item: new mongoose.Types.ObjectId(itemId),
      },
    },
    {
      $group: {
        _id: {
          $ifNull: ["$warehouse", "Unknown Warehouse"],
        },
        qtyIn: {
          $sum: {
            $ifNull: ["$qtyIn", 0],
          },
        },
        qtyOut: {
          $sum: {
            $ifNull: ["$qtyOut", 0],
          },
        },
      },
    },
    {
      $sort: {
        _id: 1,
      },
    },
  ]);

  return rows.map((row) => {
    const qtyIn = Number(row.qtyIn || 0);
    const qtyOut = Number(row.qtyOut || 0);

    return {
      warehouse: row._id,
      qtyIn,
      qtyOut,
      currentStock: qtyIn - qtyOut,
    };
  });
};

/*
|--------------------------------------------------------------------------
| Preview Next Item Code
|--------------------------------------------------------------------------
*/

router.get("/next-code", async (req, res) => {
  try {
    const counter = await Counter.findOne({
      name: "itemCode",
    });

    const nextSequence = counter
      ? Number(counter.seq || 0) + 1
      : 1;

    return res.status(200).json({
      success: true,
      code: `ITM-${String(nextSequence).padStart(
        4,
        "0"
      )}`,
    });
  } catch (error) {
    console.error("Next Item Code Error:", error);

    return res.status(500).json({
      success: false,
      message: "Item code generate nahi hua",
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| Add Item
|--------------------------------------------------------------------------
*/

router.post("/add", async (req, res) => {
  let createdItem = null;

  try {
    const payload = cleanCreatePayload(req.body);

    if (!payload.name) {
      return res.status(400).json({
        success: false,
        message: "Item name required hai",
      });
    }

    if (!VALID_ITEM_TYPES.includes(payload.itemType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item type",
      });
    }

    if (!VALID_STATUSES.includes(payload.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item status",
      });
    }

    if (!payload.code) {
      payload.code = await getNextItemCode();
    }

    createdItem = await Item.create(payload);

    let finalItem = createdItem;

    /*
     * Opening stock صرف initial system setup کے لیے ہے۔
     * Regular stock GRN یا Production Receipt سے آئے گا۔
     */
    if (
      createdItem.stockManaged &&
      payload.openingStock > 0
    ) {
      const openingWarehouse = getDefaultWarehouse(
        createdItem.itemType
      );

      await postStockMovement({
        item: createdItem._id,
        warehouse: openingWarehouse,

        movementType: "Opening Stock",

        sourceModule: "Item Master",
        referenceModel: "Item",
        referenceId: createdItem._id,
        referenceNo: createdItem.code,

        qtyIn: payload.openingStock,
        qtyOut: 0,

        rate: payload.purchasePrice,

        remarks:
          createdItem.itemType === "Finished Good"
            ? "Initial finished goods opening stock"
            : "Initial raw material opening stock",
      });

      finalItem = await Item.findByIdAndUpdate(
        createdItem._id,
        {
          openingStockPosted: true,
        },
        {
          new: true,
          runValidators: true,
        }
      );
    }

    return res.status(201).json({
      success: true,
      message: "Item added successfully",
      data: {
        ...finalItem.toObject(),
        defaultWarehouse: getDefaultWarehouse(
          finalItem.itemType
        ),
      },
    });
  } catch (error) {
    console.error("Item Add Error:", error);

    /*
     * Stock posting fail ہونے پر بغیر stock والا ادھورا
     * نیا item remove کردیا جائے گا۔
     */
    if (createdItem && !createdItem.openingStockPosted) {
      try {
        const movementExists = await StockLedger.exists({
          item: createdItem._id,
        });

        if (!movementExists) {
          await Item.findByIdAndDelete(createdItem._id);
        }
      } catch (rollbackError) {
        console.error(
          "Item Rollback Error:",
          rollbackError
        );
      }
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ye item code already used hai",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Item save nahi hua",
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| Get All Items
|--------------------------------------------------------------------------
*/

router.get("/all", async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      category = "",
      itemType = "",
      stockManaged = "",
    } = req.query;

    const query = {};

    if (status && status !== "All") {
      query.status = normalizeStatus(status);
    }

    if (category && category !== "All") {
      query.category = category;
    }

    if (itemType && itemType !== "All") {
      query.itemType = normalizeItemType(itemType);
    }

    if (stockManaged === "true") {
      query.stockManaged = true;
    }

    if (stockManaged === "false") {
      query.stockManaged = false;
    }

    if (search) {
      query.$or = [
        {
          code: {
            $regex: search,
            $options: "i",
          },
        },
        {
          name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          category: {
            $regex: search,
            $options: "i",
          },
        },
        {
          brand: {
            $regex: search,
            $options: "i",
          },
        },
        {
          itemType: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const items = await Item.find(query).sort({
      createdAt: -1,
    });

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

        defaultWarehouse: getDefaultWarehouse(
          item.itemType
        ),
      };
    });

    /*
     * Frontend پہلے سے direct array expect کرتا ہے۔
     */
    return res.status(200).json(itemsWithStock);
  } catch (error) {
    console.error("Items Load Error:", error);

    return res.status(500).json({
      success: false,
      message: "Items load nahi huay",
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| Get Single Item
|--------------------------------------------------------------------------
*/

router.get("/:id", async (req, res) => {
  try {
    if (!isValidItemId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID",
      });
    }

    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const warehouseBalances =
      await getItemWarehouseBalances(req.params.id);

    const totals = warehouseBalances.reduce(
      (summary, row) => {
        summary.qtyIn += Number(row.qtyIn || 0);
        summary.qtyOut += Number(row.qtyOut || 0);
        summary.currentStock += Number(
          row.currentStock || 0
        );

        return summary;
      },
      {
        qtyIn: 0,
        qtyOut: 0,
        currentStock: 0,
      }
    );

    return res.status(200).json({
      success: true,
      data: {
        ...item.toObject(),

        qtyIn: totals.qtyIn,
        qtyOut: totals.qtyOut,
        currentStock: totals.currentStock,

        defaultWarehouse: getDefaultWarehouse(
          item.itemType
        ),

        warehouseBalances,
      },
    });
  } catch (error) {
    console.error("Single Item Load Error:", error);

    return res.status(500).json({
      success: false,
      message: "Item load nahi hua",
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| Update Item
|--------------------------------------------------------------------------
*/

router.put("/update/:id", async (req, res) => {
  try {
    if (!isValidItemId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID",
      });
    }

    const existingItem = await Item.findById(
      req.params.id
    );

    if (!existingItem) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const payload = cleanUpdatePayload(req.body);

    if (
      payload.name !== undefined &&
      !payload.name
    ) {
      return res.status(400).json({
        success: false,
        message: "Item name required hai",
      });
    }

    if (
      payload.itemType !== undefined &&
      !VALID_ITEM_TYPES.includes(payload.itemType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid item type",
      });
    }

    if (
      payload.status !== undefined &&
      !VALID_STATUSES.includes(payload.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid item status",
      });
    }

    const finalItemType =
      payload.itemType || existingItem.itemType;

    /*
     * Stock history بننے کے بعد Item Type تبدیل کرنے سے
     * Raw Material اور Finished Goods warehouses mix ہوسکتے ہیں۔
     */
    if (
      payload.itemType &&
      payload.itemType !== existingItem.itemType
    ) {
      const hasStockMovement =
        await StockLedger.exists({
          item: existingItem._id,
        });

      if (hasStockMovement) {
        return res.status(400).json({
          success: false,
          message:
            "Is item ka stock ledger exist karta hai. Item type ab change nahi ho sakta.",
        });
      }
    }

    payload.stockManaged =
      finalItemType !== "Service";

    if (finalItemType === "Service") {
      payload.stockManaged = false;
      payload.minStock = 0;
    }

    if (!payload.code) {
      delete payload.code;
    }

    const updatedItem =
      await Item.findByIdAndUpdate(
        req.params.id,
        payload,
        {
          new: true,
          runValidators: true,
        }
      );

    return res.status(200).json({
      success: true,
      message: "Item updated successfully",
      data: {
        ...updatedItem.toObject(),

        defaultWarehouse: getDefaultWarehouse(
          updatedItem.itemType
        ),
      },
    });
  } catch (error) {
    console.error("Item Update Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ye item code already used hai",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Item update nahi hua",
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| Delete Item
|--------------------------------------------------------------------------
*/

router.delete("/delete/:id", async (req, res) => {
  try {
    if (!isValidItemId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID",
      });
    }

    const item = await Item.findById(req.params.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const hasStockMovement =
      await StockLedger.exists({
        item: item._id,
      });

    if (hasStockMovement) {
      return res.status(400).json({
        success: false,
        message:
          "Is item ka stock ledger exist karta hai. Delete ke bajaye item ko Inactive karein.",
      });
    }

    await Item.findByIdAndDelete(item._id);

    return res.status(200).json({
      success: true,
      message: "Item deleted successfully",
    });
  } catch (error) {
    console.error("Item Delete Error:", error);

    return res.status(500).json({
      success: false,
      message: "Item delete nahi hua",
      error: error.message,
    });
  }
});

module.exports = router;