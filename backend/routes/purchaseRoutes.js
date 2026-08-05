const express = require("express");
const mongoose = require("mongoose");

const router = express.Router();

const Purchase = require("../models/Purchase");
const GRN = require("../models/GRN");
const PurchaseOrder = require("../models/PurchaseOrder");
const Counter = require("../models/Counter");

const PURCHASE_COUNTER_NAME = "purchaseNoSequentialV3";
const STANDARD_PURCHASE_NO_PATTERN = /^PUR-(\d+)$/i;
const PURCHASE_NO_PATTERN = /^[A-Z0-9][A-Z0-9/_-]*$/;

const PAYMENT_METHODS = ["Cash", "Bank", "Cheque", "Credit", "Other"];
const POSTABLE_GRN_STATUSES = [
  "Received",
  "Partially Received",
  "Completed",
  "Posted",
];

const cleanText = (value, fallback = "") => {
  const text = String(value ?? "").trim();
  return text || fallback;
};

const cleanNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(number, 0) : 0;
};

const roundMoney = (value) =>
  Math.round((cleanNumber(value) + Number.EPSILON) * 100) / 100;

const normalizeTaxSnapshot = (taxType, taxRate) => {
  const finalTaxType =
    taxType === "with-tax"
      ? "with-tax"
      : "without-tax";

  const finalTaxRate =
    finalTaxType === "with-tax"
      ? cleanNumber(taxRate || 18)
      : 0;

  return {
    taxType: finalTaxType,
    taxRate: finalTaxRate,
  };
};

/*
 * Purchases inherit tax from the selected GRN.
 * The linked Purchase Order is checked server-side because it is the
 * original source from which the GRN snapshot was created.
 *
 * Older or inconsistent GRN records are repaired automatically, so the
 * client never has to select or type tax again.
 */
const resolveGRNTaxSnapshot = async (
  grn = {},
  purchaseOrder = {}
) => {
  const grnTax = normalizeTaxSnapshot(
    grn.taxType,
    grn.taxRate
  );

  const purchaseOrderTax = normalizeTaxSnapshot(
    purchaseOrder.taxType,
    purchaseOrder.taxRate
  );

  const snapshotMatches =
    grnTax.taxType === purchaseOrderTax.taxType &&
    Math.abs(grnTax.taxRate - purchaseOrderTax.taxRate) < 0.000001;

  const effectiveTax = snapshotMatches
    ? grnTax
    : purchaseOrderTax;

  if (!snapshotMatches && grn?._id) {
    await GRN.updateOne(
      { _id: grn._id },
      {
        $set: {
          taxType: effectiveTax.taxType,
          taxRate: effectiveTax.taxRate,
        },
      }
    );

    grn.taxType = effectiveTax.taxType;
    grn.taxRate = effectiveTax.taxRate;
  }

  return {
    ...effectiveTax,
    taxSource: "GRN / Purchase Order",
    taxLabel:
      effectiveTax.taxType === "with-tax"
        ? `With Sales Tax ${effectiveTax.taxRate}%`
        : "Without Sales Tax",
  };
};

const escapeRegex = (value) =>
  String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const idOf = (value) => {
  if (!value) return "";
  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }
  return String(value);
};

const isValidId = (value) => mongoose.isValidObjectId(idOf(value));

const normalizePurchaseNo = (value) =>
  cleanText(value).toUpperCase().replace(/\s+/g, "");

const formatPurchaseNo = (sequence) =>
  `PUR-${String(sequence).padStart(4, "0")}`;

const getPurchaseSequence = (purchaseNo) => {
  const match = normalizePurchaseNo(purchaseNo).match(
    STANDARD_PURCHASE_NO_PATTERN
  );
  return match ? Number(match[1]) || 0 : 0;
};

const validatePurchaseNo = (purchaseNo) => {
  if (!purchaseNo) throw new Error("Purchase number is required");
  if (purchaseNo.length > 50) {
    throw new Error("Purchase number cannot exceed 50 characters");
  }
  if (!PURCHASE_NO_PATTERN.test(purchaseNo)) {
    throw new Error(
      "Purchase number can contain letters, numbers, hyphen, slash or underscore only"
    );
  }
};

