/**
 * benchmark.ts — Role/dept/peer comparison engine.
 */
import type { EmployeeSummary } from '../../types/analytics';
import type { EmployeeBenchmark, RoleBenchmark, DeptBenchmark, PeerPercentile } from '../../types/benchmark';

function percentile(values: number[], target: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const below = sorted.filter((v) => v < target).length;
  return Math.round((below / sorted.length) * 100);
}

function normalize01(value: number, min: number, max: number): number {
  return max > min ? (value - min) / (max - min) : 0;
}

export function computeBenchmarks(summaries: EmployeeSummary[]): Map<string, EmployeeBenchmark> {
  const benchmarkMap = new Map<string, EmployeeBenchmark>();

  summaries.forEach((target) => {
    const eid = target.employee.id;

    // Role peers
    const rolePeers = summaries.filter(
      (s) => s.employee.role === target.employee.role && s.employee.id !== eid
    );
    // Dept peers
    const deptPeers = summaries.filter(
      (s) => s.employee.department === target.employee.department && s.employee.id !== eid
    );

    // ── Role Benchmark ──────────────────────────────────────────────────────
    const rolePeerHours = rolePeers.map((s) => s.total_hours);
    const rolePeerAutomation = rolePeers.map((s) => s.automation_rate);
    const rolePeerTasks = rolePeers.map((s) => s.total_activity_rows);

    const role_benchmark: RoleBenchmark = {
      employee_id: eid,
      role: target.employee.role,
      peer_count: rolePeers.length,
      metrics: [
        {
          label: 'Total Hours',
          employee_value: target.total_hours,
          peer_avg: rolePeerHours.length > 0
            ? rolePeerHours.reduce((s, v) => s + v, 0) / rolePeerHours.length : 0,
          peer_min: rolePeerHours.length > 0 ? Math.min(...rolePeerHours) : 0,
          peer_max: rolePeerHours.length > 0 ? Math.max(...rolePeerHours) : 0,
          unit: 'hrs',
        },
        {
          label: 'Automation Rate',
          employee_value: target.automation_rate * 100,
          peer_avg: rolePeerAutomation.length > 0
            ? (rolePeerAutomation.reduce((s, v) => s + v, 0) / rolePeerAutomation.length) * 100 : 0,
          peer_min: rolePeerAutomation.length > 0 ? Math.min(...rolePeerAutomation) * 100 : 0,
          peer_max: rolePeerAutomation.length > 0 ? Math.max(...rolePeerAutomation) * 100 : 0,
          unit: '%',
        },
        {
          label: 'Task Volume',
          employee_value: target.total_activity_rows,
          peer_avg: rolePeerTasks.length > 0
            ? rolePeerTasks.reduce((s, v) => s + v, 0) / rolePeerTasks.length : 0,
          peer_min: rolePeerTasks.length > 0 ? Math.min(...rolePeerTasks) : 0,
          peer_max: rolePeerTasks.length > 0 ? Math.max(...rolePeerTasks) : 0,
          unit: 'tasks',
        },
      ],
    };

    // ── Dept Benchmark (radar chart) ────────────────────────────────────────
    const allInDept = [target, ...deptPeers];
    const hoursVals = allInDept.map((s) => s.total_hours);
    const autoVals = allInDept.map((s) => s.automation_rate);
    const taskVals = allInDept.map((s) => s.total_activity_rows);
    const recoverVals = allInDept.map((s) => s.recoverable_hours);
    const costVals = allInDept.map((s) => s.recoverable_cost);

    const deptAvgHours = deptPeers.length > 0
      ? deptPeers.reduce((s, p) => s + p.total_hours, 0) / deptPeers.length : 0;
    const deptAvgAuto = deptPeers.length > 0
      ? deptPeers.reduce((s, p) => s + p.automation_rate, 0) / deptPeers.length : 0;
    const deptAvgTasks = deptPeers.length > 0
      ? deptPeers.reduce((s, p) => s + p.total_activity_rows, 0) / deptPeers.length : 0;
    const deptAvgRecover = deptPeers.length > 0
      ? deptPeers.reduce((s, p) => s + p.recoverable_hours, 0) / deptPeers.length : 0;
    const deptAvgCost = deptPeers.length > 0
      ? deptPeers.reduce((s, p) => s + p.recoverable_cost, 0) / deptPeers.length : 0;

    const dept_benchmark: DeptBenchmark = {
      employee_id: eid,
      department: target.employee.department,
      peer_count: deptPeers.length,
      dimensions: [
        {
          axis: 'Hours',
          employee_value: normalize01(target.total_hours, Math.min(...hoursVals), Math.max(...hoursVals)),
          dept_avg: normalize01(deptAvgHours, Math.min(...hoursVals), Math.max(...hoursVals)),
        },
        {
          axis: 'Automation',
          employee_value: normalize01(target.automation_rate, Math.min(...autoVals), Math.max(...autoVals)),
          dept_avg: normalize01(deptAvgAuto, Math.min(...autoVals), Math.max(...autoVals)),
        },
        {
          axis: 'Tasks',
          employee_value: normalize01(target.total_activity_rows, Math.min(...taskVals), Math.max(...taskVals)),
          dept_avg: normalize01(deptAvgTasks, Math.min(...taskVals), Math.max(...taskVals)),
        },
        {
          axis: 'Recoverable Hours',
          employee_value: normalize01(target.recoverable_hours, Math.min(...recoverVals), Math.max(...recoverVals)),
          dept_avg: normalize01(deptAvgRecover, Math.min(...recoverVals), Math.max(...recoverVals)),
        },
        {
          axis: 'Cost Impact',
          employee_value: normalize01(target.recoverable_cost, Math.min(...costVals), Math.max(...costVals)),
          dept_avg: normalize01(deptAvgCost, Math.min(...costVals), Math.max(...costVals)),
        },
      ],
    };

    // ── Peer Percentiles ────────────────────────────────────────────────────
    const allSummaries = summaries;
    const allHours = allSummaries.map((s) => s.total_hours);
    const allAuto = allSummaries.map((s) => s.automation_rate);
    const allTasks = allSummaries.map((s) => s.total_activity_rows);

    const pHours = percentile(allHours, target.total_hours);
    const pAuto = percentile(allAuto, target.automation_rate);
    const pTasks = percentile(allTasks, target.total_activity_rows);

    function percentileLabel(p: number, metric: string, direction: 'high_good' | 'low_good'): string {
      const pct = direction === 'high_good' ? p : 100 - p;
      if (pct >= 80) return `Top 20% in ${metric}`;
      if (pct >= 60) return `Top 40% in ${metric}`;
      if (pct >= 40) return `Middle range in ${metric}`;
      if (pct >= 20) return `Bottom 40% in ${metric}`;
      return `Bottom 20% in ${metric}`;
    }

    const peer_percentiles: PeerPercentile[] = [
      {
        employee_id: eid,
        metric: 'total_hours',
        value: target.total_hours,
        percentile: pHours,
        label: percentileLabel(pHours, 'total hours', 'high_good'),
        direction: 'high_good',
      },
      {
        employee_id: eid,
        metric: 'automation_rate',
        value: target.automation_rate,
        percentile: pAuto,
        label: percentileLabel(pAuto, 'automation rate', 'high_good'),
        direction: 'high_good',
      },
      {
        employee_id: eid,
        metric: 'task_volume',
        value: target.total_activity_rows,
        percentile: pTasks,
        label: percentileLabel(pTasks, 'task diversity', 'high_good'),
        direction: 'high_good',
      },
    ];

    benchmarkMap.set(eid, { employee_id: eid, role_benchmark, dept_benchmark, peer_percentiles });
  });

  return benchmarkMap;
}
