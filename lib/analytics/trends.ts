/**
 * trends.ts — Week-over-week aggregation.
 * Weeks derived from dataset date range (not calendar months).
 */
import type { JoinedRecord } from '../etl/join';
import type { WeekData, WeekDelta } from '../../types/analytics';
import type { TaskAggregate } from '../../types/activity';
import { computeAutomationConfidence, computeRecoverableHours } from './kpi';
import { VALIDATION_FACTOR } from '../../constants/kpi';

function getWeekNumber(date: Date, startDate: Date): number {
  const dayDiff = Math.floor(
    (date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  return Math.min(Math.floor(dayDiff / 7) + 1, 4); // cap at 4
}

export function computeWeekOverWeek(
  joined: JoinedRecord[],
  tasks: TaskAggregate[],
  employeeCount: number
): { weeklyData: WeekData[]; weeklyDeltas: WeekDelta[] } {
  if (joined.length === 0) return { weeklyData: [], weeklyDeltas: [] };

  // Determine dataset date range
  const dates = joined.map((r) => r.activity.timestamp).sort((a, b) => a.getTime() - b.getTime());
  const startDate = dates[0];
  const endDate = dates[dates.length - 1];

  // Build per-week buckets
  const weekBuckets: JoinedRecord[][] = [[], [], [], []];
  joined.forEach((record) => {
    const weekNum = getWeekNumber(record.activity.timestamp, startDate);
    weekBuckets[weekNum - 1].push(record);
  });

  const weeklyData: WeekData[] = weekBuckets.map((records, i) => {
    const weekNum = i + 1;
    const weekStart = new Date(startDate.getTime() + i * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

    const totalMinutes = records.reduce((s, r) => s + r.activity.duration_minutes, 0);
    const totalHours = totalMinutes / 60;
    const automatedCount = records.filter((r) => r.activity.is_automated).length;
    const automationRate = records.length > 0 ? automatedCount / records.length : 0;

    // Aggregate tasks for this week only
    const weekTaskMap = new Map<string, number[]>();
    records.forEach((r) => {
      const tn = r.activity.task_name;
      if (!weekTaskMap.has(tn)) weekTaskMap.set(tn, []);
      weekTaskMap.get(tn)!.push(r.activity.duration_minutes);
    });

    const topTasks = Array.from(weekTaskMap.entries())
      .map(([task_name, durations]) => ({ task_name, count: durations.length }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Department productivity scores (hours proportion)
    const deptMinutes = new Map<string, number>();
    records.forEach((r) => {
      const dept = r.employee?.department ?? r.activity.department;
      deptMinutes.set(dept, (deptMinutes.get(dept) ?? 0) + r.activity.duration_minutes);
    });
    const deptScores: Record<string, number> = {};
    deptMinutes.forEach((mins, dept) => {
      deptScores[dept] = mins / 60;
    });

    // Recoverable hours for this week
    const maxTaskCount = Math.max(...tasks.map((t) => t.total_count), 1);
    let weekRecovMinutes = 0;
    weekTaskMap.forEach((durations, task_name) => {
      const globalTask = tasks.find((t) => t.task_name === task_name);
      if (!globalTask) return;
      const conf = computeAutomationConfidence(globalTask, employeeCount, maxTaskCount);
      const avg = durations.reduce((s, d) => s + d, 0) / durations.length;
      weekRecovMinutes += avg * durations.length * conf * VALIDATION_FACTOR;
    });

    return {
      week_number: weekNum,
      start_date: weekStart,
      end_date: weekEnd,
      total_hours: totalHours,
      automation_rate: automationRate,
      recoverable_hours: weekRecovMinutes / 60,
      top_tasks: topTasks,
      department_scores: deptScores,
      anomaly_count: 0, // filled in by anomaly.ts
      activity_row_count: records.length,
    } as WeekData;
  });

  // Compute WoW deltas
  const weeklyDeltas: WeekDelta[] = [];
  for (let i = 1; i < weeklyData.length; i++) {
    const prev = weeklyData[i - 1];
    const curr = weeklyData[i];
    const pct = (a: number, b: number) => (b !== 0 ? ((a - b) / b) * 100 : 0);

    weeklyDeltas.push({
      from_week: prev.week_number,
      to_week: curr.week_number,
      total_hours_delta_pct: pct(curr.total_hours, prev.total_hours),
      automation_rate_delta_pct: pct(curr.automation_rate, prev.automation_rate),
      recoverable_hours_delta_pct: pct(curr.recoverable_hours, prev.recoverable_hours),
      anomaly_count_delta: curr.anomaly_count - prev.anomaly_count,
    });
  }

  return { weeklyData, weeklyDeltas };
}
