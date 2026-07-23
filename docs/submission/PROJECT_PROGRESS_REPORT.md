# SkillSwap -> Progress Update

**Team:** Tejas · Rushil · Aayush · Harsh  
**Meeting:** Project review · July 2026  
**Repository:** github.com/CodeMaverick2/skillswap

---

## What we are building

SkillSwap is a mobile app for **skill barter**: you list what you can teach and what you want to learn, and the app finds people where both sides benefit -> for example, you help someone with React while they help you with guitar or public speaking. No money in the middle; the exchange is time and teaching.

The app covers the full loop: sign up -> set skills -> discover matches -> send or accept requests -> chat -> book a session (with a video link) -> leave feedback and track goals over time.

**Stack we settled on:** React Native (Expo) for the app, Node/Express + MongoDB for the API, JWT login, Socket.IO for live chat, GitHub Actions for automated checks before merge.

---

## Features built (current product)

### Accounts and onboarding
- Email/password register and login with secure session handling (short-lived access token + rotating refresh token).
- Three-step onboarding: basic profile (name, bio, timezone), pick skills you can teach with level, pick skills you want to learn with target level.
- Edit profile anytime (name, bio, timezone).
- **Update skills** from profile without repeating full onboarding -> opens teach/learn steps in edit mode with your current skills pre-selected.
- Username display, avatar colour per user, optional timezone on profile.

### Discover and matching
- **Suggested matches** ranked by a custom scoring system (not just shared tags):
  - How well they can teach what you want to learn.
  - How well you can teach what they want to learn.
  - Extra weight when both directions match (mutual exchange).
  - Small boosts for account reliability (sessions done, ratings) and recent activity.
- Each card shows **why this match** (score breakdown in plain language) and a recommended format (e.g. quick lesson vs long-term practice).
- **Connect** sends a request; **Skip** hides that user from your feed for now.
- Separate lists so nothing gets lost:
  - **Incoming** pending requests (accept / reject).
  - **Sent** requests waiting for the other person.
  - **Matched** people you can already message.
- **Network snapshot** bar with counts for pending, sent, and matched.
- Loading skeletons and pull-to-refresh on the discover feed.

### Messaging
- Real-time chat over Socket.IO when both users are matched.
- Conversation list with last message preview and unread handling.
- Chat thread with **load older messages** (pagination).
- **Sent / Read** indicators on messages.
- **Smart intro** suggestion chips for the first message.
- In-chat **schedule session** flow: pick skill, time, duration, optional meeting link (defaults to a Meet-style URL), plus **suggested time slots** based on both users' existing sessions.
- Faster list load -> read/unread updates handled in the background so the thread opens quickly.

### Sessions
- Create, confirm, and cancel sessions between matched users.
- **Upcoming** vs **past** sessions on the sessions tab, with clearer empty states.
- Session detail screen: see time, skill, participants, meeting link, add **private notes**, submit **structured feedback** after the session.
- Backend checks for **scheduling conflicts** and offers alternative slots.

### Profile, learning, and growth
- **Reputation** on profile: session count, average rating, completion rate.
- **Activity feed** -> recent events (matches, messages, sessions, goals).
- **Learning goals** -> create from profile, milestones, progress percentage.
- **Referral code** and count of people who joined through you.
- **Streaks**, best streak, and **badges** for consistent use.
- Dark mode toggle on profile.

### App quality and developer setup
- New **visual theme** (brighter palette, hero headers on main tabs, polished buttons and inputs, tab bar feedback).
- **Safe back** behaviour on login, register, chat, session detail, edit profile, and skill edit flows.
- **Offline banner** when the device loses network; automatic **retries** on read-only API calls when the connection is flaky.
- **`dev-mobile.js`** -> one command starts backend, opens a public tunnel for the phone, writes frontend env URLs, starts Expo (no manual IP hunting).
- **Demo database seed** with Indian names and mixed states; **`DEMO_USERS.md`** with one account that can demo the entire app in a single login.

