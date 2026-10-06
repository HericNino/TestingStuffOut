import { useMemo } from 'react'
import { parseMarkdown, type Inline } from '../lib/markdown'

function InlineNodes({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((node, i) => {
        switch (node.type) {
          case 'text':
            return node.text
          case 'strong':
            return (
              <strong key={i}>
                <InlineNodes nodes={node.children} />
              </strong>
            )
          case 'em':
            return (
              <em key={i}>
                <InlineNodes nodes={node.children} />
              </em>
            )
          case 'code':
            return <code key={i}>{node.text}</code>
          case 'link':
            return (
              <a key={i} href={node.href} target="_blank" rel="noreferrer noopener">
                <InlineNodes nodes={node.children} />
              </a>
            )
        }
      })}
    </>
  )
}

export function Markdown({ source }: { source: string }) {
  const blocks = useMemo(() => parseMarkdown(source), [source])
  return (
    <div className="markdown">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'heading': {
            const Tag = (['h3', 'h3', 'h4', 'h5'] as const)[block.level - 1]
            return (
              <Tag key={i}>
                <InlineNodes nodes={block.children} />
              </Tag>
            )
          }
          case 'paragraph':
            return (
              <p key={i}>
                <InlineNodes nodes={block.children} />
              </p>
            )
          case 'quote':
            return (
              <blockquote key={i}>
                <InlineNodes nodes={block.children} />
              </blockquote>
            )
          case 'list': {
            const Tag = block.ordered ? 'ol' : 'ul'
            return (
              <Tag key={i}>
                {block.items.map((item, j) => (
                  <li key={j}>
                    <InlineNodes nodes={item} />
                  </li>
                ))}
              </Tag>
            )
          }
          case 'code':
            return (
              <pre key={i}>
                <code>{block.text}</code>
              </pre>
            )
          case 'rule':
            return <hr key={i} />
        }
      })}
    </div>
  )
}
