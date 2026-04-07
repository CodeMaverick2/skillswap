# SkillSwap

A skill-barter mobile app — teach what you know, learn what you don't. Users list skills they can teach and skills they want to learn, then get matched with people who complement them.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Mobile | React Native + Expo (SDK 52) |
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

---

## Running Tests

```bash
cd backend
npm test                 # run all 93 tests
npm run test:coverage    # with coverage report
```

Tests use an in-memory MongoDB — no Atlas connection needed.

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
- TypeScript check (`tsc --noEmit`)
- Full Metro bundle export (`expo export --platform web`)
- Metro dev server startup check
- Expo Doctor (SDK compatibility)

---

## Security

- Passwords hashed with bcrypt
- JWT access tokens (15 min) + refresh tokens (7 days)
- Refresh token rotation — each token is single-use
- Reuse detection — replaying a rotated token revokes all sessions
- Rate limiting on auth endpoints (20 req / 15 min)
- Helmet security headers
- Input validation with Joi on all endpoints
