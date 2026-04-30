const express = require('express');
const Match = require('../models/Match');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const protect = require('../middleware/auth.middleware');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { isValidObjectId } = require('../utils/validate');
const { computeMatchScore } = require('../services/match.service');

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

  // Atomic upsert-style check to prevent race conditions on duplicate requests
  const existing = await Match.findOne({
    users: { $all: [me, other] },
    status: { $in: ['pending', 'accepted'] },
  });

  if (existing) {
    return res.status(409).json(errorResponse('Connection already exists'));
  }

  // Compute and persist matchScore + sharedSkills so the data isn't dead weight.
  // The recipient user fetch is cheap (one indexed lookup); failure to load them
  // shouldn't block the connection — fall back to an empty score in that case.
  let matchScore = 0;
  let persistedSharedSkills = [];
  const otherUser = await User.findById(other)
    .select('teachSkills learnSkills availability reputation')
    .lean();
  if (otherUser) {
    const result = computeMatchScore(req.user, otherUser, 'initiator');
    matchScore = result.score;
    // Match.sharedSkills schema only has skillName/skillIcon/direction; map down.
    persistedSharedSkills = result.sharedSkills.map((s) => ({
      skillName: s.skillName,
      skillIcon: s.skillIcon,
      direction: s.direction,
    }));
  }

  const match = await Match.create({
    users: [me, other],
    initiator: me,
    status: 'pending',
    matchScore,
    sharedSkills: persistedSharedSkills,
  });

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

module.exports = router;
