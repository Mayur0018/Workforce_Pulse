/**
 * normalize.ts — All raw-to-normalized transform functions for ETL.
 * No synthetic data is produced. Missing/unparseable values throw
 * or return null so that the schema layer can flag them appropriately.
 */

// ─── Timestamp Normalization ────────────────────────────────────────────────

/**
 * Parse a timestamp string into a UTC Date.
 * Supports: ISO 8601, DD/MM/YYYY, MM-DD-YYYY, MM-DD-YYYY HH:mm, epoch ms.
 */
export function parseTimestamp(raw: string | number | undefined | null): Date | null {
  if (raw === null || raw === undefined || raw === '') return null;

  // Epoch milliseconds (number or numeric string > 9999999999)
  const numeric = typeof raw === 'number' ? raw : Number(raw);
  if (!isNaN(numeric) && numeric > 9_999_999_999) {
    return new Date(numeric);
  }

  const s = String(raw).trim();

  // ISO 8601 (contains T or Z or +)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d;
  }

  // DD/MM/YYYY or DD/MM/YYYY HH:mm
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (dmyMatch) {
    const [, day, month, year, hour = '0', min = '0'] = dmyMatch;
    const d = new Date(Date.UTC(+year, +month - 1, +day, +hour, +min));
    if (!isNaN(d.getTime())) return d;
  }

  // MM-DD-YYYY or MM-DD-YYYY HH:mm
  const mdyMatch = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
  if (mdyMatch) {
    const [, month, day, year, hour = '0', min = '0'] = mdyMatch;
    const d = new Date(Date.UTC(+year, +month - 1, +day, +hour, +min));
    if (!isNaN(d.getTime())) return d;
  }

  // Last resort: let JS try
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;

  return null;
}

// ─── Duration Normalization ─────────────────────────────────────────────────

/**
 * Parse a duration into whole minutes.
 * Supports: "2h 30m", "2h30m", "150m", "2.5" (hours assumed), 150 (number = minutes)
 */
export function parseDuration(raw: string | number | undefined | null): number | null {
  if (raw === null || raw === undefined || raw === '') return null;

  // Pure number → treat as minutes
  if (typeof raw === 'number') return raw > 0 ? raw : null;

  const s = String(raw).trim().toLowerCase();

  // "2h 30m" or "2h30m"
  const hmMatch = s.match(/^(\d+(?:\.\d+)?)\s*h(?:r|ours?)?\s*(?:(\d+(?:\.\d+)?)\s*m(?:in)?s?)?$/);
  if (hmMatch) {
    const hours = parseFloat(hmMatch[1]);
    const mins = hmMatch[2] ? parseFloat(hmMatch[2]) : 0;
    return Math.round(hours * 60 + mins);
  }

  // "150m" or "150min"
  const mMatch = s.match(/^(\d+(?:\.\d+)?)\s*m(?:in(?:s|utes?)?)?$/);
  if (mMatch) return Math.round(parseFloat(mMatch[1]));

  // Decimal string like "2.5" → hours
  const decMatch = s.match(/^(\d+\.\d+)$/);
  if (decMatch) return Math.round(parseFloat(decMatch[1]) * 60);

  // Integer string like "150"
  const intMatch = s.match(/^(\d+)$/);
  if (intMatch) return parseInt(intMatch[1], 10);

  return null;
}

// ─── Boolean Normalization ──────────────────────────────────────────────────

/**
 * Normalize is_automated field to boolean.
 * Supports: "yes"/"no", "true"/"false", 1/0, "Y"/"N", "1"/"0"
 */
export function parseBoolean(raw: string | boolean | number | undefined | null): boolean | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === 'boolean') return raw;
  if (raw === 1) return true;
  if (raw === 0) return false;
  const s = String(raw).trim().toLowerCase();
  if (['yes', 'true', '1', 'y'].includes(s)) return true;
  if (['no', 'false', '0', 'n'].includes(s)) return false;
  return null;
}

// ─── String Cleaning ────────────────────────────────────────────────────────

