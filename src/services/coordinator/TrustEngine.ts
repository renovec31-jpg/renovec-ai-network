// ─── Trust Engine ─────────────────────────────────────────────────────────────
// Le coordinateur pilote la confiance.
// Pas via des étoiles — via continuité, fiabilité, qualité relationnelle.

import { supabase } from '../../lib/supabase';
import type {
  TrustState,
  TrustDimensions,
  BehavioralSignal,
  TrustAnomaly,
} from './types';

const DEFAULT_TRUST_DIMENSIONS: TrustDimensions = {
  continuity: 0.5,
  reliability: 0.5,
  relationalQuality: 0.5,
  resolutionRate: 0.5,
  consistency: 0.5,
  behavioralTrust: 0.5,
};

// ─── Lecture ──────────────────────────────────────────────────────────────────

export async function getTrustState(userId: string): Promise<TrustState | null> {
  const { data, error } = await supabase
    .from('trust_engine_state')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  return dbToTrustState(data);
}

export async function getOrInitTrustState(userId: string): Promise<TrustState> {
  const existing = await getTrustState(userId);
  if (existing) return existing;

  // Initialisation pour un nouvel utilisateur
  const initial: TrustState = {
    userId,
    overallScore: 0.5,
    dimensions: { ...DEFAULT_TRUST_DIMENSIONS },
    behavioralSignals: [],
    trustedContexts: [],
    anomalies: [],
    sampleSize: 0,
    trend: 'stable',
    lastCalculatedAt: new Date().toISOString(),
  };

  await supabase.from('trust_engine_state').insert(trustStateToDb(userId, initial));
  return initial;
}

// ─── Calcul de confiance ──────────────────────────────────────────────────────

export async function recalculateTrust(userId: string): Promise<TrustState> {
  const state = await getOrInitTrustState(userId);

  // Charger les données pour le calcul
  const [trustReviews, sessions, contributions] = await Promise.all([
    loadTrustReviews(userId),
    loadCompletedSessions(userId),
    loadContributions(userId),
  ]);

  const newDimensions = computeDimensions(trustReviews, sessions, contributions, state);
  const overallScore = weightedAverage(newDimensions);
  const trend = computeTrend(state.overallScore, overallScore);
  const anomalies = detectAnomalies(trustReviews, sessions, state);
  const trustedContexts = inferTrustedContexts(trustReviews, sessions);

  const updatedState: TrustState = {
    ...state,
    overallScore,
    dimensions: newDimensions,
    trustedContexts,
    anomalies,
    sampleSize: trustReviews.length + sessions.length,
    trend,
    lastCalculatedAt: new Date().toISOString(),
  };

  await supabase
    .from('trust_engine_state')
    .upsert(trustStateToDb(userId, updatedState));

  return updatedState;
}

// ─── Signal comportemental ────────────────────────────────────────────────────

export async function recordBehavioralSignal(
  userId: string,
  signal: string,
  value: string | number,
  weight = 0.5
): Promise<void> {
  const state = await getOrInitTrustState(userId);

  const newSignal: BehavioralSignal = {
    signal,
    value,
    weight,
    observedAt: new Date().toISOString(),
  };

  const signals = [newSignal, ...state.behavioralSignals].slice(0, 50);

  // Mettre à jour behavioral_trust en fonction du signal
  const behavioralAdjustment = computeBehavioralAdjustment(signal, value, weight);
  const newBehavioralTrust = clamp(
    state.dimensions.behavioralTrust + behavioralAdjustment,
    0, 1
  );

  await supabase
    .from('trust_engine_state')
    .upsert({
      user_id: userId,
      behavioral_signals: signals,
      dimensions: {
        ...state.dimensions,
        behavioral_trust: newBehavioralTrust,
      },
      updated_at: new Date().toISOString(),
    });
}

// ─── Gate de confiance ────────────────────────────────────────────────────────
// Avant de mettre en contact, le coordinateur vérifie le trust gate.

