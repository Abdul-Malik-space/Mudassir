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
  Search,
  RefreshCcw,
  AlertTriangle,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const emptyItem = {
  item: "",
  warehouse: "Main Godown",
  availableStock: 0,
  description: "",
  size: "",
  textType: "",
  cartons: "",
  quantity: "",
  unit: "Rolls",
  unitPrice: "",
  remarks: "",
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

const numberValue = (value) => Number(value || 0);

const RequiredLabel = ({ children }) => (
  <label className="text-xs font-bold text-slate-600">
    {children} <span className="text-red-600">*</span>
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

const getItemId = (row) => {
  if (!row) return "";
  if (row.item && typeof row.item === "object") return row.item._id || "";
  return row.item || "";
};

const makeStockKey = (row) => {
  return `${getItemId(row)}|${row.warehouse || "Main Godown"}`;
};

const getDefaultForm = (salesOrderNo = "") => ({
  salesOrderNo,
  customer: "",
  orderDate: todayDate(),
  deliveryDate: "",
  poNo: "",
  taxType: "without-tax",
  advance: "",
  status: "Draft",
  remarks: "",
  items: [{ ...emptyItem }],
});

const SalesOrders = () => {
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [itemsMaster, setItemsMaster] = useState([]);
  const [stockBalances, setStockBalances] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stockLoading, setStockLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [form, setForm] = useState(getDefaultForm());

  const fetchCustomers = async () => {
    try {
      const data = await apiRequest(`${API_BASE_URL}/customers/all`);
      setCustomers(normalizeArray(data, ["customers"]));
    } catch (error) {
      console.error("Customer loading error:", error);
      setCustomers([]);
    }
  };

  const fetchItemsMaster = async () => {
    try {
      const data = await apiRequest(`${API_BASE_URL}/items/all`);
      setItemsMaster(normalizeArray(data, ["items"]));
    } catch (error) {
      console.error("Items loading error:", error);
      setItemsMaster([]);
    }
  };

  const fetchStockBalances = async () => {
    try {
      setStockLoading(true);

      const data = await apiRequest(`${API_BASE_URL}/stock-ledger/balances`);
      setStockBalances(normalizeArray(data, ["balances", "stock"]));
    } catch (error) {
      console.error("Stock balances loading error:", error);
      setStockBalances([]);
    } finally {
      setStockLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const data = await apiRequest(`${API_BASE_URL}/sales-orders/all`);
      setOrders(normalizeArray(data, ["salesOrders", "orders"]));
    } catch (error) {
      console.error("Sales order loading error:", error);
      alert(error.message || "Sales orders load nahi huay");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNextNo = async () => {
    const data = await apiRequest(`${API_BASE_URL}/sales-orders/next-no`);
    return data.salesOrderNo || "";
  };

  useEffect(() => {
    fetchCustomers();
    fetchItemsMaster();
    fetchStockBalances();
    fetchOrders();
  }, []);

  const itemMap = useMemo(() => {
    const map = new Map();

    itemsMaster.forEach((item) => {
      map.set(String(item._id), item);
    });

    return map;
  }, [itemsMaster]);

  const stockOptions = useMemo(() => {
    return stockBalances
      .filter((row) => getItemId(row))
      .map((row) => {
        const itemId = getItemId(row);
        const item = itemMap.get(String(itemId));

        return {
          key: makeStockKey(row),
          itemId,
          warehouse: row.warehouse || "Main Godown",
          itemCode: row.itemCode || item?.code || "",
          itemName: row.itemName || item?.name || "",
          unit: row.unit || item?.unit || "Pcs",
          currentStock: numberValue(row.currentStock),
          salePrice: numberValue(item?.salePrice),
          purchasePrice: numberValue(item?.purchasePrice),
          category: item?.category || "",
          brand: item?.brand || "",
        };
      })
      .sort((a, b) => {
        const nameA = `${a.itemName} ${a.warehouse}`.toLowerCase();
        const nameB = `${b.itemName} ${b.warehouse}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [stockBalances, itemMap]);

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => {
      return sum + numberValue(item.quantity) * numberValue(item.unitPrice);
    }, 0);

    const salesTax = form.taxType === "with-tax" ? subtotal * 0.18 : 0;
    const grandTotal = subtotal + salesTax;
    const balance = grandTotal - numberValue(form.advance);

    return {
      subtotal,
      salesTax,
      grandTotal,
      balance,
    };
  }, [form.items, form.taxType, form.advance]);

  const stats = useMemo(() => {
    return {
      totalOrders: orders.length,
      totalValue: orders.reduce((s, o) => s + numberValue(o.grandTotal), 0),
      taxValue: orders.reduce((s, o) => s + numberValue(o.salesTax), 0),
      balance: orders.reduce((s, o) => s + numberValue(o.balance), 0),
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !keyword ||
        order.salesOrderNo?.toLowerCase().includes(keyword) ||
        order.customerName?.toLowerCase().includes(keyword) ||
        order.customerPhone?.toLowerCase().includes(keyword) ||
        order.poNo?.toLowerCase().includes(keyword) ||
        order.items?.some((item) =>
          item.description?.toLowerCase().includes(keyword)
        );

      const matchesStatus =
        statusFilter === "All" || order.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  const openNewForm = async () => {
    try {
      setSaving(true);

      await Promise.all([
        fetchCustomers(),
        fetchItemsMaster(),
        fetchStockBalances(),
      ]);

      const nextNo = await fetchNextNo();

      setEditId(null);
      setForm(getDefaultForm(nextNo));
      setShowForm(true);
    } catch (error) {
      alert(error.message || "Sales Order No load nahi hua");
    } finally {
      setSaving(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(getDefaultForm());
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

  const handleStockSelect = (index, selectedKey) => {
    const selectedStock = stockOptions.find((row) => row.key === selectedKey);
    const updatedItems = [...form.items];

    if (!selectedStock) {
      updatedItems[index] = {
        ...updatedItems[index],
        item: "",
        warehouse: "Main Godown",
        availableStock: 0,
        description: "",
        unit: "Pcs",
        unitPrice: "",
      };

      setForm({
        ...form,
        items: updatedItems,
      });

      return;
    }

    updatedItems[index] = {
      ...updatedItems[index],
      item: selectedStock.itemId,
      warehouse: selectedStock.warehouse,
      availableStock: selectedStock.currentStock,
      description: selectedStock.itemName,
      unit: selectedStock.unit,
      unitPrice:
        selectedStock.salePrice > 0
          ? selectedStock.salePrice
          : selectedStock.purchasePrice,
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
    if (!form.salesOrderNo.trim()) {
      alert("Sales Order No required hai");
      return false;
    }

    if (!form.customer) {
      alert("Customer select karein");
      return false;
    }

    if (!form.orderDate) {
      alert("Order Date required hai");
      return false;
    }

    if (numberValue(form.advance) > totals.grandTotal) {
      alert("Advance grand total se zyada nahi ho sakta");
      return false;
    }

    const validItems = form.items.filter(
      (item) =>
        item.item &&
        item.description?.trim() &&
        numberValue(item.quantity) > 0 &&
        numberValue(item.unitPrice) >= 0
    );

    if (validItems.length === 0) {
      alert("Please at least one godown item select karein");
      return false;
    }

    const overStock = validItems.some(
      (item) => numberValue(item.quantity) > numberValue(item.availableStock)
    );

    if (overStock) {
      alert("Sales quantity available godown stock se zyada nahi ho sakti");
      return false;
    }

    return true;
  };

  const buildPayload = () => {
    const validItems = form.items
      .filter(
        (item) =>
          item.item &&
          item.description?.trim() &&
          numberValue(item.quantity) > 0 &&
          numberValue(item.unitPrice) >= 0
      )
      .map((item) => ({
        item: item.item,
        warehouse: item.warehouse || "Main Godown",
        availableStock: numberValue(item.availableStock),

        description: String(item.description || "").trim(),
        size: String(item.size || "").trim(),
        textType: item.textType || "",

        cartons: numberValue(item.cartons),
        quantity: numberValue(item.quantity),
        unit: String(item.unit || "Pcs").trim(),
        unitPrice: numberValue(item.unitPrice),
        amount: numberValue(item.quantity) * numberValue(item.unitPrice),

        remarks: String(item.remarks || "").trim(),
      }));

    return {
      salesOrderNo: form.salesOrderNo,
      customer: form.customer,
      orderDate: form.orderDate,
      deliveryDate: form.deliveryDate,
      poNo: form.poNo,
      taxType: form.taxType,
      advance: numberValue(form.advance),
      status: form.status,
      remarks: form.remarks,

      subtotal: totals.subtotal,
      salesTax: totals.salesTax,
      grandTotal: totals.grandTotal,
      balance: totals.balance,

      items: validItems,
    };
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = buildPayload();

      const url = editId
        ? `${API_BASE_URL}/sales-orders/update/${editId}`
        : `${API_BASE_URL}/sales-orders/add`;

      const method = editId ? "PUT" : "POST";

      await apiRequest(url, {
        method,
        body: JSON.stringify(payload),
      });

      await fetchOrders();
      closeForm();
    } catch (error) {
      console.error("Sales Order Save Error:", error);
      alert(error.message || "Sales order save nahi hua");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (order) => {
    await Promise.all([
      fetchCustomers(),
      fetchItemsMaster(),
      fetchStockBalances(),
    ]);

    setEditId(order._id);

    setForm({
      salesOrderNo: order.salesOrderNo || "",
      customer: order.customer?._id || order.customer || "",
      orderDate: order.orderDate || todayDate(),
      deliveryDate: order.deliveryDate || "",
      poNo: order.poNo || "",
      taxType: order.taxType || "without-tax",
      advance: order.advance || "",
      status: order.status || "Draft",
      remarks: order.remarks || "",
      items: order.items?.length
        ? order.items.map((row) => ({
            item: row.item?._id || row.item || "",
            warehouse: row.warehouse || "Main Godown",
            availableStock: row.availableStock || 0,
            description: row.description || "",
            size: row.size || "",
            textType: row.textType || "",
            cartons: row.cartons || "",
            quantity: row.quantity || "",
            unit: row.unit || "Pcs",
            unitPrice: row.unitPrice || "",
            remarks: row.remarks || "",
          }))
        : [{ ...emptyItem }],
    });

    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this sales order?")) {
      return;
    }

    try {
      await apiRequest(`${API_BASE_URL}/sales-orders/delete/${id}`, {
        method: "DELETE",
      });

      await fetchOrders();
    } catch (error) {
      alert(error.message || "Sales order delete nahi hua");
    }
  };

  const printOrder = (order) => {
    const taxLabel =
      order.taxType === "with-tax" ? "With Sales Tax 18%" : "Without Sales Tax";

    const rows = (order.items || [])
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
          <td>${Number(item.unitPrice || 0).toLocaleString()}</td>
          <td>${Number(
            item.amount ||
              numberValue(item.quantity) * numberValue(item.unitPrice)
          ).toLocaleString()}</td>
        </tr>
      `
      )
      .join("");

    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
      <html>
        <head>
          <title>${order.salesOrderNo}</title>
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
              font-weight: 600;
              line-height: 1.45;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .top {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 30px;
              border-bottom: 2.5px solid #111827;
              padding-bottom: 12px;
            }

            h1 {
              margin: 0;
              font-size: 34px;
              line-height: 1.1;
              font-weight: 900;
              letter-spacing: 0.2px;
            }

            h2 {
              text-align: center;
              margin: 18px 0 14px;
              font-size: 24px;
              line-height: 1.2;
              font-weight: 900;
              text-decoration: underline;
            }

            b,
            strong {
              font-weight: 900;
            }

            .small {
              font-size: 14px;
              color: #111827;
              line-height: 1.65;
              font-weight: 700;
            }

            .box {
              border: 1.5px solid #111827;
              padding: 11px 13px;
              margin: 12px 0;
              font-size: 15px;
              line-height: 1.65;
              font-weight: 650;
              break-inside: avoid;
              page-break-inside: avoid;
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
              padding: 7px 8px;
              font-size: 14px;
              line-height: 1.35;
              text-align: left;
              vertical-align: middle;
              font-weight: 700;
            }

            th {
              background: #f3f4f6;
              font-size: 14px;
              font-weight: 900;
              white-space: nowrap;
            }

            td small {
              font-size: 12px;
              font-weight: 800;
            }

            .totals {
              width: 380px;
              margin-left: auto;
              margin-top: 14px;
              font-size: 15px;
              font-weight: 700;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            .totals div {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 24px;
              border-bottom: 1.2px solid #9ca3af;
              padding: 7px 0;
            }

            .totals div:nth-child(3) {
              border-top: 2px solid #111827;
              border-bottom: 2px solid #111827;
              font-size: 17px;
              font-weight: 900;
            }

            body > p {
              margin-top: 18px;
              font-size: 15px;
              font-weight: 700;
            }

            .sign {
              margin-top: 38px;
              display: flex;
              justify-content: space-between;
              gap: 30px;
              font-size: 15px;
              font-weight: 800;
              break-inside: avoid;
              page-break-inside: avoid;
            }

            @media print {
              html,
              body {
                width: 100%;
              }

              .top,
              .box,
              table,
              .totals,
              .sign {
                break-inside: avoid;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="top">
            <div>
              <h1>Muddasir Packages</h1>
              <div class="small">Sales Order</div>
            </div>
            <div class="small">
              <b>Sales Order No:</b> ${order.salesOrderNo || ""}<br/>
              <b>Date:</b> ${order.orderDate || ""}<br/>
              <b>Delivery Date:</b> ${order.deliveryDate || ""}<br/>
              <b>Tax:</b> ${taxLabel}<br/>
              <b>Status:</b> ${order.status || ""}
            </div>
          </div>

          <h2>SALES ORDER</h2>

          <div class="box">
            <b>Customer Name:</b> ${order.customerName || ""}<br/>
            <b>Phone:</b> ${order.customerPhone || ""}<br/>
            <b>Email:</b> ${order.customerEmail || ""}<br/>
            <b>Address:</b> ${order.customerAddress || ""}<br/>
            <b>PO No:</b> ${order.poNo || ""}
          </div>

          <table>
            <thead>
              <tr>
                <th>Sr</th>
                <th>Description</th>
                <th>Size</th>
                <th>Warehouse</th>
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
                type="button"
                onClick={closeForm}
                className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-3"
              >
                <ArrowLeft size={17} />
                Back to Sales Orders
              </button>

              <h1 className="text-2xl font-bold text-slate-900">
                {editId ? "Edit Sales Order" : "New Sales Order"}
              </h1>

              <p className="text-sm text-slate-500 mt-1">
                Customer select karein aur Muddasir Godown stock se item choose karein.
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
                <RequiredLabel>Sales Order No</RequiredLabel>
                <input
                  value={form.salesOrderNo}
                  onChange={(e) =>
                    setForm({ ...form, salesOrderNo: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                  placeholder="SO-0001"
                />
              </div>

              <div>
                <RequiredLabel>Customer</RequiredLabel>
                <select
                  value={form.customer}
                  onChange={(e) => setForm({ ...form, customer: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                >
                  <option value="">Select Customer</option>
                  {customers.map((customer) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.customerName || customer.name}
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
                <NormalLabel>Delivery Date</NormalLabel>
                <input
                  type="date"
                  value={form.deliveryDate}
                  onChange={(e) =>
                    setForm({ ...form, deliveryDate: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                />
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
                  <option>Confirmed</option>
                  <option>In Production</option>
                  <option>Ready</option>
                  <option>Partially Delivered</option>
                  <option>Delivered</option>
                  <option>Invoiced</option>
                  <option>Cancelled</option>
                </select>
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 flex flex-col md:flex-row md:justify-between md:items-center gap-3">
                <div>
                  <h3 className="font-bold">Order Items</h3>
                  <p className="text-xs text-slate-500">
                    Muddasir Godown se available item select karein. Stock minus delivery challan par hoga.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={fetchStockBalances}
                    className="text-sm border hover:bg-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    {stockLoading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <RefreshCcw size={15} />
                    )}
                    Refresh Stock
                  </button>

                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                  >
                    Add Row
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: "1150px" }}>
                  <thead>
                    <tr className="bg-white border-b text-slate-600">
                      <th className="p-2 text-left">
                        Godown Item <span className="text-red-600">*</span>
                      </th>
                      <th className="p-2 text-left">Description</th>
                      <th className="p-2 text-left">Size</th>
                      <th className="p-2 text-left">Text</th>
                      <th className="p-2 text-left">Warehouse</th>
                      <th className="p-2 text-right">Available</th>
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
                    {form.items.map((item, index) => {
                      const currentKey =
                        item.item && item.warehouse
                          ? `${item.item}|${item.warehouse}`
                          : "";

                      const overStock =
                        numberValue(item.quantity) >
                        numberValue(item.availableStock);

                      return (
                        <tr key={index} className="border-b">
                          <td className="p-2 min-w-[260px]">
                            <select
                              value={currentKey}
                              onChange={(e) =>
                                handleStockSelect(index, e.target.value)
                              }
                              className="w-full border rounded px-2 py-1.5"
                            >
                              <option value="">
                                {stockLoading
                                  ? "Loading stock..."
                                  : "Select from Godown"}
                              </option>

                              {stockOptions.map((stock) => (
                                <option key={stock.key} value={stock.key}>
                                  {stock.itemCode} - {stock.itemName} |{" "}
                                  {stock.warehouse} | Stock:{" "}
                                  {stock.currentStock}
                                </option>
                              ))}
                            </select>
                          </td>

                          <td className="p-2 min-w-[210px]">
                            <input
                              value={item.description}
                              onChange={(e) =>
                                updateItem(index, "description", e.target.value)
                              }
                              className="w-full border rounded px-2 py-1.5"
                              placeholder="Item description"
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

                          <td
                            className={`p-2 text-right font-bold ${
                              overStock ? "text-red-600" : "text-emerald-600"
                            }`}
                          >
                            <div className="flex items-center justify-end gap-1">
                              {overStock && <AlertTriangle size={14} />}
                              {numberValue(item.availableStock)}
                            </div>
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

                          <td className="p-2 min-w-[100px]">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) =>
                                updateItem(index, "quantity", e.target.value)
                              }
                              className={`w-full border rounded px-2 py-1.5 ${
                                overStock ? "border-red-500 bg-red-50" : ""
                              }`}
                              placeholder="450"
                            />
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
                              numberValue(item.quantity) *
                                numberValue(item.unitPrice)
                            )}
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
                    })}
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
                  placeholder="Any special instruction..."
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
                {saving ? "Saving..." : "Save Sales Order"}
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
            Sales Orders
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Customer order booking from Muddasir Godown stock
          </p>
        </div>

        <button
          type="button"
          onClick={openNewForm}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm disabled:opacity-60"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
          New Sales Order
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Total Orders</p>
          <h3 className="text-2xl font-bold">{stats.totalOrders}</h3>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Total Value</p>
          <h3 className="text-2xl font-bold">{money(stats.totalValue)}</h3>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Tax Value</p>
          <h3 className="text-2xl font-bold">{money(stats.taxValue)}</h3>
        </div>

        <div className="bg-white rounded-xl border p-4">
          <p className="text-xs text-slate-500">Balance</p>
          <h3 className="text-2xl font-bold">{money(stats.balance)}</h3>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">Sales Order List</h3>
            <p className="text-xs text-slate-500">
              All sales orders from MongoDB
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
                placeholder="Search order, customer, item..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option>All</option>
              <option>Draft</option>
              <option>Confirmed</option>
              <option>In Production</option>
              <option>Ready</option>
              <option>Partially Delivered</option>
              <option>Delivered</option>
              <option>Invoiced</option>
              <option>Cancelled</option>
            </select>

            <button
              type="button"
              onClick={() => {
                fetchOrders();
                fetchStockBalances();
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
                <th className="p-3 text-left">Order No</th>
                <th className="p-3 text-left">Customer</th>
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
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-10 text-center text-slate-500">
                    No sales order found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order._id} className="border-t hover:bg-slate-50">
                    <td className="p-3 font-bold text-blue-700">
                      {order.salesOrderNo}
                    </td>

                    <td className="p-3">
                      <div className="font-semibold">
                        {order.customerName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {order.customerPhone}
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
                          type="button"
                          onClick={() => printOrder(order)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                          title="Print"
                        >
                          <Printer size={16} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEdit(order)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          type="button"
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

export default SalesOrders;