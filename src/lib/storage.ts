// The whole app state is one JSON document in localStorage. When AppState
// changes shape, bump CURRENT_VERSION and add a step to migrate().

import { DEFAULT_MARKET_URL } from './market'
import type { AppState } from './types'

export const STORAGE_KEY = 'launchpad:v1'
export const CURRENT_VERSION = 1
export const DEFAULT_MODEL = 'claude-opus-5-5'

export function emptyState(): AppState {
  return {
    version: CURRENT_VERSION,
    profile: { name: '', headline: '', targetRoles: '', location: '', summary: '', experience: '', links: '' },
    jobs: [],
    skills: [],
    sessions: [],
    stories: [],
    goals: { weeklyApplications: 5, weeklyLearningMinutes: 300 },
    settings: { apiKey: '', model: DEFAULT_MODEL, effort: 'medium', marketUrl: DEFAULT_MARKET_URL },
  }
}

/**
 * Bring any previously saved document up to the current shape. Unknown or
 * missing fields fall back to defaults, so a partially corrupted or older
 * backup still loads.
 */
export function migrate(raw: unknown): AppState {
  const base = emptyState()
  if (!raw || typeof raw !== 'object') return base
  const data = raw as Partial<AppState>
  // Future migrations go here, e.g.
  // if ((data.version ?? 0) < 2) { ...transform v1 -> v2... }
  return {
    version: CURRENT_VERSION,
    profile: { ...base.profile, ...data.profile },
    jobs: Array.isArray(data.jobs) ? data.jobs.map((j) => ({ ...j, events: j.events ?? [], tags: j.tags ?? [] })) : [],
    skills: Array.isArray(data.skills) ? data.skills : [],
    sessions: Array.isArray(data.sessions) ? data.sessions : [],
    stories: Array.isArray(data.stories) ? data.stories : [],
    goals: { ...base.goals, ...data.goals },
    settings: { ...base.settings, ...data.settings },
  }
}

export function loadState(): AppState {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    return text ? migrate(JSON.parse(text)) : emptyState()
  } catch {
    return emptyState()
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage can be full or disabled (private mode). The app keeps working
    // in memory; the user can still export a backup from the Profile page.
  }
}

/** Backups never include the API key, so they are safe to share or commit. */
export function exportState(state: AppState): string {
  return JSON.stringify({ ...state, settings: { ...state.settings, apiKey: '' } }, null, 2)
}

export function importState(text: string, current: AppState): AppState {
  const next = migrate(JSON.parse(text))
  // keep the key the user already has on this device
  return { ...next, settings: { ...next.settings, apiKey: next.settings.apiKey || current.settings.apiKey } }
}
