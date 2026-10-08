import { useRef, useState } from 'react'
import { Field, Section } from '../components/ui'
import { today } from '../lib/dates'
import { DEFAULT_MARKET_URL } from '../lib/market'
import { useMarket } from '../lib/marketStore'
import { sampleState } from '../lib/sample'
import { emptyState, exportState, importState } from '../lib/storage'
import { useStore } from '../lib/store'
import type { Effort, Profile as ProfileT } from '../lib/types'

const MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (quicker, cheaper)' },
]

const EFFORTS: { id: Effort; label: string }[] = [
  { id: 'low', label: 'Low, for quick drafts' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High, more careful' },
  { id: 'xhigh', label: 'Very high, slowest' },
]

export function Profile() {
  const { state, dispatch } = useStore()
  const [showKey, setShowKey] = useState(false)
  const [message, setMessage] = useState('')
  const file = useRef<HTMLInputElement>(null)
  const p = state.profile
  const set = (key: keyof ProfileT) => (e: { target: { value: string } }) => dispatch({ type: 'profile/update', profile: { [key]: e.target.value } })

  const download = () => {
    const blob = new Blob([exportState(state)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `launchpad-backup-${today()}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Profile</h1>
          <p>The assistant works from what you write here, so be specific. Changes are saved as you type.</p>
        </div>
      </header>

      <Section title="About you">
        <div className="form-grid">
          <Field label="Name">
            <input className="input" value={p.name} onChange={set('name')} />
          </Field>
          <Field label="Headline">
            <input className="input" value={p.headline} onChange={set('headline')} placeholder="Frontend developer moving into AI products" />
          </Field>
          <Field label="Target roles">
            <input className="input" value={p.targetRoles} onChange={set('targetRoles')} />
          </Field>
          <Field label="Location / remote preference">
            <input className="input" value={p.location} onChange={set('location')} />
          </Field>
        </div>
        <Field label="Summary" hint="2–3 sentences: what you do, what you're great at, where you're heading.">
          <textarea className="input" rows={3} value={p.summary} onChange={set('summary')} />
        </Field>
        <Field label="Experience" hint="Paste your resume. Roles, dates, achievements. Plain text is fine.">
          <textarea className="input" rows={10} value={p.experience} onChange={set('experience')} />
        </Field>
        <Field label="Links">
          <input className="input" value={p.links} onChange={set('links')} placeholder="GitHub, LinkedIn, portfolio" />
        </Field>
      </Section>

      <div className="columns">
        <Section title="Weekly goals">
          <Field label="Applications per week">
            <input
              className="input"
              type="number"
              min={0}
              value={state.goals.weeklyApplications}
              onChange={(e) => dispatch({ type: 'goals/update', goals: { weeklyApplications: Number(e.target.value) } })}
            />
          </Field>
          <Field label="Learning hours per week">
            <input
              className="input"
              type="number"
              min={0}
              step={0.5}
              value={state.goals.weeklyLearningMinutes / 60}
              onChange={(e) => dispatch({ type: 'goals/update', goals: { weeklyLearningMinutes: Math.round(Number(e.target.value) * 60) } })}
            />
          </Field>
        </Section>

        <Section title="Assistant">
          <Field label="Anthropic API key" hint="Stored only in this browser and never included in backups.">
            <div className="row">
              <input
                className="input grow"
                type={showKey ? 'text' : 'password'}
                autoComplete="off"
                value={state.settings.apiKey}
                onChange={(e) => dispatch({ type: 'settings/update', settings: { apiKey: e.target.value.trim() } })}
                placeholder="sk-ant-…"
              />
              <button type="button" className="btn small" onClick={() => setShowKey(!showKey)}>
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </Field>
          <Field label="Model">
            <select className="input" value={state.settings.model} onChange={(e) => dispatch({ type: 'settings/update', settings: { model: e.target.value } })}>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Effort" hint="Higher effort takes longer and uses more tokens.">
            <select className="input" value={state.settings.effort} onChange={(e) => dispatch({ type: 'settings/update', settings: { effort: e.target.value as Effort } })}>
              {EFFORTS.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.label}
                </option>
              ))}
            </select>
          </Field>
        </Section>
      </div>

      <MarketData />

      <Section title="Your data">
        <p className="muted">
          Everything is kept in this browser's local storage. Export a backup now and then, or to move to another computer.
        </p>
        <div className="row wrap">
          <button className="btn" onClick={download}>
            Export backup
          </button>
          <button className="btn" onClick={() => file.current?.click()}>
            Import backup
          </button>
          <input
            ref={file}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              try {
                dispatch({ type: 'state/replace', state: importState(await f.text(), state) })
                setMessage('Backup imported.')
              } catch {
                setMessage('That file is not a valid Launchpad backup.')
              }
            }}
          />
          <button
            className="btn"
            onClick={() => {
              if (confirm('Replace your data with sample data?')) dispatch({ type: 'state/replace', state: { ...sampleState(), settings: state.settings } })
            }}
          >
            Load sample data
          </button>
          <button
            className="btn danger"
            onClick={() => {
              if (confirm('Erase all your Launchpad data in this browser? Export a backup first if unsure.'))
                dispatch({ type: 'state/replace', state: { ...emptyState(), settings: state.settings } })
            }}
          >
            Erase everything
          </button>
        </div>
        {message && <p className="muted small">{message}</p>}
      </Section>
    </div>
  )
}

const STATUS = {
  off: 'Off. Leave the address empty to keep it that way.',
  loading: 'Loading…',
  error: "Couldn't load the report. Check the address, or try again later.",
  ready: '',
}

function MarketData() {
  const { state, dispatch } = useStore()
  const { market, status, fetchedAt, refresh } = useMarket()
  const url = state.settings.marketUrl
  const save = (value: string) => {
    if (value.trim() !== url) dispatch({ type: 'settings/update', settings: { marketUrl: value.trim() } })
  }

  return (
    <Section title="Market data">
      <p className="muted">
        Learning and job pages compare your skills with what tech job postings ask for, using the daily report from{' '}
        <a href="https://hericnino.github.io/jobpulse/" target="_blank" rel="noreferrer">
          jobpulse
        </a>
        . Only the report is downloaded; nothing about you is sent anywhere.
      </p>
      <Field label="Report address" hint="Any jobpulse report.json. Clear it to turn market data off.">
        <div className="row">
          {/* keyed on the saved value so an import or reset shows up here */}
          <input
            key={url}
            className="input grow"
            type="url"
            defaultValue={url}
            onBlur={(e) => save(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && save(e.currentTarget.value)}
            placeholder={DEFAULT_MARKET_URL}
          />
          {url !== DEFAULT_MARKET_URL && (
            <button type="button" className="btn small" onClick={() => save(DEFAULT_MARKET_URL)}>
              Default
            </button>
          )}
        </div>
      </Field>
      <div className="row wrap">
        <p className="muted small grow">
          {market
            ? `${market.active} active postings as of ${market.asOf}${fetchedAt ? `, checked ${new Date(fetchedAt).toLocaleString()}` : ''}.`
            : STATUS[status]}
          {market && status !== 'ready' && ` ${STATUS[status]}`}
        </p>
        {url && (
          <button type="button" className="btn small" onClick={refresh} disabled={status === 'loading'}>
            Check now
          </button>
        )}
      </div>
    </Section>
  )
}
