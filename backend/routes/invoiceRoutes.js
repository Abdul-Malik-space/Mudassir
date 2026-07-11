const express = require("express");
const router = express.Router();

const Invoice = require("../models/Invoice");
const DeliveryChallan = require("../models/DeliveryChallan");
const SalesOrder = require("../models/SalesOrder");
const Counter = require("../models/Counter");

const allowedStatuses = ["Draft", "Issued", "Paid", "Cancelled"];
const allowedTaxTypes = ["without-tax", "with-tax"];

const getNextInvoiceNo = async () => {
  let invoiceNo = "";

  for (let i = 0; i < 5; i++) {
    const counter = await Counter.findOneAndUpdate(
      { name: "invoiceNo" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    invoiceNo = `INV-${String(counter.seq).padStart(4, "0")}`;

    const exists = await Invoice.findOne({ invoiceNo });
    if (!exists) return invoiceNo;
  }

  throw new Error("Unable to generate unique invoice number");
};

const peekNextInvoiceNo = async () => {
  const counter = await Counter.findOne({ name: "invoiceNo" });
  const nextSeq = counter ? counter.seq + 1 : 1;
  return `INV-${String(nextSeq).padStart(4, "0")}`;
};

const cleanInvoiceItems = (items = []) => {
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

const calculateTotals = (
  items = [],
  taxType = "without-tax",
  paidAmount = 0
) => {
  const cleanItems = cleanInvoiceItems(items);

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

  const finalPaidAmount = Number(paidAmount || 0);
  const balance = grandTotal - finalPaidAmount;

  let paymentStatus = "Unpaid";

  if (finalPaidAmount >= grandTotal && grandTotal > 0) {
    paymentStatus = "Paid";
  } else if (finalPaidAmount > 0) {
    paymentStatus = "Partially Paid";
  }

  return {
    cleanItems,
    totalCartons,
    totalQuantity,
    subtotal,
    taxType: finalTaxType,
    taxRate,
    salesTax,
    grandTotal,
    paidAmount: finalPaidAmount,
    balance,
    paymentStatus,
  };
};

const updateRelatedStatuses = async ({
  deliveryChallanId,
  salesOrderId,
  invoiceStatus = "Invoiced",
}) => {
  if (deliveryChallanId) {
    await DeliveryChallan.findByIdAndUpdate(deliveryChallanId, {
      invoiceStatus,
    });
  }

  if (salesOrderId && invoiceStatus === "Invoiced") {
    await SalesOrder.findByIdAndUpdate(salesOrderId, {
      status: "Invoiced",
    });
  }
};

const markChallanInvoiceStatusAfterDeleteOrCancel = async (
  deliveryChallanId,
  salesOrderId
) => {
  if (!deliveryChallanId) return;

  const activeInvoice = await Invoice.findOne({
    deliveryChallan: deliveryChallanId,
    status: { $ne: "Cancelled" },
  });

  if (!activeInvoice) {
    await DeliveryChallan.findByIdAndUpdate(deliveryChallanId, {
      invoiceStatus: "Not Invoiced",
    });
  }

  if (salesOrderId) {
    const activeSalesOrderInvoice = await Invoice.findOne({
      salesOrder: salesOrderId,
      status: { $ne: "Cancelled" },
    });

    if (!activeSalesOrderInvoice) {
      await SalesOrder.findByIdAndUpdate(salesOrderId, {
        status: "Delivered",
      });
    }
  }
};

// Next invoice number
router.get("/next-no", async (req, res) => {
  try {
    const invoiceNo = await peekNextInvoiceNo();

    res.status(200).json({
      success: true,
      invoiceNo,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Invoice number generate nahi hua",
      error: error.message,
    });
  }
});

// Get all invoices
router.get("/all", async (req, res) => {
  try {
    const {
      search = "",
      status = "",
      customer = "",
      deliveryChallan = "",
      salesOrder = "",
      paymentStatus = "",
    } = req.query;

    const query = {};

    if (status && status !== "All") {
      query.status = status;
    }

    if (customer) {
      query.customer = customer;
    }

    if (deliveryChallan) {
      query.deliveryChallan = deliveryChallan;
    }

    if (salesOrder) {
      query.salesOrder = salesOrder;
    }

    if (paymentStatus && paymentStatus !== "All") {
      query.paymentStatus = paymentStatus;
    }

    if (search) {
      query.$or = [
        { invoiceNo: { $regex: search, $options: "i" } },
        { challanNo: { $regex: search, $options: "i" } },
        { salesOrderNo: { $regex: search, $options: "i" } },
        { customerName: { $regex: search, $options: "i" } },
        { customerPhone: { $regex: search, $options: "i" } },
        { poNo: { $regex: search, $options: "i" } },
        { "items.description": { $regex: search, $options: "i" } },
      ];
    }

    const invoices = await Invoice.find(query)
      .populate("deliveryChallan", "challanNo challanDate status invoiceStatus")
      .populate("salesOrder", "salesOrderNo orderDate deliveryDate status")
      .populate("customer", "customerName phoneNumber email address city")
      .sort({ createdAt: -1 });

    res.status(200).json(invoices);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Invoices load nahi huay",
      error: error.message,
    });
  }
});

// Get single invoice
router.get("/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate("deliveryChallan", "challanNo challanDate status invoiceStatus")
      .populate("salesOrder", "salesOrderNo orderDate deliveryDate status")
      .populate("customer", "customerName phoneNumber email address city");

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.status(200).json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Invoice load nahi hui",
      error: error.message,
    });
  }
});

