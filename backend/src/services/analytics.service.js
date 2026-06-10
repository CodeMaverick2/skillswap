const AnalyticsEvent = require('../models/AnalyticsEvent');
const Message = require('../models/Message');

async function trackEvent(userId, name, properties = {}) {
  try {
    await AnalyticsEvent.create({ userId, name, properties });
  } catch {
    // non-blocking
  }
}

async function trackFirstMessageIfNeeded(userId, conversationId) {
  const prior = await Message.countDocuments({
    conversationId,
    senderId: userId,
    type: { $ne: 'system' },
  });
  // caller creates message then calls this — count includes just-created if after save
  if (prior <= 1) {
    await trackEvent(userId, 'first_message_sent', { conversationId });
  }
}

async function getFunnelReport(days = 7) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const steps = [
    'register_success',
    'onboarding_completed',
    'match_request_sent',
    'match_request_accepted',
    'first_message_sent',
    'session_created',
    'session_completed',
  ];
  const counts = {};
  for (const name of steps) {
    counts[name] = await AnalyticsEvent.countDocuments({ name, createdAt: { $gte: since } });
  }
  const conversions = {};
  for (let i = 1; i < steps.length; i++) {
    const prev = counts[steps[i - 1]] || 0;
    const curr = counts[steps[i]] || 0;
    conversions[`${steps[i - 1]}→${steps[i]}`] = prev === 0 ? null : Math.round((curr / prev) * 100);
  }
  return { days, since, counts, conversions };
}

module.exports = { trackEvent, trackFirstMessageIfNeeded, getFunnelReport };
