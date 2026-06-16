const Block = require('../models/Block');
const MatchOutcome = require('../models/MatchOutcome');

async function getBlockedUserIds(userId) {
  const rows = await Block.find({
    $or: [{ blocker: userId }, { blocked: userId }],
  }).select('blocker blocked').lean();
  const ids = new Set();
  for (const r of rows) {
    const a = r.blocker.toString();
    const b = r.blocked.toString();
    const me = userId.toString();
    ids.add(a === me ? b : a);
  }
  return [...ids];
}

async function isBlockedEitherWay(userA, userB) {
  const found = await Block.findOne({
    $or: [
      { blocker: userA, blocked: userB },
      { blocker: userB, blocked: userA },
    ],
  }).lean();
  return Boolean(found);
}

async function getPeerOutcomeBoost(peerId) {
  const outcomes = await MatchOutcome.find({
    peerId,
    qualityScore: { $exists: true, $ne: null },
  }).select('qualityScore').lean();
  if (!outcomes.length) return 0;
  const avg = outcomes.reduce((s, o) => s + (o.qualityScore || 0), 0) / outcomes.length;
  // Map 1-5 avg to -8..+10 boost
  return Math.round((avg - 3) * 5);
}

module.exports = { getBlockedUserIds, isBlockedEitherWay, getPeerOutcomeBoost };
