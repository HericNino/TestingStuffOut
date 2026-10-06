import type Anthropic from '@anthropic-ai/sdk'
import { useEffect, useRef, useState } from 'react'
import { Markdown } from '../components/Markdown'
import { Empty, Field, Section } from '../components/ui'
import { streamReply } from '../lib/ai'
import { minutesBySkill } from '../lib/analytics'
import { buildPrompt, interviewSystemPrompt, SYSTEM_PROMPT, TASKS, type AssistantTask } from '../lib/prompts'
import { navigate } from '../lib/router'
import { useStore } from '../lib/store'

type Mode = 'tasks' | 'interview'

/** Shared state machine for anything that streams from Claude. */
function useStreaming() {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const controller = useRef<AbortController | null>(null)

  useEffect(() => () => controller.current?.abort(), [])

  async function run<T>(fn: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> {
    controller.current?.abort()
    const c = new AbortController()
    controller.current = c
    setRunning(true)
    setError('')
    try {
      return await fn(c.signal)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return undefined
    } finally {
      if (controller.current === c) setRunning(false)
    }
  }

  return { running, error, run, stop: () => controller.current?.abort() }
}

export function Assistant({ param }: { param?: string }) {
  const { state } = useStore()
  const [mode, setMode] = useState<Mode>('tasks')
  const hasKey = Boolean(state.settings.apiKey)

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Assistant</h1>
          <p>Drafts and practice from Claude, based on your profile, your skills and the posting. Treat everything it writes as a first draft.</p>
        </div>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={mode === 'tasks'} className={mode === 'tasks' ? 'active' : ''} onClick={() => setMode('tasks')}>
            Drafts
          </button>
          <button role="tab" aria-selected={mode === 'interview'} className={mode === 'interview' ? 'active' : ''} onClick={() => setMode('interview')}>
            Mock interview
          </button>
        </div>
      </header>

      {!hasKey && (
        <div className="notice">
          The assistant needs an Anthropic API key. Add one on the{' '}
          <button className="link" onClick={() => navigate('profile')}>
            Profile page
          </button>
          ; it stays in this browser. You can create a key at{' '}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer">
            console.anthropic.com
          </a>
          .
        </div>
      )}

      {mode === 'tasks' ? <TaskRunner param={param} /> : <MockInterview initialJobId={param && !param.startsWith('story:') ? param : undefined} />}
    </div>
  )
}

function TaskRunner({ param }: { param?: string }) {
  const { state, dispatch } = useStore()
  const initialStory = param?.startsWith('story:') ? param.slice(6) : ''
  const initialJob = param && !initialStory ? param : ''
  const [task, setTask] = useState<AssistantTask>(initialStory ? 'story' : 'match')
  const [jobId, setJobId] = useState(initialJob || state.jobs.find((j) => j.description)?.id || '')
  const [storyId, setStoryId] = useState(initialStory || state.stories[0]?.id || '')
  const [output, setOutput] = useState('')
  const [meta, setMeta] = useState('')
  const [copied, setCopied] = useState(false)
  const { running, error, run, stop } = useStreaming()

  const spec = TASKS.find((t) => t.id === task)!
  const job = state.jobs.find((j) => j.id === jobId)
  const story = state.stories.find((s) => s.id === storyId)
  const missing = spec.needsJob && !job ? 'Pick a job first.' : spec.needsStory && !story ? 'Pick a story first.' : ''

  const generate = () =>
    run(async (signal) => {
      setOutput('')
      setMeta('')
      const prompt = buildPrompt({
        task,
        profile: state.profile,
        skills: state.skills,
        sessions: state.sessions,
        skillMinutes: minutesBySkill(state.sessions),
        job: spec.needsJob || task === 'plan' ? job : undefined,
        story: spec.needsStory ? story : undefined,
      })
      const result = await streamReply({
        settings: state.settings,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: prompt }],
        onText: setOutput,
        signal,
      })
      setMeta(`${result.model} · ${result.usage.input.toLocaleString()} in / ${result.usage.output.toLocaleString()} out tokens`)
    })

  return (
    <div className="columns assistant">
      <div>
        <h3 className="subhead flush">What do you need?</h3>
        <div className="task-list">
          {TASKS.map((t) => (
            <button key={t.id} className={`task${t.id === task ? ' active' : ''}`} onClick={() => setTask(t.id)}>
              <strong>{t.label}</strong>
              <span className="muted small">{t.blurb}</span>
            </button>
          ))}
        </div>
        {(spec.needsJob || task === 'plan') && (
          <Field label={spec.needsJob ? 'Job' : 'Job (optional)'}>
            <select className="input" value={jobId} onChange={(e) => setJobId(e.target.value)}>
              <option value="">{state.jobs.length ? 'Choose a job…' : 'No jobs yet: add one in Pipeline'}</option>
              {state.jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.company} · {j.role}
                  {j.description ? '' : ' (no description)'}
                </option>
              ))}
            </select>
          </Field>
        )}
        {job && !job.description && spec.needsJob && (
          <p className="muted small">This job has no description yet. Paste the posting into it first; the results are much better.</p>
        )}
        {spec.needsStory && (
          <Field label="Story">
            <select className="input" value={storyId} onChange={(e) => setStoryId(e.target.value)}>
              <option value="">{state.stories.length ? 'Choose a story…' : 'No stories yet: add one in Stories'}</option>
              {state.stories.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </Field>
        )}
        <div className="row">
          {running ? (
            <button className="btn" onClick={stop}>
              Stop
            </button>
          ) : (
            <button className="btn primary" disabled={Boolean(missing) || !state.settings.apiKey} onClick={generate}>
              Write it
            </button>
          )}
          {missing && <span className="muted small">{missing}</span>}
        </div>
      </div>

      <Section
        className="output"
        title={spec.label}
        aside={
          output &&
          !running && (
            <div className="row">
              <button
                className="btn small"
                onClick={async () => {
                  await navigator.clipboard.writeText(output)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1500)
                }}
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
              {job && spec.needsJob && (
                <button
                  className="btn small"
                  onClick={() =>
                    dispatch({
                      type: 'job/upsert',
                      job: { ...job, notes: `${job.notes}\n\n--- ${spec.label} (${new Date().toLocaleDateString()}) ---\n${output}`.trim() },
                    })
                  }
                >
                  Save to job notes
                </button>
              )}
            </div>
          )
        }
      >
        {error && <div className="error">{error}</div>}
        {output ? (
          <>
            <Markdown source={output} />
            {running && <span className="cursor" />}
            {meta && <p className="muted small meta">{meta}</p>}
          </>
        ) : running ? (
          <p className="muted thinking">Reading your profile and the posting…</p>
        ) : (
          <Empty title="Nothing here yet.">Pick what you need on the left. A filled-in profile and the full job posting make a big difference.</Empty>
        )}
      </Section>
    </div>
  )
}

