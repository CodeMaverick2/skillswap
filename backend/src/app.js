const express = require('express');
const helmet  = require('helmet');
const cors    = require('cors');
const morgan  = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoose  = require('mongoose');

const { errorHandler } = require('./middleware/error.middleware');
const { successResponse } = require('./utils/apiResponse');

const authRoutes     = require('./routes/auth.routes');
const userRoutes     = require('./routes/user.routes');
const discoverRoutes = require('./routes/discover.routes');
const matchRoutes    = require('./routes/match.routes');
const messageRoutes  = require('./routes/message.routes');
const sessionRoutes  = require('./routes/session.routes');

const app = express();

// ── Security headers ───────────────────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false, // disable for API servers
  })
);

// ── CORS ───────────────────────────────────────────────────────────────────
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['*'];

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Body parsers ───────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));  // tighten from 10mb
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// ── HTTP logging ───────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// ── Rate limiters (disabled in test environment) ───────────────────────────
const isTest = process.env.NODE_ENV === 'test';
const noopMiddleware = (_req, _res, next) => next();

// Auth endpoints: strict (20 req / 15 min)
const authLimiter = isTest ? noopMiddleware : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many auth requests. Please wait 15 minutes.' },
});

// General API endpoints: generous (300 req / 15 min)
const apiLimiter = isTest ? noopMiddleware : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests. Please slow down.' },
});

// ── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const dbState = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    db: dbState[mongoose.connection.readyState] || 'unknown',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',     authLimiter, authRoutes);
app.use('/api/users',    apiLimiter,  userRoutes);
app.use('/api/discover', apiLimiter,  discoverRoutes);
app.use('/api/matches',  apiLimiter,  matchRoutes);
app.use('/api/messages', apiLimiter,  messageRoutes);
app.use('/api/sessions', apiLimiter,  sessionRoutes);

// ── 404 ────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// ── Global error handler (must be last) ───────────────────────────────────
app.use(errorHandler);

module.exports = app;
