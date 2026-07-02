import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Printer,
  Loader2,
  Receipt,
  Edit2,
  X,
  Save,
  ArrowLeft,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const emptyItem = {
  description: "",
  size: "",
  cartons: "",
  quantity: "",
  unit: "Rolls",
  unitPrice: "",
};

const todayDate = () => new Date().toISOString().slice(0, 10);
const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

const RequiredLabel = ({ children }) => (
  <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
    {children}
    <AlertCircle size={12} className="text-red-600" />
  </label>
);

const NormalLabel = ({ children }) => (
  <label className="text-xs font-bold text-slate-600">{children}</label>
);

const Invoices = () => {
  const [challans, setChallans] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [invoices, setInvoices] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    invoiceNo: "",
    deliveryChallan: "",
    invoiceDate: todayDate(),
    poNo: "",
    taxType: "without-tax",
    salesTaxRegNo: "",
    nationalTaxNo: "",
    paidAmount: "",
    status: "Draft",
    remarks: "",
    items: [{ ...emptyItem }],
  });

  const fetchChallans = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/delivery-challans/all`);
      const data = await res.json();
      setChallans(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Challan loading error:", error);
      setChallans([]);
    }
  };

  const fetchSalesOrders = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/sales-orders/all`);
      const data = await res.json();
      setSalesOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Sales order loading error:", error);
      setSalesOrders([]);
    }
  };

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/invoices/all`);
      const data = await res.json();
      setInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Invoice loading error:", error);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNextNo = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/invoices/next-no`);
      const data = await res.json();
      setForm((prev) => ({ ...prev, invoiceNo: data.invoiceNo || "" }));
    } catch (error) {
      setForm((prev) => ({ ...prev, invoiceNo: "" }));
    }
  };

  useEffect(() => {
    fetchChallans();
    fetchSalesOrders();
    fetchInvoices();
  }, []);

  const selectedChallan = useMemo(() => {
    return challans.find((challan) => challan._id === form.deliveryChallan);
  }, [challans, form.deliveryChallan]);

  const selectedSalesOrder = useMemo(() => {
    if (!selectedChallan) return null;

    const salesOrderId =
      selectedChallan.salesOrder?._id || selectedChallan.salesOrder || "";

    return salesOrders.find((order) => order._id === salesOrderId);
  }, [selectedChallan, salesOrders]);

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.unitPrice || 0);
    }, 0);

    const salesTax = form.taxType === "with-tax" ? subtotal * 0.18 : 0;
    const grandTotal = subtotal + salesTax;
    const balance = grandTotal - Number(form.paidAmount || 0);

    return { subtotal, salesTax, grandTotal, balance };
  }, [form.items, form.taxType, form.paidAmount]);

  const openNewForm = async () => {
    setEditId(null);
    setForm({
      invoiceNo: "",
      deliveryChallan: "",
      invoiceDate: todayDate(),
      poNo: "",
      taxType: "without-tax",
      salesTaxRegNo: "",
      nationalTaxNo: "",
      paidAmount: "",
      status: "Draft",
      remarks: "",
      items: [{ ...emptyItem }],
    });

    await fetchNextNo();
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
  };

  const getRateFromSalesOrder = (challanItem, index, order) => {
    if (!order || !order.items) return "";

    const exactItem = order.items.find(
      (item) =>
        item.description === challanItem.description &&
        item.size === challanItem.size
    );

    if (exactItem) return exactItem.unitPrice || "";

    return order.items[index]?.unitPrice || "";
  };

  const handleChallanChange = (challanId) => {
    const challan = challans.find((item) => item._id === challanId);

    if (!challan) {
      setForm({
        ...form,
        deliveryChallan: "",
        poNo: "",
        taxType: "without-tax",
        items: [{ ...emptyItem }],
      });
      return;
    }

    const salesOrderId = challan.salesOrder?._id || challan.salesOrder || "";
    const order = salesOrders.find((item) => item._id === salesOrderId);

    setForm({
      ...form,
      deliveryChallan: challan._id,
      poNo: challan.poNo || order?.poNo || "",
      taxType: order?.taxType || "without-tax",
      items:
        challan.items && challan.items.length > 0
          ? challan.items.map((item, index) => ({
              description: item.description || "",
              size: item.size || "",
              cartons: item.cartons || "",
              quantity: item.quantity || "",
              unit: item.unit || "Rolls",
              unitPrice: getRateFromSalesOrder(item, index, order),
            }))
          : [{ ...emptyItem }],
    });
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...form.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setForm({ ...form, items: updatedItems });
  };

  const addItemRow = () => {
    setForm({ ...form, items: [...form.items, { ...emptyItem }] });
  };

  const removeItemRow = (index) => {
    if (form.items.length === 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  };

  const handleSubmit = async () => {
    if (!form.invoiceNo.trim()) {
      alert("Invoice No required hai");
      return;
    }

    if (!form.deliveryChallan) {
      alert("Delivery Challan select karein");
      return;
    }

    if (!form.invoiceDate) {
      alert("Invoice Date required hai");
      return;
    }

    const validItems = form.items.filter(
      (item) =>
        item.description.trim() &&
        Number(item.quantity || 0) > 0 &&
        Number(item.unitPrice || 0) >= 0
    );

    if (validItems.length === 0) {
      alert("Please at least one valid invoice item add karein");
      return;
    }

    const payload = {
      ...form,
      items: validItems,
      paidAmount: Number(form.paidAmount || 0),
    };

    setSaving(true);

    try {
      const url = editId
        ? `${API_BASE_URL}/invoices/update/${editId}`
        : `${API_BASE_URL}/invoices/add`;

      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Server error");
        return;
      }

      await fetchInvoices();
      await fetchSalesOrders();
      closeForm();
    } catch (error) {
      alert("Invoice save nahi hui. Backend check karein.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (invoice) => {
    setEditId(invoice._id);

    setForm({
      invoiceNo: invoice.invoiceNo || "",
      deliveryChallan: invoice.deliveryChallan?._id || invoice.deliveryChallan || "",
      invoiceDate: invoice.invoiceDate || todayDate(),
      poNo: invoice.poNo || "",
      taxType: invoice.taxType || "without-tax",
      salesTaxRegNo: invoice.salesTaxRegNo || "",
      nationalTaxNo: invoice.nationalTaxNo || "",
      paidAmount: invoice.paidAmount || "",
      status: invoice.status || "Draft",
      remarks: invoice.remarks || "",
      items: invoice.items?.length ? invoice.items : [{ ...emptyItem }],
    });

    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this invoice?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/invoices/delete/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchInvoices();
      } else {
        alert("Delete failed");
      }
    } catch (error) {
      alert("Delete error");
    }
  };

  const printInvoice = (invoice) => {
    const rows = invoice.items
      .map(
        (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.description || ""}<br/><small>${item.size || ""}</small></td>
          <td>${item.cartons || ""}</td>
          <td>${item.quantity || ""}</td>
          <td>${item.unit || ""}</td>
          <td>${Number(item.unitPrice || 0).toLocaleString()}</td>
          <td>${Number(item.amount || 0).toLocaleString()}</td>
        </tr>
      `
      )
      .join("");

    const taxRow =
      invoice.taxType === "with-tax"
        ? `<div><span>Sales Tax 18%</span><b>${money(invoice.salesTax)}</b></div>`
        : `<div><span>Sales Tax</span><b>Without Tax</b></div>`;

    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
      <html>
        <head>
          <title>${invoice.invoiceNo}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 32px;
              color: #111827;
            }
            .top {
              text-align: center;
              border-bottom: 2px solid #111827;
              padding-bottom: 10px;
            }
            .top h1 {
              margin: 0;
              font-size: 30px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .top p {
              margin: 4px 0;
              font-size: 12px;
            }
            .title {
              text-align: center;
              font-size: 18px;
              font-weight: bold;
              text-decoration: underline;
              margin: 18px 0;
            }
            .meta {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 12px;
            }
            .box {
              border: 1px solid #111827;
              padding: 10px;
              min-height: 80px;
              font-size: 13px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }
            th, td {
              border: 1px solid #111827;
              padding: 7px;
              font-size: 12px;
              text-align: left;
            }
            th {
              background: #f3f4f6;
              text-align: center;
            }
            .totals {
              width: 340px;
              margin-left: auto;
              margin-top: 14px;
              font-size: 13px;
            }
            .totals div {
              display: flex;
              justify-content: space-between;
              border-bottom: 1px solid #d1d5db;
              padding: 6px 0;
            }
            .grand {
              font-size: 15px;
              font-weight: bold;
              border-top: 2px solid #111827;
            }
            .footer {
              margin-top: 70px;
              display: flex;
              justify-content: space-between;
              font-size: 13px;
            }
            .line {
              margin-top: 34px;
              border-top: 1px solid #111827;
              padding-top: 6px;
              width: 220px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <div class="top">
            <h1>Urwa Packages</h1>
            <p>Commercial Invoice</p>
            <p>Lahore, Pakistan</p>
          </div>

          <div class="title">COMMERCIAL INVOICE</div>

          <div class="meta">
            <div class="box">
              <b>Customer Name:</b><br/>
              ${invoice.customerName || ""}<br/>
              <b>Address:</b> ${invoice.customerAddress || ""}<br/>
              <b>Phone:</b> ${invoice.customerPhone || ""}<br/>
              <b>Sales Tax Reg #:</b> ${invoice.salesTaxRegNo || "-"}<br/>
              <b>National Tax #:</b> ${invoice.nationalTaxNo || "-"}
            </div>

            <div class="box">
              <b>Invoice No:</b> ${invoice.invoiceNo || ""}<br/>
              <b>Dated:</b> ${invoice.invoiceDate || ""}<br/>
              <b>Delivery Challan:</b> ${invoice.challanNo || ""}<br/>
              <b>Sales Order:</b> ${invoice.salesOrderNo || ""}<br/>
              <b>PO #:</b> ${invoice.poNo || ""}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:50px;">Sr</th>
                <th>Description</th>
                <th>Cartons</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Unit Price</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="totals">
            <div><span>Total</span><b>${money(invoice.subtotal)}</b></div>
            ${taxRow}
            <div class="grand"><span>Tax Inclusive Value</span><b>${money(invoice.grandTotal)}</b></div>
            <div><span>Paid Amount</span><b>${money(invoice.paidAmount)}</b></div>
            <div><span>Balance</span><b>${money(invoice.balance)}</b></div>
          </div>

          <p><b>Remarks:</b> ${invoice.remarks || ""}</p>

          <div class="footer">
            <div class="line">Prepared By</div>
            <div class="line">For the Company</div>
          </div>

          <script>window.print();</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  if (showForm) {
    return (
      <div className="w-full space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <button
                onClick={closeForm}
                className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-3"
              >
                <ArrowLeft size={17} />
                Back to Invoices
              </button>

              <h1 className="text-2xl font-bold text-slate-900">
                {editId ? "Edit Invoice" : "New Invoice"}
              </h1>

              <p className="text-sm text-slate-500 mt-1">
                Delivery Challan select karein, rates Sales Order se auto load honge.
              </p>
            </div>

            <button
              onClick={closeForm}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50"
            >
              <X size={18} />
              Cancel
            </button>
          </div>

          <div className="pt-5 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <RequiredLabel>Invoice No</RequiredLabel>
                <input
                  value={form.invoiceNo}
                  onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="INV-2026-0001"
                />
              </div>

              <div>
                <RequiredLabel>Delivery Challan</RequiredLabel>
                <select
                  value={form.deliveryChallan}
                  onChange={(e) => handleChallanChange(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                >
                  <option value="">Select Delivery Challan</option>
                  {challans.map((challan) => (
                    <option key={challan._id} value={challan._id}>
                      {challan.challanNo} - {challan.customerName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <RequiredLabel>Invoice Date</RequiredLabel>
                <input
                  type="date"
                  value={form.invoiceDate}
                  onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                />
              </div>

              <div>
                <RequiredLabel>Status</RequiredLabel>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                >
                  <option>Draft</option>
                  <option>Issued</option>
                  <option>Paid</option>
                  <option>Cancelled</option>
                </select>
              </div>

              <div>
                <NormalLabel>PO No</NormalLabel>
                <input
                  value={form.poNo}
                  onChange={(e) => setForm({ ...form, poNo: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="Customer PO No"
                />
              </div>

              <div>
                <RequiredLabel>Tax Type</RequiredLabel>
                <select
                  value={form.taxType}
                  onChange={(e) => setForm({ ...form, taxType: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                >
                  <option value="without-tax">Without Tax</option>
                  <option value="with-tax">With Sales Tax 18%</option>
                </select>
              </div>

              <div>
                <NormalLabel>Sales Tax Reg #</NormalLabel>
                <input
                  value={form.salesTaxRegNo}
                  onChange={(e) => setForm({ ...form, salesTaxRegNo: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="03-00-0000-000-00"
                />
              </div>

              <div>
                <NormalLabel>National Tax #</NormalLabel>
                <input
                  value={form.nationalTaxNo}
                  onChange={(e) => setForm({ ...form, nationalTaxNo: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="0000000-0"
                />
              </div>

              <div>
                <NormalLabel>Paid Amount</NormalLabel>
                <input
                  type="number"
                  value={form.paidAmount}
                  onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="0"
                />
              </div>
            </div>

            {selectedChallan && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900">
                <b>Customer:</b> {selectedChallan.customerName} &nbsp; | &nbsp;
                <b>Delivery Challan:</b> {selectedChallan.challanNo} &nbsp; | &nbsp;
                <b>Sales Order:</b> {selectedChallan.salesOrderNo}
              </div>
            )}

            <div className="border rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 flex justify-between items-center">
                <div>
                  <h3 className="font-bold">Invoice Items</h3>
                  <p className="text-xs text-slate-500">
                    Quantity delivery challan se aur rate sales order se load hoga.
                  </p>
                </div>

                <button
                  onClick={addItemRow}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Add Row
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white border-b text-slate-600">
                      <th className="p-2 text-left">
                        Description <span className="text-red-600">*</span>
                      </th>
                      <th className="p-2 text-left">Size</th>
                      <th className="p-2 text-left">Cartons</th>
                      <th className="p-2 text-left">
                        Qty <span className="text-red-600">*</span>
                      </th>
                      <th className="p-2 text-left">Unit</th>
                      <th className="p-2 text-left">
                        Unit Price <span className="text-red-600">*</span>
                      </th>
                      <th className="p-2 text-right">Amount</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>

                  <tbody>
                    {form.items.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 min-w-[240px]">
                          <input
                            value={item.description}
                            onChange={(e) => updateItem(index, "description", e.target.value)}
                            className="w-full border rounded px-2 py-1.5"
                            placeholder="Packing Tape Printed"
                          />
                        </td>

                        <td className="p-2 min-w-[150px]">
                          <input
                            value={item.size}
                            onChange={(e) => updateItem(index, "size", e.target.value)}
                            className="w-full border rounded px-2 py-1.5"
                            placeholder='2" x 72 Yards'
                          />
                        </td>

                        <td className="p-2 min-w-[100px]">
                          <input
                            type="number"
                            value={item.cartons}
                            onChange={(e) => updateItem(index, "cartons", e.target.value)}
                            className="w-full border rounded px-2 py-1.5"
                            placeholder="5"
                          />
                        </td>

                        <td className="p-2 min-w-[100px]">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(index, "quantity", e.target.value)}
                            className="w-full border rounded px-2 py-1.5"
                            placeholder="450"
                          />
                        </td>

                        <td className="p-2 min-w-[100px]">
                          <input
                            value={item.unit}
                            onChange={(e) => updateItem(index, "unit", e.target.value)}
                            className="w-full border rounded px-2 py-1.5"
                            placeholder="Rolls"
                          />
                        </td>

                        <td className="p-2 min-w-[120px]">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(index, "unitPrice", e.target.value)}
                            className="w-full border rounded px-2 py-1.5"
                            placeholder="190"
                          />
                        </td>

                        <td className="p-2 text-right font-bold">
                          {money(Number(item.quantity || 0) * Number(item.unitPrice || 0))}
                        </td>

                        <td className="p-2 text-center">
                          <button
                            onClick={() => removeItemRow(index)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <NormalLabel>Remarks</NormalLabel>
                <textarea
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1 min-h-[150px]"
                  placeholder="Invoice remarks..."
                />
              </div>

              <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                <div className="flex justify-between">
                  <span>Total</span>
                  <b>{money(totals.subtotal)}</b>
                </div>

                <div className="flex justify-between">
                  <span>Sales Tax {form.taxType === "with-tax" ? "18%" : "0%"}</span>
                  <b>{money(totals.salesTax)}</b>
                </div>

                <div className="flex justify-between text-lg border-t pt-3">
                  <span>Tax Inclusive Value</span>
                  <b>{money(totals.grandTotal)}</b>
                </div>

                <div className="flex justify-between">
                  <span>Paid Amount</span>
                  <b>{money(form.paidAmount)}</b>
                </div>

                <div className="flex justify-between text-red-600">
                  <span>Balance</span>
                  <b>{money(totals.balance)}</b>
                </div>
              </div>
            </div>

            <div className="border-t pt-5 flex justify-end gap-3">
              <button onClick={closeForm} className="px-5 py-2.5 rounded-xl border">
                Cancel
              </button>

              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {saving ? "Saving..." : "Save Invoice"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="text-blue-600" size={26} />
            Invoices
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Delivery Challan se commercial invoice create karein, tax aur payment track karein.
          </p>
        </div>

        <button
          onClick={openNewForm}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm"
        >
          <Plus size={18} />
          New Invoice
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Total Invoices</p>
          <h3 className="text-2xl font-bold">{invoices.length}</h3>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Invoice Value</p>
          <h3 className="text-2xl font-bold">
            {money(invoices.reduce((s, inv) => s + Number(inv.grandTotal || 0), 0))}
          </h3>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Sales Tax</p>
          <h3 className="text-2xl font-bold">
            {money(invoices.reduce((s, inv) => s + Number(inv.salesTax || 0), 0))}
          </h3>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Receivable</p>
          <h3 className="text-2xl font-bold">
            {money(invoices.reduce((s, inv) => s + Number(inv.balance || 0), 0))}
          </h3>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">Invoice No</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Challan</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-right">Grand Total</th>
                <th className="p-3 text-right">Balance</th>
                <th className="p-3 text-center">Payment</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-10 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-600" />
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-10 text-center text-slate-500">
                    No invoice found
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice._id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-bold text-blue-700">{invoice.invoiceNo}</td>

                    <td className="p-3">
                      <div className="font-semibold">{invoice.customerName}</div>
                      <div className="text-xs text-slate-500">{invoice.customerPhone}</div>
                    </td>

                    <td className="p-3">{invoice.challanNo}</td>

                    <td className="p-3">{invoice.invoiceDate}</td>

                    <td className="p-3 text-right font-bold">{money(invoice.grandTotal)}</td>

                    <td className="p-3 text-right font-bold text-red-600">
                      {money(invoice.balance)}
                    </td>

                    <td className="p-3 text-center">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 inline-flex items-center gap-1">
                        <CreditCard size={13} />
                        {invoice.paymentStatus}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => printInvoice(invoice)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                          title="Print"
                        >
                          <Printer size={16} />
                        </button>

                        <button
                          onClick={() => handleEdit(invoice)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          onClick={() => handleDelete(invoice._id)}
                          className="p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Invoices;