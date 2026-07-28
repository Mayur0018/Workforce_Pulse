'use client';
import { useState } from 'react';
import type { EmployeeSummary } from '../../types/analytics';
import type { EmployeeBenchmark } from '../../types/benchmark';
import { useCrossFilter } from '../dashboard/CrossFilterContext';
import { formatINR, formatHours } from '../../lib/utils';
import EmployeeDrillDownSheet from '../dashboard/EmployeeDrillDownSheet';

interface EmployeeTableProps {
  summaries: EmployeeSummary[];
  benchmarks: Map<string, EmployeeBenchmark>;
}

type SortKey = 'name' | 'department' | 'role' | 'total_hours' | 'automation_rate' | 'recoverable_hours' | 'recoverable_cost';

export default function EmployeeTable({ summaries, benchmarks }: EmployeeTableProps) {
  const { filters, setEmployee } = useCrossFilter();
  const [sortKey, setSortKey] = useState<SortKey>('total_hours');
  const [sortAsc, setSortAsc] = useState(false);
  const [selected, setSelected] = useState<EmployeeSummary | null>(null);
  const [search, setSearch] = useState('');

  // Apply cross-filters
  let filtered = summaries;
  if (filters.department) filtered = filtered.filter((s) => s.employee.department === filters.department);
  if (filters.employee_id) filtered = filtered.filter((s) => s.employee.id === filters.employee_id);
  if (search.trim()) {
    const q = search.toLowerCase();
    filtered = filtered.filter((s) =>
      s.employee.name.toLowerCase().includes(q) ||
      s.employee.role.toLowerCase().includes(q) ||
      s.employee.department.toLowerCase().includes(q)
    );
  }

  const sorted = [...filtered].sort((a, b) => {
    let av: string | number, bv: string | number;
    switch (sortKey) {
      case 'name': av = a.employee.name; bv = b.employee.name; break;
      case 'department': av = a.employee.department; bv = b.employee.department; break;
      case 'role': av = a.employee.role; bv = b.employee.role; break;
      case 'total_hours': av = a.total_hours; bv = b.total_hours; break;
      case 'automation_rate': av = a.automation_rate; bv = b.automation_rate; break;
      case 'recoverable_hours': av = a.recoverable_hours; bv = b.recoverable_hours; break;
      case 'recoverable_cost': av = a.recoverable_cost; bv = b.recoverable_cost; break;
      default: av = 0; bv = 0;
    }
    if (typeof av === 'string') return sortAsc ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
    return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span style={{ opacity: 0.3 }}>↕</span>;
    return <span>{sortAsc ? '↑' : '↓'}</span>;
  }

  return (
    <>
      {/* Search + info */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search name, role, department…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
          id="employee-search"
        />
        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
          {sorted.length} of {summaries.length} employees
        </span>
      </div>

      <div className="table-wrapper">
        <table id="employee-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('name')}>Name <SortIcon col="name" /></th>
              <th onClick={() => handleSort('role')}>Role <SortIcon col="role" /></th>
              <th onClick={() => handleSort('department')}>Department <SortIcon col="department" /></th>
              <th onClick={() => handleSort('total_hours')}>Hours <SortIcon col="total_hours" /></th>
              <th onClick={() => handleSort('automation_rate')}>Automation % <SortIcon col="automation_rate" /></th>
              <th onClick={() => handleSort('recoverable_hours')}>Recoverable Hrs <SortIcon col="recoverable_hours" /></th>
              <th onClick={() => handleSort('recoverable_cost')}>₹ Recoverable <SortIcon col="recoverable_cost" /></th>
              <th>Top Task</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s) => {
              const isActive = filters.employee_id === s.employee.id;
              return (
                <tr
                  key={s.employee.id}
                  onClick={() => {
                    setSelected(s);
                    setEmployee(s.employee.id);
                  }}
                  style={{
                    background: isActive ? 'var(--color-primary-dim)' : undefined,
                    borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                  }}
                  id={`emp-row-${s.employee.id}`}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                        {s.employee.name.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 500 }}>{s.employee.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{s.employee.role}</td>
                  <td>
                    <span className="badge badge-primary">{s.employee.department}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{formatHours(s.total_hours)}</td>
                  <td>
                    <div className="score-bar-wrapper">
                      <div className="score-bar-track">
                        <div className="score-bar-fill" style={{ width: `${(s.automation_rate * 100).toFixed(0)}%` }} />
                      </div>
                      <span className="score-bar-label">{(s.automation_rate * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--color-success)' }}>{formatHours(s.recoverable_hours)}</td>
                  <td style={{ color: 'var(--color-accent)' }}>{s.recoverable_cost > 0 ? formatINR(s.recoverable_cost) : '—'}</td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                    {s.top_tasks[0] ?? '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Drill-down sheet */}
      {selected && (
        <EmployeeDrillDownSheet
          summary={selected}
          benchmark={benchmarks.get(selected.employee.id)}
          onClose={() => {
            setSelected(null);
            setEmployee(null);
          }}
        />
      )}
    </>
  );
}
