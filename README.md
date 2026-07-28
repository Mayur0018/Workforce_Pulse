# Workforce Pulse

A production-ready workforce analytics SaaS that ingests two real datasets — `employees.json` (15 employees, HRMS schema) and `activity_logs.csv` (~540 rows, 4 weeks of activity) — and surfaces automation opportunities, recoverable cost estimates, anomaly detection, and AI-powered insights through a dark glassmorphism dashboard.

> **Strict rule**: No synthetic rows are invented. No fields are fabricated. Every metric derives exclusively from the provided data.

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Place data files (REQUIRED before running)
#    Copy your files to:
#    public/data/activity_logs.csv
#    public/data/employees.json

# 3. Set up environment (optional — only needed for AI assistant)
cp .env.example .env.local
# Edit .env.local and add: OPENAI_API_KEY=sk-...

# 4. Run development server
npm run dev

# Open http://localhost:3000 → auto-redirects to /dashboard
```

---

## Assumptions

- **Currency**: All compensation values are treated as INR (Indian Rupees). The `₹` symbol is used throughout.
- **Working days**: 260 annual working days (52 weeks × 5 days) assumed for hourly rate computation.
- **Default working hours**: If `working_hours` is missing, 8 hours/day is assumed.
- **Dataset scope**: The pipeline processes all rows in the provided files as-is. The 4-week window is derived from the actual date range in the CSV, not from calendar months.
- **Validation factor**: A conservative 15% safety margin (`validation_factor = 0.85`) is applied to all recoverable hours estimates to account for exceptions and edge cases.
- **Automation confidence threshold**: Tasks with automation confidence score >= 0.6 are counted as "Automation Opportunities".
- **AI model**: `gpt-4o-mini` is used for the AI assistant.

---

## Normalization Rules

All normalization is implemented in `lib/etl/normalize.ts` and applied via Zod transforms in `lib/etl/schema.ts`.

### Timestamp Parsing
| Raw Format | Parsed As |
|---|---|
| `"2024-01-15T09:30:00Z"` (ISO 8601) | UTC Date |
| `"15/01/2024"` (DD/MM/YYYY) | UTC Date |
| `"01-15-2024 09:30"` (MM-DD-YYYY HH:mm) | UTC Date |
| `1705308600000` (epoch ms) | UTC Date |

### Duration Parsing
| Raw Value | Parsed As |
|---|---|
| `"2h 30m"`, `"2h30m"` | 150 minutes |
| `"150m"`, `"150min"` | 150 minutes |
| `"2.5"` (decimal hours) | 150 minutes |
| `150` (number) | 150 minutes |

### Boolean (is_automated)
| Raw Value | Parsed As |
|---|---|
| `"yes"`, `"true"`, `"1"`, `"Y"`, `1` | `true` |
| `"no"`, `"false"`, `"0"`, `"N"`, `0` | `false` |
| Unparseable | `false` + warning flag |

### App Name Cleaning
- Version suffixes stripped: `"Chrome 98"` becomes `"Chrome"`
- Known aliases resolved: `"MS Office"` becomes `"Microsoft Office"`

### Department Canonicalization
- `"eng"`, `"ENGINEERING"`, `"development"` all become `"Engineering"`
- Full alias map in `lib/etl/normalize.ts`

### Compensation Parsing
| Raw Value | Parsed As |
|---|---|
| `"85k"` | 85,000 |
| `"8.5L"` | 850,000 |
| `"85,000"`, `85000` | 85,000 |

### Working Hours Parsing
| Raw Value | Parsed As |
|---|---|
| `"9-5"` | 8 h/day |
| `"40hr/week"` | 8 h/day |
| `"part-time"` | 4 h/day |

---

## Join Strategy & Conflict Resolution

Join key: `activity_logs.employee_id` <-> `employees.id` (both normalized to trimmed lowercase strings).

| Scenario | Resolution |
|---|---|
| **Duplicate employee IDs** | Keep first occurrence; flag duplicates as `DUPLICATE_ID` |
| **Unknown activity IDs** | Mark as `UNMATCHED_ACTIVITY`; include in anomaly panel; exclude from cost calculations |
| **Extra HR records** (no activity) | Keep employee; mark as `NO_ACTIVITY_FOUND`; surfaced in data quality panel |
| **Department conflicts** | `employees.json` is authoritative; activity value flagged as `FIELD_CONFLICT_DEPT` |

---

## Compensation Normalization

Normalized to a plain INR annual figure. Hourly rate used for cost calculations:

```
hourly_rate = annual_compensation / (260 working_days x working_hours_per_day)
```

Employees with missing/unparseable compensation are excluded from cost calculations with a `MISSING_METADATA` warning.

---

## Recoverable Hours Methodology

```
RecoverableHours (monthly) =
  Sum per_task (
    avg_duration_minutes(task) x monthly_task_count
    x automation_confidence(task)
    x 0.85  [validation factor]
  ) / 60

