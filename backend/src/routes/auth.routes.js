const express = require('express');
const authController = require('../controllers/auth.controller');
const protect = require('../middleware/auth.middleware');

const router = express.Router();

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/refresh
router.post('/refresh', authController.refreshToken);

// POST /api/auth/logout  (protected — must send valid access token)
router.post('/logout', protect, authController.logout);

// POST /api/auth/logout-all — revoke all sessions (all devices)
router.post('/logout-all', protect, authController.logoutAll);

module.exports = router;
