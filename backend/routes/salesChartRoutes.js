const express = require("express");

const {
  getSalesChart,
} = require("../controllers/salesChartController");

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GET /api/dashboard/sales-chart
|--------------------------------------------------------------------------
*/

router.get("/", getSalesChart);

module.exports = router;