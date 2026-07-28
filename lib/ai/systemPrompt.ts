/**
 * systemPrompt.ts — AI grounding system prompt with dataset context injection.
 * The AI only answers using the provided context; never fabricates data.
 */
import type { AnalyticsOutput } from '../../types/analytics';

export function buildSystemPrompt(analytics: AnalyticsOutput): string {
  const { kpis, deptStats, employeeSummaries, anomalies, weeklyData, weeklyDeltas } = analytics;

  const dateRange = `${analytics.dateRange.start.toISOString().slice(0, 10)} to ${analytics.dateRange.end.toISOString().slice(0, 10)}`;

  const kpiContext = `
## KPI Summary
- Recoverable Hours/Month: ${kpis.recoverableHoursPerMonth.toFixed(1)} hrs
- Recoverable Cost/Month: ₹${kpis.recoverableCostPerMonth.toFixed(0)}
- Employees Analyzed: ${kpis.employeesAnalyzed}
- Departments: ${kpis.departmentCount}
- Data Quality Score: ${kpis.dataQualityScore.toFixed(1)}%
- Automation Opportunities: ${kpis.automationOpportunities}
`.trim();

  const deptContext = deptStats.map((d) =>
    `- ${d.department}: ${d.employee_count} employees, ${d.total_hours.toFixed(1)}h total, ` +
    `${(d.automation_rate * 100).toFixed(1)}% automation, ₹${d.recoverable_cost.toFixed(0)} recoverable cost`
  ).join('\n');

  const empContext = employeeSummaries.slice(0, 15).map((s) =>
    `- ${s.employee.name} (${s.employee.role}, ${s.employee.department}): ` +
    `${s.total_hours.toFixed(1)}h, ${(s.automation_rate * 100).toFixed(1)}% automation, ` +
    `${s.recoverable_hours.toFixed(1)} recoverable hrs`
  ).join('\n');

  const anomalyContext = anomalies.slice(0, 20).map((a) =>
    `- [${a.severity.toUpperCase()}] ${a.dimension}/${a.entity}: ${a.description}`
  ).join('\n');

  const wowContext = weeklyData.map((w, i) => {
    const delta = weeklyDeltas[i - 1];
    const deltaStr = delta
      ? ` (WoW: hours ${delta.total_hours_delta_pct > 0 ? '+' : ''}${delta.total_hours_delta_pct.toFixed(1)}%, automation ${delta.automation_rate_delta_pct > 0 ? '+' : ''}${delta.automation_rate_delta_pct.toFixed(1)}%)`
      : '';
    return `- Week ${w.week_number}: ${w.total_hours.toFixed(1)}h, ${(w.automation_rate * 100).toFixed(1)}% automation, ${w.recoverable_hours.toFixed(1)} recoverable hrs, ${w.anomaly_count} anomalies${deltaStr}`;
  }).join('\n');

  return `You are Workforce Pulse AI, a data analyst assistant for workforce analytics.

## CRITICAL RULES
1. You ONLY answer questions using the dataset context provided below.
2. You NEVER fabricate data, estimates, or trends not present in the dataset.
3. For EVERY quantitative claim you make, you MUST append a citation in this exact format:
   [cite: rows={N}, task="{task_name_or_NA}", employee="{employee_name_or_NA}", dept="{dept_or_NA}", date_range="${dateRange}", aggregation="{sum|avg|count|pct}", confidence="{high|medium|low}"]
4. If you cannot answer a question from the data, say "I cannot find that information in the provided dataset."
5. Never make up employee names, task names, or metrics not in the context.

## Dataset Overview
- Date Range: ${dateRange}
- Activity rows analyzed: dataset-derived
- Employees: ${kpis.employeesAnalyzed}
- Departments: ${kpis.departmentCount}

${kpiContext}

## Department Statistics
${deptContext}

## Employee Summaries (${employeeSummaries.length} employees)
${empContext}

## Anomalies Detected (${anomalies.length} total)
${anomalyContext}

## Week-over-Week Summary
${wowContext}
`;
}
