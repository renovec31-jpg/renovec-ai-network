// ─── Knowledge Graph des situations ──────────────────────────────────────────
// Le coordinateur connaît le réel.
// Pour chaque domaine de situation, il sait : risques, urgences, signaux faibles,
// questions intelligentes à poser, ressources adaptées, erreurs à éviter.

export type SituationKnowledgeNode = {
  id: string;
  label: string;
  domain: string;
  keywords: string[];
  risks: Risk[];
  urgencySignals: string[];       // mots qui signalent urgence
  implicitNeeds: string[];        // besoins que l'utilisateur n'exprime pas
  intelligentQuestions: string[]; // questions concrètes à poser
  commonMistakes: string[];       // ce que le coordinateur ne doit PAS faire
  typicalResources: string[];     // types de présences humaines adaptées
  emotionalContext: string[];     // signaux émotionnels fréquents
  timeConstraints: string[];      // indices de contrainte temporelle
};

export type Risk = {
  level: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  trigger: string;  // pattern regex
};

// ─── GRAPHE DE CONNAISSANCE ───────────────────────────────────────────────────

export const SITUATION_KNOWLEDGE: SituationKnowledgeNode[] = [

  // ── LOGEMENT : MIROIR / VITRAGE ──────────────────────────────────────────────
  {
    id: 'miroir_vitrage',
    label: 'Miroir ou vitrage cassé / problème',
    domain: 'logement_technique',
    keywords: ['miroir', 'vitre', 'verre', 'fenêtre', 'brisé', 'cassé', 'fissure', 'éclat'],
    risks: [
      { level: 'critical', description: 'Blessure par éclats de verre', trigger: 'cassé|brisé|morceaux|éclat|tombé' },
      { level: 'high', description: 'Chute imminente si fixation instable', trigger: 'bouge|penche|fixation|tient plus|mal fixé' },
      { level: 'medium', description: 'Infiltration si vitrage brisé', trigger: 'fenêtre|vitre|extérieur|pluie' },
    ],
    urgencySignals: ['cassé', 'brisé', 'tombe', 'morceaux', 'éclats', 'enfant', 'blessé'],
    implicitNeeds: [
      'savoir si c\'est dangereux maintenant',
      'savoir qui appeler',
      'savoir si c\'est couvert par l\'assurance',
      'savoir si le propriétaire est responsable',
    ],
    intelligentQuestions: [
      'Le miroir est cassé ou c\'est un problème de fixation ?',
      'Il y a un risque qu\'il tombe ?',
      'Vous cherchez surtout à le remplacer ou à le sécuriser ?',
      'Des éclats sont par terre ou c\'est encore intact ?',
      'Il est dans quelle pièce — salle de bain, entrée ?',
    ],
    commonMistakes: [
      'demander "qu\'est-ce qui vous a amené à en parler maintenant ?"',
      'demander "comment vous sentez-vous ?"',
      'ignorer le risque de blessure',
    ],
    typicalResources: ['vitrier', 'miroitier', 'bricoleur', 'propriétaire'],
    emotionalContext: ['inquiet', 'pressé', 'incertain'],
    timeConstraints: ['depuis combien de temps', 'enfant dans la maison', 'locataire ou propriétaire'],
  },

  // ── LOGEMENT : FUITE D'EAU ────────────────────────────────────────────────
  {
    id: 'fuite_eau',
    label: 'Fuite d\'eau',
    domain: 'logement_urgent',
    keywords: ['fuite', 'eau', 'coule', 'infiltration', 'humidité', 'dégât', 'plomberie', 'robinet', 'tuyau'],
    risks: [
      { level: 'critical', description: 'Court-circuit si eau près d\'électricité', trigger: 'électricité|câble|tableau|prise' },
      { level: 'critical', description: 'Dégât des eaux en progression', trigger: 'coule|plafond|voisin|dessous' },
      { level: 'high', description: 'Moisissures si non traité rapidement', trigger: 'humidité|moisissure|odeur' },
    ],
    urgencySignals: ['coule', 'partout', 'inondé', 'plafond', 'voisin', 'forte', 'urgence'],
    implicitNeeds: [
      'couper l\'eau d\'urgence',
      'savoir si c\'est la responsabilité du propriétaire',
      'déclarer à l\'assurance',
      'trouver un plombier rapidement',
    ],
    intelligentQuestions: [
      'La fuite est active en ce moment ?',
      'Vous avez pu couper l\'eau ?',
      'Ça vient d\'où — d\'un robinet, d\'un tuyau, du plafond ?',
      'Vous êtes locataire ou propriétaire ?',
      'Il y a de l\'eau qui touche des prises ou du matériel électrique ?',
    ],
    commonMistakes: [
      'ne pas vérifier si l\'eau est coupée en premier',
      'ignorer la présence d\'électricité',
      'parler de devis avant de parler de sécurité',
    ],
    typicalResources: ['plombier d\'urgence', 'propriétaire', 'assurance', 'syndic'],
    emotionalContext: ['paniqué', 'stressé', 'dépassé'],
    timeConstraints: ['depuis combien de temps', 'progression de la fuite'],
  },

  // ── LOGEMENT : SERRURE ────────────────────────────────────────────────────
  {
    id: 'serrure_porte',
    label: 'Serrure ou problème de porte',
    domain: 'logement_sécurité',
    keywords: ['serrure', 'porte', 'clé', 'fermé', 'bloqué', 'enfermé', 'verrouillé', 'clé cassée'],
    risks: [
      { level: 'critical', description: 'Personne enfermée ou bloquée à l\'extérieur', trigger: 'dehors|bloqué|enfermé|nuit' },
      { level: 'high', description: 'Sécurité du logement compromise', trigger: 'cassé|ne ferme plus|forcé|cambriolage' },
    ],
    urgencySignals: ['dehors', 'bloqué', 'enfermé', 'nuit', 'clé cassée', 'urgence'],
    implicitNeeds: [
      'accès immédiat au logement',
      'savoir si un serrurier est remboursé',
      'savoir si le propriétaire doit intervenir',
    ],
    intelligentQuestions: [
      'Vous êtes à l\'intérieur ou à l\'extérieur en ce moment ?',
      'C\'est la serrure qui est cassée ou vous avez perdu la clé ?',
      'Vous avez un double de clé quelque part ?',
      'Vous êtes locataire — vous avez le contact de votre propriétaire ?',
    ],
    commonMistakes: [
      'demander une description émotionnelle avant de savoir si la personne est en danger',
    ],
    typicalResources: ['serrurier d\'urgence', 'propriétaire', 'assurance habitation'],
    emotionalContext: ['stressé', 'honteux', 'pressé'],
    timeConstraints: ['il est quelle heure', 'nuit ou jour'],
  },

  // ── EMPLOI : LICENCIEMENT / PERTE D'EMPLOI ────────────────────────────────
  {
    id: 'perte_emploi',
    label: 'Perte d\'emploi ou licenciement',
    domain: 'emploi',
    keywords: ['licencié', 'renvoyé', 'perdu emploi', 'fin de contrat', 'chômage', 'rupture conventionnelle', 'démission'],
    risks: [
      { level: 'high', description: 'Délais légaux courts pour contester', trigger: 'licenciement|rupture|abusif|injuste' },
      { level: 'high', description: 'Impact financier immédiat', trigger: 'loyer|charges|urgent|dettes' },
      { level: 'medium', description: 'Isolement professionnel', trigger: 'seul|pas de réseau|perdu' },
    ],
    urgencySignals: ['demain', 'immédiatement', 'sans préavis', 'du jour au lendemain', 'urgent'],
    implicitNeeds: [
      'comprendre ses droits',
      'démarches pôle emploi',
      'impact financier à court terme',
      'chercher une autre opportunité',
    ],
    intelligentQuestions: [
      'C\'est un licenciement ou une rupture conventionnelle ?',
      'Vous avez reçu une lettre officielle ?',
      'Le délai de préavis a été respecté ?',
      'C\'est récent — vous avez déjà fait les démarches chômage ?',
    ],
    commonMistakes: [
      'ignorer les délais légaux',
      'parler de CV avant de parler de droits',
    ],
    typicalResources: ['conseiller juridique', 'conseiller emploi', 'travailleur social'],
    emotionalContext: ['humilié', 'inquiet', 'en colère', 'perdu'],
    timeConstraints: ['depuis quand', 'délai de préavis', 'date de fin de contrat'],
  },

  // ── SANTÉ : URGENCE MÉDICALE ──────────────────────────────────────────────
  {
    id: 'urgence_medicale',
    label: 'Urgence médicale ou santé grave',
    domain: 'santé',
    keywords: ['douleur', 'malade', 'urgence', 'hôpital', 'médecin', 'symptôme', 'grave', 'accident'],
    risks: [
      { level: 'critical', description: 'Situation nécessitant le 15 ou 18', trigger: 'douleur forte|chest|thoracique|respire mal|inconscient|accident' },
      { level: 'high', description: 'Besoin médical non satisfait', trigger: 'pas de médecin|refus|urgences fermées' },
    ],
    urgencySignals: ['fort', 'grave', 'urgent', 'maintenant', 'ne peut pas bouger', 'sang'],
    implicitNeeds: [
      'savoir si c\'est une urgence réelle',
      'trouver un médecin rapidement',
      'comprendre les options de soins',
    ],
    intelligentQuestions: [
      'C\'est une douleur qui a commencé maintenant ou ça dure depuis un moment ?',
      'La personne est consciente et peut parler ?',
      'Vous avez déjà appelé le 15 ou les urgences ?',
    ],
    commonMistakes: [
      'ne pas identifier si une intervention d\'urgence est nécessaire avant tout',
    ],
    typicalResources: ['SAMU 15', 'médecin de garde', 'soignant de proximité'],
    emotionalContext: ['paniqué', 'peur', 'inquiet pour un proche'],
    timeConstraints: ['depuis combien de temps', 'évolution des symptômes'],
  },

  // ── ADMINISTRATIF : DOCUMENTS / DÉMARCHES ────────────────────────────────
  {
    id: 'administratif_documents',
    label: 'Démarche administrative ou documents',
    domain: 'administratif',
    keywords: ['papiers', 'document', 'formulaire', 'dossier', 'préfecture', 'CAF', 'impôts', 'carte', 'titre de séjour', 'retraite'],
    risks: [
      { level: 'high', description: 'Délais dépassés avec conséquences légales', trigger: 'délai|date limite|expire|expiré' },
      { level: 'medium', description: 'Perte de droits par non-renouvellement', trigger: 'allocation|droits|renouvellement' },
    ],
    urgencySignals: ['expire', 'délai', 'date limite', 'urgent', 'bloqué', 'sans papiers'],
    implicitNeeds: [
      'savoir quels documents rassembler',
      'savoir où se rendre',
      'aide pour remplir le dossier',
    ],
    intelligentQuestions: [
      'C\'est pour quel type de démarche — titre de séjour, CAF, autre ?',
      'Il y a une date limite connue ?',
      'Vous avez déjà commencé le dossier ou vous partez de zéro ?',
      'Vous avez besoin d\'aide pour remplir ou juste pour savoir où aller ?',
    ],
    commonMistakes: [
      'répondre de manière générique sans identifier l\'organisme concerné',
    ],
    typicalResources: ['assistant social', 'association aide démarches', 'écrivain public'],
    emotionalContext: ['perdu', 'anxieux', 'découragé'],
    timeConstraints: ['date limite', 'depuis combien de temps bloqué'],
  },

  // ── RELATIONNEL : CONFLIT ─────────────────────────────────────────────────
  {
    id: 'conflit_relationnel',
    label: 'Conflit relationnel',
    domain: 'relationnel',
    keywords: ['conflit', 'dispute', 'problème avec', 'tension', 'rupture', 'mésentente', 'voisin', 'famille', 'collègue'],
    risks: [
      { level: 'high', description: 'Escalade vers violence ou harcèlement', trigger: 'violence|menace|harcèlement|agression' },
      { level: 'medium', description: 'Impact sur logement ou emploi', trigger: 'voisin|employeur|collègue|propriétaire' },
    ],
    urgencySignals: ['violence', 'menace', 'dangereux', 'peur', 'harcèlement'],
    implicitNeeds: [
      'être entendu sans jugement',
      'comprendre ses droits',
      'trouver une médiation',
    ],
    intelligentQuestions: [
      'C\'est un conflit avec qui — voisin, famille, au travail ?',
      'Il y a des menaces ou de la violence dans cette situation ?',
      'Vous cherchez à résoudre à l\'amiable ou à vous protéger ?',
    ],
    commonMistakes: [
      'donner des conseils avant de comprendre la situation',
      'minimiser',
      'poser des questions psychologiques génériques',
    ],
    typicalResources: ['médiateur', 'travailleur social', 'juriste', 'association'],
    emotionalContext: ['blessé', 'en colère', 'épuisé', 'peur'],
    timeConstraints: ['depuis combien de temps', 'récent ou ancien'],
  },

  // ── FINANCIER : DETTES / DIFFICULTÉS ─────────────────────────────────────
  {
    id: 'difficulte_financiere',
    label: 'Difficultés financières',
    domain: 'financier',
    keywords: ['dette', 'dettes', 'loyer', 'charges', 'plus d\'argent', 'découvert', 'saisie', 'crédit', 'remboursement'],
    risks: [
      { level: 'high', description: 'Saisie ou expulsion imminente', trigger: 'saisie|huissier|expulsion|délai' },
      { level: 'high', description: 'Rupture d\'accès à l\'énergie ou logement', trigger: 'coupure|eau|électricité|gaz|expulsion' },
    ],
    urgencySignals: ['saisie', 'huissier', 'expulsion', 'coupure', 'urgent'],
    implicitNeeds: [
      'trouver des aides d\'urgence',
      'comprendre les recours légaux',
      'négocier avec les créanciers',
    ],
    intelligentQuestions: [
      'Il y a des démarches d\'huissier ou de saisie en cours ?',
      'C\'est plutôt un problème de loyer, de crédits, ou autre ?',
      'Vous touchez des aides actuellement — CAF, RSA ?',
    ],
    commonMistakes: [
      'parler de budget avant d\'évaluer le niveau d\'urgence',
    ],
    typicalResources: ['assistant social', 'CCAS', 'Croix-Rouge', 'juriste consommation'],
    emotionalContext: ['honte', 'stress intense', 'épuisement'],
    timeConstraints: ['délai huissier', 'date d\'expulsion'],
  },

];

