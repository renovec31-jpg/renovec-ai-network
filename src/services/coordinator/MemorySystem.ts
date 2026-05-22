// ─── Memory System ────────────────────────────────────────────────────────────
// Le coordinateur retient ce qu'il a appris sur chaque utilisateur
// et chaque situation. La mémoire est la fondation de la continuité.

import { supabase } from '../../lib/supabase';
import type {
  MemoryFragment,
  MemoryContent,
  MemoryType,
  SituationDomain,
  SituationUrgency,
} from './types';

// ─── Lecture de mémoire ───────────────────────────────────────────────────────

export async function loadUserMemory(
  userId: string,
  needId?: string,
  types?: MemoryType[]
): Promise<MemoryFragment[]> {
  let query = supabase
    .from('coordinator_memory')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('salience', { ascending: false })
    .limit(20);

  if (needId) query = query.eq('need_id', needId);
  if (types?.length) query = query.in('memory_type', types);

  const { data, error } = await query;
  if (error || !data) return [];

  return data.map(dbToFragment);
}

export async function buildMemoryContext(userId: string, needId?: string): Promise<string> {
  const fragments = await loadUserMemory(userId, needId);
  if (fragments.length === 0) return '';

  const parts: string[] = ['[MÉMOIRE COORDINATEUR]'];

  const behavioral = fragments.filter(f => f.memoryType === 'behavioral');
  if (behavioral.length > 0) {
    const content = behavioral[0].content;
    if (content.userStyle) parts.push(`Style utilisateur : ${content.userStyle}`);
    if (content.typicalUrgencyLevel) parts.push(`Urgence typique : ${content.typicalUrgencyLevel}`);
    if (content.helpAcceptanceRate !== undefined) {
      parts.push(`Acceptation d'aide : ${Math.round(content.helpAcceptanceRate * 100)}%`);
    }
  }

  const situational = fragments.filter(f => f.memoryType === 'situational');
  if (situational.length > 0) {
    const content = situational[0].content;
    if (content.recurringThemes?.length) {
      parts.push(`Thèmes récurrents : ${(content.recurringThemes as string[]).join(', ')}`);
    }
    if (content.unresolved?.length) {
      parts.push(`Situations non résolues : ${(content.unresolved as string[]).join(', ')}`);
    }
  }

  const contextual = fragments.filter(f => f.memoryType === 'contextual');
  if (contextual.length > 0) {
    const content = contextual[0].content;
    if (content.knownContext) {
      const ctx = content.knownContext as Record<string, string>;
      const entries = Object.entries(ctx).slice(0, 3);
      if (entries.length) {
        parts.push(`Contexte connu : ${entries.map(([k, v]) => `${k}: ${v}`).join('; ')}`);
      }
    }
  }

  return parts.length > 1 ? parts.join('\n') : '';
}

// ─── Écriture de mémoire ──────────────────────────────────────────────────────

