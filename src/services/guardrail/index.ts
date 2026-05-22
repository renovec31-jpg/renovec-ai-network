// ══════════════════════════════════════════════════════════════════════════════
// RENOVEC Output Guardrail — Public API
// ══════════════════════════════════════════════════════════════════════════════

export { runPipeline } from './pipeline';
export { evaluate } from './evaluator';
export { rewrite } from './rewriter';
export { recordSignal, getRecentEntries, getPatterns, getFrequentViolations, getStats, clearMemory } from './memory';
export { POLICY_RULES } from './policy';
export { THRESHOLDS, FALLBACK_MESSAGES } from './types';

export type {
  UserMode,
  DetectedIntent,
  PolicyDimension,
  DimensionScores,
  PolicyRule,
  EvaluationContext,
  ConversationTurn,
  EvalDecision,
  Violation,
  EvaluationResult,
  RewriteResult,
  PipelineResult,
  LearningSignal,
  LearningEntry,
  LearningPattern,
} from './types';
