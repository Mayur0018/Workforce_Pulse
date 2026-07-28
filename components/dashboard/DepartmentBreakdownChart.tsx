'use client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import type { DeptStats } from '../../types/analytics';
import { CHART_COLORS, CHART_MARGIN, CHART_HEIGHT } from '../../constants/charts';
import { useCrossFilter } from './CrossFilterContext';
import { formatINR } from '../../lib/utils';

interface DepartmentBreakdownChartProps {
  deptStats: DeptStats[];
}

export default function DepartmentBreakdownChart({ deptStats }: DepartmentBreakdownChartProps) {
  const { filters, setDepartment } = useCrossFilter();

  const chartData = deptStats
    .sort((a, b) => b.total_hours - a.total_hours)
    .map((d, i) => ({
      department: d.department,
      'Total Hours': parseFloat(d.total_hours.toFixed(1)),
      'Recoverable Hours': parseFloat(d.recoverable_hours.toFixed(1)),
      'Automation %': parseFloat((d.automation_rate * 100).toFixed(1)),
      color: CHART_COLORS.departments[i % CHART_COLORS.departments.length],
      employees: d.employee_count,
      recoverableCost: d.recoverable_cost,
    }));

  return (
    <div className="card" style={{ height: '100%' }}>
      <div className="card-header">
        <span className="card-title">Department Breakdown</span>
        {filters.department && (
          <button className="btn btn-ghost btn-sm" onClick={() => setDepartment(null)}>
            Clear: {filters.department}
          </button>
        )}
      </div>
      <div className="card-body" style={{ paddingTop: 'var(--space-4)' }}>
        <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
          <BarChart data={chartData} margin={CHART_MARGIN} onClick={(e: any) => {
            if (e?.activeLabel) {
              const dept = e.activeLabel as string;
              setDepartment(filters.department === dept ? null : dept);
            }
          }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
            <XAxis
              dataKey="department"
              tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              angle={-20}
              textAnchor="end"
              height={50}
            />
            <YAxis tick={{ fill: 'var(--color-text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', borderRadius: 10, fontSize: 12 }}
              formatter={(value: any, name: any, props: any) => {
                const d = chartData.find((c) => c.department === props.payload?.department);
                if (name === 'Recoverable Hours') return [`${Number(value).toFixed(1)}h (${formatINR(d?.recoverableCost ?? 0)})`, name];
                return [value, name];
              }}
            />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: 'var(--color-text-muted)', paddingTop: 8 }} />
            <Bar dataKey="Total Hours" radius={[4, 4, 0, 0]} cursor="pointer">
              {chartData.map((entry) => (
                <Cell
                  key={entry.department}
                  fill={filters.department === entry.department ? CHART_COLORS.secondary : entry.color}
                  opacity={filters.department && filters.department !== entry.department ? 0.3 : 1}
                />
              ))}
            </Bar>
            <Bar dataKey="Recoverable Hours" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} opacity={0.7} cursor="pointer" />
          </BarChart>
        </ResponsiveContainer>

        {/* Dept summary below chart */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
          {chartData.map((d) => (
            <button
              key={d.department}
              className="filter-pill"
              style={{
                background: filters.department === d.department ? d.color : undefined,
                color: filters.department === d.department ? 'white' : undefined,
              }}
              onClick={() => setDepartment(filters.department === d.department ? null : d.department)}
              id={`dept-pill-${d.department.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <span
                style={{ width: 6, height: 6, borderRadius: '50%', background: d.color, flexShrink: 0 }}
              />
              {d.department}
              <span style={{ opacity: 0.7 }}>{d.employees}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
