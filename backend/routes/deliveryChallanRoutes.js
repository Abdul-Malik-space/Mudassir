const express = require("express");
const router = express.Router();

const DeliveryChallan = require("../models/DeliveryChallan");
const SalesOrder = require("../models/SalesOrder");
const Counter = require("../models/Counter");
const StockLedger = require("../models/StockLedger");
const { postStockMovement } = require("../utils/stockService");

const COMPANY_PROFILES = {
  topical: {
    key: "topical",
    name: "TOPICAL PACKAGING PVT. LTD.",
    shortName: "Topical Packaging",
    templateType: "detailed",
    codePrefix: "TP-DC",
    counterName: "deliveryChallanNo:topical",
    address: "21-Km, Ferozepur Road, Lahore, Pakistan",
    phone: "+92 321 9970676",
  },
  alKaram: {
    key: "alKaram",
    name: "AL-KARAM TRADERS",
    shortName: "Al-Karam Traders",
    templateType: "compact",
    codePrefix: "AK-DC",
    counterName: "deliveryChallanNo:alKaram",
    address: "Office #17, 3rd Floor, Gohar Centre, Wahdat Road, Lahore",
    phone: "0423 5912858 | 0333 8295065",
  },
};

const allowedStatuses = ["Draft", "Dispatched", "Received", "Cancelled"];
const stockPostingStatuses = ["Dispatched", "Received"];
const allowedTextTypes = ["", "with-text", "without-text"];

const shouldPostStock = (status) => stockPostingStatuses.includes(status);

const cleanText = (value, fallback = "") =>
  String(value ?? fallback).trim();

const cleanNumber = (value) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(parsed, 0) : 0;
};

const normalizeCompanyProfile = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]/g, "");

  if (normalized === "alkaram") return "alKaram";
  if (normalized === "topical") return "topical";

  throw new Error("Invalid company profile");
};

const getProfileConfig = (value) => {
  const profileKey = normalizeCompanyProfile(value);
  return COMPANY_PROFILES[profileKey];
};

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const getNextChallanNo = async (companyProfile) => {
  const profile = getProfileConfig(companyProfile);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const counter = await Counter.findOneAndUpdate(
      { name: profile.counterName },
      { $inc: { seq: 1 } },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      }
    );

    const challanNo = `${profile.codePrefix}-${String(counter.seq).padStart(
      4,
      "0"
    )}`;

    const exists = await DeliveryChallan.exists({ challanNo });
    if (!exists) return challanNo;
  }

  throw new Error("Unable to generate a unique delivery challan number");
};

const peekNextChallanNo = async (companyProfile) => {
  const profile = getProfileConfig(companyProfile);
  const counter = await Counter.findOne({ name: profile.counterName }).lean();
  let nextSeq = counter ? Number(counter.seq || 0) + 1 : 1;

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const challanNo = `${profile.codePrefix}-${String(nextSeq).padStart(
      4,
      "0"
    )}`;

    const exists = await DeliveryChallan.exists({ challanNo });
    if (!exists) return challanNo;

    nextSeq += 1;
  }

  throw new Error("Unable to preview the next delivery challan number");
};

const getSalesOrderItemKeys = (item) => {
  const keys = [];

  const salesOrderItemId = getId(item.salesOrderItemId || item._id);
  if (salesOrderItemId) keys.push(`so-row:${salesOrderItemId}`);

  const itemId = getId(item.item);
  if (itemId) {
    keys.push(
      [
        `item:${itemId}`,
        cleanText(item.warehouse, "Main Godown").toLowerCase(),
        cleanText(item.size).toLowerCase(),
        cleanText(item.unit).toLowerCase(),
        cleanText(item.textType).toLowerCase(),
      ].join("|")
    );
  }

  keys.push(
    [
      cleanText(item.description).toLowerCase(),
      cleanText(item.warehouse, "Main Godown").toLowerCase(),
      cleanText(item.size).toLowerCase(),
      cleanText(item.unit).toLowerCase(),
      cleanText(item.textType).toLowerCase(),
    ].join("|")
  );

  return keys.filter(Boolean);
};

