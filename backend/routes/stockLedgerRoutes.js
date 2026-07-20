const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Item = require("../models/Item");
const Warehouse = require("../models/Warehouse");
const StockLedger = require("../models/StockLedger");

const {
  RAW_MATERIAL_GODOWN,
  FINISHED_GOODS_GODOWN,
  LEGACY_WAREHOUSE_NAMES,
  VALID_MOVEMENT_TYPES,
  ensureDefaultWarehouses,
  postStockMovement,
} = require("../utils/stockService");

const todayDate = () =>
  new Date().toISOString().slice(0, 10);

const escapeRegex = (value) => {
  return String(value).replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&"
  );
};

const normalizeText = (value, fallback = "") => {
  const cleanedValue = String(value || "").trim();

  return cleanedValue || fallback;
};

const normalizeNumber = (value, fallback = 0) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number;
};

const isValidDate = (value) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(
    String(value || "")
  );
};

const isValidObjectId = (value) => {
  return mongoose.isValidObjectId(value);
};

const getDefaultWarehouseName = (itemType) => {
  if (itemType === "Finished Good") {
    return FINISHED_GOODS_GODOWN;
  }

  return RAW_MATERIAL_GODOWN;
};

/*
|--------------------------------------------------------------------------
| Legacy Warehouse Mapping
|--------------------------------------------------------------------------
|
| پرانے Main Godown اور Muddasir Godown records کو Item Type کے مطابق
| Raw Material Godown یا Finished Goods Godown میں merge کیا جائے گا۔
|
*/

const normalizeLedgerWarehouse = (
  warehouseName,
  itemType
) => {
  const cleanedWarehouse = normalizeText(
    warehouseName
  );

  const isLegacyWarehouse =
    LEGACY_WAREHOUSE_NAMES.some(
      (name) =>
        name.toLowerCase() ===
        cleanedWarehouse.toLowerCase()
    );

  if (!cleanedWarehouse || isLegacyWarehouse) {
    return getDefaultWarehouseName(itemType);
  }

  return cleanedWarehouse;
};

/*
|--------------------------------------------------------------------------
| Warehouse and Item Compatibility
|--------------------------------------------------------------------------
*/

const itemCanExistInWarehouse = (
  item,
  warehouse
) => {
  if (
    !item ||
    item.stockManaged === false ||
    item.itemType === "Service"
  ) {
    return false;
  }

  const warehouseType =
    warehouse?.warehouseType || "General";

  if (warehouseType === "Work In Process") {
    return true;
  }

  if (warehouseType === "General") {
    return true;
  }

  if (item.itemType === "Finished Good") {
    return warehouseType === "Finished Goods";
  }

  return warehouseType === "Raw Material";
};

const findWarehouseFromInput = async (
  warehouseInput
) => {
  const cleanedInput = normalizeText(
    warehouseInput
  );

  if (!cleanedInput || cleanedInput === "All") {
    return null;
  }

  if (isValidObjectId(cleanedInput)) {
    return Warehouse.findById(cleanedInput);
  }

  return Warehouse.findOne({
    name: {
      $regex: `^${escapeRegex(cleanedInput)}$`,
      $options: "i",
    },
  });
};

/*
|--------------------------------------------------------------------------
| Stock Ledger List
|--------------------------------------------------------------------------
|
| GET /api/stock-ledger/all
|
| Supported filters:
| item
| warehouse
| movementType
| sourceModule
| dateFrom
| dateTo
| search
| limit
|
*/

