import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowDownCircle,
  ArrowLeft,
  ArrowUpCircle,
  Ban,
  Banknote,
  Building2,
  Edit2,
  FileCheck2,
  Loader2,
  Plus,
  Printer,
  RefreshCcw,
  Save,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const API_PAYMENTS = `${API_BASE_URL}/payments-received`;
const PAYMENT_TYPES = ["Cash In", "Cash Out", "Bank In", "Bank Out"];
const CASH_TYPES = ["Cash In", "Cash Out"];
const BANK_TYPES = ["Bank In", "Bank Out"];

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

const normalizeArray = (data, keys = []) => {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return Array.isArray(data?.data) ? data.data : [];
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

  if (!response.ok || data?.success === false) {
    throw new Error(data.message || data.error || "Request failed");
  }

  return data;
};

const getDefaultCounterAccount = (type) =>
  type === "Cash In" || type === "Bank In"
    ? "customer-receivable"
    : "purchase-expense";

const emptyForm = (voucherNo = "") => ({
  voucherNo,
  voucherDate: todayDate(),
  transactionType: "Cash In",
  amount: "",
  cashAccount: "cash-in-hand",
  bankAccount: "bank-main",
  counterAccount: "customer-receivable",
  partyType: "Customer",
  partyName: "",
  referenceNo: "",
  paymentMethod: "Cash",
  chequeNo: "",
  remarks: "",
  status: "Draft",
  postingStatus: "Not Posted",
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

const statusClass = (status) =>
  ({
    Draft: "bg-slate-100 text-slate-700",
    Approved: "bg-emerald-100 text-emerald-700",
    Cancelled: "bg-red-100 text-red-700",
    Posted: "bg-purple-100 text-purple-700",
    "Not Posted": "bg-amber-100 text-amber-700",
  })[status] || "bg-slate-100 text-slate-700";

const typeStyle = (type, selected) => {
  const base =
    "flex items-center gap-3 rounded-xl border p-4 text-left transition";

  if (!selected) return `${base} border-slate-200 bg-white hover:bg-slate-50`;
  if (type === "Cash In" || type === "Bank In") {
    return `${base} border-emerald-400 bg-emerald-50 ring-2 ring-emerald-100`;
  }
  return `${base} border-red-400 bg-red-50 ring-2 ring-red-100`;
};

const typeIcon = (type) => {
  if (type === "Cash In") return ArrowDownCircle;
  if (type === "Cash Out") return ArrowUpCircle;
  if (type === "Bank In") return Building2;
  return Banknote;
};

const PaymentsReceived = () => {
  const [vouchers, setVouchers] = useState([]);
  const [accounts, setAccounts] = useState({
    cashAccounts: [],
    bankAccounts: [],
    counterAccounts: [],
  });
  const [form, setForm] = useState(emptyForm());
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [postingFilter, setPostingFilter] = useState("All");

  const loadAccounts = async () => {
    const data = await apiRequest(`${API_PAYMENTS}/accounts`);
    setAccounts({
      cashAccounts: normalizeArray(data, ["cashAccounts"]),
      bankAccounts: normalizeArray(data, ["bankAccounts"]),
      counterAccounts: normalizeArray(data, ["counterAccounts"]),
    });
  };

  const loadVouchers = async () => {
    const data = await apiRequest(`${API_PAYMENTS}/all`);
    setVouchers(normalizeArray(data, ["vouchers"]));
  };

  const refresh = async () => {
    try {
      setLoading(true);
      await Promise.all([loadAccounts(), loadVouchers()]);
    } catch (error) {
      console.error("Payments & Received load error:", error);
      alert(error.message || "Payments & Received data could not be loaded");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getAccount = (accountId) =>
    [
      ...accounts.cashAccounts,
      ...accounts.bankAccounts,
      ...accounts.counterAccounts,
    ].find((account) => account.id === accountId) || null;

  const previewEntries = useMemo(() => {
    const amount = numberValue(form.amount);
    if (amount <= 0) return [];

    const mainAccount = CASH_TYPES.includes(form.transactionType)
      ? getAccount(form.cashAccount)
      : getAccount(form.bankAccount);
    const counter = getAccount(form.counterAccount);

    if (!mainAccount || !counter) return [];

    if (form.transactionType === "Cash In" || form.transactionType === "Bank In") {
      return [
        { accountName: mainAccount.name, debit: amount, credit: 0 },
        { accountName: counter.name, debit: 0, credit: amount },
      ];
    }

    return [
      { accountName: counter.name, debit: amount, credit: 0 },
      { accountName: mainAccount.name, debit: 0, credit: amount },
    ];
  }, [form, accounts]);

  const stats = useMemo(
    () => ({
      cashIn: vouchers
        .filter((row) => row.transactionType === "Cash In")
        .reduce((sum, row) => sum + numberValue(row.amount), 0),
      cashOut: vouchers
        .filter((row) => row.transactionType === "Cash Out")
        .reduce((sum, row) => sum + numberValue(row.amount), 0),
      bankIn: vouchers
        .filter((row) => row.transactionType === "Bank In")
        .reduce((sum, row) => sum + numberValue(row.amount), 0),
      bankOut: vouchers
        .filter((row) => row.transactionType === "Bank Out")
        .reduce((sum, row) => sum + numberValue(row.amount), 0),
    }),
    [vouchers]
  );

  const filteredVouchers = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return vouchers.filter((voucher) => {
      const text = [
        voucher.voucherNo,
        voucher.transactionType,
        voucher.partyName,
        voucher.referenceNo,
        voucher.chequeNo,
        voucher.remarks,
        ...(voucher.entries || []).map((entry) => entry.accountName),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!keyword || text.includes(keyword)) &&
        (typeFilter === "All" || voucher.transactionType === typeFilter) &&
        (postingFilter === "All" ||
          voucher.postingStatus === postingFilter)
      );
    });
  }, [vouchers, search, typeFilter, postingFilter]);

  const openNew = async () => {
    try {
      setSaving(true);
      const [numberData] = await Promise.all([
        apiRequest(`${API_PAYMENTS}/next-no`),
        loadAccounts(),
      ]);

      setEditId(null);
      setForm(emptyForm(numberData.voucherNo || ""));
      setShowForm(true);
    } catch (error) {
      alert(error.message || "Payment voucher could not be opened");
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

  const selectType = (type) => {
    if (!PAYMENT_TYPES.includes(type)) return;

    setForm((current) => ({
      ...current,
      transactionType: type,
      counterAccount: getDefaultCounterAccount(type),
      paymentMethod: CASH_TYPES.includes(type) ? "Cash" : "Bank Transfer",
      chequeNo: "",
      partyType:
        type === "Cash In" || type === "Bank In" ? "Customer" : "Vendor",
    }));
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
    if (!PAYMENT_TYPES.includes(form.transactionType)) {
      alert("Select one of the four payment types");
      return false;
    }
    if (numberValue(form.amount) <= 0) {
      alert("Enter an amount greater than zero");
      return false;
    }
    if (CASH_TYPES.includes(form.transactionType) && !form.cashAccount) {
      alert("Select a cash account");
      return false;
    }
    if (BANK_TYPES.includes(form.transactionType) && !form.bankAccount) {
      alert("Select a bank account");
      return false;
    }
    if (!form.counterAccount) {
      alert("Select a counter account");
      return false;
    }
    if (form.paymentMethod === "Cheque" && !form.chequeNo.trim()) {
      alert("Cheque number is required");
      return false;
    }

    return true;
  };

  const buildPayload = (postingStatus = "Not Posted") => ({
    voucherDate: form.voucherDate,
    transactionType: form.transactionType,
    amount: numberValue(form.amount),
    cashAccount: form.cashAccount,
    bankAccount: form.bankAccount,
    counterAccount: form.counterAccount,
    partyType: form.partyType,
    partyName: form.partyName.trim(),
    referenceNo: form.referenceNo.trim(),
    paymentMethod: form.paymentMethod,
    chequeNo: form.chequeNo.trim(),
    remarks: form.remarks.trim(),
    postingStatus,
  });

  const save = async (postingStatus = "Not Posted") => {
    if (!validate()) return;

    if (
      postingStatus === "Posted" &&
      !window.confirm("Save and post this voucher? Posted vouchers are locked.")
    ) {
      return;
    }

    try {
      setSaving(true);
      await apiRequest(
        editId
          ? `${API_PAYMENTS}/update/${editId}`
          : `${API_PAYMENTS}/add`,
        {
          method: editId ? "PUT" : "POST",
          body: JSON.stringify(buildPayload(postingStatus)),
        }
      );

      await loadVouchers();
      closeForm();
    } catch (error) {
      alert(error.message || "Payment voucher could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (voucherId) => {
    try {
      setActionId(voucherId);
      const response = await apiRequest(`${API_PAYMENTS}/${voucherId}`);
      const voucher = response.data;

      if (voucher.postingStatus === "Posted") {
        alert("Posted payment voucher cannot be edited");
        return;
      }
      if (voucher.status === "Cancelled") {
        alert("Cancelled payment voucher cannot be edited");
        return;
      }

      setEditId(voucher._id);
      setForm({
        voucherNo: voucher.voucherNo || "",
        voucherDate: voucher.voucherDate || todayDate(),
        transactionType: PAYMENT_TYPES.includes(voucher.transactionType)
          ? voucher.transactionType
          : "Cash In",
        amount: voucher.amount || "",
        cashAccount: voucher.cashAccount || "cash-in-hand",
        bankAccount: voucher.bankAccount || "bank-main",
        counterAccount:
          voucher.counterAccount ||
          getDefaultCounterAccount(voucher.transactionType),
        partyType: voucher.partyType || "Other",
        partyName: voucher.partyName || "",
        referenceNo: voucher.referenceNo || "",
        paymentMethod:
          voucher.paymentMethod ||
          (CASH_TYPES.includes(voucher.transactionType)
            ? "Cash"
            : "Bank Transfer"),
        chequeNo: voucher.chequeNo || "",
        remarks: voucher.remarks || "",
        status: voucher.status || "Draft",
        postingStatus: voucher.postingStatus || "Not Posted",
      });
      setShowForm(true);
    } catch (error) {
      alert(error.message || "Payment voucher could not be opened");
    } finally {
      setActionId("");
    }
  };

  const togglePosting = async (voucher) => {
    const isPosted = voucher.postingStatus === "Posted";
    const action = isPosted ? "unpost" : "post";

    if (!window.confirm(`${isPosted ? "Unpost" : "Post"} ${voucher.voucherNo}?`)) {
      return;
    }

    try {
      setActionId(voucher._id);
      await apiRequest(`${API_PAYMENTS}/${action}/${voucher._id}`, {
        method: "PUT",
      });
      await loadVouchers();
    } catch (error) {
      alert(error.message || "Posting status could not be updated");
    } finally {
      setActionId("");
    }
  };

  const cancelVoucher = async (voucher) => {
    const reason = window.prompt(`Reason for cancelling ${voucher.voucherNo}:`, "");
    if (reason === null) return;

    try {
      setActionId(voucher._id);
      await apiRequest(`${API_PAYMENTS}/cancel/${voucher._id}`, {
        method: "PATCH",
        body: JSON.stringify({ reason }),
      });
      await loadVouchers();
    } catch (error) {
      alert(error.message || "Payment voucher could not be cancelled");
    } finally {
      setActionId("");
    }
  };

  const deleteVoucher = async (voucher) => {
    if (!window.confirm(`Delete draft voucher ${voucher.voucherNo}?`)) return;

    try {
      setActionId(voucher._id);
      await apiRequest(`${API_PAYMENTS}/delete/${voucher._id}`, {
        method: "DELETE",
      });
      await loadVouchers();
    } catch (error) {
      alert(error.message || "Payment voucher could not be deleted");
    } finally {
      setActionId("");
    }
  };

  const printVoucher = (voucher) => {
    const titleMap = {
      "Cash In": "CASH RECEIPT VOUCHER",
      "Cash Out": "CASH PAYMENT VOUCHER",
      "Bank In": "BANK RECEIPT VOUCHER",
      "Bank Out": "BANK PAYMENT VOUCHER",
    };

    const rows = (voucher.entries || [])
      .map(
        (entry, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(entry.accountName || entry.account)}</td>
            <td>${escapeHtml(entry.narration || "")}</td>
            <td class="number">${money(entry.debit)}</td>
            <td class="number">${money(entry.credit)}</td>
          </tr>`
      )
      .join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print this voucher");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>${escapeHtml(voucher.voucherNo)}</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; padding: 30px; color: #111827; }
            h1 { margin: 0; text-align: center; font-size: 25px; letter-spacing: .8px; }
            .sub { margin: 5px 0 22px; text-align: center; color: #475569; font-size: 12px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .box { border: 1px solid #94a3b8; padding: 10px; font-size: 12px; line-height: 1.8; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #94a3b8; padding: 7px; font-size: 11px; text-align: left; }
            th { background: #f1f5f9; }
            .number { text-align: right; white-space: nowrap; }
            .totals { width: 380px; margin: 14px 0 0 auto; }
            .totals div { display: flex; justify-content: space-between; border-bottom: 1px solid #cbd5e1; padding: 7px 2px; font-size: 12px; }
            .sign { display: flex; justify-content: space-between; margin-top: 70px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>${titleMap[voucher.transactionType] || "PAYMENT VOUCHER"}</h1>
          <div class="sub">Payments & Received</div>

          <div class="grid">
            <div class="box">
              <b>Voucher No:</b> ${escapeHtml(voucher.voucherNo)}<br/>
              <b>Date:</b> ${escapeHtml(voucher.voucherDate)}<br/>
              <b>Type:</b> ${escapeHtml(voucher.transactionType)}<br/>
              <b>Posting:</b> ${escapeHtml(voucher.postingStatus)}
            </div>
            <div class="box">
              <b>Party Type:</b> ${escapeHtml(voucher.partyType)}<br/>
              <b>Party Name:</b> ${escapeHtml(voucher.partyName || "-")}<br/>
              <b>Reference:</b> ${escapeHtml(voucher.referenceNo || "-")}<br/>
              <b>Payment Method:</b> ${escapeHtml(voucher.paymentMethod || "-")}<br/>
              <b>Cheque / Transaction No:</b> ${escapeHtml(voucher.chequeNo || "-")}
            </div>
          </div>

          <table>
            <thead>
              <tr><th>Sr</th><th>Account</th><th>Narration</th><th>Debit</th><th>Credit</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="totals">
            <div><span>Total Debit</span><b>${money(voucher.totals?.totalDebit)}</b></div>
            <div><span>Total Credit</span><b>${money(voucher.totals?.totalCredit)}</b></div>
            <div><span>Voucher Amount</span><b>${money(voucher.amount)}</b></div>
          </div>

          <div class="box" style="margin-top:18px;"><b>Remarks:</b> ${escapeHtml(
            voucher.remarks || "-"
          )}</div>

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
                <ArrowLeft size={17} /> Back to Payments & Received
              </button>
              <h1 className="text-2xl font-bold text-slate-900">
                {editId ? "Edit Payment Voucher" : "New Payment / Receipt Voucher"}
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Select one of four transaction types. Balanced debit and credit entries are generated automatically.
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
            <div>
              <RequiredLabel>Transaction Type</RequiredLabel>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {PAYMENT_TYPES.map((type) => {
                  const Icon = typeIcon(type);
                  const selected = form.transactionType === type;
                  const incoming = type === "Cash In" || type === "Bank In";

                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => selectType(type)}
                      className={typeStyle(type, selected)}
                    >
                      <div
                        className={`rounded-lg p-2 ${
                          incoming
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        <Icon size={22} />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{type}</div>
                        <div className="text-xs text-slate-500">
                          {incoming ? "Money received" : "Money paid"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <div>
                <RequiredLabel>Voucher No</RequiredLabel>
                <input
                  value={form.voucherNo}
                  readOnly
                  className={inputClass}
                  placeholder="Generated automatically"
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
                <RequiredLabel>Amount</RequiredLabel>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(event) => updateField("amount", event.target.value)}
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>

              {CASH_TYPES.includes(form.transactionType) ? (
                <div>
                  <RequiredLabel>Cash Account</RequiredLabel>
                  <select
                    value={form.cashAccount}
                    onChange={(event) =>
                      updateField("cashAccount", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Select Cash Account</option>
                    {accounts.cashAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <RequiredLabel>Bank Account</RequiredLabel>
                  <select
                    value={form.bankAccount}
                    onChange={(event) =>
                      updateField("bankAccount", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Select Bank Account</option>
                    {accounts.bankAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <RequiredLabel>Counter Account</RequiredLabel>
                <select
                  value={form.counterAccount}
                  onChange={(event) =>
                    updateField("counterAccount", event.target.value)
                  }
                  className={inputClass}
                >
                  <option value="">Select Counter Account</option>
                  {accounts.counterAccounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} — {account.type}
                    </option>
                  ))}
                </select>
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
                  {["Customer", "Vendor", "Employee", "Owner", "Other"].map(
                    (type) => (
                      <option key={type}>{type}</option>
                    )
                  )}
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
                  placeholder="Customer, vendor or person name"
                />
              </div>

              <div>
                <Label>Reference No</Label>
                <input
                  value={form.referenceNo}
                  onChange={(event) =>
                    updateField("referenceNo", event.target.value)
                  }
                  className={inputClass}
                  placeholder="Invoice, bill or slip number"
                />
              </div>

              <div>
                <Label>Payment Method</Label>
                {CASH_TYPES.includes(form.transactionType) ? (
                  <input value="Cash" disabled className={inputClass} />
                ) : (
                  <select
                    value={form.paymentMethod}
                    onChange={(event) =>
                      updateField("paymentMethod", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option>Bank Transfer</option>
                    <option>Cheque</option>
                    <option>Other</option>
                  </select>
                )}
              </div>

              {BANK_TYPES.includes(form.transactionType) ? (
                <div>
                  <Label>Cheque / Transaction No</Label>
                  <input
                    value={form.chequeNo}
                    onChange={(event) =>
                      updateField("chequeNo", event.target.value)
                    }
                    className={inputClass}
                    placeholder={
                      form.paymentMethod === "Cheque"
                        ? "Cheque number"
                        : "Bank transaction number"
                    }
                  />
                </div>
              ) : null}

              <div className="md:col-span-4">
                <Label>Remarks</Label>
                <textarea
                  value={form.remarks}
                  onChange={(event) =>
                    updateField("remarks", event.target.value)
                  }
                  className={`${inputClass} min-h-[90px]`}
                  placeholder="Optional payment or receipt notes"
                />
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-200">
              <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                <div>
                  <h3 className="font-bold text-slate-900">Automatic Journal Preview</h3>
                  <p className="text-xs text-slate-500">
                    Debit and credit are generated by the selected transaction type.
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    previewEntries.length === 2
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {previewEntries.length === 2 ? "Balanced" : "Enter amount"}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead>
                    <tr className="border-b bg-white text-slate-600">
                      <th className="p-3 text-left">Account</th>
                      <th className="p-3 text-right">Debit</th>
                      <th className="p-3 text-right">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!previewEntries.length ? (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-slate-500">
                          Select accounts and enter an amount to preview journal entries.
                        </td>
                      </tr>
                    ) : (
                      previewEntries.map((entry, index) => (
                        <tr key={`${entry.accountName}-${index}`} className="border-b last:border-0">
                          <td className="p-3 font-medium text-slate-800">
                            {entry.accountName}
                          </td>
                          <td className="p-3 text-right font-bold text-blue-700">
                            {money(entry.debit)}
                          </td>
                          <td className="p-3 text-right font-bold text-purple-700">
                            {money(entry.credit)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {previewEntries.length ? (
                    <tfoot>
                      <tr className="border-t-2 bg-slate-50 font-bold">
                        <td className="p-3">Totals</td>
                        <td className="p-3 text-right">{money(form.amount)}</td>
                        <td className="p-3 text-right">{money(form.amount)}</td>
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
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
                disabled={saving}
                onClick={() => save("Not Posted")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-5 py-2.5 font-semibold text-white hover:bg-slate-900 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Save size={18} />
                )}
                Save Draft
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => save("Posted")}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? (
                  <Loader2 className="animate-spin" size={18} />
                ) : (
                  <Send size={18} />
                )}
                Save and Post
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    ["Cash In", stats.cashIn, ArrowDownCircle, "text-emerald-700 bg-emerald-100"],
    ["Cash Out", stats.cashOut, ArrowUpCircle, "text-red-700 bg-red-100"],
    ["Bank In", stats.bankIn, Building2, "text-blue-700 bg-blue-100"],
    ["Bank Out", stats.bankOut, Banknote, "text-purple-700 bg-purple-100"],
  ];

  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Payments & Received
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage Cash In, Cash Out, Bank In and Bank Out vouchers from one controlled page.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            type="button"
            onClick={openNew}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Plus size={18} />
            )}
            New Voucher
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {statCards.map(([label, value, Icon, iconClass]) => (
          <div
            key={label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {label}
                </div>
                <div className="mt-2 text-xl font-bold text-slate-900">
                  {money(value)}
                </div>
              </div>
              <div className={`rounded-xl p-3 ${iconClass}`}>
                <Icon size={21} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className={`${inputClass} pl-10`}
              placeholder="Search voucher, party, reference or account..."
            />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className={inputClass}
          >
            <option>All</option>
            {PAYMENT_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
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
                <th className="p-3">Type</th>
                <th className="p-3">Party</th>
                <th className="p-3">Reference</th>
                <th className="p-3">Account</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3">Posting</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-500">
                    <Loader2 className="mx-auto mb-2 animate-spin" /> Loading vouchers...
                  </td>
                </tr>
              ) : !filteredVouchers.length ? (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-slate-500">
                    No Payments & Received vouchers found.
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((voucher) => {
                  const busy = actionId === voucher._id;
                  const mainAccount = (voucher.entries || []).find((entry) =>
                    ["Cash", "Bank"].includes(entry.accountType)
                  );

                  return (
                    <tr
                      key={voucher._id}
                      className="border-b last:border-0 hover:bg-slate-50"
                    >
                      <td className="p-3">
                        <div className="font-bold text-slate-900">
                          {voucher.voucherNo}
                        </div>
                        <div className="text-xs text-slate-500">
                          {voucher.voucherDate}
                        </div>
                      </td>
                      <td className="p-3 font-medium text-slate-800">
                        {voucher.transactionType}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800">
                          {voucher.partyName || "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {voucher.partyType}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-slate-800">
                          {voucher.referenceNo || "—"}
                        </div>
                        <div className="text-xs text-slate-500">
                          {voucher.paymentMethod}
                        </div>
                      </td>
                      <td className="p-3 text-slate-700">
                        {mainAccount?.accountName || "—"}
                      </td>
                      <td className="p-3 text-right font-bold text-slate-900">
                        {money(voucher.amount)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(
                            voucher.postingStatus
                          )}`}
                        >
                          {voucher.postingStatus}
                        </span>
                      </td>
                      <td className="p-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass(
                            voucher.status
                          )}`}
                        >
                          {voucher.status}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => printVoucher(voucher)}
                            className="rounded-lg bg-slate-100 p-2 text-slate-700 hover:bg-slate-200"
                            title="Print"
                          >
                            <Printer size={16} />
                          </button>

                          {voucher.status !== "Cancelled" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => togglePosting(voucher)}
                              className="rounded-lg bg-purple-50 p-2 text-purple-700 hover:bg-purple-100 disabled:opacity-50"
                              title={
                                voucher.postingStatus === "Posted"
                                  ? "Unpost"
                                  : "Post"
                              }
                            >
                              <FileCheck2 size={16} />
                            </button>
                          ) : null}

                          {voucher.postingStatus !== "Posted" &&
                          voucher.status !== "Cancelled" ? (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleEdit(voucher._id)}
                                className="rounded-lg bg-blue-50 p-2 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                                title="Edit"
                              >
                                {busy ? (
                                  <Loader2 size={16} className="animate-spin" />
                                ) : (
                                  <Edit2 size={16} />
                                )}
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => deleteVoucher(voucher)}
                                className="rounded-lg bg-red-50 p-2 text-red-700 hover:bg-red-100 disabled:opacity-50"
                                title="Delete Draft"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          ) : null}

                          {voucher.status !== "Cancelled" ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => cancelVoucher(voucher)}
                              className="rounded-lg bg-amber-50 p-2 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                              title="Cancel Voucher"
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

export default PaymentsReceived;
