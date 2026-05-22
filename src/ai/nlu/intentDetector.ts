// ─── Intent Detector ──────────────────────────────────────────────────────────
// Robust NLU intent detection for real human language.
// Operates on normalized text but must also handle non-normalized input.
// Uses layered signals: lexical, semantic, structural, pragmatic.

import { normalizeText } from './normalize';

export type Intent =
  | 'greeting'
  | 'social_correction'
  | 'confusion'
  | 'system_question'
  | 'doubt'
  | 'robot_question'
  | 'situation_description'
  | 'clarification_answer'
  | 'emotional_expression'
  | 'affirmation'
  | 'negation'
  | 'unknown';

export type IntentResult = {
  intent: Intent;
  confidence: number;   // 0.0–1.0
  signals: string[];    // which patterns fired
};

// ─── Greeting patterns — comprehensive ───────────────────────────────────────

const GREETING_PATTERNS: RegExp[] = [
  /^(bonjour|bonsoir|salut|allo|allô|coucou|hey|hello|wesh|hi|yo|bjr|bsr|slt|cc)[!?.,\s]*$/i,
  /^(bonjour|salut|allo|allô|wesh|yo)\s+(à tous|tout le monde|d'abord|tout d'abord)[!?.,\s]*$/i,
  /^(bon matin|bonne journée|bonne soirée)[!?.,\s]*$/i,
  /^(bonne nuit|bonne nuit?)[!?.,\s]*$/i,
  /^(hello everyone|hi there)[!?.,\s]*$/i,
  // Greeting with filler
  /^(bonjour|salut|hello)[,!\s]+[a-z]+[!?.\s]*$/i,
  // Just a greeting word among punctuation
  /^[!?]*(bonjour|salut|allo|allô|coucou|hey|hello|wesh|hi)[!?. ]*$/i,
];

// ─── Affirmation / negation ───────────────────────────────────────────────────

const AFFIRMATION_PATTERNS: RegExp[] = [
  /^(oui|ouais|ouai|oué|ok|okay|d'accord|parfait|exactement|tout à fait|c'est ça|c est ca|bien sûr|absolument|évidemment|voilà|bingo)[!?.,\s]*$/i,
  /^(yes|yep|yeah|yop)[!?.,\s]*$/i,
];

const NEGATION_PATTERNS: RegExp[] = [
  /^(non|nope|pas du tout|absolument pas|pas vraiment|pas exactement|nan|naan)[!?.,\s]*$/i,
  /^(pas ça|c'est pas ça|pas ce que je|pas ce que j')[!?.,\s]*/i,
];

// ─── Social correction ────────────────────────────────────────────────────────

