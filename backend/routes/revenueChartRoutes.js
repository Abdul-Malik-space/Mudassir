const express = require("express");

const {
  getRevenueChart,
} = require("../controllers/revenueChartController");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GET /api/dashboard/revenue-chart
|--------------------------------------------------------------------------
*/

router.get("/", getRevenueChart);

module.exports = router;