/**
 * join.ts — Join activity logs with employees.
 * Implements all conflict resolution rules from the spec.
 * employees.json is authoritative for department conflicts.
 */
import type { ActivityLog } from '../../types/activity';
import type { Employee } from '../../types/employee';
import type { DataQualityFlag } from '../../types/dataQuality';

export type MatchStatus = 'MATCHED' | 'UNMATCHED_ACTIVITY' | 'MISSING_METADATA';

export interface JoinedRecord {
  activity: ActivityLog;
  employee: Employee | null;
  matchStatus: MatchStatus;
  departmentConflict?: boolean; // activity dept != employee dept
}

export interface JoinResult {
  joined: JoinedRecord[];
  employeesWithNoActivity: Employee[];
  flags: DataQualityFlag[];
  matchedCount: number;
  unmatchedActivityCount: number;
}

export function joinActivityWithEmployees(
  activities: ActivityLog[],
  employees: Employee[]
): JoinResult {
  const employeeMap = new Map<string, Employee>();
  employees.forEach((e) => employeeMap.set(e.id, e));

  // Track which employees have activity
  const employeesWithActivity = new Set<string>();

  const joined: JoinedRecord[] = [];
  const flags: DataQualityFlag[] = [];
  let matchedCount = 0;
  let unmatchedActivityCount = 0;

  activities.forEach((activity) => {
    const employee = employeeMap.get(activity.employee_id) ?? null;

    if (!employee) {
      // No matching employee record for this activity
      unmatchedActivityCount++;
      flags.push({
        rowIndex: activity.rowIndex,
        field: 'employee_id',
        rawValue: activity.employee_id,
        issue: `No employee record found for ID "${activity.employee_id}"`,
        resolution: 'UNMATCHED_ACTIVITY — included in anomaly panel, excluded from cost calculations',
        severity: 'warning',
      });
      joined.push({ activity, employee: null, matchStatus: 'UNMATCHED_ACTIVITY' });
      return;
    }

    employeesWithActivity.add(employee.id);
    matchedCount++;

    // Department conflict: activity dept != employee dept
    let departmentConflict = false;
    if (
      activity.department !== 'Unknown' &&
      employee.department !== 'Unknown' &&
      activity.department.toLowerCase() !== employee.department.toLowerCase()
    ) {
      departmentConflict = true;
      flags.push({
        rowIndex: activity.rowIndex,
        field: 'department',
        rawValue: activity.department,
        issue: `Department conflict: activity says "${activity.department}", employee record says "${employee.department}"`,
        resolution: 'FIELD_CONFLICT_DEPT — using employee record as authoritative source',
        severity: 'info',
      });
    }

    joined.push({
      activity: {
        ...activity,
        // Use employee's department as authoritative (per spec)
        department: employee.department,
      },
      employee,
      matchStatus: 'MATCHED',
      departmentConflict,
    });
  });

  // Employees with no activity (NO_ACTIVITY_FOUND)
  const employeesWithNoActivity = employees.filter((e) => !employeesWithActivity.has(e.id));
  employeesWithNoActivity.forEach((e) => {
    flags.push({
      rowIndex: -1,
      field: 'employee_id',
      rawValue: e.id,
      issue: `Employee "${e.name}" (${e.id}) has no activity rows in the dataset`,
      resolution: 'NO_ACTIVITY_FOUND — employee kept in HRMS view, excluded from productivity metrics',
      severity: 'info',
    });
  });

  return {
    joined,
    employeesWithNoActivity,
    flags,
    matchedCount,
    unmatchedActivityCount,
  };
}
