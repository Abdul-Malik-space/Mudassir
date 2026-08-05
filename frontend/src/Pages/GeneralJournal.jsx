import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Ban,
  BookOpen,
  Edit2,
  FileCheck2,
  Loader2,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const API_GENERAL_JOURNALS = `${API_BASE_URL}/general-journals`;
const JOURNAL_TYPE = "Adjustment Journal";

const todayDate = () => new Date().toISOString().slice(0, 10);

const numberValue = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(number, 0) : 0;
};

const money = (value) =>
  `Rs. ${numberValue(value).toLocaleString("en-PK", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const cashAccounts = [
  { id: "cash-in-hand", name: "Cash in Hand", type: "Cash" },
];

const bankAccounts = [
  { id: "bank-main", name: "Main Bank Account", type: "Bank" },
  { id: "bank-ubl", name: "UBL Bank Account", type: "Bank" },
  { id: "bank-meezan", name: "Meezan Bank Account", type: "Bank" },
];

const incomeAccounts = [
  { id: "sales-income", name: "Sales Income", type: "Income" },
  { id: "service-income", name: "Service Income", type: "Income" },
  { id: "other-income", name: "Other Income", type: "Income" },
];

const expenseAccounts = [
  { id: "purchase-expense", name: "Purchase Expense", type: "Expense" },
  { id: "salary-expense", name: "Salary Expense", type: "Expense" },
  { id: "rent-expense", name: "Rent Expense", type: "Expense" },
  { id: "utility-expense", name: "Utility Expense", type: "Expense" },
  { id: "freight-expense", name: "Freight Expense", type: "Expense" },
  { id: "misc-expense", name: "Miscellaneous Expense", type: "Expense" },
];

const receivablePayableAccounts = [
  { id: "customer-receivable", name: "Customer Receivable", type: "Asset" },
  { id: "vendor-payable", name: "Vendor Payable", type: "Liability" },
  { id: "employee-payable", name: "Employee Payable", type: "Liability" },
];

const adjustmentAccounts = [
  { id: "opening-capital", name: "Opening Capital", type: "Equity" },
  { id: "owner-drawing", name: "Owner Drawing", type: "Equity" },
  { id: "stock-adjustment", name: "Stock Adjustment", type: "Adjustment" },
  { id: "round-off", name: "Round Off", type: "Adjustment" },
];

const allAccounts = [
  ...cashAccounts,
  ...bankAccounts,
  ...incomeAccounts,
  ...expenseAccounts,
  ...receivablePayableAccounts,
  ...adjustmentAccounts,
];

const emptyEntry = () => ({
  account: "",
  accountName: "",
  accountType: "",
  debit: "",
  credit: "",
  narration: "",
});

const emptyForm = (voucherNo = "") => ({
  voucherNo,
  voucherDate: todayDate(),
  transactionType: JOURNAL_TYPE,
  partyType: "Other",
  partyName: "",
  referenceNo: "",
  paymentMethod: "Journal",
  remarks: "",
  status: "Draft",
  postingStatus: "Not Posted",
  entries: [emptyEntry(), emptyEntry()],
});

const inputClass =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500";

const RequiredLabel = ({ children }) => (
  <label className="mb-1 block text-xs font-bold text-slate-600">
    {children} <span className="text-red-600">*</span>
  </label>
);

const Label = ({ children }) => (
  <label className="mb-1 block text-xs font-bold text-slate-600">
    {children}
  </label>
);

const getAccount = (accountId) =>
  allAccounts.find((account) => account.id === accountId) || null;

const statusClass = (status) =>
  ({
    Draft: "bg-slate-100 text-slate-700",
    Approved: "bg-emerald-100 text-emerald-700",
    Cancelled: "bg-red-100 text-red-700",
    Posted: "bg-purple-100 text-purple-700",
    "Not Posted": "bg-amber-100 text-amber-700",
  })[status] || "bg-slate-100 text-slate-700";

const apiRequest = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.success === false) {
    throw new Error(data.message || data.error || "Request failed");
  }

  return data;
};

const GeneralJournal = () => {
  const [journals, setJournals] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [search, setSearch] = useState("");
  const [postingFilter, setPostingFilter] = useState("All");

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`${API_GENERAL_JOURNALS}/all`);
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.journals)
          ? data.journals
          : Array.isArray(data.data)
            ? data.data
            : [];

      setJournals(
        list.filter((journal) => journal.transactionType === JOURNAL_TYPE)
      );
    } catch (error) {
      console.error("General Journal load error:", error);
      alert(error.message || "General Journal data could not be loaded");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const cleanEntries = useMemo(
    () =>
      form.entries
        .filter(
          (entry) =>
            entry.account ||
            numberValue(entry.debit) > 0 ||
            numberValue(entry.credit) > 0 ||
            String(entry.narration || "").trim()
        )
        .map((entry) => {
          const account = getAccount(entry.account);
          return {
            ...entry,
            accountName: account?.name || "",
            accountType: account?.type || "",
            debit: numberValue(entry.debit),
            credit: numberValue(entry.credit),
            narration: String(entry.narration || "").trim(),
          };
        }),
    [form.entries]
  );

  const totals = useMemo(() => {
    const totalDebit = cleanEntries.reduce(
      (sum, entry) => sum + numberValue(entry.debit),
      0
    );
    const totalCredit = cleanEntries.reduce(
      (sum, entry) => sum + numberValue(entry.credit),
      0
    );
    const difference = totalDebit - totalCredit;

    return {
      totalDebit,
      totalCredit,
      difference,
      isBalanced:
        totalDebit > 0 && Math.abs(totalDebit - totalCredit) < 0.000001,
    };
  }, [cleanEntries]);

  const stats = useMemo(
    () => ({
      total: journals.length,
      posted: journals.filter((journal) => journal.postingStatus === "Posted")
        .length,
      totalDebit: journals.reduce(
        (sum, journal) => sum + numberValue(journal.totals?.totalDebit),
        0
      ),
      totalCredit: journals.reduce(
        (sum, journal) => sum + numberValue(journal.totals?.totalCredit),
        0
      ),
    }),
    [journals]
  );

  const filteredJournals = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return journals.filter((journal) => {
      const searchableText = [
        journal.voucherNo,
        journal.voucherDate,
        journal.partyType,
        journal.partyName,
        journal.referenceNo,
        journal.remarks,
        ...(journal.entries || []).flatMap((entry) => [
          entry.accountName,
          entry.narration,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!keyword || searchableText.includes(keyword)) &&
        (postingFilter === "All" ||
          journal.postingStatus === postingFilter)
      );
    });
  }, [journals, search, postingFilter]);

  const openNew = async () => {
    try {
      setSaving(true);
      const data = await apiRequest(`${API_GENERAL_JOURNALS}/next-no`);
      setEditId(null);
      setForm(emptyForm(data.voucherNo || ""));
      setShowForm(true);
    } catch (error) {
      alert(error.message || "Voucher number could not be generated");
    } finally {
      setSaving(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
    setForm(emptyForm());
  };

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateEntry = (index, field, value) => {
    setForm((current) => {
      const entries = [...current.entries];
      const row = { ...entries[index], [field]: value };

      if (field === "debit" && numberValue(value) > 0) {
        row.credit = "";
      }

      if (field === "credit" && numberValue(value) > 0) {
        row.debit = "";
      }

      if (field === "account") {
        const account = getAccount(value);
        row.accountName = account?.name || "";
        row.accountType = account?.type || "";
      }

      entries[index] = row;
      return { ...current, entries };
    });
  };

  const addEntry = () => {
    setForm((current) => ({
      ...current,
      entries: [...current.entries, emptyEntry()],
    }));
  };

  const removeEntry = (index) => {
    setForm((current) => {
      if (current.entries.length <= 2) return current;
      return {
        ...current,
        entries: current.entries.filter((_, rowIndex) => rowIndex !== index),
      };
    });
  };

  const validate = () => {
    if (!form.voucherNo.trim()) {
      alert("Voucher number is required");
      return false;
    }

    if (!form.voucherDate) {
      alert("Voucher date is required");
      return false;
    }

    if (cleanEntries.length < 2) {
      alert("At least two journal rows are required");
      return false;
    }

    for (const entry of cleanEntries) {
      const debit = numberValue(entry.debit);
      const credit = numberValue(entry.credit);

      if (!entry.account) {
        alert("Select an account in every used row");
        return false;
      }

      if ((debit <= 0 && credit <= 0) || (debit > 0 && credit > 0)) {
        alert("Each row must contain either a Debit or a Credit amount");
        return false;
      }
    }

    if (!totals.isBalanced) {
      alert("Journal is not balanced. Total Debit and Total Credit must match");
      return false;
    }

    return true;
  };

  const buildPayload = () => ({
    voucherDate: form.voucherDate,
    transactionType: JOURNAL_TYPE,
    amount: totals.totalDebit,
    cashAccount: "",
    bankAccount: "",
    fromAccount: "",
    toAccount: "",
    counterAccount: "",
    partyType: form.partyType,
    partyName: form.partyName.trim(),
    referenceNo: form.referenceNo.trim(),
    paymentMethod: "Journal",
    chequeNo: "",
    remarks: form.remarks.trim(),
    status: "Draft",
    postingStatus: "Not Posted",
    entries: cleanEntries,
    totals,
  });

  const save = async () => {
    if (!validate()) return;

    try {
      setSaving(true);
      await apiRequest(
        editId
          ? `${API_GENERAL_JOURNALS}/update/${editId}`
          : `${API_GENERAL_JOURNALS}/add`,
        {
          method: editId ? "PUT" : "POST",
          body: JSON.stringify(buildPayload()),
        }
      );

      await loadData();
      closeForm();
    } catch (error) {
      alert(error.message || "Adjustment Journal could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (journalId) => {
    try {
      setActionId(journalId);
      const response = await apiRequest(`${API_GENERAL_JOURNALS}/${journalId}`);
      const journal = response.data;

      if (journal.postingStatus === "Posted") {
        alert("Posted journal cannot be edited. Unpost it first.");
        return;
      }

      if (journal.status === "Cancelled") {
        alert("Cancelled journal cannot be edited");
        return;
      }

      setEditId(journal._id);
      setForm({
        voucherNo: journal.voucherNo || "",
        voucherDate: journal.voucherDate || todayDate(),
        transactionType: JOURNAL_TYPE,
        partyType: journal.partyType || "Other",
        partyName: journal.partyName || "",
        referenceNo: journal.referenceNo || "",
        paymentMethod: "Journal",
        remarks: journal.remarks || "",
        status: journal.status || "Draft",
        postingStatus: journal.postingStatus || "Not Posted",
        entries:
          journal.entries?.length >= 2
            ? journal.entries.map((entry) => ({
                account: entry.account || "",
                accountName: entry.accountName || "",
                accountType: entry.accountType || "",
                debit: entry.debit || "",
                credit: entry.credit || "",
                narration: entry.narration || "",
              }))
            : [emptyEntry(), emptyEntry()],
      });
      setShowForm(true);
    } catch (error) {
      alert(error.message || "Journal could not be opened");
    } finally {
      setActionId("");
    }
  };

  const togglePosting = async (journal) => {
    const isPosted = journal.postingStatus === "Posted";
    const action = isPosted ? "unpost" : "post";
    const label = isPosted ? "Unpost" : "Post";

    if (!window.confirm(`${label} ${journal.voucherNo}?`)) return;

    try {
      setActionId(journal._id);
      await apiRequest(`${API_GENERAL_JOURNALS}/${action}/${journal._id}`, {
        method: "PUT",
      });
      await loadData();
    } catch (error) {
      alert(error.message || `Journal could not be ${action}ed`);
    } finally {
      setActionId("");
    }
  };

  const cancelJournal = async (journal) => {
    if (!window.confirm(`Cancel ${journal.voucherNo}?`)) return;

    try {
      setActionId(journal._id);
      await apiRequest(`${API_GENERAL_JOURNALS}/cancel/${journal._id}`, {
        method: "PATCH",
      });
      await loadData();
    } catch (error) {
      alert(error.message || "Journal could not be cancelled");
    } finally {
      setActionId("");
    }
  };

  const deleteJournal = async (journal) => {
    if (!window.confirm(`Delete draft voucher ${journal.voucherNo}?`)) return;

    try {
      setActionId(journal._id);
      await apiRequest(`${API_GENERAL_JOURNALS}/delete/${journal._id}`, {
        method: "DELETE",
      });
      await loadData();
    } catch (error) {
      alert(error.message || "Journal could not be deleted");
    } finally {
      setActionId("");
    }
  };

  const printJournal = (journal) => {
    const rows = (journal.entries || [])
      .map(
        (entry, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(entry.accountName || entry.account)}</td>
            <td>${escapeHtml(entry.accountType || "")}</td>
            <td>${escapeHtml(entry.narration || "")}</td>
            <td class="number">${money(entry.debit)}</td>
            <td class="number">${money(entry.credit)}</td>
          </tr>`
      )
      .join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Allow pop-ups to print this voucher");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(journal.voucherNo)}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 30px; color: #111827; }
            h1 { text-align: center; margin: 0; font-size: 25px; letter-spacing: 1px; }
            .sub { text-align: center; margin: 5px 0 22px; color: #475569; font-size: 12px; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .box { border: 1px solid #94a3b8; border-radius: 6px; padding: 10px; font-size: 12px; line-height: 1.8; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #94a3b8; padding: 7px; font-size: 11px; text-align: left; }
            th { background: #f1f5f9; }
            .number { text-align: right; white-space: nowrap; }
            .totals { width: 380px; margin: 14px 0 0 auto; }
            .totals div { display: flex; justify-content: space-between; border-bottom: 1px solid #cbd5e1; padding: 6px 2px; font-size: 12px; }
            .balanced { margin-top: 10px; text-align: right; font-size: 12px; font-weight: bold; }
            .sign { margin-top: 65px; display: flex; justify-content: space-between; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>GENERAL JOURNAL VOUCHER</h1>
          <div class="sub">Adjustment Journal</div>

          <div class="details">
            <div class="box">
              <b>Voucher No:</b> ${escapeHtml(journal.voucherNo)}<br/>
              <b>Voucher Date:</b> ${escapeHtml(journal.voucherDate)}<br/>
              <b>Posting Status:</b> ${escapeHtml(journal.postingStatus)}
            </div>
            <div class="box">
              <b>Party Type:</b> ${escapeHtml(journal.partyType || "Other")}<br/>
              <b>Party Name:</b> ${escapeHtml(journal.partyName || "-")}<br/>
              <b>Reference No:</b> ${escapeHtml(journal.referenceNo || "-")}
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Sr</th><th>Account</th><th>Type</th><th>Narration</th>
                <th>Debit</th><th>Credit</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="totals">
            <div><span>Total Debit</span><b>${money(journal.totals?.totalDebit)}</b></div>
            <div><span>Total Credit</span><b>${money(journal.totals?.totalCredit)}</b></div>
            <div><span>Difference</span><b>${money(Math.abs(numberValue(journal.totals?.difference)))}</b></div>
          </div>
          <div class="balanced">Status: BALANCED</div>

          <div class="box" style="margin-top:18px;">
            <b>Remarks:</b> ${escapeHtml(journal.remarks || "-")}
          </div>

          <div class="sign">
            <span>Prepared By: __________________</span>
            <span>Checked By: __________________</span>
            <span>Approved By: __________________</span>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  if (showForm) {
    return (
      <div className="w-full space-y-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 md:flex-row md:items-center md:justify-between">
            <div>
              <button
                type="button"
                onClick={closeForm}
                className="mb-3 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft size={17} /> Back to General Journal
              </button>
              <h1 className="text-2xl font-bold text-slate-900">
                {editId ? "Edit Adjustment Journal" : "New Adjustment Journal"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Enter balanced debit and credit rows. Cash and bank receipts or
                payments are managed on the separate Payments & Received page.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 hover:bg-slate-50"
            >
              <X size={18} /> Cancel
            </button>
          </div>

          <div className="space-y-6 pt-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <RequiredLabel>Voucher No</RequiredLabel>
                <input
                  value={form.voucherNo}
                  readOnly
                  className={inputClass}
                  title="Generated automatically by the server"
                />
              </div>

              <div>
                <RequiredLabel>Voucher Date</RequiredLabel>
                <input
                  type="date"
                  value={form.voucherDate}
                  onChange={(event) =>
                    updateField("voucherDate", event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <Label>Transaction Type</Label>
                <input value={JOURNAL_TYPE} readOnly className={inputClass} />
              </div>

              <div>
                <Label>Posting Status</Label>
                <input
                  value={form.postingStatus}
                  readOnly
                  className={inputClass}
                />
              </div>

              <div>
                <Label>Party Type</Label>
                <select
                  value={form.partyType}
                  onChange={(event) =>
                    updateField("partyType", event.target.value)
                  }
                  className={inputClass}
                >
                  <option>Customer</option>
                  <option>Vendor</option>
                  <option>Employee</option>
                  <option>Owner</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <Label>Party Name</Label>
                <input
                  value={form.partyName}
                  onChange={(event) =>
                    updateField("partyName", event.target.value)
                  }
                  className={inputClass}
                  placeholder="Optional party name"
                />
              </div>

              <div className="md:col-span-2">
                <Label>Reference No</Label>
                <input
                  value={form.referenceNo}
                  onChange={(event) =>
                    updateField("referenceNo", event.target.value)
                  }
                  className={inputClass}
                  placeholder="Document, invoice or adjustment reference"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="flex flex-col gap-3 bg-slate-50 px-4 py-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="flex items-center gap-2 font-bold text-slate-900">
                    <BookOpen size={18} className="text-blue-600" /> Journal Entries
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Each row may contain Debit or Credit, not both. Total Debit
                    and Total Credit must be equal.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addEntry}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  <Plus size={16} /> Add Row
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] text-sm">
                  <thead>
                    <tr className="border-b bg-white text-slate-600">
                      <th className="p-3 text-left">Account</th>
                      <th className="p-3 text-left">Account Type</th>
                      <th className="p-3 text-left">Narration</th>
                      <th className="p-3 text-right">Debit</th>
                      <th className="p-3 text-right">Credit</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.entries.map((entry, index) => {
                      const account = getAccount(entry.account);
                      return (
                        <tr key={index} className="border-b last:border-0">
                          <td className="p-3">
                            <select
                              value={entry.account}
                              onChange={(event) =>
                                updateEntry(index, "account", event.target.value)
                              }
                              className={`${inputClass} min-w-[220px]`}
                            >
                              <option value="">Select account</option>
                              {allAccounts.map((row) => (
                                <option key={row.id} value={row.id}>
                                  {row.name} — {row.type}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="p-3 text-slate-600">
                            {account?.type || "—"}
                          </td>
                          <td className="p-3">
                            <input
                              value={entry.narration}
                              onChange={(event) =>
                                updateEntry(index, "narration", event.target.value)
                              }
                              className={`${inputClass} min-w-[240px]`}
                              placeholder="Row narration"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={entry.debit}
                              onChange={(event) =>
                                updateEntry(index, "debit", event.target.value)
                              }
                              className={`${inputClass} min-w-[130px] text-right`}
                              placeholder="0.00"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={entry.credit}
                              onChange={(event) =>
                                updateEntry(index, "credit", event.target.value)
                              }
                              className={`${inputClass} min-w-[130px] text-right`}
                              placeholder="0.00"
                            />
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeEntry(index)}
                              disabled={form.entries.length <= 2}
                              className="rounded-lg bg-red-50 p-2 text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                              title="Remove row"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="grid grid-cols-1 gap-3 border-t bg-slate-50 p-4 md:grid-cols-3">
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500">
                    Total Debit
                  </div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {money(totals.totalDebit)}
                  </div>
                </div>
                <div className="rounded-lg bg-white p-3 shadow-sm">
                  <div className="text-xs font-semibold text-slate-500">
                    Total Credit
                  </div>
                  <div className="mt-1 text-lg font-bold text-slate-900">
                    {money(totals.totalCredit)}
                  </div>
                </div>
                <div
                  className={`rounded-lg p-3 shadow-sm ${
                    totals.isBalanced
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  <div className="text-xs font-semibold">Balance Status</div>
                  <div className="mt-1 text-lg font-bold">
                    {totals.isBalanced
                      ? "Balanced"
                      : `Difference: ${money(Math.abs(totals.difference))}`}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <Label>Remarks</Label>
              <textarea
                value={form.remarks}
                onChange={(event) => updateField("remarks", event.target.value)}
                className={`${inputClass} min-h-[100px]`}
                placeholder="Reason and supporting notes for this adjustment"
              />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                className="rounded-xl border border-slate-300 px-5 py-2.5 font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Save size={18} />
                )}
                Save Adjustment Journal
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">General Journal</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manual balanced adjustment entries only. Cash and bank receipts or
            payments will be handled separately.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            <RotateCcw
              size={18}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
          <button
            type="button"
            onClick={openNew}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            <Plus size={18} /> New Adjustment Journal
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {[
          ["Adjustment Vouchers", stats.total],
          ["Posted", stats.posted],
          ["Total Debit", money(stats.totalDebit)],
          ["Total Credit", money(stats.totalCredit)],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {label}
            </div>
            <div className="mt-2 text-xl font-bold text-slate-900">{value}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-3">
            <Search
              size={18}
              className="absolute left-3 top-2.5 text-slate-400"
            />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={`${inputClass} pl-10`}
              placeholder="Search voucher, account, party, reference or remarks..."
            />
          </div>
          <select
            value={postingFilter}
            onChange={(event) => setPostingFilter(event.target.value)}
            className={inputClass}
          >
            <option>All</option>
            <option>Not Posted</option>
            <option>Posted</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="p-3">Voucher</th>
                <th className="p-3">Party / Reference</th>
                <th className="p-3">Accounts</th>
                <th className="p-3 text-right">Debit</th>
                <th className="p-3 text-right">Credit</th>
                <th className="p-3">Posting</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-500">
                    <Loader2 className="mx-auto mb-2 animate-spin" /> Loading
                    Adjustment Journals...
                  </td>
                </tr>
              ) : !filteredJournals.length ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-500">
                    No Adjustment Journal records found.
                  </td>
                </tr>
              ) : (
                filteredJournals.map((journal) => {
                  const busy = actionId === journal._id;
                  const accountNames = (journal.entries || [])
                    .map((entry) => entry.accountName)
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <tr
                      key={journal._id}
                      className="border-b last:border-0 hover:bg-slate-50"
                    >
                      <td className="p-3">
                        <div className="font-bold text-slate-900">
                          {journal.voucherNo}
                        </div>
                        <div className="text-xs text-slate-500">
                          {journal.voucherDate}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800">
                          {journal.partyName || journal.partyType || "Other"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {journal.referenceNo || "No reference"}
                        </div>
                      </td>
                      <td className="max-w-[280px] p-3 text-slate-600">
                        <div className="truncate" title={accountNames}>
                          {accountNames || "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {(journal.entries || []).length} row(s)
                        </div>
                      </td>
                      <td className="p-3 text-right font-bold">
                        {money(journal.totals?.totalDebit)}
                      </td>
                      <td className="p-3 text-right font-bold">
                        {money(journal.totals?.totalCredit)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(
                            journal.postingStatus
                          )}`}
                        >
                          {journal.postingStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(
                            journal.status
                          )}`}
                        >
                          {journal.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => printJournal(journal)}
                            className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
                            title="Print"
                          >
                            <Printer size={16} />
                          </button>

                          {journal.postingStatus !== "Posted" &&
                          journal.status !== "Cancelled" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => handleEdit(journal._id)}
                              className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                              title="Edit"
                            >
                              {busy ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Edit2 size={16} />
                              )}
                            </button>
                          ) : null}

                          {journal.status !== "Cancelled" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => togglePosting(journal)}
                              className="rounded-lg bg-purple-50 p-2 text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                              title={
                                journal.postingStatus === "Posted"
                                  ? "Unpost"
                                  : "Post"
                              }
                            >
                              {journal.postingStatus === "Posted" ? (
                                <FileCheck2 size={16} />
                              ) : (
                                <Send size={16} />
                              )}
                            </button>
                          ) : null}

                          {journal.postingStatus !== "Posted" &&
                          journal.status !== "Cancelled" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => deleteJournal(journal)}
                              className="rounded-lg bg-red-50 p-2 text-red-700 hover:bg-red-100 disabled:opacity-50"
                              title="Delete draft"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : null}

                          {journal.status !== "Cancelled" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => cancelJournal(journal)}
                              className="rounded-lg bg-amber-50 p-2 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                              title="Cancel"
                            >
                              <Ban size={16} />
                            </button>
                          ) : null}
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
};

export default GeneralJournal;
