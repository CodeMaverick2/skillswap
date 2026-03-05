const { request, connectTestDB, clearDB, disconnectTestDB, registerUser, authed } = require('./setup');

beforeAll(connectTestDB);
afterEach(clearDB);
afterAll(disconnectTestDB);

const SKILL_ID_1 = '64f1a2b3c4d5e6f7a8b9c0d1';
const SKILL_ID_2 = '64f1a2b3c4d5e6f7a8b9c0d2';
const SKILL_ID_3 = '64f1a2b3c4d5e6f7a8b9c0d3';

const sampleTeach = [
  { skillId: SKILL_ID_1, skillName: 'Python', skillIcon: '🐍', level: 4 },
  { skillId: SKILL_ID_2, skillName: 'Guitar', skillIcon: '🎸', level: 3 },
];
const sampleLearn = [
  { skillId: SKILL_ID_3, skillName: 'Spanish', skillIcon: '🌍', targetLevel: 2 },
];

describe('PUT /api/users/me/skills — valid payloads', () => {
  it('saves teachSkills array', async () => {
    const { token } = await registerUser();
    const res = await authed(token).put('/api/users/me/skills', { teachSkills: sampleTeach });

    expect(res.status).toBe(200);
    expect(res.body.data.teachSkills).toHaveLength(2);
    expect(res.body.data.teachSkills[0].skillName).toBe('Python');
    expect(res.body.data.teachSkills[0].level).toBe(4);
  });

  it('saves learnSkills array', async () => {
    const { token } = await registerUser();
    const res = await authed(token).put('/api/users/me/skills', { learnSkills: sampleLearn });

    expect(res.status).toBe(200);
    expect(res.body.data.learnSkills).toHaveLength(1);
    expect(res.body.data.learnSkills[0].targetLevel).toBe(2);
  });

  it('saves both arrays in one call', async () => {
    const { token } = await registerUser();
    const res = await authed(token).put('/api/users/me/skills', {
      teachSkills: sampleTeach,
      learnSkills: sampleLearn,
    });

    expect(res.status).toBe(200);
    expect(res.body.data.teachSkills).toHaveLength(2);
    expect(res.body.data.learnSkills).toHaveLength(1);
  });

  it('replaces existing skills on second call', async () => {
    const { token } = await registerUser();
    await authed(token).put('/api/users/me/skills', { teachSkills: sampleTeach });

    const res = await authed(token).put('/api/users/me/skills', {
      teachSkills: [{ skillId: SKILL_ID_3, skillName: 'Rust', skillIcon: '🦀', level: 2 }],
    });
    expect(res.status).toBe(200);
    expect(res.body.data.teachSkills).toHaveLength(1);
    expect(res.body.data.teachSkills[0].skillName).toBe('Rust');
  });

  it('clearing skills with empty array works', async () => {
    const { token } = await registerUser();
    await authed(token).put('/api/users/me/skills', { teachSkills: sampleTeach });
    const res = await authed(token).put('/api/users/me/skills', { teachSkills: [] });
    expect(res.status).toBe(200);
    expect(res.body.data.teachSkills).toHaveLength(0);
  });

  it('passwordHash absent in skills response', async () => {
    const { token } = await registerUser();
    const res = await authed(token).put('/api/users/me/skills', { teachSkills: sampleTeach });
    expect(res.body.data.passwordHash).toBeUndefined();
  });
});

