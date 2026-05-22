// ══════════════════════════════════════════════════════════════════════════════
// RENOVEC Learning Memory
// Stores evaluations, corrections, and learning signals for pattern detection.
// In-memory for now — can be persisted to Supabase when ready.
// ══════════════════════════════════════════════════════════════════════════════

import type {
  EvaluationContext,
  LearningEntry,
  LearningPattern,
  LearningSignal,
  PipelineResult,
} from './types';

// ── In-memory store ───────────────────────────────────────────────────────────

const entries: LearningEntry[] = [];
const patterns: Map<string, LearningPattern> = new Map();
const MAX_ENTRIES = 200;

// ── Record a pipeline result ──────────────────────────────────────────────────

export function recordEntry(result: PipelineResult, context: EvaluationContext): string {
  const id = `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const entry: LearningEntry = {
    id,
    timestamp: Date.now(),
    context,
    originalOutput: result.originalOutput,
    correctedOutput: result.wasRewritten ? result.finalOutput : null,
    scores: result.evaluation.scores,
    violations: result.evaluation.violations,
    decision: result.evaluation.decision,
    signals: [],
  };

  entries.push(entry);

  // Trim oldest entries
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }

  // Detect patterns
  detectPatterns(entry);

  return id;
}

// ── Record a learning signal ──────────────────────────────────────────────────

export function recordSignal(entryId: string, signal: LearningSignal): void {
  const entry = entries.find(e => e.id === entryId);
  if (entry) {
    entry.signals.push(signal);
    updatePatternFromSignal(entry, signal);
  }
}

// ── Pattern detection ─────────────────────────────────────────────────────────

function detectPatterns(entry: LearningEntry): void {
  if (entry.violations.length === 0) return;

  // Group by violation combination
  const violationKey = entry.violations
    .map(v => v.ruleId)
    .sort()
    .join('+');

  const patternId = `pattern_${violationKey}`;
  const existing = patterns.get(patternId);

  if (existing) {
    existing.occurrences++;
    existing.lastSeen = Date.now();
    if (entry.correctedOutput) {
      existing.exampleBefore = entry.originalOutput;
      existing.exampleAfter = entry.correctedOutput;
    }
  } else {
    patterns.set(patternId, {
      id: patternId,
      description: entry.violations.map(v => v.reason).join(' | '),
      occurrences: 1,
      lastSeen: Date.now(),
      avgScoreBefore: entry.scores.overall,
      avgScoreAfter: entry.correctedOutput ? 85 : entry.scores.overall,
      exampleBefore: entry.originalOutput,
      exampleAfter: entry.correctedOutput || entry.originalOutput,
    });
  }

  entry.patternId = patternId;
}

function updatePatternFromSignal(entry: LearningEntry, signal: LearningSignal): void {
  if (!entry.patternId) return;
  const pattern = patterns.get(entry.patternId);
  if (!pattern) return;

  // Positive signals improve the "after" average
  if (signal === 'conversation_continued' || signal === 'user_engaged' || signal === 'human_validated') {
    pattern.avgScoreAfter = Math.min(100, pattern.avgScoreAfter + 2);
  }
  // Negative signals decrease it
  if (signal === 'user_abandoned' || signal === 'human_rejected') {
    pattern.avgScoreAfter = Math.max(0, pattern.avgScoreAfter - 5);
  }
}

// ── Query API ─────────────────────────────────────────────────────────────────

export function getRecentEntries(limit: number = 20): LearningEntry[] {
  return entries.slice(-limit);
}

export function getPatterns(): LearningPattern[] {
  return [...patterns.values()].sort((a, b) => b.occurrences - a.occurrences);
}

export function getFrequentViolations(minOccurrences: number = 3): LearningPattern[] {
  return getPatterns().filter(p => p.occurrences >= minOccurrences);
}

export function getStats(): {
  totalEvaluated: number;
  totalRewritten: number;
  totalBlocked: number;
  avgScore: number;
  topViolations: Array<{ ruleId: string; count: number }>;
} {
  const total = entries.length;
  const rewritten = entries.filter(e => e.correctedOutput !== null).length;
  const blocked = entries.filter(e => e.decision === 'block').length;
  const avgScore = total > 0
    ? Math.round(entries.reduce((s, e) => s + e.scores.overall, 0) / total)
    : 0;

  // Count violation frequency
  const violationCounts = new Map<string, number>();
  for (const entry of entries) {
    for (const v of entry.violations) {
      violationCounts.set(v.ruleId, (violationCounts.get(v.ruleId) || 0) + 1);
    }
  }

  const topViolations = [...violationCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([ruleId, count]) => ({ ruleId, count }));

  return { totalEvaluated: total, totalRewritten: rewritten, totalBlocked: blocked, avgScore, topViolations };
}

export function clearMemory(): void {
  entries.length = 0;
  patterns.clear();
}
