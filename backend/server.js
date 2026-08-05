const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const helmet = require("helmet");
require("dotenv").config();

const {
  requireAuth,
  requirePasswordReady,
  requireCsrf,
  requirePermission,
  requireRole,
} = require("./middleware/auth");

const {
  PERMISSIONS,
} = require("./config/accessControl");

const app = express();

/*
|--------------------------------------------------------------------------
| Application Security
|--------------------------------------------------------------------------
*/

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

/*
|--------------------------------------------------------------------------
| Request Parsers
|--------------------------------------------------------------------------
*/

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  })
);

app.use(cookieParser());

/*
|--------------------------------------------------------------------------
| CORS Configuration
|--------------------------------------------------------------------------
*/

const allowedOrigins = [
  "http://localhost:5173",
  "https://mudassir-2xsa.vercel.app",
  process.env.CLIENT_URL,
  ...(process.env.ALLOWED_ORIGINS || "").split(","),
]
  .map((origin) => String(origin || "").trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    /*
    Postman، curl اور server-to-server requests میں
    Origin header موجود نہیں ہوتا۔
    */

    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error("CORS rejected origin:", origin);

    return callback(
      new Error("Origin is not allowed by CORS")
    );
  },

  credentials: true,

  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],

  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-CSRF-Token",
    "Accept",
  ],
};

app.use(cors(corsOptions));

/*
|--------------------------------------------------------------------------
| MongoDB Connection
|--------------------------------------------------------------------------
*/

let databaseConnectionPromise = null;

const connectDB = async () => {
  /*
  readyState:
  0 = disconnected
  1 = connected
  2 = connecting
  3 = disconnecting
  */

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGO_URI) {
    throw new Error(
      "MONGO_URI is missing from environment variables."
    );
  }

  /*
  Serverless cold start کے دوران ایک ہی connection promise
  دوبارہ استعمال ہوگا۔
  */

  if (!databaseConnectionPromise) {
    databaseConnectionPromise = mongoose
      .connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
        socketTimeoutMS: 45000,
      })
      .then((connection) => {
        console.log("Database connected successfully");
        return connection;
      })
      .catch((error) => {
        databaseConnectionPromise = null;
        throw error;
      });
  }

  return databaseConnectionPromise;
};

/*
|--------------------------------------------------------------------------
| Public Health Routes
| یہ routes database کے بغیر بھی کام کریں گے۔
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Backend API is running",
    environment:
      process.env.NODE_ENV || "development",
  });
});

app.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Server is running",
    databaseState:
      mongoose.connection.readyState,
  });
});

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "API is running",
    databaseState:
      mongoose.connection.readyState,
  });
});

/*
|--------------------------------------------------------------------------
| Database Middleware
| ہر /api request سے پہلے MongoDB connection مکمل ہوگا۔
|--------------------------------------------------------------------------
*/

app.use("/api", async (req, res, next) => {
  try {
    await connectDB();
    return next();
  } catch (error) {
    console.error(
      "Database middleware error:",
      error.message
    );

    return res.status(503).json({
      success: false,
      message: "Database connection failed",
      ...(process.env.NODE_ENV !== "production" && {
        error: error.message,
      }),
    });
  }
});

/*
|--------------------------------------------------------------------------
| Authentication Routes
|--------------------------------------------------------------------------
*/

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");

/*
|--------------------------------------------------------------------------
| Business Routes Import
|--------------------------------------------------------------------------
*/

