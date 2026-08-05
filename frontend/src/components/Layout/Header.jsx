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
  Filter,
  Loader2,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
} from "lucide-react";

import { API_BASE_URL } from "../../config/api";

const DEFAULT_CONFIG = {
  adminLabel: "Admin",
  searchPlaceholder: "Search Anything",
  darkMode: false,
  notificationPollSeconds: 30,
  lastNotificationReadAt: null,
};

const PAGE_TITLES = {
  dashboard: "Dashboard",
  customers: "Customers",
  vendors: "Vendors",
  traders: "Traders",
  "general-journal": "General Journal",
  "payments-received": "Payments & Received",
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
  expense: "Expense",
  payroll: "Payroll",
  accounts: "Accounts",
  warehouses: "Warehouses",
  reports: "Reports",
  settings: "Settings",
};

const normalizeArray = (value) => (Array.isArray(value) ? value : []);

const safeDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatRelativeTime = (value) => {
  const date = safeDate(value);
  if (!date) return "";

  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "Just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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

function Header({
  onToggleSidebar,
  currentPage = "dashboard",
  onPageChange,
}) {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [notifications, setNotifications] = useState([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");
  const [searchText, setSearchText] = useState("");

  const notificationRef = useRef(null);

  const pageTitle = PAGE_TITLES[currentPage] || "Dashboard";

  const loadHeaderConfig = useCallback(async () => {
    try {
      const result = await apiRequest(`${API_BASE_URL}/headers/config`);
      const incoming = result.data || result.header || result;

      setConfig((current) => ({
        ...current,
        ...incoming,
        adminLabel: incoming?.adminLabel || "Admin",
        searchPlaceholder:
          incoming?.searchPlaceholder || "Search Anything",
      }));
    } catch (error) {
      console.error("Header config load error:", error);
      setConfig(DEFAULT_CONFIG);
    }
  }, []);

  const loadNotifications = useCallback(async (showLoader = false) => {
    try {
      if (showLoader) setNotificationsLoading(true);
      setNotificationsError("");

      const result = await apiRequest(
        `${API_BASE_URL}/dashboard/activity-feed?limit=100`
      );

      setNotifications(normalizeArray(result.data));
    } catch (error) {
      console.error("Header notifications load error:", error);
      setNotificationsError(
        error.message || "Notifications could not be loaded"
      );
    } finally {
      if (showLoader) setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHeaderConfig();
  }, [loadHeaderConfig]);

  useEffect(() => {
    loadNotifications(true);

    const seconds = Math.min(
      Math.max(Number(config.notificationPollSeconds || 30), 10),
      300
    );

    const timer = window.setInterval(() => {
      loadNotifications(false);
    }, seconds * 1000);

    return () => window.clearInterval(timer);
  }, [config.notificationPollSeconds, loadNotifications]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", Boolean(config.darkMode));
  }, [config.darkMode]);

  useEffect(() => {
    const closeOnOutsideClick = (event) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target)
      ) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  const unreadCount = useMemo(() => {
    const readAt = safeDate(config.lastNotificationReadAt);

    if (!readAt) {
      return notifications.length;
    }

    return notifications.filter((notification) => {
      const createdAt = safeDate(notification.createdAt);
      return createdAt && createdAt > readAt;
    }).length;
  }, [config.lastNotificationReadAt, notifications]);

  const visibleNotifications = notifications.slice(0, 6);

  const markNotificationsRead = async () => {
    const latestCreatedAt = notifications[0]?.createdAt;
    const readAt = safeDate(latestCreatedAt)?.toISOString() || new Date().toISOString();

    setConfig((current) => ({
      ...current,
      lastNotificationReadAt: readAt,
    }));

    try {
      await apiRequest(`${API_BASE_URL}/headers/notifications/read`, {
        method: "PATCH",
        body: JSON.stringify({ readAt }),
      });
    } catch (error) {
      console.error("Notification read status save error:", error);
    }
  };

  const toggleNotifications = async () => {
    const willOpen = !notificationsOpen;
    setNotificationsOpen(willOpen);

    if (willOpen) {
      await loadNotifications(false);
      await markNotificationsRead();
    }
  };

  const toggleTheme = async () => {
    const darkMode = !config.darkMode;

    setConfig((current) => ({ ...current, darkMode }));

    try {
      await apiRequest(`${API_BASE_URL}/headers/config`, {
        method: "PUT",
        body: JSON.stringify({ darkMode }),
      });
    } catch (error) {
      console.error("Theme preference save error:", error);
    }
  };

  const openSettings = () => {
    if (onPageChange) onPageChange("settings");
  };

  return (
    <header className="relative z-30 w-full border-b border-slate-200 bg-white/90 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/90">
      <div className="w-full px-4 py-3 sm:px-5 xl:px-6">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-3 lg:grid-cols-[minmax(260px,1fr)_minmax(220px,420px)_auto]">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={onToggleSidebar}
              aria-label="Toggle sidebar"
              className="inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Menu className="h-5 w-5" />
            </button>

            <h1 className="truncate text-xl font-black leading-tight text-slate-800 dark:text-white sm:text-2xl">
              {pageTitle}
            </h1>
          </div>

          <div className="order-3 col-span-2 w-full lg:order-none lg:col-span-1 lg:max-w-[420px] lg:justify-self-center">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

              <input
                type="text"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder={config.searchPlaceholder || "Search Anything"}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-100 pl-10 pr-12 text-sm text-slate-800 placeholder:text-slate-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />

              <button
                type="button"
                aria-label="Search filters"
                className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-200"
              >
                <Filter className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center justify-end gap-1 sm:gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Change theme"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {config.darkMode ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>

            <div ref={notificationRef} className="relative">
              <button
                type="button"
                onClick={toggleNotifications}
                aria-label="Notifications"
                aria-expanded={notificationsOpen}
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <Bell className="h-5 w-5" />

                {unreadCount > 0 ? (
                  <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-500 px-1 text-[10px] font-bold text-white dark:border-slate-900">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                ) : null}
              </button>

              {notificationsOpen ? (
                <div className="absolute right-0 mt-3 w-[340px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:w-[380px]">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
                    <div>
                      <h2 className="font-bold text-slate-900 dark:text-white">
                        Notifications
                      </h2>
                      <p className="text-xs text-slate-500">
                        Live updates from Dashboard activity
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadNotifications(true)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="max-h-[420px] overflow-y-auto">
                    {notificationsLoading ? (
                      <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-slate-500">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading notifications...
                      </div>
                    ) : notificationsError ? (
                      <div className="px-4 py-8 text-center text-sm text-red-600">
                        {notificationsError}
                      </div>
                    ) : visibleNotifications.length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm text-slate-500">
                        No notifications found.
                      </div>
                    ) : (
                      visibleNotifications.map((notification) => (
                        <div
                          key={notification.id || notification._id || `${notification.createdAt}-${notification.title}`}
                          className="border-b border-slate-100 px-4 py-3 last:border-0 dark:border-slate-800"
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-1 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-blue-500" />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                                {notification.title || "Dashboard update"}
                              </p>
                              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                                {notification.description || ""}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-400">
                                {formatRelativeTime(notification.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={openSettings}
              aria-label="Settings"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <Settings className="h-5 w-5" />
            </button>

            <div className="ml-1 flex min-w-0 items-center gap-2.5 border-l border-slate-200 pl-3 dark:border-slate-700">
              <div className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-purple-600 font-bold text-white shadow-sm">
                A
              </div>

              <p className="hidden max-w-[110px] truncate text-sm font-semibold text-slate-700 dark:text-slate-200 sm:block">
                {config.adminLabel || "Admin"}
              </p>

              <ChevronDown className="hidden h-4 w-4 flex-shrink-0 text-slate-400 sm:block" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
