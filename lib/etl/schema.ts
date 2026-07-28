/**
 * schema.ts — Zod schemas with real-data-aware transforms.
 * Handles the exact dirty schema of the provided datasets:
 *   CSV: employee_id, department, timestamp, app_used, task_category,
 *        duration_minutes, is_repetitive
 *   JSON: mixed PascalCase / snake_case keys, salary_LPA / annual_ctc_inr /
 *         hourly_rate_inr, nested meta objects, @{} serialized strings
 */
import { z } from 'zod';
import {
  parseTimestamp,
  parseDuration,
  parseBoolean,
  normalizeTaskName,
  normalizeAppName,
  normalizeDepartment,
  normalizeEmployeeId,
  parseCompensation,
  parseWorkingHours,
  normalizeRole,
  normalizeName,
} from './normalize';

// ─── Activity Log Schema ──────────────────────────────────────────────────────
// Real CSV columns: employee_id, department, timestamp, app_used,
//                  task_category, duration_minutes, is_repetitive

export const ActivityLogRawSchema = z.object({
  // Required identifiers
  employee_id: z.union([z.string(), z.number()]).optional(),
  // timestamp may appear as many formats
  timestamp: z.union([z.string(), z.number()]).optional(),
  // Core fields — real CSV uses these names
  task_category: z.string().optional(),
  task_name: z.string().optional(),       // allow both names
  app_used: z.string().optional(),
  app_name: z.string().optional(),        // allow both names
  duration_minutes: z.union([z.string(), z.number()]).optional(),
  duration: z.union([z.string(), z.number()]).optional(), // fallback
  is_repetitive: z.union([z.string(), z.boolean(), z.number()]).optional(),
  is_automated: z.union([z.string(), z.boolean(), z.number()]).optional(), // fallback
  department: z.string().optional(),
}).passthrough();

