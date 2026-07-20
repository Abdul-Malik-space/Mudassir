import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  Edit3,
  Layers,
  Loader2,
  Package,
  Plus,
  RefreshCcw,
  Save,
  Search,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  Warehouse,
  X,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const API_ITEMS = `${API_BASE_URL}/items`;
const API_STOCK = `${API_BASE_URL}/stock-ledger`;

const RAW_MATERIAL_GODOWN = "Raw Material Godown";
const FINISHED_GOODS_GODOWN = "Finished Goods Godown";

const ITEM_TYPES = [
  "Raw Material",
  "Packing Material",
  "Finished Good",
  "Consumable",
  "Service",
];

const todayDate = () =>
  new Date().toISOString().slice(0, 10);

const numberValue = (value) => {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
};

const formatQuantity = (value) =>
  numberValue(value).toLocaleString(
    undefined,
    {
      maximumFractionDigits: 3,
    }
  );

const money = (value) =>
  `Rs. ${numberValue(
    value
  ).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`;

const normalizeArray = (
  data,
  possibleKeys = []
) => {
  if (Array.isArray(data)) {
    return data;
  }

  for (const key of possibleKeys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
};

const apiRequest = async (
  url,
  options = {}
) => {
  const response = await fetch(url, {
    ...options,

    headers: {
      "Content-Type":
        "application/json",

      ...(options.headers || {}),
    },
  });

  const data = await response
    .json()
    .catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        "Request failed."
    );
  }

  return data;
};

const getWarehouseByItemType = (
  itemType
) => {
  if (
    itemType ===
    "Finished Good"
  ) {
    return FINISHED_GOODS_GODOWN;
  }

  if (itemType === "Service") {
    return "";
  }

  return RAW_MATERIAL_GODOWN;
};

const getWarehouseDisplayName = (
  warehouse
) => {
  if (
    warehouse ===
    RAW_MATERIAL_GODOWN
  ) {
    return "Raw Material Warehouse";
  }

  if (
    warehouse ===
    FINISHED_GOODS_GODOWN
  ) {
    return "Finished Goods Warehouse";
  }

  return warehouse || "No Warehouse";
};

const getDefaultItemForm = () => ({
  name: "",
  code: "",
  itemType: "Raw Material",
  category: "General",
  brand: "",
  unit: "Pcs",
  purchasePrice: "0",
  salePrice: "0",
  openingStock: "0",
  minStock: "5",
  stockManaged: true,
  status: "Active",
  notes: "",
});

const getDefaultStockForm = (
  itemType = "Raw Material"
) => ({
  item: "",
  type: "IN",
  quantity: "",

  warehouse:
    getWarehouseByItemType(
      itemType
    ),

  rate: "",
  date: todayDate(),
  remarks: "",
});

const itemTypeBadgeClass = (
  itemType
) => {
  const classes = {
    "Raw Material":
      "bg-blue-100 text-blue-700",

    "Packing Material":
      "bg-amber-100 text-amber-700",

    "Finished Good":
      "bg-purple-100 text-purple-700",

    Consumable:
      "bg-cyan-100 text-cyan-700",

    Service:
      "bg-slate-200 text-slate-700",
  };

  return (
    classes[itemType] ||
    classes["Raw Material"]
  );
};

const warehouseBadgeClass = (
  itemType
) => {
  if (
    itemType ===
    "Finished Good"
  ) {
    return "bg-purple-50 text-purple-700";
  }

  if (itemType === "Service") {
    return "bg-slate-100 text-slate-500";
  }

  return "bg-emerald-50 text-emerald-700";
};

