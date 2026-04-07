const express = require('express');
const Joi = require('joi');
const Session = require('../models/Session');
const Match = require('../models/Match');
const protect = require('../middleware/auth.middleware');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { isValidObjectId } = require('../utils/validate');

const router = express.Router();

const createSessionSchema = Joi.object({
  matchId: Joi.string().required(),
  scheduledAt: Joi.date().iso().greater('now').required(),
  duration: Joi.number().integer().min(15).max(180).default(60),
  topic: Joi.string().trim().max(200).required(),
  notes: Joi.string().trim().max(500).allow(''),
});

// POST /api/sessions — create a session
router.post('/', protect, async (req, res) => {
  const { error, value } = createSessionSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json(errorResponse('Validation failed', error.details.map(e => e.message)));
  }

  const match = await Match.findOne({
    _id: value.matchId,
    users: req.user._id,
    status: 'accepted',
  });

  if (!match) {
    return res.status(404).json(errorResponse('Match not found or not accepted'));
  }

  const session = await Session.create({
    matchId: match._id,
    participants: match.users,
    scheduledAt: value.scheduledAt,
    duration: value.duration,
    topic: value.topic,
    notes: value.notes || '',
    createdBy: req.user._id,
    status: 'pending',
  });

  res.status(201).json(successResponse(session, 'Session created'));
});

// GET /api/sessions — list my sessions
router.get('/', protect, async (req, res) => {
  const status = req.query.status;
  const query = { participants: req.user._id };

  if (status) {
    query.status = status;
  }

  const sessions = await Session.find(query)
    .populate('participants', 'username profile')
    .populate('matchId', 'sharedSkills')
    .sort({ scheduledAt: 1 })
    .lean();

  // Split into upcoming and past
  const now = new Date();
  const upcoming = sessions.filter(s => new Date(s.scheduledAt) >= now && s.status !== 'cancelled' && s.status !== 'completed');
  const past = sessions.filter(s => new Date(s.scheduledAt) < now || s.status === 'completed' || s.status === 'cancelled');

  res.json(successResponse({ upcoming, past }, 'Sessions fetched'));
});

// GET /api/sessions/:id — get single session
router.get('/:id', protect, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse('Invalid session ID'));
  }
  const session = await Session.findOne({
    _id: req.params.id,
    participants: req.user._id,
  })
    .populate('participants', 'username profile')
    .lean();

  if (!session) return res.status(404).json(errorResponse('Session not found'));
  res.json(successResponse(session, 'Session fetched'));
});

// PUT /api/sessions/:id/confirm — confirm a session (only the OTHER participant, not the creator)
router.put('/:id/confirm', protect, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse('Invalid session ID'));
  }

  const session = await Session.findOne({
    _id: req.params.id,
    participants: req.user._id,
  });

  if (!session) return res.status(404).json(errorResponse('Session not found'));
  if (session.status !== 'pending') {
    return res.status(400).json(errorResponse(`Session is already ${session.status}`));
  }
  // Prevent creator from confirming their own request
  if (session.createdBy.toString() === req.user._id.toString()) {
    return res.status(403).json(errorResponse('Cannot confirm your own session request'));
  }

  session.status = 'confirmed';
  await session.save();

  res.json(successResponse(session, 'Session confirmed'));
});

// PUT /api/sessions/:id/complete — complete a session
router.put('/:id/complete', protect, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse('Invalid session ID'));
  }
  const session = await Session.findOne({
    _id: req.params.id,
    participants: req.user._id,
  });

  if (!session) return res.status(404).json(errorResponse('Session not found'));
  if (session.status === 'completed' || session.status === 'cancelled') {
    return res.status(400).json(errorResponse(`Session is already ${session.status}`));
  }

  session.status = 'completed';
  await session.save();

  res.json(successResponse(session, 'Session completed'));
});

// PUT /api/sessions/:id/cancel — cancel a session
router.put('/:id/cancel', protect, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse('Invalid session ID'));
  }
  const session = await Session.findOne({
    _id: req.params.id,
    participants: req.user._id,
  });

  if (!session) return res.status(404).json(errorResponse('Session not found'));
  if (session.status === 'completed' || session.status === 'cancelled') {
    return res.status(400).json(errorResponse(`Session is already ${session.status}`));
  }

  session.status = 'cancelled';
  await session.save();

  res.json(successResponse(session, 'Session cancelled'));
});

module.exports = router;
