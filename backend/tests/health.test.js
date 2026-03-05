const { request, connectTestDB, disconnectTestDB } = require('./setup');

beforeAll(connectTestDB);
afterAll(disconnectTestDB);

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('includes db, uptime, timestamp fields', async () => {
    const res = await request().get('/api/health');
    expect(res.body).toHaveProperty('db');
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('timestamp');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('db field reflects connected state', async () => {
    const res = await request().get('/api/health');
    expect(res.body.db).toBe('connected');
  });
});

describe('Unknown routes', () => {
  it('GET unknown route → 404', async () => {
    const res = await request().get('/api/this-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('POST to GET-only health → 404', async () => {
    const res = await request().post('/api/health').send({});
    expect(res.status).toBe(404);
  });
});
