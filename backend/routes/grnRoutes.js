const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const GRN = require("../models/GRN");
const Item = require("../models/Item");
const Warehouse = require("../models/Warehouse");
const PurchaseOrder = require("../models/PurchaseOrder");
const Counter = require("../models/Counter");
const StockLedger = require("../models/StockLedger");

const stockService = require("../utils/stockService");

const {
  ensureDefaultWarehouses,
  getItemStock,
  postStockMovement,
} = stockService;

const RAW_MATERIAL_GODOWN =
  stockService.RAW_MATERIAL_GODOWN ||
  "Raw Material Godown";

const FINISHED_GOODS_GODOWN =
  stockService.FINISHED_GOODS_GODOWN ||
  "Finished Goods Godown";

const MULTIPLE_WAREHOUSES =
  "Multiple Warehouses";

const GRN_STATUSES = [
  "Draft",
  "Received",
  "Partially Received",
  "Completed",
  "Posted",
  "Cancelled",
];

const STOCK_POSTING_STATUSES = [
  "Received",
  "Partially Received",
  "Completed",
  "Posted",
];

const INSPECTION_STATUSES = [
  "Pending",
  "Passed",
  "Partially Accepted",
  "Rejected",
];

const GRN_ALLOWED_PO_STATUSES = [
  "Ordered",
  "Partially Received",
];

const SUPPORTED_ITEM_TYPES = [
  "Raw Material",
  "Packing Material",
  "Consumable",
  "Finished Good",
];

const todayDate = () =>
  new Date()
    .toISOString()
    .slice(0, 10);

const cleanText = (
  value,
  fallback = ""
) => {
  const text = String(
    value ?? ""
  ).trim();

  return text || fallback;
};

const cleanNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? Math.max(number, 0)
    : 0;
};

const idOf = (value) => {
  if (!value) {
    return "";
  }

  if (
    typeof value ===
    "object"
  ) {
    return String(
      value._id ||
        value.id ||
        ""
    );
  }

  return String(value);
};

const isValidId = (value) =>
  mongoose.isValidObjectId(
    value
  );

const normalizeStatus = (value) => {
  const status = cleanText(
    value,
    "Draft"
  );

  if (
    status === "Partial"
  ) {
    return "Partially Received";
  }

  if (
    status === "Complete"
  ) {
    return "Completed";
  }

  return GRN_STATUSES.includes(
    status
  )
    ? status
    : "Draft";
};

const normalizeInspectionStatus = (
  value
) => {
  const status = cleanText(
    value,
    "Pending"
  );

  if (
    status === "Partial"
  ) {
    return "Partially Accepted";
  }

  if (
    status === "Failed"
  ) {
    return "Rejected";
  }

  return INSPECTION_STATUSES.includes(
    status
  )
    ? status
    : "Pending";
};

const shouldPostStock = (status) =>
  STOCK_POSTING_STATUSES.includes(
    status
  );

const duplicateMessage = (
  error,
  fallback
) => {
  if (
    error.code !==
    11000
  ) {
    return (
      error.message ||
      fallback
    );
  }

  const field =
    Object.keys(
      error.keyPattern || {}
    )[0] || "value";

  const value =
    error.keyValue?.[field];

  return `Duplicate ${field}: ${String(
    value
  )}`;
};

const makeFallbackItemKey = (
  item = {}
) => {
  const itemId = idOf(
    item.item
  );

  const description =
    cleanText(
      item.description ||
        item.itemName ||
        item.item?.name
    ).toLowerCase();

  const size = cleanText(
    item.size
  ).toLowerCase();

  const unit = cleanText(
    item.unit ||
      item.item?.unit,
    "Pcs"
  ).toLowerCase();

  return [
    itemId
      ? `item:${itemId}`
      : `description:${description}`,

    `description:${description}`,
    `size:${size}`,
    `unit:${unit}`,
  ].join("|");
};

const getItemKeys = (
  item = {},
  {
    useDocumentIdAsPurchaseOrderRowId =
      false,
  } = {}
) => {
  const keys = [];

  const explicitPurchaseOrderItemId =
    idOf(
      item.purchaseOrderItemId
    );

  if (
    explicitPurchaseOrderItemId
  ) {
    keys.push(
      `po-row:${explicitPurchaseOrderItemId}`
    );
  }

  if (
    useDocumentIdAsPurchaseOrderRowId
  ) {
    const purchaseOrderRowId =
      idOf(
        item._id
      );

    if (
      purchaseOrderRowId
    ) {
      keys.push(
        `po-row:${purchaseOrderRowId}`
      );
    }
  }

  keys.push(
    makeFallbackItemKey(
      item
    )
  );

  return [
    ...new Set(
      keys.filter(Boolean)
    ),
  ];
};

const getMapNumberByKeys = (
  map,
  keys = []
) => {
  for (
    const key of
    keys
  ) {
    if (
      map.has(key)
    ) {
      return cleanNumber(
        map.get(key)
      );
    }
  }

  return 0;
};

const getVendorSnapshot = (
  purchaseOrder
) => {
  const vendorDocument =
    purchaseOrder.vendor &&
    typeof purchaseOrder.vendor ===
      "object"
      ? purchaseOrder.vendor
      : null;

  return {
    vendor:
      idOf(
        purchaseOrder.vendor
      ) || null,

    vendorName:
      cleanText(
        purchaseOrder.vendorName
      ) ||
      cleanText(
        vendorDocument?.vendorName
      ) ||
      cleanText(
        vendorDocument?.name
      ),

    vendorPhone:
      cleanText(
        purchaseOrder.vendorPhone
      ) ||
      cleanText(
        vendorDocument?.phoneNumber
      ) ||
      cleanText(
        vendorDocument?.phone
      ),

    vendorEmail:
      cleanText(
        purchaseOrder.vendorEmail
      ) ||
      cleanText(
        vendorDocument?.email
      ),

    vendorAddress:
      cleanText(
        purchaseOrder.vendorAddress
      ) ||
      cleanText(
        vendorDocument?.address
      ),
  };
};