// Add invoice
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
      return res.status(400).json({
        success: false,
        message: "Delivery Challan required hai",
      });
    }

    if (!invoiceDate) {
      return res.status(400).json({
        success: false,
        message: "Invoice date required hai",
      });
    }

    const challan = await DeliveryChallan.findById(deliveryChallan);

    if (!challan) {
      return res.status(404).json({
        success: false,
        message: "Delivery Challan not found",
      });
    }

    if (challan.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled delivery challan ki invoice nahi ban sakti",
      });
    }

    if (challan.invoiceStatus === "Invoiced") {
      return res.status(400).json({
        success: false,
        message: "Is delivery challan ki invoice already ban chuki hai",
      });
    }

    const existingInvoice = await Invoice.findOne({
      deliveryChallan: challan._id,
      status: { $ne: "Cancelled" },
    });

    if (existingInvoice) {
      return res.status(400).json({
        success: false,
        message: "Is delivery challan ki invoice already exist karti hai",
      });
    }

    const salesOrder = await SalesOrder.findById(challan.salesOrder);

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message: "Sales Order not found",
      });
    }

    const sourceItems = items && items.length > 0 ? items : challan.items;
    const finalTaxType = taxType || salesOrder.taxType || "without-tax";

    const totals = calculateTotals(sourceItems, finalTaxType, paidAmount);

    if (totals.cleanItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please at least one valid invoice item add karein",
      });
    }

    if (totals.paidAmount > totals.grandTotal) {
      return res.status(400).json({
        success: false,
        message: "Paid amount grand total se zyada nahi ho sakta",
      });
    }

    const finalInvoiceNo = invoiceNo
      ? String(invoiceNo).trim().toUpperCase()
      : await getNextInvoiceNo();

    const finalStatus =
      totals.paymentStatus === "Paid"
        ? "Paid"
        : allowedStatuses.includes(status)
        ? status
        : "Issued";

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
      customerCity: challan.customerCity || "",

      invoiceDate,
      poNo: poNo || challan.poNo || salesOrder.poNo || "",

      taxType: totals.taxType,
      taxRate: totals.taxRate,

      salesTaxRegNo: salesTaxRegNo || "",
      nationalTaxNo: nationalTaxNo || "",

      items: totals.cleanItems,

      totalCartons: totals.totalCartons,
      totalQuantity: totals.totalQuantity,
      subtotal: totals.subtotal,
      salesTax: totals.salesTax,
      grandTotal: totals.grandTotal,
      paidAmount: totals.paidAmount,
      balance: totals.balance,
      paymentStatus: totals.paymentStatus,

      status: finalStatus,
      remarks: remarks || "",
    });

    const savedInvoice = await invoice.save();

    if (savedInvoice.status !== "Cancelled") {
      await updateRelatedStatuses({
        deliveryChallanId: challan._id,
        salesOrderId: salesOrder._id,
        invoiceStatus: "Invoiced",
      });
    }

    const populatedInvoice = await Invoice.findById(savedInvoice._id)
      .populate("deliveryChallan", "challanNo challanDate status invoiceStatus")
      .populate("salesOrder", "salesOrderNo orderDate deliveryDate status")
      .populate("customer", "customerName phoneNumber email address city");

    res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      data: populatedInvoice,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Invoice number ya delivery challan already invoice mein used hai",
      });
    }

    res.status(400).json({
      success: false,
      message: "Invoice save nahi hui",
      error: error.message,
    });
  }
});

