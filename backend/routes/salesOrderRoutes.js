const express = require("express");
const router = express.Router();

const SalesOrder = require("../models/SalesOrder");
const Customer = require("../models/customer");
const Counter = require("../models/Counter");

const allowedStatuses = [
  "Draft",
  "Confirmed",
  "In Production",
  "Ready",
  "Partially Delivered",
  "Delivered",
  "Invoiced",
  "Cancelled",
];

const allowedTaxTypes = ["without-tax", "with-tax"];
const allowedTextTypes = ["", "with-text", "without-text"];

const getPaymentStatus = (grandTotal, advance) => {
  const total = Number(grandTotal || 0);
  const paid = Number(advance || 0);

  if (paid <= 0) return "Unpaid";
  if (paid >= total) return "Paid";
  return "Partially Paid";
};

const getItemId = (value) => {
  if (!value) return null;
  if (typeof value === "object" && value._id) return value._id;
  return value;
};

const cleanSalesOrderItems = (items = []) => {
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
      const cartons = Number(item.cartons || 0);
      const deliveredQty = Number(item.deliveredQty || 0);
      const pendingQty = Math.max(quantity - deliveredQty, 0);
      const amount = quantity * unitPrice;

      const cleanItem = {
        item: getItemId(item.item) || null,

        warehouse: String(item.warehouse || "Main Godown").trim(),
        availableStock: Number(item.availableStock || 0),

        description: String(item.description || "").trim(),
        size: String(item.size || "").trim(),
        textType: allowedTextTypes.includes(item.textType) ? item.textType : "",

        cartons,
        quantity,
        deliveredQty,
        pendingQty,

        unit: String(item.unit || "Rolls").trim(),
        unitPrice,
        amount,

        remarks: String(item.remarks || "").trim(),
      };

      if (item._id) {
        cleanItem._id = item._id;
      }

      return cleanItem;
    });
};

