# SkillSwap API on Vercel

## Important limitation

Vercel runs **serverless functions**. This deploy covers the **REST API** (`/api/*`).

**Socket.IO realtime chat does not run on Vercel.**  
In-app chat still works through REST send/list endpoints; the messages tab already polls. Live “instant” delivery over websockets will not work until the API is on a long-running host (Render, Fly, Railway, etc.).

## Deploy

```bash
cd backend
npm i -g vercel
vercel login
vercel link          # create / link project, root = backend
vercel env add MONGODB_URI production
vercel env add JWT_SECRET production
vercel env add JWT_EXPIRES_IN production
vercel env add REFRESH_TOKEN_EXPIRES_IN production
vercel env add BCRYPT_ROUNDS production
vercel env add CORS_ORIGIN production
vercel env add NODE_ENV production
vercel --prod
```

Suggested values:

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | Atlas URI (with `/skillswap` DB name) |
| `JWT_SECRET` | long random secret |
| `JWT_EXPIRES_IN` | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` |
| `BCRYPT_ROUNDS` | `10` |
| `CORS_ORIGIN` | `*` |

Atlas Network Access: allow `0.0.0.0/0` (or Vercel IPs).

## Point the app

```bash
# frontend/.env
EXPO_PUBLIC_API_URL=https://YOUR-PROJECT.vercel.app/api
EXPO_PUBLIC_SOCKET_URL=https://YOUR-PROJECT.vercel.app
```

Health: `https://YOUR-PROJECT.vercel.app/api/health`

## Local serverless check

```bash
cd backend
vercel dev
```
