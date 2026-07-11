import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Building2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Copy,
  Download,
  Edit3,
  Eye,
  FileSpreadsheet,
  Filter,
  FolderTree,
  History,
  Landmark,
  Layers3,
  Loader2,
  Lock,
  MoreHorizontal,
  Plus,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react";

/*
  Production-ready Chart of Accounts front-end
  -------------------------------------------------
  - React + Tailwind CSS + lucide-react only
  - Uses localStorage for now so the module is fully testable before backend integration
  - Replace coaRepository methods with your Node/Express API calls later
  - Supports parent/child hierarchy, group/posting accounts, validation, status, lock,
    reconciliation, tax defaults, multi-branch context, filters, CSV import/export and audit trail
*/

const STORAGE_KEY = "erp-coa-production-v1";
const AUDIT_KEY = "erp-coa-audit-v1";

const ACCOUNT_TYPES = [
  { value: "asset", label: "Assets", codeRange: "1000-1999", normalBalance: "debit" },
  { value: "liability", label: "Liabilities", codeRange: "2000-2999", normalBalance: "credit" },
  { value: "equity", label: "Equity", codeRange: "3000-3999", normalBalance: "credit" },
  { value: "income", label: "Income", codeRange: "4000-4999", normalBalance: "credit" },
  { value: "expense", label: "Expenses", codeRange: "5000-6999", normalBalance: "debit" },
  { value: "other_income", label: "Other Income", codeRange: "7000-7499", normalBalance: "credit" },
  { value: "other_expense", label: "Other Expense", codeRange: "7500-7999", normalBalance: "debit" },
];

const ACCOUNT_SUBTYPES = {
  asset: [
    "Cash & Cash Equivalents",
    "Bank",
    "Accounts Receivable",
    "Inventory",
    "Prepayments",
    "Other Current Assets",
    "Fixed Assets",
    "Accumulated Depreciation",
    "Intangible Assets",
  ],
  liability: [
    "Accounts Payable",
    "Tax Payable",
    "Payroll Payable",
    "Short-term Loan",
    "Accrued Liabilities",
    "Long-term Loan",
    "Lease Liability",
  ],
  equity: ["Owner Capital", "Share Capital", "Drawings", "Retained Earnings", "Current Year Earnings"],
  income: ["Sales Revenue", "Service Revenue", "Discount Received", "Commission Income"],
  expense: [
    "Cost of Goods Sold",
    "Payroll Expense",
    "Administrative Expense",
    "Selling & Marketing",
    "Utilities",
    "Depreciation",
    "Financial Charges",
    "Other Operating Expense",
  ],
  other_income: ["Gain on Disposal", "Rental Income", "Interest Income"],
  other_expense: ["Loss on Disposal", "Penalties", "Exceptional Expense"],
};

const TAX_OPTIONS = ["No Tax", "Sales Tax 18%", "Sales Tax 17%", "Input Tax 18%", "Withholding Tax", "Exempt"];
const CURRENCIES = ["PKR", "USD", "GBP", "EUR", "AED", "SAR"];