export async function checkTrustGate(
  candidateUserId: string,
  requiredScore: number,
  requiredContext?: string
): Promise<{ passes: boolean; reason: string; score: number }> {
  const state = await getTrustState(candidateUserId);

  if (!state) {
    return {
      passes: requiredScore <= 0.3,  // Nouveaux utilisateurs passent si seuil bas
      reason: 'Utilisateur sans historique',
      score: 0.3,
    };
  }

  if (requiredContext && state.trustedContexts.length > 0) {
    const contextMatch = state.trustedContexts.some(ctx =>
      ctx.toLowerCase().includes(requiredContext.toLowerCase())
    );
    if (!contextMatch && state.overallScore < requiredScore + 0.15) {
      return {
        passes: false,
        reason: `Contexte '${requiredContext}' non établi`,
        score: state.overallScore,
      };
    }
  }

  return {
    passes: state.overallScore >= requiredScore,
    reason: state.overallScore >= requiredScore
      ? `Score de confiance suffisant (${Math.round(state.overallScore * 100)}%)`
      : `Score de confiance insuffisant (${Math.round(state.overallScore * 100)}% < ${Math.round(requiredScore * 100)}%)`,
    score: state.overallScore,
  };
}

// ─── Helpers de calcul ────────────────────────────────────────────────────────

function computeDimensions(
  trustReviews: TrustReviewRow[],
  sessions: SessionRow[],
  contributions: ContributionRow[],
  prevState: TrustState
): TrustDimensions {
  const dims = { ...prevState.dimensions };

  if (trustReviews.length === 0 && sessions.length === 0) return dims;

  // Continuity : est-ce que cet utilisateur revient et suit ses engagements ?
  const completedSessions = sessions.filter(s => s.status === 'completed').length;
  const totalSessions = sessions.length;
  if (totalSessions > 0) {
    dims.continuity = clamp(completedSessions / totalSessions, 0, 1);
  }

  // Reliability : scores de fiabilité dans les reviews
  if (trustReviews.length > 0) {
    dims.reliability = average(trustReviews.map(r => (r.reliability_score || 3) / 5));
    dims.relationalQuality = average(trustReviews.map(r => (r.reassurance_score || 3) / 5));
    dims.consistency = average(trustReviews.map(r => (r.follow_through_score || 3) / 5));
  }

  // Resolution rate : situations résolues avec ce prestataire
  const resolvedSessions = sessions.filter(s =>
    s.status === 'completed' && s.next_step
  ).length;
  if (totalSessions > 0) {
    dims.resolutionRate = clamp(resolvedSessions / totalSessions + 0.1, 0, 1);
  }

  return dims;
}

function weightedAverage(dims: TrustDimensions): number {
  const weights = {
    continuity: 0.2,
    reliability: 0.25,
    relationalQuality: 0.2,
    resolutionRate: 0.15,
    consistency: 0.1,
    behavioralTrust: 0.1,
  };

  return Object.entries(dims).reduce((sum, [key, val]) => {
    return sum + val * (weights[key as keyof typeof weights] || 0);
  }, 0);
}

function computeTrend(
  previous: number,
  current: number
): 'improving' | 'stable' | 'declining' {
  const delta = current - previous;
  if (delta > 0.05) return 'improving';
  if (delta < -0.05) return 'declining';
  return 'stable';
}

