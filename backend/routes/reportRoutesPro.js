const express = require("express");
const router = express.Router();

const Customer = require("../models/customer");
const SalesOrder = require("../models/SalesOrder");
const DeliveryChallan = require("../models/DeliveryChallan");
const Invoice = require("../models/Invoice");

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const isDateInRange = (dateValue, fromDate, toDate) => {
  if (!fromDate && !toDate) return true;

  const date = parseDate(dateValue);
  if (!date) return false;

  if (fromDate && date < fromDate) return false;
  if (toDate && date > toDate) return false;

  return true;
};

const buildDateRange = (req) => {
  const fromDate = req.query.from ? new Date(req.query.from) : null;
  const toDate = req.query.to ? new Date(req.query.to) : null;

  if (toDate) {
    toDate.setHours(23, 59, 59, 999);
  }

  return { fromDate, toDate };
};

const round = (value) => Math.round(Number(value || 0));

const buildCustomerReport = async (fromDate, toDate) => {
  const customers = await Customer.find().sort({ customerName: 1 });
  const salesOrders = await SalesOrder.find();
  const challans = await DeliveryChallan.find();
  const invoices = await Invoice.find();

  const rows = customers.map((customer) => {
    const customerId = String(customer._id);

    const customerSalesOrders = salesOrders.filter(
      (order) =>
        String(order.customer) === customerId &&
        isDateInRange(order.orderDate, fromDate, toDate)
    );

    const customerChallans = challans.filter(
      (challan) =>
        String(challan.customer) === customerId &&
        isDateInRange(challan.challanDate, fromDate, toDate)
    );

    const customerInvoices = invoices.filter(
      (invoice) =>
        String(invoice.customer) === customerId &&
        isDateInRange(invoice.invoiceDate, fromDate, toDate)
    );

    const orderValue = customerSalesOrders.reduce(
      (sum, item) => sum + Number(item.grandTotal || 0),
      0
    );

    const invoiceValue = customerInvoices.reduce(
      (sum, item) => sum + Number(item.grandTotal || 0),
      0
    );

    const paidAmount = customerInvoices.reduce(
      (sum, item) => sum + Number(item.paidAmount || 0),
      0
    );

    const receivable = customerInvoices.reduce(
      (sum, item) => sum + Number(item.balance || 0),
      0
    );

    const salesTax = customerInvoices.reduce(
      (sum, item) => sum + Number(item.salesTax || 0),
      0
    );

    return {
      customerId,
      customerName: customer.customerName || "",
      phoneNumber: customer.phoneNumber || "",
      email: customer.email || "",
      address: customer.address || "",
      city: customer.city || "",
      salesOrders: customerSalesOrders.length,
      deliveryChallans: customerChallans.length,
      invoices: customerInvoices.length,
      orderValue: round(orderValue),
      invoiceValue: round(invoiceValue),
      paidAmount: round(paidAmount),
      receivable: round(receivable),
      salesTax: round(salesTax),
      status: customer.status || "Active",
    };
  });

  return rows;
};

const buildSummary = async (fromDate, toDate) => {
  const customers = await Customer.find();
  const salesOrders = await SalesOrder.find();
  const challans = await DeliveryChallan.find();
  const invoices = await Invoice.find();

  const filteredSalesOrders = salesOrders.filter((order) =>
    isDateInRange(order.orderDate, fromDate, toDate)
  );

  const filteredChallans = challans.filter((challan) =>
    isDateInRange(challan.challanDate, fromDate, toDate)
  );

  const filteredInvoices = invoices.filter((invoice) =>
    isDateInRange(invoice.invoiceDate, fromDate, toDate)
  );

  const totalOrderValue = filteredSalesOrders.reduce(
    (sum, item) => sum + Number(item.grandTotal || 0),
    0
  );

  const totalInvoiceValue = filteredInvoices.reduce(
    (sum, item) => sum + Number(item.grandTotal || 0),
    0
  );

  const totalSalesTax = filteredInvoices.reduce(
    (sum, item) => sum + Number(item.salesTax || 0),
    0
  );

  const totalPaid = filteredInvoices.reduce(
    (sum, item) => sum + Number(item.paidAmount || 0),
    0
  );

  const totalReceivable = filteredInvoices.reduce(
    (sum, item) => sum + Number(item.balance || 0),
    0
  );

  return {
    totalCustomers: customers.length,
    totalSalesOrders: filteredSalesOrders.length,
    totalDeliveryChallans: filteredChallans.length,
    totalInvoices: filteredInvoices.length,
    totalOrderValue: round(totalOrderValue),
    totalInvoiceValue: round(totalInvoiceValue),
    totalSalesTax: round(totalSalesTax),
    totalPaid: round(totalPaid),
    totalReceivable: round(totalReceivable),
    unpaidInvoices: filteredInvoices.filter((item) => item.paymentStatus === "Unpaid").length,
    partialInvoices: filteredInvoices.filter((item) => item.paymentStatus === "Partial").length,
    paidInvoices: filteredInvoices.filter((item) => item.paymentStatus === "Paid").length,
  };
};

