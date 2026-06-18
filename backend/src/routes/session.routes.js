const express = require('express');
const Joi = require('joi');
const Session = require('../models/Session');
const Match = require('../models/Match');
const SessionTemplate = require('../models/SessionTemplate');
const { logActivity } = require('../services/activity.service');
const { hasConflict, getSuggestedSlots } = require('../services/availability.service');
const { notifySessionEvent } = require('../services/notification.service');
const { trackEvent } = require('../services/analytics.service');
const {
  markSessionScheduled,
  markSessionCompleted,
} = require('../services/matching-feedback.service');
const User = require('../models/User');
const LearningGoal = require('../models/LearningGoal');
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
  templateId: Joi.string().optional(),
});

const feedbackSchema = Joi.object({
  score: Joi.number().integer().min(1).max(5).required(),
  comment: Joi.string().trim().max(300).allow(''),
  nextSteps: Joi.string().trim().max(500).allow(''),
});

const rescheduleSchema = Joi.object({
  scheduledAt: Joi.date().iso().greater('now').required(),
  duration: Joi.number().integer().min(15).max(180).optional(),
  reason: Joi.string().trim().max(200).allow(''),
});

function toIcsDate(date) {
  return new Date(date).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function buildIcs(session) {
  const start = new Date(session.scheduledAt);
  const end = new Date(start.getTime() + (session.duration || 60) * 60 * 1000);
  const uid = `${session._id}@skillswap`;
  const summary = (session.topic || 'SkillSwap session').replace(/\n/g, ' ');
  const description = [
    session.notes || '',
    session.meetingLink ? `Meeting: ${session.meetingLink}` : '',
  ].filter(Boolean).join('\\n');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SkillSwap//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
    session.meetingLink ? `URL:${session.meetingLink}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

const DEFAULT_TEMPLATES = [
  {
    name: 'Quick skill intro',
    skillHint: 'any',
    defaultDuration: 30,
    topicPrefix: 'Intro session',
    checklist: [
      { text: 'Share goals for this skill' },
      { text: 'Demo one core concept' },
      { text: 'Agree on homework' },
    ],
  },
  {
    name: 'Deep practice',
    skillHint: 'any',
    defaultDuration: 60,
    topicPrefix: 'Practice session',
    checklist: [
      { text: 'Warm-up review of last session' },
      { text: 'Work through one real problem together' },
      { text: 'Capture notes and next steps' },
    ],
  },
  {
    name: 'Portfolio review',
    skillHint: 'design',
    defaultDuration: 45,
    topicPrefix: 'Portfolio critique',
    checklist: [
      { text: 'Walk through 2-3 pieces' },
      { text: 'Give specific feedback' },
      { text: 'Pick one item to improve this week' },
    ],
  },
];

async function ensureSystemTemplates() {
  const count = await SessionTemplate.countDocuments({ isSystem: true });
  if (count === 0) {
    await SessionTemplate.insertMany(DEFAULT_TEMPLATES.map((t) => ({ ...t, isSystem: true })));
  }
}

// GET /api/sessions/templates — system + user templates
router.get('/templates', protect, async (req, res) => {
  await ensureSystemTemplates();
  const templates = await SessionTemplate.find({
    $or: [{ isSystem: true }, { createdBy: req.user._id }],
  }).sort({ isSystem: -1, name: 1 }).lean();
  res.json(successResponse(templates, 'Templates fetched'));
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

  let checklist = [];
  let templateId;
  if (value.templateId && isValidObjectId(value.templateId)) {
    const template = await SessionTemplate.findById(value.templateId).lean();
    if (template) {
      templateId = template._id;
      checklist = (template.checklist || []).map((c) => ({ text: c.text, done: false }));
      if (!value.topic && template.topicPrefix) value.topic = template.topicPrefix;
      if (!value.duration && template.defaultDuration) value.duration = template.defaultDuration;
    }
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
    templateId,
    checklist,
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
  await trackEvent(req.user._id, 'session_created', { sessionId: session._id });
  await markSessionScheduled(match._id, match.users);
  notifySessionEvent(
    otherUserId,
    'New session request',
    value.topic,
    session._id
  ).catch(() => {});

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

  const now = new Date();
  const upcoming = sessions.filter(s => new Date(s.scheduledAt) >= now && s.status !== 'cancelled' && s.status !== 'completed');
  const past = sessions.filter(s => new Date(s.scheduledAt) < now || s.status === 'completed' || s.status === 'cancelled');

  res.json(successResponse({ upcoming, past }, 'Sessions fetched'));
});

// GET /api/sessions/:id/calendar.ics — calendar export
router.get('/:id/calendar.ics', protect, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse('Invalid session ID'));
  }
  const session = await Session.findOne({
    _id: req.params.id,
    participants: req.user._id,
  }).lean();
  if (!session) return res.status(404).json(errorResponse('Session not found'));
  const ics = buildIcs(session);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="skillswap-${session._id}.ics"`);
  res.send(ics);
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

// PUT /api/sessions/:id/confirm
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
  if (session.createdBy.toString() === req.user._id.toString()) {
    return res.status(403).json(errorResponse('Cannot confirm your own session request'));
  }

  session.status = 'confirmed';
  await session.save();
  const otherUserId = session.participants.find((u) => u.toString() !== req.user._id.toString());
  notifySessionEvent(otherUserId, 'Session confirmed', session.topic, session._id).catch(() => {});

  res.json(successResponse(session, 'Session confirmed'));
});

