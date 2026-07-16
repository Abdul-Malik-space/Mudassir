const express = require("express");

const {
  getActivityFeed,
} = require(
  "../controllers/activityFeedController"
);

const router = express.Router();

/*
|--------------------------------------------------------------------------
| GET /api/dashboard/activity-feed
|--------------------------------------------------------------------------
*/

router.get("/", getActivityFeed);

module.exports = router;