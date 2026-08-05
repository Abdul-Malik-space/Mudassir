import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  Eye,
  Loader2,
  Package,
  RefreshCcw,
  Search,
  TrendingDown,
  TrendingUp,
  Warehouse,
  X,
} from "lucide-react";

import { API_BASE_URL } from "../config/api";

const API_STOCK = `${API_BASE_URL}/stock-ledger`;
const API_ITEMS = `${API_BASE_URL}/items`;
const API_WAREHOUSES = `${API_BASE_URL}/warehouses`;

const RAW_MATERIAL_GODOWN = "Raw Material Godown";
const FINISHED_GOODS_GODOWN = "Finished Goods Godown";

const todayDate = () => new Date().toISOString().slice(0, 10);

const numberValue = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatQuantity = (value) =>
  numberValue(value).toLocaleString(undefined, {
    maximumFractionDigits: 3,
  });

const money = (value) =>
  `Rs. ${numberValue(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;

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
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || "Request failed.");
  }

  return data;
};

const getItemId = (row) => {
  if (!row) return "";

  if (row.item && typeof row.item === "object") {
    return row.item._id || "";
  }

  return row.item || row._id || "";
};

const getDefaultWarehouseByItemType = (itemType) =>
  itemType === "Finished Good"
    ? FINISHED_GOODS_GODOWN
    : RAW_MATERIAL_GODOWN;

const getWarehouseDisplayName = (warehouseName) => {
  if (warehouseName === RAW_MATERIAL_GODOWN) {
    return "Raw Material Warehouse";
  }

  if (warehouseName === FINISHED_GOODS_GODOWN) {
    return "Finished Goods Warehouse";
  }

  return warehouseName || "-";
};

const getDefaultStockForm = () => ({
  item: "",
  type: "IN",
  quantity: "",
  warehouse: "",
  rate: "",
  date: todayDate(),
  remarks: "",
});

const MuddasirGodown = () => {
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
      console.error("Warehouse Balance Error:", error);
      alert(error.message || "Unable to load inventory stock.");
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
    const map = new Map();

    warehousesMaster.forEach((warehouse) => {
      if (!warehouse?.name) return;

      map.set(warehouse.name.toLowerCase(), {
        _id: warehouse._id || null,
        code: warehouse.code || "",
        name: warehouse.name,
        warehouseType: warehouse.warehouseType || "General",
        status: warehouse.status || "Active",
        isSystem: warehouse.isSystem === true,
      });
    });

    balances.forEach((row) => {
      if (!row?.warehouse) return;

      const key = row.warehouse.toLowerCase();

      if (!map.has(key)) {
        map.set(key, {
          _id: row.warehouseId || null,
          code: "",
          name: row.warehouse,
          warehouseType:
            row.warehouseType ||
            (row.warehouse === FINISHED_GOODS_GODOWN
              ? "Finished Goods"
              : "Raw Material"),
          status: "Active",
          isSystem: false,
        });
      }
    });

    if (!map.has(RAW_MATERIAL_GODOWN.toLowerCase())) {
      map.set(RAW_MATERIAL_GODOWN.toLowerCase(), {
        _id: null,
        code: "WH-RM",
        name: RAW_MATERIAL_GODOWN,
        warehouseType: "Raw Material",
        status: "Active",
        isSystem: true,
      });
    }

    if (!map.has(FINISHED_GOODS_GODOWN.toLowerCase())) {
      map.set(FINISHED_GOODS_GODOWN.toLowerCase(), {
        _id: null,
        code: "WH-FG",
        name: FINISHED_GOODS_GODOWN,
        warehouseType: "Finished Goods",
        status: "Active",
        isSystem: true,
      });
    }

    const sortOrder = {
      "Raw Material": 1,
      "Finished Goods": 2,
      "Work In Process": 3,
      General: 4,
    };

    return Array.from(map.values()).sort((first, second) => {
      const firstOrder = sortOrder[first.warehouseType] || 99;
      const secondOrder = sortOrder[second.warehouseType] || 99;

      if (firstOrder !== secondOrder) return firstOrder - secondOrder;
      return first.name.localeCompare(second.name);
    });
  }, [warehousesMaster, balances]);

  const warehouseMap = useMemo(() => {
    const map = new Map();

    warehouseOptions.forEach((warehouse) => {
      map.set(warehouse.name.toLowerCase(), warehouse);
    });

    return map;
  }, [warehouseOptions]);

  const warehouseFilterOptions = useMemo(
    () => ["All", ...warehouseOptions.map((warehouse) => warehouse.name)],
    [warehouseOptions]
  );

  const getItemMasterFromRow = (row) =>
    itemMap.get(String(getItemId(row)));

  const getRowItemType = (row) =>
    row.itemType ||
    getItemMasterFromRow(row)?.itemType ||
    "Raw Material";

  const getRowMinStock = (row) =>
    numberValue(row.minStock ?? getItemMasterFromRow(row)?.minStock);

  const getAllowedWarehouses = (item) => {
    if (!item) return warehouseOptions;

    if (item.itemType === "Finished Good") {
      return warehouseOptions.filter((warehouse) =>
        ["Finished Goods", "General"].includes(warehouse.warehouseType)
      );
    }

    return warehouseOptions.filter((warehouse) =>
      ["Raw Material", "General"].includes(warehouse.warehouseType)
    );
  };

  const filteredBalances = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return balances.filter((row) => {
      const itemMaster = getItemMasterFromRow(row);

      const searchableText = [
        row.itemCode || itemMaster?.code || "",
        row.itemName || itemMaster?.name || "",
        row.itemType || itemMaster?.itemType || "",
        row.category || itemMaster?.category || "",
        row.brand || itemMaster?.brand || "",
        row.warehouse || "",
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !keyword || searchableText.includes(keyword);
      const matchesWarehouse =
        warehouseFilter === "All" || row.warehouse === warehouseFilter;

      return matchesSearch && matchesWarehouse;
    });
  }, [balances, searchTerm, warehouseFilter, itemMap]);

  const stats = useMemo(() => {
    const uniqueItems = new Set();

    return filteredBalances.reduce(
      (summary, row) => {
        uniqueItems.add(String(getItemId(row)));

        summary.totalIn += numberValue(row.qtyIn);
        summary.totalOut += numberValue(row.qtyOut);
        summary.currentStock += numberValue(row.currentStock);

        const minimumStock = getRowMinStock(row);
        const currentStock = numberValue(row.currentStock);

        if (minimumStock > 0 && currentStock <= minimumStock) {
          summary.lowStockItems += 1;
        }

        summary.totalItems = uniqueItems.size;
        return summary;
      },
      {
        totalItems: 0,
        totalIn: 0,
        totalOut: 0,
        currentStock: 0,
        lowStockItems: 0,
      }
    );
  }, [filteredBalances, itemMap]);

  const getCurrentStockForModal = () => {
    if (!stockForm.item) return 0;

    const row = balances.find(
      (balance) =>
        String(getItemId(balance)) === String(stockForm.item) &&
        String(balance.warehouse || "") ===
          String(stockForm.warehouse || "")
    );

    return numberValue(row?.currentStock ?? selectedBalance?.currentStock);
  };

  const getItemTypeBadgeClass = (itemType) => {
    if (itemType === "Finished Good") {
      return "bg-purple-100 text-purple-700";
    }

    if (itemType === "Packing Material") {
      return "bg-amber-100 text-amber-700";
    }

    if (itemType === "Consumable") {
      return "bg-cyan-100 text-cyan-700";
    }

    return "bg-blue-100 text-blue-700";
  };

  const getWarehouseBadgeClass = (warehouseType) => {
    if (warehouseType === "Finished Goods") {
      return "bg-purple-100 text-purple-700";
    }

    if (warehouseType === "Work In Process") {
      return "bg-orange-100 text-orange-700";
    }

    return "bg-emerald-100 text-emerald-700";
  };

  const getStockClass = (row) => {
    const minimumStock = getRowMinStock(row);
    const currentStock = numberValue(row.currentStock);

    return minimumStock > 0 && currentStock <= minimumStock
      ? "text-red-600"
      : "text-emerald-600";
  };

  const openStockModal = (row, type) => {
    const itemId = getItemId(row);
    const itemMaster = itemMap.get(String(itemId));
    const itemType = row.itemType || itemMaster?.itemType || "Raw Material";

    setSelectedBalance(row);
    setStockForm({
      item: itemId,
      type,
      quantity: "",
      warehouse:
        row.warehouse || getDefaultWarehouseByItemType(itemType),
      rate: String(itemMaster?.purchasePrice || 0),
      date: todayDate(),
      remarks:
        type === "IN"
          ? "Authorised manual stock-in correction"
          : "Authorised manual stock-out correction",
    });
    setStockModalOpen(true);
  };

  const closeStockModal = () => {
    setStockModalOpen(false);
    setSelectedBalance(null);
    setStockForm(getDefaultStockForm());
  };

  const handleTypeChange = (type) => {
    setStockForm((previous) => ({
      ...previous,
      type,
      remarks:
        type === "IN"
          ? "Authorised manual stock-in correction"
          : "Authorised manual stock-out correction",
    }));
  };

  const validateStockForm = () => {
    if (!stockForm.item) {
      alert("Please select an item.");
      return false;
    }

    const selectedItem = itemMap.get(String(stockForm.item));

    if (!selectedItem) {
      alert("The selected item could not be found.");
      return false;
    }

    if (
      selectedItem.itemType === "Service" ||
      selectedItem.stockManaged === false
    ) {
      alert("Service items do not have warehouse stock.");
      return false;
    }

    if (!["IN", "OUT"].includes(stockForm.type)) {
      alert("Please select Stock In or Stock Out.");
      return false;
    }

    const quantity = numberValue(stockForm.quantity);

    if (quantity <= 0) {
      alert("Quantity must be greater than zero.");
      return false;
    }

    if (!String(stockForm.warehouse || "").trim()) {
      alert("Please select a warehouse.");
      return false;
    }

    const selectedWarehouse = warehouseMap.get(
      stockForm.warehouse.toLowerCase()
    );

    if (selectedWarehouse) {
      if (
        selectedItem.itemType === "Finished Good" &&
        selectedWarehouse.warehouseType === "Raw Material"
      ) {
        alert(
          "Finished goods cannot be adjusted in the Raw Material Warehouse."
        );
        return false;
      }

      if (
        selectedItem.itemType !== "Finished Good" &&
        selectedWarehouse.warehouseType === "Finished Goods"
      ) {
        alert(
          "Raw materials cannot be adjusted in the Finished Goods Warehouse."
        );
        return false;
      }

      if (stockForm.type === "IN" && selectedWarehouse.status === "Full") {
        alert(
          `${getWarehouseDisplayName(selectedWarehouse.name)} is full.`
        );
        return false;
      }
    }

    if (String(stockForm.remarks || "").trim().length < 3) {
      alert("Please enter a reason for the manual adjustment.");
      return false;
    }

    if (
      stockForm.type === "OUT" &&
      quantity > getCurrentStockForModal()
    ) {
      alert(
        `Insufficient stock. Available quantity is ${formatQuantity(
          getCurrentStockForModal()
        )} ${selectedItem.unit || ""}.`
      );
      return false;
    }

    return true;
  };

  const handleStockAdjustment = async () => {
    if (!validateStockForm()) return;

    try {
      setSaving(true);

      await apiRequest(`${API_STOCK}/manual`, {
        method: "POST",
        body: JSON.stringify({
          item: stockForm.item,
          type: stockForm.type,
          quantity: numberValue(stockForm.quantity),
          warehouse: String(stockForm.warehouse).trim(),
          rate: numberValue(stockForm.rate),
          date: stockForm.date || todayDate(),
          remarks: String(stockForm.remarks).trim(),
        }),
      });

      await Promise.all([
        fetchBalances(),
        fetchLedger({
          item: stockForm.item,
          warehouse: stockForm.warehouse,
        }),
      ]);

      closeStockModal();
    } catch (error) {
      console.error("Manual Stock Adjustment Error:", error);
      alert(error.message || "Unable to complete the stock adjustment.");
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
      } / ${getWarehouseDisplayName(row.warehouse)}`
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

  const selectedItem = itemMap.get(String(stockForm.item));
  const allowedWarehouses = getAllowedWarehouses(selectedItem);

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
                  {stockForm.type === "IN" ? "Add Stock" : "Remove Stock"}
                </h2>
                <p className="text-xs opacity-90">
                  Authorised manual stock correction for the selected warehouse
                </p>
              </div>

              <button
                type="button"
                onClick={closeStockModal}
                className="p-2 hover:bg-white/10 rounded-lg"
                aria-label="Close stock adjustment"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div>
                  <p className="text-xs text-slate-500">Current Stock</p>
                  <b
                    className={
                      stockForm.type === "OUT"
                        ? "text-red-600"
                        : "text-emerald-600"
                    }
                  >
                    {formatQuantity(getCurrentStockForModal())}
                  </b>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Item Type</p>
                  <b>
                    {selectedItem?.itemType ||
                      selectedBalance?.itemType ||
                      "-"}
                  </b>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Warehouse</p>
                  <b>{getWarehouseDisplayName(stockForm.warehouse)}</b>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-600">
                    Item <span className="text-red-600">*</span>
                  </label>

                  <select
                    value={stockForm.item}
                    disabled={Boolean(selectedBalance)}
                    onChange={(event) => {
                      const itemId = event.target.value;
                      const item = itemMap.get(itemId);

                      setStockForm((previous) => ({
                        ...previous,
                        item: itemId,
                        warehouse: getDefaultWarehouseByItemType(
                          item?.itemType
                        ),
                        rate: String(item?.purchasePrice || 0),
                      }));
                    }}
                    className="w-full border rounded-lg px-3 py-2 mt-1 text-sm disabled:bg-slate-100"
                  >
                    <option value="">Select Item</option>

                    {items
                      .filter(
                        (item) =>
                          item.itemType !== "Service" &&
                          item.stockManaged !== false
                      )
                      .map((item) => (
                        <option key={item._id} value={item._id}>
                          {item.code} - {item.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Movement
                  </label>
                  <select
                    value={stockForm.type}
                    onChange={(event) => handleTypeChange(event.target.value)}
                    className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                  >
                    <option value="IN">Stock In</option>
                    <option value="OUT">Stock Out</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Date
                  </label>
                  <input
                    type="date"
                    value={stockForm.date}
                    onChange={(event) =>
                      setStockForm((previous) => ({
                        ...previous,
                        date: event.target.value,
                      }))
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
                    min="0"
                    step="any"
                    value={stockForm.quantity}
                    onChange={(event) =>
                      setStockForm((previous) => ({
                        ...previous,
                        quantity: event.target.value,
                      }))
                    }
                    className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">
                    Cost Rate
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={stockForm.rate}
                    onChange={(event) =>
                      setStockForm((previous) => ({
                        ...previous,
                        rate: event.target.value,
                      }))
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
                    disabled={Boolean(selectedBalance)}
                    onChange={(event) =>
                      setStockForm((previous) => ({
                        ...previous,
                        warehouse: event.target.value,
                      }))
                    }
                    className="w-full border rounded-lg px-3 py-2 mt-1 text-sm disabled:bg-slate-100"
                  >
                    {allowedWarehouses.map((warehouse) => (
                      <option
                        key={warehouse._id || warehouse.name}
                        value={warehouse.name}
                      >
                        {getWarehouseDisplayName(warehouse.name)}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">
                    The available warehouse is determined by the selected item
                    type.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-600">
                    Adjustment Reason <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    value={stockForm.remarks}
                    onChange={(event) =>
                      setStockForm((previous) => ({
                        ...previous,
                        remarks: event.target.value,
                      }))
                    }
                    className="w-full border rounded-lg px-3 py-2 mt-1 text-sm min-h-[90px]"
                    placeholder="Enter the reason for this manual stock correction..."
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
                  ? "Add Stock"
                  : "Remove Stock"}
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
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Warehouse size={22} />
              Muddasir Inventory & Warehouse Stock
            </h1>
            <p className="text-blue-100 text-xs">
              Monitor raw materials, finished goods, and warehouse stock
              movements.
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

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-slate-500">Inventory Items</p>
          <h3 className="text-2xl font-bold">{stats.totalItems}</h3>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Stock In</p>
          <h3 className="text-2xl font-bold text-emerald-700">
            {formatQuantity(stats.totalIn)}
          </h3>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-slate-500">Total Stock Out</p>
          <h3 className="text-2xl font-bold text-red-700">
            {formatQuantity(stats.totalOut)}
          </h3>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-slate-500">Current Stock</p>
          <h3 className="text-2xl font-bold text-blue-700">
            {formatQuantity(stats.currentStock)}
          </h3>
        </div>

        <div className="bg-white border rounded-xl p-4">
          <p className="text-xs text-slate-500">Low Stock Items</p>
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
              Warehouse Stock Balance
            </h3>
            <p className="text-xs text-slate-500">
              Track stock received, issued, and currently available in each
              warehouse.
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
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs w-full sm:w-72"
                placeholder="Search item, code, type, or warehouse..."
              />
            </div>

            <select
              value={warehouseFilter}
              onChange={(event) => setWarehouseFilter(event.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-xs"
            >
              {warehouseFilterOptions.map((warehouse) => (
                <option key={warehouse} value={warehouse}>
                  {warehouse === "All"
                    ? "All Warehouses"
                    : getWarehouseDisplayName(warehouse)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto w-full">
          <table
            className="w-full text-left text-xs border-collapse"
            style={{ minWidth: "1120px" }}
          >
            <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
              <tr>
                <th className="p-4">Item</th>
                <th className="p-4">Item Type</th>
                <th className="p-4">Category / Brand</th>
                <th className="p-4">Warehouse</th>
                <th className="p-4 text-center">Unit</th>
                <th className="p-4 text-right">Stock In</th>
                <th className="p-4 text-right">Stock Out</th>
                <th className="p-4 text-right">Current</th>
                <th className="p-4 text-right">Minimum</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="p-10 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-600" />
                  </td>
                </tr>
              ) : filteredBalances.length === 0 ? (
                <tr>
                  <td
                    colSpan="10"
                    className="p-10 text-center text-slate-400"
                  >
                    No inventory items found.
                  </td>
                </tr>
              ) : (
                filteredBalances.map((row, index) => {
                  const itemId = getItemId(row);
                  const itemMaster = itemMap.get(String(itemId));

                  const itemCode = row.itemCode || itemMaster?.code || "-";
                  const itemName = row.itemName || itemMaster?.name || "-";
                  const itemType = getRowItemType(row);
                  const category =
                    row.category || itemMaster?.category || "-";
                  const brand = row.brand || itemMaster?.brand || "-";
                  const minimumStock = getRowMinStock(row);
                  const currentStock = numberValue(row.currentStock);
                  const isLowStock =
                    minimumStock > 0 && currentStock <= minimumStock;

                  const warehouseType =
                    row.warehouseType ||
                    warehouseMap.get(
                      String(row.warehouse || "").toLowerCase()
                    )?.warehouseType ||
                    (itemType === "Finished Good"
                      ? "Finished Goods"
                      : "Raw Material");

                  return (
                    <tr
                      key={`${itemId}-${row.warehouse}-${index}`}
                      className="border-b hover:bg-slate-50"
                    >
                      <td className="p-4">
                        <div className="font-semibold text-slate-900 flex items-center gap-2">
                          {itemName}
                          {isLowStock && (
                            <AlertTriangle
                              size={14}
                              className="text-red-500"
                            />
                          )}
                        </div>
                        <div className="text-[10px] text-blue-600 font-mono mt-1">
                          {itemCode}
                        </div>
                      </td>

                      <td className="p-4">
                        <span
                          className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${getItemTypeBadgeClass(
                            itemType
                          )}`}
                        >
                          {itemType}
                        </span>
                      </td>

                      <td className="p-4">
                        <div>{category}</div>
                        <div className="text-[10px] text-slate-500">
                          {brand}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold">
                          {getWarehouseDisplayName(
                            row.warehouse ||
                              getDefaultWarehouseByItemType(itemType)
                          )}
                        </div>
                        <span
                          className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${getWarehouseBadgeClass(
                            warehouseType
                          )}`}
                        >
                          {warehouseType}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        {row.unit || itemMaster?.unit || "Pcs"}
                      </td>

                      <td className="p-4 text-right font-bold text-emerald-700">
                        {formatQuantity(row.qtyIn)}
                      </td>

                      <td className="p-4 text-right font-bold text-red-700">
                        {formatQuantity(row.qtyOut)}
                      </td>

                      <td
                        className={`p-4 text-right font-bold ${getStockClass(
                          row
                        )}`}
                      >
                        {formatQuantity(currentStock)}
                      </td>

                      <td className="p-4 text-right">
                        {formatQuantity(minimumStock)}
                      </td>

                      <td className="p-4">
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => openStockModal(row, "IN")}
                            className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            title="Add Stock"
                          >
                            <TrendingUp size={15} />
                          </button>

                          <button
                            type="button"
                            onClick={() => openStockModal(row, "OUT")}
                            disabled={currentStock <= 0}
                            className="p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Remove Stock"
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
          <ClipboardList size={16} className="mt-0.5 flex-shrink-0" />

          <div className="space-y-1">
            {/* <div>
              <b>Raw Material Flow:</b>{" "}
              Item Master → Purchase Order → GRN → Raw Material Warehouse
              Stock In → Production Issue Stock Out.
            </div> */}

            {/* <div>
              <b>Finished Goods Flow:</b>{" "}
              Production Job → Printing → Required Processes → Ready Product →
              Production Output → Finished Goods Warehouse Stock In → Delivery
              Challan Stock Out.
            </div> */}

            {/* <div className="text-red-700">
              Manual stock adjustments should be used only for authorised
              corrections.
            </div> */}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">{ledgerTitle}</h3>
            <p className="text-xs text-slate-500">
              Latest warehouse stock ledger entries.
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
          <table className="w-full text-xs" style={{ minWidth: "950px" }}>
            <thead className="bg-slate-50 text-slate-500 uppercase">
              <tr>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Item</th>
                <th className="p-3 text-left">Warehouse</th>
                <th className="p-3 text-left">Movement</th>
                <th className="p-3 text-left">Reference</th>
                <th className="p-3 text-right">In</th>
                <th className="p-3 text-right">Out</th>
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
                  <td
                    colSpan="9"
                    className="p-8 text-center text-slate-400"
                  >
                    No stock movement found.
                  </td>
                </tr>
              ) : (
                ledger.map((row) => (
                  <tr
                    key={row._id}
                    className="border-t hover:bg-slate-50"
                  >
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

                    <td className="p-3">
                      {getWarehouseDisplayName(row.warehouse)}
                    </td>

                    <td className="p-3 font-semibold">
                      {row.movementType || "-"}
                    </td>

                    <td className="p-3">
                      <div>{row.referenceNo || "-"}</div>
                      <div className="text-[10px] text-slate-500">
                        {row.sourceModule || ""}
                      </div>
                    </td>

                    <td className="p-3 text-right font-bold text-emerald-700">
                      {formatQuantity(row.qtyIn)}
                    </td>

                    <td className="p-3 text-right font-bold text-red-700">
                      {formatQuantity(row.qtyOut)}
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

export default MuddasirGodown;
