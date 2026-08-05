const express = require("express");

const User = require("../models/User");
const AuthSession = require("../models/AuthSession");
const SecurityAudit = require("../models/SecurityAudit");
const {
  ROLE_DEFINITIONS,
  PERMISSIONS,
  resolvePermissions,
} = require("../config/accessControl");
const {
  requireAuth,
  requireCsrf,
  requirePermission,
} = require("../middleware/auth");
const {
  normalizeLogin,
  setUserPassword,
  sanitizeUser,
  revokeUserSessions,
  writeAudit,
} = require("../services/authService");

const router = express.Router();

router.use(requireAuth);
router.use(requirePermission(PERMISSIONS.USERS_MANAGE));

const ensureValidRole = (role) => {
  if (!ROLE_DEFINITIONS[role]) {
    const error = new Error("Select a valid role");
    error.status = 400;
    throw error;
  }
};

const ensureActorCanManageRole = (actor, targetRole, existingRole = null) => {
  const touchesSuperAdmin =
    targetRole === "super_admin" || existingRole === "super_admin";

  if (touchesSuperAdmin && actor.role !== "super_admin") {
    const error = new Error(
      "Only a Super Administrator can create or modify a Super Administrator"
    );
    error.status = 403;
    throw error;
  }
};

const ensureLastSuperAdminIsSafe = async (targetUser, nextRole, nextStatus) => {
  const removingSuperAdmin =
    targetUser.role === "super_admin" &&
    (nextRole !== "super_admin" || nextStatus !== "Active");

  if (!removingSuperAdmin) return;

  const activeSuperAdmins = await User.countDocuments({
    role: "super_admin",
    status: "Active",
  });

  if (activeSuperAdmins <= 1) {
    const error = new Error("The last active Super Administrator cannot be removed");
    error.status = 400;
    throw error;
  }
};

router.get("/roles", async (req, res) => {
  const roles = Object.entries(ROLE_DEFINITIONS)
    .filter(([value]) => req.user.role === "super_admin" || value !== "super_admin")
    .map(([value, definition]) => ({
      value,
      label: definition.label,
      permissions: definition.permissions,
    }));

  return res.status(200).json({
    success: true,
    roles,
    permissions: Object.values(PERMISSIONS),
  });
});

