import { lazy, Suspense } from 'react'
import { Dashboard } from './features/Dashboard'
import { Jobs } from './features/Jobs'
import { Learn } from './features/Learn'
import { Profile } from './features/Profile'
import { Stories } from './features/Stories'
import { followUpsDue } from './lib/analytics'
import { today } from './lib/dates'
import { useHashRoute, type Route } from './lib/router'
import { useStore } from './lib/store'

// The assistant pulls in the Anthropic SDK, so load it only when needed.
const Assistant = lazy(() => import('./features/Assistant').then((m) => ({ default: m.Assistant })))

const NAV: { route: Route; label: string }[] = [
  { route: 'dashboard', label: 'Today' },
  { route: 'jobs', label: 'Pipeline' },
  { route: 'learn', label: 'Learning' },
  { route: 'stories', label: 'Stories' },
  { route: 'assistant', label: 'Assistant' },
  { route: 'profile', label: 'Profile' },
]

export default function App() {
  const { route, param } = useHashRoute()
  const { state } = useStore()
  const due = followUpsDue(state.jobs, today()).length

  return (
    <div className="app">
      <nav className="sidebar" aria-label="Main">
        <a className="brand" href="#/dashboard">
          Launchpad
        </a>
        {NAV.map((item) => (
          <a key={item.route} href={`#/${item.route}`} className={`nav-item${route === item.route ? ' active' : ''}`} aria-current={route === item.route ? 'page' : undefined}>
            {item.label}
            {item.route === 'jobs' && due > 0 && (
              <span className="badge" title={`${due} follow-up${due === 1 ? '' : 's'} due`}>
                {due}
              </span>
            )}
          </a>
        ))}
        <p className="sidebar-foot">Everything is saved in this browser. Export a backup from Profile.</p>
      </nav>
      <main className="main">
        {route === 'dashboard' && <Dashboard />}
        {route === 'jobs' && <Jobs openId={param} />}
        {route === 'learn' && <Learn />}
        {route === 'stories' && <Stories />}
        {route === 'assistant' && (
          <Suspense fallback={<div className="page muted">Loading…</div>}>
            <Assistant key={param ?? ''} param={param} />
          </Suspense>
        )}
        {route === 'profile' && <Profile />}
      </main>
    </div>
  )
}
