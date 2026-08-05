import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bell,
  ChevronDown,
  KeyRound,
  Loader2,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";

import { API_BASE_URL } from "../../config/api";
import { useAuth } from "../../auth/AuthContext";

const PAGE_TITLES = {
  dashboard: "Dashboard",
  customers: "Customers",
  vendors: "Vendors",
  traders: "Traders",
  "list-items": "Items",
  "categories-list": "Categories",
  "brand-list": "Brands",
  "unit-list": "Units",
  "purchase-orders": "Purchase Orders",
  grn: "GRN",
  purchases: "Purchases",
  "production-items": "Production Items",
  lamination: "Lamination",
  printing: "Printing",
  "die-cutting": "Die Cutting",
  pasting: "Pasting",
  "other-work": "Other Work",
  departments: "Departments",
  "ready-product": "Ready Product",
  sale: "Sales",
  "sales-orders": "Sales Orders",
  "delivery-challans": "Delivery Challans",
  invoices: "Invoices",
  "payments-received": "Payments & Received",
  "general-journal": "General Journal",
  expense: "Expenses",
  payroll: "Payroll",
  accounts: "Accounts",
  warehouses: "Warehouses",
  reports: "Reports",
  settings: "Settings",
  "user-management": "Users & Roles",
  "change-password": "Change Password",
};

const safeDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const relativeTime = (value) => {
  const date = safeDate(value);
  if (!date) return "";
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const apiRequest = async (url) => {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.success === false) {
    throw new Error(data.message || data.error || "Request failed");
  }
  return data;
};

function Header({ onToggleSidebar, currentPage, onPageChange }) {
  const {
    user,
    can,
    logout,
    updatePreferences,
    markNotificationsRead,
  } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchText, setSearchText] = useState("");
  const notificationRef = useRef(null);
  const profileRef = useRef(null);

  const darkMode = Boolean(user?.preferences?.darkMode);
  const pageTitle = PAGE_TITLES[currentPage] || "Workspace";

  const loadNotifications = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setLoading(true);
      setError("");
      const result = await apiRequest(
        `${API_BASE_URL}/dashboard/activity-feed?limit=100`
      );
      setNotifications(Array.isArray(result.data) ? result.data : []);
    } catch (requestError) {
      setError(requestError.message || "Notifications could not be loaded.");
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications(true);
    const timer = window.setInterval(() => loadNotifications(false), 30000);
    return () => window.clearInterval(timer);
  }, [loadNotifications]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  useEffect(() => {
    const close = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const unreadCount = useMemo(() => {
    const readAt = safeDate(user?.lastNotificationReadAt);
    if (!readAt) return notifications.length;
    return notifications.filter((item) => {
      const createdAt = safeDate(item.createdAt);
      return createdAt && createdAt > readAt;
    }).length;
  }, [notifications, user?.lastNotificationReadAt]);

  const openNotifications = async () => {
    const next = !notificationsOpen;
    setNotificationsOpen(next);
    setProfileOpen(false);

    if (next) {
      await loadNotifications(false);
      const readAt =
        safeDate(notifications[0]?.createdAt)?.toISOString() ||
        new Date().toISOString();
      try {
        await markNotificationsRead(readAt);
      } catch (requestError) {
        console.error("Notification read update error:", requestError);
      }
    }
  };

  const toggleTheme = async () => {
    try {
      await updatePreferences({ darkMode: !darkMode });
    } catch (requestError) {
      console.error("Theme update error:", requestError);
    }
  };

  return (
    <header className="relative z-30 w-full border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/90">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 lg:grid-cols-[minmax(240px,1fr)_minmax(220px,420px)_auto]">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onToggleSidebar}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="truncate text-xl font-black text-slate-800 dark:text-white sm:text-2xl">
            {pageTitle}
          </h1>
        </div>

        <div className="order-3 col-span-2 lg:order-none lg:col-span-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search workspace"
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-1 sm:gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            aria-label="Change theme"
          >
            {darkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </button>

          <div ref={notificationRef} className="relative">
            <button
              type="button"
              onClick={openNotifications}
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white dark:border-slate-900">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </button>

            {notificationsOpen ? (
              <div className="absolute right-0 mt-3 w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:w-[390px]">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                  <div>
                    <h2 className="font-black text-slate-900 dark:text-white">Notifications</h2>
                    <p className="text-xs text-slate-500">Latest dashboard activity</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadNotifications(true)}
                    className="text-xs font-bold text-blue-600"
                  >
                    Refresh
                  </button>
                </div>
                <div className="max-h-[430px] overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading...
                    </div>
                  ) : error ? (
                    <div className="px-4 py-8 text-center text-sm text-red-600">{error}</div>
                  ) : notifications.length === 0 ? (
                    <div className="px-4 py-10 text-center text-sm text-slate-500">
                      No notifications found.
                    </div>
                  ) : (
                    notifications.slice(0, 6).map((item, index) => (
                      <div
                        key={item.id || item._id || index}
                        className="border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-800"
                      >
                        <p className="text-sm font-bold text-slate-800 dark:text-white">
                          {item.title || "Activity update"}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {item.description || "A dashboard record was updated."}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-slate-400">
                          {relativeTime(item.createdAt)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {can("settings.manage") ? (
            <button
              type="button"
              onClick={() => onPageChange?.("settings")}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </button>
          ) : null}

          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((current) => !current);
                setNotificationsOpen(false);
              }}
              className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-3 dark:border-slate-700"
            >
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-blue-700 ring-2 ring-blue-500 ring-offset-2 dark:bg-blue-500/20 dark:text-blue-300 dark:ring-offset-slate-900">
                <UserRound className="h-5 w-5" />
              </span>
              <div className="hidden max-w-[150px] text-left xl:block">
                <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">
                  {user?.roleLabel || "User"}
                </p>
                <p className="truncate text-xs text-slate-500">Secure session</p>
              </div>
              <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
            </button>

            {profileOpen ? (
              <div className="absolute right-0 mt-3 w-60 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
                <div className="border-b border-slate-100 px-3 py-3 dark:border-slate-800">
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {user?.roleLabel || "User"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Authenticated account</p>
                </div>

                {can("users.manage") ? (
                  <button
                    type="button"
                    onClick={() => {
                      onPageChange?.("user-management");
                      setProfileOpen(false);
                    }}
                    className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    <ShieldCheck className="h-4 w-4" /> Users & Roles
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    onPageChange?.("change-password");
                    setProfileOpen(false);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <KeyRound className="h-4 w-4" /> Change password
                </button>

                <button
                  type="button"
                  onClick={logout}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
