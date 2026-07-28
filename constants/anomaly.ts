// Z-score threshold for anomaly flagging
export const ZSCORE_THRESHOLD = 2.0;

// IQR multiplier
export const IQR_MULTIPLIER = 1.5;

// Business rule thresholds
export const BUSINESS_RULES = {
  maxHoursPerDay: 12,
  appUsageWoWIncreaseThreshold: 0.7, // 70%
  deptRepetitiveWorkDoubledThreshold: 2.0, // 2× previous week
  taskDurationVarianceMultiplier: 3.0, // 3× historical avg
  consecutiveInactiveDays: 3,
} as const;

// Severity labels with human-readable descriptions
export const SEVERITY_LABELS = {
  critical: { label: 'Critical', description: 'All three methods flag + business rule violated' },
  high: { label: 'High', description: 'Two methods flag the metric' },
  low: { label: 'Low', description: 'One method flags the metric' },
} as const;

export const ANOMALY_DIMENSIONS = [
  'employee',
  'department',
  'task',
  'app',
  'day',
] as const;