### June–July additions
- **Push notifications** (Expo) for match requests, accepts, messages, and session status changes; deep links into chat/session.
- **Analytics funnel** events + conversion report endpoint for pilot drop-off review.
- **Match quality feedback** feeds back into discover ranking (outcome boost).
- **Block / report** on profiles; blocked users hidden from discover and messaging.
- **Session reschedule**, **.ics calendar export**, **templates**, and **guided checklists**.
- **Learning paths** with weekly session targets and multi-week path steps.

---

## How we split the work

| Person | Main areas |
|--------|------------|
| **Tejas** | Project coordination, backend architecture, V2 APIs (activity, goals, referrals), dev environment / tunnel workflow, integration between frontend and API, demo seed data |
| **Rushil** | Matching logic -> scoring teach/learn overlap, mutual bonus, reliability and recency; discover screen behaviour; researching how other peer-learning apps rank users; skip/connect flow |
| **Aayush** | UI/UX -> screens, onboarding flow, tab layout, animations, colour system and headers, profile and edit-profile, first-time user clarity |
| **Harsh** | Auth and tokens, security fixes (validation, socket auth), message loading performance, CI workflows, test suite maintenance, smoke checks before releases |

---

## Week-by-week log

*First code commit: 7 February 2026. Below is what the team was doing each week -> implementation, design, research, testing, and fixes.*

### Week of 3 Feb
- **Tejas** -> Initialized Express project structure (routes, controllers, middleware folders). Connected MongoDB Atlas dev cluster. Added Helmet, CORS, Morgan logging, and `/api/health` endpoint. Wrote `.env.example` for the team.
- **Harsh** -> Researched bcrypt cost factor and JWT expiry values the team should standardize on. Set up local MongoDB connection error handling and graceful shutdown.
- **Rushil** -> Wrote a one-page doc on match types: one-way (they teach you only) vs mutual (both teach each other). Listed 15+ skill categories we wanted in v1. Compared Tandem, Skillshare community features, and university barter groups for inspiration.
- **Aayush** -> Collected screenshots of login/onboarding flows from 4 reference apps. Sketched low-fidelity wireframes for welcome, login, and register on paper -> digitized layout notes for the team.

### Week of 10 Feb
- **Harsh** -> Built User schema (profile, teachSkills, learnSkills, reputation stub). Register and login routes with Joi validation. Standardized API error JSON shape across auth.
- **Tejas** -> RefreshToken model and rotation logic -> old refresh invalidated on use, reuse detection stubbed for later. Login returns access + refresh; refresh endpoint issues new pair.
- **Rushil** -> Defined skill level scale (beginner -> advanced) and how it should affect match confidence later. Synced with Aayush on chip colours per level.
- **Aayush** -> Created Expo app with Expo Router. Set up light/dark colour tokens and spacing scale in theme files. Empty tab navigator with placeholder labels.

### Week of 17 Feb
- **Tejas** -> `GET/PUT /users/me`, public `GET /users/:id`, username availability check. Skills update endpoint with validation on skill IDs and levels.
- **Aayush** -> Built Button, Input, Avatar, Skeleton, Toast components used everywhere later. Focus states and error text styling on inputs.
- **Harsh** -> First Jest tests for register/login/refresh -> duplicate email, wrong password, missing fields. Fixed bug where empty refresh body returned 500 instead of 401.
- **Rushil** -> Spreadsheet with 10 fake user pairs and manual scores to compare "count shared skills" vs "directional teach/learn score". Team agreed directional model for discover.

### Week of 24 Feb
- **Aayush** -> Welcome screen with app tagline and CTA. Login and register forms wired to API with inline validation messages. Loading state on submit buttons.
- **Tejas** -> Axios client with interceptors: attach bearer token, queue refresh on 401, retry original request. Secure storage for tokens on device.
- **Harsh** -> Added `pushToken` field on user for future notifications. Documented auth flow diagram for the team wiki.
- **Rushil** -> User story map for discover: "As a user I want to see sent requests so I know I'm waiting on someone." Wrote acceptance criteria for pending/sent/matched states.

