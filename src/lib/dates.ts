// Calendar days are stored as local "YYYY-MM-DD" strings, which avoids
// time-zone surprises (a session logged at 23:30 stays on that day).

const pad = (n: number) => String(n).padStart(2, '0')

export function toDay(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Current moment as an ISO timestamp, for createdAt/updatedAt fields. */
export function timestamp(): string {
  return new Date().toISOString()
}

export function today(): string {
  return toDay(new Date())
}

export function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(day: string, n: number): string {
  const d = parseDay(day)
  d.setDate(d.getDate() + n)
  return toDay(d)
}

export function daysBetween(from: string, to: string): number {
  const ms = parseDay(to).getTime() - parseDay(from).getTime()
  return Math.round(ms / 86_400_000)
}

/** Monday of the week containing `day`. */
export function startOfWeek(day: string): string {
  const d = parseDay(day)
  const offset = (d.getDay() + 6) % 7 // Monday = 0
  return addDays(day, -offset)
}

export function formatDay(day: string): string {
  return parseDay(day).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function relativeDay(day: string, now = today()): string {
  const diff = daysBetween(now, day)
  if (diff === 0) return 'today'
  if (diff === 1) return 'tomorrow'
  if (diff === -1) return 'yesterday'
  return diff > 0 ? `in ${diff} days` : `${-diff} days ago`
}
