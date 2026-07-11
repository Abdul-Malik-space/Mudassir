import React, { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Clock,
  Trash2,
  ArrowLeft,
  PencilLine,
  Printer,
  Search,
  RefreshCcw,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const defaultFormData = {
  jobCardId: "",
  product: "",
  material: "",
  size: "",
  qty: "",
  qtyUnit: "Kg",
  colorType: "Single",
  impressions: "",
  platesCount: "4",
  rate: "",
  wastageQty: "0",
  returnedQty: "0",
  outQty: "",
  machine: "Machine 01",
  paperSize: "",
  employee: "",
  helper: "",
  shift: "Day",
  startTime: "",
  endTime: "",
  remarks: "",
};

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

const calculateOutQty = (qty, wastageQty, returnedQty) => {
  const totalQty = Number(qty || 0);
  const wastage = Number(wastageQty || 0);
  const returned = Number(returnedQty || 0);

  const result = totalQty - wastage - returned;
  return result > 0 ? result : 0;
};

const normalizeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.productionItems)) return data.productionItems;
  if (Array.isArray(data?.data)) return data.data;
  return [];
};

const PrintingEntry = () => {
  const [showForm, setShowForm] = useState(false);
  const [side, setSide] = useState("1-side");
  const [editId, setEditId] = useState(null);

  const [entries, setEntries] = useState([]);
  const [productionItems, setProductionItems] = useState([]);

  const [loading, setLoading] = useState(false);
  const [jobLoading, setJobLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [formData, setFormData] = useState(defaultFormData);

  const API_URL = `${API_BASE_URL}/printing`;
  const PRODUCTION_ITEMS_URL = `${API_BASE_URL}/production-items`;

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/all`);

      if (!response.ok) throw new Error("Server error");

      const data = await response.json();
      setEntries(normalizeArray(data));
    } catch (error) {
      console.error("Error fetching printing data:", error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductionItems = async () => {
    try {
      setJobLoading(true);
      const response = await fetch(`${PRODUCTION_ITEMS_URL}/all`);

      if (!response.ok) throw new Error("Production items server error");

      const data = await response.json();
      setProductionItems(normalizeArray(data));
    } catch (error) {
      console.error("Error fetching production items:", error);
      setProductionItems([]);
    } finally {
      setJobLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
    fetchProductionItems();
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [showForm]);

  const jobCardOptions = useMemo(() => {
    return productionItems
      .map((item) => ({
        code: item.code || item.jobCardId || "",
        name: item.name || "",
        customerName: item.customerName || "",
        paperType: item.paperType || "",
        gsm: item.gsm || "",
        sheetSize: item.sheetSize || "",
        finishedSize: item.finishedSize || "",
        quantity: item.quantity || "",
        unit: item.unit || "",
        noOfColors: item.noOfColors || "",
      }))
      .filter((item) => item.code);
  }, [productionItems]);

  const resetForm = () => {
    setFormData(defaultFormData);
    setSide("1-side");
    setEditId(null);
  };

  const openNewForm = async () => {
    setEditId(null);
    resetForm();
    await fetchProductionItems();
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    resetForm();
  };

  const handleJobCardChange = (jobCode) => {
    const selectedJob = productionItems.find(
      (item) =>
        String(item.code || item.jobCardId || "").toLowerCase() ===
        String(jobCode || "").toLowerCase()
    );

    if (!selectedJob) {
      setFormData({
        ...formData,
        jobCardId: jobCode,
      });
      return;
    }

    const materialText = [
      selectedJob.paperType || "",
      selectedJob.gsm ? `${selectedJob.gsm} GSM` : "",
    ]
      .filter(Boolean)
      .join(" - ");

    setFormData({
      ...formData,
      jobCardId: selectedJob.code || jobCode,
      product: selectedJob.name || formData.product,
      material: materialText || formData.material,
      size:
        selectedJob.finishedSize ||
        selectedJob.sheetSize ||
        formData.size,
      paperSize: selectedJob.sheetSize || formData.paperSize,
      qty: selectedJob.totalSheets || selectedJob.quantity || formData.qty,
      qtyUnit: selectedJob.unit || formData.qtyUnit,
      colorType:
        selectedJob.noOfColors?.toLowerCase?.().includes("4") ||
        selectedJob.noOfColors?.toLowerCase?.().includes("multi")
          ? "Multi"
          : formData.colorType,
      remarks: selectedJob.remarks || formData.remarks,
    });
  };

  const updateForm = (field, value) => {
    const updated = {
      ...formData,
      [field]: value,
    };

    if (field === "qty" || field === "wastageQty" || field === "returnedQty") {
      updated.outQty = calculateOutQty(
        field === "qty" ? value : updated.qty,
        field === "wastageQty" ? value : updated.wastageQty,
        field === "returnedQty" ? value : updated.returnedQty
      );
    }

    setFormData(updated);
  };

  const handleEdit = (entry) => {
    setEditId(entry._id);

    setFormData({
      ...defaultFormData,
      jobCardId: entry.jobCardId || "",
      product: entry.product || "",
      material: entry.material || "",
      size: entry.size || "",
      qty: entry.qty || "",
      qtyUnit: entry.qtyUnit || "Kg",
      colorType: entry.colorType || "Single",
      impressions: entry.impressions || entry.qty || "",
      platesCount: entry.platesCount || "4",
      rate: entry.rate || "",
      wastageQty: entry.wastageQty || "0",
      returnedQty: entry.returnedQty || "0",
      outQty:
        entry.outQty ||
        calculateOutQty(entry.qty, entry.wastageQty, entry.returnedQty),
      machine: entry.machine || "Machine 01",
      paperSize: entry.paperSize || "",
      employee: entry.employee || "",
      helper: entry.helper || "",
      shift: entry.shift || "Day",
      startTime: entry.startTime || "",
      endTime: entry.endTime || "",
      remarks: entry.remarks || "",
    });

    setSide(entry.side || "1-side");
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!formData.jobCardId.trim()) {
      alert("Job No required hai");
      return;
    }

    if (!formData.product.trim()) {
      alert("Product / Job Name required hai");
      return;
    }

    if (!formData.material.trim()) {
      alert("Material required hai");
      return;
    }

    if (!formData.size.trim()) {
      alert("Size required hai");
      return;
    }

    if (Number(formData.qty || 0) <= 0) {
      alert("Quantity required hai");
      return;
    }

    if (!formData.employee.trim()) {
      alert("Operator / Employee required hai");
      return;
    }

    const calculatedOutQty = calculateOutQty(
      formData.qty,
      formData.wastageQty,
      formData.returnedQty
    );

    const calculatedAmount = Number(formData.qty || 0) * Number(formData.rate || 0);

    const existingEntry = editId
      ? entries.find((entry) => entry._id === editId)
      : null;

    const payload = {
      ...formData,
      qty: Number(formData.qty || 0),
      impressions: Number(formData.impressions || formData.qty || 0),
      platesCount: Number(formData.platesCount || 0),
      rate: Number(formData.rate || 0),
      wastageQty: Number(formData.wastageQty || 0),
      returnedQty: Number(formData.returnedQty || 0),
      outQty: Number(calculatedOutQty || 0),
      totalAmount: calculatedAmount,
      side,
      time: editId
        ? existingEntry?.time
        : new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
      entryDate: editId
        ? existingEntry?.entryDate || new Date().toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    };

    try {
      const url = editId ? `${API_URL}/update/${editId}` : `${API_URL}/add`;
      const method = editId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        await fetchEntries();
        closeForm();
      } else {
        const errorData = await response.json();
        alert(`Server Error: ${errorData.message || "Unable to save entry"}`);
      }
    } catch (error) {
      alert("Network error! Please check your connection.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this printing entry?")) return;

    try {
      const response = await fetch(`${API_URL}/delete/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setEntries(entries.filter((entry) => entry._id !== id));
      } else {
        alert("Delete failed");
      }
    } catch (error) {
      alert("Could not delete entry.");
    }
  };

  const printEntry = (entry) => {
    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
      <html>
        <head>
          <title>${entry.jobCardId || "Printing Entry"}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 30px;
              color: #111827;
            }
            h1 {
              text-align: center;
              margin: 0;
              font-size: 28px;
            }
            h2 {
              text-align: center;
              text-decoration: underline;
              margin: 18px 0;
            }
            .box {
              border: 1px solid #111827;
              padding: 12px;
              margin-bottom: 14px;
              line-height: 1.8;
              font-size: 13px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #111827;
              padding: 8px;
              font-size: 12px;
              text-align: left;
            }
            th {
              background: #f3f4f6;
            }
            .sign {
              margin-top: 70px;
              display: flex;
              justify-content: space-between;
            }
          </style>
        </head>
        <body>
          <h1>Urwa Packages</h1>
          <h2>Printing Entry</h2>

          <div class="box">
            <b>Job No:</b> ${entry.jobCardId || ""}<br/>
            <b>Product:</b> ${entry.product || ""}<br/>
            <b>Material:</b> ${entry.material || ""}<br/>
            <b>Size:</b> ${entry.size || ""}<br/>
            <b>Color:</b> ${entry.colorType || ""}<br/>
            <b>Machine:</b> ${entry.machine || ""}<br/>
            <b>Operator:</b> ${entry.employee || ""}<br/>
            <b>Printing Side:</b> ${entry.side || ""}<br/>
          </div>

          <table>
            <thead>
              <tr>
                <th>Qty</th>
                <th>Unit</th>
                <th>Wastage</th>
                <th>Returned</th>
                <th>Out</th>
                <th>Impressions</th>
                <th>Plates</th>
                <th>Rate</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${entry.qty || 0}</td>
                <td>${entry.qtyUnit || ""}</td>
                <td>${entry.wastageQty || 0}</td>
                <td>${entry.returnedQty || 0}</td>
                <td>${entry.outQty || 0}</td>
                <td>${entry.impressions || 0}</td>
                <td>${entry.platesCount || 0}</td>
                <td>${entry.rate || 0}</td>
                <td>${entry.totalAmount || 0}</td>
              </tr>
            </tbody>
          </table>

          <p><b>Remarks:</b> ${entry.remarks || ""}</p>

          <div class="sign">
            <div>Operator: __________________</div>
            <div>Supervisor: __________________</div>
            <div>Approved By: __________________</div>
          </div>

          <script>window.print();</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const filteredEntries = entries.filter((entry) => {
    const keyword = searchQuery.toLowerCase();

    return (
      entry.jobCardId?.toLowerCase().includes(keyword) ||
      entry.product?.toLowerCase().includes(keyword) ||
      entry.material?.toLowerCase().includes(keyword) ||
      entry.employee?.toLowerCase().includes(keyword) ||
      entry.machine?.toLowerCase().includes(keyword)
    );
  });

  const summary = useMemo(() => {
    return {
      totalEntries: entries.length,
      totalQty: entries.reduce((s, e) => s + Number(e.qty || 0), 0),
      totalWastage: entries.reduce((s, e) => s + Number(e.wastageQty || 0), 0),
      totalReturned: entries.reduce((s, e) => s + Number(e.returnedQty || 0), 0),
      totalOut: entries.reduce((s, e) => s + Number(e.outQty || 0), 0),
      totalAmount: entries.reduce((s, e) => s + Number(e.totalAmount || 0), 0),
    };
  }, [entries]);

  if (!showForm) {
    return (
      <div className="w-full mx-auto p-6 space-y-6">
        <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
              className="p-1 hover:bg-blue-700 rounded-lg transition-all"
            >
              <ArrowLeft size={20} className="text-white" />
            </button>

            <div>
              <h1 className="text-lg font-bold text-white tracking-wide">
                Printing Log
              </h1>
              <p className="text-blue-100 text-xs font-normal">
                Manage production-level printing entries, material movement and wastage
              </p>
            </div>
          </div>

          <button
            onClick={openNewForm}
            className="flex items-center justify-center gap-1.5 bg-[#2563eb] text-white px-5 py-2.5 rounded-lg font-semibold text-xs hover:bg-blue-700 transition-all shadow-sm border border-blue-400"
          >
            <Plus size={16} />
            Add New Entry
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500">Entries</p>
            <h3 className="text-xl font-bold">{summary.totalEntries}</h3>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500">Total Qty</p>
            <h3 className="text-xl font-bold">{summary.totalQty}</h3>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500">Wastage</p>
            <h3 className="text-xl font-bold text-red-600">
              {summary.totalWastage}
            </h3>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500">Returned</p>
            <h3 className="text-xl font-bold text-orange-600">
              {summary.totalReturned}
            </h3>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500">Out</p>
            <h3 className="text-xl font-bold text-emerald-600">
              {summary.totalOut}
            </h3>
          </div>

          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-slate-500">Total Bill</p>
            <h3 className="text-xl font-bold">{money(summary.totalAmount)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div className="flex items-center gap-2 font-bold text-sm text-[#1e40af]">
              <Clock size={16} />
              Recent Printing Jobs
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-2 border rounded-lg text-xs w-full sm:w-72"
                  placeholder="Search job, product, material, operator..."
                />
              </div>

              <button
                onClick={() => {
                  fetchEntries();
                  fetchProductionItems();
                }}
                className="inline-flex items-center justify-center gap-2 px-3 py-2 border rounded-lg text-xs hover:bg-slate-50"
              >
                <RefreshCcw size={14} />
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="p-10 text-center font-medium text-slate-400 text-sm">
                Loading records...
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="px-5 py-3.5">Time / Job No</th>
                    <th className="px-5 py-3.5">Material / Size</th>
                    <th className="px-5 py-3.5">Product</th>
                    <th className="px-5 py-3.5">Qty</th>
                    <th className="px-5 py-3.5">Wastage / Returned / Out</th>
                    <th className="px-5 py-3.5">Color / Side</th>
                    <th className="px-5 py-3.5">Machine</th>
                    <th className="px-5 py-3.5">Bill</th>
                    <th className="px-5 py-3.5">Operator</th>
                    <th className="px-5 py-3.5 text-center">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry._id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-semibold">{entry.time}</div>
                        <div className="text-[11px] font-bold text-blue-600">
                          {entry.jobCardId || "N/A"}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-medium">{entry.material}</div>
                        <div className="text-[11px] text-slate-400">
                          {entry.size || entry.paperSize || "Custom"}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-medium">
                        {entry.product}
                      </td>

                      <td className="px-5 py-3.5 font-semibold">
                        {entry.qty} {entry.qtyUnit || ""}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="text-red-600 font-semibold">
                          W: {entry.wastageQty || 0}
                        </div>
                        <div className="text-orange-600 font-semibold">
                          R: {entry.returnedQty || 0}
                        </div>
                        <div className="text-emerald-600 font-bold">
                          Out: {entry.outQty || 0}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-semibold">{entry.colorType}</div>
                        <div className="text-[11px] text-slate-400">
                          {entry.side}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="font-medium">{entry.machine}</div>
                        <div className="text-[11px] text-slate-400">
                          {entry.shift || "Day"}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 font-bold text-emerald-600">
                        {money(entry.totalAmount || Number(entry.qty || 0) * Number(entry.rate || 0))}
                      </td>

                      <td className="px-5 py-3.5 text-slate-600">
                        {entry.employee}
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => printEntry(entry)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all"
                          >
                            <Printer size={16} />
                          </button>

                          <button
                            onClick={() => handleEdit(entry)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-all"
                          >
                            <PencilLine size={16} />
                          </button>

                          <button
                            onClick={() => handleDelete(entry._id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredEntries.length === 0 && (
                    <tr>
                      <td
                        colSpan="10"
                        className="p-10 text-center text-slate-400"
                      >
                        No printing record found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  const calculatedOutQty = calculateOutQty(
    formData.qty,
    formData.wastageQty,
    formData.returnedQty
  );

  const calculatedAmount =
    Number(formData.qty || 0) * Number(formData.rate || 0);

  return (
    <div className="w-full mx-auto p-6">
      <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={closeForm}
            className="p-1 hover:bg-blue-700 rounded-lg transition-all"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>

          <h1 className="text-lg font-bold tracking-wide">
            {editId ? "Edit Printing Entry" : "Create New Printing Entry"}
          </h1>
        </div>

        <button
          onClick={closeForm}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-xs hover:bg-blue-800 transition-all border border-blue-500"
        >
          Back to List
        </button>
      </div>

      <div className="bg-white rounded-b-xl border-x border-b border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 space-y-8">
          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1">
              1. Job & Production Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Job Card No
                </label>

                <input
                  list="job-card-options"
                  value={formData.jobCardId}
                  onChange={(e) => handleJobCardChange(e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="Type or select job no e.g. JOB-1"
                />

                <datalist id="job-card-options">
                  {jobCardOptions.map((job) => (
                    <option key={job.code} value={job.code}>
                      {job.code} - {job.name}
                    </option>
                  ))}
                </datalist>

                <p className="text-[10px] text-slate-400">
                  {jobLoading
                    ? "Loading job cards..."
                    : "Type manually or select from production items."}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Product / Job Name
                </label>

                <input
                  value={formData.product}
                  onChange={(e) => updateForm("product", e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="Product name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Material
                </label>

                <input
                  value={formData.material}
                  onChange={(e) => updateForm("material", e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="e.g. ALU ALU, Art Card 300gsm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Size
                </label>

                <input
                  value={formData.size}
                  onChange={(e) => updateForm("size", e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="e.g. 150 mm"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1">
              2. Quantity, Color & Material Movement
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Qty
                </label>

                <input
                  type="number"
                  value={formData.qty}
                  onChange={(e) => updateForm("qty", e.target.value)}
                  placeholder="e.g. 200"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Qty Unit
                </label>

                <select
                  value={formData.qtyUnit}
                  onChange={(e) => updateForm("qtyUnit", e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                >
                  <option>Kg</option>
                  <option>Sheets</option>
                  <option>Pcs</option>
                  <option>Rolls</option>
                  <option>Boxes</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Color
                </label>

                <select
                  value={formData.colorType}
                  onChange={(e) => updateForm("colorType", e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                >
                  <option>Single</option>
                  <option>Double</option>
                  <option>CMYK</option>
                  <option>Multi</option>
                  <option>Spot Color</option>
                  <option>No Color</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Wastage
                </label>

                <input
                  type="number"
                  value={formData.wastageQty}
                  onChange={(e) => updateForm("wastageQty", e.target.value)}
                  placeholder="e.g. 2"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Returned
                </label>

                <input
                  type="number"
                  value={formData.returnedQty}
                  onChange={(e) => updateForm("returnedQty", e.target.value)}
                  placeholder="e.g. 8"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Out
                </label>

                <input
                  type="number"
                  value={formData.outQty || calculatedOutQty}
                  readOnly
                  className="w-full bg-emerald-50 border border-emerald-100 rounded-lg p-2.5 text-xs text-emerald-700 outline-none font-bold"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1">
              3. Machine & Printing Specs
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Machine
                </label>

                <select
                  value={formData.machine}
                  onChange={(e) => updateForm("machine", e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                >
                  <option>Machine 01</option>
                  <option>Machine 02</option>
                  <option>Machine 03 (Heidelberg)</option>
                  <option>Machine 04</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Paper Size
                </label>

                <input
                  type="text"
                  value={formData.paperSize}
                  onChange={(e) => updateForm("paperSize", e.target.value)}
                  placeholder="e.g. 18x23, 20x30"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Impressions
                </label>

                <input
                  type="number"
                  value={formData.impressions}
                  onChange={(e) => updateForm("impressions", e.target.value)}
                  placeholder="Leave blank to match qty"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Plates Count
                </label>

                <input
                  type="number"
                  value={formData.platesCount}
                  onChange={(e) => updateForm("platesCount", e.target.value)}
                  placeholder="4"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Unit Rate
                </label>

                <input
                  type="number"
                  value={formData.rate}
                  onChange={(e) => updateForm("rate", e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Shift
                </label>

                <select
                  value={formData.shift}
                  onChange={(e) => updateForm("shift", e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                >
                  <option>Day</option>
                  <option>Night</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 border-b border-slate-100 pb-1">
              4. Operator & Time
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Assigned Operator
                </label>

                <input
                  value={formData.employee}
                  onChange={(e) => updateForm("employee", e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="Operator name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Helper
                </label>

                <input
                  value={formData.helper}
                  onChange={(e) => updateForm("helper", e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                  placeholder="Helper name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  Start Time
                </label>

                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => updateForm("startTime", e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">
                  End Time
                </label>

                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => updateForm("endTime", e.target.value)}
                  className="w-full bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">
              Printing Sides
            </label>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSide("1-side")}
                className={`flex items-center justify-between p-4 rounded-lg border text-left transition-all ${
                  side === "1-side"
                    ? "border-blue-600 bg-blue-50/50"
                    : "border-slate-200 bg-[#f8fafc]"
                }`}
              >
                <div>
                  <p className="font-bold text-xs text-slate-700">
                    SINGLE SIDE
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Front printing only
                  </p>
                </div>

                {side === "1-side" && (
                  <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white text-[9px]">
                    ✓
                  </div>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSide("2-side")}
                className={`flex items-center justify-between p-4 rounded-lg border text-left transition-all ${
                  side === "2-side"
                    ? "border-blue-600 bg-blue-50/50"
                    : "border-slate-200 bg-[#f8fafc]"
                }`}
              >
                <div>
                  <p className="font-bold text-xs text-slate-700">
                    DOUBLE SIDE
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Front & back printing
                  </p>
                </div>

                {side === "2-side" && (
                  <div className="w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-white text-[9px]">
                    ✓
                  </div>
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">
              Remarks
            </label>

            <textarea
              value={formData.remarks}
              onChange={(e) => updateForm("remarks", e.target.value)}
              rows="3"
              className="w-full mt-1 bg-[#f8fafc] border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 outline-none focus:border-blue-500 focus:bg-white font-medium"
              placeholder="Any special printing instruction..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <span className="text-xs font-semibold text-slate-600">
                Out Qty:
              </span>
              <div className="text-xl font-bold text-emerald-600">
                {calculatedOutQty} {formData.qtyUnit}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <span className="text-xs font-semibold text-slate-600">
                Wastage + Returned:
              </span>
              <div className="text-xl font-bold text-red-600">
                {Number(formData.wastageQty || 0) +
                  Number(formData.returnedQty || 0)}{" "}
                {formData.qtyUnit}
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <span className="text-xs font-semibold text-slate-600">
                Calculated Printing Cost:
              </span>
              <div className="text-xl font-bold text-slate-800">
                {money(calculatedAmount)}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={closeForm}
            className="px-5 py-2 border border-slate-300 text-slate-600 font-medium text-xs rounded-lg bg-white hover:bg-slate-50 transition-all"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            className="px-6 py-2 bg-[#0284c7] text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-all shadow-sm"
          >
            {editId ? "Update Data" : "Save Printing Entry"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintingEntry;