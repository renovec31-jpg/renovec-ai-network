// ─── Coordinator OS — Core Types ─────────────────────────────────────────────
// Le coordinateur est le système d'exploitation de RENOVEC.
// Il manipule des SITUATIONS, pas des messages.

// ─── Situation vivante ────────────────────────────────────────────────────────

export type SituationUrgency = 'critical' | 'high' | 'normal' | 'low';
export type SituationDomain =
  | 'logement' | 'emploi' | 'santé' | 'juridique' | 'administratif'
  | 'relationnel' | 'financier' | 'technique' | 'éducation' | 'autre';

export type SituationPhase =
  | 'idle' | 'expressed' | 'reading' | 'clarifying'
  | 'emerging' | 'exchanging' | 'resolved';

export interface LiveSituation {
  id: string;
  userId: string;
  rawText: string;
  phase: SituationPhase;
  urgency: SituationUrgency;
  domain: SituationDomain | null;

  // Ce que le coordinateur a compris
  summary: string;
  complexity: number;        // 0.0 → 1.0
  confidence: number;        // confiance du coordinateur dans sa compréhension

  // Contexte enrichi par le coordinateur
  coordinatorContext: CoordinatorContext;

  // État d'orchestration courant
  orchestrationState: OrchestrationState;

  // Mémoire et relations
  relatedSituations: SituationEdge[];

  createdAt: string;
  updatedAt: string;
}

export interface CoordinatorContext {
  detectedUrgency: SituationUrgency | null;
  inferredDomain: SituationDomain | null;
  emotionalSignals: string[];
  blockers: string[];
  temporalConstraints: string[];
  humanFactors: string[];
  complexity: number;
  missingInfo: string[];
  vigilancePoints: string[];
}

export interface OrchestrationState {
  humansConsidered: number;
  humansInvited: number;
  lastHumanAction: string | null;
  routingStrategy: 'trust_first' | 'availability_first' | 'domain_first' | 'emergency';
  escalationLevel: number;  // 0 = normal, 1 = human review, 2 = urgent, 3 = critical
  nextRecommendedAction: string | null;
}

export interface SituationEdge {
  targetNeedId: string;
  relationType: 'similar' | 'causal' | 'successive' | 'thematic' | 'resolved_by';
  weight: number;
  context: string;
}

// ─── Mémoire du coordinateur ─────────────────────────────────────────────────

export type MemoryType = 'conversational' | 'situational' | 'relational' | 'contextual' | 'behavioral';

