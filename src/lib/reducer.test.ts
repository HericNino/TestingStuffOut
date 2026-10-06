import { describe, expect, it } from 'vitest'
import { reducer } from './reducer'
import { sampleState } from './sample'
import { emptyState } from './storage'
import type { Job } from './types'

const job = (id: string): Job => ({
  id,
  company: id,
  role: 'Dev',
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
})

describe('reducer', () => {
  it('upserts: inserts new items first, replaces existing in place', () => {
    let s = reducer(emptyState(), { type: 'job/upsert', job: job('a') })
    s = reducer(s, { type: 'job/upsert', job: job('b') })
    expect(s.jobs.map((j) => j.id)).toEqual(['b', 'a'])
    s = reducer(s, { type: 'job/upsert', job: { ...job('a'), role: 'Lead' } })
    expect(s.jobs.map((j) => [j.id, j.role])).toEqual([
      ['b', 'Dev'],
      ['a', 'Lead'],
    ])
  })

  it('moving to applied stamps the date and logs an event once', () => {
    let s = reducer(emptyState(), { type: 'job/upsert', job: job('a') })
    s = reducer(s, { type: 'job/move', id: 'a', stage: 'applied', day: '2026-10-01', now: 't1' })
    expect(s.jobs[0]).toMatchObject({ stage: 'applied', appliedAt: '2026-10-01', updatedAt: 't1' })
    expect(s.jobs[0].events.map((e) => e.type)).toEqual(['applied'])

    // moving to the same stage is a no-op
    const same = reducer(s, { type: 'job/move', id: 'a', stage: 'applied', day: '2026-10-02', now: 't2' })
    expect(same.jobs[0]).toBe(s.jobs[0])

    s = reducer(s, { type: 'job/move', id: 'a', stage: 'interview', day: '2026-10-05', now: 't3' })
    expect(s.jobs[0].appliedAt).toBe('2026-10-01')
    expect(s.jobs[0].events.map((e) => e.type)).toEqual(['applied', 'interview'])
  })

  it('deleting a skill keeps its sessions but detaches them', () => {
    const start = sampleState('2026-10-07')
    const s = reducer(start, { type: 'skill/delete', id: 'sk-ts' })
    expect(s.skills.some((x) => x.id === 'sk-ts')).toBe(false)
    expect(s.sessions).toHaveLength(start.sessions.length)
    expect(s.sessions.some((x) => x.skillId === 'sk-ts')).toBe(false)
  })

  it('merges partial profile, settings and goals updates', () => {
    let s = reducer(emptyState(), { type: 'profile/update', profile: { name: 'Nino' } })
    s = reducer(s, { type: 'settings/update', settings: { effort: 'high' } })
    s = reducer(s, { type: 'goals/update', goals: { weeklyApplications: 10 } })
    expect(s.profile.name).toBe('Nino')
    expect(s.settings).toMatchObject({ effort: 'high', model: 'claude-opus-5-5' })
    expect(s.goals).toEqual({ weeklyApplications: 10, weeklyLearningMinutes: 300 })
  })
})
