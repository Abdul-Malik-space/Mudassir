const express = require("express");
const router = express.Router();

const DeliveryChallan = require("../models/DeliveryChallan");
const SalesOrder = require("../models/SalesOrder");
const Counter = require("../models/Counter");

const allowedStatuses = ["Draft", "Dispatched", "Received", "Cancelled"];

const getNextChallanNo = async () => {
  let challanNo = "";

  for (let i = 0; i < 5; i++) {
    const counter = await Counter.findOneAndUpdate(
      { name: "deliveryChallanNo" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
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

const makeItemKey = (item) => {
  return [
    String(item.description || "").trim().toLowerCase(),
    String(item.size || "").trim().toLowerCase(),
    String(item.unit || "").trim().toLowerCase(),
    String(item.textType || "").trim().toLowerCase(),
  ].join("|");
};

const cleanDeliveryItems = (items = []) => {
  return items
    .filter(
      (item) =>
        item &&
        String(item.description || "").trim() &&
        Number(item.quantity || 0) > 0
    )
    .map((item) => {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unitPrice || 0);
      const amount = quantity * unitPrice;

      return {
        item: item.item || null,
        description: String(item.description || "").trim(),
        size: String(item.size || "").trim(),
        textType: item.textType || "",
        cartons: Number(item.cartons || 0),
        quantity,
        unit: String(item.unit || "Rolls").trim(),
        unitPrice,
        amount,
        remarks: String(item.remarks || "").trim(),
      };
    });
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

const getOrderedQtyMap = (salesOrderItems = []) => {
  const map = new Map();

  salesOrderItems.forEach((item) => {
    const key = makeItemKey(item);
    const previous = map.get(key) || 0;
    map.set(key, previous + Number(item.quantity || 0));
  });

  return map;
};

const getDeliveredQtyMap = async (salesOrderId, excludeChallanId = null) => {
  const query = {
    salesOrder: salesOrderId,
    status: { $ne: "Cancelled" },
  };

  if (excludeChallanId) {
    query._id = { $ne: excludeChallanId };
  }

  const previousChallans = await DeliveryChallan.find(query);

  const map = new Map();

  previousChallans.forEach((challan) => {
    challan.items.forEach((item) => {
      const key = makeItemKey(item);
      const previous = map.get(key) || 0;
      map.set(key, previous + Number(item.quantity || 0));
    });
  });

  return map;
};

const validateDeliveryAgainstSalesOrder = async ({
  salesOrder,
  deliveryItems,
  excludeChallanId = null,
}) => {
  const orderedQtyMap = getOrderedQtyMap(salesOrder.items || []);
  const deliveredQtyMap = await getDeliveredQtyMap(
    salesOrder._id,
    excludeChallanId
  );

  for (const item of deliveryItems) {
    const key = makeItemKey(item);

    const orderedQty = orderedQtyMap.get(key) || 0;
    const alreadyDeliveredQty = deliveredQtyMap.get(key) || 0;
    const currentDeliveryQty = Number(item.quantity || 0);

    if (orderedQty <= 0) {
      return {
        valid: false,
        message: `Item "${item.description}" sales order mein nahi mila`,
      };
    }

    if (alreadyDeliveredQty + currentDeliveryQty > orderedQty) {
      const pendingQty = orderedQty - alreadyDeliveredQty;

      return {
        valid: false,
        message: `Item "${item.description}" ki delivery quantity zyada hai. Pending qty sirf ${pendingQty} ${item.unit} hai`,
      };
    }
  }

  return {
    valid: true,
  };
};

const getSalesOrderDeliveryStatus = async (salesOrder) => {
  const orderedQtyMap = getOrderedQtyMap(salesOrder.items || []);
  const deliveredQtyMap = await getDeliveredQtyMap(salesOrder._id);

  let orderedTotal = 0;
  let deliveredTotal = 0;

  orderedQtyMap.forEach((qty, key) => {
    orderedTotal += Number(qty || 0);
    deliveredTotal += Number(deliveredQtyMap.get(key) || 0);
  });

  if (deliveredTotal <= 0) return "Confirmed";
  if (deliveredTotal >= orderedTotal) return "Delivered";
  return "Partially Delivered";
};

const updateSalesOrderDeliveryStatus = async (salesOrderId) => {
  const salesOrder = await SalesOrder.findById(salesOrderId);

  if (!salesOrder || salesOrder.status === "Cancelled") return;

  const status = await getSalesOrderDeliveryStatus(salesOrder);

  await SalesOrder.findByIdAndUpdate(salesOrderId, {
    status,
  });
};

// Next DC no
router.get("/next-no", async (req, res) => {
  try {
    const challanNo = await peekNextChallanNo();

    res.status(200).json({
      success: true,
      challanNo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Delivery challan number generate nahi hua",
      error: error.message,
    });
  }
});

// All challans
router.get("/all", async (req, res) => {
  try {
    const { search = "", status = "", salesOrder = "", customer = "" } = req.query;

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
      ];
    }

    const challans = await DeliveryChallan.find(query)
      .populate(
        "salesOrder",
        "salesOrderNo orderDate deliveryDate status grandTotal balance"
      )
      .populate("customer", "customerName phoneNumber email address city")
      .sort({ createdAt: -1 });

    res.status(200).json(challans);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Delivery challans load nahi huay",
      error: error.message,
    });
  }
});

