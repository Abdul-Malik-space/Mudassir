export const PAGE_PERMISSIONS = Object.freeze({
  dashboard: "dashboard.view",
  customers: "customers.manage",
  vendors: "vendors.manage",
  traders: "traders.manage",
  "list-items": "items.manage",
  "categories-list": "items.manage",
  "brand-list": "items.manage",
  "unit-list": "items.manage",
  "purchase-orders": "purchase.manage",
  grn: "purchase.manage",
  purchases: "purchase.manage",
  "production-items": "production.manage",
  lamination: "production.manage",
  printing: "production.manage",
  "die-cutting": "production.manage",
  pasting: "production.manage",
  "other-work": "production.manage",
  departments: "production.manage",
  "ready-product": "ready-products.manage",
  sale: "sales.manage",
  "sales-orders": "sales.manage",
  "delivery-challans": "sales.manage",
  invoices: "sales.manage",
  "payments-received": "payments.manage",
  "general-journal": "journal.manage",
  expense: "expenses.manage",
  payroll: "payroll.manage",
  accounts: "accounts.view",
  warehouses: "warehouses.manage",
  reports: "reports.view",
  settings: "settings.manage",
  "user-management": "users.manage",
});

export const DEFAULT_PAGE_ORDER = [
  "dashboard",
  "customers",
  "vendors",
  "list-items",
  "purchase-orders",
  "production-items",
  "ready-product",
  "sales-orders",
  "payments-received",
  "general-journal",
  "expense",
  "payroll",
  "accounts",
  "warehouses",
  "reports",
  "settings",
  "user-management",
];

export const hasPermission = (permissions, permission) => {
  if (!permission) return true;
  const list = Array.isArray(permissions) ? permissions : [];
  return list.includes("*") || list.includes(permission);
};

export const canAccessPage = (permissions, pageId) => {
  if (pageId === "change-password") return true;
  return hasPermission(permissions, PAGE_PERMISSIONS[pageId]);
};

export const getFirstAccessiblePage = (permissions) =>
  DEFAULT_PAGE_ORDER.find((pageId) => canAccessPage(permissions, pageId)) ||
  "dashboard";
