'use client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import type { WeekData } from '../../types/analytics';
import { CHART_COLORS, CHART_MARGIN, TREND_CHART_HEIGHT } from '../../constants/charts';

interface ProductivityTrendChartProps {
  weeklyData: WeekData[];
}

interface ChartDataPoint {
  name: string;
  'Total Hours': number;
  'Recoverable Hours': number;
  'Automation Rate %': number;
}

export default function ProductivityTrendChart({ weeklyData }: ProductivityTrendChartProps) {
  const chartData: ChartDataPoint[] = weeklyData.map((w) => ({
    name: `Week ${w.week_number}`,
    'Total Hours': parseFloat(w.total_hours.toFixed(1)),
    'Recoverable Hours': parseFloat(w.recoverable_hours.toFixed(1)),
    'Automation Rate %': parseFloat((w.automation_rate * 100).toFixed(1)),
  }));

  if (chartData.length === 0) return (
    <div style={{ height: TREND_CHART_HEIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
      No weekly data available
    </div>
  );

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">Productivity Trend — 4-Week Overview</span>
      </div>
      <div className="card-body" style={{ paddingTop: 'var(--space-4)' }}>
        <ResponsiveContainer width="100%" height={TREND_CHART_HEIGHT}>
          <AreaChart data={chartData} margin={CHART_MARGIN}>
            <defs>
              <linearGradient id="gradHours" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.4} />
                <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradRecover" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.4} />
                <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradAuto" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={CHART_COLORS.accent} stopOpacity={0.4} />
                <stop offset="95%" stopColor={CHART_COLORS.accent} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis dataKey="name" tick={{ fill: 'var(--color-text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12 }}
              labelStyle={{ color: 'var(--color-text-primary)', fontWeight: 600 }}
              itemStyle={{ color: 'var(--color-text-secondary)' }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)', paddingTop: 8 }}
            />
            <Area type="monotone" dataKey="Total Hours" stroke={CHART_COLORS.primary} fill="url(#gradHours)" strokeWidth={2} dot={{ r: 4, fill: CHART_COLORS.primary }} />
            <Area type="monotone" dataKey="Recoverable Hours" stroke={CHART_COLORS.secondary} fill="url(#gradRecover)" strokeWidth={2} dot={{ r: 4, fill: CHART_COLORS.secondary }} />
            <Area type="monotone" dataKey="Automation Rate %" stroke={CHART_COLORS.accent} fill="url(#gradAuto)" strokeWidth={2} dot={{ r: 4, fill: CHART_COLORS.accent }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
