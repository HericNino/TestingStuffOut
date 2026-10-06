// Prompts for the assistant. Context goes first in tagged sections, the task
// and the expected output format last.

import type { Job, LearningSession, Profile, Skill, Story } from './types'

export type AssistantTask = 'match' | 'resume' | 'cover' | 'outreach' | 'plan' | 'story'

export const TASKS: { id: AssistantTask; label: string; blurb: string; needsJob: boolean; needsStory?: boolean }[] = [
  { id: 'match', label: 'Fit check', blurb: 'How well you match the posting, and what is missing.', needsJob: true },
  { id: 'resume', label: 'Resume bullets', blurb: 'Your experience, rewritten for this job.', needsJob: true },
  { id: 'cover', label: 'Cover letter', blurb: 'Short, specific, and based on what you have actually done.', needsJob: true },
  { id: 'outreach', label: 'Outreach note', blurb: 'A few lines to a recruiter or the hiring manager.', needsJob: true },
  { id: 'plan', label: 'Study plan', blurb: 'Four weeks, built from your skill gaps.', needsJob: false },
  { id: 'story', label: 'Story feedback', blurb: 'Tighten an interview story and see the follow-up questions.', needsJob: false, needsStory: true },
]

export const SYSTEM_PROMPT = `You are a sharp, warm career coach and hiring-manager-level reviewer helping one person with their job search and skill growth.

Ground every claim in the candidate's real profile, skills and stories provided to you. Never invent employers, titles, metrics or experience; when a strong point would need a number the candidate hasn't given, write a clearly marked placeholder like [X%] and say what to fill in.

Be direct and specific. Prefer concrete examples over generic advice. Format answers in Markdown with short sections and bullet lists.`

function section(tag: string, body: string): string {
  const text = body.trim()
  return text ? `<${tag}>\n${text}\n</${tag}>` : ''
}

