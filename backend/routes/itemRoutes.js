const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Item = require("../models/Item");
const StockLedger = require("../models/StockLedger");
const Warehouse = require("../models/Warehouse");

const stockService = require("../utils/stockService");

const {
  ensureDefaultWarehouses,
  postStockMovement,
} = stockService;

const RAW_MATERIAL_GODOWN =
  stockService.RAW_MATERIAL_GODOWN ||
  "Raw Material Godown";

const FINISHED_GOODS_GODOWN =
  stockService.FINISHED_GOODS_GODOWN ||
  "Finished Goods Godown";

const ITEM_TYPES = [
  "Raw Material",
  "Packing Material",
  "Finished Good",
  "Consumable",
  "Service",
];

const todayDate = () =>
  new Date().toISOString().slice(0, 10);

const cleanText = (value, fallback = "") => {
  const text = String(value ?? "").trim();

  return text || fallback;
};

const cleanNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? Math.max(number, 0)
    : 0;
};

const duplicateMessage = (
  error,
  fallback = "Unable to save item"
) => {
  if (error?.code !== 11000) {
    return error?.message || fallback;
  }

  const field =
    Object.keys(
      error.keyPattern || {}
    )[0] || "value";

  const value =
    error.keyValue?.[field] || "";

  return `${field} "${value}" already exists`;
};

const warehouseNameForItemType = (
  itemType
) =>
  itemType === "Finished Good"
    ? FINISHED_GOODS_GODOWN
    : RAW_MATERIAL_GODOWN;

const getWarehouseForItemType =
  async (itemType) => {
    if (
      typeof ensureDefaultWarehouses ===
      "function"
    ) {
      await ensureDefaultWarehouses();
    }

    const warehouseName =
      warehouseNameForItemType(
        itemType
      );

    const code =
      itemType === "Finished Good"
        ? "WH-FG"
        : "WH-RM";

    const aliases =
      itemType === "Finished Good"
        ? [
            FINISHED_GOODS_GODOWN,
            "Finished Goods Warehouse",
          ]
        : [
            RAW_MATERIAL_GODOWN,
            "Raw Material Warehouse",
          ];

    const warehouse =
      await Warehouse.findOne({
        $or: [
          {
            code,
          },
          {
            name: {
              $in: aliases,
            },
          },
        ],
      });

    if (!warehouse) {
      throw new Error(
        `${warehouseName} was not found`
      );
    }

    if (
      warehouse.status ===
      "Inactive"
    ) {
      throw new Error(
        `${warehouse.name} is inactive`
      );
    }

    if (
      warehouse.status === "Full"
    ) {
      throw new Error(
        `${warehouse.name} is full`
      );
    }

    return warehouse;
  };

const getNextItemCode = async () => {
  const rows =
    await Item.find({
      code: /^ITM-\d+$/i,
    })
      .select("code")
      .lean();

  let highest = 0;

  for (const row of rows) {
    const match =
      String(row.code || "")
        .toUpperCase()
        .match(
          /^ITM-(\d+)$/
        );

    if (!match) {
      continue;
    }

    highest = Math.max(
      highest,
      Number(match[1]) || 0
    );
  }

  return `ITM-${String(
    highest + 1
  ).padStart(4, "0")}`;
};

const getStockMap = async (
  itemIds = []
) => {
  if (!itemIds.length) {
    return new Map();
  }

  const rows =
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
          _id: "$item",

          qtyIn: {
            $sum: {
              $ifNull: [
                "$qtyIn",
                0,
              ],
            },
          },

          qtyOut: {
            $sum: {
              $ifNull: [
                "$qtyOut",
                0,
              ],
            },
          },
        },
      },
    ]);

  return new Map(
    rows.map((row) => [
      String(row._id),
      {
        qtyIn:
          cleanNumber(
            row.qtyIn
          ),

        qtyOut:
          cleanNumber(
            row.qtyOut
          ),

        currentStock:
          cleanNumber(
            row.qtyIn
          ) -
          cleanNumber(
            row.qtyOut
          ),
      },
    ])
  );
};

const addStockToItems =
  async (items = []) => {
    const stockMap =
      await getStockMap(
        items.map(
          (item) =>
            item._id
        )
      );

    return items.map(
      (item) => {
        const stock =
          stockMap.get(
            String(item._id)
          ) || {
            qtyIn: 0,
            qtyOut: 0,
            currentStock: 0,
          };

        return {
          ...item,

          qtyIn:
            stock.qtyIn,

          qtyOut:
            stock.qtyOut,

          currentStock:
            stock.currentStock,

          warehouse:
            item.itemType ===
            "Service"
              ? ""
              : warehouseNameForItemType(
                  item.itemType
                ),
        };
      }
    );
  };