const calculateOrderTotals = (
  items = [],
  taxType = "without-tax",
  advance = 0
) => {
  const cleanItems = cleanSalesOrderItems(items);

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

const validateDeliveredQuantities = (items = []) => {
  for (const item of items) {
    if (Number(item.deliveredQty || 0) > Number(item.quantity || 0)) {
      throw new Error(
        `Delivered qty item "${item.description}" mein order qty se zyada nahi ho sakti`
      );
    }
  }
};

const getNextSalesOrderNo = async () => {
  let salesOrderNo = "";

  for (let i = 0; i < 5; i++) {
    const counter = await Counter.findOneAndUpdate(
      { name: "salesOrderNo" },
      { $inc: { seq: 1 } },
      {
        returnDocument: "after",
        upsert: true,
      }
    );

    salesOrderNo = `SO-${String(counter.seq).padStart(4, "0")}`;

    const exists = await SalesOrder.findOne({ salesOrderNo });
    if (!exists) return salesOrderNo;
  }

  throw new Error("Unable to generate unique sales order number");
};

const peekNextSalesOrderNo = async () => {
  const counter = await Counter.findOne({ name: "salesOrderNo" });
  const nextSeq = counter ? counter.seq + 1 : 1;

  return `SO-${String(nextSeq).padStart(4, "0")}`;
};

const buildCustomerSnapshot = (customer) => {
  return {
    customer: customer._id,
    customerName: customer.customerName || customer.name || "",
    customerPhone: customer.phoneNumber || customer.phone || "",
    customerEmail: customer.email || "",
    customerAddress: customer.address || "",
    customerCity: customer.city || "",
  };
};

const populateSalesOrder = (query) => {
  return query
    .populate("customer", "customerName phoneNumber email address city")
    .populate("items.item", "code name unit category brand purchasePrice salePrice");
};

router.get("/next-no", async (req, res) => {
  try {
    const salesOrderNo = await peekNextSalesOrderNo();

    res.status(200).json({
      success: true,
      salesOrderNo,
    });
  } catch (error) {
    console.error("Sales Order Next No Error:", error);

    res.status(500).json({
      success: false,
      message: "Sales order number generate nahi hua",
      error: error.message,
    });
  }
});

router.get("/all", async (req, res) => {
  try {
    const { search = "", status = "", customer = "" } = req.query;

    const query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (customer) {
      query.customer = customer;
    }

    if (search) {
      query.$or = [
        { salesOrderNo: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
        { poNo: { $regex: search, $options: "i" } },
        { referenceNo: { $regex: search, $options: "i" } },
        { "items.description": { $regex: search, $options: "i" } },
        { "items.warehouse": { $regex: search, $options: "i" } },
      ];
    }

    const orders = await populateSalesOrder(
      SalesOrder.find(query).sort({ createdAt: -1 })
    );

    res.status(200).json(orders);
  } catch (error) {
    console.error("Sales Orders Load Error:", error);

    res.status(500).json({
      success: false,
      message: "Sales orders load nahi huay",
      error: error.message,
    });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const order = await populateSalesOrder(
      SalesOrder.findById(req.params.id)
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Sales order not found",
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error("Sales Order Single Load Error:", error);

    res.status(500).json({
      success: false,
      message: "Sales order load nahi hua",
      error: error.message,
    });
  }
});

router.post("/add", async (req, res) => {
  try {
    const {
      salesOrderNo,
      customer,
      orderDate,
      deliveryDate,
      poNo,
      referenceNo,
      taxType,
      items,
      advance,
      status,
      remarks,
    } = req.body;

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: "Customer required hai",
      });
    }

    if (!orderDate) {
      return res.status(400).json({
        success: false,
        message: "Order date required hai",
      });
    }

    const selectedCustomer = await Customer.findById(customer);

    if (!selectedCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const totals = calculateOrderTotals(items, taxType, advance);

    if (totals.cleanItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please at least one valid item add karein",
      });
    }

    validateDeliveredQuantities(totals.cleanItems);

    if (totals.advance > totals.grandTotal) {
      return res.status(400).json({
        success: false,
        message: "Advance grand total se zyada nahi ho sakta",
      });
    }

    const finalSalesOrderNo = salesOrderNo
      ? String(salesOrderNo).trim().toUpperCase()
      : await getNextSalesOrderNo();

    const customerSnapshot = buildCustomerSnapshot(selectedCustomer);

    const order = new SalesOrder({
      salesOrderNo: finalSalesOrderNo,
      ...customerSnapshot,

      orderDate,
      deliveryDate: deliveryDate || "",
      poNo: poNo || "",
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

    const savedOrder = await order.save();

    const populatedOrder = await populateSalesOrder(
      SalesOrder.findById(savedOrder._id)
    );

    res.status(201).json({
      success: true,
      message: "Sales order created successfully",
      data: populatedOrder,
    });
  } catch (error) {
    console.error("Sales Order Add Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ye sales order number already used hai",
      });
    }

    res.status(400).json({
      success: false,
      message: "Sales order save nahi hua",
      error: error.message,
    });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    const existingOrder = await SalesOrder.findById(req.params.id);

    if (!existingOrder) {
      return res.status(404).json({
        success: false,
        message: "Sales order not found",
      });
    }

    if (existingOrder.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled sales order update nahi ho sakta",
      });
    }

    if (["Delivered", "Invoiced"].includes(existingOrder.status)) {
      return res.status(400).json({
        success: false,
        message: "Delivered/Invoiced sales order update nahi ho sakta",
      });
    }

    const selectedCustomer = await Customer.findById(
      req.body.customer || existingOrder.customer
    );

    if (!selectedCustomer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
      });
    }

    const totals = calculateOrderTotals(
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

    validateDeliveredQuantities(totals.cleanItems);

    if (totals.advance > totals.grandTotal) {
      return res.status(400).json({
        success: false,
        message: "Advance grand total se zyada nahi ho sakta",
      });
    }

    const customerSnapshot = buildCustomerSnapshot(selectedCustomer);

    const updatedOrder = await populateSalesOrder(
      SalesOrder.findByIdAndUpdate(
        req.params.id,
        {
          salesOrderNo: req.body.salesOrderNo
            ? String(req.body.salesOrderNo).trim().toUpperCase()
            : existingOrder.salesOrderNo,

          ...customerSnapshot,

          orderDate: req.body.orderDate || existingOrder.orderDate,
          deliveryDate: req.body.deliveryDate || "",
          poNo: req.body.poNo || "",
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
          returnDocument: "after",
          runValidators: true,
        }
      )
    );

    res.status(200).json({
      success: true,
      message: "Sales order updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    console.error("Sales Order Update Error:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Ye sales order number already used hai",
      });
    }

    res.status(400).json({
      success: false,
      message: "Sales order update nahi hua",
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

    const order = await populateSalesOrder(
      SalesOrder.findByIdAndUpdate(
        req.params.id,
        { status },
        {
          returnDocument: "after",
          runValidators: true,
        }
      )
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Sales order not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Status updated successfully",
      data: order,
    });
  } catch (error) {
    console.error("Sales Order Status Error:", error);

    res.status(400).json({
      success: false,
      message: "Status update nahi hua",
      error: error.message,
    });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    const order = await SalesOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Sales order not found",
      });
    }

    if (["Partially Delivered", "Delivered", "Invoiced"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message:
          "Delivered ya partially delivered sales order delete nahi ho sakta",
      });
    }

    await SalesOrder.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Sales order deleted successfully",
    });
  } catch (error) {
    console.error("Sales Order Delete Error:", error);

    res.status(500).json({
      success: false,
      message: "Sales order delete nahi hua",
      error: error.message,
    });
  }
});

module.exports = router;