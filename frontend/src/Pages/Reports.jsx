import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Users,
  FileText,
  Truck,
  Receipt,
  Banknote,
  Download,
  Printer,
  Search,
  Loader2,
  Eye,
  ArrowLeft,
  Calendar,
  BadgePercent,
  AlertCircle,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const COMPANY_NAME = "Mudassar";

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

const todayDate = () => new Date().toISOString().slice(0, 10);

const firstDayOfMonth = () => {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
};

const formatDate = (value) => value || "-";

const escapeHtml = (value) => {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const downloadCSV = (filename, rows) => {
  if (!rows || rows.length === 0) {
    alert("Export ke liye data available nahi hai");
    return;
  }

  const headers = Object.keys(rows[0]);

  const csvRows = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = row[header] ?? "";
          return `"${String(value).replace(/"/g, '""')}"`;
        })
        .join(",")
    ),
  ];

  const blob = new Blob([csvRows.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const StatCard = ({ title, value, icon: Icon, note }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {title}
        </p>
        <h3 className="text-2xl font-bold text-slate-900 mt-2">{value}</h3>
        {note && <p className="text-xs text-slate-400 mt-1">{note}</p>}
      </div>

      <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
        <Icon size={22} />
      </div>
    </div>
  </div>
);

const Reports = () => {
  const [activeTab, setActiveTab] = useState("customers");
  const [fromDate, setFromDate] = useState(firstDayOfMonth());
  const [toDate, setToDate] = useState(todayDate());

  const [summary, setSummary] = useState(null);
  const [customerRows, setCustomerRows] = useState([]);
  const [salesRows, setSalesRows] = useState([]);
  const [challanRows, setChallanRows] = useState([]);
  const [invoiceRows, setInvoiceRows] = useState([]);
  const [taxReport, setTaxReport] = useState({ summary: {}, rows: [] });

  const [ledgerData, setLedgerData] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);

  const query = `from=${fromDate}&to=${toDate}`;

  const fetchJSON = async (path) => {
    const res = await fetch(`${API_BASE_URL}${path}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || "Server error");
    }

    return data;
  };

  const loadReports = async () => {
    setLoading(true);

    try {
      const [
        summaryData,
        customersData,
        salesData,
        challansData,
        invoicesData,
        taxData,
      ] = await Promise.all([
        fetchJSON(`/reports-pro/summary?${query}`),
        fetchJSON(`/reports-pro/customers?${query}`),
        fetchJSON(`/reports-pro/sales-orders?${query}`),
        fetchJSON(`/reports-pro/delivery-challans?${query}`),
        fetchJSON(`/reports-pro/invoices?${query}`),
        fetchJSON(`/reports-pro/tax?${query}`),
      ]);

      setSummary(summaryData);
      setCustomerRows(Array.isArray(customersData) ? customersData : []);
      setSalesRows(Array.isArray(salesData) ? salesData : []);
      setChallanRows(Array.isArray(challansData) ? challansData : []);
      setInvoiceRows(Array.isArray(invoicesData) ? invoicesData : []);
      setTaxReport(taxData || { summary: {}, rows: [] });
    } catch (error) {
      alert(error.message || "Reports load nahi hui");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const filteredCustomers = useMemo(() => {
    const text = searchText.toLowerCase();

    return customerRows.filter((row) => {
      return (
        row.customerName?.toLowerCase().includes(text) ||
        row.phoneNumber?.toLowerCase().includes(text) ||
        row.city?.toLowerCase().includes(text) ||
        row.address?.toLowerCase().includes(text)
      );
    });
  }, [customerRows, searchText]);

  const loadCustomerLedger = async (customerId) => {
    if (!customerId) return;

    setLoading(true);

    try {
      const data = await fetchJSON(`/reports-pro/customer-ledger/${customerId}?${query}`);
      setLedgerData(data);
      setActiveTab("ledger");
    } catch (error) {
      alert(error.message || "Customer ledger load nahi hua");
    } finally {
      setLoading(false);
    }
  };

  const buildPrintRows = () => {
    if (activeTab === "customers") {
      return {
        title: "Customer Wise Report",
        headers: [
          "Customer",
          "Phone",
          "City",
          "Address",
          "Orders",
          "Challans",
          "Invoices",
          "Invoice Value",
          "Paid",
          "Receivable",
        ],
        rows: filteredCustomers.map((row) => [
          row.customerName,
          row.phoneNumber || "-",
          row.city || "-",
          row.address || "-",
          row.salesOrders,
          row.deliveryChallans,
          row.invoices,
          money(row.invoiceValue),
          money(row.paidAmount),
          money(row.receivable),
        ]),
      };
    }

    if (activeTab === "sales") {
      return {
        title: "Sales Order Report",
        headers: [
          "Order No",
          "Customer",
          "Date",
          "Tax",
          "Subtotal",
          "Sales Tax",
          "Grand Total",
          "Status",
        ],
        rows: salesRows.map((row) => [
          row.salesOrderNo,
          row.customerName,
          row.orderDate,
          row.taxType === "with-tax" ? "18%" : "Without Tax",
          money(row.subtotal),
          money(row.salesTax),
          money(row.grandTotal),
          row.status,
        ]),
      };
    }

    if (activeTab === "challans") {
      return {
        title: "Delivery Challan Report",
        headers: [
          "Challan No",
          "Sales Order",
          "Customer",
          "Date",
          "Cartons",
          "Quantity",
          "Status",
        ],
        rows: challanRows.map((row) => [
          row.challanNo,
          row.salesOrderNo,
          row.customerName,
          row.challanDate,
          row.totalCartons,
          row.totalQuantity,
          row.status,
        ]),
      };
    }

    if (activeTab === "invoices") {
      return {
        title: "Invoice / Receivable Report",
        headers: [
          "Invoice No",
          "Customer",
          "Date",
          "Tax",
          "Grand Total",
          "Paid",
          "Balance",
          "Payment",
        ],
        rows: invoiceRows.map((row) => [
          row.invoiceNo,
          row.customerName,
          row.invoiceDate,
          row.taxType === "with-tax" ? "18%" : "Without Tax",
          money(row.grandTotal),
          money(row.paidAmount),
          money(row.balance),
          row.paymentStatus,
        ]),
      };
    }

    if (activeTab === "tax") {
      return {
        title: "Sales Tax Report 18%",
        headers: [
          "Invoice No",
          "Customer",
          "Date",
          "Taxable Value",
          "Sales Tax",
          "Tax Inclusive Value",
        ],
        rows: (taxReport.rows || []).map((row) => [
          row.invoiceNo,
          row.customerName,
          row.invoiceDate,
          money(row.subtotal),
          money(row.salesTax),
          money(row.grandTotal),
        ]),
      };
    }

    if (activeTab === "ledger" && ledgerData) {
      return {
        title: `Customer Ledger - ${ledgerData.customer?.customerName || ""}`,
        headers: ["Invoice No", "Date", "Grand Total", "Paid", "Balance", "Payment"],
        rows: (ledgerData.invoices || []).map((row) => [
          row.invoiceNo,
          row.invoiceDate,
          money(row.grandTotal),
          money(row.paidAmount),
          money(row.balance),
          row.paymentStatus,
        ]),
      };
    }

    return {
      title: "Business Report",
      headers: [],
      rows: [],
    };
  };

  const printCurrentReport = () => {
    const report = buildPrintRows();

    if (!report.rows || report.rows.length === 0) {
      alert("Print ke liye data available nahi hai");
      return;
    }

    const headerCells = report.headers
      .map((header) => `<th>${escapeHtml(header)}</th>`)
      .join("");

    const bodyRows = report.rows
      .map(
        (row) => `
          <tr>
            ${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}
          </tr>
        `
      )
      .join("");

    const summaryHtml = summary
      ? `
        <div class="summary-grid">
          <div><b>Customers</b><span>${escapeHtml(summary.totalCustomers)}</span></div>
          <div><b>Sales Orders</b><span>${escapeHtml(summary.totalSalesOrders)}</span></div>
          <div><b>Invoices</b><span>${escapeHtml(summary.totalInvoices)}</span></div>
          <div><b>Receivable</b><span>${escapeHtml(money(summary.totalReceivable))}</span></div>
        </div>
      `
      : "";

    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
      <html>
        <head>
          <title>${escapeHtml(report.title)}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 12mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, sans-serif;
              color: #111827;
              margin: 0;
              padding: 0;
              background: #ffffff;
            }

            .report-wrapper {
              width: 100%;
            }

            .company-header {
              text-align: center;
              border-bottom: 2px solid #111827;
              padding-bottom: 10px;
              margin-bottom: 12px;
            }

            .company-header h1 {
              margin: 0;
              font-size: 24px;
              letter-spacing: 0.5px;
            }

            .company-header h2 {
              margin: 5px 0 0;
              font-size: 16px;
              text-decoration: underline;
            }

            .company-header p {
              margin: 4px 0 0;
              font-size: 11px;
            }

            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              margin: 12px 0;
            }

            .summary-grid div {
              border: 1px solid #111827;
              padding: 7px;
              display: flex;
              justify-content: space-between;
              gap: 10px;
              font-size: 11px;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            th,
            td {
              border: 1px solid #111827;
              padding: 6px;
              font-size: 10px;
              vertical-align: top;
              word-wrap: break-word;
              overflow-wrap: anywhere;
            }

            th {
              background: #f3f4f6;
              font-weight: bold;
              text-align: center;
            }

            td {
              text-align: left;
            }

            .footer {
              margin-top: 24px;
              display: flex;
              justify-content: space-between;
              font-size: 11px;
            }

            .sign {
              width: 220px;
              border-top: 1px solid #111827;
              padding-top: 6px;
              text-align: center;
              margin-top: 34px;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>

        <body>
          <div class="report-wrapper">
            <div class="company-header">
              <h1>${escapeHtml(COMPANY_NAME)}</h1>
              <h2>${escapeHtml(report.title)}</h2>
              <p>Period: ${escapeHtml(fromDate)} to ${escapeHtml(toDate)}</p>
              <p>Printed: ${escapeHtml(new Date().toLocaleString())}</p>
            </div>

            ${summaryHtml}

            <table>
              <thead>
                <tr>${headerCells}</tr>
              </thead>
              <tbody>
                ${bodyRows}
              </tbody>
            </table>

            <div class="footer">
              <div class="sign">Prepared By</div>
              <div class="sign">Checked By</div>
              <div class="sign">Approved By</div>
            </div>
          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const exportActiveReport = () => {
    if (activeTab === "customers") {
      downloadCSV(
        "customer-wise-report.csv",
        filteredCustomers.map((row) => ({
          customerName: row.customerName,
          phoneNumber: row.phoneNumber,
          city: row.city,
          address: row.address,
          salesOrders: row.salesOrders,
          deliveryChallans: row.deliveryChallans,
          invoices: row.invoices,
          invoiceValue: row.invoiceValue,
          paidAmount: row.paidAmount,
          receivable: row.receivable,
        }))
      );
    }

    if (activeTab === "sales") {
      downloadCSV(
        "sales-orders-report.csv",
        salesRows.map((row) => ({
          salesOrderNo: row.salesOrderNo,
          customerName: row.customerName,
          orderDate: row.orderDate,
          taxType: row.taxType,
          subtotal: row.subtotal,
          salesTax: row.salesTax,
          grandTotal: row.grandTotal,
          advance: row.advance,
          balance: row.balance,
          status: row.status,
        }))
      );
    }

    if (activeTab === "challans") {
      downloadCSV(
        "delivery-challans-report.csv",
        challanRows.map((row) => ({
          challanNo: row.challanNo,
          salesOrderNo: row.salesOrderNo,
          customerName: row.customerName,
          challanDate: row.challanDate,
          totalCartons: row.totalCartons,
          totalQuantity: row.totalQuantity,
          status: row.status,
        }))
      );
    }

    if (activeTab === "invoices") {
      downloadCSV(
        "invoice-receivable-report.csv",
        invoiceRows.map((row) => ({
          invoiceNo: row.invoiceNo,
          customerName: row.customerName,
          challanNo: row.challanNo,
          invoiceDate: row.invoiceDate,
          taxType: row.taxType,
          subtotal: row.subtotal,
          salesTax: row.salesTax,
          grandTotal: row.grandTotal,
          paidAmount: row.paidAmount,
          balance: row.balance,
          paymentStatus: row.paymentStatus,
        }))
      );
    }

    if (activeTab === "tax") {
      downloadCSV(
        "sales-tax-report.csv",
        (taxReport.rows || []).map((row) => ({
          invoiceNo: row.invoiceNo,
          customerName: row.customerName,
          invoiceDate: row.invoiceDate,
          taxableValue: row.subtotal,
          salesTax: row.salesTax,
          taxInclusiveValue: row.grandTotal,
        }))
      );
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="text-blue-700" size={28} />
              Business Reports
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Customer wise performance, sales, delivery, invoice, receivable aur tax reports.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-end">
            <div>
              <label className="text-xs font-bold text-slate-600">From</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="block border rounded-lg px-3 py-2 mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600">To</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="block border rounded-lg px-3 py-2 mt-1"
              />
            </div>

            <button
              onClick={loadReports}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Calendar size={18} />}
              Apply
            </button>

            <button
              onClick={exportActiveReport}
              className="inline-flex items-center justify-center gap-2 border border-slate-200 px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-50"
            >
              <Download size={18} />
              Export CSV
            </button>

            <button
              onClick={printCurrentReport}
              className="inline-flex items-center justify-center gap-2 border border-slate-200 px-5 py-2.5 rounded-xl font-semibold hover:bg-slate-50"
            >
              <Printer size={18} />
              Print
            </button>
          </div>
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Customers"
            value={summary.totalCustomers}
            icon={Users}
            note="Registered customers"
          />

          <StatCard
            title="Sales Orders"
            value={summary.totalSalesOrders}
            icon={FileText}
            note={money(summary.totalOrderValue)}
          />

          <StatCard
            title="Invoices"
            value={summary.totalInvoices}
            icon={Receipt}
            note={money(summary.totalInvoiceValue)}
          />

          <StatCard
            title="Receivable"
            value={money(summary.totalReceivable)}
            icon={Banknote}
            note={`Paid: ${money(summary.totalPaid)}`}
          />
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex flex-wrap gap-2 p-4 border-b bg-slate-50">
          {[
            { id: "customers", label: "Customer Wise", icon: Users },
            { id: "sales", label: "Sales Orders", icon: FileText },
            { id: "challans", label: "Delivery Challans", icon: Truck },
            { id: "invoices", label: "Invoices / Receivable", icon: Receipt },
            { id: "tax", label: "Sales Tax 18%", icon: BadgePercent },
            { id: "ledger", label: "Customer Ledger", icon: Eye },
          ].map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-5">
          {loading && (
            <div className="p-12 text-center">
              <Loader2 className="animate-spin mx-auto text-blue-600" size={36} />
              <p className="text-sm text-slate-500 mt-3">Reports loading...</p>
            </div>
          )}

          {!loading && activeTab === "customers" && (
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <h2 className="text-lg font-bold text-slate-900">Customer Wise Report</h2>

                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="border rounded-xl pl-9 pr-3 py-2 w-full md:w-80"
                    placeholder="Search customer, phone, city..."
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="p-3 text-left border">Customer</th>
                      <th className="p-3 text-left border">Phone</th>
                      <th className="p-3 text-left border">City</th>
                      <th className="p-3 text-left border">Address</th>
                      <th className="p-3 text-right border">Orders</th>
                      <th className="p-3 text-right border">Challans</th>
                      <th className="p-3 text-right border">Invoices</th>
                      <th className="p-3 text-right border">Invoice Value</th>
                      <th className="p-3 text-right border">Paid</th>
                      <th className="p-3 text-right border">Receivable</th>
                      <th className="p-3 text-center border">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredCustomers.map((row) => (
                      <tr key={row.customerId} className="hover:bg-slate-50">
                        <td className="p-3 border font-bold">{row.customerName}</td>
                        <td className="p-3 border">{row.phoneNumber || "-"}</td>
                        <td className="p-3 border">{row.city || "-"}</td>
                        <td className="p-3 border max-w-[220px]">{row.address || "-"}</td>
                        <td className="p-3 border text-right">{row.salesOrders}</td>
                        <td className="p-3 border text-right">{row.deliveryChallans}</td>
                        <td className="p-3 border text-right">{row.invoices}</td>
                        <td className="p-3 border text-right font-bold">
                          {money(row.invoiceValue)}
                        </td>
                        <td className="p-3 border text-right">{money(row.paidAmount)}</td>
                        <td className="p-3 border text-right font-bold text-red-600">
                          {money(row.receivable)}
                        </td>

                        <td className="p-3 border text-center">
                          <button
                            onClick={() => loadCustomerLedger(row.customerId)}
                            className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100"
                          >
                            View Ledger
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td className="p-8 text-center text-slate-500" colSpan="11">
                          No customer report found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && activeTab === "sales" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Sales Order Report</h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3 border text-left">Order No</th>
                      <th className="p-3 border text-left">Customer</th>
                      <th className="p-3 border text-left">Date</th>
                      <th className="p-3 border text-left">Tax</th>
                      <th className="p-3 border text-right">Subtotal</th>
                      <th className="p-3 border text-right">Tax</th>
                      <th className="p-3 border text-right">Grand Total</th>
                      <th className="p-3 border text-center">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {salesRows.map((row) => (
                      <tr key={row._id}>
                        <td className="p-3 border font-bold text-blue-700">{row.salesOrderNo}</td>
                        <td className="p-3 border">{row.customerName}</td>
                        <td className="p-3 border">{formatDate(row.orderDate)}</td>
                        <td className="p-3 border">
                          {row.taxType === "with-tax" ? "18%" : "Without Tax"}
                        </td>
                        <td className="p-3 border text-right">{money(row.subtotal)}</td>
                        <td className="p-3 border text-right">{money(row.salesTax)}</td>
                        <td className="p-3 border text-right font-bold">
                          {money(row.grandTotal)}
                        </td>
                        <td className="p-3 border text-center">{row.status}</td>
                      </tr>
                    ))}

                    {salesRows.length === 0 && (
                      <tr>
                        <td className="p-8 text-center text-slate-500" colSpan="8">
                          No sales orders found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && activeTab === "challans" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Delivery Challan Report</h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3 border text-left">Challan No</th>
                      <th className="p-3 border text-left">Sales Order</th>
                      <th className="p-3 border text-left">Customer</th>
                      <th className="p-3 border text-left">Date</th>
                      <th className="p-3 border text-right">Cartons</th>
                      <th className="p-3 border text-right">Quantity</th>
                      <th className="p-3 border text-center">Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {challanRows.map((row) => (
                      <tr key={row._id}>
                        <td className="p-3 border font-bold text-blue-700">{row.challanNo}</td>
                        <td className="p-3 border">{row.salesOrderNo}</td>
                        <td className="p-3 border">{row.customerName}</td>
                        <td className="p-3 border">{formatDate(row.challanDate)}</td>
                        <td className="p-3 border text-right">{row.totalCartons}</td>
                        <td className="p-3 border text-right">{row.totalQuantity}</td>
                        <td className="p-3 border text-center">{row.status}</td>
                      </tr>
                    ))}

                    {challanRows.length === 0 && (
                      <tr>
                        <td className="p-8 text-center text-slate-500" colSpan="7">
                          No delivery challans found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && activeTab === "invoices" && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">Invoice / Receivable Report</h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3 border text-left">Invoice No</th>
                      <th className="p-3 border text-left">Customer</th>
                      <th className="p-3 border text-left">Date</th>
                      <th className="p-3 border text-left">Tax</th>
                      <th className="p-3 border text-right">Grand Total</th>
                      <th className="p-3 border text-right">Paid</th>
                      <th className="p-3 border text-right">Balance</th>
                      <th className="p-3 border text-center">Payment</th>
                    </tr>
                  </thead>

                  <tbody>
                    {invoiceRows.map((row) => (
                      <tr key={row._id}>
                        <td className="p-3 border font-bold text-blue-700">{row.invoiceNo}</td>
                        <td className="p-3 border">{row.customerName}</td>
                        <td className="p-3 border">{formatDate(row.invoiceDate)}</td>
                        <td className="p-3 border">
                          {row.taxType === "with-tax" ? "18%" : "Without Tax"}
                        </td>
                        <td className="p-3 border text-right font-bold">
                          {money(row.grandTotal)}
                        </td>
                        <td className="p-3 border text-right">{money(row.paidAmount)}</td>
                        <td className="p-3 border text-right font-bold text-red-600">
                          {money(row.balance)}
                        </td>
                        <td className="p-3 border text-center">{row.paymentStatus}</td>
                      </tr>
                    ))}

                    {invoiceRows.length === 0 && (
                      <tr>
                        <td className="p-8 text-center text-slate-500" colSpan="8">
                          No invoices found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && activeTab === "tax" && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-slate-900">Sales Tax Report 18%</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                  title="Taxable Value"
                  value={money(taxReport.summary?.taxableValue)}
                  icon={Banknote}
                />

                <StatCard
                  title="Sales Tax 18%"
                  value={money(taxReport.summary?.salesTax)}
                  icon={BadgePercent}
                />

                <StatCard
                  title="Tax Inclusive Value"
                  value={money(taxReport.summary?.taxInclusiveValue)}
                  icon={Receipt}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="p-3 border text-left">Invoice No</th>
                      <th className="p-3 border text-left">Customer</th>
                      <th className="p-3 border text-left">Date</th>
                      <th className="p-3 border text-right">Taxable Value</th>
                      <th className="p-3 border text-right">Sales Tax</th>
                      <th className="p-3 border text-right">Tax Inclusive</th>
                    </tr>
                  </thead>

                  <tbody>
                    {(taxReport.rows || []).map((row) => (
                      <tr key={row._id}>
                        <td className="p-3 border font-bold text-blue-700">{row.invoiceNo}</td>
                        <td className="p-3 border">{row.customerName}</td>
                        <td className="p-3 border">{row.invoiceDate}</td>
                        <td className="p-3 border text-right">{money(row.subtotal)}</td>
                        <td className="p-3 border text-right">{money(row.salesTax)}</td>
                        <td className="p-3 border text-right font-bold">
                          {money(row.grandTotal)}
                        </td>
                      </tr>
                    ))}

                    {(taxReport.rows || []).length === 0 && (
                      <tr>
                        <td className="p-8 text-center text-slate-500" colSpan="6">
                          No tax invoices found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {!loading && activeTab === "ledger" && (
            <div className="space-y-5">
              {!ledgerData ? (
                <div className="p-10 text-center border border-dashed rounded-2xl">
                  <AlertCircle className="mx-auto text-slate-300 mb-3" size={34} />
                  <h3 className="font-bold text-slate-700">Customer Ledger</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Customer Wise report se kisi customer ka ledger open karein.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <button
                      onClick={() => setActiveTab("customers")}
                      className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-2"
                    >
                      <ArrowLeft size={16} />
                      Back to Customers
                    </button>

                    <h2 className="text-xl font-bold text-slate-900">
                      {ledgerData.customer?.customerName}
                    </h2>

                    <p className="text-sm text-slate-500">
                      {ledgerData.customer?.phoneNumber} | {ledgerData.customer?.city}
                    </p>
                    <p className="text-sm text-slate-500">
                      {ledgerData.customer?.address}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                      title="Invoice Value"
                      value={money(ledgerData.summary?.invoiceValue)}
                      icon={Receipt}
                    />

                    <StatCard
                      title="Paid Amount"
                      value={money(ledgerData.summary?.paidAmount)}
                      icon={Banknote}
                    />

                    <StatCard
                      title="Receivable"
                      value={money(ledgerData.summary?.receivable)}
                      icon={AlertCircle}
                    />
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 mb-3">Customer Invoices</h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="p-3 border text-left">Invoice No</th>
                            <th className="p-3 border text-left">Date</th>
                            <th className="p-3 border text-right">Grand Total</th>
                            <th className="p-3 border text-right">Paid</th>
                            <th className="p-3 border text-right">Balance</th>
                            <th className="p-3 border text-center">Payment</th>
                          </tr>
                        </thead>

                        <tbody>
                          {ledgerData.invoices?.map((row) => (
                            <tr key={row._id}>
                              <td className="p-3 border font-bold text-blue-700">
                                {row.invoiceNo}
                              </td>
                              <td className="p-3 border">{row.invoiceDate}</td>
                              <td className="p-3 border text-right">
                                {money(row.grandTotal)}
                              </td>
                              <td className="p-3 border text-right">
                                {money(row.paidAmount)}
                              </td>
                              <td className="p-3 border text-right font-bold text-red-600">
                                {money(row.balance)}
                              </td>
                              <td className="p-3 border text-center">{row.paymentStatus}</td>
                            </tr>
                          ))}

                          {ledgerData.invoices?.length === 0 && (
                            <tr>
                              <td className="p-8 text-center text-slate-500" colSpan="6">
                                No invoices found for this customer
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 mb-3">Sales Orders</h3>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm border">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="p-3 border text-left">Order No</th>
                            <th className="p-3 border text-left">Date</th>
                            <th className="p-3 border text-right">Value</th>
                            <th className="p-3 border text-center">Status</th>
                          </tr>
                        </thead>

                        <tbody>
                          {ledgerData.salesOrders?.map((row) => (
                            <tr key={row._id}>
                              <td className="p-3 border font-bold text-blue-700">
                                {row.salesOrderNo}
                              </td>
                              <td className="p-3 border">{row.orderDate}</td>
                              <td className="p-3 border text-right">
                                {money(row.grandTotal)}
                              </td>
                              <td className="p-3 border text-center">{row.status}</td>
                            </tr>
                          ))}

                          {ledgerData.salesOrders?.length === 0 && (
                            <tr>
                              <td className="p-8 text-center text-slate-500" colSpan="4">
                                No sales orders found
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;