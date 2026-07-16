import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Package,
  ArrowLeft,
  Save,
  Trash2,
  Edit3,
  Layers,
  Tag,
  Search,
  Loader2,
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  X,
  ClipboardList,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const API_ITEMS = `${API_BASE_URL}/items`;
const API_STOCK = `${API_BASE_URL}/stock-ledger`;

const todayDate = () => new Date().toISOString().slice(0, 10);

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

const numberValue = (value) => Number(value || 0);

const getDefaultItemForm = () => ({
  name: "",
  code: "",
  category: "General",
  brand: "",
  unit: "Pcs",
  purchasePrice: "0",
  salePrice: "0",
  openingStock: "0",
  minStock: "5",
  status: "Active",
  notes: "",
});

const getDefaultStockForm = () => ({
  item: "",
  type: "IN",
  quantity: "",
  warehouse: "Main Godown",
  rate: "",
  date: todayDate(),
  remarks: "",
});

const normalizeArray = (data, possibleKeys = []) => {
  if (Array.isArray(data)) return data;

  for (const key of possibleKeys) {
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

const ItemsManager = () => {
  const [items, setItems] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [formData, setFormData] = useState(getDefaultItemForm());

  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [stockSaving, setStockSaving] = useState(false);
  const [stockForm, setStockForm] = useState(getDefaultStockForm());
  const [selectedStockItem, setSelectedStockItem] = useState(null);

  const fetchItems = async () => {
    try {
      setLoading(true);

      const data = await apiRequest(`${API_ITEMS}/all`);
      const list = normalizeArray(data, ["items"]);

      setItems(list);
    } catch (error) {
      console.error("Items Fetch Error:", error);
      alert(error.message || "Items load nahi huay");
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNextCode = async () => {
    try {
      const data = await apiRequest(`${API_ITEMS}/next-code`);
      return data.code || "";
    } catch (error) {
      console.error("Next Item Code Error:", error);
      return "";
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const stats = useMemo(() => {
    const totalItems = items.length;

    const totalStock = items.reduce(
      (sum, item) => sum + numberValue(item.currentStock),
      0
    );

    const lowStock = items.filter(
      (item) =>
        item.status === "Active" &&
        numberValue(item.currentStock) <= numberValue(item.minStock)
    ).length;

    const activeItems = items.filter((item) => item.status === "Active").length;

    return {
      totalItems,
      totalStock,
      lowStock,
      activeItems,
    };
  }, [items]);

  const filteredItems = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !keyword ||
        item.name?.toLowerCase().includes(keyword) ||
        item.code?.toLowerCase().includes(keyword) ||
        item.category?.toLowerCase().includes(keyword) ||
        item.brand?.toLowerCase().includes(keyword);

      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [items, searchTerm, statusFilter]);

  const openNewForm = async () => {
    const code = await fetchNextCode();

    setEditId(null);
    setFormData({
      ...getDefaultItemForm(),
      code,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditId(null);
    setFormData(getDefaultItemForm());
  };

  const openEdit = (item) => {
    setEditId(item._id);

    setFormData({
      name: item.name || "",
      code: item.code || "",
      category: item.category || "General",
      brand: item.brand || "",
      unit: item.unit || "Pcs",
      purchasePrice: item.purchasePrice ?? "0",
      salePrice: item.salePrice ?? "0",
      openingStock: item.openingStock ?? "0",
      minStock: item.minStock ?? "5",
      status: item.status || "Active",
      notes: item.notes || "",
    });

    setIsFormOpen(true);
  };

  const validateItem = () => {
    if (!formData.name.trim()) {
      alert("Item name required hai");
      return false;
    }

    if (!formData.code.trim()) {
      alert("Item code required hai");
      return false;
    }

    if (numberValue(formData.purchasePrice) < 0) {
      alert("Purchase price negative nahi ho sakti");
      return false;
    }

    if (numberValue(formData.salePrice) < 0) {
      alert("Sale price negative nahi ho sakti");
      return false;
    }

    if (numberValue(formData.openingStock) < 0) {
      alert("Opening stock negative nahi ho sakta");
      return false;
    }

    if (numberValue(formData.minStock) < 0) {
      alert("Minimum stock negative nahi ho sakta");
      return false;
    }

    return true;
  };

  const buildItemPayload = () => {
    return {
      name: String(formData.name || "").trim(),
      code: String(formData.code || "").trim().toUpperCase(),
      category: String(formData.category || "General").trim(),
      brand: String(formData.brand || "").trim(),
      unit: String(formData.unit || "Pcs").trim(),
      purchasePrice: numberValue(formData.purchasePrice),
      salePrice: numberValue(formData.salePrice),
      openingStock: numberValue(formData.openingStock),
      minStock: numberValue(formData.minStock),
      status: formData.status || "Active",
      notes: String(formData.notes || "").trim(),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateItem()) return;

    try {
      setSaving(true);

      const payload = buildItemPayload();

      const url = editId
        ? `${API_ITEMS}/update/${editId}`
        : `${API_ITEMS}/add`;

      const method = editId ? "PUT" : "POST";

      await apiRequest(url, {
        method,
        body: JSON.stringify(payload),
      });

      await fetchItems();
      closeForm();
    } catch (error) {
      console.error("Item Save Error:", error);
      alert(error.message || "Item save nahi hua");
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    try {
      await apiRequest(`${API_ITEMS}/delete/${id}`, {
        method: "DELETE",
      });

      await fetchItems();
    } catch (error) {
      console.error("Item Delete Error:", error);
      alert(error.message || "Item delete nahi hua");
    }
  };

  const openStockModal = (item, type) => {
    setSelectedStockItem(item);

    setStockForm({
      ...getDefaultStockForm(),
      item: item._id,
      type,
      warehouse: "Main Godown",
      rate:
        type === "IN"
          ? String(item.purchasePrice || 0)
          : String(item.salePrice || item.purchasePrice || 0),
      remarks:
        type === "IN"
          ? "Manual stock plus adjustment"
          : "Manual stock minus adjustment",
    });

    setStockModalOpen(true);
  };

  const closeStockModal = () => {
    setStockModalOpen(false);
    setSelectedStockItem(null);
    setStockForm(getDefaultStockForm());
  };

  const validateStockAdjustment = () => {
    if (!stockForm.item) {
      alert("Item required hai");
      return false;
    }

    if (!["IN", "OUT"].includes(stockForm.type)) {
      alert("Stock type IN ya OUT hona chahiye");
      return false;
    }

    if (numberValue(stockForm.quantity) <= 0) {
      alert("Quantity zero se zyada honi chahiye");
      return false;
    }

    if (!stockForm.warehouse.trim()) {
      alert("Warehouse required hai");
      return false;
    }

    if (
      stockForm.type === "OUT" &&
      selectedStockItem &&
      numberValue(stockForm.quantity) > numberValue(selectedStockItem.currentStock)
    ) {
      alert(
        `Stock available nahi hai. Current stock sirf ${numberValue(
          selectedStockItem.currentStock
        )} ${selectedStockItem.unit} hai`
      );
      return false;
    }

    return true;
  };

  const handleStockAdjustment = async () => {
    if (!validateStockAdjustment()) return;

    try {
      setStockSaving(true);

      const payload = {
        item: stockForm.item,
        type: stockForm.type,
        quantity: numberValue(stockForm.quantity),
        warehouse: String(stockForm.warehouse || "Main Godown").trim(),
        rate: numberValue(stockForm.rate),
        date: stockForm.date || todayDate(),
        remarks: String(stockForm.remarks || "").trim(),
      };

      await apiRequest(`${API_STOCK}/manual`, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      await fetchItems();
      closeStockModal();
    } catch (error) {
      console.error("Stock Adjustment Error:", error);
      alert(error.message || "Stock adjustment nahi hui");
    } finally {
      setStockSaving(false);
    }
  };

  const getStockClass = (item) => {
    const currentStock = numberValue(item.currentStock);
    const minStock = numberValue(item.minStock);

    if (currentStock <= minStock) return "text-red-600";
    return "text-emerald-600";
  };

  return (
    <div className="w-full mx-auto p-2 sm:p-4 md:p-6 space-y-6">
      {stockModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
            <div
              className={`p-4 text-white flex items-center justify-between ${
                stockForm.type === "IN" ? "bg-emerald-600" : "bg-red-600"
              }`}
            >
              <div>
                <h2 className="font-bold text-lg">
                  {stockForm.type === "IN" ? "Stock Plus" : "Stock Minus"}
                </h2>
                <p className="text-xs opacity-90">
                  {selectedStockItem?.code} - {selectedStockItem?.name}
                </p>
              </div>

              <button
                onClick={closeStockModal}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {selectedStockItem && (
                <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Current Stock</p>
                    <b className={getStockClass(selectedStockItem)}>
                      {numberValue(selectedStockItem.currentStock)}{" "}
                      {selectedStockItem.unit}
                    </b>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Min Stock</p>
                    <b>{numberValue(selectedStockItem.minStock)}</b>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Warehouse</p>
                    <b>{stockForm.warehouse}</b>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Type
                  </label>
                  <select
                    value={stockForm.type}
                    onChange={(e) =>
                      setStockForm({
                        ...stockForm,
                        type: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                  >
                    <option value="IN">Stock Plus / IN</option>
                    <option value="OUT">Stock Minus / OUT</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Date
                  </label>
                  <input
                    type="date"
                    value={stockForm.date}
                    onChange={(e) =>
                      setStockForm({
                        ...stockForm,
                        date: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Quantity <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="number"
                    value={stockForm.quantity}
                    onChange={(e) =>
                      setStockForm({
                        ...stockForm,
                        quantity: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Rate
                  </label>
                  <input
                    type="number"
                    value={stockForm.rate}
                    onChange={(e) =>
                      setStockForm({
                        ...stockForm,
                        rate: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                    placeholder="0"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-600">
                    Warehouse
                  </label>
                  <input
                    value={stockForm.warehouse}
                    onChange={(e) =>
                      setStockForm({
                        ...stockForm,
                        warehouse: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                    placeholder="Main Godown"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-600">
                    Remarks
                  </label>
                  <textarea
                    value={stockForm.remarks}
                    onChange={(e) =>
                      setStockForm({
                        ...stockForm,
                        remarks: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 mt-1 text-sm min-h-[90px]"
                    placeholder="Reason / note..."
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
              <button
                onClick={closeStockModal}
                className="px-5 py-2 rounded-lg border bg-white text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={handleStockAdjustment}
                disabled={stockSaving}
                className={`px-5 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60 ${
                  stockForm.type === "IN"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {stockSaving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : stockForm.type === "IN" ? (
                  <TrendingUp size={16} />
                ) : (
                  <TrendingDown size={16} />
                )}
                {stockSaving
                  ? "Saving..."
                  : stockForm.type === "IN"
                  ? "Plus Stock"
                  : "Minus Stock"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#1e40af] text-white p-4 sm:p-6 rounded-t-xl flex flex-col md:flex-row md:justify-between md:items-center gap-4 shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <button className="p-1 hover:bg-blue-700 rounded-lg flex-shrink-0">
            <ArrowLeft size={20} />
          </button>

          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold">
              Inventory & Items Master
            </h1>
            <p className="text-blue-100 text-xs">
              Item master, current stock, plus/minus adjustment and stock flow
            </p>
          </div>
        </div>

        {!isFormOpen && (
          <button
            onClick={openNewForm}
            className="bg-white text-blue-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-100 flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            Create New Item
          </button>
        )}
      </div>

      {!isFormOpen && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white border rounded-xl p-4">
              <p className="text-xs text-slate-500">Total Items</p>
              <h3 className="text-2xl font-bold">{stats.totalItems}</h3>
            </div>

            <div className="bg-white border rounded-xl p-4">
              <p className="text-xs text-slate-500">Active Items</p>
              <h3 className="text-2xl font-bold text-blue-700">
                {stats.activeItems}
              </h3>
            </div>

            <div className="bg-white border rounded-xl p-4">
              <p className="text-xs text-slate-500">Total Stock Qty</p>
              <h3 className="text-2xl font-bold text-emerald-700">
                {stats.totalStock}
              </h3>
            </div>

            <div className="bg-white border rounded-xl p-4">
              <p className="text-xs text-slate-500">Low Stock Items</p>
              <h3 className="text-2xl font-bold text-red-600">
                {stats.lowStock}
              </h3>
            </div>
          </div>

          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <h3 className="font-bold text-[#1e40af] flex items-center gap-2">
                  <Package size={18} />
                  Items Directory
                </h3>
                <p className="text-xs text-slate-500">
                  Current stock ledger ke basis par show ho raha hai
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="text"
                    placeholder="Search by name, code, brand..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs w-full sm:w-72"
                  />
                </div>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border border-slate-300 rounded-lg px-3 py-2 text-xs"
                >
                  <option>All</option>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>

                <button
                  onClick={fetchItems}
                  disabled={loading}
                  className="border rounded-lg px-3 py-2 text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RefreshCcw size={14} />
                  )}
                  Refresh
                </button>
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table
                className="w-full text-left text-xs border-collapse"
                style={{ minWidth: "950px" }}
              >
                <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-4">Item Name</th>
                    <th className="p-4">Code</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Brand</th>
                    <th className="p-4 text-center">Unit</th>
                    <th className="p-4 text-right">Stock IN</th>
                    <th className="p-4 text-right">Stock OUT</th>
                    <th className="p-4 text-right">Current</th>
                    <th className="p-4 text-right">Min</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-center">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="11" className="p-10 text-center">
                        <Loader2 className="animate-spin mx-auto text-blue-600" />
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan="11"
                        className="p-10 text-center text-slate-400"
                      >
                        No item found.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isLowStock =
                        numberValue(item.currentStock) <=
                        numberValue(item.minStock);

                      return (
                        <tr
                          key={item._id}
                          className="border-b hover:bg-slate-50"
                        >
                          <td className="p-4">
                            <div className="font-semibold text-slate-900 flex items-center gap-2">
                              {item.name}

                              {isLowStock && item.status === "Active" && (
                                <AlertTriangle
                                  size={14}
                                  className="text-red-500"
                                />
                              )}
                            </div>

                            <div className="text-[10px] text-slate-500 mt-1">
                              Purchase: {money(item.purchasePrice)} | Sale:{" "}
                              {money(item.salePrice)}
                            </div>
                          </td>

                          <td className="p-4 font-mono text-blue-600 font-bold">
                            {item.code}
                          </td>

                          <td className="p-4">{item.category || "-"}</td>

                          <td className="p-4">{item.brand || "-"}</td>

                          <td className="p-4 text-center">{item.unit}</td>

                          <td className="p-4 text-right text-emerald-700 font-bold">
                            {numberValue(item.qtyIn)}
                          </td>

                          <td className="p-4 text-right text-red-700 font-bold">
                            {numberValue(item.qtyOut)}
                          </td>

                          <td
                            className={`p-4 text-right font-bold ${getStockClass(
                              item
                            )}`}
                          >
                            {numberValue(item.currentStock)}
                          </td>

                          <td className="p-4 text-right">
                            {numberValue(item.minStock)}
                          </td>

                          <td className="p-4 text-center">
                            <span
                              className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                item.status === "Inactive"
                                  ? "bg-red-50 text-red-600"
                                  : "bg-green-50 text-green-700"
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>

                          <td className="p-4">
                            <div className="flex justify-center gap-2">
                              <button
                                onClick={() => openStockModal(item, "IN")}
                                className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                                title="Stock Plus"
                              >
                                <TrendingUp size={15} />
                              </button>

                              <button
                                onClick={() => openStockModal(item, "OUT")}
                                className="p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
                                title="Stock Minus"
                              >
                                <TrendingDown size={15} />
                              </button>

                              <button
                                onClick={() => openEdit(item)}
                                className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                                title="Edit"
                              >
                                <Edit3 size={15} />
                              </button>

                              <button
                                onClick={() => deleteItem(item._id)}
                                className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                                title="Delete"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-blue-50 border-t text-xs text-blue-800 flex items-start gap-2">
              <ClipboardList size={16} className="mt-0.5" />
              <div>
                <b>Stock Flow:</b> Item opening stock plus hoga. Purchase /
                GRN / Purchases se stock IN hoga. Production aur Sales mein
                stock OUT hoga. Manual plus/minus adjustment yahan se ho sakti
                hai.
              </div>
            </div>
          </div>
        </>
      )}

      {isFormOpen && (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-5 sm:p-8">
          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <button
                  type="button"
                  onClick={closeForm}
                  className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-2"
                >
                  <ArrowLeft size={16} />
                  Back to Items
                </button>

                <h2 className="text-xl font-bold text-slate-900">
                  {editId ? "Edit Item" : "Create New Item"}
                </h2>

                <p className="text-xs text-slate-500">
                  Item master create karein. Opening stock sirf new item par
                  stock ledger mein post hoga.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="p-2 rounded-lg border hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-blue-800 border-b pb-2 flex items-center gap-2">
                <Package size={16} />
                1. Base Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Item Name <span className="text-red-600">*</span>
                  </label>
                  <input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-3 text-xs mt-1"
                    placeholder="Item Name"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Item Code / SKU <span className="text-red-600">*</span>
                  </label>
                  <input
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full border rounded-lg p-3 text-xs mt-1"
                    placeholder="ITM-0001"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-blue-800 border-b pb-2 flex items-center gap-2">
                <Layers size={16} />
                2. Classification & Branding
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Category
                  </label>
                  <input
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-3 text-xs mt-1"
                    placeholder="General"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Brand
                  </label>
                  <input
                    value={formData.brand}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        brand: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-3 text-xs mt-1"
                    placeholder="Brand Name"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Unit
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unit: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-3 text-xs mt-1"
                  >
                    <option value="Pcs">Pcs</option>
                    <option value="Rolls">Rolls</option>
                    <option value="Kg">Kg</option>
                    <option value="Sheets">Sheets</option>
                    <option value="Mtr">Mtr</option>
                    <option value="Cartons">Cartons</option>
                    <option value="Box">Box</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-blue-800 border-b pb-2 flex items-center gap-2">
                <Tag size={16} />
                3. Price & Stock Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Purchase Price
                  </label>
                  <input
                    type="number"
                    value={formData.purchasePrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        purchasePrice: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-3 text-xs mt-1"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Sale Price
                  </label>
                  <input
                    type="number"
                    value={formData.salePrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salePrice: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-3 text-xs mt-1"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Opening Stock
                  </label>
                  <input
                    type="number"
                    value={formData.openingStock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        openingStock: e.target.value,
                      })
                    }
                    disabled={!!editId}
                    className={`w-full border rounded-lg p-3 text-xs mt-1 ${
                      editId ? "bg-slate-100 cursor-not-allowed" : ""
                    }`}
                    placeholder="0"
                  />
                  {editId && (
                    <p className="text-[10px] text-slate-500 mt-1">
                      Existing item ka stock change karne ke liye Plus/Minus
                      adjustment use karein.
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Minimum Stock
                  </label>
                  <input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minStock: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-3 text-xs mt-1"
                    placeholder="5"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-bold text-blue-800 border-b pb-2 flex items-center gap-2">
                <Tag size={16} />
                4. Status & Notes
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-3 text-xs mt-1"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-600">
                    Notes
                  </label>
                  <input
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        notes: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg p-3 text-xs mt-1"
                    placeholder="Optional notes"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={closeForm}
                className="px-6 py-2 rounded-lg text-xs font-bold text-slate-600 border bg-white hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-[#1e40af] text-white px-6 py-2 rounded-lg text-xs font-bold hover:bg-blue-800 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                {saving
                  ? "Saving..."
                  : editId
                  ? "Update Item"
                  : "Add Item to Inventory"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ItemsManager;