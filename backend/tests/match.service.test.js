/**
 * Unit tests for match.service — pure functions, no DB needed.
 */

const {
  computeMatchScore,
  skillsEqual,
  availabilityOverlapBonus,
  reputationBonus,
} = require('../src/services/match.service');

// Tiny helper so test fixtures stay readable
const teach = (name, level, opts = {}) => ({
  skillId: opts.id,
  skillName: name,
  skillIcon: opts.icon,
  level,
  yearsExp: opts.yearsExp,
});

const learn = (name, targetLevel, opts = {}) => ({
  skillId: opts.id,
  skillName: name,
  skillIcon: opts.icon,
  targetLevel,
});

describe('skillsEqual', () => {
  test('equal by skillId even when names differ', () => {
    expect(skillsEqual(
      { skillId: 'abc', skillName: 'React' },
      { skillId: 'abc', skillName: 'ReactJS' },
    )).toBe(true);
  });

  test('equal by skillName, case-insensitive', () => {
    expect(skillsEqual(
      { skillName: 'JavaScript' },
      { skillName: 'javascript' },
    )).toBe(true);
  });

  test('equal by skillName with surrounding whitespace', () => {
    expect(skillsEqual(
      { skillName: '  Guitar' },
      { skillName: 'guitar  ' },
    )).toBe(true);
  });

  test('not equal when names differ and no ids', () => {
    expect(skillsEqual(
      { skillName: 'React' },
      { skillName: 'Vue' },
    )).toBe(false);
  });

  test('handles null / undefined inputs', () => {
    expect(skillsEqual(null, { skillName: 'x' })).toBe(false);
    expect(skillsEqual({ skillName: 'x' }, undefined)).toBe(false);
    expect(skillsEqual(null, null)).toBe(false);
  });

  test('handles missing skillName', () => {
    expect(skillsEqual({}, { skillName: 'x' })).toBe(false);
  });

  test('skillId mismatch falls back to name match', () => {
    expect(skillsEqual(
      { skillId: 'a', skillName: 'React' },
      { skillId: 'b', skillName: 'React' }, // different ids but same name → still equal
    )).toBe(true);
  });
});

describe('availabilityOverlapBonus', () => {
  test('returns 0 if either side is missing', () => {
    expect(availabilityOverlapBonus(null, { days: [1], timeStart: 9, timeEnd: 17 })).toBe(0);
    expect(availabilityOverlapBonus({ days: [1], timeStart: 9, timeEnd: 17 }, undefined)).toBe(0);
  });

  test('returns 0 with no shared days', () => {
    const bonus = availabilityOverlapBonus(
      { days: [1, 2], timeStart: 9, timeEnd: 17 },
      { days: [3, 4], timeStart: 9, timeEnd: 17 },
    );
    expect(bonus).toBe(0);
  });

  test('returns 0 with no shared hours', () => {
    const bonus = availabilityOverlapBonus(
      { days: [1, 2], timeStart: 0, timeEnd: 8 },
      { days: [1, 2], timeStart: 18, timeEnd: 22 },
    );
    expect(bonus).toBe(0);
  });

  test('full default overlap is bounded by 10', () => {
    // 5 days × (21-9)=12 hours → min(10, 5 + 12/4) = min(10, 8) = 8
    const bonus = availabilityOverlapBonus(
      { days: [1, 2, 3, 4, 5], timeStart: 9, timeEnd: 21 },
      { days: [1, 2, 3, 4, 5], timeStart: 9, timeEnd: 21 },
    );
    expect(bonus).toBe(8);
  });

  test('overlap is capped at 10', () => {
    const bonus = availabilityOverlapBonus(
      { days: [0, 1, 2, 3, 4, 5, 6], timeStart: 0, timeEnd: 23 },
      { days: [0, 1, 2, 3, 4, 5, 6], timeStart: 0, timeEnd: 23 },
    );
    expect(bonus).toBe(10);
  });
});

describe('reputationBonus', () => {
  test('returns 0 when reputation is missing', () => {
    expect(reputationBonus({})).toBe(0);
    expect(reputationBonus(null)).toBe(0);
  });

  test('returns 0 for new users (no completed sessions)', () => {
    expect(reputationBonus({ reputation: { avgRating: 4.5, totalSessions: 0 } })).toBe(0);
  });

  test('returns rounded avgRating', () => {
    expect(reputationBonus({ reputation: { avgRating: 4.4, totalSessions: 3 } })).toBe(4);
    expect(reputationBonus({ reputation: { avgRating: 4.6, totalSessions: 3 } })).toBe(5);
    expect(reputationBonus({ reputation: { avgRating: 1.2, totalSessions: 1 } })).toBe(1);
  });
});

