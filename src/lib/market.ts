// Job-market numbers from jobpulse (github.com/HericNino/jobpulse), which publishes a
// daily report of which skills tech postings ask for. Everything here is pure, so
// the views stay thin and the logic is tested.

import { mentionsIn } from './analytics'

export const DEFAULT_MARKET_URL = 'https://hericnino.github.io/jobpulse/data/report.json'

export interface MarketSkill {
  skill: string
  category: string
  postings: number
  companies: number
  share: number
}

export interface MarketReport {
  as_of: string | null
  summary: { active: number }
  top_skills: MarketSkill[]
  pairs: { a: string; b: string; postings: number }[]
}

export interface RankedSkill extends MarketSkill {
  rank: number
}

// the spellings people actually type for skills jobpulse names differently
const ALIASES: Record<string, string> = {
  k8s: 'kubernetes',
  postgres: 'postgresql',
  psql: 'postgresql',
  js: 'javascript',
  ts: 'typescript',
  golang: 'go',
  reactjs: 'react',
  'react.js': 'react',
  nodejs: 'node.js',
  node: 'node.js',
  'vue.js': 'vue',
  vuejs: 'vue',
  nextjs: 'next.js',
  csharp: 'c#',
  dotnet: '.net',
  'amazon web services': 'aws',
  'google cloud': 'gcp',
  ml: 'machine learning',
  llm: 'llms',
  'llm apis': 'llms',
  'generative ai': 'llms',
  cicd: 'ci/cd',
  'ci cd': 'ci/cd',
}

export function normalizeSkill(name: string): string {
  const n = name.trim().toLowerCase().replace(/\s+/g, ' ')
  return ALIASES[n] ?? n
}

/** Whether a fetched JSON document looks like a jobpulse report. */
export function isMarketReport(value: unknown): value is MarketReport {
  const r = value as MarketReport
  return Boolean(r && typeof r === 'object' && Array.isArray(r.top_skills) && Array.isArray(r.pairs) && r.summary)
}

export class Market {
  readonly asOf: string | null
  readonly active: number
  private readonly report: MarketReport
  private readonly byName = new Map<string, RankedSkill>()

  constructor(report: MarketReport) {
    this.report = report
    this.asOf = report.as_of
    this.active = report.summary.active
    report.top_skills.forEach((s, i) => this.byName.set(normalizeSkill(s.skill), { ...s, rank: i + 1 }))
  }

  get skills(): RankedSkill[] {
    return [...this.byName.values()]
  }

  find(name: string): RankedSkill | undefined {
    return this.byName.get(normalizeSkill(name))
  }

  /** Skills most often asked for alongside `name`, as a share of the postings that mention it. */
  companions(name: string, limit = 5): { skill: string; share: number }[] {
    const own = this.find(name)
    if (!own) return []
    return this.report.pairs
      .filter((p) => p.a === own.skill || p.b === own.skill)
      .map((p) => ({ skill: p.a === own.skill ? p.b : p.a, share: p.postings / own.postings }))
      .sort((x, y) => y.share - x.share || x.skill.localeCompare(y.skill))
      .slice(0, limit)
  }

  /** The most requested skills that aren't in `have`. */
  missing(have: string[], limit = 5): RankedSkill[] {
    const owned = new Set(have.map(normalizeSkill))
    return this.skills.filter((s) => !owned.has(normalizeSkill(s.skill))).slice(0, limit)
  }

  /** Market skills named in a piece of text (e.g. a job posting), most requested first. */
  mentionedIn(text: string): RankedSkill[] {
    const mentions = mentionsIn(text)
    return this.skills.filter((s) => mentions(s.skill))
  }
}

export function formatShare(share: number): string {
  const pct = share * 100
  return pct > 0 && pct < 1 ? '<1%' : `${Math.round(pct)}%`
}
