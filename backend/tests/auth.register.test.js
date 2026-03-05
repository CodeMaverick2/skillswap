const { request, connectTestDB, clearDB, disconnectTestDB } = require('./setup');

beforeAll(connectTestDB);
afterEach(clearDB);
afterAll(disconnectTestDB);

const validPayload = () => {
  const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
  return {
    email:           `user_${uid}@example.com`,
    username:        `user_${uid}`.slice(0, 30),
    password:        'Password123!',
    confirmPassword: 'Password123!',
  };
};

describe('POST /api/auth/register — success', () => {
  it('creates a user and returns 201 with tokens', async () => {
    const payload = validPayload();
    const res = await request().post('/api/auth/register').send(payload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user).toBeDefined();
  });

  it('returned user has correct email and username', async () => {
    const payload = validPayload();
    const res = await request().post('/api/auth/register').send(payload);

    expect(res.body.data.user.email).toBe(payload.email.toLowerCase());
    expect(res.body.data.user.username).toBe(payload.username.toLowerCase());
  });

  it('passwordHash is NEVER in the response', async () => {
    const res = await request().post('/api/auth/register').send(validPayload());
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('onboardingCompleted defaults to false', async () => {
    const res = await request().post('/api/auth/register').send(validPayload());
    expect(res.body.data.user.onboardingCompleted).toBe(false);
  });

  it('skippedUsers is NOT in the response', async () => {
    const res = await request().post('/api/auth/register').send(validPayload());
    expect(res.body.data.user.skippedUsers).toBeUndefined();
  });

  it('username with underscores is accepted', async () => {
    const uid = Date.now().toString(36);
    const res = await request().post('/api/auth/register').send({
      email: `under_${uid}@test.com`,
      username: `my_user_${uid}`.slice(0, 30),
      password: 'Password123!',
      confirmPassword: 'Password123!',
    });
    expect(res.status).toBe(201);
  });
});

describe('POST /api/auth/register — duplicate fields', () => {
  it('returns 409 for duplicate email (case-insensitive)', async () => {
    const payload = validPayload();
    await request().post('/api/auth/register').send(payload);

    const res = await request().post('/api/auth/register').send({
      ...validPayload(),
      email: payload.email.toUpperCase(),
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/email/i);
  });

  it('returns 409 for duplicate username (case-insensitive)', async () => {
    const payload = validPayload();
    await request().post('/api/auth/register').send(payload);

    const res = await request().post('/api/auth/register').send({
      ...validPayload(),
      username: payload.username.toUpperCase(),
    });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/username/i);
  });
});

describe('POST /api/auth/register — validation errors', () => {
  it('missing email → 400', async () => {
    const { email, ...rest } = validPayload();
    const res = await request().post('/api/auth/register').send(rest);
    expect(res.status).toBe(400);
  });

  it('invalid email format → 400', async () => {
    const res = await request().post('/api/auth/register').send({
      ...validPayload(), email: 'not-an-email',
    });
    expect(res.status).toBe(400);
  });

  it('missing username → 400', async () => {
    const { username, ...rest } = validPayload();
    const res = await request().post('/api/auth/register').send(rest);
    expect(res.status).toBe(400);
  });

  it('username too short (< 3 chars) → 400', async () => {
    const res = await request().post('/api/auth/register').send({
      ...validPayload(), username: 'ab',
    });
    expect(res.status).toBe(400);
  });

  it('username too long (> 30 chars) → 400', async () => {
    const res = await request().post('/api/auth/register').send({
      ...validPayload(), username: 'a'.repeat(31),
    });
    expect(res.status).toBe(400);
  });

  it('username with special chars (@, !, space) → 400', async () => {
    for (const bad of ['user@name', 'user name', 'user!bad']) {
      const res = await request().post('/api/auth/register').send({
        ...validPayload(), username: bad,
      });
      expect(res.status).toBe(400);
    }
  });

  it('password too short (< 6 chars) → 400', async () => {
    const res = await request().post('/api/auth/register').send({
      ...validPayload(), password: '123', confirmPassword: '123',
    });
    expect(res.status).toBe(400);
  });

  it('password too long (> 72 chars) → 400', async () => {
    const long = 'A'.repeat(73);
    const res = await request().post('/api/auth/register').send({
      ...validPayload(), password: long, confirmPassword: long,
    });
    expect(res.status).toBe(400);
  });

  it('confirmPassword mismatch → 400', async () => {
    const res = await request().post('/api/auth/register').send({
      ...validPayload(), confirmPassword: 'DifferentPass!',
    });
    expect(res.status).toBe(400);
  });

  it('missing confirmPassword → 400', async () => {
    const { confirmPassword, ...rest } = validPayload();
    const res = await request().post('/api/auth/register').send(rest);
    expect(res.status).toBe(400);
  });

  it('empty body → 400', async () => {
    const res = await request().post('/api/auth/register').send({});
    expect(res.status).toBe(400);
  });

  it('extra unknown fields are stripped (no error)', async () => {
    const res = await request().post('/api/auth/register').send({
      ...validPayload(),
      isAdmin: true,
      role: 'superuser',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.user.isAdmin).toBeUndefined();
    expect(res.body.data.user.role).toBeUndefined();
  });
});