describe('PUT /api/users/me/skills — validation', () => {
  it('level out of range (> 5) → 400', async () => {
    const { token } = await registerUser();
    const res = await authed(token).put('/api/users/me/skills', {
      teachSkills: [{ skillId: SKILL_ID_1, skillName: 'Python', level: 99 }],
    });
    expect(res.status).toBe(400);
  });

  it('level out of range (< 1) → 400', async () => {
    const { token } = await registerUser();
    const res = await authed(token).put('/api/users/me/skills', {
      teachSkills: [{ skillId: SKILL_ID_1, skillName: 'Python', level: 0 }],
    });
    expect(res.status).toBe(400);
  });

  it('targetLevel out of range → 400', async () => {
    const { token } = await registerUser();
    const res = await authed(token).put('/api/users/me/skills', {
      learnSkills: [{ skillId: SKILL_ID_1, skillName: 'Python', targetLevel: 6 }],
    });
    expect(res.status).toBe(400);
  });

  it('more than 20 teachSkills → 400', async () => {
    const { token } = await registerUser();
    const tooMany = Array.from({ length: 21 }, (_, i) => ({
      skillId:   `64f1a2b3c4d5e6f7a8b9c0${String(i).padStart(2, '0')}`,
      skillName: `Skill${i}`,
      level: 1,
    }));
    const res = await authed(token).put('/api/users/me/skills', { teachSkills: tooMany });
    expect(res.status).toBe(400);
  });

  it('missing skillName → 400', async () => {
    const { token } = await registerUser();
    const res = await authed(token).put('/api/users/me/skills', {
      teachSkills: [{ skillId: SKILL_ID_1, level: 2 }],
    });
    expect(res.status).toBe(400);
  });

  it('empty body (no arrays) → 400', async () => {
    const { token } = await registerUser();
    const res = await authed(token).put('/api/users/me/skills', {});
    expect(res.status).toBe(400);
  });

  it('unauthenticated → 401', async () => {
    const res = await request().put('/api/users/me/skills').send({ teachSkills: sampleTeach });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/users/check-username/:username', () => {
  // Own username → available:true (no one ELSE has it; correct for edit-profile)
  it("own username → available: true (no one else owns it)", async () => {
    const { token, user } = await registerUser();
    const res = await authed(token).get(`/api/users/check-username/${user.username}`);
    expect(res.status).toBe(200);
    expect(res.body.data.available).toBe(true);
  });

  it("another user's username → available: false", async () => {
    const { token: t1 }    = await registerUser();
    const { user: other }  = await registerUser();
    const res = await authed(t1).get(`/api/users/check-username/${other.username}`);
    expect(res.status).toBe(200);
    expect(res.body.data.available).toBe(false);
  });

  it('free username → available: true', async () => {
    const { token } = await registerUser();
    const res = await authed(token).get('/api/users/check-username/totallyfreenamethatdoesnotexist');
    expect(res.status).toBe(200);
    expect(res.body.data.available).toBe(true);
  });

  it('username too short → 400', async () => {
    const { token } = await registerUser();
    const res = await authed(token).get('/api/users/check-username/ab');
    expect(res.status).toBe(400);
  });

  it('invalid chars → 400', async () => {
    const { token } = await registerUser();
    const res = await authed(token).get('/api/users/check-username/user@name');
    expect(res.status).toBe(400);
  });

  it('unauthenticated → 401', async () => {
    const res = await request().get('/api/users/check-username/someuser');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/users/:id — public profile', () => {
  it('returns public profile for valid user', async () => {
    const { token: viewerToken } = await registerUser();
    const { user: target }       = await registerUser();

    const res = await authed(viewerToken).get(`/api/users/${target._id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe(target.username);
  });

  it('passwordHash absent in public profile', async () => {
    const { token: t1 } = await registerUser();
    const { user: u2 }  = await registerUser();
    const res = await authed(t1).get(`/api/users/${u2._id}`);
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('skippedUsers absent in public profile', async () => {
    const { token: t1 } = await registerUser();
    const { user: u2 }  = await registerUser();
    const res = await authed(t1).get(`/api/users/${u2._id}`);
    expect(res.body.data.skippedUsers).toBeUndefined();
  });

  it('expoPushToken absent in public profile', async () => {
    const { token: t1 } = await registerUser();
    const { user: u2 }  = await registerUser();
    const res = await authed(t1).get(`/api/users/${u2._id}`);
    expect(res.body.data.expoPushToken).toBeUndefined();
  });

  it('non-existent ObjectId → 404', async () => {
    const { token } = await registerUser();
    const res = await authed(token).get('/api/users/000000000000000000000000');
    expect(res.status).toBe(404);
  });

  it('invalid ObjectId format → 400', async () => {
    const { token } = await registerUser();
    const res = await authed(token).get('/api/users/not-a-valid-id');
    expect(res.status).toBe(400);
  });

  it('deactivated user → 404', async () => {
    const { token: t1 } = await registerUser();
    const { token: t2, user: u2 } = await registerUser();

    // Deactivate u2
    await authed(t2).delete('/api/users/me');

    const res = await authed(t1).get(`/api/users/${u2._id}`);
    expect(res.status).toBe(404);
  });

  it('unauthenticated → 401', async () => {
    const { user } = await registerUser();
    const res = await request().get(`/api/users/${user._id}`);
    expect(res.status).toBe(401);
  });
});
