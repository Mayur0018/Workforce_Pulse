'use client';
import React, { createContext, useContext, useReducer, useCallback, useEffect, type ReactNode } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  FilterState,
  CrossFilterAction,
  DEFAULT_FILTER_STATE,
  FILTER_PARAMS,
} from '../../types/filters';

interface CrossFilterContextType {
  filters: FilterState;
  dispatch: React.Dispatch<CrossFilterAction>;
  clearAll: () => void;
  setDepartment: (dept: string | null) => void;
  setTask: (task: string | null) => void;
  setEmployee: (emp: string | null) => void;
  setApp: (app: string | null) => void;
  setWeek: (week: number | null) => void;
  hasActiveFilters: boolean;
}

const CrossFilterContext = createContext<CrossFilterContextType | null>(null);

function filterReducer(state: FilterState, action: CrossFilterAction): FilterState {
  switch (action.type) {
    case 'SET_DEPARTMENT': return { ...state, department: action.payload };
    case 'SET_TASK':       return { ...state, task_name: action.payload };
    case 'SET_EMPLOYEE':   return { ...state, employee_id: action.payload };
    case 'SET_APP':        return { ...state, app_name: action.payload };
    case 'SET_WEEK':       return { ...state, week: action.payload };
    case 'SET_DATE_RANGE': return { ...state, date_start: action.payload.start, date_end: action.payload.end };
    case 'RESET_ALL':      return { ...DEFAULT_FILTER_STATE };
    default: return state;
  }
}

export function CrossFilterProvider({ children }: { children: ReactNode }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Initialize from URL params
  const initialState: FilterState = {
    department: searchParams.get(FILTER_PARAMS.department),
    task_name: searchParams.get(FILTER_PARAMS.task_name),
    employee_id: searchParams.get(FILTER_PARAMS.employee_id),
    app_name: searchParams.get(FILTER_PARAMS.app_name),
    week: searchParams.get(FILTER_PARAMS.week) ? Number(searchParams.get(FILTER_PARAMS.week)) : null,
    date_start: searchParams.get(FILTER_PARAMS.date_start),
    date_end: searchParams.get(FILTER_PARAMS.date_end),
  };

  const [filters, dispatch] = useReducer(filterReducer, initialState);

  // Sync filters to URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.department) params.set(FILTER_PARAMS.department, filters.department);
    if (filters.task_name) params.set(FILTER_PARAMS.task_name, filters.task_name);
    if (filters.employee_id) params.set(FILTER_PARAMS.employee_id, filters.employee_id);
    if (filters.app_name) params.set(FILTER_PARAMS.app_name, filters.app_name);
    if (filters.week) params.set(FILTER_PARAMS.week, String(filters.week));
    if (filters.date_start) params.set(FILTER_PARAMS.date_start, filters.date_start);
    if (filters.date_end) params.set(FILTER_PARAMS.date_end, filters.date_end);

    const paramStr = params.toString();
    const newUrl = paramStr ? `${pathname}?${paramStr}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [filters, pathname, router]);

  const clearAll = useCallback(() => dispatch({ type: 'RESET_ALL' }), []);
  const setDepartment = useCallback((dept: string | null) => dispatch({ type: 'SET_DEPARTMENT', payload: dept }), []);
  const setTask = useCallback((task: string | null) => dispatch({ type: 'SET_TASK', payload: task }), []);
  const setEmployee = useCallback((emp: string | null) => dispatch({ type: 'SET_EMPLOYEE', payload: emp }), []);
  const setApp = useCallback((app: string | null) => dispatch({ type: 'SET_APP', payload: app }), []);
  const setWeek = useCallback((week: number | null) => dispatch({ type: 'SET_WEEK', payload: week }), []);

  const hasActiveFilters = Object.entries(filters).some(([, v]) => v !== null);

  return (
    <CrossFilterContext.Provider
      value={{ filters, dispatch, clearAll, setDepartment, setTask, setEmployee, setApp, setWeek, hasActiveFilters }}
    >
      {children}
    </CrossFilterContext.Provider>
  );
}

export function useCrossFilter() {
  const ctx = useContext(CrossFilterContext);
  if (!ctx) throw new Error('useCrossFilter must be used within CrossFilterProvider');
  return ctx;
}
