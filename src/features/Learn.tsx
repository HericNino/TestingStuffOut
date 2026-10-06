import { useState } from 'react'
import { Heatmap } from '../components/Heatmap'
import { Dots, Empty, Field, Figure, Modal, Section } from '../components/ui'
import { learningStreak, longestStreak, minutesBySkill, minutesThisWeek } from '../lib/analytics'
import { formatDay, today } from '../lib/dates'
import { uid } from '../lib/id'
import { useStore } from '../lib/store'
import type { Skill } from '../lib/types'

const hours = (minutes: number) => Math.round(minutes / 6) / 10

export function Learn() {
  const { state, dispatch } = useStore()
  const now = today()
  const [skillDraft, setSkillDraft] = useState<Skill | null>(null)
  const [log, setLog] = useState({ date: now, minutes: 30, skillId: '', topic: '', notes: '' })
  const perSkill = minutesBySkill(state.sessions)
  const totalMinutes = state.sessions.reduce((sum, s) => sum + s.minutes, 0)
  const skillName = new Map(state.skills.map((s) => [s.id, s.name]))
  const categories = [...new Set(state.skills.map((s) => s.category || 'Other'))].sort()

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Learning</h1>
          <p>Short sessions, most days. Write down what you did so you can point to it later.</p>
        </div>
      </header>

      <div className="figures">
        <Figure label="Days in a row" value={learningStreak(state.sessions, now)} highlight />
        <Figure label="Longest run" value={longestStreak(state.sessions)} unit="days" />
        <Figure label="This week" value={hours(minutesThisWeek(state.sessions, now))} unit="h" detail={`goal ${hours(state.goals.weeklyLearningMinutes)}h`} />
        <Figure label="In total" value={hours(totalMinutes)} unit="h" detail={`${state.sessions.length} sessions`} />
      </div>

      <Section title="Log a session">
        <form
          className="row wrap log-form"
          onSubmit={(e) => {
            e.preventDefault()
            if (log.minutes <= 0) return
            dispatch({
              type: 'session/add',
              session: { id: uid(), date: log.date, minutes: log.minutes, skillId: log.skillId || undefined, topic: log.topic, notes: log.notes },
            })
            setLog({ ...log, topic: '', notes: '' })
          }}
        >
          <input className="input" type="date" value={log.date} max={now} onChange={(e) => setLog({ ...log, date: e.target.value })} aria-label="Date" />
          <input
            className="input narrow"
            type="number"
            min={5}
            step={5}
            value={log.minutes}
            onChange={(e) => setLog({ ...log, minutes: Number(e.target.value) })}
            aria-label="Minutes"
          />
          <span className="muted">minutes on</span>
          <select className="input" value={log.skillId} onChange={(e) => setLog({ ...log, skillId: e.target.value })} aria-label="Skill">
            <option value="">no particular skill</option>
            {state.skills.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <input className="input grow" placeholder="What did you work on?" value={log.topic} onChange={(e) => setLog({ ...log, topic: e.target.value })} />
          <button className="btn primary" type="submit">
            Save
          </button>
        </form>
        <Heatmap sessions={state.sessions} now={now} />
      </Section>

      <div className="columns">
        <Section
          title="Skills"
          aside={
            <button className="btn small" onClick={() => setSkillDraft({ id: uid(), name: '', category: '', level: 1, target: 3, notes: '' })}>
              Add a skill
            </button>
          }
        >
          {state.skills.length === 0 ? (
            <Empty title="No skills yet.">Add what your target roles ask for, rate yourself honestly, and pick a level to aim for.</Empty>
          ) : (
            categories.map((cat) => (
              <div key={cat} className="skill-group">
                <h3>{cat}</h3>
                {state.skills
                  .filter((s) => (s.category || 'Other') === cat)
                  .map((skill) => (
                    <div key={skill.id} className="skill-row">
                      <button className="link" onClick={() => setSkillDraft(skill)}>
                        {skill.name}
                      </button>
                      <Dots
                        label="Level"
                        value={skill.level}
                        onChange={(level) => dispatch({ type: 'skill/upsert', skill: { ...skill, level } })}
                      />
                      <span className="muted small num skill-meta" title={`Target level ${skill.target}`}>
                        aim {skill.target}, {hours(perSkill.get(skill.id) ?? 0)}h
                      </span>
                    </div>
                  ))}
              </div>
            ))
          )}
        </Section>

        <Section title="Recent sessions">
          {state.sessions.length === 0 ? (
            <Empty title="Nothing logged yet.">Fifteen minutes counts. Write it down.</Empty>
          ) : (
            <ul className="list">
              {[...state.sessions]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 12)
                .map((s) => (
                  <li key={s.id} className="list-item">
                    <span>
                      {s.topic || skillName.get(s.skillId ?? '') || 'Study'}
                      <span className="muted small">
                        {' '}
                        {s.minutes} min{s.skillId && s.topic ? `, ${skillName.get(s.skillId)}` : ''}
                      </span>
                    </span>
                    <span className="row">
                      <span className="muted small">{formatDay(s.date)}</span>
                      <button className="icon-btn" aria-label="Delete session" onClick={() => dispatch({ type: 'session/delete', id: s.id })}>
                        ×
                      </button>
                    </span>
                  </li>
                ))}
            </ul>
          )}
        </Section>
      </div>

      {skillDraft && (
        <SkillEditor
          skill={skillDraft}
          isNew={!state.skills.some((s) => s.id === skillDraft.id)}
          categories={categories}
          onSave={(skill) => {
            dispatch({ type: 'skill/upsert', skill })
            setSkillDraft(null)
          }}
          onDelete={() => {
            dispatch({ type: 'skill/delete', id: skillDraft.id })
            setSkillDraft(null)
          }}
          onClose={() => setSkillDraft(null)}
        />
      )}
    </div>
  )
}

function SkillEditor({
  skill,
  isNew,
  categories,
  onSave,
  onDelete,
  onClose,
}: {
  skill: Skill
  isNew: boolean
  categories: string[]
  onSave: (s: Skill) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [form, setForm] = useState(skill)
  return (
    <Modal title={isNew ? 'Add skill' : skill.name} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          onSave(form)
        }}
      >
        <Field label="Skill">
          <input className="input" required autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. TypeScript" />
        </Field>
        <Field label="Category">
          <input className="input" list="skill-categories" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          <datalist id="skill-categories">
            {categories.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <div className="form-grid">
          <Field group label="Where you are" hint="1 heard of it, 3 productive, 5 could teach it">
            <Dots label="Level" value={form.level} onChange={(level) => setForm({ ...form, level })} />
          </Field>
          <Field group label="Where you want to be">
            <Dots label="Target" value={form.target} onChange={(target) => setForm({ ...form, target })} />
          </Field>
        </div>
        <Field label="Notes">
          <textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </Field>
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
