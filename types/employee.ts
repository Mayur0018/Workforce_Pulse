// Raw shape as it comes from JSON (before transforms)
export interface RawEmployee {
  id?: string | number;
  employee_id?: string | number;
  name?: string;
  full_name?: string;
  role?: string;
  designation?: string;
  department?: string;
  dept?: string;
  compensation?: string | number;
  salary?: string | number;
  annual_compensation?: string | number;
  working_hours?: string | number;
  hours_per_day?: string | number;
  hire_date?: string;
  joining_date?: string;
  email?: string;
  [key: string]: unknown;
}

// Normalized shape after ETL transforms
export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  compensation_inr: number; // annual, in INR
  working_hours_per_day: number;
  hire_date: Date | null;
  email: string;
  hourly_rate: number; // computed: compensation / (260 working_days * hours_per_day)
}

// Employee parse result
export interface EmployeeParseResult {
  success: boolean;
  data?: Employee;
  error?: string;
  raw: RawEmployee;
  flagged?: string[];
  isDuplicate?: boolean;
}

// Joined record: activity + employee metadata
export interface EnrichedActivity {
  activity: import('./activity').ActivityLog;
  employee: Employee | null;
  matchStatus: 'MATCHED' | 'UNMATCHED_ACTIVITY' | 'MISSING_METADATA';
}
