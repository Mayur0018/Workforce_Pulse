'use client';
import { useState } from 'react';
import type { AutomationScore } from '../../types/analytics';
import { formatINR } from '../../lib/utils';
import { useCrossFilter } from './CrossFilterContext';

interface AutomationRankingTableProps {
  ranking: AutomationScore[];
}

type SortKey = keyof Pick<AutomationScore, 'rank' | 'automation_score' | 'volume' | 'repetitive_pct' | 'employee_coverage_pct' | 'rupee_impact'>;

function ScoreBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 80 ? 'var(--color-danger)' :
    pct >= 60 ? 'var(--color-warning)' :
    pct >= 40 ? 'var(--color-accent)' :
    'var(--color-success)';
  return (
    <div className="score-bar-wrapper">
      <div className="score-bar-track">
        <div className="score-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="score-bar-label" style={{ color }}>{pct}%</span>
    </div>
  );
}

export default function AutomationRankingTable({ ranking }: AutomationRankingTableProps) {
  const { filters, setTask } = useCrossFilter();
  const [sortKey, setSortKey] = useState<SortKey>('rank');
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = [...ranking].sort((a, b) => {
    const av = a[sortKey] as number;
    const bv = b[sortKey] as number;
    return sortAsc ? av - bv : bv - av;
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span style={{ opacity: 0.3 }}>↕</span>;
    return <span>{sortAsc ? '↑' : '↓'}</span>;
  }

  const actionColor = (action: string) => {
    if (action.includes('Immediately')) return 'var(--color-danger)';
    if (action.includes('Strong')) return 'var(--color-warning)';
    if (action.includes('Partial')) return 'var(--color-accent)';
    return 'var(--color-text-muted)';
  };

  return (
    <div className="card dashboard-grid-full">
      <div className="card-header">
        <span className="card-title">Automation Priority Ranking</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
          {ranking.length} tasks scored — click a row to cross-filter
        </span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="table-wrapper">
          <table id="automation-ranking-table">
            <thead>
              <tr>
                <th onClick={() => handleSort('rank')} style={{ width: 48 }}># <SortIcon col="rank" /></th>
                <th>Task Name</th>
                <th onClick={() => handleSort('volume')}>Volume <SortIcon col="volume" /></th>
                <th onClick={() => handleSort('repetitive_pct')}>Repetitive % <SortIcon col="repetitive_pct" /></th>
                <th onClick={() => handleSort('employee_coverage_pct')}>Coverage <SortIcon col="employee_coverage_pct" /></th>
                <th onClick={() => handleSort('rupee_impact')}>₹ Impact <SortIcon col="rupee_impact" /></th>
                <th onClick={() => handleSort('automation_score')}>Score <SortIcon col="automation_score" /></th>
                <th>Recommended Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const isActive = filters.task_name === row.task_name;
                return (
                  <tr
                    key={row.task_name}
                    onClick={() => setTask(isActive ? null : row.task_name)}
                    style={{
                      background: isActive ? 'var(--color-primary-dim)' : undefined,
                      borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
                    }}
                    id={`task-row-${row.task_name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <td style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>{row.rank}</td>
                    <td>
                      <span style={{ fontWeight: 500 }}>{row.task_name}</span>
                    </td>
                    <td>{row.volume}</td>
                    <td>{row.repetitive_pct.toFixed(0)}%</td>
                    <td>{row.employee_coverage_pct.toFixed(0)}%</td>
                    <td style={{ color: 'var(--color-accent)' }}>
                      {formatINR(row.rupee_impact)}
                    </td>
                    <td style={{ minWidth: 160 }}>
                      <ScoreBar value={row.automation_score} />
                    </td>
                    <td>
                      <span style={{ fontSize: '0.75rem', color: actionColor(row.recommended_action), fontWeight: 500 }}>
                        {row.recommended_action}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