router.get("/all", async (req, res) => {
  try {
    const search = String(req.query.search || "").trim();
    const role = String(req.query.role || "").trim();
    const status = String(req.query.status || "").trim();
    const query = {};

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (role && role !== "All") query.role = role;
    if (status && status !== "All") query.status = status;

    const users = await User.find(query).sort({ createdAt: -1 }).lean();

    const sessionCounts = await AuthSession.aggregate([
      {
        $match: {
          revokedAt: null,
          expiresAt: { $gt: new Date() },
        },
      },
      {
        $group: {
          _id: "$user",
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = new Map(
      sessionCounts.map((row) => [String(row._id), Number(row.count || 0)])
    );

    return res.status(200).json({
      success: true,
      users: users.map((user) => ({
        ...sanitizeUser(user),
        extraPermissions: user.extraPermissions || [],
        deniedPermissions: user.deniedPermissions || [],
        effectivePermissions: resolvePermissions(user),
        activeSessions: countMap.get(String(user._id)) || 0,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Users could not be loaded",
    });
  }
});

router.post("/add", requireCsrf, async (req, res) => {
  try {
    const username = normalizeLogin(req.body.username);
    const email = normalizeLogin(req.body.email);
    const role = String(req.body.role || "viewer");
    const password = String(req.body.password || "");

    ensureValidRole(role);
    ensureActorCanManageRole(req.user, role);

    if (!username) {
      return res.status(400).json({
        success: false,
        message: "Username is required",
      });
    }

    const existing = await User.findOne({
      $or: [
        { username },
        ...(email ? [{ email }] : []),
      ],
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Username or email is already in use",
      });
    }

    const user = new User({
      username,
      email,
      role,
      status: req.body.status === "Inactive" ? "Inactive" : "Active",
      extraPermissions: Array.isArray(req.body.extraPermissions)
        ? req.body.extraPermissions
        : [],
      deniedPermissions: Array.isArray(req.body.deniedPermissions)
        ? req.body.deniedPermissions
        : [],
      createdBy: req.user._id,
      updatedBy: req.user._id,
      passwordHash: "temporary",
      mustChangePassword: true,
    });

    user.passwordHash = "";
    await setUserPassword(user, password, { mustChangePassword: true });
    await user.save();

    await writeAudit(req, {
      action: "USER_CREATED",
      targetUser: user._id,
      metadata: { role: user.role, status: user.status },
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: sanitizeUser(user),
    });
  } catch (error) {
    return res.status(error.status || 400).json({
      success: false,
      message: error.message || "User could not be created",
    });
  }
});

router.put("/update/:id", requireCsrf, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User was not found",
      });
    }

    const nextRole = String(req.body.role || user.role);
    const nextStatus = ["Active", "Inactive"].includes(req.body.status)
      ? req.body.status
      : user.status;

    ensureValidRole(nextRole);
    ensureActorCanManageRole(req.user, nextRole, user.role);
    await ensureLastSuperAdminIsSafe(user, nextRole, nextStatus);

    if (String(user._id) === String(req.user._id) && nextStatus !== "Active") {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own account",
      });
    }

    if (req.body.username !== undefined) {
      user.username = normalizeLogin(req.body.username);
    }

    if (req.body.email !== undefined) {
      user.email = normalizeLogin(req.body.email);
    }

    user.role = nextRole;
    user.status = nextStatus;
    user.extraPermissions = Array.isArray(req.body.extraPermissions)
      ? req.body.extraPermissions
      : user.extraPermissions;
    user.deniedPermissions = Array.isArray(req.body.deniedPermissions)
      ? req.body.deniedPermissions
      : user.deniedPermissions;
    user.updatedBy = req.user._id;

    await user.save();

    if (nextStatus !== "Active") {
      await revokeUserSessions(user._id);
    }

    await writeAudit(req, {
      action: "USER_UPDATED",
      targetUser: user._id,
      metadata: {
        role: user.role,
        status: user.status,
        extraPermissions: user.extraPermissions,
        deniedPermissions: user.deniedPermissions,
      },
    });

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Username or email is already in use",
      });
    }

    return res.status(error.status || 400).json({
      success: false,
      message: error.message || "User could not be updated",
    });
  }
});

router.post("/reset-password/:id", requireCsrf, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select(
      "+passwordHash +passwordHistory"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User was not found",
      });
    }

    const temporaryPassword = String(req.body.temporaryPassword || "");
    await setUserPassword(user, temporaryPassword, {
      mustChangePassword: true,
    });
    user.updatedBy = req.user._id;
    await user.save();
    await revokeUserSessions(user._id);

    await writeAudit(req, {
      action: "PASSWORD_RESET_BY_ADMIN",
      targetUser: user._id,
    });

    return res.status(200).json({
      success: true,
      message: "Temporary password set. The user must change it at next sign-in.",
    });
  } catch (error) {
    return res.status(error.status || 400).json({
      success: false,
      message: error.message || "Password could not be reset",
    });
  }
});

router.post("/revoke-sessions/:id", requireCsrf, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User was not found",
      });
    }

    await revokeUserSessions(user._id);

    await writeAudit(req, {
      action: "SESSIONS_REVOKED",
      targetUser: user._id,
    });

    return res.status(200).json({
      success: true,
      message: "All active sessions were revoked",
    });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Sessions could not be revoked",
    });
  }
});

router.get("/audit", async (req, res) => {
  const permissions = resolvePermissions(req.user);
  if (
    !permissions.includes("*") &&
    !permissions.includes(PERMISSIONS.SECURITY_AUDIT_VIEW)
  ) {
    return res.status(403).json({
      success: false,
      message: "You do not have permission to view the security audit",
    });
  }

  const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 500);
  const entries = await SecurityAudit.find()
    .populate("actor", "username role")
    .populate("targetUser", "username role")
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return res.status(200).json({
    success: true,
    entries,
  });
});

module.exports = router;