const getHighestExistingSequence =
  async () => {
    const rows =
      await GRN.find({})
        .select("grnNo")
        .lean();

    return rows.reduce(
      (
        highest,
        row
      ) => {
        const match =
          String(
            row.grnNo || ""
          ).match(
            /(\d+)(?!.*\d)/
          );

        return Math.max(
          highest,
          match
            ? Number(match[1])
            : 0
        );
      },
      0
    );
  };

const syncGRNCounter =
  async () => {
    const highest =
      await getHighestExistingSequence();

    const counter =
      await Counter.findOneAndUpdate(
        {
          name: "grnNo",
        },
        {
          $max: {
            seq: highest,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert:
            true,
        }
      );

    return cleanNumber(
      counter.seq
    );
  };

const getNextGRNNo =
  async () => {
    await syncGRNCounter();

    for (
      let attempt = 0;
      attempt < 20;
      attempt += 1
    ) {
      const counter =
        await Counter.findOneAndUpdate(
          {
            name: "grnNo",
          },
          {
            $inc: {
              seq: 1,
            },
          },
          {
            new: true,
            upsert: true,
            setDefaultsOnInsert:
              true,
          }
        );

      const grnNo =
        `GRN-${String(
          counter.seq
        ).padStart(
          4,
          "0"
        )}`;

      const exists =
        await GRN.exists({
          grnNo,
        });

      if (!exists) {
        return grnNo;
      }
    }

    throw new Error(
      "Unable to generate a unique GRN number"
    );
  };

const peekNextGRNNo =
  async () => {
    const current =
      await syncGRNCounter();

    return `GRN-${String(
      current + 1
    ).padStart(
      4,
      "0"
    )}`;
  };

const getWarehouses =
  async () => {
    if (
      typeof ensureDefaultWarehouses !==
      "function"
    ) {
      throw new Error(
        "ensureDefaultWarehouses is not exported from stockService"
      );
    }

    await ensureDefaultWarehouses();

    const warehouses =
      await Warehouse.find({
        $or: [
          {
            code: {
              $in: [
                "WH-RM",
                "WH-FG",
              ],
            },
          },
          {
            name: {
              $in: [
                RAW_MATERIAL_GODOWN,
                FINISHED_GOODS_GODOWN,
                "Raw Material Warehouse",
                "Finished Goods Warehouse",
              ],
            },
          },
        ],
      });

    const rawWarehouse =
      warehouses.find(
        (warehouse) =>
          warehouse.code ===
            "WH-RM" ||
          [
            RAW_MATERIAL_GODOWN,
            "Raw Material Warehouse",
          ].includes(
            warehouse.name
          )
      );

    const finishedWarehouse =
      warehouses.find(
        (warehouse) =>
          warehouse.code ===
            "WH-FG" ||
          [
            FINISHED_GOODS_GODOWN,
            "Finished Goods Warehouse",
          ].includes(
            warehouse.name
          )
      );

    if (!rawWarehouse) {
      throw new Error(
        "Raw Material Godown not found"
      );
    }

    if (
      !finishedWarehouse
    ) {
      throw new Error(
        "Finished Goods Godown not found"
      );
    }

    if (
      rawWarehouse.status ===
      "Inactive"
    ) {
      throw new Error(
        "Raw Material Godown is inactive"
      );
    }

    if (
      finishedWarehouse.status ===
      "Inactive"
    ) {
      throw new Error(
        "Finished Goods Godown is inactive"
      );
    }

    return {
      rawWarehouse,
      finishedWarehouse,
    };
  };

const warehouseForItemType = (
  itemType,
  warehouses
) =>
  itemType ===
  "Finished Good"
    ? warehouses.finishedWarehouse
    : warehouses.rawWarehouse;

const getPOItemsMap = (
  items = []
) => {
  const map = new Map();

  for (
    const row of
    items
  ) {
    const data = {
      purchaseOrderItemId:
        row._id || null,

      item:
        idOf(
          row.item
        ) || null,

      description:
        cleanText(
          row.description ||
            row.itemName ||
            row.item?.name
        ),

      size:
        cleanText(
          row.size
        ),

      orderedQty:
        cleanNumber(
          row.quantity ??
            row.qty
        ),

      unit:
        cleanText(
          row.unit ||
            row.item?.unit,
          "Pcs"
        ),

      unitPrice:
        cleanNumber(
          row.unitPrice
        ),
    };

    const keys =
      getItemKeys(
        row,
        {
          useDocumentIdAsPurchaseOrderRowId:
            true,
        }
      );

    for (
      const key of
      keys
    ) {
      map.set(
        key,
        data
      );
    }
  }

  return map;
};

const getReceivedQtyMap =
  async (
    purchaseOrderId,
    excludeGRNId = null
  ) => {
    const query = {
      purchaseOrder:
        purchaseOrderId,

      status: {
        $in:
          STOCK_POSTING_STATUSES,
      },

      stockPosted:
        true,
    };

    if (
      excludeGRNId
    ) {
      query._id = {
        $ne:
          excludeGRNId,
      };
    }

    const postedGRNs =
      await GRN.find(
        query
      )
        .select(
          "items.purchaseOrderItemId items.item items.description items.size items.unit items.acceptedQty"
        )
        .lean();

    const map = new Map();

    for (
      const grn of
      postedGRNs
    ) {
      for (
        const item of
        grn.items || []
      ) {
        const keys =
          getItemKeys(
            item
          );

        for (
          const key of
          keys
        ) {
          map.set(
            key,
            cleanNumber(
              map.get(key)
            ) +
              cleanNumber(
                item.acceptedQty
              )
          );
        }
      }
    }

    return map;
  };

const loadPurchaseOrder =
  async (
    purchaseOrderId
  ) => {
    if (
      !isValidId(
        purchaseOrderId
      )
    ) {
      throw new Error(
        "A valid Purchase Order is required"
      );
    }

    const purchaseOrder =
      await PurchaseOrder.findById(
        purchaseOrderId
      )
        .populate(
          "vendor",
          "vendorName name phoneNumber phone email address city ntn strn status"
        )
        .populate(
          "items.item",
          "code name itemType unit status stockManaged purchasePrice salePrice"
        );

    if (
      !purchaseOrder
    ) {
      throw new Error(
        "Purchase Order not found"
      );
    }

    if (
      !GRN_ALLOWED_PO_STATUSES.includes(
        purchaseOrder.status
      )
    ) {
      throw new Error(
        `GRN cannot be created for a Purchase Order with status ${purchaseOrder.status}`
      );
    }

    return purchaseOrder;
  };

const cleanGRNItems =
  async ({
    items = [],
    purchaseOrder,
    excludeGRNId = null,
  }) => {
    if (
      !Array.isArray(items)
    ) {
      throw new Error(
        "GRN items must be an array"
      );
    }

    const poItemsMap =
      getPOItemsMap(
        purchaseOrder.items ||
          []
      );

    const receivedMap =
      await getReceivedQtyMap(
        purchaseOrder._id,
        excludeGRNId
      );

    const warehouses =
      await getWarehouses();

    const itemCache =
      new Map();

    const usedRows =
      new Set();

    const cleanItems = [];

    for (
      const incoming of
      items
    ) {
      if (!incoming) {
        continue;
      }

      const receivedQty =
        cleanNumber(
          incoming.receivedQty
        );

      const rejectedQty =
        cleanNumber(
          incoming.rejectedQty
        );

      if (
        receivedQty <= 0
      ) {
        continue;
      }

      if (
        rejectedQty >
        receivedQty
      ) {
        throw new Error(
          `${cleanText(
            incoming.itemName ||
              incoming.description,
            "Item"
          )}: rejected quantity cannot exceed received quantity`
        );
      }

      const incomingKeys =
        getItemKeys(
          incoming
        );

      let matchedKey = "";
      let poItem = null;

      for (
        const key of
        incomingKeys
      ) {
        if (
          poItemsMap.has(key)
        ) {
          matchedKey = key;

          poItem =
            poItemsMap.get(
              key
            );

          break;
        }
      }

      if (!poItem) {
        throw new Error(
          `Item "${cleanText(
            incoming.itemName ||
              incoming.description,
            "Unknown item"
          )}" with size "${cleanText(
            incoming.size,
            "-"
          )}" was not found in the selected Purchase Order`
        );
      }

      const poRowId =
        idOf(
          poItem.purchaseOrderItemId
        );

      const poItemKeys =
        getItemKeys({
          purchaseOrderItemId:
            poItem.purchaseOrderItemId,

          item:
            poItem.item,

          description:
            poItem.description,

          size:
            poItem.size,

          unit:
            poItem.unit,
        });

      const uniqueRowKey =
        poRowId
          ? `po-row:${poRowId}`
          : poItemKeys[0] ||
            matchedKey;

      if (
        usedRows.has(
          uniqueRowKey
        )
      ) {
        throw new Error(
          `The Purchase Order row for "${poItem.description}" with size "${poItem.size || "-"}" has been added twice`
        );
      }

      usedRows.add(
        uniqueRowKey
      );

      const itemId =
        idOf(
          poItem.item ||
            incoming.item
        );

      if (
        !itemId ||
        !isValidId(
          itemId
        )
      ) {
        throw new Error(
          `Item "${poItem.description}" is not linked with Item Master`
        );
      }

      let itemDocument =
        itemCache.get(
          itemId
        );

      if (
        !itemDocument
      ) {
        itemDocument =
          await Item.findById(
            itemId
          );

        itemCache.set(
          itemId,
          itemDocument ||
            null
        );
      }

      if (
        !itemDocument
      ) {
        throw new Error(
          `Item Master record not found: ${poItem.description}`
        );
      }

      if (
        itemDocument.status ===
        "Inactive"
      ) {
        throw new Error(
          `Item "${itemDocument.name}" is inactive`
        );
      }

      if (
        itemDocument.stockManaged ===
          false ||
        itemDocument.itemType ===
          "Service"
      ) {
        throw new Error(
          `Service or non-stock item "${itemDocument.name}" cannot be received through GRN`
        );
      }

      if (
        !SUPPORTED_ITEM_TYPES.includes(
          itemDocument.itemType
        )
      ) {
        throw new Error(
          `Item "${itemDocument.name}" has unsupported item type ${itemDocument.itemType}`
        );
      }

      const acceptedQty =
        Math.max(
          receivedQty -
            rejectedQty,
          0
        );

      const previouslyAccepted =
        getMapNumberByKeys(
          receivedMap,
          poItemKeys
        );

      const orderedQty =
        cleanNumber(
          poItem.orderedQty
        );

      const pendingBefore =
        Math.max(
          orderedQty -
            previouslyAccepted,
          0
        );

      if (
        acceptedQty >
        pendingBefore
      ) {
        throw new Error(
          `${itemDocument.name}: accepted quantity cannot exceed pending quantity ${pendingBefore} ${poItem.unit}`
        );
      }

      const warehouse =
        warehouseForItemType(
          itemDocument.itemType,
          warehouses
        );

      const unitPrice =
        cleanNumber(
          incoming.unitPrice ??
            poItem.unitPrice
        );

      cleanItems.push({
        purchaseOrderItemId:
          poItem.purchaseOrderItemId ||
          null,

        item:
          itemDocument._id,

        itemCode:
          cleanText(
            itemDocument.code
          ).toUpperCase(),

        itemName:
          cleanText(
            itemDocument.name
          ),

        itemType:
          itemDocument.itemType,

        warehouseId:
          warehouse._id,

        warehouse:
          warehouse.name,

        description:
          cleanText(
            incoming.description ||
              poItem.description,
            itemDocument.name
          ),

        size:
          cleanText(
            incoming.size ||
              poItem.size
          ),

        orderedQty,

        previousReceivedQty:
          previouslyAccepted,

        receivedQty,

        rejectedQty,

        acceptedQty,

        pendingQty:
          Math.max(
            pendingBefore -
              acceptedQty,
            0
          ),

        unit:
          cleanText(
            incoming.unit ||
              poItem.unit ||
              itemDocument.unit,
            "Pcs"
          ),

        unitPrice,

        amount:
          acceptedQty *
          unitPrice,

        remarks:
          cleanText(
            incoming.remarks
          ),
      });
    }

    if (
      !cleanItems.length
    ) {
      throw new Error(
        "Receive at least one valid item"
      );
    }

    return cleanItems;
  };

const calculateTotals = (
  items = []
) =>
  items.reduce(
    (
      totals,
      item
    ) => {
      totals.totalOrderedQty +=
        cleanNumber(
          item.orderedQty
        );

      totals.totalReceivedQty +=
        cleanNumber(
          item.receivedQty
        );

      totals.totalRejectedQty +=
        cleanNumber(
          item.rejectedQty
        );

      totals.totalAcceptedQty +=
        cleanNumber(
          item.acceptedQty
        );

      totals.totalPendingQty +=
        cleanNumber(
          item.pendingQty
        );

      totals.subtotal +=
        cleanNumber(
          item.amount
        );

      return totals;
    },
    {
      totalOrderedQty: 0,
      totalReceivedQty: 0,
      totalRejectedQty: 0,
      totalAcceptedQty: 0,
      totalPendingQty: 0,
      subtotal: 0,
    }
  );

const getWarehouseSummary = (
  items = []
) => {
  const warehouseMap =
    new Map();

  for (
    const item of
    items
  ) {
    warehouseMap.set(
      String(
        item.warehouseId
      ),
      {
        _id:
          item.warehouseId,

        name:
          item.warehouse,
      }
    );
  }

  const warehouses = [
    ...warehouseMap.values(),
  ];

  const containsFinishedGood =
    items.some(
      (item) =>
        item.itemType ===
        "Finished Good"
    );

  const containsOther =
    items.some(
      (item) =>
        item.itemType !==
        "Finished Good"
    );

  return {
    receiptType:
      containsFinishedGood &&
      containsOther
        ? "Mixed"
        : containsFinishedGood
          ? "Finished Good"
          : "Raw Material",

    warehouseId:
      warehouses.length ===
      1
        ? warehouses[0]._id
        : null,

    warehouse:
      warehouses.length ===
      1
        ? warehouses[0].name
        : MULTIPLE_WAREHOUSES,
  };
};

const validatePostingState = ({
  status,
  inspectionStatus,
  totals,
}) => {
  if (
    !shouldPostStock(
      status
    )
  ) {
    return;
  }

  if (
    inspectionStatus ===
    "Pending"
  ) {
    throw new Error(
      "Complete inspection before posting GRN stock"
    );
  }

  if (
    inspectionStatus ===
    "Rejected"
  ) {
    throw new Error(
      "A rejected GRN cannot post stock"
    );
  }

  if (
    cleanNumber(
      totals.totalAcceptedQty
    ) <= 0
  ) {
    throw new Error(
      "Accepted quantity is required to post stock"
    );
  }
};

const hasGRNStockEntries =
  async (
    grnId
  ) =>
    StockLedger.exists({
      sourceModule:
        "GRN",

      referenceModel:
        "GRN",

      referenceId:
        grnId,

      movementType:
        "GRN In",

      isReversal: {
        $ne: true,
      },
    });

const removeFailedGRNStockEntries =
  async (
    grnId
  ) => {
    await StockLedger.deleteMany({
      sourceModule:
        "GRN",

      referenceModel:
        "GRN",

      referenceId:
        grnId,

      movementType:
        "GRN In",

      isReversal: {
        $ne: true,
      },
    });
  };

const postGRNStock =
  async (
    grn
  ) => {
    if (
      !shouldPostStock(
        grn.status
      ) ||
      grn.status ===
        "Cancelled" ||
      grn.inspectionStatus ===
        "Rejected"
    ) {
      return grn;
    }

    if (
      grn.stockPosted ||
      await hasGRNStockEntries(
        grn._id
      )
    ) {
      throw new Error(
        "GRN stock has already been posted"
      );
    }

    validatePostingState({
      status:
        grn.status,

      inspectionStatus:
        grn.inspectionStatus,

      totals: {
        totalAcceptedQty:
          grn.totalAcceptedQty,
      },
    });

    const warehouses =
      await getWarehouses();

    for (
      let index = 0;
      index <
      (
        grn.items ||
        []
      ).length;
      index += 1
    ) {
      const row =
        grn.items[index];

      const acceptedQty =
        cleanNumber(
          row.acceptedQty
        );

      if (
        acceptedQty <= 0
      ) {
        continue;
      }

      const expectedWarehouse =
        warehouseForItemType(
          row.itemType,
          warehouses
        );

      await postStockMovement({
        item:
          row.item,

        warehouse:
          expectedWarehouse._id,

        date:
          grn.receivedDate,

        movementType:
          "GRN In",

        sourceModule:
          "GRN",

        referenceModel:
          "GRN",

        referenceId:
          grn._id,

        referenceLineId:
          String(
            row._id ||
              row.purchaseOrderItemId ||
              index
          ),

        referenceNo:
          grn.grnNo,

        postingKey:
          `GRN:${grn._id}:${row._id || row.purchaseOrderItemId || index}:IN`,

        qtyIn:
          acceptedQty,

        qtyOut: 0,

        rate:
          cleanNumber(
            row.unitPrice
          ),

        remarks:
          `GRN ${grn.grnNo} against PO ${grn.purchaseOrderNo} - ${row.itemType}`,

        allowNegativeStock:
          false,

        allowDuplicate:
          false,
      });
    }

    grn.stockPosted =
      true;

    grn.stockPostedAt =
      new Date();

    grn.reversalPosted =
      false;

    await grn.save();

    return grn;
  };

const reverseGRNStock =
  async (
    grn
  ) => {
    if (
      typeof getItemStock !==
      "function"
    ) {
      throw new Error(
        "getItemStock is not exported from stockService"
      );
    }

    const originalEntries =
      await StockLedger.find({
        sourceModule:
          "GRN",

        referenceModel:
          "GRN",

        referenceId:
          grn._id,

        movementType:
          "GRN In",

        isReversal: {
          $ne: true,
        },
      }).sort({
        createdAt: 1,
      });

    if (
      !originalEntries.length
    ) {
      grn.stockPosted =
        false;

      await grn.save();

      return;
    }

    const requirements =
      new Map();

    for (
      const entry of
      originalEntries
    ) {
      const warehouseReference =
        entry.warehouseId ||
        entry.warehouse;

      const warehouseKey =
        String(
          warehouseReference ||
            ""
        );

      const key =
        `${entry.item}|${warehouseKey}`;

      const current =
        requirements.get(key) || {
          item:
            entry.item,

          warehouse:
            warehouseReference,

          warehouseName:
            cleanText(
              entry.warehouse,
              warehouseKey
            ),

          quantity: 0,

          unit:
            entry.unit ||
            "Pcs",
        };

      current.quantity +=
        cleanNumber(
          entry.qtyIn
        );

      requirements.set(
        key,
        current
      );
    }

    for (
      const requirement of
      requirements.values()
    ) {
      const currentStock =
        await getItemStock(
          requirement.item,
          requirement.warehouse
        );

      if (
        currentStock <
        requirement.quantity
      ) {
        throw new Error(
          `GRN cannot be cancelled. ${requirement.warehouseName} has ${currentStock} ${requirement.unit}, but ${requirement.quantity} ${requirement.unit} must be reversed.`
        );
      }
    }

    for (
      const original of
      originalEntries
    ) {
      const reversalExists =
        await StockLedger.exists({
          reversalOf:
            original._id,

          isReversal:
            true,
        });

      if (
        reversalExists
      ) {
        continue;
      }

      await postStockMovement({
        item:
          original.item,

        warehouse:
          original.warehouseId ||
          original.warehouse,

        date:
          todayDate(),

        movementType:
          "Reversal Out",

        sourceModule:
          "GRN Cancellation",

        referenceModel:
          "GRN",

        referenceId:
          grn._id,

        referenceLineId:
          `REV-${original._id}`,

        referenceNo:
          grn.grnNo,

        postingKey:
          `GRN:${grn._id}:${original._id}:REV-OUT`,

        qtyIn: 0,

        qtyOut:
          cleanNumber(
            original.qtyIn
          ),

        rate:
          cleanNumber(
            original.rate
          ),

        remarks:
          `Cancellation reversal of GRN ${grn.grnNo}`,

        allowNegativeStock:
          false,

        allowInactiveItem:
          true,

        allowDuplicate:
          false,

        isReversal:
          true,

        reversalOf:
          original._id,
      });
    }

    grn.stockPosted =
      false;

    grn.reversalPosted =
      true;

    await grn.save();
  };

const updatePurchaseOrderReceivingStatus =
  async (
    purchaseOrderId
  ) => {
    const purchaseOrder =
      await PurchaseOrder.findById(
        purchaseOrderId
      );

    if (
      !purchaseOrder ||
      purchaseOrder.status ===
        "Cancelled"
    ) {
      return;
    }

    const receivedMap =
      await getReceivedQtyMap(
        purchaseOrderId
      );

    let totalOrdered = 0;
    let totalReceived = 0;

    for (
      const row of
      purchaseOrder.items ||
      []
    ) {
      const orderedQty =
        cleanNumber(
          row.quantity ??
            row.qty
        );

      const receivedQty =
        getMapNumberByKeys(
          receivedMap,

          getItemKeys(
            row,
            {
              useDocumentIdAsPurchaseOrderRowId:
                true,
            }
          )
        );

      row.receivedQty =
        receivedQty;

      row.pendingQty =
        Math.max(
          orderedQty -
            receivedQty,
          0
        );

      totalOrdered +=
        orderedQty;

      totalReceived +=
        receivedQty;
    }

    if (
      totalReceived <= 0
    ) {
      purchaseOrder.status =
        purchaseOrder.status ===
        "Draft"
          ? "Draft"
          : "Ordered";
    } else if (
      totalOrdered > 0 &&
      totalReceived >=
        totalOrdered
    ) {
      purchaseOrder.status =
        "Received";
    } else {
      purchaseOrder.status =
        "Partially Received";
    }

    await purchaseOrder.save();
  };

const populateGRN = (
  query
) =>
  query
    .populate(
      "purchaseOrder",
      "purchaseOrderNo orderNo status orderDate deliveryDate"
    )
    .populate(
      "vendor",
      "vendorName name phoneNumber phone email address city ntn strn status"
    )
    .populate(
      "items.item",
      "code name itemType unit status stockManaged purchasePrice salePrice"
    )
    .populate(
      "items.warehouseId",
      "code name warehouseType status"
    )
    .populate(
      "warehouseId",
      "code name warehouseType status"
    );

const getEligiblePurchaseOrders =
  async () => {
    const warehouses =
      await getWarehouses();

    const orders =
      await PurchaseOrder.find({
        status: {
          $in:
            GRN_ALLOWED_PO_STATUSES,
        },
      })
        .populate(
          "vendor",
          "vendorName name phoneNumber phone email address city status"
        )
        .populate(
          "items.item",
          "code name itemType unit status stockManaged purchasePrice salePrice"
        )
        .sort({
          createdAt: -1,
        });

    const output = [];

    for (
      const order of
      orders
    ) {
      const receivedMap =
        await getReceivedQtyMap(
          order._id
        );

      const items = [];

      for (
        const row of
        order.items || []
      ) {
        const item =
          row.item;

        if (
          !item ||
          item.status ===
            "Inactive" ||
          item.stockManaged ===
            false ||
          !SUPPORTED_ITEM_TYPES.includes(
            item.itemType
          )
        ) {
          continue;
        }

        const orderedQty =
          cleanNumber(
            row.quantity ??
              row.qty
          );

        const previousReceivedQty =
          getMapNumberByKeys(
            receivedMap,

            getItemKeys(
              row,
              {
                useDocumentIdAsPurchaseOrderRowId:
                  true,
              }
            )
          );

        const pendingQty =
          Math.max(
            orderedQty -
              previousReceivedQty,
            0
          );

        if (
          pendingQty <= 0
        ) {
          continue;
        }

        const warehouse =
          warehouseForItemType(
            item.itemType,
            warehouses
          );

        items.push({
          purchaseOrderItemId:
            row._id ||
            null,

          item:
            item._id,

          itemCode:
            item.code,

          itemName:
            item.name,

          itemType:
            item.itemType,

          warehouseId:
            warehouse._id,

          warehouse:
            warehouse.name,

          description:
            cleanText(
              row.description ||
                row.itemName,
              item.name
            ),

          size:
            cleanText(
              row.size
            ),

          orderedQty,

          previousReceivedQty,

          pendingQty,

          receivedQty: 0,

          rejectedQty: 0,

          acceptedQty: 0,

          unit:
            cleanText(
              row.unit,
              item.unit ||
                "Pcs"
            ),

          unitPrice:
            cleanNumber(
              row.unitPrice ??
                item.purchasePrice
            ),

          remarks:
            cleanText(
              row.remarks
            ),
        });
      }

      if (
        !items.length
      ) {
        continue;
      }

      const vendor =
        order.vendor || {};

      output.push({
        _id:
          order._id,

        purchaseOrderNo:
          cleanText(
            order.purchaseOrderNo ||
              order.orderNo
          ),

        status:
          order.status,

        vendor:
          vendor._id ||
          vendor,

        vendorName:
          cleanText(
            order.vendorName ||
              vendor.vendorName ||
              vendor.name
          ),

        vendorPhone:
          cleanText(
            order.vendorPhone ||
              vendor.phoneNumber ||
              vendor.phone
          ),

        vendorEmail:
          cleanText(
            order.vendorEmail ||
              vendor.email
          ),

        vendorAddress:
          cleanText(
            order.vendorAddress ||
              vendor.address
          ),

        items,
      });
    }

    return output;
  };

router.get(
  "/next-no",
  async (
    req,
    res
  ) => {
    try {
      const grnNo =
        await peekNextGRNNo();

      return res.json({
        success: true,
        grnNo,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            error.message,
        });
    }
  }
);

router.get(
  "/eligible-purchase-orders",
  async (
    req,
    res
  ) => {
    try {
      const purchaseOrders =
        await getEligiblePurchaseOrders();

      return res.json(
        purchaseOrders
      );
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            error.message,
        });
    }
  }
);

