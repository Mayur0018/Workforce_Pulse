'use client';
import { X } from 'lucide-react';
import { useCrossFilter } from './CrossFilterContext';
import type { AnalyticsOutput } from '../../types/analytics';

interface FilterBarProps {
  analytics: AnalyticsOutput;
}

export default function FilterBar({ analytics }: FilterBarProps) {
  const { filters, setDepartment, setTask, setEmployee, setApp, setWeek, clearAll, hasActiveFilters } = useCrossFilter();

  const departments = Array.from(new Set(analytics.deptStats.map((d) => d.department))).sort();
  const tasks = analytics.allTasks.map((t) => t.task_name).sort();
  const employees = analytics.employeeSummaries.map((s) => ({ id: s.employee.id, name: s.employee.name }));
  const apps = analytics.allApps.map((a) => a.app_name).slice(0, 20);

  return (
    <div className="filter-bar" id="filter-bar">
      {/* Department */}
      <select
        value={filters.department ?? ''}
        onChange={(e) => setDepartment(e.target.value || null)}
        id="filter-department"
        title="Filter by department"
      >
        <option value="">All Departments</option>
        {departments.map((d) => <option key={d} value={d}>{d}</option>)}
      </select>

      {/* Task */}
      <select
        value={filters.task_name ?? ''}
        onChange={(e) => setTask(e.target.value || null)}
        id="filter-task"
        title="Filter by task"
      >
        <option value="">All Tasks</option>
        {tasks.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>

      {/* Employee */}
      <select
        value={filters.employee_id ?? ''}
        onChange={(e) => setEmployee(e.target.value || null)}
        id="filter-employee"
        title="Filter by employee"
      >
        <option value="">All Employees</option>
        {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
      </select>

      {/* Week */}
      <select
        value={filters.week ?? ''}
        onChange={(e) => setWeek(e.target.value ? Number(e.target.value) : null)}
        id="filter-week"
        title="Filter by week"
      >
        <option value="">All Weeks</option>
        {[1, 2, 3, 4].map((w) => <option key={w} value={w}>Week {w}</option>)}
      </select>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'center' }}>
          {filters.department && (
            <span className="filter-pill" onClick={() => setDepartment(null)}>
              Dept: {filters.department} <X size={10} className="filter-pill-close" />
            </span>
          )}
          {filters.task_name && (
            <span className="filter-pill" onClick={() => setTask(null)}>
              Task: {filters.task_name} <X size={10} className="filter-pill-close" />
            </span>
          )}
          {filters.employee_id && (
            <span className="filter-pill" onClick={() => setEmployee(null)}>
              Employee: {employees.find(e => e.id === filters.employee_id)?.name ?? filters.employee_id}
              <X size={10} className="filter-pill-close" />
            </span>
          )}
          {filters.week && (
            <span className="filter-pill" onClick={() => setWeek(null)}>
              Week {filters.week} <X size={10} className="filter-pill-close" />
            </span>
          )}
          <button className="btn btn-ghost btn-sm" onClick={clearAll} id="clear-all-filters-btn">
            <X size={12} /> Clear All
          </button>
        </div>
      )}
    </div>
  );
}
