const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

const connectDB = async () => {
  try {
    // Mongoose 8+ — useNewUrlParser / useUnifiedTopology are removed
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info(`MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
    mongoose.connection.on('error', (err) => logger.error(`MongoDB runtime error: ${err.message}`));
  } catch (err) {
    logger.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
