const express = require("express");
const router = express.Router();

const Header = require("../models/Header");

const ALLOWED_FIELDS = [
  "adminLabel",
  "searchPlaceholder",
  "darkMode",
  "notificationPollSeconds",
];

const cleanUpdate = (body = {}) => {
  const update = {};

  for (const field of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      update[field] = body[field];
    }
  }

  if (Object.prototype.hasOwnProperty.call(update, "adminLabel")) {
    update.adminLabel = String(update.adminLabel || "Admin").trim() || "Admin";
  }

  if (Object.prototype.hasOwnProperty.call(update, "searchPlaceholder")) {
    update.searchPlaceholder =
      String(update.searchPlaceholder || "Search Anything").trim() ||
      "Search Anything";
  }

  if (Object.prototype.hasOwnProperty.call(update, "notificationPollSeconds")) {
    const seconds = Number(update.notificationPollSeconds);
    update.notificationPollSeconds = Number.isFinite(seconds)
      ? Math.min(Math.max(seconds, 10), 300)
      : 30;
  }

  if (Object.prototype.hasOwnProperty.call(update, "darkMode")) {
    update.darkMode = Boolean(update.darkMode);
  }

  return update;
};

const getOrCreateHeader = async () => {
  return Header.findOneAndUpdate(
    { key: "main" },
    {
      $setOnInsert: {
        key: "main",
        adminLabel: "Admin",
        searchPlaceholder: "Search Anything",
        darkMode: false,
        notificationPollSeconds: 30,
        lastNotificationReadAt: null,
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
      runValidators: true,
    }
  );
};

// Header singleton configuration used by the React Header.
router.get("/config", async (req, res) => {
  try {
    const header = await getOrCreateHeader();

    return res.status(200).json({
      success: true,
      data: header,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Header configuration could not be loaded",
      error: error.message,
    });
  }
});

router.put("/config", async (req, res) => {
  try {
    await getOrCreateHeader();

    const header = await Header.findOneAndUpdate(
      { key: "main" },
      { $set: cleanUpdate(req.body) },
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Header configuration updated successfully",
      data: header,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Header configuration could not be updated",
      error: error.message,
    });
  }
});

// Saves the latest Dashboard activity timestamp viewed by the Admin.
router.patch("/notifications/read", async (req, res) => {
  try {
    await getOrCreateHeader();

    const requestedDate = req.body?.readAt ? new Date(req.body.readAt) : new Date();

    if (Number.isNaN(requestedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification read date",
      });
    }

    const header = await Header.findOneAndUpdate(
      { key: "main" },
      { $set: { lastNotificationReadAt: requestedDate } },
      {
        new: true,
        runValidators: true,
      }
    );

    return res.status(200).json({
      success: true,
      message: "Notifications marked as read",
      data: header,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Notification read status could not be saved",
      error: error.message,
    });
  }
});

// Compatibility endpoint for any older frontend still calling /headers/all.
router.get("/all", async (req, res) => {
  try {
    const header = await getOrCreateHeader();
    return res.status(200).json([header]);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Header configuration could not be loaded",
      error: error.message,
    });
  }
});

// Compatibility endpoint: keeps a single Header record instead of duplicates.
router.post("/add", async (req, res) => {
  try {
    await getOrCreateHeader();

    const header = await Header.findOneAndUpdate(
      { key: "main" },
      { $set: cleanUpdate(req.body) },
      { new: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: "Header configuration saved successfully",
      data: header,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Header configuration could not be saved",
      error: error.message,
    });
  }
});

router.put("/update/:id", async (req, res) => {
  try {
    const header = await Header.findByIdAndUpdate(
      req.params.id,
      { $set: cleanUpdate(req.body) },
      { new: true, runValidators: true }
    );

    if (!header) {
      return res.status(404).json({
        success: false,
        message: "Header configuration not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Header configuration updated successfully",
      data: header,
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Header configuration could not be updated",
      error: error.message,
    });
  }
});

module.exports = router;
