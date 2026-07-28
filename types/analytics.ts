import type { Employee } from './employee';
import type { TaskAggregate } from './activity';

// Six headline KPI cards
export interface KPIData {
  recoverableHoursPerMonth: number;
  recoverableCostPerMonth: number; // INR
  employeesAnalyzed: number;
  departmentCount: number;
  dataQualityScore: number; // 0-100%
  automationOpportunities: number; // distinct tasks with score >= 0.6
}

// Automation scoring per task
export interface AutomationScore {
  rank: number;
  task_name: string;
  task_volume_score: number; // 0-1
  repetitiveness_score: number; // 0-1
  employee_coverage_score: number; // 0-1
  rupee_impact_score: number; // 0-1
  automation_score: number; // 0-1 weighted composite
  recommended_action: string;
  volume: number; // raw task count
  repetitive_pct: number; // % identical runs
  employee_coverage_pct: number; // % employees doing task
  rupee_impact: number; // INR
}

// Anomaly severity levels
export type AnomalySeverity = 'critical' | 'high' | 'low';

// Anomaly detection result
export interface Anomaly {
  id: string;
  dimension: 'employee' | 'department' | 'task' | 'app' | 'day';
  entity: string; // employee name / dept / task / app / date
  metric: string; // e.g. "hours_logged", "app_usage_change"
  value: number;
  expected_range: [number, number]; // [lower, upper]
  zscore: number | null;
  iqr_flagged: boolean;
  business_rule_violated: string | null;
  severity: AnomalySeverity;
  week: number | null;
  description: string;
}

// Week-over-week data for one week
export interface WeekData {
  week_number: number; // 1-4
  start_date: Date;
  end_date: Date;
  total_hours: number;
  automation_rate: number; // 0-1
  recoverable_hours: number;
  top_tasks: Array<{ task_name: string; count: number }>;
  department_scores: Record<string, number>;
  anomaly_count: number;
  activity_row_count: number;
}

// WoW delta between consecutive weeks
export interface WeekDelta {
  from_week: number;
  to_week: number;
  total_hours_delta_pct: number;
  automation_rate_delta_pct: number;
  recoverable_hours_delta_pct: number;
  anomaly_count_delta: number;
}

// Department-level aggregation
export interface DeptStats {
  department: string;
  employee_count: number;
  total_hours: number;
  automation_rate: number;
  recoverable_hours: number;
  recoverable_cost: number; // INR
  avg_task_count_per_employee: number;
  top_apps: string[];
  top_tasks: string[];
}

// Employee-level aggregation used in dashboards + drill-down
export interface EmployeeSummary {
  employee: Employee;
  total_hours: number;
  total_activity_rows: number;
  automation_rate: number;
  recoverable_hours: number;
  recoverable_cost: number; // INR
  top_tasks: string[];
  top_apps: string[];
  weekly_hours: number[]; // [w1,w2,w3,w4]
  task_aggregates: TaskAggregate[];
}

// Full analytics output returned from the ETL+analytics pipeline
export interface AnalyticsOutput {
  kpis: KPIData;
  automationRanking: AutomationScore[];
  anomalies: Anomaly[];
  weeklyData: WeekData[];
  weeklyDeltas: WeekDelta[];
  deptStats: DeptStats[];
  employeeSummaries: EmployeeSummary[];
  allTasks: TaskAggregate[];
  allApps: Array<{ app_name: string; total_minutes: number; employee_count: number }>;
  dateRange: { start: Date; end: Date };
}
