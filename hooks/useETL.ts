'use client';
import { useState, useEffect, useCallback } from 'react';
import { runPipeline } from '../lib/pipeline';
import { computeDataQualityReport } from '../lib/etl/dataQuality';
import type { AnalyticsOutput } from '../types/analytics';
import type { DataQualityReport } from '../types/dataQuality';
import { computeBenchmarks } from '../lib/analytics/benchmark';
import type { EmployeeBenchmark } from '../types/benchmark';

export interface ETLState {
  analytics: AnalyticsOutput | null;
  dataQuality: DataQualityReport | null;
  benchmarks: Map<string, EmployeeBenchmark>;
  loading: boolean;
  error: string | null;
  dataLoaded: boolean;
}

export function useETL(): ETLState & { reload: () => void } {
  const [state, setState] = useState<ETLState>({
    analytics: null,
    dataQuality: null,
    benchmarks: new Map(),
    loading: true,
    error: null,
    dataLoaded: false,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      // Fetch both data files from public/data/
      const [csvRes, jsonRes] = await Promise.all([
        fetch('/data/activity_logs.csv'),
        fetch('/data/employees.json'),
      ]);

      if (!csvRes.ok) throw new Error(`Failed to load activity_logs.csv: ${csvRes.status}`);
      if (!jsonRes.ok) throw new Error(`Failed to load employees.json: ${jsonRes.status}`);

      const csvText = await csvRes.text();
      const rawJson = await jsonRes.json();

      // The real employees.json wraps the array in an object:
      // { generated_at, source_system, currency_default, notes, employees: [...] }
      // Support both: bare array OR wrapper object with employees key
      const employeesJson: unknown[] = Array.isArray(rawJson)
        ? rawJson
        : Array.isArray(rawJson?.employees)
        ? rawJson.employees
        : [];

      if (employeesJson.length === 0) {
        throw new Error('employees.json has no parseable employee records (expected array or { employees: [...] })');
      }

      const { analytics, dataQuality } = await runPipeline(csvText, employeesJson);
      const benchmarks = computeBenchmarks(analytics.employeeSummaries);

      setState({
        analytics,
        dataQuality,
        benchmarks,
        loading: false,
        error: null,
        dataLoaded: true,
      });
    } catch (err) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error loading data',
      }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { ...state, reload: load };
}
