const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

/**
 * Cached connection for serverless (Vercel) cold starts.
 * Do not call process.exit on failure in serverless — throw instead.
 */
let cached = global.__skillswapMongoose;
if (!cached) {
  cached = global.__skillswapMongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is missing in environment');
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(uri, {
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
      })
      .then((conn) => {
        logger.info(`MongoDB connected: ${conn.connection.host}`);
        mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
        mongoose.connection.on('error', (err) =>
          logger.error(`MongoDB runtime error: ${err.message}`)
        );
        return conn;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    cached.promise = null;
    logger.error(`MongoDB connection error: ${err.message}`);
    // Local/long-running server: exit. Serverless (Vercel): rethrow.
    if (process.env.VERCEL) {
      throw err;
    }
    process.exit(1);
  }
};

module.exports = connectDB;