router.get("/summary", async (req, res) => {
  try {
    const { fromDate, toDate } = buildDateRange(req);
    const summary = await buildSummary(fromDate, toDate);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: "Report summary error", error: error.message });
  }
});

router.get("/customers", async (req, res) => {
  try {
    const { fromDate, toDate } = buildDateRange(req);
    const rows = await buildCustomerReport(fromDate, toDate);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: "Customer report error", error: error.message });
  }
});

router.get("/sales-orders", async (req, res) => {
  try {
    const { fromDate, toDate } = buildDateRange(req);

    const rows = await SalesOrder.find()
      .populate("customer", "customerName phoneNumber email address city")
      .sort({ createdAt: -1 });

    const filtered = rows.filter((item) => isDateInRange(item.orderDate, fromDate, toDate));

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: "Sales order report error", error: error.message });
  }
});

router.get("/delivery-challans", async (req, res) => {
  try {
    const { fromDate, toDate } = buildDateRange(req);

    const rows = await DeliveryChallan.find()
      .populate("customer", "customerName phoneNumber email address city")
      .populate("salesOrder", "salesOrderNo orderDate status")
      .sort({ createdAt: -1 });

    const filtered = rows.filter((item) => isDateInRange(item.challanDate, fromDate, toDate));

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: "Delivery challan report error", error: error.message });
  }
});

router.get("/invoices", async (req, res) => {
  try {
    const { fromDate, toDate } = buildDateRange(req);

    const rows = await Invoice.find()
      .populate("customer", "customerName phoneNumber email address city")
      .populate("deliveryChallan", "challanNo challanDate status")
      .populate("salesOrder", "salesOrderNo orderDate status")
      .sort({ createdAt: -1 });

    const filtered = rows.filter((item) => isDateInRange(item.invoiceDate, fromDate, toDate));

    res.json(filtered);
  } catch (error) {
    res.status(500).json({ message: "Invoice report error", error: error.message });
  }
});

router.get("/tax", async (req, res) => {
  try {
    const { fromDate, toDate } = buildDateRange(req);

    const invoices = await Invoice.find({ taxType: "with-tax" }).sort({ createdAt: -1 });

    const filtered = invoices.filter((item) => isDateInRange(item.invoiceDate, fromDate, toDate));

    const summary = {
      taxableInvoices: filtered.length,
      taxableValue: round(filtered.reduce((sum, item) => sum + Number(item.subtotal || 0), 0)),
      salesTax: round(filtered.reduce((sum, item) => sum + Number(item.salesTax || 0), 0)),
      taxInclusiveValue: round(
        filtered.reduce((sum, item) => sum + Number(item.grandTotal || 0), 0)
      ),
    };

    res.json({
      summary,
      rows: filtered,
    });
  } catch (error) {
    res.status(500).json({ message: "Tax report error", error: error.message });
  }
});

router.get("/customer-ledger/:customerId", async (req, res) => {
  try {
    const { customerId } = req.params;
    const { fromDate, toDate } = buildDateRange(req);

    const customer = await Customer.findById(customerId);

    if (!customer) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const salesOrders = await SalesOrder.find({ customer: customerId }).sort({ createdAt: -1 });
    const challans = await DeliveryChallan.find({ customer: customerId }).sort({ createdAt: -1 });
    const invoices = await Invoice.find({ customer: customerId }).sort({ createdAt: -1 });

    const filteredOrders = salesOrders.filter((item) =>
      isDateInRange(item.orderDate, fromDate, toDate)
    );

    const filteredChallans = challans.filter((item) =>
      isDateInRange(item.challanDate, fromDate, toDate)
    );

    const filteredInvoices = invoices.filter((item) =>
      isDateInRange(item.invoiceDate, fromDate, toDate)
    );

    const invoiceValue = filteredInvoices.reduce(
      (sum, item) => sum + Number(item.grandTotal || 0),
      0
    );

    const paidAmount = filteredInvoices.reduce(
      (sum, item) => sum + Number(item.paidAmount || 0),
      0
    );

    const receivable = filteredInvoices.reduce(
      (sum, item) => sum + Number(item.balance || 0),
      0
    );

    res.json({
      customer,
      summary: {
        salesOrders: filteredOrders.length,
        deliveryChallans: filteredChallans.length,
        invoices: filteredInvoices.length,
        invoiceValue: round(invoiceValue),
        paidAmount: round(paidAmount),
        receivable: round(receivable),
      },
      salesOrders: filteredOrders,
      deliveryChallans: filteredChallans,
      invoices: filteredInvoices,
    });
  } catch (error) {
    res.status(500).json({ message: "Customer ledger error", error: error.message });
  }
});

module.exports = router;