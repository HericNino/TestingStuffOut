import { useState } from 'react'
import { Field, Modal } from '../components/ui'
import { keywordMatch } from '../lib/analytics'
import { daysBetween, formatDay, timestamp, today } from '../lib/dates'
import { uid } from '../lib/id'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'
import { STAGES, type Job, type JobEvent, type JobEventType, type Stage } from '../lib/types'

function newJob(stage: Stage = 'wishlist'): Job {
  const ts = timestamp()
  return {
    id: uid(),
    company: '',
    role: '',
    url: '',
    location: '',
    salary: '',
    stage,
    priority: 2,
    description: '',
    notes: '',
    contacts: '',
    tags: [],
    createdAt: ts,
    updatedAt: ts,
    events: [],
  }
}

export function Jobs({ openId }: { openId?: string }) {
  const { state, dispatch } = useStore()
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState<Job | null>(null)
  const [dragOver, setDragOver] = useState<Stage | null>(null)

  const editing = draft ?? (openId ? state.jobs.find((j) => j.id === openId) ?? null : null)
  const q = query.trim().toLowerCase()
  const visible = q
    ? state.jobs.filter((j) => `${j.company} ${j.role} ${j.tags.join(' ')} ${j.location}`.toLowerCase().includes(q))
    : state.jobs

  const move = (id: string, stage: Stage) =>
    dispatch({ type: 'job/move', id, stage, day: today(), now: timestamp() })

  const close = () => {
    setDraft(null)
    if (openId) navigate('jobs')
  }

  return (
    <div className="page page-wide">
      <header className="page-header">
        <div>
          <h1>Pipeline</h1>
          <p>Drag a card to another column when something changes. The move is noted on the job's timeline.</p>
        </div>
        <div className="row">
          <input className="input search" placeholder="Filter by company, role or tag" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className="btn primary" onClick={() => setDraft(newJob())}>
            Add a job
          </button>
        </div>
      </header>

      <div className="board">
        {STAGES.map((stage) => {
          const jobs = visible
            .filter((j) => j.stage === stage.id)
            .sort((a, b) => a.priority - b.priority || b.updatedAt.localeCompare(a.updatedAt))
          return (
            <section
              key={stage.id}
              className={`column column-${stage.id}${dragOver === stage.id ? ' drop' : ''}`}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(stage.id)
              }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(null)
                const id = e.dataTransfer.getData('text/plain')
                if (id) move(id, stage.id)
              }}
            >
              <header className="column-header">
                <span className="label">{stage.label}</span>
                <span className="muted small num">{jobs.length}</span>
              </header>
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} onOpen={() => navigate('jobs', job.id)} onMove={(s) => move(job.id, s)} />
              ))}
              {stage.id === 'wishlist' && (
                <button className="btn ghost add-card" onClick={() => setDraft(newJob('wishlist'))}>
                  + Save a posting
                </button>
              )}
            </section>
          )
        })}
      </div>

      {editing && (
        <JobEditor
          key={editing.id}
          job={editing}
          isNew={!state.jobs.some((j) => j.id === editing.id)}
          onSave={(job) => {
            dispatch({ type: 'job/upsert', job: { ...job, updatedAt: timestamp() } })
            close()
          }}
          onDelete={() => {
            if (confirm(`Delete ${editing.company || 'this job'}?`)) {
              dispatch({ type: 'job/delete', id: editing.id })
              close()
            }
          }}
          onClose={close}
        />
      )}
    </div>
  )
}

function JobCard({ job, onOpen, onMove }: { job: Job; onOpen: () => void; onMove: (s: Stage) => void }) {
  const age = job.appliedAt ? daysBetween(job.appliedAt, today()) : null
  return (
    <article
      className="job-card"
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', job.id)}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      tabIndex={0}
    >
      <div className="job-company">{job.company || 'Untitled'}</div>
      <div className="job-role">{job.role}</div>
      <div className="job-meta">
        {job.priority === 1 && <span className="top-pick">Top pick</span>}
        {job.location && <span>{job.location}</span>}
        {age !== null && <span>{age === 0 ? 'applied today' : `applied ${age}d ago`}</span>}
      </div>
      {job.tags.length > 0 && (
        <div className="tags">
          {job.tags.map((t) => (
            <span key={t} className="tag">
              {t}
            </span>
          ))}
        </div>
      )}
      <select
        className="stage-select"
        value={job.stage}
        aria-label="Move to stage"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onMove(e.target.value as Stage)}
      >
        {STAGES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>
    </article>
  )
}

const EVENT_TYPES: JobEventType[] = ['note', 'applied', 'follow-up', 'response', 'interview', 'offer', 'rejected']

