const express = require("express");
const router = express.Router();

const GRN = require("../models/GRN");
const PurchaseOrder = require("../models/PurchaseOrder");
const Counter = require("../models/Counter");
const StockLedger = require("../models/StockLedger");
const { postStockMovement } = require("../utils/stockService");

const allowedStatuses = [
  "Draft",
  "Received",
  "Partially Received",
  "Completed",
  "Posted",
  "Cancelled",
];

const stockPostingStatuses = [
  "Received",
  "Partially Received",
  "Completed",
  "Posted",
];

const allowedInspectionStatuses = [
  "Pending",
  "Passed",
  "Partially Accepted",
  "Rejected",
];

const normalizeStatus = (status) => {
  return allowedStatuses.includes(status) ? status : "Received";
};

const normalizeInspectionStatus = (status) => {
  if (status === "Partial") return "Partially Accepted";
  if (status === "Failed") return "Rejected";
  return allowedInspectionStatuses.includes(status) ? status : "Pending";
};

const shouldPostStock = (status) => {
  return stockPostingStatuses.includes(status);
};

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const makeItemKey = (item) => {
  const purchaseOrderItemId = getId(item.purchaseOrderItemId || item._id);

  if (purchaseOrderItemId) {
    return `po-row:${purchaseOrderItemId}`;
  }

  const itemId = getId(item.item);

  if (itemId) {
    return [
      `item:${itemId}`,
      String(item.size || "").trim().toLowerCase(),
      String(item.unit || "").trim().toLowerCase(),
    ].join("|");
  }

  return [
    String(item.description || "").trim().toLowerCase(),
    String(item.size || "").trim().toLowerCase(),
    String(item.unit || "").trim().toLowerCase(),
  ].join("|");
};

const getNextGRNNo = async () => {
  let grnNo = "";

  for (let i = 0; i < 5; i++) {
    const counter = await Counter.findOneAndUpdate(
      { name: "grnNo" },
      { $inc: { seq: 1 } },
      {
        returnDocument: "after",
        upsert: true,
      }
    );

    grnNo = `GRN-${String(counter.seq).padStart(4, "0")}`;

    const exists = await GRN.findOne({ grnNo });
    if (!exists) return grnNo;
  }

  throw new Error("Unable to generate unique GRN number");
};

const peekNextGRNNo = async () => {
  const counter = await Counter.findOne({ name: "grnNo" });
  const nextSeq = counter ? counter.seq + 1 : 1;

  return `GRN-${String(nextSeq).padStart(4, "0")}`;
};

const getPOItemsMap = (purchaseOrderItems = []) => {
  const map = new Map();

  purchaseOrderItems.forEach((item) => {
    const key = makeItemKey(item);

    map.set(key, {
      purchaseOrderItemId: item._id || null,
      item: item.item || null,
      description: item.description || "",
      size: item.size || "",
      orderedQty: Number(item.quantity || 0),
      unit: item.unit || "Pcs",
      unitPrice: Number(item.unitPrice || 0),
    });
  });

  return map;
};

const getReceivedQtyMap = async (purchaseOrderId, excludeGRNId = null) => {
  const query = {
    purchaseOrder: purchaseOrderId,
    status: { $in: stockPostingStatuses },
  };

  if (excludeGRNId) {
    query._id = { $ne: excludeGRNId };
  }

  const grns = await GRN.find(query);

  const map = new Map();

  grns.forEach((grn) => {
    grn.items.forEach((item) => {
      const key = makeItemKey(item);
      const previous = map.get(key) || 0;

      map.set(key, previous + Number(item.acceptedQty || 0));
    });
  });

  return map;
};

