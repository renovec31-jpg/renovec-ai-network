// ─── Orchestration Layer ──────────────────────────────────────────────────────
// Le coordinateur décide qui mobiliser, quand, pourquoi, dans quel ordre.
// Ce n'est pas une liste de prestataires — c'est une décision active.

import { supabase } from '../../lib/supabase';
import { checkTrustGate, recordBehavioralSignal } from './TrustEngine';
import type {
  LiveSituation,
  HumanRecommendation,
  CoordinatorSignal,
  SignalType,
  SituationUrgency,
  SituationDomain,
  OrchestrationState,
} from './types';

// ─── Émission de signaux ──────────────────────────────────────────────────────

export async function emitSignal(
  userId: string,
  needId: string | null,
  signalType: SignalType,
  priority: 1 | 2 | 3 | 4 | 5,
  payload: Record<string, unknown>,
  ttlHours = 24
): Promise<void> {
  await supabase.from('coordinator_signals').insert({
    user_id: userId,
    need_id: needId,
    signal_type: signalType,
    priority,
    payload,
    status: 'pending',
    expires_at: new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString(),
  });
}

export async function consumeSignals(
  userId: string,
  needId?: string
): Promise<CoordinatorSignal[]> {
  let query = supabase
    .from('coordinator_signals')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('priority', { ascending: true })
    .limit(10);

  if (needId) query = query.eq('need_id', needId);

  const { data } = await query;
  if (!data?.length) return [];

  // Marquer comme consommés
  await supabase
    .from('coordinator_signals')
    .update({ status: 'consumed', consumed_at: new Date().toISOString() })
    .in('id', data.map(s => s.id));

  return data.map(dbToSignal);
}

// ─── Détection d'urgence ──────────────────────────────────────────────────────

export async function detectAndEmitUrgency(
  userId: string,
  needId: string,
  text: string,
  detectedUrgency: SituationUrgency
): Promise<boolean> {
  const isUrgent = detectedUrgency === 'critical' || detectedUrgency === 'high';

  if (isUrgent) {
    await emitSignal(
      userId,
      needId,
      'urgency_detected',
      detectedUrgency === 'critical' ? 1 : 2,
      {
        urgencyLevel: detectedUrgency,
        reason: extractUrgencyReason(text),
        suggestedAction: detectedUrgency === 'critical'
          ? 'mobiliser_humain_immédiatement'
          : 'prioriser_réponse',
        detectedKeywords: extractUrgencyKeywords(text),
      },
      detectedUrgency === 'critical' ? 4 : 12
    );

    await recordBehavioralSignal(userId, 'urgency_expressed', detectedUrgency, 0.7);
  }

  return isUrgent;
}

// ─── Recommandation humaine ───────────────────────────────────────────────────

export async function computeHumanRecommendations(
  situation: Partial<LiveSituation>
): Promise<HumanRecommendation[]> {
  const recommendations: HumanRecommendation[] = [];
  const domain = situation.coordinatorContext?.inferredDomain;
  const urgency = situation.urgency || 'normal';

  // Un coordinateur humain est recommandé si :
  // 1. Urgence haute ou critique
  if (urgency === 'critical' || urgency === 'high') {
    recommendations.push({
      reason: 'Urgence détectée — présence humaine recommandée',
      domain: domain || 'autre',
      urgencyRequired: urgency,
      trustThreshold: urgency === 'critical' ? 0.6 : 0.5,
      timing: urgency === 'critical' ? 'immediate' : 'within_hour',
    });
  }

  // 2. Complexity élevée
  if ((situation.complexity || 0) > 0.75) {
    recommendations.push({
      reason: 'Situation complexe — expertise humaine recommandée',
      domain: domain || 'autre',
      urgencyRequired: 'normal',
      trustThreshold: 0.6,
      timing: 'within_day',
    });
  }

  // 3. Signaux émotionnels
  const emotionalSignals = situation.coordinatorContext?.emotionalSignals || [];
  if (emotionalSignals.some(s => ['détresse', 'désespoir', 'danger', 'peur'].includes(s))) {
    recommendations.push({
      reason: 'Signaux émotionnels forts — accompagnement humain recommandé',
      domain: 'relationnel',
      urgencyRequired: 'high',
      trustThreshold: 0.7,
      timing: 'within_hour',
    });
  }

  return recommendations;
}

export async function findAndEvaluateCandidates(
  recommendation: HumanRecommendation,
  excludeUserId: string
): Promise<CandidateEvaluation[]> {
  // Chercher les prestataires publiés dans le bon domaine
  const { data: profiles } = await supabase
    .from('capability_profiles')
    .select('id, user_id, title, explicit_capabilities, implicit_capabilities, availability')
    .eq('is_published', true)
    .neq('user_id', excludeUserId)
    .limit(20);

  if (!profiles?.length) return [];

  const evaluations: CandidateEvaluation[] = [];

  for (const profile of profiles) {
    // Vérifier le trust gate
    const gate = await checkTrustGate(
      profile.user_id,
      recommendation.trustThreshold,
      recommendation.domain
    );

    if (!gate.passes) continue;

    // Calculer le score de correspondance
    const matchScore = computeDomainMatch(
      recommendation.domain,
      profile.explicit_capabilities as string[],
      profile.implicit_capabilities as string[]
    );

    if (matchScore < 0.3) continue;

    evaluations.push({
      userId: profile.user_id,
      profileTitle: profile.title,
      trustScore: gate.score,
      matchScore,
      compositeScore: gate.score * 0.6 + matchScore * 0.4,
      availability: profile.availability,
      reason: `${gate.reason}. Correspondance domaine: ${Math.round(matchScore * 100)}%`,
    });
  }

  return evaluations.sort((a, b) => b.compositeScore - a.compositeScore);
}

