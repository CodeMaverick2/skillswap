const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * Stores the jti (JWT ID) of each issued refresh token.
 * Security model:
 *   - JWT signature  → proves the token was issued by this server
 *   - jti in DB      → proves the token hasn't been used/revoked yet
 * No bcrypt needed: the JWT's cryptographic signature already provides
 * unforgeable proof of origin. bcrypt would be truncated at 72 bytes anyway.
 */
const refreshTokenSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  // SHA-256 hash of the jti — fast O(1) lookup, avoids bcrypt 72-byte truncation bug
  jtiHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 },  // MongoDB TTL — auto-deletes expired tokens
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