const duplicateMessage = (error, fallback = "Purchase could not be saved") => {
  if (error?.code !== 11000) return error?.message || fallback;
  const field = Object.keys(error.keyPattern || {})[0];
  if (field === "purchaseNo") return "This Purchase Number already exists";
  if (field === "grn") return "This GRN has already been used in another Purchase";
  return "Purchase Number or GRN already exists";
};

const getPurchaseCounter = async () =>
  Counter.findOneAndUpdate(
    { name: PURCHASE_COUNTER_NAME },
    { $setOnInsert: { seq: 0 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

const findNextAvailablePurchaseNo = async (startSequence = 1) => {
  let sequence = Math.max(Number(startSequence) || 1, 1);

  for (let attempt = 0; attempt < 10000; attempt += 1) {
    const purchaseNo = formatPurchaseNo(sequence);
    const exists = await Purchase.exists({ purchaseNo });
    if (!exists) return { purchaseNo, sequence };
    sequence += 1;
  }

  throw new Error("Unable to find the next Purchase Number");
};

const getNextPurchaseNo = async () => {
  await getPurchaseCounter();

  for (let attempt = 0; attempt < 1000; attempt += 1) {
    const counter = await Counter.findOneAndUpdate(
      { name: PURCHASE_COUNTER_NAME },
      { $inc: { seq: 1 } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    const purchaseNo = formatPurchaseNo(counter.seq);
    const exists = await Purchase.exists({ purchaseNo });
    if (!exists) return purchaseNo;
  }

  throw new Error("Unable to generate a unique Purchase Number");
};

const peekNextPurchaseNo = async () => {
  const counter = await getPurchaseCounter();
  const next = await findNextAvailablePurchaseNo(Number(counter.seq || 0) + 1);
  return next.purchaseNo;
};

const resolvePurchaseNo = async (value, excludePurchaseId = null) => {
  const requestedPurchaseNo = normalizePurchaseNo(value);

  if (!requestedPurchaseNo) return getNextPurchaseNo();

  validatePurchaseNo(requestedPurchaseNo);

  const duplicateQuery = { purchaseNo: requestedPurchaseNo };
  if (excludePurchaseId) duplicateQuery._id = { $ne: excludePurchaseId };

  if (await Purchase.exists(duplicateQuery)) {
    throw new Error(`Purchase Number "${requestedPurchaseNo}" already exists`);
  }

  const requestedSequence = getPurchaseSequence(requestedPurchaseNo);
  if (requestedSequence > 0) {
    const counter = await getPurchaseCounter();
    const next = await findNextAvailablePurchaseNo(Number(counter.seq || 0) + 1);

    if (requestedPurchaseNo === next.purchaseNo) {
      await Counter.findOneAndUpdate(
        { name: PURCHASE_COUNTER_NAME },
        { $max: { seq: requestedSequence } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    }
  }

  return requestedPurchaseNo;
};

const populatePurchase = (query) =>
  query
    .populate(
      "grn",
      "grnNo receivedDate challanNo warehouse status inspectionStatus purchaseStatus totalAcceptedQty stockPosted"
    )
    .populate(
      "purchaseOrder",
      "purchaseOrderNo orderDate expectedDate referenceNo status taxType taxRate"
    )
    .populate(
      "vendor",
      "vendorName name phoneNumber phone email address city ntn strn status"
    )
    .populate("items.item", "code name itemType unit status");

const getVendorSnapshot = (grn, purchaseOrder) => {
  const grnVendor =
    grn.vendor && typeof grn.vendor === "object" ? grn.vendor : null;
  const poVendor =
    purchaseOrder.vendor && typeof purchaseOrder.vendor === "object"
      ? purchaseOrder.vendor
      : null;

  return {
    vendor:
      idOf(grn.vendor) || idOf(purchaseOrder.vendor) || null,
    vendorName:
      cleanText(grn.vendorName) ||
      cleanText(grnVendor?.vendorName || grnVendor?.name) ||
      cleanText(purchaseOrder.vendorName) ||
      cleanText(poVendor?.vendorName || poVendor?.name),
    vendorPhone:
      cleanText(grn.vendorPhone) ||
      cleanText(grnVendor?.phoneNumber || grnVendor?.phone) ||
      cleanText(purchaseOrder.vendorPhone) ||
      cleanText(poVendor?.phoneNumber || poVendor?.phone),
    vendorEmail:
      cleanText(grn.vendorEmail) ||
      cleanText(grnVendor?.email) ||
      cleanText(purchaseOrder.vendorEmail) ||
      cleanText(poVendor?.email),
    vendorAddress:
      cleanText(grn.vendorAddress) ||
      cleanText(grnVendor?.address) ||
      cleanText(purchaseOrder.vendorAddress) ||
      cleanText(poVendor?.address),
  };
};

const makeFallbackKey = (row = {}) =>
  [
    idOf(row.item),
    cleanText(row.description || row.itemName || row.item?.name).toLowerCase(),
    cleanText(row.size).toLowerCase(),
    cleanText(row.unit || row.item?.unit, "Pcs").toLowerCase(),
  ].join("|");

const getRowKeys = (
  row = {},
  { useDocumentIdAsPORowId = false, useDocumentIdAsGRNRowId = false } = {}
) => {
  const keys = [];

  const grnItemId = idOf(row.grnItemId);
  if (grnItemId) keys.push(`grn-row:${grnItemId}`);

  if (useDocumentIdAsGRNRowId) {
    const documentId = idOf(row._id);
    if (documentId) keys.push(`grn-row:${documentId}`);
  }

  const poItemId = idOf(row.purchaseOrderItemId);
  if (poItemId) keys.push(`po-row:${poItemId}`);

  if (useDocumentIdAsPORowId) {
    const documentId = idOf(row._id);
    if (documentId) keys.push(`po-row:${documentId}`);
  }

  keys.push(`fallback:${makeFallbackKey(row)}`);
  return [...new Set(keys.filter(Boolean))];
};

const getPurchaseOrderRowsMap = (purchaseOrder) => {
  const map = new Map();

  for (const row of purchaseOrder.items || []) {
    const data = {
      purchaseOrderItemId: row._id || null,
      item: idOf(row.item) || null,
      description: cleanText(row.description || row.item?.name),
      size: cleanText(row.size),
      cartons: cleanNumber(row.cartons),
      unit: cleanText(row.unit || row.item?.unit, "Pcs"),
      unitPrice: roundMoney(row.unitPrice),
      remarks: cleanText(row.remarks),
    };

    for (const key of getRowKeys(row, { useDocumentIdAsPORowId: true })) {
      map.set(key, data);
    }
  }

  return map;
};

const getIncomingRowsMap = (items = []) => {
  const map = new Map();

  for (const row of Array.isArray(items) ? items : []) {
    if (!row) continue;
    for (const key of getRowKeys(row)) map.set(key, row);
  }

  return map;
};

const findMappedRow = (map, row, options = {}) => {
  for (const key of getRowKeys(row, options)) {
    if (map.has(key)) return map.get(key);
  }
  return null;
};

const loadGRNSource = async (grnId, excludePurchaseId = null) => {
  if (!isValidId(grnId)) throw new Error("A valid GRN is required");

  const grn = await GRN.findById(grnId)
    .populate(
      "vendor",
      "vendorName name phoneNumber phone email address city ntn strn status"
    )
    .populate(
      "items.item",
      "code name itemType unit status stockManaged purchasePrice purchaseRate costPrice"
    );

  if (!grn) throw new Error("GRN not found");
  if (grn.status === "Cancelled") {
    throw new Error("Cancelled GRN cannot be converted into a Purchase");
  }
  if (!POSTABLE_GRN_STATUSES.includes(grn.status)) {
    throw new Error("GRN must be received or posted before creating a Purchase");
  }
  if (!grn.stockPosted && grn.status !== "Posted") {
    throw new Error("GRN stock must be posted before creating a Purchase");
  }

  const totalAcceptedQty = (grn.items || []).reduce(
    (sum, row) => sum + cleanNumber(row.acceptedQty),
    0
  );

  if (totalAcceptedQty <= 0) {
    throw new Error("GRN has no accepted quantity to purchase");
  }

  const duplicateQuery = {
    grn: grn._id,
    status: { $ne: "Cancelled" },
  };
  if (excludePurchaseId) duplicateQuery._id = { $ne: excludePurchaseId };

  if (await Purchase.exists(duplicateQuery)) {
    throw new Error("This GRN has already been used in another Purchase");
  }

  const purchaseOrder = await PurchaseOrder.findById(grn.purchaseOrder)
    .populate(
      "vendor",
      "vendorName name phoneNumber phone email address city ntn strn status"
    )
    .populate(
      "items.item",
      "code name itemType unit status stockManaged purchasePrice purchaseRate costPrice"
    );

  if (!purchaseOrder) throw new Error("Purchase Order linked with GRN was not found");
  if (purchaseOrder.status === "Cancelled") {
    throw new Error("Purchase linked with a cancelled Purchase Order is not allowed");
  }

  return { grn, purchaseOrder, totalAcceptedQty };
};

const buildPurchaseItems = ({ grn, purchaseOrder, incomingItems = [] }) => {
  const poRowsMap = getPurchaseOrderRowsMap(purchaseOrder);
  const incomingMap = getIncomingRowsMap(incomingItems);
  const output = [];

  for (const grnRow of grn.items || []) {
    const acceptedQty = cleanNumber(grnRow.acceptedQty);
    if (acceptedQty <= 0) continue;

    const poRow = findMappedRow(poRowsMap, grnRow);
    if (!poRow) {
      throw new Error(
        `Purchase Order row could not be matched for "${cleanText(
          grnRow.description || grnRow.itemName,
          "Item"
        )}"`
      );
    }

    const incoming = findMappedRow(incomingMap, grnRow, {
      useDocumentIdAsGRNRowId: true,
    });

    const itemId = idOf(grnRow.item) || idOf(poRow.item);
    if (!isValidId(itemId)) {
      throw new Error(
        `Item "${cleanText(
          grnRow.description || grnRow.itemName,
          "Unknown item"
        )}" is not linked with Item Master`
      );
    }

    const requestedRate = incoming?.unitPrice;
    const unitPrice =
      requestedRate !== undefined && requestedRate !== ""
        ? roundMoney(requestedRate)
        : roundMoney(poRow.unitPrice);

    const discount = roundMoney(incoming?.discount);
    const grossAmount = roundMoney(acceptedQty * unitPrice);

    if (discount > grossAmount) {
      throw new Error(
        `Item discount cannot exceed gross amount for "${cleanText(
          grnRow.description || grnRow.itemName,
          "Item"
        )}"`
      );
    }

    output.push({
      grnItemId: grnRow._id || null,
      purchaseOrderItemId:
        grnRow.purchaseOrderItemId || poRow.purchaseOrderItemId || null,
      item: itemId,
      itemCode: cleanText(grnRow.itemCode || grnRow.item?.code).toUpperCase(),
      itemName: cleanText(
        grnRow.itemName || grnRow.item?.name || poRow.description
      ),
      description: cleanText(
        grnRow.description || grnRow.itemName,
        poRow.description
      ),
      size: cleanText(grnRow.size, poRow.size),
      cartons: cleanNumber(grnRow.cartons || poRow.cartons),
      grnAcceptedQty: acceptedQty,
      purchaseQty: acceptedQty,
      unit: cleanText(grnRow.unit, poRow.unit || "Pcs"),
      unitPrice,
      grossAmount,
      discount,
      amount: roundMoney(grossAmount - discount),
      remarks: cleanText(incoming?.remarks, grnRow.remarks || poRow.remarks),
    });
  }

  if (!output.length) throw new Error("GRN has no valid accepted items");
  return output;
};

const calculateTotals = ({
  items,
  taxType,
  taxRate,
  overallDiscount,
  freightCharges,
  otherCharges,
  paidAmount,
}) => {
  const subtotal = roundMoney(
    items.reduce((sum, item) => sum + cleanNumber(item.grossAmount), 0)
  );
  const itemDiscount = roundMoney(
    items.reduce((sum, item) => sum + cleanNumber(item.discount), 0)
  );
  const finalOverallDiscount = roundMoney(overallDiscount);

  if (finalOverallDiscount > Math.max(subtotal - itemDiscount, 0)) {
    throw new Error(
      "Overall discount cannot exceed the amount remaining after item discounts"
    );
  }

  const totalDiscount = roundMoney(itemDiscount + finalOverallDiscount);
  const taxableAmount = roundMoney(Math.max(subtotal - totalDiscount, 0));
  const finalTaxType = taxType === "with-tax" ? "with-tax" : "without-tax";
  const finalTaxRate = finalTaxType === "with-tax" ? cleanNumber(taxRate || 18) : 0;
  const salesTax =
    finalTaxType === "with-tax"
      ? roundMoney(taxableAmount * (finalTaxRate / 100))
      : 0;
  const finalFreightCharges = roundMoney(freightCharges);
  const finalOtherCharges = roundMoney(otherCharges);
  const grandTotal = roundMoney(
    taxableAmount + salesTax + finalFreightCharges + finalOtherCharges
  );
  const finalPaidAmount = roundMoney(paidAmount);

  if (finalPaidAmount > grandTotal) {
    throw new Error("Paid amount cannot exceed grand total");
  }

  const balance = roundMoney(Math.max(grandTotal - finalPaidAmount, 0));
  const paymentStatus =
    grandTotal > 0 && balance <= 0
      ? "Paid"
      : finalPaidAmount > 0
        ? "Partially Paid"
        : "Unpaid";

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

const buildPurchaseData = async ({ body = {}, existingPurchase = null }) => {
  const grnId = body.grn || existingPurchase?.grn;
  const { grn, purchaseOrder } = await loadGRNSource(
    grnId,
    existingPurchase?._id || null
  );

  const items = buildPurchaseItems({
    grn,
    purchaseOrder,
    incomingItems: body.items || existingPurchase?.items || [],
  });

  // Tax comes automatically from the selected GRN. The linked Purchase
  // Order is verified server-side. Any client tax values are ignored.
  const inheritedTax = await resolveGRNTaxSnapshot(
    grn,
    purchaseOrder
  );

  const totals = calculateTotals({
    items,
    taxType: inheritedTax.taxType,
    taxRate: inheritedTax.taxRate,
    overallDiscount:
      body.overallDiscount ?? existingPurchase?.overallDiscount ?? 0,
    freightCharges:
      body.freightCharges ?? existingPurchase?.freightCharges ?? 0,
    otherCharges: body.otherCharges ?? existingPurchase?.otherCharges ?? 0,
    paidAmount: body.paidAmount ?? existingPurchase?.paidAmount ?? 0,
  });

  const vendor = getVendorSnapshot(grn, purchaseOrder);
  if (!isValidId(vendor.vendor)) throw new Error("Vendor linked with GRN was not found");
  if (!vendor.vendorName) throw new Error("Vendor name linked with GRN was not found");

  const purchaseDate = cleanText(
    body.purchaseDate ?? existingPurchase?.purchaseDate,
    grn.receivedDate
  );
  if (!/^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)) {
    throw new Error("A valid purchase date is required");
  }

  const dueDate = cleanText(body.dueDate ?? existingPurchase?.dueDate);
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    throw new Error("Due date must use YYYY-MM-DD format");
  }
  if (dueDate && dueDate < purchaseDate) {
    throw new Error("Due date cannot be earlier than purchase date");
  }

  const vendorInvoiceNo = cleanText(
    body.vendorInvoiceNo ?? existingPurchase?.vendorInvoiceNo
  );
  if (!vendorInvoiceNo) throw new Error("Vendor invoice number is required");

  const paymentMethod = PAYMENT_METHODS.includes(body.paymentMethod)
    ? body.paymentMethod
    : PAYMENT_METHODS.includes(existingPurchase?.paymentMethod)
      ? existingPurchase.paymentMethod
      : "Credit";

  const requestedPostingStatus =
    body.postingStatus === "Posted" ? "Posted" : "Draft";

  return {
    grn: grn._id,
    grnNo: grn.grnNo,
    purchaseOrder: purchaseOrder._id,
    purchaseOrderNo: purchaseOrder.purchaseOrderNo,
    ...vendor,
    purchaseDate,
    dueDate,
    vendorInvoiceNo,
    supplierBillNo: cleanText(
      body.supplierBillNo ?? existingPurchase?.supplierBillNo
    ),
    challanNo: cleanText(
      body.challanNo ?? existingPurchase?.challanNo,
      grn.challanNo
    ),
    warehouse: cleanText(
      body.warehouse ?? existingPurchase?.warehouse,
      grn.warehouse || "Main Warehouse"
    ),
    taxType: totals.taxType,
    taxRate: totals.taxRate,
    taxSource: inheritedTax.taxSource,
    items,
    ...totals,
    paymentMethod,
    postingStatus: requestedPostingStatus,
    status: requestedPostingStatus === "Posted" ? "Completed" : "Draft",
    remarks: cleanText(body.remarks ?? existingPurchase?.remarks),
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

const serializeEligibleGRN = async (grn) => {
  const purchaseOrder = await PurchaseOrder.findById(grn.purchaseOrder)
    .populate(
      "vendor",
      "vendorName name phoneNumber phone email address city ntn strn status"
    )
    .populate(
      "items.item",
      "code name itemType unit status stockManaged purchasePrice purchaseRate costPrice"
    );

  if (!purchaseOrder || purchaseOrder.status === "Cancelled") return null;

  const items = buildPurchaseItems({
    grn,
    purchaseOrder,
    incomingItems: [],
  });
  const vendor = getVendorSnapshot(grn, purchaseOrder);
  const inheritedTax = await resolveGRNTaxSnapshot(grn, purchaseOrder);

  return {
    _id: grn._id,
    grnNo: grn.grnNo,
    receivedDate: grn.receivedDate,
    challanNo: grn.challanNo || "",
    warehouse: grn.warehouse || "Main Warehouse",
    status: grn.status,
    inspectionStatus: grn.inspectionStatus,
    purchaseStatus: grn.purchaseStatus,
    totalAcceptedQty: grn.totalAcceptedQty,
    purchaseOrder: purchaseOrder._id,
    purchaseOrderNo: purchaseOrder.purchaseOrderNo,
    purchaseOrderDate: purchaseOrder.orderDate || "",
    purchaseOrderReferenceNo: purchaseOrder.referenceNo || "",
    taxType: inheritedTax.taxType,
    taxRate: inheritedTax.taxRate,
    taxSource: inheritedTax.taxSource,
    taxLabel: inheritedTax.taxLabel,
    ...vendor,
    items,
  };
};

router.get("/next-no", async (req, res) => {
  try {
    return res.json({ success: true, purchaseNo: await peekNextPurchaseNo() });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/eligible-grns", async (req, res) => {
  try {
    const usedGRNs = await Purchase.find({ status: { $ne: "Cancelled" } }).distinct(
      "grn"
    );

    const grns = await GRN.find({
      _id: { $nin: usedGRNs },
      status: { $in: POSTABLE_GRN_STATUSES },
      stockPosted: true,
      totalAcceptedQty: { $gt: 0 },
    })
      .populate(
        "vendor",
        "vendorName name phoneNumber phone email address city ntn strn status"
      )
      .populate(
        "items.item",
        "code name itemType unit status stockManaged purchasePrice purchaseRate costPrice"
      )
      .sort({ receivedDate: -1, createdAt: -1 });

    const output = [];
    for (const grn of grns) {
      const row = await serializeEligibleGRN(grn);
      if (row) output.push(row);
    }

    return res.json({ success: true, grns: output });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Eligible GRNs could not be loaded",
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
    if (status && status !== "All") query.status = status;
    if (postingStatus && postingStatus !== "All") {
      query.postingStatus = postingStatus;
    }
    if (paymentStatus && paymentStatus !== "All") {
      query.paymentStatus = paymentStatus;
    }
    if (vendor) query.vendor = vendor;
    if (grn) query.grn = grn;
    if (purchaseOrder) query.purchaseOrder = purchaseOrder;

    if (search) {
      const safeSearch = escapeRegex(search);

      query.$or = [
        "purchaseNo",
        "grnNo",
        "purchaseOrderNo",
        "vendorName",
        "vendorPhone",
        "vendorInvoiceNo",
        "supplierBillNo",
        "challanNo",
        "items.itemCode",
        "items.itemName",
        "items.description",
      ].map((field) => ({
        [field]: { $regex: safeSearch, $options: "i" },
      }));
    }

    const purchases = await populatePurchase(
      Purchase.find(query).sort({ purchaseDate: -1, createdAt: -1 })
    );

    return res.json({ success: true, purchases });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Purchases could not be loaded",
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid Purchase ID" });
    }

    const purchase = await populatePurchase(Purchase.findById(req.params.id));
    if (!purchase) {
      return res.status(404).json({ success: false, message: "Purchase not found" });
    }

    return res.json({ success: true, data: purchase });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/add", async (req, res) => {
  try {
    // Purchase number is always generated by the server.
    const purchaseNo = await getNextPurchaseNo();
    const data = await buildPurchaseData({ body: req.body });
    const purchase = new Purchase({ purchaseNo, ...data });
    const saved = await purchase.save();

    await setGRNPurchaseStatus(saved.grn);

    const populated = await populatePurchase(Purchase.findById(saved._id));
    return res.status(201).json({
      success: true,
      message: "Purchase created successfully",
      data: populated,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: duplicateMessage(error),
    });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid Purchase ID" });
    }

    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: "Purchase not found" });
    }
    if (purchase.postingStatus === "Posted") {
      return res.status(400).json({
        success: false,
        message: "Posted Purchase cannot be edited",
      });
    }
    if (purchase.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled Purchase cannot be edited",
      });
    }

    const oldGRNId = purchase.grn;
    // Existing Purchase number is immutable during editing.
    const purchaseNo = purchase.purchaseNo;
    const data = await buildPurchaseData({
      body: req.body,
      existingPurchase: purchase,
    });

    purchase.set({ purchaseNo, ...data });
    await purchase.save();

    await setGRNPurchaseStatus(oldGRNId);
    await setGRNPurchaseStatus(purchase.grn);

    const populated = await populatePurchase(Purchase.findById(purchase._id));
    return res.json({
      success: true,
      message: "Purchase updated successfully",
      data: populated,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: duplicateMessage(error),
    });
  }
});

router.put("/post/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid Purchase ID" });
    }

    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: "Purchase not found" });
    }
    if (purchase.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled Purchase cannot be posted",
      });
    }
    if (purchase.postingStatus === "Posted") {
      return res.json({ success: true, message: "Purchase is already posted", data: purchase });
    }
    if (!purchase.vendorInvoiceNo) {
      return res.status(400).json({
        success: false,
        message: "Vendor invoice number is required before posting",
      });
    }
    if (!purchase.items?.length || purchase.grandTotal < 0) {
      return res.status(400).json({
        success: false,
        message: "Purchase has no valid items",
      });
    }

    purchase.postingStatus = "Posted";
    purchase.status = "Completed";
    purchase.postedAt = new Date();
    await purchase.save();
    await setGRNPurchaseStatus(purchase.grn);

    const populated = await populatePurchase(Purchase.findById(purchase._id));
    return res.json({
      success: true,
      message: "Purchase posted successfully",
      data: populated,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Purchase could not be posted",
    });
  }
});

