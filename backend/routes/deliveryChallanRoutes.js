const express = require("express");
const router = express.Router();

const DeliveryChallan = require("../models/DeliveryChallan");
const SalesOrder = require("../models/SalesOrder");
const Counter = require("../models/Counter");
const StockLedger = require("../models/StockLedger");
const { postStockMovement } = require("../utils/stockService");

const allowedStatuses = ["Draft", "Dispatched", "Received", "Cancelled"];
const stockPostingStatuses = ["Dispatched", "Received"];
const allowedTextTypes = ["", "with-text", "without-text"];

const shouldPostStock = (status) => stockPostingStatuses.includes(status);

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
};

const getNextChallanNo = async () => {
  let challanNo = "";

  for (let i = 0; i < 5; i++) {
    const counter = await Counter.findOneAndUpdate(
      { name: "deliveryChallanNo" },
      { $inc: { seq: 1 } },
      {
        returnDocument: "after",
        upsert: true,
      }
    );

    challanNo = `DC-${String(counter.seq).padStart(4, "0")}`;

    const exists = await DeliveryChallan.findOne({ challanNo });
    if (!exists) return challanNo;
  }

  throw new Error("Unable to generate unique delivery challan number");
};

const peekNextChallanNo = async () => {
  const counter = await Counter.findOne({ name: "deliveryChallanNo" });
  const nextSeq = counter ? counter.seq + 1 : 1;

  return `DC-${String(nextSeq).padStart(4, "0")}`;
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
        String(item.warehouse || "Main Godown").trim().toLowerCase(),
        String(item.size || "").trim().toLowerCase(),
        String(item.unit || "").trim().toLowerCase(),
        String(item.textType || "").trim().toLowerCase(),
      ].join("|")
    );
  }

  keys.push(
    [
      String(item.description || "").trim().toLowerCase(),
      String(item.warehouse || "Main Godown").trim().toLowerCase(),
      String(item.size || "").trim().toLowerCase(),
      String(item.unit || "").trim().toLowerCase(),
      String(item.textType || "").trim().toLowerCase(),
    ].join("|")
  );

  return keys;
};

