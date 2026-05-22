// ─── Coordinator Core ─────────────────────────────────────────────────────────
// Le cœur opérationnel de RENOVEC.
// Ce service est l'unique point d'entrée pour toute interaction coordinateur.
// Il orchestre : mémoire, confiance, situations, signaux, UI adaptation.

import { supabase } from '../../lib/supabase';
import {
  buildCoordinatorRequestContext,
  handleCoordinatorResponse,
  progressSituationPhase,
  loadLiveSituation,
} from './SituationEngine';
import {
  emitSignal,
  computeHumanRecommendations,
  logOrchestrationDecision,
  updateOrchestrationState,
  consumeSignals,
} from './OrchestrationLayer';
import { getOrInitTrustState } from './TrustEngine';
import type {
  CoordinatorDecision,
  SituationPhase,
  SituationUrgency,
  SituationDomain,
  CoordinatorContext,
  CoordinatorSignal,
} from './types';

// ─── Types de la requête coordinateur ─────────────────────────────────────────

export type CoordinatorRequest = {
  userId: string;
  needId: string | null;
  rawText: string;
  turns: Array<{ role: 'coordinator' | 'user'; content: string }>;
};

export type LegacyCoordinatorReply = {
  intent: string;
  reply: string;
  canProgressSituation: boolean;
  shouldAskClarification: boolean;
  nextQuestion: string | null;
  situationConfidence: number;
  situationUpdate: {
    summary: string;
    category: string;
    urgency: string;
    missingInfo: string[];
    emotionalState?: string;
    stage?: string;
  };
  actions?: Array<{ type: string; payload: Record<string, unknown> }>;
  ui?: {
    tone: string;
    density: string;
    showTimeline: boolean;
    highlightNextStep: boolean;
  };
  trust?: {
    riskLevel: string;
    needsHumanReview: boolean;
    reason: string;
  };
  memory?: {
    factsToStore: string[];
    contextToKeep: string[];
    doNotForget: string[];
  };
  is_final: boolean;
  urgency_level?: string;
  reformulated_objective?: string;
  context_description?: string;
  recommended_format?: string;
  vigilance_points?: string[];
};

// ─── Point d'entrée principal ─────────────────────────────────────────────────

export async function processWithCoordinator(
  request: CoordinatorRequest
): Promise<{ decision: CoordinatorDecision; legacyReply: LegacyCoordinatorReply }> {
  const { userId, needId, rawText, turns } = request;

  // 1. Construire le contexte enrichi (mémoire + situation + profil)
  const context = await buildCoordinatorRequestContext(userId, needId || undefined);

  // 2. Construire les signaux d'adaptation d'expérience
  const adaptationHints = context.experienceSignals.join(', ');

  // 3. Appeler l'Edge Function avec contexte enrichi
  const edgeFunctionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/coordinator-reply`;

  const { data: session } = await supabase.auth.getSession();
  const token = session?.session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      rawText,
      turns,
      // Contexte enrichi transmis à l'Edge Function
      coordinatorContext: {
        memoryContext: context.memoryContext,
        adaptationHints,
        situationSummary: context.situation
          ? `Situation en cours : ${context.situation.phase}, urgence: ${context.situation.urgency}, domaine: ${context.situation.domain || 'inconnu'}`
          : null,
        existingVigilancePoints: context.situation?.coordinatorContext.vigilancePoints || [],
        existingBlockers: context.situation?.coordinatorContext.blockers || [],
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Coordinator Edge Function error: ${response.status}`);
  }

  const legacyReply: LegacyCoordinatorReply = await response.json();

  // 4. Transformer la réponse en CoordinatorDecision enrichie
  const decision = await enrichDecision(legacyReply, userId, needId, rawText);

  // 5. Persister les effets de la décision (async, non-bloquant)
  persistDecisionEffects(decision, userId, needId, rawText, legacyReply.reply).catch(
    err => console.warn('[CoordinatorCore] Background persistence error:', err)
  );

  return { decision, legacyReply };
}

// ─── Enrichissement de la décision ───────────────────────────────────────────

