const { verifyAccessToken } = require('../services/token.service');
const User = require('../models/User');
const { errorResponse } = require('../utils/apiResponse');

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(errorResponse('No token provided. Authorization denied.'));
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    return res.status(401).json(errorResponse('Invalid or expired token.'));
  }

  const user = await User.findById(decoded.sub).select('-passwordHash').lean();

  if (!user) {
    return res.status(401).json(errorResponse('User belonging to this token no longer exists.'));
  }

  if (!user.isActive) {
    return res.status(403).json(errorResponse('Account is deactivated. Please contact support.'));
  }

  req.user = user;
  next();
};

module.exports = protect;