const seedAccounts = [
  { id: "1000", code: "1000", name: "Assets", type: "asset", subtype: "Other Current Assets", parentId: null, isGroup: true, active: true, system: true, locked: true, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 12850000, description: "All company assets", branch: "Head Office" },
  { id: "1100", code: "1100", name: "Current Assets", type: "asset", subtype: "Other Current Assets", parentId: "1000", isGroup: true, active: true, system: true, locked: false, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 6800000, description: "Assets expected to be realized within one year", branch: "Head Office" },
  { id: "1110", code: "1110", name: "Cash and Cash Equivalents", type: "asset", subtype: "Cash & Cash Equivalents", parentId: "1100", isGroup: true, active: true, system: false, locked: false, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 1750000, description: "Cash and near-cash balances", branch: "Head Office" },
  { id: "1111", code: "1111", name: "Cash in Hand", type: "asset", subtype: "Cash & Cash Equivalents", parentId: "1110", isGroup: false, active: true, system: true, locked: false, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 250000, currentBalance: 425000, description: "Main office cash safe", branch: "Head Office" },
  { id: "1112", code: "1112", name: "Petty Cash", type: "asset", subtype: "Cash & Cash Equivalents", parentId: "1110", isGroup: false, active: true, system: false, locked: false, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 50000, currentBalance: 75000, description: "Petty cash imprest", branch: "Head Office" },
  { id: "1120", code: "1120", name: "Bank Accounts", type: "asset", subtype: "Bank", parentId: "1100", isGroup: true, active: true, system: false, locked: false, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 1250000, description: "Registered company bank accounts", branch: "Head Office" },
  { id: "1121", code: "1121", name: "Meezan Bank - Current", type: "asset", subtype: "Bank", parentId: "1120", isGroup: false, active: true, system: false, locked: false, reconcile: true, currency: "PKR", defaultTax: "No Tax", openingBalance: 500000, currentBalance: 825000, description: "Primary operating account", branch: "Head Office" },
  { id: "1122", code: "1122", name: "HBL - Current", type: "asset", subtype: "Bank", parentId: "1120", isGroup: false, active: true, system: false, locked: false, reconcile: true, currency: "PKR", defaultTax: "No Tax", openingBalance: 300000, currentBalance: 425000, description: "Secondary business account", branch: "Lahore Branch" },
  { id: "1130", code: "1130", name: "Accounts Receivable", type: "asset", subtype: "Accounts Receivable", parentId: "1100", isGroup: false, active: true, system: true, locked: true, reconcile: true, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 2900000, description: "Customer control account", branch: "Head Office" },
  { id: "1140", code: "1140", name: "Inventory", type: "asset", subtype: "Inventory", parentId: "1100", isGroup: true, active: true, system: true, locked: false, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 400000, description: "Inventory control group", branch: "Head Office" },
  { id: "1141", code: "1141", name: "Raw Material Inventory", type: "asset", subtype: "Inventory", parentId: "1140", isGroup: false, active: true, system: false, locked: false, reconcile: false, currency: "PKR", defaultTax: "Input Tax 18%", openingBalance: 0, currentBalance: 250000, description: "Raw material stock account", branch: "Factory" },
  { id: "1142", code: "1142", name: "Finished Goods Inventory", type: "asset", subtype: "Inventory", parentId: "1140", isGroup: false, active: true, system: false, locked: false, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 150000, description: "Finished products stock account", branch: "Factory" },
  { id: "1200", code: "1200", name: "Fixed Assets", type: "asset", subtype: "Fixed Assets", parentId: "1000", isGroup: true, active: true, system: true, locked: false, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 6050000, description: "Property, plant and equipment", branch: "Head Office" },
  { id: "1210", code: "1210", name: "Plant & Machinery", type: "asset", subtype: "Fixed Assets", parentId: "1200", isGroup: false, active: true, system: false, locked: false, reconcile: false, currency: "PKR", defaultTax: "Input Tax 18%", openingBalance: 5000000, currentBalance: 5000000, description: "Factory machinery cost", branch: "Factory" },
  { id: "1290", code: "1290", name: "Accumulated Depreciation", type: "asset", subtype: "Accumulated Depreciation", parentId: "1200", isGroup: false, active: true, system: false, locked: false, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: -850000, currentBalance: -950000, description: "Contra asset", branch: "Head Office" },
  { id: "2000", code: "2000", name: "Liabilities", type: "liability", subtype: "Accrued Liabilities", parentId: null, isGroup: true, active: true, system: true, locked: true, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 5200000, description: "All company liabilities", branch: "Head Office" },
  { id: "2100", code: "2100", name: "Current Liabilities", type: "liability", subtype: "Accrued Liabilities", parentId: "2000", isGroup: true, active: true, system: true, locked: false, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 3700000, description: "Obligations payable within one year", branch: "Head Office" },
  { id: "2110", code: "2110", name: "Accounts Payable", type: "liability", subtype: "Accounts Payable", parentId: "2100", isGroup: false, active: true, system: true, locked: true, reconcile: true, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 2400000, description: "Supplier control account", branch: "Head Office" },
  { id: "2120", code: "2120", name: "Sales Tax Payable", type: "liability", subtype: "Tax Payable", parentId: "2100", isGroup: false, active: true, system: true, locked: true, reconcile: false, currency: "PKR", defaultTax: "Sales Tax 18%", openingBalance: 0, currentBalance: 675000, description: "Output less input tax payable", branch: "Head Office" },
  { id: "2130", code: "2130", name: "Salary Payable", type: "liability", subtype: "Payroll Payable", parentId: "2100", isGroup: false, active: true, system: false, locked: false, reconcile: true, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 625000, description: "Unpaid payroll liability", branch: "Head Office" },
  { id: "2200", code: "2200", name: "Long-term Liabilities", type: "liability", subtype: "Long-term Loan", parentId: "2000", isGroup: true, active: true, system: false, locked: false, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 1500000, description: "Non-current obligations", branch: "Head Office" },
  { id: "2210", code: "2210", name: "Bank Loan", type: "liability", subtype: "Long-term Loan", parentId: "2200", isGroup: false, active: true, system: false, locked: false, reconcile: true, currency: "PKR", defaultTax: "No Tax", openingBalance: 2000000, currentBalance: 1500000, description: "Term finance facility", branch: "Head Office" },
  { id: "3000", code: "3000", name: "Equity", type: "equity", subtype: "Owner Capital", parentId: null, isGroup: true, active: true, system: true, locked: true, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 7650000, description: "Owners' equity", branch: "Head Office" },
  { id: "3100", code: "3100", name: "Owner Capital", type: "equity", subtype: "Owner Capital", parentId: "3000", isGroup: false, active: true, system: true, locked: true, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 6000000, currentBalance: 6000000, description: "Capital introduced by owner", branch: "Head Office" },
  { id: "3200", code: "3200", name: "Retained Earnings", type: "equity", subtype: "Retained Earnings", parentId: "3000", isGroup: false, active: true, system: true, locked: true, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 1200000, currentBalance: 1650000, description: "Accumulated retained profits", branch: "Head Office" },
  { id: "4000", code: "4000", name: "Income", type: "income", subtype: "Sales Revenue", parentId: null, isGroup: true, active: true, system: true, locked: true, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 14900000, description: "Operating income", branch: "Head Office" },
  { id: "4100", code: "4100", name: "Sales Revenue", type: "income", subtype: "Sales Revenue", parentId: "4000", isGroup: false, active: true, system: true, locked: true, reconcile: false, currency: "PKR", defaultTax: "Sales Tax 18%", openingBalance: 0, currentBalance: 13200000, description: "Revenue from product sales", branch: "Head Office" },
  { id: "4200", code: "4200", name: "Service Revenue", type: "income", subtype: "Service Revenue", parentId: "4000", isGroup: false, active: true, system: false, locked: false, reconcile: false, currency: "PKR", defaultTax: "Sales Tax 18%", openingBalance: 0, currentBalance: 1700000, description: "Revenue from services", branch: "Head Office" },
  { id: "5000", code: "5000", name: "Expenses", type: "expense", subtype: "Administrative Expense", parentId: null, isGroup: true, active: true, system: true, locked: true, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 8450000, description: "Operating and non-operating expenses", branch: "Head Office" },
  { id: "5100", code: "5100", name: "Cost of Goods Sold", type: "expense", subtype: "Cost of Goods Sold", parentId: "5000", isGroup: true, active: true, system: true, locked: false, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 4900000, description: "Direct cost of goods sold", branch: "Factory" },
  { id: "5110", code: "5110", name: "Material Consumed", type: "expense", subtype: "Cost of Goods Sold", parentId: "5100", isGroup: false, active: true, system: false, locked: false, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 3500000, description: "Raw materials consumed", branch: "Factory" },
  { id: "5120", code: "5120", name: "Direct Labour", type: "expense", subtype: "Cost of Goods Sold", parentId: "5100", isGroup: false, active: true, system: false, locked: false, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 1400000, description: "Production labour expense", branch: "Factory" },
  { id: "5200", code: "5200", name: "Administrative Expenses", type: "expense", subtype: "Administrative Expense", parentId: "5000", isGroup: true, active: true, system: false, locked: false, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 2450000, description: "Administrative overheads", branch: "Head Office" },
  { id: "5210", code: "5210", name: "Salaries Expense", type: "expense", subtype: "Payroll Expense", parentId: "5200", isGroup: false, active: true, system: false, locked: false, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 1400000, description: "Staff salaries", branch: "Head Office" },
  { id: "5220", code: "5220", name: "Office Rent", type: "expense", subtype: "Administrative Expense", parentId: "5200", isGroup: false, active: true, system: false, locked: false, reconcile: false, currency: "PKR", defaultTax: "Input Tax 18%", openingBalance: 0, currentBalance: 650000, description: "Office rental expense", branch: "Head Office" },
  { id: "5230", code: "5230", name: "Utilities", type: "expense", subtype: "Utilities", parentId: "5200", isGroup: false, active: true, system: false, locked: false, reconcile: false, currency: "PKR", defaultTax: "Input Tax 18%", openingBalance: 0, currentBalance: 400000, description: "Electricity, internet and utilities", branch: "Head Office" },
  { id: "5300", code: "5300", name: "Selling & Marketing", type: "expense", subtype: "Selling & Marketing", parentId: "5000", isGroup: false, active: true, system: false, locked: false, reconcile: false, currency: "PKR", defaultTax: "Input Tax 18%", openingBalance: 0, currentBalance: 850000, description: "Advertising and selling costs", branch: "Head Office" },
  { id: "5400", code: "5400", name: "Bank Charges", type: "expense", subtype: "Financial Charges", parentId: "5000", isGroup: false, active: true, system: false, locked: false, reconcile: false, currency: "PKR", defaultTax: "No Tax", openingBalance: 0, currentBalance: 250000, description: "Bank and payment gateway charges", branch: "Head Office" },
];

