// Annual working days assumption
export const ANNUAL_WORKING_DAYS = 260; // 52 weeks × 5 days

// Conservative validation factor for recoverable hours
export const VALIDATION_FACTOR = 0.85;

// Automation confidence threshold for counting opportunities
export const AUTOMATION_OPPORTUNITY_THRESHOLD = 0.6;

// Automation score factor weights
export const AUTOMATION_WEIGHTS = {
  taskVolume: 0.35,
  repetitiveness: 0.30,
  employeeCoverage: 0.20,
  rupeeImpact: 0.15,
} as const;

// Recoverable hours confidence factor weights (same as automation confidence)
export const RECOVERABLE_HOURS_WEIGHTS = {
  normalizedFrequency: 0.35,
  repetitionRatio: 0.30,
  employeeCoverage: 0.20,
  taskStandardization: 0.15,
} as const;

// KPI card labels
export const KPI_LABELS = {
  recoverableHoursPerMonth: 'Recoverable Hours / Month',
  recoverableCostPerMonth: 'Recoverable Cost / Month',
  employeesAnalyzed: 'Employees Analyzed',
  departmentCount: 'Departments',
  dataQualityScore: 'Data Quality Score',
  automationOpportunities: 'Automation Opportunities',
} as const;
