const express = require("express");
const router = express.Router();

const Purchase = require("../models/Purchase");
const GRN = require("../models/GRN");
const PurchaseOrder = require("../models/PurchaseOrder");
const Counter = require("../models/Counter");

const allowedTaxTypes = ["without-tax", "with-tax"];
const allowedPaymentMethods = ["Cash", "Bank", "Cheque", "Credit", "Other"];
const allowedPostingStatuses = ["Draft", "Posted"];
const allowedStatuses = ["Draft", "Completed", "Cancelled"];

const getNextPurchaseNo = async () => {
  let purchaseNo = "";

  for (let i = 0; i < 5; i++) {
    const counter = await Counter.findOneAndUpdate(
      { name: "purchaseNo" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    purchaseNo = `PUR-${String(counter.seq).padStart(4, "0")}`;

    const exists = await Purchase.findOne({ purchaseNo });
    if (!exists) return purchaseNo;
  }

  throw new Error("Unable to generate unique purchase number");
};

const peekNextPurchaseNo = async () => {
  const counter = await Counter.findOne({ name: "purchaseNo" });
  const nextSeq = counter ? counter.seq + 1 : 1;
  return `PUR-${String(nextSeq).padStart(4, "0")}`;
};

const makeItemKey = (item) => {
  return [
    String(item.description || "").trim().toLowerCase(),
    String(item.size || "").trim().toLowerCase(),
    String(item.unit || "").trim().toLowerCase(),
  ].join("|");
};

const getGRNItemsMap = (grnItems = []) => {
  const map = new Map();

  grnItems.forEach((item) => {
    const key = makeItemKey(item);

    const previous = map.get(key) || {
      item: item.item || null,
      description: item.description || "",
      size: item.size || "",
      grnAcceptedQty: 0,
      unit: item.unit || "Pcs",
      unitPrice: item.unitPrice || 0,
    };

    previous.grnAcceptedQty += Number(item.acceptedQty || 0);
    map.set(key, previous);
  });

  return map;
};

const cleanPurchaseItems = ({ items = [], grnItems = [] }) => {
  const grnItemsMap = getGRNItemsMap(grnItems);
  const cleanItems = [];

  for (const item of items) {
    if (!item || !String(item.description || "").trim()) continue;

    const key = makeItemKey(item);
    const grnItem = grnItemsMap.get(key);

    if (!grnItem) {
      throw new Error(`Item "${item.description}" GRN mein nahi mila`);
    }

    const purchaseQty = Number(item.purchaseQty || item.quantity || 0);

    if (purchaseQty <= 0) continue;

    if (purchaseQty > Number(grnItem.grnAcceptedQty || 0)) {
      throw new Error(
        `Item "${item.description}" ki purchase qty GRN accepted qty se zyada nahi ho sakti. Accepted qty ${grnItem.grnAcceptedQty} ${grnItem.unit} hai`
      );
    }

    const unitPrice = Number(item.unitPrice ?? grnItem.unitPrice ?? 0);
    const grossAmount = purchaseQty * unitPrice;
    const discount = Number(item.discount || 0);

    if (discount > grossAmount) {
      throw new Error(
        `Item "${item.description}" ka discount gross amount se zyada nahi ho sakta`
      );
    }

    const amount = grossAmount - discount;

    cleanItems.push({
      item: item.item || grnItem.item || null,
      description: String(item.description || grnItem.description || "").trim(),
      size: String(item.size || grnItem.size || "").trim(),
      grnAcceptedQty: Number(grnItem.grnAcceptedQty || 0),
      purchaseQty,
      unit: String(item.unit || grnItem.unit || "Pcs").trim(),
      unitPrice,
      grossAmount,
      discount,
      amount,
      remarks: String(item.remarks || "").trim(),
    });
  }

  return cleanItems;
};

const calculateTotals = ({
  items = [],
  taxType = "without-tax",
  taxRate = null,
  overallDiscount = 0,
  freightCharges = 0,
  otherCharges = 0,
  paidAmount = 0,
}) => {
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.grossAmount || 0),
    0
  );

  const itemDiscount = items.reduce(
    (sum, item) => sum + Number(item.discount || 0),
    0
  );

  const finalOverallDiscount = Number(overallDiscount || 0);

  if (finalOverallDiscount > subtotal - itemDiscount) {
    throw new Error("Overall discount taxable amount se zyada nahi ho sakta");
  }

  const totalDiscount = itemDiscount + finalOverallDiscount;
  const taxableAmount = Math.max(subtotal - totalDiscount, 0);

  const finalTaxType = allowedTaxTypes.includes(taxType)
    ? taxType
    : "without-tax";

  const finalTaxRate =
    finalTaxType === "with-tax" ? Number(taxRate ?? 18) : 0;

  const salesTax =
    finalTaxType === "with-tax"
      ? taxableAmount * (Number(finalTaxRate || 0) / 100)
      : 0;

  const finalFreightCharges = Number(freightCharges || 0);
  const finalOtherCharges = Number(otherCharges || 0);

  const grandTotal =
    taxableAmount + salesTax + finalFreightCharges + finalOtherCharges;

  const finalPaidAmount = Number(paidAmount || 0);

  if (finalPaidAmount > grandTotal) {
    throw new Error("Paid amount grand total se zyada nahi ho sakta");
  }

  const balance = grandTotal - finalPaidAmount;

  let paymentStatus = "Unpaid";
  if (finalPaidAmount >= grandTotal && grandTotal > 0) {
    paymentStatus = "Paid";
  } else if (finalPaidAmount > 0) {
    paymentStatus = "Partially Paid";
  }

  return {
    subtotal,
    itemDiscount,
    overallDiscount: finalOverallDiscount,
    totalDiscount,
    taxableAmount,
    taxType: finalTaxType,
    taxRate: finalTaxRate,
    salesTax,
    freightCharges: finalFreightCharges,
    otherCharges: finalOtherCharges,
    grandTotal,
    paidAmount: finalPaidAmount,
    balance,
    paymentStatus,
  };
};