// Update invoice
router.put("/update/:id", async (req, res) => {
  try {
    const existingInvoice = await Invoice.findById(req.params.id);

    if (!existingInvoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (existingInvoice.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled invoice update nahi ho sakti",
      });
    }

    const challan = await DeliveryChallan.findById(
      req.body.deliveryChallan || existingInvoice.deliveryChallan
    );

    if (!challan) {
      return res.status(404).json({
        success: false,
        message: "Delivery Challan not found",
      });
    }

    if (challan.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled delivery challan ki invoice update nahi ho sakti",
      });
    }

    const salesOrder = await SalesOrder.findById(challan.salesOrder);

    if (!salesOrder) {
      return res.status(404).json({
        success: false,
        message: "Sales Order not found",
      });
    }

    if (
      String(challan._id) !== String(existingInvoice.deliveryChallan)
    ) {
      const challanAlreadyUsed = await Invoice.findOne({
        deliveryChallan: challan._id,
        _id: { $ne: existingInvoice._id },
        status: { $ne: "Cancelled" },
      });

      if (challanAlreadyUsed) {
        return res.status(400).json({
          success: false,
          message: "Is delivery challan ki invoice already exist karti hai",
        });
      }
    }

    const finalTaxType = req.body.taxType || existingInvoice.taxType;
    const sourceItems = req.body.items || existingInvoice.items;

    const totals = calculateTotals(
      sourceItems,
      finalTaxType,
      req.body.paidAmount ?? existingInvoice.paidAmount
    );

    if (totals.cleanItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please at least one valid invoice item add karein",
      });
    }

    if (totals.paidAmount > totals.grandTotal) {
      return res.status(400).json({
        success: false,
        message: "Paid amount grand total se zyada nahi ho sakta",
      });
    }

    const finalStatus =
      totals.paymentStatus === "Paid"
        ? "Paid"
        : allowedStatuses.includes(req.body.status)
        ? req.body.status
        : existingInvoice.status;

    const updatedInvoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      {
        invoiceNo: req.body.invoiceNo
          ? String(req.body.invoiceNo).trim().toUpperCase()
          : existingInvoice.invoiceNo,

        deliveryChallan: challan._id,
        challanNo: challan.challanNo,

        salesOrder: salesOrder._id,
        salesOrderNo: salesOrder.salesOrderNo,

        customer: challan.customer,
        customerName: challan.customerName,
        customerPhone: challan.customerPhone || "",
        customerEmail: challan.customerEmail || "",
        customerAddress: challan.customerAddress || "",
        customerCity: challan.customerCity || "",

        invoiceDate: req.body.invoiceDate || existingInvoice.invoiceDate,
        poNo: req.body.poNo || challan.poNo || salesOrder.poNo || "",

        taxType: totals.taxType,
        taxRate: totals.taxRate,

        salesTaxRegNo: req.body.salesTaxRegNo || "",
        nationalTaxNo: req.body.nationalTaxNo || "",

        items: totals.cleanItems,

        totalCartons: totals.totalCartons,
        totalQuantity: totals.totalQuantity,
        subtotal: totals.subtotal,
        salesTax: totals.salesTax,
        grandTotal: totals.grandTotal,
        paidAmount: totals.paidAmount,
        balance: totals.balance,
        paymentStatus: totals.paymentStatus,

        status: finalStatus,
        remarks: req.body.remarks || "",
      },
      {
        new: true,
        runValidators: true,
      }
    )
      .populate("deliveryChallan", "challanNo challanDate status invoiceStatus")
      .populate("salesOrder", "salesOrderNo orderDate deliveryDate status")
      .populate("customer", "customerName phoneNumber email address city");

    if (
      String(existingInvoice.deliveryChallan) !== String(challan._id)
    ) {
      await markChallanInvoiceStatusAfterDeleteOrCancel(
        existingInvoice.deliveryChallan,
        existingInvoice.salesOrder
      );
    }

    if (updatedInvoice.status !== "Cancelled") {
      await updateRelatedStatuses({
        deliveryChallanId: challan._id,
        salesOrderId: salesOrder._id,
        invoiceStatus: "Invoiced",
      });
    }

    res.status(200).json({
      success: true,
      message: "Invoice updated successfully",
      data: updatedInvoice,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message:
          "Invoice number ya delivery challan already invoice mein used hai",
      });
    }

    res.status(400).json({
      success: false,
      message: "Invoice update nahi hui",
      error: error.message,
    });
  }
});