const customerRoutes = require("./routes/customerRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const traderRoutes = require("./routes/traderRoutes");
const itemRoutes = require("./routes/itemRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const brandRoutes = require("./routes/brandRoutes");
const unitRoutes = require("./routes/unitRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const purchaseOrderRoutes = require(
  "./routes/purchaseOrderRoutes"
);
const grnRoutes = require("./routes/grnRoutes");
const generalJournalRoutes = require(
  "./routes/generalJournalRoutes"
);
const paymentsReceivedRoutes = require(
  "./routes/paymentsReceivedRoutes"
);
const laminationRoutes = require(
  "./routes/laminationRoutes"
);
const printingRoutes = require(
  "./routes/printingRoutes"
);
const dieCuttingRoutes = require(
  "./routes/dieCuttingRoutes"
);
const pastingRoutes = require(
  "./routes/pastingRoutes"
);
const otherWorkRoutes = require(
  "./routes/otherWorkRoutes"
);
const readyProductRoutes = require(
  "./routes/readyProductsRoutes"
);
const expenseRoutes = require(
  "./routes/expenseRoutes"
);
const payrollRoutes = require(
  "./routes/payrollRoutes"
);
const accountRoutes = require(
  "./routes/accountRoutes"
);
const warehouseRoutes = require(
  "./routes/warehouseRoutes"
);
const reportRoutesPro = require(
  "./routes/reportRoutesPro"
);
const settingRoutes = require(
  "./routes/settingsRoutes"
);
const productionItemRoutes = require(
  "./routes/productionItemRoutes"
);
const headerRoutes = require(
  "./routes/headerRoutes"
);
const salesRoutes = require("./routes/salesRoutes");
const jobsRoutes = require("./routes/jobsRoutes");
const salesOrderRoutes = require(
  "./routes/salesOrderRoutes"
);
const deliveryChallanRoutes = require(
  "./routes/deliveryChallanRoutes"
);
const invoiceRoutes = require(
  "./routes/invoiceRoutes"
);
const stockLedgerRoutes = require(
  "./routes/stockLedgerRoutes"
);
const systemResetRoutes = require(
  "./routes/systemResetRoutes"
);
const materialIssueRoutes = require(
  "./routes/materialIssueRoutes"
);

/*
|--------------------------------------------------------------------------
| Dashboard Routes Import
|--------------------------------------------------------------------------
*/

const dashboardRoutes = require(
  "./routes/dashboardRoutes"
);
const revenueChartRoutes = require(
  "./routes/revenueChartRoutes"
);
const salesChartRoutes = require(
  "./routes/salesChartRoutes"
);
const tableSectionRoutes = require(
  "./routes/tableSectionRoutes"
);
const activityFeedRoutes = require(
  "./routes/activityFeedRoutes"
);

/*
|--------------------------------------------------------------------------
| Authorization Helper
|--------------------------------------------------------------------------
|
| requirePermission کئی permissions ملنے پر OR rule استعمال کرتا ہے۔
| مثال: stock ledger کو warehouse یا reports permission رکھنے والا user
| استعمال کرسکتا ہے۔
|
*/

const protect = (...permissions) => [
  requireAuth,
  requirePasswordReady,
  requireCsrf,
  requirePermission(...permissions),
];

/*
|--------------------------------------------------------------------------
| Public Authentication Endpoints
|--------------------------------------------------------------------------
|
| Login public ہے۔ /me، logout، change-password اور preferences پر
| authRoutes اپنی متعلقہ authentication/CSRF middleware لگاتا ہے۔
|
*/

app.use("/api/auth", authRoutes);

/*
|--------------------------------------------------------------------------
| User and Role Management
|--------------------------------------------------------------------------
|
| userRoutes بھی permission چیک کرتا ہے۔ یہاں password-ready guard اضافی
| تحفظ فراہم کرتا ہے تاکہ temporary password والا user management نہ چلا سکے۔
|
*/

app.use(
  "/api/users",
  requireAuth,
  requirePasswordReady,
  userRoutes
);

/*
|--------------------------------------------------------------------------
| Protected Dashboard Endpoints
|--------------------------------------------------------------------------
*/

app.use(
  "/api/dashboard/sales-chart",
  ...protect(PERMISSIONS.DASHBOARD_VIEW),
  salesChartRoutes
);

app.use(
  "/api/dashboard/activity-feed",
  ...protect(PERMISSIONS.DASHBOARD_VIEW),
  activityFeedRoutes
);

app.use(
  "/api/dashboard/table-section",
  ...protect(PERMISSIONS.DASHBOARD_VIEW),
  tableSectionRoutes
);

app.use(
  "/api/dashboard/revenue-chart",
  ...protect(PERMISSIONS.DASHBOARD_VIEW),
  revenueChartRoutes
);

app.use(
  "/api/dashboard",
  ...protect(PERMISSIONS.DASHBOARD_VIEW),
  dashboardRoutes
);

/*
|--------------------------------------------------------------------------
| Customers, Vendors and Items
|--------------------------------------------------------------------------
*/

app.use(
  "/api/customers",
  ...protect(PERMISSIONS.CUSTOMERS_MANAGE),
  customerRoutes
);

app.use(
  "/api/vendors",
  ...protect(PERMISSIONS.VENDORS_MANAGE),
  vendorRoutes
);

app.use(
  "/api/traders",
  ...protect(PERMISSIONS.TRADERS_MANAGE),
  traderRoutes
);

app.use(
  "/api/items",
  ...protect(PERMISSIONS.ITEMS_MANAGE),
  itemRoutes
);

app.use(
  "/api/categories",
  ...protect(PERMISSIONS.ITEMS_MANAGE),
  categoryRoutes
);

app.use(
  "/api/brands",
  ...protect(PERMISSIONS.ITEMS_MANAGE),
  brandRoutes
);

app.use(
  "/api/units",
  ...protect(PERMISSIONS.ITEMS_MANAGE),
  unitRoutes
);

/*
|--------------------------------------------------------------------------
| Purchases
|--------------------------------------------------------------------------
*/

app.use(
  "/api/purchases",
  ...protect(PERMISSIONS.PURCHASE_MANAGE),
  purchaseRoutes
);

app.use(
  "/api/purchase-orders",
  ...protect(PERMISSIONS.PURCHASE_MANAGE),
  purchaseOrderRoutes
);

app.use(
  "/api/grns",
  ...protect(PERMISSIONS.PURCHASE_MANAGE),
  grnRoutes
);

/*
|--------------------------------------------------------------------------
| Accounting
|--------------------------------------------------------------------------
*/

app.use(
  "/api/general-journals",
  ...protect(PERMISSIONS.JOURNAL_MANAGE),
  generalJournalRoutes
);

app.use(
  "/api/payments-received",
  ...protect(PERMISSIONS.PAYMENTS_MANAGE),
  paymentsReceivedRoutes
);

app.use(
  "/api/expenses",
  ...protect(PERMISSIONS.EXPENSES_MANAGE),
  expenseRoutes
);

app.use(
  "/api/payroll",
  ...protect(PERMISSIONS.PAYROLL_MANAGE),
  payrollRoutes
);

app.use(
  "/api/account",
  ...protect(PERMISSIONS.ACCOUNTS_VIEW),
  accountRoutes
);

/*
|--------------------------------------------------------------------------
| Production
|--------------------------------------------------------------------------
*/

app.use(
  "/api/lamination",
  ...protect(PERMISSIONS.PRODUCTION_MANAGE),
  laminationRoutes
);

app.use(
  "/api/printing",
  ...protect(PERMISSIONS.PRODUCTION_MANAGE),
  printingRoutes
);

app.use(
  "/api/dieCutting",
  ...protect(PERMISSIONS.PRODUCTION_MANAGE),
  dieCuttingRoutes
);

app.use(
  "/api/diecutting",
  ...protect(PERMISSIONS.PRODUCTION_MANAGE),
  dieCuttingRoutes
);

app.use(
  "/api/pasting",
  ...protect(PERMISSIONS.PRODUCTION_MANAGE),
  pastingRoutes
);

app.use(
  "/api/otherwork",
  ...protect(PERMISSIONS.PRODUCTION_MANAGE),
  otherWorkRoutes
);

app.use(
  "/api/production-items",
  ...protect(PERMISSIONS.PRODUCTION_MANAGE),
  productionItemRoutes
);

app.use(
  "/api/material-issues",
  ...protect(PERMISSIONS.PRODUCTION_MANAGE),
  materialIssueRoutes
);

app.use(
  "/api/jobs",
  ...protect(PERMISSIONS.PRODUCTION_MANAGE),
  jobsRoutes
);

app.use(
  "/api/ready-products",
  ...protect(PERMISSIONS.READY_PRODUCTS_MANAGE),
  readyProductRoutes
);

/*
|--------------------------------------------------------------------------
| Sales
|--------------------------------------------------------------------------
*/

app.use(
  "/api/sales",
  ...protect(PERMISSIONS.SALES_MANAGE),
  salesRoutes
);

app.use(
  "/api/sales-orders",
  ...protect(PERMISSIONS.SALES_MANAGE),
  salesOrderRoutes
);

app.use(
  "/api/delivery-challans",
  ...protect(PERMISSIONS.SALES_MANAGE),
  deliveryChallanRoutes
);

app.use(
  "/api/invoices",
  ...protect(PERMISSIONS.SALES_MANAGE),
  invoiceRoutes
);

/*
|--------------------------------------------------------------------------
| Warehouses and Reports
|--------------------------------------------------------------------------
*/

app.use(
  "/api/warehouses",
  ...protect(PERMISSIONS.WAREHOUSES_MANAGE),
  warehouseRoutes
);

app.use(
  "/api/stock-ledger",
  ...protect(
    PERMISSIONS.WAREHOUSES_MANAGE,
    PERMISSIONS.REPORTS_VIEW
  ),
  stockLedgerRoutes
);

app.use(
  "/api/reports-pro",
  ...protect(PERMISSIONS.REPORTS_VIEW),
  reportRoutesPro
);

/*
|--------------------------------------------------------------------------
| Settings and Header Configuration
|--------------------------------------------------------------------------
*/

app.use(
  "/api/settings",
  ...protect(PERMISSIONS.SETTINGS_MANAGE),
  settingRoutes
);

/*
Header configuration کا legacy endpoint محفوظ رکھا گیا ہے، مگر اب صرف
settings permission رکھنے والا user اسے access کرسکتا ہے۔ نیا authenticated
Header profile اور notification preferences /api/auth سے لیتا ہے۔
*/

app.use(
  "/api/headers",
  ...protect(PERMISSIONS.SETTINGS_MANAGE),
  headerRoutes
);

/*
|--------------------------------------------------------------------------
| System Reset — Super Administrator Only
|--------------------------------------------------------------------------
*/

app.use(
  "/api/system-reset",
  requireAuth,
  requirePasswordReady,
  requireCsrf,
  requireRole("super_admin"),
  systemResetRoutes
);

/*
|--------------------------------------------------------------------------
| 404 Middleware
|--------------------------------------------------------------------------
*/

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
    path: req.originalUrl,
  });
});

/*
|--------------------------------------------------------------------------
| Global Error Middleware
|--------------------------------------------------------------------------
*/

app.use((error, req, res, next) => {
  console.error(
    "Unhandled server error:",
    error.stack || error.message
  );

  const isProduction =
    process.env.NODE_ENV === "production";

  return res
    .status(error.status || 500)
    .json({
      success: false,
      message: isProduction
        ? "Internal server error"
        : error.message ||
          "Internal server error",
    });
});

/*
|--------------------------------------------------------------------------
| Local Server
| Vercel پر app.listen نہیں چلے گا، صرف app export ہوگا۔
|--------------------------------------------------------------------------
*/

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(
          `Server running on port ${PORT}`
        );
      });
    })
    .catch((error) => {
      console.error(
        "Server startup failed:",
        error.message
      );

      process.exitCode = 1;
    });
}

/*
|--------------------------------------------------------------------------
| Vercel Export
|--------------------------------------------------------------------------
*/

module.exports = app;
