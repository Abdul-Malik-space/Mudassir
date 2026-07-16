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
  RotateCcw,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const emptyItem = {
  item: "",
  description: "",
  size: "",
  cartons: "",
  quantity: "",
  unit: "Rolls",
  unitPrice: "",
  remarks: "",
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

const getDefaultForm = (purchaseOrderNo = "") => ({
  purchaseOrderNo,
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

const PurchaseOrders = () => {
  const [vendors, setVendors] = useState([]);
  const [itemsMaster, setItemsMaster] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vendorLoading, setVendorLoading] = useState(false);
  const [itemLoading, setItemLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [form, setForm] = useState(getDefaultForm());

  const fetchVendors = async () => {
    try {
      setVendorLoading(true);

      const data = await apiRequest(`${API_BASE_URL}/vendors/all`);
      setVendors(normalizeArray(data, ["vendors"]));
    } catch (error) {
      console.error("Vendor loading error:", error);
      alert(error.message || "Vendors load nahi huay");
      setVendors([]);
    } finally {
      setVendorLoading(false);
    }
  };

  const fetchItems = async () => {
    try {
      setItemLoading(true);

      const data = await apiRequest(`${API_BASE_URL}/items/all`);
      const list = normalizeArray(data, ["items"]).filter(
        (item) => item.status !== "Inactive"
      );

      setItemsMaster(list);
    } catch (error) {
      console.error("Items loading error:", error);
      alert(error.message || "Items load nahi huay");
      setItemsMaster([]);
    } finally {
      setItemLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);

      const data = await apiRequest(`${API_BASE_URL}/purchase-orders/all`);
      setOrders(normalizeArray(data, ["purchaseOrders", "orders"]));
    } catch (error) {
      console.error("Purchase order loading error:", error);
      alert(error.message || "Purchase orders load nahi huay");
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNextNo = async () => {
    const data = await apiRequest(`${API_BASE_URL}/purchase-orders/next-no`);
    return data.purchaseOrderNo || "";
  };

  useEffect(() => {
    fetchVendors();
    fetchItems();
    fetchOrders();
  }, []);

  const totals = useMemo(() => {
    const subtotal = form.items.reduce((sum, item) => {
      return sum + Number(item.quantity || 0) * Number(item.unitPrice || 0);
    }, 0);

    const salesTax = form.taxType === "with-tax" ? subtotal * 0.18 : 0;
    const grandTotal = subtotal + salesTax;
    const balance = grandTotal - Number(form.advance || 0);

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
      totalValue: orders.reduce((s, o) => s + Number(o.grandTotal || 0), 0),
      taxValue: orders.reduce((s, o) => s + Number(o.salesTax || 0), 0),
      balance: orders.reduce((s, o) => s + Number(o.balance || 0), 0),
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !keyword ||
        order.purchaseOrderNo?.toLowerCase().includes(keyword) ||
        order.vendorName?.toLowerCase().includes(keyword) ||
        order.vendorPhone?.toLowerCase().includes(keyword) ||
        order.referenceNo?.toLowerCase().includes(keyword) ||
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

      await Promise.all([fetchVendors(), fetchItems()]);

      const nextNo = await fetchNextNo();

      setEditId(null);
      setForm(getDefaultForm(nextNo));
      setShowForm(true);
    } catch (error) {
      alert(error.message || "Purchase Order No load nahi hua");
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

  const handleItemSelect = (index, itemId) => {
    const selectedItem = itemsMaster.find((item) => item._id === itemId);
    const updatedItems = [...form.items];

    if (!selectedItem) {
      updatedItems[index] = {
        ...updatedItems[index],
        item: "",
        description: "",
        unit: "Rolls",
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
      item: selectedItem._id,
      description: selectedItem.name || "",
      unit: selectedItem.unit || "Pcs",
      unitPrice: selectedItem.purchasePrice || 0,
      remarks: selectedItem.notes || "",
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
    if (!form.purchaseOrderNo.trim()) {
      alert("Purchase Order No required hai");
      return false;
    }

    if (!form.vendor) {
      alert("Vendor select karein");
      return false;
    }

    if (!form.orderDate) {
      alert("Order Date required hai");
      return false;
    }

    if (Number(form.advance || 0) > totals.grandTotal) {
      alert("Advance grand total se zyada nahi ho sakta");
      return false;
    }

    const validItems = form.items.filter(
      (item) =>
        item.description?.trim() &&
        Number(item.quantity || 0) > 0 &&
        Number(item.unitPrice || 0) >= 0
    );

    if (validItems.length === 0) {
      alert("Please at least one valid item add karein");
      return false;
    }

    return true;
  };

  const buildPayload = () => {
    const validItems = form.items
      .filter(
        (item) =>
          item.description?.trim() &&
          Number(item.quantity || 0) > 0 &&
          Number(item.unitPrice || 0) >= 0
      )
      .map((item) => ({
        item: item.item || null,
        description: String(item.description || "").trim(),
        size: String(item.size || "").trim(),
        cartons: Number(item.cartons || 0),
        quantity: Number(item.quantity || 0),
        unit: String(item.unit || "Pcs").trim(),
        unitPrice: Number(item.unitPrice || 0),
        remarks: String(item.remarks || "").trim(),
      }));

    return {
      purchaseOrderNo: form.purchaseOrderNo,
      vendor: form.vendor,
      orderDate: form.orderDate,
      expectedDate: form.expectedDate,
      referenceNo: form.referenceNo,
      taxType: form.taxType,
      advance: Number(form.advance || 0),
      status: form.status,
      remarks: form.remarks,
      items: validItems,
    };
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      const payload = buildPayload();

      const url = editId
        ? `${API_BASE_URL}/purchase-orders/update/${editId}`
        : `${API_BASE_URL}/purchase-orders/add`;

      const method = editId ? "PUT" : "POST";

      await apiRequest(url, {
        method,
        body: JSON.stringify(payload),
      });

      await fetchOrders();
      closeForm();
    } catch (error) {
      alert(error.message || "Purchase order save nahi hua");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (order) => {
    await Promise.all([fetchVendors(), fetchItems()]);

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
      items: order.items?.length
        ? order.items.map((row) => ({
            item: row.item?._id || row.item || "",
            description: row.description || "",
            size: row.size || "",
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
    if (!window.confirm("Are you sure you want to delete this purchase order?")) {
      return;
    }

    try {
      await apiRequest(`${API_BASE_URL}/purchase-orders/delete/${id}`, {
        method: "DELETE",
      });

      await fetchOrders();
    } catch (error) {
      alert(error.message || "Purchase order delete nahi hua");
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
            .small { font-size: 12px; color: #374151; line-height: 1.7; }
            .box { border: 1px solid #111827; padding: 10px; margin: 12px 0; line-height: 1.7; font-size: 13px; }
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
              <b>Tax:</b> ${taxLabel}<br/>
              <b>Status:</b> ${order.status || ""}
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
            <div><span>Sales Tax ${order.taxRate || 0}%</span><b>${money(
      order.salesTax
    )}</b></div>
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

              {/* <p className="text-sm text-slate-500 mt-1">
                Vendor select karein aur Item Master se purchase items choose karein.
              </p> */}
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
                  placeholder="PO-0001"
                />
              </div>

              <div>
                <RequiredLabel>Vendor</RequiredLabel>
                <select
                  value={form.vendor}
                  onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1"
                >
                  <option value="">
                    {vendorLoading ? "Loading vendors..." : "Select Vendor"}
                  </option>

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
                  onChange={(e) =>
                    setForm({ ...form, orderDate: e.target.value })
                  }
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
                  onChange={(e) =>
                    setForm({ ...form, taxType: e.target.value })
                  }
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
                  onChange={(e) =>
                    setForm({ ...form, advance: e.target.value })
                  }
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
                  <option>Ordered</option>
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
                  {/* <p className="text-xs text-slate-500">
                    Item Master se item select karein. Quantity aur price required hain.
                  </p> */}
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
                        Item <span className="text-red-600">*</span>
                      </th>
                      <th className="p-2 text-left">Description</th>
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
                          <select
                            value={item.item || ""}
                            onChange={(e) =>
                              handleItemSelect(index, e.target.value)
                            }
                            className="w-full border rounded px-2 py-1.5"
                          >
                            <option value="">
                              {itemLoading ? "Loading items..." : "Select Item"}
                            </option>

                            {itemsMaster.map((masterItem) => (
                              <option key={masterItem._id} value={masterItem._id}>
                                {masterItem.code} - {masterItem.name}
                              </option>
                            ))}
                          </select>
                        </td>

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
                            placeholder="Pcs"
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
            Vendor purchase booking, item master selection, tax and balance tracking
          </p>
        </div>

        <button
          onClick={openNewForm}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm disabled:opacity-60"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
          New Purchase Order
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
            <h3 className="font-bold text-slate-900">Purchase Order List</h3>
            {/* <p className="text-xs text-slate-500">
              All purchase orders from MongoDB
            </p> */}
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
                placeholder="Search order, vendor, item..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option>All</option>
              <option>Draft</option>
              <option>Ordered</option>
              <option>Partially Received</option>
              <option>Received</option>
              <option>Cancelled</option>
            </select>

            <button
              onClick={fetchOrders}
              className="inline-flex items-center justify-center gap-2 text-sm px-3 py-2 rounded-lg border hover:bg-slate-50"
            >
              <RotateCcw size={15} />
              Refresh
            </button>
          </div>
        </div>

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
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-10 text-center text-slate-500">
                    No purchase order found
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
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