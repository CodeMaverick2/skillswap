const Session = require('../models/Session');

async function hasConflict(participants, scheduledAt, duration, excludeSessionId = null) {
  const start = new Date(scheduledAt);
  const end = new Date(start.getTime() + duration * 60 * 1000);
  const query = {
    participants: { $in: participants },
    status: { $in: ['pending', 'confirmed', 'active'] },
    scheduledAt: { $lt: end },
  };
  if (excludeSessionId) query._id = { $ne: excludeSessionId };
  const sessions = await Session.find(query).select('scheduledAt duration').lean();
  return sessions.some((s) => {
    const sStart = new Date(s.scheduledAt);
    const sEnd = new Date(sStart.getTime() + (s.duration || 60) * 60 * 1000);
    return sStart < end && sEnd > start;
  });
}

async function getSuggestedSlots(participants, from, to) {
  const start = new Date(from);
  const end = new Date(to);
  const slots = [];
  let cur = new Date(start);
  while (cur < end && slots.length < 20) {
    const conflict = await hasConflict(participants, cur, 60);
    if (!conflict) slots.push(new Date(cur));
    cur = new Date(cur.getTime() + 60 * 60 * 1000);
  }
  return slots;
}

module.exports = { hasConflict, getSuggestedSlots };
