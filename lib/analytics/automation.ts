/**
 * automation.ts — 4-factor automation priority scoring.
 * Score = 0.35*Volume + 0.30*Repetitiveness + 0.20*Coverage + 0.15*RupeeImpact
 */
import type { TaskAggregate } from '../../types/activity';
import type { AutomationScore } from '../../types/analytics';
import type { JoinedRecord } from '../etl/join';
import type { Employee } from '../../types/employee';
import { AUTOMATION_WEIGHTS } from '../../constants/kpi';

function getRecommendedAction(score: number): string {
  if (score >= 0.8) return 'Automate Immediately — High ROI';
  if (score >= 0.6) return 'Strong Automation Candidate';
  if (score >= 0.4) return 'Evaluate for Partial Automation';
  if (score >= 0.2) return 'Monitor & Assess Periodically';
  return 'Low Priority — Manual Process Preferred';
}

export function rankTasksByAutomation(
  tasks: TaskAggregate[],
  joined: JoinedRecord[],
  employees: Employee[]
): AutomationScore[] {
  const totalEmployees = employees.length;
  const maxTaskCount = Math.max(...tasks.map((t) => t.total_count), 1);

  // Compute per-task rupee impact
  const empMap = new Map<string, Employee>(employees.map((e) => [e.id, e]));

  // Group activity by task for cost computation
  const taskCostMap = new Map<string, number>();
  joined.forEach(({ activity, employee, matchStatus }) => {
    if (matchStatus !== 'MATCHED' || !employee) return;
    const emp = empMap.get(employee.id);
    if (!emp || emp.hourly_rate === 0) return;
    const hourlyRate = emp.hourly_rate;
    const cost = (activity.duration_minutes / 60) * hourlyRate;
    taskCostMap.set(activity.task_name, (taskCostMap.get(activity.task_name) ?? 0) + cost);
  });

  const maxCostImpact = Math.max(...Array.from(taskCostMap.values()), 1);

  const scored: AutomationScore[] = tasks.map((task, _idx) => {
    // Factor 1: Task Volume Score
    const taskVolumeScore = task.total_count / maxTaskCount;

    // Factor 2: Repetitiveness Score (identical/near-identical runs)
    const repetitivenessScore =
      task.total_count > 0 ? task.identical_runs / task.total_count : 0;

    // Factor 3: Employee Coverage Score
    const employeeCoverageScore =
      totalEmployees > 0 ? task.distinct_employees / totalEmployees : 0;

    // Factor 4: Rupee Impact Score
    const rupeeImpact = taskCostMap.get(task.task_name) ?? 0;
    const rupeeImpactScore = rupeeImpact / maxCostImpact;

    const automationScore =
      AUTOMATION_WEIGHTS.taskVolume * taskVolumeScore +
      AUTOMATION_WEIGHTS.repetitiveness * repetitivenessScore +
      AUTOMATION_WEIGHTS.employeeCoverage * employeeCoverageScore +
      AUTOMATION_WEIGHTS.rupeeImpact * rupeeImpactScore;

    return {
      rank: 0, // set after sort
      task_name: task.task_name,
      task_volume_score: taskVolumeScore,
      repetitiveness_score: repetitivenessScore,
      employee_coverage_score: employeeCoverageScore,
      rupee_impact_score: rupeeImpactScore,
      automation_score: automationScore,
      recommended_action: getRecommendedAction(automationScore),
      volume: task.total_count,
      repetitive_pct: repetitivenessScore * 100,
      employee_coverage_pct: employeeCoverageScore * 100,
      rupee_impact: rupeeImpact,
    };
  });

  // Sort descending by automation_score, assign rank
  return scored
    .sort((a, b) => b.automation_score - a.automation_score)
    .map((item, i) => ({ ...item, rank: i + 1 }));
}