router.get(
  "/all",
  async (
    req,
    res
  ) => {
    try {
      const {
        search = "",
        status = "",
        receiptType = "",
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
        receiptType &&
        receiptType !==
          "All"
      ) {
        query.receiptType =
          receiptType;
      }

      if (search) {
        query.$or = [
          {
            grnNo: {
              $regex:
                search,
              $options:
                "i",
            },
          },
          {
            purchaseOrderNo: {
              $regex:
                search,
              $options:
                "i",
            },
          },
          {
            vendorName: {
              $regex:
                search,
              $options:
                "i",
            },
          },
          {
            challanNo: {
              $regex:
                search,
              $options:
                "i",
            },
          },
          {
            invoiceNo: {
              $regex:
                search,
              $options:
                "i",
            },
          },
          {
            "items.itemCode": {
              $regex:
                search,
              $options:
                "i",
            },
          },
          {
            "items.itemName": {
              $regex:
                search,
              $options:
                "i",
            },
          },
        ];
      }

      const grns =
        await populateGRN(
          GRN.find(
            query
          ).sort({
            receivedDate: -1,
            createdAt: -1,
          })
        );

      return res.json(
        grns
      );
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,
          message:
            error.message,
        });
    }
  }
);

router.get(
  "/:id",
  async (
    req,
    res
  ) => {
    try {
      if (
        !isValidId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid GRN ID",
          });
      }

      const grn =
        await populateGRN(
          GRN.findById(
            req.params.id
          )
        );

      if (!grn) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "GRN not found",
          });
      }

      return res.json({
        success: true,
        data: grn,
      });
    } catch (error) {
      return res
        .status(500)
        .json({
          success: false,

          message:
            error.message,
        });
    }
  }
);

