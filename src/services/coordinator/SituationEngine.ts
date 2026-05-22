// ─── Situation Engine ─────────────────────────────────────────────────────────
// Le coordinateur manipule des SITUATIONS VIVANTES.
// Pas des messages — des états avec contexte, urgence, évolution, relations.

import { supabase } from '../../lib/supabase';
import { emitSignal, suggestPhaseShift, detectAndEmitUrgency } from './OrchestrationLayer';
import { buildMemoryContext, extractAndStoreMemory } from './MemorySystem';
import type {
  LiveSituation,
  CoordinatorContext,
  OrchestrationState,
  SituationEdge,
  SituationPhase,
  SituationUrgency,
  SituationDomain,
} from './types';

// ─── Lecture d'une situation vivante ─────────────────────────────────────────

export async function loadLiveSituation(needId: string): Promise<LiveSituation | null> {
  const { data, error } = await supabase
    .from('needs')
    .select('*')
    .eq('id', needId)
    .maybeSingle();

  if (error || !data) return null;

  const edges = await loadSituationEdges(needId);

  return dbToLiveSituation(data, edges);
}

export async function loadUserSituations(userId: string): Promise<LiveSituation[]> {
  const { data, error } = await supabase
    .from('needs')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(10);

  if (error || !data) return [];

  return Promise.all(data.map(async row => {
    const edges = await loadSituationEdges(row.id);
    return dbToLiveSituation(row, edges);
  }));
}

// ─── Mise à jour d'une situation ──────────────────────────────────────────────

export async function updateSituationContext(
  needId: string,
  userId: string,
  context: Partial<CoordinatorContext>,
  confidence: number,
  urgency: SituationUrgency
): Promise<void> {
  const { data: current } = await supabase
    .from('needs')
    .select('coordinator_context, urgency, status')
    .eq('id', needId)
    .maybeSingle();

  const existingContext = (current?.coordinator_context as Partial<CoordinatorContext>) || {};
  const mergedContext: Partial<CoordinatorContext> = {
    ...existingContext,
    ...context,
    emotionalSignals: mergeArrays(
      existingContext.emotionalSignals || [],
      context.emotionalSignals || []
    ),
    blockers: mergeArrays(
      existingContext.blockers || [],
      context.blockers || []
    ),
    vigilancePoints: mergeArrays(
      existingContext.vigilancePoints || [],
      context.vigilancePoints || []
    ),
  };

  await supabase.from('needs').update({
    coordinator_context: mergedContext,
    coordinator_confidence: confidence,
    urgency: urgency,
    updated_at: new Date().toISOString(),
  }).eq('id', needId);

  // Émettre un signal d'urgence si nécessaire
  if (context.detectedUrgency === 'critical' || context.detectedUrgency === 'high') {
    const { data: need } = await supabase
      .from('needs')
      .select('raw_text')
      .eq('id', needId)
      .maybeSingle();

    await detectAndEmitUrgency(
      userId, needId, need?.raw_text || '', urgency
    );
  }
}

export async function progressSituationPhase(
  needId: string,
  userId: string,
  targetPhase: SituationPhase,
  confidence: number
): Promise<void> {
  const { data: current } = await supabase
    .from('needs')
    .select('status')
    .eq('id', needId)
    .maybeSingle();

  const phaseToStatus: Record<SituationPhase, string> = {
    idle: 'pending',
    expressed: 'pending',
    reading: 'reading',
    clarifying: 'clarifying',
    emerging: 'emerging',
    exchanging: 'exchanging',
    resolved: 'resolved',
  };

  const newStatus = phaseToStatus[targetPhase];
  if (current?.status === newStatus) return;

  await supabase.from('needs').update({
    status: newStatus,
    updated_at: new Date().toISOString(),
  }).eq('id', needId);

  await suggestPhaseShift(userId, needId, current?.status || 'pending', newStatus, confidence);

  // Signal de changement de phase
  await emitSignal(userId, needId, 'phase_shift', 3, {
    from: current?.status,
    to: newStatus,
    confidence,
  }, 6);
}

// ─── Graphe de situations ─────────────────────────────────────────────────────

export async function linkSituations(
  sourceNeedId: string,
  targetNeedId: string,
  relationType: SituationEdge['relationType'],
  weight: number,
  context: string
): Promise<void> {
  await supabase.from('situation_graph').upsert({
    source_need_id: sourceNeedId,
    target_need_id: targetNeedId,
    relation_type: relationType,
    weight,
    context,
    established_by: 'coordinator',
  }, {
    onConflict: 'source_need_id,target_need_id,relation_type',
    ignoreDuplicates: false,
  });
}

export async function findSimilarSituations(
  needId: string,
  userId: string,
  domain: SituationDomain | null
): Promise<LiveSituation[]> {
  // Chercher via le graphe d'abord
  const { data: edges } = await supabase
    .from('situation_graph')
    .select('target_need_id, weight')
    .eq('source_need_id', needId)
    .eq('relation_type', 'similar')
    .order('weight', { ascending: false })
    .limit(5);

  if (edges?.length) {
    const targetIds = edges.map(e => e.target_need_id);
    const { data: needs } = await supabase
      .from('needs')
      .select('*')
      .in('id', targetIds);

    if (needs?.length) {
      return Promise.all(needs.map(async row => {
        const edgesForNeed = await loadSituationEdges(row.id);
        return dbToLiveSituation(row, edgesForNeed);
      }));
    }
  }

  // Fallback : situations résolues du même domaine
  if (domain) {
    const { data: resolved } = await supabase
      .from('needs')
      .select('*')
      .neq('user_id', userId)
      .eq('status', 'resolved')
      .limit(3);

    if (resolved?.length) {
      return Promise.all(resolved.map(async row => {
        const edgesForNeed = await loadSituationEdges(row.id);
        return dbToLiveSituation(row, edgesForNeed);
      }));
    }
  }

  return [];
}

