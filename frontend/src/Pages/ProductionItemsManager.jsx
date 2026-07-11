import React, { useState, useEffect } from "react";
import {
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { API_BASE_URL } from "../config/api";

const ProductionItemsManager = () => {
  const [items, setItems] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  // Production Industry Level Fields
  const defaultFormData = {
    code: "",
    name: "",
    customerName: "",
    customerPO: "",

    quantity: "",
    unit: "Boxes",

    paperType: "",
    gsm: "",

    sheetSize: "",
    finishedSize: "",

    totalSheets: "",
    noOfColors: "",
    dieNo: "",

    deliveryDate: "",
    priority: "Normal",

    remarks: "",

    // Production Checklist Status
    requirePrinting: true,
    requireLamination: false,
    requireDieCutting: false,
    requirePasting: false,

    status: "Active",
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [searchQuery, setSearchQuery] = useState("");

  const API_URL = `${API_BASE_URL}/production-items`;

  const normalizeItems = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.productionItems)) return data.productionItems;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  };

  const generateNextJobCode = (existingItems = []) => {
    const jobNumbers = existingItems
      .map((item) => item?.code)
      .filter(Boolean)
      .map((code) => {
        const match = String(code).match(/^JOB-(\d+)$/i);
        return match ? Number(match[1]) : 0;
      })
      .filter((num) => Number.isFinite(num) && num > 0);

    const maxNumber = jobNumbers.length > 0 ? Math.max(...jobNumbers) : 0;
    let nextNumber = maxNumber + 1;
    let nextCode = `JOB-${nextNumber}`;

    const usedCodes = new Set(
      existingItems
        .map((item) => item?.code)
        .filter(Boolean)
        .map((code) => String(code).toUpperCase())
    );

    while (usedCodes.has(nextCode.toUpperCase())) {
      nextNumber += 1;
      nextCode = `JOB-${nextNumber}`;
    }

    return nextCode;
  };

  const fetchItems = async () => {
    try {
      const response = await fetch(`${API_URL}/all`);
      const data = await response.json();

      const normalizedData = normalizeItems(data);
      setItems(normalizedData);

      return normalizedData;
    } catch (error) {
      console.error("Fetch Error:", error);
      setItems([]);
      return [];
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const openForm = async (item = null) => {
    if (item) {
      setEditId(item._id);
      setFormData({
        ...defaultFormData,
        ...item,
      });
    } else {
      setEditId(null);

      const latestItems = await fetchItems();
      const nextJobCode = generateNextJobCode(latestItems);

      setFormData({
        ...defaultFormData,
        code: nextJobCode,
      });
    }

    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditId(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const method = editId ? "PUT" : "POST";

    const url = editId
      ? `${API_URL}/update/${editId}`
      : `${API_URL}/add`;

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (response.ok) {
        await fetchItems();
        closeForm();
      } else {
        alert(
          "Error: " +
            (result.error ||
              result.message ||
              "Something went wrong. Please try again.")
        );

        console.error("Backend Error:", result);
      }
    } catch (error) {
      console.error("Network Error:", error);

      alert(
        "Unable to connect to the server. Please check if the backend is running."
      );
    }
  };

  const deleteItem = async (id) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        const response = await fetch(`${API_URL}/delete/${id}`, {
          method: "DELETE",
        });

        if (response.ok) fetchItems();
      } catch (error) {
        console.error("Delete Error:", error);
      }
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8">
      {/* LIST VIEW */}
      {!isFormOpen && (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white">
            <div>
              <h2 className="text-xl font-bold text-slate-800">
                Production Items (Job Cards)
              </h2>

              <p className="text-sm text-slate-500 mt-0.5">
                Manage production items and job cards
              </p>
            </div>

            <button
              onClick={() => openForm()}
              className="flex items-center bg-blue-700 gap-2 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg shadow-sm font-semibold text-sm transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Add New Job / Item
            </button>
          </div>

          {/* Search */}
          <div className="p-4 bg-slate-50/50 border-b border-slate-100 flex justify-end">
            <div className="relative w-full sm:w-64">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />

              <input
                type="text"
                placeholder="Search job or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-cyan-500 shadow-sm"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="p-4 text-xs font-bold uppercase w-16 text-center">
                    #
                  </th>

                  <th className="p-4 text-xs font-bold uppercase border-l border-slate-700">
                    Job Code
                  </th>

                  <th className="p-4 text-xs font-bold uppercase border-l border-slate-700">
                    Item Name
                  </th>

                  <th className="p-4 text-xs font-bold uppercase border-l border-slate-700">
                    Customer
                  </th>

                  <th className="p-4 text-xs font-bold uppercase border-l border-slate-700">
                    Qty
                  </th>

                  <th className="p-4 text-xs font-bold uppercase border-l border-slate-700">
                    Specs
                  </th>

                  <th className="p-4 text-xs font-bold uppercase border-l border-slate-700 text-center">
                    Process Flow
                  </th>

                  <th className="p-4 text-xs font-bold uppercase border-l border-slate-700 text-center">
                    Status
                  </th>

                  <th className="p-4 text-xs font-bold uppercase border-l border-slate-700 text-center">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item, index) => (
                  <tr
                    key={item._id || item.id || index}
                    className="hover:bg-cyan-50/30 transition-colors"
                  >
                    <td className="p-4 text-sm text-center">{index + 1}</td>

                    <td className="p-4 text-sm font-semibold text-slate-700">
                      {item.code}
                    </td>

                    <td className="p-4 text-sm font-bold text-slate-800">
                      {item.name}
                    </td>

                    <td className="p-4 text-sm text-slate-600">
                      {item.customerName}
                    </td>

                    <td className="p-4 text-sm text-slate-700 font-semibold">
                      {Number(item.quantity || 0).toLocaleString()} {item.unit}
                    </td>

                    <td className="p-4 text-sm text-slate-500">
                      <div className="flex flex-col gap-1">
                        <div>
                          <span className="bg-slate-100 px-2 py-1 rounded text-xs">
                            {item.paperType}
                          </span>

                          <span className="ml-1 font-medium">
                            {item.gsm} GSM
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400">
                          Open: {item.sheetSize}
                        </div>

                        <div className="text-[11px] text-slate-400">
                          Finish: {item.finishedSize}
                        </div>
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-1 text-[10px] font-bold text-white">
                        {item.requirePrinting && (
                          <span className="bg-purple-600 px-1.5 py-0.5 rounded">
                            PR
                          </span>
                        )}

                        {item.requireLamination && (
                          <span className="bg-blue-600 px-1.5 py-0.5 rounded">
                            LM
                          </span>
                        )}

                        {item.requireDieCutting && (
                          <span className="bg-orange-600 px-1.5 py-0.5 rounded">
                            DC
                          </span>
                        )}

                        {item.requirePasting && (
                          <span className="bg-green-600 px-1.5 py-0.5 rounded">
                            PS
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-center">
                      <span
                        className={`px-3 py-1 text-[10px] font-black rounded-full uppercase ${
                          item.status === "Active"
                            ? "bg-green-100 text-green-700 border border-green-200"
                            : "bg-red-100 text-red-700 border border-red-200"
                        }`}
                      >
                        {item.status}
                      </span>

                      <div className="mt-1">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.priority === "Urgent"
                              ? "bg-red-100 text-red-700"
                              : item.priority === "High"
                              ? "bg-orange-100 text-orange-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {item.priority}
                        </span>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => openForm(item)}
                          className="p-2 text-cyan-600 hover:bg-cyan-100 rounded-lg"
                        >
                          <PencilSquareIcon className="w-5 h-5" />
                        </button>

                        <button
                          onClick={() => deleteItem(item._id || item.id)}
                          className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredItems.length === 0 && (
                  <tr>
                    <td
                      colSpan="9"
                      className="p-8 text-center text-slate-400 italic"
                    >
                      No items found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* FORM VIEW */}
      {isFormOpen && (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden min-h-[70vh]">
          {/* Form Header */}
          <div className="flex bg-blue-700 justify-between items-center p-5">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={closeForm}
                className="p-1.5 hover:bg-blue-800 rounded-lg text-white transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
              </button>

              <h3 className="text-lg font-bold text-white">
                {editId
                  ? `Update Job Card (${formData.code})`
                  : "Create New Job Card (Item)"}
              </h3>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="text-sm font-semibold bg-blue-800 text-white px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors"
            >
              Back to List
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-8">
            {/* Section 1 */}
            <div>
              <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-4 border-b pb-2">
                1. Basic Information
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Job Code
                  </label>

                  <input
                    type="text"
                    value={formData.code}
                    readOnly
                    className="w-full p-2.5 bg-slate-100 border border-slate-200 rounded-lg outline-none font-mono text-slate-600"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Item / Job Name
                  </label>

                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        name: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 focus:bg-white"
                    placeholder="e.g. Medicine Box 10ml"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Customer Name
                  </label>

                  <input
                    type="text"
                    value={formData.customerName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customerName: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 focus:bg-white"
                    placeholder="e.g. Ali Pharma"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Customer PO
                  </label>

                  <input
                    type="text"
                    value={formData.customerPO}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customerPO: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 focus:bg-white"
                    placeholder="e.g. PO-2026-001"
                  />
                </div>
              </div>
            </div>

            {/* Section 2 */}
            <div>
              <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-4 border-b pb-2">
                2. Paper & Size Specifications
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Paper Type
                  </label>

                  <select
                    value={formData.paperType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        paperType: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 focus:bg-white"
                    required
                  >
                    <option value="">Select Paper</option>
                    <option value="Bleach Card">Bleach Card</option>
                    <option value="Art Card">Art Card</option>
                    <option value="Duplex Board">Duplex Board</option>
                    <option value="Kraft Paper">Kraft Paper</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Grammage (GSM)
                  </label>

                  <input
                    type="number"
                    value={formData.gsm}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gsm: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 focus:bg-white"
                    placeholder="e.g. 300"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Sheet Size (Open)
                  </label>

                  <input
                    type="text"
                    value={formData.sheetSize}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sheetSize: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 focus:bg-white"
                    placeholder="e.g. 18 x 23"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Finished Size
                  </label>

                  <input
                    type="text"
                    value={formData.finishedSize}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        finishedSize: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 focus:bg-white"
                    placeholder="e.g. 4 x 6"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Order Qty
                  </label>

                  <input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        quantity: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 focus:bg-white"
                    placeholder="e.g. 10000"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
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
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 focus:bg-white"
                  >
                    <option value="Boxes">Boxes</option>
                    <option value="Cartons">Cartons</option>
                    <option value="Labels">Labels</option>
                    <option value="Pieces">Pieces</option>
                    <option value="Sheets">Sheets</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div>
              <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-4 border-b pb-2">
                3. Printing & Machine Specs
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    No. of Colors
                  </label>

                  <input
                    type="text"
                    value={formData.noOfColors}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        noOfColors: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 focus:bg-white"
                    placeholder="e.g. 4 Colors (CMYK)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Die / Plate Number
                  </label>

                  <input
                    type="text"
                    value={formData.dieNo}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dieNo: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 focus:bg-white"
                    placeholder="e.g. D-885"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Allocated Sheets
                  </label>

                  <input
                    type="number"
                    value={formData.totalSheets}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        totalSheets: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 focus:bg-white"
                    placeholder="e.g. 2600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Delivery Date
                  </label>

                  <input
                    type="date"
                    value={formData.deliveryDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        deliveryDate: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Priority
                  </label>

                  <select
                    value={formData.priority}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        priority: e.target.value,
                      })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 focus:bg-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 4 */}
            <div>
              <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-4 border-b pb-2">
                4. Remarks / Special Instructions
              </h4>

              <textarea
                rows="4"
                value={formData.remarks}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    remarks: e.target.value,
                  })
                }
                placeholder="Write any special production instructions here..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-cyan-500 focus:bg-white"
              />
            </div>

            {/* Section 5 */}
            <div>
              <h4 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-2 border-b pb-2">
                5. Required Production Steps
              </h4>

              <p className="text-[11px] text-slate-400 mb-4">
                Enable the required production processes for this job to route
                the workflow correctly.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.requirePrinting}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requirePrinting: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />

                  <span className="text-xs font-semibold text-slate-700">
                    Printing
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.requireLamination}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requireLamination: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />

                  <span className="text-xs font-semibold text-slate-700">
                    Lamination
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.requireDieCutting}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requireDieCutting: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />

                  <span className="text-xs font-semibold text-slate-700">
                    Die Cutting
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formData.requirePasting}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        requirePasting: e.target.checked,
                      })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />

                  <span className="text-xs font-semibold text-slate-700">
                    Pasting
                  </span>
                </label>

                <div>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        status: e.target.value,
                      })
                    }
                    className="w-full p-1.5 bg-white border border-slate-300 text-xs rounded font-bold outline-none focus:border-cyan-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 border-t pt-6 justify-end">
              <button
                type="button"
                onClick={closeForm}
                className="px-6 py-2.5 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                className="px-8 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-bold transition-colors shadow-sm"
              >
                Save Job Card
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProductionItemsManager;