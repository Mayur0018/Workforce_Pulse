'use client';
import { X, User, Clock, Zap, TrendingUp, Award, BarChart2 } from 'lucide-react';
import type { EmployeeSummary } from '../../types/analytics';
import type { EmployeeBenchmark } from '../../types/benchmark';
import { formatINR, formatHours, formatDate } from '../../lib/utils';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { CHART_COLORS } from '../../constants/charts';

interface EmployeeDrillDownSheetProps {
  summary: EmployeeSummary;
  benchmark: EmployeeBenchmark | undefined;
  onClose: () => void;
}

export default function EmployeeDrillDownSheet({ summary, benchmark, onClose }: EmployeeDrillDownSheetProps) {
  const { employee } = summary;

  const weeklyChartData = summary.weekly_hours.map((h, i) => ({
    name: `Week ${i + 1}`,
    Hours: parseFloat(h.toFixed(1)),
  }));

  const radarData = benchmark?.dept_benchmark.dimensions.map((d) => ({
    axis: d.axis,
    Employee: parseFloat((d.employee_value * 100).toFixed(0)),
    'Dept Avg': parseFloat((d.dept_avg * 100).toFixed(0)),
  })) ?? [];

  return (
    <div className="sheet-overlay" onClick={(e) => e.target === e.currentTarget && onClose()} id="employee-drilldown-sheet">
      <div className="sheet-panel">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-6)' }}>
          <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={20} color="white" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>{employee.name}</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{employee.role} · {employee.department}</p>
            </div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close employee profile" id="close-drilldown-btn">
            <X size={18} />
          </button>
        </div>

        {/* Basic Info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
          {[
            { label: 'Hire Date', value: formatDate(employee.hire_date) },
            { label: 'Compensation', value: employee.compensation_inr > 0 ? formatINR(employee.compensation_inr) + '/yr' : 'N/A' },
            { label: 'Working Hours', value: `${employee.working_hours_per_day}h/day` },
            { label: 'Hourly Rate', value: employee.hourly_rate > 0 ? `${formatINR(employee.hourly_rate)}/hr` : 'N/A' },
          ].map(({ label, value }) => (
            <div key={label} style={{ padding: 'var(--space-3)', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>{label}</p>
              <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Activity Summary */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
            Activity Summary
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)' }}>
            {[
              { icon: Clock, label: 'Total Hours', value: formatHours(summary.total_hours), color: 'var(--color-primary-light)' },
              { icon: Zap, label: 'Automation', value: `${(summary.automation_rate * 100).toFixed(1)}%`, color: 'var(--color-secondary)' },
              { icon: TrendingUp, label: 'Recoverable', value: formatHours(summary.recoverable_hours), color: 'var(--color-success)' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} style={{ textAlign: 'center', padding: 'var(--space-3)', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)' }}>
                <Icon size={16} color={color} style={{ margin: '0 auto var(--space-1)' }} />
                <p style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>{label}</p>
                <p style={{ fontSize: '1rem', fontWeight: 700, color }}>{value}</p>
              </div>
            ))}
          </div>
          {summary.recoverable_cost > 0 && (
            <p style={{ marginTop: 'var(--space-2)', fontSize: '0.8rem', color: 'var(--color-text-muted)', textAlign: 'center' }}>
              Recoverable Cost: <strong style={{ color: 'var(--color-accent)' }}>{formatINR(summary.recoverable_cost)}/mo</strong>
            </p>
          )}
        </div>

        {/* Week-over-week personal trend */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
            Personal Weekly Trend
          </p>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={weeklyChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} axisLine={false} tickLine={false} unit="h" />
              <Tooltip contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11 }} />
              <Line type="monotone" dataKey="Hours" stroke={CHART_COLORS.primary} strokeWidth={2} dot={{ r: 4, fill: CHART_COLORS.primary }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Dept benchmark radar */}
        {benchmark && radarData.length > 0 && (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
              Department Benchmark — {employee.department} ({benchmark.dept_benchmark.peer_count} peers)
            </p>
            <div className="radar-container">
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(148,163,184,0.15)" />
                  <PolarAngleAxis dataKey="axis" tick={{ fill: 'var(--color-text-muted)', fontSize: 10 }} />
                  <Radar name="Employee" dataKey="Employee" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.25} />
                  <Radar name="Dept Avg" dataKey="Dept Avg" stroke={CHART_COLORS.secondary} fill={CHART_COLORS.secondary} fillOpacity={0.15} />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 11, color: 'var(--color-text-muted)' }} />
                  <Tooltip contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11 }} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Role benchmark */}
        {benchmark && (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
              Role Benchmark — {employee.role} ({benchmark.role_benchmark.peer_count} peers)
            </p>
            {benchmark.role_benchmark.metrics.map((m) => (
              <div key={m.label} style={{ marginBottom: 'var(--space-3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{m.label}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {m.employee_value.toFixed(1)}{m.unit} <span style={{ color: 'var(--color-text-muted)', fontWeight: 400 }}>vs avg {m.peer_avg.toFixed(1)}{m.unit}</span>
                  </span>
                </div>
                <div style={{ height: 6, background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden', position: 'relative' }}>
                  {/* peer range */}
                  <div style={{
                    position: 'absolute', height: '100%',
                    left: `${m.peer_max > 0 ? (m.peer_min / m.peer_max) * 100 : 0}%`,
                    width: `${m.peer_max > 0 ? ((m.peer_max - m.peer_min) / m.peer_max) * 100 : 0}%`,
                    background: 'rgba(6,182,212,0.25)',
                  }} />
                  {/* employee marker */}
                  {m.peer_max > 0 && (
                    <div style={{
                      position: 'absolute', height: '100%', width: 3,
                      left: `${(m.employee_value / m.peer_max) * 100}%`,
                      background: CHART_COLORS.primary,
                      borderRadius: 2,
                    }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Peer Percentiles */}
        {benchmark && (
          <div style={{ marginBottom: 'var(--space-5)' }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-3)' }}>
              <Award size={12} style={{ display: 'inline', marginRight: 4 }} />Peer Percentile Rankings
            </p>
            {benchmark.peer_percentiles.map((p) => (
              <div key={p.metric} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-2)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', width: 100, flexShrink: 0 }}>
                  {p.metric.replace(/_/g, ' ')}
                </span>
                <div style={{ flex: 1, height: 6, background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${p.percentile}%`, background: 'var(--gradient-primary)', borderRadius: 'var(--radius-full)' }} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-primary-light)', width: 80, textAlign: 'right' }}>
                  {p.label.split(' in ')[0]}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Top Tasks & Apps */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
          {[
            { label: 'Top Tasks', items: summary.top_tasks, color: 'var(--color-primary-light)' },
            { label: 'Top Apps', items: summary.top_apps, color: 'var(--color-secondary)' },
          ].map(({ label, items, color }) => (
            <div key={label}>
              <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-2)' }}>
                {label}
              </p>
              {items.map((item, i) => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--color-text-muted)', fontWeight: 700, width: 14 }}>{i + 1}.</span>
                  <span style={{ color, fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
