import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Printer,
  Loader2,
  Receipt,
  Edit2,
  X,
  Save,
  ArrowLeft,
  BookOpen,
  Wallet,
  Landmark,
  Search,
  RotateCcw,
  FileCheck2,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

const todayDate = () => new Date().toISOString().slice(0, 10);

const money = (value) => `Rs. ${Number(value || 0).toLocaleString()}`;

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

const voucherTypes = [
  "Cash In",
  "Cash Out",
  "Bank In",
  "Bank Out",
  "Cash to Bank",
  "Bank to Cash",
  "Bank to Bank",
  "Adjustment Journal",
  "Opening Balance",
];

const manualTypes = ["Adjustment Journal", "Opening Balance"];

const emptyManualEntry = {
  account: "",
  debit: "",
  credit: "",
  narration: "",
};

const RequiredLabel = ({ children }) => (
  <label className="text-xs font-bold text-slate-600">
    {children} <span className="text-red-600">*</span>
  </label>
);

const NormalLabel = ({ children }) => (
  <label className="text-xs font-bold text-slate-600">{children}</label>
);

const getAccountName = (accountId) => {
  return allAccounts.find((acc) => acc.id === accountId)?.name || "";
};

const getDefaultCounterAccount = (type) => {
  if (type === "Cash In" || type === "Bank In") return "customer-receivable";
  if (type === "Cash Out" || type === "Bank Out") return "purchase-expense";
  return "";
};

const getJournalId = (journal) => journal?._id || journal?.id;

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

const getDefaultForm = (voucherNo = "") => ({
  voucherNo,
  voucherDate: todayDate(),
  transactionType: "Cash In",
  amount: "",
  cashAccount: "cash-in-hand",
  bankAccount: "bank-main",
  fromAccount: "",
  toAccount: "",
  counterAccount: "customer-receivable",
  partyType: "Other",
  partyName: "",
  referenceNo: "",
  paymentMethod: "Cash",
  chequeNo: "",
  remarks: "",
  status: "Draft",
  postingStatus: "Not Posted",
  entries: [{ ...emptyManualEntry }, { ...emptyManualEntry }],
});

const AccountSelect = ({
  value,
  onChange,
  options,
  placeholder = "Select Account",
}) => {
  return (
    <select
      value={value}
      onChange={onChange}
      className="w-full border rounded-lg px-3 py-2 mt-1 text-sm bg-white"
    >
      <option value="">{placeholder}</option>
      {options.map((account) => (
        <option key={account.id} value={account.id}>
          {account.name} - {account.type}
        </option>
      ))}
    </select>
  );
};

