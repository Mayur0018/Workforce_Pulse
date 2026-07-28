'use client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend,
} from 'recharts';
import { CHART_COLORS, CHART_HEIGHT } from '../../constants/charts';
import { useCrossFilter } from './CrossFilterContext';

interface AppUsageChartProps {
  apps: Array<{ app_name: string; total_minutes: number; employee_count: number }>;
}

export default function AppUsageChart({ apps }: AppUsageChartProps) {
  const { filters, setApp } = useCrossFilter();

  const chartData = apps
    .slice(0, 12)
    .map((a, i) => ({
      app: a.app_name.length > 16 ? a.app_name.slice(0, 14) + '…' : a.app_name,
      fullName: a.app_name,
      'Hours': parseFloat((a.total_minutes / 60).toFixed(1)),
      'Employees': a.employee_count,
      color: CHART_COLORS.departments[i % CHART_COLORS.departments.length],
    }));

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header">
        <span className="card-title">App Usage — Top 12</span>
        {filters.app_name && (
          <button className="btn btn-ghost btn-sm" onClick={() => setApp(null)}>
            Clear: {filters.app_name}
          </button>
        )}
      </div>
      <div className="card-body" style={{ paddingTop: 'var(--space-4)' }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 0, right: 20, left: 20, bottom: 0 }}
            onClick={(e: any) => {
              if (e?.activePayload?.[0]) {
                const appName = e.activePayload[0].payload.fullName;
                setApp(filters.app_name === appName ? null : appName);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" horizontal={false} />
            <XAxis type="number" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} unit="h" />
            <YAxis dataKey="app" type="category" tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} width={100} />
            <Tooltip
              contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12 }}
              formatter={(value: any, name: any, props: any) => [
                `${Number(value).toFixed(1)}h (${props.payload?.Employees} employees)`, name
              ]}
            />
            <Bar dataKey="Hours" radius={[0, 4, 4, 0]} cursor="pointer">
              {chartData.map((entry) => (
                <Cell
                  key={entry.fullName}
                  fill={filters.app_name === entry.fullName ? CHART_COLORS.secondary : entry.color}
                  opacity={filters.app_name && filters.app_name !== entry.fullName ? 0.3 : 1}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
