
import { Zap } from 'lucide-react';
import logoImg from "./logo.png";
import React, { useState } from 'react';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  Store,
  Package,
  ShoppingCart,
  Building2,
  Factory,
  CheckCircle2,
  Settings,
  List,
  Layers,
  Tags,
  Ruler,
  ChevronDown,
  Warehouse,
  Wallet,
  Landmark,
  BarChart3,
  Receipt
} from 'lucide-react';
const menuItems = [
  {
    id: "dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    active: true,
  },
  {
    id: "customers",
    icon: Users,
    label: "Customer",
    // submenu: [
    //   { id: "add-customer", label: "Add Customer" },
      
    // ],
  },
  {
    id: "vendors",
    icon: Store,
    label: "Vendor",
    // submenu: [
    //   // { id: "add-vendor", label: "Add Vendor" },
      
    // ],
  },
  {
    id: "traders",
    icon: UserPlus,
    label: "Trader",
    // submenu: [
    //   { id: "add-trader", label: "Add Trader" },
      
    // ],
  },
  {
    id: "items",
    icon: Package,
    label: "Items",
    submenu: [
      { id: "list-items", label: "List Items" },
      { id: "categories-list", label: "Categories List" },
      { id: "brand-list", label: "Brand List" },
      { id: "unit-list", label: "Unit List" },
    ],
  },
  {
    id: "purchase",
    icon: ShoppingCart,
    label: "Purchase",
  },
  // {
  //   id: "departments",
  //   icon: Building2,
  //   label: "Departments",
  // },
  {
    id: "production",
    icon: Factory,
    label: "Production",
    submenu: [
      { id: "production-items", label: "production-items" },
      { id: "lamination", label: "Lamination" },
      { id: "printing", label: "Printing" },
      { id: "die-cutting", label: "Die Cutting" },
      { id: "pasting", label: "Pasting" },
      { id: "other-work", label: "Other Work" },
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
    { id: "sales-orders", label: "Sales Orders" },
    { id: "delivery-challans", label: "Delivery Challans" },
    { id: "invoices", label: "Invoices" },
  ],
},
  { id: "expense", icon: Wallet, label: "Expense" },
  { id: "payroll", icon: Users, label: "Payroll" },
  { id: "accounts", icon: Landmark, label: "Accounts" },
  { id: "warehouses", icon: Warehouse, label: "UrwaGodam" },
  { id: "reports", icon: BarChart3, label: "Reports" },
  { id: "settings", icon: Settings, label: "Settings" },

];

const Sidebar = ({ collapsed, onToggle, currentPage, onPageChange }) => {

  const [expandedItems, setExpandedItems] = useState(new Set(["analytics"]));

  const toggleExpanded = (itemId) => {
    const newExpanded = new Set(expandedItems);

    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }

    setExpandedItems(newExpanded);
  };
  return (
    <div
      className={`${collapsed ? "w-20" : "w-72"
        } transition-all duration-300 ease-in-out bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 flex flex-col relative z-10`}
    >
      {/* Logo Section */}
      <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center space-x-3">
          {/* Icon Box */}
          <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <Zap className="w-6 h-6 text-white" />
          </div>
          {/* Conditional Rendering */}
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white">
                M.ERP
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Admin Panel
              </p>
            </div>
          )}

        </div>
      </div>

      {/* Navigation i will display dynmic display */}

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => {
          return (
            <div key={item.id}>
              <button
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${currentPage === item.id || item.active
                  ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                  }`}
                onClick={() => {
                  if (item.submenu) {
                    toggleExpanded(item.id);
                  } else {
                    onPageChange(item.id);
                  }
                }}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="w-5 h-5" />

                  {/* Conditional Rendering */}

                  {!collapsed && (
                    <>
                      <span className="font-medium ml-2">{item.label}</span>
                      {item.badge && (
                        <span className="px-2 py-1 text-xs bg-red-500 text-white rounded-full">
                          {item.badge}
                        </span>
                      )}

                      {item.count && (
                        <span className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full">
                          {item.count}
                        </span>

                      )}
                    </>
                  )}



                </div>
                {!collapsed && item.submenu && (
                  <ChevronDown className={`w-4 h-4 transition-transform`} />
                )}
              </button>

              {/* Sub Menus */}
              {!collapsed && item.submenu && expandedItems.has(item.id) && (
                <div className="ml-8 mt-2 space-y-1">
                  {item.submenu.map((subitem) => {
                    return (
                      <button
                        onClick={() => onPageChange(subitem.id)}
                        className="w-full text-left p-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-lg transition-all"
                      >
                        {subitem.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* user Profile */}
      {collapsed && <div className="p-4 border-t border-slate-200/50 dark:border-slate-700/50">
        <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <img
            src={logoImg}
            alt="Urwa Packages Logo"
            className="w-10 h-10 rounded-full ring-2 ring-blue-500"
          />

          <div className='flex-1 min-w-0'>
            <div className='flex-1 min-w-1'>
              <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                Urwa Packages
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Packaging Solutions
              </p>
            </div>
          </div>
        </div>
      </div>}
    </div>
  );
};

export default Sidebar;