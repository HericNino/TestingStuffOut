import { describe, expect, it } from 'vitest'
import { sampleState } from './sample'
import { CURRENT_VERSION, emptyState, exportState, importState, migrate } from './storage'

describe('migrate', () => {
  it('returns a clean state for garbage input', () => {
    expect(migrate(null)).toEqual(emptyState())
    expect(migrate('nope')).toEqual(emptyState())
  })

  it('fills in missing fields from defaults', () => {
    const s = migrate({ profile: { name: 'Nino' }, jobs: [{ id: 'x', company: 'Acme' }], goals: { weeklyApplications: 3 } })
    expect(s.version).toBe(CURRENT_VERSION)
    expect(s.profile.name).toBe('Nino')
    expect(s.profile.headline).toBe('')
    expect(s.jobs[0].events).toEqual([])
    expect(s.jobs[0].tags).toEqual([])
    expect(s.goals).toEqual({ weeklyApplications: 3, weeklyLearningMinutes: 300 })
    expect(s.settings.model).toBe('claude-opus-5-5')
  })
})

describe('export / import', () => {
  it('never writes the API key into a backup', () => {
    const state = { ...sampleState(), settings: { ...emptyState().settings, apiKey: 'sk-ant-secret' } }
    const text = exportState(state)
    expect(text).not.toContain('sk-ant-secret')
  })

  it('round-trips data and keeps the key already on this device', () => {
    const original = sampleState('2026-10-07')
    const current = { ...emptyState(), settings: { ...emptyState().settings, apiKey: 'sk-ant-local' } }
    const restored = importState(exportState(original), current)
    expect(restored.jobs).toEqual(original.jobs)
    expect(restored.sessions).toEqual(original.sessions)
    expect(restored.settings.apiKey).toBe('sk-ant-local')
  })

  it('throws on invalid JSON so the UI can report it', () => {
    expect(() => importState('{not json', emptyState())).toThrow()
  })
})