const getSalesOrderItemsMap = (salesOrderItems = []) => {
  const map = new Map();

  salesOrderItems.forEach((item) => {
    const orderedQty = cleanNumber(item.quantity);
    const deliveredQty = cleanNumber(item.deliveredQty);

    const data = {
      salesOrderItemId: item._id || item.salesOrderItemId || null,
      item: item.item || null,
      warehouse: cleanText(item.warehouse, "Main Godown") || "Main Godown",
      description: cleanText(item.description),
      size: cleanText(item.size),
      textType: allowedTextTypes.includes(item.textType) ? item.textType : "",
      orderedQty,
      deliveredQty,
      pendingQty:
        item.pendingQty !== undefined
          ? cleanNumber(item.pendingQty)
          : Math.max(orderedQty - deliveredQty, 0),
      cartons: cleanNumber(item.cartons),
      rolls: cleanNumber(item.rolls),
      unit: cleanText(item.unit, "Rolls") || "Rolls",
      grossWeight: cleanNumber(item.grossWeight),
      netWeight: cleanNumber(item.netWeight),
      unitPrice: cleanNumber(item.unitPrice),
    };

    getSalesOrderItemKeys(item).forEach((key) => {
      map.set(key, data);
    });
  });

  return map;
};

const findSalesOrderItem = (item, salesOrderItemsMap) => {
  const keys = getSalesOrderItemKeys(item);

  for (const key of keys) {
    if (salesOrderItemsMap.has(key)) {
      return salesOrderItemsMap.get(key);
    }
  }

  return null;
};

const getDeliveredQtyMap = async (salesOrderId, excludeChallanId = null) => {
  const query = {
    salesOrder: salesOrderId,
    status: { $in: stockPostingStatuses },
  };

  if (excludeChallanId) {
    query._id = { $ne: excludeChallanId };
  }

  const previousChallans = await DeliveryChallan.find(query).lean();
  const map = new Map();

  previousChallans.forEach((challan) => {
    (challan.items || []).forEach((item) => {
      const keys = getSalesOrderItemKeys(item);
      const primaryKey = keys[0];
      if (!primaryKey) return;

      map.set(primaryKey, cleanNumber(map.get(primaryKey)) + cleanNumber(item.quantity));
    });
  });

  return map;
};

const getDeliveredQtyForSOItem = (salesOrderItem, deliveredQtyMap) => {
  const keys = getSalesOrderItemKeys(salesOrderItem);

  for (const key of keys) {
    if (deliveredQtyMap.has(key)) {
      return cleanNumber(deliveredQtyMap.get(key));
    }
  }

  return 0;
};