automation_confidence(task) =
  0.35 x normalized_frequency_score    [task_count / max_task_count]
  + 0.30 x repetition_ratio           [identical_runs / total_runs]
  + 0.20 x employee_coverage_ratio    [distinct_employees / total_employees]
  + 0.15 x task_standardization_score [1 - min(CV, 1)]

RecoverableCost (INR monthly) =
  Sum per_employee (
    employee_recoverable_hours x employee_hourly_rate
  )
```

"Identical runs" = task instances with duration within +/- 10% of the task mean.

---

## Automation Priority Scoring

```
AutomationScore(task) =
  0.35 x TaskVolumeScore
  + 0.30 x RepetitivenessScore
  + 0.20 x EmployeeCoverageScore
  + 0.15 x RupeeImpactScore
```

Tasks ranked descending (0-1 scale). Scores >= 0.6 flagged as Automation Opportunities.

| Score | Action |
|---|---|
| >= 0.80 | Automate Immediately |
| 0.60-0.79 | Strong Automation Candidate |
| 0.40-0.59 | Evaluate for Partial Automation |
| 0.20-0.39 | Monitor & Assess Periodically |
| < 0.20 | Low Priority |

---

## Anomaly Detection Method

Three methods combined in `lib/analytics/anomaly.ts`:

| Method | Threshold |
|---|---|
| Z-Score | `abs(z) > 2.0` |
| IQR | `value < Q1 - 1.5*IQR` or `value > Q3 + 1.5*IQR` |
| Business Rules | See below |

Business rules:
- Employee logged > 12 hours on a single day
- App usage increased > 70% week-over-week
- Department hours doubled in a week
- Task duration std dev > 3x mean
- Employee had > 3 consecutive working days with no activity

Severity: `critical` (all 3 methods) / `high` (2 methods) / `low` (1 method).

Dimensions: employee, department, task, app, day.

---

## AI Grounding & Citation Protocol

Powered by `gpt-4o-mini` with `temperature: 0.2`. Rules:

1. Only answers using injected dataset context
2. Never fabricates data or estimates
3. Every quantitative claim includes:

```
[cite: rows={N}, task="{task}", employee="{name}", dept="{dept}",
       date_range="{start}-{end}", aggregation="{sum|avg|count}",
       confidence="{high|medium|low}"]
```

Citations are parsed and rendered as clickable CitationChip components.
Last 20 messages passed per request for multi-turn context.

---

## Trade-offs & Decisions

| Decision | Rationale |
|---|---|
| Client-side ETL | Stateless, portable — runs with just `npm run dev` |
| Zod `.transform()` for normalization | Single source of truth; per-row errors with full detail |
| First-occurrence wins for duplicate IDs | Deterministic; no guessing which record is correct |
| employees.json authoritative for dept | HRMS is canonical source of organizational structure |
| Validation factor 0.85 | Prevents over-promising automation ROI |
| `gpt-4o-mini` low temperature | Factual, cost-effective; minimizes hallucination risk |
| Weeks derived from dataset dates | Accurate regardless of when data was generated |

---

## Future Work

- Real-time data ingestion via webhook or database connector
- Role-based access control (manager vs. employee vs. HR views)
- Custom anomaly business rules configurable per organization
- Slack/Teams integration for anomaly alerts and weekly summaries
- Historical multi-month trend analysis beyond the 4-week window
- ML-based automation confidence replacing the weighted formula
- Export customization (choose sections for PDF report)
- Multi-tenant support for SaaS deployment
