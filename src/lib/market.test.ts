import { describe, expect, it } from 'vitest'
import fixture from './market.fixture.json'
import { formatShare, isMarketReport, Market, normalizeSkill } from './market'

// a snapshot of a real jobpulse report (8 Oct 2026, 371 active postings)
const market = new Market(fixture)

describe('Market', () => {
  it('finds skills by name, case and common alias', () => {
    expect(market.find('python')?.rank).toBe(1)
    expect(market.find('K8s')?.skill).toBe('Kubernetes')
    expect(market.find('postgres')?.skill).toBe('PostgreSQL')
    expect(market.find('COBOL')).toBeUndefined()
  })

  it('lists companions as a share of the skill’s own postings', () => {
    const react = market.find('React')!
    const companions = market.companions('react', 3)
    expect(companions).toHaveLength(3)
    expect(companions[0].skill).toBe('TypeScript')
    expect(companions[0].share).toBeCloseTo(26 / react.postings)
    expect(companions.map((c) => c.share)).toEqual([...companions.map((c) => c.share)].sort((a, b) => b - a))
  })

  it('suggests the most requested skills you don’t have', () => {
    const missing = market.missing(['python', 'k8s', 'LLM'], 3).map((s) => s.skill)
    expect(missing).not.toContain('Python')
    expect(missing).not.toContain('Kubernetes')
    expect(missing).not.toContain('LLMs')
    expect(missing).toHaveLength(3)
  })

  it('finds market skills mentioned in a posting', () => {
    const found = market.mentionedIn('We use React and TypeScript, deploy with Docker on AWS. Java is not needed.').map((s) => s.skill)
    expect(found).toEqual(expect.arrayContaining(['React', 'TypeScript', 'Docker', 'AWS', 'Java']))
    expect(found).not.toContain('JavaScript')
  })
})

describe('helpers', () => {
  it('normalizes spelling', () => {
    expect(normalizeSkill('  Node.JS ')).toBe('node.js')
    expect(normalizeSkill('Golang')).toBe('go')
  })

  it('validates the report shape', () => {
    expect(isMarketReport(fixture)).toBe(true)
    expect(isMarketReport({ hello: 'world' })).toBe(false)
    expect(isMarketReport(null)).toBe(false)
  })

  it('formats shares', () => {
    expect(formatShare(0.4016)).toBe('40%')
    expect(formatShare(0.004)).toBe('<1%')
    expect(formatShare(0)).toBe('0%')
  })
})
