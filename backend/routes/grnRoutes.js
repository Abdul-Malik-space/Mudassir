const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const GRN = require("../models/GRN");
const Item = require("../models/Item");
const Warehouse = require("../models/Warehouse");
const PurchaseOrder = require("../models/PurchaseOrder");
const Counter = require("../models/Counter");
const StockLedger = require("../models/StockLedger");

const {
  RAW_MATERIAL_GODOWN,
  ensureDefaultWarehouses,
  getItemStock,
  postStockMovement,
} = require("../utils/stockService");

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

const RAW_MATERIAL_ITEM_TYPES = [
  "Raw Material",
  "Packing Material",
  "Consumable",
];

const todayDate = () =>
  new Date().toISOString().slice(0, 10);

const normalizeText = (
  value,
  fallback = ""
) => {
  const cleanedValue = String(
    value || ""
  ).trim();

  return cleanedValue || fallback;
};

const normalizeNumber = (
  value,
  fallback = 0
) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
};

const normalizeStatus = (value) => {
  const status = normalizeText(
    value,
    "Draft"
  );

  if (status === "Partial") {
    return "Partially Received";
  }

  if (status === "Complete") {
    return "Completed";
  }

  return GRN_STATUSES.includes(status)
    ? status
    : "Draft";
};

const normalizeInspectionStatus = (
  value
) => {
  const status = normalizeText(
    value,
    "Pending"
  );

  if (status === "Partial") {
    return "Partially Accepted";
  }

  if (status === "Failed") {
    return "Rejected";
  }

  return INSPECTION_STATUSES.includes(
    status
  )
    ? status
    : "Pending";
};

const shouldPostStock = (status) => {
  return STOCK_POSTING_STATUSES.includes(
    status
  );
};

const isValidObjectId = (value) => {
  return mongoose.isValidObjectId(value);
};

const getId = (value) => {
  if (!value) return "";

  if (
    typeof value === "object"
  ) {
    return String(
      value._id || value.id || ""
    );
  }

  return String(value);
};

const makeItemKey = (item = {}) => {
  const purchaseOrderItemId = getId(
    item.purchaseOrderItemId ||
      item._id
  );

  if (purchaseOrderItemId) {
    return `po-row:${purchaseOrderItemId}`;
  }

  const itemId = getId(item.item);

  if (itemId) {
    return [
      `item:${itemId}`,
      normalizeText(
        item.size
      ).toLowerCase(),
      normalizeText(
        item.unit,
        "Pcs"
      ).toLowerCase(),
    ].join("|");
  }

  return [
    normalizeText(
      item.description
    ).toLowerCase(),

    normalizeText(
      item.size
    ).toLowerCase(),

    normalizeText(
      item.unit,
      "Pcs"
    ).toLowerCase(),
  ].join("|");
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

  const vendorId = getId(
    purchaseOrder.vendor
  );

  return {
    vendor: vendorId || null,

    vendorName:
      normalizeText(
        purchaseOrder.vendorName
      ) ||
      normalizeText(
        vendorDocument?.vendorName
      ) ||
      normalizeText(
        vendorDocument?.name
      ),

    vendorPhone:
      normalizeText(
        purchaseOrder.vendorPhone
      ) ||
      normalizeText(
        vendorDocument?.phoneNumber
      ) ||
      normalizeText(
        vendorDocument?.phone
      ),

    vendorEmail:
      normalizeText(
        purchaseOrder.vendorEmail
      ) ||
      normalizeText(
        vendorDocument?.email
      ),

    vendorAddress:
      normalizeText(
        purchaseOrder.vendorAddress
      ) ||
      normalizeText(
        vendorDocument?.address
      ),
  };
};

const getNextGRNNo = async () => {
  for (
    let attempt = 0;
    attempt < 10;
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
          setDefaultsOnInsert: true,
        }
      );

    const grnNo = `GRN-${String(
      counter.seq
    ).padStart(4, "0")}`;

    const exists = await GRN.exists({
      grnNo,
    });

    if (!exists) {
      return grnNo;
    }
  }

  throw new Error(
    "Unable to generate unique GRN number"
  );
};

const peekNextGRNNo = async () => {
  const counter = await Counter.findOne({
    name: "grnNo",
  });

  const nextSequence = counter
    ? Number(counter.seq || 0) + 1
    : 1;

  return `GRN-${String(
    nextSequence
  ).padStart(4, "0")}`;
};

