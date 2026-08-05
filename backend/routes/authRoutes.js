const express = require("express");
const rateLimit = require("express-rate-limit");
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const AuthSession = require("../models/AuthSession");
const {
  requireAuth,
  requireCsrf,
} = require("../middleware/auth");
const {
  normalizeLogin,
  getClientIp,
  clearSessionCookie,
  setUserPassword,
  sanitizeUser,
  createSession,
  rotateCsrfToken,
  revokeSession,
  revokeUserSessions,
  writeAudit,
} = require("../services/authService");

const router = express.Router();

const MAX_LOGIN_ATTEMPTS = Math.max(
  Number(process.env.MAX_LOGIN_ATTEMPTS || 5),
  3
);
const LOCK_MINUTES = Math.max(Number(process.env.LOCK_MINUTES || 15), 5);
const DUMMY_HASH = bcrypt.hashSync("invalid-password-placeholder", 12);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Math.max(Number(process.env.LOGIN_RATE_LIMIT || 20), 5),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: "LOGIN_RATE_LIMITED",
    message: "Too many sign-in attempts. Please wait and try again.",
  },
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const login = normalizeLogin(req.body.login || req.body.username);
    const password = String(req.body.password || "");
    const rememberMe = Boolean(req.body.rememberMe);

    if (!login || !password) {
      return res.status(400).json({
        success: false,
        message: "Username/email and password are required",
      });
    }

    const user = await User.findOne({
      $or: [{ username: login }, { email: login }],
    }).select(
      "+passwordHash +passwordHistory +failedLoginAttempts +lockUntil"
    );

    if (!user) {
      await bcrypt.compare(password, DUMMY_HASH);
      await writeAudit(req, {
        action: "LOGIN_FAILURE",
        outcome: "Failure",
        metadata: { login, reason: "unknown_account" },
      });

      return res.status(401).json({
        success: false,
        message: "Invalid username/email or password",
      });
    }

    if (user.status !== "Active") {
      await writeAudit(req, {
        targetUser: user._id,
        action: "LOGIN_FAILURE",
        outcome: "Failure",
        metadata: { reason: "inactive_account" },
      });

      return res.status(401).json({
        success: false,
        message: "Invalid username/email or password",
      });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      await writeAudit(req, {
        targetUser: user._id,
        action: "LOGIN_BLOCKED",
        outcome: "Failure",
        metadata: { lockUntil: user.lockUntil },
      });

      return res.status(423).json({
        success: false,
        code: "ACCOUNT_TEMPORARILY_LOCKED",
        message: "This account is temporarily locked. Try again later.",
      });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      user.failedLoginAttempts = Number(user.failedLoginAttempts || 0) + 1;

      if (user.failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        user.failedLoginAttempts = 0;
      }

      await user.save();
      await writeAudit(req, {
        targetUser: user._id,
        action: "LOGIN_FAILURE",
        outcome: "Failure",
        metadata: { reason: "invalid_password" },
      });

      return res.status(401).json({
        success: false,
        message: "Invalid username/email or password",
      });
    }

    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    user.lastLoginIp = getClientIp(req);
    await user.save();

    const { csrfToken, expiresAt } = await createSession(req, res, user, {
      rememberMe,
    });

    await writeAudit(req, {
      actor: user._id,
      targetUser: user._id,
      action: "LOGIN_SUCCESS",
      metadata: { rememberMe },
    });

    return res.status(200).json({
      success: true,
      message: "Signed in successfully",
      user: sanitizeUser(user),
      csrfToken,
      expiresAt,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({
      success: false,
      message: "Sign-in could not be completed",
    });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const csrfToken = await rotateCsrfToken(req.authSession);

    return res.status(200).json({
      success: true,
      user: sanitizeUser(req.user),
      csrfToken,
      expiresAt: req.authSession.expiresAt,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Session information could not be loaded",
    });
  }
});

router.post("/logout", requireAuth, requireCsrf, async (req, res) => {
  try {
    await revokeSession(req.authSession);
    clearSessionCookie(res);

    await writeAudit(req, {
      action: "LOGOUT",
      targetUser: req.user._id,
    });

    return res.status(200).json({
      success: true,
      message: "Signed out successfully",
    });
  } catch (error) {
    clearSessionCookie(res);
    return res.status(200).json({
      success: true,
      message: "Signed out",
    });
  }
});

router.post(
  "/change-password",
  requireAuth,
  requireCsrf,
  async (req, res) => {
    try {
      const currentPassword = String(req.body.currentPassword || "");
      const newPassword = String(req.body.newPassword || "");

      const user = await User.findById(req.user._id).select(
        "+passwordHash +passwordHistory"
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User account was not found",
        });
      }

      const currentMatches = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );

      if (!currentMatches) {
        await writeAudit(req, {
          action: "PASSWORD_CHANGE_FAILURE",
          outcome: "Failure",
          targetUser: user._id,
          metadata: { reason: "current_password_invalid" },
        });

        return res.status(400).json({
          success: false,
          message: "Current password is incorrect",
        });
      }

      await setUserPassword(user, newPassword, {
        mustChangePassword: false,
      });
      user.updatedBy = user._id;
      await user.save();

      await revokeUserSessions(user._id);
      clearSessionCookie(res);

      const { csrfToken, expiresAt } = await createSession(req, res, user, {
        rememberMe: false,
      });

      await writeAudit(req, {
        action: "PASSWORD_CHANGED",
        targetUser: user._id,
      });

      return res.status(200).json({
        success: true,
        message: "Password changed successfully",
        user: sanitizeUser(user),
        csrfToken,
        expiresAt,
      });
    } catch (error) {
      return res.status(error.status || 400).json({
        success: false,
        message: error.message || "Password could not be changed",
      });
    }
  }
);

router.patch(
  "/preferences",
  requireAuth,
  requireCsrf,
  async (req, res) => {
    try {
      if (typeof req.body.darkMode === "boolean") {
        req.user.preferences = {
          ...(req.user.preferences || {}),
          darkMode: req.body.darkMode,
        };
      }

      await req.user.save();

      return res.status(200).json({
        success: true,
        user: sanitizeUser(req.user),
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Preferences could not be updated",
      });
    }
  }
);

router.patch(
  "/notifications/read",
  requireAuth,
  requireCsrf,
  async (req, res) => {
    try {
      const requested = req.body.readAt ? new Date(req.body.readAt) : new Date();
      req.user.lastNotificationReadAt = Number.isNaN(requested.getTime())
        ? new Date()
        : requested;
      await req.user.save();

      return res.status(200).json({
        success: true,
        readAt: req.user.lastNotificationReadAt,
      });
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: "Notification status could not be updated",
      });
    }
  }
);

router.get("/sessions", requireAuth, async (req, res) => {
  const sessions = await AuthSession.find({
    user: req.user._id,
    revokedAt: null,
    expiresAt: { $gt: new Date() },
  })
    .sort({ lastSeenAt: -1 })
    .select("createdAt lastSeenAt expiresAt createdIp lastIp userAgent");

  return res.status(200).json({
    success: true,
    sessions,
  });
});

module.exports = router;