const cleanGRNItems = async ({
  items = [],
  purchaseOrder,
  excludeGRNId = null,
}) => {
  const poItemsMap = getPOItemsMap(purchaseOrder.items || []);
  const receivedQtyMap = await getReceivedQtyMap(
    purchaseOrder._id,
    excludeGRNId
  );

  const cleanItems = [];

  for (const item of items) {
    if (!item || !String(item.description || "").trim()) continue;

    const receivedQty = Number(item.receivedQty || 0);
    const rejectedQty = Number(item.rejectedQty || 0);

    if (receivedQty <= 0) continue;

    if (rejectedQty > receivedQty) {
      throw new Error(
        `Rejected qty item "${item.description}" mein received qty se zyada nahi ho sakti`
      );
    }

    const acceptedQty = Math.max(receivedQty - rejectedQty, 0);
    const key = makeItemKey(item);

    const poItem = poItemsMap.get(key);

    if (!poItem) {
      throw new Error(`Item "${item.description}" purchase order mein nahi mila`);
    }

    const alreadyReceivedQty = receivedQtyMap.get(key) || 0;
    const pendingBeforeThisGRN =
      Number(poItem.orderedQty || 0) - Number(alreadyReceivedQty || 0);

    if (acceptedQty > pendingBeforeThisGRN) {
      throw new Error(
        `Item "${item.description}" ki accepted qty zyada hai. Pending qty sirf ${pendingBeforeThisGRN} ${poItem.unit} hai`
      );
    }

    const finalPendingQty = Math.max(pendingBeforeThisGRN - acceptedQty, 0);
    const unitPrice = Number(item.unitPrice ?? poItem.unitPrice ?? 0);
    const amount = acceptedQty * unitPrice;

    cleanItems.push({
      purchaseOrderItemId:
        item.purchaseOrderItemId || poItem.purchaseOrderItemId || null,

      item: item.item || poItem.item || null,

      description: String(item.description || poItem.description || "").trim(),
      size: String(item.size || poItem.size || "").trim(),

      orderedQty: Number(poItem.orderedQty || 0),
      previousReceivedQty: Number(alreadyReceivedQty || 0),

      receivedQty,
      rejectedQty,
      acceptedQty,
      pendingQty: finalPendingQty,

      unit: String(item.unit || poItem.unit || "Pcs").trim(),
      unitPrice,
      amount,

      remarks: String(item.remarks || "").trim(),
    });
  }

  return cleanItems;
};

const calculateTotals = (items = []) => {
  const totalOrderedQty = items.reduce(
    (sum, item) => sum + Number(item.orderedQty || 0),
    0
  );

  const totalReceivedQty = items.reduce(
    (sum, item) => sum + Number(item.receivedQty || 0),
    0
  );

  const totalRejectedQty = items.reduce(
    (sum, item) => sum + Number(item.rejectedQty || 0),
    0
  );

  const totalAcceptedQty = items.reduce(
    (sum, item) => sum + Number(item.acceptedQty || 0),
    0
  );

  const totalPendingQty = items.reduce(
    (sum, item) => sum + Number(item.pendingQty || 0),
    0
  );

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  return {
    totalOrderedQty,
    totalReceivedQty,
    totalRejectedQty,
    totalAcceptedQty,
    totalPendingQty,
    subtotal,
  };
};

const ensureItemsCanPostStock = (items = [], status) => {
  if (!shouldPostStock(status)) return;

  for (const item of items) {
    if (Number(item.acceptedQty || 0) > 0 && !item.item) {
      throw new Error(
        `Item "${item.description}" ka Item Master ID missing hai. Pehle Purchase Order ko Item Master dropdown se create karein.`
      );
    }
  }
};

const removeGRNStockLedger = async (grnId) => {
  await StockLedger.deleteMany({
    sourceModule: "GRN",
    referenceModel: "GRN",
    referenceId: grnId,
  });
};

const syncGRNStockLedger = async (grn) => {
  await removeGRNStockLedger(grn._id);

  if (!shouldPostStock(grn.status)) return;
  if (grn.status === "Cancelled") return;
  if (grn.inspectionStatus === "Rejected") return;

  for (const item of grn.items || []) {
    const acceptedQty = Number(item.acceptedQty || 0);

    if (acceptedQty <= 0) continue;

    if (!item.item) {
      throw new Error(
        `Item "${item.description}" ka Item Master ID missing hai. Stock ledger post nahi ho sakta.`
      );
    }

    await postStockMovement({
      item: item.item,
      warehouse: grn.warehouse || "Main Godown",
      date: grn.receivedDate,
      movementType: "GRN In",
      sourceModule: "GRN",
      referenceModel: "GRN",
      referenceId: grn._id,
      referenceNo: grn.grnNo,
      qtyIn: acceptedQty,
      rate: Number(item.unitPrice || 0),
      remarks: `GRN ${grn.grnNo} against PO ${grn.purchaseOrderNo}`,
    });
  }
};

