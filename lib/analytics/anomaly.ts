/**
 * anomaly.ts — Combined z-score + IQR + business rules anomaly detection.
 * All 5 dimensions: employee, department, task, app, day.
 */
import type { JoinedRecord } from '../etl/join';
import type { Anomaly, AnomalySeverity, WeekData } from '../../types/analytics';
import { ZSCORE_THRESHOLD, IQR_MULTIPLIER, BUSINESS_RULES } from '../../constants/anomaly';

let anomalyIdCounter = 0;
function nextId() { return `anomaly-${++anomalyIdCounter}`; }

// ─── Statistical Helpers ─────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function stdDev(values: number[], mu?: number): number {
  if (values.length < 2) return 0;
  const m = mu ?? mean(values);
  return Math.sqrt(values.reduce((s, v) => s + Math.pow(v - m, 2), 0) / values.length);
}

function zScore(value: number, mu: number, sd: number): number {
  return sd > 0 ? (value - mu) / sd : 0;
}

function iqrBounds(values: number[]): { q1: number; q3: number; lower: number; upper: number } {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  return {
    q1,
    q3,
    lower: q1 - IQR_MULTIPLIER * iqr,
    upper: q3 + IQR_MULTIPLIER * iqr,
  };
}

function severity(zFlagged: boolean, iqrFlagged: boolean, businessRuleFlagged: boolean): AnomalySeverity {
  const count = [zFlagged, iqrFlagged, businessRuleFlagged].filter(Boolean).length;
  if (count >= 3) return 'critical';
  if (count >= 2) return 'high';
  return 'low';
}

// ─── Employee-Level Anomalies ────────────────────────────────────────────────

function detectEmployeeAnomalies(joined: JoinedRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Group by employee_id: total hours per day
  const empDayHours = new Map<string, Map<string, number>>();
  const empTotalHours = new Map<string, number>();
  const empNames = new Map<string, string>();

  joined.forEach(({ activity, employee }) => {
    const eid = activity.employee_id;
    const name = employee?.name ?? eid;
    const dayKey = activity.timestamp.toISOString().slice(0, 10);
    empNames.set(eid, name);
    if (!empDayHours.has(eid)) empDayHours.set(eid, new Map());
    const dayMap = empDayHours.get(eid)!;
    dayMap.set(dayKey, (dayMap.get(dayKey) ?? 0) + activity.duration_minutes / 60);
    empTotalHours.set(eid, (empTotalHours.get(eid) ?? 0) + activity.duration_minutes / 60);
  });

  const allTotalHours = Array.from(empTotalHours.values());
  const mu = mean(allTotalHours);
  const sd = stdDev(allTotalHours, mu);
  const bounds = iqrBounds(allTotalHours);

  empTotalHours.forEach((hours, eid) => {
    const z = zScore(hours, mu, sd);
    const zFlagged = Math.abs(z) > ZSCORE_THRESHOLD;
    const iqrFlagged = hours < bounds.lower || hours > bounds.upper;

    // Business rule: any day > 12 hours
    const dayHoursMap = empDayHours.get(eid)!;
    const overworkedDay = Array.from(dayHoursMap.values()).find(
      (h) => h > BUSINESS_RULES.maxHoursPerDay
    );
    const businessRuleFlagged = !!overworkedDay;
    const businessRule = overworkedDay
      ? `Employee logged ${overworkedDay.toFixed(1)}h on a single day (limit: ${BUSINESS_RULES.maxHoursPerDay}h)`
      : null;

    if (zFlagged || iqrFlagged || businessRuleFlagged) {
      anomalies.push({
        id: nextId(),
        dimension: 'employee',
        entity: empNames.get(eid) ?? eid,
        metric: 'total_hours',
        value: hours,
        expected_range: [bounds.lower, bounds.upper],
        zscore: z,
        iqr_flagged: iqrFlagged,
        business_rule_violated: businessRule,
        severity: severity(zFlagged, iqrFlagged, businessRuleFlagged),
        week: null,
        description: `Employee "${empNames.get(eid) ?? eid}" has ${zFlagged ? 'z-score flagged' : ''} ${iqrFlagged ? 'IQR flagged' : ''} total hours (${hours.toFixed(1)}h). ${businessRule ?? ''}`.trim(),
      });
    }
  });

  return anomalies;
}

// ─── Department-Level Anomalies ──────────────────────────────────────────────

