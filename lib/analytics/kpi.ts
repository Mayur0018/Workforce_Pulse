/**
 * kpi.ts — All 6 headline KPI computations.
 * Recoverable Hours + Cost use the exact spec formulas.
 */
import type { JoinedRecord } from '../etl/join';
import type { Employee } from '../../types/employee';
import type { TaskAggregate } from '../../types/activity';
import type { KPIData } from '../../types/analytics';
import {
  ANNUAL_WORKING_DAYS,
  VALIDATION_FACTOR,
  AUTOMATION_OPPORTUNITY_THRESHOLD,
  RECOVERABLE_HOURS_WEIGHTS,
} from '../../constants/kpi';

// ─── Task Aggregation ────────────────────────────────────────────────────────

export function aggregateTasks(joined: JoinedRecord[]): TaskAggregate[] {
  const taskMap = new Map<string, {
    rows: number[];
    durations: number[];
    employees: Set<string>;
    isAutomatedCount: number;
    weeklyCounts: [number, number, number, number];
    apps: Set<string>;
    timestamps: Date[];
  }>();

  // Determine dataset date range for week calculation
  const allDates = joined
    .map((r) => r.activity.timestamp)
    .filter(Boolean)
    .sort((a, b) => a.getTime() - b.getTime());

  const startDate = allDates[0] ?? new Date();

  joined.forEach(({ activity }) => {
    const key = activity.task_name;
    if (!taskMap.has(key)) {
      taskMap.set(key, {
        rows: [],
        durations: [],
        employees: new Set(),
        isAutomatedCount: 0,
        weeklyCounts: [0, 0, 0, 0],
        apps: new Set(),
        timestamps: [],
      });
    }
    const agg = taskMap.get(key)!;
    agg.rows.push(activity.rowIndex);
    agg.durations.push(activity.duration_minutes);
    agg.employees.add(activity.employee_id);
    if (activity.is_automated) agg.isAutomatedCount++;
    agg.apps.add(activity.app_name);
    agg.timestamps.push(activity.timestamp);

    // Assign to week 1-4
    const dayDiff = Math.floor(
      (activity.timestamp.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const weekIdx = Math.min(Math.floor(dayDiff / 7), 3);
    agg.weeklyCounts[weekIdx]++;
  });

  return Array.from(taskMap.entries()).map(([task_name, agg]) => {
    const total_count = agg.rows.length;
    const total_duration_minutes = agg.durations.reduce((s, d) => s + d, 0);
    const avg_duration_minutes = total_duration_minutes / total_count;

    // Standard deviation of duration
    const variance =
      agg.durations.reduce((s, d) => s + Math.pow(d - avg_duration_minutes, 2), 0) / total_count;
    const std_dev_duration = Math.sqrt(variance);

    // Count "identical" runs: within 10% of mean (near-identical)
    const identical_runs = agg.durations.filter(
      (d) => Math.abs(d - avg_duration_minutes) <= avg_duration_minutes * 0.1
    ).length;

    return {
      task_name,
      total_count,
      total_duration_minutes,
      avg_duration_minutes,
      std_dev_duration,
      distinct_employees: agg.employees.size,
      identical_runs,
      is_automated_count: agg.isAutomatedCount,
      automation_ratio: agg.isAutomatedCount / total_count,
      weekly_counts: [...agg.weeklyCounts],
      app_names: Array.from(agg.apps),
    } as TaskAggregate;
  });
}

// ─── Automation Confidence ───────────────────────────────────────────────────

export function computeAutomationConfidence(
  task: TaskAggregate,
  totalEmployees: number,
  maxTaskCount: number
): number {
  const normalizedFrequency = maxTaskCount > 0 ? task.total_count / maxTaskCount : 0;
  const repetitionRatio = task.total_count > 0 ? task.identical_runs / task.total_count : 0;
  const employeeCoverageRatio = totalEmployees > 0 ? task.distinct_employees / totalEmployees : 0;
  // Task standardization: lower CV (coefficient of variation) = more standard
  const cv = task.avg_duration_minutes > 0 ? task.std_dev_duration / task.avg_duration_minutes : 1;
  const taskStandardizationScore = Math.max(0, 1 - Math.min(cv, 1));

  return (
    RECOVERABLE_HOURS_WEIGHTS.normalizedFrequency * normalizedFrequency +
    RECOVERABLE_HOURS_WEIGHTS.repetitionRatio * repetitionRatio +
    RECOVERABLE_HOURS_WEIGHTS.employeeCoverage * employeeCoverageRatio +
    RECOVERABLE_HOURS_WEIGHTS.taskStandardization * taskStandardizationScore
  );
}

// ─── Recoverable Hours ───────────────────────────────────────────────────────

export function computeRecoverableHours(
  tasks: TaskAggregate[],
  totalEmployees: number,
  datasetDays: number
): number {
  const maxTaskCount = Math.max(...tasks.map((t) => t.total_count), 1);
  // Scale to monthly (30 days)
  const monthlyFactor = datasetDays > 0 ? 30 / datasetDays : 1;

  let totalRecoverableMinutes = 0;

  tasks.forEach((task) => {
    const automationConfidence = computeAutomationConfidence(task, totalEmployees, maxTaskCount);
    // repetitive_minutes = avg_duration * monthly_task_count
    const monthlyCount = task.total_count * monthlyFactor;
    const repetitiveMinutes = task.avg_duration_minutes * monthlyCount;
    totalRecoverableMinutes += repetitiveMinutes * automationConfidence * VALIDATION_FACTOR;
  });

  return totalRecoverableMinutes / 60; // convert to hours
}

// ─── Recoverable Cost ────────────────────────────────────────────────────────

export function computeRecoverableCost(
  joined: JoinedRecord[],
  tasks: TaskAggregate[],
  employees: Employee[],
  datasetDays: number
): number {
  const maxTaskCount = Math.max(...tasks.map((t) => t.total_count), 1);
  const monthlyFactor = datasetDays > 0 ? 30 / datasetDays : 1;

  // Per-employee recoverable hours
  const employeeMap = new Map<string, Employee>(employees.map((e) => [e.id, e]));

  // Group joined records by employee
  const empActivity = new Map<string, JoinedRecord[]>();
  joined.forEach((r) => {
    if (r.matchStatus !== 'MATCHED' || !r.employee) return;
    const eid = r.employee.id;
    if (!empActivity.has(eid)) empActivity.set(eid, []);
    empActivity.get(eid)!.push(r);
  });

  let totalCost = 0;

  empActivity.forEach((records, eid) => {
    const employee = employeeMap.get(eid);
    if (!employee || employee.hourly_rate === 0) return;

    // Compute per-task aggregates for this employee only
    const empTaskMap = new Map<string, number[]>();
    records.forEach((r) => {
      const tn = r.activity.task_name;
      if (!empTaskMap.has(tn)) empTaskMap.set(tn, []);
      empTaskMap.get(tn)!.push(r.activity.duration_minutes);
    });

    let empRecoverableMinutes = 0;
    empTaskMap.forEach((durations, task_name) => {
      const globalTask = tasks.find((t) => t.task_name === task_name);
      if (!globalTask) return;
      const automationConfidence = computeAutomationConfidence(globalTask, employees.length, maxTaskCount);
      const avgDuration = durations.reduce((s, d) => s + d, 0) / durations.length;
      const monthlyCount = durations.length * monthlyFactor;
      empRecoverableMinutes += avgDuration * monthlyCount * automationConfidence * VALIDATION_FACTOR;
    });

    const empRecoverableHours = empRecoverableMinutes / 60;
    totalCost += empRecoverableHours * employee.hourly_rate;
  });

  return totalCost;
}

// ─── Main KPI Computation ────────────────────────────────────────────────────

export function computeAllKPIs(
  joined: JoinedRecord[],
  employees: Employee[],
  tasks: TaskAggregate[],
  dataQualityScore: number,
  datasetDays: number
): KPIData {
  const matchedJoined = joined.filter((r) => r.matchStatus === 'MATCHED');
  const employeesAnalyzed = new Set(
    matchedJoined.filter((r) => r.employee).map((r) => r.employee!.id)
  ).size;
  const departmentCount = new Set(
    matchedJoined.filter((r) => r.employee).map((r) => r.employee!.department)
  ).size;

  const recoverableHoursPerMonth = computeRecoverableHours(tasks, employees.length, datasetDays);
  const recoverableCostPerMonth = computeRecoverableCost(joined, tasks, employees, datasetDays);

  const maxTaskCount = Math.max(...tasks.map((t) => t.total_count), 1);
  const automationOpportunities = tasks.filter((t) => {
    const conf = computeAutomationConfidence(t, employees.length, maxTaskCount);
    return conf >= AUTOMATION_OPPORTUNITY_THRESHOLD;
  }).length;

  return {
    recoverableHoursPerMonth,
    recoverableCostPerMonth,
    employeesAnalyzed,
    departmentCount,
    dataQualityScore,
    automationOpportunities,
  };
}