router.patch("/payment/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid Purchase ID" });
    }

    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: "Purchase not found" });
    }
    if (purchase.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Payment cannot be updated for a cancelled Purchase",
      });
    }

    const paidAmount = roundMoney(req.body.paidAmount);
    if (paidAmount > purchase.grandTotal) {
      return res.status(400).json({
        success: false,
        message: "Paid amount cannot exceed grand total",
      });
    }

    purchase.paidAmount = paidAmount;
    if (PAYMENT_METHODS.includes(req.body.paymentMethod)) {
      purchase.paymentMethod = req.body.paymentMethod;
    }
    await purchase.save();

    const populated = await populatePurchase(Purchase.findById(purchase._id));
    return res.json({
      success: true,
      message: "Payment updated successfully",
      data: populated,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Payment could not be updated",
    });
  }
});

router.patch("/cancel/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid Purchase ID" });
    }

    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: "Purchase not found" });
    }

    purchase.status = "Cancelled";
    purchase.postingStatus = "Draft";
    purchase.cancelReason = cleanText(req.body.cancelReason);
    purchase.cancelledAt = new Date();
    await purchase.save();
    await setGRNPurchaseStatus(purchase.grn);

    const populated = await populatePurchase(Purchase.findById(purchase._id));
    return res.json({
      success: true,
      message: "Purchase cancelled successfully",
      data: populated,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || "Purchase could not be cancelled",
    });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid Purchase ID" });
    }

    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ success: false, message: "Purchase not found" });
    }
    if (purchase.postingStatus === "Posted") {
      return res.status(400).json({
        success: false,
        message: "Posted Purchase cannot be deleted. Cancel it instead.",
      });
    }

    const grnId = purchase.grn;
    await Purchase.findByIdAndDelete(purchase._id);
    await setGRNPurchaseStatus(grnId);

    return res.json({ success: true, message: "Purchase deleted successfully" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Purchase could not be deleted",
    });
  }
});

module.exports = router;