const setGRNPurchaseStatus = async (grnId) => {
  const activePurchase = await Purchase.findOne({
    grn: grnId,
    status: { $ne: "Cancelled" },
  });

  await GRN.findByIdAndUpdate(grnId, {
    purchaseStatus: activePurchase ? "Purchased" : "Not Purchased",
  });
};

router.get("/next-no", async (req, res) => {
  try {
    const purchaseNo = await peekNextPurchaseNo();

    res.status(200).json({
      success: true,
      purchaseNo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Purchase number generate nahi hua",
      error: error.message,
    });
  }
});

router.get("/all", async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      postingStatus = "",
      paymentStatus = "",
      vendor = "",
      grn = "",
      purchaseOrder = "",
    } = req.query;

    const query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (postingStatus && postingStatus !== "All") {
      query.postingStatus = postingStatus;
    }

    if (paymentStatus && paymentStatus !== "All") {
      query.paymentStatus = paymentStatus;
    }

    if (vendor) {
      query.vendor = vendor;
    }

    if (grn) {
      query.grn = grn;
    }

    if (purchaseOrder) {
      query.purchaseOrder = purchaseOrder;
    }

    if (search) {
      query.$or = [
        { purchaseNo: { $regex: search, $options: "i" } },
        { grnNo: { $regex: search, $options: "i" } },
        { purchaseOrderNo: { $regex: search, $options: "i" } },
        { vendorName: { $regex: search, $options: "i" } },
        { vendorPhone: { $regex: search, $options: "i" } },
        { vendorInvoiceNo: { $regex: search, $options: "i" } },
        { supplierBillNo: { $regex: search, $options: "i" } },
        { challanNo: { $regex: search, $options: "i" } },
        { "items.description": { $regex: search, $options: "i" } },
      ];
    }

    const purchases = await Purchase.find(query)
      .populate("grn", "grnNo receivedDate status purchaseStatus")
      .populate(
        "purchaseOrder",
        "purchaseOrderNo orderDate expectedDate status grandTotal balance"
      )
      .populate("vendor", "vendorName phoneNumber email address city ntn strn")
      .sort({ createdAt: -1 });

    res.status(200).json(purchases);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Purchases load nahi huay",
      error: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id)
      .populate("grn", "grnNo receivedDate status purchaseStatus items")
      .populate(
        "purchaseOrder",
        "purchaseOrderNo orderDate expectedDate status grandTotal balance"
      )
      .populate("vendor", "vendorName phoneNumber email address city ntn strn");

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    res.status(200).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Purchase load nahi hui",
      error: error.message,
    });
  }
});