async function enrichDecision(
  legacyReply: LegacyCoordinatorReply,
  userId: string,
  needId: string | null,
  rawText: string
): Promise<CoordinatorDecision> {
  const urgency = mapUrgency(legacyReply.urgency_level || legacyReply.situationUpdate.urgency);
  const domain = inferDomain(legacyReply.situationUpdate.category);
  const phase = mapPhase(legacyReply);

  // Extract facts from memory block if coordinator provided them
  const memoryFacts = legacyReply.memory?.factsToStore || [];
  const memoryVigilance = legacyReply.memory?.doNotForget || [];

  const contextUpdate: Partial<CoordinatorContext> = {
    detectedUrgency: urgency,
    inferredDomain: domain,
    missingInfo: legacyReply.situationUpdate.missingInfo || [],
    vigilancePoints: [
      ...(legacyReply.vigilance_points || []),
      ...memoryVigilance,
    ],
  };

  // Calculer les recommandations humaines si situation bien comprise
  const humanRecommendations =
    legacyReply.situationConfidence > 0.4
      ? await computeHumanRecommendations({
          urgency,
          complexity: legacyReply.situationConfidence,
          coordinatorContext: contextUpdate as CoordinatorContext,
        })
      : [];

  // Construire les signaux à émettre
  const signals: Omit<CoordinatorSignal, 'id' | 'createdAt'>[] = [];

  if (urgency === 'critical' || urgency === 'high') {
    signals.push({
      userId,
      needId,
      signalType: 'urgency_detected',
      priority: urgency === 'critical' ? 1 : 2,
      payload: { urgencyLevel: urgency, reason: 'Détectée par le coordinateur' },
      status: 'pending',
      expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
    });
  }

  if (humanRecommendations.length > 0) {
    signals.push({
      userId,
      needId,
      signalType: 'human_recommended',
      priority: 2,
      payload: { recommendations: humanRecommendations },
      status: 'pending',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  if (legacyReply.is_final && needId) {
    signals.push({
      userId,
      needId,
      signalType: 'context_clarified',
      priority: 3,
      payload: {
        summary: legacyReply.situationUpdate.summary,
        reformulatedObjective: legacyReply.reformulated_objective,
        domain,
        confidence: legacyReply.situationConfidence,
      },
      status: 'pending',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    });
  }

  return {
    reply: legacyReply.reply,
    situationUpdate: contextUpdate,
    confidence: legacyReply.situationConfidence,
    phase,
    urgency,
    signals,
    memoryToStore: memoryFacts,
    humanRecommendations,
    nextQuestion: legacyReply.nextQuestion || null,
    nextAction: humanRecommendations.length > 0 ? 'mobiliser_humain'
      : legacyReply.trust?.needsHumanReview ? 'escalate_human'
      : null,
    readyToProgress: legacyReply.canProgressSituation,
    isFinal: legacyReply.is_final,
    intent: legacyReply.intent,
    // Enriched structured fields from new response format
    coordinatorActions: legacyReply.actions || [],
    uiDirectives: legacyReply.ui || null,
    trustSignal: legacyReply.trust || null,
  };
}

// ─── Persistance des effets (background) ─────────────────────────────────────

async function persistDecisionEffects(
  decision: CoordinatorDecision,
  userId: string,
  needId: string | null,
  userMessage: string,
  coordinatorReply: string
): Promise<void> {
  const ops: Promise<void>[] = [];

  // Persister les effets sur la situation
  if (needId) {
    ops.push(handleCoordinatorResponse(
      userId, needId, userMessage, coordinatorReply,
      decision.situationUpdate.inferredDomain || null,
      decision.urgency,
      decision.confidence,
      decision.situationUpdate
    ));

    // Progresser la phase si prêt
    if (decision.readyToProgress && decision.confidence >= 0.6) {
      ops.push(progressSituationPhase(needId, userId, decision.phase, decision.confidence));
    }

    // Log orchestration si recommandations humaines
    if (decision.humanRecommendations.length > 0) {
      ops.push(logOrchestrationDecision(
        needId, null, 'invited',
        { reason: decision.humanRecommendations[0].reason },
        { phase: decision.phase, urgency: decision.urgency }
      ));
      ops.push(updateOrchestrationState(needId, {
        nextRecommendedAction: decision.nextAction || undefined,
        escalationLevel: decision.urgency === 'critical' ? 3
          : decision.urgency === 'high' ? 2 : 0,
      }));
    }
  }

  // Émettre les signaux
  for (const signal of decision.signals) {
    ops.push(emitSignal(
      signal.userId,
      signal.needId,
      signal.signalType,
      signal.priority,
      signal.payload as Record<string, unknown>
    ));
  }

  await Promise.allSettled(ops);
}

// ─── Accès aux signaux actifs ─────────────────────────────────────────────────

export async function getActiveSignals(
  userId: string,
  needId?: string
): Promise<CoordinatorSignal[]> {
  return consumeSignals(userId, needId);
}

export async function getUserTrustSnapshot(userId: string) {
  return getOrInitTrustState(userId);
}

export async function getSituationSnapshot(needId: string) {
  return loadLiveSituation(needId);
}

// ─── Helpers de mapping ───────────────────────────────────────────────────────

function mapUrgency(raw?: string): SituationUrgency {
  const map: Record<string, SituationUrgency> = {
    critical: 'critical', critique: 'critical',
    high: 'high', haute: 'high', élevée: 'high', elevee: 'high',
    normal: 'normal', normale: 'normal', medium: 'normal',
    low: 'low', basse: 'low', faible: 'low',
  };
  return map[raw?.toLowerCase() || ''] || 'normal';
}

function inferDomain(category?: string): SituationDomain | null {
  const map: Record<string, SituationDomain> = {
    logement: 'logement', emploi: 'emploi', santé: 'santé', sante: 'santé',
    juridique: 'juridique', administratif: 'administratif', relationnel: 'relationnel',
    financier: 'financier', technique: 'technique', éducation: 'éducation',
    education: 'éducation',
  };
  if (!category) return null;
  return map[category.toLowerCase()] || null;
}

function mapPhase(reply: LegacyCoordinatorReply): SituationPhase {
  if (reply.is_final) return 'emerging';
  if (reply.canProgressSituation) return 'clarifying';
  if (reply.intent === 'situation_description' || reply.intent === 'clarification_answer') {
    return 'reading';
  }
  return 'expressed';
}
