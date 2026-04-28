/**
 * Shared matching logic for discover scoring and Match document persistence.
 *
 * All factors are additive bonuses — no penalties. Adding new bonuses can
 * shift relative ranking but never excludes a candidate that the prior
 * algorithm would have surfaced.
 */

function skillsEqual(a, b) {
  if (!a || !b) return false;
  if (a.skillId && b.skillId && a.skillId.toString() === b.skillId.toString()) {
    return true;
  }
  const an = a.skillName?.toLowerCase().trim();
  const bn = b.skillName?.toLowerCase().trim();
  return !!an && an === bn;
}

function availabilityOverlapBonus(a, b) {
  if (!a || !b) return 0;
  const aDays = Array.isArray(a.days) ? a.days : [];
  const bDays = Array.isArray(b.days) ? b.days : [];
  const sharedDays = aDays.filter((d) => bDays.includes(d)).length;

  const startA = Number.isFinite(a.timeStart) ? a.timeStart : 0;
  const startB = Number.isFinite(b.timeStart) ? b.timeStart : 0;
  const endA = Number.isFinite(a.timeEnd) ? a.timeEnd : 23;
  const endB = Number.isFinite(b.timeEnd) ? b.timeEnd : 23;

  const sharedHours = Math.max(0, Math.min(endA, endB) - Math.max(startA, startB));

  if (sharedDays === 0 || sharedHours === 0) return 0;
  return Math.min(10, sharedDays + Math.floor(sharedHours / 4));
}

function reputationBonus(other) {
  const rep = other?.reputation;
  if (!rep || !rep.totalSessions || !rep.avgRating) return 0;
  return Math.round(rep.avgRating); // 0–5 points
}

/**
 * Compute the match score and shared-skill list between `me` and `other`.
 *
 * @param {Object} me     Full user doc (including learnSkills, teachSkills, availability)
 * @param {Object} other  Full user doc
 * @param {'me'|'initiator'} perspective
 *   'me'        → directions tagged 'they_teach' | 'i_teach'   (used by discover response)
 *   'initiator' → directions tagged 'initiator_learns' | 'initiator_teaches'
 *                 (matches the Match schema enum so the result can be persisted)
 * @returns {{ score: number, sharedSkills: Array }}
 */
function computeMatchScore(me, other, perspective = 'me') {
  let score = 0;
  const sharedSkills = [];
  let theyTeachMe = false;
  let iTeachThem = false;

  // Direction A: they teach what I want to learn
  for (const myLearn of me.learnSkills || []) {
    const theirTeach = (other.teachSkills || []).find((t) => skillsEqual(t, myLearn));
    if (!theirTeach) continue;

    let pts = 20 + (theirTeach.level || 0) * 5;
    if (myLearn.targetLevel && (theirTeach.level || 0) >= myLearn.targetLevel) {
      pts += 5; // teacher meets the learner's target level
    }
    score += pts;
    theyTeachMe = true;

    sharedSkills.push({
      skillId: theirTeach.skillId,
      skillName: theirTeach.skillName,
      skillIcon: theirTeach.skillIcon,
      direction: perspective === 'initiator' ? 'initiator_learns' : 'they_teach',
      theirLevel: theirTeach.level,
      myTargetLevel: myLearn.targetLevel,
    });
  }

  // Direction B: I can teach what they want to learn
  for (const theirLearn of other.learnSkills || []) {
    const myTeach = (me.teachSkills || []).find((t) => skillsEqual(t, theirLearn));
    if (!myTeach) continue;

    let pts = 15 + (myTeach.level || 0) * 3;
    if (theirLearn.targetLevel && (myTeach.level || 0) >= theirLearn.targetLevel) {
      pts += 5;
    }
    score += pts;
    iTeachThem = true;

    sharedSkills.push({
      skillId: myTeach.skillId,
      skillName: myTeach.skillName,
      skillIcon: myTeach.skillIcon,
      direction: perspective === 'initiator' ? 'initiator_teaches' : 'i_teach',
      myLevel: myTeach.level,
      theirTargetLevel: theirLearn.targetLevel,
    });
  }

  // Mutual barter bonus — the "magic moment" the product hinges on
  if (theyTeachMe && iTeachThem) score += 30;

  score += availabilityOverlapBonus(me.availability, other.availability);
  score += reputationBonus(other);

  return { score, sharedSkills };
}

module.exports = {
  computeMatchScore,
  skillsEqual,
  availabilityOverlapBonus,
  reputationBonus,
};
