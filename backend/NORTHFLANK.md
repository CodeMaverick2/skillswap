# SkillSwap backend — Northflank deploy

## What you need

1. Free account at https://app.northflank.com  
2. GitHub connected to Northflank (link `CodeMaverick2/skillswap`)  
3. MongoDB Atlas URI (same as local) with Network Access allowing `0.0.0.0/0` (or Northflank egress IPs)  
4. CLI (optional): `npm i -g @northflank/cli`

## Dashboard deploy (recommended)

1. **New project** → name it `skillswap`  
2. **Create combined service** (build + deploy from Git)  
   - Repository: `CodeMaverick2/skillswap`  
   - Branch: `main`  
   - **Build context / Dockerfile path:** `backend` / `backend/Dockerfile`  
   - Port: `8080` · Protocol: HTTP · **Public**  
   - Health check path: `/api/health`  
3. **Runtime environment variables** (Secrets → inject into service):

| Key | Value |
|-----|--------|
| `NODE_ENV` | `production` |
| `PORT` | `8080` |
| `MONGODB_URI` | your Atlas URI (include `/skillswap` DB name) |
| `JWT_SECRET` | long random secret (64+ chars) |
| `JWT_EXPIRES_IN` | `15m` |
| `REFRESH_TOKEN_EXPIRES_IN` | `7d` |
| `BCRYPT_ROUNDS` | `10` |
| `CORS_ORIGIN` | `*` |
| `CLIENT_URL` | your frontend URL if any |

4. Deploy → open the generated `*.code.run` URL  
5. Test: `https://YOUR-HOST/api/health` → `"status":"ok"`

## Point the app at Northflank

```bash
# frontend/.env
EXPO_PUBLIC_API_URL=https://YOUR-HOST/api
EXPO_PUBLIC_SOCKET_URL=https://YOUR-HOST
```

## Optional: seed demo users (one-shot)

From Northflank → service → **Shell / exec**, or locally with CLI:

```bash
northflank exec service --project skillswap --service skillswap-api -- npm run seed
```

(Demo password remains `Password@123` — see `DEMO_USERS.md`.)

## CLI login

```bash
northflank login --do-not-open-browser
# or create an API token in Northflank → Account → API → paste:
northflank login -t YOUR_API_TOKEN -n skillswap
```

## Notes

- Dockerfile sets `PORT=8080` and exposes that port  
- Server already listens on `0.0.0.0`  
- Socket.IO uses the same public host as the REST API  