const getPOItemsMap = (
  purchaseOrderItems = []
) => {
  const map = new Map();

  purchaseOrderItems.forEach((row) => {
    const key = makeItemKey(row);

    map.set(key, {
      purchaseOrderItemId:
        row._id || null,

      item:
        getId(row.item) || null,

      description: normalizeText(
        row.description ||
          row.itemName ||
          row.item?.name
      ),

      size: normalizeText(row.size),

      orderedQty: normalizeNumber(
        row.quantity ?? row.qty
      ),

      unit: normalizeText(
        row.unit ||
          row.item?.unit,
        "Pcs"
      ),

      unitPrice: normalizeNumber(
        row.unitPrice
      ),
    });
  });

  return map;
};

const getReceivedQtyMap = async (
  purchaseOrderId,
  excludeGRNId = null
) => {
  const query = {
    purchaseOrder: purchaseOrderId,

    status: {
      $in: STOCK_POSTING_STATUSES,
    },

    stockPosted: true,
  };

  if (excludeGRNId) {
    query._id = {
      $ne: excludeGRNId,
    };
  }

  const postedGRNs = await GRN.find(
    query
  ).select(
    "items.purchaseOrderItemId items.item items.description items.size items.unit items.acceptedQty"
  );

  const map = new Map();

  postedGRNs.forEach((grn) => {
    (grn.items || []).forEach(
      (item) => {
        const key = makeItemKey(item);

        const previousQuantity =
          map.get(key) || 0;

        map.set(
          key,
          previousQuantity +
            normalizeNumber(
              item.acceptedQty
            )
        );
      }
    );
  });

  return map;
};

const cleanGRNItems = async ({
  items = [],
  purchaseOrder,
  excludeGRNId = null,
}) => {
  if (!Array.isArray(items)) {
    throw new Error(
      "GRN items array required hai"
    );
  }

  const poItemsMap = getPOItemsMap(
    purchaseOrder.items || []
  );

  const receivedQtyMap =
    await getReceivedQtyMap(
      purchaseOrder._id,
      excludeGRNId
    );

  const itemDocumentCache =
    new Map();

  const cleanItems = [];

  for (const incomingItem of items) {
    if (!incomingItem) continue;

    const receivedQty =
      normalizeNumber(
        incomingItem.receivedQty
      );

    const rejectedQty =
      normalizeNumber(
        incomingItem.rejectedQty
      );

    if (receivedQty <= 0) {
      continue;
    }

    if (
      rejectedQty < 0 ||
      receivedQty < 0
    ) {
      throw new Error(
        "Received aur rejected quantity negative nahi ho sakti"
      );
    }

    if (
      rejectedQty > receivedQty
    ) {
      throw new Error(
        `Rejected qty item "${normalizeText(
          incomingItem.description,
          "Unknown item"
        )}" mein received qty se zyada nahi ho sakti`
      );
    }

    const key =
      makeItemKey(incomingItem);

    const poItem =
      poItemsMap.get(key);

    if (!poItem) {
      throw new Error(
        `Item "${normalizeText(
          incomingItem.description,
          "Unknown item"
        )}" selected Purchase Order mein nahi mila`
      );
    }

    const purchaseOrderItemId =
      incomingItem.purchaseOrderItemId ||
      poItem.purchaseOrderItemId ||
      null;

    const itemId = getId(
      poItem.item ||
        incomingItem.item
    );

    if (
      !itemId ||
      !isValidObjectId(itemId)
    ) {
      throw new Error(
        `Item "${poItem.description}" ka Item Master link missing hai. Purchase Order mein Item Master dropdown se item select karein.`
      );
    }

    let itemDocument =
      itemDocumentCache.get(itemId);

    if (!itemDocument) {
      itemDocument =
        await Item.findById(itemId);

      itemDocumentCache.set(
        itemId,
        itemDocument || null
      );
    }

    if (!itemDocument) {
      throw new Error(
        `Item Master record not found: ${poItem.description}`
      );
    }

    if (
      itemDocument.status ===
      "Inactive"
    ) {
      throw new Error(
        `Item "${itemDocument.name}" inactive hai`
      );
    }

    if (
      itemDocument.stockManaged ===
        false ||
      itemDocument.itemType ===
        "Service"
    ) {
      throw new Error(
        `Service item "${itemDocument.name}" ka GRN stock receive nahi ho sakta`
      );
    }

    if (
      !RAW_MATERIAL_ITEM_TYPES.includes(
        itemDocument.itemType
      )
    ) {
      throw new Error(
        `Item "${itemDocument.name}" ${itemDocument.itemType} hai. GRN sirf Raw Material, Packing Material ya Consumable ke liye hai.`
      );
    }

    const acceptedQty = Math.max(
      receivedQty - rejectedQty,
      0
    );

    const alreadyAcceptedQty =
      normalizeNumber(
        receivedQtyMap.get(key)
      );

    const orderedQty =
      normalizeNumber(
        poItem.orderedQty
      );

    const pendingBeforeThisGRN =
      Math.max(
        orderedQty -
          alreadyAcceptedQty,
        0
      );

    if (
      acceptedQty >
      pendingBeforeThisGRN
    ) {
      throw new Error(
        `Item "${itemDocument.name}" ki accepted qty zyada hai. Pending qty sirf ${pendingBeforeThisGRN} ${poItem.unit} hai.`
      );
    }

    const pendingQty = Math.max(
      pendingBeforeThisGRN -
        acceptedQty,
      0
    );

    const unitPrice =
      normalizeNumber(
        incomingItem.unitPrice ??
          poItem.unitPrice
      );

    cleanItems.push({
      purchaseOrderItemId,

      item: itemDocument._id,

      description: normalizeText(
        incomingItem.description ||
          poItem.description,
        itemDocument.name
      ),

      size: normalizeText(
        incomingItem.size ||
          poItem.size
      ),

      orderedQty,

      previousReceivedQty:
        alreadyAcceptedQty,

      receivedQty,

      rejectedQty,

      acceptedQty,

      pendingQty,

      unit: normalizeText(
        incomingItem.unit ||
          poItem.unit ||
          itemDocument.unit,
        "Pcs"
      ),

      unitPrice,

      amount:
        acceptedQty * unitPrice,

      remarks: normalizeText(
        incomingItem.remarks
      ),
    });
  }

  return cleanItems;
};