const updatePurchaseOrderReceivingStatus = async (purchaseOrderId) => {
  const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId);

  if (!purchaseOrder || purchaseOrder.status === "Cancelled") return;

  const receivedQtyMap = await getReceivedQtyMap(purchaseOrderId);

  let totalOrdered = 0;
  let totalReceived = 0;

  const updatedItems = purchaseOrder.items.map((item) => {
    const key = makeItemKey(item);

    const orderedQty = Number(item.quantity || 0);
    const receivedQty = Number(receivedQtyMap.get(key) || 0);
    const pendingQty = Math.max(orderedQty - receivedQty, 0);

    totalOrdered += orderedQty;
    totalReceived += receivedQty;

    return {
      ...item.toObject(),
      receivedQty,
      pendingQty,
    };
  });

  let status = "Ordered";

  if (totalReceived <= 0) {
    status = purchaseOrder.status === "Draft" ? "Draft" : "Ordered";
  } else if (totalReceived >= totalOrdered) {
    status = "Received";
  } else {
    status = "Partially Received";
  }

  await PurchaseOrder.findByIdAndUpdate(
    purchaseOrderId,
    {
      items: updatedItems,
      status,
    },
    {
      returnDocument: "after",
      runValidators: true,
    }
  );
};

router.get("/next-no", async (req, res) => {
  try {
    const grnNo = await peekNextGRNNo();

    res.status(200).json({
      success: true,
      grnNo,
    });
  } catch (error) {
    console.error("GRN Next No Error:", error);

    res.status(500).json({
      success: false,
      message: "GRN number generate nahi hua",
      error: error.message,
    });
  }
});

router.get("/all", async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      purchaseOrder = "",
      vendor = "",
      purchaseStatus = "",
    } = req.query;

    const query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (purchaseStatus && purchaseStatus !== "All") {
      query.purchaseStatus = purchaseStatus;
    }

    if (purchaseOrder) {
      query.purchaseOrder = purchaseOrder;
    }

    if (vendor) {
      query.vendor = vendor;
    }

    if (search) {
      query.$or = [
        { grnNo: { $regex: search, $options: "i" } },
        { purchaseOrderNo: { $regex: search, $options: "i" } },
        { vendorName: { $regex: search, $options: "i" } },
        { challanNo: { $regex: search, $options: "i" } },
        { invoiceNo: { $regex: search, $options: "i" } },
        { vehicleNo: { $regex: search, $options: "i" } },
        { "items.description": { $regex: search, $options: "i" } },
      ];
    }

    const grns = await GRN.find(query)
      .populate(
        "purchaseOrder",
        "purchaseOrderNo orderDate expectedDate status grandTotal balance items"
      )
      .populate("vendor", "vendorName phoneNumber email address city ntn strn")
      .populate("items.item", "code name unit category brand purchasePrice")
      .sort({ createdAt: -1 });

    res.status(200).json(grns);
  } catch (error) {
    console.error("GRNs Load Error:", error);

    res.status(500).json({
      success: false,
      message: "GRNs load nahi huay",
      error: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const grn = await GRN.findById(req.params.id)
      .populate(
        "purchaseOrder",
        "purchaseOrderNo orderDate expectedDate status grandTotal balance items"
      )
      .populate("vendor", "vendorName phoneNumber email address city ntn strn")
      .populate("items.item", "code name unit category brand purchasePrice");

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: "GRN not found",
      });
    }

    res.status(200).json({
      success: true,
      data: grn,
    });
  } catch (error) {
    console.error("GRN Single Load Error:", error);

    res.status(500).json({
      success: false,
      message: "GRN load nahi hua",
      error: error.message,
    });
  }
});

