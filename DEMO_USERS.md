# SkillSwap Demo Users (India-focused)

Use this file to run a complete product demo with realistic Indian personas and varied states.

## Shared login password

- `Password@123` for every seeded user below.

## Primary all-in-one demo account

- **Email:** `qa_primary@skillswap.local`
- **Username:** `qa_primary`
- **Name:** Tejas QA
- **Why this account is best for demo:**
  - has incoming and outgoing pending requests
  - has accepted matches and active conversations
  - has upcoming + past completed sessions
  - has activity feed events
  - has learning goals with progress
  - has referrals
  - gives full discover/profile/messages/sessions walkthrough from one account

## Persona users (Indian names + diverse intents)

- `aisha_dev@skillswap.local` (Aisha Khan) - React/Node mentor
- `rohan_music@skillswap.local` (Rohan Iyer) - music teacher learning coding
- `meera_design@skillswap.local` (Meera Shah) - UI/Figma expert
- `karan_lang@skillswap.local` (Karan Patel) - communication + language coach
- `arjun_backend@skillswap.local` (Arjun Verma) - backend/system design mentor
- `kavya_ui@skillswap.local` (Kavya Nair) - UI polish/design guidance
- `devansh_ai@skillswap.local` (Devansh Gupta) - Python/AI practitioner
- `ishita_speak@skillswap.local` (Ishita Rao) - speaking confidence trainer
- `manav_music@skillswap.local` (Manav Kulkarni) - guitar mentor
- `priya_pm@skillswap.local` (Priya Deshmukh) - PM persona, learning backend
- `rahul_fullstack@skillswap.local` (Rahul Sharma) - full-stack exchange partner
- `sneha_data@skillswap.local` (Sneha Patil) - data/Python teacher
- `tanmay_design@skillswap.local` (Tanmay Joshi) - Figma/design systems
- `neha_lang@skillswap.local` (Neha Bhatia) - language-focused mentor
- `nina_polyglot@skillswap.local` (Nina Costa) - non-Indian international contrast persona

## Suggested live demo flow (single-account)

1. Login as `qa_primary@skillswap.local`.
2. Open Discover:
   - show pending incoming requests
   - show sent requests
   - show accepted/matched preview
3. Open Messages:
   - show existing conversations + intro prompt chips
4. Open a Conversation:
   - send message
   - show slot suggestions + schedule CTA
5. Open Sessions:
   - show upcoming and past tabs
   - open one session detail for notes/feedback workflow
6. Open Profile:
   - show goals, streak/badges, referrals, activity feed

## How to refresh demo data

Run in `backend`:

- `npm run seed`
- `npm run smoke`

This resets graph relationships to the expected demo-ready state.
