import { Heatmap } from '../components/Heatmap'
import { Empty, Figure, Progress, Section } from '../components/ui'
import {
  applicationsThisWeek,
  followUpsDue,
  learningStreak,
  longestStreak,
  minutesThisWeek,
  pipelineStats,
  skillGaps,
} from '../lib/analytics'
import { parseDay, relativeDay, today } from '../lib/dates'
import { navigate } from '../lib/router'
import { sampleState } from '../lib/sample'
import { formatShare } from '../lib/market'
import { useMarket } from '../lib/marketStore'
import { useStore } from '../lib/store'
import { STAGES } from '../lib/types'

const pct = (n: number) => Math.round(n * 100)

function greeting(hour = new Date().getHours()) {
  if (hour < 5) return 'Working late'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function Dashboard() {
  const { state, dispatch } = useStore()
  const now = today()
  const stats = pipelineStats(state.jobs)
  const followUps = followUpsDue(state.jobs, now)
  const streak = learningStreak(state.sessions, now)
  const weekMinutes = minutesThisWeek(state.sessions, now)
  const weekApps = applicationsThisWeek(state.jobs, now)
  const gaps = skillGaps(state.skills)
  const isEmpty = !state.jobs.length && !state.skills.length && !state.sessions.length && !state.stories.length
  const firstName = state.profile.name.split(' ')[0]
  const lastSession = state.sessions.map((s) => s.date).sort().at(-1)
  const { market } = useMarket()
  const date = parseDay(now).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="page">
      <header>
        <div className="eyebrow">{date}</div>
        <h1>
          {greeting()}
          {firstName ? `, ${firstName}` : ''}.
        </h1>
      </header>

      {isEmpty && (
        <div className="intro">
          <h2>A quiet place to run your job search</h2>
          <p>
            Keep track of applications, log what you study, collect interview stories, and draft tailored applications with
            an AI assistant. Nothing leaves this browser unless you use the assistant.
          </p>
          <div className="row wrap">
            <button className="btn primary" onClick={() => navigate('profile')}>
              Set up your profile
            </button>
            <button className="btn ghost" onClick={() => dispatch({ type: 'state/replace', state: { ...sampleState(), settings: state.settings } })}>
              Look around with sample data
            </button>
          </div>
        </div>
      )}

      <div className="figures">
        <Figure label="Open applications" value={stats.active} detail={`${stats.byStage.interview} interviewing, ${stats.byStage.offer} offers`} />
        <Figure label="Reply rate" value={pct(stats.responseRate)} unit="%" detail={`${pct(stats.interviewRate)}% reach an interview`} />
        <Figure label="Days in a row studying" value={streak} detail={`Longest run: ${longestStreak(state.sessions)}`} highlight={streak >= 3} />
        <Figure label="Follow-ups due" value={followUps.length} detail={followUps.length ? 'A short note is enough' : 'Nothing waiting'} />
      </div>

      <div className="columns">
        <Section title="This week">
          <div className="goal">
            <div className="goal-row">
              <span>Applications sent</span>
              <span className="muted num">
                {weekApps} of {state.goals.weeklyApplications}
              </span>
            </div>
            <Progress value={weekApps} max={state.goals.weeklyApplications} />
          </div>
          <div className="goal">
            <div className="goal-row">
              <span>Hours studied</span>
              <span className="muted num">
                {Math.round(weekMinutes / 6) / 10} of {state.goals.weeklyLearningMinutes / 60}
              </span>
            </div>
            <Progress value={weekMinutes} max={state.goals.weeklyLearningMinutes} />
          </div>
          <h3 className="subhead">Pipeline</h3>
          <div className="tally">
            {STAGES.map((s) => (
              <button key={s.id} className="tally-row" onClick={() => navigate('jobs')}>
                <span className="tally-label">{s.label}</span>
                <span className="tally-bar">
                  <span className={`tally-fill fill-${s.id}`} style={{ width: `${stats.total ? (stats.byStage[s.id] / stats.total) * 100 : 0}%` }} />
                </span>
                <span className="tally-count">{stats.byStage[s.id]}</span>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Up next">
          {followUps.length === 0 ? (
            <Empty title="You're caught up.">Applications without a reply for a week will show up here.</Empty>
          ) : (
            <ul className="list">
              {followUps.slice(0, 6).map(({ job, reason }) => (
                <li key={job.id}>
                  <button className="list-item" onClick={() => navigate('jobs', job.id)}>
                    <span>
                      <strong>{job.company}</strong> <span className="muted">{job.role}</span>
                    </span>
                    <span className="muted small">{reason}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <h3 className="subhead">Worth studying</h3>
          {gaps.length === 0 ? (
            <Empty title="No targets set.">Give your skills a target level on the Learning page.</Empty>
          ) : (
            <ul className="list">
              {gaps.map((s) => (
                <li key={s.id} className="list-item">
                  <span>{s.name}</span>
                  <span className="muted small num">
                    {s.level} of 5, aiming for {s.target}
                    {market?.find(s.name) && `, in ${formatShare(market.find(s.name)!.share)} of postings`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <Section title="Study log" aside={<span className="muted small">{lastSession ? `Last session ${relativeDay(lastSession, now)}` : 'Nothing logged yet'}</span>}>
        <Heatmap sessions={state.sessions} now={now} />
      </Section>
    </div>
  )
}
