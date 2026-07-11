const express = require("express");
const router = express.Router();

const PurchaseOrder = require("../models/PurchaseOrder");
const Vendor = require("../models/vendor");
const Counter = require("../models/Counter");

const allowedStatuses = [
  "Draft",
  "Ordered",
  "Partially Received",
  "Received",
  "Cancelled",
];

const allowedTaxTypes = ["without-tax", "with-tax"];

const getPaymentStatus = (grandTotal, advance) => {
  const total = Number(grandTotal || 0);
  const paid = Number(advance || 0);

  if (paid <= 0) return "Unpaid";
  if (paid >= total) return "Paid";
  return "Partially Paid";
};

const getNextPurchaseOrderNo = async () => {
  let purchaseOrderNo = "";

  for (let i = 0; i < 5; i++) {
    const counter = await Counter.findOneAndUpdate(
      { name: "purchaseOrderNo" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    purchaseOrderNo = `PO-${String(counter.seq).padStart(4, "0")}`;

    const exists = await PurchaseOrder.findOne({ purchaseOrderNo });
    if (!exists) return purchaseOrderNo;
  }

  throw new Error("Unable to generate unique purchase order number");
};

const peekNextPurchaseOrderNo = async () => {
  const counter = await Counter.findOne({ name: "purchaseOrderNo" });
  const nextSeq = counter ? counter.seq + 1 : 1;
  return `PO-${String(nextSeq).padStart(4, "0")}`;
};

const cleanPurchaseItems = (items = []) => {
  return items
    .filter(
      (item) =>
        item &&
        String(item.description || "").trim() &&
        Number(item.quantity || 0) > 0 &&
        Number(item.unitPrice || 0) >= 0
    )
    .map((item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unitPrice || 0);
      const receivedQty = Number(item.receivedQty || 0);
      const amount = quantity * unitPrice;

      return {
        item: item.item || null,
        description: String(item.description || "").trim(),
        size: String(item.size || "").trim(),
        cartons: Number(item.cartons || 0),
        quantity,
        unit: String(item.unit || "Pcs").trim(),
        unitPrice,
        amount,
        receivedQty,
        pendingQty: Math.max(quantity - receivedQty, 0),
        remarks: String(item.remarks || "").trim(),
      };
    });
};

const calculateTotals = (items = [], taxType = "without-tax", advance = 0) => {
  const cleanItems = cleanPurchaseItems(items);

  const subtotal = cleanItems.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const totalCartons = cleanItems.reduce(
    (sum, item) => sum + Number(item.cartons || 0),
    0
  );

  const totalQuantity = cleanItems.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const finalTaxType = allowedTaxTypes.includes(taxType)
    ? taxType
    : "without-tax";

  const taxRate = finalTaxType === "with-tax" ? 18 : 0;
  const salesTax = finalTaxType === "with-tax" ? subtotal * 0.18 : 0;
  const grandTotal = subtotal + salesTax;

  const finalAdvance = Number(advance || 0);
  const balance = grandTotal - finalAdvance;

  return {
    cleanItems,
    totalCartons,
    totalQuantity,
    subtotal,
    taxType: finalTaxType,
    taxRate,
    salesTax,
    grandTotal,
    advance: finalAdvance,
    balance,
    paymentStatus: getPaymentStatus(grandTotal, finalAdvance),
  };
};

const buildVendorSnapshot = (vendor) => {
  return {
    vendor: vendor._id,
    vendorName: vendor.vendorName || vendor.name || "",
    vendorPhone: vendor.phoneNumber || vendor.phone || "",
    vendorEmail: vendor.email || "",
    vendorAddress: vendor.address || "",
    vendorCity: vendor.city || "",
    vendorNtn: vendor.ntn || "",
    vendorStrn: vendor.strn || "",
  };
};

router.get("/next-no", async (req, res) => {
  try {
    const purchaseOrderNo = await peekNextPurchaseOrderNo();

    res.status(200).json({
      success: true,
      purchaseOrderNo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Purchase order number generate nahi hua",
      error: error.message,
    });
  }
});

router.get("/all", async (req, res) => {
  try {
    const { search = "", status = "", vendor = "" } = req.query;

    const query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (vendor) {
      query.vendor = vendor;
    }

    if (search) {
      query.$or = [
        { purchaseOrderNo: { $regex: search, $options: "i" } },
        { vendorName: { $regex: search, $options: "i" } },
        { vendorPhone: { $regex: search, $options: "i" } },
        { referenceNo: { $regex: search, $options: "i" } },
        { "items.description": { $regex: search, $options: "i" } },
      ];
    }

    const orders = await PurchaseOrder.find(query)
      .populate("vendor", "vendorName phoneNumber email address city ntn strn")
      .sort({ createdAt: -1 });

    res.status(200).json(orders);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Purchase orders load nahi huay",
      error: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const order = await PurchaseOrder.findById(req.params.id).populate(
      "vendor",
      "vendorName phoneNumber email address city ntn strn"
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Purchase order load nahi hua",
      error: error.message,
    });
  }
});

