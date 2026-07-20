import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CheckCircle2,
  Edit3,
  Loader2,
  Play,
  Plus,
  Printer,
  RefreshCcw,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import { API_BASE_URL } from "../config/api";

const API_PRINTING = `${API_BASE_URL}/printing`;
const API_JOBS = `${API_BASE_URL}/production-items`;

const todayDate = () =>
  new Date().toISOString().slice(0, 10);

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

const idOf = (value) => {
  if (!value) {
    return "";
  }

  if (typeof value === "object") {
    return String(value._id || value.id || "");
  }

  return String(value);
};

const normalizeArray = (data, keys = []) => {
  if (Array.isArray(data)) {
    return data;
  }

  for (const key of keys) {
    if (Array.isArray(data?.[key])) {
      return data[key];
    }
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

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

const getDefaultForm = () => ({
  printingNo: "",
  productionJob: "",
  entryDate: todayDate(),
  plannedQty: "",
  printedQty: "",
  goodQty: "",
  rejectedQty: "0",
  wastageQty: "0",
  unit: "Pcs",
  paperSize: "",
  colorType: "",
  side: "1-side",
  impressions: "",
  platesCount: "4",
  machine: "Machine 01",
  operator: "",
  helper: "",
  shift: "Day",
  startTime: "",
  endTime: "",
  rate: "0",
  remarks: "",
});

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

const statusClass = (status) => {
  const classes = {
    Draft:
      "bg-slate-100 text-slate-700 border-slate-200",

    "In Progress":
      "bg-blue-100 text-blue-700 border-blue-200",

    Completed:
      "bg-emerald-100 text-emerald-700 border-emerald-200",

    Cancelled:
      "bg-red-100 text-red-700 border-red-200",
  };

  return classes[status] || classes.Draft;
};

const PrintingEntry = () => {
  const [entries, setEntries] = useState([]);
  const [productionJobs, setProductionJobs] =
    useState([]);

  const [formData, setFormData] = useState(
    getDefaultForm()
  );

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");

  const [searchQuery, setSearchQuery] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("All");

  const fetchData = async () => {
    try {
      setLoading(true);

      const [printingData, jobData] =
        await Promise.all([
          apiRequest(`${API_PRINTING}/all`),
          apiRequest(`${API_JOBS}/all`),
        ]);

      setEntries(
        normalizeArray(printingData, [
          "entries",
          "printing",
        ])
      );

      setProductionJobs(
        normalizeArray(jobData, [
          "jobs",
          "productionItems",
        ])
      );
    } catch (error) {
      console.error("Printing Load Error:", error);

      alert(
        error.message ||
          "Unable to load printing records."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const eligibleJobs = useMemo(() => {
    return productionJobs.filter((job) => {
      const remainingQty = Math.max(
        numberValue(job.targetQty) -
          numberValue(job.goodQty),
        0
      );

      return (
        job.materialIssuePosted === true &&
        [
          "Material Issued",
          "In Printing",
          "Quality Check",
        ].includes(job.status) &&
        job.productionOutputPosted !== true &&
        remainingQty > 0
      );
    });
  }, [productionJobs]);

  const selectedJob = useMemo(() => {
    return productionJobs.find(
      (job) =>
        String(job._id) ===
        String(formData.productionJob)
    );
  }, [productionJobs, formData.productionJob]);

  const classifiedQty =
    numberValue(formData.goodQty) +
    numberValue(formData.rejectedQty) +
    numberValue(formData.wastageQty);

  const calculatedAmount =
    numberValue(formData.printedQty) *
    numberValue(formData.rate);

  const nextPrintingNo = async () => {
    const data = await apiRequest(
      `${API_PRINTING}/next-no`
    );

    return data.printingNo || "";
  };

  const openNewForm = async () => {
    try {
      const printingNo = await nextPrintingNo();

      setEditId(null);

      setFormData({
        ...getDefaultForm(),
        printingNo,
      });

      setShowForm(true);
    } catch (error) {
      alert(
        error.message ||
          "Unable to prepare a new printing entry."
      );
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setFormData(getDefaultForm());
  };

  const updateField = (field, value) => {
    setFormData((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleJobChange = (jobId) => {
    const job = productionJobs.find(
      (row) =>
        String(row._id) === String(jobId)
    );

    if (!job) {
      updateField("productionJob", "");

      return;
    }

    const remainingQty = Math.max(
      numberValue(job.targetQty) -
        numberValue(job.goodQty),
      0
    );

    setFormData((current) => ({
      ...current,

      productionJob: job._id,

      plannedQty: String(remainingQty),

      unit: job.unit || "Pcs",

      paperSize:
        job.sheetSize || current.paperSize,

      colorType:
        job.noOfColors || current.colorType,

      impressions: String(remainingQty),
    }));
  };

  const openEdit = (entry) => {
    setEditId(entry._id);

    setFormData({
      printingNo: entry.printingNo || "",

      productionJob: idOf(entry.productionJob),

      entryDate:
        String(entry.entryDate || "").slice(0, 10) ||
        todayDate(),

      plannedQty: String(entry.plannedQty ?? ""),

      printedQty: String(entry.printedQty ?? ""),

      goodQty: String(entry.goodQty ?? ""),

      rejectedQty: String(entry.rejectedQty ?? 0),

      wastageQty: String(entry.wastageQty ?? 0),

      unit: entry.unit || "Pcs",

      paperSize: entry.paperSize || "",

      colorType: entry.colorType || "",

      side: entry.side || "1-side",

      impressions: String(entry.impressions ?? ""),

      platesCount: String(entry.platesCount ?? 0),

      machine: entry.machine || "Machine 01",

      operator: entry.operator || "",

      helper: entry.helper || "",

      shift: entry.shift || "Day",

      startTime: entry.startTime || "",

      endTime: entry.endTime || "",

      rate: String(entry.rate ?? 0),

      remarks: entry.remarks || "",
    });

    setShowForm(true);
  };

  const validateForm = () => {
    if (!formData.productionJob) {
      alert("Please select a production job.");

      return false;
    }

    if (numberValue(formData.plannedQty) <= 0) {
      alert(
        "Planned quantity must be greater than zero."
      );

      return false;
    }

    if (!formData.machine.trim()) {
      alert("Printing machine is required.");

      return false;
    }

    if (!formData.operator.trim()) {
      alert("Printing operator is required.");

      return false;
    }

    if (
      numberValue(formData.printedQty) < 0 ||
      numberValue(formData.goodQty) < 0 ||
      numberValue(formData.rejectedQty) < 0 ||
      numberValue(formData.wastageQty) < 0
    ) {
      alert("Quantities cannot be negative.");

      return false;
    }

    if (
      numberValue(formData.goodQty) >
      numberValue(formData.plannedQty)
    ) {
      alert(
        "Good quantity cannot exceed planned quantity."
      );

      return false;
    }

    return true;
  };

  const buildPayload = () => ({
    printingNo: formData.printingNo,

    productionJob: formData.productionJob,

    entryDate: formData.entryDate,

    plannedQty: numberValue(formData.plannedQty),

    printedQty: numberValue(formData.printedQty),

    goodQty: numberValue(formData.goodQty),

    rejectedQty: numberValue(
      formData.rejectedQty
    ),

    wastageQty: numberValue(formData.wastageQty),

    unit: formData.unit,

    paperSize: formData.paperSize.trim(),

    colorType: formData.colorType.trim(),

    side: formData.side,

    impressions: numberValue(formData.impressions),

    platesCount: numberValue(formData.platesCount),

    machine: formData.machine.trim(),

    operator: formData.operator.trim(),

    helper: formData.helper.trim(),

    shift: formData.shift,

    startTime: formData.startTime,

    endTime: formData.endTime,

    rate: numberValue(formData.rate),

    remarks: formData.remarks.trim(),
  });

  const saveEntry = async (event) => {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      await apiRequest(
        editId
          ? `${API_PRINTING}/update/${editId}`
          : `${API_PRINTING}/add`,
        {
          method: editId ? "PUT" : "POST",
          body: JSON.stringify(buildPayload()),
        }
      );

      await fetchData();
      closeForm();
    } catch (error) {
      alert(
        error.message ||
          "Unable to save the printing entry."
      );
    } finally {
      setSaving(false);
    }
  };

  const startPrinting = async (entry) => {
    if (
      !window.confirm(
        `Start printing ${entry.printingNo}?`
      )
    ) {
      return;
    }

    try {
      setActionId(entry._id);

      await apiRequest(
        `${API_PRINTING}/start/${entry._id}`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      await fetchData();
    } catch (error) {
      alert(
        error.message ||
          "Unable to start printing."
      );
    } finally {
      setActionId("");
    }
  };

  const completePrinting = async (entry) => {
    if (
      numberValue(entry.printedQty) <= 0
    ) {
      alert(
        "Edit the entry and enter printing quantities before completion."
      );

      return;
    }

    const totalClassified =
      numberValue(entry.goodQty) +
      numberValue(entry.rejectedQty) +
      numberValue(entry.wastageQty);

    if (
      Math.abs(
        totalClassified -
          numberValue(entry.printedQty)
      ) > 0.000001
    ) {
      alert(
        "Good, rejected and wastage quantities must equal printed quantity."
      );

      return;
    }

    if (
      !window.confirm(
        `Complete printing ${entry.printingNo}?`
      )
    ) {
      return;
    }

    try {
      setActionId(entry._id);

      await apiRequest(
        `${API_PRINTING}/complete/${entry._id}`,
        {
          method: "POST",
          body: JSON.stringify({}),
        }
      );

      await fetchData();
    } catch (error) {
      alert(
        error.message ||
          "Unable to complete printing."
      );
    } finally {
      setActionId("");
    }
  };

  const cancelPrinting = async (entry) => {
    const cancelReason = window.prompt(
      "Enter cancellation reason:",
      ""
    );

    if (cancelReason === null) {
      return;
    }

    try {
      setActionId(entry._id);

      await apiRequest(
        `${API_PRINTING}/cancel/${entry._id}`,
        {
          method: "POST",

          body: JSON.stringify({
            cancelReason:
              cancelReason.trim() ||
              "Printing entry cancelled",
          }),
        }
      );

      await fetchData();
    } catch (error) {
      alert(
        error.message ||
          "Unable to cancel printing."
      );
    } finally {
      setActionId("");
    }
  };

  const deletePrinting = async (entry) => {
    if (
      !window.confirm(
        `Delete ${entry.printingNo}?`
      )
    ) {
      return;
    }

    try {
      setActionId(entry._id);

      await apiRequest(
        `${API_PRINTING}/delete/${entry._id}`,
        {
          method: "DELETE",
        }
      );

      await fetchData();
    } catch (error) {
      alert(
        error.message ||
          "Unable to delete printing."
      );
    } finally {
      setActionId("");
    }
  };

  const printEntry = (entry) => {
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>${entry.printingNo}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 30px;
              color: #111827;
            }

            h1, h2 {
              text-align: center;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }

            th, td {
              border: 1px solid #111827;
              padding: 8px;
              font-size: 12px;
            }

            th {
              background: #f3f4f6;
            }

            .details {
              border: 1px solid #111827;
              padding: 12px;
              line-height: 1.8;
            }
          </style>
        </head>

        <body>
          <h1>Urwa Packages</h1>
          <h2>Printing Record</h2>

          <div class="details">
            <b>Printing No:</b> ${entry.printingNo}<br/>
            <b>Job No:</b> ${entry.jobNo}<br/>
            <b>Product:</b> ${entry.finishedGoodName}<br/>
            <b>Date:</b> ${entry.entryDate}<br/>
            <b>Machine:</b> ${entry.machine}<br/>
            <b>Operator:</b> ${entry.operator}<br/>
            <b>Status:</b> ${entry.status}
          </div>

          <table>
            <thead>
              <tr>
                <th>Planned</th>
                <th>Printed</th>
                <th>Good</th>
                <th>Rejected</th>
                <th>Wastage</th>
                <th>Unit</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>

            <tbody>
              <tr>
                <td>${entry.plannedQty || 0}</td>
                <td>${entry.printedQty || 0}</td>
                <td>${entry.goodQty || 0}</td>
                <td>${entry.rejectedQty || 0}</td>
                <td>${entry.wastageQty || 0}</td>
                <td>${entry.unit || ""}</td>
                <td>${entry.rate || 0}</td>
                <td>${entry.totalAmount || 0}</td>
              </tr>
            </tbody>
          </table>

          <p><b>Remarks:</b> ${entry.remarks || ""}</p>

          <script>
            window.print();
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const filteredEntries = useMemo(() => {
    const keyword = searchQuery
      .trim()
      .toLowerCase();

    return entries.filter((entry) => {
      const searchableText = [
        entry.printingNo,
        entry.jobNo,
        entry.jobName,
        entry.finishedGoodCode,
        entry.finishedGoodName,
        entry.machine,
        entry.operator,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!keyword ||
          searchableText.includes(keyword)) &&
        (statusFilter === "All" ||
          entry.status === statusFilter)
      );
    });
  }, [entries, searchQuery, statusFilter]);

  const stats = useMemo(
    () => ({
      total: entries.length,

      draft: entries.filter(
        (entry) => entry.status === "Draft"
      ).length,

      inProgress: entries.filter(
        (entry) => entry.status === "In Progress"
      ).length,

      completed: entries.filter(
        (entry) => entry.status === "Completed"
      ).length,

      goodQty: entries
        .filter((entry) => entry.status === "Completed")
        .reduce(
          (sum, entry) =>
            sum + numberValue(entry.goodQty),
          0
        ),

      wastageQty: entries
        .filter((entry) => entry.status === "Completed")
        .reduce(
          (sum, entry) =>
            sum + numberValue(entry.wastageQty),
          0
        ),
    }),
    [entries]
  );

  if (!showForm) {
    return (
      <div className="w-full mx-auto p-3 sm:p-5 md:p-6 space-y-5">
        <div className="bg-[#1e40af] text-white p-5 rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.history.back()}
              className="p-1 hover:bg-blue-700 rounded-lg"
            >
              <ArrowLeft size={20} />
            </button>

            <h1 className="text-xl font-bold">
              Printing
            </h1>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/20 disabled:opacity-60"
            >
              <RefreshCcw
                size={16}
                className={loading ? "animate-spin" : ""}
              />

              Refresh
            </button>

            <button
              type="button"
              onClick={openNewForm}
              className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-bold text-blue-700"
            >
              <Plus size={16} />

              New Printing
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <StatCard label="Total" value={stats.total} />
          <StatCard label="Draft" value={stats.draft} />

          <StatCard
            label="In Progress"
            value={stats.inProgress}
          />

          <StatCard
            label="Completed"
            value={stats.completed}
          />

          <StatCard
            label="Good Quantity"
            value={formatQuantity(stats.goodQty)}
          />

          <StatCard
            label="Wastage"
            value={formatQuantity(stats.wastageQty)}
            danger
          />
        </div>

        <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <h2 className="font-bold text-slate-800">
              Printing Register
            </h2>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search
                  size={15}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  value={searchQuery}
                  onChange={(event) =>
                    setSearchQuery(event.target.value)
                  }
                  className="w-full sm:w-72 rounded-lg border py-2 pl-9 pr-3 text-xs"
                  placeholder="Search printing, job, product..."
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="rounded-lg border px-3 py-2 text-xs"
              >
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>

                <option value="In Progress">
                  In Progress
                </option>

                <option value="Completed">
                  Completed
                </option>

                <option value="Cancelled">
                  Cancelled
                </option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1250px] text-left text-xs">
              <thead className="bg-slate-800 text-white uppercase">
                <tr>
                  <th className="p-4">Printing / Job</th>
                  <th className="p-4">Finished Good</th>
                  <th className="p-4 text-right">Planned</th>
                  <th className="p-4 text-right">Printed</th>
                  <th className="p-4 text-right">Good</th>
                  <th className="p-4 text-right">Rejected</th>
                  <th className="p-4 text-right">Wastage</th>
                  <th className="p-4">Machine / Operator</th>
                  <th className="p-4 text-right">Amount</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="11"
                      className="p-10 text-center"
                    >
                      <Loader2 className="mx-auto animate-spin text-blue-600" />
                    </td>
                  </tr>
                ) : filteredEntries.length === 0 ? (
                  <tr>
                    <td
                      colSpan="11"
                      className="p-10 text-center text-slate-400"
                    >
                      No printing records found.
                    </td>
                  </tr>
                ) : (
                  filteredEntries.map((entry) => {
                    const busy = actionId === entry._id;

                    return (
                      <tr
                        key={entry._id}
                        className="border-t hover:bg-slate-50"
                      >
                        <td className="p-4">
                          <div className="font-bold text-blue-700">
                            {entry.printingNo}
                          </div>

                          <div className="mt-1 font-semibold">
                            {entry.jobNo}
                          </div>

                          <div className="text-[10px] text-slate-500">
                            {entry.entryDate}
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="font-semibold">
                            {entry.finishedGoodName}
                          </div>

                          <div className="font-mono text-[10px] text-blue-600">
                            {entry.finishedGoodCode}
                          </div>
                        </td>

                        <td className="p-4 text-right">
                          {formatQuantity(entry.plannedQty)}{" "}
                          {entry.unit}
                        </td>

                        <td className="p-4 text-right font-bold">
                          {formatQuantity(entry.printedQty)}
                        </td>

                        <td className="p-4 text-right font-bold text-emerald-700">
                          {formatQuantity(entry.goodQty)}
                        </td>

                        <td className="p-4 text-right font-bold text-orange-700">
                          {formatQuantity(entry.rejectedQty)}
                        </td>

                        <td className="p-4 text-right font-bold text-red-700">
                          {formatQuantity(entry.wastageQty)}
                        </td>

                        <td className="p-4">
                          <div className="font-semibold">
                            {entry.machine}
                          </div>

                          <div className="text-[10px] text-slate-500">
                            {entry.operator}
                          </div>
                        </td>

                        <td className="p-4 text-right font-bold">
                          {money(entry.totalAmount)}
                        </td>

                        <td className="p-4 text-center">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold ${statusClass(
                              entry.status
                            )}`}
                          >
                            {entry.status}
                          </span>
                        </td>

                        <td className="p-4">
                          <div className="flex justify-center gap-1.5">
                            <ActionButton
                              title="Print"
                              onClick={() => printEntry(entry)}
                              color="slate"
                            >
                              <Printer size={15} />
                            </ActionButton>

                            {["Draft", "In Progress"].includes(
                              entry.status
                            ) && (
                              <ActionButton
                                title="Edit"
                                onClick={() => openEdit(entry)}
                                disabled={busy}
                                color="blue"
                              >
                                <Edit3 size={15} />
                              </ActionButton>
                            )}

                            {entry.status === "Draft" && (
                              <ActionButton
                                title="Start"
                                onClick={() =>
                                  startPrinting(entry)
                                }
                                disabled={busy}
                                color="emerald"
                              >
                                <Play size={15} />
                              </ActionButton>
                            )}

                            {entry.status === "In Progress" && (
                              <ActionButton
                                title="Complete"
                                onClick={() =>
                                  completePrinting(entry)
                                }
                                disabled={busy}
                                color="emerald"
                              >
                                <CheckCircle2 size={15} />
                              </ActionButton>
                            )}

                            {!["Cancelled"].includes(
                              entry.status
                            ) && (
                              <ActionButton
                                title="Cancel"
                                onClick={() =>
                                  cancelPrinting(entry)
                                }
                                disabled={busy}
                                color="orange"
                              >
                                <XCircle size={15} />
                              </ActionButton>
                            )}

                            {entry.status === "Draft" && (
                              <ActionButton
                                title="Delete"
                                onClick={() =>
                                  deletePrinting(entry)
                                }
                                disabled={busy}
                                color="red"
                              >
                                <Trash2 size={15} />
                              </ActionButton>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto p-3 sm:p-5 md:p-6">
      <div className="bg-[#1e40af] text-white p-5 rounded-t-xl flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={closeForm}
            className="p-1 hover:bg-blue-700 rounded-lg"
          >
            <ArrowLeft size={20} />
          </button>

          <h1 className="text-lg font-bold">
            {editId
              ? "Edit Printing"
              : "New Printing"}
          </h1>
        </div>

        <button
          type="button"
          onClick={closeForm}
          className="p-2 rounded-lg hover:bg-blue-700"
        >
          <X size={18} />
        </button>
      </div>

      <form
        onSubmit={saveEntry}
        className="bg-white border-x border-b rounded-b-xl p-5 md:p-7 space-y-7"
      >
        <Section title="Production Job">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Field label="Printing Number">
              <input
                value={formData.printingNo}
                readOnly
                className={`${inputClass} font-mono`}
              />
            </Field>

            <Field label="Production Job" required wide>
              <select
                value={formData.productionJob}
                onChange={(event) =>
                  handleJobChange(event.target.value)
                }
                disabled={Boolean(editId)}
                className={inputClass}
              >
                <option value="">
                  Select Production Job
                </option>

                {eligibleJobs.map((job) => (
                  <option key={job._id} value={job._id}>
                    {job.jobNo} — {job.jobName}
                  </option>
                ))}

                {editId &&
                  selectedJob &&
                  !eligibleJobs.some(
                    (job) => job._id === selectedJob._id
                  ) && (
                    <option
                      value={selectedJob._id}
                    >
                      {selectedJob.jobNo} —{" "}
                      {selectedJob.jobName}
                    </option>
                  )}
              </select>
            </Field>

            <Field label="Printing Date" required>
              <input
                type="date"
                value={formData.entryDate}
                onChange={(event) =>
                  updateField(
                    "entryDate",
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Finished Good">
              <input
                value={
                  selectedJob
                    ? `${selectedJob.finishedGoodCode || ""} — ${
                        selectedJob.finishedGoodName || ""
                      }`
                    : ""
                }
                readOnly
                className={inputClass}
              />
            </Field>

            <Field label="Customer">
              <input
                value={selectedJob?.customerName || ""}
                readOnly
                className={inputClass}
              />
            </Field>

            <Field label="Job Target">
              <input
                value={
                  selectedJob
                    ? `${formatQuantity(
                        selectedJob.targetQty
                      )} ${selectedJob.unit || ""}`
                    : ""
                }
                readOnly
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        <Section title="Quantities">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-4">
            <Field label="Planned Quantity" required>
              <input
                type="number"
                min="0"
                step="any"
                value={formData.plannedQty}
                onChange={(event) =>
                  updateField(
                    "plannedQty",
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Printed Quantity">
              <input
                type="number"
                min="0"
                step="any"
                value={formData.printedQty}
                onChange={(event) =>
                  updateField(
                    "printedQty",
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Good Quantity">
              <input
                type="number"
                min="0"
                step="any"
                value={formData.goodQty}
                onChange={(event) =>
                  updateField("goodQty", event.target.value)
                }
                className={inputClass}
              />
            </Field>

            <Field label="Rejected Quantity">
              <input
                type="number"
                min="0"
                step="any"
                value={formData.rejectedQty}
                onChange={(event) =>
                  updateField(
                    "rejectedQty",
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Wastage Quantity">
              <input
                type="number"
                min="0"
                step="any"
                value={formData.wastageQty}
                onChange={(event) =>
                  updateField(
                    "wastageQty",
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Unit">
              <input
                value={formData.unit}
                onChange={(event) =>
                  updateField("unit", event.target.value)
                }
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
            <SummaryBox
              label="Classified Quantity"
              value={`${formatQuantity(
                classifiedQty
              )} ${formData.unit}`}
            />

            <SummaryBox
              label="Unclassified Quantity"
              value={`${formatQuantity(
                Math.max(
                  numberValue(formData.printedQty) -
                    classifiedQty,
                  0
                )
              )} ${formData.unit}`}
            />

            <SummaryBox
              label="Printing Amount"
              value={money(calculatedAmount)}
            />
          </div>
        </Section>

        <Section title="Printing Details">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Field label="Machine" required>
              <select
                value={formData.machine}
                onChange={(event) =>
                  updateField("machine", event.target.value)
                }
                className={inputClass}
              >
                <option value="Machine 01">
                  Machine 01
                </option>

                <option value="Machine 02">
                  Machine 02
                </option>

                <option value="Machine 03 (Heidelberg)">
                  Machine 03 (Heidelberg)
                </option>

                <option value="Machine 04">
                  Machine 04
                </option>
              </select>
            </Field>

            <Field label="Operator" required>
              <input
                value={formData.operator}
                onChange={(event) =>
                  updateField(
                    "operator",
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Helper">
              <input
                value={formData.helper}
                onChange={(event) =>
                  updateField("helper", event.target.value)
                }
                className={inputClass}
              />
            </Field>

            <Field label="Shift">
              <select
                value={formData.shift}
                onChange={(event) =>
                  updateField("shift", event.target.value)
                }
                className={inputClass}
              >
                <option value="Day">Day</option>
                <option value="Night">Night</option>
              </select>
            </Field>

            <Field label="Paper Size">
              <input
                value={formData.paperSize}
                onChange={(event) =>
                  updateField(
                    "paperSize",
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Colour">
              <input
                value={formData.colorType}
                onChange={(event) =>
                  updateField(
                    "colorType",
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Printing Side">
              <select
                value={formData.side}
                onChange={(event) =>
                  updateField("side", event.target.value)
                }
                className={inputClass}
              >
                <option value="1-side">Single Side</option>
                <option value="2-side">Double Side</option>
              </select>
            </Field>

            <Field label="Impressions">
              <input
                type="number"
                min="0"
                step="any"
                value={formData.impressions}
                onChange={(event) =>
                  updateField(
                    "impressions",
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Plate Count">
              <input
                type="number"
                min="0"
                value={formData.platesCount}
                onChange={(event) =>
                  updateField(
                    "platesCount",
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Start Time">
              <input
                type="time"
                value={formData.startTime}
                onChange={(event) =>
                  updateField(
                    "startTime",
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="End Time">
              <input
                type="time"
                value={formData.endTime}
                onChange={(event) =>
                  updateField(
                    "endTime",
                    event.target.value
                  )
                }
                className={inputClass}
              />
            </Field>

            <Field label="Rate">
              <input
                type="number"
                min="0"
                step="any"
                value={formData.rate}
                onChange={(event) =>
                  updateField("rate", event.target.value)
                }
                className={inputClass}
              />
            </Field>
          </div>
        </Section>

        <Section title="Remarks">
          <textarea
            rows="4"
            value={formData.remarks}
            onChange={(event) =>
              updateField("remarks", event.target.value)
            }
            className={`${inputClass} min-h-[100px]`}
          />
        </Section>

        <div className="flex justify-end gap-3 border-t pt-5">
          <button
            type="button"
            onClick={closeForm}
            className="rounded-lg border px-6 py-2.5 text-sm font-semibold text-slate-600"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-700 px-7 py-2.5 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-60"
          >
            {saving && (
              <Loader2
                size={17}
                className="animate-spin"
              />
            )}

            {saving
              ? "Saving..."
              : editId
              ? "Update Printing"
              : "Save Draft"}
          </button>
        </div>
      </form>
    </div>
  );
};

const Section = ({ title, children }) => (
  <section>
    <h3 className="mb-4 border-b pb-2 text-xs font-bold uppercase tracking-wider text-blue-700">
      {title}
    </h3>

    {children}
  </section>
);

const Field = ({
  label,
  required = false,
  wide = false,
  children,
}) => (
  <div className={wide ? "md:col-span-2" : ""}>
    <label className="mb-1.5 block text-xs font-bold text-slate-600">
      {label}

      {required && (
        <span className="text-red-600"> *</span>
      )}
    </label>

    {children}
  </div>
);

const StatCard = ({
  label,
  value,
  danger = false,
}) => (
  <div className="rounded-xl border bg-white p-4 shadow-sm">
    <p className="text-xs text-slate-500">{label}</p>

    <h3
      className={`mt-1 text-xl font-bold ${
        danger ? "text-red-600" : "text-slate-900"
      }`}
    >
      {value}
    </h3>
  </div>
);

const SummaryBox = ({ label, value }) => (
  <div className="rounded-xl border bg-slate-50 p-4">
    <p className="text-xs text-slate-500">{label}</p>

    <h3 className="mt-1 text-lg font-bold text-slate-900">
      {value}
    </h3>
  </div>
);

const ActionButton = ({
  title,
  onClick,
  disabled,
  color,
  children,
}) => {
  const colors = {
    slate:
      "text-slate-600 hover:bg-slate-100",

    blue:
      "text-blue-600 hover:bg-blue-50",

    emerald:
      "text-emerald-600 hover:bg-emerald-50",

    orange:
      "text-orange-600 hover:bg-orange-50",

    red:
      "text-red-600 hover:bg-red-50",
  };

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg p-2 disabled:cursor-not-allowed disabled:opacity-40 ${colors[color]}`}
    >
      {children}
    </button>
  );
};

export default PrintingEntry;