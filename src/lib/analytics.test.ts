import { describe, expect, it } from 'vitest'
import {
  applicationsThisWeek,
  followUpsDue,
  heatmap,
  keywordMatch,
  learningStreak,
  longestStreak,
  minutesThisWeek,
  pipelineStats,
  skillGaps,
} from './analytics'
import type { Job, LearningSession, Skill } from './types'

const NOW = '2026-10-07' // a Wednesday

function job(partial: Partial<Job>): Job {
  return {
    id: Math.random().toString(36),
    company: 'Acme',
    role: 'Engineer',
    url: '',
    location: '',
    salary: '',
    stage: 'wishlist',
    priority: 2,
    description: '',
    notes: '',
    contacts: '',
    tags: [],
    createdAt: '',
    updatedAt: '',
    events: [],
    ...partial,
  }
}

const session = (date: string, minutes = 30, skillId?: string): LearningSession => ({ id: date + minutes, date, minutes, skillId, topic: '', notes: '' })
const skill = (name: string, level: number, target: number): Skill => ({ id: name, name, category: '', level, target, notes: '' })

describe('pipelineStats', () => {
  it('counts stages and rates over submitted applications only', () => {
    const stats = pipelineStats([
      job({ stage: 'wishlist' }),
      job({ stage: 'applied', appliedAt: NOW }),
      job({ stage: 'applied', appliedAt: NOW, events: [{ id: '1', date: NOW, type: 'response', note: '' }] }),
      job({ stage: 'interview', appliedAt: NOW }),
      job({ stage: 'rejected', appliedAt: NOW, events: [{ id: '2', date: NOW, type: 'interview', note: '' }] }),
    ])
    expect(stats.total).toBe(5)
    expect(stats.active).toBe(4)
    expect(stats.byStage).toEqual({ wishlist: 1, applied: 2, interview: 1, offer: 0, rejected: 1 })
    expect(stats.responseRate).toBeCloseTo(3 / 4) // response event, interview stage, interview event
    expect(stats.interviewRate).toBeCloseTo(2 / 4)
  })

  it('handles an empty pipeline without dividing by zero', () => {
    expect(pipelineStats([]).responseRate).toBe(0)
  })
})

describe('followUpsDue', () => {
  it('flags applications quiet for a week and due next actions', () => {
    const quiet = job({ company: 'Quiet', stage: 'applied', appliedAt: '2026-09-28' })
    const fresh = job({ company: 'Fresh', stage: 'applied', appliedAt: '2026-10-05' })
    const touched = job({ company: 'Touched', stage: 'applied', appliedAt: '2026-09-20', events: [{ id: 'e', date: '2026-10-04', type: 'follow-up', note: '' }] })
    const planned = job({ company: 'Planned', stage: 'interview', nextActionAt: '2026-10-06' })
    const closed = job({ company: 'Closed', stage: 'rejected', nextActionAt: '2026-10-01' })
    const due = followUpsDue([quiet, fresh, touched, planned, closed], NOW).map((f) => f.job.company)
    expect(due).toEqual(['Quiet', 'Planned'])
  })
})

describe('learning streaks', () => {
  it('counts consecutive days back from today', () => {
    expect(learningStreak([session('2026-10-07'), session('2026-10-06'), session('2026-10-05'), session('2026-10-03')], NOW)).toBe(3)
  })

  it('keeps yesterday’s streak alive until today ends', () => {
    expect(learningStreak([session('2026-10-06'), session('2026-10-05')], NOW)).toBe(2)
  })

  it('is zero after a missed day', () => {
    expect(learningStreak([session('2026-10-04')], NOW)).toBe(0)
  })

  it('finds the longest run ever', () => {
    const sessions = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-03', '2026-02-10', '2026-02-11'].map((d) => session(d))
    expect(longestStreak(sessions)).toBe(3)
    expect(longestStreak([])).toBe(0)
  })
})

describe('weekly totals', () => {
  it('sum from Monday through today', () => {
    const sessions = [session('2026-10-05', 20), session('2026-10-07', 40), session('2026-10-04', 999)]
    expect(minutesThisWeek(sessions, NOW)).toBe(60)
    const jobs = [job({ appliedAt: '2026-10-05' }), job({ appliedAt: '2026-10-04' }), job({})]
    expect(applicationsThisWeek(jobs, NOW)).toBe(1)
  })
})

describe('heatmap', () => {
  it('builds week columns ending today with intensity levels', () => {
    const grid = heatmap([session('2026-10-07', 90), session('2026-10-05', 10)], NOW, 4)
    expect(grid).toHaveLength(4)
    expect(grid[0][0].day).toBe('2026-09-14') // Monday three weeks back
    const last = grid[3]
    expect(last.map((c) => c.day)).toEqual(['2026-10-05', '2026-10-06', '2026-10-07']) // no future days
    expect(last.map((c) => c.level)).toEqual([1, 0, 3])
  })
})

describe('skillGaps', () => {
  it('orders by biggest gap and skips skills already at target', () => {
    const gaps = skillGaps([skill('A', 3, 4), skill('B', 1, 5), skill('C', 5, 5), skill('D', 2, 4)])
    expect(gaps.map((s) => s.name)).toEqual(['B', 'D', 'A'])
  })
})

describe('keywordMatch', () => {
  it('matches whole words and tech names with punctuation', () => {
    const skills = [skill('React', 0, 0), skill('C++', 0, 0), skill('Node.js', 0, 0), skill('Go', 0, 0), skill('SQL', 0, 0)]
    const { matched, missing } = keywordMatch('Experience with React. Bonus: C++, Node.js and Google Cloud.', skills)
    expect(matched.map((s) => s.name)).toEqual(['React', 'C++', 'Node.js'])
    expect(missing.map((s) => s.name)).toEqual(['Go', 'SQL']) // "Google" must not match "Go"
  })
})
