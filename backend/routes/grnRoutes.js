const express = require("express");
const router = express.Router();

const GRN = require("../models/GRN");
const PurchaseOrder = require("../models/PurchaseOrder");
const Counter = require("../models/Counter");

const allowedStatuses = ["Draft", "Received", "Posted", "Cancelled"];
const allowedInspectionStatuses = ["Pending", "Passed", "Failed", "Partial"];

const getNextGRNNo = async () => {
  let grnNo = "";

  for (let i = 0; i < 5; i++) {
    const counter = await Counter.findOneAndUpdate(
      { name: "grnNo" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
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

const makeItemKey = (item) => {
  return [
    String(item.description || "").trim().toLowerCase(),
    String(item.size || "").trim().toLowerCase(),
    String(item.unit || "").trim().toLowerCase(),
  ].join("|");
};

const getPOItemsMap = (purchaseOrderItems = []) => {
  const map = new Map();

  purchaseOrderItems.forEach((item) => {
    const key = makeItemKey(item);
    const previous = map.get(key) || {
      item: item.item || null,
      description: item.description || "",
      size: item.size || "",
      orderedQty: 0,
      unit: item.unit || "Pcs",
      unitPrice: item.unitPrice || 0,
    };

    previous.orderedQty += Number(item.quantity || 0);
    map.set(key, previous);
  });

  return map;
};

const getReceivedQtyMap = async (purchaseOrderId, excludeGRNId = null) => {
  const query = {
    purchaseOrder: purchaseOrderId,
    status: { $ne: "Cancelled" },
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
      item: item.item || poItem.item || null,
      description: String(item.description || poItem.description || "").trim(),
      size: String(item.size || poItem.size || "").trim(),
      orderedQty: Number(poItem.orderedQty || 0),
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
    { runValidators: true }
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
        "purchaseOrderNo orderDate expectedDate status grandTotal balance"
      )
      .populate("vendor", "vendorName phoneNumber email address city ntn strn")
      .sort({ createdAt: -1 });

    res.status(200).json(grns);
  } catch (error) {
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
      .populate("vendor", "vendorName phoneNumber email address city ntn strn");

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

    const sourceItems = items && items.length > 0 ? items : selectedPO.items;

    const cleanItems = await cleanGRNItems({
      items: sourceItems,
      purchaseOrder: selectedPO,
    });

    if (cleanItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please at least one valid received item add karein",
      });
    }

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
      warehouse: warehouse || "Main Warehouse",
      receivedBy: receivedBy || "",
      checkedBy: checkedBy || "",

      inspectionStatus: allowedInspectionStatuses.includes(inspectionStatus)
        ? inspectionStatus
        : "Pending",

      status: allowedStatuses.includes(status) ? status : "Received",

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

    if (savedGRN.status !== "Cancelled") {
      await updatePurchaseOrderReceivingStatus(selectedPO._id);
    }

    const populatedGRN = await GRN.findById(savedGRN._id)
      .populate(
        "purchaseOrder",
        "purchaseOrderNo orderDate expectedDate status grandTotal balance"
      )
      .populate("vendor", "vendorName phoneNumber email address city ntn strn");

    res.status(201).json({
      success: true,
      message: "GRN created successfully",
      data: populatedGRN,
    });
  } catch (error) {
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
        warehouse: req.body.warehouse || "Main Warehouse",
        receivedBy: req.body.receivedBy || "",
        checkedBy: req.body.checkedBy || "",

        inspectionStatus: allowedInspectionStatuses.includes(
          req.body.inspectionStatus
        )
          ? req.body.inspectionStatus
          : existingGRN.inspectionStatus,

        status: allowedStatuses.includes(req.body.status)
          ? req.body.status
          : existingGRN.status,

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
        new: true,
        runValidators: true,
      }
    )
      .populate(
        "purchaseOrder",
        "purchaseOrderNo orderDate expectedDate status grandTotal balance"
      )
      .populate("vendor", "vendorName phoneNumber email address city ntn strn");

    await updatePurchaseOrderReceivingStatus(selectedPO._id);

    res.status(200).json({
      success: true,
      message: "GRN updated successfully",
      data: updatedGRN,
    });
  } catch (error) {
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

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const grn = await GRN.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    )
      .populate(
        "purchaseOrder",
        "purchaseOrderNo orderDate expectedDate status grandTotal balance"
      )
      .populate("vendor", "vendorName phoneNumber email address city ntn strn");

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: "GRN not found",
      });
    }

    await updatePurchaseOrderReceivingStatus(grn.purchaseOrder._id || grn.purchaseOrder);

    res.status(200).json({
      success: true,
      message: "GRN status updated successfully",
      data: grn,
    });
  } catch (error) {
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

    await GRN.findByIdAndDelete(req.params.id);
    await updatePurchaseOrderReceivingStatus(purchaseOrderId);

    res.status(200).json({
      success: true,
      message: "GRN deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "GRN delete nahi hua",
      error: error.message,
    });
  }
});

module.exports = router;