const buildItemPayload = (
  body = {},
  existingItem = null
) => {
  const itemType =
    cleanText(
      body.itemType,
      existingItem?.itemType ||
        "Raw Material"
    );

  if (
    !ITEM_TYPES.includes(
      itemType
    )
  ) {
    throw new Error(
      "Invalid item type"
    );
  }

  const isService =
    itemType === "Service";

  const status =
    cleanText(
      body.status,
      existingItem?.status ||
        "Active"
    );

  if (
    ![
      "Active",
      "Inactive",
    ].includes(status)
  ) {
    throw new Error(
      "Status must be Active or Inactive"
    );
  }

  const name =
    cleanText(
      body.name,
      existingItem?.name
    );

  const code =
    cleanText(
      body.code,
      existingItem?.code
    ).toUpperCase();

  if (!name) {
    throw new Error(
      "Item name is required"
    );
  }

  if (!code) {
    throw new Error(
      "Item code is required"
    );
  }

  return {
    name,
    code,
    itemType,

    category:
      cleanText(
        body.category,
        existingItem?.category ||
          "General"
      ),

    brand:
      cleanText(
        body.brand,
        existingItem?.brand ||
          ""
      ),

    unit:
      cleanText(
        body.unit,
        existingItem?.unit ||
          "Pcs"
      ),

    purchasePrice:
      isService
        ? 0
        : cleanNumber(
            body.purchasePrice ??
              existingItem
                ?.purchasePrice
          ),

    salePrice:
      cleanNumber(
        body.salePrice ??
          existingItem?.salePrice
      ),

    openingStock:
      isService
        ? 0
        : cleanNumber(
            body.openingStock ??
              existingItem
                ?.openingStock
          ),

    minStock:
      isService
        ? 0
        : cleanNumber(
            body.minStock ??
              existingItem?.minStock
          ),

    stockManaged:
      !isService,

    status,

    notes:
      cleanText(
        body.notes,
        existingItem?.notes ||
          ""
      ),
  };
};

const postOpeningStock =
  async (
    item,
    quantity
  ) => {
    const openingQty =
      cleanNumber(
        quantity
      );

    if (
      openingQty <= 0 ||
      item.itemType ===
        "Service" ||
      item.stockManaged ===
        false
    ) {
      item.openingStock = 0;
      item.openingStockPosted =
        false;

      await item.save();

      return item;
    }

    if (
      item.status !== "Active"
    ) {
      throw new Error(
        "Opening stock can only be posted for an Active item"
      );
    }

    const warehouse =
      await getWarehouseForItemType(
        item.itemType
      );

    await postStockMovement({
      item: item._id,

      warehouse:
        warehouse._id,

      date:
        todayDate(),

      movementType:
        "Opening Stock",

      sourceModule:
        "Item Master",

      referenceModel:
        "Item",

      referenceId:
        item._id,

      referenceLineId:
        String(item._id),

      referenceNo:
        item.code,

      postingKey:
        `ITEM:${item._id}:OPENING`,

      qtyIn:
        openingQty,

      qtyOut: 0,

      rate:
        cleanNumber(
          item.purchasePrice
        ),

      remarks:
        `Opening stock for ${item.code} - ${item.name}`,

      allowNegativeStock:
        false,

      allowDuplicate:
        false,
    });

    item.openingStock =
      openingQty;

    item.openingStockPosted =
      true;

    await item.save();

    return item;
  };

const removeOpeningStockLedger =
  async (itemId) => {
    await StockLedger.deleteMany({
      sourceModule:
        "Item Master",

      referenceModel:
        "Item",

      referenceId:
        itemId,

      movementType:
        "Opening Stock",
    });
  };

router.get(
  "/next-code",
  async (req, res) => {
    try {
      const code =
        await getNextItemCode();

      return res
        .status(200)
        .json({
          success: true,
          code,
        });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to generate the next item code",

          error:
            error.message,
        });
    }
  }
);

router.get(
  "/all",
  async (req, res) => {
    try {
      const {
        search = "",
        status = "",
        itemType = "",
      } = req.query;

      const query = {};

      if (
        status &&
        status !== "All"
      ) {
        query.status =
          status;
      }

      if (
        itemType &&
        itemType !== "All"
      ) {
        query.itemType =
          itemType;
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
        ];
      }

      const items =
        await Item.find(query)
          .sort({
            createdAt: -1,
          })
          .lean();

      const data =
        await addStockToItems(
          items
        );

      return res
        .status(200)
        .json(data);
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to load items",

          error:
            error.message,
        });
    }
  }
);

router.get(
  "/:id",
  async (req, res) => {
    try {
      if (
        !mongoose.isValidObjectId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid item ID",
          });
      }

      const item =
        await Item.findById(
          req.params.id
        ).lean();

      if (!item) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Item not found",
          });
      }

      const [data] =
        await addStockToItems([
          item,
        ]);

      return res
        .status(200)
        .json({
          success: true,
          data,
        });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to load item",

          error:
            error.message,
        });
    }
  }
);

