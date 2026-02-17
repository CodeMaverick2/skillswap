const express = require('express');
const Joi     = require('joi');
const mongoose = require('mongoose');
const User    = require('../models/User');
const protect = require('../middleware/auth.middleware');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const router = express.Router();

// ── Validation Schemas ──────────────────────────────────────────────────────

const profileUpdateSchema = Joi.object({
  profile: Joi.object({
    firstName: Joi.string().trim().max(50).allow(''),
    lastName:  Joi.string().trim().max(50).allow(''),
    bio:       Joi.string().trim().max(200).allow(''),
    timezone:  Joi.string().trim().max(100).allow(''),
  }),
  onboardingCompleted: Joi.boolean(),
  availability: Joi.object({
    days:      Joi.array().items(Joi.number().integer().min(0).max(6)),
    timeStart: Joi.number().integer().min(0).max(23),
    timeEnd:   Joi.number().integer().min(0).max(23),
  }),
});

const skillsUpdateSchema = Joi.object({
  teachSkills: Joi.array().items(
    Joi.object({
      skillId:   Joi.string().required(),
      skillName: Joi.string().trim().max(100).required(),
      skillIcon: Joi.string().trim().max(10).allow(''),
      level:     Joi.number().integer().min(1).max(5).required(),
      yearsExp:  Joi.number().min(0).max(50),
    })
  ).max(20),
  learnSkills: Joi.array().items(
    Joi.object({
      skillId:     Joi.string().required(),
      skillName:   Joi.string().trim().max(100).required(),
      skillIcon:   Joi.string().trim().max(10).allow(''),
      targetLevel: Joi.number().integer().min(1).max(5).required(),
    })
  ).max(20),
});

// ── Routes ──────────────────────────────────────────────────────────────────

// GET /api/users/me
router.get('/me', protect, (req, res) => {
  res.json(successResponse(req.user, 'Profile fetched'));
});

// PUT /api/users/me
router.put('/me', protect, async (req, res) => {
  const { error, value } = profileUpdateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json(errorResponse('Validation failed', error.details.map((e) => e.message)));
  }

  const updates = {};

  if (value.profile) {
    for (const [field, val] of Object.entries(value.profile)) {
      updates[`profile.${field}`] = val;
    }
  }
  if (value.onboardingCompleted !== undefined) {
    updates.onboardingCompleted = value.onboardingCompleted;
  }
  if (value.availability) {
    for (const [field, val] of Object.entries(value.availability)) {
      updates[`availability.${field}`] = val;
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json(errorResponse('No fields to update'));
  }

  const updated = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-passwordHash -expoPushToken').lean();

  res.json(successResponse(updated, 'Profile updated'));
});

// PUT /api/users/me/skills
router.put('/me/skills', protect, async (req, res) => {
  const { error, value } = skillsUpdateSchema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    return res.status(400).json(errorResponse('Validation failed', error.details.map((e) => e.message)));
  }

  const updates = {};

  if (Array.isArray(value.teachSkills)) {
    updates.teachSkills = value.teachSkills.map((s) => ({
      skillId:   s.skillId,
      skillName: s.skillName,
      skillIcon: s.skillIcon || '',
      level:     s.level,
      yearsExp:  s.yearsExp || 0,
    }));
  }

  if (Array.isArray(value.learnSkills)) {
    updates.learnSkills = value.learnSkills.map((s) => ({
      skillId:     s.skillId,
      skillName:   s.skillName,
      skillIcon:   s.skillIcon || '',
      targetLevel: s.targetLevel,
    }));
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json(errorResponse('No valid skill arrays provided'));
  }

  const updated = await User.findByIdAndUpdate(
    req.user._id,
    { $set: updates },
    { new: true, runValidators: true }
  ).select('-passwordHash -expoPushToken').lean();

  res.json(successResponse(updated, 'Skills updated'));
});

// GET /api/users/check-username/:username
router.get('/check-username/:username', protect, async (req, res) => {
  const { username } = req.params;

  if (!username || username.length < 3) {
    return res.status(400).json(errorResponse('Username must be at least 3 characters'));
  }
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return res.status(400).json(errorResponse('Username can only contain letters, numbers, and underscores'));
  }

  const existing = await User.findOne({
    username: username.toLowerCase(),
    _id: { $ne: req.user._id },
  }).lean();

  res.json(successResponse(
    { available: !existing },
    existing ? 'Username is taken' : 'Username is available'
  ));
});

// PUT /api/users/me/push-token
router.put('/me/push-token', protect, async (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== 'string') {
    return res.status(400).json(errorResponse('Push token is required'));
  }
  // Basic Expo push token validation
  if (!token.startsWith('ExponentPushToken[') && !token.startsWith('ExpoPushToken[')) {
    return res.status(400).json(errorResponse('Invalid push token format'));
  }
  await User.findByIdAndUpdate(req.user._id, { expoPushToken: token });
  res.json(successResponse(null, 'Push token registered'));
});

// DELETE /api/users/me — soft-delete / deactivate account
router.delete('/me', protect, async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, {
    isActive: false,
    'profile.bio': '',
    expoPushToken: null,
  });
  res.json(successResponse(null, 'Account deactivated'));
});

// GET /api/users/:id — public profile
router.get('/:id', protect, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json(errorResponse('Invalid user ID'));
  }

  const user = await User.findById(req.params.id)
    .select('username profile teachSkills learnSkills reputation createdAt isActive')
    .lean();

  if (!user) {
    return res.status(404).json(errorResponse('User not found'));
  }
  if (!user.isActive) {
    return res.status(404).json(errorResponse('User not found'));
  }

  res.json(successResponse(user, 'User profile fetched'));
});

module.exports = router;