export async function storeMemoryFragment(
  userId: string,
  needId: string | null,
  memoryType: MemoryType,
  content: MemoryContent,
  salience = 0.5
): Promise<void> {
  // Cherche si un fragment de même type existe déjà pour renforcer plutôt que dupliquer
  const { data: existing } = await supabase
    .from('coordinator_memory')
    .select('id, content, reinforcement_count')
    .eq('user_id', userId)
    .eq('memory_type', memoryType)
    .eq('need_id', needId ?? null)
    .maybeSingle();

  if (existing) {
    // Merge du contenu et renforcement
    const merged = deepMerge(existing.content as MemoryContent, content);
    await supabase
      .from('coordinator_memory')
      .update({
        content: merged,
        reinforcement_count: (existing.reinforcement_count || 1) + 1,
        salience: Math.min(salience + 0.05, 1.0),
        updated_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', existing.id);
  } else {
    await supabase.from('coordinator_memory').insert({
      user_id: userId,
      need_id: needId,
      memory_type: memoryType,
      content,
      salience,
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
}

export async function extractAndStoreMemory(
  userId: string,
  needId: string | null,
  userMessage: string,
  coordinatorReply: string,
  detectedDomain: SituationDomain | null,
  detectedUrgency: SituationUrgency
): Promise<void> {
  const ops: Promise<void>[] = [];

  // Mémoire comportementale : détecter le style
  const userStyle = inferUserStyle(userMessage);
  if (userStyle) {
    ops.push(storeMemoryFragment(userId, null, 'behavioral', {
      userStyle,
      typicalUrgencyLevel: detectedUrgency,
    }, 0.6));
  }

  // Mémoire situationnelle : thèmes récurrents
  if (detectedDomain) {
    ops.push(storeMemoryFragment(userId, needId, 'situational', {
      recurringThemes: [detectedDomain],
    }, 0.7));
  }

  // Mémoire contextuelle : extraire fragments de contexte utiles
  const contextualInfo = extractContextualInfo(userMessage);
  if (Object.keys(contextualInfo).length > 0) {
    ops.push(storeMemoryFragment(userId, needId, 'contextual', {
      knownContext: contextualInfo,
    }, 0.6));
  }

  await Promise.all(ops);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function inferUserStyle(message: string): string | null {
  const t = message.toLowerCase();
  if (message.length < 30 && /^[a-zA-ZÀ-ÿ\s,.'?!]+$/.test(message)) return 'direct';
  if (message.length > 200) return 'verbose';
  if (/\?.*\?|\bsais pas\b|\bcomment\b.*\bfaire\b|\bpas sûr\b/.test(t)) return 'hesitant';
  if (/urgent|vite|rapidement|maintenant|immédiatement|asap/.test(t)) return 'urgent';
  return null;
}

function extractContextualInfo(message: string): Record<string, string> {
  const info: Record<string, string> = {};
  const t = message.toLowerCase();

  // Localisation
  const cityMatch = message.match(/\b(Paris|Lyon|Marseille|Toulouse|Nice|Bordeaux|Lille|Nantes|Strasbourg|Montpellier)\b/i);
  if (cityMatch) info.ville = cityMatch[1];

  // Temporalité
  if (/depuis (\d+ (jours?|semaines?|mois|ans?))/.test(t)) {
    const m = t.match(/depuis (\d+ (?:jours?|semaines?|mois|ans?))/);
    if (m) info.durée_situation = m[1];
  }

  // Présence de tiers
  if (/propriétaire|bailleur|employeur|patron|ex|enfant|parent|conjoint|médecin/.test(t)) {
    const actors = [];
    if (/propriétaire|bailleur/.test(t)) actors.push('propriétaire');
    if (/employeur|patron/.test(t)) actors.push('employeur');
    if (/enfant/.test(t)) actors.push('enfant');
    if (/conjoint|partenaire|ex/.test(t)) actors.push('conjoint_ou_ex');
    if (/médecin|docteur/.test(t)) actors.push('médecin');
    if (actors.length) info.acteurs_impliqués = actors.join(', ');
  }

  return info;
}

function deepMerge<T extends Record<string, unknown>>(base: T, override: Partial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(override) as (keyof T)[]) {
    const overrideVal = override[key];
    const baseVal = base[key];
    if (Array.isArray(overrideVal) && Array.isArray(baseVal)) {
      // Merge arrays, dédupliqué
      const merged = [...new Set([...baseVal as unknown[], ...overrideVal as unknown[]])];
      (result as Record<string, unknown>)[key as string] = merged;
    } else if (overrideVal !== undefined && overrideVal !== null) {
      (result as Record<string, unknown>)[key as string] = overrideVal;
    }
  }
  return result;
}

function dbToFragment(row: Record<string, unknown>): MemoryFragment {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    needId: row.need_id as string | null,
    memoryType: row.memory_type as MemoryType,
    content: row.content as MemoryContent,
    salience: row.salience as number,
    reinforcementCount: row.reinforcement_count as number,
    contradictionCount: row.contradiction_count as number,
    expiresAt: row.expires_at as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
