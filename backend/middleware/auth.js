const AuthSession = require("../models/AuthSession");
const User = require("../models/User");
const {
  SESSION_COOKIE_NAME,
  hashToken,
  secureCompare,
  clearSessionCookie,
  getClientIp,
} = require("../services/authService");
const { hasPermission } = require("../config/accessControl");

const requireAuth = async (req, res, next) => {
  try {
    const rawToken = req.cookies?.[SESSION_COOKIE_NAME];

    if (!rawToken) {
      return res.status(401).json({
        success: false,
        code: "AUTH_REQUIRED",
        message: "Authentication is required",
      });
    }

    const session = await AuthSession.findOne({
      tokenHash: hashToken(rawToken),
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      clearSessionCookie(res);
      return res.status(401).json({
        success: false,
        code: "SESSION_INVALID",
        message: "Your session has expired. Please sign in again.",
      });
    }

    const user = await User.findById(session.user);

    if (!user || user.status !== "Active") {
      session.revokedAt = new Date();
      await session.save();
      clearSessionCookie(res);

      return res.status(401).json({
        success: false,
        code: "USER_INACTIVE",
        message: "This user account is not active",
      });
    }

    req.user = user;
    req.authSession = session;

    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    if (!session.lastSeenAt || session.lastSeenAt.getTime() < fiveMinutesAgo) {
      AuthSession.updateOne(
        { _id: session._id },
        {
          $set: {
            lastSeenAt: new Date(),
            lastIp: getClientIp(req),
          },
        }
      ).catch((error) =>
        console.error("Session activity update error:", error.message)
      );
    }

    return next();
  } catch (error) {
    return next(error);
  }
};

const requirePasswordReady = (req, res, next) => {
  if (req.user?.mustChangePassword) {
    return res.status(428).json({
      success: false,
      code: "PASSWORD_CHANGE_REQUIRED",
      message: "Change the temporary password before using the application",
    });
  }

  return next();
};

const requireCsrf = (req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method.toUpperCase())) {
    return next();
  }

  const submitted = String(req.get("x-csrf-token") || "");
  const expectedHash = req.authSession?.csrfHash || "";

  if (!submitted || !secureCompare(hashToken(submitted), expectedHash)) {
    return res.status(403).json({
      success: false,
      code: "CSRF_INVALID",
      message: "Security token is missing or invalid. Refresh and try again.",
    });
  }

  return next();
};

const requirePermission = (...requiredPermissions) => (req, res, next) => {
  const allowed = requiredPermissions.some((permission) =>
    hasPermission(req.user, permission)
  );

  if (!allowed) {
    return res.status(403).json({
      success: false,
      code: "ACCESS_DENIED",
      message: "You do not have permission to perform this action",
    });
  }

  return next();
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.role)) {
    return res.status(403).json({
      success: false,
      code: "ROLE_DENIED",
      message: "This role is not allowed to perform this action",
    });
  }

  return next();
};

module.exports = {
  requireAuth,
  requirePasswordReady,
  requireCsrf,
  requirePermission,
  requireRole,
};
