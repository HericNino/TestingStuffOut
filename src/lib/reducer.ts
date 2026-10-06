// Every state change goes through here. Keep it pure: anything time-based
// (dates, timestamps) is passed in on the action so tests stay deterministic.

import type { AppState, Goals, Job, LearningSession, Profile, Settings, Skill, Stage, Story } from './types'

export type Action =
  | { type: 'job/upsert'; job: Job }
  | { type: 'job/delete'; id: string }
  | { type: 'job/move'; id: string; stage: Stage; day: string; now: string }
  | { type: 'skill/upsert'; skill: Skill }
  | { type: 'skill/delete'; id: string }
  | { type: 'session/add'; session: LearningSession }
  | { type: 'session/delete'; id: string }
  | { type: 'story/upsert'; story: Story }
  | { type: 'story/delete'; id: string }
  | { type: 'profile/update'; profile: Partial<Profile> }
  | { type: 'settings/update'; settings: Partial<Settings> }
  | { type: 'goals/update'; goals: Partial<Goals> }
  | { type: 'state/replace'; state: AppState }

function upsert<T extends { id: string }>(list: T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id)
  if (i === -1) return [item, ...list]
  const copy = list.slice()
  copy[i] = item
  return copy
}

const STAGE_EVENT: Partial<Record<Stage, Job['events'][number]['type']>> = {
  applied: 'applied',
  interview: 'interview',
  offer: 'offer',
  rejected: 'rejected',
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'job/upsert':
      return { ...state, jobs: upsert(state.jobs, action.job) }
    case 'job/delete':
      return { ...state, jobs: state.jobs.filter((j) => j.id !== action.id) }
    case 'job/move': {
      const jobs = state.jobs.map((job) => {
        if (job.id !== action.id || job.stage === action.stage) return job
        const eventType = STAGE_EVENT[action.stage]
        const events = eventType
          ? [...job.events, { id: `${job.id}-${action.stage}-${action.now}`, date: action.day, type: eventType, note: '' }]
          : job.events
        return {
          ...job,
          stage: action.stage,
          appliedAt: action.stage === 'applied' && !job.appliedAt ? action.day : job.appliedAt,
          updatedAt: action.now,
          events,
        }
      })
      return { ...state, jobs }
    }
    case 'skill/upsert':
      return { ...state, skills: upsert(state.skills, action.skill) }
    case 'skill/delete':
      return {
        ...state,
        skills: state.skills.filter((s) => s.id !== action.id),
        // keep the sessions, just detach them from the deleted skill
        sessions: state.sessions.map((s) => (s.skillId === action.id ? { ...s, skillId: undefined } : s)),
      }
    case 'session/add':
      return { ...state, sessions: [action.session, ...state.sessions] }
    case 'session/delete':
      return { ...state, sessions: state.sessions.filter((s) => s.id !== action.id) }
    case 'story/upsert':
      return { ...state, stories: upsert(state.stories, action.story) }
    case 'story/delete':
      return { ...state, stories: state.stories.filter((s) => s.id !== action.id) }
    case 'profile/update':
      return { ...state, profile: { ...state.profile, ...action.profile } }
    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.settings } }
    case 'goals/update':
      return { ...state, goals: { ...state.goals, ...action.goals } }
    case 'state/replace':
      return action.state
  }
}
