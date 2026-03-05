const { request, connectTestDB, clearDB, disconnectTestDB, registerUser } = require('./setup');

beforeAll(connectTestDB);
afterEach(clearDB);
afterAll(disconnectTestDB);

describe('POST /api/auth/login — success', () => {
  it('valid credentials return 200 with tokens', async () => {
    const { credentials } = await registerUser();
    const res = await request().post('/api/auth/login').send(credentials);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    expect(res.body.data.user).toBeDefined();
  });

  it('email is case-insensitive', async () => {
    const { credentials } = await registerUser();
    const res = await request().post('/api/auth/login').send({
      email: credentials.email.toUpperCase(),
      password: credentials.password,
    });
    expect(res.status).toBe(200);
  });

  it('passwordHash is NOT returned', async () => {
    const { credentials } = await registerUser();
    const res = await request().post('/api/auth/login').send(credentials);
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  it('each login issues a fresh refresh token', async () => {
    const { credentials } = await registerUser();
    const r1 = await request().post('/api/auth/login').send(credentials);
    const r2 = await request().post('/api/auth/login').send(credentials);
    expect(r1.body.data.refreshToken).not.toBe(r2.body.data.refreshToken);
  });
});

describe('POST /api/auth/login — failures', () => {
  it('wrong password → 401', async () => {
    const { credentials } = await registerUser();
    const res = await request().post('/api/auth/login').send({
      email: credentials.email,
      password: 'WrongPassword99!',
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('unknown email → 401 (same generic message, no enumeration)', async () => {
    const res = await request().post('/api/auth/login').send({
      email: 'nobody@nowhere.com',
      password: 'Password123!',
    });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid credentials');
  });

  it('missing password → 400', async () => {
    const { credentials } = await registerUser();
    const res = await request().post('/api/auth/login').send({ email: credentials.email });
    expect(res.status).toBe(400);
  });

  it('missing email → 400', async () => {
    const res = await request().post('/api/auth/login').send({ password: 'Password123!' });
    expect(res.status).toBe(400);
  });

  it('invalid email format → 400', async () => {
    const res = await request().post('/api/auth/login').send({
      email: 'not-valid', password: 'Password123!',
    });
    expect(res.status).toBe(400);
  });

  it('empty body → 400', async () => {
    const res = await request().post('/api/auth/login').send({});
    expect(res.status).toBe(400);
  });
});
