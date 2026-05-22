// ══════════════════════════════════════════════════════════════════════════════
// RENOVEC Guardrail — Mock examples
// Real cases of non-conforming outputs and their corrected versions.
// ══════════════════════════════════════════════════════════════════════════════

import type { EvaluationContext } from './types';

// ── Test contexts ─────────────────────────────────────────────────────────────

export const VISITOR_FIRST_CONTACT: EvaluationContext = {
  userMode: 'visitor',
  intent: 'need',
  turnCount: 1,
  conversationHistory: [
    { role: 'assistant', content: 'Bonjour. Je suis Ali, l\'assistant virtuel de Renovec. Parlez-moi de votre situation.', timestamp: Date.now() - 5000 },
    { role: 'user', content: 'J\'ai besoin de quelqu\'un pour m\'aider avec ma comptabilité', timestamp: Date.now() },
  ],
  urgencyLevel: 0.2,
};

export const VISITOR_URGENT: EvaluationContext = {
  userMode: 'visitor',
  intent: 'urgency',
  turnCount: 1,
  conversationHistory: [
    { role: 'user', content: 'Ma chaudière vient de lâcher, il fait -5 dehors, j\'ai un bébé', timestamp: Date.now() },
  ],
  urgencyLevel: 0.9,
};

export const VISITOR_DISCOVERY: EvaluationContext = {
  userMode: 'visitor',
  intent: 'discovery',
  turnCount: 1,
  conversationHistory: [
    { role: 'user', content: 'C\'est quoi exactement RENOVEC ?', timestamp: Date.now() },
  ],
  urgencyLevel: 0,
};

export const VISITOR_OFFER: EvaluationContext = {
  userMode: 'visitor',
  intent: 'offer',
  turnCount: 2,
  conversationHistory: [
    { role: 'assistant', content: 'Bonjour. Parlez-moi de votre situation.', timestamp: Date.now() - 10000 },
    { role: 'user', content: 'Je suis plombier, je voudrais proposer mes services', timestamp: Date.now() - 5000 },
    { role: 'assistant', content: 'Bien reçu. Je peux commencer à construire votre fiche.', timestamp: Date.now() - 3000 },
    { role: 'user', content: 'Je suis disponible le weekend sur Toulouse', timestamp: Date.now() },
  ],
  urgencyLevel: 0,
};

export const CONNECTED_USER: EvaluationContext = {
  userMode: 'connected',
  intent: 'need',
  turnCount: 3,
  conversationHistory: [
    { role: 'user', content: 'Je cherche quelqu\'un pour garder mes enfants mercredi', timestamp: Date.now() },
  ],
  urgencyLevel: 0.3,
};

// ── Non-conforming outputs (BAD) ──────────────────────────────────────────────

export const BAD_OUTPUTS: Array<{
  label: string;
  output: string;
  context: EvaluationContext;
  expectedViolations: string[];
}> = [
  {
    label: 'Defensive + premature barrier',
    output: 'Je suis juste la voix de RENOVEC. Je ne suis pas l\'équipe opérationnelle. Pour être mis en relation, il faut être coopté par un membre existant. Vous devrez d\'abord créer un compte.',
    context: VISITOR_FIRST_CONTACT,
    expectedViolations: ['warmth-no-defensive', 'barrier-no-early-cooptation'],
  },
  {
    label: 'Generic AI style',
    output: 'Bien sûr ! Je comprends tout à fait votre situation. N\'hésitez pas à me donner plus de détails. Je suis là pour vous aider à trouver la meilleure solution possible !',
    context: VISITOR_FIRST_CONTACT,
    expectedViolations: ['style-no-generic-ai'],
  },
  {
    label: 'Rejection of situation',
    output: 'Ce n\'est pas notre domaine. RENOVEC ne couvre pas les questions de comptabilité. Vous devriez chercher sur un annuaire professionnel.',
    context: VISITOR_FIRST_CONTACT,
    expectedViolations: ['barrier-no-rejection', 'barrier-no-early-cooptation'],
  },
  {
    label: 'Intrusive personal data request',
    output: 'Pour vous aider, j\'aurais besoin de votre nom complet, votre adresse email et votre numéro de téléphone. Quel est votre âge ?',
    context: VISITOR_FIRST_CONTACT,
    expectedViolations: ['nonintrusive-no-personal-data'],
  },
  {
    label: 'Marketing tone',
    output: 'RENOVEC est une solution unique et innovante ! Inscrivez-vous maintenant pour profiter de notre réseau exclusif de professionnels certifiés. Offre limitée !',
    context: VISITOR_DISCOVERY,
    expectedViolations: ['align-no-marketing', 'trust-no-fake-urgency'],
  },
  {
    label: 'False promise',
    output: 'Pas de souci, je vais vous mettre en relation avec un comptable. C\'est garanti, quelqu\'un va vous contacter dans l\'heure.',
    context: VISITOR_FIRST_CONTACT,
    expectedViolations: ['trust-no-false-promise'],
  },
  {
    label: 'Cold administrative',
    output: 'Veuillez préciser votre demande. Il est nécessaire de fournir les informations suivantes : type de besoin, zone géographique, disponibilité, budget estimatif.',
    context: VISITOR_FIRST_CONTACT,
    expectedViolations: ['warmth-not-cold', 'nonintrusive-no-question-flood'],
  },
  {
    label: 'Empty filler response',
    output: 'D\'accord.',
    context: VISITOR_FIRST_CONTACT,
    expectedViolations: ['useful-not-empty'],
  },
];