router.post(
  "/add",
  async (req, res) => {
    let item = null;

    try {
      const payload =
        buildItemPayload(
          req.body
        );

      const duplicate =
        await Item.exists({
          code:
            payload.code,
        });

      if (duplicate) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              `Item code "${payload.code}" already exists`,
          });
      }

      const openingStock =
        payload.openingStock;

      item =
        await Item.create({
          ...payload,

          openingStock: 0,

          openingStockPosted:
            false,
        });

      await postOpeningStock(
        item,
        openingStock
      );

      const saved =
        await Item.findById(
          item._id
        ).lean();

      const [data] =
        await addStockToItems([
          saved,
        ]);

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Item created successfully",

          data,
        });
    } catch (error) {
      if (item?._id) {
        await removeOpeningStockLedger(
          item._id
        ).catch(() => {});

        await Item.findByIdAndDelete(
          item._id
        ).catch(() => {});
      }

      return res
        .status(400)
        .json({
          success: false,

          message:
            duplicateMessage(
              error,
              "Unable to create item"
            ),

          error:
            error.message,
        });
    }
  }
);

router.put(
  "/update/:id",
  async (req, res) => {
    let openingStockCreated =
      false;

    let previousState = null;

    try {
      if (
        !mongoose.isValidObjectId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid item ID",
          });
      }

      const item =
        await Item.findById(
          req.params.id
        );

      if (!item) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Item not found",
          });
      }

      const payload =
        buildItemPayload(
          req.body,
          item
        );

      const duplicate =
        await Item.exists({
          code:
            payload.code,

          _id: {
            $ne:
              item._id,
          },
        });

      if (duplicate) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              `Item code "${payload.code}" already exists`,
          });
      }

      const hasLedger =
        Boolean(
          await StockLedger.exists({
            item:
              item._id,
          })
        );

      if (
        payload.itemType !==
          item.itemType &&
        hasLedger
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Item Type cannot be changed because stock history already exists",
          });
      }

      const requestedOpeningStock =
        payload.openingStock;

      const openingChanged =
        Math.abs(
          requestedOpeningStock -
            cleanNumber(
              item.openingStock
            )
        ) >
        0.000001;

      if (
        item.openingStockPosted &&
        openingChanged
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Opening Stock cannot be changed after it has been posted to the stock ledger",
          });
      }

      if (
        !item.openingStockPosted &&
        requestedOpeningStock > 0 &&
        hasLedger
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Opening Stock cannot be posted because this item already has stock history",
          });
      }

      previousState = {
        name:
          item.name,

        code:
          item.code,

        itemType:
          item.itemType,

        category:
          item.category,

        brand:
          item.brand,

        unit:
          item.unit,

        purchasePrice:
          item.purchasePrice,

        salePrice:
          item.salePrice,

        openingStock:
          item.openingStock,

        openingStockPosted:
          item.openingStockPosted,

        minStock:
          item.minStock,

        stockManaged:
          item.stockManaged,

        status:
          item.status,

        notes:
          item.notes,
      };

      const shouldPostOpening =
        !item.openingStockPosted &&
        requestedOpeningStock > 0;

      Object.assign(
        item,
        payload,
        {
          openingStock:
            shouldPostOpening
              ? 0
              : requestedOpeningStock,

          openingStockPosted:
            item.openingStockPosted,
        }
      );

      await item.save();

      if (
        shouldPostOpening
      ) {
        await postOpeningStock(
          item,
          requestedOpeningStock
        );

        openingStockCreated =
          true;
      }

      const saved =
        await Item.findById(
          item._id
        ).lean();

      const [data] =
        await addStockToItems([
          saved,
        ]);

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Item updated successfully",

          data,
        });
    } catch (error) {
      if (
        openingStockCreated ||
        previousState
      ) {
        await removeOpeningStockLedger(
          req.params.id
        ).catch(() => {});

        if (previousState) {
          await Item.findByIdAndUpdate(
            req.params.id,
            previousState,
            {
              runValidators:
                false,
            }
          ).catch(() => {});
        }
      }

      return res
        .status(400)
        .json({
          success: false,

          message:
            duplicateMessage(
              error,
              "Unable to update item"
            ),

          error:
            error.message,
        });
    }
  }
);

router.delete(
  "/delete/:id",
  async (req, res) => {
    try {
      if (
        !mongoose.isValidObjectId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid item ID",
          });
      }

      const item =
        await Item.findById(
          req.params.id
        );

      if (!item) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Item not found",
          });
      }

      const hasLedger =
        await StockLedger.exists({
          item:
            item._id,
        });

      if (hasLedger) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "This item cannot be deleted because stock history exists",
          });
      }

      await Item.findByIdAndDelete(
        item._id
      );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Item deleted successfully",
        });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            "Unable to delete item",

          error:
            error.message,
        });
    }
  }
);

module.exports = router;