// ─── Contexte complet pour le coordinateur ────────────────────────────────────
// Construit le contexte enrichi à envoyer à l'Edge Function.

export async function buildCoordinatorRequestContext(
  userId: string,
  needId: string | null
): Promise<CoordinatorRequestContext> {
  const [memoryContext, situation, experienceSignals] = await Promise.all([
    buildMemoryContext(userId, needId || undefined),
    needId ? loadLiveSituation(needId) : null,
    loadExperienceSignals(userId),
  ]);

  return {
    memoryContext,
    situation,
    experienceSignals,
    userId,
  };
}

export async function handleCoordinatorResponse(
  userId: string,
  needId: string,
  userMessage: string,
  coordinatorReply: string,
  detectedDomain: SituationDomain | null,
  urgency: SituationUrgency,
  confidence: number,
  contextUpdate: Partial<CoordinatorContext>
): Promise<void> {
  // 1. Persister la mémoire
  await extractAndStoreMemory(
    userId, needId, userMessage, coordinatorReply, detectedDomain, urgency
  );

  // 2. Mettre à jour le contexte de la situation
  await updateSituationContext(needId, userId, contextUpdate, confidence, urgency);

  // 3. Mettre à jour needs.coordinator_context dans la DB
  await supabase.from('needs').update({
    coordinator_context: contextUpdate,
    coordinator_confidence: confidence,
    urgency,
  }).eq('id', needId);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadSituationEdges(needId: string): Promise<SituationEdge[]> {
  const { data } = await supabase
    .from('situation_graph')
    .select('target_need_id, relation_type, weight, context')
    .eq('source_need_id', needId)
    .limit(10);

  if (!data) return [];

  return data.map(row => ({
    targetNeedId: row.target_need_id,
    relationType: row.relation_type as SituationEdge['relationType'],
    weight: row.weight,
    context: row.context,
  }));
}

async function loadExperienceSignals(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('experience_profiles')
    .select('expertise_level, communication_style, pacing_preference')
    .eq('user_id', userId)
    .maybeSingle();

  if (!data) return [];

  const signals: string[] = [];
  if (data.expertise_level === 'novice') signals.push('guide_plus');
  if (data.expertise_level === 'expert') signals.push('sois_concis');
  if (data.communication_style === 'direct') signals.push('sois_direct');
  if (data.communication_style === 'guided') signals.push('accompagne_davantage');
  if (data.pacing_preference === 'slow') signals.push('rythme_lent');
  if (data.pacing_preference === 'fast') signals.push('rythme_rapide');

  return signals;
}

function dbToLiveSituation(
  row: Record<string, unknown>,
  edges: SituationEdge[]
): LiveSituation {
  const ctx = (row.coordinator_context as Partial<CoordinatorContext>) || {};
  const orch = (row.orchestration_state as Partial<OrchestrationState>) || {};

  return {
    id: row.id as string,
    userId: row.user_id as string,
    rawText: row.raw_text as string,
    phase: statusToPhase(row.status as string),
    urgency: (row.urgency as SituationUrgency) || 'normal',
    domain: ctx.inferredDomain || null,
    summary: row.raw_text as string,
    complexity: (row.situation_complexity as number) || 0.5,
    confidence: (row.coordinator_confidence as number) || 0.0,
    coordinatorContext: {
      detectedUrgency: ctx.detectedUrgency || null,
      inferredDomain: ctx.inferredDomain || null,
      emotionalSignals: ctx.emotionalSignals || [],
      blockers: ctx.blockers || [],
      temporalConstraints: ctx.temporalConstraints || [],
      humanFactors: ctx.humanFactors || [],
      complexity: ctx.complexity || 0.5,
      missingInfo: ctx.missingInfo || [],
      vigilancePoints: ctx.vigilancePoints || [],
    },
    orchestrationState: {
      humansConsidered: orch.humansConsidered || 0,
      humansInvited: orch.humansInvited || 0,
      lastHumanAction: orch.lastHumanAction || null,
      routingStrategy: orch.routingStrategy || 'trust_first',
      escalationLevel: orch.escalationLevel || 0,
      nextRecommendedAction: orch.nextRecommendedAction || null,
    },
    relatedSituations: edges,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function statusToPhase(status: string): SituationPhase {
  const map: Record<string, SituationPhase> = {
    pending: 'expressed',
    reading: 'reading',
    clarifying: 'clarifying',
    emerging: 'emerging',
    exchanging: 'exchanging',
    resolved: 'resolved',
  };
  return map[status] || 'expressed';
}

function mergeArrays<T>(a: T[], b: T[]): T[] {
  return [...new Set([...a, ...b])];
}

export type CoordinatorRequestContext = {
  memoryContext: string;
  situation: LiveSituation | null;
  experienceSignals: string[];
  userId: string;
};