/** Trim + title-case a task name. "update crm  " → "Update Crm" */
export function normalizeTaskName(raw: string | undefined | null): string | null {
  if (!raw) return null;
  return raw
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Strip version suffixes from app names. "Chrome 98" → "Chrome" */
export function normalizeAppName(raw: string | undefined | null): string | null {
  if (!raw) return null;
  return raw
    .trim()
    // Remove version numbers like " 98", " 10.1", " v3"
    .replace(/\s+v?\d+[\.\d]*/gi, '')
    // Normalize known aliases
    .replace(/^microsoft\s+teams?$/i, 'Microsoft Teams')
    .replace(/^google\s+chrome?$/i, 'Chrome')
    .replace(/^ms\s+office?$/i, 'Microsoft Office')
    .trim();
}

// Department alias map — covers all departments present in the real dataset
const DEPT_ALIAS: Record<string, string> = {
  eng: 'Engineering',
  engineering: 'Engineering',
  dev: 'Engineering',
  development: 'Engineering',
  hr: 'Human Resources',
  'human resources': 'Human Resources',
  'human resource': 'Human Resources',
  sales: 'Sales',
  mkt: 'Marketing',
  marketing: 'Marketing',
  ops: 'Operations',
  operations: 'Operations',
  finance: 'Finance',
  fin: 'Finance',
  it: 'IT',
  support: 'Customer Support',
  'customer support': 'Customer Support',
  'cust support': 'Customer Support',
  'customer service': 'Customer Support',
  product: 'Product',
  design: 'Design',
  legal: 'Legal',
  admin: 'Admin',
  'customer success': 'Customer Success',
  cs: 'Customer Success',
};

/** Canonicalize department name. "eng", "ENGINEERING" → "Engineering" */
export function normalizeDepartment(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return DEPT_ALIAS[key] ?? raw.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Normalize employee ID — trim whitespace, uppercase for display but compare lowercase. */
export function normalizeEmployeeId(raw: string | number | undefined | null): string | null {
  if (raw === null || raw === undefined || raw === '') return null;
  // Store as uppercase (e.g. "E001") so display looks clean, join is case-insensitive
  return String(raw).trim().toUpperCase();
}

// ─── Compensation Normalization ─────────────────────────────────────────────

/**
 * Parse compensation to a plain INR annual number.
 * Supports: "₹85,000", "85000", "85k", "8.5L", 85000
 */
export function parseCompensation(raw: string | number | undefined | null): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return raw > 0 ? raw : null;

  const s = String(raw).trim().replace(/[₹,\s]/g, '');

  // "85k" → 85000
  const kMatch = s.match(/^(\d+(?:\.\d+)?)[kK]$/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);

  // "8.5L" or "8.5l" (lakh) → 850000
  const lMatch = s.match(/^(\d+(?:\.\d+)?)[lL]$/);
  if (lMatch) return Math.round(parseFloat(lMatch[1]) * 100000);

  // Plain number
  const n = parseFloat(s);
  return isNaN(n) || n <= 0 ? null : n;
}

// ─── Working Hours Normalization ────────────────────────────────────────────

/**
 * Parse working hours per day.
 * Supports: "9-5" → 8, "40hr/week" → 8, "8.5" → 8.5, "part-time" → 4
 */
export function parseWorkingHours(raw: string | number | undefined | null): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return raw > 0 && raw <= 24 ? raw : null;

  const s = String(raw).trim().toLowerCase();

  // "part-time" or "parttime"
  if (/part.?time/.test(s)) return 4;
  // "full-time" or "fulltime"
  if (/full.?time/.test(s)) return 8;

  // "9-5" → 8 hours
  const rangeMatch = s.match(/^(\d{1,2})\s*[-–]\s*(\d{1,2})$/);
  if (rangeMatch) {
    const start = parseInt(rangeMatch[1], 10);
    const end = parseInt(rangeMatch[2], 10);
    const diff = end > start ? end - start : end + 24 - start;
    return diff > 0 && diff <= 24 ? diff : null;
  }

  // "40hr/week" or "40h/week" → 8
  const weekMatch = s.match(/^(\d+(?:\.\d+)?)\s*h(?:r|ours?)?\/week$/);
  if (weekMatch) {
    const weekly = parseFloat(weekMatch[1]);
    return weekly > 0 ? Math.round((weekly / 5) * 10) / 10 : null;
  }

  // Decimal or integer
  const n = parseFloat(s);
  return !isNaN(n) && n > 0 && n <= 24 ? n : null;
}

// ─── Role Normalization ─────────────────────────────────────────────────────

/** Normalize role strings — trim and title-case. */
export function normalizeRole(raw: string | undefined | null): string | null {
  if (!raw) return null;
  return raw.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Name Normalization ─────────────────────────────────────────────────────

export function normalizeName(raw: string | undefined | null): string | null {
  if (!raw) return null;
  return raw.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}
