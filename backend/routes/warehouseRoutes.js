const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Warehouse = require("../models/Warehouse");
const StockLedger = require("../models/StockLedger");

const RAW_MATERIAL_GODOWN = {
  code: "WH-RM",
  name: "Raw Material Godown",
  warehouseType: "Raw Material",
  location: "",
  capacity: "",
  capacityPercent: 0,
  status: "Active",
  isSystem: true,
  notes:
    "System warehouse for raw material, packing material and consumable stock.",
};

const FINISHED_GOODS_GODOWN = {
  code: "WH-FG",
  name: "Finished Goods Godown",
  warehouseType: "Finished Goods",
  location: "",
  capacity: "",
  capacityPercent: 0,
  status: "Active",
  isSystem: true,
  notes:
    "System warehouse for completed and ready finished products.",
};

const SYSTEM_WAREHOUSES = [
  RAW_MATERIAL_GODOWN,
  FINISHED_GOODS_GODOWN,
];

const VALID_WAREHOUSE_TYPES = [
  "Raw Material",
  "Finished Goods",
  "Work In Process",
  "General",
];

const VALID_STATUSES = [
  "Active",
  "Inactive",
  "Full",
];

const normalizeWarehouseType = (value) => {
  if (value === undefined || value === null || value === "") {
    return "General";
  }

  const normalizedValue = String(value)
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  const aliases = {
    rawmaterial: "Raw Material",
    rawmaterialgodown: "Raw Material",

    finishedgood: "Finished Goods",
    finishedgoods: "Finished Goods",
    finishedproduct: "Finished Goods",
    finishedproductgodown: "Finished Goods",

    workinprocess: "Work In Process",
    wip: "Work In Process",
    productionfloor: "Work In Process",

    general: "General",
    warehouse: "General",
  };

  return (
    aliases[normalizedValue] ||
    String(value).trim()
  );
};

const normalizeStatus = (value) => {
  if (value === undefined || value === null || value === "") {
    return "Active";
  }

  const normalizedValue = String(value)
    .trim()
    .toLowerCase();

  if (normalizedValue === "active") return "Active";
  if (normalizedValue === "inactive") return "Inactive";
  if (normalizedValue === "full") return "Full";

  return String(value).trim();
};

const nonNegativePercentage = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.min(100, Math.max(0, number));
};

const isValidWarehouseId = (id) => {
  return mongoose.isValidObjectId(id);
};

