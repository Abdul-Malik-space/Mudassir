import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Download,
  Edit3,
  Eye,
  FileBarChart,
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
  Scale,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Upload,
  Wallet,
  X,
} from "lucide-react";
import { API_BASE_URL } from "../config/api";

/*
  Enterprise Accounting Workspace
  --------------------------------
  - No localStorage/sessionStorage usage.
  - Responsive: horizontal scrolling is contained inside data grids only.
  - API-ready for Node.js + Express + MongoDB.
  - DEMO_MODE can remain true until the backend endpoints are implemented.
*/

const DEMO_MODE = true;

const ACCOUNT_TYPES = {
  asset: { label: "Assets", normal: "debit", range: "1000–1999" },
  liability: { label: "Liabilities", normal: "credit", range: "2000–2999" },
  equity: { label: "Equity", normal: "credit", range: "3000–3999" },
  income: { label: "Income", normal: "credit", range: "4000–4999" },
  expense: { label: "Expenses", normal: "debit", range: "5000–6999" },
};

const SUBTYPES = {
  asset: ["Cash & Cash Equivalents", "Bank", "Accounts Receivable", "Inventory", "Prepayments", "Fixed Assets", "Accumulated Depreciation", "Other Current Assets"],
  liability: ["Accounts Payable", "Tax Payable", "Payroll Payable", "Accrued Liabilities", "Short-term Loan", "Long-term Loan", "Lease Liability"],
  equity: ["Owner Capital", "Share Capital", "Drawings", "Retained Earnings", "Current Year Earnings"],
  income: ["Sales Revenue", "Service Revenue", "Commission Income", "Other Income"],
  expense: ["Cost of Goods Sold", "Payroll Expense", "Administrative Expense", "Selling & Marketing", "Utilities", "Depreciation", "Financial Charges"],
};

const REPORT_TABS = [
  { id: "coa", label: "Chart of Accounts", icon: FolderTree },
  { id: "trial", label: "Trial Balance", icon: Scale },
  { id: "profit-loss", label: "Profit & Loss", icon: BarChart3 },
  { id: "balance-sheet", label: "Balance Sheet", icon: FileBarChart },
  { id: "ledger", label: "General Ledger", icon: BookOpen },
];

