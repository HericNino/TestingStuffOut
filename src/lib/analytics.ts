// Numbers shown on the dashboard and learning pages. No React in here.

import { addDays, daysBetween, startOfWeek } from './dates'
import type { Job, LearningSession, Skill, Stage } from './types'

export const FOLLOW_UP_AFTER_DAYS = 7

export interface PipelineStats {
  total: number
  active: number
  byStage: Record<Stage, number>
  /** Share of submitted applications that got any reply (interview, offer or a logged response). */
  responseRate: number
  /** Share of submitted applications that reached the interview stage or beyond. */
  interviewRate: number
}

const SUBMITTED: Stage[] = ['applied', 'interview', 'offer', 'rejected']

function gotResponse(job: Job): boolean {
  return (
    job.stage === 'interview' ||
    job.stage === 'offer' ||
    job.events.some((e) => e.type === 'response' || e.type === 'interview' || e.type === 'offer' || e.type === 'rejected')
  )
}

function reachedInterview(job: Job): boolean {
  return job.stage === 'interview' || job.stage === 'offer' || job.events.some((e) => e.type === 'interview')
}

export function pipelineStats(jobs: Job[]): PipelineStats {
  const byStage: Record<Stage, number> = { wishlist: 0, applied: 0, interview: 0, offer: 0, rejected: 0 }
  for (const job of jobs) byStage[job.stage]++
  const submitted = jobs.filter((j) => SUBMITTED.includes(j.stage) || j.appliedAt)
  const rate = (n: number) => (submitted.length ? n / submitted.length : 0)
  return {
    total: jobs.length,
    active: byStage.wishlist + byStage.applied + byStage.interview,
    byStage,
    responseRate: rate(submitted.filter(gotResponse).length),
    interviewRate: rate(submitted.filter(reachedInterview).length),
  }
}

export interface FollowUp {
  job: Job
  reason: string
  overdueDays: number
}

/**
 * Jobs that need a nudge: an explicit next-action date that has arrived, or an
 * application that has sat in "Applied" with no news for a week.
 */
export function followUpsDue(jobs: Job[], now: string): FollowUp[] {
  const due: FollowUp[] = []
  for (const job of jobs) {
    if (job.stage === 'rejected' || job.stage === 'offer') continue
    if (job.nextActionAt && job.nextActionAt <= now) {
      due.push({ job, reason: 'Planned next step', overdueDays: daysBetween(job.nextActionAt, now) })
      continue
    }
    if (job.stage === 'applied' && job.appliedAt) {
      const lastTouch = job.events.reduce((latest, e) => (e.date > latest ? e.date : latest), job.appliedAt)
      const quiet = daysBetween(lastTouch, now)
      if (quiet >= FOLLOW_UP_AFTER_DAYS) {
        due.push({ job, reason: `No reply in ${quiet} days`, overdueDays: quiet - FOLLOW_UP_AFTER_DAYS })
      }
    }
  }
  return due.sort((a, b) => b.overdueDays - a.overdueDays || a.job.priority - b.job.priority)
}

export function minutesByDay(sessions: LearningSession[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const s of sessions) map.set(s.date, (map.get(s.date) ?? 0) + s.minutes)
  return map
}

/**
 * Consecutive days with at least one session, counting back from today.
 * An empty today doesn't break the streak yet; there's still time to log.
 */
export function learningStreak(sessions: LearningSession[], now: string): number {
  const days = minutesByDay(sessions)
  let day = days.has(now) ? now : addDays(now, -1)
  let streak = 0
  while ((days.get(day) ?? 0) > 0) {
    streak++
    day = addDays(day, -1)
  }
  return streak
}

export function longestStreak(sessions: LearningSession[]): number {
  const days = [...minutesByDay(sessions).keys()].sort()
  let best = 0
  let run = 0
  let prev = ''
  for (const day of days) {
    run = prev && daysBetween(prev, day) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = day
  }
  return best
}

export function minutesThisWeek(sessions: LearningSession[], now: string): number {
  const start = startOfWeek(now)
  return sessions.filter((s) => s.date >= start && s.date <= now).reduce((sum, s) => sum + s.minutes, 0)
}

export function applicationsThisWeek(jobs: Job[], now: string): number {
  const start = startOfWeek(now)
  return jobs.filter((j) => j.appliedAt && j.appliedAt >= start && j.appliedAt <= now).length
}

export interface HeatmapCell {
  day: string
  minutes: number
  level: 0 | 1 | 2 | 3 | 4
}

/** Calendar grid: `weeks` columns of Monday to Sunday, ending with the current week. */
export function heatmap(sessions: LearningSession[], now: string, weeks = 26): HeatmapCell[][] {
  const days = minutesByDay(sessions)
  const first = addDays(startOfWeek(now), -7 * (weeks - 1))
  const grid: HeatmapCell[][] = []
  for (let w = 0; w < weeks; w++) {
    const column: HeatmapCell[] = []
    for (let d = 0; d < 7; d++) {
      const day = addDays(first, w * 7 + d)
      if (day > now) break
      const minutes = days.get(day) ?? 0
      const level = minutes === 0 ? 0 : minutes < 30 ? 1 : minutes < 60 ? 2 : minutes < 120 ? 3 : 4
      column.push({ day, minutes, level })
    }
    grid.push(column)
  }
  return grid
}

export function minutesBySkill(sessions: LearningSession[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const s of sessions) if (s.skillId) map.set(s.skillId, (map.get(s.skillId) ?? 0) + s.minutes)
  return map
}

/** Skills with the biggest gap between target and current level, i.e. what to study next. */
export function skillGaps(skills: Skill[], limit = 5): Skill[] {
  return skills
    .filter((s) => s.target > s.level)
    .sort((a, b) => b.target - b.level - (a.target - a.level) || a.name.localeCompare(b.name))
    .slice(0, limit)
}

// keep characters that matter in tech names (C++, C#, Node.js) but drop
// sentence punctuation so "experience with React." still matches "React"
const normalizeText = (s: string) => ` ${s.toLowerCase().replace(/[^a-z0-9+#.]+/g, ' ').replace(/\.+(?=\s|$)/g, ' ')} `

/** Returns a test for whether a skill name appears as a whole word in `text`. */
export function mentionsIn(text: string): (name: string) => boolean {
  const haystack = normalizeText(text)
  return (name) => {
    const needle = normalizeText(name).trim()
    return needle !== '' && haystack.includes(` ${needle} `)
  }
}

/** Rough keyword match between a posting and your skills, done locally. */
export function keywordMatch(description: string, skills: Skill[]): { matched: Skill[]; missing: Skill[] } {
  const mentions = mentionsIn(description)
  const matched: Skill[] = []
  const missing: Skill[] = []
  for (const skill of skills) {
    if (!normalizeText(skill.name).trim()) continue
    if (mentions(skill.name)) matched.push(skill)
    else missing.push(skill)
  }
  return { matched, missing }
}
