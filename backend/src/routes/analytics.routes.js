const express = require('express');
const Joi = require('joi');
const protect = require('../middleware/auth.middleware');
const { trackEvent, getFunnelReport } = require('../services/analytics.service');
const { successResponse, errorResponse } = require('../utils/apiResponse');

const router = express.Router();

const trackSchema = Joi.object({
  name: Joi.string().required(),
  properties: Joi.object().optional(),
});

router.post('/track', protect, async (req, res) => {
  const { error, value } = trackSchema.validate(req.body, { stripUnknown: true });
  if (error) return res.status(400).json(errorResponse('Validation failed', error.details.map((e) => e.message)));
  const allowed = [
    'register_success',
    'onboarding_completed',
    'match_request_sent',
    'match_request_accepted',
    'first_message_sent',
    'session_created',
    'session_completed',
    'match_quality_feedback',
  ];
  if (!allowed.includes(value.name)) {
    return res.status(400).json(errorResponse('Unknown event name'));
  }
  await trackEvent(req.user._id, value.name, value.properties || {});
  res.status(201).json(successResponse(null, 'Tracked'));
});

router.get('/funnel', protect, async (req, res) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 7));
  const report = await getFunnelReport(days);
  res.json(successResponse(report, 'Funnel report'));
});

module.exports = router;
