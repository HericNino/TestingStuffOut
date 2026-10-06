// Small Markdown parser for assistant replies. It returns a tree that React
// renders directly, so model output never goes through innerHTML.

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'strong'; children: Inline[] }
  | { type: 'em'; children: Inline[] }
  | { type: 'code'; text: string }
  | { type: 'link'; href: string; children: Inline[] }

export type Block =
  | { type: 'heading'; level: 1 | 2 | 3 | 4; children: Inline[] }
  | { type: 'paragraph'; children: Inline[] }
  | { type: 'list'; ordered: boolean; items: Inline[][] }
  | { type: 'code'; lang: string; text: string }
  | { type: 'quote'; children: Inline[] }
  | { type: 'rule' }

const INLINE = /(\*\*([^*]+)\*\*)|(`([^`]+)`)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(\*([^*\s][^*]*)\*)|(_([^_\s][^_]*)_)/

export function parseInline(src: string): Inline[] {
  const out: Inline[] = []
  let rest = src
  while (rest) {
    const m = INLINE.exec(rest)
    if (!m) {
      out.push({ type: 'text', text: rest })
      break
    }
    if (m.index > 0) out.push({ type: 'text', text: rest.slice(0, m.index) })
    if (m[1]) out.push({ type: 'strong', children: parseInline(m[2]) })
    else if (m[3]) out.push({ type: 'code', text: m[4] })
    else if (m[5]) out.push({ type: 'link', href: m[7], children: parseInline(m[6]) })
    else if (m[8]) out.push({ type: 'em', children: parseInline(m[9]) })
    else if (m[10]) out.push({ type: 'em', children: parseInline(m[11]) })
    rest = rest.slice(m.index + m[0].length)
  }
  return out
}

const BULLET = /^\s*[-*+]\s+(.*)$/
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/

export function parseMarkdown(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const blocks: Block[] = []
  let para: string[] = []

  const flush = () => {
    if (para.length) blocks.push({ type: 'paragraph', children: parseInline(para.join(' ')) })
    para = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const fence = /^```(\w*)/.exec(line)
    if (fence) {
      flush()
      const body: string[] = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) body.push(lines[i++])
      blocks.push({ type: 'code', lang: fence[1], text: body.join('\n') })
      continue
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line)
    if (heading) {
      flush()
      blocks.push({ type: 'heading', level: heading[1].length as 1 | 2 | 3 | 4, children: parseInline(heading[2]) })
      continue
    }

    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
      flush()
      blocks.push({ type: 'rule' })
      continue
    }

    if (line.startsWith('>')) {
      flush()
      blocks.push({ type: 'quote', children: parseInline(line.replace(/^>\s?/, '')) })
      continue
    }

    const bullet = BULLET.exec(line)
    const numbered = NUMBERED.exec(line)
    if (bullet || numbered) {
      flush()
      const ordered = !bullet
      const pattern = ordered ? NUMBERED : BULLET
      const items: Inline[][] = []
      let j = i
      while (j < lines.length) {
        const m = pattern.exec(lines[j])
        if (m) {
          items.push(parseInline(m[1]))
        } else if (/^\s{2,}\S/.test(lines[j]) && items.length) {
          // indented continuation (or nested item) folds into the previous item
          items[items.length - 1].push({ type: 'text', text: ' ' }, ...parseInline(lines[j].trim().replace(/^[-*+]\s+/, '')))
        } else break
        j++
      }
      blocks.push({ type: 'list', ordered, items })
      i = j - 1
      continue
    }

    if (!line.trim()) flush()
    else para.push(line.trim())
  }
  flush()
  return blocks
}
