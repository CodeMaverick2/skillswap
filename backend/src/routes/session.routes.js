const express = require('express');
const Joi = require('joi');
const Session = require('../models/Session');
const Match = require('../models/Match');
const { logActivity } = require('../services/activity.service');
const { hasConflict, getSuggestedSlots } = require('../services/availability.service');
const User = require('../models/User');
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
  meetingLink: Joi.string().uri().max(500).allow(''),
});

const feedbackSchema = Joi.object({
  score: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().max(300).allow(''),
  nextSteps: Joi.string().trim().max(500).allow(''),
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

  const conflict = await hasConflict(match.users, value.scheduledAt, value.duration);
  if (conflict) {
    return res.status(409).json(errorResponse('Selected time conflicts with another scheduled session'));
  }
  const session = await Session.create({
    matchId: match._id,
    participants: match.users,
    scheduledAt: value.scheduledAt,
    duration: value.duration,
    topic: value.topic,
    notes: value.notes || '',
    meetingLink: value.meetingLink || 'https://meet.google.com/new',
    createdBy: req.user._id,
    status: 'pending',
  });
  const otherUserId = match.users.find((u) => u.toString() !== req.user._id.toString());
  await logActivity({
    actor: req.user._id,
    targetUser: otherUserId,
    type: 'session_created',
    title: 'Scheduled a session',
    description: value.topic,
    metadata: { sessionId: session._id, matchId: match._id, scheduledAt: session.scheduledAt },
  });

  res.status(201).json(successResponse(session, 'Session created'));
});

// GET /api/sessions/slots — availability-aware slot suggestions
router.get('/slots', protect, async (req, res) => {
  const { matchId, from, to } = req.query;
  if (!isValidObjectId(matchId)) {
    return res.status(400).json(errorResponse('Invalid match ID'));
  }
  const match = await Match.findOne({
    _id: matchId,
    users: req.user._id,
    status: 'accepted',
  }).lean();
  if (!match) return res.status(404).json(errorResponse('Match not found'));
  const fromDate = from ? new Date(from) : new Date();
  const toDate = to ? new Date(to) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const slots = await getSuggestedSlots(match.users, fromDate, toDate);
  res.json(successResponse(slots, 'Slots fetched'));
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
  await Promise.all(
    session.participants.map(async (pid) => {
      const u = await User.findById(pid).select('reputation progress').lean();
      if (!u) return;
      const totalSessions = (u.reputation?.totalSessions || 0) + 1;
      const badges = new Set(u.progress?.badges || []);
      if (totalSessions >= 5) badges.add('5_sessions');
      if (totalSessions >= 20) badges.add('20_sessions');
      await User.findByIdAndUpdate(pid, {
        'reputation.totalSessions': totalSessions,
        'progress.badges': Array.from(badges),
      });
    })
  );
  const otherUserId = session.participants.find((u) => u.toString() !== req.user._id.toString());
  await logActivity({
    actor: req.user._id,
    targetUser: otherUserId,
    type: 'session_completed',
    title: 'Completed a session',
    description: session.topic,
    metadata: { sessionId: session._id, matchId: session.matchId },
  });

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

// PUT /api/sessions/:id/notes — store private participant notes
router.put('/:id/notes', protect, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse('Invalid session ID'));
  }
  const note = (req.body?.note || '').toString().trim().slice(0, 1000);
  const session = await Session.findOne({
    _id: req.params.id,
    participants: req.user._id,
  });
  if (!session) return res.status(404).json(errorResponse('Session not found'));
  session.participantNotes.set(req.user._id.toString(), note);
  await session.save();
  res.json(successResponse(session, 'Session notes updated'));
});

// PUT /api/sessions/:id/feedback — post-session reflection and score
router.put('/:id/feedback', protect, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse('Invalid session ID'));
  }
  const { error, value } = feedbackSchema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json(errorResponse('Validation failed', error.details.map((e) => e.message)));
  const session = await Session.findOne({
    _id: req.params.id,
    participants: req.user._id,
  });
  if (!session) return res.status(404).json(errorResponse('Session not found'));
  if (session.status !== 'completed') {
    return res.status(400).json(errorResponse('Feedback is allowed only after completion'));
  }
  session.feedback.set(req.user._id.toString(), value);
  session.rating.set(req.user._id.toString(), { score: value.score, comment: value.comment || '' });
  await session.save();
  res.json(successResponse(session, 'Feedback submitted'));
});

module.exports = router;