### Week of 3 Mar
- **Aayush** -> Discover, Sessions, Messages, Profile tab screens with placeholder content and consistent headers. Empty state illustrations (emoji + short copy).
- **Harsh** -> Tests for profile update and skills update. Fixed race where two simultaneous refresh calls could invalidate a valid session.
- **Tejas** -> GitHub Actions workflow: Node 20, `npm test`, upload test log on failure. Branch protection discussion with team.
- **Rushil** -> Read articles and GitHub repos on bipartite matching and reciprocity in peer networks. Summarized 3 approaches we could borrow for SkillSwap scoring.

### Week of 10 Mar
- **Harsh** -> Frontend CI job: `tsc --noEmit`, `expo export` web bundle to catch broken imports. Fixed `@types` conflicts from SDK 52 template.
- **Tejas** -> README: clone, backend env, frontend env, how to find LAN IP, run tests. Added MongoDB Atlas whitelist instructions for India IPs.
- **Aayush** -> App icon and adaptive icon assets. Splash screen. Ran EAS preview build once to confirm Android APK path works.
- **Rushil** -> Built scoring prototype in Google Sheets with weights for teach-fit, learn-fit, mutual bonus. Tested with team members' real skill lists.

### Week of 17 Mar
- **Aayush** -> Onboarding step order finalized (profile before skills). Fixed keyboard covering bio field on small Android screens. Improved step indicator UI.
- **Rushil** -> Defined mutual match bonus rules and cap so one power user does not dominate the feed. Wrote examples for "why this match" copy the UI should show.
- **Harsh** -> Pinned exact Expo and React Native versions in frontend `package.json`. Documented `npx expo doctor` fixes the team applied.
- **Tejas** -> Shared Atlas cluster credentials via secure channel. Created two test users manually for Rushil to test scoring before seed script existed.

### Week of 24 Mar
- **Tejas** -> Drafted discover API response shape: `matchScore`, `sharedSkills[]` with direction `they_teach` / `i_teach`, `scoreBreakdown` object for UI.
- **Rushil** -> Reviewed draft API with Tejas; added `intent` field (quick lesson / practice buddy / mentorship) derived from skill depth.
- **Aayush** -> Dark mode on auth screens. Loaded Inter font family across app. Tab bar icon set finalized.
- **Harsh** -> Wrote doc: testing Expo Go on phone vs emulator, when to use `--tunnel`, common "network request failed" causes on college WiFi.
- **Tejas** -> Team call: agreed April 7 target for demo path register -> match -> chat -> schedule.

### Week of 31 Mar
- **Rushil** -> First backend implementation of `scoreUserForDiscover()` with teach/learn loops over skill arrays. Unit-tested edge cases: no learn skills, no teach skills, perfect mutual.
- **Aayush** -> Discover match card layout: avatar, name, bio snippet, skill chips colour-coded by direction. Connect and Skip buttons with loading spinner on connect.
- **Tejas** -> Message and Conversation models. REST endpoints for conversation list and message history. Socket.IO namespace setup on same server as Express.
- **Harsh** -> Rate limiter on `/api/auth/*`. ObjectId validation middleware on all `:id` params. Started socket handshake auth (JWT in connection query).

### Week of 7 Apr
- **Tejas** -> Expo SDK 52 -> 54 upgrade across dependencies. Fixed Reanimated `SharedValue` import paths. Updated `app.json` SDK version.
- **Aayush** -> Fixed iOS yellow autofill background on password fields. Fixed onboarding step 1 -> step 2 redirect when token exists but onboarding incomplete.
- **Rushil** -> `POST /matches/connect/:userId`, accept/reject endpoints. Discover filters out users already matched or pending. Tested with 4 seeded accounts.
- **Harsh** -> Session CRUD routes, status transitions (scheduled / confirmed / cancelled / completed). Socket events for new message and typing stub.
- **Tejas** -> End-to-end test day with team: registered two accounts, matched, sent messages, created session -> filed 8 bugs in shared list.
- **Aayush** -> Toasts for success/error globally. Profile edit screen v1. Session list and session detail screens hooked to API.
- **Harsh** -> Unread badge on messages tab via notification store. Regex injection fix on search fields. Socket auth reject when token expired.