export interface MemoryFragment {
  id: string;
  userId: string;
  needId: string | null;
  memoryType: MemoryType;
  content: MemoryContent;
  salience: number;         // 0.0 → 1.0
  reinforcementCount: number;
  contradictionCount: number;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemoryContent {
  // Conversational
  userStyle?: string;         // 'direct' | 'verbose' | 'hesitant' | 'urgent'
  confusionPatterns?: string[];
  preferredPace?: 'slow' | 'normal' | 'fast';

  // Situational
  previousSituations?: Array<{ domain: string; resolved: boolean; satisfaction: number }>;
  recurringThemes?: string[];
  unresolved?: string[];

  // Relational
  trustedUsers?: string[];
  blockedUsers?: string[];
  successfulCollaborations?: string[];

  // Contextual
  knownContext?: Record<string, string>;
  environmentalFactors?: string[];

  // Behavioral
  typicalUrgencyLevel?: SituationUrgency;
  decisionPatterns?: string[];
  helpAcceptanceRate?: number;

  // Free-form pour extension
  [key: string]: unknown;
}

// ─── Trust Engine ─────────────────────────────────────────────────────────────

export interface TrustState {
  userId: string;
  overallScore: number;   // 0.0 → 1.0
  dimensions: TrustDimensions;
  behavioralSignals: BehavioralSignal[];
  trustedContexts: string[];
  anomalies: TrustAnomaly[];
  sampleSize: number;
  trend: 'improving' | 'stable' | 'declining';
  lastCalculatedAt: string;
}

export interface TrustDimensions {
  continuity: number;
  reliability: number;
  relationalQuality: number;
  resolutionRate: number;
  consistency: number;
  behavioralTrust: number;
}

export interface BehavioralSignal {
  signal: string;
  value: string | number;
  weight: number;
  observedAt: string;
}

export interface TrustAnomaly {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  detectedAt: string;
}

// ─── Experience Profile ───────────────────────────────────────────────────────

export type ExpertiseLevel = 'novice' | 'familiar' | 'experienced' | 'expert';
export type CommunicationStyle = 'direct' | 'nuanced' | 'exploratory' | 'guided';
export type PacingPreference = 'slow' | 'normal' | 'fast';

export interface ExperienceProfile {
  userId: string;
  expertiseLevel: ExpertiseLevel;
  communicationStyle: CommunicationStyle;
  pacingPreference: PacingPreference;
  distressSignals: DistressSignal[];
  interfacePreferences: InterfacePreferences;
  usagePatterns: UsagePatterns;
  observationCount: number;
  lastAdaptedAt: string;
}

export interface DistressSignal {
  type: 'urgency' | 'confusion' | 'frustration' | 'anxiety' | 'overwhelm';
  intensity: number;  // 0.0 → 1.0
  observedAt: string;
}

export interface InterfacePreferences {
  detailLevel: 'minimal' | 'normal' | 'detailed';
  examplesUseful: boolean;
  prefersQuestions: boolean;
  guidanceNeeded: boolean;
}

export interface UsagePatterns {
  peakHours: number[];
  avgSessionLength: number;  // minutes
  topics: string[];
  returningUser: boolean;
}

// ─── Orchestration signals ────────────────────────────────────────────────────

export type SignalType =
  | 'urgency_detected'
  | 'human_recommended'
  | 'phase_shift'
  | 'context_clarified'
  | 'trust_gate'
  | 'experience_adapt'
  | 'escalation_required'
  | 'resolution_suggested'
  | 'memory_retrieved';

export interface CoordinatorSignal {
  id: string;
  userId: string;
  needId: string | null;
  signalType: SignalType;
  priority: 1 | 2 | 3 | 4 | 5;  // 1 = critique
  payload: SignalPayload;
  status: 'pending' | 'consumed' | 'expired' | 'dismissed';
  expiresAt: string;
  createdAt: string;
}

export interface SignalPayload {
  urgencyLevel?: SituationUrgency;
  reason?: string;
  suggestedAction?: string;
  humanCandidates?: string[];
  adaptationInstructions?: AdaptationInstructions;
  phaseTarget?: SituationPhase;
  memoryFragments?: MemoryFragment[];
  [key: string]: unknown;
}

export interface AdaptationInstructions {
  toneAdjustment: 'warmer' | 'calmer' | 'more_direct' | 'slower' | 'no_change';
  guidanceLevel: 'increase' | 'decrease' | 'maintain';
  pacing: 'slow_down' | 'speed_up' | 'maintain';
  nextInteractionHint: string;
}

// ─── Coordinator Decision ─────────────────────────────────────────────────────
// Ce que le coordinateur retourne après avoir traité une situation.

export interface CoordinatorAction {
  type: string;
  payload: Record<string, unknown>;
}

export interface CoordinatorUIDirectives {
  tone: string;
  density: string;
  showTimeline: boolean;
  highlightNextStep: boolean;
}

export interface CoordinatorTrustSignal {
  riskLevel: string;
  needsHumanReview: boolean;
  reason: string;
}

export interface CoordinatorDecision {
  // Réponse à l'utilisateur
  reply: string;

  // Compréhension de la situation
  situationUpdate: Partial<CoordinatorContext>;
  confidence: number;
  phase: SituationPhase;
  urgency: SituationUrgency;

  // Signaux émis
  signals: Omit<CoordinatorSignal, 'id' | 'createdAt'>[];

  // Fragments de mémoire à persister
  memoryToStore: string[];

  // Humains à mobiliser (si détecté)
  humanRecommendations: HumanRecommendation[];

  // Prochaine question ou action
  nextQuestion: string | null;
  nextAction: string | null;

  // Est-ce que la situation est prête pour la phase suivante ?
  readyToProgress: boolean;
  isFinal: boolean;

  // Intent détecté
  intent: string;

  // Enriched structured fields (from new response format)
  coordinatorActions?: CoordinatorAction[];
  uiDirectives?: CoordinatorUIDirectives | null;
  trustSignal?: CoordinatorTrustSignal | null;
}

export interface HumanRecommendation {
  reason: string;
  domain: SituationDomain;
  urgencyRequired: SituationUrgency;
  trustThreshold: number;  // score minimum requis
  timing: 'immediate' | 'within_hour' | 'within_day' | 'flexible';
}
