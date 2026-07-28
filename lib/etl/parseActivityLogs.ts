/**
 * parseActivityLogs.ts — Parse activity_logs.csv using PapaParse + Zod.
 * Emits per-row results for data quality tracking. No rows are invented.
 */
import Papa from 'papaparse';
import { ActivityLogRawSchema, ActivityLogSchema } from './schema';
import type { ActivityLog } from '../../types/activity';
import type { DataQualityFlag } from '../../types/dataQuality';

export interface ParseActivityLogsResult {
  data: ActivityLog[];
  totalRows: number;
  rowsFixed: number;
  rowsDropped: number;
  rowsFlagged: number;
  flags: DataQualityFlag[];
}

/**
 * Parse raw CSV text into normalized ActivityLog records.
 * All normalization happens in the Zod transform — this function
 * only orchestrates parsing and error collection.
 */
export function parseActivityLogs(csvText: string): ParseActivityLogsResult {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  const rows = parsed.data as Record<string, unknown>[];
  const totalRows = rows.length;

  const data: ActivityLog[] = [];
  const flags: DataQualityFlag[] = [];
  let rowsDropped = 0;
  let rowsFlagged = 0;
  let rowsFixed = 0;

  rows.forEach((row, idx) => {
    // First validate raw shape
    const rawResult = ActivityLogRawSchema.safeParse(row);
    if (!rawResult.success) {
      rowsDropped++;
      flags.push({
        rowIndex: idx + 1,
        field: 'row',
        rawValue: JSON.stringify(row),
        issue: 'Row failed raw schema validation',
        resolution: 'Dropped',
        severity: 'error',
      });
      return;
    }

    // Then run full normalization transform
    const result = ActivityLogSchema.safeParse(row);
    if (!result.success) {
      rowsDropped++;
      result.error.issues.forEach((issue) => {
        flags.push({
          rowIndex: idx + 1,
          field: issue.path.join('.') || 'row',
          rawValue: String(row[issue.path[0] as string] ?? ''),
          issue: issue.message,
          resolution: 'Row dropped — unrecoverable',
          severity: 'error',
        });
      });
      return;
    }

    const normalized = result.data;
    const warnings: string[] = (normalized as any)._warnings ?? [];

    if (warnings.length > 0) {
      rowsFlagged++;
      warnings.forEach((w) => {
        flags.push({
          rowIndex: idx + 1,
          field: 'multiple',
          rawValue: '',
          issue: w,
          resolution: 'Normalized with default/fallback value',
          severity: 'warning',
        });
      });
    } else {
      rowsFixed++;
    }

    // Build the final ActivityLog (strip internal _warnings field)
    const { _warnings: _w, ...clean } = normalized as any;
    data.push({
      rowIndex: idx + 1,
      ...clean,
    } as ActivityLog);
  });

  return {
    data,
    totalRows,
    rowsFixed,
    rowsDropped,
    rowsFlagged,
    flags,
  };
}
