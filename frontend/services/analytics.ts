import api from './api'

export async function track(name: string, properties: Record<string, unknown> = {}) {
  try {
    await api.post('/analytics/track', { name, properties })
  } catch {
    // analytics must never block UX
  }
}

export async function fetchFunnel(days = 7) {
  const res = await api.get('/analytics/funnel', { params: { days } })
  return res.data.data
}