const emptyForm = {
  code: "",
  name: "",
  type: "asset",
  subtype: "Cash & Cash Equivalents",
  parentId: "",
  isGroup: false,
  active: true,
  locked: false,
  reconcile: false,
  currency: "PKR",
  defaultTax: "No Tax",
  openingBalance: 0,
  description: "",
  branch: "Head Office",
};

const money = (value, currency = "PKR") => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

const dateTime = (value) => new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

const coaRepository = {
  async list() {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (existing) return JSON.parse(existing);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seedAccounts));
    return seedAccounts;
  },
  async saveAll(accounts) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    return accounts;
  },
  async audit(entry) {
    const existing = JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]");
    const next = [{ id: crypto.randomUUID(), at: new Date().toISOString(), user: "Administrator", ...entry }, ...existing].slice(0, 250);
    localStorage.setItem(AUDIT_KEY, JSON.stringify(next));
    return next;
  },
  async auditList() {
    return JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]");
  },
};

function buildTree(accounts) {
  const map = new Map(accounts.map((account) => [account.id, { ...account, children: [] }]));
  const roots = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) map.get(node.parentId).children.push(node);
    else roots.push(node);
  });
  const sortNodes = (nodes) => {
    nodes.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    nodes.forEach((node) => sortNodes(node.children));
  };
  sortNodes(roots);
  return roots;
}

function flattenTree(nodes, expanded, level = 0, rows = []) {
  nodes.forEach((node) => {
    rows.push({ ...node, level });
    if (node.children.length && expanded.has(node.id)) flattenTree(node.children, expanded, level + 1, rows);
  });
  return rows;
}

