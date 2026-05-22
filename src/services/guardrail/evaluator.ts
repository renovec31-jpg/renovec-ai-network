// ══════════════════════════════════════════════════════════════════════════════
// RENOVEC Output Evaluator
// Takes an AI output + context, returns scores, violations, and decision.
// ══════════════════════════════════════════════════════════════════════════════

import type {
  EvaluationContext,
  EvaluationResult,
  DimensionScores,
  PolicyDimension,
  Violation,
  EvalDecision,
} from './types';
import { THRESHOLDS } from './types';
import { POLICY_RULES, DIMENSION_WEIGHTS, getViolationExcerpt } from './policy';

const ALL_DIMENSIONS: PolicyDimension[] = [
  'warmth',
  'usefulness',
  'nonIntrusiveness',
  'productAlignment',
  'trustClarity',
  'noPrematureBarrier',
  'noGenericAIStyle',
  'privacyRespect',
  'actionability',
  'overall',
];

export function evaluate(output: string, context: EvaluationContext): EvaluationResult {
  const violations: Violation[] = [];
  const dimensionPenalties: Record<PolicyDimension, number> = {} as Record<PolicyDimension, number>;

  for (const dim of ALL_DIMENSIONS) {
    dimensionPenalties[dim] = 0;
  }

  // Run each rule
  for (const rule of POLICY_RULES) {
    const passed = rule.test(output, context);
    if (!passed) {
      const excerpt = getViolationExcerpt(output, rule.id);
      violations.push({
        ruleId: rule.id,
        dimension: rule.dimension,
        severity: rule.severity,
        reason: rule.description,
        excerpt,
      });

      const penalty = rule.severity === 'critical' ? rule.weight * 2
        : rule.severity === 'major' ? rule.weight
        : rule.weight * 0.5;

      dimensionPenalties[rule.dimension] += penalty;
    }
  }

  // Compute per-dimension scores (100 - penalties, clamped 0-100)
  const scores: DimensionScores = {} as DimensionScores;
  let weightedSum = 0;
  let totalWeight = 0;

  for (const dim of ALL_DIMENSIONS) {
    if (dim === 'overall') continue;
    const raw = Math.max(0, Math.min(100, 100 - dimensionPenalties[dim]));
    scores[dim] = raw;
    const w = DIMENSION_WEIGHTS[dim] || 10;
    weightedSum += raw * w;
    totalWeight += w;
  }

  const overallScore = Math.round(weightedSum / totalWeight);
  scores.overall = overallScore;

  // Critical violation override: if any critical rule fails, cap at REWRITE threshold
  const hasCritical = violations.some(v => v.severity === 'critical');
  const effectiveScore = hasCritical ? Math.min(overallScore, THRESHOLDS.REWRITE - 1) : overallScore;

  // Decision
  let decision: EvalDecision;
  if (effectiveScore >= THRESHOLDS.PASS) {
    decision = 'pass';
  } else if (effectiveScore >= THRESHOLDS.REWRITE) {
    decision = 'rewrite';
  } else {
    decision = 'block';
  }

  // Reasons
  const reasons: string[] = [];
  if (hasCritical) {
    reasons.push('Violation critique détectée');
  }
  if (violations.length > 0) {
    const dims = [...new Set(violations.map(v => v.dimension))];
    reasons.push(`Dimensions impactées : ${dims.join(', ')}`);
  }
  if (decision === 'pass') {
    reasons.push('Output conforme à la politique RENOVEC');
  }

  return {
    scores,
    overallScore: effectiveScore,
    violations,
    decision,
    reasons,
  };
}
