import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Printer,
  Loader2,
  ClipboardList,
  Edit2,
  X,
  Save,
  ArrowLeft,
  AlertCircle,
  Truck,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const emptyItem = {
  description: "",
  size: "",
  cartons: "",
  quantity: "",
  unit: "Rolls",
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const RequiredLabel = ({ children }) => (
  <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
    {children}
    <AlertCircle size={12} className="text-red-600" />
  </label>
);

const NormalLabel = ({ children }) => (
  <label className="text-xs font-bold text-slate-600">{children}</label>
);

const DeliveryChallans = () => {
  const [salesOrders, setSalesOrders] = useState([]);
  const [challans, setChallans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    challanNo: "",
    salesOrder: "",
    challanDate: todayDate(),
    poNo: "",
    vehicleNo: "",
    driverName: "",
    deliveredBy: "",
    receivedBy: "",
    status: "Draft",
    remarks: "",
    items: [{ ...emptyItem }],
  });

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

  const fetchChallans = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/delivery-challans/all`);
      const data = await res.json();
      setChallans(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Delivery challan loading error:", error);
      setChallans([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNextNo = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/delivery-challans/next-no`);
      const data = await res.json();
      setForm((prev) => ({ ...prev, challanNo: data.challanNo || "" }));
    } catch (error) {
      setForm((prev) => ({ ...prev, challanNo: "" }));
    }
  };

  useEffect(() => {
    fetchSalesOrders();
    fetchChallans();
  }, []);

  const selectedOrder = useMemo(() => {
    return salesOrders.find((order) => order._id === form.salesOrder);
  }, [salesOrders, form.salesOrder]);

  const totals = useMemo(() => {
    const totalCartons = form.items.reduce(
      (sum, item) => sum + Number(item.cartons || 0),
      0
    );

    const totalQuantity = form.items.reduce(
      (sum, item) => sum + Number(item.quantity || 0),
      0
    );

    return { totalCartons, totalQuantity };
  }, [form.items]);

  const openNewForm = async () => {
    setEditId(null);
    setForm({
      challanNo: "",
      salesOrder: "",
      challanDate: todayDate(),
      poNo: "",
      vehicleNo: "",
      driverName: "",
      deliveredBy: "",
      receivedBy: "",
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

  const handleSalesOrderChange = (salesOrderId) => {
    const order = salesOrders.find((item) => item._id === salesOrderId);

    if (!order) {
      setForm({
        ...form,
        salesOrder: "",
        poNo: "",
        items: [{ ...emptyItem }],
      });
      return;
    }

    setForm({
      ...form,
      salesOrder: order._id,
      poNo: order.poNo || "",
      items:
        order.items && order.items.length > 0
          ? order.items.map((item) => ({
              description: item.description || "",
              size: item.size || "",
              cartons: item.cartons || "",
              quantity: item.quantity || "",
              unit: item.unit || "Rolls",
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
    if (!form.challanNo.trim()) {
      alert("Delivery Challan No required hai");
      return;
    }

    if (!form.salesOrder) {
      alert("Sales Order select karein");
      return;
    }

    if (!form.challanDate) {
      alert("Challan Date required hai");
      return;
    }

    const validItems = form.items.filter(
      (item) => item.description.trim() && Number(item.quantity || 0) > 0
    );

    if (validItems.length === 0) {
      alert("Please at least one valid delivery item add karein");
      return;
    }

    const payload = {
      ...form,
      items: validItems,
    };

    setSaving(true);

    try {
      const url = editId
        ? `${API_BASE_URL}/delivery-challans/update/${editId}`
        : `${API_BASE_URL}/delivery-challans/add`;

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

      await fetchChallans();
      await fetchSalesOrders();
      closeForm();
    } catch (error) {
      alert("Delivery challan save nahi hua. Backend check karein.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (challan) => {
    setEditId(challan._id);

    setForm({
      challanNo: challan.challanNo || "",
      salesOrder: challan.salesOrder?._id || challan.salesOrder || "",
      challanDate: challan.challanDate || todayDate(),
      poNo: challan.poNo || "",
      vehicleNo: challan.vehicleNo || "",
      driverName: challan.driverName || "",
      deliveredBy: challan.deliveredBy || "",
      receivedBy: challan.receivedBy || "",
      status: challan.status || "Draft",
      remarks: challan.remarks || "",
      items: challan.items?.length ? challan.items : [{ ...emptyItem }],
    });

    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this delivery challan?")) return;

    try {
      const res = await fetch(`${API_BASE_URL}/delivery-challans/delete/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchChallans();
      } else {
        alert("Delete failed");
      }
    } catch (error) {
      alert("Delete error");
    }
  };

  const printChallan = (challan) => {
    const rows = challan.items
      .map(
        (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${item.description || ""}</td>
          <td>${item.size || ""}</td>
          <td>${item.cartons || ""}</td>
          <td>${item.quantity || ""}</td>
          <td>${item.unit || ""}</td>
        </tr>
      `
      )
      .join("");

    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
      <html>
        <head>
          <title>${challan.challanNo}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 34px;
              color: #111827;
            }
            .company {
              text-align: right;
              border-bottom: 2px solid #111827;
              padding-bottom: 10px;
            }
            .company h1 {
              font-size: 38px;
              margin: 0;
              letter-spacing: 1px;
            }
            .company p {
              margin: 3px 0;
              font-size: 12px;
            }
            .title {
              text-align: center;
              font-size: 20px;
              font-weight: 700;
              margin: 20px 0 18px;
              text-decoration: underline;
            }
            .meta {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 14px;
              font-size: 13px;
            }
            .box {
              border: 1px solid #111827;
              padding: 10px;
              min-height: 72px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }
            th, td {
              border: 1px solid #111827;
              padding: 8px;
              font-size: 12px;
              text-align: left;
            }
            th {
              background: #f3f4f6;
              text-align: center;
            }
            td.center {
              text-align: center;
            }
            .total-row td {
              font-weight: 700;
            }
            .footer {
              margin-top: 70px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 30px;
              font-size: 13px;
            }
            .line {
              margin-top: 28px;
              border-top: 1px solid #111827;
              padding-top: 6px;
              width: 240px;
            }
            .remarks {
              margin-top: 18px;
              font-size: 13px;
            }
          </style>
        </head>
        <body>
          <div class="company">
            <h1>Urwa Packages</h1>
            <p>Delivery Challan</p>
            <p>Office: Lahore, Pakistan</p>
          </div>

          <div class="title">DELIVERY CHALLAN</div>

          <div class="meta">
            <div class="box">
              <b>M/S:</b> ${challan.customerName || ""}<br/>
              <b>Address:</b> ${challan.customerAddress || ""}<br/>
              <b>Phone:</b> ${challan.customerPhone || ""}<br/>
              <b>PO No:</b> ${challan.poNo || ""}
            </div>

            <div class="box">
              <b>S.No:</b> ${challan.challanNo || ""}<br/>
              <b>Dated:</b> ${challan.challanDate || ""}<br/>
              <b>Sales Order:</b> ${challan.salesOrderNo || ""}<br/>
              <b>Vehicle No:</b> ${challan.vehicleNo || ""}<br/>
              <b>Driver:</b> ${challan.driverName || ""}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width:50px;">Sr</th>
                <th>Particulars</th>
                <th style="width:150px;">Size</th>
                <th style="width:100px;">Cartons</th>
                <th style="width:120px;">Qty</th>
                <th style="width:100px;">Unit</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              <tr class="total-row">
                <td colspan="3" class="center">TOTAL</td>
                <td class="center">${challan.totalCartons || 0}</td>
                <td class="center">${challan.totalQuantity || 0}</td>
                <td></td>
              </tr>
            </tbody>
          </table>

          <div class="remarks">
            <b>Remarks:</b> ${challan.remarks || ""}
          </div>

          <div class="footer">
            <div>
              <div><b>Delivered By:</b> ${challan.deliveredBy || ""}</div>
              <div class="line">Authorized Signature</div>
            </div>

            <div>
              <div><b>Received By:</b> ${challan.receivedBy || ""}</div>
              <div class="line">Name / Signature / Stamp</div>
            </div>
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
                Back to Delivery Challans
              </button>

              <h1 className="text-2xl font-bold text-slate-900">
                {editId ? "Edit Delivery Challan" : "New Delivery Challan"}
              </h1>

              <p className="text-sm text-slate-500 mt-1">
                Sales Order select karein, items automatically fill ho jayenge.
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
                <RequiredLabel>Challan No</RequiredLabel>
                <input
                  value={form.challanNo}
                  onChange={(e) => setForm({ ...form, challanNo: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="DC-2026-0001"
                />
              </div>

              <div>
                <RequiredLabel>Sales Order</RequiredLabel>
                <select
                  value={form.salesOrder}
                  onChange={(e) => handleSalesOrderChange(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                >
                  <option value="">Select Sales Order</option>
                  {salesOrders.map((order) => (
                    <option key={order._id} value={order._id}>
                      {order.salesOrderNo} - {order.customerName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <RequiredLabel>Challan Date</RequiredLabel>
                <input
                  type="date"
                  value={form.challanDate}
                  onChange={(e) => setForm({ ...form, challanDate: e.target.value })}
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
                  <option>Dispatched</option>
                  <option>Received</option>
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
                <NormalLabel>Vehicle No</NormalLabel>
                <input
                  value={form.vehicleNo}
                  onChange={(e) => setForm({ ...form, vehicleNo: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="LES-1234"
                />
              </div>

              <div>
                <NormalLabel>Driver Name</NormalLabel>
                <input
                  value={form.driverName}
                  onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="Driver name"
                />
              </div>

              <div>
                <NormalLabel>Delivered By</NormalLabel>
                <input
                  value={form.deliveredBy}
                  onChange={(e) => setForm({ ...form, deliveredBy: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="Staff name"
                />
              </div>
            </div>

            {selectedOrder && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-900">
                <b>Customer:</b> {selectedOrder.customerName} &nbsp; | &nbsp;
                <b>Sales Order:</b> {selectedOrder.salesOrderNo} &nbsp; | &nbsp;
                <b>Order Date:</b> {selectedOrder.orderDate}
              </div>
            )}

            <div className="border rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 flex justify-between items-center">
                <div>
                  <h3 className="font-bold">Delivery Items</h3>
                  <p className="text-xs text-slate-500">
                    Particulars aur quantity required hain.
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
                        Particulars <span className="text-red-600">*</span>
                      </th>
                      <th className="p-2 text-left">Size</th>
                      <th className="p-2 text-left">Cartons</th>
                      <th className="p-2 text-left">
                        Qty <span className="text-red-600">*</span>
                      </th>
                      <th className="p-2 text-left">Unit</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>

                  <tbody>
                    {form.items.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 min-w-[260px]">
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

                  <tfoot>
                    <tr className="bg-slate-50 font-bold">
                      <td className="p-3" colSpan="2">
                        TOTAL
                      </td>
                      <td className="p-3">{totals.totalCartons}</td>
                      <td className="p-3">{totals.totalQuantity}</td>
                      <td className="p-3" colSpan="2"></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div>
                <NormalLabel>Remarks</NormalLabel>
                <textarea
                  value={form.remarks}
                  onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1 min-h-[130px]"
                  placeholder="Any delivery note..."
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <NormalLabel>Received By</NormalLabel>
                  <input
                    value={form.receivedBy}
                    onChange={(e) => setForm({ ...form, receivedBy: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 mt-1"
                    placeholder="Receiver name"
                  />
                </div>

                <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                  <div className="flex justify-between">
                    <span>Total Cartons</span>
                    <b>{totals.totalCartons}</b>
                  </div>

                  <div className="flex justify-between">
                    <span>Total Quantity</span>
                    <b>{totals.totalQuantity}</b>
                  </div>

                  <div className="flex justify-between">
                    <span>Unit</span>
                    <b>{form.items[0]?.unit || "Rolls"}</b>
                  </div>
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
                {saving ? "Saving..." : "Save Delivery Challan"}
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
            <ClipboardList className="text-blue-600" size={26} />
            Delivery Challans
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Sales Order se delivery challan create karein aur dispatch record maintain karein.
          </p>
        </div>

        <button
          onClick={openNewForm}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm"
        >
          <Plus size={18} />
          New Delivery Challan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Total Challans</p>
          <h3 className="text-2xl font-bold">{challans.length}</h3>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Total Cartons</p>
          <h3 className="text-2xl font-bold">
            {challans.reduce((s, c) => s + Number(c.totalCartons || 0), 0)}
          </h3>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Total Quantity</p>
          <h3 className="text-2xl font-bold">
            {challans.reduce((s, c) => s + Number(c.totalQuantity || 0), 0)}
          </h3>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Dispatched</p>
          <h3 className="text-2xl font-bold">
            {challans.filter((c) => c.status === "Dispatched").length}
          </h3>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="p-3 text-left">Challan No</th>
                <th className="p-3 text-left">Sales Order</th>
                <th className="p-3 text-left">Customer</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-right">Cartons</th>
                <th className="p-3 text-right">Quantity</th>
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
              ) : challans.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-10 text-center text-slate-500">
                    No delivery challan found
                  </td>
                </tr>
              ) : (
                challans.map((challan) => (
                  <tr key={challan._id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-bold text-blue-700">{challan.challanNo}</td>

                    <td className="p-3">{challan.salesOrderNo}</td>

                    <td className="p-3">
                      <div className="font-semibold">{challan.customerName}</div>
                      <div className="text-xs text-slate-500">{challan.customerPhone}</div>
                    </td>

                    <td className="p-3">{challan.challanDate}</td>

                    <td className="p-3 text-right font-bold">{challan.totalCartons}</td>

                    <td className="p-3 text-right font-bold">{challan.totalQuantity}</td>

                    <td className="p-3 text-center">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 inline-flex items-center gap-1">
                        <Truck size={13} />
                        {challan.status}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => printChallan(challan)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                          title="Print"
                        >
                          <Printer size={16} />
                        </button>

                        <button
                          onClick={() => handleEdit(challan)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          onClick={() => handleDelete(challan._id)}
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

export default DeliveryChallans;