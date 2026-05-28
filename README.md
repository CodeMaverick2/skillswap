# SkillSwap

A skill-barter mobile app — teach what you know, learn what you don't. Users list skills they can teach and skills they want to learn, then get matched with people who complement them.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Mobile | React Native + Expo (SDK 54) |
| Navigation | Expo Router (file-based) |
| State | Zustand |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) |
| Auth | JWT (access + refresh tokens with rotation) |
| CI/CD | GitHub Actions |
| Build | EAS (Expo Application Services) |

---

## Project Structure

```
skillswap/
├── backend/          # Express API
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── tests/        # Jest + Supertest (93 tests)
└── frontend/         # React Native / Expo
    ├── app/          # Expo Router screens
    │   ├── (auth)/   # Login, Register, Onboarding
    │   └── (tabs)/   # Discover, Sessions, Messages, Profile
    ├── components/
    ├── services/
    ├── store/
    └── theme/
```

---

## Local Setup

### Prerequisites

- Node.js 20+
- MongoDB Atlas account (free tier works)
- Expo Go app on your phone (for mobile preview)

---

### 1. Clone the repo

```bash
git clone https://github.com/CodeMaverick2/skillswap.git
cd skillswap
```

---

### 2. Backend

```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:

```env
NODE_ENV=development
PORT=5000

# MongoDB Atlas connection string
# Get this from: Atlas dashboard → your cluster → Connect → Drivers
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/skillswap

# JWT secret — any long random string (min 64 chars recommended)
# Generate one with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=your-secret-here

JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
BCRYPT_ROUNDS=10
CLIENT_URL=http://localhost:8081
CORS_ORIGIN=*
```

> **MongoDB Atlas setup:**
> 1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
> 2. Create a database user with readWrite access
> 3. Whitelist your IP under Network Access (or use `0.0.0.0/0` for dev)
> 4. Copy the connection string from Connect → Drivers

Start the server:

```bash
npm run dev
```

Server runs on `http://localhost:5000`. Confirm with:

```bash
curl http://localhost:5000/api/health
```

---

### 3. Frontend

```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:

```env
EXPO_PUBLIC_API_URL=http://<your-local-ip>:5000/api
EXPO_PUBLIC_SOCKET_URL=http://<your-local-ip>:5000
```

> Use your machine's local IP (not `localhost`) so your phone can reach the backend.
> Find it with: `ipconfig getifaddr en0` (Mac) or `hostname -I` (Linux)

Start the app:

```bash
npx expo start          # LAN (phone + Mac on same WiFi)
npx expo start --tunnel # Tunnel via ngrok (works across networks)
```

Scan the QR code with **Expo Go** on your phone.

For a no-manual-networking setup (auto backend URL + Expo tunnel), run from repo root:

```bash
node scripts/dev-mobile.js
```

This command:
- starts backend (`npm run dev`)
- opens a public backend tunnel
- writes `frontend/.env` automatically with tunnel URLs
- starts Expo (tries tunnel first, falls back to LAN if tunnel is unavailable)

---

## Running Tests

```bash
cd backend
npm test                 # run all 93 tests
npm run test:coverage    # with coverage report
npm run seed             # reset demo graph and seeded personas
npm run smoke            # API smoke flow with seeded QA account
```

Tests use an in-memory MongoDB — no Atlas connection needed.

---

## V2 QA Checklist

- Auth: register, login, refresh, logout, relaunch restore session.
- Discover: suggested/sent/incoming/matched states are all visible and understandable.
- Messaging: conversation list and thread open quickly; realtime reconnect state shown.
- Sessions: upcoming and past split is correct; confirm/cancel flow works from both participants.
- Profile: update profile + update skills path works and returns to expected screen.
- Network: test poor connectivity and confirm banner + retries on read endpoints.
- Update-skills edit flow: from Profile -> Update Skills should remain in onboarding edit route and return to Profile after save.
- Login UX: tapping email/password fields in Expo Go consistently opens keyboard.

---

## API Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/health` | — | Server + DB status |
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Login |
| POST | `/api/auth/refresh` | — | Rotate refresh token |
| POST | `/api/auth/logout` | — | Invalidate refresh token |
| POST | `/api/auth/logout-all` | ✓ | Revoke all sessions |
| GET | `/api/users/me` | ✓ | Get own profile |
| PUT | `/api/users/me` | ✓ | Update profile |
| PUT | `/api/users/me/skills` | ✓ | Update teach/learn skills |
| GET | `/api/users/:id` | ✓ | Public profile |
| GET | `/api/users/check-username/:u` | ✓ | Username availability |
| DELETE | `/api/users/me` | ✓ | Deactivate account |
| GET | `/api/activity/feed` | ✓ | Activity feed (social layer) |
| GET | `/api/goals` | ✓ | List learning goals |
| POST | `/api/goals` | ✓ | Create learning goal |
| PUT | `/api/goals/:id` | ✓ | Update learning goal |
| DELETE | `/api/goals/:id` | ✓ | Delete learning goal |
| GET | `/api/referrals/me` | ✓ | Referral code + referred users |
| GET | `/api/sessions/slots?matchId=&from=&to=` | ✓ | Availability-aware slot suggestions |
| PUT | `/api/sessions/:id/notes` | ✓ | Save participant private notes |
| PUT | `/api/sessions/:id/feedback` | ✓ | Submit post-session feedback |

