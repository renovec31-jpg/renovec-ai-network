// ══════════════════════════════════════════════════════════════════════════════
// RENOVEC Output Policy — Machine-readable charter
// ══════════════════════════════════════════════════════════════════════════════

import type { PolicyRule } from './types';

// ── Pattern Detectors ─────────────────────────────────────────────────────────

const DEFENSIVE_PATTERNS = [
  /je ne suis pas (en mesure|capable|l'équipe|habilité)/i,
  /je suis (juste|seulement|simplement) (la voix|un assistant|une IA)/i,
  /ce n'est pas (mon|notre) (rôle|domaine|compétence)/i,
  /je ne (peux|suis) pas (garantir|promettre|assurer)/i,
  /il faut (d'abord|avant tout) (être|devenir|s'inscrire)/i,
];

const PREMATURE_BARRIER_PATTERNS = [
  /coopt(é|ation|er)/i,
  /il faut être membre/i,
  /réservé aux membres/i,
  /accès (limité|restreint|conditionnel)/i,
  /pas encore (accès|disponible|possible)/i,
  /vous (devez|devrez) (d'abord|avant)/i,
];

const GENERIC_AI_PATTERNS = [
  /^(bien sûr|avec plaisir|super|formidable|excellent)/i,
  /je comprends (tout à fait|parfaitement|bien)/i,
  /n'hésitez pas à/i,
  /je suis là pour vous aider/i,
  /comment puis-je vous (aider|assister)/i,
  /merci (pour ces|de ces) (précisions|informations|détails)/i,
  /je (serais|serai) ravi/i,
];

const MARKETING_PATTERNS = [
  /innovant|révolutionn/i,
  /solution unique|plateforme|offre exclusive/i,
  /inscri(vez|s)-vous (maintenant|vite|dès)/i,
  /profitez de|bénéficiez de/i,
];

const INTRUSIVE_QUESTIONS = [
  /quel est votre (nom|prénom|adresse|téléphone|email|âge)/i,
  /pouvez-vous me donner (votre|vos)/i,
  /j'aurais besoin de (votre|vos) (coordonnées|informations)/i,
];

function containsPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(text));
}

function getFirstMatch(text: string, patterns: RegExp[]): string | undefined {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[0];
  }
  return undefined;
}

// ── Policy Rules ──────────────────────────────────────────────────────────────

