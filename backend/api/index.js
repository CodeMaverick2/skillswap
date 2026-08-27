/**
 * Vercel serverless entry — REST API only.
 * Socket.IO realtime chat is not supported on Vercel; the mobile/web clients
 * still work via HTTP message APIs + list polling.
 */
const app = require('../src/app');
const connectDB = require('../src/config/db');

let ready;
async function ensureDb() {
  if (!ready) ready = connectDB();
  await ready;
}

module.exports = async (req, res) => {
  try {
    await ensureDb();
  } catch (err) {
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, message: 'Database unavailable', error: err.message }));
    return;
  }
  return app(req, res);
};
