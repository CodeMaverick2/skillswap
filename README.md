# SkillSwap

**Teach what you know. Learn what you need.**  
Peer-to-peer skill exchange — no courses, no fees, no money in the middle.

<p align="center">
  <a href="docs/demo/skillswap-launch-demo.mp4">
    <img src="docs/demo/poster.png" alt="SkillSwap launch demo" width="720" />
  </a>
</p>

<p align="center">
  <b><a href="docs/demo/skillswap-launch-demo.mp4">▶ Watch the launch demo (MP4)</a></b>
  · ~40s · live app walkthrough
</p>

---

## The problem

Learning a new skill today usually means one of two dead ends:

1. **Pay for another course** you never finish.
2. **Ask a friend** who doesn’t have time — or doesn’t know what you need.

Meanwhile, thousands of people around you are *already good* at the thing you’re stuck on, and stuck on the thing you’re good at. There’s no simple way to trade that time.

## The solution

**SkillSwap** matches people with complementary skills, lets them chat and agree on a swap, then puts a real session on the calendar.

> Tejas knows Python, needs React.  
> Aisha knows React, needs Python APIs.  
> They match → chat → lock Thursday → show up.

**Match → Chat → Session → Grow**

---

## What’s in the product

| Area | What you get |
|------|----------------|
| **Discover** | Suggested people, pending / sent / matched requests, network snapshot |
| **Messages** | Realtime chat (Socket.IO) after a match |
| **Sessions** | Schedule, confirm, cancel, reschedule, calendar `.ics` export |
| **Profile** | Teach / learn skills, goals, streaks, reputation from real sessions |
| **Safety** | Block / report, session feedback |
| **Mobile** | Push notifications (native), Expo Go + EAS builds |

---

## Demo

### Video

Live walkthrough of two users (Tejas & Aisha) completing a React ↔ Python swap:

**[▶ skillswap-launch-demo.mp4](docs/demo/skillswap-launch-demo.mp4)**

If the inline player doesn’t show in your viewer, download the file from [`docs/demo/`](docs/demo/).

### Android APK (preview)

Installable preview build for evaluators:

- **[Download `skillswap-preview.apk`](docs/submission/skillswap-preview.apk)** (~81 MB)
- Or install from Expo: [EAS build page](https://expo.dev/accounts/tejas1114/projects/skillswap/builds/8d21a7d7-5675-406e-9abb-f60f870dabf8)

Point the app at a running backend via `EXPO_PUBLIC_API_URL` / `EXPO_PUBLIC_SOCKET_URL` (see [`frontend/.env.example`](frontend/.env.example)). For the seeded demo path, use the accounts in [`DEMO_USERS.md`](DEMO_USERS.md).

### Progress report

Course handoff write-up (features, week log, READY TO SUBMIT):

- [`docs/submission/PROJECT_PROGRESS_REPORT.pdf`](docs/submission/PROJECT_PROGRESS_REPORT.pdf)

### Seeded demo accounts

See [`DEMO_USERS.md`](DEMO_USERS.md) for personas and passwords.

Typical QA pair:

| User | Email | Password |
|------|-------|----------|
| Tejas QA | `qa_primary@skillswap.local` | `Password@123` |
| Aisha | `aisha_dev@skillswap.local` | `Password@123` |

```bash
cd backend && npm run seed && npm run smoke
```

---

## Tech stack

| Layer | Tech |
|-------|------|
| Mobile | React Native + Expo SDK 54, Expo Router |
| State | Zustand |
| Backend | Node.js + Express |
| Database | MongoDB (Mongoose) — Atlas in production/demo |
| Auth | JWT access + rotating refresh tokens |
| Realtime | Socket.IO |
| CI | GitHub Actions (Jest, lint, `tsc`, Expo export) |
| Build | EAS (preview / production APK) |

---

## Repo layout

```
skillswap/
├── backend/           # Express API + Jest (93+ tests)
├── frontend/          # Expo app (auth, tabs, chat, sessions)
├── docs/demo/         # Launch demo video + poster
├── docs/submission/   # Progress report PDF + handoff assets
└── scripts/           # Dev helpers (e.g. mobile tunnel)
```

---

## Quick start

### Prerequisites

- Node.js 20+
- MongoDB Atlas (free tier) or local Mongo
- Expo Go on a phone (optional)

### Backend

```bash
cd backend
npm install
cp .env.example .env   # if present — otherwise create .env (see below)
npm run dev
curl http://localhost:5000/api/health
```

`backend/.env` essentials:

```env
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/skillswap
JWT_SECRET=<long-random-secret>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
CLIENT_URL=http://localhost:8081
CORS_ORIGIN=*
```

### Frontend

```bash
cd frontend
npm install
```

`frontend/.env`:

```env
EXPO_PUBLIC_API_URL=http://<your-lan-ip>:5000/api
EXPO_PUBLIC_SOCKET_URL=http://<your-lan-ip>:5000
```

```bash
npx expo start
# or from repo root: node scripts/dev-mobile.js
```

---

## Tests & CI

```bash
cd backend
npm test
npm run test:coverage
npm run smoke
```

GitHub Actions on `main` / `develop`:

- Backend: Jest on Node 20 + 22, smoke against Mongo
- Frontend: ESLint, TypeScript, Metro web export, Expo Doctor

---

## Security (highlights)

- bcrypt password hashing  
- Short-lived JWT + refresh rotation / reuse detection  
- Rate limits on auth  
- Helmet + Joi validation on inputs  

---

## License / status

Course / portfolio project — SkillSwap is under active development.  
Demo video and seeded users are for evaluation only.

---

<p align="center"><b>SkillSwap</b> — teach what you know · learn what you need</p>
