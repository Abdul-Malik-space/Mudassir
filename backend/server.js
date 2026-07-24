const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

/*
|--------------------------------------------------------------------------
| Basic Middlewares
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

/*
|--------------------------------------------------------------------------
| CORS Configuration
|--------------------------------------------------------------------------
*/

const allowedOrigins = [
  "http://localhost:5173",
  "https://mudassir-2xsa.vercel.app",
  process.env.CLIENT_URL,

  ...(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim()),
]
  .map((origin) => String(origin || "").trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    /*
    Postman، curl اور server-to-server requests میں
    Origin header موجود نہیں ہوتا۔
    */

    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error("CORS rejected origin:", origin);

    return callback(null, false);
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
        console.log("DB Connected Successfully!");
        return connection;
      })
      .catch((error) => {
        /*
        Failed promise کو reset کریں تاکہ اگلی request
        دوبارہ connection try کر سکے۔
        */

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
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Server is running",
    databaseState: mongoose.connection.readyState,
  });
});

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "API is running",
    databaseState: mongoose.connection.readyState,
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
      error: error.message,
    });
  }
});

/*
|--------------------------------------------------------------------------
| Routes Import
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

const systemResetRoutes = require("./routes/systemResetRoutes");
const materialIssueRoutes = require(
  "./routes/materialIssueRoutes"
);





/*
|--------------------------------------------------------------------------
| Dashboard Routes
|--------------------------------------------------------------------------
*/


app.use(
  "/api/material-issues",
  materialIssueRoutes
);
app.use(
  "/api/system-reset",
  systemResetRoutes
);
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
| Dashboard Endpoints
|--------------------------------------------------------------------------
*/

app.use(
  "/api/dashboard/sales-chart",
  salesChartRoutes
);

app.use(
  "/api/dashboard/activity-feed",
  activityFeedRoutes
);

app.use(
  "/api/dashboard/table-section",
  tableSectionRoutes
);

app.use(
  "/api/dashboard/revenue-chart",
  revenueChartRoutes
);

app.use("/api/dashboard", dashboardRoutes);

/*
|--------------------------------------------------------------------------
| Main API Endpoints
|--------------------------------------------------------------------------
*/

app.use("/api/customers", customerRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/traders", traderRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/purchases", purchaseRoutes);

app.use(
  "/api/purchase-orders",
  purchaseOrderRoutes
);

app.use("/api/grns", grnRoutes);

app.use(
  "/api/general-journals",
  generalJournalRoutes
);

app.use("/api/lamination", laminationRoutes);
app.use("/api/printing", printingRoutes);

app.use(
  "/api/dieCutting",
  dieCuttingRoutes
);

app.use(
  "/api/diecutting",
  dieCuttingRoutes
);

app.use("/api/pasting", pastingRoutes);
app.use("/api/otherwork", otherWorkRoutes);

app.use(
  "/api/ready-products",
  readyProductRoutes
);

app.use("/api/expenses", expenseRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/reports-pro", reportRoutesPro);
app.use("/api/settings", settingRoutes);

app.use(
  "/api/production-items",
  productionItemRoutes
);

app.use("/api/headers", headerRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/jobs", jobsRoutes);

app.use(
  "/api/sales-orders",
  salesOrderRoutes
);

app.use(
  "/api/delivery-challans",
  deliveryChallanRoutes
);

app.use("/api/invoices", invoiceRoutes);

app.use(
  "/api/stock-ledger",
  stockLedgerRoutes
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

  return res.status(
    error.status || 500
  ).json({
    success: false,
    message:
      error.message || "Internal server error",
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
    });
}

/*
|--------------------------------------------------------------------------
| Vercel Export
|--------------------------------------------------------------------------
*/

module.exports = app;