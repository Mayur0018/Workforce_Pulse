'use client';
import { useETL } from '../../../hooks/useETL';
import { CrossFilterProvider } from '../../../components/dashboard/CrossFilterContext';
import Header from '../../../components/layout/Header';
import EmployeeDrillDownSheet from '../../../components/dashboard/EmployeeDrillDownSheet';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';

export default function EmployeeDetailPage({ params }: { params: { id: string } }) {
  const { analytics, benchmarks, loading } = useETL();
  const router = useRouter();

  if (loading) {
    return (
      <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--color-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const summary = analytics?.employeeSummaries.find((s) => s.employee.id === params.id);
  if (!summary) {
    return (
      <div className="page-content" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 'var(--space-4)' }}>
        <AlertCircle size={40} color="var(--color-danger)" />
        <p style={{ color: 'var(--color-text-secondary)' }}>Employee not found: {params.id}</p>
        <button className="btn btn-ghost" onClick={() => router.push('/employees')}>← Back to Employees</button>
      </div>
    );
  }

  return (
    <CrossFilterProvider>
      <Header title={summary.employee.name} subtitle={`${summary.employee.role} · ${summary.employee.department}`} />
      <div className="page-content">
        <EmployeeDrillDownSheet
          summary={summary}
          benchmark={benchmarks.get(params.id)}
          onClose={() => router.push('/employees')}
        />
      </div>
    </CrossFilterProvider>
  );
}
