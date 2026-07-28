// Chart color palette (matches design system)
export const CHART_COLORS = {
  primary: '#7c3aed',
  secondary: '#06b6d4',
  accent: '#f59e0b',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f97316',
  muted: '#475569',
  departments: [
    '#7c3aed', '#06b6d4', '#10b981', '#f59e0b',
    '#ef4444', '#f97316', '#8b5cf6', '#0ea5e9',
    '#14b8a6', '#eab308',
  ],
} as const;

export const ANOMALY_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  low: '#f59e0b',
} as const;

// Chart dimensions
export const CHART_MARGIN = { top: 10, right: 20, left: 0, bottom: 0 };
export const CHART_HEIGHT = 280;
export const TREND_CHART_HEIGHT = 320;