const DEMO_ACCOUNTS = [
  { id: "1000", code: "1000", name: "Assets", type: "asset", subtype: "Other Current Assets", parentId: null, isGroup: true, active: true, locked: true, system: true, reconcile: false, branch: "All Branches", currency: "PKR", openingDebit: 0, openingCredit: 0, periodDebit: 12850000, periodCredit: 0, currentBalance: 12850000 },
  { id: "1100", code: "1100", name: "Current Assets", type: "asset", subtype: "Other Current Assets", parentId: "1000", isGroup: true, active: true, locked: false, system: true, reconcile: false, branch: "All Branches", currency: "PKR", openingDebit: 0, openingCredit: 0, periodDebit: 6800000, periodCredit: 0, currentBalance: 6800000 },
  { id: "1110", code: "1110", name: "Cash & Cash Equivalents", type: "asset", subtype: "Cash & Cash Equivalents", parentId: "1100", isGroup: true, active: true, locked: false, system: false, reconcile: false, branch: "All Branches", currency: "PKR", openingDebit: 0, openingCredit: 0, periodDebit: 1750000, periodCredit: 0, currentBalance: 1750000 },
  { id: "1111", code: "1111", name: "Cash in Hand", type: "asset", subtype: "Cash & Cash Equivalents", parentId: "1110", isGroup: false, active: true, locked: false, system: true, reconcile: false, branch: "Head Office", currency: "PKR", openingDebit: 250000, openingCredit: 0, periodDebit: 420000, periodCredit: 245000, currentBalance: 425000 },
  { id: "1112", code: "1112", name: "Petty Cash", type: "asset", subtype: "Cash & Cash Equivalents", parentId: "1110", isGroup: false, active: true, locked: false, system: false, reconcile: false, branch: "Head Office", currency: "PKR", openingDebit: 50000, openingCredit: 0, periodDebit: 90000, periodCredit: 65000, currentBalance: 75000 },
  { id: "1120", code: "1120", name: "Bank Accounts", type: "asset", subtype: "Bank", parentId: "1100", isGroup: true, active: true, locked: false, system: false, reconcile: false, branch: "All Branches", currency: "PKR", openingDebit: 0, openingCredit: 0, periodDebit: 1250000, periodCredit: 0, currentBalance: 1250000 },
  { id: "1121", code: "1121", name: "Meezan Bank — Current", type: "asset", subtype: "Bank", parentId: "1120", isGroup: false, active: true, locked: false, system: false, reconcile: true, branch: "Head Office", currency: "PKR", openingDebit: 500000, openingCredit: 0, periodDebit: 2800000, periodCredit: 2475000, currentBalance: 825000 },
  { id: "1122", code: "1122", name: "HBL — Current", type: "asset", subtype: "Bank", parentId: "1120", isGroup: false, active: true, locked: false, system: false, reconcile: true, branch: "Lahore Branch", currency: "PKR", openingDebit: 300000, openingCredit: 0, periodDebit: 1550000, periodCredit: 1425000, currentBalance: 425000 },
  { id: "1130", code: "1130", name: "Accounts Receivable", type: "asset", subtype: "Accounts Receivable", parentId: "1100", isGroup: false, active: true, locked: true, system: true, reconcile: true, branch: "All Branches", currency: "PKR", openingDebit: 900000, openingCredit: 0, periodDebit: 6400000, periodCredit: 4400000, currentBalance: 2900000 },
  { id: "1140", code: "1140", name: "Inventory", type: "asset", subtype: "Inventory", parentId: "1100", isGroup: false, active: true, locked: false, system: true, reconcile: false, branch: "Factory", currency: "PKR", openingDebit: 280000, openingCredit: 0, periodDebit: 1550000, periodCredit: 1430000, currentBalance: 400000 },
  { id: "1200", code: "1200", name: "Fixed Assets", type: "asset", subtype: "Fixed Assets", parentId: "1000", isGroup: true, active: true, locked: false, system: true, reconcile: false, branch: "All Branches", currency: "PKR", openingDebit: 0, openingCredit: 0, periodDebit: 6050000, periodCredit: 0, currentBalance: 6050000 },
  { id: "1210", code: "1210", name: "Plant & Machinery", type: "asset", subtype: "Fixed Assets", parentId: "1200", isGroup: false, active: true, locked: false, system: false, reconcile: false, branch: "Factory", currency: "PKR", openingDebit: 5000000, openingCredit: 0, periodDebit: 0, periodCredit: 0, currentBalance: 5000000 },
  { id: "1290", code: "1290", name: "Accumulated Depreciation", type: "asset", subtype: "Accumulated Depreciation", parentId: "1200", isGroup: false, active: true, locked: false, system: false, reconcile: false, branch: "All Branches", currency: "PKR", openingDebit: 0, openingCredit: 850000, periodDebit: 0, periodCredit: 100000, currentBalance: -950000 },
  { id: "2000", code: "2000", name: "Liabilities", type: "liability", subtype: "Accrued Liabilities", parentId: null, isGroup: true, active: true, locked: true, system: true, reconcile: false, branch: "All Branches", currency: "PKR", openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 5200000, currentBalance: 5200000 },
  { id: "2100", code: "2100", name: "Current Liabilities", type: "liability", subtype: "Accrued Liabilities", parentId: "2000", isGroup: true, active: true, locked: false, system: true, reconcile: false, branch: "All Branches", currency: "PKR", openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 3700000, currentBalance: 3700000 },
  { id: "2110", code: "2110", name: "Accounts Payable", type: "liability", subtype: "Accounts Payable", parentId: "2100", isGroup: false, active: true, locked: true, system: true, reconcile: true, branch: "All Branches", currency: "PKR", openingDebit: 0, openingCredit: 700000, periodDebit: 3500000, periodCredit: 5200000, currentBalance: 2400000 },
  { id: "2120", code: "2120", name: "Sales Tax Payable", type: "liability", subtype: "Tax Payable", parentId: "2100", isGroup: false, active: true, locked: true, system: true, reconcile: false, branch: "Head Office", currency: "PKR", openingDebit: 0, openingCredit: 125000, periodDebit: 500000, periodCredit: 1050000, currentBalance: 675000 },
  { id: "2130", code: "2130", name: "Salary Payable", type: "liability", subtype: "Payroll Payable", parentId: "2100", isGroup: false, active: true, locked: false, system: false, reconcile: true, branch: "Head Office", currency: "PKR", openingDebit: 0, openingCredit: 0, periodDebit: 775000, periodCredit: 1400000, currentBalance: 625000 },
  { id: "2200", code: "2200", name: "Long-term Liabilities", type: "liability", subtype: "Long-term Loan", parentId: "2000", isGroup: true, active: true, locked: false, system: false, reconcile: false, branch: "Head Office", currency: "PKR", openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 1500000, currentBalance: 1500000 },
  { id: "2210", code: "2210", name: "Bank Loan", type: "liability", subtype: "Long-term Loan", parentId: "2200", isGroup: false, active: true, locked: false, system: false, reconcile: true, branch: "Head Office", currency: "PKR", openingDebit: 0, openingCredit: 2000000, periodDebit: 500000, periodCredit: 0, currentBalance: 1500000 },
  { id: "3000", code: "3000", name: "Equity", type: "equity", subtype: "Owner Capital", parentId: null, isGroup: true, active: true, locked: true, system: true, reconcile: false, branch: "All Branches", currency: "PKR", openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 7650000, currentBalance: 7650000 },
  { id: "3100", code: "3100", name: "Owner Capital", type: "equity", subtype: "Owner Capital", parentId: "3000", isGroup: false, active: true, locked: true, system: true, reconcile: false, branch: "Head Office", currency: "PKR", openingDebit: 0, openingCredit: 6000000, periodDebit: 0, periodCredit: 0, currentBalance: 6000000 },
  { id: "3200", code: "3200", name: "Retained Earnings", type: "equity", subtype: "Retained Earnings", parentId: "3000", isGroup: false, active: true, locked: true, system: true, reconcile: false, branch: "Head Office", currency: "PKR", openingDebit: 0, openingCredit: 1200000, periodDebit: 0, periodCredit: 450000, currentBalance: 1650000 },
  { id: "4000", code: "4000", name: "Income", type: "income", subtype: "Sales Revenue", parentId: null, isGroup: true, active: true, locked: true, system: true, reconcile: false, branch: "All Branches", currency: "PKR", openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 14900000, currentBalance: 14900000 },
  { id: "4100", code: "4100", name: "Sales Revenue", type: "income", subtype: "Sales Revenue", parentId: "4000", isGroup: false, active: true, locked: true, system: true, reconcile: false, branch: "All Branches", currency: "PKR", openingDebit: 0, openingCredit: 0, periodDebit: 125000, periodCredit: 13325000, currentBalance: 13200000 },
  { id: "4200", code: "4200", name: "Service Revenue", type: "income", subtype: "Service Revenue", parentId: "4000", isGroup: false, active: true, locked: false, system: false, reconcile: false, branch: "Head Office", currency: "PKR", openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 1700000, currentBalance: 1700000 },
  { id: "5000", code: "5000", name: "Expenses", type: "expense", subtype: "Administrative Expense", parentId: null, isGroup: true, active: true, locked: true, system: true, reconcile: false, branch: "All Branches", currency: "PKR", openingDebit: 0, openingCredit: 0, periodDebit: 8450000, periodCredit: 0, currentBalance: 8450000 },
  { id: "5100", code: "5100", name: "Cost of Goods Sold", type: "expense", subtype: "Cost of Goods Sold", parentId: "5000", isGroup: false, active: true, locked: false, system: true, reconcile: false, branch: "Factory", currency: "PKR", openingDebit: 0, openingCredit: 0, periodDebit: 4900000, periodCredit: 0, currentBalance: 4900000 },
  { id: "5210", code: "5210", name: "Salaries Expense", type: "expense", subtype: "Payroll Expense", parentId: "5000", isGroup: false, active: true, locked: false, system: false, reconcile: false, branch: "Head Office", currency: "PKR", openingDebit: 0, openingCredit: 0, periodDebit: 1400000, periodCredit: 0, currentBalance: 1400000 },
  { id: "5220", code: "5220", name: "Office Rent", type: "expense", subtype: "Administrative Expense", parentId: "5000", isGroup: false, active: true, locked: false, system: false, reconcile: false, branch: "Head Office", currency: "PKR", openingDebit: 0, openingCredit: 0, periodDebit: 650000, periodCredit: 0, currentBalance: 650000 },
  { id: "5230", code: "5230", name: "Utilities", type: "expense", subtype: "Utilities", parentId: "5000", isGroup: false, active: true, locked: false, system: false, reconcile: false, branch: "Head Office", currency: "PKR", openingDebit: 0, openingCredit: 0, periodDebit: 400000, periodCredit: 0, currentBalance: 400000 },
  { id: "5300", code: "5300", name: "Selling & Marketing", type: "expense", subtype: "Selling & Marketing", parentId: "5000", isGroup: false, active: true, locked: false, system: false, reconcile: false, branch: "Head Office", currency: "PKR", openingDebit: 0, openingCredit: 0, periodDebit: 850000, periodCredit: 0, currentBalance: 850000 },
  { id: "5400", code: "5400", name: "Bank Charges", type: "expense", subtype: "Financial Charges", parentId: "5000", isGroup: false, active: true, locked: false, system: false, reconcile: false, branch: "Head Office", currency: "PKR", openingDebit: 0, openingCredit: 0, periodDebit: 250000, periodCredit: 0, currentBalance: 250000 },
];