// PUT /api/sessions/:id/reschedule
router.put('/:id/reschedule', protect, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse('Invalid session ID'));
  }
  const { error, value } = rescheduleSchema.validate(req.body, { stripUnknown: true });
  if (error) {
    return res.status(400).json(errorResponse('Validation failed', error.details.map((e) => e.message)));
  }
  const session = await Session.findOne({
    _id: req.params.id,
    participants: req.user._id,
  });
  if (!session) return res.status(404).json(errorResponse('Session not found'));
  if (['completed', 'cancelled'].includes(session.status)) {
    return res.status(400).json(errorResponse(`Cannot reschedule a ${session.status} session`));
  }
  const duration = value.duration || session.duration;
  const conflict = await hasConflict(session.participants, value.scheduledAt, duration, session._id);
  if (conflict) {
    return res.status(409).json(errorResponse('Selected time conflicts with another scheduled session'));
  }
  session.rescheduleHistory.push({
    previousScheduledAt: session.scheduledAt,
    newScheduledAt: value.scheduledAt,
    changedBy: req.user._id,
    reason: value.reason || '',
  });
  session.scheduledAt = value.scheduledAt;
  if (value.duration) session.duration = value.duration;
  if (session.status === 'confirmed') session.status = 'pending';
  await session.save();
  const otherUserId = session.participants.find((u) => u.toString() !== req.user._id.toString());
  notifySessionEvent(otherUserId, 'Session rescheduled', session.topic, session._id).catch(() => {});
  res.json(successResponse(session, 'Session rescheduled'));
});

// PUT /api/sessions/:id/checklist
router.put('/:id/checklist', protect, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return res.status(400).json(errorResponse('Invalid session ID'));
  }
  const items = Array.isArray(req.body?.checklist) ? req.body.checklist : null;
  if (!items) return res.status(400).json(errorResponse('checklist array required'));
  const session = await Session.findOne({
    _id: req.params.id,
    participants: req.user._id,
  });
  if (!session) return res.status(404).json(errorResponse('Session not found'));
  session.checklist = items.slice(0, 20).map((c) => ({
    text: String(c.text || '').trim().slice(0, 140),
    done: Boolean(c.done),
  })).filter((c) => c.text);
  await session.save();
  res.json(successResponse(session, 'Checklist updated'));
});

// PUT /api/sessions/:id/complete
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
      // bump weekly goal counters
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      await LearningGoal.updateMany(
        { userId: pid, status: 'active', weekStartsAt: { $gte: weekAgo } },
        { $inc: { weeklyCompletedSessions: 1 } }
      );
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
  await trackEvent(req.user._id, 'session_completed', { sessionId: session._id });
  await markSessionCompleted(session.matchId);
  notifySessionEvent(otherUserId, 'Session completed', session.topic, session._id).catch(() => {});

  res.json(successResponse(session, 'Session completed'));
});

// PUT /api/sessions/:id/cancel
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
  const otherUserId = session.participants.find((u) => u.toString() !== req.user._id.toString());
  notifySessionEvent(otherUserId, 'Session cancelled', session.topic, session._id).catch(() => {});

  res.json(successResponse(session, 'Session cancelled'));
});

// PUT /api/sessions/:id/notes
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

// PUT /api/sessions/:id/feedback
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
