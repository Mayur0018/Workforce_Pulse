Place your dataset files here before running:

1. activity_logs.csv   — ~540 rows, 4-week activity data
2. employees.json      — 15 employees, HRMS schema

The ETL pipeline will parse them as-is — dirty fields, duplicates, and all.
No synthetic data will be invented. Missing values are tracked as data quality flags.