const GeneralJournal = () => {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const [form, setForm] = useState(getDefaultForm());

  const isManualVoucher = manualTypes.includes(form.transactionType);

  const fetchNextVoucherNo = async () => {
    const data = await apiRequest(`${API_BASE_URL}/general-journals/next-no`);
    return data.voucherNo || "";
  };

  const loadData = async () => {
    try {
      setLoading(true);

      const data = await apiRequest(`${API_BASE_URL}/general-journals/all`);

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data.data)
        ? data.data
        : Array.isArray(data.journals)
        ? data.journals
        : [];

      setJournals(list);
    } catch (error) {
      alert(error.message || "General Journal data load nahi hua");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const buildAutoEntries = (currentForm) => {
    const amount = Number(currentForm.amount || 0);
    if (amount <= 0) return [];

    const type = currentForm.transactionType;

    const makeEntry = (account, debit, credit, narration) => ({
      account,
      accountName: getAccountName(account),
      debit: Number(debit || 0),
      credit: Number(credit || 0),
      narration,
    });

    if (type === "Cash In") {
      return [
        makeEntry(currentForm.cashAccount, amount, 0, "Cash received"),
        makeEntry(
          currentForm.counterAccount,
          0,
          amount,
          "Cash in counter entry"
        ),
      ];
    }

    if (type === "Cash Out") {
      return [
        makeEntry(
          currentForm.counterAccount,
          amount,
          0,
          "Cash out counter entry"
        ),
        makeEntry(currentForm.cashAccount, 0, amount, "Cash paid"),
      ];
    }

    if (type === "Bank In") {
      return [
        makeEntry(currentForm.bankAccount, amount, 0, "Bank received"),
        makeEntry(
          currentForm.counterAccount,
          0,
          amount,
          "Bank in counter entry"
        ),
      ];
    }

    if (type === "Bank Out") {
      return [
        makeEntry(
          currentForm.counterAccount,
          amount,
          0,
          "Bank out counter entry"
        ),
        makeEntry(currentForm.bankAccount, 0, amount, "Bank paid"),
      ];
    }

    if (
      type === "Cash to Bank" ||
      type === "Bank to Cash" ||
      type === "Bank to Bank"
    ) {
      return [
        makeEntry(currentForm.toAccount, amount, 0, "Transfer received account"),
        makeEntry(currentForm.fromAccount, 0, amount, "Transfer paid account"),
      ];
    }

    return [];
  };

  const journalEntries = useMemo(() => {
    if (isManualVoucher) {
      return form.entries.map((entry) => ({
        ...entry,
        accountName: getAccountName(entry.account),
        debit: Number(entry.debit || 0),
        credit: Number(entry.credit || 0),
      }));
    }

    return buildAutoEntries(form);
  }, [form, isManualVoucher]);

  const totals = useMemo(() => {
    const totalDebit = journalEntries.reduce(
      (sum, entry) => sum + Number(entry.debit || 0),
      0
    );

    const totalCredit = journalEntries.reduce(
      (sum, entry) => sum + Number(entry.credit || 0),
      0
    );

    return {
      totalDebit,
      totalCredit,
      difference: totalDebit - totalCredit,
      isBalanced: Number(totalDebit) === Number(totalCredit),
    };
  }, [journalEntries]);

  const stats = useMemo(() => {
    return {
      totalVouchers: journals.length,
      totalDebit: journals.reduce(
        (s, j) => s + Number(j.totals?.totalDebit || 0),
        0
      ),
      cashIn: journals
        .filter((j) => j.transactionType === "Cash In")
        .reduce((s, j) => s + Number(j.amount || 0), 0),
      cashOut: journals
        .filter((j) => j.transactionType === "Cash Out")
        .reduce((s, j) => s + Number(j.amount || 0), 0),
      bankIn: journals
        .filter((j) => j.transactionType === "Bank In")
        .reduce((s, j) => s + Number(j.amount || 0), 0),
      bankOut: journals
        .filter((j) => j.transactionType === "Bank Out")
        .reduce((s, j) => s + Number(j.amount || 0), 0),
      posted: journals.filter((j) => j.postingStatus === "Posted").length,
    };
  }, [journals]);

  const handleTypeChange = (type) => {
    let updated = {
      ...form,
      transactionType: type,
      amount: "",
      counterAccount: getDefaultCounterAccount(type),
      fromAccount: "",
      toAccount: "",
      paymentMethod:
        type.includes("Bank") && !type.includes("Cash")
          ? "Bank Transfer"
          : "Cash",
      entries: [{ ...emptyManualEntry }, { ...emptyManualEntry }],
    };

    if (type === "Cash to Bank") {
      updated.fromAccount = "cash-in-hand";
      updated.toAccount = "bank-main";
      updated.paymentMethod = "Transfer";
    }

    if (type === "Bank to Cash") {
      updated.fromAccount = "bank-main";
      updated.toAccount = "cash-in-hand";
      updated.paymentMethod = "Transfer";
    }

    if (type === "Bank to Bank") {
      updated.fromAccount = "bank-main";
      updated.toAccount = "bank-ubl";
      updated.paymentMethod = "Transfer";
    }

    if (manualTypes.includes(type)) {
      updated.paymentMethod = "Journal";
    }

    setForm(updated);
  };

  const openNewForm = async () => {
    try {
      setSaving(true);
      const voucherNo = await fetchNextVoucherNo();

      setEditId(null);
      setForm(getDefaultForm(voucherNo));
      setShowForm(true);
    } catch (error) {
      alert(error.message || "Voucher number load nahi hua");
    } finally {
      setSaving(false);
    }
  };

  const closeForm = () => {
    setShowForm(false);
    setEditId(null);
  };

  const updateManualEntry = (index, field, value) => {
    const updatedEntries = [...form.entries];

    updatedEntries[index] = {
      ...updatedEntries[index],
      [field]: value,
    };

    if (field === "debit" && Number(value || 0) > 0) {
      updatedEntries[index].credit = "";
    }

    if (field === "credit" && Number(value || 0) > 0) {
      updatedEntries[index].debit = "";
    }

    setForm({
      ...form,
      entries: updatedEntries,
    });
  };

  const addManualRow = () => {
    setForm({
      ...form,
      entries: [...form.entries, { ...emptyManualEntry }],
    });
  };

  const removeManualRow = (index) => {
    if (form.entries.length <= 2) return;

    setForm({
      ...form,
      entries: form.entries.filter((_, i) => i !== index),
    });
  };

  const validateVoucher = () => {
    if (!form.voucherNo.trim()) {
      alert("Voucher No required hai");
      return false;
    }

    if (!form.voucherDate) {
      alert("Voucher Date required hai");
      return false;
    }

    if (!form.transactionType) {
      alert("Transaction Type select karein");
      return false;
    }

    if (isManualVoucher) {
      const usedRows = form.entries.filter(
        (entry) =>
          entry.account ||
          Number(entry.debit || 0) > 0 ||
          Number(entry.credit || 0) > 0
      );

      if (usedRows.length < 2) {
        alert("Manual journal mein kam az kam 2 entries required hain");
        return false;
      }

      const invalidRow = usedRows.some((entry) => {
        const debit = Number(entry.debit || 0);
        const credit = Number(entry.credit || 0);

        return (
          !entry.account ||
          (debit <= 0 && credit <= 0) ||
          (debit > 0 && credit > 0)
        );
      });

      if (invalidRow) {
        alert(
          "Har row mein account select karein aur sirf Debit ya Credit mein amount enter karein"
        );
        return false;
      }

      const debitTotal = usedRows.reduce(
        (sum, entry) => sum + Number(entry.debit || 0),
        0
      );

      const creditTotal = usedRows.reduce(
        (sum, entry) => sum + Number(entry.credit || 0),
        0
      );

      if (debitTotal !== creditTotal) {
        alert(
          "Journal balanced nahi hai. Total Debit aur Total Credit equal hone chahiye"
        );
        return false;
      }

      return true;
    }

    if (Number(form.amount || 0) <= 0) {
      alert("Amount required hai");
      return false;
    }

    if (
      form.transactionType === "Cash In" ||
      form.transactionType === "Cash Out"
    ) {
      if (!form.cashAccount || !form.counterAccount) {
        alert("Cash Account aur Counter Account select karein");
        return false;
      }

      if (form.cashAccount === form.counterAccount) {
        alert("Cash Account aur Counter Account same nahi ho sakte");
        return false;
      }
    }

    if (
      form.transactionType === "Bank In" ||
      form.transactionType === "Bank Out"
    ) {
      if (!form.bankAccount || !form.counterAccount) {
        alert("Bank Account aur Counter Account select karein");
        return false;
      }

      if (form.bankAccount === form.counterAccount) {
        alert("Bank Account aur Counter Account same nahi ho sakte");
        return false;
      }
    }

    if (
      form.transactionType === "Cash to Bank" ||
      form.transactionType === "Bank to Cash" ||
      form.transactionType === "Bank to Bank"
    ) {
      if (!form.fromAccount || !form.toAccount) {
        alert("From Account aur To Account select karein");
        return false;
      }

      if (form.fromAccount === form.toAccount) {
        alert("From Account aur To Account same nahi ho sakte");
        return false;
      }
    }

    if (!totals.isBalanced) {
      alert("Voucher balanced nahi hai");
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateVoucher()) return;

    const finalEntries = isManualVoucher
      ? form.entries
          .filter(
            (entry) =>
              entry.account ||
              Number(entry.debit || 0) > 0 ||
              Number(entry.credit || 0) > 0
          )
          .map((entry) => ({
            ...entry,
            accountName: getAccountName(entry.account),
            debit: Number(entry.debit || 0),
            credit: Number(entry.credit || 0),
          }))
      : buildAutoEntries(form);

    const finalTotals = {
      totalDebit: finalEntries.reduce(
        (sum, entry) => sum + Number(entry.debit || 0),
        0
      ),
      totalCredit: finalEntries.reduce(
        (sum, entry) => sum + Number(entry.credit || 0),
        0
      ),
    };

    const payload = {
      ...form,
      amount: Number(form.amount || finalTotals.totalDebit || 0),
      entries: finalEntries,
      totals: {
        ...finalTotals,
        difference: finalTotals.totalDebit - finalTotals.totalCredit,
        isBalanced: finalTotals.totalDebit === finalTotals.totalCredit,
      },
    };

    try {
      setSaving(true);

      const url = editId
        ? `${API_BASE_URL}/general-journals/update/${editId}`
        : `${API_BASE_URL}/general-journals/add`;

      const method = editId ? "PUT" : "POST";

      await apiRequest(url, {
        method,
        body: JSON.stringify(payload),
      });

      await loadData();
      closeForm();
    } catch (error) {
      alert(error.message || "Voucher save nahi hua");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (journal) => {
    setEditId(getJournalId(journal));

    setForm({
      voucherNo: journal.voucherNo || "",
      voucherDate: journal.voucherDate || todayDate(),
      transactionType: journal.transactionType || "Cash In",
      amount: journal.amount || "",
      cashAccount: journal.cashAccount || "cash-in-hand",
      bankAccount: journal.bankAccount || "bank-main",
      fromAccount: journal.fromAccount || "",
      toAccount: journal.toAccount || "",
      counterAccount: journal.counterAccount || "",
      partyType: journal.partyType || "Other",
      partyName: journal.partyName || "",
      referenceNo: journal.referenceNo || "",
      paymentMethod: journal.paymentMethod || "Cash",
      chequeNo: journal.chequeNo || "",
      remarks: journal.remarks || "",
      status: journal.status || "Draft",
      postingStatus: journal.postingStatus || "Not Posted",
      entries:
        journal.transactionType === "Adjustment Journal" ||
        journal.transactionType === "Opening Balance"
          ? journal.entries?.length
            ? journal.entries
            : [{ ...emptyManualEntry }, { ...emptyManualEntry }]
          : [{ ...emptyManualEntry }, { ...emptyManualEntry }],
    });

    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this voucher?")) return;

    try {
      await apiRequest(`${API_BASE_URL}/general-journals/delete/${id}`, {
        method: "DELETE",
      });

      await loadData();
    } catch (error) {
      alert(error.message || "Voucher delete nahi hua");
    }
  };

  const togglePosting = async (journal) => {
    const id = getJournalId(journal);
    const isPosted = journal.postingStatus === "Posted";

    try {
      await apiRequest(
        `${API_BASE_URL}/general-journals/${isPosted ? "unpost" : "post"}/${id}`,
        {
          method: "PUT",
        }
      );

      await loadData();
    } catch (error) {
      alert(error.message || "Posting status update nahi hua");
    }
  };

  const printVoucher = (journal) => {
    const rows = journal.entries
      .map(
        (entry, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${entry.accountName || getAccountName(entry.account)}</td>
            <td>${entry.narration || ""}</td>
            <td style="text-align:right;">${Number(
              entry.debit || 0
            ).toLocaleString()}</td>
            <td style="text-align:right;">${Number(
              entry.credit || 0
            ).toLocaleString()}</td>
          </tr>
        `
      )
      .join("");

    const printWindow = window.open("", "_blank");

    printWindow.document.write(`
      <html>
        <head>
          <title>${journal.voucherNo}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 30px; color: #111827; }
            .top { display: flex; justify-content: space-between; border-bottom: 2px solid #111827; padding-bottom: 12px; }
            h1 { margin: 0; font-size: 30px; }
            h2 { text-align: center; margin: 24px 0 18px; text-decoration: underline; }
            .small { font-size: 12px; color: #374151; line-height: 1.7; }
            .box { border: 1px solid #111827; padding: 10px; margin: 12px 0; font-size: 13px; line-height: 1.7; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #111827; padding: 7px; font-size: 12px; text-align: left; }
            th { background: #f3f4f6; }
            .totals { width: 360px; margin-left: auto; margin-top: 14px; }
            .totals div { display: flex; justify-content: space-between; border-bottom: 1px solid #d1d5db; padding: 6px 0; }
            .sign { margin-top: 70px; display: flex; justify-content: space-between; }
          </style>
        </head>

        <body>
          <div class="top">
            <div>
              <h1>Urwa Packages</h1>
              <div class="small">General Journal Voucher</div>
            </div>
            <div class="small">
              <b>Voucher No:</b> ${journal.voucherNo || ""}<br/>
              <b>Date:</b> ${journal.voucherDate || ""}<br/>
              <b>Type:</b> ${journal.transactionType || ""}<br/>
              <b>Status:</b> ${journal.postingStatus || ""}
            </div>
          </div>

          <h2>GENERAL JOURNAL</h2>

          <div class="box">
            <b>Party Type:</b> ${journal.partyType || ""}<br/>
            <b>Party Name:</b> ${journal.partyName || ""}<br/>
            <b>Reference No:</b> ${journal.referenceNo || ""}<br/>
            <b>Payment Method:</b> ${journal.paymentMethod || ""}<br/>
            <b>Cheque / Transaction No:</b> ${journal.chequeNo || ""}<br/>
            <b>Remarks:</b> ${journal.remarks || ""}
          </div>

          <table>
            <thead>
              <tr>
                <th>Sr</th>
                <th>Account</th>
                <th>Narration</th>
                <th>Debit</th>
                <th>Credit</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div class="totals">
            <div><span>Total Debit</span><b>${money(
              journal.totals?.totalDebit
            )}</b></div>
            <div><span>Total Credit</span><b>${money(
              journal.totals?.totalCredit
            )}</b></div>
          </div>

          <div class="sign">
            <div>Prepared By: __________________</div>
            <div>Checked By: __________________</div>
            <div>Approved By: __________________</div>
          </div>

          <script>window.print();</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const filteredJournals = journals.filter((journal) => {
    const keyword = searchTerm.toLowerCase();

    const matchesSearch =
      journal.voucherNo?.toLowerCase().includes(keyword) ||
      journal.transactionType?.toLowerCase().includes(keyword) ||
      journal.partyName?.toLowerCase().includes(keyword) ||
      journal.referenceNo?.toLowerCase().includes(keyword) ||
      journal.remarks?.toLowerCase().includes(keyword);

    const matchesType =
      typeFilter === "All" || journal.transactionType === typeFilter;

    const matchesStatus =
      statusFilter === "All" ||
      journal.postingStatus === statusFilter ||
      journal.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

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
                Back to General Journal
              </button>

              <h1 className="text-2xl font-bold text-slate-900">
                {editId ? "Edit Journal Voucher" : "New Journal Voucher"}
              </h1>

              <p className="text-sm text-slate-500 mt-1">
                Cash, bank, transfer, adjustment aur opening entries aik hi professional voucher mein manage karein.
              </p>
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
                <RequiredLabel>Voucher No</RequiredLabel>
                <input
                  value={form.voucherNo}
                  onChange={(e) =>
                    setForm({ ...form, voucherNo: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                  placeholder="JV-2026-0001"
                />
              </div>

              <div>
                <RequiredLabel>Voucher Date</RequiredLabel>
                <input
                  type="date"
                  value={form.voucherDate}
                  onChange={(e) =>
                    setForm({ ...form, voucherDate: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                />
              </div>

              <div>
                <RequiredLabel>Transaction Type</RequiredLabel>
                <select
                  value={form.transactionType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                >
                  {voucherTypes.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </div>

              {!isManualVoucher && (
                <div>
                  <RequiredLabel>Amount</RequiredLabel>
                  <input
                    type="number"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                    placeholder="0"
                  />
                </div>
              )}

              {(form.transactionType === "Cash In" ||
                form.transactionType === "Cash Out") && (
                <>
                  <div>
                    <RequiredLabel>Cash Account</RequiredLabel>
                    <AccountSelect
                      value={form.cashAccount}
                      onChange={(e) =>
                        setForm({ ...form, cashAccount: e.target.value })
                      }
                      options={cashAccounts}
                    />
                  </div>

                  <div>
                    <RequiredLabel>Counter Account</RequiredLabel>
                    <AccountSelect
                      value={form.counterAccount}
                      onChange={(e) =>
                        setForm({ ...form, counterAccount: e.target.value })
                      }
                      options={[
                        ...incomeAccounts,
                        ...expenseAccounts,
                        ...receivablePayableAccounts,
                        ...adjustmentAccounts,
                      ]}
                    />
                  </div>
                </>
              )}

              {(form.transactionType === "Bank In" ||
                form.transactionType === "Bank Out") && (
                <>
                  <div>
                    <RequiredLabel>Bank Account</RequiredLabel>
                    <AccountSelect
                      value={form.bankAccount}
                      onChange={(e) =>
                        setForm({ ...form, bankAccount: e.target.value })
                      }
                      options={bankAccounts}
                    />
                  </div>

                  <div>
                    <RequiredLabel>Counter Account</RequiredLabel>
                    <AccountSelect
                      value={form.counterAccount}
                      onChange={(e) =>
                        setForm({ ...form, counterAccount: e.target.value })
                      }
                      options={[
                        ...incomeAccounts,
                        ...expenseAccounts,
                        ...receivablePayableAccounts,
                        ...adjustmentAccounts,
                      ]}
                    />
                  </div>
                </>
              )}

              {(form.transactionType === "Cash to Bank" ||
                form.transactionType === "Bank to Cash" ||
                form.transactionType === "Bank to Bank") && (
                <>
                  <div>
                    <RequiredLabel>From Account</RequiredLabel>
                    <AccountSelect
                      value={form.fromAccount}
                      onChange={(e) =>
                        setForm({ ...form, fromAccount: e.target.value })
                      }
                      options={
                        form.transactionType === "Cash to Bank"
                          ? cashAccounts
                          : bankAccounts
                      }
                    />
                  </div>

                  <div>
                    <RequiredLabel>To Account</RequiredLabel>
                    <AccountSelect
                      value={form.toAccount}
                      onChange={(e) =>
                        setForm({ ...form, toAccount: e.target.value })
                      }
                      options={
                        form.transactionType === "Bank to Cash"
                          ? cashAccounts
                          : bankAccounts
                      }
                    />
                  </div>
                </>
              )}

              <div>
                <NormalLabel>Party Type</NormalLabel>
                <select
                  value={form.partyType}
                  onChange={(e) =>
                    setForm({ ...form, partyType: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                >
                  <option>Customer</option>
                  <option>Vendor</option>
                  <option>Employee</option>
                  <option>Owner</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <NormalLabel>Party Name</NormalLabel>
                <input
                  value={form.partyName}
                  onChange={(e) =>
                    setForm({ ...form, partyName: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                  placeholder="Name"
                />
              </div>

              <div>
                <NormalLabel>Reference No</NormalLabel>
                <input
                  value={form.referenceNo}
                  onChange={(e) =>
                    setForm({ ...form, referenceNo: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                  placeholder="Invoice / Bill / Slip No"
                />
              </div>

              <div>
                <NormalLabel>Payment Method</NormalLabel>
                <select
                  value={form.paymentMethod}
                  onChange={(e) =>
                    setForm({ ...form, paymentMethod: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                >
                  <option>Cash</option>
                  <option>Bank Transfer</option>
                  <option>Cheque</option>
                  <option>Transfer</option>
                  <option>Journal</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <NormalLabel>Cheque / Transaction No</NormalLabel>
                <input
                  value={form.chequeNo}
                  onChange={(e) =>
                    setForm({ ...form, chequeNo: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                  placeholder="Optional"
                />
              </div>

              <div>
                <RequiredLabel>Posting Status</RequiredLabel>
                <select
                  value={form.postingStatus}
                  onChange={(e) =>
                    setForm({ ...form, postingStatus: e.target.value })
                  }
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                >
                  <option>Not Posted</option>
                  <option>Posted</option>
                </select>
              </div>

              <div>
                <RequiredLabel>Status</RequiredLabel>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 mt-1 text-sm"
                >
                  <option>Draft</option>
                  <option>Approved</option>
                  <option>Cancelled</option>
                </select>
              </div>
            </div>

            {isManualVoucher && (
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <h3 className="font-bold flex items-center gap-2">
                      <BookOpen size={18} className="text-blue-600" />
                      Manual Journal Entries
                    </h3>
                    <p className="text-xs text-slate-500">
                      Adjustment aur opening entries mein debit/credit manually enter hota hai.
                    </p>
                  </div>

                  <button
                    onClick={addManualRow}
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"
                  >
                    <Plus size={16} />
                    Add Row
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white border-b text-slate-600">
                      <tr>
                        <th className="p-2 text-left">Account</th>
                        <th className="p-2 text-right">Debit</th>
                        <th className="p-2 text-right">Credit</th>
                        <th className="p-2 text-left">Narration</th>
                        <th className="p-2 text-center">Action</th>
                      </tr>
                    </thead>

                    <tbody>
                      {form.entries.map((entry, index) => (
                        <tr key={index} className="border-b hover:bg-slate-50">
                          <td className="p-2 min-w-[260px]">
                            <AccountSelect
                              value={entry.account}
                              onChange={(e) =>
                                updateManualEntry(
                                  index,
                                  "account",
                                  e.target.value
                                )
                              }
                              options={allAccounts}
                            />
                          </td>

                          <td className="p-2 min-w-[130px]">
                            <input
                              type="number"
                              value={entry.debit}
                              onChange={(e) =>
                                updateManualEntry(
                                  index,
                                  "debit",
                                  e.target.value
                                )
                              }
                              className="w-full border rounded px-2 py-1.5 text-right"
                              placeholder="0"
                            />
                          </td>

                          <td className="p-2 min-w-[130px]">
                            <input
                              type="number"
                              value={entry.credit}
                              onChange={(e) =>
                                updateManualEntry(
                                  index,
                                  "credit",
                                  e.target.value
                                )
                              }
                              className="w-full border rounded px-2 py-1.5 text-right"
                              placeholder="0"
                            />
                          </td>

                          <td className="p-2 min-w-[220px]">
                            <input
                              value={entry.narration}
                              onChange={(e) =>
                                updateManualEntry(
                                  index,
                                  "narration",
                                  e.target.value
                                )
                              }
                              className="w-full border rounded px-2 py-1.5"
                              placeholder="Narration"
                            />
                          </td>

                          <td className="p-2 text-center">
                            <button
                              onClick={() => removeManualRow(index)}
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
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
              <div className="xl:col-span-2 border rounded-xl overflow-hidden">
                <div className="bg-slate-50 px-4 py-3">
                  <h3 className="font-bold flex items-center gap-2">
                    <Receipt size={18} className="text-blue-600" />
                    Journal Preview
                  </h3>
                  <p className="text-xs text-slate-500">
                    Yeh voucher backend posting ke waqt debit/credit entries banayega.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white border-b text-slate-600">
                      <tr>
                        <th className="p-3 text-left">Account</th>
                        <th className="p-3 text-left">Narration</th>
                        <th className="p-3 text-right">Debit</th>
                        <th className="p-3 text-right">Credit</th>
                      </tr>
                    </thead>

                    <tbody>
                      {journalEntries.length === 0 ? (
                        <tr>
                          <td
                            colSpan="4"
                            className="p-8 text-center text-slate-500"
                          >
                            Amount aur accounts select karein. Journal preview yahan show hoga.
                          </td>
                        </tr>
                      ) : (
                        journalEntries.map((entry, index) => (
                          <tr key={index} className="border-b hover:bg-slate-50">
                            <td className="p-3 font-semibold">
                              {entry.accountName || "Account not selected"}
                            </td>
                            <td className="p-3 text-slate-500">
                              {entry.narration || "-"}
                            </td>
                            <td className="p-3 text-right font-bold text-blue-700">
                              {entry.debit ? money(entry.debit) : "-"}
                            </td>
                            <td className="p-3 text-right font-bold text-red-700">
                              {entry.credit ? money(entry.credit) : "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="space-y-5">
                <div className="bg-slate-50 rounded-xl p-5 space-y-3">
                  <div className="flex justify-between">
                    <span>Total Debit</span>
                    <b className="text-blue-700">{money(totals.totalDebit)}</b>
                  </div>

                  <div className="flex justify-between">
                    <span>Total Credit</span>
                    <b className="text-red-700">{money(totals.totalCredit)}</b>
                  </div>

                  <div className="flex justify-between text-lg border-t pt-3">
                    <span>Difference</span>
                    <b
                      className={
                        totals.difference === 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }
                    >
                      {money(Math.abs(totals.difference))}
                    </b>
                  </div>

                  <div
                    className={`rounded-xl px-4 py-3 text-sm font-semibold ${
                      totals.isBalanced
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-red-50 text-red-700"
                    }`}
                  >
                    {totals.isBalanced
                      ? "Voucher Balanced"
                      : "Voucher Not Balanced"}
                  </div>
                </div>

                <div>
                  <NormalLabel>Remarks</NormalLabel>
                  <textarea
                    value={form.remarks}
                    onChange={(e) =>
                      setForm({ ...form, remarks: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2 mt-1 min-h-[145px] text-sm"
                    placeholder="Voucher narration / reason / note..."
                  />
                </div>
              </div>
            </div>

            <div className="border-t pt-5 flex justify-end gap-3">
              <button
                onClick={closeForm}
                className="px-5 py-2.5 rounded-xl border hover:bg-slate-50"
              >
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
                {saving ? "Saving..." : "Save Voucher"}
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
            <BookOpen className="text-blue-600" size={26} />
            General Journal
          </h1>

          <p className="text-sm text-slate-500 mt-1">
            Cash in/out, bank in/out, transfers, opening balance aur adjustment vouchers manage karein.
          </p>
        </div>

        <button
          onClick={openNewForm}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm disabled:opacity-60"
        >
          {saving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
          New Voucher
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Receipt size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Total Vouchers</p>
            <h3 className="text-2xl font-bold">{stats.totalVouchers}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ArrowDownCircle size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Cash In</p>
            <h3 className="text-lg font-bold">{money(stats.cashIn)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <ArrowUpCircle size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Cash Out</p>
            <h3 className="text-lg font-bold">{money(stats.cashOut)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Landmark size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Bank In</p>
            <h3 className="text-lg font-bold">{money(stats.bankIn)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <Wallet size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Bank Out</p>
            <h3 className="text-lg font-bold">{money(stats.bankOut)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <FileCheck2 size={22} />
          </div>
          <div>
            <p className="text-xs text-slate-500">Posted</p>
            <h3 className="text-2xl font-bold">{stats.posted}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">Journal Voucher List</h3>
            <p className="text-xs text-slate-500">
              All accounting vouchers and transactions
            </p>
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
                placeholder="Search voucher, party, reference..."
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option>All</option>
              {voucherTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm"
            >
              <option>All</option>
              <option>Draft</option>
              <option>Approved</option>
              <option>Cancelled</option>
              <option>Posted</option>
              <option>Not Posted</option>
            </select>

            <button
              onClick={loadData}
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
                <th className="p-3 text-left">Voucher No</th>
                <th className="p-3 text-left">Type</th>
                <th className="p-3 text-left">Date</th>
                <th className="p-3 text-left">Party</th>
                <th className="p-3 text-left">Reference</th>
                <th className="p-3 text-right">Debit</th>
                <th className="p-3 text-right">Credit</th>
                <th className="p-3 text-center">Posting</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="p-10 text-center">
                    <Loader2 className="animate-spin mx-auto text-blue-600" />
                  </td>
                </tr>
              ) : filteredJournals.length === 0 ? (
                <tr>
                  <td colSpan="10" className="p-10 text-center text-slate-500">
                    No journal voucher found.
                  </td>
                </tr>
              ) : (
                filteredJournals.map((journal) => (
                  <tr
                    key={getJournalId(journal)}
                    className="border-t hover:bg-slate-50"
                  >
                    <td className="p-3 font-bold text-blue-700">
                      {journal.voucherNo}
                    </td>

                    <td className="p-3">{journal.transactionType}</td>

                    <td className="p-3">{journal.voucherDate}</td>

                    <td className="p-3">
                      <div className="font-semibold">
                        {journal.partyName || "-"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {journal.partyType}
                      </div>
                    </td>

                    <td className="p-3">{journal.referenceNo || "-"}</td>

                    <td className="p-3 text-right font-bold text-blue-700">
                      {money(journal.totals?.totalDebit)}
                    </td>

                    <td className="p-3 text-right font-bold text-red-700">
                      {money(journal.totals?.totalCredit)}
                    </td>

                    <td className="p-3 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          journal.postingStatus === "Posted"
                            ? "bg-green-50 text-green-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {journal.postingStatus}
                      </span>
                    </td>

                    <td className="p-3 text-center">
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                        {journal.status}
                      </span>
                    </td>

                    <td className="p-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => printVoucher(journal)}
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200"
                          title="Print"
                        >
                          <Printer size={16} />
                        </button>

                        <button
                          onClick={() => togglePosting(journal)}
                          className={`p-2 rounded-lg ${
                            journal.postingStatus === "Posted"
                              ? "bg-orange-50 text-orange-700 hover:bg-orange-100"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                          title={
                            journal.postingStatus === "Posted"
                              ? "Unpost Voucher"
                              : "Post Voucher"
                          }
                        >
                          <FileCheck2 size={16} />
                        </button>

                        <button
                          onClick={() => handleEdit(journal)}
                          className="p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>

                        <button
                          onClick={() => handleDelete(getJournalId(journal))}
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

      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-sm text-blue-800">
        <b>Accounting Flow:</b> Cash In, Cash Out, Bank In, Bank Out aur
        transfers automatic double-entry voucher banayenge. Adjustment Journal
        aur Opening Balance mein debit/credit manual rows ke through balanced
        entry save hogi.
      </div>
    </div>
  );
};

export default GeneralJournal;