router.post(
  "/add",
  async (
    req,
    res
  ) => {
    let savedGRN = null;

    try {
      const body =
        req.body || {};

      const purchaseOrder =
        await loadPurchaseOrder(
          body.purchaseOrder
        );

      const items =
        await cleanGRNItems({
          items:
            body.items || [],

          purchaseOrder,
        });

      const totals =
        calculateTotals(
          items
        );

      const status =
        normalizeStatus(
          body.status
        );

      const inspectionStatus =
        normalizeInspectionStatus(
          body.inspectionStatus
        );

      if (
        status ===
        "Cancelled"
      ) {
        throw new Error(
          "A new GRN cannot be created with Cancelled status"
        );
      }

      validatePostingState({
        status,
        inspectionStatus,
        totals,
      });

      const vendorSnapshot =
        getVendorSnapshot(
          purchaseOrder
        );

      if (
        !vendorSnapshot.vendor ||
        !isValidId(
          vendorSnapshot.vendor
        )
      ) {
        throw new Error(
          "Purchase Order vendor reference is missing"
        );
      }

      if (
        !vendorSnapshot.vendorName
      ) {
        throw new Error(
          "Purchase Order vendor name is missing"
        );
      }

      const warehouseSummary =
        getWarehouseSummary(
          items
        );

      const grnNo =
        body.grnNo
          ? cleanText(
              body.grnNo
            ).toUpperCase()
          : await getNextGRNNo();

      savedGRN =
        await GRN.create({
          grnNo,

          purchaseOrder:
            purchaseOrder._id,

          purchaseOrderNo:
            cleanText(
              purchaseOrder.purchaseOrderNo ||
                purchaseOrder.orderNo
            ).toUpperCase(),

          ...vendorSnapshot,

          receivedDate:
            cleanText(
              body.receivedDate,
              todayDate()
            ),

          challanNo:
            cleanText(
              body.challanNo
            ),

          invoiceNo:
            cleanText(
              body.invoiceNo
            ),

          vehicleNo:
            cleanText(
              body.vehicleNo
            ).toUpperCase(),

          ...warehouseSummary,

          receivedBy:
            cleanText(
              body.receivedBy
            ),

          checkedBy:
            cleanText(
              body.checkedBy
            ),

          inspectionStatus,

          status,

          items,

          ...totals,

          stockPosted:
            false,

          stockPostedAt:
            null,

          reversalPosted:
            false,

          remarks:
            cleanText(
              body.remarks
            ),
        });

      if (
        shouldPostStock(
          savedGRN.status
        )
      ) {
        await postGRNStock(
          savedGRN
        );
      }

      await updatePurchaseOrderReceivingStatus(
        purchaseOrder._id
      );

      const data =
        await populateGRN(
          GRN.findById(
            savedGRN._id
          )
        );

      return res
        .status(201)
        .json({
          success: true,

          message:
            data.stockPosted
              ? "GRN created and stock posted to the correct warehouse"
              : "Draft GRN created successfully",

          data,
        });
    } catch (error) {
      if (
        savedGRN?._id
      ) {
        try {
          await removeFailedGRNStockEntries(
            savedGRN._id
          );

          await GRN.findByIdAndDelete(
            savedGRN._id
          );
        } catch (
          rollbackError
        ) {
          console.error(
            "GRN add rollback failed:",
            rollbackError.message
          );
        }
      }

      return res
        .status(400)
        .json({
          success: false,

          message:
            duplicateMessage(
              error,
              "Unable to create GRN"
            ),
        });
    }
  }
);

