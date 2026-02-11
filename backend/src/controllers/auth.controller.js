const bcrypt = require('bcryptjs');
const Joi = require('joi');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  saveRefreshToken,
  findRefreshToken,
  deleteAllUserTokens,
} = require('../services/token.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { logger } = require('../utils/logger');

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;

const AVATAR_COLORS = [
  '#6C63FF', '#FF6584', '#43D9AD', '#FFD166',
  '#54A0FF', '#FF9F43', '#EE5A24', '#9A99BC',
];

// ── Validation Schemas ──────────────────────────────────────────────────────

const registerSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).max(254).required().messages({
    'string.email':    'Please provide a valid email address',
    'any.required':    'Email is required',
  }),
  username: Joi.string()
    .pattern(/^[a-zA-Z0-9_]+$/)
    .min(3).max(30)
    .required()
    .messages({
      'string.pattern.base': 'Username can only contain letters, numbers, and underscores',
      'string.min':          'Username must be at least 3 characters',
      'string.max':          'Username must be at most 30 characters',
      'any.required':        'Username is required',
    }),
  password: Joi.string().min(6).max(72).required().messages({
    'string.min':   'Password must be at least 6 characters',
    'string.max':   'Password must be at most 72 characters',
    'any.required': 'Password is required',
  }),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required().messages({
    'any.only':     'Passwords do not match',
    'any.required': 'Confirm password is required',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).max(254).required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().max(72).required().messages({
    'any.required': 'Password is required',
  }),
});

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Build a clean user object safe for API responses. */
const sanitizeUser = (user) => {
  const obj = user.toJSON ? user.toJSON() : { ...user };
  delete obj.passwordHash;
  delete obj.skippedUsers;
  delete obj.expoPushToken;
  return obj;
};

// ── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 */
const register = async (req, res) => {
  const { error, value } = registerSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json(errorResponse('Validation failed', error.details.map((e) => e.message)));
  }

  const { email, username, password } = value;
  const emailLower    = email.toLowerCase().trim();
  const usernameLower = username.toLowerCase().trim();

  // Check duplicates — use Promise.all for speed
  const [emailExists, usernameExists] = await Promise.all([
    User.findOne({ email: emailLower }).lean(),
    User.findOne({ username: usernameLower }).lean(),
  ]);

  if (emailExists)    return res.status(409).json(errorResponse('Email is already registered'));
  if (usernameExists) return res.status(409).json(errorResponse('Username is already taken'));

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const colorIndex   = usernameLower.charCodeAt(0) % AVATAR_COLORS.length;
  const avatarColor  = AVATAR_COLORS[colorIndex];

  const user = await User.create({
    email: emailLower,
    username: usernameLower,
    passwordHash,
    profile: { avatarColor },
  });

  const accessToken  = generateAccessToken(user._id, user.username, user.email);
  const refreshToken = generateRefreshToken(user._id);
  await saveRefreshToken(user._id, refreshToken);

  logger.info(`New user registered: ${user.username} (${user.email})`);

  return res.status(201).json(
    successResponse({ user: sanitizeUser(user), accessToken, refreshToken }, 'Account created')
  );
};

/**
 * POST /api/auth/login
 */
const login = async (req, res) => {
  const { error, value } = loginSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json(errorResponse('Validation failed', error.details.map((e) => e.message)));
  }

  const { email, password } = value;

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    return res.status(401).json(errorResponse('Invalid credentials'));
  }

  if (!user.isActive) {
    return res.status(403).json(errorResponse('Account is deactivated. Please contact support.'));
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return res.status(401).json(errorResponse('Invalid credentials'));
  }

  // Update last active
  await User.findByIdAndUpdate(user._id, { 'profile.lastActiveAt': new Date() });

  const accessToken  = generateAccessToken(user._id, user.username, user.email);
  const refreshToken = generateRefreshToken(user._id);
  await saveRefreshToken(user._id, refreshToken);

  logger.info(`User logged in: ${user.username}`);

  return res.status(200).json(
    successResponse({ user: sanitizeUser(user), accessToken, refreshToken }, 'Login successful')
  );
};

/**
 * POST /api/auth/refresh
 * Exchange a valid refresh token for new access + refresh tokens (token rotation).
 */
const refreshToken = async (req, res) => {
  const { refreshToken: incomingToken } = req.body;

  if (!incomingToken || typeof incomingToken !== 'string') {
    return res.status(400).json(errorResponse('Refresh token is required'));
  }

  // Verify JWT structure + signature first
  let payload;
  try {
    payload = verifyRefreshToken(incomingToken);
  } catch {
    return res.status(401).json(errorResponse('Invalid or expired refresh token'));
  }

  // O(1) jti lookup — no bcrypt loop, no 72-byte truncation issue
  const storedToken = await findRefreshToken(incomingToken);

  if (!storedToken) {
    // Valid JWT signature but jti not in DB → token was already used or revoked.
    // Treat as potential reuse attack: revoke all sessions for this user.
    await deleteAllUserTokens(payload.sub);
    logger.warn(`Possible refresh token reuse detected for userId: ${payload.sub}`);
    return res.status(401).json(errorResponse('Refresh token reuse detected. Please log in again.'));
  }

  // Rotate: delete old jti, issue new token pair
  await storedToken.deleteOne();

  const newAccessToken  = generateAccessToken(payload.sub, payload.username, payload.email);
  const newRefreshToken = generateRefreshToken(payload.sub);
  await saveRefreshToken(payload.sub, newRefreshToken);

  return res.status(200).json(
    successResponse({ accessToken: newAccessToken, refreshToken: newRefreshToken }, 'Token refreshed')
  );
};

/**
 * POST /api/auth/logout
 * Invalidate the provided refresh token.
 */
const logout = async (req, res) => {
  const { refreshToken: incomingToken } = req.body;

  if (incomingToken && typeof incomingToken === 'string') {
    try {
      const stored = await findRefreshToken(incomingToken);
      if (stored) await stored.deleteOne();
    } catch {
      // Token invalid — still treated as success
    }
  }

  logger.info(`User logged out: ${req.user?.username}`);
  return res.status(200).json(successResponse(null, 'Logged out successfully'));
};

/**
 * POST /api/auth/logout-all
 * Revoke all refresh tokens for the authenticated user (log out all devices).
 */
const logoutAll = async (req, res) => {
  await deleteAllUserTokens(req.user._id);
  logger.info(`All sessions revoked for user: ${req.user.username}`);
  return res.status(200).json(successResponse(null, 'All sessions logged out'));
};

module.exports = { register, login, refreshToken, logout, logoutAll };