describe('computeMatchScore', () => {
  // Strip availability/reputation from base fixtures so we can isolate skill scoring,
  // then opt in for the bonus-specific tests.
  const me = (overrides = {}) => ({
    learnSkills: [],
    teachSkills: [],
    ...overrides,
  });

  test('returns score 0 and empty sharedSkills when no overlap', () => {
    const result = computeMatchScore(
      me({ learnSkills: [learn('Spanish', 3)] }),
      me({ teachSkills: [teach('French', 5)] }),
    );
    expect(result.score).toBe(0);
    expect(result.sharedSkills).toEqual([]);
  });

  test('one-way: they teach what I want — base 20 + 5×level', () => {
    const result = computeMatchScore(
      // No targetLevel so we isolate the base+level scoring
      me({ learnSkills: [learn('Guitar', undefined)] }),
      me({ teachSkills: [teach('Guitar', 4)] }), // 20 + 20 = 40
    );
    expect(result.score).toBe(40);
    expect(result.sharedSkills).toHaveLength(1);
    expect(result.sharedSkills[0].direction).toBe('they_teach');
  });

  test('one-way: I teach what they want — base 15 + 3×level', () => {
    const result = computeMatchScore(
      me({ teachSkills: [teach('React', 5)] }),
      me({ learnSkills: [learn('React', undefined)] }), // 15 + 15 = 30
    );
    expect(result.score).toBe(30);
    expect(result.sharedSkills).toHaveLength(1);
    expect(result.sharedSkills[0].direction).toBe('i_teach');
  });

  test('mutual barter adds the +30 bonus', () => {
    const result = computeMatchScore(
      me({
        learnSkills: [learn('Guitar', undefined)],
        teachSkills: [teach('React', 5)],
      }),
      me({
        teachSkills: [teach('Guitar', 4)],            // 20 + 20 = 40
        learnSkills: [learn('React', undefined)],     // 15 + 15 = 30
      }),
    );
    // 40 + 30 + 30 mutual bonus = 100
    expect(result.score).toBe(100);
    expect(result.sharedSkills).toHaveLength(2);
  });

  test('teacher meeting targetLevel adds +5', () => {
    const meets = computeMatchScore(
      me({ learnSkills: [learn('Guitar', 3)] }),
      me({ teachSkills: [teach('Guitar', 4)] }), // level 4 ≥ target 3 → +5
    );
    const below = computeMatchScore(
      me({ learnSkills: [learn('Guitar', 5)] }),
      me({ teachSkills: [teach('Guitar', 4)] }), // level 4 < target 5 → no bonus
    );
    expect(meets.score - below.score).toBe(5);
  });

  test('teacher below targetLevel still scores (no penalty)', () => {
    // Without targetLevel: 20 + 5×2 = 30. With unmet target, same base, no penalty.
    const result = computeMatchScore(
      me({ learnSkills: [learn('Guitar', 5)] }),
      me({ teachSkills: [teach('Guitar', 2)] }),
    );
    expect(result.score).toBe(30);
  });

  test('matches by skillId across name variants', () => {
    const id = '507f1f77bcf86cd799439011';
    const result = computeMatchScore(
      me({ learnSkills: [learn('React', 3, { id })] }),
      me({ teachSkills: [teach('ReactJS', 4, { id })] }), // different name, same id
    );
    expect(result.score).toBe(45); // 20 + 20 + 5 (targetLevel met)
    expect(result.sharedSkills).toHaveLength(1);
  });

  test('availability bonus is added when both sides set it', () => {
    const withoutAvail = computeMatchScore(
      me({ learnSkills: [learn('Guitar', 3)] }),
      me({ teachSkills: [teach('Guitar', 4)] }),
    );
    const withAvail = computeMatchScore(
      me({
        learnSkills: [learn('Guitar', 3)],
        availability: { days: [1, 2, 3, 4, 5], timeStart: 9, timeEnd: 21 },
      }),
      me({
        teachSkills: [teach('Guitar', 4)],
        availability: { days: [1, 2, 3, 4, 5], timeStart: 9, timeEnd: 21 },
      }),
    );
    expect(withAvail.score - withoutAvail.score).toBe(8);
  });

  test('reputation bonus is added based on avgRating', () => {
    const result = computeMatchScore(
      me({ learnSkills: [learn('Guitar', 3)] }),
      me({
        teachSkills: [teach('Guitar', 4)],
        reputation: { avgRating: 4.6, totalSessions: 10 },
      }),
    );
    // 20 + 20 + 5 (target met) + 5 (reputation rounded) = 50
    expect(result.score).toBe(50);
  });

  test("perspective='initiator' returns Match-schema-compatible direction labels", () => {
    const result = computeMatchScore(
      me({
        learnSkills: [learn('Guitar', 2)],
        teachSkills: [teach('React', 5)],
      }),
      me({
        teachSkills: [teach('Guitar', 4)],
        learnSkills: [learn('React', 3)],
      }),
      'initiator',
    );
    const directions = result.sharedSkills.map((s) => s.direction).sort();
    expect(directions).toEqual(['initiator_learns', 'initiator_teaches']);
  });

  test('sharedSkills entries carry skill metadata', () => {
    const result = computeMatchScore(
      me({ learnSkills: [learn('Guitar', 3)] }),
      me({ teachSkills: [teach('Guitar', 4, { icon: 'GTR' })] }),
    );
    expect(result.sharedSkills[0]).toMatchObject({
      skillName: 'Guitar',
      skillIcon: 'GTR',
      direction: 'they_teach',
      theirLevel: 4,
      myTargetLevel: 3,
    });
  });

  test('gracefully handles users with no skill arrays', () => {
    const result = computeMatchScore({}, {});
    expect(result.score).toBe(0);
    expect(result.sharedSkills).toEqual([]);
  });
});