const calculateTotals = (
  items = []
) => {
  return items.reduce(
    (totals, item) => {
      totals.totalOrderedQty +=
        normalizeNumber(
          item.orderedQty
        );

      totals.totalReceivedQty +=
        normalizeNumber(
          item.receivedQty
        );

      totals.totalRejectedQty +=
        normalizeNumber(
          item.rejectedQty
        );

      totals.totalAcceptedQty +=
        normalizeNumber(
          item.acceptedQty
        );

      totals.totalPendingQty +=
        normalizeNumber(
          item.pendingQty
        );

      totals.subtotal +=
        normalizeNumber(
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
};

const validatePostingState = ({
  status,
  inspectionStatus,
  totals,
}) => {
  if (!shouldPostStock(status)) {
    return;
  }

  if (
    inspectionStatus === "Pending"
  ) {
    throw new Error(
      "Stock post karne se pehle inspection Passed ya Partially Accepted honi chahiye"
    );
  }

  if (
    inspectionStatus === "Rejected"
  ) {
    throw new Error(
      "Rejected GRN ka stock post nahi ho sakta"
    );
  }

  if (
    normalizeNumber(
      totals.totalAcceptedQty
    ) <= 0
  ) {
    throw new Error(
      "Stock post karne ke liye accepted quantity required hai"
    );
  }
};

const getRawMaterialWarehouse =
  async () => {
    await ensureDefaultWarehouses();

    const warehouse =
      await Warehouse.findOne({
        name: RAW_MATERIAL_GODOWN,
      });

    if (!warehouse) {
      throw new Error(
        "Raw Material Godown not found"
      );
    }

    if (
      warehouse.status ===
      "Inactive"
    ) {
      throw new Error(
        "Raw Material Godown inactive hai"
      );
    }

    if (
      warehouse.status === "Full"
    ) {
      throw new Error(
        "Raw Material Godown full hai. GRN stock receive nahi ho sakta"
      );
    }

    return warehouse;
  };

const hasGRNStockEntries = async (
  grnId
) => {
  return StockLedger.exists({
    sourceModule: "GRN",
    referenceModel: "GRN",
    referenceId: grnId,
    movementType: "GRN In",
    isReversal: {
      $ne: true,
    },
  });
};

const removeFailedGRNStockEntries =
  async (grnId) => {
    await StockLedger.deleteMany({
      sourceModule: "GRN",
      referenceModel: "GRN",
      referenceId: grnId,
      movementType: "GRN In",
      isReversal: {
        $ne: true,
      },
    });
  };

const postGRNStock = async (grn) => {
  if (
    !shouldPostStock(grn.status)
  ) {
    return grn;
  }

  if (
    grn.status === "Cancelled"
  ) {
    return grn;
  }

  if (
    grn.inspectionStatus ===
    "Rejected"
  ) {
    return grn;
  }

  validatePostingState({
    status: grn.status,

    inspectionStatus:
      grn.inspectionStatus,

    totals: {
      totalAcceptedQty:
        grn.totalAcceptedQty,
    },
  });

  const warehouse =
    await getRawMaterialWarehouse();

  for (
    let index = 0;
    index <
    (grn.items || []).length;
    index += 1
  ) {
    const row = grn.items[index];

    const acceptedQty =
      normalizeNumber(
        row.acceptedQty
      );

    if (acceptedQty <= 0) {
      continue;
    }

    if (!row.item) {
      throw new Error(
        `Item "${row.description}" ka Item Master ID missing hai`
      );
    }

    await postStockMovement({
      item: row.item,

      warehouse: warehouse._id,

      date: grn.receivedDate,

      movementType: "GRN In",

      sourceModule: "GRN",

      referenceModel: "GRN",

      referenceId: grn._id,

      referenceLineId: String(
        row._id ||
          row.purchaseOrderItemId ||
          index
      ),

      referenceNo: grn.grnNo,

      qtyIn: acceptedQty,

      qtyOut: 0,

      rate: normalizeNumber(
        row.unitPrice
      ),

      remarks: `GRN ${grn.grnNo} against PO ${grn.purchaseOrderNo}`,

      allowNegativeStock: false,

      allowDuplicate: false,
    });
  }

  await GRN.findByIdAndUpdate(
    grn._id,
    {
      warehouseId: warehouse._id,

      warehouse: warehouse.name,

      stockPosted: true,

      stockPostedAt: new Date(),
    },
    {
      new: true,
      runValidators: true,
    }
  );

  return GRN.findById(grn._id);
};

const reverseGRNStock = async (
  grn
) => {
  const originalEntries =
    await StockLedger.find({
      sourceModule: "GRN",

      referenceModel: "GRN",

      referenceId: grn._id,

      movementType: "GRN In",

      isReversal: {
        $ne: true,
      },
    }).sort({
      createdAt: 1,
    });

  if (
    originalEntries.length === 0
  ) {
    await GRN.findByIdAndUpdate(
      grn._id,
      {
        stockPosted: false,
      }
    );

    return;
  }

  const requiredStockMap =
    new Map();

  originalEntries.forEach(
    (entry) => {
      const key =
        `${entry.item}|${entry.warehouse}`;

      const previous =
        requiredStockMap.get(key) || {
          item: entry.item,

          warehouse:
            entry.warehouse,

          quantity: 0,

          unit: entry.unit,
        };

      previous.quantity +=
        normalizeNumber(
          entry.qtyIn
        );

      requiredStockMap.set(
        key,
        previous
      );
    }
  );

  for (
    const requirement of
    requiredStockMap.values()
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
        `GRN cancel nahi ho sakta. ${requirement.warehouse} mein stock ${currentStock} ${requirement.unit} hai, jabke ${requirement.quantity} ${requirement.unit} reverse karna hai.`
      );
    }
  }

  for (
    const originalEntry of
    originalEntries
  ) {
    const reversalExists =
      await StockLedger.exists({
        movementType:
          "Reversal Out",

        reversalOf:
          originalEntry._id,
      });

    if (reversalExists) {
      continue;
    }

    await postStockMovement({
      item:
        originalEntry.item,

      warehouse:
        originalEntry.warehouseId ||
        originalEntry.warehouse,

      date: todayDate(),

      movementType:
        "Reversal Out",

      sourceModule:
        "GRN Cancellation",

      referenceModel: "GRN",

      referenceId: grn._id,

      referenceLineId:
        `REV-${originalEntry._id}`,

      referenceNo: grn.grnNo,

      qtyIn: 0,

      qtyOut: normalizeNumber(
        originalEntry.qtyIn
      ),

      rate: normalizeNumber(
        originalEntry.rate
      ),

      remarks:
        `Cancellation reversal of GRN ${grn.grnNo}`,

      allowNegativeStock: false,

      allowInactiveItem: true,

      allowDuplicate: false,

      isReversal: true,

      reversalOf:
        originalEntry._id,
    });
  }

  await GRN.findByIdAndUpdate(
    grn._id,
    {
      stockPosted: false,
    }
  );
};

const updatePurchaseOrderReceivingStatus =
  async (purchaseOrderId) => {
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

    const receivedQtyMap =
      await getReceivedQtyMap(
        purchaseOrderId
      );

    let totalOrdered = 0;
    let totalReceived = 0;

    const updatedItems = (
      purchaseOrder.items || []
    ).map((row) => {
      const key = makeItemKey(row);

      const orderedQty =
        normalizeNumber(
          row.quantity ?? row.qty
        );

      const receivedQty =
        normalizeNumber(
          receivedQtyMap.get(key)
        );

      const pendingQty =
        Math.max(
          orderedQty -
            receivedQty,
          0
        );

      totalOrdered += orderedQty;
      totalReceived += receivedQty;

      return {
        ...row.toObject(),

        receivedQty,

        pendingQty,
      };
    });

    let status = "Ordered";

    if (totalReceived <= 0) {
      status =
        purchaseOrder.status ===
        "Draft"
          ? "Draft"
          : "Ordered";
    } else if (
      totalOrdered > 0 &&
      totalReceived >= totalOrdered
    ) {
      status = "Received";
    } else {
      status =
        "Partially Received";
    }

    await PurchaseOrder.findByIdAndUpdate(
      purchaseOrderId,
      {
        items: updatedItems,
        status,
      },
      {
        new: true,
        runValidators: true,
      }
    );
  };

const populateGRN = (query) => {
  return query
    .populate(
      "purchaseOrder",
      "purchaseOrderNo orderDate expectedDate status grandTotal balance items"
    )

    .populate(
      "vendor",
      "vendorName name phoneNumber phone email address city ntn strn"
    )

    .populate(
      "warehouseId",
      "code name warehouseType status isSystem"
    )

    .populate(
      "items.item",
      "code name itemType unit category brand purchasePrice stockManaged status"
    );
};

const validatePurchaseOrderForGRN =
  (purchaseOrder) => {
    if (!purchaseOrder) {
      throw new Error(
        "Purchase Order not found"
      );
    }

    if (
      purchaseOrder.status ===
      "Cancelled"
    ) {
      throw new Error(
        "Cancelled Purchase Order ka GRN nahi ban sakta"
      );
    }

    if (
      purchaseOrder.status ===
      "Received"
    ) {
      throw new Error(
        "Ye Purchase Order already fully received hai"
      );
    }

    if (
      !GRN_ALLOWED_PO_STATUSES.includes(
        purchaseOrder.status
      )
    ) {
      throw new Error(
        `Purchase Order status "${purchaseOrder.status}" hai. GRN sirf Ordered ya Partially Received Purchase Order se banega.`
      );
    }
  };

/*
|--------------------------------------------------------------------------
| Next GRN Number
|--------------------------------------------------------------------------
*/

router.get(
  "/next-no",
  async (req, res) => {
    try {
      const grnNo =
        await peekNextGRNNo();

      return res.status(200).json({
        success: true,
        grnNo,
      });
    } catch (error) {
      console.error(
        "GRN Next No Error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "GRN number generate nahi hua",

        error: error.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Get All GRNs
|--------------------------------------------------------------------------
*/

router.get(
  "/all",
  async (req, res) => {
    try {
      const {
        search = "",
        status = "",
        inspectionStatus = "",
        purchaseOrder = "",
        vendor = "",
        purchaseStatus = "",
        dateFrom = "",
        dateTo = "",
      } = req.query;

      const query = {};

      if (
        status &&
        status !== "All"
      ) {
        query.status =
          normalizeStatus(status);
      }

      if (
        inspectionStatus &&
        inspectionStatus !== "All"
      ) {
        query.inspectionStatus =
          normalizeInspectionStatus(
            inspectionStatus
          );
      }

      if (
        purchaseStatus &&
        purchaseStatus !== "All"
      ) {
        query.purchaseStatus =
          purchaseStatus;
      }

      if (purchaseOrder) {
        if (
          !isValidObjectId(
            purchaseOrder
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Invalid Purchase Order ID",
            });
        }

        query.purchaseOrder =
          purchaseOrder;
      }

      if (vendor) {
        if (
          !isValidObjectId(vendor)
        ) {
          return res
            .status(400)
            .json({
              success: false,

              message:
                "Invalid Vendor ID",
            });
        }

        query.vendor = vendor;
      }

      if (dateFrom || dateTo) {
        query.receivedDate = {};

        if (dateFrom) {
          query.receivedDate.$gte =
            dateFrom;
        }

        if (dateTo) {
          query.receivedDate.$lte =
            dateTo;
        }
      }

      if (search) {
        query.$or = [
          {
            grnNo: {
              $regex: search,
              $options: "i",
            },
          },

          {
            purchaseOrderNo: {
              $regex: search,
              $options: "i",
            },
          },

          {
            vendorName: {
              $regex: search,
              $options: "i",
            },
          },

          {
            challanNo: {
              $regex: search,
              $options: "i",
            },
          },

          {
            invoiceNo: {
              $regex: search,
              $options: "i",
            },
          },

          {
            vehicleNo: {
              $regex: search,
              $options: "i",
            },
          },

          {
            "items.description": {
              $regex: search,
              $options: "i",
            },
          },
        ];
      }

      const grns =
        await populateGRN(
          GRN.find(query).sort({
            receivedDate: -1,
            createdAt: -1,
          })
        );

      return res
        .status(200)
        .json(grns);
    } catch (error) {
      console.error(
        "GRNs Load Error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "GRNs load nahi huay",

        error: error.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Get Single GRN
|--------------------------------------------------------------------------
*/

router.get(
  "/:id",
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
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

      return res
        .status(200)
        .json({
          success: true,
          data: grn,
        });
    } catch (error) {
      console.error(
        "GRN Single Load Error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "GRN load nahi hua",

        error: error.message,
      });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Add GRN
|--------------------------------------------------------------------------
*/

router.post(
  "/add",
  async (req, res) => {
    let savedGRN = null;

    try {
      const {
        grnNo,
        purchaseOrder,
        receivedDate,
        challanNo,
        invoiceNo,
        vehicleNo,
        receivedBy,
        checkedBy,
        inspectionStatus,
        status,
        remarks,
        items,
      } = req.body;

      if (
        !purchaseOrder ||
        !isValidObjectId(
          purchaseOrder
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Valid Purchase Order required hai",
          });
      }

      if (!receivedDate) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Received date required hai",
          });
      }

      const selectedPO =
        await PurchaseOrder.findById(
          purchaseOrder
        ).populate(
          "vendor",
          "vendorName name phoneNumber phone email address city ntn strn"
        );

      validatePurchaseOrderForGRN(
        selectedPO
      );

      const finalStatus =
        normalizeStatus(status);

      const finalInspectionStatus =
        normalizeInspectionStatus(
          inspectionStatus
        );

      if (
        finalStatus ===
        "Cancelled"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Naya GRN Cancelled status mein create nahi ho sakta",
          });
      }

      const cleanItems =
        await cleanGRNItems({
          items: items || [],

          purchaseOrder:
            selectedPO,
        });

      if (
        cleanItems.length === 0
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Kam az kam aik valid received item add karein",
          });
      }

      const totals =
        calculateTotals(
          cleanItems
        );

      validatePostingState({
        status: finalStatus,

        inspectionStatus:
          finalInspectionStatus,

        totals,
      });

      const warehouse =
        await getRawMaterialWarehouse();

      const vendorSnapshot =
        getVendorSnapshot(
          selectedPO
        );

      if (
        !vendorSnapshot.vendor ||
        !isValidObjectId(
          vendorSnapshot.vendor
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Purchase Order ka Vendor link missing hai",
          });
      }

      if (
        !vendorSnapshot.vendorName
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Purchase Order ka Vendor name missing hai",
          });
      }

      const finalGRNNo = grnNo
        ? normalizeText(
            grnNo
          ).toUpperCase()
        : await getNextGRNNo();

      savedGRN =
        await GRN.create({
          grnNo: finalGRNNo,

          purchaseOrder:
            selectedPO._id,

          purchaseOrderNo:
            normalizeText(
              selectedPO.purchaseOrderNo ||
                selectedPO.orderNo
            ).toUpperCase(),

          vendor:
            vendorSnapshot.vendor,

          vendorName:
            vendorSnapshot.vendorName,

          vendorPhone:
            vendorSnapshot.vendorPhone,

          vendorEmail:
            vendorSnapshot.vendorEmail,

          vendorAddress:
            vendorSnapshot.vendorAddress,

          receivedDate,

          challanNo:
            normalizeText(challanNo),

          invoiceNo:
            normalizeText(invoiceNo),

          vehicleNo:
            normalizeText(
              vehicleNo
            ).toUpperCase(),

          warehouseId:
            warehouse._id,

          warehouse:
            warehouse.name,

          receivedBy:
            normalizeText(receivedBy),

          checkedBy:
            normalizeText(checkedBy),

          inspectionStatus:
            finalInspectionStatus,

          status: finalStatus,

          items: cleanItems,

          ...totals,

          stockPosted: false,

          stockPostedAt: null,

          remarks:
            normalizeText(remarks),
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
        selectedPO._id
      );

      const populatedGRN =
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
            shouldPostStock(
              populatedGRN.status
            )
              ? "GRN created and Raw Material Godown stock posted successfully"
              : "Draft GRN created successfully",

          data: populatedGRN,
        });
    } catch (error) {
      console.error(
        "GRN Add Error:",
        error
      );

      if (savedGRN?._id) {
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
            "GRN Add Rollback Error:",
            rollbackError
          );
        }
      }

      if (
        error.code === 11000
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Ye GRN number already used hai",
          });
      }

      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message ||
            "GRN save nahi hua",
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Update GRN
|--------------------------------------------------------------------------
*/

