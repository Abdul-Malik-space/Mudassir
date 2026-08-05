const PERMISSIONS = Object.freeze({
  DASHBOARD_VIEW: "dashboard.view",
  CUSTOMERS_MANAGE: "customers.manage",
  VENDORS_MANAGE: "vendors.manage",
  TRADERS_MANAGE: "traders.manage",
  ITEMS_MANAGE: "items.manage",
  PURCHASE_MANAGE: "purchase.manage",
  PRODUCTION_MANAGE: "production.manage",
  READY_PRODUCTS_MANAGE: "ready-products.manage",
  SALES_MANAGE: "sales.manage",
  PAYMENTS_MANAGE: "payments.manage",
  JOURNAL_MANAGE: "journal.manage",
  EXPENSES_MANAGE: "expenses.manage",
  PAYROLL_MANAGE: "payroll.manage",
  ACCOUNTS_VIEW: "accounts.view",
  WAREHOUSES_MANAGE: "warehouses.manage",
  REPORTS_VIEW: "reports.view",
  SETTINGS_MANAGE: "settings.manage",
  USERS_MANAGE: "users.manage",
  SECURITY_AUDIT_VIEW: "security-audit.view",
  SYSTEM_RESET: "system.reset",
});

const ROLE_DEFINITIONS = Object.freeze({
  super_admin: {
    label: "Super Administrator",
    permissions: ["*"],
  },
  admin: {
    label: "Administrator",
    permissions: Object.values(PERMISSIONS).filter(
      (permission) => permission !== PERMISSIONS.SYSTEM_RESET
    ),
  },
  manager: {
    label: "Manager",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.CUSTOMERS_MANAGE,
      PERMISSIONS.VENDORS_MANAGE,
      PERMISSIONS.TRADERS_MANAGE,
      PERMISSIONS.ITEMS_MANAGE,
      PERMISSIONS.PURCHASE_MANAGE,
      PERMISSIONS.PRODUCTION_MANAGE,
      PERMISSIONS.READY_PRODUCTS_MANAGE,
      PERMISSIONS.SALES_MANAGE,
      PERMISSIONS.PAYMENTS_MANAGE,
      PERMISSIONS.EXPENSES_MANAGE,
      PERMISSIONS.PAYROLL_MANAGE,
      PERMISSIONS.ACCOUNTS_VIEW,
      PERMISSIONS.WAREHOUSES_MANAGE,
      PERMISSIONS.REPORTS_VIEW,
    ],
  },
  accountant: {
    label: "Accountant",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.PAYMENTS_MANAGE,
      PERMISSIONS.JOURNAL_MANAGE,
      PERMISSIONS.EXPENSES_MANAGE,
      PERMISSIONS.PAYROLL_MANAGE,
      PERMISSIONS.ACCOUNTS_VIEW,
      PERMISSIONS.REPORTS_VIEW,
    ],
  },
  purchase_officer: {
    label: "Purchase Officer",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.VENDORS_MANAGE,
      PERMISSIONS.ITEMS_MANAGE,
      PERMISSIONS.PURCHASE_MANAGE,
      PERMISSIONS.WAREHOUSES_MANAGE,
      PERMISSIONS.REPORTS_VIEW,
    ],
  },
  sales_officer: {
    label: "Sales Officer",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.CUSTOMERS_MANAGE,
      PERMISSIONS.READY_PRODUCTS_MANAGE,
      PERMISSIONS.SALES_MANAGE,
      PERMISSIONS.PAYMENTS_MANAGE,
      PERMISSIONS.REPORTS_VIEW,
    ],
  },
  production_officer: {
    label: "Production Officer",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.ITEMS_MANAGE,
      PERMISSIONS.PRODUCTION_MANAGE,
      PERMISSIONS.READY_PRODUCTS_MANAGE,
      PERMISSIONS.WAREHOUSES_MANAGE,
      PERMISSIONS.REPORTS_VIEW,
    ],
  },
  viewer: {
    label: "Viewer",
    permissions: [
      PERMISSIONS.DASHBOARD_VIEW,
      PERMISSIONS.REPORTS_VIEW,
    ],
  },
});

const getRolePermissions = (role) =>
  ROLE_DEFINITIONS[role]?.permissions || [];

const resolvePermissions = ({
  role,
  extraPermissions = [],
  deniedPermissions = [],
} = {}) => {
  const rolePermissions = getRolePermissions(role);

  if (rolePermissions.includes("*")) {
    return ["*"];
  }

  const denied = new Set(deniedPermissions);
  return [...new Set([...rolePermissions, ...extraPermissions])].filter(
    (permission) => !denied.has(permission)
  );
};

const hasPermission = (user, permission) => {
  if (!user || !permission) return false;
  const permissions = resolvePermissions(user);
  return permissions.includes("*") || permissions.includes(permission);
};

module.exports = {
  PERMISSIONS,
  ROLE_DEFINITIONS,
  resolvePermissions,
  hasPermission,
};
