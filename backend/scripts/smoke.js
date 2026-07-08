#!/usr/bin/env node

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:5000/api'
const EMAIL = process.env.SMOKE_EMAIL || 'qa_primary@skillswap.local'
const PASSWORD = process.env.SMOKE_PASSWORD || 'Password@123'

async function call(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, options)
  const text = await res.text()
  let data = {}
  try {
    data = JSON.parse(text)
  } catch {
    // keep raw fallback
  }
  return { ok: res.ok, status: res.status, data, raw: text }
}

async function run() {
  const health = await call('/health')
  if (!health.ok) throw new Error(`Health failed (${health.status})`)

  const login = await call('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  })
  if (!login.ok) throw new Error(`Login failed (${login.status})`)

  const accessToken = login.data?.data?.accessToken
  if (!accessToken) throw new Error('Missing access token from login response')

  const authHeaders = { Authorization: `Bearer ${accessToken}` }

  const me = await call('/users/me', { headers: authHeaders })
  if (!me.ok) throw new Error(`Profile fetch failed (${me.status})`)

  const discover = await call('/discover?limit=5', { headers: authHeaders })
  if (!discover.ok) throw new Error(`Discover failed (${discover.status})`)

  const sessions = await call('/sessions', { headers: authHeaders })
  if (!sessions.ok) throw new Error(`Sessions failed (${sessions.status})`)

  const conversations = await call('/messages/conversations', { headers: authHeaders })
  if (!conversations.ok) throw new Error(`Conversations failed (${conversations.status})`)

  const goals = await call('/goals', { headers: authHeaders })
  if (!goals.ok) throw new Error(`Goals failed (${goals.status})`)

  const referrals = await call('/referrals/me', { headers: authHeaders })
  if (!referrals.ok) throw new Error(`Referrals failed (${referrals.status})`)

  const activity = await call('/activity/feed?limit=5', { headers: authHeaders })
  if (!activity.ok) throw new Error(`Activity failed (${activity.status})`)

  const accepted = await call('/matches?status=accepted', { headers: authHeaders })
  if (!accepted.ok) throw new Error(`Accepted matches failed (${accepted.status})`)
  const firstMatchId = accepted.data?.data?.[0]?._id
  if (firstMatchId) {
    const slots = await call(`/sessions/slots?matchId=${firstMatchId}`, { headers: authHeaders })
    if (!slots.ok) throw new Error(`Slots failed (${slots.status})`)
  }

  const templates = await call('/sessions/templates', { headers: authHeaders })
  if (!templates.ok) throw new Error(`Templates failed (${templates.status})`)

  const funnel = await call('/analytics/funnel?days=7', { headers: authHeaders })
  if (!funnel.ok) throw new Error(`Funnel failed (${funnel.status})`)

  const track = await call('/analytics/track', {
    method: 'POST',
    headers: { ...authHeaders, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'onboarding_completed', properties: { source: 'smoke' } }),
  })
  if (!track.ok) throw new Error(`Track failed (${track.status})`)

  const blocks = await call('/moderation/blocks', { headers: authHeaders })
  if (!blocks.ok) throw new Error(`Blocks failed (${blocks.status})`)

  console.log('Smoke passed.')
  console.log(`- profile: ${me.data?.data?.username || 'n/a'}`)
  console.log(`- discover users: ${(discover.data?.data?.users || []).length}`)
  console.log(`- upcoming sessions: ${(sessions.data?.data?.upcoming || []).length}`)
  console.log(`- conversations: ${(conversations.data?.data || []).length}`)
  console.log(`- goals: ${(goals.data?.data || []).length}`)
  console.log(`- referrals: ${(referrals.data?.data?.referrals || []).length}`)
  console.log(`- activity events: ${(activity.data?.data || []).length}`)
  console.log(`- templates: ${(templates.data?.data || []).length}`)
  console.log(`- funnel steps: ${Object.keys(funnel.data?.data?.counts || {}).length}`)
}

run().catch((err) => {
  console.error(`Smoke failed: ${err.message}`)
  process.exit(1)
})
