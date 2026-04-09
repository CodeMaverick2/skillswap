function scoreUserForDiscover(me, user) {
  let score = 0;
  const sharedSkills = [];
  const scoreBreakdown = {
    theyTeach: 0,
    iTeach: 0,
    mutualBonus: 0,
    sharedDepth: 0,
    reliability: 0,
    recency: 0,
    intent: 'practice_buddy',
  };

  for (const myLearn of me.learnSkills || []) {
    if (!myLearn.skillName) continue;
    const theirTeach = (user.teachSkills || []).find((t) => t.skillName?.toLowerCase() === myLearn.skillName.toLowerCase());
    if (theirTeach) {
      const points = 20 + (theirTeach.level || 0) * 5;
      score += points;
      scoreBreakdown.theyTeach += points;
      sharedSkills.push({ skillName: theirTeach.skillName, skillIcon: theirTeach.skillIcon, direction: 'they_teach', theirLevel: theirTeach.level });
    }
  }

  for (const theirLearn of user.learnSkills || []) {
    if (!theirLearn.skillName) continue;
    const myTeach = (me.teachSkills || []).find((t) => t.skillName?.toLowerCase() === theirLearn.skillName.toLowerCase());
    if (myTeach) {
      const points = 15 + (myTeach.level || 0) * 3;
      score += points;
      scoreBreakdown.iTeach += points;
      sharedSkills.push({ skillName: myTeach.skillName, skillIcon: myTeach.skillIcon, direction: 'i_teach', myLevel: myTeach.level });
    }
  }

  const theyTeachMe = sharedSkills.some((s) => s.direction === 'they_teach');
  const iTeachThem = sharedSkills.some((s) => s.direction === 'i_teach');
  const sharedCount = sharedSkills.length;
  if (theyTeachMe && iTeachThem) {
    score += 35;
    scoreBreakdown.mutualBonus = 35;
  }
  const depthPoints = Math.min(sharedCount * 4, 20);
  score += depthPoints;
  scoreBreakdown.sharedDepth = depthPoints;

  const rep = user.reputation || {};
  const completionRate = Math.max(0, Math.min(100, rep.completionRate || 0));
  const totalSessions = Math.max(0, rep.totalSessions || 0);
  const avgRating = Math.max(0, Math.min(5, rep.avgRating || 0));
  const reliabilityPoints = Math.round(completionRate / 20) + Math.min(Math.floor(totalSessions / 5), 6) + Math.round(avgRating);
  score += reliabilityPoints;
  scoreBreakdown.reliability = reliabilityPoints;

  const lastActiveAt = user.profile?.lastActiveAt ? new Date(user.profile.lastActiveAt).getTime() : 0;
  if (lastActiveAt) {
    const hoursAgo = (Date.now() - lastActiveAt) / (1000 * 60 * 60);
    if (hoursAgo <= 24) score += 6;
    else if (hoursAgo <= 72) score += 3;
    scoreBreakdown.recency = hoursAgo <= 24 ? 6 : hoursAgo <= 72 ? 3 : 0;
  }

  scoreBreakdown.intent = scoreBreakdown.mutualBonus > 0 ? 'long_term_mentorship' : scoreBreakdown.theyTeach >= 30 ? 'quick_lesson' : 'practice_buddy';

  return { ...user, matchScore: score, sharedSkills, scoreBreakdown };
}

module.exports = { scoreUserForDiscover };
