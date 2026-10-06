// Sample data for the "look around" button. Dates are relative to today.

import { addDays, timestamp, today } from './dates'
import { emptyState } from './storage'
import type { AppState, Job, LearningSession, Skill, Story } from './types'

export function sampleState(now = today()): AppState {
  const ts = timestamp()
  const d = (n: number) => addDays(now, n)

  const skills: Skill[] = [
    { id: 'sk-ts', name: 'TypeScript', category: 'Frontend', level: 3, target: 5, notes: 'Generics, narrowing, utility types' },
    { id: 'sk-react', name: 'React', category: 'Frontend', level: 3, target: 4, notes: '' },
    { id: 'sk-sql', name: 'SQL', category: 'Data', level: 2, target: 4, notes: 'Window functions next' },
    { id: 'sk-sd', name: 'System design', category: 'Architecture', level: 1, target: 4, notes: 'Caching, queues, consistency' },
    { id: 'sk-llm', name: 'LLM APIs', category: 'AI', level: 2, target: 4, notes: 'Streaming, tool use, evals' },
    { id: 'sk-comm', name: 'Communication', category: 'Soft skills', level: 4, target: 5, notes: '' },
  ]

  const topics: [string, string][] = [
    ['sk-ts', 'Generic constraints'],
    ['sk-sql', 'Window functions'],
    ['sk-sd', 'Designing a URL shortener'],
    ['sk-llm', 'Streaming responses'],
    ['sk-react', 'useReducer + context'],
    ['sk-sd', 'Rate limiter design'],
    ['sk-ts', 'Discriminated unions'],
  ]
  const sessions: LearningSession[] = []
  for (let i = 0; i < 90; i++) {
    // most days, with gaps, busier recently
    if ((i * 7) % 5 === 0 && i > 3) continue
    if (i > 45 && i % 3 !== 0) continue
    const [skillId, topic] = topics[i % topics.length]
    sessions.push({ id: `ls-${i}`, date: d(-i), minutes: 20 + ((i * 37) % 80), skillId, topic, notes: '' })
  }

  const job = (partial: Partial<Job> & Pick<Job, 'id' | 'company' | 'role' | 'stage'>): Job => ({
    url: '',
    location: 'Remote',
    salary: '',
    priority: 2,
    description: '',
    notes: '',
    contacts: '',
    tags: [],
    createdAt: ts,
    updatedAt: ts,
    events: [],
    ...partial,
  })

  const jobs: Job[] = [
    job({
      id: 'job-1',
      company: 'Northwind Labs',
      role: 'Frontend Engineer',
      stage: 'interview',
      priority: 1,
      salary: '€70–85k',
      appliedAt: d(-16),
      nextActionAt: d(2),
      tags: ['react', 'typescript'],
      description:
        'We are looking for a Frontend Engineer to build delightful product experiences with React and TypeScript. You will own features end to end, collaborate with design, write tests, and care about performance and accessibility. Nice to have: experience with LLM APIs, SQL, and design systems.',
      events: [
        { id: 'e1', date: d(-16), type: 'applied', note: 'Referral from Ana' },
        { id: 'e2', date: d(-9), type: 'response', note: 'Recruiter screen booked' },
        { id: 'e3', date: d(-4), type: 'interview', note: 'Tech screen went well; system design next' },
      ],
    }),
    job({ id: 'job-2', company: 'Atlas Health', role: 'Full-stack Developer', stage: 'applied', appliedAt: d(-11), events: [{ id: 'e4', date: d(-11), type: 'applied', note: '' }] }),
    job({ id: 'job-3', company: 'Brightwave', role: 'Software Engineer, AI Products', stage: 'applied', priority: 1, appliedAt: d(-3), events: [{ id: 'e5', date: d(-3), type: 'applied', note: '' }] }),
    job({ id: 'job-4', company: 'Kite & Co', role: 'React Developer', stage: 'wishlist', priority: 3 }),
    job({ id: 'job-5', company: 'Polar Data', role: 'Junior Data Engineer', stage: 'wishlist' }),
    job({
      id: 'job-6',
      company: 'Quanta',
      role: 'Frontend Developer',
      stage: 'rejected',
      appliedAt: d(-30),
      events: [
        { id: 'e6', date: d(-30), type: 'applied', note: '' },
        { id: 'e7', date: d(-20), type: 'rejected', note: 'Went with a more senior candidate' },
      ],
    }),
    job({ id: 'job-7', company: 'Lumen', role: 'Software Engineer', stage: 'applied', appliedAt: d(-1), events: [{ id: 'e8', date: d(-1), type: 'applied', note: '' }] }),
  ]

  const stories: Story[] = [
    {
      id: 'st-1',
      title: 'Rescued a slipping launch',
      competencies: ['Ownership', 'Prioritization'],
      situation: 'Two weeks before a client launch our checkout flow had 14 open bugs and the lead dev was out sick.',
      task: 'I volunteered to coordinate the fixes and make the go/no-go call.',
      action: 'Triaged bugs by revenue impact, paired with QA daily, cut two non-essential features after agreeing it with the client.',
      result: 'Launched on time with zero critical bugs; conversion was [X%] above the old flow in the first month.',
      createdAt: ts,
    },
  ]

  return {
    ...emptyState(),
    profile: {
      name: 'Alex Demo',
      headline: 'Frontend developer moving toward AI-powered products',
      targetRoles: 'Frontend Engineer, Full-stack Engineer, AI Product Engineer',
      location: 'Remote / Europe',
      summary: '3 years building web apps with React and TypeScript; currently learning LLM APIs and system design.',
      experience:
        'Web Developer, Studio Example (2022–now): Built e-commerce frontends in React/TypeScript for 10+ clients; introduced component library and testing.\nJunior Developer, Example Agency (2021–2022): Maintained marketing sites, migrated jQuery widgets to React.',
      links: 'github.com/your-handle',
    },
    jobs,
    skills,
    sessions,
    stories,
  }
}