// ─── Lookup functions ─────────────────────────────────────────────────────────

export function findRelevantKnowledge(text: string): SituationKnowledgeNode[] {
  const t = text.toLowerCase();
  const scored = SITUATION_KNOWLEDGE.map(node => {
    const keywordMatches = node.keywords.filter(kw => t.includes(kw)).length;
    return { node, score: keywordMatches };
  });
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.node);
}

export function detectRisksInText(text: string): Risk[] {
  const t = text.toLowerCase();
  const allRisks: Risk[] = [];
  for (const node of SITUATION_KNOWLEDGE) {
    for (const risk of node.risks) {
      if (new RegExp(risk.trigger, 'i').test(t)) {
        allRisks.push(risk);
      }
    }
  }
  return allRisks.sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.level] - order[b.level];
  });
}

export function getIntelligentQuestions(text: string, alreadyAsked: string[]): string[] {
  const nodes = findRelevantKnowledge(text);
  if (nodes.length === 0) return [];

  const node = nodes[0];
  return node.intelligentQuestions.filter(q =>
    !alreadyAsked.some(asked =>
      asked.toLowerCase().includes(q.toLowerCase().slice(0, 20))
    )
  );
}

export function buildKnowledgeContext(text: string): string {
  const nodes = findRelevantKnowledge(text);
  if (nodes.length === 0) return '';

  const node = nodes[0];
  const criticalRisks = node.risks.filter(r => r.level === 'critical' || r.level === 'high');

  const parts: string[] = [];
  parts.push(`[CONNAISSANCE SITUATIONNELLE : ${node.label}]`);

  if (criticalRisks.length > 0) {
    parts.push(`RISQUES IDENTIFIÉS : ${criticalRisks.map(r => r.description).join(' / ')}`);
  }

  if (node.implicitNeeds.length > 0) {
    parts.push(`BESOINS IMPLICITES FRÉQUENTS : ${node.implicitNeeds.slice(0, 3).join(' / ')}`);
  }

  if (node.intelligentQuestions.length > 0) {
    parts.push(`QUESTIONS CONCRÈTES À ENVISAGER : ${node.intelligentQuestions.slice(0, 3).join(' | ')}`);
  }

  parts.push(`ERREURS À ÉVITER : ${node.commonMistakes.slice(0, 2).join(' / ')}`);

  return parts.join('\n');
}