---

## Building an APK

Requires [EAS CLI](https://docs.expo.dev/eas/):

```bash
npm install -g eas-cli
eas login

cd frontend

# Preview APK (install directly on Android)
eas build --profile preview --platform android

# Development build (with dev menu)
eas build --profile development --platform android
```

The build runs on Expo's cloud servers — no Android Studio needed. You get a download link when it's done.

---

## CI/CD

GitHub Actions runs on every push to `main` or `develop`:

**Backend** (`.github/workflows/backend.yml`)
- Runs 93 Jest tests on Node 20 + 22
- Coverage report uploaded as artifact
- Smoke tests against a real MongoDB service container (health, register, login, auth)

**Frontend** (`.github/workflows/frontend.yml`)
- ESLint (`expo lint`)
- TypeScript check (`tsc --noEmit`)
- Full Metro bundle export (`expo export --platform web`)
- Metro dev server startup check
- Expo Doctor (SDK compatibility)

Both backend and frontend workflows include manual `workflow_dispatch`, concurrency guards, and timeouts.

> Note: GitHub Actions currently shows a Node 20 deprecation warning for some upstream actions. CI is passing, but workflow action/runtime versions should be bumped in a follow-up maintenance PR.

---

## Latest Fixes (May 2026)

- CI stabilization:
  - Fixed strict TypeScript route-segment typing in root auth gate.
  - Aligned Expo SDK-compatible dependency versions (`expo-network`, `eslint-config-expo`, Expo patch packages).
  - Added standard `frontend/metro.config.js` extending `expo/metro-config`.
- Auth/navigation flow:
  - Fixed authenticated `Profile -> Update Skills` edit-mode redirect (no longer jumps to Discover/home).
- Expo Go input reliability:
  - Improved login input focus behavior so tap reliably opens keyboard.
- Git hygiene:
  - Added ignore rules for local progress-report artifacts and local PDF generation helper script.

---

## Demo Users

For client/investor demos with India-focused personas and a single all-in-one walkthrough account, see:

- `DEMO_USERS.md`

---

## Security

- Passwords hashed with bcrypt
- JWT access tokens (15 min) + refresh tokens (7 days)
- Refresh token rotation — each token is single-use
- Reuse detection — replaying a rotated token revokes all sessions
- Rate limiting on auth endpoints (20 req / 15 min)
- Helmet security headers
- Input validation with Joi on all endpoints
