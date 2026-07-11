import React, { useEffect, useState } from "react";
import logoImg from "./logo.png";

import {
  Zap,
  LayoutDashboard,
  Users,
  Store,
  Package,
  ShoppingCart,
  Factory,
  CheckCircle2,
  Settings,
  List,
  ChevronDown,
  Warehouse,
  Wallet,
  Landmark,
  BarChart3,
  Receipt,
  BookOpen,
  Banknote,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";

const menuItems = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    id: "customers",
    icon: Users,
    label: "Customer",
  },
  {
    id: "vendors",
    icon: Store,
    label: "Vendor",
  },
  {
    id: "items",
    icon: Package,
    label: "Items",
    submenu: [
      { id: "list-items", label: "List Items", icon: List },
      { id: "categories-list", label: "Categories List", icon: List },
      { id: "brand-list", label: "Brand List", icon: List },
      { id: "unit-list", label: "Unit List", icon: List },
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
      { id: "printing", label: "Printing", icon: List },
    ],
  },
  {
    id: "ready-product",
    icon: CheckCircle2,
    label: "Ready Product",
  },
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
  {
  id: "general-journal",
  icon: BookOpen,
  label: "General Journal",
},
  {
    id: "expense",
    icon: Wallet,
    label: "Expense",
  },
  {
    id: "payroll",
    icon: Users,
    label: "Payroll",
  },
  {
    id: "accounts",
    icon: Landmark,
    label: "Accounts",
  },
  {
    id: "warehouses",
    icon: Warehouse,
    label: "UrwaGodam",
  },
  {
    id: "reports",
    icon: BarChart3,
    label: "Reports",
  },
  {
    id: "settings",
    icon: Settings,
    label: "Settings",
  },
];

const Sidebar = ({
  collapsed = false,
  onToggle,
  currentPage = "dashboard",
  onPageChange,
}) => {
  const [expandedItems, setExpandedItems] = useState(new Set());

  const toggleExpanded = (itemId) => {
    setExpandedItems((prev) => {
      const newExpanded = new Set(prev);

      if (newExpanded.has(itemId)) {
        newExpanded.delete(itemId);
      } else {
        newExpanded.add(itemId);
      }

      return newExpanded;
    });
  };

  const handlePageChange = (pageId) => {
    if (onPageChange) {
      onPageChange(pageId);
    }
  };

  const isSubmenuActive = (item) => {
    return item.submenu?.some((subitem) => subitem.id === currentPage);
  };

  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.submenu?.some((subitem) => subitem.id === currentPage)) {
        setExpandedItems((prev) => {
          const newExpanded = new Set(prev);
          newExpanded.add(item.id);
          return newExpanded;
        });
      }
    });
  }, [currentPage]);

  return (
    <div
      className={`${
        collapsed ? "w-20" : "w-72"
      } transition-all duration-300 ease-in-out bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-r border-slate-200/60 dark:border-slate-700/60 flex flex-col relative z-10 shadow-sm`}
    >
      {/* Logo Section */}
      <div className="p-5 border-b border-slate-200/60 dark:border-slate-700/60">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Zap className="w-6 h-6 text-white" />
          </div>

          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
                M.ERP
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Admin Panel
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const hasSubmenu = Boolean(item.submenu);
          const itemActive = currentPage === item.id;
          const childActive = isSubmenuActive(item);
          const isExpanded = expandedItems.has(item.id);
          const parentActive = itemActive || childActive;

          return (
            <div key={item.id} className="space-y-1">
              <button
                title={collapsed ? item.label : ""}
                className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all duration-300 group ${
                  parentActive
                    ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white"
                }`}
                onClick={() => {
                  if (hasSubmenu) {
                    toggleExpanded(item.id);
                  } else {
                    handlePageChange(item.id);
                  }
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-5 h-5 shrink-0 ${
                      parentActive
                        ? "text-white"
                        : "text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                    }`}
                  />

                  {!collapsed && (
                    <span className="font-medium truncate">{item.label}</span>
                  )}
                </div>

                {!collapsed && hasSubmenu && (
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-300 ${
                      isExpanded ? "rotate-180" : "rotate-0"
                    }`}
                  />
                )}
              </button>

              {/* Sub Menu */}
              {!collapsed && hasSubmenu && (
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded
                      ? "max-h-96 opacity-100 translate-y-0"
                      : "max-h-0 opacity-0 -translate-y-1"
                  }`}
                >
                  <div className="ml-4 mt-2 pl-4 border-l border-slate-200 dark:border-slate-700 space-y-1">
                    {item.submenu.map((subitem) => {
                      const SubIcon = subitem.icon || List;
                      const subActive = currentPage === subitem.id;

                      return (
                        <button
                          key={subitem.id}
                          onClick={() => handlePageChange(subitem.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
                            subActive
                              ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold shadow-sm"
                              : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-200"
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                              subActive
                                ? "bg-blue-100 dark:bg-blue-500/20"
                                : "bg-slate-100 dark:bg-slate-800"
                            }`}
                          >
                            <SubIcon className="w-4 h-4" />
                          </span>

                          <span className="truncate">{subitem.label}</span>

                          {subActive && (
                            <span className="ml-auto w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-300" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-slate-200/60 dark:border-slate-700/60">
        <div
          className={`flex items-center ${
            collapsed ? "justify-center" : "gap-3"
          } p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60`}
        >
          <img
            src={logoImg}
            alt="Urwa Packages Logo"
            className="w-10 h-10 rounded-full ring-2 ring-blue-500"
          />

          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                Urwa Packages
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Packaging Solutions
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;