const express = require('express');
const User = require('../models/User');
const Match = require('../models/Match');
const protect = require('../middleware/auth.middleware');
const { successResponse, errorResponse } = require('../utils/apiResponse');

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

  const excludeIds = [
    me._id,
    ...(me.skippedUsers || []),
    ...matchedUserIds,
  ];

  // Build query: find users whose teachSkills overlap with my learnSkills (or vice versa)
  const myLearnSkillNames = (me.learnSkills || []).map(s => s.skillName?.toLowerCase()).filter(Boolean);
  const myTeachSkillNames = (me.teachSkills || []).map(s => s.skillName?.toLowerCase()).filter(Boolean);

  const query = {
    _id: { $nin: excludeIds },
    isActive: true,
    onboardingCompleted: true,
  };

  // At least one skill overlap in either direction
  const orConditions = [];
  if (myLearnSkillNames.length > 0) {
    orConditions.push({ 'teachSkills.skillName': { $regex: new RegExp(myLearnSkillNames.map(s => `^${s}$`).join('|'), 'i') } });
  }
  if (myTeachSkillNames.length > 0) {
    orConditions.push({ 'learnSkills.skillName': { $regex: new RegExp(myTeachSkillNames.map(s => `^${s}$`).join('|'), 'i') } });
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

  // Calculate match score for each user
  const usersWithScore = users.map(user => {
    let score = 0;
    const sharedSkills = [];

    // They teach what I want to learn
    for (const myLearn of me.learnSkills || []) {
      const theirTeach = (user.teachSkills || []).find(
        t => t.skillName?.toLowerCase() === myLearn.skillName?.toLowerCase()
      );
      if (theirTeach) {
        score += 20 + (theirTeach.level || 0) * 5;
        sharedSkills.push({
          skillName: theirTeach.skillName,
          skillIcon: theirTeach.skillIcon,
          direction: 'they_teach',
          theirLevel: theirTeach.level,
        });
      }
    }

    // I teach what they want to learn
    for (const theirLearn of user.learnSkills || []) {
      const myTeach = (me.teachSkills || []).find(
        t => t.skillName?.toLowerCase() === theirLearn.skillName?.toLowerCase()
      );
      if (myTeach) {
        score += 15 + (myTeach.level || 0) * 3;
        sharedSkills.push({
          skillName: myTeach.skillName,
          skillIcon: myTeach.skillIcon,
          direction: 'i_teach',
          myLevel: myTeach.level,
        });
      }
    }

    // Bonus for mutual exchange
    const theyTeachMe = sharedSkills.some(s => s.direction === 'they_teach');
    const iTeachThem = sharedSkills.some(s => s.direction === 'i_teach');
    if (theyTeachMe && iTeachThem) score += 30;

    return { ...user, matchScore: score, sharedSkills };
  });

  // Sort by match score descending
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
  await User.findByIdAndUpdate(req.user._id, {
    $addToSet: { skippedUsers: userId },
  });
  res.json(successResponse(null, 'User skipped'));
});

module.exports = router;
