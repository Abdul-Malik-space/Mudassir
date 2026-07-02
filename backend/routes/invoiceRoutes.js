const express = require("express");
const router = express.Router();

const Invoice = require("../models/Invoice");
const DeliveryChallan = require("../models/DeliveryChallan");
const SalesOrder = require("../models/SalesOrder");

const currentYear = () => new Date().getFullYear();

const generateInvoiceNo = async () => {
  const count = await Invoice.countDocuments();
  return `INV-${currentYear()}-${String(count + 1).padStart(4, "0")}`;
};

const calculateTotals = (items = [], taxType = "without-tax", paidAmount = 0) => {
  const cleanItems = items
    .filter((item) => item.description && Number(item.quantity || 0) > 0)
    .map((item) => {
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
  const balance = grandTotal - Number(paidAmount || 0);

  let paymentStatus = "Unpaid";
  if (Number(paidAmount || 0) >= grandTotal && grandTotal > 0) paymentStatus = "Paid";
  else if (Number(paidAmount || 0) > 0) paymentStatus = "Partial";

  return {
    cleanItems,
    subtotal,
    taxRate,
    salesTax,
    grandTotal,
    balance,
    paymentStatus,
  };
};

router.get("/next-no", async (req, res) => {
  try {
    const invoiceNo = await generateInvoiceNo();
    res.json({ invoiceNo });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/all", async (req, res) => {
  try {
    const invoices = await Invoice.find()
      .populate("deliveryChallan", "challanNo challanDate status")
      .populate("salesOrder", "salesOrderNo orderDate status")
      .populate("customer", "customerName phoneNumber email address city")
      .sort({ createdAt: -1 });

    res.json(invoices);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/add", async (req, res) => {
  try {
    const {
      invoiceNo,
      deliveryChallan,
      invoiceDate,
      poNo,
      taxType,
      salesTaxRegNo,
      nationalTaxNo,
      items,
      paidAmount,
      status,
      remarks,
    } = req.body;

    if (!deliveryChallan) {
      return res.status(400).json({ message: "Delivery Challan is required" });
    }

    if (!invoiceDate) {
      return res.status(400).json({ message: "Invoice Date is required" });
    }

    const challan = await DeliveryChallan.findById(deliveryChallan);

    if (!challan) {
      return res.status(404).json({ message: "Delivery Challan not found" });
    }

    const salesOrder = await SalesOrder.findById(challan.salesOrder);

    if (!salesOrder) {
      return res.status(404).json({ message: "Sales Order not found" });
    }

    const finalInvoiceNo = invoiceNo || (await generateInvoiceNo());
    const finalTaxType = taxType || salesOrder.taxType || "without-tax";

    const totals = calculateTotals(items, finalTaxType, paidAmount);

    if (totals.cleanItems.length === 0) {
      return res.status(400).json({ message: "Please add at least one valid invoice item" });
    }

    const invoice = new Invoice({
      invoiceNo: finalInvoiceNo,

      deliveryChallan: challan._id,
      challanNo: challan.challanNo,

      salesOrder: salesOrder._id,
      salesOrderNo: salesOrder.salesOrderNo,

      customer: challan.customer,
      customerName: challan.customerName,
      customerPhone: challan.customerPhone || "",
      customerEmail: challan.customerEmail || "",
      customerAddress: challan.customerAddress || "",

      invoiceDate,
      poNo: poNo || challan.poNo || salesOrder.poNo || "",

      taxType: finalTaxType,
      taxRate: totals.taxRate,
      salesTaxRegNo,
      nationalTaxNo,

      items: totals.cleanItems,
      subtotal: totals.subtotal,
      salesTax: totals.salesTax,
      grandTotal: totals.grandTotal,
      paidAmount: Number(paidAmount || 0),
      balance: totals.balance,
      paymentStatus: totals.paymentStatus,

      status: status || "Draft",
      remarks,
    });

    const savedInvoice = await invoice.save();

    await SalesOrder.findByIdAndUpdate(salesOrder._id, {
      status: "Invoiced",
    });

    res.status(201).json({
      message: "Invoice created successfully",
      data: savedInvoice,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    const existingInvoice = await Invoice.findById(req.params.id);

    if (!existingInvoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const challan = await DeliveryChallan.findById(
      req.body.deliveryChallan || existingInvoice.deliveryChallan
    );

    if (!challan) {
      return res.status(404).json({ message: "Delivery Challan not found" });
    }

    const salesOrder = await SalesOrder.findById(challan.salesOrder);

    if (!salesOrder) {
      return res.status(404).json({ message: "Sales Order not found" });
    }

    const finalTaxType = req.body.taxType || existingInvoice.taxType;
    const totals = calculateTotals(
      req.body.items || existingInvoice.items,
      finalTaxType,
      req.body.paidAmount ?? existingInvoice.paidAmount
    );

    if (totals.cleanItems.length === 0) {
      return res.status(400).json({ message: "Please add at least one valid invoice item" });
    }

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      {
        invoiceNo: req.body.invoiceNo || existingInvoice.invoiceNo,

        deliveryChallan: challan._id,
        challanNo: challan.challanNo,

        salesOrder: salesOrder._id,
        salesOrderNo: salesOrder.salesOrderNo,

        customer: challan.customer,
        customerName: challan.customerName,
        customerPhone: challan.customerPhone || "",
        customerEmail: challan.customerEmail || "",
        customerAddress: challan.customerAddress || "",

        invoiceDate: req.body.invoiceDate || existingInvoice.invoiceDate,
        poNo: req.body.poNo || challan.poNo || salesOrder.poNo || "",

        taxType: finalTaxType,
        taxRate: totals.taxRate,
        salesTaxRegNo: req.body.salesTaxRegNo || "",
        nationalTaxNo: req.body.nationalTaxNo || "",

        items: totals.cleanItems,
        subtotal: totals.subtotal,
        salesTax: totals.salesTax,
        grandTotal: totals.grandTotal,
        paidAmount: Number(req.body.paidAmount || 0),
        balance: totals.balance,
        paymentStatus: totals.paymentStatus,

        status: req.body.status || existingInvoice.status,
        remarks: req.body.remarks || "",
      },
      { new: true, runValidators: true }
    );

    res.json({
      message: "Invoice updated successfully",
      data: updatedInvoice,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.patch("/payment/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    const paidAmount = Number(req.body.paidAmount || 0);
    const balance = Number(invoice.grandTotal || 0) - paidAmount;

    let paymentStatus = "Unpaid";
    let status = invoice.status;

    if (paidAmount >= invoice.grandTotal) {
      paymentStatus = "Paid";
      status = "Paid";
    } else if (paidAmount > 0) {
      paymentStatus = "Partial";
    }

    invoice.paidAmount = paidAmount;
    invoice.balance = balance;
    invoice.paymentStatus = paymentStatus;
    invoice.status = status;

    const saved = await invoice.save();

    res.json({ message: "Payment updated", data: saved });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

router.delete("/delete/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);

    if (!invoice) {
      return res.status(404).json({ message: "Invoice not found" });
    }

    res.json({ message: "Invoice deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;