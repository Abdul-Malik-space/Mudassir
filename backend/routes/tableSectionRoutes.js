const express = require("express");

const {
  getTableSectionSummary,
  getAllRecentOrders,
  getAllTopProducts,
} = require(
  "../controllers/tableSectionController"
);

const router = express.Router();

/*
|--------------------------------------------------------------------------
| All Recent Orders
|--------------------------------------------------------------------------
*/

router.get(
  "/recent-orders",
  getAllRecentOrders
);

/*
|--------------------------------------------------------------------------
| All Top Products
|--------------------------------------------------------------------------
*/

router.get(
  "/top-products",
  getAllTopProducts
);

/*
|--------------------------------------------------------------------------
| Dashboard Table Summary
|--------------------------------------------------------------------------
*/

router.get("/", getTableSectionSummary);

module.exports = router;