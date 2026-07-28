'use client';
import { useState } from 'react';
import type { DataQualityReport } from '../../types/dataQuality';
import { ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';

interface DataQualityPanelProps {
  report: DataQualityReport;
}

function StatBox({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="dq-stat">
      <span className="dq-stat-label">{label}</span>
      <span className="dq-stat-value" style={{ color }}>{value}</span>
      {sub && <span className="dq-stat-sub">{sub}</span>}
    </div>
  );
}

export default function DataQualityPanel({ report }: DataQualityPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [showFlags, setShowFlags] = useState(false);
  const [flagPage, setFlagPage] = useState(0);
  const FLAGS_PER_PAGE = 20;

  const scoreColor =
    report.dataQualityScore >= 80 ? 'var(--color-success)' :
    report.dataQualityScore >= 60 ? 'var(--color-accent)' :
    'var(--color-danger)';

  const pagedFlags = report.flags.slice(flagPage * FLAGS_PER_PAGE, (flagPage + 1) * FLAGS_PER_PAGE);
  const totalPages = Math.ceil(report.flags.length / FLAGS_PER_PAGE);

  return (
    <div className="card dashboard-grid-full">
      <div className="card-header">
        <button className="collapsible-trigger" onClick={() => setExpanded(!expanded)} id="dq-panel-toggle">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <ShieldAlert size={16} color="var(--color-accent)" />
            <span className="card-title">Data Quality Report</span>
            <span className="badge" style={{ background: 'var(--color-accent-dim)', color: 'var(--color-accent)' }}>
              {report.dataQualityScore.toFixed(1)}% quality
            </span>
          </div>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {expanded && (
        <div className="card-body">
          {/* Summary Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-5)', marginBottom: 'var(--space-6)', padding: 'var(--space-4)', background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)' }}>
            <StatBox label="Total Rows (raw)" value={report.totalRows} sub="Activity log rows" />
            <StatBox label="Rows Fixed" value={report.rowsFixed} sub="Normalized successfully" color="var(--color-success)" />
            <StatBox label="Rows Flagged" value={report.rowsFlagged} sub="Parsed with warnings" color="var(--color-accent)" />
            <StatBox label="Rows Dropped" value={report.rowsDropped} sub="Unrecoverable" color="var(--color-danger)" />
            <StatBox label="Employees w/o Metadata" value={report.employeesNoMetadata} sub="Activity but no HR record" color={report.employeesNoMetadata > 0 ? 'var(--color-warning)' : 'var(--color-success)'} />
            <StatBox label="Metadata w/o Activity" value={report.metadataNoActivity} sub="HR records with 0 activity" color={report.metadataNoActivity > 0 ? 'var(--color-warning)' : 'var(--color-success)'} />
            <StatBox label="Duplicate IDs" value={report.duplicateEmployeeIds} sub="Merged (first kept)" color={report.duplicateEmployeeIds > 0 ? 'var(--color-warning)' : 'var(--color-success)'} />
            <StatBox
              label="Join Match Rate"
              value={`${report.joinMatchRate.toFixed(1)}%`}
              sub="Matched rows / total rows"
              color={report.joinMatchRate >= 90 ? 'var(--color-success)' : report.joinMatchRate >= 70 ? 'var(--color-accent)' : 'var(--color-danger)'}
            />
          </div>

          {/* Duplicate Details */}
          {report.duplicateDetails.length > 0 && (
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--space-2)' }}>
                Duplicate Employee IDs
              </p>
              {report.duplicateDetails.map((d) => (
                <div key={d.employee_id} style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--color-warning-dim)', borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-1)', fontSize: '0.8rem' }}>
                  <strong style={{ color: 'var(--color-text-primary)' }}>{d.employee_id}</strong>
                  <span style={{ color: 'var(--color-text-muted)' }}> — kept row {d.kept_index}, duplicates: rows {d.duplicate_indices.join(', ')}</span>
                </div>
              ))}
            </div>
          )}

          {/* Row-level error table */}
          {report.flags.length > 0 && (
            <div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setShowFlags(!showFlags)}
                style={{ marginBottom: 'var(--space-3)' }}
                id="dq-flags-toggle"
              >
                {showFlags ? '▲ Hide' : '▼ Show'} {report.flags.length} Row-Level Issues
              </button>

              {showFlags && (
                <div>
                  <div className="table-wrapper">
                    <table style={{ fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>Row #</th>
                          <th>Field</th>
                          <th>Raw Value</th>
                          <th>Issue</th>
                          <th>Resolution</th>
                          <th>Severity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedFlags.map((flag, i) => (
                          <tr key={i}>
                            <td style={{ color: 'var(--color-text-muted)', fontWeight: 500 }}>
                              {flag.rowIndex === -1 ? 'HR' : flag.rowIndex}
                            </td>
                            <td style={{ color: 'var(--color-secondary)', fontFamily: 'monospace' }}>
                              {flag.field}
                            </td>
                            <td style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {flag.rawValue || '—'}
                            </td>
                            <td style={{ color: 'var(--color-text-primary)', maxWidth: 200 }}>{flag.issue}</td>
                            <td style={{ color: 'var(--color-text-muted)', maxWidth: 200 }}>{flag.resolution}</td>
                            <td>
                              <span
                                className="badge"
                                style={{
                                  background: flag.severity === 'error' ? 'var(--color-danger-dim)' : flag.severity === 'warning' ? 'var(--color-warning-dim)' : 'var(--color-secondary-dim)',
                                  color: flag.severity === 'error' ? 'var(--color-danger)' : flag.severity === 'warning' ? 'var(--color-warning)' : 'var(--color-secondary)',
                                }}
                              >
                                {flag.severity}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {totalPages > 1 && (
                    <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', justifyContent: 'center' }}>
                      <button className="btn btn-ghost btn-sm" disabled={flagPage === 0} onClick={() => setFlagPage(0)}>«</button>
                      <button className="btn btn-ghost btn-sm" disabled={flagPage === 0} onClick={() => setFlagPage(p => p - 1)}>‹</button>
                      <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', alignSelf: 'center' }}>
                        Page {flagPage + 1} of {totalPages}
                      </span>
                      <button className="btn btn-ghost btn-sm" disabled={flagPage === totalPages - 1} onClick={() => setFlagPage(p => p + 1)}>›</button>
                      <button className="btn btn-ghost btn-sm" disabled={flagPage === totalPages - 1} onClick={() => setFlagPage(totalPages - 1)}>»</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