const emptyForm = {
  code: "",
  name: "",
  type: "asset",
  subtype: SUBTYPES.asset[0],
  parentId: "",
  isGroup: false,
  active: true,
  reconcile: false,
  branch: "Head Office",
  currency: "PKR",
  description: "",
};

const money = (value) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const number = (value) => new Intl.NumberFormat("en-PK", { maximumFractionDigits: 0 }).format(Math.abs(Number(value || 0)));

const accountingApi = {
  async listAccounts(params = {}) {
    if (DEMO_MODE) return DEMO_ACCOUNTS;
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE_URL}/accounting/chart-of-accounts?${query}`, { credentials: "include" });
    if (!response.ok) throw new Error("Unable to load chart of accounts");
    return response.json();
  },
  async createAccount(payload) {
    if (DEMO_MODE) return { ...payload, id: crypto.randomUUID(), currentBalance: 0, openingDebit: 0, openingCredit: 0, periodDebit: 0, periodCredit: 0, system: false, locked: false };
    const response = await fetch(`${API_BASE_URL}/accounting/chart-of-accounts`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Unable to create account");
    return response.json();
  },
  async updateAccount(id, payload) {
    if (DEMO_MODE) return { ...payload, id };
    const response = await fetch(`${API_BASE_URL}/accounting/chart-of-accounts/${id}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Unable to update account");
    return response.json();
  },
  async deleteAccount(id) {
    if (DEMO_MODE) return { id };
    const response = await fetch(`${API_BASE_URL}/accounting/chart-of-accounts/${id}`, { method: "DELETE", credentials: "include" });
    if (!response.ok) throw new Error("Unable to delete account");
    return response.json();
  },
};