const generateWarehouseCode = async (name) => {
  const normalizedName = String(name || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const baseCode = normalizedName
    ? `WH-${normalizedName.slice(0, 15)}`
    : "WH-GENERAL";

  let code = baseCode;
  let suffix = 1;

  while (await Warehouse.exists({ code })) {
    suffix += 1;
    code = `${baseCode}-${suffix}`;
  }

  return code;
};

const cleanCreatePayload = (body = {}) => {
  return {
    code: body.code
      ? String(body.code).trim().toUpperCase()
      : undefined,

    name: String(body.name || "").trim(),

    warehouseType: normalizeWarehouseType(
      body.warehouseType
    ),

    location: String(body.location || "").trim(),

    capacity: String(body.capacity || "").trim(),

    capacityPercent: nonNegativePercentage(
      body.capacityPercent
    ),

    status: normalizeStatus(body.status),

    /*
     * User manually system warehouse نہیں بنا سکتا۔
     */
    isSystem: false,

    notes: String(body.notes || "").trim(),
  };
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

  if (body.warehouseType !== undefined) {
    payload.warehouseType = normalizeWarehouseType(
      body.warehouseType
    );
  }

  if (body.location !== undefined) {
    payload.location = String(
      body.location || ""
    ).trim();
  }

  if (body.capacity !== undefined) {
    payload.capacity = String(
      body.capacity || ""
    ).trim();
  }

  if (body.capacityPercent !== undefined) {
    payload.capacityPercent =
      nonNegativePercentage(
        body.capacityPercent
      );
  }

  if (body.status !== undefined) {
    payload.status = normalizeStatus(body.status);
  }

  if (body.notes !== undefined) {
    payload.notes = String(body.notes || "").trim();
  }

  /*
   * Frontend سے isSystem تبدیل نہیں ہوسکتا۔
   */
  delete payload.isSystem;

  return payload;
};

/*
|--------------------------------------------------------------------------
| Ensure Default System Warehouses
|--------------------------------------------------------------------------
|
| یہ function Raw Material Godown اور Finished Goods Godown کو
| database میں لازمی بنائے رکھے گا۔
|
*/

const ensureSystemWarehouses = async () => {
  for (const warehouseData of SYSTEM_WAREHOUSES) {
    let warehouse = await Warehouse.findOne({
      $or: [
        { name: warehouseData.name },
        { code: warehouseData.code },
      ],
    });

    if (!warehouse) {
      await Warehouse.create(warehouseData);
      continue;
    }

    const changes = {};

    if (warehouse.name !== warehouseData.name) {
      changes.name = warehouseData.name;
    }

    if (warehouse.code !== warehouseData.code) {
      changes.code = warehouseData.code;
    }

    if (
      warehouse.warehouseType !==
      warehouseData.warehouseType
    ) {
      changes.warehouseType =
        warehouseData.warehouseType;
    }

    if (warehouse.isSystem !== true) {
      changes.isSystem = true;
    }

    /*
     * System warehouse کو پہلے سے Inactive کردیا گیا ہو
     * تو اسے خود Active نہیں کررہے۔
     * Status user manage کرسکتا ہے۔
     */

    if (Object.keys(changes).length > 0) {
      await Warehouse.findByIdAndUpdate(
        warehouse._id,
        changes,
        {
          new: true,
          runValidators: true,
        }
      );
    }
  }
};

/*
|--------------------------------------------------------------------------
| Get All Warehouses
|--------------------------------------------------------------------------
*/

router.get("/all", async (req, res) => {
  try {
    await ensureSystemWarehouses();

    const {
      search = "",
      status = "",
      warehouseType = "",
    } = req.query;

    const query = {};

    if (status && status !== "All") {
      query.status = normalizeStatus(status);
    }

    if (
      warehouseType &&
      warehouseType !== "All"
    ) {
      query.warehouseType =
        normalizeWarehouseType(warehouseType);
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
          warehouseType: {
            $regex: search,
            $options: "i",
          },
        },
        {
          location: {
            $regex: search,
            $options: "i",
          },
        },
        {
          capacity: {
            $regex: search,
            $options: "i",
          },
        },
      ];
    }

    const warehouses = await Warehouse.find(
      query
    ).sort({
      isSystem: -1,
      name: 1,
    });

    /*
     * Frontend direct array expect کرتا ہے۔
     */
    return res.status(200).json(warehouses);
  } catch (error) {
    console.error(
      "Warehouses Load Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Warehouses load nahi huay",
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| Get Active Warehouses
|--------------------------------------------------------------------------
*/

router.get("/active", async (req, res) => {
  try {
    await ensureSystemWarehouses();

    const { warehouseType = "" } = req.query;

    const query = {
      status: {
        $in: ["Active", "Full"],
      },
    };

    if (
      warehouseType &&
      warehouseType !== "All"
    ) {
      query.warehouseType =
        normalizeWarehouseType(warehouseType);
    }

    const warehouses = await Warehouse.find(
      query
    ).sort({
      isSystem: -1,
      name: 1,
    });

    return res.status(200).json(warehouses);
  } catch (error) {
    console.error(
      "Active Warehouses Load Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Active warehouses load nahi huay",
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| Get Single Warehouse
|--------------------------------------------------------------------------
*/

router.get("/:id", async (req, res) => {
  try {
    if (!isValidWarehouseId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid warehouse ID",
      });
    }

    const warehouse = await Warehouse.findById(
      req.params.id
    );

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    const stockSummary =
      await StockLedger.aggregate([
        {
          $match: {
            warehouse: warehouse.name,
          },
        },
        {
          $group: {
            _id: null,
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

    const summary = stockSummary[0] || {
      qtyIn: 0,
      qtyOut: 0,
    };

    const qtyIn = Number(summary.qtyIn || 0);
    const qtyOut = Number(summary.qtyOut || 0);

    return res.status(200).json({
      success: true,
      data: {
        ...warehouse.toObject(),
        qtyIn,
        qtyOut,
        currentStock: qtyIn - qtyOut,
      },
    });
  } catch (error) {
    console.error(
      "Single Warehouse Load Error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Warehouse load nahi hua",
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| Add Warehouse
|--------------------------------------------------------------------------
*/

router.post("/add", async (req, res) => {
  try {
    await ensureSystemWarehouses();

    const payload = cleanCreatePayload(req.body);

    if (!payload.name) {
      return res.status(400).json({
        success: false,
        message: "Warehouse name required hai",
      });
    }

    if (
      !VALID_WAREHOUSE_TYPES.includes(
        payload.warehouseType
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid warehouse type",
      });
    }

    if (!VALID_STATUSES.includes(payload.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid warehouse status",
      });
    }

    const reservedWarehouse =
      SYSTEM_WAREHOUSES.find(
        (warehouse) =>
          warehouse.name.toLowerCase() ===
            payload.name.toLowerCase() ||
          warehouse.code.toLowerCase() ===
            String(payload.code || "").toLowerCase()
      );

    if (reservedWarehouse) {
      return res.status(400).json({
        success: false,
        message:
          "Ye system warehouse pehle se maujood hai",
      });
    }

    if (!payload.code) {
      payload.code =
        await generateWarehouseCode(payload.name);
    }

    const warehouse = await Warehouse.create(
      payload
    );

    return res.status(201).json({
      success: true,
      message: "Warehouse added successfully",
      data: warehouse,
    });
  } catch (error) {
    console.error(
      "Warehouse Add Error:",
      error
    );

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Ye warehouse name ya code already used hai",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Warehouse save nahi hua",
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| Update Warehouse
|--------------------------------------------------------------------------
*/

router.put("/update/:id", async (req, res) => {
  try {
    if (!isValidWarehouseId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid warehouse ID",
      });
    }

    const existingWarehouse =
      await Warehouse.findById(req.params.id);

    if (!existingWarehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    const payload = cleanUpdatePayload(req.body);

    if (
      payload.status !== undefined &&
      !VALID_STATUSES.includes(payload.status)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid warehouse status",
      });
    }

    if (
      payload.warehouseType !== undefined &&
      !VALID_WAREHOUSE_TYPES.includes(
        payload.warehouseType
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid warehouse type",
      });
    }

    const hasStockMovement =
      await StockLedger.exists({
        warehouse: existingWarehouse.name,
      });

    /*
     * System warehouses کے نام، code اور type مستقل ہیں۔
     */
    if (existingWarehouse.isSystem) {
      delete payload.name;
      delete payload.code;
      delete payload.warehouseType;
    }

    /*
     * موجودہ StockLedger warehouse کا نام String میں رکھتا ہے۔
     * اس لیے ledger بننے کے بعد warehouse rename نہیں ہوگا۔
     */
    if (
      hasStockMovement &&
      payload.name !== undefined &&
      payload.name !== existingWarehouse.name
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Is warehouse ki stock ledger entries exist karti hain. Warehouse name ab change nahi ho sakta.",
      });
    }

    if (
      payload.name !== undefined &&
      !payload.name
    ) {
      return res.status(400).json({
        success: false,
        message: "Warehouse name required hai",
      });
    }

    const updatedWarehouse =
      await Warehouse.findByIdAndUpdate(
        existingWarehouse._id,
        payload,
        {
          new: true,
          runValidators: true,
        }
      );

    return res.status(200).json({
      success: true,
      message:
        "Warehouse updated successfully",
      data: updatedWarehouse,
    });
  } catch (error) {
    console.error(
      "Warehouse Update Error:",
      error
    );

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Ye warehouse name ya code already used hai",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Warehouse update nahi hua",
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| Delete Warehouse
|--------------------------------------------------------------------------
*/

router.delete(
  "/delete/:id",
  async (req, res) => {
    try {
      if (!isValidWarehouseId(req.params.id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid warehouse ID",
        });
      }

      const warehouse =
        await Warehouse.findById(req.params.id);

      if (!warehouse) {
        return res.status(404).json({
          success: false,
          message: "Warehouse not found",
        });
      }

      if (warehouse.isSystem) {
        return res.status(400).json({
          success: false,
          message:
            "System warehouse delete nahi ho sakta. Zaroorat par status Inactive karein.",
        });
      }

      const hasStockMovement =
        await StockLedger.exists({
          warehouse: warehouse.name,
        });

      if (hasStockMovement) {
        return res.status(400).json({
          success: false,
          message:
            "Is warehouse ki stock ledger entries exist karti hain. Delete ke bajaye Inactive karein.",
        });
      }

      await Warehouse.findByIdAndDelete(
        warehouse._id
      );

      return res.status(200).json({
        success: true,
        message:
          "Warehouse deleted successfully",
      });
    } catch (error) {
      console.error(
        "Warehouse Delete Error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Warehouse delete nahi hua",
        error: error.message,
      });
    }
  }
);

module.exports = router;