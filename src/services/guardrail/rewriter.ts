// ══════════════════════════════════════════════════════════════════════════════
// RENOVEC Output Rewriter
// Corrects non-conforming outputs while preserving intent.
// ══════════════════════════════════════════════════════════════════════════════

import type {
  EvaluationContext,
  EvaluationResult,
  PolicyDimension,
  RewriteResult,
  Violation,
} from './types';

// ── Correction strategies per dimension ───────────────────────────────────────

type CorrectionFn = (output: string, violations: Violation[], ctx: EvaluationContext) => string;

const CORRECTIONS: Partial<Record<PolicyDimension, CorrectionFn>> = {
  warmth: (output) => {
    let result = output;
    // Remove defensive patterns
    result = result.replace(/je ne suis pas (en mesure|capable|l'équipe|habilité)[^.]*\./gi, '');
    result = result.replace(/je suis (juste|seulement|simplement) (la voix|un assistant|une IA)[^.]*\./gi, '');
    result = result.replace(/ce n'est pas (mon|notre) (rôle|domaine|compétence)[^.]*\./gi, '');
    // Remove cold bureaucratic tone
    result = result.replace(/^veuillez /i, '');
    result = result.replace(/^merci de /i, '');
    result = result.replace(/il est nécessaire de/gi, 'on peut');
    return result.trim();
  },

  noPrematureBarrier: (output, _violations, ctx) => {
    let result = output;
    // Remove cooptation mentions at early turns
    if (ctx.turnCount <= 4) {
      result = result.replace(/[^.]*coopt(é|ation|er)[^.]*\./gi, '');
      result = result.replace(/[^.]*il faut être membre[^.]*\./gi, '');
      result = result.replace(/[^.]*réservé aux membres[^.]*\./gi, '');
      result = result.replace(/[^.]*accès (limité|restreint|conditionnel)[^.]*\./gi, '');
      result = result.replace(/[^.]*vous (devez|devrez) d'abord[^.]*\./gi, '');
    }
    // Remove rejection
    result = result.replace(/[^.]*hors (périmètre|domaine)[^.]*\./gi, '');
    result = result.replace(/[^.]*ce n'est pas (ce que|notre|pour)[^.]*\./gi, '');
    return result.trim();
  },

  noGenericAIStyle: (output) => {
    let result = output;
    result = result.replace(/^(bien sûr|avec plaisir|super|formidable|excellent)[!.,]?\s*/i, '');
    result = result.replace(/je comprends (tout à fait|parfaitement|bien)[.,]?\s*/gi, '');
    result = result.replace(/n'hésitez pas à[^.]*\./gi, '');
    result = result.replace(/je suis là pour vous aider[^.]*\./gi, '');
    result = result.replace(/comment puis-je vous (aider|assister)\s*\?/gi, '');
    result = result.replace(/merci (pour ces|de ces) (précisions|informations|détails)[^.]*\./gi, '');
    return result.trim();
  },

  nonIntrusiveness: (output, _violations, ctx) => {
    let result = output;
    if (ctx.turnCount <= 3) {
      result = result.replace(/quel est votre (nom|prénom|adresse|téléphone|email|âge)[^?]*\?/gi, '');
      result = result.replace(/pouvez-vous me donner (votre|vos)[^?]*\?/gi, '');
    }
    // Remove excess questions (keep max 2)
    const sentences = result.split(/(?<=[.!?])\s+/);
    let qCount = 0;
    const kept = sentences.filter(s => {
      if (s.includes('?')) {
        qCount++;
        return qCount <= 2;
      }
      return true;
    });
    return kept.join(' ').trim();
  },

  productAlignment: (output) => {
    let result = output;
    result = result.replace(/[^.]*innovant[^.]*\./gi, '');
    result = result.replace(/[^.]*révolutionn[^.]*\./gi, '');
    result = result.replace(/[^.]*solution unique[^.]*\./gi, '');
    result = result.replace(/[^.]*inscri(vez|s)-vous (maintenant|vite|dès)[^.]*\./gi, '');
    return result.trim();
  },

  trustClarity: (output) => {
    let result = output;
    result = result.replace(/je vais vous mettre en relation/gi, 'je peux chercher qui pourrait correspondre');
    result = result.replace(/c'est garanti/gi, '');
    result = result.replace(/résultat assuré/gi, '');
    result = result.replace(/je vous envoie quelqu'un/gi, 'je peux identifier des profils compatibles');
    return result.trim();
  },
};

// ── Post-rewrite quality pass ─────────────────────────────────────────────────

function ensureMinimalContent(output: string, ctx: EvaluationContext): string {
  const trimmed = output.trim();
  if (trimmed.length < 10) {
    if (ctx.userMode === 'visitor') {
      return 'Je suis là. Parlez-moi de votre situation, je peux vous aider à clarifier.';
    }
    return 'Je suis là. Dites-moi ce qui vous amène.';
  }
  return trimmed;
}

function ensureEndsCleanly(output: string): string {
  let result = output.trim();
  // Remove trailing incomplete sentences
  if (result.length > 0 && !/[.!?]$/.test(result)) {
    const lastPunct = Math.max(result.lastIndexOf('.'), result.lastIndexOf('!'), result.lastIndexOf('?'));
    if (lastPunct > result.length * 0.5) {
      result = result.slice(0, lastPunct + 1);
    } else {
      result += '.';
    }
  }
  // Remove double spaces
  result = result.replace(/\s{2,}/g, ' ');
  return result;
}

// ── Main Rewriter ─────────────────────────────────────────────────────────────

export function rewrite(
  output: string,
  evaluation: EvaluationResult,
  context: EvaluationContext
): RewriteResult {
  let current = output;
  const changesApplied: string[] = [];
  const dimensionsImproved: PolicyDimension[] = [];

  // Sort violations by severity (critical first)
  const sortedViolations = [...evaluation.violations].sort((a, b) => {
    const order = { critical: 0, major: 1, minor: 2 };
    return order[a.severity] - order[b.severity];
  });

  // Group violations by dimension
  const violationsByDim = new Map<PolicyDimension, Violation[]>();
  for (const v of sortedViolations) {
    const existing = violationsByDim.get(v.dimension) || [];
    existing.push(v);
    violationsByDim.set(v.dimension, existing);
  }

  // Apply corrections per dimension
  for (const [dim, violations] of violationsByDim) {
    const corrector = CORRECTIONS[dim];
    if (corrector) {
      const before = current;
      current = corrector(current, violations, context);
      if (current !== before) {
        changesApplied.push(`Correction ${dim}: ${violations.map(v => v.ruleId).join(', ')}`);
        dimensionsImproved.push(dim);
      }
    }
  }

  // Post-processing
  current = ensureMinimalContent(current, context);
  current = ensureEndsCleanly(current);

  return {
    original: output,
    rewritten: current,
    changesApplied,
    dimensionsImproved,
  };
}
