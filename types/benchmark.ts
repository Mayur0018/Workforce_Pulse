// Single benchmark metric for role/dept comparison
export interface BenchmarkMetric {
  label: string;
  employee_value: number;
  peer_avg: number;
  peer_min: number;
  peer_max: number;
  unit: string; // "hrs", "%", "tasks", etc.
}

// Result of role-level benchmarking
export interface RoleBenchmark {
  employee_id: string;
  role: string;
  peer_count: number; // other employees with same role
  metrics: BenchmarkMetric[]; // hours/day, automation rate, task volume
}

// Result of department-level benchmarking (used in radar chart)
export interface DeptBenchmark {
  employee_id: string;
  department: string;
  peer_count: number;
  // Radar chart: 5 dimensions
  dimensions: Array<{
    axis: string;
    employee_value: number; // normalized 0-1 for radar
    dept_avg: number; // normalized 0-1
  }>;
}

// Peer percentile ranking for a specific metric
export interface PeerPercentile {
  employee_id: string;
  metric: string;
  value: number;
  percentile: number; // 0-100
  label: string; // e.g. "Top 20% in automation rate"
  direction: 'high_good' | 'low_good'; // whether higher value = better
}

// Full benchmark result for one employee
export interface EmployeeBenchmark {
  employee_id: string;
  role_benchmark: RoleBenchmark;
  dept_benchmark: DeptBenchmark;
  peer_percentiles: PeerPercentile[];
}