const cleanDeliveryItems = async ({
  items = [],
  salesOrder,
  excludeChallanId = null,
}) => {
  const salesOrderItemsMap = getSalesOrderItemsMap(salesOrder.items || []);
  const deliveredQtyMap = await getDeliveredQtyMap(
    salesOrder._id,
    excludeChallanId
  );

  const cleanItems = [];

  for (const item of items) {
    if (!item || !cleanText(item.description)) continue;

    const quantity = cleanNumber(item.quantity);
    if (quantity <= 0) continue;

    const salesOrderItem = findSalesOrderItem(item, salesOrderItemsMap);

    if (!salesOrderItem) {
      throw new Error(
        `Item "${cleanText(item.description)}" was not found in the selected sales order.`
      );
    }

    const salesOrderItemId = getId(
      item.salesOrderItemId || salesOrderItem.salesOrderItemId
    );

    if (!salesOrderItemId) {
      throw new Error(
        `Sales order row ID is missing for item "${cleanText(item.description)}".`
      );
    }

    const primaryKey = `so-row:${salesOrderItemId}`;
    const alreadyDeliveredQty = cleanNumber(deliveredQtyMap.get(primaryKey));
    const orderedQty = cleanNumber(salesOrderItem.orderedQty);
    const pendingBeforeThisChallan = Math.max(
      orderedQty - alreadyDeliveredQty,
      0
    );

    if (quantity > pendingBeforeThisChallan) {
      throw new Error(
        `Delivery quantity for "${cleanText(
          item.description
        )}" exceeds the pending quantity of ${pendingBeforeThisChallan} ${
          salesOrderItem.unit
        }.`
      );
    }

    const grossWeight = cleanNumber(item.grossWeight);
    const netWeight = cleanNumber(item.netWeight);

    if (grossWeight > 0 && netWeight > grossWeight) {
      throw new Error(
        `Net weight cannot exceed gross weight for item "${cleanText(
          item.description
        )}".`
      );
    }

    const unitPrice = cleanNumber(
      item.unitPrice !== undefined ? item.unitPrice : salesOrderItem.unitPrice
    );

    cleanItems.push({
      salesOrderItemId,
      item: item.item || salesOrderItem.item || null,
      warehouse:
        cleanText(item.warehouse || salesOrderItem.warehouse, "Main Godown") ||
        "Main Godown",
      description: cleanText(
        item.description || salesOrderItem.description
      ),
      size: cleanText(item.size || salesOrderItem.size),
      textType: allowedTextTypes.includes(item.textType)
        ? item.textType
        : salesOrderItem.textType,
      orderedQty,
      alreadyDeliveredQty,

      // This is intentionally the available quantity before this challan.
      // It keeps the existing challan editable in the frontend.
      pendingQty: pendingBeforeThisChallan,

      cartons: cleanNumber(item.cartons),
      rolls: cleanNumber(item.rolls),
      quantity,
      unit: cleanText(item.unit || salesOrderItem.unit, "Rolls") || "Rolls",
      grossWeight,
      netWeight,
      unitPrice,
      amount: quantity * unitPrice,
      remarks: cleanText(item.remarks),
    });
  }

  return cleanItems;
};

const calculateTotals = (items = []) => ({
  totalCartons: items.reduce(
    (sum, item) => sum + cleanNumber(item.cartons),
    0
  ),
  totalRolls: items.reduce(
    (sum, item) => sum + cleanNumber(item.rolls),
    0
  ),
  totalQuantity: items.reduce(
    (sum, item) => sum + cleanNumber(item.quantity),
    0
  ),
  totalGrossWeight: items.reduce(
    (sum, item) => sum + cleanNumber(item.grossWeight),
    0
  ),
  totalNetWeight: items.reduce(
    (sum, item) => sum + cleanNumber(item.netWeight),
    0
  ),
  subtotal: items.reduce(
    (sum, item) => sum + cleanNumber(item.amount),
    0
  ),
});

const removeDeliveryChallanStockLedger = async (challanId) => {
  await StockLedger.deleteMany({
    sourceModule: "DeliveryChallan",
    referenceModel: "DeliveryChallan",
    referenceId: challanId,
  });
};

const ensureItemsCanPostStock = (items = [], status) => {
  if (!shouldPostStock(status)) return;

  for (const item of items) {
    if (cleanNumber(item.quantity) > 0 && !item.item) {
      throw new Error(
        `Item Master ID is missing for "${cleanText(
          item.description
        )}". Stock cannot be posted.`
      );
    }

    if (!cleanText(item.warehouse)) {
      throw new Error(`Warehouse is missing for "${cleanText(item.description)}".`);
    }
  }
};

const syncDeliveryChallanStockLedger = async (challan) => {
  await removeDeliveryChallanStockLedger(challan._id);

  if (!shouldPostStock(challan.status) || challan.status === "Cancelled") {
    return;
  }

  for (const item of challan.items || []) {
    const qtyOut = cleanNumber(item.quantity);
    if (qtyOut <= 0) continue;

    if (!item.item) {
      throw new Error(
        `Item Master ID is missing for "${cleanText(
          item.description
        )}". Stock ledger cannot be posted.`
      );
    }

    await postStockMovement({
      item: item.item,
      warehouse: item.warehouse || challan.warehouse || "Main Godown",
      date: challan.dispatchDate || challan.challanDate,
      movementType: "Delivery Challan Out",
      sourceModule: "DeliveryChallan",
      referenceModel: "DeliveryChallan",
      referenceId: challan._id,
      referenceNo: challan.challanNo,
      qtyOut,
      rate: cleanNumber(item.unitPrice),
      remarks: `Delivery Challan ${challan.challanNo} against Sales Order ${challan.salesOrderNo}`,
    });
  }
};