function buildTree(accounts) {
  const map = new Map(accounts.map((item) => [item.id, { ...item, children: [] }]));
  const roots = [];
  map.forEach((node) => {
    if (node.parentId && map.has(node.parentId)) map.get(node.parentId).children.push(node);
    else roots.push(node);
  });
  const sort = (nodes) => {
    nodes.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    nodes.forEach((node) => sort(node.children));
  };
  sort(roots);
  return roots;
}

function flattenTree(nodes, expanded, level = 0, output = []) {
  nodes.forEach((node) => {
    output.push({ ...node, level });
    if (node.children.length && expanded.has(node.id)) flattenTree(node.children, expanded, level + 1, output);
  });
  return output;
}

function StatCard({ title, value, subtitle, icon: Icon, tone = "blue" }) {
  const tones = {
    blue: "border-blue-100 bg-blue-50 text-blue-700",
    emerald: "border-emerald-100 bg-emerald-50 text-emerald-700",
    amber: "border-amber-100 bg-amber-50 text-amber-700",
    violet: "border-violet-100 bg-violet-50 text-violet-700",
    slate: "border-slate-200 bg-slate-100 text-slate-700",
  };
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{title}</p>
          <p className="mt-2 truncate text-xl font-black text-slate-950 sm:text-2xl">{value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{subtitle}</p>
        </div>
        <div className={`shrink-0 rounded-xl border p-3 ${tones[tone]}`}><Icon size={20} /></div>
      </div>
    </div>
  );
}

function ReportToolbar({ period, setPeriod, branch, setBranch, onRefresh, loading }) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
          <CalendarDays size={15} className="text-slate-500" />
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="bg-transparent outline-none">
            <option>FY 2026–27</option><option>FY 2025–26</option><option>This Quarter</option><option>This Month</option>
          </select>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
          <Building2 size={15} className="text-slate-500" />
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className="bg-transparent outline-none">
            <option>All Branches</option><option>Head Office</option><option>Factory</option><option>Lahore Branch</option>
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={onRefresh} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50">
          <RefreshCcw size={14} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
        <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"><Download size={14} /> Export</button>
        <button className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800"><SlidersHorizontal size={14} /> Customize</button>
      </div>
    </div>
  );
}

