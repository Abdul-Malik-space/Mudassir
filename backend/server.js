const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Middlewares
app.use(express.json({ limit: "10mb" }));

const allowedOrigins = (process.env.CLIENT_URL || process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Database Connection
const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("MONGO_URI is missing. Please add it in environment variables.");
      return;
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("DB Connected Successfully!");
    }
  } catch (err) {
    console.error("DB Connection Error:", err.message);
  }
};

connectDB();

// Routes Import
const customerRoutes = require("./routes/customerRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const traderRoutes = require("./routes/traderRoutes");
const itemRoutes = require("./routes/itemRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const brandRoutes = require("./routes/brandRoutes");
const unitRoutes = require("./routes/unitRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const laminationRoutes = require("./routes/laminationRoutes");
const printingRoutes = require("./routes/printingRoutes");
const dieCuttingRoutes = require("./routes/dieCuttingRoutes");
const pastingRoutes = require("./routes/pastingRoutes");
const otherWorkRoutes = require("./routes/otherWorkRoutes");
const readyProductRoutes = require("./routes/readyProductsRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const payrollRoutes = require("./routes/payrollRoutes");
const accountRoutes = require("./routes/accountRoutes");
const warehouseRoutes = require("./routes/warehouseRoutes");
const reportRoutes = require("./routes/reportRoutes");
const settingRoutes = require("./routes/settingsRoutes");
const productionItemRoutes = require("./routes/productionItemRoutes");
const headerRoutes = require("./routes/headerRoutes");
const salesRoutes = require("./routes/salesRoutes");
const jobsRoutes = require("./routes/jobsRoutes");

app.use("/api/customers", customerRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/traders", traderRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/lamination", laminationRoutes);
app.use("/api/printing", printingRoutes);
app.use("/api/dieCutting", dieCuttingRoutes);
app.use("/api/diecutting", dieCuttingRoutes);
app.use("/api/pasting", pastingRoutes);
app.use("/api/otherwork", otherWorkRoutes);
app.use("/api/ready-products", readyProductRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/account", accountRoutes);
app.use("/api/warehouses", warehouseRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/settings", settingRoutes);
app.use("/api/production-items", productionItemRoutes);
app.use("/api/headers", headerRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/jobs", jobsRoutes);

app.get("/", (req, res) => {
  res.send("Backend running...");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
  });
});

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ message: err.message || "Server error" });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
