'use client';
import type { WeekData, WeekDelta } from '../../types/analytics';
import { formatHours, formatPct, formatDelta } from '../../lib/utils';
import { useCrossFilter } from './CrossFilterContext';

interface WeekOverWeekPanelProps {
  weeklyData: WeekData[];
  weeklyDeltas: WeekDelta[];
}

function DeltaBadge({ value, suffix = '%' }: { value: number; suffix?: string }) {
  const { text, positive } = formatDelta(value);
  if (Math.abs(value) < 0.1) return <span className="delta delta-neutral">—</span>;
  return (
    <span className={`delta ${positive ? 'delta-up' : 'delta-down'}`}>{text}</span>
  );
}

export default function WeekOverWeekPanel({ weeklyData, weeklyDeltas }: WeekOverWeekPanelProps) {
  const { filters, setWeek } = useCrossFilter();

  if (weeklyData.length === 0) return null;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
        <h2 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Week-over-Week Performance
        </h2>
        {filters.week && (
          <button className="btn btn-ghost btn-sm" onClick={() => setWeek(null)}>
            Clear Week Filter
          </button>
        )}
      </div>
      <div className="wow-strip">
        {weeklyData.map((week) => {
          const delta = weeklyDeltas.find((d) => d.to_week === week.week_number);
          const isActive = filters.week === week.week_number;

          return (
            <div
              key={week.week_number}
              className="wow-card"
              style={{
                cursor: 'pointer',
                border: isActive ? '1px solid var(--color-primary)' : undefined,
                background: isActive ? 'var(--color-primary-dim)' : undefined,
              }}
              onClick={() => setWeek(isActive ? null : week.week_number)}
              role="button"
              aria-pressed={isActive}
              id={`week-card-${week.week_number}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                <span className="wow-week-label">Week {week.week_number}</span>
                {delta && <DeltaBadge value={delta.total_hours_delta_pct} />}
              </div>

              <div className="wow-metric-row">
                <span className="wow-metric-label">Hours</span>
                <span className="wow-metric-value">{formatHours(week.total_hours)}</span>
              </div>
              <div className="wow-metric-row">
                <span className="wow-metric-label">Automation</span>
                <span className="wow-metric-value">
                  {(week.automation_rate * 100).toFixed(1)}%
                  {delta && (
                    <span style={{ marginLeft: 4 }}>
                      <DeltaBadge value={delta.automation_rate_delta_pct} />
                    </span>
                  )}
                </span>
              </div>
              <div className="wow-metric-row">
                <span className="wow-metric-label">Recoverable</span>
                <span className="wow-metric-value">{formatHours(week.recoverable_hours)}</span>
              </div>
              <div className="wow-metric-row">
                <span className="wow-metric-label">Anomalies</span>
                <span className="wow-metric-value" style={{ color: week.anomaly_count > 0 ? 'var(--color-warning)' : 'var(--color-success)' }}>
                  {week.anomaly_count}
                </span>
              </div>
              <div className="wow-metric-row">
                <span className="wow-metric-label">Rows</span>
                <span className="wow-metric-value">{week.activity_row_count}</span>
              </div>

              {/* Top tasks */}
              {week.top_tasks.length > 0 && (
                <div style={{ marginTop: 'var(--space-3)', borderTop: '1px solid var(--color-border-subtle)', paddingTop: 'var(--space-2)' }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', marginBottom: 'var(--space-1)' }}>TOP TASKS</p>
                  {week.top_tasks.slice(0, 3).map((t) => (
                    <div key={t.task_name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginBottom: 2 }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{t.task_name}</span>
                      <span style={{ color: 'var(--color-primary-light)', fontWeight: 600 }}>{t.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