function detectDepartmentAnomalies(joined: JoinedRecord[], weeklyData: WeekData[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Detect: department's repetitive work doubled week-over-week
  if (weeklyData.length >= 2) {
    const depts = new Set(joined.map((r) => r.employee?.department ?? r.activity.department));

    depts.forEach((dept) => {
      for (let i = 1; i < weeklyData.length; i++) {
        const prev = weeklyData[i - 1].department_scores[dept] ?? 0;
        const curr = weeklyData[i].department_scores[dept] ?? 0;
        const ratio = prev > 0 ? curr / prev : 0;

        if (ratio >= BUSINESS_RULES.deptRepetitiveWorkDoubledThreshold) {
          anomalies.push({
            id: nextId(),
            dimension: 'department',
            entity: dept,
            metric: 'weekly_hours',
            value: curr,
            expected_range: [0, prev * BUSINESS_RULES.deptRepetitiveWorkDoubledThreshold],
            zscore: null,
            iqr_flagged: false,
            business_rule_violated: `${dept} hours doubled from Week ${i} to Week ${i + 1} (${prev.toFixed(1)}h → ${curr.toFixed(1)}h)`,
            severity: 'high',
            week: i + 1,
            description: `Department "${dept}" showed a ${((ratio - 1) * 100).toFixed(0)}% increase in activity hours from Week ${i} to Week ${i + 1}.`,
          });
        }
      }
    });
  }

  return anomalies;
}

// ─── Task-Level Anomalies ────────────────────────────────────────────────────

function detectTaskAnomalies(joined: JoinedRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  const taskDurations = new Map<string, number[]>();
  joined.forEach(({ activity }) => {
    if (!taskDurations.has(activity.task_name)) taskDurations.set(activity.task_name, []);
    taskDurations.get(activity.task_name)!.push(activity.duration_minutes);
  });

  taskDurations.forEach((durations, task_name) => {
    if (durations.length < 3) return;
    const mu = mean(durations);
    const sd = stdDev(durations, mu);
    const bounds = iqrBounds(durations);

    durations.forEach((d) => {
      const z = zScore(d, mu, sd);
      const zFlagged = Math.abs(z) > ZSCORE_THRESHOLD;
      const iqrFlagged = d < bounds.lower || d > bounds.upper;
      const businessRuleFlagged = sd > mu * (BUSINESS_RULES.taskDurationVarianceMultiplier - 1);

      if (zFlagged || iqrFlagged) {
        // Only report once per task (worst case)
        const existing = anomalies.find(
          (a) => a.dimension === 'task' && a.entity === task_name
        );
        if (!existing) {
          anomalies.push({
            id: nextId(),
            dimension: 'task',
            entity: task_name,
            metric: 'duration_minutes',
            value: sd,
            expected_range: [bounds.lower, bounds.upper],
            zscore: z,
            iqr_flagged: iqrFlagged,
            business_rule_violated: businessRuleFlagged
              ? `Task duration variance (${sd.toFixed(1)} min) exceeds ${BUSINESS_RULES.taskDurationVarianceMultiplier}× historical average`
              : null,
            severity: severity(zFlagged, iqrFlagged, businessRuleFlagged),
            week: null,
            description: `Task "${task_name}" has high duration variance (std dev: ${sd.toFixed(1)} min, avg: ${mu.toFixed(1)} min).`,
          });
        }
        return;
      }
    });
  });

  return anomalies;
}

// ─── App-Level Anomalies ─────────────────────────────────────────────────────

function detectAppAnomalies(joined: JoinedRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Group app usage by week
  const appWeekMinutes = new Map<string, number[]>(); // app → [w1,w2,w3,w4]

  const dates = joined.map((r) => r.activity.timestamp).sort((a, b) => a.getTime() - b.getTime());
  const startDate = dates[0];
  if (!startDate) return [];

  joined.forEach(({ activity }) => {
    const dayDiff = Math.floor(
      (activity.timestamp.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const weekIdx = Math.min(Math.floor(dayDiff / 7), 3);
    const app = activity.app_name;
    if (!appWeekMinutes.has(app)) appWeekMinutes.set(app, [0, 0, 0, 0]);
    appWeekMinutes.get(app)![weekIdx] += activity.duration_minutes;
  });

  appWeekMinutes.forEach((weekMins, app) => {
    for (let i = 1; i < weekMins.length; i++) {
      const prev = weekMins[i - 1];
      const curr = weekMins[i];
      if (prev <= 0) continue;
      const change = (curr - prev) / prev;
      if (change >= BUSINESS_RULES.appUsageWoWIncreaseThreshold) {
        anomalies.push({
          id: nextId(),
          dimension: 'app',
          entity: app,
          metric: 'usage_minutes',
          value: curr,
          expected_range: [0, prev * (1 + BUSINESS_RULES.appUsageWoWIncreaseThreshold)],
          zscore: null,
          iqr_flagged: false,
          business_rule_violated: `${app} usage increased ${(change * 100).toFixed(0)}% from Week ${i} to Week ${i + 1} (threshold: 70%)`,
          severity: 'high',
          week: i + 1,
          description: `App "${app}" usage spiked ${(change * 100).toFixed(0)}% week-over-week (${(prev / 60).toFixed(1)}h → ${(curr / 60).toFixed(1)}h).`,
        });
      }
    }
  });

  return anomalies;
}

// ─── Day-Level Anomalies ─────────────────────────────────────────────────────

function detectDayAnomalies(joined: JoinedRecord[]): Anomaly[] {
  const anomalies: Anomaly[] = [];

  const dayMinutes = new Map<string, number>();
  joined.forEach(({ activity }) => {
    const dayKey = activity.timestamp.toISOString().slice(0, 10);
    dayMinutes.set(dayKey, (dayMinutes.get(dayKey) ?? 0) + activity.duration_minutes);
  });

  const dayValues = Array.from(dayMinutes.values());
  if (dayValues.length < 3) return [];

  const mu = mean(dayValues);
  const sd = stdDev(dayValues, mu);
  const bounds = iqrBounds(dayValues);

  dayMinutes.forEach((mins, day) => {
    const z = zScore(mins, mu, sd);
    const zFlagged = Math.abs(z) > ZSCORE_THRESHOLD;
    const iqrFlagged = mins < bounds.lower || mins > bounds.upper;

    if (zFlagged || iqrFlagged) {
      const hours = mins / 60;
      anomalies.push({
        id: nextId(),
        dimension: 'day',
        entity: day,
        metric: 'total_hours',
        value: hours,
        expected_range: [bounds.lower / 60, bounds.upper / 60],
        zscore: z,
        iqr_flagged: iqrFlagged,
        business_rule_violated: null,
        severity: severity(zFlagged, iqrFlagged, false),
        week: null,
        description: `Company-wide activity on ${day} was ${z > 0 ? 'unusually high' : 'unusually low'} (${hours.toFixed(1)}h, z=${z.toFixed(2)}).`,
      });
    }
  });

  // Employee inactivity: 0 activity for > 3 consecutive working days
  const empDays = new Map<string, Set<string>>();
  const empNames = new Map<string, string>();
  joined.forEach(({ activity, employee }) => {
    const eid = activity.employee_id;
    if (!empDays.has(eid)) empDays.set(eid, new Set());
    empDays.get(eid)!.add(activity.timestamp.toISOString().slice(0, 10));
    if (employee) empNames.set(eid, employee.name);
  });

  // Check for gaps > 3 days in sorted day lists
  empDays.forEach((days, eid) => {
    const sorted = Array.from(days).sort();
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1]).getTime();
      const curr = new Date(sorted[i]).getTime();
      const gapDays = (curr - prev) / (1000 * 60 * 60 * 24);
      if (gapDays > BUSINESS_RULES.consecutiveInactiveDays + 1) {
        anomalies.push({
          id: nextId(),
          dimension: 'employee',
          entity: empNames.get(eid) ?? eid,
          metric: 'consecutive_inactive_days',
          value: gapDays - 1,
          expected_range: [0, BUSINESS_RULES.consecutiveInactiveDays],
          zscore: null,
          iqr_flagged: false,
          business_rule_violated: `Employee had ${Math.round(gapDays - 1)} consecutive days without activity (limit: ${BUSINESS_RULES.consecutiveInactiveDays})`,
          severity: 'high',
          week: null,
          description: `Employee "${empNames.get(eid) ?? eid}" had ${Math.round(gapDays - 1)} consecutive working days with no activity (${sorted[i - 1]} → ${sorted[i]}).`,
        });
        break; // one flag per employee
      }
    }
  });

  return anomalies;
}

// ─── Main Entry Point ────────────────────────────────────────────────────────

export function detectAnomalies(
  joined: JoinedRecord[],
  weeklyData: WeekData[]
): Anomaly[] {
  anomalyIdCounter = 0; // reset for reproducibility
  return [
    ...detectEmployeeAnomalies(joined),
    ...detectDepartmentAnomalies(joined, weeklyData),
    ...detectTaskAnomalies(joined),
    ...detectAppAnomalies(joined),
    ...detectDayAnomalies(joined),
  ].sort((a, b) => {
    const order = { critical: 0, high: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });
}