function MockInterview({ initialJobId }: { initialJobId?: string }) {
  const { state } = useStore()
  const [jobId, setJobId] = useState(initialJobId || state.jobs.find((j) => j.stage === 'interview')?.id || state.jobs[0]?.id || '')
  const [messages, setMessages] = useState<Anthropic.MessageParam[]>([])
  const [draft, setDraft] = useState('')
  const [streaming, setStreaming] = useState('')
  const { running, error, run, stop } = useStreaming()
  const bottom = useRef<HTMLDivElement>(null)
  const job = state.jobs.find((j) => j.id === jobId)

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, streaming])

  const send = async (content: string) => {
    if (!job) return
    const previous = messages
    const history: Anthropic.MessageParam[] = [...previous, { role: 'user', content }]
    setMessages(history)
    setDraft('')
    const ok = await run(async (signal) => {
      setStreaming('')
      const result = await streamReply({
        settings: state.settings,
        system: interviewSystemPrompt(job, state.profile, state.skills),
        messages: history,
        onText: setStreaming,
        signal,
      })
      setMessages([...history, { role: 'assistant', content: result.text }])
      return true
    })
    setStreaming('')
    if (!ok) {
      // The API needs alternating turns: roll back the unanswered message and
      // put it back in the box so nothing typed is lost.
      setMessages(previous)
      if (previous.length) setDraft(content)
    }
  }

  const text = (m: Anthropic.MessageParam) => (typeof m.content === 'string' ? m.content : '')

  if (messages.length === 0) {
    return (
      <section className="interview-setup">
        <h2>Practice for a specific interview</h2>
        <p>
          Claude plays the hiring manager for the job you choose. It asks one question at a time and gives short feedback on
          each answer. Finish whenever you like to get an overall debrief.
        </p>
        <Field label="Job">
          <select className="input" value={jobId} onChange={(e) => setJobId(e.target.value)}>
            <option value="">{state.jobs.length ? 'Choose a job…' : 'No jobs yet: add one in Pipeline'}</option>
            {state.jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.company} · {j.role}
              </option>
            ))}
          </select>
        </Field>
        {error && <div className="error">{error}</div>}
        <button className="btn primary" disabled={!job || !state.settings.apiKey} onClick={() => send('Hello, I am ready. Please introduce yourself briefly and ask your first question.')}>
          Begin
        </button>
      </section>
    )
  }

  return (
    <section className="chat">
      <div className="section-head">
        <h2>
          {job?.role} at {job?.company}
        </h2>
        <button
          className="btn small"
          onClick={() => {
            stop()
            setMessages([])
            setStreaming('')
          }}
        >
          Start over
        </button>
      </div>
      <div className="chat-log">
        {messages.slice(1).map((m, i) => (
          <div key={i} className={`turn ${m.role}`}>
            <span className="label turn-who">{m.role === 'assistant' ? 'Interviewer' : 'You'}</span>
            <div className="turn-body">{m.role === 'assistant' ? <Markdown source={text(m)} /> : <p>{text(m)}</p>}</div>
          </div>
        ))}
        {running && (
          <div className="turn assistant">
            <span className="label turn-who">Interviewer</span>
            <div className="turn-body">{streaming ? <Markdown source={streaming} /> : <p className="muted thinking">…</p>}</div>
          </div>
        )}
        <div ref={bottom} />
      </div>
      {error && <div className="error">{error}</div>}
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault()
          if (draft.trim() && !running) send(draft.trim())
        }}
      >
        <textarea
          className="input grow"
          rows={3}
          value={draft}
          placeholder="Your answer. Ctrl+Enter sends it."
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              if (draft.trim() && !running) send(draft.trim())
            }
          }}
        />
        <div className="chat-actions">
          <button type="submit" className="btn primary" disabled={running || !draft.trim()}>
            Send
          </button>
          <button type="button" className="btn ghost small" disabled={running} onClick={() => send('end interview')}>
            Finish and get feedback
          </button>
        </div>
      </form>
    </section>
  )
}
