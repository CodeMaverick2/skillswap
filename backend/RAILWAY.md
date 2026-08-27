# SkillSwap backend — Railway deploy

## One-time setup

1. Create a Railway account at https://railway.app and install the CLI:
   ```bash
   npm i -g @railway/cli
   railway login
   ```

2. From the repo:
   ```bash
   cd backend
   railway init          # create / link a project
   railway up            # first deploy
   ```

   Or in the Railway dashboard: **New Project → Deploy from GitHub** → select this repo → set **Root Directory** to `backend`.

3. Add variables (Railway → Service → Variables). Use your existing Atlas URI (do not commit secrets):

| Variable | Example |
|----------|---------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas connection string |
| `JWT_SECRET` | long random hex (64+ chars) |
| `JWT_EXPIRES_IN` | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` |
| `BCRYPT_ROUNDS` | `10` |
| `CORS_ORIGIN` | `*` (or your Expo web / app origins, comma-separated) |
| `CLIENT_URL` | your frontend URL if any |

Railway injects `PORT` automatically — do not override it unless you know you need to.

4. **MongoDB Atlas Network Access**: allow Railway to connect. Easiest for student demos: add IP `0.0.0.0/0` (allow from anywhere). Narrow later if required.

5. Generate a public URL: Railway → Service → Settings → Networking → **Generate Domain**.

6. Health check: open `https://YOUR-DOMAIN/api/health` — should return `"status":"ok"`.

7. Point the app at it:
   ```bash
   # frontend/.env
   EXPO_PUBLIC_API_URL=https://YOUR-DOMAIN/api
   EXPO_PUBLIC_SOCKET_URL=https://YOUR-DOMAIN
   ```

8. Optional seed (one-shot):
   ```bash
   cd backend
   railway run npm run seed
   ```

## Notes

- Start command: `npm start` → `node server.js`
- Health path: `/api/health` (configured in `railway.toml`)
- Socket.IO uses the same host as the API