router.put(
  "/update/:id",
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
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

      const existingGRN =
        await GRN.findById(
          req.params.id
        );

      if (!existingGRN) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "GRN not found",
          });
      }

      if (
        existingGRN.purchaseStatus ===
        "Purchased"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Purchased GRN update nahi ho sakta",
          });
      }

      if (
        existingGRN.status ===
        "Cancelled"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Cancelled GRN update nahi ho sakta",
          });
      }

      const existingStockEntry =
        await hasGRNStockEntries(
          existingGRN._id
        );

      if (
        existingGRN.stockPosted ||
        existingStockEntry ||
        shouldPostStock(
          existingGRN.status
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Posted/Received GRN edit nahi ho sakta. Correction ke liye pehle GRN cancel karein aur naya GRN banayein.",
          });
      }

      const purchaseOrderId =
        req.body.purchaseOrder ||
        existingGRN.purchaseOrder;

      if (
        !isValidObjectId(
          purchaseOrderId
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Valid Purchase Order required hai",
          });
      }

      const selectedPO =
        await PurchaseOrder.findById(
          purchaseOrderId
        ).populate(
          "vendor",
          "vendorName name phoneNumber phone email address city ntn strn"
        );

      validatePurchaseOrderForGRN(
        selectedPO
      );

      const finalStatus =
        normalizeStatus(
          req.body.status ||
            existingGRN.status
        );

      const finalInspectionStatus =
        normalizeInspectionStatus(
          req.body
            .inspectionStatus ||
            existingGRN
              .inspectionStatus
        );

      if (
        finalStatus ===
        "Cancelled"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "GRN cancel karne ke liye status endpoint use karein",
          });
      }

      const cleanItems =
        await cleanGRNItems({
          items:
            req.body.items ||
            existingGRN.items,

          purchaseOrder:
            selectedPO,

          excludeGRNId:
            existingGRN._id,
        });

      if (
        cleanItems.length === 0
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Kam az kam aik valid received item add karein",
          });
      }

      const totals =
        calculateTotals(
          cleanItems
        );

      validatePostingState({
        status: finalStatus,

        inspectionStatus:
          finalInspectionStatus,

        totals,
      });

      const warehouse =
        await getRawMaterialWarehouse();

      const vendorSnapshot =
        getVendorSnapshot(
          selectedPO
        );

      if (
        !vendorSnapshot.vendor ||
        !isValidObjectId(
          vendorSnapshot.vendor
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Purchase Order ka Vendor link missing hai",
          });
      }

      const originalPurchaseOrderId =
        existingGRN.purchaseOrder;

      const updatedGRN =
        await GRN.findByIdAndUpdate(
          existingGRN._id,
          {
            grnNo:
              req.body.grnNo
                ? normalizeText(
                    req.body
                      .grnNo
                  ).toUpperCase()
                : existingGRN.grnNo,

            purchaseOrder:
              selectedPO._id,

            purchaseOrderNo:
              normalizeText(
                selectedPO.purchaseOrderNo ||
                  selectedPO.orderNo
              ).toUpperCase(),

            vendor:
              vendorSnapshot.vendor,

            vendorName:
              vendorSnapshot.vendorName,

            vendorPhone:
              vendorSnapshot.vendorPhone,

            vendorEmail:
              vendorSnapshot.vendorEmail,

            vendorAddress:
              vendorSnapshot.vendorAddress,

            receivedDate:
              req.body
                .receivedDate ||
              existingGRN.receivedDate,

            challanNo:
              normalizeText(
                req.body.challanNo
              ),

            invoiceNo:
              normalizeText(
                req.body.invoiceNo
              ),

            vehicleNo:
              normalizeText(
                req.body.vehicleNo
              ).toUpperCase(),

            warehouseId:
              warehouse._id,

            warehouse:
              warehouse.name,

            receivedBy:
              normalizeText(
                req.body.receivedBy
              ),

            checkedBy:
              normalizeText(
                req.body.checkedBy
              ),

            inspectionStatus:
              finalInspectionStatus,

            status: finalStatus,

            items: cleanItems,

            ...totals,

            remarks:
              normalizeText(
                req.body.remarks
              ),
          },
          {
            new: true,
            runValidators: true,
          }
        );

      try {
        if (
          shouldPostStock(
            updatedGRN.status
          )
        ) {
          await postGRNStock(
            updatedGRN
          );
        }
      } catch (postingError) {
        await removeFailedGRNStockEntries(
          updatedGRN._id
        );

        await GRN.findByIdAndUpdate(
          updatedGRN._id,
          {
            status: "Draft",
            stockPosted: false,
            stockPostedAt: null,
          },
          {
            new: true,
            runValidators: true,
          }
        );

        throw postingError;
      }

      await updatePurchaseOrderReceivingStatus(
        selectedPO._id
      );

      if (
        String(
          originalPurchaseOrderId
        ) !==
        String(selectedPO._id)
      ) {
        await updatePurchaseOrderReceivingStatus(
          originalPurchaseOrderId
        );
      }

      const populatedGRN =
        await populateGRN(
          GRN.findById(
            updatedGRN._id
          )
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            shouldPostStock(
              populatedGRN.status
            )
              ? "GRN updated and stock posted successfully"
              : "Draft GRN updated successfully",

          data: populatedGRN,
        });
    } catch (error) {
      console.error(
        "GRN Update Error:",
        error
      );

      if (
        error.code === 11000
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Ye GRN number already used hai",
          });
      }

      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message ||
            "GRN update nahi hua",
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Change GRN Status
|--------------------------------------------------------------------------
*/

