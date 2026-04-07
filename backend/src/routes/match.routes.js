const express = require('express');
const Joi = require('joi');
const Match = require('../models/Match');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const protect = require('../middleware/auth.middleware');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const router = express.Router();

// POST /api/matches/connect/:userId — send a connection request
router.post('/connect/:userId', protect, async (req, res) => {
  const me = req.user._id;
  const other = req.params.userId;

  if (me.toString() === other) {
    return res.status(400).json(errorResponse('Cannot connect with yourself'));
  }

  // Check if match already exists between these two
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

  res.status(201).json(successResponse(match, 'Connection request sent'));
});

// PUT /api/matches/:matchId/accept — accept a connection
router.put('/:matchId/accept', protect, async (req, res) => {
  const match = await Match.findById(req.params.matchId);
  if (!match) return res.status(404).json(errorResponse('Match not found'));

  // Only the non-initiator can accept
  const isRecipient = match.users.some(u => u.toString() === req.user._id.toString())
    && match.initiator.toString() !== req.user._id.toString();

  if (!isRecipient) {
    return res.status(403).json(errorResponse('Only the recipient can accept'));
  }

  if (match.status !== 'pending') {
    return res.status(400).json(errorResponse(`Match is already ${match.status}`));
  }

  match.status = 'accepted';
  await match.save();

  // Create a conversation for the matched pair
  let conversation = await Conversation.findOne({ matchId: match._id });
  if (!conversation) {
    conversation = await Conversation.create({
      participants: match.users,
      matchId: match._id,
      lastMessage: {
        text: 'You matched! Say hello 👋',
        senderId: match.initiator,
        createdAt: new Date(),
      },
    });

    // System message
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
  const match = await Match.findById(req.params.matchId);
  if (!match) return res.status(404).json(errorResponse('Match not found'));

  const isParticipant = match.users.some(u => u.toString() === req.user._id.toString());
  if (!isParticipant) return res.status(403).json(errorResponse('Not a participant'));

  if (match.status !== 'pending') {
    return res.status(400).json(errorResponse(`Match is already ${match.status}`));
  }

  match.status = 'rejected';
  await match.save();

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
    .lean();

  res.json(successResponse(pending, 'Pending requests'));
});

module.exports = router;
