// Raw shape as it comes from CSV (all strings)
export interface RawActivityLog {
  employee_id?: string;
  timestamp?: string;
  task_name?: string;
  app_name?: string;
  duration?: string | number;
  is_automated?: string | boolean | number;
  department?: string;
  [key: string]: unknown;
}

// Normalized shape after ETL transforms
export interface ActivityLog {
  rowIndex: number;
  employee_id: string;
  timestamp: Date;
  task_name: string;
  app_name: string;
  duration_minutes: number;
  is_automated: boolean;
  department: string;
}

// Result of parsing a single row
export interface ActivityParseResult {
  success: boolean;
  data?: ActivityLog;
  error?: string;
  raw: RawActivityLog;
  rowIndex: number;
  flagged?: string[]; // warnings — parsed but imperfect
}

// Task-level aggregation used in automation scoring
export interface TaskAggregate {
  task_name: string;
  total_count: number;
  total_duration_minutes: number;
  avg_duration_minutes: number;
  std_dev_duration: number;
  distinct_employees: number;
  identical_runs: number; // runs with same duration (near-identical)
  is_automated_count: number;
  automation_ratio: number;
  weekly_counts: number[]; // per-week counts [w1,w2,w3,w4]
  app_names: string[];
}
