/**
 * Shared test setup — in-memory MongoDB, Express app, supertest agent.
 * Import helpers from here in every test file.
 */

process.env.NODE_ENV       = 'test';
process.env.JWT_SECRET     = 'test-jwt-secret-that-is-long-enough-for-testing-purposes-ok';
process.env.JWT_EXPIRES_IN = '15m';
process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
process.env.BCRYPT_ROUNDS  = '4';   // low rounds = faster tests
process.env.CORS_ORIGIN    = '*';

require('express-async-errors');

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose              = require('mongoose');
const request               = require('supertest');
const app                   = require('../src/app');

let mongod;

/** Start in-memory MongoDB and connect Mongoose before all tests */
async function connectTestDB() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  await mongoose.connect(uri);
}

/** Drop all collections between tests for isolation */
async function clearDB() {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
}

/** Disconnect and stop the in-memory server after all tests */
async function disconnectTestDB() {
  await mongoose.disconnect();
  await mongod.stop();
}

/** Convenience: register + return { token, refreshToken, user } */
async function registerUser(overrides = {}) {
  const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const data = {
    email:           `test_${uid}@example.com`,
    username:        `user_${uid}`.slice(0, 30),
    password:        'Password123!',
    confirmPassword: 'Password123!',
    ...overrides,
  };
  const res = await request(app).post('/api/auth/register').send(data);
  if (res.status !== 201) throw new Error(`registerUser failed: ${JSON.stringify(res.body)}`);
  return {
    user:         res.body.data.user,
    token:        res.body.data.accessToken,
    refreshToken: res.body.data.refreshToken,
    credentials:  { email: data.email, password: data.password },
  };
}

/** Authenticated supertest agent helper */
function authed(token) {
  return {
    get:    (path)       => request(app).get(path).set('Authorization', `Bearer ${token}`),
    post:   (path, body) => request(app).post(path).set('Authorization', `Bearer ${token}`).send(body),
    put:    (path, body) => request(app).put(path).set('Authorization', `Bearer ${token}`).send(body),
    delete: (path)       => request(app).delete(path).set('Authorization', `Bearer ${token}`),
  };
}

module.exports = {
  app,
  request: () => request(app),
  connectTestDB,
  clearDB,
  disconnectTestDB,
  registerUser,
  authed,
};