router.post("/add", async (req, res) => {
  try {
    const {
      grnNo,
      purchaseOrder,
      receivedDate,
      challanNo,
      invoiceNo,
      vehicleNo,
      warehouse,
      receivedBy,
      checkedBy,
      inspectionStatus,
      status,
      remarks,
      items,
    } = req.body;

    if (!purchaseOrder) {
      return res.status(400).json({
        success: false,
        message: "Purchase Order required hai",
      });
    }

    if (!receivedDate) {
      return res.status(400).json({
        success: false,
        message: "Received date required hai",
      });
    }

    const selectedPO = await PurchaseOrder.findById(purchaseOrder);

    if (!selectedPO) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    if (selectedPO.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled purchase order ka GRN nahi ban sakta",
      });
    }

    if (selectedPO.status === "Received") {
      return res.status(400).json({
        success: false,
        message: "Ye purchase order already fully received hai",
      });
    }

    const finalStatus = normalizeStatus(status);
    const finalInspectionStatus = normalizeInspectionStatus(inspectionStatus);

    const cleanItems = await cleanGRNItems({
      items: items || [],
      purchaseOrder: selectedPO,
    });

    if (cleanItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please at least one valid received item add karein",
      });
    }

    ensureItemsCanPostStock(cleanItems, finalStatus);

    const totals = calculateTotals(cleanItems);

    const finalGRNNo = grnNo
      ? String(grnNo).trim().toUpperCase()
      : await getNextGRNNo();

    const grn = new GRN({
      grnNo: finalGRNNo,

      purchaseOrder: selectedPO._id,
      purchaseOrderNo: selectedPO.purchaseOrderNo,

      vendor: selectedPO.vendor,
      vendorName: selectedPO.vendorName,
      vendorPhone: selectedPO.vendorPhone || "",
      vendorEmail: selectedPO.vendorEmail || "",
      vendorAddress: selectedPO.vendorAddress || "",

      receivedDate,

      challanNo: challanNo || "",
      invoiceNo: invoiceNo || "",
      vehicleNo: vehicleNo || "",
      warehouse: warehouse || "Main Godown",
      receivedBy: receivedBy || "",
      checkedBy: checkedBy || "",

      inspectionStatus: finalInspectionStatus,
      status: finalStatus,

      items: cleanItems,

      totalOrderedQty: totals.totalOrderedQty,
      totalReceivedQty: totals.totalReceivedQty,
      totalRejectedQty: totals.totalRejectedQty,
      totalAcceptedQty: totals.totalAcceptedQty,
      totalPendingQty: totals.totalPendingQty,
      subtotal: totals.subtotal,

      remarks: remarks || "",
    });

    const savedGRN = await grn.save();

    await syncGRNStockLedger(savedGRN);
    await updatePurchaseOrderReceivingStatus(selectedPO._id);

    const populatedGRN = await GRN.findById(savedGRN._id)
      .populate(
        "purchaseOrder",
        "purchaseOrderNo orderDate expectedDate status grandTotal balance items"
      )
      .populate("vendor", "vendorName phoneNumber email address city ntn strn")
      .populate("items.item", "code name unit category brand purchasePrice");

    res.status(201).json({
      success: true,
      message: "GRN created successfully",
      data: populatedGRN,
    });
  } catch (error) {
    console.error("GRN Add Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ye GRN number already used hai",
      });
    }

    res.status(400).json({
      success: false,
      message: "GRN save nahi hua",
      error: error.message,
    });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    const existingGRN = await GRN.findById(req.params.id);

    if (!existingGRN) {
      return res.status(404).json({
        success: false,
        message: "GRN not found",
      });
    }

    if (existingGRN.purchaseStatus === "Purchased") {
      return res.status(400).json({
        success: false,
        message: "Purchased GRN update nahi ho sakta",
      });
    }

    const selectedPO = await PurchaseOrder.findById(
      req.body.purchaseOrder || existingGRN.purchaseOrder
    );

    if (!selectedPO) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    if (selectedPO.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled purchase order ka GRN update nahi ho sakta",
      });
    }

    const finalStatus = normalizeStatus(req.body.status || existingGRN.status);
    const finalInspectionStatus = normalizeInspectionStatus(
      req.body.inspectionStatus || existingGRN.inspectionStatus
    );

    const cleanItems = await cleanGRNItems({
      items: req.body.items || existingGRN.items,
      purchaseOrder: selectedPO,
      excludeGRNId: existingGRN._id,
    });

    if (cleanItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please at least one valid received item add karein",
      });
    }

    ensureItemsCanPostStock(cleanItems, finalStatus);

    const totals = calculateTotals(cleanItems);

    const updatedGRN = await GRN.findByIdAndUpdate(
      req.params.id,
      {
        grnNo: req.body.grnNo
          ? String(req.body.grnNo).trim().toUpperCase()
          : existingGRN.grnNo,

        purchaseOrder: selectedPO._id,
        purchaseOrderNo: selectedPO.purchaseOrderNo,

        vendor: selectedPO.vendor,
        vendorName: selectedPO.vendorName,
        vendorPhone: selectedPO.vendorPhone || "",
        vendorEmail: selectedPO.vendorEmail || "",
        vendorAddress: selectedPO.vendorAddress || "",

        receivedDate: req.body.receivedDate || existingGRN.receivedDate,

        challanNo: req.body.challanNo || "",
        invoiceNo: req.body.invoiceNo || "",
        vehicleNo: req.body.vehicleNo || "",
        warehouse: req.body.warehouse || "Main Godown",
        receivedBy: req.body.receivedBy || "",
        checkedBy: req.body.checkedBy || "",

        inspectionStatus: finalInspectionStatus,
        status: finalStatus,

        items: cleanItems,

        totalOrderedQty: totals.totalOrderedQty,
        totalReceivedQty: totals.totalReceivedQty,
        totalRejectedQty: totals.totalRejectedQty,
        totalAcceptedQty: totals.totalAcceptedQty,
        totalPendingQty: totals.totalPendingQty,
        subtotal: totals.subtotal,

        remarks: req.body.remarks || "",
      },
      {
        returnDocument: "after",
        runValidators: true,
      }
    )
      .populate(
        "purchaseOrder",
        "purchaseOrderNo orderDate expectedDate status grandTotal balance items"
      )
      .populate("vendor", "vendorName phoneNumber email address city ntn strn")
      .populate("items.item", "code name unit category brand purchasePrice");

    await syncGRNStockLedger(updatedGRN);
    await updatePurchaseOrderReceivingStatus(selectedPO._id);

    res.status(200).json({
      success: true,
      message: "GRN updated successfully",
      data: updatedGRN,
    });
  } catch (error) {
    console.error("GRN Update Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ye GRN number already used hai",
      });
    }

    res.status(400).json({
      success: false,
      message: "GRN update nahi hua",
      error: error.message,
    });
  }
});

