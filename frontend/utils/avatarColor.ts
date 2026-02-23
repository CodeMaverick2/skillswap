const AVATAR_COLORS = [
  '#6C63FF', '#FF6584', '#43D9AD', '#FFD166',
  '#54A0FF', '#FF9F43', '#EE5A24', '#9A99BC',
]

export function getAvatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function getInitials(firstName: string, lastName: string): string {
  const f = firstName?.trim().charAt(0).toUpperCase() || ''
  const l = lastName?.trim().charAt(0).toUpperCase() || ''
  return f + l || '?'
}
