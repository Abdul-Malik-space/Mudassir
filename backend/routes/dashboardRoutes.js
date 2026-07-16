const express = require("express");

const {
  getDashboardStats,
} = require("../controllers/dashboardController");

const router = express.Router();

// GET /api/dashboard/stats
router.get("/stats", getDashboardStats);

module.exports = router;