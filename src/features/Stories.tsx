import { useState } from 'react'
import { Empty, Field, Modal, Section } from '../components/ui'
import { timestamp } from '../lib/dates'
import { uid } from '../lib/id'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import type { Story } from '../lib/types'

// Themes that behavioral interviews keep coming back to.
const COMPETENCIES = [
  'Leadership',
  'Ownership',
  'Conflict',
  'Failure',
  'Teamwork',
  'Prioritization',
  'Ambiguity',
  'Customer focus',
  'Influence',
  'Learning fast',
  'Technical depth',
]

function newStory(): Story {
  return { id: uid(), title: '', competencies: [], situation: '', task: '', action: '', result: '', createdAt: timestamp() }
}

export function Stories() {
  const { state, dispatch } = useStore()
  const [draft, setDraft] = useState<Story | null>(null)
  const [filter, setFilter] = useState<string | null>(null)

  const coverage = new Map(COMPETENCIES.map((c) => [c, state.stories.filter((s) => s.competencies.includes(c)).length]))
  const visible = filter ? state.stories.filter((s) => s.competencies.includes(filter)) : state.stories

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Stories</h1>
          <p>Most behavioral questions come back to a handful of moments from your work. Write each one down once, properly, and reuse it.</p>
        </div>
        <button className="btn primary" onClick={() => setDraft(newStory())}>
          Write a story
        </button>
      </header>

      <Section title="What they cover" aside={<span className="muted small">Two stories per theme is a good target</span>}>
        <div className="coverage">
          {COMPETENCIES.map((c) => {
            const n = coverage.get(c) ?? 0
            return (
              <button
                key={c}
                className={`chip cov-${Math.min(n, 2)}${filter === c ? ' active' : ''}`}
                onClick={() => setFilter(filter === c ? null : c)}
              >
                {c} <span className="chip-count">{n}</span>
              </button>
            )
          })}
        </div>
      </Section>

      {visible.length === 0 ? (
        <Empty title={filter ? `Nothing about ${filter.toLowerCase()} yet.` : 'No stories yet.'}>
          Start with a time you shipped something difficult, disagreed with someone, or got something wrong and fixed it.
        </Empty>
      ) : (
        <section className="stories">
          {visible.map((story) => (
            <article key={story.id} className="story">
              <div className="story-head">
                <h2>{story.title || 'Untitled'}</h2>
                <div className="row">
                  <button className="btn ghost small" onClick={() => navigate('assistant', `story:${story.id}`)}>
                    Get feedback
                  </button>
                  <button className="btn small" onClick={() => setDraft(story)}>
                    Edit
                  </button>
                </div>
              </div>
              <div className="tags">
                {story.competencies.map((c) => (
                  <span key={c} className="tag">
                    {c}
                  </span>
                ))}
              </div>
              <dl className="star">
                <dt>Situation</dt>
                <dd>{story.situation}</dd>
                <dt>Task</dt>
                <dd>{story.task}</dd>
                <dt>What I did</dt>
                <dd>{story.action}</dd>
                <dt>Result</dt>
                <dd>{story.result}</dd>
              </dl>
            </article>
          ))}
        </section>
      )}

      {draft && (
        <StoryEditor
          story={draft}
          isNew={!state.stories.some((s) => s.id === draft.id)}
          onSave={(story) => {
            dispatch({ type: 'story/upsert', story })
            setDraft(null)
          }}
          onDelete={() => {
            if (confirm('Delete this story?')) {
              dispatch({ type: 'story/delete', id: draft.id })
              setDraft(null)
            }
          }}
          onClose={() => setDraft(null)}
        />
      )}
    </div>
  )
}

function StoryEditor({
  story,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  story: Story
  isNew: boolean
  onSave: (s: Story) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [form, setForm] = useState(story)
  const toggle = (c: string) =>
    setForm({ ...form, competencies: form.competencies.includes(c) ? form.competencies.filter((x) => x !== c) : [...form.competencies, c] })
  const text = (key: 'situation' | 'task' | 'action' | 'result', label: string, hint: string) => (
    <Field label={label} hint={hint}>
      <textarea className="input" rows={3} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} />
    </Field>
  )

  return (
    <Modal title={isNew ? 'A new story' : story.title} onClose={onClose} wide>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
        }}
      >
        <Field label="Title">
          <input className="input" required autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Shipped the migration nobody wanted to own" />
        </Field>
        <Field group label="What it shows">
          <div className="coverage">
            {COMPETENCIES.map((c) => (
              <button key={c} type="button" className={`chip${form.competencies.includes(c) ? ' active' : ''}`} onClick={() => toggle(c)}>
                {c}
              </button>
            ))}
          </div>
        </Field>
        {text('situation', 'Situation', 'Context in one or two sentences. Where, when, what was at stake?')}
        {text('task', 'Task', 'What were you specifically responsible for?')}
        {text('action', 'What you did', 'Say "I", not "we". This should be the longest part.')}
        {text('result', 'Result', 'Outcome, ideally with a number. What did you learn?')}
        <footer className="form-footer">
          {!isNew && (
            <button type="button" className="btn danger" onClick={onDelete}>
              Delete
            </button>
          )}
          <span className="grow" />
          <button type="submit" className="btn primary">
            Save
          </button>
        </footer>
      </form>
    </Modal>
  )
}