router.post("/add", async (req, res) => {
  try {
    const {
      purchaseOrderNo,
      vendor,
      orderDate,
      expectedDate,
      referenceNo,
      taxType,
      items,
      advance,
      status,
      remarks,
    } = req.body;

    if (!vendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor required hai",
      });
    }

    if (!orderDate) {
      return res.status(400).json({
        success: false,
        message: "Order date required hai",
      });
    }

    const selectedVendor = await Vendor.findById(vendor);

    if (!selectedVendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const totals = calculateTotals(items, taxType, advance);

    if (totals.cleanItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please at least one valid item add karein",
      });
    }

    if (totals.advance > totals.grandTotal) {
      return res.status(400).json({
        success: false,
        message: "Advance grand total se zyada nahi ho sakta",
      });
    }

    const finalPurchaseOrderNo = purchaseOrderNo
      ? String(purchaseOrderNo).trim().toUpperCase()
      : await getNextPurchaseOrderNo();

    const vendorSnapshot = buildVendorSnapshot(selectedVendor);

    const purchaseOrder = new PurchaseOrder({
      purchaseOrderNo: finalPurchaseOrderNo,
      ...vendorSnapshot,

      orderDate,
      expectedDate: expectedDate || "",
      referenceNo: referenceNo || "",

      taxType: totals.taxType,
      taxRate: totals.taxRate,

      items: totals.cleanItems,

      totalCartons: totals.totalCartons,
      totalQuantity: totals.totalQuantity,
      subtotal: totals.subtotal,
      salesTax: totals.salesTax,
      grandTotal: totals.grandTotal,
      advance: totals.advance,
      balance: totals.balance,
      paymentStatus: totals.paymentStatus,

      status: allowedStatuses.includes(status) ? status : "Draft",
      remarks: remarks || "",
    });

    const savedOrder = await purchaseOrder.save();

    const populatedOrder = await PurchaseOrder.findById(savedOrder._id).populate(
      "vendor",
      "vendorName phoneNumber email address city ntn strn"
    );

    res.status(201).json({
      success: true,
      message: "Purchase order created successfully",
      data: populatedOrder,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ye purchase order number already used hai",
      });
    }

    res.status(400).json({
      success: false,
      message: "Purchase order save nahi hua",
      error: error.message,
    });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    const existingOrder = await PurchaseOrder.findById(req.params.id);

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    if (existingOrder.status === "Received") {
      return res.status(400).json({
        success: false,
        message: "Received purchase order update nahi ho sakta",
      });
    }

    if (existingOrder.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled purchase order update nahi ho sakta",
      });
    }

    const selectedVendor = await Vendor.findById(
      req.body.vendor || existingOrder.vendor
    );

    if (!selectedVendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    const totals = calculateTotals(
      req.body.items || existingOrder.items,
      req.body.taxType || existingOrder.taxType,
      req.body.advance ?? existingOrder.advance
    );

    if (totals.cleanItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please at least one valid item add karein",
      });
    }

    if (totals.advance > totals.grandTotal) {
      return res.status(400).json({
        success: false,
        message: "Advance grand total se zyada nahi ho sakta",
      });
    }

    const vendorSnapshot = buildVendorSnapshot(selectedVendor);

    const updatedOrder = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      {
        purchaseOrderNo: req.body.purchaseOrderNo
          ? String(req.body.purchaseOrderNo).trim().toUpperCase()
          : existingOrder.purchaseOrderNo,

        ...vendorSnapshot,

        orderDate: req.body.orderDate || existingOrder.orderDate,
        expectedDate: req.body.expectedDate || "",
        referenceNo: req.body.referenceNo || "",

        taxType: totals.taxType,
        taxRate: totals.taxRate,

        items: totals.cleanItems,

        totalCartons: totals.totalCartons,
        totalQuantity: totals.totalQuantity,
        subtotal: totals.subtotal,
        salesTax: totals.salesTax,
        grandTotal: totals.grandTotal,
        advance: totals.advance,
        balance: totals.balance,
        paymentStatus: totals.paymentStatus,

        status: allowedStatuses.includes(req.body.status)
          ? req.body.status
          : existingOrder.status,

        remarks: req.body.remarks || "",
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate("vendor", "vendorName phoneNumber email address city ntn strn");

    res.status(200).json({
      success: true,
      message: "Purchase order updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ye purchase order number already used hai",
      });
    }

    res.status(400).json({
      success: false,
      message: "Purchase order update nahi hua",
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

    const order = await PurchaseOrder.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate("vendor", "vendorName phoneNumber email address city ntn strn");

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Purchase order status updated successfully",
      data: order,
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
    const order = await PurchaseOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    if (["Partially Received", "Received"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "Received purchase order delete nahi ho sakta",
      });
    }

    await PurchaseOrder.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Purchase order deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Purchase order delete nahi hua",
      error: error.message,
    });
  }
});

module.exports = router;