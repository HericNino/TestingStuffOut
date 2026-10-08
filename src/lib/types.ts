// Data model shared by the reducer, storage and UI.

export type Stage = 'wishlist' | 'applied' | 'interview' | 'offer' | 'rejected'

export const STAGES: { id: Stage; label: string }[] = [
  { id: 'wishlist', label: 'Wishlist' },
  { id: 'applied', label: 'Applied' },
  { id: 'interview', label: 'Interviewing' },
  { id: 'offer', label: 'Offer' },
  { id: 'rejected', label: 'Closed' },
]

export type JobEventType = 'note' | 'applied' | 'response' | 'interview' | 'offer' | 'rejected' | 'follow-up'

export interface JobEvent {
  id: string
  date: string // YYYY-MM-DD
  type: JobEventType
  note: string
}

export interface Job {
  id: string
  company: string
  role: string
  url: string
  location: string
  salary: string
  stage: Stage
  priority: 1 | 2 | 3 // 1 = dream job
  description: string // the job posting, used by the assistant
  notes: string
  contacts: string
  tags: string[]
  createdAt: string // ISO timestamp
  updatedAt: string
  appliedAt?: string // YYYY-MM-DD
  nextActionAt?: string // YYYY-MM-DD
  events: JobEvent[]
}

export interface Skill {
  id: string
  name: string
  category: string
  level: number // 0-5, where you are
  target: number // 0-5, where you want to be
  notes: string
}

export interface LearningSession {
  id: string
  date: string // YYYY-MM-DD
  minutes: number
  skillId?: string
  topic: string
  notes: string
}

export interface Story {
  id: string
  title: string
  competencies: string[]
  situation: string
  task: string
  action: string
  result: string
  createdAt: string
}

export interface Profile {
  name: string
  headline: string
  targetRoles: string
  location: string
  summary: string
  experience: string // free-form resume text
  links: string
}

export type Effort = 'low' | 'medium' | 'high' | 'xhigh' | 'max'

export interface Settings {
  apiKey: string
  model: string
  effort: Effort
  marketUrl: string // jobpulse report; empty turns market data off
}

export interface Goals {
  weeklyApplications: number
  weeklyLearningMinutes: number
}

export interface AppState {
  version: number
  profile: Profile
  jobs: Job[]
  skills: Skill[]
  sessions: LearningSession[]
  stories: Story[]
  goals: Goals
  settings: Settings
}