export function describeProfile(profile: Profile): string {
  return [
    profile.name && `Name: ${profile.name}`,
    profile.headline && `Headline: ${profile.headline}`,
    profile.targetRoles && `Target roles: ${profile.targetRoles}`,
    profile.location && `Location: ${profile.location}`,
    profile.summary && `Summary: ${profile.summary}`,
    profile.experience && `Experience / resume:\n${profile.experience}`,
    profile.links && `Links: ${profile.links}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function describeSkills(skills: Skill[], minutes: Map<string, number> = new Map()): string {
  return skills
    .map((s) => {
      const hours = Math.round((minutes.get(s.id) ?? 0) / 60)
      return `- ${s.name}${s.category ? ` (${s.category})` : ''}: level ${s.level}/5, target ${s.target}/5${hours ? `, ${hours}h logged` : ''}`
    })
    .join('\n')
}

export function describeJob(job: Job): string {
  return [
    `Company: ${job.company}`,
    `Role: ${job.role}`,
    job.location && `Location: ${job.location}`,
    job.salary && `Compensation: ${job.salary}`,
    job.description && `Posting:\n${job.description}`,
    job.notes && `Candidate's notes: ${job.notes}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function describeStory(story: Story): string {
  return [
    `Title: ${story.title}`,
    story.competencies.length > 0 && `Competencies: ${story.competencies.join(', ')}`,
    `Situation: ${story.situation}`,
    `Task: ${story.task}`,
    `Action: ${story.action}`,
    `Result: ${story.result}`,
  ]
    .filter(Boolean)
    .join('\n')
}

export function describeRecentLearning(sessions: LearningSession[], skills: Skill[], limit = 15): string {
  const names = new Map(skills.map((s) => [s.id, s.name]))
  return sessions
    .slice(0, limit)
    .map((s) => `- ${s.date}: ${s.minutes} min on ${s.topic || names.get(s.skillId ?? '') || 'study'}${s.notes ? ` (${s.notes})` : ''}`)
    .join('\n')
}

const INSTRUCTIONS: Record<AssistantTask, string> = {
  match: `Assess how well I fit this job.

Respond with:
## Fit score
A score from 0–100 and one sentence explaining it.
## Where I'm strong
3–5 bullets mapping my real experience to specific requirements in the posting.
## Gaps
The requirements I don't clearly meet, each labelled **dealbreaker**, **learnable fast** or **nice-to-have**, with how to address it.
## Talking points
3 things to emphasize in my application and interviews.
## Verdict
Should I apply? One short paragraph.`,

  resume: `Rewrite my experience as resume bullets tailored to this job.

- 6–10 bullets, strongest first, each starting with a strong verb.
- Mirror the posting's vocabulary where it is honestly true for me.
- Use placeholders like [X%] where a metric would help and I haven't provided one.
Then add a 2-sentence professional summary tailored to the role, and a list of keywords from the posting I should make sure appear on my resume.`,

  cover: `Write a cover letter for this job.

- Under 250 words, three short paragraphs, no clichés ("I am writing to express my interest...").
- Open with something specific about the company or role, connect 2 of my real experiences to their needs, close with a confident ask.
After the letter, list any facts I should verify or personalize before sending.`,

  outreach: `Write two short outreach messages for this job: one to a recruiter and one to the likely hiring manager.

- Each under 90 words, friendly and specific, suitable for LinkedIn or email.
- Reference one concrete thing from my background that fits the role.
- End with a low-friction ask (a 15-minute chat or a referral pointer).`,

  plan: `Build me a focused 4-week learning plan.

Prioritize the skills with the biggest gap between my level and target, and anything the job posting (if given) requires that I lack.
For each week give: the goal, 3–5 concrete tasks (with free resources where you know good ones), and one small project or artifact I can show in interviews or on GitHub.
Assume about 5–7 hours per week unless my recent learning suggests otherwise. Finish with how I'll know I've leveled up.`,

  story: `Help me sharpen this behavioral interview story.

## Tightened STAR
Rewrite it in STAR form, under 200 words, first person, emphasizing my individual actions and a measurable result (use placeholders where I haven't given numbers).
## What's strong / what's weak
Short bullets.
## Follow-up questions
5 tough follow-up questions an interviewer is likely to ask, each with a one-line hint for answering.
## Also works for
Other common behavioral questions this story can answer.`,
}

export interface PromptInput {
  task: AssistantTask
  profile: Profile
  skills: Skill[]
  sessions: LearningSession[]
  skillMinutes?: Map<string, number>
  job?: Job
  story?: Story
}

export function buildPrompt({ task, profile, skills, sessions, skillMinutes, job, story }: PromptInput): string {
  const parts = [
    section('candidate_profile', describeProfile(profile) || 'No profile filled in yet.'),
    section('skills', describeSkills(skills, skillMinutes)),
    task === 'plan' ? section('recent_learning', describeRecentLearning(sessions, skills)) : '',
    job ? section('job', describeJob(job)) : '',
    story ? section('story', describeStory(story)) : '',
    INSTRUCTIONS[task],
  ]
  return parts.filter(Boolean).join('\n\n')
}

export function interviewSystemPrompt(job: Job, profile: Profile, skills: Skill[]): string {
  return `${SYSTEM_PROMPT}

You are now running a realistic mock interview for the job below. Act as the hiring manager.

Rules:
- Ask exactly one question per turn and wait for the answer.
- Mix behavioral, role-specific technical and motivation questions, adapting to the candidate's level.
- After each answer, give brief feedback under a "**Feedback:**" line (what worked, one thing to improve, a score out of 5), then ask the next question under a "**Next question:**" line.
- If the candidate says "end interview", stop asking questions and give an overall debrief: strengths, top 3 things to practice, and a hire/no-hire lean with reasoning.

${section('job', describeJob(job))}

${section('candidate_profile', describeProfile(profile) || 'No profile filled in yet.')}

${section('skills', describeSkills(skills))}`
}
