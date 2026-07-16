import React, { useEffect, useMemo, useState } from "react";
import {
  Warehouse,
  Search,
  RefreshCcw,
  Loader2,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  Eye,
  X,
  Package,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const API_STOCK = `${API_BASE_URL}/stock-ledger`;
const API_ITEMS = `${API_BASE_URL}/items`;
const API_WAREHOUSES = `${API_BASE_URL}/warehouses`;

const todayDate = () => new Date().toISOString().slice(0, 10);

const numberValue = (value) => Number(value || 0);

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

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
  return row.item || row._id || "";
};

const getDefaultStockForm = () => ({
  item: "",
  type: "IN",
  quantity: "",
  warehouse: "Main Godown",
  rate: "",
  date: todayDate(),
  remarks: "",
});

const UrwaGodam = () => {
  const [balances, setBalances] = useState([]);
  const [items, setItems] = useState([]);
  const [warehousesMaster, setWarehousesMaster] = useState([]);
  const [ledger, setLedger] = useState([]);

  const [loading, setLoading] = useState(false);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [warehouseFilter, setWarehouseFilter] = useState("All");

  const [ledgerTitle, setLedgerTitle] = useState("Recent Stock Movements");

  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState(null);
  const [stockForm, setStockForm] = useState(getDefaultStockForm());

  const fetchItems = async () => {
    try {
      const data = await apiRequest(`${API_ITEMS}/all`);
      setItems(normalizeArray(data, ["items"]));
    } catch (error) {
      console.error("Items Load Error:", error);
      setItems([]);
    }
  };

  const fetchWarehouses = async () => {
    try {
      const data = await apiRequest(`${API_WAREHOUSES}/active`);
      setWarehousesMaster(normalizeArray(data, ["warehouses"]));
    } catch (error) {
      console.error("Warehouses Load Error:", error);
      setWarehousesMaster([]);
    }
  };

  const fetchBalances = async () => {
    try {
      setLoading(true);

      const data = await apiRequest(`${API_STOCK}/balances`);
      setBalances(normalizeArray(data, ["balances", "stock"]));
    } catch (error) {
      console.error("Godown Balance Error:", error);
      alert(error.message || "Muddasir Godown stock load nahi hua");
      setBalances([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchLedger = async ({ item = "", warehouse = "" } = {}) => {
    try {
      setLedgerLoading(true);

      const params = new URLSearchParams();

      if (item) params.append("item", item);
      if (warehouse && warehouse !== "All") {
        params.append("warehouse", warehouse);
      }

      const query = params.toString();
      const url = query ? `${API_STOCK}/all?${query}` : `${API_STOCK}/all`;

      const data = await apiRequest(url);
      setLedger(normalizeArray(data, ["ledger", "rows", "movements"]));
    } catch (error) {
      console.error("Stock Ledger Error:", error);
      setLedger([]);
    } finally {
      setLedgerLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([
      fetchItems(),
      fetchWarehouses(),
      fetchBalances(),
      fetchLedger(),
    ]);
  };

  useEffect(() => {
    refreshAll();
  }, []);

  const itemMap = useMemo(() => {
    const map = new Map();

    items.forEach((item) => {
      map.set(String(item._id), item);
    });

    return map;
  }, [items]);

  const warehouseOptions = useMemo(() => {
    const fromMaster = warehousesMaster.map((warehouse) => warehouse.name).filter(Boolean);
    const fromBalances = balances.map((row) => row.warehouse).filter(Boolean);

    const merged = Array.from(new Set([...fromMaster, ...fromBalances]));

    if (merged.length === 0) {
      return ["Main Godown"];
    }

    return merged;
  }, [warehousesMaster, balances]);

  const warehousesForFilter = useMemo(() => {
    return ["All", ...warehouseOptions];
  }, [warehouseOptions]);

  const filteredBalances = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return balances.filter((row) => {
      const itemId = getItemId(row);
      const itemMaster = itemMap.get(String(itemId));

      const itemCode = row.itemCode || itemMaster?.code || "";
      const itemName = row.itemName || itemMaster?.name || "";

      const matchesSearch =
        !keyword ||
        itemCode.toLowerCase().includes(keyword) ||
        itemName.toLowerCase().includes(keyword) ||
        row.warehouse?.toLowerCase().includes(keyword) ||
        itemMaster?.category?.toLowerCase().includes(keyword) ||
        itemMaster?.brand?.toLowerCase().includes(keyword);

      const matchesWarehouse =
        warehouseFilter === "All" || row.warehouse === warehouseFilter;

      return matchesSearch && matchesWarehouse;
    });
  }, [balances, searchTerm, warehouseFilter, itemMap]);

  const stats = useMemo(() => {
    const totalIn = filteredBalances.reduce(
      (sum, row) => sum + numberValue(row.qtyIn),
      0
    );

    const totalOut = filteredBalances.reduce(
      (sum, row) => sum + numberValue(row.qtyOut),
      0
    );

    const currentStock = filteredBalances.reduce(
      (sum, row) => sum + numberValue(row.currentStock),
      0
    );

    const lowStockItems = filteredBalances.filter((row) => {
      const itemId = getItemId(row);
      const itemMaster = itemMap.get(String(itemId));
      const minStock = numberValue(itemMaster?.minStock);

      if (!itemMaster) return false;
      return numberValue(row.currentStock) <= minStock;
    }).length;

    return {
      totalItems: filteredBalances.length,
      totalIn,
      totalOut,
      currentStock,
      lowStockItems,
    };
  }, [filteredBalances, itemMap]);

  const getCurrentStockForModal = () => {
    const itemId = stockForm.item;
    const warehouse = stockForm.warehouse || "Main Godown";

    const row = balances.find(
      (balance) =>
        String(getItemId(balance)) === String(itemId) &&
        String(balance.warehouse || "") === String(warehouse)
    );

    return numberValue(row?.currentStock);
  };

  const openStockModal = (row, type) => {
    const itemId = getItemId(row);
    const itemMaster = itemMap.get(String(itemId));

    setSelectedBalance(row);

    setStockForm({
      item: itemId,
      type,
      quantity: "",
      warehouse: row.warehouse || "Main Godown",
      rate:
        type === "IN"
          ? String(itemMaster?.purchasePrice || 0)
          : String(itemMaster?.salePrice || itemMaster?.purchasePrice || 0),
      date: todayDate(),
      remarks:
        type === "IN"
          ? "Manual Muddasir Godown stock plus adjustment"
          : "Manual Muddasir Godown stock minus adjustment",
    });

    setStockModalOpen(true);
  };

  const closeStockModal = () => {
    setStockModalOpen(false);
    setSelectedBalance(null);
    setStockForm(getDefaultStockForm());
  };

  const validateStockForm = () => {
    if (!stockForm.item) {
      alert("Item required hai");
      return false;
    }

    if (!["IN", "OUT"].includes(stockForm.type)) {
      alert("Type IN ya OUT hona chahiye");
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

    if (stockForm.type === "OUT") {
      const currentStock = getCurrentStockForModal();

      if (numberValue(stockForm.quantity) > currentStock) {
        alert(`Stock available nahi hai. Current stock sirf ${currentStock} hai`);
        return false;
      }
    }

    return true;
  };

  const handleStockAdjustment = async () => {
    if (!validateStockForm()) return;

    try {
      setSaving(true);

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

      await fetchBalances();
      await fetchLedger({
        item: stockForm.item,
        warehouse: stockForm.warehouse,
      });

      closeStockModal();
    } catch (error) {
      console.error("Manual Muddasir Godown Stock Error:", error);
      alert(error.message || "Stock adjustment nahi hui");
    } finally {
      setSaving(false);
    }
  };

  const viewLedger = async (row) => {
    const itemId = getItemId(row);
    const itemMaster = itemMap.get(String(itemId));

    setLedgerTitle(
      `${row.itemCode || itemMaster?.code || ""} - ${
        row.itemName || itemMaster?.name || ""
      } / ${row.warehouse || ""}`
    );

    await fetchLedger({
      item: itemId,
      warehouse: row.warehouse || "",
    });
  };

  const resetLedgerView = async () => {
    setLedgerTitle("Recent Stock Movements");
    await fetchLedger();
  };

  const getStockClass = (row) => {
    const itemId = getItemId(row);
    const itemMaster = itemMap.get(String(itemId));
    const minStock = numberValue(itemMaster?.minStock);
    const currentStock = numberValue(row.currentStock);

    if (itemMaster && currentStock <= minStock) return "text-red-600";
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
                  {stockForm.type === "IN"
                    ? "Muddasir Godown Stock Plus"
                    : "Muddasir Godown Stock Minus"}
                </h2>
                <p className="text-xs opacity-90">
                  Manual stock adjustment in selected warehouse
                </p>
              </div>

              <button
                type="button"
                onClick={closeStockModal}
                className="p-2 hover:bg-white/10 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Current Stock</p>
                  <b
                    className={
                      stockForm.type === "OUT"
                        ? "text-red-600"
                        : "text-emerald-600"
                    }
                  >
                    {getCurrentStockForModal()}
                  </b>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Warehouse</p>
                  <b>{stockForm.warehouse}</b>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-600">
                    Item <span className="text-red-600">*</span>
                  </label>

                  <select
                    value={stockForm.item}
                    disabled={!!selectedBalance}
                    onChange={(e) => {
                      const selectedItem = itemMap.get(e.target.value);

                      setStockForm({
                        ...stockForm,
                        item: e.target.value,
                        rate:
                          stockForm.type === "IN"
                            ? String(selectedItem?.purchasePrice || 0)
                            : String(
                                selectedItem?.salePrice ||
                                  selectedItem?.purchasePrice ||
                                  0
                              ),
                      });
                    }}
                    className="w-full border rounded-lg px-3 py-2 mt-1 text-sm disabled:bg-slate-100"
                  >
                    <option value="">Select Item</option>

                    {items.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.code} - {item.name}
                      </option>
                    ))}
                  </select>
                </div>

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

                  <select
                    value={stockForm.warehouse}
                    onChange={(e) =>
                      setStockForm({
                        ...stockForm,
                        warehouse: e.target.value,
                      })
                    }
                    className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                  >
                    {warehouseOptions.map((warehouse) => (
                      <option key={warehouse} value={warehouse}>
                        {warehouse}
                      </option>
                    ))}
                  </select>
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
                type="button"
                onClick={closeStockModal}
                className="px-5 py-2 rounded-lg border bg-white text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleStockAdjustment}
                disabled={saving}
                className={`px-5 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60 ${
                  stockForm.type === "IN"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {saving ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : stockForm.type === "IN" ? (
                  <TrendingUp size={16} />
                ) : (
                  <TrendingDown size={16} />
                )}

                {saving
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
          <button
            type="button"
            onClick={() => window.history.back()}
            className="p-1 hover:bg-blue-700 rounded-lg flex-shrink-0"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Warehouse size={22} />
              Muddasir Godown / Stock Balance
            </h1>

            <p className="text-blue-100 text-xs">
              GRN, purchase, production aur sales movements ke basis par current stock
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={refreshAll}
          disabled={loading}
          className="bg-white text-blue-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-100 flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <RefreshCcw size={15} />
          )}
          Refresh Stock
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-slate-500">Stock Items</p>
          <h3 className="text-2xl font-bold">{stats.totalItems}</h3>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-slate-500">Total IN</p>
          <h3 className="text-2xl font-bold text-emerald-700">
            {stats.totalIn}
          </h3>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-slate-500">Total OUT</p>
          <h3 className="text-2xl font-bold text-red-700">{stats.totalOut}</h3>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-slate-500">Current Stock</p>
          <h3 className="text-2xl font-bold text-blue-700">
            {stats.currentStock}
          </h3>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-slate-500">Low Stock</p>
          <h3 className="text-2xl font-bold text-red-600">
            {stats.lowStockItems}
          </h3>
        </div>
      </div>

      <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="font-bold text-[#1e40af] flex items-center gap-2">
              <Package size={18} />
              Muddasir Godown Stock Balance
            </h3>

            <p className="text-xs text-slate-500">
              Yeh table StockLedger se calculate ho raha hai. GRN received hone par stock yahan plus hoga.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs w-full sm:w-72"
                placeholder="Search item, code, warehouse..."
              />
            </div>

            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-xs"
            >
              {warehousesForFilter.map((warehouse) => (
                <option key={warehouse} value={warehouse}>
                  {warehouse}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table
            className="w-full text-left text-xs border-collapse"
            style={{ minWidth: "980px" }}
          >
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="p-4">Item</th>
                <th className="p-4">Category / Brand</th>
                <th className="p-4">Warehouse</th>
                <th className="p-4 text-center">Unit</th>
                <th className="p-4 text-right">Stock IN</th>
                <th className="p-4 text-right">Stock OUT</th>
                <th className="p-4 text-right">Current</th>
                <th className="p-4 text-right">Min</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" className="p-10 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-600" />
                  </td>
                </tr>
              ) : filteredBalances.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-10 text-center text-slate-400">
                    No Muddasir Godown stock found. GRN receive karein ya manual stock plus karein.
                  </td>
                </tr>
              ) : (
                filteredBalances.map((row, index) => {
                  const itemId = getItemId(row);
                  const itemMaster = itemMap.get(String(itemId));

                  const itemCode = row.itemCode || itemMaster?.code || "-";
                  const itemName = row.itemName || itemMaster?.name || "-";
                  const minStock = numberValue(itemMaster?.minStock);
                  const currentStock = numberValue(row.currentStock);
                  const isLowStock = itemMaster && currentStock <= minStock;

                  return (
                    <tr
                      key={`${itemId}-${row.warehouse}-${index}`}
                      className="border-b hover:bg-slate-50"
                    >
                      <td className="p-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          {itemName}
                          {isLowStock && (
                            <AlertTriangle size={14} className="text-red-500" />
                          )}
                        </div>

                        <div className="text-[10px] text-blue-600 font-mono mt-1">
                          {itemCode}
                        </div>
                      </td>

                      <td className="p-4">
                        <div>{itemMaster?.category || "-"}</div>
                        <div className="text-[10px] text-slate-500">
                          {itemMaster?.brand || "-"}
                        </div>
                      </td>

                      <td className="p-4 font-semibold">
                        {row.warehouse || "Main Godown"}
                      </td>

                      <td className="p-4 text-center">
                        {row.unit || itemMaster?.unit || "Pcs"}
                      </td>

                      <td className="p-4 text-right font-bold text-emerald-700">
                        {numberValue(row.qtyIn)}
                      </td>

                      <td className="p-4 text-right font-bold text-red-700">
                        {numberValue(row.qtyOut)}
                      </td>

                      <td className={`p-4 text-right font-bold ${getStockClass(row)}`}>
                        {currentStock}
                      </td>

                      <td className="p-4 text-right">{minStock}</td>

                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openStockModal(row, "IN")}
                            className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            title="Stock Plus"
                          >
                            <TrendingUp size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openStockModal(row, "OUT")}
                            className="p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100"
                            title="Stock Minus"
                          >
                            <TrendingDown size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => viewLedger(row)}
                            className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                            title="View Ledger"
                          >
                            <Eye size={15} />
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
            <b>Flow:</b> Item Master → Purchase Order → GRN Received → Muddasir Godown Stock IN.
            Production issue aur sales delivery ke baad isi ledger se stock OUT hoga.
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">{ledgerTitle}</h3>
            <p className="text-xs text-slate-500">
              StockLedger ki latest entries
            </p>
          </div>

          <button
            type="button"
            onClick={resetLedgerView}
            className="text-xs px-3 py-2 rounded-lg border hover:bg-slate-50 flex items-center gap-2"
          >
            <RefreshCcw size={14} />
            Show Recent
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ minWidth: "900px" }}>
            <thead className="bg-slate-50 text-slate-500 uppercase">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-left">Warehouse</th>
                <th className="p-3 text-left">Movement</th>
                <th className="p-3 text-left">Reference</th>
                <th className="p-3 text-right">IN</th>
                <th className="p-3 text-right">OUT</th>
                <th className="p-3 text-right">Rate</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>

            <tbody>
              {ledgerLoading ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-600" />
                  </td>
                </tr>
              ) : ledger.length === 0 ? (
                <tr>
                  <td colSpan="9" className="p-8 text-center text-slate-400">
                    No stock movement found.
                  </td>
                </tr>
              ) : (
                ledger.map((row) => (
                  <tr key={row._id} className="border-t hover:bg-slate-50">
                    <td className="p-3">
                      {row.date || row.createdAt?.slice(0, 10)}
                    </td>

                    <td className="p-3">
                      <div className="font-semibold">
                        {row.itemName || row.item?.name || "-"}
                      </div>
                      <div className="text-[10px] text-blue-600 font-mono">
                        {row.itemCode || row.item?.code || ""}
                      </div>
                    </td>

                    <td className="p-3">{row.warehouse || "Main Godown"}</td>

                    <td className="p-3 font-semibold">{row.movementType}</td>

                    <td className="p-3">
                      <div>{row.referenceNo || "-"}</div>
                      <div className="text-[10px] text-slate-500">
                        {row.sourceModule || ""}
                      </div>
                    </td>

                    <td className="p-3 text-right font-bold text-emerald-700">
                      {numberValue(row.qtyIn)}
                    </td>

                    <td className="p-3 text-right font-bold text-red-700">
                      {numberValue(row.qtyOut)}
                    </td>

                    <td className="p-3 text-right">{money(row.rate)}</td>

                    <td className="p-3 text-right font-bold">
                      {money(row.amount)}
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

export default UrwaGodam;