const User = require('../models/User');
const logger = require('../utils/logger');

// In-memory dedupe: userId+type within window
const recentSends = new Map();
const DEDUPE_MS = 60 * 1000;

function shouldDedupe(key) {
  const last = recentSends.get(key);
  if (last && Date.now() - last < DEDUPE_MS) return true;
  recentSends.set(key, Date.now());
  return false;
}

/**
 * Send Expo push notification. No-ops if token missing or push disabled.
 * In development without EXPO_ACCESS_TOKEN, logs instead of posting.
 */
async function sendPush(userId, { title, body, data = {}, type = 'generic' }) {
  try {
    const user = await User.findById(userId).select('expoPushToken notificationPrefs').lean();
    if (!user?.expoPushToken) return { sent: false, reason: 'no_token' };
    if (user.notificationPrefs?.push === false) return { sent: false, reason: 'disabled' };

    const dedupeKey = `${userId}:${type}:${data.conversationId || data.matchId || data.sessionId || title}`;
    if (type === 'message' && shouldDedupe(dedupeKey)) {
      return { sent: false, reason: 'deduped' };
    }

    const message = {
      to: user.expoPushToken,
      sound: 'default',
      title,
      body,
      data: { ...data, type },
    };

    // Fire-and-forget to Expo push API
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!res.ok) {
      const text = await res.text();
      logger.warn(`Push send failed for ${userId}: ${res.status} ${text}`);
      return { sent: false, reason: 'api_error' };
    }

    return { sent: true };
  } catch (err) {
    logger.warn(`Push error for ${userId}: ${err.message}`);
    return { sent: false, reason: 'error' };
  }
}

async function notifyMatchRequest(recipientId, fromUsername) {
  return sendPush(recipientId, {
    title: 'New connection request',
    body: `${fromUsername} wants to connect on SkillSwap`,
    type: 'match_request',
    data: { screen: 'discover' },
  });
}

async function notifyMatchAccepted(initiatorId, byUsername) {
  return sendPush(initiatorId, {
    title: 'Request accepted',
    body: `${byUsername} accepted your connection`,
    type: 'match_accepted',
    data: { screen: 'messages' },
  });
}

async function notifyNewMessage(recipientId, fromUsername, preview, conversationId) {
  return sendPush(recipientId, {
    title: fromUsername,
    body: preview.slice(0, 100),
    type: 'message',
    data: { screen: 'conversation', conversationId },
  });
}

async function notifySessionEvent(recipientId, title, body, sessionId) {
  return sendPush(recipientId, {
    title,
    body,
    type: 'session',
    data: { screen: 'session', sessionId },
  });
}

module.exports = {
  sendPush,
  notifyMatchRequest,
  notifyMatchAccepted,
  notifyNewMessage,
  notifySessionEvent,
};
