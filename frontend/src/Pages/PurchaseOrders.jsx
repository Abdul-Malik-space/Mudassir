import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Printer,
  Loader2,
  FileText,
  Edit2,
  X,
  Save,
  ArrowLeft,
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
  <label className="text-xs font-bold text-slate-600">
    {children} <span className="text-red-600">*</span>
  </label>
);

const NormalLabel = ({ children }) => (
  <label className="text-xs font-bold text-slate-600">{children}</label>
);

const PurchaseOrders = () => {
  const [vendors, setVendors] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    purchaseOrderNo: "",
    vendor: "",
    orderDate: todayDate(),
    expectedDate: "",
    referenceNo: "",
    taxType: "without-tax",
    advance: "",
    status: "Draft",
    remarks: "",
    items: [{ ...emptyItem }],
  });

  // Vendor dropdown ke liye vendors load honge
  const fetchVendors = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/vendors/all`);
      const data = await res.json();

      if (Array.isArray(data)) {
        setVendors(data);
      } else if (data.vendors && Array.isArray(data.vendors)) {
        setVendors(data.vendors);
      } else {
        setVendors([]);
      }
    } catch (error) {
      console.error("Vendor loading error:", error);
      setVendors([]);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/purchase-orders/all`);
      const data = await res.json();

      if (Array.isArray(data)) {
        setOrders(data);
      } else if (data.purchaseOrders && Array.isArray(data.purchaseOrders)) {
        setOrders(data.purchaseOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Purchase order loading error:", error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNextNo = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/purchase-orders/next-no`);
      const data = await res.json();

      setForm((prev) => ({
        ...prev,
        purchaseOrderNo: data.purchaseOrderNo || "",
      }));
    } catch (error) {
      setForm((prev) => ({
        ...prev,
        purchaseOrderNo: "",
      }));
    }
  };

  useEffect(() => {
    fetchVendors();
    fetchOrders();
  }, []);

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.unitPrice || 0);
    }, 0);

    const salesTax = form.taxType === "with-tax" ? subtotal * 0.18 : 0;
    const grandTotal = subtotal + salesTax;
    const balance = grandTotal - Number(form.advance || 0);

    return { subtotal, salesTax, grandTotal, balance };
  }, [form.items, form.taxType, form.advance]);

  const openNewForm = async () => {
    setEditId(null);

    setForm({
      purchaseOrderNo: "",
      vendor: "",
      orderDate: todayDate(),
      expectedDate: "",
      referenceNo: "",
      taxType: "without-tax",
      advance: "",
      status: "Draft",
      remarks: "",
      items: [{ ...emptyItem }],
    });

    await fetchVendors();
    await fetchNextNo();

    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
  };

  const updateItem = (index, field, value) => {
    const updatedItems = [...form.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };

    setForm({
      ...form,
      items: updatedItems,
    });
  };

  const addItemRow = () => {
    setForm({
      ...form,
      items: [...form.items, { ...emptyItem }],
    });
  };

  const removeItemRow = (index) => {
    if (form.items.length === 1) return;

    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async () => {
    if (!form.purchaseOrderNo.trim()) {
      alert("Purchase Order No required hai");
      return;
    }

    if (!form.vendor) {
      alert("Vendor select karein");
      return;
    }

    if (!form.orderDate) {
      alert("Order Date required hai");
      return;
    }

    const validItems = form.items.filter(
      (item) =>
        item.description.trim() &&
        Number(item.quantity || 0) > 0 &&
        Number(item.unitPrice || 0) >= 0
    );

    if (validItems.length === 0) {
      alert("Please at least one valid item add karein");
      return;
    }

    const payload = {
      ...form,
      items: validItems,
      advance: Number(form.advance || 0),
      subtotal: totals.subtotal,
      salesTax: totals.salesTax,
      grandTotal: totals.grandTotal,
      balance: totals.balance,
    };

    setSaving(true);

    try {
      const url = editId
        ? `${API_BASE_URL}/purchase-orders/update/${editId}`
        : `${API_BASE_URL}/purchase-orders/add`;

      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Server error");
        return;
      }

      await fetchOrders();
      closeForm();
    } catch (error) {
      alert("Purchase order save nahi hua. Backend check karein.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (order) => {
    await fetchVendors();

    setEditId(order._id);

    setForm({
      purchaseOrderNo: order.purchaseOrderNo || "",
      vendor: order.vendor?._id || order.vendor || "",
      orderDate: order.orderDate || todayDate(),
      expectedDate: order.expectedDate || "",
      referenceNo: order.referenceNo || "",
      taxType: order.taxType || "without-tax",
      advance: order.advance || "",
      status: order.status || "Draft",
      remarks: order.remarks || "",
      items: order.items?.length ? order.items : [{ ...emptyItem }],
    });

    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this purchase order?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/purchase-orders/delete/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchOrders();
      } else {
        alert("Delete failed");
      }
    } catch (error) {
      alert("Delete error");
    }
  };

  const getVendorName = (order) => {
    return (
      order.vendorName ||
      order.vendor?.vendorName ||
      order.vendor?.name ||
      "N/A"
    );
  };

  const getVendorPhone = (order) => {
    return (
      order.vendorPhone ||
      order.vendor?.phoneNumber ||
      order.vendor?.phone ||
      ""
    );
  };

  const printOrder = (order) => {
    const taxLabel =
      order.taxType === "with-tax" ? "With Sales Tax 18%" : "Without Sales Tax";

    const rows = order.items
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${item.description || ""}</td>
            <td>${item.size || ""}</td>
            <td>${item.cartons || ""}</td>
            <td>${item.quantity || ""}</td>
            <td>${item.unit || ""}</td>
            <td>${Number(item.unitPrice || 0).toLocaleString()}</td>
            <td>${Number(
              item.amount ||
                Number(item.quantity || 0) * Number(item.unitPrice || 0)
            ).toLocaleString()}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
      <html>
        <head>
          <title>${order.purchaseOrderNo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #111827; }
            .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 12px; }
            h1 { margin: 0; font-size: 30px; }
            h2 { text-align: center; margin: 24px 0 18px; text-decoration: underline; }
            .small { font-size: 12px; color: #374151; }
            .box { border: 1px solid #111827; padding: 10px; margin: 12px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #111827; padding: 7px; font-size: 12px; text-align: left; }
            th { background: #f3f4f6; }
            .totals { width: 320px; margin-left: auto; margin-top: 14px; }
            .totals div { display: flex; justify-content: space-between; border-bottom: 1px solid #d1d5db; padding: 6px 0; }
            .sign { margin-top: 70px; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="top">
            <div>
              <h1>Urwa Packages</h1>
              <div class="small">Purchase Order</div>
            </div>
            <div class="small">
              <b>Purchase Order No:</b> ${order.purchaseOrderNo || ""}<br/>
              <b>Date:</b> ${order.orderDate || ""}<br/>
              <b>Expected Date:</b> ${order.expectedDate || ""}<br/>
              <b>Tax:</b> ${taxLabel}
            </div>
          </div>

          <h2>PURCHASE ORDER</h2>

          <div class="box">
            <b>Vendor Name:</b> ${getVendorName(order)}<br/>
            <b>Phone:</b> ${getVendorPhone(order)}<br/>
            <b>Reference No:</b> ${order.referenceNo || ""}
          </div>

          <table>
            <thead>
              <tr>
                <th>Sr</th>
                <th>Description</th>
                <th>Size</th>
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
            <div><span>Subtotal</span><b>${money(order.subtotal)}</b></div>
            <div><span>Sales Tax ${order.taxRate || 0}%</span><b>${money(order.salesTax)}</b></div>
            <div><span>Grand Total</span><b>${money(order.grandTotal)}</b></div>
            <div><span>Advance</span><b>${money(order.advance)}</b></div>
            <div><span>Balance</span><b>${money(order.balance)}</b></div>
          </div>

          <p><b>Remarks:</b> ${order.remarks || ""}</p>

          <div class="sign">
            <div>Prepared By: __________________</div>
            <div>Approved By: __________________</div>
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
                Back to Purchase Orders
              </button>

              <h1 className="text-2xl font-bold text-slate-900">
                {editId ? "Edit Purchase Order" : "New Purchase Order"}
              </h1>

              <p className="text-sm text-slate-500 mt-1">
                Vendor select karein, items add karein, tax with/without select karein.
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
                <RequiredLabel>Purchase Order No</RequiredLabel>
                <input
                  value={form.purchaseOrderNo}
                  onChange={(e) =>
                    setForm({ ...form, purchaseOrderNo: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="PO-2026-0001"
                />
              </div>

              <div>
                <RequiredLabel>Vendor</RequiredLabel>
                <select
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                >
                  <option value="">Select Vendor</option>

                  {vendors.map((vendor) => (
                    <option key={vendor._id} value={vendor._id}>
                      {vendor.vendorName || vendor.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <RequiredLabel>Order Date</RequiredLabel>
                <input
                  type="date"
                  value={form.orderDate}
                  onChange={(e) => setForm({ ...form, orderDate: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                />
              </div>

              <div>
                <NormalLabel>Expected Date</NormalLabel>
                <input
                  type="date"
                  value={form.expectedDate}
                  onChange={(e) =>
                    setForm({ ...form, expectedDate: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                />
              </div>

              <div>
                <NormalLabel>Reference No</NormalLabel>
                <input
                  value={form.referenceNo}
                  onChange={(e) =>
                    setForm({ ...form, referenceNo: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="Vendor quotation / reference no"
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
                <NormalLabel>Advance</NormalLabel>
                <input
                  type="number"
                  value={form.advance}
                  onChange={(e) => setForm({ ...form, advance: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="0"
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
                  <option>Sent</option>
                  <option>Approved</option>
                  <option>Partially Received</option>
                  <option>Received</option>
                  <option>Cancelled</option>
                </select>
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 flex justify-between items-center">
                <div>
                  <h3 className="font-bold">Purchase Items</h3>
                  <p className="text-xs text-slate-500">
                    Description, quantity aur unit price required hain.
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
                        <td className="p-2 min-w-[220px]">
                          <input
                            value={item.description}
                            onChange={(e) =>
                              updateItem(index, "description", e.target.value)
                            }
                            className="w-full border rounded px-2 py-1.5"
                            placeholder="Raw material / item name"
                          />
                        </td>

                        <td className="p-2 min-w-[140px]">
                          <input
                            value={item.size}
                            onChange={(e) =>
                              updateItem(index, "size", e.target.value)
                            }
                            className="w-full border rounded px-2 py-1.5"
                            placeholder='2" x 72 Yards'
                          />
                        </td>

                        <td className="p-2 min-w-[100px]">
                          <input
                            type="number"
                            value={item.cartons}
                            onChange={(e) =>
                              updateItem(index, "cartons", e.target.value)
                            }
                            className="w-full border rounded px-2 py-1.5"
                            placeholder="5"
                          />
                        </td>

                        <td className="p-2 min-w-[100px]">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, "quantity", e.target.value)
                            }
                            className="w-full border rounded px-2 py-1.5"
                            placeholder="450"
                          />
                        </td>

                        <td className="p-2 min-w-[100px]">
                          <input
                            value={item.unit}
                            onChange={(e) =>
                              updateItem(index, "unit", e.target.value)
                            }
                            className="w-full border rounded px-2 py-1.5"
                            placeholder="Rolls"
                          />
                        </td>

                        <td className="p-2 min-w-[120px]">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) =>
                              updateItem(index, "unitPrice", e.target.value)
                            }
                            className="w-full border rounded px-2 py-1.5"
                            placeholder="190"
                          />
                        </td>

                        <td className="p-2 text-right font-bold">
                          {money(
                            Number(item.quantity || 0) *
                              Number(item.unitPrice || 0)
                          )}
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
                  placeholder="Any purchase instruction..."
                />
              </div>

              <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <b>{money(totals.subtotal)}</b>
                </div>

                <div className="flex justify-between">
                  <span>
                    Sales Tax {form.taxType === "with-tax" ? "18%" : "0%"}
                  </span>
                  <b>{money(totals.salesTax)}</b>
                </div>

                <div className="flex justify-between text-lg border-t pt-3">
                  <span>Grand Total</span>
                  <b>{money(totals.grandTotal)}</b>
                </div>

                <div className="flex justify-between">
                  <span>Advance</span>
                  <b>{money(form.advance)}</b>
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
                {saving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                {saving ? "Saving..." : "Save Purchase Order"}
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
            <FileText className="text-blue-600" size={26} />
            Purchase Orders
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Vendor purchase booking, tax calculation, advance and balance tracking
          </p>
        </div>

        <button
          onClick={openNewForm}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm"
        >
          <Plus size={18} />
          New Purchase Order
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Total Orders</p>
          <h3 className="text-2xl font-bold">{orders.length}</h3>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Total Value</p>
          <h3 className="text-2xl font-bold">
            {money(orders.reduce((s, o) => s + Number(o.grandTotal || 0), 0))}
          </h3>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Tax Value</p>
          <h3 className="text-2xl font-bold">
            {money(orders.reduce((s, o) => s + Number(o.salesTax || 0), 0))}
          </h3>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Balance</p>
          <h3 className="text-2xl font-bold">
            {money(orders.reduce((s, o) => s + Number(o.balance || 0), 0))}
          </h3>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">Order No</th>
                <th className="p-3 text-left">Vendor</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Tax</th>
                <th className="p-3 text-right">Grand Total</th>
                <th className="p-3 text-right">Balance</th>
                <th className="p-3 text-center">Status</th>
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
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-10 text-center text-slate-500">
                    No purchase order found
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-bold text-blue-700">
                      {order.purchaseOrderNo}
                    </td>

                    <td className="p-3">
                      <div className="font-semibold">{getVendorName(order)}</div>
                      <div className="text-xs text-slate-500">
                        {getVendorPhone(order)}
                      </div>
                    </td>

                    <td className="p-3">{order.orderDate}</td>

                    <td className="p-3">
                      {order.taxType === "with-tax"
                        ? "18% Sales Tax"
                        : "Without Tax"}
                    </td>

                    <td className="p-3 text-right font-bold">
                      {money(order.grandTotal)}
                    </td>

                    <td className="p-3 text-right font-bold text-red-600">
                      {money(order.balance)}
                    </td>

                    <td className="p-3 text-center">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                        {order.status}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => printOrder(order)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                          title="Print"
                        >
                          <Printer size={16} />
                        </button>

                        <button
                          onClick={() => handleEdit(order)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          onClick={() => handleDelete(order._id)}
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

export default PurchaseOrders;