router.post("/add", async (req, res) => {
  try {
    const {
      purchaseNo,
      grn,
      purchaseDate,
      dueDate,
      vendorInvoiceNo,
      supplierBillNo,
      challanNo,
      warehouse,
      taxType,
      taxRate,
      freightCharges,
      otherCharges,
      overallDiscount,
      paidAmount,
      paymentMethod,
      postingStatus,
      status,
      remarks,
      items,
    } = req.body;

    if (!grn) {
      return res.status(400).json({
        success: false,
        message: "GRN required hai",
      });
    }

    if (!purchaseDate) {
      return res.status(400).json({
        success: false,
        message: "Purchase date required hai",
      });
    }

    if (!vendorInvoiceNo) {
      return res.status(400).json({
        success: false,
        message: "Vendor invoice no required hai",
      });
    }

    const selectedGRN = await GRN.findById(grn);

    if (!selectedGRN) {
      return res.status(404).json({
        success: false,
        message: "GRN not found",
      });
    }

    if (selectedGRN.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled GRN ki purchase nahi ban sakti",
      });
    }

    const existingPurchase = await Purchase.findOne({
      grn: selectedGRN._id,
      status: { $ne: "Cancelled" },
    });

    if (existingPurchase) {
      return res.status(400).json({
        success: false,
        message: "Is GRN ki purchase already ban chuki hai",
      });
    }

    const selectedPO = await PurchaseOrder.findById(selectedGRN.purchaseOrder);

    if (!selectedPO) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    const sourceItems =
      items && items.length > 0
        ? items
        : selectedGRN.items
            .filter((item) => Number(item.acceptedQty || 0) > 0)
            .map((item) => ({
              item: item.item || null,
              description: item.description || "",
              size: item.size || "",
              grnAcceptedQty: item.acceptedQty || 0,
              purchaseQty: item.acceptedQty || 0,
              unit: item.unit || "Pcs",
              unitPrice: item.unitPrice || 0,
              discount: 0,
              remarks: item.remarks || "",
            }));

    const cleanItems = cleanPurchaseItems({
      items: sourceItems,
      grnItems: selectedGRN.items || [],
    });

    if (cleanItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please at least one valid purchase item add karein",
      });
    }

    const totals = calculateTotals({
      items: cleanItems,
      taxType,
      taxRate,
      overallDiscount,
      freightCharges,
      otherCharges,
      paidAmount,
    });

    const finalPurchaseNo = purchaseNo
      ? String(purchaseNo).trim().toUpperCase()
      : await getNextPurchaseNo();

    const finalPostingStatus = allowedPostingStatuses.includes(postingStatus)
      ? postingStatus
      : "Draft";

    const finalStatus =
      finalPostingStatus === "Posted"
        ? "Completed"
        : allowedStatuses.includes(status)
        ? status
        : "Draft";

    const purchase = new Purchase({
      purchaseNo: finalPurchaseNo,

      grn: selectedGRN._id,
      grnNo: selectedGRN.grnNo,

      purchaseOrder: selectedPO._id,
      purchaseOrderNo: selectedPO.purchaseOrderNo,

      vendor: selectedGRN.vendor,
      vendorName: selectedGRN.vendorName,
      vendorPhone: selectedGRN.vendorPhone || "",
      vendorEmail: selectedGRN.vendorEmail || "",
      vendorAddress: selectedGRN.vendorAddress || "",

      purchaseDate,
      dueDate: dueDate || "",

      vendorInvoiceNo,
      supplierBillNo: supplierBillNo || "",
      challanNo: challanNo || selectedGRN.challanNo || "",
      warehouse: warehouse || selectedGRN.warehouse || "Main Warehouse",

      taxType: totals.taxType,
      taxRate: totals.taxRate,

      items: cleanItems,

      subtotal: totals.subtotal,
      itemDiscount: totals.itemDiscount,
      overallDiscount: totals.overallDiscount,
      totalDiscount: totals.totalDiscount,
      taxableAmount: totals.taxableAmount,
      salesTax: totals.salesTax,
      freightCharges: totals.freightCharges,
      otherCharges: totals.otherCharges,
      grandTotal: totals.grandTotal,
      paidAmount: totals.paidAmount,
      balance: totals.balance,

      paymentMethod: allowedPaymentMethods.includes(paymentMethod)
        ? paymentMethod
        : "Credit",

      paymentStatus: totals.paymentStatus,
      postingStatus: finalPostingStatus,
      status: finalStatus,
      remarks: remarks || "",
    });

    const savedPurchase = await purchase.save();

    await setGRNPurchaseStatus(selectedGRN._id);

    const populatedPurchase = await Purchase.findById(savedPurchase._id)
      .populate("grn", "grnNo receivedDate status purchaseStatus")
      .populate(
        "purchaseOrder",
        "purchaseOrderNo orderDate expectedDate status grandTotal balance"
      )
      .populate("vendor", "vendorName phoneNumber email address city ntn strn");

    res.status(201).json({
      success: true,
      message: "Purchase created successfully",
      data: populatedPurchase,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Purchase number ya GRN already used hai",
      });
    }

    res.status(400).json({
      success: false,
      message: "Purchase save nahi hui",
      error: error.message,
    });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    const existingPurchase = await Purchase.findById(req.params.id);

    if (!existingPurchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    if (existingPurchase.postingStatus === "Posted") {
      return res.status(400).json({
        success: false,
        message: "Posted purchase update nahi ho sakti",
      });
    }

    if (existingPurchase.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled purchase update nahi ho sakti",
      });
    }

    const selectedGRN = await GRN.findById(req.body.grn || existingPurchase.grn);

    if (!selectedGRN) {
      return res.status(404).json({
        success: false,
        message: "GRN not found",
      });
    }

    if (selectedGRN.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled GRN ki purchase update nahi ho sakti",
      });
    }

    if (String(selectedGRN._id) !== String(existingPurchase.grn)) {
      const grnAlreadyUsed = await Purchase.findOne({
        grn: selectedGRN._id,
        _id: { $ne: existingPurchase._id },
        status: { $ne: "Cancelled" },
      });

      if (grnAlreadyUsed) {
        return res.status(400).json({
          success: false,
          message: "Is GRN ki purchase already exist karti hai",
        });
      }
    }

    const selectedPO = await PurchaseOrder.findById(selectedGRN.purchaseOrder);

    if (!selectedPO) {
      return res.status(404).json({
        success: false,
        message: "Purchase Order not found",
      });
    }

    const cleanItems = cleanPurchaseItems({
      items: req.body.items || existingPurchase.items,
      grnItems: selectedGRN.items || [],
    });

    if (cleanItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please at least one valid purchase item add karein",
      });
    }

    const totals = calculateTotals({
      items: cleanItems,
      taxType: req.body.taxType || existingPurchase.taxType,
      taxRate: req.body.taxRate ?? existingPurchase.taxRate,
      overallDiscount:
        req.body.overallDiscount ?? existingPurchase.overallDiscount,
      freightCharges: req.body.freightCharges ?? existingPurchase.freightCharges,
      otherCharges: req.body.otherCharges ?? existingPurchase.otherCharges,
      paidAmount: req.body.paidAmount ?? existingPurchase.paidAmount,
    });

    const finalPostingStatus = allowedPostingStatuses.includes(
      req.body.postingStatus
    )
      ? req.body.postingStatus
      : existingPurchase.postingStatus;

    const finalStatus =
      finalPostingStatus === "Posted"
        ? "Completed"
        : allowedStatuses.includes(req.body.status)
        ? req.body.status
        : existingPurchase.status;

    const updatedPurchase = await Purchase.findByIdAndUpdate(
      req.params.id,
      {
        purchaseNo: req.body.purchaseNo
          ? String(req.body.purchaseNo).trim().toUpperCase()
          : existingPurchase.purchaseNo,

        grn: selectedGRN._id,
        grnNo: selectedGRN.grnNo,

        purchaseOrder: selectedPO._id,
        purchaseOrderNo: selectedPO.purchaseOrderNo,

        vendor: selectedGRN.vendor,
        vendorName: selectedGRN.vendorName,
        vendorPhone: selectedGRN.vendorPhone || "",
        vendorEmail: selectedGRN.vendorEmail || "",
        vendorAddress: selectedGRN.vendorAddress || "",

        purchaseDate: req.body.purchaseDate || existingPurchase.purchaseDate,
        dueDate: req.body.dueDate || "",

        vendorInvoiceNo:
          req.body.vendorInvoiceNo || existingPurchase.vendorInvoiceNo,

        supplierBillNo: req.body.supplierBillNo || "",
        challanNo: req.body.challanNo || selectedGRN.challanNo || "",
        warehouse: req.body.warehouse || selectedGRN.warehouse || "Main Warehouse",

        taxType: totals.taxType,
        taxRate: totals.taxRate,

        items: cleanItems,

        subtotal: totals.subtotal,
        itemDiscount: totals.itemDiscount,
        overallDiscount: totals.overallDiscount,
        totalDiscount: totals.totalDiscount,
        taxableAmount: totals.taxableAmount,
        salesTax: totals.salesTax,
        freightCharges: totals.freightCharges,
        otherCharges: totals.otherCharges,
        grandTotal: totals.grandTotal,
        paidAmount: totals.paidAmount,
        balance: totals.balance,

        paymentMethod: allowedPaymentMethods.includes(req.body.paymentMethod)
          ? req.body.paymentMethod
          : existingPurchase.paymentMethod,

        paymentStatus: totals.paymentStatus,
        postingStatus: finalPostingStatus,
        status: finalStatus,
        remarks: req.body.remarks || "",
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("grn", "grnNo receivedDate status purchaseStatus")
      .populate(
        "purchaseOrder",
        "purchaseOrderNo orderDate expectedDate status grandTotal balance"
      )
      .populate("vendor", "vendorName phoneNumber email address city ntn strn");

    await setGRNPurchaseStatus(existingPurchase.grn);
    await setGRNPurchaseStatus(selectedGRN._id);

    res.status(200).json({
      success: true,
      message: "Purchase updated successfully",
      data: updatedPurchase,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Purchase number ya GRN already used hai",
      });
    }

    res.status(400).json({
      success: false,
      message: "Purchase update nahi hui",
      error: error.message,
    });
  }
});