export const POLICY_RULES: PolicyRule[] = [
  // ─── Warmth ───────────────────────────────────────────────────────────
  {
    id: 'warmth-no-defensive',
    dimension: 'warmth',
    severity: 'critical',
    description: 'Ne pas utiliser de formulations défensives ou de mise à distance',
    weight: 15,
    test: (output) => !containsPattern(output, DEFENSIVE_PATTERNS),
  },
  {
    id: 'warmth-not-cold',
    dimension: 'warmth',
    severity: 'major',
    description: 'Le ton doit être chaleureux, pas froid ni administratif',
    weight: 8,
    test: (output) => {
      const coldMarkers = /^(veuillez|merci de|il est nécessaire|nous vous informons)/i;
      return !coldMarkers.test(output.trim());
    },
  },
  {
    id: 'warmth-length-appropriate',
    dimension: 'warmth',
    severity: 'minor',
    description: 'Réponse ni trop courte (< 10 chars) ni trop longue (> 500 chars)',
    weight: 3,
    test: (output) => output.length >= 10 && output.length <= 500,
  },

  // ─── Usefulness ───────────────────────────────────────────────────────
  {
    id: 'useful-not-empty',
    dimension: 'usefulness',
    severity: 'critical',
    description: 'La réponse doit apporter quelque chose de concret',
    weight: 12,
    test: (output) => {
      const emptyFillers = /^(d'accord|ok|je vois|hmm|bien|oui|je comprends)\.?$/i;
      return !emptyFillers.test(output.trim());
    },
  },
  {
    id: 'useful-moves-forward',
    dimension: 'usefulness',
    severity: 'major',
    description: 'La réponse doit faire avancer la conversation (question, info, orientation)',
    weight: 8,
    test: (output) => {
      const hasQuestion = /\?/.test(output);
      const hasAction = /(je (peux|vais|regarde|cherche|comprends)|on (peut|va)|voici|voilà)/i.test(output);
      const hasInfo = output.length > 40;
      return hasQuestion || hasAction || hasInfo;
    },
  },

  // ─── Non-Intrusiveness ────────────────────────────────────────────────
  {
    id: 'nonintrusive-no-personal-data',
    dimension: 'nonIntrusiveness',
    severity: 'critical',
    description: 'Ne pas demander de données personnelles au premier contact',
    weight: 15,
    test: (output, ctx) => {
      if (ctx.turnCount > 3) return true;
      return !containsPattern(output, INTRUSIVE_QUESTIONS);
    },
  },
  {
    id: 'nonintrusive-no-question-flood',
    dimension: 'nonIntrusiveness',
    severity: 'major',
    description: 'Pas plus de 2 questions par message',
    weight: 7,
    test: (output) => {
      const questionCount = (output.match(/\?/g) || []).length;
      return questionCount <= 2;
    },
  },

  // ─── Product Alignment ────────────────────────────────────────────────
  {
    id: 'align-no-marketing',
    dimension: 'productAlignment',
    severity: 'major',
    description: 'Pas de langage marketing ou commercial',
    weight: 10,
    test: (output) => !containsPattern(output, MARKETING_PATTERNS),
  },
  {
    id: 'align-no-other-product',
    dimension: 'productAlignment',
    severity: 'minor',
    description: 'Ne pas mentionner de produits/services concurrents',
    weight: 4,
    test: (output) => {
      const competitors = /allovoisins|leboncoin|taskrabbit|uber|yoojo/i;
      return !competitors.test(output);
    },
  },

  // ─── Trust Clarity ────────────────────────────────────────────────────
  {
    id: 'trust-no-false-promise',
    dimension: 'trustClarity',
    severity: 'critical',
    description: 'Ne pas promettre une mise en relation automatique ou garantie',
    weight: 12,
    test: (output) => {
      const falsePromise = /(je vais vous mettre en relation|c'est garanti|résultat assuré|je vous envoie quelqu'un)/i;
      return !falsePromise.test(output);
    },
  },
  {
    id: 'trust-no-fake-urgency',
    dimension: 'trustClarity',
    severity: 'major',
    description: 'Ne pas créer de fausse urgence',
    weight: 6,
    test: (output) => {
      const fakeUrgency = /(dernière chance|offre limitée|dépêchez-vous|avant qu'il soit trop tard)/i;
      return !fakeUrgency.test(output);
    },
  },

  // ─── No Premature Barrier ─────────────────────────────────────────────
  {
    id: 'barrier-no-early-cooptation',
    dimension: 'noPrematureBarrier',
    severity: 'critical',
    description: 'Ne pas mentionner la cooptation ou les conditions d\'accès au premier contact',
    weight: 15,
    test: (output, ctx) => {
      if (ctx.turnCount > 4) return true;
      if (ctx.intent === 'question_about_renovec' && ctx.turnCount > 2) return true;
      return !containsPattern(output, PREMATURE_BARRIER_PATTERNS);
    },
  },
  {
    id: 'barrier-no-rejection',
    dimension: 'noPrematureBarrier',
    severity: 'critical',
    description: 'Ne jamais rejeter une situation comme hors périmètre',
    weight: 15,
    test: (output) => {
      const rejection = /(hors (périmètre|domaine)|ce n'est pas (ce que|notre|pour)|nous ne (couvrons|traitons) pas)/i;
      return !rejection.test(output);
    },
  },

  // ─── No Generic AI Style ──────────────────────────────────────────────
  {
    id: 'style-no-generic-ai',
    dimension: 'noGenericAIStyle',
    severity: 'major',
    description: 'Éviter les formulations chatbot génériques',
    weight: 10,
    test: (output) => !containsPattern(output, GENERIC_AI_PATTERNS),
  },
  {
    id: 'style-no-emoji',
    dimension: 'noGenericAIStyle',
    severity: 'minor',
    description: 'Pas d\'emoji',
    weight: 3,
    test: (output) => !/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}]/u.test(output),
  },

  // ─── Privacy Respect ──────────────────────────────────────────────────
  {
    id: 'privacy-no-repeat-personal',
    dimension: 'privacyRespect',
    severity: 'major',
    description: 'Ne pas répéter des informations personnelles du visiteur',
    weight: 8,
    test: (output, ctx) => {
      if (ctx.userMode !== 'visitor') return true;
      const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const phonePattern = /0[1-9][\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}[\s.-]?\d{2}/;
      return !emailPattern.test(output) && !phonePattern.test(output);
    },
  },

  // ─── Actionability ────────────────────────────────────────────────────
  {
    id: 'action-visitor-engaged',
    dimension: 'actionability',
    severity: 'major',
    description: 'Pour un visiteur, la réponse doit donner envie de continuer',
    weight: 8,
    test: (output, ctx) => {
      if (ctx.userMode !== 'visitor') return true;
      const engaging = /(\?|je (peux|vais|comprends)|on (peut|va)|dis-moi|parle|raconte|décri)/i;
      return engaging.test(output);
    },
  },
];

// ── Scoring Weights per Dimension ─────────────────────────────────────────────

export const DIMENSION_WEIGHTS: Record<string, number> = {
  warmth: 15,
  usefulness: 12,
  nonIntrusiveness: 12,
  productAlignment: 10,
  trustClarity: 12,
  noPrematureBarrier: 15,
  noGenericAIStyle: 8,
  privacyRespect: 8,
  actionability: 8,
};

export function getViolationExcerpt(output: string, ruleId: string): string | undefined {
  if (ruleId.includes('defensive')) return getFirstMatch(output, DEFENSIVE_PATTERNS);
  if (ruleId.includes('barrier') || ruleId.includes('cooptation')) return getFirstMatch(output, PREMATURE_BARRIER_PATTERNS);
  if (ruleId.includes('generic-ai')) return getFirstMatch(output, GENERIC_AI_PATTERNS);
  if (ruleId.includes('marketing')) return getFirstMatch(output, MARKETING_PATTERNS);
  if (ruleId.includes('personal-data')) return getFirstMatch(output, INTRUSIVE_QUESTIONS);
  return undefined;
}
