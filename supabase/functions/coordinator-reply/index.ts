import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Anthropic from "npm:@anthropic-ai/sdk@0.51.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Turn = { role: "coordinator" | "user"; content: string };

type Intent =
  | "greeting"
  | "social_correction"
  | "confusion"
  | "system_question"
  | "doubt"
  | "robot_question"
  | "situation_description"
  | "clarification_answer"
  | "emotional_expression"
  | "affirmation"
  | "negation"
  | "unknown";

type CoordinatorContextInput = {
  memoryContext?: string;
  adaptationHints?: string;
  situationSummary?: string | null;
  existingVigilancePoints?: string[];
  existingBlockers?: string[];
};

type FullCoordinatorResponse = {
  intent: Intent;
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
    emotionalState: string;
    stage: string;
  };
  actions: Array<{ type: string; payload: Record<string, unknown> }>;
  ui: { tone: string; density: string; showTimeline: boolean; highlightNextStep: boolean };
  trust: { riskLevel: string; needsHumanReview: boolean; reason: string };
  memory: { factsToStore: string[]; contextToKeep: string[]; doNotForget: string[] };
  message: string;
  is_final: boolean;
  urgency_level: string;
  reformulated_objective: string;
  context_description: string;
  recommended_format: string;
  vigilance_points: string[];
};

// ─── NLU: Semantic Normalization ──────────────────────────────────────────────

const CORRECTIONS: Array<[RegExp, string]> = [
  [/\baloo\b/gi, "allo"],
  [/\ball[oô]+\b/gi, "allo"],
  [/\bbjr\b/gi, "bonjour"],
  [/\bbsr\b/gi, "bonsoir"],
  [/\bslt\b/gi, "salut"],
  [/\bcc\b/gi, "coucou"],
  [/\bwech\b/gi, "wesh"],
  [/\bprblm?\b/gi, "problème"],
  [/\bproblem\b/gi, "problème"],
  [/\bpb\b/gi, "problème"],
  [/\bpbs\b/gi, "problèmes"],
  [/\bqq\b/gi, "quelque"],
  [/\bqqch\b/gi, "quelque chose"],
  [/\bkan\b/gi, "quand"],
  [/\bkoi\b/gi, "quoi"],
  [/\bkeski\b/gi, "qu'est-ce qui"],
  [/\bkessé\b/gi, "qu'est-ce que"],
  [/\bms\b/gi, "mais"],
  [/\bpk\b/gi, "pourquoi"],
  [/\bpck\b/gi, "parce que"],
  [/\bc est\b/gi, "c'est"],
  [/\bca\b/gi, "ça"],
  [/\bjsp\b/gi, "je sais pas"],
  [/\bouai\b/gi, "oui"],
  [/\boué\b/gi, "oui"],
  [/\bnope\b/gi, "non"],
  [/([a-z])\1{3,}/gi, "$1$1"],
  [/\bproblem(e)?\b/gi, "problème"],
  [/\bfenetre\b/gi, "fenêtre"],
  [/\belectr/gi, "électr"],
];

function normalizeText(input: string): string {
  let t = input.trim();
  for (const [pattern, replacement] of CORRECTIONS) {
    t = t.replace(pattern, replacement);
  }
  return t;
}

// ─── NLU: Intent Detection ────────────────────────────────────────────────────

type IntentResult = { intent: Intent; confidence: number; signals: string[] };