router.patch("/status/:id", async (req, res) => {
  try {
    const { status } = req.body;

    const finalStatus = normalizeStatus(status);

    const existingGRN = await GRN.findById(req.params.id);

    if (!existingGRN) {
      return res.status(404).json({
        success: false,
        message: "GRN not found",
      });
    }

    ensureItemsCanPostStock(existingGRN.items || [], finalStatus);

    const grn = await GRN.findByIdAndUpdate(
      req.params.id,
      { status: finalStatus },
      {
        returnDocument: "after",
        runValidators: true,
      }
    )
      .populate(
        "purchaseOrder",
        "purchaseOrderNo orderDate expectedDate status grandTotal balance items"
      )
      .populate("vendor", "vendorName phoneNumber email address city ntn strn")
      .populate("items.item", "code name unit category brand purchasePrice");

    await syncGRNStockLedger(grn);
    await updatePurchaseOrderReceivingStatus(grn.purchaseOrder._id || grn.purchaseOrder);

    res.status(200).json({
      success: true,
      message: "GRN status updated successfully",
      data: grn,
    });
  } catch (error) {
    console.error("GRN Status Error:", error);

    res.status(400).json({
      success: false,
      message: "Status update nahi hua",
      error: error.message,
    });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    const grn = await GRN.findById(req.params.id);

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: "GRN not found",
      });
    }

    if (grn.purchaseStatus === "Purchased") {
      return res.status(400).json({
        success: false,
        message: "Purchased GRN delete nahi ho sakta",
      });
    }

    const purchaseOrderId = grn.purchaseOrder;

    await removeGRNStockLedger(grn._id);
    await GRN.findByIdAndDelete(req.params.id);
    await updatePurchaseOrderReceivingStatus(purchaseOrderId);

    res.status(200).json({
      success: true,
      message: "GRN deleted successfully",
    });
  } catch (error) {
    console.error("GRN Delete Error:", error);

    res.status(500).json({
      success: false,
      message: "GRN delete nahi hua",
      error: error.message,
    });
  }
});

module.exports = router;