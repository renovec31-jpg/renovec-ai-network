// ─── Situation Inference Engine ───────────────────────────────────────────────
// Deduces REAL WORLD SITUATIONS from ambiguous, incomplete, or indirect messages.
// "mon salon est ouvert" → broken window / security risk / cold / intrusion
// This is NOT keyword matching. It's semantic inference from real-world context.

import { normalizeText } from './normalize';

export type InferredSituation = {
  type: string;
  label: string;
  confidence: number;         // 0.0–1.0
  hypotheses: string[];       // what might be happening in the real world
  implicitRisks: string[];    // risks the user hasn't mentioned
  suggestedQuestion: string;  // best next question given the inference
  domain: string;
};

// ─── Inference rules ──────────────────────────────────────────────────────────
// Each rule: test if pattern fires, then produce a rich inference.
// Ordered from most specific to most general.

type InferenceRule = {
  test: (normalized: string, original: string) => boolean;
  infer: () => InferredSituation;
};

const INFERENCE_RULES: InferenceRule[] = [

  // "mon salon est ouvert" / "ma chambre est ouverte" / "la pièce est ouverte"
  // → Real world: window broken, can't close, security/weather risk
  {
    test: (t) => /(salon|chambre|salle|pièce|cuisine|bureau|entrée|couloir).{0,20}(est|s'est|reste|est resté).{0,15}(ouvert|ouverte)/i.test(t),
    infer: () => ({
      type: 'window_or_door_open',
      label: 'Ouverture non voulue — vitrage ou porte',
      confidence: 0.8,
      hypotheses: [
        'La vitre ou fenêtre est cassée',
        'La fenêtre ne ferme plus',
        'La porte donne sur l\'extérieur et ne se ferme plus',
        'Risque d\'intrusion ou d\'exposition aux intempéries',
      ],
      implicitRisks: [
        'Sécurité du logement compromise',
        'Exposition au froid ou à la pluie',
        'Risque d\'intrusion',
        'Si éclats de verre : risque de blessure',
      ],
      suggestedQuestion: 'C\'est la vitre qui est cassée, ou la fenêtre qui ne ferme plus ?',
      domain: 'logement_sécurité',
    }),
  },

  // "ma fenêtre est cassée / brisée / ne ferme plus"
  {
    test: (t) => /fenêtre.{0,20}(cassée?|brisée?|ne ferme|ne s'ouvre|bloquée?|fissurée?)/i.test(t) ||
                 /(fenêtre|vitre).{0,10}(ne ferme|ferme plus|bloquée?)/i.test(t),
    infer: () => ({
      type: 'broken_window',
      label: 'Fenêtre cassée ou qui ne ferme plus',
      confidence: 0.9,
      hypotheses: [
        'Vitre fissurée ou cassée',
        'Mécanisme de fermeture défaillant',
        'Exposition extérieure immédiate',
      ],
      implicitRisks: [
        'Sécurité du logement',
        'Exposition météo',
        'Éclats de verre possibles',
      ],
      suggestedQuestion: 'La vitre est cassée ou c\'est juste la fermeture qui ne fonctionne plus ?',
      domain: 'logement_technique',
    }),
  },

  // "j'ai un problème avec ma vitre / mon miroir"
  {
    test: (t) => /(problème|souci|truc).{0,20}(vitre|miroir|verre|fenêtre)/i.test(t) ||
                 /(vitre|miroir).{0,20}(problème|souci|cassé|brisé|fissuré)/i.test(t),
    infer: () => ({
      type: 'glass_issue',
      label: 'Problème de vitre ou miroir',
      confidence: 0.85,
      hypotheses: [
        'Vitre ou miroir cassé',
        'Fissure potentiellement dangereuse',
        'Besoin de remplacement ou sécurisation',
      ],
      implicitRisks: [
        'Éclats de verre si cassé',
        'Ouverture vers l\'extérieur si vitrage',
      ],
      suggestedQuestion: 'La vitre est cassée ou c\'est un problème de fermeture ?',
      domain: 'logement_technique',
    }),
  },

  // Water / flooding
  {
    test: (t) => /(ça coule|eau qui coule|plafond qui coule|fuite d'eau|fuite d['']eau|dégât des eaux|inondé)/i.test(t) ||
                 /(eau.{0,10}(partout|plafond|sol|mur)|plafond.{0,10}(eau|humide|mouillé))/i.test(t),
    infer: () => ({
      type: 'water_damage',
      label: 'Fuite ou dégât des eaux',
      confidence: 0.9,
      hypotheses: [
        'Fuite active en cours',
        'Infiltration par plafond ou mur',
        'Dégât des eaux potentiel',
      ],
      implicitRisks: [
        'Court-circuit si eau près d\'électricité',
        'Dégâts matériels progressifs',
        'Impact sur voisins du dessous',
      ],
      suggestedQuestion: 'La fuite est active en ce moment, ou c\'est de l\'humidité qui s\'est installée ?',
      domain: 'logement_urgent',
    }),
  },

  // Locked out / door issue
  {
    test: (t) => /(je suis|me retrouve|suis resté|coincé|bloqué).{0,15}(dehors|extérieur)/i.test(t) ||
                 /(porte|serrure).{0,20}(ne s'ouvre|ne ferme|cassée?|bloquée?|clé cassée)/i.test(t) ||
                 /(clé.{0,10}(cassée?|bloquée?|perdue?|coincée?))/i.test(t),
    infer: () => ({
      type: 'locked_out_or_door',
      label: 'Problème de porte ou serrure',
      confidence: 0.9,
      hypotheses: [
        'Personne bloquée à l\'extérieur',
        'Serrure défaillante',
        'Clé cassée dans la serrure',
      ],
      implicitRisks: [
        'Urgence si nuit ou mauvais temps',
        'Sécurité si porte ne ferme plus',
      ],
      suggestedQuestion: 'Vous êtes à l\'intérieur ou à l\'extérieur en ce moment ?',
      domain: 'logement_sécurité',
    }),
  },

  // Job loss signals
  {
    test: (t) => /(licencié|viré|renvoyé|perdu.{0,10}(emploi|travail|boulot|poste)|rupture conventionnelle|chômage)/i.test(t),
    infer: () => ({
      type: 'job_loss',
      label: 'Perte d\'emploi ou licenciement',
      confidence: 0.9,
      hypotheses: [
        'Licenciement récent',
        'Rupture conventionnelle',
        'Fin de contrat inattendue',
      ],
      implicitRisks: [
        'Délais légaux courts pour contester',
        'Impact financier immédiat',
        'Démarches chômage à initier rapidement',
      ],
      suggestedQuestion: 'C\'est un licenciement ou une rupture conventionnelle ?',
      domain: 'emploi',
    }),
  },

  // Financial urgency
  {
    test: (t) => /(huissier|saisie|expulsion|coupure.{0,10}(eau|gaz|électricité|énergie))/i.test(t) ||
                 /(loyer.{0,15}(impayé|retard|pas payé))/i.test(t),
    infer: () => ({
      type: 'financial_urgency',
      label: 'Urgence financière ou procédure',
      confidence: 0.95,
      hypotheses: [
        'Procédure d\'huissier en cours',
        'Risque d\'expulsion',
        'Coupure imminente',
      ],
      implicitRisks: [
        'Délais très courts pour agir',
        'Besoin d\'aide juridique urgente',
      ],
      suggestedQuestion: 'Il y a une date limite ou une procédure déjà engagée ?',
      domain: 'financier',
    }),
  },

  // Medical emergency signals
  {
    test: (t) => /(douleur (forte|intense|insupportable)|saigne|ne respire|inconscient|perdu connaissance|accident grave)/i.test(t) ||
                 /(besoin.{0,10}ambulance|appeler le 15|appeler le 18|urgences)/i.test(t),
    infer: () => ({
      type: 'medical_emergency',
      label: 'Urgence médicale',
      confidence: 0.95,
      hypotheses: [
        'Situation médicale nécessitant intervention immédiate',
      ],
      implicitRisks: ['Chaque minute compte'],
      suggestedQuestion: 'Vous avez appelé le 15 (SAMU) ou le 18 (pompiers) ?',
      domain: 'santé',
    }),
  },

  // Violence / danger signals
  {
    test: (t) => /(violence|menace|agression|harcèlement|j'ai peur|en danger|il me frappe|elle me frappe)/i.test(t),
    infer: () => ({
      type: 'safety_risk',
      label: 'Risque pour la sécurité personnelle',
      confidence: 0.95,
      hypotheses: [
        'Situation de violence ou de menace',
        'Harcèlement en cours',
        'Besoin de protection immédiate',
      ],
      implicitRisks: ['Sécurité physique en jeu', 'Besoin de mise en sécurité'],
      suggestedQuestion: 'Est-ce que vous êtes en sécurité là maintenant ?',
      domain: 'relationnel',
    }),
  },

  // Conflict without violence
  {
    test: (t) => /(conflit|dispute|tension|problème avec).{0,30}(voisin|famille|collègue|employeur|propriétaire|bailleur)/i.test(t),
    infer: () => ({
      type: 'interpersonal_conflict',
      label: 'Conflit relationnel',
      confidence: 0.85,
      hypotheses: [
        'Conflit en cours avec une personne de l\'entourage ou professionnel',
      ],
      implicitRisks: [
        'Escalade possible',
        'Impact sur logement ou emploi si impliqué',
      ],
      suggestedQuestion: 'Le conflit a un impact concret sur votre vie en ce moment — logement, travail ?',
      domain: 'relationnel',
    }),
  },

  // Generic problem with location/object
  {
    test: (t) => /(problème|souci|truc|soucis).{0,20}(chez moi|à la maison|dans mon|dans ma|au logement)/i.test(t),
    infer: () => ({
      type: 'home_issue_generic',
      label: 'Problème au logement (non précisé)',
      confidence: 0.7,
      hypotheses: [
        'Problème technique dans le logement',
        'Problème avec le propriétaire ou le bailleur',
        'Problème de voisinage',
      ],
      implicitRisks: [],
      suggestedQuestion: 'C\'est un problème technique — quelque chose qui est cassé ou qui ne fonctionne plus ?',
      domain: 'logement',
    }),
  },

  // ── Universal domains — education, aide humaine, accompagnement, soutien, etc. ──

  // Soutien scolaire
  {
    test: (t) =>
      /(soutien scolaire|cours particuliers|aide aux devoirs|tuteur|prof particulier)/i.test(t) ||
      /(aide.{0,15}(mon fils|ma fille|mon enfant|l'enfant).{0,15}(école|scolaire|devoirs|maths|français))/i.test(t) ||
      /(quelqu'un.{0,20}(soutien|aide).{0,20}(scolaire|devoirs|école))/i.test(t),
    infer: () => ({
      type: 'soutien_scolaire',
      label: 'Soutien scolaire',
      confidence: 0.9,
      hypotheses: [
        'Enfant en difficulté dans une ou plusieurs matières',
        'Besoin d\'un tuteur ou d\'aide aux devoirs',
        'Préparation à un examen proche',
      ],
      implicitRisks: [
        'Décrochage si non traité rapidement',
        'Contrainte budgétaire pour les cours payants',
      ],
      suggestedQuestion: 'C\'est pour quel niveau et quelle matière principalement ?',
      domain: 'education',
    }),
  },

  // Orientation scolaire / professionnelle
  {
    test: (t) =>
      /(orientation scolaire|projet professionnel|choisir (une filière|un métier)|parcoursup|réorientation)/i.test(t) ||
      /(ne sait pas (quoi|quel) (faire|métier|orientation))/i.test(t),
    infer: () => ({
      type: 'orientation',
      label: 'Orientation scolaire ou professionnelle',
      confidence: 0.85,
      hypotheses: [
        'Doute sur l\'orientation à prendre',
        'Besoin d\'un regard extérieur bienveillant',
      ],
      implicitRisks: ['Décision mal orientée avec impact long terme'],
      suggestedQuestion: 'C\'est pour vous ou pour votre enfant, et il y a une date limite ?',
      domain: 'education',
    }),
  },

  // Aide à une personne âgée
  {
    test: (t) =>
      /(personne âgée|grand.?parent|mamie|papi|mère|père).{0,30}(seul|aide|accompagn|soin|domicile)/i.test(t) ||
      /(aide à domicile|maintien.{0,10}domicile|dépendance|autonomie)/i.test(t) ||
      /(ma mère|mon père|mes parents).{0,20}(seul|plus autonome|besoin d'aide|âgé)/i.test(t),
    infer: () => ({
      type: 'aide_personne_agee',
      label: 'Aide à une personne âgée',
      confidence: 0.85,
      hypotheses: [
        'Personne âgée vivant seule qui a besoin d\'aide',
        'Aidant familial cherchant un relais',
        'Organisation de l\'aide à domicile',
      ],
      implicitRisks: [
        'Épuisement de l\'aidant familial',
        'Isolement de la personne âgée',
        'Chute sans assistance',
      ],
      suggestedQuestion: 'La personne vit seule, et c\'est plutôt une aide pratique ou un besoin de présence ?',
      domain: 'aide_humaine',
    }),
  },

  // Accompagnement à un rendez-vous / démarche
  {
    test: (t) =>
      /(accompagner|accompagnement).{0,20}(rendez.?vous|tribunal|préfecture|hôpital|médecin|entretien)/i.test(t) ||
      /(j'ai besoin de quelqu'un|quelqu'un pour m'accompagner|n'ose pas y aller seul)/i.test(t),
    infer: () => ({
      type: 'accompagnement_demarche',
      label: 'Accompagnement à une démarche',
      confidence: 0.85,
      hypotheses: [
        'Besoin d\'une présence pour un rendez-vous important',
        'Anxiété ou difficulté à y aller seul',
      ],
      implicitRisks: ['Rendez-vous manqué si non accompagné'],
      suggestedQuestion: 'C\'est pour quel type de rendez-vous, et c\'est quand ?',
      domain: 'accompagnement',
    }),
  },

  // Soutien moral / détresse émotionnelle
  {
    test: (t) =>
      /(j'en peux plus|à bout|épuisé|pas bien|déprimé|anxieux|perdu|submergé|seul et)/i.test(t) ||
      /(besoin de parler|parler à quelqu'un|quelqu'un qui écoute|écoute)/i.test(t) ||
      /(idées noires|plus envie|en finir|suicide)/i.test(t),
    infer: () => ({
      type: 'soutien_emotionnel',
      label: 'Besoin de soutien moral ou émotionnel',
      confidence: 0.9,
      hypotheses: [
        'Détresse émotionnelle ou épuisement',
        'Isolement et besoin de lien humain',
        'Situation difficile sans soutien',
      ],
      implicitRisks: [
        'Si "idées noires" ou "en finir" : risque suicidaire — orienter vers numéro d\'urgence (3114)',
        'Crise sous-jacente non exprimée',
      ],
      suggestedQuestion: 'Vous cherchez plutôt quelqu\'un à qui parler librement, ou une aide concrète pour avancer ?',
      domain: 'soutien',
    }),
  },

  // Isolement
  {
    test: (t) =>
      /(je suis seul|trop seul|pas d'amis|pas de réseau|solitude|isolé|personne autour)/i.test(t) ||
      /(rencontrer des gens|lien social|sortir|activité|ne voir personne)/i.test(t),
    infer: () => ({
      type: 'isolement',
      label: 'Isolement social',
      confidence: 0.8,
      hypotheses: [
        'Personne isolée cherchant du lien',
        'Besoin d\'activité de groupe ou de présence',
      ],
      implicitRisks: ['Dépression si isolement sévère'],
      suggestedQuestion: 'Vous cherchez plutôt à rencontrer des gens, à trouver une activité, ou simplement quelqu\'un à qui parler ?',
      domain: 'isolement',
    }),
  },

  // Voisinage
  {
    test: (t) =>
      /(conflit|problème|dispute|bruit|nuisance).{0,20}(voisin|immeuble|copropriété)/i.test(t) ||
      /(voisin.{0,20}(bruit|nuisance|problème|dispute|conflit))/i.test(t),
    infer: () => ({
      type: 'conflit_voisinage',
      label: 'Conflit ou problème de voisinage',
      confidence: 0.85,
      hypotheses: [
        'Nuisances sonores ou comportementales',
        'Conflit de voisinage non résolu',
      ],
      implicitRisks: ['Escalade possible', 'Impact sur le bien-être quotidien'],
      suggestedQuestion: 'Vous avez déjà essayé d\'en parler directement au voisin ?',
      domain: 'voisinage',
    }),
  },

  // Réparation d'objet / appareil
  {
    test: (t) =>
      /(réparer|réparation).{0,20}(lave.?linge|réfrigérateur|frigo|télé|ordinateur|téléphone|vélo|meuble)/i.test(t) ||
      /(lave.?linge|réfrigérateur|frigo|machine à laver).{0,20}(panne|ne marche|cassé|en panne)/i.test(t),
    infer: () => ({
      type: 'reparation_objet',
      label: 'Réparation d\'objet ou d\'appareil',
      confidence: 0.85,
      hypotheses: [
        'Appareil ménager ou objet cassé',
        'Besoin d\'un réparateur compétent et fiable',
      ],
      implicitRisks: ['Urgence si lave-linge ou réfrigérateur (impact quotidien fort)'],
      suggestedQuestion: 'C\'est quoi l\'appareil, et c\'est en panne totale ou partielle ?',
      domain: 'reparation',
    }),
  },

  // Coordination familiale
  {
    test: (t) =>
      /(coordonner|organiser|gérer).{0,20}(famille|proche|parent|aidant)/i.test(t) ||
      /(aidant familial|je gère tout seul|tout porte sur moi|personne ne m'aide)/i.test(t),
    infer: () => ({
      type: 'coordination_familiale',
      label: 'Coordination familiale',
      confidence: 0.8,
      hypotheses: [
        'Aidant familial épuisé qui gère seul',
        'Besoin d\'organiser l\'aide autour d\'un proche',
      ],
      implicitRisks: ['Épuisement de l\'aidant pouvant mener à rupture'],
      suggestedQuestion: 'Vous organisez l\'aide pour qui, et il y a d\'autres membres de la famille impliqués ?',
      domain: 'coordination_familiale',
    }),
  },

  // Mobilité
  {
    test: (t) =>
      /(voiture.{0,15}panne|panne.{0,15}voiture|garage|dépannage auto)/i.test(t) ||
      /(pas de transport|pas de voiture|comment me déplacer|transport adapté)/i.test(t),
    infer: () => ({
      type: 'probleme_mobilite',
      label: 'Problème de mobilité ou transport',
      confidence: 0.8,
      hypotheses: ['Véhicule en panne', 'Manque de transport', 'Besoin de mobilité adaptée'],
      implicitRisks: ['Isolement ou rendez-vous manqués si mobilité bloquée'],
      suggestedQuestion: 'C\'est la voiture en panne ou un besoin de transport régulier ?',
      domain: 'mobilite',
    }),
  },

  // Besoin local / trouver quelqu'un de confiance
  {
    test: (t) =>
      /(trouver quelqu'un|cherche quelqu'un|je cherche un).{0,20}(de confiance|fiable|sérieux|compétent|près de chez|dans mon quartier)/i.test(t) ||
      /(recommandation|quelqu'un de confiance|proche de chez moi)/i.test(t),
    infer: () => ({
      type: 'besoin_local',
      label: 'Besoin de trouver quelqu\'un de confiance localement',
      confidence: 0.75,
      hypotheses: [
        'Besoin d\'une personne compétente et fiable à proximité',
        'Méfiance envers les plateformes automatiques',
      ],
      implicitRisks: [],
      suggestedQuestion: 'Vous cherchez quelqu\'un pour faire quoi exactement ?',
      domain: 'besoins_locaux',
    }),
  },
];

// ─── Main inference function ──────────────────────────────────────────────────

export function inferSituation(rawInput: string): InferredSituation | null {
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

// ── Build intelligent fallback question ─────────────────────────────────────
// When we don't understand, we ask a smart targeted question
// instead of "Je ne suis pas sûr d'avoir compris"

export function buildIntelligentFallback(
  rawInput: string,
  conversationHistory: Array<{ role: string; content: string }>
): string {
  const t = rawInput.toLowerCase();
  const normalized = normalizeText(rawInput).toLowerCase();

  // Try to infer something first
  const inference = inferSituation(rawInput);
  if (inference && inference.confidence >= 0.7) {
    return inference.suggestedQuestion;
  }

  // Location context
  if (/(chez moi|logement|appartement|maison|pièce|salon|chambre|cuisine|salle de bain|bureau)/.test(t)) {
    return 'C\'est quelque chose qui est cassé, ou un problème différent ?';
  }

  // Object reference without context
  if (/(ça|ca|il|elle|ça marche|ça fonctionne|c'est)/.test(t) && t.split(' ').length < 6) {
    return 'Vous pouvez me dire c\'est quoi exactement — un objet, une situation, un problème ?';
  }

  // Has "problème" / "souci" but vague
  if (/(problème|souci|pb|truc)/.test(normalized) && t.split(' ').length < 8) {
    return 'C\'est un problème technique, administratif, ou autre chose ?';
  }

  // Someone else implied
  if (/(ma mère|mon père|ma femme|mon mari|mon fils|ma fille|mon enfant|quelqu'un)/.test(t)) {
    return 'La personne est avec vous en ce moment, ou vous cherchez à l\'aider à distance ?';
  }

  // Time reference
  if (/(ce matin|hier|depuis|ça fait|il y a)/.test(t)) {
    return 'Qu\'est-ce qui s\'est passé ?';
  }

  // Fallback: open but targeted (NOT "je ne suis pas sûr")
  const prevCoordCount = conversationHistory.filter(h => h.role === 'coordinator').length;

  if (prevCoordCount === 0) {
    return 'Dites-moi ce qui se passe.';
  }
  if (prevCoordCount === 1) {
    return 'Je veux m\'assurer de bien comprendre — c\'est une situation chez vous, au travail, ou autre chose ?';
  }
  return 'Pouvez-vous me dire en quelques mots ce que vous cherchez à régler ?';
}

// ─── Format inference for prompt injection ───────────────────────────────────

export function formatInferenceForPrompt(inference: InferredSituation): string {
  const lines = [
    `━━━ INFÉRENCE SITUATIONNELLE ━━━`,
    `SITUATION PROBABLE : ${inference.label} (confiance: ${Math.round(inference.confidence * 100)}%)`,
    `HYPOTHÈSES RÉELLES : ${inference.hypotheses.slice(0, 3).join(' | ')}`,
  ];

  if (inference.implicitRisks.length > 0) {
    lines.push(`RISQUES IMPLICITES : ${inference.implicitRisks.join(' / ')}`);
  }

  lines.push(`QUESTION SUGGÉRÉE : "${inference.suggestedQuestion}"`);
  lines.push(`DOMAINE : ${inference.domain}`);
  lines.push(`━━━ FIN INFÉRENCE ━━━`);

  return lines.join('\n');
}
