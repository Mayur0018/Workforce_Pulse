'use client';
import { Suspense } from 'react';
import { useETL } from '../../hooks/useETL';
import { CrossFilterProvider } from '../../components/dashboard/CrossFilterContext';
import Header from '../../components/layout/Header';
import FilterBar from '../../components/dashboard/FilterBar';
import EmployeeTable from '../../components/employees/EmployeeTable';
import { useExport } from '../../hooks/useExport';
import { AlertCircle, RefreshCw } from 'lucide-react';

function EmployeesContent() {
  const { analytics, benchmarks, loading, error, reload } = useETL();
  const { exportDashboardPDF } = useExport();

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 'var(--space-4)' }}>
        <AlertCircle size={40} color="var(--color-danger)" />
        <p style={{ color: 'var(--color-text-secondary)' }}>{error ?? 'Data not loaded'}</p>
        <button className="btn btn-primary" onClick={reload}><RefreshCw size={14} /> Retry</button>
      </div>
    );
  }

  return (
    <CrossFilterProvider>
      <Header
        title="Employees"
        subtitle={`${analytics.employeeSummaries.length} employees analyzed`}
        onExport={() => exportDashboardPDF('employee-export-root')}
      />
      <div className="page-content" id="employee-export-root">
        <Suspense>
          <FilterBar analytics={analytics} />
        </Suspense>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Employee Performance</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
              Click any row to open profile
            </span>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            <EmployeeTable summaries={analytics.employeeSummaries} benchmarks={benchmarks} />
          </div>
        </div>
      </div>
    </CrossFilterProvider>
  );
}

export default function EmployeesPage() {
  return <EmployeesContent />;
}
