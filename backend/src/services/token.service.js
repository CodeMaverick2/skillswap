const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken');

const JWT_SECRET                = process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-production';
const JWT_EXPIRES_IN            = process.env.JWT_EXPIRES_IN || '15m';
const REFRESH_TOKEN_EXPIRES_IN  = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS             = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;

// ── Duration parser ─────────────────────────────────────────────────────────

const parseDurationMs = (str) => {
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration string: ${str}`);
  const value = parseInt(match[1], 10);
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * multipliers[match[2]];
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/** SHA-256 hex of a string — used to store/look up jti without bcrypt truncation */
const hashJti = (jti) => crypto.createHash('sha256').update(jti).digest('hex');

// ── Access token ────────────────────────────────────────────────────────────

const generateAccessToken = (userId, username, email) =>
  jwt.sign(
    { sub: userId.toString(), username, email, jti: crypto.randomUUID() },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

const verifyAccessToken = (token) => jwt.verify(token, JWT_SECRET);

// ── Refresh token ───────────────────────────────────────────────────────────

const generateRefreshToken = (userId) =>
  jwt.sign(
    { sub: userId.toString(), type: 'refresh', jti: crypto.randomUUID() },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );

const verifyRefreshToken = (token) => {
  const payload = jwt.verify(token, JWT_SECRET);
  if (payload.type !== 'refresh') throw new Error('Token is not a refresh token');
  return payload;
};

// ── Persistence ─────────────────────────────────────────────────────────────

/**
 * Save a refresh token's jti (SHA-256 hashed) to the database.
 * O(1) lookup on verification — no bcrypt loop needed.
 */
const saveRefreshToken = async (userId, token) => {
  const payload  = jwt.decode(token);
  const jtiHash  = hashJti(payload.jti);
  const expiresAt = new Date(Date.now() + parseDurationMs(REFRESH_TOKEN_EXPIRES_IN));
  return RefreshToken.create({ userId, jtiHash, expiresAt });
};

/**
 * Find a stored token record by the incoming refresh token's jti.
 * Returns null if not found or already used/expired.
 */
const findRefreshToken = async (token) => {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    return null;
  }
  const jtiHash = hashJti(payload.jti);
  return RefreshToken.findOne({
    jtiHash,
    userId:    payload.sub,
    expiresAt: { $gt: new Date() },
  });
};

const deleteAllUserTokens = async (userId) => RefreshToken.deleteMany({ userId });

// ── Legacy bcrypt helpers (kept for password hashing only) ──────────────────

const hashToken   = async (val) => bcrypt.hash(val, BCRYPT_ROUNDS);
const compareToken = async (val, hash) => bcrypt.compare(val, hash);

module.exports = {
  generateAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  saveRefreshToken,
  findRefreshToken,
  deleteAllUserTokens,
  hashToken,
  compareToken,
};
