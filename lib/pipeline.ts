/**
 * pipeline.ts — Master ETL + Analytics orchestrator.
 * Reads CSVText + JSON, runs full pipeline, returns AnalyticsOutput.
 */
import { parseActivityLogs } from './etl/parseActivityLogs';
import { parseEmployees } from './etl/parseEmployees';
import { joinActivityWithEmployees } from './etl/join';
import { computeDataQualityReport } from './etl/dataQuality';
import { aggregateTasks, computeAllKPIs, computeAutomationConfidence, computeRecoverableCost, computeRecoverableHours } from './analytics/kpi';
import { rankTasksByAutomation } from './analytics/automation';
import { detectAnomalies } from './analytics/anomaly';
import { computeWeekOverWeek } from './analytics/trends';
import type { AnalyticsOutput, DeptStats, EmployeeSummary } from '../types/analytics';
import type { JoinedRecord } from './etl/join';
import type { Employee } from '../types/employee';
import { VALIDATION_FACTOR } from '../constants/kpi';

function computeEmployeeSummaries(
  joined: JoinedRecord[],
  employees: Employee[],
  tasks: ReturnType<typeof aggregateTasks>,
  datasetDays: number
): EmployeeSummary[] {
  const maxTaskCount = Math.max(...tasks.map((t) => t.total_count), 1);
  const monthlyFactor = datasetDays > 0 ? 30 / datasetDays : 1;

  const empMap = new Map<string, Employee>(employees.map((e) => [e.id, e]));
  const empRecords = new Map<string, JoinedRecord[]>();

  joined.forEach((r) => {
    if (r.matchStatus !== 'MATCHED' || !r.employee) return;
    const eid = r.employee.id;
    if (!empRecords.has(eid)) empRecords.set(eid, []);
    empRecords.get(eid)!.push(r);
  });

  const summaries: EmployeeSummary[] = [];

  empRecords.forEach((records, eid) => {
    const employee = empMap.get(eid);
    if (!employee) return;

    const totalMinutes = records.reduce((s, r) => s + r.activity.duration_minutes, 0);
    const automatedCount = records.filter((r) => r.activity.is_automated).length;
    const automation_rate = records.length > 0 ? automatedCount / records.length : 0;

    // Per-task aggregates for this employee
    const empTaskMap = new Map<string, number[]>();
    records.forEach((r) => {
      const tn = r.activity.task_name;
      if (!empTaskMap.has(tn)) empTaskMap.set(tn, []);
      empTaskMap.get(tn)!.push(r.activity.duration_minutes);
    });

    let recoverableMinutes = 0;
    empTaskMap.forEach((durations, task_name) => {
      const globalTask = tasks.find((t) => t.task_name === task_name);
      if (!globalTask) return;
      const conf = computeAutomationConfidence(globalTask, employees.length, maxTaskCount);
      const avg = durations.reduce((s, d) => s + d, 0) / durations.length;
      recoverableMinutes += avg * durations.length * monthlyFactor * conf * VALIDATION_FACTOR;
    });

    const recoverable_hours = recoverableMinutes / 60;
    const recoverable_cost = recoverable_hours * employee.hourly_rate;

    // Week hours distribution
    const dates = records.map((r) => r.activity.timestamp).sort((a, b) => a.getTime() - b.getTime());
    const dataStart = joined[0]?.activity.timestamp ?? dates[0];
    const weeklyHours = [0, 0, 0, 0];
    records.forEach((r) => {
      const dayDiff = Math.floor((r.activity.timestamp.getTime() - dataStart.getTime()) / (1000 * 60 * 60 * 24));
      const weekIdx = Math.min(Math.floor(dayDiff / 7), 3);
      weeklyHours[weekIdx] += r.activity.duration_minutes / 60;
    });

    // Top tasks and apps
    const taskCounts = new Map<string, number>();
    const appCounts = new Map<string, number>();
    records.forEach((r) => {
      taskCounts.set(r.activity.task_name, (taskCounts.get(r.activity.task_name) ?? 0) + 1);
      appCounts.set(r.activity.app_name, (appCounts.get(r.activity.app_name) ?? 0) + 1);
    });
    const topTasks = [...taskCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map((e) => e[0]);
    const topApps = [...appCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map((e) => e[0]);

    summaries.push({
      employee,
      total_hours: totalMinutes / 60,
      total_activity_rows: records.length,
      automation_rate,
      recoverable_hours,
      recoverable_cost,
      top_tasks: topTasks,
      top_apps: topApps,
      weekly_hours: weeklyHours,
      task_aggregates: tasks.filter((t) => empTaskMap.has(t.task_name)),
    });
  });

  return summaries.sort((a, b) => b.total_hours - a.total_hours);
}

function computeDeptStats(
  joined: JoinedRecord[],
  summaries: EmployeeSummary[]
): DeptStats[] {
  const deptMap = new Map<string, EmployeeSummary[]>();
  summaries.forEach((s) => {
    const dept = s.employee.department;
    if (!deptMap.has(dept)) deptMap.set(dept, []);
    deptMap.get(dept)!.push(s);
  });

  return Array.from(deptMap.entries()).map(([department, deptSummaries]) => {
    const appCounts = new Map<string, number>();
    const taskCounts = new Map<string, number>();
    joined.forEach((r) => {
      if (r.employee?.department !== department) return;
      appCounts.set(r.activity.app_name, (appCounts.get(r.activity.app_name) ?? 0) + 1);
      taskCounts.set(r.activity.task_name, (taskCounts.get(r.activity.task_name) ?? 0) + 1);
    });

    return {
      department,
      employee_count: deptSummaries.length,
      total_hours: deptSummaries.reduce((s, e) => s + e.total_hours, 0),
      automation_rate:
        deptSummaries.reduce((s, e) => s + e.automation_rate, 0) / deptSummaries.length,
      recoverable_hours: deptSummaries.reduce((s, e) => s + e.recoverable_hours, 0),
      recoverable_cost: deptSummaries.reduce((s, e) => s + e.recoverable_cost, 0),
      avg_task_count_per_employee:
        deptSummaries.reduce((s, e) => s + e.total_activity_rows, 0) / deptSummaries.length,
      top_apps: [...appCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]),
      top_tasks: [...taskCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map((e) => e[0]),
    } as DeptStats;
  });
}

export async function runPipeline(
  csvText: string,
  employeesJson: unknown[]
): Promise<{ analytics: AnalyticsOutput; dataQuality: ReturnType<typeof computeDataQualityReport> }> {
  // ETL
  const activityResult = parseActivityLogs(csvText);
  const employeeResult = parseEmployees(employeesJson);
  const joinResult = joinActivityWithEmployees(activityResult.data, employeeResult.data);
  const dataQuality = computeDataQualityReport(activityResult, employeeResult, joinResult);

  const { joined } = joinResult;
  const employees = employeeResult.data;

  // Dataset date range
  const dates = joined.map((r) => r.activity.timestamp).sort((a, b) => a.getTime() - b.getTime());
  const dateRange = {
    start: dates[0] ?? new Date(),
    end: dates[dates.length - 1] ?? new Date(),
  };
  const datasetDays = Math.max(
    1,
    Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
  );

  // Analytics
  const tasks = aggregateTasks(joined);
  const automationRanking = rankTasksByAutomation(tasks, joined, employees);
  const kpis = computeAllKPIs(joined, employees, tasks, dataQuality.dataQualityScore, datasetDays);
  const { weeklyData, weeklyDeltas } = computeWeekOverWeek(joined, tasks, employees.length);
  const anomalies = detectAnomalies(joined, weeklyData);

  // Inject anomaly counts into weekly data
  weeklyData.forEach((w) => {
    w.anomaly_count = anomalies.filter((a) => a.week === w.week_number).length;
  });

  const employeeSummaries = computeEmployeeSummaries(joined, employees, tasks, datasetDays);
  const deptStats = computeDeptStats(joined, employeeSummaries);

  // App aggregation
  const appMap = new Map<string, { total_minutes: number; employees: Set<string> }>();
  joined.forEach(({ activity }) => {
    const app = activity.app_name;
    if (!appMap.has(app)) appMap.set(app, { total_minutes: 0, employees: new Set() });
    const agg = appMap.get(app)!;
    agg.total_minutes += activity.duration_minutes;
    agg.employees.add(activity.employee_id);
  });
  const allApps = Array.from(appMap.entries())
    .map(([app_name, v]) => ({
      app_name,
      total_minutes: v.total_minutes,
      employee_count: v.employees.size,
    }))
    .sort((a, b) => b.total_minutes - a.total_minutes);

  return {
    analytics: {
      kpis,
      automationRanking,
      anomalies,
      weeklyData,
      weeklyDeltas,
      deptStats,
      employeeSummaries,
      allTasks: tasks,
      allApps,
      dateRange,
    },
    dataQuality,
  };
}
