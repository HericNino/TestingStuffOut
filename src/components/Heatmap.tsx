import { heatmap } from '../lib/analytics'
import { formatDay, parseDay } from '../lib/dates'
import type { LearningSession } from '../lib/types'

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', '']

export function Heatmap({ sessions, now, weeks = 52 }: { sessions: LearningSession[]; now: string; weeks?: number }) {
  const grid = heatmap(sessions, now, weeks)
  // label a column with its month when the month changes, like a wall calendar
  const monthOf = (day: string) => parseDay(day).getMonth()
  const months = grid.map((column, w) =>
    w > 0 && monthOf(column[0].day) !== monthOf(grid[w - 1][0].day)
      ? parseDay(column[0].day).toLocaleDateString(undefined, { month: 'short' })
      : '',
  )

  return (
    <div>
      <div className="heatmap-scroll">
        <div className="heatmap-grid">
          <div className="heatmap-days">
            <span />
            {DAY_LABELS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div className="heatmap">
            {grid.map((column, w) => (
              <div key={w} className="heatmap-col">
                <span className="heatmap-month">{months[w]}</span>
                {column.map((cell) => (
                  <div key={cell.day} className={`heat heat-${cell.level}`} title={`${formatDay(cell.day)}: ${cell.minutes} min`} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="heatmap-legend">
        Less
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={`heat heat-${l}`} />
        ))}
        More
      </div>
    </div>
  )
}
