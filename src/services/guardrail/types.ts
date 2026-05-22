// ══════════════════════════════════════════════════════════════════════════════
// RENOVEC Output Guardrail — Types
// ══════════════════════════════════════════════════════════════════════════════

export type UserMode = 'visitor' | 'connected';

export type DetectedIntent =
  | 'need'
  | 'offer'
  | 'urgency'
  | 'discovery'
  | 'hesitation'
  | 'greeting'
  | 'question_about_renovec'
  | 'emotional_expression'
  | 'unknown';

// ── Policy Dimensions ─────────────────────────────────────────────────────────

export type PolicyDimension =
  | 'warmth'
  | 'usefulness'
  | 'nonIntrusiveness'
  | 'productAlignment'
  | 'trustClarity'
  | 'noPrematureBarrier'
  | 'noGenericAIStyle'
  | 'privacyRespect'
  | 'actionability'
  | 'overall';

export type DimensionScores = Record<PolicyDimension, number>;

// ── Policy Rule ───────────────────────────────────────────────────────────────

export interface PolicyRule {
  id: string;
  dimension: PolicyDimension;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  test: (output: string, context: EvaluationContext) => boolean;
  weight: number;
}

// ── Evaluation Context ────────────────────────────────────────────────────────

export interface EvaluationContext {
  userMode: UserMode;
  intent: DetectedIntent;
  turnCount: number;
  conversationHistory: ConversationTurn[];
  territory?: string;
  urgencyLevel: number;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

// ── Evaluation Result ─────────────────────────────────────────────────────────

export type EvalDecision = 'pass' | 'rewrite' | 'block';

export interface Violation {
  ruleId: string;
  dimension: PolicyDimension;
  severity: 'critical' | 'major' | 'minor';
  reason: string;
  excerpt?: string;
}

export interface EvaluationResult {
  scores: DimensionScores;
  overallScore: number;
  violations: Violation[];
  decision: EvalDecision;
  reasons: string[];
}

// ── Rewrite Result ────────────────────────────────────────────────────────────

export interface RewriteResult {
  original: string;
  rewritten: string;
  changesApplied: string[];
  dimensionsImproved: PolicyDimension[];
}

// ── Pipeline Result ───────────────────────────────────────────────────────────

export interface PipelineResult {
  finalOutput: string;
  originalOutput: string;
  wasRewritten: boolean;
  evaluation: EvaluationResult;
  rewriteEvaluation?: EvaluationResult;
  usedFallback: boolean;
  pipelineMs: number;
}

// ── Learning Memory ───────────────────────────────────────────────────────────

export type LearningSignal =
  | 'conversation_continued'
  | 'user_reformulated'
  | 'user_engaged'
  | 'user_abandoned'
  | 'human_validated'
  | 'human_rejected';

export interface LearningEntry {
  id: string;
  timestamp: number;
  context: EvaluationContext;
  originalOutput: string;
  correctedOutput: string | null;
  scores: DimensionScores;
  violations: Violation[];
  decision: EvalDecision;
  signals: LearningSignal[];
  patternId?: string;
}

export interface LearningPattern {
  id: string;
  description: string;
  occurrences: number;
  lastSeen: number;
  avgScoreBefore: number;
  avgScoreAfter: number;
  exampleBefore: string;
  exampleAfter: string;
}

// ── Thresholds ────────────────────────────────────────────────────────────────

export const THRESHOLDS = {
  PASS: 85,
  REWRITE: 65,
  BLOCK: 0,
} as const;

export const FALLBACK_MESSAGES: Record<UserMode, string> = {
  visitor: 'Je suis là. Parlez-moi de votre situation, je peux vous aider à clarifier.',
  connected: 'Je suis là. Dites-moi ce qui vous amène.',
};
