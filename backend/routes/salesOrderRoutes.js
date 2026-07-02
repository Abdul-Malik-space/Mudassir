const express = require("express");
const router = express.Router();

const SalesOrder = require("../models/SalesOrder");
const Customer = require("../models/customer");

const calculateOrderTotals = (items = [], taxType = "without-tax", advance = 0) => {
  const cleanItems = items.map((item) => {
    const quantity = Number(item.quantity || 0);
    const unitPrice = Number(item.unitPrice || 0);
    const amount = quantity * unitPrice;

    return {
      description: item.description || "",
      size: item.size || "",
      cartons: Number(item.cartons || 0),
      quantity,
      unit: item.unit || "Rolls",
      unitPrice,
      amount,
    };
  });

  const subtotal = cleanItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const taxRate = taxType === "with-tax" ? 18 : 0;
  const salesTax = taxType === "with-tax" ? subtotal * 0.18 : 0;
  const grandTotal = subtotal + salesTax;
  const balance = grandTotal - Number(advance || 0);

  return {
    cleanItems,
    subtotal,
    taxRate,
    salesTax,
    grandTotal,
    balance,
  };
};

const generateSalesOrderNo = async () => {
  const year = new Date().getFullYear();
  const count = await SalesOrder.countDocuments();
  return `SO-${year}-${String(count + 1).padStart(4, "0")}`;
};

router.get("/next-no", async (req, res) => {
  try {
    const salesOrderNo = await generateSalesOrderNo();
    res.json({ salesOrderNo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/all", async (req, res) => {
  try {
    const orders = await SalesOrder.find()
      .populate("customer", "customerName phoneNumber email address city")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/add", async (req, res) => {
  try {
    const {
      customer,
      orderDate,
      deliveryDate,
      poNo,
      taxType,
      items,
      advance,
      status,
      remarks,
    } = req.body;

    if (!customer) {
      return res.status(400).json({ message: "Customer is required" });
    }

    const selectedCustomer = await Customer.findById(customer);

    if (!selectedCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const salesOrderNo = req.body.salesOrderNo || (await generateSalesOrderNo());

    const totals = calculateOrderTotals(items, taxType, advance);

    const order = new SalesOrder({
      salesOrderNo,
      customer: selectedCustomer._id,
      customerName: selectedCustomer.customerName,
      customerPhone: selectedCustomer.phoneNumber || "",
      customerEmail: selectedCustomer.email || "",
      customerAddress: selectedCustomer.address || "",
      orderDate,
      deliveryDate,
      poNo,
      taxType,
      taxRate: totals.taxRate,
      items: totals.cleanItems,
      subtotal: totals.subtotal,
      salesTax: totals.salesTax,
      grandTotal: totals.grandTotal,
      advance: Number(advance || 0),
      balance: totals.balance,
      status: status || "Draft",
      remarks,
    });

    const savedOrder = await order.save();

    res.status(201).json({
      message: "Sales order created successfully",
      data: savedOrder,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    const existingOrder = await SalesOrder.findById(req.params.id);

    if (!existingOrder) {
      return res.status(404).json({ message: "Sales order not found" });
    }

    const selectedCustomer = await Customer.findById(req.body.customer || existingOrder.customer);

    if (!selectedCustomer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const totals = calculateOrderTotals(
      req.body.items || existingOrder.items,
      req.body.taxType || existingOrder.taxType,
      req.body.advance ?? existingOrder.advance
    );

    const updatedOrder = await SalesOrder.findByIdAndUpdate(
      req.params.id,
      {
        salesOrderNo: req.body.salesOrderNo || existingOrder.salesOrderNo,
        customer: selectedCustomer._id,
        customerName: selectedCustomer.customerName,
        customerPhone: selectedCustomer.phoneNumber || "",
        customerEmail: selectedCustomer.email || "",
        customerAddress: selectedCustomer.address || "",
        orderDate: req.body.orderDate || existingOrder.orderDate,
        deliveryDate: req.body.deliveryDate || "",
        poNo: req.body.poNo || "",
        taxType: req.body.taxType || "without-tax",
        taxRate: totals.taxRate,
        items: totals.cleanItems,
        subtotal: totals.subtotal,
        salesTax: totals.salesTax,
        grandTotal: totals.grandTotal,
        advance: Number(req.body.advance || 0),
        balance: totals.balance,
        status: req.body.status || existingOrder.status,
        remarks: req.body.remarks || "",
      },
      { new: true, runValidators: true }
    );

    res.json({
      message: "Sales order updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/status/:id", async (req, res) => {
  try {
    const order = await SalesOrder.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Sales order not found" });
    }

    res.json({ message: "Status updated", data: order });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    const order = await SalesOrder.findByIdAndDelete(req.params.id);

    if (!order) {
      return res.status(404).json({ message: "Sales order not found" });
    }

    res.json({ message: "Sales order deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;