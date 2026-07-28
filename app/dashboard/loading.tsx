export default function DashboardLoading() {
  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Header skeleton */}
      <div className="skeleton" style={{ height: 64, borderRadius: 'var(--radius-lg)' }} />

      {/* KPI cards skeleton */}
      <div className="kpi-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 120, borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>

      {/* WoW strip skeleton */}
      <div className="wow-strip">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 180, borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>

      {/* Charts skeleton */}
      <div className="dashboard-grid">
        <div className="skeleton" style={{ height: 340, borderRadius: 'var(--radius-lg)' }} />
        <div className="skeleton" style={{ height: 340, borderRadius: 'var(--radius-lg)' }} />
      </div>

      {/* Table skeleton */}
      <div className="skeleton" style={{ height: 240, borderRadius: 'var(--radius-lg)' }} />
    </div>
  );
}