function detectIntent(rawInput: string): IntentResult {
  const normalized = normalizeText(rawInput);
  const t = normalized.toLowerCase().trim();
  const original = rawInput.toLowerCase().trim();
  const signals: string[] = [];

  // ── Greeting ──────────────────────────────────────────────────────────────
  const greetingPatterns = [
    /^(bonjour|bonsoir|salut|allo|allô|coucou|hey|hello|wesh|hi|yo|bjr|bsr|slt)[!?.,\s]*$/i,
    /^(bonjour|salut|allo|allô|wesh|yo)\s+(à tous|tout le monde|d'abord|tout d'abord)[!?.,\s]*$/i,
    /^[!?]*(bonjour|salut|allo|allô|coucou|hey|hello|wesh|hi)[!?. ]*$/i,
    /^(bon matin|bonne journée|bonne soirée|bonne nuit)[!?.,\s]*$/i,
  ];
  for (const p of greetingPatterns) {
    if (p.test(t) || p.test(original)) {
      return { intent: "greeting", confidence: 0.95, signals: ["greeting_pattern"] };
    }
  }

  // ── Affirmation ───────────────────────────────────────────────────────────
  if (/^(oui|ouais|ouai|oué|ok|okay|d'accord|parfait|exactement|tout à fait|c'est ça|c est ca|bien sûr|voilà|yes|yep|yeah)[!?.,\s]*$/i.test(t)) {
    return { intent: "affirmation", confidence: 0.9, signals: ["affirmation"] };
  }

  // ── Negation ──────────────────────────────────────────────────────────────
  if (/^(non|nope|pas du tout|absolument pas|pas vraiment|nan)[!?.,\s]*$/i.test(t)) {
    return { intent: "negation", confidence: 0.9, signals: ["negation"] };
  }

  // ── Emotional expression ──────────────────────────────────────────────────
  if (
    /^(j['']en peux plus|je suis (à bout|épuisé|perdu|désespéré|submergé))[.!?]?$/i.test(t) ||
    /^(aide.?(moi)?|help|au secours|sos)[!?. ]*$/i.test(t) ||
    /^(c['']est (trop dur|difficile|horrible|terrible|catastrophique))[.!?]?$/i.test(t)
  ) {
    return { intent: "emotional_expression", confidence: 0.85, signals: ["emotional"] };
  }

  // ── Social correction ─────────────────────────────────────────────────────
  if (
    /d[''']abord|au préalable|avant (tout|de continuer)|un instant|attendez|attends|pas si vite|doucement/i.test(t) ||
    /(répond|réponds|repon).{0,15}(côté|à côté|mal|faux|pas ça|pas ca|pas ce que)/i.test(t) ||
    /(c['']est pas ce que|pas ce que j['']ai|j['']ai pas demandé|pas ma question|à côté)/i.test(t) ||
    /tu (réponds|as répondu) (à côté|à coté|mal|faux)/i.test(t)
  ) {
    return { intent: "social_correction", confidence: 0.9, signals: ["social_correction"] };
  }

  // ── Robot / identity question ─────────────────────────────────────────────
  if (
    /robot|ia\b|i\.a\.|intelligence artificielle|gpt|chatgpt|claude|chatbot/i.test(t) ||
    /t['']es (qui|quoi|un robot|une ia|humain)/i.test(t) ||
    /c['']est (une ia|un bot|un algo|un robot|une machine)/i.test(t) ||
    /humain ou (robot|machine|ia)/i.test(t) ||
    /(comment|c['']est quoi) (ton|votre) (nom|prénom|appel|pseudo)/i.test(t) ||
    /(qu['']est.?ce que tu fais|que fais.?tu|tu fais quoi|vous faites quoi|ton rôle|ton role|votre rôle|votre role)/i.test(t) ||
    /à quoi (tu|vous) (sers?|servez)/i.test(t) ||
    /c['']est quoi (ton|votre) (rôle|role|boulot)/i.test(t) ||
    /quel est (ton|votre) (rôle|role|but)/i.test(t)
  ) {
    return { intent: "robot_question", confidence: 0.9, signals: ["robot_question"] };
  }

  // ── System question ───────────────────────────────────────────────────────
  if (
    /comment (ça|ca) (fonctionne?|marche|se passe)/i.test(t) ||
    /c['']est quoi (renovec|ce (site|service|truc))/i.test(t) ||
    /c['']est (payant|gratuit)/i.test(t) ||
    /il faut (payer|s['']abonner)/i.test(t) ||
    /(en quoi|quel est|c'est quoi) (le concept|le principe|votre service)/i.test(t) ||
    /(à quoi|a quoi) (ça|ca) sert/i.test(t) ||
    /(sert à quoi|sert a quoi)/i.test(t) ||
    /(vous|tu) (faites?|fais|fait) quoi (exactement|concrètement)?/i.test(t)
  ) {
    return { intent: "system_question", confidence: 0.85, signals: ["system_question"] };
  }

  // ── Confusion ─────────────────────────────────────────────────────────────
  if (
    /^[?!]{2,}$/.test(t) ||
    /^(quoi|hein|pardon|comment|koi)[?!.\s]*$/i.test(t) ||
    /de quoi (tu|vous) (parles?|parlez)/i.test(t) ||
    /(comprends? pas|pige pas|pas compri|n['']ai pas compri)/i.test(t) ||
    /je\s+(ne\s+)?(te|vous)\s+suis\s+pas/i.test(t)
  ) {
    return { intent: "confusion", confidence: 0.85, signals: ["confusion"] };
  }

  // ── Doubt ─────────────────────────────────────────────────────────────────
  if (
    /je sais pas si (c['']est|je suis)/i.test(t) ||
    /pas sûr (que|d['']être)/i.test(t) ||
    /j['']hésite/i.test(t) ||
    /(bon endroit|bonne plateforme)/i.test(t) ||
    /suis.?je (bien|au bon)/i.test(t)
  ) {
    return { intent: "doubt", confidence: 0.8, signals: ["doubt"] };
  }

  // ── Situation semantic detection ──────────────────────────────────────────
  // This is the CRITICAL section — detects real situations in real language
  const situationPatterns: Array<{ pattern: RegExp; signal: string }> = [
    // Physical state of home (THE KEY CASE: "mon salon est ouvert")
    { pattern: /(salon|chambre|salle|pièce|cuisine|bureau|entrée|couloir).{0,20}(est|s'est|reste).{0,15}(ouvert|ouverte)/i, signal: "room_open" },
    { pattern: /fenêtre.{0,20}(cassée?|brisée?|ne ferme|bloquée?|fissurée?)/i, signal: "window_broken" },
    { pattern: /(fenêtre|vitre).{0,10}(ne ferme|ferme plus|bloquée?)/i, signal: "window_stuck" },
    { pattern: /vitre (cassée?|fissurée?|brisée?|qui|est)/i, signal: "glass_broken" },
    { pattern: /miroir (cassé|brisé|tombé|par terre)/i, signal: "mirror_broken" },
    { pattern: /(problème|souci|truc).{0,20}(vitre|miroir|verre|fenêtre)/i, signal: "glass_issue" },
    // Water
    { pattern: /(ça coule|fuite d'eau|fuite d['']eau|dégât des eaux|inondé)/i, signal: "water_damage" },
    { pattern: /(eau.{0,10}(partout|plafond|sol|mur)|plafond.{0,10}(mouillé|coule))/i, signal: "water_ceiling" },
    { pattern: /(il y a|ya|y['']a).{0,10}(fuite|eau|dégât)/i, signal: "water_leak" },
    // Locked out / door
    { pattern: /(je suis|me retrouve|coincé|bloqué).{0,15}(dehors|extérieur)/i, signal: "locked_out" },
    { pattern: /(serrure|porte).{0,20}(cassée?|bloquée?|ne s'ouvre|ne ferme)/i, signal: "door_issue" },
    { pattern: /clé.{0,10}(cassée?|perdue?|bloquée?|coincée?)/i, signal: "key_issue" },
    // Employment
    { pattern: /(licencié|viré|renvoyé|perdu.{0,10}(emploi|travail|boulot))/i, signal: "job_loss" },
    { pattern: /rupture conventionnelle/i, signal: "job_loss" },
    { pattern: /(chômage|pôle emploi|allocations chômage)/i, signal: "unemployment" },
    // Financial
    { pattern: /(huissier|saisie|expulsion)/i, signal: "legal_financial" },
    { pattern: /(loyer.{0,15}(impayé|retard|pas payé))/i, signal: "rent_issue" },
    { pattern: /coupure.{0,10}(eau|gaz|électricité|énergie)/i, signal: "utility_cut" },
    { pattern: /(j['']ai|je n['']ai).{0,10}(plus|pas).{0,10}(d['']argent|les moyens)/i, signal: "no_money" },
    // Medical
    { pattern: /(douleur (forte|intense)|saigne|ne respire|inconscient|accident grave)/i, signal: "medical_emergency" },
    { pattern: /(besoin.{0,10}ambulance|appeler le 15|appeler le 18)/i, signal: "emergency_services" },
    { pattern: /(blessé|hospitalisé|urgences médicales)/i, signal: "medical_need" },
    // Violence / safety
    { pattern: /(violence|menace|agression|harcèlement|j'ai peur|en danger|il me frappe)/i, signal: "safety_risk" },
    // Administrative
    { pattern: /(papier|document|dossier).{0,15}(expire|expiré|à renouveler)/i, signal: "admin_urgent" },
    { pattern: /(CAF|préfecture|titre de séjour|carte de séjour|impôts|retraite)/i, signal: "admin_task" },
    // Conflict
    { pattern: /(conflit|dispute|tension|problème avec).{0,30}(voisin|famille|collègue|employeur|propriétaire)/i, signal: "conflict" },
    // Generic problem signals
    { pattern: /(j['']ai|j'ai).{0,10}(problème|souci|soucis|truc).{0,20}(avec|chez|au|de|d['''])/i, signal: "generic_problem" },
    { pattern: /(ça marche plus|ça ne marche plus|ça fonctionne plus)/i, signal: "broken_thing" },
    { pattern: /(il y a|ya|y'a).{0,10}(problème|souci|truc).{0,20}(chez|avec|au|à)/i, signal: "generic_home_problem" },
    { pattern: /(j['']ai besoin).{0,10}(d['']aide|d['']un|de)/i, signal: "help_request" },
    // Classic explicit situation keywords — habitat
    { pattern: /\b(fuite|panne|bloqué|expulsé|blessé|malade|licencié|démission|dette|loyer|serrure|vitrage|cassé)\b/i, signal: "classic_situation" },
    // Education
    { pattern: /\b(soutien scolaire|cours particuliers|aide aux devoirs|tuteur|prof particulier)\b/i, signal: "education_support" },
    { pattern: /(aide.{0,15}(mon fils|ma fille|mon enfant).{0,20}(école|devoirs|maths|français))/i, signal: "education_child" },
    { pattern: /\b(orientation|parcoursup|réorientation|filière|alternance|apprentissage)\b/i, signal: "education_orientation" },
    // Aide humaine
    { pattern: /\b(aide à domicile|maintien domicile|dépendance|aidant|aidant familial|personne âgée)\b/i, signal: "aide_humaine" },
    { pattern: /\b(handicap|mdph|aah|auxiliaire de vie|autisme|mobilité réduite)\b/i, signal: "handicap" },
    // Accompagnement / soutien
    { pattern: /(accompagner|accompagnement).{0,20}(rendez.?vous|tribunal|préfecture|hôpital)/i, signal: "accompagnement" },
    { pattern: /(besoin de parler|parler à quelqu'un|écoute|quelqu'un qui écoute)/i, signal: "soutien_moral" },
    { pattern: /(idées noires|plus envie|en finir|suicide)/i, signal: "soutien_urgent" },
    // Isolement / social
    { pattern: /(isolé|solitude|pas d'amis|trop seul|rencontrer des gens|lien social)/i, signal: "isolement" },
    // Voisinage
    { pattern: /(conflit|bruit|nuisance).{0,15}voisin|voisin.{0,15}(conflit|bruit|nuisance)/i, signal: "voisinage" },
    // Réparation objet
    { pattern: /(réparer|réparation).{0,20}(lave.?linge|réfrigérateur|frigo|téléphone|ordinateur|vélo)/i, signal: "reparation" },
    // Coordination familiale
    { pattern: /\b(aidant familial|coordination familiale|relais aidant|tout gère seul)\b/i, signal: "coordination_famille" },
    // Mobilité
    { pattern: /(voiture.{0,10}panne|transport adapté|pas de transport|me déplacer)/i, signal: "mobilite" },
    // Besoins locaux
    { pattern: /(quelqu'un de confiance|proche de chez|dans mon quartier|recommandation locale)/i, signal: "besoin_local" },
    // Urgence
    { pattern: /\b(urgent|urgence|vite|rapidement|immédiatement)\b/i, signal: "urgency" },
  ];

  for (const { pattern, signal } of situationPatterns) {
    if (pattern.test(t) || pattern.test(original)) {
      signals.push(signal);
    }
  }
  if (signals.length > 0) {
    const confidence = signals.length >= 2 ? 0.9 : 0.8;
    return { intent: "situation_description", confidence, signals };
  }

  // ── Structural heuristics ─────────────────────────────────────────────────
  const wordCount = t.split(/\s+/).filter((w) => w.length > 1).length;

  if (wordCount >= 8) return { intent: "situation_description", confidence: 0.7, signals: ["length_heuristic"] };
  if (t.includes(".") && wordCount > 5) return { intent: "clarification_answer", confidence: 0.65, signals: ["multi_sentence"] };
  if (wordCount >= 4) return { intent: "situation_description", confidence: 0.5, signals: ["medium_length"] };
  if (wordCount >= 2) return { intent: "situation_description", confidence: 0.4, signals: ["short_ambiguous"] };

  // Single unrecognized word — treat as greeting attempt
  return { intent: "greeting", confidence: 0.4, signals: ["single_word_fallback"] };
}

// ─── NLU: Situation Inference Engine ─────────────────────────────────────────
// Deduces REAL WORLD SITUATIONS from indirect / implicit descriptions

type InferredSituation = {
  type: string;
  label: string;
  confidence: number;
  hypotheses: string[];
  implicitRisks: string[];
  suggestedQuestion: string;
  domain: string;
};

type InferenceRule = {
  test: (t: string, original: string) => boolean;
  infer: () => InferredSituation;
};

const INFERENCE_RULES: InferenceRule[] = [
  // "mon salon est ouvert" / "ma chambre est ouverte" — THE KEY CASE
  {
    test: (t) => /(salon|chambre|salle|pièce|cuisine|bureau|entrée|couloir).{0,20}(est|s'est|reste).{0,15}(ouvert|ouverte)/i.test(t),
    infer: () => ({
      type: "window_or_door_open",
      label: "Ouverture non voulue — vitrage ou porte",
      confidence: 0.85,
      hypotheses: [
        "La vitre ou fenêtre est cassée",
        "La fenêtre ne ferme plus",
        "La porte donne sur l'extérieur et ne se ferme plus",
        "Risque d'intrusion ou d'exposition aux intempéries",
      ],
      implicitRisks: [
        "Sécurité du logement compromise",
        "Exposition au froid ou à la pluie",
        "Risque d'intrusion",
        "Si éclats de verre : risque de blessure",
      ],
      suggestedQuestion: "C'est la vitre qui est cassée, ou la fenêtre qui ne ferme plus ?",
      domain: "logement_sécurité",
    }),
  },

  // "ma fenêtre ne ferme plus / est cassée"
  {
    test: (t) =>
      /fenêtre.{0,20}(cassée?|brisée?|ne ferme|ne s'ouvre|bloquée?|fissurée?)/i.test(t) ||
      /(fenêtre|vitre).{0,10}(ne ferme|ferme plus|bloquée?)/i.test(t),
    infer: () => ({
      type: "broken_window",
      label: "Fenêtre cassée ou qui ne ferme plus",
      confidence: 0.9,
      hypotheses: ["Vitre fissurée ou cassée", "Mécanisme de fermeture défaillant"],
      implicitRisks: ["Sécurité du logement", "Exposition météo", "Éclats de verre possibles"],
      suggestedQuestion: "La vitre est cassée ou c'est juste la fermeture qui ne fonctionne plus ?",
      domain: "logement_technique",
    }),
  },

  // "j'ai un problème avec ma vitre / mon miroir"
  {
    test: (t) =>
      /(problème|souci|truc).{0,20}(vitre|miroir|verre|fenêtre)/i.test(t) ||
      /(vitre|miroir).{0,20}(problème|souci|cassé|brisé|fissuré)/i.test(t),
    infer: () => ({
      type: "glass_issue",
      label: "Problème de vitre ou miroir",
      confidence: 0.85,
      hypotheses: ["Vitre ou miroir cassé", "Fissure potentiellement dangereuse"],
      implicitRisks: ["Éclats de verre si cassé", "Ouverture vers l'extérieur si vitrage"],
      suggestedQuestion: "La vitre est cassée ou c'est un problème de fermeture ?",
      domain: "logement_technique",
    }),
  },

  // Water / flooding
  {
    test: (t) =>
      /(ça coule|eau qui coule|plafond qui coule|fuite d'eau|fuite d['']eau|dégât des eaux|inondé)/i.test(t) ||
      /(eau.{0,10}(partout|plafond|sol|mur)|plafond.{0,10}(eau|humide|mouillé))/i.test(t),
    infer: () => ({
      type: "water_damage",
      label: "Fuite ou dégât des eaux",
      confidence: 0.9,
      hypotheses: ["Fuite active en cours", "Infiltration par plafond ou mur"],
      implicitRisks: ["Court-circuit si eau près d'électricité", "Dégâts matériels progressifs", "Impact sur voisins du dessous"],
      suggestedQuestion: "La fuite est active en ce moment, ou c'est de l'humidité qui s'est installée ?",
      domain: "logement_urgent",
    }),
  },

  // Locked out
  {
    test: (t) =>
      /(je suis|me retrouve|suis resté|coincé|bloqué).{0,15}(dehors|extérieur)/i.test(t) ||
      /(serrure|porte).{0,20}(cassée?|bloquée?|ne s'ouvre|clé cassée)/i.test(t) ||
      /clé.{0,10}(cassée?|bloquée?|perdue?|coincée?)/i.test(t),
    infer: () => ({
      type: "locked_out_or_door",
      label: "Problème de porte ou serrure",
      confidence: 0.9,
      hypotheses: ["Personne bloquée à l'extérieur", "Serrure défaillante", "Clé cassée dans la serrure"],
      implicitRisks: ["Urgence si nuit ou mauvais temps", "Sécurité si porte ne ferme plus"],
      suggestedQuestion: "Vous êtes à l'intérieur ou à l'extérieur en ce moment ?",
      domain: "logement_sécurité",
    }),
  },

  // Job loss
  {
    test: (t) =>
      /(licencié|viré|renvoyé|perdu.{0,10}(emploi|travail|boulot|poste)|rupture conventionnelle)/i.test(t),
    infer: () => ({
      type: "job_loss",
      label: "Perte d'emploi ou licenciement",
      confidence: 0.9,
      hypotheses: ["Licenciement récent", "Rupture conventionnelle", "Fin de contrat inattendue"],
      implicitRisks: ["Délais légaux courts pour contester", "Impact financier immédiat"],
      suggestedQuestion: "C'est un licenciement ou une rupture conventionnelle ?",
      domain: "emploi",
    }),
  },

  // Financial urgency
  {
    test: (t) =>
      /(huissier|saisie|expulsion|coupure.{0,10}(eau|gaz|électricité))/i.test(t) ||
      /loyer.{0,15}(impayé|retard|pas payé)/i.test(t),
    infer: () => ({
      type: "financial_urgency",
      label: "Urgence financière ou procédure",
      confidence: 0.95,
      hypotheses: ["Procédure d'huissier en cours", "Risque d'expulsion", "Coupure imminente"],
      implicitRisks: ["Délais très courts pour agir", "Besoin d'aide juridique urgente"],
      suggestedQuestion: "Il y a une date limite ou une procédure déjà engagée ?",
      domain: "financier",
    }),
  },

  // Medical emergency
  {
    test: (t) =>
      /(douleur (forte|intense|insupportable)|saigne|ne respire|inconscient|accident grave)/i.test(t) ||
      /(besoin.{0,10}ambulance|appeler le 15|urgences)/i.test(t),
    infer: () => ({
      type: "medical_emergency",
      label: "Urgence médicale",
      confidence: 0.95,
      hypotheses: ["Situation médicale nécessitant intervention immédiate"],
      implicitRisks: ["Chaque minute compte"],
      suggestedQuestion: "Vous avez appelé le 15 (SAMU) ou le 18 (pompiers) ?",
      domain: "santé",
    }),
  },

  // Violence / safety
  {
    test: (t) =>
      /(violence|menace|agression|harcèlement|j'ai peur|en danger|il me frappe|elle me frappe)/i.test(t),
    infer: () => ({
      type: "safety_risk",
      label: "Risque pour la sécurité personnelle",
      confidence: 0.95,
      hypotheses: ["Situation de violence ou de menace", "Besoin de protection immédiate"],
      implicitRisks: ["Sécurité physique en jeu", "Besoin de mise en sécurité"],
      suggestedQuestion: "Est-ce que vous êtes en sécurité là maintenant ?",
      domain: "relationnel",
    }),
  },

  // Conflict
  {
    test: (t) =>
      /(conflit|dispute|tension|problème avec).{0,30}(voisin|famille|collègue|employeur|propriétaire|bailleur)/i.test(t),
    infer: () => ({
      type: "interpersonal_conflict",
      label: "Conflit relationnel",
      confidence: 0.85,
      hypotheses: ["Conflit en cours avec une personne de l'entourage ou professionnel"],
      implicitRisks: ["Escalade possible", "Impact sur logement ou emploi si impliqué"],
      suggestedQuestion: "Le conflit a un impact concret sur votre vie en ce moment — logement, travail ?",
      domain: "relationnel",
    }),
  },

  // Generic home problem
  {
    test: (t) =>
      /(problème|souci|truc|soucis).{0,20}(chez moi|à la maison|dans mon|dans ma|au logement)/i.test(t),
    infer: () => ({
      type: "home_issue_generic",
      label: "Problème au logement (non précisé)",
      confidence: 0.7,
      hypotheses: ["Problème technique dans le logement", "Problème avec le propriétaire", "Problème de voisinage"],
      implicitRisks: [],
      suggestedQuestion: "C'est quelque chose qui est cassé ou qui ne fonctionne plus ?",
      domain: "logement",
    }),
  },

  // ── UNIVERSAL DOMAINS ─────────────────────────────────────────────────────

  // Soutien scolaire
  {
    test: (t) =>
      /(soutien scolaire|cours particuliers|aide aux devoirs|tuteur|prof particulier)/i.test(t) ||
      /(aide.{0,15}(mon fils|ma fille|mon enfant|l'enfant).{0,20}(école|scolaire|devoirs|maths|français))/i.test(t) ||
      /(cherche.{0,20}quelqu'un.{0,20}(soutien|aide).{0,20}(scolaire|devoirs))/i.test(t) ||
      /(quelqu'un pour.{0,20}(soutien|aider).{0,20}(mon fils|ma fille|mon enfant))/i.test(t),
    infer: () => ({
      type: "soutien_scolaire",
      label: "Soutien scolaire",
      confidence: 0.9,
      hypotheses: [
        "Enfant en difficulté dans une ou plusieurs matières",
        "Besoin d'un tuteur ou d'aide aux devoirs",
        "Préparation à un examen proche",
      ],
      implicitRisks: ["Décrochage si non traité rapidement", "Contrainte budgétaire non exprimée"],
      suggestedQuestion: "C'est pour quel niveau et quelle matière principalement ?",
      domain: "education",
    }),
  },

  // Orientation scolaire / professionnelle
  {
    test: (t) =>
      /(orientation scolaire|projet professionnel|choisir une filière|choisir un métier|parcoursup|réorientation)/i.test(t) ||
      /(ne sait pas (quoi faire|quel métier|quelle orientation))/i.test(t),
    infer: () => ({
      type: "orientation",
      label: "Orientation scolaire ou professionnelle",
      confidence: 0.85,
      hypotheses: ["Doute sur l'orientation à prendre", "Besoin d'un regard extérieur bienveillant"],
      implicitRisks: ["Décision mal orientée avec impact long terme"],
      suggestedQuestion: "C'est pour vous ou pour votre enfant, et il y a une date limite ?",
      domain: "education",
    }),
  },

  // Aide à une personne âgée
  {
    test: (t) =>
      /(personne âgée|grand.?parent|mamie|papi).{0,30}(seul|aide|accompagn|soin)/i.test(t) ||
      /(aide à domicile|maintien.{0,10}domicile|dépendance)/i.test(t) ||
      /(ma mère|mon père|mes parents).{0,20}(seul|plus autonome|besoin d'aide|âgé)/i.test(t),
    infer: () => ({
      type: "aide_personne_agee",
      label: "Aide à une personne âgée",
      confidence: 0.85,
      hypotheses: ["Personne âgée vivant seule qui a besoin d'aide", "Aidant familial cherchant un relais"],
      implicitRisks: ["Épuisement de l'aidant familial", "Isolement de la personne âgée"],
      suggestedQuestion: "La personne vit seule, et c'est plutôt une aide pratique ou un besoin de présence ?",
      domain: "aide_humaine",
    }),
  },

  // Accompagnement à un rendez-vous / démarche
  {
    test: (t) =>
      /(accompagner|accompagnement).{0,20}(rendez.?vous|tribunal|préfecture|hôpital|médecin|entretien)/i.test(t) ||
      /(besoin de quelqu'un.{0,20}accompagn|n'ose pas y aller seul)/i.test(t),
    infer: () => ({
      type: "accompagnement_demarche",
      label: "Accompagnement à une démarche",
      confidence: 0.85,
      hypotheses: ["Besoin d'une présence pour un rendez-vous important", "Anxiété à y aller seul"],
      implicitRisks: ["Rendez-vous manqué si non accompagné"],
      suggestedQuestion: "C'est pour quel type de rendez-vous, et c'est quand ?",
      domain: "accompagnement",
    }),
  },

  // Soutien moral / détresse émotionnelle
  {
    test: (t) =>
      /(j'en peux plus|à bout|pas bien|déprimé|anxieux|perdu|submergé|seul et (personne|rien))/i.test(t) ||
      /(besoin de parler|parler à quelqu'un|quelqu'un qui écoute)/i.test(t) ||
      /(idées noires|plus envie|en finir|suicide)/i.test(t),
    infer: () => ({
      type: "soutien_emotionnel",
      label: "Besoin de soutien moral ou émotionnel",
      confidence: 0.9,
      hypotheses: ["Détresse émotionnelle ou épuisement", "Isolement et besoin de lien humain"],
      implicitRisks: [
        "Si 'idées noires' ou 'en finir' : risque suicidaire — orienter vers numéro 3114",
        "Crise sous-jacente non exprimée",
      ],
      suggestedQuestion: "Vous cherchez plutôt quelqu'un à qui parler librement, ou une aide concrète pour avancer ?",
      domain: "soutien",
    }),
  },

  // Isolement
  {
    test: (t) =>
      /(je suis seul|trop seul|pas d'amis|pas de réseau|solitude|isolé|personne autour)/i.test(t) ||
      /(rencontrer des gens|lien social|ne voir personne|sortir de chez)/i.test(t),
    infer: () => ({
      type: "isolement",
      label: "Isolement social",
      confidence: 0.8,
      hypotheses: ["Personne isolée cherchant du lien", "Besoin d'activité de groupe ou de présence"],
      implicitRisks: ["Dépression si isolement sévère"],
      suggestedQuestion: "Vous cherchez plutôt à rencontrer des gens, à trouver une activité, ou simplement quelqu'un à qui parler ?",
      domain: "isolement",
    }),
  },

  // Voisinage
  {
    test: (t) =>
      /(conflit|problème|dispute|bruit|nuisance).{0,20}(voisin|immeuble|copropriété)/i.test(t) ||
      /voisin.{0,20}(bruit|nuisance|problème|dispute|conflit)/i.test(t),
    infer: () => ({
      type: "conflit_voisinage",
      label: "Conflit ou problème de voisinage",
      confidence: 0.85,
      hypotheses: ["Nuisances sonores ou comportementales", "Conflit de voisinage non résolu"],
      implicitRisks: ["Escalade possible", "Impact sur le bien-être quotidien"],
      suggestedQuestion: "Vous avez déjà essayé d'en parler directement au voisin ?",
      domain: "voisinage",
    }),
  },

  // Réparation d'objet / appareil
  {
    test: (t) =>
      /(réparer|réparation).{0,20}(lave.?linge|réfrigérateur|frigo|télé|ordinateur|téléphone|vélo|meuble)/i.test(t) ||
      /(lave.?linge|réfrigérateur|frigo|machine à laver).{0,20}(panne|ne marche|cassé|en panne)/i.test(t),
    infer: () => ({
      type: "reparation_objet",
      label: "Réparation d'objet ou d'appareil",
      confidence: 0.85,
      hypotheses: ["Appareil ménager ou objet cassé", "Besoin d'un réparateur compétent et fiable"],
      implicitRisks: ["Urgence si lave-linge ou réfrigérateur (impact quotidien fort)"],
      suggestedQuestion: "C'est quoi l'appareil, et c'est en panne totale ou partielle ?",
      domain: "reparation",
    }),
  },

  // Coordination familiale / aidant
  {
    test: (t) =>
      /(coordonner|organiser|gérer).{0,20}(famille|proche|parent|aidant)/i.test(t) ||
      /(aidant familial|je gère tout seul|tout porte sur moi|personne ne m'aide)/i.test(t),
    infer: () => ({
      type: "coordination_familiale",
      label: "Coordination familiale",
      confidence: 0.8,
      hypotheses: ["Aidant familial épuisé qui gère seul", "Besoin d'organiser l'aide autour d'un proche"],
      implicitRisks: ["Épuisement de l'aidant pouvant mener à rupture"],
      suggestedQuestion: "Vous organisez l'aide pour qui, et il y a d'autres membres de la famille impliqués ?",
      domain: "coordination_familiale",
    }),
  },

  // Mobilité / transport
  {
    test: (t) =>
      /(voiture.{0,15}panne|panne.{0,15}voiture|garage|dépannage auto)/i.test(t) ||
      /(pas de transport|pas de voiture|comment me déplacer|transport adapté)/i.test(t),
    infer: () => ({
      type: "probleme_mobilite",
      label: "Problème de mobilité ou transport",
      confidence: 0.8,
      hypotheses: ["Véhicule en panne", "Manque de transport", "Besoin de mobilité adaptée"],
      implicitRisks: ["Isolement ou rendez-vous manqués si mobilité bloquée"],
      suggestedQuestion: "C'est la voiture en panne ou un besoin de transport régulier ?",
      domain: "mobilite",
    }),
  },

  // Besoin local — trouver quelqu'un
  {
    test: (t) =>
      /(trouver quelqu'un|cherche quelqu'un|je cherche un).{0,20}(de confiance|fiable|sérieux|compétent|près de chez|dans mon quartier)/i.test(t) ||
      /(recommandation|quelqu'un de confiance|proche de chez moi)/i.test(t),
    infer: () => ({
      type: "besoin_local",
      label: "Besoin de trouver quelqu'un de confiance localement",
      confidence: 0.75,
      hypotheses: ["Besoin d'une personne compétente et fiable à proximité"],
      implicitRisks: [],
      suggestedQuestion: "Vous cherchez quelqu'un pour faire quoi exactement ?",
      domain: "besoins_locaux",
    }),
  },
];

function inferSituation(rawInput: string): InferredSituation | null {
  const normalized = normalizeText(rawInput);
  const t = normalized.toLowerCase();
  const original = rawInput.toLowerCase();

  for (const rule of INFERENCE_RULES) {
    if (rule.test(t, original)) {
      return rule.infer();
    }
  }
  return null;
}

// ─── Intelligent Fallback — NEVER returns "Je ne suis pas sûr d'avoir compris" ──

function buildIntelligentFallback(rawInput: string, prevCoordReplies: string[]): string {
  const t = rawInput.toLowerCase();
  const normalized = normalizeText(rawInput).toLowerCase();

  // Try inference first
  const inference = inferSituation(rawInput);
  if (inference && inference.confidence >= 0.7) {
    return inference.suggestedQuestion;
  }

  // Location context clue
  if (/(chez moi|logement|appartement|maison|pièce|salon|chambre|cuisine|salle de bain)/.test(t)) {
    return "C'est quelque chose qui est cassé, ou un problème différent ?";
  }

  // Object reference without context
  if (/(ça|ca|il|elle|c'est|c est)/.test(t) && t.split(" ").length < 6) {
    return "Vous pouvez me dire c'est quoi exactement — un objet, une situation, un problème ?";
  }

  // Has "problème" but vague
  if (/(problème|souci|pb|truc)/.test(normalized) && t.split(" ").length < 8) {
    return "C'est un problème technique, administratif, ou autre chose ?";
  }

  // Someone else implied
  if (/(ma mère|mon père|ma femme|mon mari|mon fils|ma fille|mon enfant|quelqu'un)/.test(t)) {
    return "La personne est avec vous en ce moment, ou vous cherchez à l'aider à distance ?";
  }

  // Time reference
  if (/(ce matin|hier|depuis|ça fait|il y a)/.test(t)) {
    return "Qu'est-ce qui s'est passé ?";
  }

  const prevCount = prevCoordReplies.length;
  if (prevCount === 0) return "Dites-moi ce qui se passe.";
  if (prevCount === 1) return "Je veux m'assurer de bien comprendre — c'est une situation chez vous, au travail, ou autre chose ?";
  return "Pouvez-vous me dire en quelques mots ce que vous cherchez à régler ?";
}

// ─── Confidence from turns ────────────────────────────────────────────────────

function computeSituationConfidence(turns: Turn[]): number {
  const situationTurns = turns.filter((t) => t.role === "user").filter((t) => {
    const { intent } = detectIntent(t.content);
    return intent === "situation_description" || intent === "clarification_answer";
  });

  if (situationTurns.length === 0) return 0;
  if (situationTurns.length === 1) {
    return situationTurns[0].content.trim().length > 60 ? 0.5 : 0.3;
  }
  if (situationTurns.length === 2) return 0.65;
  return Math.min(0.5 + situationTurns.length * 0.15, 0.95);
}

// ─── Domain knowledge — inline ────────────────────────────────────────────────

const DOMAIN_KNOWLEDGE: Array<{
  id: string;
  label: string;
  keywords: string[];
  questions: string[];
  risks: string[];
  resources: string[];
}> = [
  {
    id: "miroir_vitrage", label: "Miroir ou vitrage cassé",
    keywords: ["miroir", "vitre", "verre", "fenêtre", "brisé", "cassé", "fissure", "éclat"],
    questions: ["Le miroir est cassé ou c'est un problème de fixation ?", "Il y a des éclats de verre par terre ?", "Il y a un risque qu'il tombe ?"],
    risks: ["Blessure par éclats de verre", "Chute si fixation instable"],
    resources: ["vitrier", "miroitier", "propriétaire"],
  },
  {
    id: "fuite_eau", label: "Fuite d'eau",
    keywords: ["fuite", "eau", "coule", "infiltration", "humidité", "dégât", "plomberie", "robinet"],
    questions: ["La fuite est active en ce moment ?", "Vous avez pu couper l'eau ?", "Il y a de l'eau qui touche des prises électriques ?"],
    risks: ["Court-circuit électrique", "Dégât des eaux en progression"],
    resources: ["plombier d'urgence", "propriétaire", "assurance"],
  },
  {
    id: "serrure_porte", label: "Serrure ou problème de porte",
    keywords: ["serrure", "porte", "clé", "fermé", "bloqué", "enfermé", "verrouillé"],
    questions: ["Vous êtes à l'intérieur ou à l'extérieur en ce moment ?", "C'est la serrure qui est cassée ou vous avez perdu la clé ?"],
    risks: ["Personne enfermée", "Sécurité du logement compromise"],
    resources: ["serrurier d'urgence", "propriétaire"],
  },
];

function findKnowledgeNode(text: string) {
  const t = text.toLowerCase();
  let best: (typeof DOMAIN_KNOWLEDGE)[0] | null = null;
  let bestScore = 0;
  for (const node of DOMAIN_KNOWLEDGE) {
    const score = node.keywords.filter((kw) => t.includes(kw)).length;
    if (score > bestScore) { bestScore = score; best = node; }
  }
  return bestScore > 0 ? best : null;
}

// ─── Social replies ───────────────────────────────────────────────────────────

function socialReply(intent: Intent, lastMessage: string, turns: Turn[], inference: InferredSituation | null): string {
  const t = lastMessage.toLowerCase();
  const prevCoordReplies = turns.filter((r) => r.role === "coordinator").map((r) => r.content);
  const alreadyInvited = prevCoordReplies.some((r) =>
    r.includes("ce qui se passe") || r.includes("ce qui vous amène") || r.includes("je vous écoute")
  );

  switch (intent) {
    case "greeting": {
      if (alreadyInvited) return pick(["Oui, je vous écoute.", "Je suis là. Continuez.", "Allez-y."]);
      return pick([
        "Bonjour. Je suis le coordinateur RENOVEC. Mon rôle : comprendre ce qui se passe et vous orienter vers la bonne suite. Qu'est-ce qui vous amène ?",
        "Bonjour. Je coordonne les situations pour trouver les bonnes personnes ou ressources. Dites-moi ce qui se passe.",
        "Bonjour. Je suis là pour comprendre votre situation et organiser la suite. Qu'est-ce qui vous amène aujourd'hui ?",
      ]);
    }

    case "affirmation": {
      return alreadyInvited
        ? "D'accord. Continuez."
        : "Très bien. Dites-moi ce qui se passe.";
    }

    case "negation": {
      return pick([
        "D'accord. Qu'est-ce qui est différent de ce que j'ai compris ?",
        "Ok. Reformulez si vous le souhaitez — je vous écoute.",
      ]);
    }

    case "emotional_expression": {
      return pick([
        "Je vous entends. Expliquez-moi ce qui se passe.",
        "D'accord. Dites-moi la situation concrète — qu'est-ce qui s'est passé ?",
      ]);
    }

    case "social_correction": {
      if (/(répond|repon|réponds|repond).{0,15}(côté|cote|mal|faux)|c['']est pas ce que|pas ma question/.test(t)) {
        return pick([
          "Vous avez raison, je n'ai pas répondu à votre question. Reformulez-la, je vous écoute.",
          "Pardonnez-moi. Posez votre question à nouveau — je vais y répondre directement.",
        ]);
      }
      if (/ça va|ca va|bien|super|nickel/.test(t)) {
        return alreadyInvited
          ? "D'accord. Quand vous êtes prêt, expliquez-moi ce qui vous amène."
          : "Très bien. Mon rôle est de comprendre votre situation pour vous orienter. Quand vous voulez.";
      }
      return pick([
        "D'accord. On prend le temps qu'il faut.",
        "Pas de problème. Dites-moi quand vous êtes prêt.",
      ]);
    }

    case "confusion": {
      if (/de quoi tu|de quoi vous/.test(t)) {
        return "Je ne sais pas encore ce qui vous amène ici. Décrivez-moi simplement la situation.";
      }
      return pick([
        "Pardon, je n'étais pas clair. Racontez-moi simplement ce qui se passe.",
        "Oubliez ma dernière réponse. Décrivez-moi la situation à votre façon.",
        "Je vais faire plus simple. Expliquez-moi la situation comme vous la vivez.",
      ]);
    }

    case "robot_question": {
      if (/(comment|c['']est quoi) (ton|votre) (nom|prénom|appel)/.test(t) || /t['']appel/.test(t)) {
        return "Je n'ai pas de nom. Je suis le coordinateur RENOVEC — je comprends les situations et j'oriente vers les bonnes personnes ou ressources.";
      }
      if (/(qu['']est.?ce que tu fais|que fais.?tu|tu fais quoi|vous faites quoi)/.test(t)) {
        return "Mon rôle est de comprendre ce qui se passe pour vous aider à avancer vers la bonne aide ou les bonnes personnes. Pas de formulaire — on échange directement.";
      }
      return pick([
        "Je suis le coordinateur RENOVEC. Mon rôle : écouter, comprendre votre situation, puis vous orienter vers ce qui a du sens.",
        "Un système de coordination — ni vraiment robot, ni vraiment humain. L'objectif est de comprendre ce qui se passe et de trouver la bonne suite avec vous.",
      ]);
    }

    case "system_question": {
      if (/payant|gratuit|prix|coût/.test(t)) return "L'accès est gratuit. RENOVEC ne vend rien et ne prend aucune commission.";
      if (/comme.{0,20}(allovoisins|allo voisins|voisinage|entraide voisin)/i.test(t)) {
        return "Non. AlloVoisins est une plateforme de services entre voisins. RENOVEC est différent : c'est un OS de coordination qui peut gérer n'importe quelle situation — logement, emploi, santé, démarches, accompagnement. Et il peut mobiliser aussi bien des individus que des associations ou des entreprises.";
      }
      if (/(entreprise|société|boîte|organisation|asso|association).{0,20}(peut rejoindre|peut s'inscrire|peut participer|peut aider)/i.test(t)) {
        return "Oui, tout à fait. RENOVEC coordonne des individus, des professionnels, des associations et des entreprises. Une entreprise peut s'inscrire et proposer ses capacités comme n'importe quel autre acteur du réseau.";
      }
      if (/c'est quoi renovec|keski renovec|qu'est-ce que renovec/i.test(t)) {
        return "RENOVEC est un OS de coordination humaine. Concrètement : quand quelqu'un a une situation à résoudre, RENOVEC comprend ce qui se passe, puis oriente vers les bonnes personnes ou ressources — individus, pros, associations, entreprises. Rien à remplir, on échange directement.";
      }
      return pick([
        "RENOVEC est un OS de coordination humaine. On comprend ce qui se passe — sans formulaire — et on oriente vers les bonnes personnes ou ressources, qu'elles soient locales ou à distance.",
        "Le principe : éviter les cases à cocher. On comprend réellement la situation avant d'orienter, vers des individus, des associations ou des entreprises selon le besoin.",
        "On reçoit des situations — pas des tickets. On comprend, on organise, on oriente. RENOVEC peut mobiliser des individus, des pros, des asso ou des entreprises.",
      ]);
    }

    case "doubt":
      return pick([
        "C'est une question légitime. Expliquez ce qui se passe — sans engagement, juste pour voir si on peut vous aider.",
        "Pas d'obligation. Décrivez la situation, on verra ensemble si RENOVEC est utile.",
      ]);

    default: {
      // Use inference if available — never say "je ne suis pas sûr d'avoir compris"
      if (inference && inference.confidence >= 0.7) {
        return inference.suggestedQuestion;
      }
      return buildIntelligentFallback(lastMessage, prevCoordReplies);
    }
  }
}

function situationQuestion(rawText: string, turns: Turn[], inference: InferredSituation | null): string {
  // Use knowledge-based question if inference is strong
  if (inference && inference.confidence >= 0.75) {
    return inference.suggestedQuestion;
  }

  const t = rawText.toLowerCase();
  const prevCoordQuestions = turns.filter((t) => t.role === "coordinator").map((t) => t.content.toLowerCase());

  // Use domain knowledge node questions
  const node = findKnowledgeNode(rawText);
  if (node) {
    const unasked = node.questions.filter((q) => {
      const start = q.toLowerCase().slice(0, 25);
      return !prevCoordQuestions.some((a) => a.includes(start));
    });
    if (unasked.length > 0) return unasked[0];
  }

  const alreadyAskedDuration = prevCoordQuestions.some((q) => q.includes("combien de temps") || q.includes("depuis quand"));
  const alreadyAskedPresence = prevCoordQuestions.some((q) => q.includes("sur place") || q.includes("quelqu'un"));

  const fallbacks = [
    !alreadyAskedDuration ? "Depuis quand ça dure ?" : null,
    !alreadyAskedPresence ? "Quelqu'un est déjà au courant de la situation ?" : null,
    "Il y a une contrainte de temps sur cette situation ?",
    "C'est quoi l'élément le plus urgent là maintenant ?",
  ].filter(Boolean) as string[];

  const coordCount = turns.filter((t) => t.role === "coordinator").length;
  return fallbacks[Math.min(coordCount, fallbacks.length - 1)] || "Qu'est-ce qui est le plus urgent là ?";
}

function pick(opts: string[]): string {
  return opts[Math.floor(Math.random() * opts.length)];
}

// ─── Build full response ──────────────────────────────────────────────────────

function buildFullResponse(
  intent: Intent,
  reply: string,
  confidence: number,
  canProgress: boolean,
  turns: Turn[],
  rawText: string,
  isFinal: boolean,
  coordinatorContext: CoordinatorContextInput,
  inference: InferredSituation | null
): FullCoordinatorResponse {
  const t = rawText.toLowerCase();

  // Risk detection from inference + patterns
  const hasCriticalRisk = inference?.implicitRisks?.length
    ? /(blessure|urgence|danger|électricité|expulsion|violence)/.test(inference.implicitRisks.join(" "))
    : false;
  const urgencyPattern = /(urgent|immédiat|vite|maintenant|critique|danger)/i.test(t);
  const urgency = hasCriticalRisk || inference?.type === "medical_emergency" || inference?.type === "safety_risk"
    ? "critical"
    : urgencyPattern || inference?.type === "financial_urgency" || inference?.type === "locked_out_or_door"
    ? "high"
    : "normal";

  const situationTurns = turns.filter((t) => t.role === "user").filter((t) => {
    const { intent: i } = detectIntent(t.content);
    return i === "situation_description" || i === "clarification_answer";
  });

  const category = inferCategory(rawText, inference);

  const actions: FullCoordinatorResponse["actions"] = [];
  if (canProgress && !isFinal) {
    actions.push({ type: "ask_question", payload: { question: situationQuestion(rawText, turns, inference) } });
  }
  if (isFinal && confidence >= 0.6) {
    actions.push({ type: "update_situation", payload: { category, urgency, summary: situationTurns.map((t) => t.content).join(" / ") } });
  }
  if (urgency === "critical" || urgency === "high") {
    actions.push({ type: urgency === "critical" ? "escalate_human" : "show_responses", payload: { urgency } });
  }
  if (!actions.length) actions.push({ type: "no_action", payload: {} });

  const needsHumanReview = urgency === "critical" || (urgency === "high" && confidence >= 0.5);
  const vigPoints = [...(coordinatorContext.existingVigilancePoints || [])];
  if (inference?.implicitRisks?.length) vigPoints.push(...inference.implicitRisks.slice(0, 2));

  const factsToStore: string[] = [];
  if (inference) factsToStore.push(`domaine inféré : ${inference.label}`);
  if (/locataire/.test(t)) factsToStore.push("utilisateur est locataire");
  if (/propriétaire/.test(t)) factsToStore.push("utilisateur est propriétaire");

  return {
    intent,
    reply,
    canProgressSituation: canProgress,
    shouldAskClarification: canProgress && !isFinal,
    nextQuestion: canProgress && !isFinal ? situationQuestion(rawText, turns, inference) : null,
    situationConfidence: confidence,
    situationUpdate: {
      summary: isFinal && confidence >= 0.6 ? situationTurns.map((t) => t.content).join(" / ") : "",
      category,
      urgency,
      missingInfo: confidence < 0.6 ? ["description concrète de la situation"] : [],
      emotionalState: /épuisé|désespéré|peur|inquiet|angoissé|perdu/.test(t) ? "distressed" : "neutral",
      stage: isFinal ? "ready_to_match" : confidence >= 0.4 ? "clarifying" : "initial",
    },
    actions,
    ui: {
      tone: urgency === "critical" ? "urgent" : urgency === "high" ? "direct" : "exploratory",
      density: urgency === "critical" ? "minimal" : "normal",
      showTimeline: isFinal || confidence >= 0.6,
      highlightNextStep: canProgress && !isFinal,
    },
    trust: {
      riskLevel: urgency === "critical" ? "critical" : urgency === "high" ? "high" : "low",
      needsHumanReview,
      reason: needsHumanReview ? `Urgence ${urgency} — présence humaine recommandée` : "Situation en cours de clarification",
    },
    memory: {
      factsToStore,
      contextToKeep: inference ? [`domaine : ${inference.label}`, `domaine : ${inference.domain}`] : [],
      doNotForget: vigPoints.slice(0, 3),
    },
    message: reply,
    is_final: isFinal && confidence >= 0.6,
    urgency_level: urgency,
    reformulated_objective: isFinal && confidence >= 0.6 ? `Clarifier la situation ${category} et orienter vers la bonne aide` : "",
    context_description: isFinal && confidence >= 0.6 ? "Éléments essentiels recueillis." : confidence > 0 ? "Situation en cours de compréhension." : "",
    recommended_format: isFinal && confidence >= 0.6 ? inferFormat(category) : "",
    vigilance_points: vigPoints,
  };
}

function inferCategory(text: string, inference: InferredSituation | null): string {
  if (inference) {
    const domainMap: Record<string, string> = {
      "logement_technique": "technique",
      "logement_sécurité": "technique",
      "logement_urgent": "urgence",
      "logement": "technique",
      "emploi": "professionnel",
      "financier": "financier",
      "santé": "urgence",
      "relationnel": "relationnel",
      "administratif": "administratif",
      "education": "éducation",
      "aide_humaine": "aide humaine",
      "sante_legere": "santé",
      "mobilite": "mobilité",
      "voisinage": "voisinage",
      "reparation": "réparation",
      "accompagnement": "accompagnement",
      "soutien": "soutien",
      "urgence_quotidien": "urgence",
      "coordination_familiale": "coordination",
      "isolement": "lien social",
      "besoins_locaux": "besoins locaux",
    };
    return domainMap[inference.domain] || inference.domain || "inconnu";
  }
  const t = text.toLowerCase();
  if (/soutien scolaire|cours particuliers|aide aux devoirs|tuteur/.test(t)) return "éducation";
  if (/aide à domicile|dépendance|aidant|personne âgée/.test(t)) return "aide humaine";
  if (/accompagner|accompagnement/.test(t)) return "accompagnement";
  if (/isolé|solitude|lien social/.test(t)) return "lien social";
  if (/voisin|nuisance/.test(t)) return "voisinage";
  if (/réparer|réparation/.test(t)) return "réparation";
  if (/fuite|eau|panne|serrure|porte|miroir|vitre|vitrage|cassé/.test(t)) return "technique";
  if (/emploi|poste|carrière|démission|licencié/.test(t)) return "professionnel";
  if (/urgent|immédiat|accident|blessé|malade/.test(t)) return "urgence";
  if (/conflit|tension|voisin|couple/.test(t)) return "relationnel";
  if (/loyer|argent|dette|crédit/.test(t)) return "financier";
  if (/papier|document|formulaire|caf|préfecture/.test(t)) return "administratif";
  return "inconnu";
}

function inferFormat(category: string): string {
  switch (category) {
    case "urgence": return "Mission courte";
    case "technique": return "Diagnostic écrit";
    case "financier":
    case "décision":
    case "professionnel":
    case "relationnel": return "Échange oral";
    default: return "Échange oral";
  }
}

// ─── System prompt builder with NLU injection ─────────────────────────────────

function buildSystemPrompt(
  rawText: string,
  turns: Turn[],
  coordinatorContext: CoordinatorContextInput,
  inference: InferredSituation | null,
  intentResult: { intent: Intent; confidence: number; signals: string[] }
): string {
  const knowledge = findKnowledgeNode(rawText);

  const memBlock = coordinatorContext.memoryContext
    ? `━━━ MÉMOIRE UTILISATEUR ━━━\n${coordinatorContext.memoryContext}\n━━━ FIN MÉMOIRE ━━━\n\n`
    : "";

  const adaptBlock = coordinatorContext.adaptationHints
    ? `━━━ ADAPTATION ━━━\n${coordinatorContext.adaptationHints}\n━━━ FIN ADAPTATION ━━━\n\n`
    : "";

  // NLU analysis block
  const nluLines: string[] = [
    "━━━ ANALYSE NLU ━━━",
    `INTENT DÉTECTÉ : ${intentResult.intent} (confiance: ${Math.round(intentResult.confidence * 100)}%)`,
    `SIGNAUX : ${intentResult.signals.join(", ")}`,
  ];

  if (inference) {
    nluLines.push(`SITUATION INFÉRÉE : ${inference.label} (confiance: ${Math.round(inference.confidence * 100)}%)`);
    nluLines.push(`HYPOTHÈSES RÉELLES : ${inference.hypotheses.slice(0, 3).join(" | ")}`);
    if (inference.implicitRisks.length > 0) {
      nluLines.push(`RISQUES IMPLICITES : ${inference.implicitRisks.join(" / ")}`);
    }
    nluLines.push(`QUESTION INTELLIGENTE SUGGÉRÉE : "${inference.suggestedQuestion}"`);
  } else {
    nluLines.push("SITUATION INFÉRÉE : non encore identifiable — message trop vague ou social");
  }

  if (knowledge) {
    nluLines.push(`CONNAISSANCE DOMAINE : ${knowledge.label}`);
    nluLines.push(`QUESTIONS CONNUES : ${knowledge.questions.slice(0, 2).join(" | ")}`);
    if (knowledge.risks.length > 0) nluLines.push(`RISQUES CONNUS : ${knowledge.risks.join(" / ")}`);
  }

  if (coordinatorContext.situationSummary) {
    nluLines.push(`CONTEXTE EN COURS : ${coordinatorContext.situationSummary}`);
  }
  if (coordinatorContext.existingVigilancePoints?.length) {
    nluLines.push(`VIGILANCE EXISTANTE : ${coordinatorContext.existingVigilancePoints.join(" / ")}`);
  }

  // Directives based on NLU
  nluLines.push("");
  nluLines.push("DIRECTIVES OBLIGATOIRES :");

  if (inference && inference.confidence >= 0.75) {
    nluLines.push(`- Utilise la question suggérée : "${inference.suggestedQuestion}"`);
    if (inference.implicitRisks.length > 0) {
      nluLines.push(`- Si risques détectés, mentionne-les AVANT de poser une question`);
    }
  } else if (intentResult.intent === "situation_description" && intentResult.confidence < 0.6) {
    nluLines.push(`- Message ambigu mais probablement situationnel — utilise le fallback intelligent`);
  }

  nluLines.push("- Ton sobre et direct");
  nluLines.push("- INTERDIT : 'Je ne suis pas sûr d'avoir compris', 'Prenez le temps', 'Je suis là pour vous'");
  nluLines.push("- INTERDIT : poser une question psychologique ('comment vous sentez-vous ?')");
  nluLines.push("- Poser UNE SEULE question concrète sur la situation réelle");
  nluLines.push("━━━ FIN ANALYSE NLU ━━━");

  const nluBlock = nluLines.join("\n");

  return `Tu es le coordinateur RENOVEC.

━━━ IDENTITÉ ━━━
Présence de coordination universelle. Calme. Concrète. Professionnelle.
Pas un chatbot. Pas un coach. Pas un thérapeute. Pas un formulaire. Pas un assistant spécialisé.
Tu n'es pas une IA généraliste. Tu es le coordinateur d'un réseau humain réel.

━━━ CE QU'EST RENOVEC — RÉPONSES OBLIGATOIRES ━━━

Si l'utilisateur demande "c'est quoi RENOVEC" ou "comment ça marche" :
→ Réponds exactement : "RENOVEC est un OS de coordination humaine — pas une marketplace, pas un réseau social, pas un chatbot. Quand vous avez une situation à résoudre, je comprends ce qui se passe et j'oriente vers les bonnes personnes ou ressources : individus, professionnels, associations ou entreprises. Qu'est-ce qui vous amène ?"

Si l'utilisateur dit "c'est comme AlloVoisins" ou compare à un service de voisinage :
→ Réponds exactement : "Non, RENOVEC est différent. AlloVoisins connecte des voisins pour des services ponctuels. RENOVEC est un OS de coordination qui traite n'importe quelle situation humaine — logement, emploi, santé, démarches, accompagnement — et peut mobiliser des individus, des associations ou des entreprises, localement ou à distance."

Si l'utilisateur demande si une entreprise peut rejoindre :
→ Réponds exactement : "Oui. RENOVEC peut relayer des individus, des professionnels, des associations et des entreprises. Le critère n'est pas le statut juridique, c'est la capacité à apporter quelque chose d'utile à une situation réelle."

Si l'utilisateur demande si c'est payant :
→ Réponds exactement : "L'accès est gratuit. RENOVEC ne vend rien et ne prend aucune commission."

━━━ CE QUE RENOVEC COORDONNE ━━━
TOUTES les situations humaines, sans exception :
- Habitat, logement, réparation, urgences techniques
- Éducation, soutien scolaire, orientation
- Aide humaine, accompagnement, personnes âgées, handicap
- Santé (non urgence vitale), bien-être
- Administratif, démarches, droits sociaux
- Voisinage, conflits de proximité
- Mobilité, transport
- Soutien moral, isolement, lien social
- Coordination familiale, aidants
- Emploi, reconversions, transitions professionnelles
- Besoins locaux : trouver quelqu'un de confiance, fiable, compétent

ACTEURS DU RÉSEAU : individus, professionnels, associations, entreprises.
LOCAL ET À DISTANCE : une situation locale peut être coordonnée à distance, et inversement.

JAMAIS rejeter une situation. JAMAIS dire "hors périmètre". JAMAIS orienter ailleurs sans comprendre d'abord.

━━━ MISSION ━━━
Comprendre des situations humaines réelles dans un langage humain réel.
Accueillir. Comprendre. Explorer. Orienter progressivement.
Comprendre d'abord, orienter ensuite. Jamais l'inverse.

━━━ RÈGLE FONDAMENTALE — ACCEPTATION UNIVERSELLE ━━━
Toute situation est accueillie. Si la situation semble hors cadre :
"Oui, ça peut entrer dans une logique de coordination RENOVEC. Le besoin semble surtout être de trouver [description]. Vous cherchez [question concrète] ?"

━━━ RÈGLES ABSOLUES ━━━
1. Si l'utilisateur pose une question sur RENOVEC ou sur toi : réponds D'ABORD à cette question, AVANT de relancer.
2. Ne jamais finaliser (is_final: true) sans situationConfidence >= 0.6.
3. RAISONNE avant de répondre. Le bloc NLU ci-dessous contient l'analyse. Utilise-la.
4. JAMAIS : "Je ne suis pas sûr d'avoir compris", "Prenez le temps qu'il vous faut", "Je suis là pour vous", "hors périmètre".
5. JAMAIS répéter deux fois la même phrase dans une conversation.
6. Si le message est ambigu — pose une question intelligente basée sur l'inférence, pas une question générique.
7. Réponses en 1-2 phrases max. Ton sobre, direct, humain. Ni froid ni chaleureux excessif.

━━━ INTERDITS DE STYLE ━━━
"Super !", "Bien sûr !", "Avec plaisir !", "Je comprends tout à fait", "Merci pour ces précisions" → INTERDIT
Jargon IA, marketing, phrases vagues → INTERDIT
"Ce n'est pas notre domaine", "Nous ne couvrons pas", "hors périmètre" → INTERDIT ABSOLU
Comparaisons inexactes : "comme AlloVoisins", "comme une marketplace", "comme un assistant" → INTERDIT

${memBlock}${adaptBlock}${nluBlock}

━━━ FORMAT DE RÉPONSE ━━━
JSON uniquement. Aucun texte avant ou après.
{
  "intent": "...",
  "reply": "1-2 phrases, ton naturel, sobre, en français",
  "canProgressSituation": false,
  "shouldAskClarification": false,
  "nextQuestion": null,
  "situationConfidence": 0.0,
  "situationUpdate": {
    "summary": "",
    "category": "inconnu",
    "urgency": "normal",
    "missingInfo": [],
    "emotionalState": "neutral",
    "stage": "initial"
  },
  "actions": [{"type": "no_action", "payload": {}}],
  "ui": {"tone": "exploratory", "density": "normal", "showTimeline": false, "highlightNextStep": false},
  "trust": {"riskLevel": "low", "needsHumanReview": false, "reason": ""},
  "memory": {"factsToStore": [], "contextToKeep": [], "doNotForget": []},
  "is_final": false,
  "urgency_level": "normal",
  "reformulated_objective": "",
  "context_description": "",
  "recommended_format": "",
  "vigilance_points": []
}`;
}

// ─── Deterministic fallback ───────────────────────────────────────────────────

function deterministicReply(
  rawText: string,
  turns: Turn[],
  confidence: number,
  coordinatorContext: CoordinatorContextInput
): FullCoordinatorResponse {
  const intentResult = detectIntent(rawText);
  const { intent } = intentResult;
  const inference = inferSituation(rawText);
  const isSituational = intent === "situation_description" || intent === "clarification_answer" || (inference?.confidence ?? 0) >= 0.7;
  const prevCoordReplies = turns.filter((t) => t.role === "coordinator").map((t) => t.content);

  if (!isSituational) {
    const reply = socialReply(intent, rawText, turns, inference);
    return buildFullResponse(intent, reply, confidence, false, turns, rawText, false, coordinatorContext, inference);
  }

  const userTurns = turns.filter((t) => t.role === "user");
  const canFinalize = confidence >= 0.6 && userTurns.length >= 3;

  if (canFinalize) {
    const reply = pick([
      "D'accord, j'ai une bonne image de la situation. On peut avancer.",
      "Je pense avoir compris l'essentiel. On va pouvoir chercher les bonnes personnes.",
    ]);
    return buildFullResponse(intent, reply, confidence, true, turns, rawText, true, coordinatorContext, inference);
  }

  // Use inference or intelligent fallback — NEVER "je ne suis pas sûr"
  const reply = inference?.suggestedQuestion || buildIntelligentFallback(rawText, prevCoordReplies);
  return buildFullResponse(intent, reply, confidence, true, turns, rawText, false, coordinatorContext, inference);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json() as {
      rawText: string;
      turns: Turn[];
      coordinatorContext?: CoordinatorContextInput;
    };

    const { rawText, turns } = body;
    const coordinatorContext: CoordinatorContextInput = body.coordinatorContext || {};

    if (!rawText) {
      return new Response(JSON.stringify({ error: "rawText is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const confidence = computeSituationConfidence(turns);
    const intentResult = detectIntent(rawText);
    const inference = inferSituation(rawText);

    const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicKey) {
      return new Response(
        JSON.stringify(deterministicReply(rawText, turns, confidence, coordinatorContext)),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const anthropic = new Anthropic({ apiKey: anthropicKey });

    const systemPrompt = buildSystemPrompt(rawText, turns, coordinatorContext, inference, intentResult);

    const conversationHistory: Array<{ role: "user" | "assistant"; content: string }> = turns.map((t) => ({
      role: t.role === "coordinator" ? "assistant" : "user",
      content: t.content,
    }));

    const contextNote = confidence < 0.3
      ? `\n\n[ÉTAT: Aucune situation concrète. situationConfidence=${confidence.toFixed(2)}. NE PAS mettre is_final:true.]`
      : confidence >= 0.6
      ? `\n\n[ÉTAT: Situation suffisamment décrite. situationConfidence=${confidence.toFixed(2)}. Tu peux finaliser si c'est le bon moment.]`
      : `\n\n[ÉTAT: Situation partielle. situationConfidence=${confidence.toFixed(2)}. Continue à clarifier avec UNE seule question concrète.]`;

    const messages = conversationHistory.length > 0
      ? conversationHistory.map((m, i) =>
          i === conversationHistory.length - 1 && m.role === "user"
            ? { ...m, content: m.content + contextNote }
            : m
        )
      : [{ role: "user" as const, content: rawText + contextNote }];

    let rawJson = "{}";
    try {
      const aiRes = await anthropic.messages.create({
        model: "claude-opus-4-7",
        max_tokens: 1200,
        system: systemPrompt,
        messages,
      });
      const firstBlock = aiRes.content[0];
      rawJson = firstBlock?.type === "text" ? firstBlock.text : "{}";
    } catch {
      return new Response(
        JSON.stringify(deterministicReply(rawText, turns, confidence, coordinatorContext)),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    rawJson = rawJson.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawJson);
    } catch {
      return new Response(
        JSON.stringify(deterministicReply(rawText, turns, confidence, coordinatorContext)),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Integrity guards ────────────────────────────────────────────────────
    let aiIntent = (parsed.intent as Intent) || "unknown";
    const aiConfidence = typeof parsed.situationConfidence === "number" ? parsed.situationConfidence : confidence;
    const finalConfidence = Math.max(confidence, aiConfidence);

    // Trust local NLU over AI "unknown"
    if (aiIntent === "unknown" || aiIntent === "clarification_answer") {
      if (intentResult.intent !== "unknown") aiIntent = intentResult.intent;
    }

    const isSocialIntent = !["situation_description", "clarification_answer"].includes(aiIntent);
    const isFinal = parsed.is_final === true && finalConfidence >= 0.6 && !isSocialIntent;
    const canProgress = !isSocialIntent && finalConfidence > 0.1;

    // Reject generic fallback phrases from Claude
    const BANNED_PHRASES = [
      "je ne suis pas sûr d'avoir compris",
      "je suis là. prenez le temps",
      "prenez le temps qu'il vous faut",
      "je suis là pour vous",
      "dites-moi ce qui se passe",
      "j'ai du mal à comprendre",
    ];
    const aiReplyRaw = (parsed.reply as string) || "";
    const isBannedReply = BANNED_PHRASES.some((f) => aiReplyRaw.toLowerCase().includes(f));

    const reply = aiReplyRaw && !isBannedReply
      ? aiReplyRaw
      : isSocialIntent
        ? socialReply(aiIntent, rawText, turns, inference)
        : inference?.suggestedQuestion || buildIntelligentFallback(rawText, turns.filter((t) => t.role === "coordinator").map((t) => t.content));

    const baseResponse = buildFullResponse(aiIntent, reply, finalConfidence, canProgress, turns, rawText, isFinal, coordinatorContext, inference);

    // Merge AI-provided structured fields where present and valid
    const finalResponse: FullCoordinatorResponse = {
      ...baseResponse,
      actions: (parsed.actions as FullCoordinatorResponse["actions"]) || baseResponse.actions,
      ui: (parsed.ui as FullCoordinatorResponse["ui"]) || baseResponse.ui,
      trust: (parsed.trust as FullCoordinatorResponse["trust"]) || baseResponse.trust,
      memory: (parsed.memory as FullCoordinatorResponse["memory"]) || baseResponse.memory,
      vigilance_points: (parsed.vigilance_points as string[]) || baseResponse.vigilance_points,
      urgency_level: (parsed.urgency_level as string) || baseResponse.urgency_level,
      reformulated_objective: (parsed.reformulated_objective as string) || baseResponse.reformulated_objective,
    };

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