function JobEditor({
  job,
  isNew,
  onSave,
  onDelete,
  onClose,
}: {
  job: Job
  isNew: boolean
  onSave: (job: Job) => void
  onDelete: () => void
  onClose: () => void
}) {
  const { state } = useStore()
  const [form, setForm] = useState(job)
  const [tagText, setTagText] = useState(job.tags.join(', '))
  const [event, setEvent] = useState<JobEvent>({ id: '', date: today(), type: 'note', note: '' })
  const set = <K extends keyof Job>(key: K, value: Job[K]) => setForm((f) => ({ ...f, [key]: value }))
  const match = form.description ? keywordMatch(form.description, state.skills) : null

  const save = () =>
    onSave({
      ...form,
      tags: tagText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    })

  return (
    <Modal title={isNew ? 'Add job' : `${job.company} · ${job.role}`} onClose={onClose} wide>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
      >
        <div className="form-grid">
          <Field label="Company">
            <input className="input" required autoFocus={isNew} value={form.company} onChange={(e) => set('company', e.target.value)} />
          </Field>
          <Field label="Role">
            <input className="input" required value={form.role} onChange={(e) => set('role', e.target.value)} />
          </Field>
          <Field label="Stage">
            <select className="input" value={form.stage} onChange={(e) => set('stage', e.target.value as Stage)}>
              {STAGES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority">
            <select className="input" value={form.priority} onChange={(e) => set('priority', Number(e.target.value) as Job['priority'])}>
              <option value={1}>Top pick</option>
              <option value={2}>Good fit</option>
              <option value={3}>Long shot</option>
            </select>
          </Field>
          <Field label="Location">
            <input className="input" value={form.location} onChange={(e) => set('location', e.target.value)} />
          </Field>
          <Field label="Compensation">
            <input className="input" value={form.salary} onChange={(e) => set('salary', e.target.value)} />
          </Field>
          <Field label="Applied on">
            <input className="input" type="date" value={form.appliedAt ?? ''} onChange={(e) => set('appliedAt', e.target.value || undefined)} />
          </Field>
          <Field label="Next action on" hint="Shows up on the dashboard when due">
            <input className="input" type="date" value={form.nextActionAt ?? ''} onChange={(e) => set('nextActionAt', e.target.value || undefined)} />
          </Field>
        </div>
        <Field label="Posting URL">
          <input className="input" type="url" value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://…" />
        </Field>
        <Field label="Tags" hint="Comma separated">
          <input className="input" value={tagText} onChange={(e) => setTagText(e.target.value)} />
        </Field>
        <Field label="Job description" hint="Paste the whole posting. The assistant works from it.">
          <textarea className="input" rows={6} value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
        {match && state.skills.length > 0 && (
          <div className="match">
            <span className="muted small">Mentions your skills:</span>
            {match.matched.length ? (
              match.matched.map((s) => (
                <span key={s.id} className="tag tag-good">
                  {s.name}
                </span>
              ))
            ) : (
              <span className="muted small">none by name. The assistant's fit check reads it more carefully.</span>
            )}
          </div>
        )}
        <div className="form-grid">
          <Field label="Contacts">
            <textarea className="input" rows={3} value={form.contacts} onChange={(e) => set('contacts', e.target.value)} />
          </Field>
          <Field label="Notes">
            <textarea className="input" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </Field>
        </div>

        <h3>Timeline</h3>
        <ul className="timeline">
          {[...form.events]
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((e) => (
              <li key={e.id}>
                <span className={`status event-${e.type}`}>{e.type}</span>
                <span className="muted small">{formatDay(e.date)}</span>
                <span>{e.note}</span>
                <button type="button" className="icon-btn" aria-label="Remove event" onClick={() => set('events', form.events.filter((x) => x.id !== e.id))}>
                  ×
                </button>
              </li>
            ))}
        </ul>
        <div className="row event-add">
          <select className="input" value={event.type} onChange={(e) => setEvent({ ...event, type: e.target.value as JobEventType })}>
            {EVENT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
          <input className="input" type="date" value={event.date} onChange={(e) => setEvent({ ...event, date: e.target.value })} />
          <input className="input grow" placeholder="What happened?" value={event.note} onChange={(e) => setEvent({ ...event, note: e.target.value })} />
          <button
            type="button"
            className="btn"
            onClick={() => {
              set('events', [...form.events, { ...event, id: uid() }])
              setEvent({ ...event, note: '' })
            }}
          >
            Log
          </button>
        </div>

        <footer className="form-footer">
          {!isNew && (
            <button type="button" className="btn danger" onClick={onDelete}>
              Delete
            </button>
          )}
          {!isNew && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                save()
                navigate('assistant', job.id)
              }}
            >
              Draft with assistant
            </button>
          )}
          <span className="grow" />
          <button type="button" className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary">
            Save
          </button>
        </footer>
      </form>
    </Modal>
  )
}
