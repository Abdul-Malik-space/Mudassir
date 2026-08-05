const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const AuthSession = require("../models/AuthSession");
const SecurityAudit = require("../models/SecurityAudit");
const {
  ROLE_DEFINITIONS,
  resolvePermissions,
} = require("../config/accessControl");

const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME || "erp_session";

const DEFAULT_SESSION_HOURS = Math.max(
  Number(process.env.SESSION_TTL_HOURS || 12),
  1
);

const REMEMBER_SESSION_DAYS = Math.max(
  Number(process.env.REMEMBER_SESSION_DAYS || 7),
  1
);

const BCRYPT_ROUNDS = Math.min(
  Math.max(Number(process.env.BCRYPT_ROUNDS || 12), 10),
  15
);

const COMMON_PASSWORDS = new Set([
  "password",
  "password123",
  "admin123",
  "123456789",
  "qwerty123",
  "letmein123",
  "welcome123",
]);

const normalizeLogin = (value) =>
  String(value || "").trim().toLowerCase();

const hashToken = (value) =>
  crypto.createHash("sha256").update(String(value || "")).digest("hex");

const secureCompare = (left, right) => {
  const leftBuffer = Buffer.from(String(left || ""));
  const rightBuffer = Buffer.from(String(right || ""));

  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const getClientIp = (req) =>
  String(
    req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket?.remoteAddress ||
      req.ip ||
      ""
  ).trim();

const getCookieOptions = (maxAge) => {
  const isProduction = process.env.NODE_ENV === "production";
  const sameSite = String(process.env.COOKIE_SAME_SITE || "lax").toLowerCase();
  const secure =
    String(process.env.COOKIE_SECURE || "").toLowerCase() === "true" ||
    isProduction ||
    sameSite === "none";

  return {
    httpOnly: true,
    secure,
    sameSite: ["lax", "strict", "none"].includes(sameSite)
      ? sameSite
      : "lax",
    path: "/",
    maxAge,
    ...(process.env.COOKIE_DOMAIN
      ? { domain: process.env.COOKIE_DOMAIN }
      : {}),
  };
};

const clearSessionCookie = (res) => {
  const options = getCookieOptions(0);
  delete options.maxAge;
  res.clearCookie(SESSION_COOKIE_NAME, options);
};

const validatePassword = (password, user = {}) => {
  const value = String(password || "");
  const errors = [];

  if (value.length < 12) errors.push("At least 12 characters are required");
  if (value.length > 128) errors.push("Password is too long");
  if (!/[a-z]/.test(value)) errors.push("Add a lowercase letter");
  if (!/[A-Z]/.test(value)) errors.push("Add an uppercase letter");
  if (!/[0-9]/.test(value)) errors.push("Add a number");
  if (!/[^A-Za-z0-9]/.test(value)) errors.push("Add a special character");

  const lower = value.toLowerCase();
  if (COMMON_PASSWORDS.has(lower)) errors.push("Choose a less common password");

  const username = normalizeLogin(user.username);
  const emailPrefix = normalizeLogin(user.email).split("@")[0];

  if (username && lower.includes(username)) {
    errors.push("Password must not contain the username");
  }

  if (emailPrefix && emailPrefix.length >= 3 && lower.includes(emailPrefix)) {
    errors.push("Password must not contain the email name");
  }

  return errors;
};

const setUserPassword = async (
  user,
  password,
  { mustChangePassword = false } = {}
) => {
  const errors = validatePassword(password, user);
  if (errors.length) {
    const error = new Error(errors.join(". "));
    error.status = 400;
    throw error;
  }

  const history = Array.isArray(user.passwordHistory)
    ? user.passwordHistory
    : [];

  const hashesToCheck = [user.passwordHash, ...history].filter(Boolean).slice(0, 5);
  for (const oldHash of hashesToCheck) {
    if (await bcrypt.compare(password, oldHash)) {
      const error = new Error("The new password must not match a recent password");
      error.status = 400;
      throw error;
    }
  }

  const nextHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  user.passwordHistory = [user.passwordHash, ...history].filter(Boolean).slice(0, 5);
  user.passwordHash = nextHash;
  user.passwordChangedAt = new Date();
  user.mustChangePassword = Boolean(mustChangePassword);
};

const sanitizeUser = (user) => {
  const source = user?.toObject ? user.toObject() : user || {};
  const permissions = resolvePermissions(source);

  return {
    id: String(source._id || source.id || ""),
    username: source.username || "",
    email: source.email || "",
    role: source.role || "viewer",
    roleLabel: ROLE_DEFINITIONS[source.role]?.label || "User",
    permissions,
    status: source.status || "Inactive",
    mustChangePassword: Boolean(source.mustChangePassword),
    lastLoginAt: source.lastLoginAt || null,
    lastNotificationReadAt: source.lastNotificationReadAt || null,
    preferences: {
      darkMode: Boolean(source.preferences?.darkMode),
    },
  };
};

const createSession = async (req, res, user, { rememberMe = false } = {}) => {
  const rawToken = crypto.randomBytes(48).toString("base64url");
  const csrfToken = crypto.randomBytes(32).toString("base64url");

  const durationMs = rememberMe
    ? REMEMBER_SESSION_DAYS * 24 * 60 * 60 * 1000
    : DEFAULT_SESSION_HOURS * 60 * 60 * 1000;

  const expiresAt = new Date(Date.now() + durationMs);
  const ip = getClientIp(req);

  const session = await AuthSession.create({
    user: user._id,
    tokenHash: hashToken(rawToken),
    csrfHash: hashToken(csrfToken),
    expiresAt,
    createdIp: ip,
    lastIp: ip,
    userAgent: String(req.get("user-agent") || "").slice(0, 500),
    lastSeenAt: new Date(),
  });

  res.cookie(SESSION_COOKIE_NAME, rawToken, getCookieOptions(durationMs));

  return {
    session,
    csrfToken,
    expiresAt,
  };
};

const rotateCsrfToken = async (session) => {
  const csrfToken = crypto.randomBytes(32).toString("base64url");
  session.csrfHash = hashToken(csrfToken);
  await session.save();
  return csrfToken;
};

const revokeSession = async (session) => {
  if (!session || session.revokedAt) return;
  session.revokedAt = new Date();
  await session.save();
};

const revokeUserSessions = async (userId, exceptSessionId = null) => {
  const query = {
    user: userId,
    revokedAt: null,
  };

  if (exceptSessionId) {
    query._id = { $ne: exceptSessionId };
  }

  await AuthSession.updateMany(query, { $set: { revokedAt: new Date() } });
};

const writeAudit = async (req, payload) => {
  try {
    await SecurityAudit.create({
      actor: payload.actor || req.user?._id || null,
      targetUser: payload.targetUser || null,
      action: payload.action,
      outcome: payload.outcome || "Success",
      ip: getClientIp(req),
      userAgent: String(req.get("user-agent") || "").slice(0, 500),
      metadata: payload.metadata || {},
    });
  } catch (error) {
    console.error("Security audit write error:", error.message);
  }
};

module.exports = {
  SESSION_COOKIE_NAME,
  normalizeLogin,
  hashToken,
  secureCompare,
  getClientIp,
  getCookieOptions,
  clearSessionCookie,
  validatePassword,
  setUserPassword,
  sanitizeUser,
  createSession,
  rotateCsrfToken,
  revokeSession,
  revokeUserSessions,
  writeAudit,
};
