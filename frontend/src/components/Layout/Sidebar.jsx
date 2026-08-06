import React, { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Banknote,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Factory,
  KeyRound,
  Landmark,
  LayoutDashboard,
  List,
  LogOut,
  Package,
  Receipt,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Store,
  Users,
  Warehouse,
  Wallet,
  Zap,
} from "lucide-react";

import { useAuth } from "../../auth/AuthContext";

const menuItems = [
  { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { id: "customers", icon: Users, label: "Customers" },
  { id: "vendors", icon: Store, label: "Vendors" },
  { id: "traders", icon: Users, label: "Traders" },
  {
    id: "items",
    icon: Package,
    label: "Items",
    submenu: [
      { id: "list-items", label: "List Items", icon: List },
      { id: "categories-list", label: "Categories", icon: List },
      { id: "brand-list", label: "Brands", icon: List },
      { id: "unit-list", label: "Units", icon: List },
    ],
  },
  {
    id: "purchase",
    icon: ShoppingCart,
    label: "Purchase",
    submenu: [
      { id: "purchase-orders", label: "Purchase Orders", icon: List },
      { id: "grn", label: "GRN", icon: Package },
      { id: "purchases", label: "Purchases", icon: Receipt },
    ],
  },
  {
    id: "production",
    icon: Factory,
    label: "Production",
    submenu: [
      { id: "production-items", label: "Production Items", icon: List },
      // { id: "lamination", label: "Lamination", icon: List },
      { id: "printing", label: "Printing", icon: List },
      // { id: "die-cutting", label: "Die Cutting", icon: List },
      // { id: "pasting", label: "Pasting", icon: List },
      // { id: "other-work", label: "Other Work", icon: List },
    ],
  },
  { id: "ready-product", icon: CheckCircle2, label: "Ready Product" },
  {
    id: "sales",
    icon: ShoppingCart,
    label: "Sales",
    submenu: [
      { id: "sales-orders", label: "Sales Orders", icon: List },
      { id: "delivery-challans", label: "Delivery Challans", icon: Package },
      { id: "invoices", label: "Invoices", icon: Receipt },
    ],
  },
  { id: "payments-received", icon: Banknote, label: "Payments & Received" },
  { id: "general-journal", icon: BookOpen, label: "General Journal" },
  { id: "expense", icon: Wallet, label: "Expenses" },
  { id: "payroll", icon: Users, label: "Payroll" },
  { id: "accounts", icon: Landmark, label: "Accounts" },
  { id: "warehouses", icon: Warehouse, label: "Warehouses" },
  { id: "reports", icon: BarChart3, label: "Reports" },
  { id: "settings", icon: Settings, label: "Settings" },
  { id: "user-management", icon: ShieldCheck, label: "Users & Roles" },
];

function Sidebar({
  collapsed = false,
  currentPage = "dashboard",
  onPageChange,
}) {
  const { user, canAccessPage, logout } = useAuth();
  const [expandedItems, setExpandedItems] = useState(new Set());

  const visibleMenuItems = useMemo(
    () =>
      menuItems
        .map((item) => {
          if (!item.submenu) {
            return canAccessPage(item.id) ? item : null;
          }

          const submenu = item.submenu.filter((subitem) =>
            canAccessPage(subitem.id)
          );

          return submenu.length ? { ...item, submenu } : null;
        })
        .filter(Boolean),
    [canAccessPage]
  );

  useEffect(() => {
    visibleMenuItems.forEach((item) => {
      if (item.submenu?.some((subitem) => subitem.id === currentPage)) {
        setExpandedItems((current) => new Set(current).add(item.id));
      }
    });
  }, [currentPage, visibleMenuItems]);

  const toggleExpanded = (itemId) => {
    setExpandedItems((current) => {
      const next = new Set(current);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  return (
    <aside
      className={`relative z-20 flex flex-col border-r border-slate-200/70 bg-white/95 shadow-sm backdrop-blur-xl transition-all duration-300 dark:border-slate-700/70 dark:bg-slate-900/95 ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div className="border-b border-slate-200/70 p-5 dark:border-slate-700/70">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25">
            <Zap className="h-6 w-6" />
          </div>
          {!collapsed ? (
            <div className="min-w-0">
              <h1 className="truncate text-xl font-black text-slate-800 dark:text-white">
                ERP Workspace
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Secure operations portal
              </p>
            </div>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto p-4">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const hasSubmenu = Boolean(item.submenu);
          const childActive = item.submenu?.some(
            (subitem) => subitem.id === currentPage
          );
          const active = currentPage === item.id || childActive;
          const expanded = expandedItems.has(item.id);

          return (
            <div key={item.id} className="space-y-1">
              <button
                type="button"
                title={collapsed ? item.label : ""}
                onClick={() =>
                  hasSubmenu ? toggleExpanded(item.id) : onPageChange?.(item.id)
                }
                className={`group flex w-full items-center justify-between rounded-2xl p-3 transition ${
                  active
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/20"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed ? (
                    <span className="truncate font-semibold">{item.label}</span>
                  ) : null}
                </div>
                {!collapsed && hasSubmenu ? (
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      expanded ? "rotate-180" : ""
                    }`}
                  />
                ) : null}
              </button>

              {!collapsed && hasSubmenu ? (
                <div
                  className={`overflow-hidden transition-all duration-300 ${
                    expanded ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
                  }`}
                >
                  <div className="ml-4 mt-2 space-y-1 border-l border-slate-200 pl-4 dark:border-slate-700">
                    {item.submenu.map((subitem) => {
                      const SubIcon = subitem.icon || List;
                      const subActive = currentPage === subitem.id;
                      return (
                        <button
                          type="button"
                          key={subitem.id}
                          onClick={() => onPageChange?.(subitem.id)}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                            subActive
                              ? "bg-blue-50 font-bold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
                          }`}
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                            <SubIcon className="h-4 w-4" />
                          </span>
                          <span className="truncate">{subitem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-200/70 p-4 dark:border-slate-700/70">
        <div
          className={`rounded-2xl bg-slate-50 p-3 dark:bg-slate-800/70 ${
            collapsed ? "space-y-2" : ""
          }`}
        >
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"}`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-black text-blue-700 dark:bg-blue-500/20 dark:text-blue-300">
              {(user?.roleLabel || "U").slice(0, 1)}
            </div>
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-slate-800 dark:text-white">
                  {user?.roleLabel || "User"}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  Authenticated session
                </p>
              </div>
            ) : null}
          </div>

          {!collapsed ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onPageChange?.("change-password")}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-2 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200"
              >
                <KeyRound className="h-3.5 w-3.5" /> Password
              </button>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-2 py-2 text-xs font-bold text-red-700 shadow-sm hover:bg-red-50 dark:bg-slate-900 dark:text-red-300"
              >
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
