const express = require('express');
const Activity = require('../models/Activity');
const Match = require('../models/Match');
const protect = require('../middleware/auth.middleware');
const { successResponse } = require('../utils/apiResponse');

const router = express.Router();

// GET /api/activity/feed — activities related to user and connections
router.get('/feed', protect, async (req, res) => {
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
  const me = req.user._id;
  const acceptedMatches = await Match.find({
    users: me,
    status: 'accepted',
  }).select('users').lean();
  const connectionIds = acceptedMatches.flatMap((m) => m.users.filter((u) => u.toString() !== me.toString()));

  const activities = await Activity.find({
    $or: [
      { actor: me },
      { targetUser: me },
      { actor: { $in: connectionIds }, visibility: 'connections' },
    ],
  })
    .populate('actor', 'username profile')
    .populate('targetUser', 'username profile')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  res.json(successResponse(activities, 'Activity feed fetched'));
});

module.exports = router;
