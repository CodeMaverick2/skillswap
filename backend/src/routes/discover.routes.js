const express = require('express');
const User = require('../models/User');
const Match = require('../models/Match');
const protect = require('../middleware/auth.middleware');
const { successResponse, errorResponse } = require('../utils/apiResponse');
const { isValidObjectId, escapeRegex } = require('../utils/validate');
const { computeMatchScore } = require('../services/match.service');

const router = express.Router();

// GET /api/discover — find users with complementary skills
router.get('/', protect, async (req, res) => {
  const me = req.user;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
  const skip = (page - 1) * limit;

  if (!me.learnSkills?.length && !me.teachSkills?.length) {
    return res.json(successResponse({ users: [], page, totalPages: 0 }, 'Complete your profile to discover matches'));
  }

  // Get IDs to exclude: self, skipped users, and users already matched/pending
  const existingMatches = await Match.find({
    users: me._id,
    status: { $in: ['pending', 'accepted'] },
  }).select('users').lean();

  const matchedUserIds = existingMatches.flatMap(m =>
    m.users.filter(u => u.toString() !== me._id.toString())
  );

  // Limit skippedUsers to last 500 to prevent unbounded growth in queries
  const recentSkipped = (me.skippedUsers || []).slice(-500);

  const excludeIds = [
    me._id,
    ...recentSkipped,
    ...matchedUserIds,
  ];

  // Build skill name lists, filter out null/undefined/empty and escape regex
  const myLearnSkillNames = (me.learnSkills || [])
    .map(s => s.skillName?.toLowerCase())
    .filter(s => s && s.length > 0);
  const myTeachSkillNames = (me.teachSkills || [])
    .map(s => s.skillName?.toLowerCase())
    .filter(s => s && s.length > 0);

  // Skill IDs let us match across name variants ("React" vs "ReactJS")
  // when both sides reference the same canonical Skill document.
  const myLearnSkillIds = (me.learnSkills || [])
    .map(s => s.skillId)
    .filter(Boolean);
  const myTeachSkillIds = (me.teachSkills || [])
    .map(s => s.skillId)
    .filter(Boolean);

  const query = {
    _id: { $nin: excludeIds },
    isActive: true,
    onboardingCompleted: true,
  };

  // Eligibility: candidate matches if EITHER skillId or skillName overlaps
  // in either direction. Name match uses escaped, case-insensitive regex.
  const orConditions = [];
  if (myLearnSkillNames.length > 0) {
    orConditions.push({
      'teachSkills.skillName': {
        $in: myLearnSkillNames.map(s => new RegExp(`^${escapeRegex(s)}$`, 'i')),
      },
    });
  }
  if (myTeachSkillNames.length > 0) {
    orConditions.push({
      'learnSkills.skillName': {
        $in: myTeachSkillNames.map(s => new RegExp(`^${escapeRegex(s)}$`, 'i')),
      },
    });
  }
  if (myLearnSkillIds.length > 0) {
    orConditions.push({ 'teachSkills.skillId': { $in: myLearnSkillIds } });
  }
  if (myTeachSkillIds.length > 0) {
    orConditions.push({ 'learnSkills.skillId': { $in: myTeachSkillIds } });
  }

  if (orConditions.length > 0) {
    query.$or = orConditions;
  }

  const [users, total] = await Promise.all([
    User.find(query)
      .select('username profile teachSkills learnSkills reputation availability createdAt')
      .sort({ 'profile.lastActiveAt': -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  // Calculate match score for each user via shared service
  const usersWithScore = users.map((user) => {
    const { score, sharedSkills } = computeMatchScore(me, user, 'me');
    return { ...user, matchScore: score, sharedSkills };
  });

  usersWithScore.sort((a, b) => b.matchScore - a.matchScore);

  res.json(successResponse({
    users: usersWithScore,
    page,
    totalPages: Math.ceil(total / limit),
    total,
  }, 'Discover results'));
});

// POST /api/discover/skip/:userId — skip a user
router.post('/skip/:userId', protect, async (req, res) => {
  const { userId } = req.params;
  if (!isValidObjectId(userId)) {
    return res.status(400).json(errorResponse('Invalid user ID'));
  }
  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { skippedUsers: userId },
  });
  res.json(successResponse(null, 'User skipped'));
});

module.exports = router;
