const Activity = require('../models/Activity');

async function logActivity(payload) {
  try {
    if (!payload?.actor || !payload?.type || !payload?.title) return null;
    return await Activity.create(payload);
  } catch {
    return null;
  }
}

module.exports = { logActivity };
