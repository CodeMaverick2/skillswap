const express = require('express');
const Joi = require('joi');
const Block = require('../models/Block');
const Report = require('../models/Report');
const Match = require('../models/Match');
const protect = require('../middleware/auth.middleware');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { isValidObjectId } = require('../utils/validate');
const { isBlockedEitherWay } = require('../services/trust.service');

const router = express.Router();

const reportSchema = Joi.object({
  targetUser: Joi.string().optional(),
  targetType: Joi.string().valid('user', 'message', 'session').required(),
  targetId: Joi.string().optional(),
  reason: Joi.string().valid('spam', 'harassment', 'inappropriate', 'fake_profile', 'other').required(),
  details: Joi.string().trim().max(500).allow(''),
});

router.post('/block/:userId', protect, async (req, res) => {
  if (!isValidObjectId(req.params.userId)) {
    return res.status(400).json(errorResponse('Invalid user ID'));
  }
  if (req.params.userId === req.user._id.toString()) {
    return res.status(400).json(errorResponse('Cannot block yourself'));
  }
  await Block.findOneAndUpdate(
    { blocker: req.user._id, blocked: req.params.userId },
    { $setOnInsert: { blocker: req.user._id, blocked: req.params.userId } },
    { upsert: true, new: true }
  );
  // Decline any pending matches between the pair
  await Match.updateMany(
    {
      users: { $all: [req.user._id, req.params.userId] },
      status: 'pending',
    },
    { $set: { status: 'rejected' } }
  );
  res.status(201).json(successResponse(null, 'User blocked'));
});

router.delete('/block/:userId', protect, async (req, res) => {
  if (!isValidObjectId(req.params.userId)) {
    return res.status(400).json(errorResponse('Invalid user ID'));
  }
  await Block.deleteOne({ blocker: req.user._id, blocked: req.params.userId });
  res.json(successResponse(null, 'User unblocked'));
});

router.get('/blocks', protect, async (req, res) => {
  const blocks = await Block.find({ blocker: req.user._id })
    .populate('blocked', 'username profile')
    .sort({ createdAt: -1 })
    .lean();
  res.json(successResponse(blocks, 'Blocks fetched'));
});

router.post('/report', protect, async (req, res) => {
  const { error, value } = reportSchema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json(errorResponse('Validation failed', error.details.map((e) => e.message)));
  if (value.targetUser && !isValidObjectId(value.targetUser)) {
    return res.status(400).json(errorResponse('Invalid target user'));
  }
  const report = await Report.create({
    reporter: req.user._id,
    targetUser: value.targetUser || undefined,
    targetType: value.targetType,
    targetId: value.targetId || undefined,
    reason: value.reason,
    details: value.details || '',
  });
  res.status(201).json(successResponse(report, 'Report submitted'));
});

router.get('/check/:userId', protect, async (req, res) => {
  if (!isValidObjectId(req.params.userId)) {
    return res.status(400).json(errorResponse('Invalid user ID'));
  }
  const blocked = await isBlockedEitherWay(req.user._id, req.params.userId);
  res.json(successResponse({ blocked }, 'Block status'));
});

module.exports = router;
