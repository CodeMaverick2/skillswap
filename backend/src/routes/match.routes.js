const express = require('express');
const Match = require('../models/Match');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const { logActivity } = require('../services/activity.service');
const { notifyMatchRequest, notifyMatchAccepted } = require('../services/notification.service');
const { trackEvent } = require('../services/analytics.service');
const { isBlockedEitherWay } = require('../services/trust.service');
const { submitQuality, ensureOutcome } = require('../services/matching-feedback.service');
const User = require('../models/User');
const protect = require('../middleware/auth.middleware');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { isValidObjectId } = require('../utils/validate');

const router = express.Router();

// POST /api/matches/connect/:userId — send a connection request
router.post('/connect/:userId', protect, async (req, res) => {
  const me = req.user._id;
  const other = req.params.userId;

  if (!isValidObjectId(other)) {
    return res.status(400).json(errorResponse('Invalid user ID'));
  }

  if (me.toString() === other) {
    return res.status(400).json(errorResponse('Cannot connect with yourself'));
  }

  if (await isBlockedEitherWay(me, other)) {
    return res.status(403).json(errorResponse('Cannot connect with this user'));
  }

  // Atomic upsert-style check to prevent race conditions on duplicate requests
  const existing = await Match.findOne({
    users: { $all: [me, other] },
    status: { $in: ['pending', 'accepted'] },
  });

  if (existing) {
    return res.status(409).json(errorResponse('Connection already exists'));
  }

  const match = await Match.create({
    users: [me, other],
    initiator: me,
    status: 'pending',
  });
  await logActivity({
    actor: me,
    targetUser: other,
    type: 'match_sent',
    title: 'Sent a connection request',
    description: 'Waiting for the other user to accept your match request.',
    metadata: { matchId: match._id },
  });
  await trackEvent(me, 'match_request_sent', { matchId: match._id, to: other });
  const fromUser = await User.findById(me).select('username profile').lean();
  const fromName = fromUser?.profile?.firstName || fromUser?.username || 'Someone';
  notifyMatchRequest(other, fromName).catch(() => {});

  res.status(201).json(successResponse(match, 'Connection request sent'));
});

// PUT /api/matches/:matchId/accept — accept a connection
router.put('/:matchId/accept', protect, async (req, res) => {
  if (!isValidObjectId(req.params.matchId)) {
    return res.status(400).json(errorResponse('Invalid match ID'));
  }

  // Atomic update to prevent race conditions: only update if still pending
  const match = await Match.findOneAndUpdate(
    {
      _id: req.params.matchId,
      status: 'pending',
      users: req.user._id,
      initiator: { $ne: req.user._id }, // only recipient can accept
    },
    { $set: { status: 'accepted' } },
    { new: true }
  );

  if (!match) {
    return res.status(404).json(errorResponse('Match not found, already handled, or not authorized'));
  }

  // Create conversation atomically (findOneAndUpdate with upsert to prevent duplicates)
  let conversation = await Conversation.findOneAndUpdate(
    { matchId: match._id },
    {
      $setOnInsert: {
        participants: match.users,
        matchId: match._id,
        lastMessage: {
          text: 'You matched! Say hello 👋',
          senderId: match.initiator,
          createdAt: new Date(),
        },
      },
    },
    { new: true, upsert: true }
  );

  // Create system message only if conversation was just created (no messages yet)
  const msgCount = await Message.countDocuments({ conversationId: conversation._id });
  if (msgCount === 0) {
    await Message.create({
      conversationId: conversation._id,
      senderId: match.initiator,
      text: 'You matched! Say hello 👋',
      type: 'system',
      readBy: [],
    });
  }
  const otherUserId = match.users.find((u) => u.toString() !== req.user._id.toString());
  await logActivity({
    actor: req.user._id,
    targetUser: otherUserId,
    type: 'match_accepted',
    title: 'Accepted a connection request',
    description: 'You are now matched and can start chatting.',
    metadata: { matchId: match._id, conversationId: conversation._id },
  });
  await trackEvent(req.user._id, 'match_request_accepted', { matchId: match._id });
  await ensureOutcome(match._id, req.user._id, otherUserId);
  await ensureOutcome(match._id, otherUserId, req.user._id);
  const accepter = await User.findById(req.user._id).select('username profile').lean();
  const name = accepter?.profile?.firstName || accepter?.username || 'Someone';
  notifyMatchAccepted(otherUserId, name).catch(() => {});

  res.json(successResponse({ match, conversation }, 'Connection accepted'));
});

// PUT /api/matches/:matchId/reject — reject a connection
router.put('/:matchId/reject', protect, async (req, res) => {
  if (!isValidObjectId(req.params.matchId)) {
    return res.status(400).json(errorResponse('Invalid match ID'));
  }

  // Atomic update to prevent race conditions
  const match = await Match.findOneAndUpdate(
    {
      _id: req.params.matchId,
      status: 'pending',
      users: req.user._id,
    },
    { $set: { status: 'rejected' } },
    { new: true }
  );

  if (!match) {
    return res.status(404).json(errorResponse('Match not found or already handled'));
  }

  res.json(successResponse(match, 'Connection rejected'));
});

// GET /api/matches — list my matches
router.get('/', protect, async (req, res) => {
  const status = req.query.status || 'accepted';
  const matches = await Match.find({
    users: req.user._id,
    status,
  })
    .populate('users', 'username profile teachSkills learnSkills reputation')
    .sort({ updatedAt: -1 })
    .limit(50)
    .lean();

  res.json(successResponse(matches, 'Matches fetched'));
});

// GET /api/matches/pending — incoming connection requests
router.get('/pending', protect, async (req, res) => {
  const pending = await Match.find({
    users: req.user._id,
    initiator: { $ne: req.user._id },
    status: 'pending',
  })
    .populate('users', 'username profile teachSkills learnSkills reputation')
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  res.json(successResponse(pending, 'Pending requests'));
});

// PUT /api/matches/:matchId/quality — outcome feedback for matching loop
router.put('/:matchId/quality', protect, async (req, res) => {
  if (!isValidObjectId(req.params.matchId)) {
    return res.status(400).json(errorResponse('Invalid match ID'));
  }
  const score = Number(req.body?.qualityScore);
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return res.status(400).json(errorResponse('qualityScore must be 1-5'));
  }
  const match = await Match.findOne({
    _id: req.params.matchId,
    users: req.user._id,
    status: 'accepted',
  });
  if (!match) return res.status(404).json(errorResponse('Match not found'));
  const peerId = match.users.find((u) => u.toString() !== req.user._id.toString());
  await submitQuality(match._id, req.user._id, peerId, score);
  res.json(successResponse({ qualityScore: score }, 'Match quality recorded'));
});

module.exports = router;