// Single challan
router.get("/:id", async (req, res) => {
  try {
    const challan = await DeliveryChallan.findById(req.params.id)
      .populate(
        "salesOrder",
        "salesOrderNo orderDate deliveryDate status grandTotal balance items"
      )
      .populate("customer", "customerName phoneNumber email address city");

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
    res.status(500).json({
      success: false,
      message: "Delivery challan load nahi hua",
      error: error.message,
    });
  }
});

// Add challan
router.post("/add", async (req, res) => {
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

    const sourceItems = items && items.length > 0 ? items : selectedOrder.items;
    const cleanItems = cleanDeliveryItems(sourceItems);

    if (cleanItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please at least one valid delivery item add karein",
      });
    }

    const validation = await validateDeliveryAgainstSalesOrder({
      salesOrder: selectedOrder,
      deliveryItems: cleanItems,
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

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
      warehouse: warehouse || "Main Warehouse",

      items: cleanItems,

      totalCartons: totals.totalCartons,
      totalQuantity: totals.totalQuantity,
      subtotal: totals.subtotal,

      status: allowedStatuses.includes(status) ? status : "Draft",
      remarks: remarks || "",
    });

    const savedChallan = await challan.save();

    if (savedChallan.status !== "Cancelled") {
      await updateSalesOrderDeliveryStatus(selectedOrder._id);
    }

    const populatedChallan = await DeliveryChallan.findById(savedChallan._id)
      .populate(
        "salesOrder",
        "salesOrderNo orderDate deliveryDate status grandTotal balance"
      )
      .populate("customer", "customerName phoneNumber email address city");

    res.status(201).json({
      success: true,
      message: "Delivery challan created successfully",
      data: populatedChallan,
    });
  } catch (error) {
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

// Update challan
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

    const cleanItems = cleanDeliveryItems(req.body.items || existingChallan.items);

    if (cleanItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please at least one valid delivery item add karein",
      });
    }

    const validation = await validateDeliveryAgainstSalesOrder({
      salesOrder: selectedOrder,
      deliveryItems: cleanItems,
      excludeChallanId: existingChallan._id,
    });

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        message: validation.message,
      });
    }

    const totals = calculateTotals(cleanItems);

    const updatedChallan = await DeliveryChallan.findByIdAndUpdate(
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
        warehouse: req.body.warehouse || "Main Warehouse",

        items: cleanItems,

        totalCartons: totals.totalCartons,
        totalQuantity: totals.totalQuantity,
        subtotal: totals.subtotal,

        status: allowedStatuses.includes(req.body.status)
          ? req.body.status
          : existingChallan.status,

        remarks: req.body.remarks || "",
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate(
        "salesOrder",
        "salesOrderNo orderDate deliveryDate status grandTotal balance"
      )
      .populate("customer", "customerName phoneNumber email address city");

    await updateSalesOrderDeliveryStatus(selectedOrder._id);

    res.status(200).json({
      success: true,
      message: "Delivery challan updated successfully",
      data: updatedChallan,
    });
  } catch (error) {
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

// Status update
router.patch("/status/:id", async (req, res) => {
  try {
    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const challan = await DeliveryChallan.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    )
      .populate(
        "salesOrder",
        "salesOrderNo orderDate deliveryDate status grandTotal balance"
      )
      .populate("customer", "customerName phoneNumber email address city");

    if (!challan) {
      return res.status(404).json({
        success: false,
        message: "Delivery challan not found",
      });
    }

    await updateSalesOrderDeliveryStatus(challan.salesOrder._id || challan.salesOrder);

    res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: challan,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Status update nahi hua",
      error: error.message,
    });
  }
});

// Delete challan
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

    await DeliveryChallan.findByIdAndDelete(req.params.id);
    await updateSalesOrderDeliveryStatus(salesOrderId);

    res.status(200).json({
      success: true,
      message: "Delivery challan deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Delivery challan delete nahi hua",
      error: error.message,
    });
  }
});

module.exports = router;