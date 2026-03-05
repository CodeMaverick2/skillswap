const { request, connectTestDB, clearDB, disconnectTestDB, registerUser, authed } = require('./setup');

beforeAll(connectTestDB);
afterEach(clearDB);
afterAll(disconnectTestDB);

describe('GET /api/users/me', () => {
  it('returns current user profile with 200', async () => {
    const { token, user } = await registerUser();
    const res = await authed(token).get('/api/users/me');

    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(user._id);
    expect(res.body.data.email).toBe(user.email);
  });

  it('passwordHash absent in /me response', async () => {
    const { token } = await registerUser();
    const res = await authed(token).get('/api/users/me');
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('unauthenticated → 401', async () => {
    const res = await request().get('/api/users/me');
    expect(res.status).toBe(401);
  });
});

describe('PUT /api/users/me — profile update', () => {
  it('updates firstName, lastName, bio, timezone', async () => {
    const { token } = await registerUser();
    const res = await authed(token).put('/api/users/me', {
      profile: {
        firstName: 'Alice',
        lastName:  'Smith',
        bio:       'Hello world',
        timezone:  'UTC',
      },
    });

    expect(res.status).toBe(200);
    expect(res.body.data.profile.firstName).toBe('Alice');
    expect(res.body.data.profile.lastName).toBe('Smith');
    expect(res.body.data.profile.bio).toBe('Hello world');
    expect(res.body.data.profile.timezone).toBe('UTC');
  });

  it('sets onboardingCompleted to true', async () => {
    const { token } = await registerUser();
    const res = await authed(token).put('/api/users/me', { onboardingCompleted: true });

    expect(res.status).toBe(200);
    expect(res.body.data.onboardingCompleted).toBe(true);
  });

  it('bio max 200 chars enforced → 400', async () => {
    const { token } = await registerUser();
    const res = await authed(token).put('/api/users/me', {
      profile: { bio: 'x'.repeat(201) },
    });
    expect(res.status).toBe(400);
  });

  it('firstName max 50 chars enforced → 400', async () => {
    const { token } = await registerUser();
    const res = await authed(token).put('/api/users/me', {
      profile: { firstName: 'A'.repeat(51) },
    });
    expect(res.status).toBe(400);
  });

  it('injected fields (isAdmin, passwordHash) are stripped', async () => {
    const { token } = await registerUser();
    const res = await authed(token).put('/api/users/me', {
      profile: { firstName: 'Bob' },
      isAdmin:      true,
      passwordHash: 'hacked',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.isAdmin).toBeUndefined();
    expect(res.body.data.passwordHash).toBeUndefined();
  });

  it('empty body → 400', async () => {
    const { token } = await registerUser();
    const res = await authed(token).put('/api/users/me', {});
    expect(res.status).toBe(400);
  });

  it('availability update works', async () => {
    const { token } = await registerUser();
    const res = await authed(token).put('/api/users/me', {
      availability: { days: [1, 2, 3], timeStart: 9, timeEnd: 18 },
    });
    expect(res.status).toBe(200);
    expect(res.body.data.availability.days).toEqual([1, 2, 3]);
    expect(res.body.data.availability.timeStart).toBe(9);
  });

  it('unauthenticated → 401', async () => {
    const res = await request().put('/api/users/me').send({ profile: { firstName: 'X' } });
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/users/me — deactivation', () => {
  it('deactivates account and returns 200', async () => {
    const { token } = await registerUser();
    const res = await authed(token).delete('/api/users/me');
    expect(res.status).toBe(200);
  });

  it('deactivated user cannot log in', async () => {
    const { token, credentials } = await registerUser();
    await authed(token).delete('/api/users/me');

    const loginRes = await request().post('/api/auth/login').send(credentials);
    expect(loginRes.status).toBe(403);
  });

  it('unauthenticated → 401', async () => {
    const res = await request().delete('/api/users/me');
    expect(res.status).toBe(401);
  });
});
