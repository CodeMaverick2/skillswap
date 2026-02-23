import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'

export function timeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatMessageTime(date: Date | string): string {
  const d = new Date(date)
  if (isToday(d)) return format(d, 'HH:mm')
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'dd MMM')
}

export function formatSessionDate(date: Date | string): string {
  return format(new Date(date), 'EEE, dd MMM yyyy · h:mm a')
}

export function formatDuration(mins: number): string {
  if (mins < 60) return `${mins} min`
  return `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ''}`
}
