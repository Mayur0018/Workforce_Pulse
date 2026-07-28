// Global filter state used for cross-filtering
export interface FilterState {
  department: string | null;
  task_name: string | null;
  employee_id: string | null;
  app_name: string | null;
  week: number | null; // 1-4, null = all weeks
  date_start: string | null; // ISO string
  date_end: string | null;
}

// Actions dispatched to the filter reducer
export type CrossFilterAction =
  | { type: 'SET_DEPARTMENT'; payload: string | null }
  | { type: 'SET_TASK'; payload: string | null }
  | { type: 'SET_EMPLOYEE'; payload: string | null }
  | { type: 'SET_APP'; payload: string | null }
  | { type: 'SET_WEEK'; payload: number | null }
  | { type: 'SET_DATE_RANGE'; payload: { start: string | null; end: string | null } }
  | { type: 'RESET_ALL' };

export const DEFAULT_FILTER_STATE: FilterState = {
  department: null,
  task_name: null,
  employee_id: null,
  app_name: null,
  week: null,
  date_start: null,
  date_end: null,
};

// URL search param keys
export const FILTER_PARAMS = {
  department: 'dept',
  task_name: 'task',
  employee_id: 'emp',
  app_name: 'app',
  week: 'week',
  date_start: 'from',
  date_end: 'to',
} as const;
