const { request, connectTestDB, clearDB, disconnectTestDB, registerUser, authed } = require('./setup');

beforeAll(connectTestDB);
afterEach(clearDB);
afterAll(disconnectTestDB);

describe('POST /api/auth/refresh — token rotation', () => {
  it('valid refresh token returns new access + refresh tokens', async () => {
    const { refreshToken } = await registerUser();
    const res = await request().post('/api/auth/refresh').send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
  });

  it('new refresh token is different from the old one', async () => {
    const { refreshToken } = await registerUser();
    const res = await request().post('/api/auth/refresh').send({ refreshToken });
    expect(res.body.data.refreshToken).not.toBe(refreshToken);
  });

  it('old refresh token is invalidated after rotation', async () => {
    const { refreshToken } = await registerUser();
    await request().post('/api/auth/refresh').send({ refreshToken });

    // Reusing old token should fail
    const res = await request().post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(401);
  });

  it('refresh token reuse revokes ALL sessions', async () => {
    const { credentials } = await registerUser();

    // Create two sessions
    const s1 = await request().post('/api/auth/login').send(credentials);
    const s2 = await request().post('/api/auth/login').send(credentials);
    const refresh1 = s1.body.data.refreshToken;
    const refresh2 = s2.body.data.refreshToken;

    // Use refresh1 once (rotation)
    const rotated = await request().post('/api/auth/refresh').send({ refreshToken: refresh1 });
    expect(rotated.status).toBe(200);

    // Reuse old refresh1 — triggers reuse detection, ALL sessions revoked
    const attack = await request().post('/api/auth/refresh').send({ refreshToken: refresh1 });
    expect(attack.status).toBe(401);

    // Session 2 should also be dead now
    const s2retry = await request().post('/api/auth/refresh').send({ refreshToken: refresh2 });
    expect(s2retry.status).toBe(401);
  });

  it('missing refresh token → 400', async () => {
    const res = await request().post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  it('garbage token string → 401', async () => {
    const res = await request().post('/api/auth/refresh').send({ refreshToken: 'garbage.token.xyz' });
    expect(res.status).toBe(401);
  });

  it('non-string refresh token → 400', async () => {
    const res = await request().post('/api/auth/refresh').send({ refreshToken: 12345 });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/logout', () => {
  it('logout returns 200', async () => {
    const { token, refreshToken } = await registerUser();
    const res = await authed(token).post('/api/auth/logout', { refreshToken });
    expect(res.status).toBe(200);
  });

  it('refresh token is invalidated after logout', async () => {
    const { token, refreshToken } = await registerUser();
    await authed(token).post('/api/auth/logout', { refreshToken });
    const res = await request().post('/api/auth/refresh').send({ refreshToken });
    expect(res.status).toBe(401);
  });

  it('logout without refreshToken body still returns 200', async () => {
    const { token } = await registerUser();
    const res = await authed(token).post('/api/auth/logout', {});
    expect(res.status).toBe(200);
  });

  it('logout without auth token → 401', async () => {
    const res = await request().post('/api/auth/logout').send({});
    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/logout-all', () => {
  it('revokes all sessions, all refresh tokens become invalid', async () => {
    const { credentials } = await registerUser();

    // Two separate login sessions
    const s1 = await request().post('/api/auth/login').send(credentials);
    const s2 = await request().post('/api/auth/login').send(credentials);

    // Logout all using session 1's access token
    const res = await authed(s1.body.data.accessToken).post('/api/auth/logout-all', {});
    expect(res.status).toBe(200);

    // Both session tokens should now be dead
    const r1 = await request().post('/api/auth/refresh').send({ refreshToken: s1.body.data.refreshToken });
    const r2 = await request().post('/api/auth/refresh').send({ refreshToken: s2.body.data.refreshToken });
    expect(r1.status).toBe(401);
    expect(r2.status).toBe(401);
  });

  it('logout-all without auth → 401', async () => {
    const res = await request().post('/api/auth/logout-all').send({});
    expect(res.status).toBe(401);
  });
});

describe('Auth middleware', () => {
  it('request without Authorization header → 401', async () => {
    const res = await request().get('/api/users/me');
    expect(res.status).toBe(401);
  });

  it('request with malformed token → 401', async () => {
    const res = await request()
      .get('/api/users/me')
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(401);
  });

  it('request with wrong scheme (Basic) → 401', async () => {
    const res = await request()
      .get('/api/users/me')
      .set('Authorization', 'Basic dXNlcjpwYXNz');
    expect(res.status).toBe(401);
  });

  it('valid access token → 200', async () => {
    const { token } = await registerUser();
    const res = await authed(token).get('/api/users/me');
    expect(res.status).toBe(200);
  });
});