router.put(
  "/update/:id",
  async (
    req,
    res
  ) => {
    try {
      if (
        !isValidId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid GRN ID",
          });
      }

      const grn =
        await GRN.findById(
          req.params.id
        );

      if (!grn) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "GRN not found",
          });
      }

      if (
        grn.purchaseStatus ===
        "Purchased"
      ) {
        throw new Error(
          "A purchased GRN cannot be edited"
        );
      }

      if (
        grn.status !==
          "Draft" ||
        grn.stockPosted ||
        await hasGRNStockEntries(
          grn._id
        )
      ) {
        throw new Error(
          "Only an unposted Draft GRN can be edited"
        );
      }

      const body =
        req.body || {};

      const purchaseOrder =
        await loadPurchaseOrder(
          body.purchaseOrder ||
            grn.purchaseOrder
        );

      const items =
        await cleanGRNItems({
          items:
            body.items ||
            grn.items,

          purchaseOrder,

          excludeGRNId:
            grn._id,
        });

      const totals =
        calculateTotals(
          items
        );

      const status =
        normalizeStatus(
          body.status ||
            grn.status
        );

      const inspectionStatus =
        normalizeInspectionStatus(
          body.inspectionStatus ||
            grn.inspectionStatus
        );

      if (
        status ===
        "Cancelled"
      ) {
        throw new Error(
          "Use the status action to cancel a GRN"
        );
      }

      validatePostingState({
        status,
        inspectionStatus,
        totals,
      });

      const oldPurchaseOrderId =
        grn.purchaseOrder;

      const warehouseSummary =
        getWarehouseSummary(
          items
        );

      const vendorSnapshot =
        getVendorSnapshot(
          purchaseOrder
        );

      Object.assign(
        grn,
        {
          purchaseOrder:
            purchaseOrder._id,

          purchaseOrderNo:
            cleanText(
              purchaseOrder.purchaseOrderNo ||
                purchaseOrder.orderNo
            ).toUpperCase(),

          ...vendorSnapshot,

          receivedDate:
            cleanText(
              body.receivedDate,
              grn.receivedDate
            ),

          challanNo:
            cleanText(
              body.challanNo
            ),

          invoiceNo:
            cleanText(
              body.invoiceNo
            ),

          vehicleNo:
            cleanText(
              body.vehicleNo
            ).toUpperCase(),

          ...warehouseSummary,

          receivedBy:
            cleanText(
              body.receivedBy
            ),

          checkedBy:
            cleanText(
              body.checkedBy
            ),

          inspectionStatus,

          status,

          items,

          ...totals,

          remarks:
            cleanText(
              body.remarks
            ),
        }
      );

      await grn.save();

      if (
        shouldPostStock(
          grn.status
        )
      ) {
        try {
          await postGRNStock(
            grn
          );
        } catch (error) {
          await removeFailedGRNStockEntries(
            grn._id
          );

          grn.status =
            "Draft";

          grn.stockPosted =
            false;

          grn.stockPostedAt =
            null;

          await grn.save();

          throw error;
        }
      }

      await updatePurchaseOrderReceivingStatus(
        purchaseOrder._id
      );

      if (
        String(
          oldPurchaseOrderId
        ) !==
        String(
          purchaseOrder._id
        )
      ) {
        await updatePurchaseOrderReceivingStatus(
          oldPurchaseOrderId
        );
      }

      const data =
        await populateGRN(
          GRN.findById(
            grn._id
          )
        );

      return res.json({
        success: true,

        message:
          data.stockPosted
            ? "GRN updated and stock posted successfully"
            : "Draft GRN updated successfully",

        data,
      });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            duplicateMessage(
              error,
              "Unable to update GRN"
            ),
        });
    }
  }
);

