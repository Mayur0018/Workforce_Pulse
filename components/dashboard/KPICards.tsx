'use client';
import { Clock, DollarSign, Users, Building2, ShieldCheck, Zap } from 'lucide-react';
import type { KPIData } from '../../types/analytics';
import { formatINR, formatHours } from '../../lib/utils';

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
  color: string;
}

function KPICard({ label, value, sub, icon, iconBg, color }: KPICardProps) {
  return (
    <div className="kpi-card animate-in">
      <div className="kpi-card-icon" style={{ background: iconBg }}>
        {icon}
      </div>
      <p className="kpi-card-label">{label}</p>
      <p className="kpi-card-value" style={{ color }}>
        {value}
      </p>
      {sub && <p className="kpi-card-sub">{sub}</p>}
    </div>
  );
}

interface KPICardsProps {
  kpis: KPIData;
}

export default function KPICards({ kpis }: KPICardsProps) {
  const cards = [
    {
      label: 'Recoverable Hours / Month',
      value: formatHours(kpis.recoverableHoursPerMonth),
      sub: 'Based on automation confidence × task frequency',
      icon: <Clock size={16} color="#a78bfa" strokeWidth={2.5} />,
      iconBg: 'rgba(124,58,237,0.2)',
      color: 'var(--color-primary-light)',
    },
    {
      label: 'Recoverable Cost / Month',
      value: formatINR(kpis.recoverableCostPerMonth),
      sub: 'Sum of employee hourly rate × recoverable hours',
      icon: <DollarSign size={16} color="#34d399" strokeWidth={2.5} />,
      iconBg: 'rgba(16,185,129,0.2)',
      color: 'var(--color-success)',
    },
    {
      label: 'Employees Analyzed',
      value: String(kpis.employeesAnalyzed),
      sub: 'With ≥1 matched activity row',
      icon: <Users size={16} color="#67e8f9" strokeWidth={2.5} />,
      iconBg: 'rgba(6,182,212,0.2)',
      color: 'var(--color-secondary)',
    },
    {
      label: 'Departments',
      value: String(kpis.departmentCount),
      sub: 'Distinct departments in normalized join',
      icon: <Building2 size={16} color="#fbbf24" strokeWidth={2.5} />,
      iconBg: 'rgba(245,158,11,0.2)',
      color: 'var(--color-accent)',
    },
    {
      label: 'Data Quality Score',
      value: `${kpis.dataQualityScore.toFixed(1)}%`,
      sub: 'Rows successfully normalized / total rows',
      icon: <ShieldCheck size={16} color="#34d399" strokeWidth={2.5} />,
      iconBg: 'rgba(16,185,129,0.2)',
      color:
        kpis.dataQualityScore >= 80
          ? 'var(--color-success)'
          : kpis.dataQualityScore >= 60
          ? 'var(--color-accent)'
          : 'var(--color-danger)',
    },
    {
      label: 'Automation Opportunities',
      value: String(kpis.automationOpportunities),
      sub: 'Tasks with automation confidence ≥ 60%',
      icon: <Zap size={16} color="#f472b6" strokeWidth={2.5} />,
      iconBg: 'rgba(244,114,182,0.2)',
      color: '#f472b6',
    },
  ];

  return (
    <div className="kpi-grid">
      {cards.map((card) => (
        <KPICard key={card.label} {...card} />
      ))}
    </div>
  );
}
