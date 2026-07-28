/**
 * utils.ts — Shared utility functions.
 */

/** Format a number as INR currency: ₹85,000 */
export function formatINR(amount: number): string {
  if (amount >= 10_00_000) {
    return `₹${(amount / 10_00_000).toFixed(2)}L`;
  }
  if (amount >= 1000) {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
  return `₹${amount.toFixed(0)}`;
}

/** Format hours: 82.5 → "82.5 hrs" or "3d 10.5h" */
export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  return `${hours.toFixed(1)}h`;
}

/** Format percentage: 0.876 → "87.6%" */
export function formatPct(ratio: number, decimals = 1): string {
  return `${(ratio * 100).toFixed(decimals)}%`;
}

/** Format delta with ▲/▼ and color class */
export function formatDelta(pct: number): { text: string; positive: boolean } {
  const positive = pct >= 0;
  const arrow = positive ? '▲' : '▼';
  return {
    text: `${arrow} ${Math.abs(pct).toFixed(1)}%`,
    positive,
  };
}

/** Clamp value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Title-case a string */
export function toTitleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Truncate text with ellipsis */
export function truncate(s: string, maxLen: number): string {
  return s.length > maxLen ? `${s.slice(0, maxLen - 1)}…` : s;
}

/** Generate a stable color from a string (for department/task colors) */
export function stringToColor(str: string, palette: readonly string[]): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

/** Format a Date as a readable date string */
export function formatDate(date: Date | null): string {
  if (!date) return 'N/A';
  return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Deep-equal two filter states */
export function filtersEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