router.patch(
  "/status/:id",
  async (
    req,
    res
  ) => {
    try {
      if (
        !isValidId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid GRN ID",
          });
      }

      const grn =
        await GRN.findById(
          req.params.id
        );

      if (!grn) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "GRN not found",
          });
      }

      if (
        grn.purchaseStatus ===
        "Purchased"
      ) {
        throw new Error(
          "A purchased GRN status cannot be changed"
        );
      }

      if (
        grn.status ===
        "Cancelled"
      ) {
        throw new Error(
          "A cancelled GRN cannot be reactivated"
        );
      }

      const requestedStatus =
        normalizeStatus(
          req.body.status
        );

      if (
        requestedStatus ===
        "Cancelled"
      ) {
        if (
          grn.stockPosted ||
          await hasGRNStockEntries(
            grn._id
          )
        ) {
          await reverseGRNStock(
            grn
          );
        }

        grn.status =
          "Cancelled";

        grn.stockPosted =
          false;

        grn.cancelledAt =
          new Date();

        grn.cancelReason =
          cleanText(
            req.body.cancelReason,
            "GRN cancelled"
          );

        await grn.save();
      } else if (
        shouldPostStock(
          requestedStatus
        )
      ) {
        validatePostingState({
          status:
            requestedStatus,

          inspectionStatus:
            grn.inspectionStatus,

          totals: {
            totalAcceptedQty:
              grn.totalAcceptedQty,
          },
        });

        if (
          !grn.stockPosted
        ) {
          const oldStatus =
            grn.status;

          grn.status =
            requestedStatus;

          await grn.save();

          try {
            await postGRNStock(
              grn
            );
          } catch (error) {
            await removeFailedGRNStockEntries(
              grn._id
            );

            grn.status =
              oldStatus;

            grn.stockPosted =
              false;

            grn.stockPostedAt =
              null;

            await grn.save();

            throw error;
          }
        } else {
          grn.status =
            requestedStatus;

          await grn.save();
        }
      } else {
        if (
          grn.stockPosted
        ) {
          throw new Error(
            "A posted GRN cannot be changed back to Draft"
          );
        }

        grn.status =
          requestedStatus;

        await grn.save();
      }

      await updatePurchaseOrderReceivingStatus(
        grn.purchaseOrder
      );

      const data =
        await populateGRN(
          GRN.findById(
            grn._id
          )
        );

      return res.json({
        success: true,

        message:
          requestedStatus ===
          "Cancelled"
            ? "GRN cancelled and stock reversed successfully"
            : data.stockPosted
              ? "GRN stock posted successfully"
              : "GRN status updated successfully",

        data,
      });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message,
        });
    }
  }
);

router.delete(
  "/delete/:id",
  async (
    req,
    res
  ) => {
    try {
      if (
        !isValidId(
          req.params.id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Invalid GRN ID",
          });
      }

      const grn =
        await GRN.findById(
          req.params.id
        );

      if (!grn) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "GRN not found",
          });
      }

      if (
        grn.purchaseStatus ===
        "Purchased"
      ) {
        throw new Error(
          "A purchased GRN cannot be deleted"
        );
      }

      if (
        grn.status !==
          "Draft" ||
        grn.stockPosted ||
        await hasGRNStockEntries(
          grn._id
        )
      ) {
        throw new Error(
          "Only an unposted Draft GRN can be deleted"
        );
      }

      const purchaseOrderId =
        grn.purchaseOrder;

      await GRN.findByIdAndDelete(
        grn._id
      );

      await updatePurchaseOrderReceivingStatus(
        purchaseOrderId
      );

      return res.json({
        success: true,

        message:
          "Draft GRN deleted successfully",
      });
    } catch (error) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message,
        });
    }
  }
);

module.exports = router;