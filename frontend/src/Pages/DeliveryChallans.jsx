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
  Search,
  RefreshCcw,
  AlertTriangle,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const emptyItem = {
  item: "",
  salesOrderItemId: "",
  warehouse: "Main Godown",
  description: "",
  size: "",
  textType: "",
  orderedQty: 0,
  alreadyDeliveredQty: 0,
  pendingQty: 0,
  cartons: "",
  quantity: "",
  unit: "Rolls",
  remarks: "",
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const numberValue = (value) => Number(value || 0);

const RequiredLabel = ({ children }) => (
  <label className="text-xs font-bold text-slate-600 flex items-center gap-1">
    {children}
    <AlertCircle size={12} className="text-red-600" />
  </label>
);

const NormalLabel = ({ children }) => (
  <label className="text-xs font-bold text-slate-600">{children}</label>
);

const normalizeArray = (data, keys = []) => {
  if (Array.isArray(data)) return data;

  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }

  if (Array.isArray(data?.data)) return data.data;

  return [];
};

const apiRequest = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed");
  }

  return data;
};

const getItemId = (value) => {
  if (!value) return "";
  if (typeof value === "object" && value._id) return value._id;
  return value;
};

const getDefaultForm = (challanNo = "") => ({
  challanNo,
  salesOrder: "",
  salesOrderNo: "",
  challanDate: todayDate(),
  poNo: "",
  vehicleNo: "",
  driverName: "",
  deliveredBy: "",
  receivedBy: "",
  status: "Draft",
  remarks: "",
  items: [],
});

