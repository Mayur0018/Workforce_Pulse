/**
 * parseEmployees.ts — Parse employees.json using Zod.
 * Detects duplicate IDs (keep first, flag rest).
 * No rows are invented.
 */
import { EmployeeRawSchema, EmployeeSchema } from './schema';
import type { Employee } from '../../types/employee';
import type { DataQualityFlag } from '../../types/dataQuality';
import { normalizeEmployeeId } from './normalize';

export interface ParseEmployeesResult {
  data: Employee[];
  totalRecords: number;
  recordsDropped: number;
  recordsFlagged: number;
  duplicateDetails: Array<{
    employee_id: string;
    kept_index: number;
    duplicate_indices: number[];
  }>;
  flags: DataQualityFlag[];
}

export function parseEmployees(jsonData: unknown[]): ParseEmployeesResult {
  const data: Employee[] = [];
  const flags: DataQualityFlag[] = [];
  const seenIds = new Map<string, number>(); // id → first array index
  const duplicateMap = new Map<string, number[]>(); // id → [dup indices]

  let recordsDropped = 0;
  let recordsFlagged = 0;

  jsonData.forEach((record, idx) => {
    // Raw validation
    const rawResult = EmployeeRawSchema.safeParse(record);
    if (!rawResult.success) {
      recordsDropped++;
      flags.push({
        rowIndex: idx + 1,
        field: 'record',
        rawValue: JSON.stringify(record),
        issue: 'Record failed raw schema validation',
        resolution: 'Dropped',
        severity: 'error',
      });
      return;
    }

    // Full normalization
    const result = EmployeeSchema.safeParse(record);
    if (!result.success) {
      recordsDropped++;
      result.error.issues.forEach((issue) => {
        flags.push({
          rowIndex: idx + 1,
          field: issue.path.join('.') || 'record',
          rawValue: String((record as any)[issue.path[0] as string] ?? ''),
          issue: issue.message,
          resolution: 'Record dropped — unrecoverable',
          severity: 'error',
        });
      });
      return;
    }

    const normalized = result.data;
    const { id } = normalized;
    const warnings: string[] = (normalized as any)._warnings ?? [];

    // Duplicate ID detection
    if (seenIds.has(id)) {
      const firstIdx = seenIds.get(id)!;
      if (!duplicateMap.has(id)) duplicateMap.set(id, []);
      duplicateMap.get(id)!.push(idx + 1);
      flags.push({
        rowIndex: idx + 1,
        field: 'id',
        rawValue: id,
        issue: `Duplicate employee ID — first seen at row ${firstIdx + 1}`,
        resolution: 'DUPLICATE_ID — this record skipped, first kept',
        severity: 'warning',
      });
      recordsFlagged++;
      return; // Keep first occurrence only
    }

    seenIds.set(id, idx);

    if (warnings.length > 0) {
      recordsFlagged++;
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
    }

    // Build final Employee (strip internal fields)
    const { _warnings: _w, _hasCompensation: _h, ...clean } = normalized as any;
    data.push(clean as Employee);
  });

  const duplicateDetails = Array.from(duplicateMap.entries()).map(([employee_id, dup_indices]) => ({
    employee_id,
    kept_index: seenIds.get(employee_id)! + 1,
    duplicate_indices: dup_indices,
  }));

  return {
    data,
    totalRecords: jsonData.length,
    recordsDropped,
    recordsFlagged,
    duplicateDetails,
    flags,
  };
}
