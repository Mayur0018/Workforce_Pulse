'use client';
import { useState } from 'react';
import type { Anomaly } from '../../types/analytics';
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';

interface AnomalyAlertsPanelProps {
  anomalies: Anomaly[];
}

const SEVERITY_CONFIG = {
  critical: {
    icon: AlertCircle,
    color: 'var(--color-danger)',
    bg: 'var(--color-danger-dim)',
    label: 'Critical',
  },
  high: {
    icon: AlertTriangle,
    color: 'var(--color-warning)',
    bg: 'var(--color-warning-dim)',
    label: 'High',
  },
  low: {
    icon: Info,
    color: 'var(--color-accent)',
    bg: 'var(--color-accent-dim)',
    label: 'Low',
  },
};

const DIMENSION_LABELS: Record<string, string> = {
  employee: 'Employee',
  department: 'Department',
  task: 'Task',
  app: 'App',
  day: 'Day',
};

export default function AnomalyAlertsPanel({ anomalies }: AnomalyAlertsPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterDim, setFilterDim] = useState<string>('all');
  const [showAll, setShowAll] = useState(false);

  const filtered = anomalies.filter((a) => {
    if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
    if (filterDim !== 'all' && a.dimension !== filterDim) return false;
    return true;
  });

  const displayed = showAll ? filtered : filtered.slice(0, 8);

  const counts = {
    critical: anomalies.filter((a) => a.severity === 'critical').length,
    high: anomalies.filter((a) => a.severity === 'high').length,
    low: anomalies.filter((a) => a.severity === 'low').length,
  };

  return (
    <div className="card dashboard-grid-full">
      <div className="card-header">
        <button className="collapsible-trigger" onClick={() => setExpanded(!expanded)} id="anomaly-panel-toggle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span className="card-title">Anomaly Alerts</span>
            <span className="badge badge-danger">{counts.critical} Critical</span>
            <span className="badge badge-warning">{counts.high} High</span>
            <span className="badge" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}>{counts.low} Low</span>
          </div>
          {expanded ? <ChevronUp size={16} className="collapsible-icon open" /> : <ChevronDown size={16} className="collapsible-icon" />}
        </button>
      </div>

      {expanded && (
        <div className="card-body">
          {/* Filters */}
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', marginBottom: 'var(--space-4)' }}>
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              id="anomaly-severity-filter"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="low">Low</option>
            </select>
            <select
              value={filterDim}
              onChange={(e) => setFilterDim(e.target.value)}
              id="anomaly-dimension-filter"
            >
              <option value="all">All Dimensions</option>
              <option value="employee">Employee</option>
              <option value="department">Department</option>
              <option value="task">Task</option>
              <option value="app">App</option>
              <option value="day">Day</option>
            </select>
            <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--color-text-muted)', alignSelf: 'center' }}>
              {filtered.length} anomalies
            </span>
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: 'var(--space-8)' }}>
              ✓ No anomalies match the selected filters
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 'var(--space-3)' }}>
                {displayed.map((anomaly) => {
                  const cfg = SEVERITY_CONFIG[anomaly.severity];
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={anomaly.id}
                      className={`card anomaly-${anomaly.severity}`}
                      style={{ padding: 'var(--space-4)', background: cfg.bg }}
                      id={`anomaly-${anomaly.id}`}
                    >
                      <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                        <Icon size={16} color={cfg.color} style={{ flexShrink: 0, marginTop: 2 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap', marginBottom: 'var(--space-1)' }}>
                            <span className="badge" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40` }}>
                              {cfg.label}
                            </span>
                            <span className="badge badge-primary">
                              {DIMENSION_LABELS[anomaly.dimension]}
                            </span>
                            {anomaly.week && (
                              <span className="badge badge-secondary">Week {anomaly.week}</span>
                            )}
                          </div>
                          <p style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text-primary)', marginBottom: 'var(--space-1)' }}>
                            {anomaly.entity}
                          </p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                            {anomaly.description}
                          </p>
                          {anomaly.zscore !== null && (
                            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                              z-score: {anomaly.zscore.toFixed(2)} · IQR: {anomaly.iqr_flagged ? '✗' : '✓'}
                              {anomaly.business_rule_violated && ` · Rule: ${anomaly.business_rule_violated}`}
                            </p>
                          )}
                          {!anomaly.zscore && anomaly.business_rule_violated && (
                            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 'var(--space-1)' }}>
                              {anomaly.business_rule_violated}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filtered.length > 8 && (
                <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowAll(!showAll)} id="anomaly-show-more-btn">
                    {showAll ? 'Show Less' : `Show All ${filtered.length} Anomalies`}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