// ── Conforming outputs (GOOD) ─────────────────────────────────────────────────

export const GOOD_OUTPUTS: Array<{
  label: string;
  output: string;
  context: EvaluationContext;
}> = [
  {
    label: 'Warm visitor welcome — need',
    output: 'Comptabilité, d\'accord. Je comprends. Vous cherchez un accompagnement ponctuel ou régulier ? Je peux déjà regarder ce qui existe autour de vous.',
    context: VISITOR_FIRST_CONTACT,
  },
  {
    label: 'Urgent response',
    output: 'Je comprends l\'urgence. Chaudière en panne avec un bébé, il faut agir vite. Vous êtes dans quelle ville ? Je regarde immédiatement qui pourrait intervenir.',
    context: VISITOR_URGENT,
  },
  {
    label: 'Discovery — explaining RENOVEC',
    output: 'RENOVEC comprend les situations humaines et relie aux bonnes personnes. Pas de formulaire, pas de catégorie rigide. Vous décrivez ce qui se passe, je clarifie avec vous, et on trouve ensemble ce qui peut s\'activer.',
    context: VISITOR_DISCOVERY,
  },
  {
    label: 'Offer welcome',
    output: 'Toulouse, le weekend — noté. Je commence à construire votre fiche. Vous intervenez sur quel type de travaux principalement ?',
    context: VISITOR_OFFER,
  },
  {
    label: 'Connected user — practical',
    output: 'Garde d\'enfants mercredi. Je regarde les profils disponibles dans votre zone. C\'est pour la journée complète ou juste quelques heures ?',
    context: CONNECTED_USER,
  },
];

// ── Expected corrections ──────────────────────────────────────────────────────

export const CORRECTION_EXAMPLES: Array<{
  label: string;
  before: string;
  after: string;
  context: EvaluationContext;
}> = [
  {
    label: 'Defensive → Active presence',
    before: 'Je suis juste la voix de RENOVEC. Je ne suis pas en mesure de vous mettre en relation directement. Il faut être coopté.',
    after: 'Je peux déjà comprendre votre situation et regarder ce qui pourrait correspondre.',
    context: VISITOR_FIRST_CONTACT,
  },
  {
    label: 'Generic AI → RENOVEC tone',
    before: 'Bien sûr ! Je comprends tout à fait. N\'hésitez pas à me donner plus de détails, je suis là pour vous aider !',
    after: 'Comptabilité, d\'accord. Vous cherchez un accompagnement ponctuel ou régulier ?',
    context: VISITOR_FIRST_CONTACT,
  },
  {
    label: 'Barrier → Open door',
    before: 'Pour accéder au réseau, il faut d\'abord être coopté par un membre existant. Les échanges sont réservés aux membres.',
    after: 'Je peux vous montrer ce qui pourrait s\'activer autour de votre situation. Dites-moi ce qui vous amène.',
    context: VISITOR_DISCOVERY,
  },
  {
    label: 'Cold admin → Warm guidance',
    before: 'Veuillez préciser votre demande. Il est nécessaire de fournir : type de besoin, zone, disponibilité.',
    after: 'On peut partir de votre situation. De quoi avez-vous besoin exactement ?',
    context: VISITOR_FIRST_CONTACT,
  },
];