function FinancialReport({ title, subtitle, sections, totalLabel, totalValue }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="divide-y divide-slate-100">
        {sections.map((section) => (
          <div key={section.label} className="p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-4">
              <h3 className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{section.label}</h3>
              <span className="text-sm font-black text-slate-900">{money(section.total)}</span>
            </div>
            <div className="space-y-2">
              {section.rows.map((row) => (
                <div key={row.code} className="flex items-center justify-between gap-4 rounded-xl px-3 py-2 text-sm hover:bg-slate-50">
                  <div className="min-w-0"><span className="mr-3 font-mono text-xs text-slate-400">{row.code}</span><span className="font-semibold text-slate-700">{row.name}</span></div>
                  <span className="shrink-0 font-bold text-slate-900">{money(row.currentBalance)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-4 border-t-2 border-slate-900 bg-slate-50 px-5 py-4 sm:px-6">
        <span className="font-black text-slate-950">{totalLabel}</span>
        <span className="text-lg font-black text-slate-950">{money(totalValue)}</span>
      </div>
    </div>
  );
}

export default function AccountsProEnterprise() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("coa");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [branch, setBranch] = useState("All Branches");
  const [period, setPeriod] = useState("FY 2026–27");
  const [expanded, setExpanded] = useState(new Set(["1000", "1100", "1110", "1120", "1200", "2000", "2100", "2200", "3000", "4000", "5000"]));
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadAccounts = async () => {
    setLoading(true); setError("");
    try { setAccounts(await accountingApi.listAccounts({ period, branch })); }
    catch (err) { setError(err.message || "Unable to load accounting data"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadAccounts(); }, []);

  const filteredAccounts = useMemo(() => accounts.filter((account) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || `${account.code} ${account.name} ${account.subtype}`.toLowerCase().includes(q);
    const matchesType = typeFilter === "all" || account.type === typeFilter;
    const matchesStatus = statusFilter === "all" || (statusFilter === "active" ? account.active : !account.active);
    const matchesBranch = branch === "All Branches" || account.branch === branch || account.branch === "All Branches";
    return matchesSearch && matchesType && matchesStatus && matchesBranch;
  }), [accounts, search, typeFilter, statusFilter, branch]);

  const treeRows = useMemo(() => flattenTree(buildTree(filteredAccounts), expanded), [filteredAccounts, expanded]);
  const postingAccounts = accounts.filter((a) => !a.isGroup);
  const assets = postingAccounts.filter((a) => a.type === "asset");
  const liabilities = postingAccounts.filter((a) => a.type === "liability");
  const equity = postingAccounts.filter((a) => a.type === "equity");
  const income = postingAccounts.filter((a) => a.type === "income");
  const expenses = postingAccounts.filter((a) => a.type === "expense");
  const sum = (rows) => rows.reduce((total, row) => total + Number(row.currentBalance || 0), 0);
  const totalAssets = sum(assets);
  const totalLiabilities = sum(liabilities);
  const totalEquity = sum(equity);
  const totalIncome = sum(income);
  const totalExpenses = sum(expenses);
  const netProfit = totalIncome - totalExpenses;
  const reconciliationCount = postingAccounts.filter((a) => a.reconcile).length;

  const trialRows = postingAccounts.map((a) => {
    const normal = ACCOUNT_TYPES[a.type]?.normal;
    const balance = Number(a.currentBalance || 0);
    return { ...a, debit: normal === "debit" ? Math.max(balance, 0) : Math.max(-balance, 0), credit: normal === "credit" ? Math.max(balance, 0) : Math.max(-balance, 0) };
  });
  const trialDebit = trialRows.reduce((t, r) => t + r.debit, 0);
  const trialCredit = trialRows.reduce((t, r) => t + r.credit, 0);

  const openNew = () => { setForm(emptyForm); setModal("new"); };
  const openEdit = (account) => { setForm({ ...emptyForm, ...account }); setModal("edit"); };

  const validate = () => {
    if (!form.code.trim() || !form.name.trim()) return "Account code and account name are required.";
    if (accounts.some((a) => a.code === form.code && a.id !== form.id)) return "Account code already exists.";
    const parent = accounts.find((a) => a.id === form.parentId);
    if (parent && !parent.isGroup) return "Only a group account can be selected as parent.";
    if (parent && parent.type !== form.type) return "Parent and child account types must match.";
    return "";
  };

  const saveAccount = async () => {
    const validation = validate();
    if (validation) return alert(validation);
    setSaving(true);
    try {
      if (modal === "new") {
        const created = await accountingApi.createAccount(form);
        setAccounts((current) => [...current, created]);
      } else {
        const updated = await accountingApi.updateAccount(form.id, form);
        setAccounts((current) => current.map((a) => a.id === form.id ? { ...a, ...updated } : a));
      }
      setModal(null);
    } catch (err) { alert(err.message || "Unable to save account"); }
    finally { setSaving(false); }
  };

  const deleteAccount = async (account) => {
    if (account.system || account.locked) return alert("System or locked accounts cannot be deleted.");
    if (accounts.some((a) => a.parentId === account.id)) return alert("Remove child accounts before deleting this group.");
    if (Number(account.currentBalance || 0) !== 0) return alert("An account with a balance cannot be deleted. Deactivate it instead.");
    if (!window.confirm(`Delete ${account.code} — ${account.name}?`)) return;
    try { await accountingApi.deleteAccount(account.id); setAccounts((current) => current.filter((a) => a.id !== account.id)); }
    catch (err) { alert(err.message || "Unable to delete account"); }
  };

  return (
    <div className="min-h-screen min-w-0 overflow-x-hidden bg-[#f5f7fb] text-slate-900">
      <div className="mx-auto w-full min-w-0 max-w-[1600px] px-3 py-4 sm:px-5 lg:px-6">
        <section className="overflow-hidden rounded-3xl bg-gradient-to-r from-[#122a72] via-[#163a9f] to-[#2348c8] text-white shadow-xl shadow-blue-950/10">
          <div className="flex flex-col gap-5 px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <button onClick={() => window.history.back()} className="mt-0.5 rounded-xl p-2 hover:bg-white/10"><ArrowLeft size={20} /></button>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-black tracking-tight sm:text-2xl">Accounting & General Ledger</h1>
                  <span className="rounded-full border border-emerald-300/40 bg-emerald-400/15 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-100">Enterprise workspace</span>
                </div>
                <p className="mt-1 max-w-3xl text-xs leading-5 text-blue-100 sm:text-sm">Chart of accounts, closing controls and financial statements in one governed workspace.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 pl-11 lg:pl-0">
              <button className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15"><Upload size={14} /> Import</button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/15"><Download size={14} /> Export</button>
              <button onClick={openNew} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-blue-900 hover:bg-blue-50"><Plus size={15} /> New Account</button>
            </div>
          </div>
          <div className="grid border-t border-white/10 bg-slate-950/15 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Company", "Demo Manufacturing (Pvt.) Ltd."],
              ["Fiscal year", period],
              ["Base currency", "PKR — Pakistani Rupee"],
              ["Control status", "Accounting structure verified"],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0 border-b border-white/10 px-5 py-3 sm:border-r xl:border-b-0">
                <p className="text-[9px] font-bold uppercase tracking-wider text-blue-200">{label}</p>
                <p className="mt-1 truncate text-xs font-bold sm:text-sm">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <StatCard title="Total Accounts" value={accounts.length} subtitle="Groups and posting ledgers" icon={FolderTree} />
          <StatCard title="Posting Accounts" value={postingAccounts.length} subtitle="Accept journal entries" icon={FileSpreadsheet} tone="emerald" />
          <StatCard title="Reconciliation" value={reconciliationCount} subtitle="Bank and control accounts" icon={BadgeCheck} tone="amber" />
          <StatCard title="Assets" value={money(totalAssets)} subtitle="Current reporting balance" icon={Wallet} tone="violet" />
          <StatCard title="Net Profit" value={money(netProfit)} subtitle="Income less expenses" icon={CircleDollarSign} tone="emerald" />
          <StatCard title="Trial Balance" value={money(Math.abs(trialDebit - trialCredit))} subtitle={trialDebit === trialCredit ? "Debits and credits balanced" : "Difference requires review"} icon={Scale} tone={trialDebit === trialCredit ? "emerald" : "amber"} />
        </div>

        <section className="mt-4 min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto border-b border-slate-200 bg-slate-50/80">
            <div className="flex min-w-max items-center gap-1 p-2">
              {REPORT_TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold transition ${activeTab === id ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-white hover:text-slate-900"}`}>
                  <Icon size={15} /> {label}
                </button>
              ))}
            </div>
          </div>

          <ReportToolbar period={period} setPeriod={setPeriod} branch={branch} setBranch={setBranch} onRefresh={loadAccounts} loading={loading} />

          {error && <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">{error}</div>}

          {activeTab === "coa" && (
            <>
              <div className="flex flex-col gap-3 border-b border-slate-200 p-4 xl:flex-row xl:items-center xl:justify-between">
                <div className="relative min-w-0 flex-1 xl:max-w-2xl">
                  <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by account code, account name or subtype…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:bg-white" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold"><Filter size={14} /><select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="bg-transparent outline-none"><option value="all">All types</option>{Object.entries(ACCOUNT_TYPES).map(([value, item]) => <option key={value} value={value}>{item.label}</option>)}</select></div>
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold outline-none"><option value="active">Active</option><option value="inactive">Inactive</option><option value="all">All statuses</option></select>
                  <button onClick={() => setExpanded(new Set(accounts.filter((a) => a.isGroup).map((a) => a.id)))} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold hover:bg-slate-50">Expand all</button>
                  <button onClick={() => setExpanded(new Set())} className="rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-bold hover:bg-slate-50">Collapse all</button>
                </div>
              </div>

              <div className="min-w-0 overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse">
                  <thead className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                    <tr><th className="px-5 py-3">Account</th><th className="px-4 py-3">Type / Subtype</th><th className="px-4 py-3">Branch</th><th className="px-4 py-3 text-right">Current Balance</th><th className="px-4 py-3">Controls</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? <tr><td colSpan="7" className="py-16 text-center"><Loader2 className="mx-auto animate-spin text-blue-600" /></td></tr> : treeRows.map((account) => (
                      <tr key={account.id} className="group hover:bg-blue-50/30">
                        <td className="px-5 py-3.5">
                          <div className="flex min-w-0 items-center" style={{ paddingLeft: `${Math.min(account.level, 5) * 22}px` }}>
                            {account.children.length ? <button onClick={() => setExpanded((current) => { const next = new Set(current); next.has(account.id) ? next.delete(account.id) : next.add(account.id); return next; })} className="mr-1 rounded p-1 text-slate-500 hover:bg-slate-100">{expanded.has(account.id) ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</button> : <span className="mr-1 w-7" />}
                            <div className={`mr-3 rounded-lg p-2 ${account.isGroup ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600"}`}>{account.isGroup ? <Layers3 size={16} /> : <FileSpreadsheet size={16} />}</div>
                            <div className="min-w-0"><div className="flex items-center gap-2"><span className="font-mono text-xs font-bold text-slate-400">{account.code}</span>{account.locked && <Lock size={11} className="text-amber-500" />}</div><p className="truncate text-sm font-bold text-slate-800">{account.name}</p></div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5"><p className="text-xs font-bold text-slate-700">{ACCOUNT_TYPES[account.type]?.label}</p><p className="mt-0.5 text-[11px] text-slate-400">{account.subtype}</p></td>
                        <td className="px-4 py-3.5 text-xs font-semibold text-slate-600">{account.branch}</td>
                        <td className="px-4 py-3.5 text-right text-sm font-black text-slate-900">{account.isGroup ? "—" : money(account.currentBalance)}</td>
                        <td className="px-4 py-3.5"><div className="flex flex-wrap gap-1">{account.reconcile && <span className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700">RECONCILE</span>}{account.system && <span className="rounded-md bg-violet-50 px-2 py-1 text-[9px] font-black text-violet-700">SYSTEM</span>}{account.isGroup && <span className="rounded-md bg-blue-50 px-2 py-1 text-[9px] font-black text-blue-700">GROUP</span>}</div></td>
                        <td className="px-4 py-3.5"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-black ${account.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}><span className={`h-1.5 w-1.5 rounded-full ${account.active ? "bg-emerald-500" : "bg-slate-400"}`} />{account.active ? "Active" : "Inactive"}</span></td>
                        <td className="px-4 py-3.5"><div className="flex justify-end gap-1"><button className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Eye size={15} /></button><button onClick={() => openEdit(account)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50"><Edit3 size={15} /></button><button onClick={() => deleteAccount(account)} className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"><Trash2 size={15} /></button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === "trial" && (
            <div className="min-w-0 overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead className="bg-slate-50 text-left text-[10px] font-black uppercase tracking-wider text-slate-500"><tr><th className="px-5 py-3">Code</th><th className="px-4 py-3">Account</th><th className="px-4 py-3">Type</th><th className="px-4 py-3 text-right">Debit</th><th className="px-5 py-3 text-right">Credit</th></tr></thead>
                <tbody className="divide-y divide-slate-100">{trialRows.map((row) => <tr key={row.id} className="hover:bg-slate-50"><td className="px-5 py-3 font-mono text-xs font-bold text-slate-500">{row.code}</td><td className="px-4 py-3 text-sm font-semibold text-slate-800">{row.name}</td><td className="px-4 py-3 text-xs text-slate-500">{ACCOUNT_TYPES[row.type]?.label}</td><td className="px-4 py-3 text-right text-sm font-bold">{row.debit ? number(row.debit) : "—"}</td><td className="px-5 py-3 text-right text-sm font-bold">{row.credit ? number(row.credit) : "—"}</td></tr>)}</tbody>
                <tfoot className="border-t-2 border-slate-900 bg-slate-50"><tr><td colSpan="3" className="px-5 py-4 font-black">Total</td><td className="px-4 py-4 text-right font-black">{money(trialDebit)}</td><td className="px-5 py-4 text-right font-black">{money(trialCredit)}</td></tr></tfoot>
              </table>
            </div>
          )}

          {activeTab === "profit-loss" && <div className="p-4 sm:p-6"><FinancialReport title="Statement of Profit or Loss" subtitle={`${period} · ${branch}`} sections={[{ label: "Revenue", rows: income, total: totalIncome }, { label: "Operating & other expenses", rows: expenses, total: totalExpenses }]} totalLabel="Net profit for the period" totalValue={netProfit} /></div>}

          {activeTab === "balance-sheet" && <div className="grid gap-4 p-4 lg:grid-cols-2 sm:p-6"><FinancialReport title="Assets" subtitle={`As at period end · ${branch}`} sections={[{ label: "Total assets", rows: assets, total: totalAssets }]} totalLabel="Total assets" totalValue={totalAssets} /><FinancialReport title="Liabilities & Equity" subtitle="Accounting equation presentation" sections={[{ label: "Liabilities", rows: liabilities, total: totalLiabilities }, { label: "Equity", rows: equity, total: totalEquity + netProfit }]} totalLabel="Total liabilities & equity" totalValue={totalLiabilities + totalEquity + netProfit} /></div>}

          {activeTab === "ledger" && <div className="p-6"><div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center"><BookOpen className="mx-auto text-slate-400" size={34} /><h3 className="mt-3 font-black text-slate-800">General Ledger drill-down</h3><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">Select a posting account and date range to view opening balance, journal lines, running balance, source document, branch, cost centre and reconciliation status. The endpoint is ready to be connected in the backend phase.</p><button className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white">Select Account</button></div></div>}
        </section>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><ShieldCheck size={20} /></div><div><h3 className="text-sm font-black">Period controls</h3><p className="mt-1 text-xs text-slate-500">Lock dates, fiscal periods and role-based posting permissions.</p></div></div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-xl bg-blue-50 p-3 text-blue-700"><History size={20} /></div><div><h3 className="text-sm font-black">Audit & traceability</h3><p className="mt-1 text-xs text-slate-500">Every account change and journal action should be server audited.</p></div></div></div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><div className="rounded-xl bg-violet-50 p-3 text-violet-700"><Settings2 size={20} /></div><div><h3 className="text-sm font-black">Accounting policies</h3><p className="mt-1 text-xs text-slate-500">Tax defaults, currencies, branches, cost centres and dimensions.</p></div></div></div>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4"><div><h2 className="font-black text-slate-950">{modal === "new" ? "Create account" : "Edit account"}</h2><p className="mt-1 text-xs text-slate-500">Define hierarchy, posting behavior and operational controls.</p></div><button onClick={() => setModal(null)} className="rounded-xl p-2 hover:bg-slate-100"><X size={18} /></button></div>
            <div className="grid gap-4 p-5 sm:grid-cols-2">
              <label className="space-y-1.5"><span className="text-xs font-bold text-slate-600">Account code *</span><input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>
              <label className="space-y-1.5"><span className="text-xs font-bold text-slate-600">Account name *</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>
              <label className="space-y-1.5"><span className="text-xs font-bold text-slate-600">Account type</span><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value, subtype: SUBTYPES[e.target.value][0], parentId: "" })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none"><option value="asset">Assets</option><option value="liability">Liabilities</option><option value="equity">Equity</option><option value="income">Income</option><option value="expense">Expenses</option></select></label>
              <label className="space-y-1.5"><span className="text-xs font-bold text-slate-600">Subtype</span><select value={form.subtype} onChange={(e) => setForm({ ...form, subtype: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none">{SUBTYPES[form.type].map((item) => <option key={item}>{item}</option>)}</select></label>
              <label className="space-y-1.5 sm:col-span-2"><span className="text-xs font-bold text-slate-600">Parent group</span><select value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none"><option value="">Top level</option>{accounts.filter((a) => a.isGroup && a.type === form.type && a.id !== form.id).map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}</select></label>
              <label className="space-y-1.5"><span className="text-xs font-bold text-slate-600">Branch</span><select value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option>All Branches</option><option>Head Office</option><option>Factory</option><option>Lahore Branch</option></select></label>
              <label className="space-y-1.5"><span className="text-xs font-bold text-slate-600">Currency</span><select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option>PKR</option><option>USD</option><option>GBP</option><option>AED</option><option>SAR</option></select></label>
              <label className="space-y-1.5 sm:col-span-2"><span className="text-xs font-bold text-slate-600">Description</span><textarea rows="3" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-blue-500" /></label>
              <div className="sm:col-span-2 grid gap-2 sm:grid-cols-3">{[["isGroup", "Group account"], ["reconcile", "Allow reconciliation"], ["active", "Active account"]].map(([key, label]) => <label key={key} className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-xs font-bold text-slate-700"><input type="checkbox" checked={Boolean(form[key])} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} /> {label}</label>)}</div>
            </div>
            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4"><button onClick={() => setModal(null)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold">Cancel</button><button disabled={saving} onClick={saveAccount} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">{saving && <Loader2 size={14} className="animate-spin" />}{modal === "new" ? "Create account" : "Save changes"}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