const SOCIAL_CORRECTION_PATTERNS: RegExp[] = [
  /d[''']abord|au préalable|avant (tout|de continuer)|un instant|attendez|attends|pas si vite|doucement/i,
  /(répond|réponds|repon).{0,15}(côté|à côté|mal|faux|pas ça|pas ca|pas ce que)/i,
  /(c['']est pas ce que|pas ce que j['']ai|j['']ai pas demandé|pas ma question|à côté)/i,
  /tu (réponds|as répondu) (à côté|à coté|mal|faux)/i,
  /c['']est pas (ça|ca|ce que)/i,
];

// ─── Confusion ────────────────────────────────────────────────────────────────

const CONFUSION_PATTERNS: RegExp[] = [
  /^[?!]{2,}$/,
  /^(quoi|hein|pardon|comment|koi)[?!.\s]*$/i,
  /de quoi (tu|vous) (parles?|parlez)/i,
  /(comprends? pas|pige pas|pas compri|n['']ai pas compri|compri pas|je ne comprends)/i,
  /c['']est quoi (cette|la) question/i,
  /qu['']est.?ce que (tu|vous) (voulez?|veux) dire/i,
  /je\s+(ne\s+)?(te|vous)\s+suis\s+pas/i,
  /c['']est\s+(flou|pas\s+clair|bizarre|étrange)/i,
];

// ─── Robot / identity question ────────────────────────────────────────────────

const ROBOT_QUESTION_PATTERNS: RegExp[] = [
  /robot|ia\b|i\.a\.|intelligence artificielle|gpt|chatgpt|claude|chatbot/i,
  /t['']es (qui|quoi|un robot|une ia|humain)/i,
  /vous êtes (qui|quoi|un robot|une ia|humain)/i,
  /c['']est (une ia|un bot|un algo|un robot|une machine)/i,
  /humain ou (robot|machine|ia)/i,
  /(comment|c['']est quoi) (ton|votre) (nom|prénom|appel|pseudo)/i,
  /^(t['']appel|t['']appelles?|vous appelez?|ton nom|votre nom)[?!. ]*/i,
  /(t['']es|vous êtes) (bizarr|étrang|spécial|weird)/i,
  /(qu['']est.?ce que tu fais|que fais.?tu|tu fais quoi|vous faites quoi|ton rôle|ton role|votre rôle|votre role)/i,
  /à quoi (tu|vous) (sers?|servez)/i,
  /t['']as quel rôle/i,
  /c['']est quoi (ton|votre) (rôle|role|boulot|job)/i,
  /quel est (ton|votre) (rôle|role|but|objectif)/i,
];

// ─── System question ──────────────────────────────────────────────────────────

const SYSTEM_QUESTION_PATTERNS: RegExp[] = [
  /comment (ça|ca) (fonctionne?|marche|se passe)/i,
  /c['']est quoi (renovec|ce (site|service|truc|machin))/i,
  /c['']est (payant|gratuit|combien|cher)/i,
  /il faut (payer|s['']abonner|s inscrire)/i,
  /(en quoi|c['']est quoi|quel est|kesseque|kessé|c'est quoi) (le concept|votre concept|ton concept|le principe|votre service|ton service)/i,
  /(à quoi|a quoi) (ça|ca) sert/i,
  /(sert à quoi|sert a quoi)/i,
  /(vous|tu) (faites?|fais|fait) quoi (exactement|concrètement)?/i,
  /quel (est le|est ton|est votre) (but|objectif|principe)/i,
  /vous (vendez|offrez|proposez) quoi/i,
  /c['']est (quoi|comment) (le fonctionnement|le principe|le concept)/i,
];

// ─── Doubt ────────────────────────────────────────────────────────────────────

const DOUBT_PATTERNS: RegExp[] = [
  /je sais pas si (c['']est|je suis)/i,
  /pas sûr (que|d['']être|de)/i,
  /j['']hésite/i,
  /(bon endroit|bonne adresse|bonne plateforme)/i,
  /suis.?je (bien|au bon)/i,
  /c['']est (pour ça|le bon endroit)/i,
];

// ─── Emotional expression ─────────────────────────────────────────────────────

const EMOTIONAL_PATTERNS: RegExp[] = [
  /^(j['']en peux plus|je suis (à bout|épuisé|perdu|désespéré|submergé))[.!?]?$/i,
  /^(c['']est (trop dur|difficile|horrible|terrible|catastrophique|nul))[.!?]?$/i,
  /^(je ne sais plus quoi faire|je sais plus quoi faire)[.!?]?$/i,
  /^(aide.?(moi)?|help|au secours|sos)[!?. ]*$/i,
  /^(vraiment|franchement|honnêtement)[,\s]+(ça va pas|je me sens|j['']ai|c['']est)/i,
];

// ─── Situation signals — comprehensive semantic set ───────────────────────────

// These detect REAL WORLD SITUATIONS regardless of how they're expressed.
// Key insight: people describe physical state of objects/places, not explicit problems.

const SITUATION_SEMANTIC_PATTERNS: Array<{
  pattern: RegExp;
  signal: string;
  situationType?: string;
}> = [
  // Physical state of home/objects (THE KEY MISSING CASES)
  { pattern: /salon (est|s['']est) ouvert/i, signal: 'open_room_structure', situationType: 'window_security' },
  { pattern: /fenêtre (est|reste|s['']est) (ouverte?|cassée?|bloquée?|brisée?)/i, signal: 'window_problem', situationType: 'window_security' },
  { pattern: /porte (ne|n['']arrive|n[''])? ?(ferme|s['']ouvre|se) (plus|pas)/i, signal: 'door_problem' },
  { pattern: /(il|il y a|ya) (de l['']eau|de l'eau|une fuite|un dégât)/i, signal: 'water_problem' },
  { pattern: /ça (coule|déborde|goûtte|goutte)/i, signal: 'water_problem' },
  { pattern: /(plafond|mur|sol) (mouillé|humide|qui coule|qui s['']effondre)/i, signal: 'structural_damage' },
  { pattern: /vitre (cassée?|fissurée?|brisée?|qui|est)/i, signal: 'glass_damage' },
  { pattern: /miroir (cassé|brisé|tombé|par terre|qui|est)/i, signal: 'glass_damage' },
  { pattern: /serrure (ne marche|ne fonctionne|est cassée?|bloquée?|ne (se|s['']))/i, signal: 'lock_problem' },
  { pattern: /(suis|je suis|me retrouve) (dehors|bloqué|coincé|enfermé)/i, signal: 'locked_out' },

  // Employment
  { pattern: /(j['']ai|on m['']a) (été|) (licencié|viré|renvoyé|remercié)/i, signal: 'job_loss' },
  { pattern: /(j['']ai|je viens de) (perdu|perdre) (mon|l['']) (emploi|travail|boulot|poste)/i, signal: 'job_loss' },
  { pattern: /rupture conventionnelle/i, signal: 'job_loss' },
  { pattern: /(démissionné|je démissionne|je veux démissionner)/i, signal: 'job_situation' },

  // Financial
  { pattern: /(j['']ai|je n['']ai) (plus|pas) (d['']argent|les moyens|de sous|de thunes)/i, signal: 'financial_problem' },
  { pattern: /(loyer|facture|dette) (en retard|impayé|dû|pas payé)/i, signal: 'financial_problem' },
  { pattern: /(huissier|saisie|expulsion)/i, signal: 'legal_financial_urgency' },

  // Medical / health
  { pattern: /(j['']ai|je|quelqu['']un a) (mal|douleur|souffre|saigne)/i, signal: 'health_issue' },
  { pattern: /(accident|blessé|hospitalisé|urgences)/i, signal: 'medical_emergency' },
  { pattern: /ne (respire|peut|arrive) (plus|pas) (bien|à)/i, signal: 'medical_emergency' },

  // Administrative
  { pattern: /(papier|document|dossier|formulaire) (expire|expiré|à renouveler|bloqué)/i, signal: 'admin_urgency' },
  { pattern: /(CAF|préfecture|impôts|titre de séjour|carte de séjour)/i, signal: 'admin_task' },

  // Conflict / relational
  { pattern: /(conflit|dispute|problème) (avec|entre)/i, signal: 'conflict' },
  { pattern: /(menace|harcelé|violence|agression)/i, signal: 'violence_risk' },

  // Generic situation descriptions
  { pattern: /(j['']ai|j'ai) un (problème|souci|truc|soucis) (avec|de|d[''']|au|chez)/i, signal: 'generic_problem' },
  { pattern: /(ça marche plus|ça ne marche plus|ça fonctionne plus|ça ne fonctionne plus)/i, signal: 'something_broken' },
  { pattern: /(il y a|ya|y a) un (problème|souci|truc) (chez|avec|au|à)/i, signal: 'generic_problem' },
  { pattern: /(j['']ai besoin) (d['']aide|d['']un|de|d')/i, signal: 'help_request' },
];

// ─── Core intent detector ─────────────────────────────────────────────────────

export function detectIntent(rawInput: string): IntentResult {
  const normalized = normalizeText(rawInput);
  const t = normalized.toLowerCase().trim();
  const original = rawInput.toLowerCase().trim();

  const signals: string[] = [];

  // ── 1. Greeting (highest priority for short messages) ──────────────────────
  for (const pattern of GREETING_PATTERNS) {
    if (pattern.test(t) || pattern.test(original)) {
      signals.push('greeting_pattern');
      return { intent: 'greeting', confidence: 0.95, signals };
    }
  }

  // ── 2. Affirmation ──────────────────────────────────────────────────────────
  for (const pattern of AFFIRMATION_PATTERNS) {
    if (pattern.test(t) || pattern.test(original)) {
      signals.push('affirmation_pattern');
      return { intent: 'affirmation', confidence: 0.9, signals };
    }
  }

  // ── 3. Negation ─────────────────────────────────────────────────────────────
  for (const pattern of NEGATION_PATTERNS) {
    if (pattern.test(t) || pattern.test(original)) {
      signals.push('negation_pattern');
      return { intent: 'negation', confidence: 0.9, signals };
    }
  }

  // ── 4. Emotional expression (short, high emotion) ──────────────────────────
  for (const pattern of EMOTIONAL_PATTERNS) {
    if (pattern.test(t)) {
      signals.push('emotional_pattern');
      return { intent: 'emotional_expression', confidence: 0.85, signals };
    }
  }

  // ── 5. Social correction ────────────────────────────────────────────────────
  for (const pattern of SOCIAL_CORRECTION_PATTERNS) {
    if (pattern.test(t)) {
      signals.push('social_correction');
      return { intent: 'social_correction', confidence: 0.9, signals };
    }
  }

  // ── 6. Robot / identity question ────────────────────────────────────────────
  for (const pattern of ROBOT_QUESTION_PATTERNS) {
    if (pattern.test(t) || pattern.test(original)) {
      signals.push('robot_question');
      return { intent: 'robot_question', confidence: 0.9, signals };
    }
  }

  // ── 7. System question ──────────────────────────────────────────────────────
  for (const pattern of SYSTEM_QUESTION_PATTERNS) {
    if (pattern.test(t)) {
      signals.push('system_question');
      return { intent: 'system_question', confidence: 0.85, signals };
    }
  }

  // ── 8. Confusion ────────────────────────────────────────────────────────────
  for (const pattern of CONFUSION_PATTERNS) {
    if (pattern.test(t)) {
      signals.push('confusion');
      return { intent: 'confusion', confidence: 0.85, signals };
    }
  }

  // ── 9. Doubt ────────────────────────────────────────────────────────────────
  for (const pattern of DOUBT_PATTERNS) {
    if (pattern.test(t)) {
      signals.push('doubt');
      return { intent: 'doubt', confidence: 0.8, signals };
    }
  }

  // ── 10. Situation semantic detection (MOST IMPORTANT) ──────────────────────
  for (const { pattern, signal } of SITUATION_SEMANTIC_PATTERNS) {
    if (pattern.test(t) || pattern.test(original)) {
      signals.push(signal);
    }
  }
  if (signals.length > 0) {
    return { intent: 'situation_description', confidence: 0.85, signals };
  }

  // ── 11. Structural heuristics for longer messages ──────────────────────────
  const wordCount = t.split(/\s+/).filter(w => w.length > 1).length;

  // Question structure → clarification or system question
  if (t.endsWith('?') && wordCount <= 6) {
    // Short question — likely clarification answer or confusion
    if (/comment|pourquoi|quand|où|qui|que|quoi|lequel/.test(t)) {
      signals.push('question_structure');
      return { intent: 'clarification_answer', confidence: 0.6, signals };
    }
  }

  // Long messages are almost certainly situation descriptions
  if (wordCount >= 8) {
    signals.push('length_heuristic');
    return { intent: 'situation_description', confidence: 0.7, signals };
  }

  // Multi-sentence with period → situation or clarification
  if (t.includes('.') && wordCount > 5) {
    signals.push('multi_sentence');
    return { intent: 'clarification_answer', confidence: 0.65, signals };
  }

  // ── 12. Medium-length messages: prefer situation_description over unknown ──
  if (wordCount >= 4) {
    signals.push('medium_length_default');
    return { intent: 'situation_description', confidence: 0.5, signals };
  }

  // ── 13. Very short ambiguous messages — do NOT return "unknown" ────────────
  // Treat as situation fragment needing clarification
  if (wordCount >= 2) {
    signals.push('short_ambiguous');
    return { intent: 'situation_description', confidence: 0.4, signals };
  }

  // Absolute last resort — single word not recognized
  signals.push('single_word_fallback');
  return { intent: 'greeting', confidence: 0.4, signals };
}

// ─── Legacy string-only export (compatible with existing code) ────────────────

export function detectIntentString(rawInput: string): string {
  return detectIntent(rawInput).intent;
}
