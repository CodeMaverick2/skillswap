const { errorResponse } = require('../utils/apiResponse');
const { logger } = require('../utils/logger');

/**
 * Global Express error handler.
 * Must be registered as the last middleware in app.js with four arguments.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  logger.error(`${req.method} ${req.originalUrl} — ${err.message}`);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json(errorResponse('Invalid ID format'));
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    return res
      .status(409)
      .json(errorResponse(`Duplicate value for ${field}: "${value}" already exists`));
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json(errorResponse('Validation failed', messages));
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError' || err.name === 'NotBeforeError') {
    return res.status(401).json(errorResponse('Invalid or expired token'));
  }

  // HTTP errors set explicitly via err.statusCode
  if (err.statusCode) {
    return res.status(err.statusCode).json(errorResponse(err.message));
  }

  // Default 500
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  return res.status(statusCode).json(errorResponse(err.message || 'Server Error'));
};

module.exports = { errorHandler };