### Week of 14 Apr
- **Tejas** -> Activity model + feed endpoint. LearningGoal model + CRUD. Referral model + register with code. Pulled discover scoring into `recommendation.service.js`.
- **Rushil** -> Exposed `scoreBreakdown` and `intent` on discover API. Tuned weights after Harsh reported "wrong people on top" with seed data.
- **Harsh** -> Session: `meetingLink`, participant notes, feedback subdocuments. Slot suggestion endpoint using availability service. Message route returns payload first, marks read async.
- **Aayush** -> Discover UI: pending request cards with accept/reject, sent list with waiting label, matched list with green styling. "Why this match" text block on cards.
- **Tejas** -> Seed script: 15+ Indian personas, varied match states, messages, sessions, activities, goals. `DEMO_USERS.md` with `qa_primary` walkthrough script.
- **Rushil** -> Skip user endpoint and excluded-skips list in discover query. Documented scoring weights in comment block for future tuning.

### Week of 21 Apr
- **Harsh** -> Message pagination (`before` cursor). Fixed axios interceptor attempting refresh on login 401 (caused "no refresh token" after failed login). Conversation list polling fallback.
- **Aayush** -> Chat: schedule panel expand/collapse, date/time inputs, meeting link field, slot chips from API. Sessions tab split upcoming/past with skeleton loaders.
- **Rushil** -> Reliability score from `avgRating`, `totalSessions`, `completionRate`. Recency boost from `lastActiveAt`. Tested ranking stability when two users tie.
- **Tejas** -> GET retry with backoff on network errors. `useNetworkStatus` hook + red offline banner in root layout. Dev-only slow request logging.

### Week of 28 Apr
- **Aayush** -> Profile: activity feed rows with icons, goals section, referral code, streak/badges, prominent Update Skills button. Edit profile header restyle.
- **Tejas** -> `scripts/dev-mobile.js`: detect backend on 5000, SSH tunnel via localhost.run, rewrite `frontend/.env`, spawn Expo with tunnel and cache clear.
- **Harsh** -> Onboarding `?mode=edit` pre-fills teach/learn skills; returns to profile on save. Toast when skills API fails (was failing silently before).
- **Rushil** -> Discover refresh loads pending, sent, accepted matches in parallel. Empty state copy when no suggestions but sent requests exist.

### Week of 5 May
- **Aayush** -> Full theme revamp in `colors.ts`. Hero cards on Discover, Messages, Sessions, Profile. Button shadows, Input focus glow, tab bar pill animation and haptics.
- **Tejas** -> User public profile screen header match new theme. 404 page restyle. Login/register safe back to welcome.
- **Rushil** -> Renamed confusing "Match Pulse" to "Network Snapshot". Intent label formatting on cards (underscores to readable text).
- **Harsh** -> `goBackSafe()` on conversation, session detail, edit profile, onboarding teach/learn steps. Fixed stack reset after logout.

### Week of 12 May
- **Harsh** -> `eslint-config-expo` + `npm run lint` in CI. Workflow `concurrency` and `timeout-minutes` on backend and frontend jobs. `workflow_dispatch` for manual runs.
- **Aayush** -> Onboarding step 1 premium hero block. Discover loading animation text ("Looking for matches..."). Messages tab header card treatment.
- **Tejas** -> README V2: activity/goals/referrals routes, dev-mobile section, QA checklist, link to DEMO_USERS. Ran full manual QA checklist and ticked items.
- **Rushil** -> Rewrote discover section titles and helper text for overseer demo. Tested skip -> user does not reappear; connect -> moves to sent list.
- **Tejas, Aayush, Rushil, Harsh** -> Demo dry run together on one phone: found wrong tab for past sessions, fixed copy, fixed back from edit profile.

### Week of 19 May
- **Tejas** -> Merged remaining V2 work to main in logical chunks. Verified GitHub commit dates show correctly on repo history. Regenerated progress report for overseer meeting.
- **Aayush** -> Final pass on message and session header alignment, spacing on profile stats row, not-found page copy.
- **Harsh** -> `backend/scripts/smoke.js` for goals, referrals, activity, slots. Ran seed + smoke on clean DB before signing off V2.
- **Rushil** -> One-page demo script: which account, which screens in order, what to say about matching algo if asked.
- **All** -> Prepared this document and agreed June plan below.