const DeliveryChallans = () => {
  const [salesOrders, setSalesOrders] = useState([]);
  const [challans, setChallans] = useState([]);

  const [loading, setLoading] = useState(false);
  const [salesOrderLoading, setSalesOrderLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [form, setForm] = useState(getDefaultForm());

  const fetchSalesOrders = async () => {
    try {
      setSalesOrderLoading(true);

      const data = await apiRequest(`${API_BASE_URL}/sales-orders/all`);
      const list = normalizeArray(data, ["salesOrders", "orders"]);

      setSalesOrders(
        list.filter(
          (order) =>
            !["Cancelled", "Delivered", "Invoiced"].includes(order.status)
        )
      );
    } catch (error) {
      console.error("Sales order loading error:", error);
      setSalesOrders([]);
    } finally {
      setSalesOrderLoading(false);
    }
  };

  const fetchChallans = async () => {
    try {
      setLoading(true);

      const data = await apiRequest(`${API_BASE_URL}/delivery-challans/all`);
      setChallans(normalizeArray(data, ["challans", "deliveryChallans"]));
    } catch (error) {
      console.error("Delivery challan loading error:", error);
      alert(error.message || "Delivery challans load nahi huay");
      setChallans([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNextNo = async () => {
    const data = await apiRequest(`${API_BASE_URL}/delivery-challans/next-no`);
    return data.challanNo || data.deliveryChallanNo || "";
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
      (sum, item) => sum + numberValue(item.cartons),
      0
    );

    const totalQuantity = form.items.reduce(
      (sum, item) => sum + numberValue(item.quantity),
      0
    );

    return {
      totalCartons,
      totalQuantity,
    };
  }, [form.items]);

  const stats = useMemo(() => {
    return {
      totalChallans: challans.length,
      totalCartons: challans.reduce(
        (s, c) => s + numberValue(c.totalCartons),
        0
      ),
      totalQuantity: challans.reduce(
        (s, c) => s + numberValue(c.totalQuantity),
        0
      ),
      dispatched: challans.filter((c) => c.status === "Dispatched").length,
    };
  }, [challans]);

  const filteredChallans = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return challans.filter((challan) => {
      const matchesSearch =
        !keyword ||
        challan.challanNo?.toLowerCase().includes(keyword) ||
        challan.salesOrderNo?.toLowerCase().includes(keyword) ||
        challan.customerName?.toLowerCase().includes(keyword) ||
        challan.customerPhone?.toLowerCase().includes(keyword) ||
        challan.poNo?.toLowerCase().includes(keyword) ||
        challan.items?.some((item) =>
          item.description?.toLowerCase().includes(keyword)
        );

      const matchesStatus =
        statusFilter === "All" || challan.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [challans, searchTerm, statusFilter]);

  const openNewForm = async () => {
    try {
      setSaving(true);

      await fetchSalesOrders();
      const nextNo = await fetchNextNo();

      setEditId(null);
      setForm(getDefaultForm(nextNo));
      setShowForm(true);
    } catch (error) {
      alert(error.message || "Challan No load nahi hua");
    } finally {
      setSaving(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(getDefaultForm());
  };

  const handleSalesOrderChange = (salesOrderId) => {
    const order = salesOrders.find((item) => item._id === salesOrderId);

    if (!order) {
      setForm({
        ...form,
        salesOrder: "",
        salesOrderNo: "",
        poNo: "",
        items: [],
      });
      return;
    }

    const mappedItems = (order.items || [])
      .map((row) => {
        const orderedQty = numberValue(row.quantity);
        const alreadyDeliveredQty = numberValue(row.deliveredQty);
        const pendingQty =
          row.pendingQty !== undefined
            ? numberValue(row.pendingQty)
            : Math.max(orderedQty - alreadyDeliveredQty, 0);

        return {
          item: getItemId(row.item),
          salesOrderItemId: row._id || "",
          warehouse: row.warehouse || "Main Godown",

          description: row.description || "",
          size: row.size || "",
          textType: row.textType || "",

          orderedQty,
          alreadyDeliveredQty,
          pendingQty,

          cartons: row.cartons || "",
          quantity: pendingQty > 0 ? pendingQty : "",
          unit: row.unit || "Rolls",

          remarks: row.remarks || "",
        };
      })
      .filter((row) => numberValue(row.pendingQty) > 0);

    setForm({
      ...form,
      salesOrder: order._id,
      salesOrderNo: order.salesOrderNo || "",
      poNo: order.poNo || "",
      items: mappedItems.length > 0 ? mappedItems : [],
    });
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

  const validateForm = () => {
    if (!form.challanNo.trim()) {
      alert("Delivery Challan No required hai");
      return false;
    }

    if (!form.salesOrder) {
      alert("Sales Order select karein");
      return false;
    }

    if (!form.challanDate) {
      alert("Challan Date required hai");
      return false;
    }

    const validItems = form.items.filter(
      (item) =>
        item.description?.trim() &&
        numberValue(item.quantity) > 0 &&
        item.item &&
        item.salesOrderItemId
    );

    if (validItems.length === 0) {
      alert("Please at least one valid delivery item add karein");
      return false;
    }

    const overDelivered = validItems.some(
      (item) => numberValue(item.quantity) > numberValue(item.pendingQty)
    );

    if (overDelivered) {
      alert("Delivery quantity pending quantity se zyada nahi ho sakti");
      return false;
    }

    const missingWarehouse = validItems.some((item) => !item.warehouse?.trim());

    if (missingWarehouse) {
      alert("Warehouse missing hai");
      return false;
    }

    return true;
  };

  const buildPayload = () => {
    const validItems = form.items
      .filter(
        (item) =>
          item.description?.trim() &&
          numberValue(item.quantity) > 0 &&
          item.item &&
          item.salesOrderItemId
      )
      .map((item) => ({
        item: item.item,
        salesOrderItemId: item.salesOrderItemId,
        warehouse: item.warehouse || "Main Godown",

        description: String(item.description || "").trim(),
        size: String(item.size || "").trim(),
        textType: item.textType || "",

        orderedQty: numberValue(item.orderedQty),
        alreadyDeliveredQty: numberValue(item.alreadyDeliveredQty),
        pendingQty: numberValue(item.pendingQty),

        cartons: numberValue(item.cartons),
        quantity: numberValue(item.quantity),
        unit: String(item.unit || "Rolls").trim(),

        remarks: String(item.remarks || "").trim(),
      }));

    return {
      challanNo: form.challanNo,
      salesOrder: form.salesOrder,
      salesOrderNo: form.salesOrderNo,

      challanDate: form.challanDate,
      poNo: form.poNo,

      vehicleNo: form.vehicleNo,
      driverName: form.driverName,
      deliveredBy: form.deliveredBy,
      receivedBy: form.receivedBy,

      status: form.status,
      remarks: form.remarks,

      totalCartons: totals.totalCartons,
      totalQuantity: totals.totalQuantity,

      items: validItems,
    };
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = buildPayload();

      const url = editId
        ? `${API_BASE_URL}/delivery-challans/update/${editId}`
        : `${API_BASE_URL}/delivery-challans/add`;

      const method = editId ? "PUT" : "POST";

      await apiRequest(url, {
        method,
        body: JSON.stringify(payload),
      });

      await fetchChallans();
      await fetchSalesOrders();
      closeForm();
    } catch (error) {
      console.error("Delivery Challan Save Error:", error);
      alert(error.message || "Delivery challan save nahi hua");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (challan) => {
    await fetchSalesOrders();

    setEditId(challan._id);

    setForm({
      challanNo: challan.challanNo || "",
      salesOrder: challan.salesOrder?._id || challan.salesOrder || "",
      salesOrderNo: challan.salesOrderNo || "",
      challanDate: challan.challanDate || todayDate(),
      poNo: challan.poNo || "",
      vehicleNo: challan.vehicleNo || "",
      driverName: challan.driverName || "",
      deliveredBy: challan.deliveredBy || "",
      receivedBy: challan.receivedBy || "",
      status: challan.status || "Draft",
      remarks: challan.remarks || "",
      items: challan.items?.length
        ? challan.items.map((row) => ({
            item: getItemId(row.item),
            salesOrderItemId: row.salesOrderItemId || "",
            warehouse: row.warehouse || "Main Godown",

            description: row.description || "",
            size: row.size || "",
            textType: row.textType || "",

            orderedQty: row.orderedQty || 0,
            alreadyDeliveredQty: row.alreadyDeliveredQty || 0,
            pendingQty: row.pendingQty || row.quantity || 0,

            cartons: row.cartons || "",
            quantity: row.quantity || "",
            unit: row.unit || "Rolls",

            remarks: row.remarks || "",
          }))
        : [],
    });

    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this delivery challan?")) {
      return;
    }

    try {
      await apiRequest(`${API_BASE_URL}/delivery-challans/delete/${id}`, {
        method: "DELETE",
      });

      await fetchChallans();
      await fetchSalesOrders();
    } catch (error) {
      alert(error.message || "Delivery challan delete nahi hua");
    }
  };

  const printChallan = (challan) => {
    const rows = (challan.items || [])
      .map(
        (item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>
            ${item.description || ""}
            ${
              item.textType === "with-text"
                ? "<br/><small>With Text</small>"
                : ""
            }
          </td>
          <td>${item.size || ""}</td>
          <td>${item.warehouse || ""}</td>
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
            @page {
              size: A4 landscape;
              margin: 8mm;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: #ffffff;
              color: #111827;
              font-family: Arial, Helvetica, sans-serif;
              font-size: 15px;
              font-weight: 700;
              line-height: 1.45;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            body {
              padding: 6mm;
            }

            b,
            strong {
              font-weight: 900;
            }

            .company {
              text-align: right;
              border-bottom: 2.5px solid #111827;
              padding-bottom: 10px;
            }

            .company h1 {
              font-size: 38px;
              line-height: 1.1;
              margin: 0;
              letter-spacing: 1px;
              font-weight: 900;
            }

            .company p {
              margin: 4px 0;
              font-size: 14px;
              font-weight: 800;
            }

            .title {
              text-align: center;
              font-size: 24px;
              line-height: 1.2;
              font-weight: 900;
              margin: 18px 0 15px;
              text-decoration: underline;
            }

            .meta {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 12px;
              margin-bottom: 14px;
              font-size: 15px;
              font-weight: 700;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .box {
              border: 1.5px solid #111827;
              padding: 11px 13px;
              min-height: 82px;
              line-height: 1.65;
              font-weight: 700;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: auto;
              margin-top: 12px;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            th,
            td {
              border: 1.3px solid #111827;
              padding: 8px;
              font-size: 14px;
              line-height: 1.35;
              text-align: left;
              vertical-align: middle;
              font-weight: 700;
            }

            th {
              background: #f3f4f6;
              text-align: center;
              font-size: 14px;
              font-weight: 900;
              white-space: nowrap;
            }

            td small {
              font-size: 12px;
              font-weight: 900;
            }

            td.center {
              text-align: center;
            }

            .total-row td {
              font-size: 15px;
              font-weight: 900;
              border-top: 2px solid #111827;
              border-bottom: 2px solid #111827;
            }

            .remarks {
              margin-top: 18px;
              font-size: 15px;
              font-weight: 700;
              min-height: 32px;
            }

            .footer {
              margin-top: 45px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 50px;
              font-size: 15px;
              font-weight: 800;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .line {
              margin-top: 30px;
              border-top: 1.5px solid #111827;
              padding-top: 7px;
              width: 260px;
              font-weight: 800;
            }

            @media print {
              html,
              body {
                width: 100%;
              }

              .company,
              .meta,
              .box,
              table,
              .remarks,
              .footer {
                break-inside: avoid;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="company">
            <h1>Muddasir Packages</h1>
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
                <th style="width:130px;">Size</th>
                <th style="width:130px;">Warehouse</th>
                <th style="width:100px;">Cartons</th>
                <th style="width:120px;">Qty</th>
                <th style="width:100px;">Unit</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              <tr class="total-row">
                <td colspan="4" class="center">TOTAL</td>
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
                type="button"
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
                Sales Order select karein. Dispatch hone par backend Muddasir Godown stock minus karega.
              </p>
            </div>

            <button
              type="button"
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
                  onChange={(e) =>
                    setForm({ ...form, challanNo: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="DC-0001"
                />
              </div>

              <div>
                <RequiredLabel>Sales Order</RequiredLabel>
                <select
                  value={form.salesOrder}
                  onChange={(e) => handleSalesOrderChange(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  disabled={!!editId}
                >
                  <option value="">
                    {salesOrderLoading
                      ? "Loading sales orders..."
                      : "Select Sales Order"}
                  </option>

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
                  onChange={(e) =>
                    setForm({ ...form, challanDate: e.target.value })
                  }
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
                  onChange={(e) =>
                    setForm({ ...form, vehicleNo: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="LES-1234"
                />
              </div>

              <div>
                <NormalLabel>Driver Name</NormalLabel>
                <input
                  value={form.driverName}
                  onChange={(e) =>
                    setForm({ ...form, driverName: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="Driver name"
                />
              </div>

              <div>
                <NormalLabel>Delivered By</NormalLabel>
                <input
                  value={form.deliveredBy}
                  onChange={(e) =>
                    setForm({ ...form, deliveredBy: e.target.value })
                  }
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
                    Quantity pending qty se zyada nahi ho sakti.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addItemRow}
                  className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Add Row
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: "1150px" }}>
                  <thead>
                    <tr className="bg-white border-b text-slate-600">
                      <th className="p-2 text-left">
                        Particulars <span className="text-red-600">*</span>
                      </th>
                      <th className="p-2 text-left">Size</th>
                      <th className="p-2 text-left">Text</th>
                      <th className="p-2 text-left">Warehouse</th>
                      <th className="p-2 text-right">Ordered</th>
                      <th className="p-2 text-right">Delivered</th>
                      <th className="p-2 text-right">Pending</th>
                      <th className="p-2 text-left">Cartons</th>
                      <th className="p-2 text-left">
                        Delivery Qty <span className="text-red-600">*</span>
                      </th>
                      <th className="p-2 text-left">Unit</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>

                  <tbody>
                    {form.items.length === 0 ? (
                      <tr>
                        <td
                          colSpan="11"
                          className="p-8 text-center text-slate-500"
                        >
                          Sales Order select karein. Pending items yahan auto load honge.
                        </td>
                      </tr>
                    ) : (
                      form.items.map((item, index) => {
                        const overQty =
                          numberValue(item.quantity) > numberValue(item.pendingQty);

                        return (
                          <tr key={index} className="border-b">
                            <td className="p-2 min-w-[230px]">
                              <input
                                value={item.description}
                                onChange={(e) =>
                                  updateItem(index, "description", e.target.value)
                                }
                                className="w-full border rounded px-2 py-1.5"
                                placeholder="Packing Tape Printed"
                              />
                            </td>

                            <td className="p-2 min-w-[130px]">
                              <input
                                value={item.size}
                                onChange={(e) =>
                                  updateItem(index, "size", e.target.value)
                                }
                                className="w-full border rounded px-2 py-1.5"
                                placeholder='2" x 72 Yards'
                              />
                            </td>

                            <td className="p-2 min-w-[120px]">
                              <select
                                value={item.textType}
                                onChange={(e) =>
                                  updateItem(index, "textType", e.target.value)
                                }
                                className="w-full border rounded px-2 py-1.5"
                              >
                                <option value="">No Text</option>
                                <option value="with-text">With Text</option>
                                <option value="without-text">Without Text</option>
                              </select>
                            </td>

                            <td className="p-2 min-w-[130px]">
                              <input
                                value={item.warehouse}
                                readOnly
                                className="w-full border rounded px-2 py-1.5 bg-slate-50"
                              />
                            </td>

                            <td className="p-2 text-right font-bold">
                              {numberValue(item.orderedQty)}
                            </td>

                            <td className="p-2 text-right font-bold text-blue-700">
                              {numberValue(item.alreadyDeliveredQty)}
                            </td>

                            <td className="p-2 text-right font-bold text-orange-600">
                              {numberValue(item.pendingQty)}
                            </td>

                            <td className="p-2 min-w-[90px]">
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

                            <td className="p-2 min-w-[120px]">
                              <div className="relative">
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateItem(index, "quantity", e.target.value)
                                  }
                                  className={`w-full border rounded px-2 py-1.5 ${
                                    overQty ? "border-red-500 bg-red-50" : ""
                                  }`}
                                  placeholder="450"
                                />

                                {overQty && (
                                  <AlertTriangle
                                    size={15}
                                    className="absolute right-2 top-2 text-red-600"
                                  />
                                )}
                              </div>
                            </td>

                            <td className="p-2 min-w-[90px]">
                              <input
                                value={item.unit}
                                onChange={(e) =>
                                  updateItem(index, "unit", e.target.value)
                                }
                                className="w-full border rounded px-2 py-1.5"
                                placeholder="Rolls"
                              />
                            </td>

                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeItemRow(index)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg"
                              >
                                <Trash2 size={15} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>

                  <tfoot>
                    <tr className="bg-slate-50 font-bold">
                      <td className="p-3" colSpan="7">
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
                    onChange={(e) =>
                      setForm({ ...form, receivedBy: e.target.value })
                    }
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
                    <span>Stock Effect</span>
                    <b>
                      {["Dispatched", "Received"].includes(form.status)
                        ? "Godown Minus"
                        : "No Stock Posting"}
                    </b>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t pt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="px-5 py-2.5 rounded-xl border"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
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
            Sales Order se dispatch create karein. Dispatched status par Muddasir Godown stock minus hoga.
          </p>
        </div>

        <button
          type="button"
          onClick={openNewForm}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm disabled:opacity-60"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
          New Delivery Challan
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Total Challans</p>
          <h3 className="text-2xl font-bold">{stats.totalChallans}</h3>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Total Cartons</p>
          <h3 className="text-2xl font-bold">{stats.totalCartons}</h3>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Total Quantity</p>
          <h3 className="text-2xl font-bold">{stats.totalQuantity}</h3>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Dispatched</p>
          <h3 className="text-2xl font-bold">{stats.dispatched}</h3>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">Delivery Challan List</h3>
            <p className="text-xs text-slate-500">
              All delivery challans from MongoDB
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 border rounded-lg text-sm w-full sm:w-72"
                placeholder="Search challan, order, customer..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option>All</option>
              <option>Draft</option>
              <option>Dispatched</option>
              <option>Received</option>
              <option>Cancelled</option>
            </select>

            <button
              type="button"
              onClick={() => {
                fetchChallans();
                fetchSalesOrders();
              }}
              className="inline-flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-lg border hover:bg-slate-50"
            >
              <RefreshCcw size={15} />
              Refresh
            </button>
          </div>
        </div>

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
              ) : filteredChallans.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-10 text-center text-slate-500">
                    No delivery challan found
                  </td>
                </tr>
              ) : (
                filteredChallans.map((challan) => (
                  <tr key={challan._id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-bold text-blue-700">
                      {challan.challanNo}
                    </td>

                    <td className="p-3">{challan.salesOrderNo}</td>

                    <td className="p-3">
                      <div className="font-semibold">{challan.customerName}</div>
                      <div className="text-xs text-slate-500">
                        {challan.customerPhone}
                      </div>
                    </td>

                    <td className="p-3">{challan.challanDate}</td>

                    <td className="p-3 text-right font-bold">
                      {challan.totalCartons}
                    </td>

                    <td className="p-3 text-right font-bold">
                      {challan.totalQuantity}
                    </td>

                    <td className="p-3 text-center">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 inline-flex items-center gap-1">
                        <Truck size={13} />
                        {challan.status}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => printChallan(challan)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                          title="Print"
                        >
                          <Printer size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEdit(challan)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          type="button"
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