export async function logOrchestrationDecision(
  needId: string,
  candidateUserId: string | null,
  decision: 'invited' | 'deferred' | 'rejected' | 'escalated' | 'matched',
  reason: Record<string, unknown>,
  situationSnapshot: Record<string, unknown>
): Promise<void> {
  await supabase.from('human_orchestration_log').insert({
    need_id: needId,
    candidate_user_id: candidateUserId,
    decision,
    decision_reason: reason,
    situation_snapshot: situationSnapshot,
  });
}

export async function updateOrchestrationState(
  needId: string,
  updates: Partial<OrchestrationState>
): Promise<void> {
  const { data: need } = await supabase
    .from('needs')
    .select('orchestration_state')
    .eq('id', needId)
    .maybeSingle();

  const current = (need?.orchestration_state as OrchestrationState) || {};
  const merged = { ...current, ...updates };

  await supabase
    .from('needs')
    .update({ orchestration_state: merged })
    .eq('id', needId);
}

// ─── Phase shift ──────────────────────────────────────────────────────────────

export async function suggestPhaseShift(
  userId: string,
  needId: string,
  currentPhase: string,
  targetPhase: string,
  confidence: number
): Promise<void> {
  if (confidence < 0.6) return;

  await emitSignal(
    userId,
    needId,
    'phase_shift',
    3,
    {
      currentPhase,
      targetPhase,
      confidence,
      reason: `Coordinator confidence: ${Math.round(confidence * 100)}%`,
    },
    6
  );
}

// ─── Utils ────────────────────────────────────────────────────────────────────

function extractUrgencyReason(text: string): string {
  const t = text.toLowerCase();
  if (/expulsion|expulsé|dehors/.test(t)) return 'Risque d\'expulsion détecté';
  if (/licenci|renvoy|perdu.{0,10}emploi/.test(t)) return 'Perte d\'emploi détectée';
  if (/santé|médical|urgence|douleur|hôpital/.test(t)) return 'Situation de santé détectée';
  if (/danger|menace|violence|agressif/.test(t)) return 'Signal de danger détecté';
  if (/délai|deadline|date limite|avant.{0,15}(lundi|vendredi|demain|semaine)/.test(t)) return 'Contrainte temporelle critique';
  return 'Urgence contextuelle';
}

function extractUrgencyKeywords(text: string): string[] {
  const keywords: string[] = [];
  const patterns = [
    'urgent', 'immédiatement', 'maintenant', 'expulsion', 'licencié',
    'danger', 'violence', 'délai', 'deadline', 'demain', 'critique'
  ];
  const t = text.toLowerCase();
  for (const kw of patterns) {
    if (t.includes(kw)) keywords.push(kw);
  }
  return keywords;
}

function computeDomainMatch(
  domain: SituationDomain,
  explicit: string[],
  implicit: string[]
): number {
  const domainKeywords: Record<string, string[]> = {
    logement: ['logement', 'propriétaire', 'bailleur', 'locataire', 'loyer', 'expulsion', 'habitat'],
    emploi: ['emploi', 'travail', 'rh', 'recrutement', 'carrière', 'licenciement', 'chômage'],
    santé: ['santé', 'médical', 'soin', 'thérapeutique', 'bien-être', 'psychologie'],
    juridique: ['juridique', 'droit', 'légal', 'avocat', 'procédure', 'contrat'],
    administratif: ['administratif', 'démarche', 'formulaire', 'administration', 'caf', 'préfecture'],
    relationnel: ['relationnel', 'conflit', 'communication', 'médiation', 'famille', 'couple'],
    financier: ['financier', 'budget', 'dette', 'crédit', 'banque', 'argent'],
    technique: ['technique', 'informatique', 'numérique', 'tech', 'développement'],
    éducation: ['éducation', 'formation', 'apprentissage', 'scolaire', 'enseignement'],
    autre: [],
  };

  const keywords = domainKeywords[domain] || [];
  if (keywords.length === 0) return 0.4;

  const allCapabilities = [...(explicit || []), ...(implicit || [])]
    .map(c => c.toLowerCase())
    .join(' ');

  const matches = keywords.filter(kw => allCapabilities.includes(kw)).length;
  return Math.min(matches / keywords.length + 0.2, 1.0);
}

type CandidateEvaluation = {
  userId: string;
  profileTitle: string;
  trustScore: number;
  matchScore: number;
  compositeScore: number;
  availability: string;
  reason: string;
};

function dbToSignal(row: Record<string, unknown>): CoordinatorSignal {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    needId: row.need_id as string | null,
    signalType: row.signal_type as SignalType,
    priority: row.priority as 1 | 2 | 3 | 4 | 5,
    payload: row.payload as Record<string, unknown>,
    status: row.status as 'pending' | 'consumed' | 'expired' | 'dismissed',
    expiresAt: row.expires_at as string,
    createdAt: row.created_at as string,
  };
}