export const ActivityLogSchema = ActivityLogRawSchema.transform((raw, ctx) => {
  const warnings: string[] = [];

  // employee_id
  const employee_id = normalizeEmployeeId(raw.employee_id);
  if (!employee_id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'employee_id missing or invalid' });
    return z.NEVER;
  }

  // timestamp
  const timestamp = parseTimestamp(raw.timestamp);
  if (!timestamp) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unparseable timestamp: ${raw.timestamp}` });
    return z.NEVER;
  }

  // task_name — real CSV uses task_category
  const rawTask = raw.task_category ?? raw.task_name;
  const task_name = normalizeTaskName(rawTask);
  if (!task_name) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `task_category/task_name missing` });
    return z.NEVER;
  }

  // app_name — real CSV uses app_used
  const rawApp = raw.app_used ?? raw.app_name;
  const app_name = normalizeAppName(rawApp) ?? 'Unknown';
  if (!rawApp) warnings.push('app_used/app_name missing — set to Unknown');

  // duration — real CSV uses duration_minutes (already in minutes as a number)
  const rawDuration = raw.duration_minutes ?? raw.duration;
  const duration_minutes = parseDuration(rawDuration);
  if (duration_minutes === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Unparseable duration: ${rawDuration}` });
    return z.NEVER;
  }
  if (duration_minutes <= 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Non-positive duration: ${duration_minutes}` });
    return z.NEVER;
  }

  // is_automated — real CSV uses is_repetitive
  const rawBool = raw.is_repetitive ?? raw.is_automated;
  const is_automated = parseBoolean(rawBool) ?? false;
  if (rawBool === undefined || rawBool === null) warnings.push('is_repetitive missing — defaulted to false');

  // department
  const department = normalizeDepartment(raw.department) ?? 'Unknown';
  if (!raw.department) warnings.push('department missing — set to Unknown');

  return {
    employee_id,
    timestamp,
    task_name,
    app_name,
    duration_minutes,
    is_automated,
    department,
    _warnings: warnings,
  };
});

export type ActivityLogNormalized = z.infer<typeof ActivityLogSchema>;

// ─── Employee Schema ──────────────────────────────────────────────────────────
// Real JSON has two distinct shapes (PascalCase vs snake_case) plus
// nested meta objects and @{} serialized strings.

/**
 * Flatten nested meta object (E009/E010 pattern).
 * meta.compensation is a string like "@{currency=INR; annual=590000}"
 */
function flattenMeta(raw: Record<string, unknown>): Record<string, unknown> {
  const meta = raw.meta as Record<string, unknown> | undefined;
  if (!meta) return raw;
  return {
    ...raw,
    // hoist meta fields if not already top-level
    role: raw.role ?? meta.role,
    compensation: raw.compensation ?? meta.compensation,
    tenure_months: raw.tenure_months ?? meta.tenure_months,
    working_hours: raw.working_hours ?? meta.working_hours,
  };
}

/**
 * Parse @{currency=INR; annual=590000} strings produced by PowerShell
 * serialization of PSCustomObject.
 */
function parsePSCompensation(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  // "@{currency=INR; annual=590000}" or "@{currency=INR; annual=670000}"
  const match = value.match(/annual\s*=\s*(\d[\d,]*)/i);
  if (match) return parseInt(match[1].replace(/,/g, ''), 10);
  return null;
}

export const EmployeeRawSchema = z
  .object({
    // PascalCase (HRMS schema 1) — E001–E003, E007–E008, E013, E015
    EmployeeID: z.union([z.string(), z.number()]).optional(),
    Name: z.string().optional(),
    Dept: z.string().optional(),
    Role: z.string().optional(),
    salary_LPA: z.number().optional(),
    tenureMonths: z.number().optional(),
    workingHours: z.union([z.string(), z.number(), z.null()]).optional(),
    Status: z.string().optional(),

    // snake_case (HRMS schema 2) — E004–E006, E009–E012, E014
    employee_id: z.union([z.string(), z.number()]).optional(),
    name: z.string().optional(),
    department: z.string().optional(),
    role: z.string().optional(),
    annual_ctc_inr: z.number().optional(),
    hourly_rate_inr: z.number().optional(),
    tenure_months: z.number().optional(),
    working_hours: z.union([z.string(), z.number(), z.object({}).passthrough(), z.null()]).optional(),
    status: z.string().optional(),

    // Nested meta (E009/E010)
    meta: z.object({}).passthrough().optional(),

    // Shared optional fields
    compensation: z.union([z.string(), z.number()]).optional(),
    email: z.string().optional(),
    terminated_on: z.string().optional(),
  })
  .passthrough();

export const EmployeeSchema = EmployeeRawSchema.transform((rawInput, ctx) => {
  const raw = flattenMeta(rawInput as Record<string, unknown>) as Record<string, unknown>;
  const warnings: string[] = [];
  const ANNUAL_WORKING_DAYS = 260;

  // id — PascalCase takes priority, then snake_case
  const rawId = (raw.EmployeeID ?? raw.employee_id) as string | number | undefined;
  const id = normalizeEmployeeId(rawId);
  if (!id) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Employee ID missing' });
    return z.NEVER;
  }

  // name
  const rawName = (raw.Name ?? raw.name) as string | undefined;
  const name = normalizeName(rawName) ?? `Employee ${id}`;
  if (!rawName) warnings.push(`name missing — set to "Employee ${id}"`);

  // role
  const rawRole = (raw.Role ?? raw.role) as string | undefined;
  const role = normalizeRole(rawRole) ?? 'Unknown';
  if (!rawRole) warnings.push('role missing — set to Unknown');

  // department
  const rawDept = (raw.Dept ?? raw.department) as string | undefined;
  const department = normalizeDepartment(rawDept) ?? 'Unknown';
  if (!rawDept) warnings.push('department missing — set to Unknown');

  // status
  const rawStatus = ((raw.Status ?? raw.status) as string | undefined)?.toLowerCase() ?? 'active';
  const status: 'active' | 'inactive' | 'terminated' =
    rawStatus === 'terminated' ? 'terminated' :
    rawStatus === 'inactive'   ? 'inactive'   : 'active';

  // compensation — resolve from multiple formats:
  //   1. salary_LPA (LPA × 100000)
  //   2. annual_ctc_inr (direct INR)
  //   3. hourly_rate_inr → derive annual: hourly × 260 × working_hours
  //   4. compensation string (may be @{} format from meta)
  let compensation_inr: number | null = null;

  if (typeof raw.salary_LPA === 'number') {
    compensation_inr = Math.round(raw.salary_LPA * 100000);
  } else if (typeof raw.annual_ctc_inr === 'number') {
    compensation_inr = raw.annual_ctc_inr;
  } else if (typeof raw.hourly_rate_inr === 'number') {
    // Derive annual from hourly_rate
    compensation_inr = Math.round(raw.hourly_rate_inr * ANNUAL_WORKING_DAYS * 9); // 9h/day default
  } else if (raw.compensation !== undefined && raw.compensation !== null) {
    // Try @{} PS format first, then generic parseCompensation
    compensation_inr = parsePSCompensation(raw.compensation) ?? parseCompensation(raw.compensation as any);
    if (compensation_inr === null) {
      warnings.push(`compensation unparseable: ${raw.compensation} — excluded from cost calculations`);
    }
  } else {
    warnings.push('compensation missing — excluded from cost calculations');
  }

  // working_hours — multiple formats
  let rawHours: unknown = raw.workingHours ?? raw.working_hours ?? null;
  // If it's an object {start, end, timezone} calculate from times
  if (rawHours && typeof rawHours === 'object' && !Array.isArray(rawHours)) {
    const h = rawHours as { start?: string; end?: string };
    if (h.start && h.end) {
      const toMins = (t: string) => {
        const [hr, min = '0'] = t.split(':');
        return Number(hr) * 60 + Number(min);
      };
      rawHours = (toMins(h.end) - toMins(h.start)) / 60;
    } else {
      rawHours = null;
    }
  }
  const working_hours_per_day = parseWorkingHours(rawHours as any) ?? 9; // 9h default (9-18 schedule)
  if (rawHours === null || rawHours === undefined) warnings.push('working_hours missing — defaulted to 9h/day');

  // hire_date (not in this dataset — will be null)
  const hire_date: Date | null = null;

  // hourly_rate
  const hourly_rate =
    typeof raw.hourly_rate_inr === 'number'
      ? raw.hourly_rate_inr
      : compensation_inr !== null
      ? compensation_inr / (ANNUAL_WORKING_DAYS * working_hours_per_day)
      : 0;

  // tenure
  const tenureMonths = ((raw.tenureMonths ?? raw.tenure_months) as number | undefined) ?? 0;

  return {
    id,
    name,
    role,
    department,
    status,
    compensation_inr: compensation_inr ?? 0,
    working_hours_per_day,
    hire_date,
    email: (raw.email as string | undefined) ?? '',
    hourly_rate,
    tenure_months: tenureMonths,
    _warnings: warnings,
    _hasCompensation: compensation_inr !== null,
  };
});

export type EmployeeNormalized = z.infer<typeof EmployeeSchema>;
