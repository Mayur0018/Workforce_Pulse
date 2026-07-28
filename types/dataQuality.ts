// A single flagged row's description
export interface DataQualityFlag {
  rowIndex: number;
  field: string;
  rawValue: string;
  issue: string;
  resolution: string;
  severity: 'error' | 'warning' | 'info';
}

// High-level data quality summary
export interface DataQualityReport {
  // Activity log metrics
  totalRows: number;
  rowsDropped: number; // failed all normalization, unrecoverable
  rowsFixed: number; // normalized successfully after transform
  rowsFlagged: number; // parsed but with warnings

  // Join metrics
  employeesNoMetadata: number; // activity rows with no matching employee
  metadataNoActivity: number; // HR records with zero activity rows
  duplicateEmployeeIds: number; // duplicate IDs found and merged
  unmatchedActivityRows: number; // no employee record at all

  // Computed
  joinMatchRate: number; // (matchedRows / totalRows) * 100
  dataQualityScore: number; // (rowsFixed / totalRows) * 100

  // Detailed flags for the expandable error table
  flags: DataQualityFlag[];

  // Duplicate records details
  duplicateDetails: Array<{
    employee_id: string;
    kept_index: number;
    duplicate_indices: number[];
  }>;

  // Employees with no activity
  noActivityEmployees: string[]; // employee IDs

  // Activity with no matching employee
  unmatchedEmployeeIds: string[]; // employee_ids from activity that don't match
}

// Conflict type tags used during join
export type ConflictTag =
  | 'DUPLICATE_ID'
  | 'UNMATCHED_ACTIVITY'
  | 'NO_ACTIVITY_FOUND'
  | 'MISSING_METADATA'
  | 'FIELD_CONFLICT_DEPT';
