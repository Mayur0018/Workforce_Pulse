/**
 * dataQuality.ts — Compute the full DataQualityReport from ETL results.
 */
import type { DataQualityReport, DataQualityFlag } from '../../types/dataQuality';
import type { ParseActivityLogsResult } from './parseActivityLogs';
import type { ParseEmployeesResult } from './parseEmployees';
import type { JoinResult } from './join';

export function computeDataQualityReport(
  activityResult: ParseActivityLogsResult,
  employeeResult: ParseEmployeesResult,
  joinResult: JoinResult
): DataQualityReport {
  const { totalRows, rowsFixed, rowsDropped, rowsFlagged, flags: actFlags } = activityResult;
  const { duplicateDetails, flags: empFlags } = employeeResult;
  const { employeesWithNoActivity, unmatchedActivityCount, flags: joinFlags } = joinResult;

  const matchedRows = joinResult.matchedCount;
  const joinMatchRate = totalRows > 0 ? (matchedRows / totalRows) * 100 : 0;
  const dataQualityScore = totalRows > 0 ? (rowsFixed / totalRows) * 100 : 0;

  const allFlags: DataQualityFlag[] = [
    ...actFlags,
    ...empFlags,
    ...joinFlags,
  ].sort((a, b) => a.rowIndex - b.rowIndex);

  const unmatchedEmployeeIds = Array.from(
    new Set(
      joinResult.joined
        .filter((j) => j.matchStatus === 'UNMATCHED_ACTIVITY')
        .map((j) => j.activity.employee_id)
    )
  );

  return {
    totalRows,
    rowsDropped,
    rowsFixed,
    rowsFlagged,
    employeesNoMetadata: unmatchedActivityCount,
    metadataNoActivity: employeesWithNoActivity.length,
    duplicateEmployeeIds: duplicateDetails.length,
    unmatchedActivityRows: unmatchedActivityCount,
    joinMatchRate,
    dataQualityScore,
    flags: allFlags,
    duplicateDetails,
    noActivityEmployees: employeesWithNoActivity.map((e) => e.id),
    unmatchedEmployeeIds,
  };
}