router.get("/all", async (req, res) => {
  try {
    await ensureDefaultWarehouses();

    const {
      item = "",
      warehouse = "",
      movementType = "",
      sourceModule = "",
      dateFrom = "",
      dateTo = "",
      search = "",
      limit = "500",
    } = req.query;

    const conditions = [];

    if (item) {
      if (!isValidObjectId(item)) {
        return res.status(400).json({
          success: false,
          message: "Invalid item ID",
        });
      }

      conditions.push({
        item: new mongoose.Types.ObjectId(item),
      });
    }

    if (warehouse && warehouse !== "All") {
      const selectedWarehouse =
        await findWarehouseFromInput(warehouse);

      if (!selectedWarehouse) {
        return res.status(404).json({
          success: false,
          message: "Warehouse not found",
        });
      }

      /*
       * Legacy warehouse records بھی default godown filter میں شامل ہوں گے۔
       */
      const warehouseNames = [
        selectedWarehouse.name,
      ];

      if (
        [
          RAW_MATERIAL_GODOWN,
          FINISHED_GOODS_GODOWN,
        ].includes(selectedWarehouse.name)
      ) {
        warehouseNames.push(
          ...LEGACY_WAREHOUSE_NAMES
        );
      }

      conditions.push({
        $or: [
          {
            warehouseId:
              selectedWarehouse._id,
          },
          {
            warehouse: {
              $in: Array.from(
                new Set(warehouseNames)
              ),
            },
          },
        ],
      });
    }

    if (movementType && movementType !== "All") {
      if (
        !VALID_MOVEMENT_TYPES.includes(
          movementType
        )
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid stock movement type",
        });
      }

      conditions.push({
        movementType,
      });
    }

    if (sourceModule) {
      conditions.push({
        sourceModule: {
          $regex: sourceModule,
          $options: "i",
        },
      });
    }

    if (dateFrom || dateTo) {
      const dateCondition = {};

      if (dateFrom) {
        if (!isValidDate(dateFrom)) {
          return res.status(400).json({
            success: false,
            message:
              "dateFrom ka format YYYY-MM-DD hona chahiye",
          });
        }

        dateCondition.$gte = dateFrom;
      }

      if (dateTo) {
        if (!isValidDate(dateTo)) {
          return res.status(400).json({
            success: false,
            message:
              "dateTo ka format YYYY-MM-DD hona chahiye",
          });
        }

        dateCondition.$lte = dateTo;
      }

      conditions.push({
        date: dateCondition,
      });
    }

    if (search) {
      const searchRegex = {
        $regex: search,
        $options: "i",
      };

      conditions.push({
        $or: [
          { itemCode: searchRegex },
          { itemName: searchRegex },
          { referenceNo: searchRegex },
          { sourceModule: searchRegex },
          { remarks: searchRegex },
        ],
      });
    }

    const query =
      conditions.length > 0
        ? {
            $and: conditions,
          }
        : {};

    const safeLimit = Math.min(
      2000,
      Math.max(1, Number(limit) || 500)
    );

    const rows = await StockLedger.find(query)
      .populate(
        "item",
        "code name itemType category brand unit minStock stockManaged status"
      )
      .populate(
        "warehouseId",
        "code name warehouseType status"
      )
      .sort({
        date: -1,
        createdAt: -1,
      })
      .limit(safeLimit);

    /*
     * Frontend direct array expect کرتا ہے۔
     */
    return res.status(200).json(rows);
  } catch (error) {
    console.error(
      "Stock Ledger Load Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Stock ledger load nahi hua",
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| Stock Balances
|--------------------------------------------------------------------------
|
| GET /api/stock-ledger/balances
|
| اہم تبدیلی:
| صرف ledger والے items نہیں، بلکہ تمام inventory items دکھائے جائیں گے۔
| جس Item کی کوئی movement نہیں، اس کا balance zero ہوگا۔
|
*/

router.get("/balances", async (req, res) => {
  try {
    await ensureDefaultWarehouses();

    const {
      item = "",
      warehouse = "",
      itemType = "",
      status = "",
      search = "",
    } = req.query;

    const itemQuery = {
      stockManaged: {
        $ne: false,
      },
      itemType: {
        $ne: "Service",
      },
    };

    if (item) {
      if (!isValidObjectId(item)) {
        return res.status(400).json({
          success: false,
          message: "Invalid item ID",
        });
      }

      itemQuery._id =
        new mongoose.Types.ObjectId(item);
    }

    if (itemType && itemType !== "All") {
      itemQuery.itemType = itemType;
    }

    if (status && status !== "All") {
      itemQuery.status = status;
    }

    if (search) {
      itemQuery.$or = [
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
      ];
    }

    let selectedWarehouse = null;

    if (warehouse && warehouse !== "All") {
      selectedWarehouse =
        await findWarehouseFromInput(warehouse);

      if (!selectedWarehouse) {
        return res.status(404).json({
          success: false,
          message: "Warehouse not found",
        });
      }
    }

    let items = await Item.find(itemQuery).sort({
      name: 1,
    });

    /*
     * منتخب warehouse میں صرف compatible items دکھائے جائیں گے۔
     */
    if (selectedWarehouse) {
      items = items.filter((itemDocument) =>
        itemCanExistInWarehouse(
          itemDocument,
          selectedWarehouse
        )
      );
    }

    if (items.length === 0) {
      return res.status(200).json([]);
    }

    const itemIds = items.map(
      (itemDocument) => itemDocument._id
    );

    const ledgerRows =
      await StockLedger.aggregate([
        {
          $match: {
            item: {
              $in: itemIds,
            },
          },
        },
        {
          $group: {
            _id: {
              item: "$item",
              warehouse: "$warehouse",
            },

            warehouseId: {
              $first: "$warehouseId",
            },

            itemCode: {
              $last: "$itemCode",
            },

            itemName: {
              $last: "$itemName",
            },

            unit: {
              $last: "$unit",
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
      ]);

    const warehouses =
      await Warehouse.find({});

    const warehouseByName = new Map();

    warehouses.forEach((warehouseDocument) => {
      warehouseByName.set(
        warehouseDocument.name.toLowerCase(),
        warehouseDocument
      );
    });

    const itemById = new Map();

    items.forEach((itemDocument) => {
      itemById.set(
        String(itemDocument._id),
        itemDocument
      );
    });

    /*
     * Same Item کے legacy اور نئے warehouse records کو merge کیا جائے گا۔
     */
    const balanceMap = new Map();

    ledgerRows.forEach((ledgerRow) => {
      const itemDocument = itemById.get(
        String(ledgerRow._id.item)
      );

      if (!itemDocument) {
        return;
      }

      const normalizedWarehouseName =
        normalizeLedgerWarehouse(
          ledgerRow._id.warehouse,
          itemDocument.itemType
        );

      const warehouseDocument =
        warehouseByName.get(
          normalizedWarehouseName.toLowerCase()
        ) || null;

      if (
        selectedWarehouse &&
        normalizedWarehouseName.toLowerCase() !==
          selectedWarehouse.name.toLowerCase()
      ) {
        return;
      }

      const balanceKey = [
        String(itemDocument._id),
        normalizedWarehouseName.toLowerCase(),
      ].join("|");

      const existingBalance =
        balanceMap.get(balanceKey) || {
          item: itemDocument._id,

          itemCode: itemDocument.code,
          itemName: itemDocument.name,
          itemType: itemDocument.itemType,

          category: itemDocument.category,
          brand: itemDocument.brand,
          unit: itemDocument.unit,

          minStock: Number(
            itemDocument.minStock || 0
          ),

          itemStatus: itemDocument.status,
          stockManaged:
            itemDocument.stockManaged !== false,

          warehouseId:
            warehouseDocument?._id || null,

          warehouse:
            normalizedWarehouseName,

          warehouseType:
            warehouseDocument?.warehouseType ||
            (itemDocument.itemType ===
            "Finished Good"
              ? "Finished Goods"
              : "Raw Material"),

          qtyIn: 0,
          qtyOut: 0,
          currentStock: 0,
        };

      existingBalance.qtyIn += Number(
        ledgerRow.qtyIn || 0
      );

      existingBalance.qtyOut += Number(
        ledgerRow.qtyOut || 0
      );

      existingBalance.currentStock =
        existingBalance.qtyIn -
        existingBalance.qtyOut;

      balanceMap.set(
        balanceKey,
        existingBalance
      );
    });

    /*
     * جس inventory item کی کوئی ledger entry نہیں،
     * اسے بھی zero balance کے ساتھ دکھایا جائے گا۔
     */
    items.forEach((itemDocument) => {
      const defaultWarehouseName =
        selectedWarehouse?.name ||
        getDefaultWarehouseName(
          itemDocument.itemType
        );

      const defaultWarehouse =
        selectedWarehouse ||
        warehouseByName.get(
          defaultWarehouseName.toLowerCase()
        ) ||
        null;

      if (
        defaultWarehouse &&
        !itemCanExistInWarehouse(
          itemDocument,
          defaultWarehouse
        )
      ) {
        return;
      }

      const hasAnyBalance =
        Array.from(balanceMap.values()).some(
          (balance) =>
            String(balance.item) ===
            String(itemDocument._id)
        );

      /*
       * Warehouse filter کی صورت میں اسی warehouse کا zero row۔
       * بغیر filter کے صرف اس item کا کوئی row نہ ہونے پر default zero row۔
       */
      const balanceKey = [
        String(itemDocument._id),
        defaultWarehouseName.toLowerCase(),
      ].join("|");

      if (
        selectedWarehouse ||
        !hasAnyBalance
      ) {
        if (!balanceMap.has(balanceKey)) {
          balanceMap.set(balanceKey, {
            item: itemDocument._id,

            itemCode: itemDocument.code,
            itemName: itemDocument.name,
            itemType: itemDocument.itemType,

            category: itemDocument.category,
            brand: itemDocument.brand,
            unit: itemDocument.unit,

            minStock: Number(
              itemDocument.minStock || 0
            ),

            itemStatus: itemDocument.status,
            stockManaged:
              itemDocument.stockManaged !== false,

            warehouseId:
              defaultWarehouse?._id || null,

            warehouse:
              defaultWarehouseName,

            warehouseType:
              defaultWarehouse?.warehouseType ||
              (itemDocument.itemType ===
              "Finished Good"
                ? "Finished Goods"
                : "Raw Material"),

            qtyIn: 0,
            qtyOut: 0,
            currentStock: 0,
          });
        }
      }
    });

    const balances = Array.from(
      balanceMap.values()
    ).sort((firstRow, secondRow) => {
      const warehouseComparison =
        firstRow.warehouse.localeCompare(
          secondRow.warehouse
        );

      if (warehouseComparison !== 0) {
        return warehouseComparison;
      }

      return firstRow.itemName.localeCompare(
        secondRow.itemName
      );
    });

    return res.status(200).json(balances);
  } catch (error) {
    console.error(
      "Stock Balances Load Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Stock balances load nahi huay",
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| Single Item Stock
|--------------------------------------------------------------------------
|
| GET /api/stock-ledger/item/:itemId
|
*/

router.get("/item/:itemId", async (req, res) => {
  try {
    await ensureDefaultWarehouses();

    const { itemId } = req.params;
    const { warehouse = "" } = req.query;

    if (!isValidObjectId(itemId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid item ID",
      });
    }

    const item = await Item.findById(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    if (
      item.itemType === "Service" ||
      item.stockManaged === false
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Service item ka warehouse stock nahi hota",
      });
    }

    let selectedWarehouse = null;

    if (warehouse && warehouse !== "All") {
      selectedWarehouse =
        await findWarehouseFromInput(warehouse);

      if (!selectedWarehouse) {
        return res.status(404).json({
          success: false,
          message: "Warehouse not found",
        });
      }

      if (
        !itemCanExistInWarehouse(
          item,
          selectedWarehouse
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Ye item selected warehouse mein manage nahi hota",
        });
      }
    }

    const ledgerRows = await StockLedger.find({
      item: item._id,
    })
      .populate(
        "warehouseId",
        "code name warehouseType status"
      )
      .sort({
        date: -1,
        createdAt: -1,
      });

    const warehouses =
      await Warehouse.find({});

    const warehouseByName = new Map();

    warehouses.forEach((warehouseDocument) => {
      warehouseByName.set(
        warehouseDocument.name.toLowerCase(),
        warehouseDocument
      );
    });

    const warehouseBalanceMap = new Map();
    const filteredLedger = [];

    ledgerRows.forEach((ledgerRow) => {
      const normalizedWarehouseName =
        normalizeLedgerWarehouse(
          ledgerRow.warehouse,
          item.itemType
        );

      if (
        selectedWarehouse &&
        normalizedWarehouseName.toLowerCase() !==
          selectedWarehouse.name.toLowerCase()
      ) {
        return;
      }

      filteredLedger.push({
        ...ledgerRow.toObject(),
        warehouse:
          normalizedWarehouseName,
      });

      const existingBalance =
        warehouseBalanceMap.get(
          normalizedWarehouseName
        ) || {
          warehouse:
            normalizedWarehouseName,

          warehouseId:
            warehouseByName.get(
              normalizedWarehouseName.toLowerCase()
            )?._id || null,

          qtyIn: 0,
          qtyOut: 0,
          currentStock: 0,
        };

      existingBalance.qtyIn += Number(
        ledgerRow.qtyIn || 0
      );

      existingBalance.qtyOut += Number(
        ledgerRow.qtyOut || 0
      );

      existingBalance.currentStock =
        existingBalance.qtyIn -
        existingBalance.qtyOut;

      warehouseBalanceMap.set(
        normalizedWarehouseName,
        existingBalance
      );
    });

    const defaultWarehouseName =
      selectedWarehouse?.name ||
      getDefaultWarehouseName(item.itemType);

    if (warehouseBalanceMap.size === 0) {
      warehouseBalanceMap.set(
        defaultWarehouseName,
        {
          warehouse:
            defaultWarehouseName,

          warehouseId:
            selectedWarehouse?._id ||
            warehouseByName.get(
              defaultWarehouseName.toLowerCase()
            )?._id ||
            null,

          qtyIn: 0,
          qtyOut: 0,
          currentStock: 0,
        }
      );
    }

    const warehouseBalances = Array.from(
      warehouseBalanceMap.values()
    );

    const totals = warehouseBalances.reduce(
      (summary, row) => {
        summary.qtyIn += Number(
          row.qtyIn || 0
        );

        summary.qtyOut += Number(
          row.qtyOut || 0
        );

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

      item,

      qtyIn: totals.qtyIn,
      qtyOut: totals.qtyOut,
      currentStock: totals.currentStock,

      warehouseBalances,
      ledger: filteredLedger,
    });
  } catch (error) {
    console.error(
      "Single Item Stock Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Item stock load nahi hua",
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| Manual Stock Adjustment
|--------------------------------------------------------------------------
|
| POST /api/stock-ledger/manual
|
| Manual adjustment صرف exceptional correction کے لیے ہوگا۔
| عام stock:
|
| GRN → Raw Material Stock IN
| Production Issue → Raw Material Stock OUT
| Production Output → Finished Goods Stock IN
| Delivery Challan → Finished Goods Stock OUT
|
*/

router.post("/manual", async (req, res) => {
  try {
    const {
      item,
      type,
      quantity,
      warehouse = "",
      rate,
      remarks,
      date,
      referenceNo = "",
    } = req.body;

    if (!item || !isValidObjectId(item)) {
      return res.status(400).json({
        success: false,
        message: "Valid item required hai",
      });
    }

    const selectedItem =
      await Item.findById(item);

    if (!selectedItem) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    if (
      selectedItem.itemType === "Service" ||
      selectedItem.stockManaged === false
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Service item ka stock adjustment nahi ho sakta",
      });
    }

    const normalizedType = String(
      type || ""
    )
      .trim()
      .toUpperCase();

    if (
      !["IN", "OUT"].includes(normalizedType)
    ) {
      return res.status(400).json({
        success: false,
        message: "Type IN ya OUT hona chahiye",
      });
    }

    const qty = normalizeNumber(quantity);

    if (qty <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Quantity zero se zyada honi chahiye",
      });
    }

    const adjustmentRate =
      rate === undefined ||
      rate === null ||
      rate === ""
        ? Number(
            selectedItem.purchasePrice || 0
          )
        : normalizeNumber(rate);

    if (adjustmentRate < 0) {
      return res.status(400).json({
        success: false,
        message:
          "Rate negative nahi ho sakta",
      });
    }

    const adjustmentDate =
      normalizeText(date, todayDate());

    if (!isValidDate(adjustmentDate)) {
      return res.status(400).json({
        success: false,
        message:
          "Date format YYYY-MM-DD hona chahiye",
      });
    }

    const adjustmentRemarks =
      normalizeText(remarks);

    if (adjustmentRemarks.length < 3) {
      return res.status(400).json({
        success: false,
        message:
          "Manual stock adjustment ka reason remarks mein likhein",
      });
    }

    /*
     * Warehouse نہ دیا جائے تو stockService Item Type کے مطابق:
     *
     * Raw Material → Raw Material Godown
     * Finished Good → Finished Goods Godown
     */
    const generatedReferenceNo =
      normalizeText(referenceNo) ||
      `ADJ-${Date.now()}-${Math.floor(
        Math.random() * 1000
      )
        .toString()
        .padStart(3, "0")}`;

    const ledger =
      await postStockMovement({
        item: selectedItem._id,

        warehouse,

        date: adjustmentDate,

        movementType:
          normalizedType === "IN"
            ? "Adjustment In"
            : "Adjustment Out",

        sourceModule:
          "Manual Stock Adjustment",

        referenceModel: "StockLedger",
        referenceId: null,
        referenceLineId: String(
          selectedItem._id
        ),
        referenceNo:
          generatedReferenceNo,

        qtyIn:
          normalizedType === "IN"
            ? qty
            : 0,

        qtyOut:
          normalizedType === "OUT"
            ? qty
            : 0,

        rate: adjustmentRate,

        remarks: adjustmentRemarks,

        allowNegativeStock: false,
      });

    return res.status(201).json({
      success: true,

      message:
        normalizedType === "IN"
          ? "Stock plus successfully"
          : "Stock minus successfully",

      data: ledger,
    });
  } catch (error) {
    console.error(
      "Manual Stock Adjustment Error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        "Stock adjustment nahi hui",
    });
  }
});

module.exports = router;