router.put("/post/:id", async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    if (purchase.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled purchase post nahi ho sakti",
      });
    }

    purchase.postingStatus = "Posted";
    purchase.status = "Completed";

    await purchase.save();
    await setGRNPurchaseStatus(purchase.grn);

    const populatedPurchase = await Purchase.findById(purchase._id)
      .populate("grn", "grnNo receivedDate status purchaseStatus")
      .populate(
        "purchaseOrder",
        "purchaseOrderNo orderDate expectedDate status grandTotal balance"
      )
      .populate("vendor", "vendorName phoneNumber email address city ntn strn");

    res.status(200).json({
      success: true,
      message: "Purchase posted successfully",
      data: populatedPurchase,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Purchase post nahi hui",
      error: error.message,
    });
  }
});

router.patch("/payment/:id", async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    if (purchase.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled purchase ki payment update nahi ho sakti",
      });
    }

    const paidAmount = Number(req.body.paidAmount || 0);

    if (paidAmount > Number(purchase.grandTotal || 0)) {
      return res.status(400).json({
        success: false,
        message: "Paid amount grand total se zyada nahi ho sakta",
      });
    }

    purchase.paidAmount = paidAmount;
    purchase.balance = Number(purchase.grandTotal || 0) - paidAmount;

    if (paidAmount >= Number(purchase.grandTotal || 0)) {
      purchase.paymentStatus = "Paid";
    } else if (paidAmount > 0) {
      purchase.paymentStatus = "Partially Paid";
    } else {
      purchase.paymentStatus = "Unpaid";
    }

    if (allowedPaymentMethods.includes(req.body.paymentMethod)) {
      purchase.paymentMethod = req.body.paymentMethod;
    }

    await purchase.save();

    res.status(200).json({
      success: true,
      message: "Payment updated successfully",
      data: purchase,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Payment update nahi hui",
      error: error.message,
    });
  }
});

router.patch("/cancel/:id", async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    purchase.status = "Cancelled";
    purchase.postingStatus = "Draft";

    await purchase.save();
    await setGRNPurchaseStatus(purchase.grn);

    res.status(200).json({
      success: true,
      message: "Purchase cancelled successfully",
      data: purchase,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Purchase cancel nahi hui",
      error: error.message,
    });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase not found",
      });
    }

    if (purchase.postingStatus === "Posted") {
      return res.status(400).json({
        success: false,
        message: "Posted purchase delete nahi ho sakti. Pehle cancel karein.",
      });
    }

    const grnId = purchase.grn;

    await Purchase.findByIdAndDelete(req.params.id);
    await setGRNPurchaseStatus(grnId);

    res.status(200).json({
      success: true,
      message: "Purchase deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Purchase delete nahi hui",
      error: error.message,
    });
  }
});

module.exports = router;