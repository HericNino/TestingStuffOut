import { describe, expect, it } from 'vitest'
import { parseInline, parseMarkdown } from './markdown'

describe('parseInline', () => {
  it('handles bold, italic, code and links', () => {
    expect(parseInline('a **b** *c* `d` [e](https://x.dev)')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'strong', children: [{ type: 'text', text: 'b' }] },
      { type: 'text', text: ' ' },
      { type: 'em', children: [{ type: 'text', text: 'c' }] },
      { type: 'text', text: ' ' },
      { type: 'code', text: 'd' },
      { type: 'text', text: ' ' },
      { type: 'link', href: 'https://x.dev', children: [{ type: 'text', text: 'e' }] },
    ])
  })

  it('does not turn non-http links into anchors', () => {
    expect(parseInline('[x](javascript:alert(1))')).toEqual([{ type: 'text', text: '[x](javascript:alert(1))' }])
  })
})

describe('parseMarkdown', () => {
  it('parses headings, paragraphs, lists, code and rules', () => {
    const blocks = parseMarkdown(['## Fit score', '82/100. Strong', 'match.', '', '- one', '- two', '', '1. first', '2. second', '', '```ts', 'const x = 1', '```', '---', '> quoted'].join('\n'))
    expect(blocks.map((b) => b.type)).toEqual(['heading', 'paragraph', 'list', 'list', 'code', 'rule', 'quote'])
    expect(blocks[1]).toEqual({ type: 'paragraph', children: [{ type: 'text', text: '82/100. Strong match.' }] })
    expect(blocks[2]).toMatchObject({ ordered: false, items: [[{ text: 'one' }], [{ text: 'two' }]] })
    expect(blocks[3]).toMatchObject({ ordered: true })
    expect(blocks[4]).toEqual({ type: 'code', lang: 'ts', text: 'const x = 1' })
  })

  it('folds indented continuation lines into the item and flattens nested items', () => {
    const [list] = parseMarkdown('- parent\n  wraps here\n  - child')
    expect(list).toMatchObject({ type: 'list', items: [[{ text: 'parent' }, { text: ' ' }, { text: 'wraps here' }], [{ text: 'child' }]] })
  })

  it('survives an unterminated code fence mid-stream', () => {
    expect(parseMarkdown('```\npartial')).toEqual([{ type: 'code', lang: '', text: 'partial' }])
  })
})