function detectAnomalies(
  trustReviews: TrustReviewRow[],
  _sessions: SessionRow[],
  _state: TrustState
): TrustAnomaly[] {
  const anomalies: TrustAnomaly[] = [];

  // Tous les scores identiques = comportement suspect
  if (trustReviews.length >= 3) {
    const allMax = trustReviews.every(r =>
      [r.clarity_score, r.reliability_score, r.usefulness_score].every(s => s === 5)
    );
    if (allMax) {
      anomalies.push({
        type: 'uniform_max_scores',
        description: 'Toutes les évaluations sont au maximum',
        severity: 'low',
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return anomalies;
}

function inferTrustedContexts(
  _trustReviews: TrustReviewRow[],
  sessions: SessionRow[]
): string[] {
  const contexts = new Set<string>();
  for (const s of sessions) {
    if (s.status === 'completed' && s.session_type) {
      contexts.add(s.session_type);
    }
  }
  return Array.from(contexts);
}

function computeBehavioralAdjustment(
  signal: string,
  value: string | number,
  weight: number
): number {
  const positiveSignals = ['response_speed_fast', 'completed_session', 'positive_feedback'];
  const negativeSignals = ['no_show', 'abandoned_session', 'negative_feedback'];

  const key = `${signal}_${value}`;
  if (positiveSignals.some(s => key.includes(s))) return weight * 0.05;
  if (negativeSignals.some(s => key.includes(s))) return -weight * 0.08;
  return 0;
}

// ─── Data loaders ─────────────────────────────────────────────────────────────

type TrustReviewRow = {
  reliability_score: number;
  clarity_score: number;
  usefulness_score: number;
  reassurance_score: number;
  follow_through_score: number;
};

type SessionRow = {
  status: string;
  session_type: string;
  next_step: string | null;
};

type ContributionRow = {
  contribution_type: string;
};

async function loadTrustReviews(userId: string): Promise<TrustReviewRow[]> {
  const { data } = await supabase
    .from('trust_reviews')
    .select('reliability_score, clarity_score, usefulness_score, reassurance_score, follow_through_score')
    .eq('reviewed_id', userId);
  return data || [];
}

async function loadCompletedSessions(userId: string): Promise<SessionRow[]> {
  const { data } = await supabase
    .from('sessions')
    .select('status, session_type, next_step')
    .or(`seeker_id.eq.${userId},provider_id.eq.${userId}`);
  return data || [];
}

async function loadContributions(userId: string): Promise<ContributionRow[]> {
  const { data } = await supabase
    .from('contributions')
    .select('contribution_type')
    .eq('author_id', userId);
  return data || [];
}

// ─── DB mapping ───────────────────────────────────────────────────────────────

function dbToTrustState(row: Record<string, unknown>): TrustState {
  const dims = row.dimensions as Record<string, number>;
  return {
    userId: row.user_id as string,
    overallScore: row.overall_trust_score as number,
    dimensions: {
      continuity: dims.continuity ?? 0.5,
      reliability: dims.reliability ?? 0.5,
      relationalQuality: dims.relational_quality ?? 0.5,
      resolutionRate: dims.resolution_rate ?? 0.5,
      consistency: dims.consistency ?? 0.5,
      behavioralTrust: dims.behavioral_trust ?? 0.5,
    },
    behavioralSignals: (row.behavioral_signals as BehavioralSignal[]) || [],
    trustedContexts: (row.trusted_contexts as string[]) || [],
    anomalies: (row.anomalies as TrustAnomaly[]) || [],
    sampleSize: row.sample_size as number || 0,
    trend: (row.trend as 'improving' | 'stable' | 'declining') || 'stable',
    lastCalculatedAt: row.last_calculated_at as string,
  };
}

function trustStateToDb(userId: string, state: TrustState): Record<string, unknown> {
  return {
    user_id: userId,
    overall_trust_score: state.overallScore,
    dimensions: {
      continuity: state.dimensions.continuity,
      reliability: state.dimensions.reliability,
      relational_quality: state.dimensions.relationalQuality,
      resolution_rate: state.dimensions.resolutionRate,
      consistency: state.dimensions.consistency,
      behavioral_trust: state.dimensions.behavioralTrust,
    },
    behavioral_signals: state.behavioralSignals,
    trusted_contexts: state.trustedContexts,
    anomalies: state.anomalies,
    sample_size: state.sampleSize,
    trend: state.trend,
    last_calculated_at: state.lastCalculatedAt,
    updated_at: new Date().toISOString(),
  };
}

// ─── Utils ────────────────────────────────────────────────────────────────────

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
const average = (arr: number[]) => arr.length === 0 ? 0.5 : arr.reduce((a, b) => a + b, 0) / arr.length;