const updateSalesOrderDeliveryStatus = async (salesOrderId) => {
  const salesOrder = await SalesOrder.findById(salesOrderId);

  if (!salesOrder || salesOrder.status === "Cancelled") return;

  const deliveredQtyMap = await getDeliveredQtyMap(salesOrderId);

  let totalOrdered = 0;
  let totalDelivered = 0;

  const updatedItems = (salesOrder.items || []).map((item) => {
    const orderedQty = cleanNumber(item.quantity);
    const deliveredQty = getDeliveredQtyForSOItem(item, deliveredQtyMap);
    const pendingQty = Math.max(orderedQty - deliveredQty, 0);

    totalOrdered += orderedQty;
    totalDelivered += deliveredQty;

    return {
      ...item.toObject(),
      deliveredQty,
      pendingQty,
    };
  });

  let status;

  if (totalDelivered <= 0) {
    status = salesOrder.status === "Draft" ? "Draft" : "Confirmed";
  } else if (totalDelivered >= totalOrdered && totalOrdered > 0) {
    status = "Delivered";
  } else {
    status = "Partially Delivered";
  }

  await SalesOrder.findByIdAndUpdate(
    salesOrderId,
    { items: updatedItems, status },
    { new: true, runValidators: true }
  );
};

const populateDeliveryChallan = (query) =>
  query
    .populate(
      "salesOrder",
      "salesOrderNo orderDate deliveryDate status grandTotal balance items customerName customerPhone customerEmail customerAddress customerCity poNo"
    )
    .populate("customer", "customerName phoneNumber email address city")
    .populate(
      "items.item",
      "code name unit category brand purchasePrice salePrice"
    );

const buildCustomerDetails = (body, selectedOrder) => {
  const customerName =
    cleanText(body.customerName) || cleanText(selectedOrder.customerName);

  const contactPhone =
    cleanText(body.contactPhone || body.customerPhone) ||
    cleanText(selectedOrder.customerPhone);

  const deliveryAddress =
    cleanText(body.deliveryAddress || body.customerAddress) ||
    cleanText(selectedOrder.customerAddress);

  return {
    customerName,
    customerPhone: contactPhone,
    contactPhone,
    customerEmail:
      cleanText(body.customerEmail) || cleanText(selectedOrder.customerEmail),
    customerAddress: deliveryAddress,
    deliveryAddress,
    customerCity:
      cleanText(body.customerCity) || cleanText(selectedOrder.customerCity),
  };
};

router.get("/next-no", async (req, res) => {
  try {
    const companyProfile = normalizeCompanyProfile(
      req.query.companyProfile || "topical"
    );
    const profile = COMPANY_PROFILES[companyProfile];
    const challanNo = await peekNextChallanNo(companyProfile);

    res.status(200).json({
      success: true,
      challanNo,
      deliveryChallanNo: challanNo,
      companyProfile,
      companyName: profile.name,
      templateType: profile.templateType,
    });
  } catch (error) {
    console.error("Delivery Challan Next No Error:", error);

    res.status(400).json({
      success: false,
      message: "Delivery challan number could not be generated.",
      error: error.message,
    });
  }
});