const getSalesOrderItemsMap = (salesOrderItems = []) => {
  const map = new Map();

  salesOrderItems.forEach((item) => {
    const data = {
      salesOrderItemId: item._id || item.salesOrderItemId || null,
      item: item.item || null,
      warehouse: item.warehouse || "Main Godown",

      description: item.description || "",
      size: item.size || "",
      textType: item.textType || "",

      orderedQty: Number(item.quantity || 0),
      deliveredQty: Number(item.deliveredQty || 0),
      pendingQty:
        item.pendingQty !== undefined
          ? Number(item.pendingQty || 0)
          : Math.max(Number(item.quantity || 0) - Number(item.deliveredQty || 0), 0),

      cartons: Number(item.cartons || 0),
      unit: item.unit || "Rolls",
      unitPrice: Number(item.unitPrice || 0),
    };

    getSalesOrderItemKeys(item).forEach((key) => {
      if (key) map.set(key, data);
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

  const previousChallans = await DeliveryChallan.find(query);
  const map = new Map();

  previousChallans.forEach((challan) => {
    (challan.items || []).forEach((item) => {
      const keys = getSalesOrderItemKeys(item);
      const primaryKey = keys[0];

      if (!primaryKey) return;

      const previous = map.get(primaryKey) || 0;
      map.set(primaryKey, previous + Number(item.quantity || 0));
    });
  });

  return map;
};

const getDeliveredQtyForSOItem = (salesOrderItem, deliveredQtyMap) => {
  const keys = getSalesOrderItemKeys(salesOrderItem);

  for (const key of keys) {
    if (deliveredQtyMap.has(key)) {
      return Number(deliveredQtyMap.get(key) || 0);
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
    if (!item || !String(item.description || "").trim()) continue;

    const quantity = Number(item.quantity || 0);
    if (quantity <= 0) continue;

    const salesOrderItem = findSalesOrderItem(item, salesOrderItemsMap);

    if (!salesOrderItem) {
      throw new Error(`Item "${item.description}" sales order mein nahi mila`);
    }

    const salesOrderItemId = getId(
      item.salesOrderItemId || salesOrderItem.salesOrderItemId
    );

    const primaryKey = `so-row:${salesOrderItemId}`;
    const alreadyDeliveredQty = Number(deliveredQtyMap.get(primaryKey) || 0);

    const orderedQty = Number(salesOrderItem.orderedQty || 0);
    const pendingBeforeThisChallan = Math.max(
      orderedQty - alreadyDeliveredQty,
      0
    );

    if (quantity > pendingBeforeThisChallan) {
      throw new Error(
        `Item "${item.description}" ki delivery quantity zyada hai. Pending qty sirf ${pendingBeforeThisChallan} ${salesOrderItem.unit} hai`
      );
    }

    const unitPrice = Number(item.unitPrice ?? salesOrderItem.unitPrice ?? 0);
    const amount = quantity * unitPrice;

    cleanItems.push({
      salesOrderItemId: salesOrderItemId || null,

      item: item.item || salesOrderItem.item || null,
      warehouse: String(
        item.warehouse || salesOrderItem.warehouse || "Main Godown"
      ).trim(),

      description: String(
        item.description || salesOrderItem.description || ""
      ).trim(),

      size: String(item.size || salesOrderItem.size || "").trim(),

      textType: allowedTextTypes.includes(item.textType)
        ? item.textType
        : allowedTextTypes.includes(salesOrderItem.textType)
        ? salesOrderItem.textType
        : "",

      orderedQty,
      alreadyDeliveredQty,
      pendingQty: Math.max(pendingBeforeThisChallan - quantity, 0),

      cartons: Number(item.cartons || 0),
      quantity,

      unit: String(item.unit || salesOrderItem.unit || "Rolls").trim(),
      unitPrice,
      amount,

      remarks: String(item.remarks || "").trim(),
    });
  }

  return cleanItems;
};

const calculateTotals = (items = []) => {
  const totalCartons = items.reduce(
    (sum, item) => sum + Number(item.cartons || 0),
    0
  );

  const totalQuantity = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );

  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  return {
    totalCartons,
    totalQuantity,
    subtotal,
  };
};

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
    if (Number(item.quantity || 0) > 0 && !item.item) {
      throw new Error(
        `Item "${item.description}" ka Item Master ID missing hai. Stock minus nahi ho sakta.`
      );
    }

    if (!item.warehouse) {
      throw new Error(`Item "${item.description}" ka warehouse missing hai`);
    }
  }
};

const syncDeliveryChallanStockLedger = async (challan) => {
  await removeDeliveryChallanStockLedger(challan._id);

  if (!shouldPostStock(challan.status)) return;
  if (challan.status === "Cancelled") return;

  for (const item of challan.items || []) {
    const qtyOut = Number(item.quantity || 0);

    if (qtyOut <= 0) continue;

    if (!item.item) {
      throw new Error(
        `Item "${item.description}" ka Item Master ID missing hai. Stock ledger post nahi ho sakta.`
      );
    }

    await postStockMovement({
      item: item.item,
      warehouse: item.warehouse || challan.warehouse || "Main Godown",
      date: challan.challanDate,
      movementType: "Delivery Challan Out",
      sourceModule: "DeliveryChallan",
      referenceModel: "DeliveryChallan",
      referenceId: challan._id,
      referenceNo: challan.challanNo,
      qtyOut,
      rate: Number(item.unitPrice || 0),
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
    const orderedQty = Number(item.quantity || 0);
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

  let status = salesOrder.status;

  if (totalDelivered <= 0) {
    status = salesOrder.status === "Draft" ? "Draft" : "Confirmed";
  } else if (totalDelivered >= totalOrdered) {
    status = "Delivered";
  } else {
    status = "Partially Delivered";
  }

  await SalesOrder.findByIdAndUpdate(
    salesOrderId,
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

const populateDeliveryChallan = (query) => {
  return query
    .populate(
      "salesOrder",
      "salesOrderNo orderDate deliveryDate status grandTotal balance items"
    )
    .populate("customer", "customerName phoneNumber email address city")
    .populate("items.item", "code name unit category brand purchasePrice salePrice");
};

router.get("/next-no", async (req, res) => {
  try {
    const challanNo = await peekNextChallanNo();

    res.status(200).json({
      success: true,
      challanNo,
    });
  } catch (error) {
    console.error("Delivery Challan Next No Error:", error);

    res.status(500).json({
      success: false,
      message: "Delivery challan number generate nahi hua",
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
    } = req.query;

    const query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (salesOrder) {
      query.salesOrder = salesOrder;
    }

    if (customer) {
      query.customer = customer;
    }

    if (search) {
      query.$or = [
        { challanNo: { $regex: search, $options: "i" } },
        { salesOrderNo: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
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
      message: "Delivery challans load nahi huay",
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
        message: "Delivery challan not found",
      });
    }

    res.status(200).json({
      success: true,
      data: challan,
    });
  } catch (error) {
    console.error("Delivery Challan Single Load Error:", error);

    res.status(500).json({
      success: false,
      message: "Delivery challan load nahi hua",
      error: error.message,
    });
  }
});

router.post("/add", async (req, res) => {
  let savedChallan = null;

  try {
    const {
      challanNo,
      salesOrder,
      challanDate,
      poNo,
      vehicleNo,
      driverName,
      driverPhone,
      deliveredBy,
      receivedBy,
      warehouse,
      status,
      remarks,
      items,
    } = req.body;

    if (!salesOrder) {
      return res.status(400).json({
        success: false,
        message: "Sales Order required hai",
      });
    }

    if (!challanDate) {
      return res.status(400).json({
        success: false,
        message: "Challan date required hai",
      });
    }

    const selectedOrder = await SalesOrder.findById(salesOrder);

    if (!selectedOrder) {
      return res.status(404).json({
        success: false,
        message: "Sales Order not found",
      });
    }

    if (selectedOrder.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled sales order ka delivery challan nahi ban sakta",
      });
    }

    if (["Delivered", "Invoiced"].includes(selectedOrder.status)) {
      return res.status(400).json({
        success: false,
        message: "Ye sales order already delivered/invoiced hai",
      });
    }

    const finalStatus = allowedStatuses.includes(status) ? status : "Draft";

    const cleanItems = await cleanDeliveryItems({
      items: items || [],
      salesOrder: selectedOrder,
    });

    if (cleanItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please at least one valid delivery item add karein",
      });
    }

    ensureItemsCanPostStock(cleanItems, finalStatus);

    const totals = calculateTotals(cleanItems);

    const finalChallanNo = challanNo
      ? String(challanNo).trim().toUpperCase()
      : await getNextChallanNo();

    const challan = new DeliveryChallan({
      challanNo: finalChallanNo,

      salesOrder: selectedOrder._id,
      salesOrderNo: selectedOrder.salesOrderNo,

      customer: selectedOrder.customer,
      customerName: selectedOrder.customerName,
      customerPhone: selectedOrder.customerPhone || "",
      customerEmail: selectedOrder.customerEmail || "",
      customerAddress: selectedOrder.customerAddress || "",
      customerCity: selectedOrder.customerCity || "",

      challanDate,
      poNo: poNo || selectedOrder.poNo || "",

      vehicleNo: vehicleNo || "",
      driverName: driverName || "",
      driverPhone: driverPhone || "",
      deliveredBy: deliveredBy || "",
      receivedBy: receivedBy || "",

      warehouse: warehouse || cleanItems[0]?.warehouse || "Main Godown",

      items: cleanItems,

      totalCartons: totals.totalCartons,
      totalQuantity: totals.totalQuantity,
      subtotal: totals.subtotal,

      status: finalStatus,
      remarks: remarks || "",
    });

    savedChallan = await challan.save();

    await syncDeliveryChallanStockLedger(savedChallan);
    await updateSalesOrderDeliveryStatus(selectedOrder._id);

    const populatedChallan = await populateDeliveryChallan(
      DeliveryChallan.findById(savedChallan._id)
    );

    res.status(201).json({
      success: true,
      message: "Delivery challan created successfully",
      data: populatedChallan,
    });
  } catch (error) {
    console.error("Delivery Challan Add Error:", error);

    if (savedChallan?._id) {
      await removeDeliveryChallanStockLedger(savedChallan._id);
      await DeliveryChallan.findByIdAndDelete(savedChallan._id);
    }

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ye delivery challan number already used hai",
      });
    }

    res.status(400).json({
      success: false,
      message: "Delivery challan save nahi hua",
      error: error.message,
    });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    const existingChallan = await DeliveryChallan.findById(req.params.id);

    if (!existingChallan) {
      return res.status(404).json({
        success: false,
        message: "Delivery challan not found",
      });
    }

    if (existingChallan.invoiceStatus === "Invoiced") {
      return res.status(400).json({
        success: false,
        message: "Invoiced delivery challan update nahi ho sakta",
      });
    }

    const selectedOrder = await SalesOrder.findById(
      req.body.salesOrder || existingChallan.salesOrder
    );

    if (!selectedOrder) {
      return res.status(404).json({
        success: false,
        message: "Sales Order not found",
      });
    }

    if (selectedOrder.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled sales order ka challan update nahi ho sakta",
      });
    }

    const finalStatus = allowedStatuses.includes(req.body.status)
      ? req.body.status
      : existingChallan.status;

    const cleanItems = await cleanDeliveryItems({
      items: req.body.items || existingChallan.items,
      salesOrder: selectedOrder,
      excludeChallanId: existingChallan._id,
    });

    if (cleanItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please at least one valid delivery item add karein",
      });
    }

    ensureItemsCanPostStock(cleanItems, finalStatus);

    const totals = calculateTotals(cleanItems);

    const updatedChallan = await populateDeliveryChallan(
      DeliveryChallan.findByIdAndUpdate(
        req.params.id,
        {
          challanNo: req.body.challanNo
            ? String(req.body.challanNo).trim().toUpperCase()
            : existingChallan.challanNo,

          salesOrder: selectedOrder._id,
          salesOrderNo: selectedOrder.salesOrderNo,

          customer: selectedOrder.customer,
          customerName: selectedOrder.customerName,
          customerPhone: selectedOrder.customerPhone || "",
          customerEmail: selectedOrder.customerEmail || "",
          customerAddress: selectedOrder.customerAddress || "",
          customerCity: selectedOrder.customerCity || "",

          challanDate: req.body.challanDate || existingChallan.challanDate,
          poNo: req.body.poNo || selectedOrder.poNo || "",

          vehicleNo: req.body.vehicleNo || "",
          driverName: req.body.driverName || "",
          driverPhone: req.body.driverPhone || "",
          deliveredBy: req.body.deliveredBy || "",
          receivedBy: req.body.receivedBy || "",

          warehouse: req.body.warehouse || cleanItems[0]?.warehouse || "Main Godown",

          items: cleanItems,

          totalCartons: totals.totalCartons,
          totalQuantity: totals.totalQuantity,
          subtotal: totals.subtotal,

          status: finalStatus,

          remarks: req.body.remarks || "",
        },
        {
          returnDocument: "after",
          runValidators: true,
        }
      )
    );

    await syncDeliveryChallanStockLedger(updatedChallan);
    await updateSalesOrderDeliveryStatus(selectedOrder._id);

    res.status(200).json({
      success: true,
      message: "Delivery challan updated successfully",
      data: updatedChallan,
    });
  } catch (error) {
    console.error("Delivery Challan Update Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ye delivery challan number already used hai",
      });
    }

    res.status(400).json({
      success: false,
      message: "Delivery challan update nahi hua",
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

    const existingChallan = await DeliveryChallan.findById(req.params.id);

    if (!existingChallan) {
      return res.status(404).json({
        success: false,
        message: "Delivery challan not found",
      });
    }

    if (existingChallan.invoiceStatus === "Invoiced") {
      return res.status(400).json({
        success: false,
        message: "Invoiced delivery challan status update nahi ho sakta",
      });
    }

    ensureItemsCanPostStock(existingChallan.items || [], status);

    const challan = await populateDeliveryChallan(
      DeliveryChallan.findByIdAndUpdate(
        req.params.id,
        { status },
        {
          returnDocument: "after",
          runValidators: true,
        }
      )
    );

    await syncDeliveryChallanStockLedger(challan);
    await updateSalesOrderDeliveryStatus(challan.salesOrder._id || challan.salesOrder);

    res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: challan,
    });
  } catch (error) {
    console.error("Delivery Challan Status Error:", error);

    res.status(400).json({
      success: false,
      message: "Status update nahi hua",
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
        message: "Delivery challan not found",
      });
    }

    if (challan.invoiceStatus === "Invoiced") {
      return res.status(400).json({
        success: false,
        message: "Invoiced delivery challan delete nahi ho sakta",
      });
    }

    const salesOrderId = challan.salesOrder;

    await removeDeliveryChallanStockLedger(challan._id);
    await DeliveryChallan.findByIdAndDelete(req.params.id);
    await updateSalesOrderDeliveryStatus(salesOrderId);

    res.status(200).json({
      success: true,
      message: "Delivery challan deleted successfully",
    });
  } catch (error) {
    console.error("Delivery Challan Delete Error:", error);

    res.status(500).json({
      success: false,
      message: "Delivery challan delete nahi hua",
      error: error.message,
    });
  }
});

module.exports = router;