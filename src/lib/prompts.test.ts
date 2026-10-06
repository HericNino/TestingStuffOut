import { describe, expect, it } from 'vitest'
import { buildPrompt, interviewSystemPrompt, TASKS } from './prompts'
import { sampleState } from './sample'

const s = sampleState('2026-10-07')
const job = s.jobs[0]
const story = s.stories[0]

describe('buildPrompt', () => {
  it('includes profile, skills and the job for job tasks', () => {
    const prompt = buildPrompt({ task: 'match', profile: s.profile, skills: s.skills, sessions: s.sessions, job })
    expect(prompt).toContain('<candidate_profile>')
    expect(prompt).toContain('Alex Demo')
    expect(prompt).toContain('- TypeScript (Frontend): level 3/5, target 5/5')
    expect(prompt).toContain(`<job>\nCompany: ${job.company}`)
    expect(prompt).toContain('## Fit score')
    expect(prompt).not.toContain('<recent_learning>')
  })

  it('adds recent learning only for the learning plan', () => {
    const prompt = buildPrompt({ task: 'plan', profile: s.profile, skills: s.skills, sessions: s.sessions })
    expect(prompt).toContain('<recent_learning>')
    expect(prompt).not.toContain('<job>')
  })

  it('includes the story for story polishing', () => {
    const prompt = buildPrompt({ task: 'story', profile: s.profile, skills: s.skills, sessions: [], story })
    expect(prompt).toContain(`Title: ${story.title}`)
    expect(prompt).toContain('Follow-up questions')
  })

  it('has instructions for every task', () => {
    for (const t of TASKS) {
      const prompt = buildPrompt({ task: t.id, profile: s.profile, skills: [], sessions: [], job, story })
      expect(prompt.length).toBeGreaterThan(200)
    }
  })
})

describe('interviewSystemPrompt', () => {
  it('sets up the interviewer role for the chosen job', () => {
    const prompt = interviewSystemPrompt(job, s.profile, s.skills)
    expect(prompt).toContain('mock interview')
    expect(prompt).toContain(job.role)
    expect(prompt).toContain('end interview')
  })
})