router.get("/all", async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      salesOrder = "",
      customer = "",
      companyProfile = "",
    } = req.query;

    const query = {};

    if (status && status !== "All") query.status = status;
    if (salesOrder) query.salesOrder = salesOrder;
    if (customer) query.customer = customer;

    if (companyProfile && companyProfile !== "All") {
      query.companyProfile = normalizeCompanyProfile(companyProfile);
    }

    if (search) {
      query.$or = [
        { challanNo: { $regex: search, $options: "i" } },
        { companyName: { $regex: search, $options: "i" } },
        { companyShortName: { $regex: search, $options: "i" } },
        { salesOrderNo: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
        { contactPhone: { $regex: search, $options: "i" } },
        { attentionTo: { $regex: search, $options: "i" } },
        { referenceNo: { $regex: search, $options: "i" } },
        { poNo: { $regex: search, $options: "i" } },
        { vehicleNo: { $regex: search, $options: "i" } },
        { "items.description": { $regex: search, $options: "i" } },
        { "items.warehouse": { $regex: search, $options: "i" } },
      ];
    }

    const challans = await populateDeliveryChallan(
      DeliveryChallan.find(query).sort({ createdAt: -1 })
    );

    res.status(200).json(challans);
  } catch (error) {
    console.error("Delivery Challans Load Error:", error);

    res.status(500).json({
      success: false,
      message: "Delivery challans could not be loaded.",
      error: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const challan = await populateDeliveryChallan(
      DeliveryChallan.findById(req.params.id)
    );

    if (!challan) {
      return res.status(404).json({
        success: false,
        message: "Delivery challan not found.",
      });
    }

    res.status(200).json({ success: true, data: challan });
  } catch (error) {
    console.error("Delivery Challan Single Load Error:", error);

    res.status(500).json({
      success: false,
      message: "Delivery challan could not be loaded.",
      error: error.message,
    });
  }
});