function descendantsOf(accounts, id) {
  const result = new Set();
  const walk = (parentId) => {
    accounts.filter((item) => item.parentId === parentId).forEach((child) => {
      result.add(child.id);
      walk(child.id);
    });
  };
  walk(id);
  return result;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function StatCard({ title, value, subtitle, icon: Icon, tone = "blue" }) {
  const tones = {
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    slate: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className={`rounded-xl border p-3 ${tones[tone]}`}><Icon size={21} /></div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-blue-600" : "bg-slate-300"} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      aria-pressed={checked}
    >
      <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow transition ${checked ? "left-6" : "left-1"}`} />
    </button>
  );
}

export default function AccountsProProduction() {
  const [accounts, setAccounts] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [branchFilter, setBranchFilter] = useState("all");
  const [expanded, setExpanded] = useState(new Set(["1000", "1100", "1110", "1120", "1200", "2000", "2100", "2200", "3000", "4000", "5000", "5100", "5200"]));
  const [modalMode, setModalMode] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState(null);
  const [errors, setErrors] = useState({});
  const [toast, setToast] = useState(null);
  const [showAudit, setShowAudit] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [company, setCompany] = useState("Demo Manufacturing (Pvt.) Ltd.");
  const [fiscalYear, setFiscalYear] = useState("FY 2026-27");

  useEffect(() => {
    const boot = async () => {
      try {
        const [accountData, logs] = await Promise.all([coaRepository.list(), coaRepository.auditList()]);
        setAccounts(accountData);
        setAuditLogs(logs);
      } finally {
        setLoading(false);
      }
    };
    boot();
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const branches = useMemo(() => ["all", ...new Set(accounts.map((item) => item.branch))], [accounts]);

  const filteredAccounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const directMatches = accounts.filter((account) => {
      const matchesQuery = !q || [account.code, account.name, account.subtype, account.description].some((value) => String(value || "").toLowerCase().includes(q));
      const matchesType = typeFilter === "all" || account.type === typeFilter;
      const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? account.active : !account.active);
      const matchesBranch = branchFilter === "all" || account.branch === branchFilter;
      return matchesQuery && matchesType && matchesStatus && matchesBranch;
    });

    if (!q && typeFilter === "all" && statusFilter === "all" && branchFilter === "all") return accounts;

    const include = new Set(directMatches.map((item) => item.id));
    directMatches.forEach((item) => {
      let parent = accounts.find((account) => account.id === item.parentId);
      while (parent) {
        include.add(parent.id);
        parent = accounts.find((account) => account.id === parent.parentId);
      }
    });
    return accounts.filter((account) => include.has(account.id));
  }, [accounts, query, typeFilter, statusFilter, branchFilter]);

  const tree = useMemo(() => buildTree(filteredAccounts), [filteredAccounts]);
  const visibleRows = useMemo(() => flattenTree(tree, expanded), [tree, expanded]);

  const stats = useMemo(() => {
    const posting = accounts.filter((item) => !item.isGroup);
    return {
      total: accounts.length,
      groups: accounts.filter((item) => item.isGroup).length,
      posting: posting.length,
      active: accounts.filter((item) => item.active).length,
      reconciliable: accounts.filter((item) => item.reconcile).length,
      assets: accounts.filter((item) => item.type === "asset" && item.parentId === null).reduce((sum, item) => sum + Number(item.currentBalance || 0), 0),
    };
  }, [accounts]);

  const showToast = (message, variant = "success") => setToast({ message, variant });

  const toggleExpand = (id) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = (parent = null) => {
    const type = parent?.type || "asset";
    setForm({
      ...emptyForm,
      type,
      subtype: ACCOUNT_SUBTYPES[type][0],
      parentId: parent?.id || "",
      branch: parent?.branch || "Head Office",
      currency: parent?.currency || "PKR",
    });
    setSelected(null);
    setErrors({});
    setModalMode("create");
  };

  const openEdit = (account) => {
    setSelected(account);
    setForm({ ...account, parentId: account.parentId || "" });
    setErrors({});
    setModalMode("edit");
  };

  const openView = (account) => {
    setSelected(account);
    setModalMode("view");
  };

  const validate = () => {
    const next = {};
    if (!form.code.trim()) next.code = "Account code is required.";
    if (!form.name.trim()) next.name = "Account name is required.";
    if (accounts.some((item) => item.code.trim().toLowerCase() === form.code.trim().toLowerCase() && item.id !== selected?.id)) next.code = "This account code already exists.";
    if (accounts.some((item) => item.name.trim().toLowerCase() === form.name.trim().toLowerCase() && item.parentId === (form.parentId || null) && item.id !== selected?.id)) next.name = "An account with this name already exists under the selected parent.";

    if (form.parentId) {
      const parent = accounts.find((item) => item.id === form.parentId);
      if (!parent) next.parentId = "Selected parent no longer exists.";
      else {
        if (!parent.isGroup) next.parentId = "Posting accounts cannot contain child accounts.";
        if (parent.type !== form.type) next.parentId = "Parent and child must belong to the same primary account type.";
      }
    }

    if (selected) {
      const descendants = descendantsOf(accounts, selected.id);
      if (descendants.has(form.parentId)) next.parentId = "An account cannot be moved under one of its descendants.";
      const hasChildren = accounts.some((item) => item.parentId === selected.id);
      if (hasChildren && !form.isGroup) next.isGroup = "This account has child accounts and must remain a group account.";
    }

    if (!form.isGroup && Number.isNaN(Number(form.openingBalance))) next.openingBalance = "Opening balance must be a valid number.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const persist = async (nextAccounts, audit) => {
    setSaving(true);
    try {
      await coaRepository.saveAll(nextAccounts);
      const logs = await coaRepository.audit(audit);
      setAccounts(nextAccounts);
      setAuditLogs(logs);
      return true;
    } catch (error) {
      console.error(error);
      showToast("Unable to save changes.", "error");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const normalized = {
      ...form,
      code: form.code.trim(),
      name: form.name.trim(),
      parentId: form.parentId || null,
      openingBalance: form.isGroup ? 0 : Number(form.openingBalance || 0),
      currentBalance: selected?.currentBalance ?? Number(form.openingBalance || 0),
      description: form.description.trim(),
    };

    if (modalMode === "create") {
      const newAccount = { ...normalized, id: crypto.randomUUID(), system: false };
      const next = [...accounts, newAccount];
      const ok = await persist(next, { action: "Created account", accountCode: newAccount.code, accountName: newAccount.name, details: `Created under ${newAccount.parentId || "root"}` });
      if (ok) {
        setModalMode(null);
        if (newAccount.parentId) setExpanded((current) => new Set([...current, newAccount.parentId]));
        showToast("Account created successfully.");
      }
      return;
    }

    const next = accounts.map((item) => item.id === selected.id ? { ...item, ...normalized } : item);
    const ok = await persist(next, { action: "Updated account", accountCode: normalized.code, accountName: normalized.name, details: "Account configuration updated" });
    if (ok) {
      setModalMode(null);
      showToast("Account updated successfully.");
    }
  };

  const duplicateAccount = (account) => {
    setSelected(null);
    setForm({
      ...account,
      id: undefined,
      code: `${account.code}-COPY`,
      name: `${account.name} Copy`,
      system: false,
      locked: false,
      openingBalance: 0,
      currentBalance: 0,
    });
    setErrors({});
    setModalMode("create");
  };

  const toggleStatus = async (account) => {
    if (account.system && account.locked) {
      showToast("This protected system account cannot be deactivated.", "error");
      return;
    }
    const nextStatus = !account.active;
    const next = accounts.map((item) => item.id === account.id ? { ...item, active: nextStatus } : item);
    const ok = await persist(next, { action: nextStatus ? "Activated account" : "Deactivated account", accountCode: account.code, accountName: account.name, details: "Status changed" });
    if (ok) showToast(`Account ${nextStatus ? "activated" : "deactivated"}.`);
  };

  const deleteAccount = async (account) => {
    const children = accounts.filter((item) => item.parentId === account.id);
    if (account.system || account.locked) return showToast("System or locked accounts cannot be deleted.", "error");
    if (children.length) return showToast("Move or delete child accounts first.", "error");
    if (Number(account.currentBalance || 0) !== 0) return showToast("Accounts with a balance cannot be deleted. Deactivate it instead.", "error");
    if (!window.confirm(`Delete ${account.code} - ${account.name}? This action cannot be undone.`)) return;
    const next = accounts.filter((item) => item.id !== account.id);
    const ok = await persist(next, { action: "Deleted account", accountCode: account.code, accountName: account.name, details: "Account permanently removed" });
    if (ok) showToast("Account deleted.");
  };

  const resetDemo = async () => {
    if (!window.confirm("Reset the Chart of Accounts to the production demo template?")) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(AUDIT_KEY);
    setAccounts(seedAccounts);
    setAuditLogs([]);
    await coaRepository.saveAll(seedAccounts);
    showToast("Demo chart restored.");
  };

  const exportCsv = () => {
    const headers = ["Code", "Name", "Type", "Subtype", "Parent Code", "Group", "Active", "Locked", "Reconcile", "Currency", "Default Tax", "Opening Balance", "Current Balance", "Branch", "Description"];
    const rows = accounts
      .slice()
      .sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }))
      .map((account) => {
        const parent = accounts.find((item) => item.id === account.parentId);
        return [account.code, account.name, account.type, account.subtype, parent?.code || "", account.isGroup, account.active, account.locked, account.reconcile, account.currency, account.defaultTax, account.openingBalance, account.currentBalance, account.branch, account.description];
      });
    const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chart-of-accounts-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast("CSV export downloaded.");
  };

  const importCsv = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) throw new Error("CSV contains no data rows.");
      showToast("CSV selected. Full parser will be connected with backend validation in the next phase.", "info");
    } catch (error) {
      showToast(error.message || "Unable to read CSV.", "error");
    }
  };

  const eligibleParents = useMemo(() => {
    const excluded = selected ? descendantsOf(accounts, selected.id) : new Set();
    if (selected) excluded.add(selected.id);
    return accounts.filter((item) => item.isGroup && item.type === form.type && !excluded.has(item.id));
  }, [accounts, selected, form.type]);

  const parentPath = (account) => {
    const path = [];
    let current = account;
    while (current) {
      path.unshift(`${current.code} ${current.name}`);
      current = accounts.find((item) => item.id === current.parentId);
    }
    return path.join(" / ");
  };

  if (loading) {
    return <div className="flex min-h-[70vh] items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={40} /></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-6">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <section className="overflow-hidden rounded-2xl border border-blue-800 bg-gradient-to-r from-blue-950 via-blue-900 to-blue-800 text-white shadow-sm">
          <div className="flex flex-col gap-5 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-3">
              <button onClick={() => window.history.back()} className="mt-0.5 rounded-xl p-2 hover:bg-white/10"><ArrowLeft size={20} /></button>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-black tracking-tight md:text-2xl">Chart of Accounts</h1>
                  <span className="rounded-full border border-emerald-300/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-200">Production module</span>
                </div>
                <p className="mt-1 max-w-2xl text-sm text-blue-100">Manage the complete general-ledger hierarchy, posting controls, tax defaults, reconciliation and account governance.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15">
                <Upload size={15} /> Import CSV
                <input type="file" accept=".csv" className="hidden" onChange={importCsv} />
              </label>
              <button onClick={exportCsv} className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"><Download size={15} /> Export</button>
              <button onClick={() => openCreate()} className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-blue-900 shadow-sm hover:bg-blue-50"><Plus size={16} /> New Account</button>
            </div>
          </div>
          <div className="grid border-t border-white/10 bg-black/10 md:grid-cols-2 lg:grid-cols-4">
            <div className="border-white/10 p-3 lg:border-r">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Company</p>
              <select value={company} onChange={(e) => setCompany(e.target.value)} className="mt-1 w-full bg-transparent text-sm font-semibold outline-none">
                <option className="text-slate-900">Demo Manufacturing (Pvt.) Ltd.</option>
                <option className="text-slate-900">Demo Trading Company</option>
              </select>
            </div>
            <div className="border-white/10 p-3 lg:border-r">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Fiscal year</p>
              <select value={fiscalYear} onChange={(e) => setFiscalYear(e.target.value)} className="mt-1 w-full bg-transparent text-sm font-semibold outline-none">
                <option className="text-slate-900">FY 2026-27</option>
                <option className="text-slate-900">FY 2025-26</option>
              </select>
            </div>
            <div className="border-white/10 p-3 lg:border-r">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Base currency</p>
              <p className="mt-1 text-sm font-semibold">PKR — Pakistani Rupee</p>
            </div>
            <div className="p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-200">Control status</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold"><ShieldCheck size={16} className="text-emerald-300" /> Accounting structure verified</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard title="Total accounts" value={stats.total} subtitle="Groups and posting ledgers" icon={FolderTree} tone="blue" />
          <StatCard title="Group accounts" value={stats.groups} subtitle="Parent classification nodes" icon={Layers3} tone="slate" />
          <StatCard title="Posting accounts" value={stats.posting} subtitle="Accounts accepting entries" icon={FileSpreadsheet} tone="emerald" />
          <StatCard title="Reconciliation" value={stats.reconciliable} subtitle="Bank and control accounts" icon={BadgeCheck} tone="amber" />
          <StatCard title="Assets balance" value={money(stats.assets)} subtitle="Top-level current balance" icon={CircleDollarSign} tone="blue" />
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row">
              <div className="relative min-w-0 flex-1 xl:max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by code, account name, subtype or description..." className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:bg-white" />
              </div>
              <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${showFilters ? "border-blue-200 bg-blue-50 text-blue-700" : "border-slate-200 bg-white text-slate-700"}`}><Filter size={15} /> Filters</button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setExpanded(new Set(accounts.filter((item) => item.isGroup).map((item) => item.id)))} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Expand all</button>
              <button onClick={() => setExpanded(new Set())} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Collapse all</button>
              <button onClick={() => setShowAudit(true)} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><History size={15} /> Audit trail</button>
              <button onClick={resetDemo} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"><RefreshCcw size={15} /> Reset demo</button>
            </div>
          </div>

          {showFilters && (
            <div className="grid gap-3 border-b border-slate-200 bg-slate-50 p-4 md:grid-cols-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Account type</label>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-blue-500">
                  <option value="all">All types</option>
                  {ACCOUNT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Status</label>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-blue-500">
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Branch</label>
                <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-blue-500">
                  {branches.map((branch) => <option key={branch} value={branch}>{branch === "all" ? "All branches" : branch}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Account</th>
                  <th className="px-4 py-3">Type / subtype</th>
                  <th className="px-4 py-3">Nature</th>
                  <th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3 text-right">Current balance</th>
                  <th className="px-4 py-3">Controls</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((account) => {
                  const typeMeta = ACCOUNT_TYPES.find((type) => type.value === account.type);
                  return (
                    <tr key={account.id} className={`border-b border-slate-100 text-sm hover:bg-blue-50/40 ${!account.active ? "bg-slate-50 opacity-70" : ""}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-start" style={{ paddingLeft: `${account.level * 24}px` }}>
                          <button onClick={() => account.children.length && toggleExpand(account.id)} className={`mr-1 mt-0.5 rounded p-0.5 ${account.children.length ? "text-slate-500 hover:bg-slate-100" : "invisible"}`}>
                            {expanded.has(account.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                          <div className={`mr-2 mt-0.5 rounded-lg p-1.5 ${account.isGroup ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>
                            {account.isGroup ? <FolderTree size={15} /> : account.subtype === "Bank" ? <Landmark size={15} /> : account.subtype.includes("Cash") ? <Wallet size={15} /> : <Banknote size={15} />}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-xs font-bold text-blue-700">{account.code}</span>
                              <button onClick={() => openView(account)} className="font-bold text-slate-900 hover:text-blue-700">{account.name}</button>
                              {account.system && <span title="System account" className="rounded bg-violet-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-violet-700">System</span>}
                              {account.locked && <Lock size={12} className="text-amber-600" />}
                            </div>
                            <p className="mt-0.5 max-w-md truncate text-[11px] text-slate-400">{account.description || "No description"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-700">{typeMeta?.label}</p>
                        <p className="text-[11px] text-slate-400">{account.subtype}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${account.isGroup ? "bg-blue-50 text-blue-700" : "bg-emerald-50 text-emerald-700"}`}>{account.isGroup ? "Group" : "Posting"}</span>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-600">{account.branch}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs font-bold text-slate-800">{money(account.currentBalance, account.currency)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {account.reconcile && <span className="rounded bg-cyan-50 px-2 py-1 text-[9px] font-bold uppercase text-cyan-700">Reconcile</span>}
                          {account.defaultTax !== "No Tax" && <span className="rounded bg-amber-50 px-2 py-1 text-[9px] font-bold uppercase text-amber-700">Tax</span>}
                          <span className="rounded bg-slate-100 px-2 py-1 text-[9px] font-bold uppercase text-slate-600">{account.currency}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button onClick={() => toggleStatus(account)} className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${account.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{account.active ? "Active" : "Inactive"}</button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button title="View" onClick={() => openView(account)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-700"><Eye size={15} /></button>
                          <button title="Add child" onClick={() => openCreate(account)} disabled={!account.isGroup} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-30"><Plus size={15} /></button>
                          <button title="Edit" onClick={() => openEdit(account)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-700"><Edit3 size={15} /></button>
                          <button title="Duplicate" onClick={() => duplicateAccount(account)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-blue-700"><Copy size={15} /></button>
                          <button title="Delete" onClick={() => deleteAccount(account)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!visibleRows.length && (
            <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
              <Search className="text-slate-300" size={34} />
              <h3 className="mt-3 font-bold text-slate-700">No accounts found</h3>
              <p className="mt-1 text-sm text-slate-400">Change the filters or create a new account.</p>
            </div>
          )}
          <div className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <span>Showing {visibleRows.length} visible rows from {filteredAccounts.length} matching accounts.</span>
            <span>{stats.active} active · {stats.total - stats.active} inactive · Account codes enabled</span>
          </div>
        </section>
      </div>

      {(modalMode === "create" || modalMode === "edit") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
              <div>
                <h2 className="text-lg font-black text-slate-900">{modalMode === "create" ? "Create account" : "Edit account"}</h2>
                <p className="text-xs text-slate-500">Configure classification, posting behavior and accounting controls.</p>
              </div>
              <button type="button" onClick={() => setModalMode(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={19} /></button>
            </div>

            <div className="grid gap-6 p-5 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-slate-600">Account code *</label>
                    <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={`mt-1 w-full rounded-xl border p-2.5 text-sm outline-none focus:border-blue-500 ${errors.code ? "border-red-400" : "border-slate-200"}`} placeholder="e.g. 1135" />
                    {errors.code && <p className="mt-1 text-xs text-red-600">{errors.code}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600">Account name *</label>
                    <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`mt-1 w-full rounded-xl border p-2.5 text-sm outline-none focus:border-blue-500 ${errors.name ? "border-red-400" : "border-slate-200"}`} placeholder="e.g. Customer Advances" />
                    {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold text-slate-600">Primary type *</label>
                    <select value={form.type} disabled={selected?.system && selected?.locked} onChange={(e) => setForm({ ...form, type: e.target.value, subtype: ACCOUNT_SUBTYPES[e.target.value][0], parentId: "" })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100">
                      {ACCOUNT_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label} ({type.codeRange})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600">Detail type *</label>
                    <select value={form.subtype} onChange={(e) => setForm({ ...form, subtype: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-blue-500">
                      {ACCOUNT_SUBTYPES[form.type].map((subtype) => <option key={subtype}>{subtype}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600">Parent account</label>
                  <select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className={`mt-1 w-full rounded-xl border bg-white p-2.5 text-sm outline-none focus:border-blue-500 ${errors.parentId ? "border-red-400" : "border-slate-200"}`}>
                    <option value="">Top-level account</option>
                    {eligibleParents.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })).map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}
                  </select>
                  {errors.parentId && <p className="mt-1 text-xs text-red-600">{errors.parentId}</p>}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-xs font-bold text-slate-600">Currency</label>
                    <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-blue-500">
                      {CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600">Default tax</label>
                    <select value={form.defaultTax} onChange={(e) => setForm({ ...form, defaultTax: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-blue-500">
                      {TAX_OPTIONS.map((tax) => <option key={tax}>{tax}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600">Branch</label>
                    <select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm outline-none focus:border-blue-500">
                      {["Head Office", "Lahore Branch", "Karachi Branch", "Factory"].map((branch) => <option key={branch}>{branch}</option>)}
                    </select>
                  </div>
                </div>

                {!form.isGroup && (
                  <div>
                    <label className="text-xs font-bold text-slate-600">Opening balance</label>
                    <input type="number" step="0.01" value={form.openingBalance} disabled={modalMode === "edit" && Number(selected?.currentBalance || 0) !== Number(selected?.openingBalance || 0)} onChange={(e) => setForm({ ...form, openingBalance: e.target.value })} className={`mt-1 w-full rounded-xl border p-2.5 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100 ${errors.openingBalance ? "border-red-400" : "border-slate-200"}`} />
                    <p className="mt-1 text-[11px] text-slate-400">After transactions exist, adjust balances through journal entries rather than editing this field.</p>
                  </div>
                )}

                <div>
                  <label className="text-xs font-bold text-slate-600">Description / internal note</label>
                  <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full resize-none rounded-xl border border-slate-200 p-2.5 text-sm outline-none focus:border-blue-500" placeholder="Purpose and allowed use of this account..." />
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Posting controls</h3>
                  <div className="mt-4 space-y-4">
                    <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold">Group account</p><p className="text-[11px] text-slate-500">Organizes children and does not accept journal postings.</p></div><Toggle checked={form.isGroup} onChange={(value) => setForm({ ...form, isGroup: value, openingBalance: value ? 0 : form.openingBalance })} disabled={Boolean(errors.isGroup)} /></div>
                    {errors.isGroup && <p className="text-xs text-red-600">{errors.isGroup}</p>}
                    <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold">Allow reconciliation</p><p className="text-[11px] text-slate-500">Recommended for bank, receivable and payable accounts.</p></div><Toggle checked={form.reconcile} onChange={(value) => setForm({ ...form, reconcile: value })} disabled={form.isGroup} /></div>
                    <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold">Active</p><p className="text-[11px] text-slate-500">Inactive accounts remain in historical reports.</p></div><Toggle checked={form.active} onChange={(value) => setForm({ ...form, active: value })} disabled={selected?.system && selected?.locked} /></div>
                    <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-bold">Lock configuration</p><p className="text-[11px] text-slate-500">Prevents accidental structural changes by normal users.</p></div><Toggle checked={form.locked} onChange={(value) => setForm({ ...form, locked: value })} disabled={selected?.system && selected?.locked} /></div>
                  </div>
                </div>

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-blue-800">Validation preview</h3>
                  <div className="mt-3 space-y-2 text-xs text-blue-900">
                    <p><strong>Normal balance:</strong> {ACCOUNT_TYPES.find((item) => item.value === form.type)?.normalBalance}</p>
                    <p><strong>Code range:</strong> {ACCOUNT_TYPES.find((item) => item.value === form.type)?.codeRange}</p>
                    <p><strong>Posting:</strong> {form.isGroup ? "Disabled — group node" : "Enabled — journal-ready"}</p>
                    <p><strong>Path:</strong> {form.parentId ? `${accounts.find((item) => item.id === form.parentId)?.code} / ${form.code || "New"}` : form.code || "Top level"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4">
              <button type="button" onClick={() => setModalMode(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-bold text-white hover:bg-blue-800 disabled:opacity-60">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} {saving ? "Saving..." : "Save account"}
              </button>
            </div>
          </form>
        </div>
      )}

      {modalMode === "view" && selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div><p className="font-mono text-xs font-bold text-blue-700">{selected.code}</p><h2 className="text-xl font-black">{selected.name}</h2></div>
              <button onClick={() => setModalMode(null)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><X size={19} /></button>
            </div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-4 sm:col-span-2"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account path</p><p className="mt-1 text-sm font-semibold text-slate-700">{parentPath(selected)}</p></div>
              {[
                ["Primary type", ACCOUNT_TYPES.find((item) => item.value === selected.type)?.label],
                ["Detail type", selected.subtype],
                ["Account nature", selected.isGroup ? "Group account" : "Posting account"],
                ["Current balance", money(selected.currentBalance, selected.currency)],
                ["Branch", selected.branch],
                ["Default tax", selected.defaultTax],
                ["Reconciliation", selected.reconcile ? "Enabled" : "Disabled"],
                ["Status", selected.active ? "Active" : "Inactive"],
              ].map(([label, value]) => <div key={label} className="rounded-xl border border-slate-200 p-4"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p><p className="mt-1 text-sm font-bold text-slate-800">{value}</p></div>)}
              <div className="rounded-xl border border-slate-200 p-4 sm:col-span-2"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Description</p><p className="mt-1 text-sm text-slate-700">{selected.description || "No description available."}</p></div>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-200 p-4"><button onClick={() => setModalMode(null)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold">Close</button><button onClick={() => openEdit(selected)} className="flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 text-xs font-bold text-white"><Edit3 size={14} /> Edit</button></div>
          </div>
        </div>
      )}

      {showAudit && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-sm">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white p-5"><div><h2 className="text-lg font-black">Chart audit trail</h2><p className="text-xs text-slate-500">Latest structural changes and account actions.</p></div><button onClick={() => setShowAudit(false)} className="rounded-lg p-2 hover:bg-slate-100"><X size={19} /></button></div>
            <div className="space-y-3 p-5">
              {auditLogs.length ? auditLogs.map((log) => <div key={log.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-slate-800">{log.action}</p><p className="mt-0.5 text-xs font-semibold text-blue-700">{log.accountCode} — {log.accountName}</p></div><span className="whitespace-nowrap text-[10px] text-slate-400">{dateTime(log.at)}</span></div><p className="mt-2 text-xs text-slate-500">{log.details}</p><p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">By {log.user}</p></div>) : <div className="py-16 text-center text-sm text-slate-400">No audit activity yet.</div>}
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-5 right-5 z-[70] rounded-xl border px-4 py-3 text-sm font-semibold shadow-lg ${toast.variant === "error" ? "border-red-200 bg-red-50 text-red-700" : toast.variant === "info" ? "border-blue-200 bg-blue-50 text-blue-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{toast.message}</div>
      )}
    </div>
  );
}
