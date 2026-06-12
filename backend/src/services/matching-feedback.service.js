const MatchOutcome = require('../models/MatchOutcome');
const { trackEvent } = require('./analytics.service');

async function ensureOutcome(matchId, userId, peerId) {
  return MatchOutcome.findOneAndUpdate(
    { matchId, userId },
    { $setOnInsert: { matchId, userId, peerId } },
    { upsert: true, new: true }
  );
}

async function markReplied(matchId, userId, peerId) {
  await ensureOutcome(matchId, userId, peerId);
  await MatchOutcome.updateOne(
    { matchId, userId },
    { $set: { repliedToFirstMessage: true } }
  );
}

async function markSessionScheduled(matchId, userIds) {
  const [a, b] = userIds.map((u) => u.toString());
  await ensureOutcome(matchId, a, b);
  await ensureOutcome(matchId, b, a);
  await MatchOutcome.updateMany(
    { matchId },
    { $set: { sessionScheduled: true } }
  );
}

async function markSessionCompleted(matchId) {
  await MatchOutcome.updateMany(
    { matchId },
    { $set: { sessionCompleted: true } }
  );
}

async function submitQuality(matchId, userId, peerId, qualityScore) {
  await ensureOutcome(matchId, userId, peerId);
  await MatchOutcome.updateOne(
    { matchId, userId },
    { $set: { qualityScore } }
  );
  await trackEvent(userId, 'match_quality_feedback', { matchId, peerId, qualityScore });
}

module.exports = {
  ensureOutcome,
  markReplied,
  markSessionScheduled,
  markSessionCompleted,
  submitQuality,
};