router.post("/add", async (req, res) => {
  let savedChallan = null;

  try {
    const body = req.body || {};

    if (!body.salesOrder) {
      return res.status(400).json({
        success: false,
        message: "Sales Order is required.",
      });
    }

    if (!body.challanDate) {
      return res.status(400).json({
        success: false,
        message: "Challan date is required.",
      });
    }

    const companyProfile = normalizeCompanyProfile(body.companyProfile);
    const profile = COMPANY_PROFILES[companyProfile];
    const selectedOrder = await SalesOrder.findById(body.salesOrder);

    if (!selectedOrder) {
      return res.status(404).json({
        success: false,
        message: "Sales Order not found.",
      });
    }

    if (selectedOrder.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "A challan cannot be created for a cancelled sales order.",
      });
    }

    if (["Delivered", "Invoiced"].includes(selectedOrder.status)) {
      return res.status(400).json({
        success: false,
        message: "This sales order is already delivered or invoiced.",
      });
    }

    if (!selectedOrder.customer) {
      return res.status(400).json({
        success: false,
        message: "The selected sales order has no customer reference.",
      });
    }

    const finalStatus = allowedStatuses.includes(body.status)
      ? body.status
      : "Draft";

    const cleanItems = await cleanDeliveryItems({
      items: body.items || [],
      salesOrder: selectedOrder,
    });

    if (cleanItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add at least one valid delivery item.",
      });
    }

    ensureItemsCanPostStock(cleanItems, finalStatus);

    const totals = calculateTotals(cleanItems);
    const customerDetails = buildCustomerDetails(body, selectedOrder);

    if (!customerDetails.customerName) {
      return res.status(400).json({
        success: false,
        message: "Customer name is required.",
      });
    }

    // Always generated on the server. The frontend number is only a preview.
    const finalChallanNo = await getNextChallanNo(companyProfile);

    const challan = new DeliveryChallan({
      companyProfile,
      companyName: profile.name,
      companyShortName: profile.shortName,
      templateType: profile.templateType,
      companyAddress: profile.address,
      companyPhone: profile.phone,
      challanNo: finalChallanNo,

      salesOrder: selectedOrder._id,
      salesOrderNo: selectedOrder.salesOrderNo,

      customer: selectedOrder.customer,
      ...customerDetails,

      challanDate: cleanText(body.challanDate),
      dispatchDate:
        cleanText(body.dispatchDate) || cleanText(body.challanDate),
      receivedDate: cleanText(body.receivedDate),

      poNo: cleanText(body.poNo || selectedOrder.poNo),
      referenceNo: cleanText(body.referenceNo),
      attentionTo: cleanText(body.attentionTo),

      vehicleNo: companyProfile === "topical" ? cleanText(body.vehicleNo) : "",
      driverName:
        companyProfile === "topical" ? cleanText(body.driverName) : "",
      driverPhone:
        companyProfile === "topical" ? cleanText(body.driverPhone) : "",

      preparedBy: cleanText(body.preparedBy),
      dispatchedBy: cleanText(body.dispatchedBy || body.deliveredBy),
      deliveredBy: cleanText(body.dispatchedBy || body.deliveredBy),
      receivedBy: cleanText(body.receivedBy),
      receiverDesignation: cleanText(body.receiverDesignation),

      warehouse:
        cleanText(body.warehouse || cleanItems[0]?.warehouse, "Main Godown") ||
        "Main Godown",

      items: cleanItems,
      ...totals,

      status: finalStatus,
      remarks: cleanText(body.remarks),
    });

    savedChallan = await challan.save();

    await syncDeliveryChallanStockLedger(savedChallan);
    await updateSalesOrderDeliveryStatus(selectedOrder._id);

    const populatedChallan = await populateDeliveryChallan(
      DeliveryChallan.findById(savedChallan._id)
    );

    res.status(201).json({
      success: true,
      message: "Delivery challan created successfully.",
      data: populatedChallan,
    });
  } catch (error) {
    console.error("Delivery Challan Add Error:", error);

    if (savedChallan?._id) {
      await removeDeliveryChallanStockLedger(savedChallan._id);
      await DeliveryChallan.findByIdAndDelete(savedChallan._id);
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "The delivery challan number already exists.",
      });
    }

    res.status(400).json({
      success: false,
      message: "Delivery challan could not be saved.",
      error: error.message,
    });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    const body = req.body || {};
    const existingChallan = await DeliveryChallan.findById(req.params.id);

    if (!existingChallan) {
      return res.status(404).json({
        success: false,
        message: "Delivery challan not found.",
      });
    }

    if (existingChallan.invoiceStatus === "Invoiced") {
      return res.status(400).json({
        success: false,
        message: "An invoiced delivery challan cannot be updated.",
      });
    }

    const previousSalesOrderId = getId(existingChallan.salesOrder);
    const selectedOrder = await SalesOrder.findById(
      body.salesOrder || existingChallan.salesOrder
    );

    if (!selectedOrder) {
      return res.status(404).json({
        success: false,
        message: "Sales Order not found.",
      });
    }

    if (selectedOrder.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "A challan cannot be updated against a cancelled sales order.",
      });
    }

    const companyProfile = normalizeCompanyProfile(
      existingChallan.companyProfile || body.companyProfile || "topical"
    );
    const profile = COMPANY_PROFILES[companyProfile];
    const finalStatus = allowedStatuses.includes(body.status)
      ? body.status
      : existingChallan.status;

    const cleanItems = await cleanDeliveryItems({
      items: body.items || existingChallan.items,
      salesOrder: selectedOrder,
      excludeChallanId: existingChallan._id,
    });

    if (cleanItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Add at least one valid delivery item.",
      });
    }

    ensureItemsCanPostStock(cleanItems, finalStatus);

    const totals = calculateTotals(cleanItems);
    const customerDetails = buildCustomerDetails(body, selectedOrder);

    const updatedChallan = await populateDeliveryChallan(
      DeliveryChallan.findByIdAndUpdate(
        req.params.id,
        {
          companyProfile,
          companyName: profile.name,
          companyShortName: profile.shortName,
          templateType: profile.templateType,
          companyAddress: profile.address,
          companyPhone: profile.phone,

          // Number and company profile remain stable after creation.
          challanNo: existingChallan.challanNo,

          salesOrder: selectedOrder._id,
          salesOrderNo: selectedOrder.salesOrderNo,
          customer: selectedOrder.customer,
          ...customerDetails,

          challanDate: cleanText(
            body.challanDate || existingChallan.challanDate
          ),
          dispatchDate:
            cleanText(body.dispatchDate) ||
            cleanText(body.challanDate || existingChallan.challanDate),
          receivedDate: cleanText(body.receivedDate),

          poNo: cleanText(body.poNo || selectedOrder.poNo),
          referenceNo: cleanText(body.referenceNo),
          attentionTo: cleanText(body.attentionTo),

          vehicleNo:
            companyProfile === "topical" ? cleanText(body.vehicleNo) : "",
          driverName:
            companyProfile === "topical" ? cleanText(body.driverName) : "",
          driverPhone:
            companyProfile === "topical" ? cleanText(body.driverPhone) : "",

          preparedBy: cleanText(body.preparedBy),
          dispatchedBy: cleanText(body.dispatchedBy || body.deliveredBy),
          deliveredBy: cleanText(body.dispatchedBy || body.deliveredBy),
          receivedBy: cleanText(body.receivedBy),
          receiverDesignation: cleanText(body.receiverDesignation),

          warehouse:
            cleanText(body.warehouse || cleanItems[0]?.warehouse, "Main Godown") ||
            "Main Godown",

          items: cleanItems,
          ...totals,
          status: finalStatus,
          remarks: cleanText(body.remarks),
        },
        { new: true, runValidators: true }
      )
    );

    await syncDeliveryChallanStockLedger(updatedChallan);
    await updateSalesOrderDeliveryStatus(selectedOrder._id);

    if (previousSalesOrderId && previousSalesOrderId !== getId(selectedOrder._id)) {
      await updateSalesOrderDeliveryStatus(previousSalesOrderId);
    }

    res.status(200).json({
      success: true,
      message: "Delivery challan updated successfully.",
      data: updatedChallan,
    });
  } catch (error) {
    console.error("Delivery Challan Update Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "The delivery challan number already exists.",
      });
    }

    res.status(400).json({
      success: false,
      message: "Delivery challan could not be updated.",
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
        message: "Invalid status.",
      });
    }

    const existingChallan = await DeliveryChallan.findById(req.params.id);

    if (!existingChallan) {
      return res.status(404).json({
        success: false,
        message: "Delivery challan not found.",
      });
    }

    if (existingChallan.invoiceStatus === "Invoiced") {
      return res.status(400).json({
        success: false,
        message: "The status of an invoiced challan cannot be changed.",
      });
    }

    let update = { status };

    // Revalidate quantities before a Draft challan starts affecting stock.
    if (shouldPostStock(status)) {
      const selectedOrder = await SalesOrder.findById(existingChallan.salesOrder);

      if (!selectedOrder) {
        return res.status(404).json({
          success: false,
          message: "Sales Order not found.",
        });
      }

      const cleanItems = await cleanDeliveryItems({
        items: existingChallan.items || [],
        salesOrder: selectedOrder,
        excludeChallanId: existingChallan._id,
      });

      ensureItemsCanPostStock(cleanItems, status);

      update = {
        status,
        items: cleanItems,
        ...calculateTotals(cleanItems),
      };
    }

    const challan = await populateDeliveryChallan(
      DeliveryChallan.findByIdAndUpdate(req.params.id, update, {
        new: true,
        runValidators: true,
      })
    );

    await syncDeliveryChallanStockLedger(challan);
    await updateSalesOrderDeliveryStatus(
      challan.salesOrder?._id || challan.salesOrder
    );

    res.status(200).json({
      success: true,
      message: "Status updated successfully.",
      data: challan,
    });
  } catch (error) {
    console.error("Delivery Challan Status Error:", error);

    res.status(400).json({
      success: false,
      message: "Status could not be updated.",
      error: error.message,
    });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    const challan = await DeliveryChallan.findById(req.params.id);

    if (!challan) {
      return res.status(404).json({
        success: false,
        message: "Delivery challan not found.",
      });
    }

    if (challan.invoiceStatus === "Invoiced") {
      return res.status(400).json({
        success: false,
        message: "An invoiced delivery challan cannot be deleted.",
      });
    }

    const salesOrderId = challan.salesOrder;

    await removeDeliveryChallanStockLedger(challan._id);
    await DeliveryChallan.findByIdAndDelete(req.params.id);
    await updateSalesOrderDeliveryStatus(salesOrderId);

    res.status(200).json({
      success: true,
      message: "Delivery challan deleted successfully.",
    });
  } catch (error) {
    console.error("Delivery Challan Delete Error:", error);

    res.status(500).json({
      success: false,
      message: "Delivery challan could not be deleted.",
      error: error.message,
    });
  }
});

module.exports = router;