const ItemsManager = () => {
  const [items, setItems] =
    useState([]);

  const [
    isFormOpen,
    setIsFormOpen,
  ] = useState(false);

  const [editId, setEditId] =
    useState(null);

  const [
    editingItem,
    setEditingItem,
  ] = useState(null);

  const [loading, setLoading] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("All");

  const [
    typeFilter,
    setTypeFilter,
  ] = useState("All");

  const [
    formData,
    setFormData,
  ] = useState(
    getDefaultItemForm()
  );

  const [
    stockModalOpen,
    setStockModalOpen,
  ] = useState(false);

  const [
    stockSaving,
    setStockSaving,
  ] = useState(false);

  const [
    stockForm,
    setStockForm,
  ] = useState(
    getDefaultStockForm()
  );

  const [
    selectedStockItem,
    setSelectedStockItem,
  ] = useState(null);

  const fetchItems = async () => {
    try {
      setLoading(true);

      const data =
        await apiRequest(
          `${API_ITEMS}/all`
        );

      const list = normalizeArray(
        data,
        ["items"]
      ).map((item) => {
        const itemType =
          item.itemType ||
          item.type ||
          "Raw Material";

        return {
          ...item,

          itemType,

          stockManaged:
            itemType === "Service"
              ? false
              : item.stockManaged !==
                false,
        };
      });

      setItems(list);
    } catch (error) {
      console.error(
        "Items Fetch Error:",
        error
      );

      alert(
        error.message ||
          "Unable to load items."
      );

      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchNextCode =
    async () => {
      try {
        const data =
          await apiRequest(
            `${API_ITEMS}/next-code`
          );

        return data.code || "";
      } catch (error) {
        console.error(
          "Next Item Code Error:",
          error
        );

        return "";
      }
    };

  useEffect(() => {
    fetchItems();
  }, []);

  const stats = useMemo(() => {
    const stockItems =
      items.filter(
        (item) =>
          item.stockManaged !==
            false &&
          item.itemType !==
            "Service"
      );

    return {
      totalItems:
        items.length,

      rawItems: items.filter(
        (item) =>
          [
            "Raw Material",
            "Packing Material",
            "Consumable",
          ].includes(
            item.itemType
          )
      ).length,

      finishedGoods:
        items.filter(
          (item) =>
            item.itemType ===
            "Finished Good"
        ).length,

      totalStock:
        stockItems.reduce(
          (sum, item) =>
            sum +
            numberValue(
              item.currentStock
            ),
          0
        ),

      lowStock:
        stockItems.filter(
          (item) =>
            item.status ===
              "Active" &&
            numberValue(
              item.minStock
            ) > 0 &&
            numberValue(
              item.currentStock
            ) <=
              numberValue(
                item.minStock
              )
        ).length,
    };
  }, [items]);

  const filteredItems =
    useMemo(() => {
      const keyword =
        searchTerm
          .trim()
          .toLowerCase();

      return items.filter(
        (item) => {
          const searchableText =
            [
              item.name,
              item.code,
              item.itemType,
              item.category,
              item.brand,
              item.unit,

              getWarehouseDisplayName(
                getWarehouseByItemType(
                  item.itemType
                )
              ),
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

          const matchesSearch =
            !keyword ||
            searchableText.includes(
              keyword
            );

          const matchesStatus =
            statusFilter ===
              "All" ||
            item.status ===
              statusFilter;

          const matchesType =
            typeFilter === "All" ||
            item.itemType ===
              typeFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesType
          );
        }
      );
    }, [
      items,
      searchTerm,
      statusFilter,
      typeFilter,
    ]);

  const openNewForm = async () => {
    const code =
      await fetchNextCode();

    setEditId(null);
    setEditingItem(null);

    setFormData({
      ...getDefaultItemForm(),
      code,
    });

    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditId(null);
    setEditingItem(null);

    setFormData(
      getDefaultItemForm()
    );
  };

  const openEdit = (item) => {
    setEditId(item._id);
    setEditingItem(item);

    setFormData({
      name: item.name || "",
      code: item.code || "",

      itemType:
        item.itemType ||
        "Raw Material",

      category:
        item.category ||
        "General",

      brand:
        item.brand || "",

      unit:
        item.unit || "Pcs",

      purchasePrice:
        String(
          item.purchasePrice ?? 0
        ),

      salePrice:
        String(
          item.salePrice ?? 0
        ),

      openingStock:
        String(
          item.openingStock ?? 0
        ),

      minStock:
        String(
          item.minStock ?? 5
        ),

      stockManaged:
        item.stockManaged !==
          false &&
        item.itemType !==
          "Service",

      status:
        item.status ||
        "Active",

      notes:
        item.notes || "",
    });

    setIsFormOpen(true);
  };

  const handleItemTypeChange = (
    itemType
  ) => {
    const stockManaged =
      itemType !== "Service";

    setFormData(
      (current) => ({
        ...current,

        itemType,
        stockManaged,

        openingStock:
          stockManaged
            ? current.openingStock
            : "0",

        minStock:
          stockManaged
            ? current.minStock
            : "0",

        purchasePrice:
          itemType === "Service"
            ? "0"
            : current.purchasePrice,
      })
    );
  };

  const itemTypeLocked =
    Boolean(
      editId &&
        editingItem &&
        (
          numberValue(
            editingItem.qtyIn
          ) > 0 ||
          numberValue(
            editingItem.qtyOut
          ) > 0 ||
          numberValue(
            editingItem.currentStock
          ) !== 0 ||
          editingItem.openingStockPosted ===
            true
        )
    );

  const validateItem = () => {
    if (
      !formData.name.trim()
    ) {
      alert(
        "Item name is required."
      );

      return false;
    }

    if (
      !formData.code.trim()
    ) {
      alert(
        "Item code is required."
      );

      return false;
    }

    if (
      !ITEM_TYPES.includes(
        formData.itemType
      )
    ) {
      alert(
        "Please select a valid item type."
      );

      return false;
    }

    if (
      numberValue(
        formData.purchasePrice
      ) < 0
    ) {
      alert(
        "Purchase price cannot be negative."
      );

      return false;
    }

    if (
      numberValue(
        formData.salePrice
      ) < 0
    ) {
      alert(
        "Sale price cannot be negative."
      );

      return false;
    }

    if (
      numberValue(
        formData.openingStock
      ) < 0
    ) {
      alert(
        "Opening stock cannot be negative."
      );

      return false;
    }

    if (
      numberValue(
        formData.minStock
      ) < 0
    ) {
      alert(
        "Minimum stock cannot be negative."
      );

      return false;
    }

    return true;
  };

  const buildItemPayload = () => {
    const isService =
      formData.itemType ===
      "Service";

    return {
      name: String(
        formData.name || ""
      ).trim(),

      code: String(
        formData.code || ""
      )
        .trim()
        .toUpperCase(),

      itemType:
        formData.itemType,

      category: String(
        formData.category ||
          "General"
      ).trim(),

      brand: String(
        formData.brand || ""
      ).trim(),

      unit: String(
        formData.unit || "Pcs"
      ).trim(),

      purchasePrice:
        isService
          ? 0
          : numberValue(
              formData.purchasePrice
            ),

      salePrice:
        numberValue(
          formData.salePrice
        ),

      openingStock:
        isService
          ? 0
          : numberValue(
              formData.openingStock
            ),

      minStock:
        isService
          ? 0
          : numberValue(
              formData.minStock
            ),

      stockManaged:
        !isService,

      status:
        formData.status ||
        "Active",

      notes: String(
        formData.notes || ""
      ).trim(),
    };
  };

  const handleSubmit =
    async (event) => {
      event.preventDefault();

      if (!validateItem()) {
        return;
      }

      try {
        setSaving(true);

        await apiRequest(
          editId
            ? `${API_ITEMS}/update/${editId}`
            : `${API_ITEMS}/add`,
          {
            method: editId
              ? "PUT"
              : "POST",

            body:
              JSON.stringify(
                buildItemPayload()
              ),
          }
        );

        await fetchItems();

        closeForm();
      } catch (error) {
        console.error(
          "Item Save Error:",
          error
        );

        alert(
          error.message ||
            "Unable to save the item."
        );
      } finally {
        setSaving(false);
      }
    };

  const deleteItem =
    async (item) => {
      if (
        !window.confirm(
          `Delete ${item.code} — ${item.name}? Items with transaction history cannot be deleted.`
        )
      ) {
        return;
      }

      try {
        await apiRequest(
          `${API_ITEMS}/delete/${item._id}`,
          {
            method: "DELETE",
          }
        );

        await fetchItems();
      } catch (error) {
        console.error(
          "Item Delete Error:",
          error
        );

        alert(
          error.message ||
            "Unable to delete the item."
        );
      }
    };

  const openStockModal = (
    item,
    type
  ) => {
    if (
      item.itemType ===
        "Service" ||
      item.stockManaged ===
        false
    ) {
      alert(
        "Service items do not have warehouse stock."
      );

      return;
    }

    const warehouse =
      getWarehouseByItemType(
        item.itemType
      );

    setSelectedStockItem(item);

    setStockForm({
      ...getDefaultStockForm(
        item.itemType
      ),

      item: item._id,
      type,
      warehouse,

      rate: String(
        item.purchasePrice || 0
      ),

      remarks:
        type === "IN"
          ? "Authorised manual stock-in correction"
          : "Authorised manual stock-out correction",
    });

    setStockModalOpen(true);
  };

  const closeStockModal = () => {
    setStockModalOpen(false);
    setSelectedStockItem(null);

    setStockForm(
      getDefaultStockForm()
    );
  };

  const validateStockAdjustment =
    () => {
      if (
        !stockForm.item ||
        !selectedStockItem
      ) {
        alert(
          "Please select an item."
        );

        return false;
      }

      if (
        ![
          "IN",
          "OUT",
        ].includes(
          stockForm.type
        )
      ) {
        alert(
          "Please select Stock In or Stock Out."
        );

        return false;
      }

      if (
        numberValue(
          stockForm.quantity
        ) <= 0
      ) {
        alert(
          "Quantity must be greater than zero."
        );

        return false;
      }

      const expectedWarehouse =
        getWarehouseByItemType(
          selectedStockItem.itemType
        );

      if (
        !expectedWarehouse ||
        stockForm.warehouse !==
          expectedWarehouse
      ) {
        alert(
          "The selected warehouse does not match the item type."
        );

        return false;
      }

      if (
        stockForm.type ===
          "OUT" &&
        numberValue(
          stockForm.quantity
        ) >
          numberValue(
            selectedStockItem.currentStock
          )
      ) {
        alert(
          `Insufficient stock. Available quantity is ${formatQuantity(
            selectedStockItem.currentStock
          )} ${
            selectedStockItem.unit
          }.`
        );

        return false;
      }

      if (
        String(
          stockForm.remarks ||
            ""
        ).trim().length < 3
      ) {
        alert(
          "Please enter a reason for the manual adjustment."
        );

        return false;
      }

      return true;
    };

  const handleStockAdjustment =
    async () => {
      if (
        !validateStockAdjustment()
      ) {
        return;
      }

      try {
        setStockSaving(true);

        await apiRequest(
          `${API_STOCK}/manual`,
          {
            method: "POST",

            body:
              JSON.stringify({
                item:
                  stockForm.item,

                type:
                  stockForm.type,

                quantity:
                  numberValue(
                    stockForm.quantity
                  ),

                warehouse:
                  stockForm.warehouse,

                rate:
                  numberValue(
                    stockForm.rate
                  ),

                date:
                  stockForm.date ||
                  todayDate(),

                remarks:
                  String(
                    stockForm.remarks ||
                      ""
                  ).trim(),
              }),
          }
        );

        await fetchItems();

        closeStockModal();
      } catch (error) {
        console.error(
          "Stock Adjustment Error:",
          error
        );

        alert(
          error.message ||
            "Unable to complete the stock adjustment."
        );
      } finally {
        setStockSaving(false);
      }
    };

  const getStockClass = (
    item
  ) => {
    if (
      item.itemType ===
        "Service" ||
      item.stockManaged ===
        false
    ) {
      return "text-slate-400";
    }

    if (
      numberValue(
        item.minStock
      ) > 0 &&
      numberValue(
        item.currentStock
      ) <=
        numberValue(
          item.minStock
        )
    ) {
      return "text-red-600";
    }

    return "text-emerald-600";
  };

  return (
    <div className="w-full mx-auto p-2 sm:p-4 md:p-6 space-y-6">
      {stockModalOpen &&
        selectedStockItem && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
              <div
                className={`p-4 text-white flex items-center justify-between ${
                  stockForm.type ===
                  "IN"
                    ? "bg-emerald-600"
                    : "bg-red-600"
                }`}
              >
                <div>
                  <h2 className="font-bold text-lg">
                    {stockForm.type ===
                    "IN"
                      ? "Add Stock"
                      : "Remove Stock"}
                  </h2>

                  <p className="text-xs opacity-90">
                    {
                      selectedStockItem.code
                    }{" "}
                    —{" "}
                    {
                      selectedStockItem.name
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    closeStockModal
                  }
                  className="p-2 hover:bg-white/10 rounded-lg"
                  aria-label="Close stock adjustment"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">
                      Current Stock
                    </p>

                    <b
                      className={getStockClass(
                        selectedStockItem
                      )}
                    >
                      {formatQuantity(
                        selectedStockItem.currentStock
                      )}{" "}
                      {
                        selectedStockItem.unit
                      }
                    </b>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Item Type
                    </p>

                    <b>
                      {
                        selectedStockItem.itemType
                      }
                    </b>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">
                      Warehouse
                    </p>

                    <b>
                      {getWarehouseDisplayName(
                        stockForm.warehouse
                      )}
                    </b>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600">
                      Movement
                    </label>

                    <select
                      value={
                        stockForm.type
                      }
                      onChange={(
                        event
                      ) =>
                        setStockForm(
                          (
                            current
                          ) => ({
                            ...current,

                            type:
                              event
                                .target
                                .value,

                            remarks:
                              event
                                .target
                                .value ===
                              "IN"
                                ? "Authorised manual stock-in correction"
                                : "Authorised manual stock-out correction",
                          })
                        )
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                    >
                      <option value="IN">
                        Stock In
                      </option>

                      <option value="OUT">
                        Stock Out
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600">
                      Date
                    </label>

                    <input
                      type="date"
                      value={
                        stockForm.date
                      }
                      onChange={(
                        event
                      ) =>
                        setStockForm(
                          (
                            current
                          ) => ({
                            ...current,

                            date:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-600">
                      Quantity{" "}
                      <span className="text-red-600">
                        *
                      </span>
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={
                        stockForm.quantity
                      }
                      onChange={(
                        event
                      ) =>
                        setStockForm(
                          (
                            current
                          ) => ({
                            ...current,

                            quantity:
                              event
                                .target
                                .value,
                          })
                        )
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
                      value={
                        stockForm.rate
                      }
                      onChange={(
                        event
                      ) =>
                        setStockForm(
                          (
                            current
                          ) => ({
                            ...current,

                            rate:
                              event
                                .target
                                .value,
                          })
                        )
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
                      value={getWarehouseDisplayName(
                        stockForm.warehouse
                      )}
                      readOnly
                      className="w-full border rounded-lg px-3 py-2 mt-1 text-sm bg-slate-100"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-xs font-bold text-slate-600">
                      Adjustment
                      Reason{" "}
                      <span className="text-red-600">
                        *
                      </span>
                    </label>

                    <textarea
                      value={
                        stockForm.remarks
                      }
                      onChange={(
                        event
                      ) =>
                        setStockForm(
                          (
                            current
                          ) => ({
                            ...current,

                            remarks:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      className="w-full border rounded-lg px-3 py-2 mt-1 text-sm min-h-[90px]"
                      placeholder="Enter the reason for this manual correction..."
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 border-t bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={
                    closeStockModal
                  }
                  className="px-5 py-2 rounded-lg border bg-white text-sm font-semibold"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={
                    handleStockAdjustment
                  }
                  disabled={
                    stockSaving
                  }
                  className={`px-5 py-2 rounded-lg text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60 ${
                    stockForm.type ===
                    "IN"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-red-600 hover:bg-red-700"
                  }`}
                >
                  {stockSaving ? (
                    <Loader2
                      size={16}
                      className="animate-spin"
                    />
                  ) : stockForm.type ===
                    "IN" ? (
                    <TrendingUp
                      size={16}
                    />
                  ) : (
                    <TrendingDown
                      size={16}
                    />
                  )}

                  {stockSaving
                    ? "Saving..."
                    : stockForm.type ===
                      "IN"
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
            onClick={() =>
              window.history.back()
            }
            className="p-1 hover:bg-blue-700 rounded-lg flex-shrink-0"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold">
              Inventory Item Master
            </h1>

            <p className="text-blue-100 text-xs">
              Classify raw materials,
              finished goods,
              consumables, and services.
            </p>
          </div>
        </div>

        {!isFormOpen && (
          <button
            type="button"
            onClick={openNewForm}
            className="bg-white text-blue-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-100 flex items-center justify-center gap-2"
          >
            <Plus size={16} />

            Create New Item
          </button>
        )}
      </div>

      {!isFormOpen ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard
              label="Total Items"
              value={
                stats.totalItems
              }
            />

            <StatCard
              label="Raw / Input Items"
              value={
                stats.rawItems
              }
            />

            <StatCard
              label="Finished Goods"
              value={
                stats.finishedGoods
              }
            />

            <StatCard
              label="Current Stock"
              value={formatQuantity(
                stats.totalStock
              )}
            />

            <StatCard
              label="Low Stock Items"
              value={
                stats.lowStock
              }
              danger
            />
          </div>

          <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
              <div>
                <h3 className="font-bold text-[#1e40af] flex items-center gap-2">
                  <Package size={18} />

                  Items Directory
                </h3>

                <p className="text-xs text-slate-500">
                  Warehouse and
                  production behaviour is
                  controlled by Item Type.
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
                    placeholder="Search name, code, type, or warehouse..."
                    value={
                      searchTerm
                    }
                    onChange={(
                      event
                    ) =>
                      setSearchTerm(
                        event.target
                          .value
                      )
                    }
                    className="pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs w-full sm:w-72"
                  />
                </div>

                <select
                  value={typeFilter}
                  onChange={(
                    event
                  ) =>
                    setTypeFilter(
                      event.target
                        .value
                    )
                  }
                  className="border border-slate-300 rounded-lg px-3 py-2 text-xs"
                >
                  <option value="All">
                    All Item Types
                  </option>

                  {ITEM_TYPES.map(
                    (itemType) => (
                      <option
                        key={
                          itemType
                        }
                        value={
                          itemType
                        }
                      >
                        {itemType}
                      </option>
                    )
                  )}
                </select>

                <select
                  value={
                    statusFilter
                  }
                  onChange={(
                    event
                  ) =>
                    setStatusFilter(
                      event.target
                        .value
                    )
                  }
                  className="border border-slate-300 rounded-lg px-3 py-2 text-xs"
                >
                  <option value="All">
                    All Statuses
                  </option>

                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>
                </select>

                <button
                  type="button"
                  onClick={
                    fetchItems
                  }
                  disabled={loading}
                  className="border rounded-lg px-3 py-2 text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-50 disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2
                      size={14}
                      className="animate-spin"
                    />
                  ) : (
                    <RefreshCcw
                      size={14}
                    />
                  )}

                  Refresh
                </button>
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table
                className="w-full text-left text-xs border-collapse"
                style={{
                  minWidth:
                    "1240px",
                }}
              >
                <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200">
                  <tr>
                    <th className="p-4">
                      Item
                    </th>

                    <th className="p-4">
                      Item Type
                    </th>

                    <th className="p-4">
                      Category / Brand
                    </th>

                    <th className="p-4">
                      Warehouse
                    </th>

                    <th className="p-4 text-center">
                      Unit
                    </th>

                    <th className="p-4 text-right">
                      Stock In
                    </th>

                    <th className="p-4 text-right">
                      Stock Out
                    </th>

                    <th className="p-4 text-right">
                      Current
                    </th>

                    <th className="p-4 text-right">
                      Minimum
                    </th>

                    <th className="p-4 text-center">
                      Status
                    </th>

                    <th className="p-4 text-center">
                      Actions
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan="11"
                        className="p-10 text-center"
                      >
                        <Loader2 className="animate-spin mx-auto text-blue-600" />
                      </td>
                    </tr>
                  ) : filteredItems.length ===
                    0 ? (
                    <tr>
                      <td
                        colSpan="11"
                        className="p-10 text-center text-slate-400"
                      >
                        No items found.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map(
                      (item) => {
                        const serviceItem =
                          item.itemType ===
                            "Service" ||
                          item.stockManaged ===
                            false;

                        const lowStock =
                          !serviceItem &&
                          item.status ===
                            "Active" &&
                          numberValue(
                            item.minStock
                          ) > 0 &&
                          numberValue(
                            item.currentStock
                          ) <=
                            numberValue(
                              item.minStock
                            );

                        const warehouse =
                          getWarehouseByItemType(
                            item.itemType
                          );

                        return (
                          <tr
                            key={
                              item._id
                            }
                            className="border-b hover:bg-slate-50"
                          >
                            <td className="p-4">
                              <div className="font-semibold text-slate-900 flex items-center gap-2">
                                {
                                  item.name
                                }

                                {lowStock && (
                                  <AlertTriangle
                                    size={
                                      14
                                    }
                                    className="text-red-500"
                                  />
                                )}
                              </div>

                              <div className="text-[10px] text-blue-600 font-mono mt-1">
                                {
                                  item.code
                                }
                              </div>

                              <div className="text-[10px] text-slate-500 mt-1">
                                Purchase:{" "}
                                {money(
                                  item.purchasePrice
                                )}{" "}
                                · Sale:{" "}
                                {money(
                                  item.salePrice
                                )}
                              </div>
                            </td>

                            <td className="p-4">
                              <span
                                className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold ${itemTypeBadgeClass(
                                  item.itemType
                                )}`}
                              >
                                {item.itemType ||
                                  "Raw Material"}
                              </span>
                            </td>

                            <td className="p-4">
                              <div>
                                {item.category ||
                                  "-"}
                              </div>

                              <div className="text-[10px] text-slate-500 mt-1">
                                {item.brand ||
                                  "-"}
                              </div>
                            </td>

                            <td className="p-4">
                              <span
                                className={`inline-flex px-2 py-1 rounded-full text-[10px] font-semibold ${warehouseBadgeClass(
                                  item.itemType
                                )}`}
                              >
                                {getWarehouseDisplayName(
                                  warehouse
                                )}
                              </span>
                            </td>

                            <td className="p-4 text-center">
                              {item.unit ||
                                "Pcs"}
                            </td>

                            <td className="p-4 text-right text-emerald-700 font-bold">
                              {serviceItem
                                ? "—"
                                : formatQuantity(
                                    item.qtyIn
                                  )}
                            </td>

                            <td className="p-4 text-right text-red-700 font-bold">
                              {serviceItem
                                ? "—"
                                : formatQuantity(
                                    item.qtyOut
                                  )}
                            </td>

                            <td
                              className={`p-4 text-right font-bold ${getStockClass(
                                item
                              )}`}
                            >
                              {serviceItem
                                ? "Not Tracked"
                                : formatQuantity(
                                    item.currentStock
                                  )}
                            </td>

                            <td className="p-4 text-right">
                              {serviceItem
                                ? "—"
                                : formatQuantity(
                                    item.minStock
                                  )}
                            </td>

                            <td className="p-4 text-center">
                              <span
                                className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                                  item.status ===
                                  "Inactive"
                                    ? "bg-red-50 text-red-600"
                                    : "bg-green-50 text-green-700"
                                }`}
                              >
                                {
                                  item.status
                                }
                              </span>
                            </td>

                            <td className="p-4">
                              <div className="flex justify-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    openStockModal(
                                      item,
                                      "IN"
                                    )
                                  }
                                  disabled={
                                    serviceItem
                                  }
                                  className="p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-35 disabled:cursor-not-allowed"
                                  title={
                                    serviceItem
                                      ? "Service stock is not tracked"
                                      : "Add Stock"
                                  }
                                >
                                  <TrendingUp
                                    size={
                                      15
                                    }
                                  />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openStockModal(
                                      item,
                                      "OUT"
                                    )
                                  }
                                  disabled={
                                    serviceItem ||
                                    numberValue(
                                      item.currentStock
                                    ) <=
                                      0
                                  }
                                  className="p-2 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-35 disabled:cursor-not-allowed"
                                  title={
                                    serviceItem
                                      ? "Service stock is not tracked"
                                      : "Remove Stock"
                                  }
                                >
                                  <TrendingDown
                                    size={
                                      15
                                    }
                                  />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    openEdit(
                                      item
                                    )
                                  }
                                  className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                                  title="Edit"
                                >
                                  <Edit3
                                    size={
                                      15
                                    }
                                  />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    deleteItem(
                                      item
                                    )
                                  }
                                  className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200"
                                  title="Delete"
                                >
                                  <Trash2
                                    size={
                                      15
                                    }
                                  />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-blue-50 border-t text-xs text-blue-800 flex items-start gap-2">
              <ClipboardList
                size={16}
                className="mt-0.5 flex-shrink-0"
              />

              <div className="space-y-1">
                <div>
                  <b>
                    Raw Material Flow:
                  </b>{" "}
                  Item Master →
                  Purchase Order → GRN →
                  Raw Material Warehouse
                  → Production Issue →
                  Printing.
                </div>

                <div>
                  <b>
                    Finished Goods
                    Flow:
                  </b>{" "}
                  Finished Good Item
                  Master → Production
                  Output → Finished
                  Goods Warehouse →
                  Delivery Challan →
                  Invoice.
                </div>

                <div className="text-red-700">
                  Manual stock
                  adjustments should be
                  used only for
                  authorised corrections.
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-b-xl border border-slate-200 shadow-sm p-5 sm:p-8">
          <form
            className="space-y-8"
            onSubmit={
              handleSubmit
            }
          >
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <button
                  type="button"
                  onClick={closeForm}
                  className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 mb-2"
                >
                  <ArrowLeft
                    size={16}
                  />

                  Back to Items
                </button>

                <h2 className="text-xl font-bold text-slate-900">
                  {editId
                    ? "Edit Item"
                    : "Create New Item"}
                </h2>

                <p className="text-xs text-slate-500">
                  Item Type determines
                  its warehouse,
                  production role, and
                  stock behaviour.
                </p>
              </div>

              <button
                type="button"
                onClick={closeForm}
                className="p-2 rounded-lg border hover:bg-slate-50"
                aria-label="Close item form"
              >
                <X size={18} />
              </button>
            </div>

            <FormSection
              icon={
                <Package
                  size={16}
                />
              }
              title="1. Base Information"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField
                  label="Item Name"
                  required
                >
                  <input
                    value={
                      formData.name
                    }
                    onChange={(
                      event
                    ) =>
                      setFormData(
                        (
                          current
                        ) => ({
                          ...current,

                          name:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    className="w-full border rounded-lg p-3 text-xs mt-1"
                    placeholder="Item name"
                    required
                  />
                </FormField>

                <FormField
                  label="Item Code / SKU"
                  required
                >
                  <input
                    value={
                      formData.code
                    }
                    onChange={(
                      event
                    ) =>
                      setFormData(
                        (
                          current
                        ) => ({
                          ...current,

                          code:
                            event
                              .target
                              .value
                              .toUpperCase(),
                        })
                      )
                    }
                    className="w-full border rounded-lg p-3 text-xs mt-1 font-mono"
                    placeholder="ITM-0001"
                    required
                  />
                </FormField>

                <FormField
                  label="Item Type"
                  required
                >
                  <select
                    value={
                      formData.itemType
                    }
                    onChange={(
                      event
                    ) =>
                      handleItemTypeChange(
                        event.target
                          .value
                      )
                    }
                    disabled={
                      itemTypeLocked
                    }
                    className={`w-full border rounded-lg p-3 text-xs mt-1 ${
                      itemTypeLocked
                        ? "bg-slate-100 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {ITEM_TYPES.map(
                      (itemType) => (
                        <option
                          key={
                            itemType
                          }
                          value={
                            itemType
                          }
                        >
                          {itemType}
                        </option>
                      )
                    )}
                  </select>

                  {itemTypeLocked && (
                    <p className="text-[10px] text-amber-700 mt-1">
                      Item Type is
                      locked because stock
                      history already
                      exists.
                    </p>
                  )}
                </FormField>
              </div>

              <div className="mt-4 rounded-xl border bg-slate-50 p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="flex items-start gap-2">
                  <Warehouse
                    size={16}
                    className="text-blue-700 mt-0.5"
                  />

                  <div>
                    <b>
                      Assigned Warehouse
                    </b>

                    <p className="text-slate-600 mt-1">
                      {getWarehouseDisplayName(
                        getWarehouseByItemType(
                          formData.itemType
                        )
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Layers
                    size={16}
                    className="text-blue-700 mt-0.5"
                  />

                  <div>
                    <b>
                      System Behaviour
                    </b>

                    <p className="text-slate-600 mt-1">
                      {formData.itemType ===
                      "Finished Good"
                        ? "Produced through printing and received through Production Output."
                        : formData.itemType ===
                          "Service"
                        ? "No warehouse stock or stock ledger movements."
                        : "Received through purchasing/GRN and issued to production."}
                    </p>
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection
              icon={
                <Layers
                  size={16}
                />
              }
              title="2. Classification and Branding"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField label="Category">
                  <input
                    value={
                      formData.category
                    }
                    onChange={(
                      event
                    ) =>
                      setFormData(
                        (
                          current
                        ) => ({
                          ...current,

                          category:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    className="w-full border rounded-lg p-3 text-xs mt-1"
                    placeholder="General"
                  />
                </FormField>

                <FormField label="Brand">
                  <input
                    value={
                      formData.brand
                    }
                    onChange={(
                      event
                    ) =>
                      setFormData(
                        (
                          current
                        ) => ({
                          ...current,

                          brand:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    className="w-full border rounded-lg p-3 text-xs mt-1"
                    placeholder="Brand name"
                  />
                </FormField>

                <FormField label="Unit">
                  <select
                    value={
                      formData.unit
                    }
                    onChange={(
                      event
                    ) =>
                      setFormData(
                        (
                          current
                        ) => ({
                          ...current,

                          unit:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    className="w-full border rounded-lg p-3 text-xs mt-1"
                  >
                    <option value="Pcs">
                      Pcs
                    </option>

                    <option value="Sheets">
                      Sheets
                    </option>

                    <option value="Kg">
                      Kg
                    </option>

                    <option value="Rolls">
                      Rolls
                    </option>

                    <option value="Mtr">
                      Mtr
                    </option>

                    <option value="Cartons">
                      Cartons
                    </option>

                    <option value="Box">
                      Box
                    </option>

                    <option value="Labels">
                      Labels
                    </option>

                    <option value="Sets">
                      Sets
                    </option>

                    <option value="Job">
                      Job
                    </option>
                  </select>
                </FormField>
              </div>
            </FormSection>

            <FormSection
              icon={
                <Tag size={16} />
              }
              title="3. Price and Stock Settings"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <FormField label="Purchase / Cost Price">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={
                      formData.purchasePrice
                    }
                    onChange={(
                      event
                    ) =>
                      setFormData(
                        (
                          current
                        ) => ({
                          ...current,

                          purchasePrice:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    disabled={
                      formData.itemType ===
                      "Service"
                    }
                    className={`w-full border rounded-lg p-3 text-xs mt-1 ${
                      formData.itemType ===
                      "Service"
                        ? "bg-slate-100 cursor-not-allowed"
                        : ""
                    }`}
                    placeholder="0"
                  />
                </FormField>

                <FormField label="Sale Price">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={
                      formData.salePrice
                    }
                    onChange={(
                      event
                    ) =>
                      setFormData(
                        (
                          current
                        ) => ({
                          ...current,

                          salePrice:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    className="w-full border rounded-lg p-3 text-xs mt-1"
                    placeholder="0"
                  />
                </FormField>

                <FormField label="Opening Stock">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={
                      formData.openingStock
                    }
                    onChange={(
                      event
                    ) =>
                      setFormData(
                        (
                          current
                        ) => ({
                          ...current,

                          openingStock:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    disabled={
                      Boolean(editId) ||
                      formData.itemType ===
                        "Service"
                    }
                    className={`w-full border rounded-lg p-3 text-xs mt-1 ${
                      editId ||
                      formData.itemType ===
                        "Service"
                        ? "bg-slate-100 cursor-not-allowed"
                        : ""
                    }`}
                    placeholder="0"
                  />

                  {formData.itemType ===
                    "Finished Good" &&
                    !editId && (
                      <p className="text-[10px] text-purple-700 mt-1">
                        Keep this at 0
                        for goods that
                        will be created
                        through
                        production.
                      </p>
                    )}
                </FormField>

                <FormField label="Minimum Stock">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={
                      formData.minStock
                    }
                    onChange={(
                      event
                    ) =>
                      setFormData(
                        (
                          current
                        ) => ({
                          ...current,

                          minStock:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    disabled={
                      formData.itemType ===
                      "Service"
                    }
                    className={`w-full border rounded-lg p-3 text-xs mt-1 ${
                      formData.itemType ===
                      "Service"
                        ? "bg-slate-100 cursor-not-allowed"
                        : ""
                    }`}
                    placeholder="5"
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection
              icon={
                <Tag size={16} />
              }
              title="4. Status and Notes"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FormField label="Status">
                  <select
                    value={
                      formData.status
                    }
                    onChange={(
                      event
                    ) =>
                      setFormData(
                        (
                          current
                        ) => ({
                          ...current,

                          status:
                            event
                              .target
                              .value,
                        })
                      )
                    }
                    className="w-full border rounded-lg p-3 text-xs mt-1"
                  >
                    <option value="Active">
                      Active
                    </option>

                    <option value="Inactive">
                      Inactive
                    </option>
                  </select>
                </FormField>

                <div className="md:col-span-2">
                  <FormField label="Notes">
                    <input
                      value={
                        formData.notes
                      }
                      onChange={(
                        event
                      ) =>
                        setFormData(
                          (
                            current
                          ) => ({
                            ...current,

                            notes:
                              event
                                .target
                                .value,
                          })
                        )
                      }
                      className="w-full border rounded-lg p-3 text-xs mt-1"
                      placeholder="Optional notes"
                    />
                  </FormField>
                </div>
              </div>
            </FormSection>

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
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                ) : (
                  <Save size={16} />
                )}

                {saving
                  ? "Saving..."
                  : editId
                  ? "Update Item"
                  : "Create Item"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

const StatCard = ({
  label,
  value,
  danger = false,
}) => (
  <div className="bg-white border rounded-xl p-4">
    <p className="text-xs text-slate-500">
      {label}
    </p>

    <h3
      className={`text-2xl font-bold ${
        danger
          ? "text-red-600"
          : "text-slate-900"
      }`}
    >
      {value}
    </h3>
  </div>
);

const FormSection = ({
  icon,
  title,
  children,
}) => (
  <section className="space-y-4">
    <h3 className="text-sm font-bold text-blue-800 border-b pb-2 flex items-center gap-2">
      {icon}
      {title}
    </h3>

    {children}
  </section>
);

const FormField = ({
  label,
  required = false,
  children,
}) => (
  <div>
    <label className="text-xs font-bold text-slate-600">
      {label}

      {required && (
        <span className="text-red-600">
          {" "}
          *
        </span>
      )}
    </label>

    {children}
  </div>
);

export default ItemsManager;