### Week of 26 May
- **Harsh** -> Fixed frontend CI: TypeScript segments cast in AuthGate, Expo Doctor package versions for SDK 54, added `metro.config.js`.
- **Tejas** -> Auth-flow fix so **Update Skills** stays in profile (onboarding edit mode no longer kicked to Discover).
- **Aayush** -> Login keyboard focus fix on Expo Go (Input container press focuses TextInput).
- **Rushil** -> Re-tested discover after CI/auth fixes with seed accounts before June pilot kickoff.

### Week of 2 Jun
- **Tejas, Rushil** -> Recruited pilot cohort (~18 college + friends). Shared Expo Go + `dev-mobile` tunnel install steps and Google Form feedback.
- **Rushil** -> Matching quality pass: deprioritize profiles with no teach skills / sparse skill lists; documented weight changelog.
- **Harsh** -> Started push notification service (`notification.service.js`) and wired match-request / match-accepted hooks. Closes path for [#30](https://github.com/CodeMaverick2/skillswap/issues/30).
- **Aayush** -> Triaged pilot UI feedback into shared bug list (top items: session empty state, chat schedule clarity).

### Week of 9 Jun
- **Harsh** -> Expo push for messages (socket + REST) with short dedupe window; session created/confirmed/cancelled/completed push events. Frontend `expo-notifications` + token register on login + deep-link routing.
- **Tejas** -> Production-ready hardening notes for Atlas + CORS; analytics event model + `/api/analytics/track` and `/funnel` report ([#31](https://github.com/CodeMaverick2/skillswap/issues/31)). Track register, onboarding, match, first message, session events.
- **Rushil** -> Match outcome model + quality score feedback; discover uses outcome boost from peer history ([#32](https://github.com/CodeMaverick2/skillswap/issues/32)).
- **Aayush** -> Profile shows weekly goal progress; session detail match-quality input after completion.

### Week of 16 Jun
- **Tejas, Harsh** -> Trust/safety: Block + Report models, `/api/moderation` routes; discover/match/message respect blocks ([#33](https://github.com/CodeMaverick2/skillswap/issues/33)).
- **Aayush** -> Block/report actions on public user profile; session reschedule UI + calendar export button ([#34](https://github.com/CodeMaverick2/skillswap/issues/34)).
- **Rushil** -> Session templates + guided checklist on create/detail ([#36](https://github.com/CodeMaverick2/skillswap/issues/36)); `.ics` calendar endpoint.
- **Tejas** -> Learning paths: weekly targets + path steps on goals ([#35](https://github.com/CodeMaverick2/skillswap/issues/35)); weekly counter bumps on session complete.

### Week of 23 Jun
- **All** -> Pilot mid-point sync: notifications and trust features demoed on phone; collected drop-off notes (onboarding -> first match still the biggest leak).
- **Harsh** -> Extended smoke script for templates, analytics funnel, moderation blocks.
- **Aayush** -> Chat schedule panel: load session templates and prefill topic/duration.
- **Rushil** -> Matching changelog updated for outcome boost + low-effort penalties.
- **Tejas** -> Draft pilot report outline for overseer (funnel numbers from analytics endpoint).

### Week of 30 Jun
- **Tejas** -> Stabilized June backlog merges; verified issue-linked commits for #30–#36.
- **Harsh** -> Regression pass on session status transitions with reschedule resetting confirm when needed.
- **Aayush** -> Polish checklist + export affordances on session detail.
- **Rushil** -> Spot-checked discover ranking with blocked users excluded.

### Week of 7 Jul
- **Tejas** -> Funnel review with team using `/api/analytics/funnel`; confirmed register -> onboarding -> match_request conversions from pilot week.
- **Aayush** -> Fixed remaining pilot UI nits on profile goals (weekly X/Y display).
- **Harsh** -> Smoke + lint sanity before July demo.
- **Rushil** -> Wrote short "how matching improved in June" note for overseer Q&A.

### Week of 21 Jul
- **Tejas** -> Submission pack: launch demo video (live two-user walkthrough), submission-ready README (problem / solution / demo / setup), web chat + SecureStore fixes for demos, progress report marked complete for course handoff.
- **Harsh** -> Local CI regression: backend Jest 93/93; frontend lint clean of errors; TypeScript + Expo export verified before handoff.
- **Aayush / Rushil** -> Final product walkthrough against seeded demo accounts; confirmed Match → Chat → Session loop for overseer demo.

---

## Submission status (July 2026) -> **READY TO SUBMIT**

| Deliverable | Status |
|-------------|--------|
| Working mobile app (Expo) + Express/Mongo API | Done |
| Full skill-swap loop (discover → match → chat → session) | Done |
| June backlog issues #30–#36 | Done / closed |
| Automated tests (93 Jest) + GitHub Actions CI | Done |
| Launch demo video | Done -> [`docs/demo/skillswap-launch-demo.mp4`](docs/demo/skillswap-launch-demo.mp4) |
| Submission README | Done |
| Seeded demo users (`DEMO_USERS.md`) | Done |
| Progress report (this PDF) | Done |
| EAS preview APK | Done -> [`docs/submission/`](docs/submission/) (or linked release asset) |

**What “finished” means for this course:** the product loop is complete, June commitments are delivered, CI is green, and a recorded demo + README are in the repo for evaluation. Optional next-term items (Play Store, reminder cron, moderation queue UI) are explicitly out of scope for this submission.

## June 2026 plan -> status (as of submission)

| Week | Focus | Owner(s) | Status |
|------|--------|----------|--------|
| **Jun 2-8** | Pilot users | Tejas, Rushil | Done -> ~18 pilot users + feedback form |
| **Jun 2-8** | Matching quality | Rushil | Done -> low-effort penalties + outcome boost |
| **Jun 9-15** | Production API | Tejas, Harsh | Partial -> hardening + deploy notes; still using shared Atlas for pilot |
| **Jun 9-15** | Notifications | Harsh | Done -> Expo push for matches, messages, sessions |
| **Jun 16-22** | Android test build | Aayush, Tejas | Done for handoff path -> Expo Go + EAS preview APK in submission pack |
| **Jun 16-22** | Session reminders / calendar | Aayush | Done -> push on session events + `.ics` export; dedicated 1h cron still open |
| **Jun 23-30** | Report + handoff | All | Done -> pilot notes + this report update |

**Standing tasks**
- **Aayush** -> UI bug list kept current through July; demo blockers fixed same day.
- **Harsh** -> Smoke extended for analytics/moderation/templates; run before demos.
- **Rushil** -> Matching changelog maintained (June outcome loop + sparse-profile rules).
- **Tejas** -> Weekly syncs continued; June issues #30–#36 closed out in product.

## June backlog (GitHub issues) -> delivered

- [#30](https://github.com/CodeMaverick2/skillswap/issues/30) -> **Done** Push notifications for requests, messages, and session events.
- [#31](https://github.com/CodeMaverick2/skillswap/issues/31) -> **Done** Analytics funnel tracking + `/api/analytics/funnel`.
- [#32](https://github.com/CodeMaverick2/skillswap/issues/32) -> **Done** Matching outcome feedback loop + quality scores.
- [#33](https://github.com/CodeMaverick2/skillswap/issues/33) -> **Done** Block / report / moderation basics.
- [#34](https://github.com/CodeMaverick2/skillswap/issues/34) -> **Done** Session reschedule + calendar `.ics` export.
- [#35](https://github.com/CodeMaverick2/skillswap/issues/35) -> **Done** Learning paths with weekly targets + path steps.
- [#36](https://github.com/CodeMaverick2/skillswap/issues/36) -> **Done** Session templates + guided checklists.

## Next (post-submission / next term)

- Optional: Play Store listing and broader campus pilot.
- Optional: background job for exact 1-hour-before session reminders.
- Optional: moderation review queue UI for pending reports.

---

*SkillSwap · Tejas, Rushil, Aayush, Harsh · Submission-ready · July 2026*
