'use client';
import { Suspense } from 'react';
import type { Metadata } from 'next';
import { useETL } from '../../hooks/useETL';
import { useExport } from '../../hooks/useExport';
import { CrossFilterProvider } from '../../components/dashboard/CrossFilterContext';
import Header from '../../components/layout/Header';
import KPICards from '../../components/dashboard/KPICards';
import WeekOverWeekPanel from '../../components/dashboard/WeekOverWeekPanel';
import ProductivityTrendChart from '../../components/dashboard/ProductivityTrendChart';
import DepartmentBreakdownChart from '../../components/dashboard/DepartmentBreakdownChart';
import AppUsageChart from '../../components/dashboard/AppUsageChart';
import AutomationRankingTable from '../../components/dashboard/AutomationRankingTable';
import AnomalyAlertsPanel from '../../components/dashboard/AnomalyAlertsPanel';
import DataQualityPanel from '../../components/dashboard/DataQualityPanel';
import FilterBar from '../../components/dashboard/FilterBar';
import { AlertCircle, RefreshCw, Database } from 'lucide-react';

function DashboardContent() {
  const { analytics, dataQuality, benchmarks, loading, error, reload } = useETL();
  const { exportDashboardPDF } = useExport();

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 'var(--space-4)' }}>
        <div style={{ width: 48, height: 48, border: '3px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: 'var(--space-1)' }}>Running ETL Pipeline…</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Parsing CSV & JSON, normalizing, joining, computing analytics</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content">
        <div className="card" style={{ padding: 'var(--space-8)', textAlign: 'center', maxWidth: 560, margin: '80px auto' }}>
          <AlertCircle size={40} color="var(--color-danger)" style={{ margin: '0 auto var(--space-4)' }} />
          <h2 style={{ fontWeight: 700, marginBottom: 'var(--space-3)', color: 'var(--color-text-primary)' }}>Failed to Load Data</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-2)', fontSize: '0.9rem' }}>{error}</p>
          <div style={{ background: 'var(--color-bg-elevated)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', marginBottom: 'var(--space-6)', textAlign: 'left' }}>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-accent)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Setup Required:</p>
            <ol style={{ paddingLeft: 'var(--space-5)', fontSize: '0.8rem', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
              <li>Place <code style={{ color: 'var(--color-secondary)' }}>activity_logs.csv</code> in <code>public/data/</code></li>
              <li>Place <code style={{ color: 'var(--color-secondary)' }}>employees.json</code> in <code>public/data/</code></li>
              <li>Reload the page</li>
            </ol>
          </div>
          <button className="btn btn-primary" onClick={reload} id="retry-load-btn">
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  if (!analytics || !dataQuality) return null;

  const dateStr = `${analytics.dateRange.start.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} – ${analytics.dateRange.end.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}`;

  return (
    <CrossFilterProvider>
      <Header
        title="Dashboard"
        subtitle={`${dataQuality.totalRows} rows · ${analytics.kpis.employeesAnalyzed} employees · ${dateStr}`}
        onExport={() => exportDashboardPDF('dashboard-export-root')}
      />

      <div className="page-content" id="dashboard-export-root">
        {/* Filter Bar */}
        <Suspense>
          <FilterBar analytics={analytics} />
        </Suspense>

        {/* KPI Cards */}
        <KPICards kpis={analytics.kpis} />

        {/* Week-over-Week Strip */}
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <WeekOverWeekPanel
            weeklyData={analytics.weeklyData}
            weeklyDeltas={analytics.weeklyDeltas}
          />
        </div>

        {/* Productivity Trend Chart (full width) */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <ProductivityTrendChart weeklyData={analytics.weeklyData} />
        </div>

        {/* Dept + App charts side by side */}
        <div className="dashboard-grid" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="dashboard-grid-left">
            <DepartmentBreakdownChart deptStats={analytics.deptStats} />
          </div>
          <div className="dashboard-grid-right">
            <AppUsageChart apps={analytics.allApps} />
          </div>
        </div>

        {/* Automation Ranking Table (full width) */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <AutomationRankingTable ranking={analytics.automationRanking} />
        </div>

        {/* Anomaly Alerts Panel */}
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <AnomalyAlertsPanel anomalies={analytics.anomalies} />
        </div>

        {/* Data Quality Panel */}
        <DataQualityPanel report={dataQuality} />
      </div>
    </CrossFilterProvider>
  );
}

export default function DashboardPage() {
  return <DashboardContent />;
}