router.patch(
  "/status/:id",
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
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

      const requestedStatus =
        normalizeStatus(
          req.body.status
        );

      const existingGRN =
        await GRN.findById(
          req.params.id
        );

      if (!existingGRN) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "GRN not found",
          });
      }

      if (
        existingGRN.purchaseStatus ===
        "Purchased"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Purchased GRN ka status change nahi ho sakta",
          });
      }

      if (
        existingGRN.status ===
        "Cancelled"
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Cancelled GRN dobara activate nahi ho sakta",
          });
      }

      if (
        requestedStatus ===
        existingGRN.status
      ) {
        const sameGRN =
          await populateGRN(
            GRN.findById(
              existingGRN._id
            )
          );

        return res
          .status(200)
          .json({
            success: true,

            message:
              "GRN status already updated hai",

            data: sameGRN,
          });
      }

      const oldStatus =
        existingGRN.status;

      if (
        requestedStatus ===
          "Draft" &&
        shouldPostStock(
          oldStatus
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Posted GRN dobara Draft nahi ban sakta",
          });
      }

      if (
        requestedStatus ===
        "Cancelled"
      ) {
        if (
          existingGRN.stockPosted ||
          shouldPostStock(
            oldStatus
          )
        ) {
          await reverseGRNStock(
            existingGRN
          );
        }

        await GRN.findByIdAndUpdate(
          existingGRN._id,
          {
            status: "Cancelled",

            stockPosted: false,

            cancelledAt:
              new Date(),
          },
          {
            new: true,
            runValidators: true,
          }
        );
      } else if (
        shouldPostStock(
          requestedStatus
        )
      ) {
        validatePostingState({
          status:
            requestedStatus,

          inspectionStatus:
            existingGRN
              .inspectionStatus,

          totals: {
            totalAcceptedQty:
              existingGRN
                .totalAcceptedQty,
          },
        });

        if (
          !existingGRN.stockPosted
        ) {
          existingGRN.status =
            requestedStatus;

          await existingGRN.save();

          try {
            await postGRNStock(
              existingGRN
            );
          } catch (postingError) {
            await removeFailedGRNStockEntries(
              existingGRN._id
            );

            await GRN.findByIdAndUpdate(
              existingGRN._id,
              {
                status: oldStatus,

                stockPosted: false,

                stockPostedAt:
                  null,
              }
            );

            throw postingError;
          }
        } else {
          await GRN.findByIdAndUpdate(
            existingGRN._id,
            {
              status:
                requestedStatus,
            },
            {
              new: true,
              runValidators: true,
            }
          );
        }
      } else {
        await GRN.findByIdAndUpdate(
          existingGRN._id,
          {
            status:
              requestedStatus,
          },
          {
            new: true,
            runValidators: true,
          }
        );
      }

      await updatePurchaseOrderReceivingStatus(
        existingGRN.purchaseOrder
      );

      const updatedGRN =
        await populateGRN(
          GRN.findById(
            existingGRN._id
          )
        );

      return res
        .status(200)
        .json({
          success: true,

          message:
            requestedStatus ===
            "Cancelled"
              ? "GRN cancelled and stock reversed successfully"
              : shouldPostStock(
                  requestedStatus
                )
              ? "GRN status updated and stock posted successfully"
              : "GRN status updated successfully",

          data: updatedGRN,
        });
    } catch (error) {
      console.error(
        "GRN Status Error:",
        error
      );

      return res
        .status(400)
        .json({
          success: false,

          message:
            error.message ||
            "Status update nahi hua",
        });
    }
  }
);

/*
|--------------------------------------------------------------------------
| Delete GRN
|--------------------------------------------------------------------------
*/

router.delete(
  "/delete/:id",
  async (req, res) => {
    try {
      if (
        !isValidObjectId(
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
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Purchased GRN delete nahi ho sakta",
          });
      }

      const stockEntryExists =
        await hasGRNStockEntries(
          grn._id
        );

      if (
        grn.stockPosted ||
        stockEntryExists ||
        shouldPostStock(
          grn.status
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Posted/Received GRN delete nahi ho sakta. Stock history محفوظ رکھنے کے لیے GRN cancel karein.",
          });
      }

      const purchaseOrderId =
        grn.purchaseOrder;

      await GRN.findByIdAndDelete(
        grn._id
      );

      await updatePurchaseOrderReceivingStatus(
        purchaseOrderId
      );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Draft GRN deleted successfully",
        });
    } catch (error) {
      console.error(
        "GRN Delete Error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            error.message ||
            "GRN delete nahi hua",
        });
    }
  }
);

module.exports = router;