// Update payment only
router.patch("/payment/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    if (invoice.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cancelled invoice ki payment update nahi ho sakti",
      });
    }

    const paidAmount = Number(req.body.paidAmount || 0);

    if (paidAmount > Number(invoice.grandTotal || 0)) {
      return res.status(400).json({
        success: false,
        message: "Paid amount grand total se zyada nahi ho sakta",
      });
    }

    const balance = Number(invoice.grandTotal || 0) - paidAmount;

    let paymentStatus = "Unpaid";
    let status = invoice.status;

    if (paidAmount >= Number(invoice.grandTotal || 0)) {
      paymentStatus = "Paid";
      status = "Paid";
    } else if (paidAmount > 0) {
      paymentStatus = "Partially Paid";
      status = invoice.status === "Paid" ? "Issued" : invoice.status;
    }

    invoice.paidAmount = paidAmount;
    invoice.balance = balance;
    invoice.paymentStatus = paymentStatus;
    invoice.status = status;

    const savedInvoice = await invoice.save();

    res.status(200).json({
      success: true,
      message: "Payment updated successfully",
      data: savedInvoice,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Payment update nahi hui",
      error: error.message,
    });
  }
});

// Cancel invoice
router.patch("/cancel/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    invoice.status = "Cancelled";
    await invoice.save();

    await markChallanInvoiceStatusAfterDeleteOrCancel(
      invoice.deliveryChallan,
      invoice.salesOrder
    );

    res.status(200).json({
      success: true,
      message: "Invoice cancelled successfully",
      data: invoice,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "Invoice cancel nahi hui",
      error: error.message,
    });
  }
});

// Delete invoice
router.delete("/delete/:id", async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    const deliveryChallanId = invoice.deliveryChallan;
    const salesOrderId = invoice.salesOrder;

    await Invoice.findByIdAndDelete(req.params.id);

    await markChallanInvoiceStatusAfterDeleteOrCancel(
      deliveryChallanId,
      salesOrderId
    );

    res.status(200).json({
      success: true,
      message: "Invoice deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Invoice delete nahi hui",
      error: error.message,
    });
  }
});

module.exports = router;