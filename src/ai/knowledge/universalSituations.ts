// ─── Universal Situation Knowledge Graph ─────────────────────────────────────
// RENOVEC est un OS de coordination humaine.
// Ce graphe couvre TOUTES les situations humaines — pas une verticale.
// Règle fondamentale : aucune situation n'est rejetée. Toutes sont accueillies.

export type UniversalDomain =
  | 'habitat'
  | 'education'
  | 'administratif'
  | 'aide_humaine'
  | 'sante_legere'
  | 'mobilite'
  | 'voisinage'
  | 'reparation'
  | 'accompagnement'
  | 'soutien'
  | 'urgence_quotidien'
  | 'coordination_familiale'
  | 'isolement'
  | 'besoins_locaux';

export type SituationNode = {
  id: string;
  domain: UniversalDomain;
  label: string;
  description: string;             // ce que cette situation représente dans le réel
  keywords: string[];
  urgencySignals: string[];        // mots qui changent la priorité
  implicitNeeds: string[];         // ce que la personne n'a pas dit mais a besoin
  intelligentQuestions: string[];  // questions concrètes — pas génériques
  hiddenStakes: string[];          // enjeux réels souvent non exprimés
  commonMistakes: string[];        // ce que le coordinateur ne doit PAS faire
  humanPresences: string[];        // types de personnes qui peuvent aider
  risks: Array<{ level: 'critical' | 'high' | 'medium' | 'low'; description: string }>;
  neverReject: boolean;            // toujours true — aucune situation n'est hors périmètre
};

// ─── GRAPHE UNIVERSEL ─────────────────────────────────────────────────────────

export const UNIVERSAL_SITUATIONS: SituationNode[] = [

  // ── HABITAT ──────────────────────────────────────────────────────────────────
  {
    id: 'habitat_reparation',
    domain: 'habitat',
    label: 'Réparation ou problème dans le logement',
    description: 'Quelque chose est cassé, ne fonctionne plus, ou pose un problème dans le logement.',
    keywords: ['logement', 'appartement', 'maison', 'cassé', 'panne', 'fuite', 'serrure', 'fenêtre', 'porte', 'miroir', 'vitre', 'plomberie', 'chauffage', 'électricité', 'ouvert', 'salon', 'chambre', 'cuisine', 'salle de bain'],
    urgencySignals: ['urgent', 'eau', 'coule', 'inondé', 'froid', 'nuit', 'dehors', 'enfermé', 'cassé', 'brisé', 'éclats'],
    implicitNeeds: ['savoir qui appeler', 'savoir si couvert par assurance', 'savoir si responsabilité propriétaire', 'intervention rapide'],
    intelligentQuestions: [
      "C'est quelque chose qui est cassé ou qui ne fonctionne plus ?",
      "C'est urgent là maintenant, ou ça peut attendre ?",
      "Vous êtes locataire ou propriétaire ?",
      "Il y a un risque pour votre sécurité ?",
    ],
    hiddenStakes: ['sécurité du logement', 'droits locataire non connus', 'assurance non déclarée'],
    commonMistakes: ['parler de devis avant de parler de sécurité', 'ignorer le risque électrique ou physique'],
    humanPresences: ['artisan', 'bricoleur de confiance', 'voisin compétent', 'propriétaire', 'gestionnaire', 'serrurier', 'plombier', 'vitrier'],
    risks: [
      { level: 'critical', description: 'Eau près de l\'électricité' },
      { level: 'high', description: 'Personne enfermée ou bloquée' },
      { level: 'medium', description: 'Exposition au froid ou intempéries' },
    ],
    neverReject: true,
  },
  {
    id: 'habitat_bailleur',
    domain: 'habitat',
    label: 'Relations avec bailleur ou propriétaire',
    description: 'Conflit, question ou démarche impliquant un propriétaire, bailleur, ou syndic.',
    keywords: ['bailleur', 'propriétaire', 'loyer', 'charges', 'contrat', 'bail', 'congé', 'expulsion', 'dépôt de garantie', 'syndic', 'copropriété'],
    urgencySignals: ['expulsion', 'huissier', 'délai', 'congé', 'quitter'],
    implicitNeeds: ['connaître ses droits', 'trouver une médiation', 'aide juridique'],
    intelligentQuestions: [
      "Il y a une procédure formelle en cours — lettre, mise en demeure ?",
      "Vous avez un bail écrit ?",
      "Le problème concerne quoi exactement — le loyer, des travaux, une expulsion ?",
    ],
    hiddenStakes: ['droits locataires méconnus', 'délais légaux à respecter'],
    commonMistakes: ['ignorer les délais légaux', 'minimiser une mise en demeure'],
    humanPresences: ['juriste logement', 'association locataires', 'conciliateur', 'assistant social'],
    risks: [
      { level: 'high', description: 'Expulsion sans recours si délais dépassés' },
      { level: 'medium', description: 'Perte de dépôt de garantie' },
    ],
    neverReject: true,
  },

  // ── ÉDUCATION ─────────────────────────────────────────────────────────────────
  {
    id: 'education_soutien_scolaire',
    domain: 'education',
    label: 'Soutien scolaire',
    description: 'Enfant en difficulté scolaire, besoin d\'aide aux devoirs, d\'un tuteur ou d\'un accompagnement pédagogique.',
    keywords: ['soutien scolaire', 'devoirs', 'aide scolaire', 'tuteur', 'cours particuliers', 'école', 'collège', 'lycée', 'enfant', 'fils', 'fille', 'élève', 'note', 'difficulté', 'maths', 'français', 'brevet', 'bac'],
    urgencySignals: ['urgent', 'examen', 'brevet', 'bac', 'session', 'semaine prochaine'],
    implicitNeeds: [
      'trouver une personne de confiance et compétente',
      'adapter le soutien au niveau de l\'enfant',
      'budget accessible',
      'proximité géographique ou visio',
    ],
    intelligentQuestions: [
      "C'est pour quel niveau — primaire, collège, lycée ?",
      "C'est pour quelle matière principalement ?",
      "Vous cherchez un soutien régulier ou plutôt ponctuel ?",
      "Il y a une échéance proche — examen, évaluation ?",
      "Vous préférez quelqu'un qui vient à domicile ou en visio ?",
    ],
    hiddenStakes: [
      'confiance de l\'enfant à reconstruire',
      'contrainte budgétaire non exprimée',
      'besoin d\'accompagnement au-delà du scolaire',
    ],
    commonMistakes: [
      'orienter directement vers une agence commerciale sans explorer les options locales',
      'ignorer la dimension humaine du soutien scolaire',
      'ne pas demander si c\'est urgent (examen proche)',
    ],
    humanPresences: ['étudiant local', 'enseignant retraité', 'bénévole association', 'tuteur indépendant', 'soutien CAF'],
    risks: [
      { level: 'medium', description: 'Décrochage scolaire si non traité rapidement' },
    ],
    neverReject: true,
  },
  {
    id: 'education_orientation',
    domain: 'education',
    label: 'Orientation scolaire ou professionnelle',
    description: 'Choix d\'orientation, réorientation, projet professionnel flou.',
    keywords: ['orientation', 'filière', 'métier', 'reconversion', 'formation', 'cap', 'bts', 'université', 'alternance', 'apprentissage', 'projet professionnel'],
    urgencySignals: ['délai', 'date limite', 'parcoursup', 'dossier'],
    implicitNeeds: ['clarifier ses propres envies', 'comprendre les options disponibles', 'trouver un référent de confiance'],
    intelligentQuestions: [
      "C'est pour vous ou pour votre enfant ?",
      "Il y a une idée de direction ou c'est vraiment une page blanche ?",
      "Il y a une contrainte de temps — dossier à rendre, date limite ?",
    ],
    hiddenStakes: ['pression familiale', 'manque de confiance en soi', 'méconnaissance du marché du travail'],
    commonMistakes: ['proposer des solutions avant de comprendre le projet personnel'],
    humanPresences: ['conseiller d\'orientation', 'mentor professionnel', 'bénévole expérimenté', 'réseau local'],
    risks: [],
    neverReject: true,
  },

  // ── ADMINISTRATIF ─────────────────────────────────────────────────────────────
  {
    id: 'administratif_demarches',
    domain: 'administratif',
    label: 'Démarche administrative',
    description: 'Formulaire, dossier, document à renouveler ou à obtenir.',
    keywords: ['papiers', 'document', 'formulaire', 'dossier', 'caf', 'préfecture', 'impôts', 'carte', 'titre de séjour', 'retraite', 'cpam', 'pôle emploi', 'aides', 'allocations', 'rsa', 'apl'],
    urgencySignals: ['expire', 'délai', 'date limite', 'urgent', 'bloqué', 'sans papiers', 'radié'],
    implicitNeeds: ['savoir quels documents rassembler', 'savoir où se rendre', 'aide pour remplir', 'traduction si nécessaire'],
    intelligentQuestions: [
      "C'est pour quel type de démarche — CAF, préfecture, impôts, autre ?",
      "Il y a une date limite connue ?",
      "Vous avez déjà commencé ou vous partez de zéro ?",
      "Vous avez besoin d'aide pour remplir le dossier ou juste pour savoir où aller ?",
    ],
    hiddenStakes: ['barrière linguistique', 'peur de l\'administration', 'droits non réclamés'],
    commonMistakes: ['répondre de façon générique sans identifier l\'organisme concerné'],
    humanPresences: ['assistant social', 'écrivain public', 'bénévole association', 'CCAS', 'France services'],
    risks: [
      { level: 'high', description: 'Perte de droits par dépassement de délai' },
      { level: 'medium', description: 'Situation de blocage administratif prolongée' },
    ],
    neverReject: true,
  },

  // ── AIDE HUMAINE ──────────────────────────────────────────────────────────────
  {
    id: 'aide_humaine_personne_agee',
    domain: 'aide_humaine',
    label: 'Aide à une personne âgée',
    description: 'Besoin d\'aide, d\'accompagnement ou de présence pour une personne âgée (soi-même ou un proche).',
    keywords: ['personne âgée', 'grand-parent', 'mamie', 'papi', 'vieux', 'retraité', 'parent âgé', 'aide à domicile', 'seul', 'autonomie', 'dépendance', 'ehpad', 'maintien domicile'],
    urgencySignals: ['chute', 'seul', 'urgence', 'hospitalisé', 'ne peut plus'],
    implicitNeeds: ['trouver une présence de confiance', 'maintien à domicile', 'lien social', 'aide pratique quotidienne'],
    intelligentQuestions: [
      "C'est pour vous ou pour un proche ?",
      "La personne vit seule ?",
      "C'est plutôt une aide pratique — courses, ménage — ou un besoin de présence et de compagnie ?",
      "Il y a une urgence en ce moment ou c'est une organisation à mettre en place ?",
    ],
    hiddenStakes: ['épuisement de l\'aidant familial', 'isolement sévère', 'refus d\'aide par la personne elle-même'],
    commonMistakes: ['proposer l\'EHPAD avant d\'explorer les options domicile', 'ignorer l\'aidant familial'],
    humanPresences: ['aide à domicile', 'voisin bienveillant', 'association de bénévoles', 'assistant social', 'SAAD', 'infirmier'],
    risks: [
      { level: 'high', description: 'Isolement total ou impossibilité à se soigner' },
      { level: 'medium', description: 'Chute sans assistance' },
    ],
    neverReject: true,
  },
  {
    id: 'aide_humaine_handicap',
    domain: 'aide_humaine',
    label: 'Aide ou accompagnement pour situation de handicap',
    description: 'Besoins spécifiques liés à un handicap moteur, cognitif, sensoriel ou psychique.',
    keywords: ['handicap', 'mdph', 'aah', 'pcah', 'fauteuil', 'mobilité réduite', 'malvoyant', 'malentendant', 'autisme', 'tsa', 'dyslexie', 'dépression', 'santé mentale', 'auxiliaire de vie'],
    urgencySignals: ['urgent', 'hospitalisé', 'crise', 'seul', 'bloqué'],
    implicitNeeds: ['accès aux droits', 'accompagnement adapté', 'présence humaine qualifiée'],
    intelligentQuestions: [
      "C'est pour vous ou pour quelqu'un de votre entourage ?",
      "Il y a déjà des accompagnements en place ou on part de zéro ?",
      "Qu'est-ce qui manque le plus en ce moment ?",
    ],
    hiddenStakes: ['droits MDPH non réclamés', 'épuisement de l\'aidant', 'isolement'],
    commonMistakes: ['simplifier la situation', 'ignorer la parole de la personne concernée'],
    humanPresences: ['auxiliaire de vie', 'assistant social MDPH', 'association spécialisée', 'aidant formé'],
    risks: [{ level: 'high', description: 'Rupture d\'accompagnement' }],
    neverReject: true,
  },

  // ── SANTÉ LÉGÈRE NON MÉDICALE ─────────────────────────────────────────────────
  {
    id: 'sante_legere',
    domain: 'sante_legere',
    label: 'Santé — besoin d\'orientation ou d\'accompagnement non urgent',
    description: 'Besoin de trouver un professionnel de santé, comprendre une situation médicale légère, ou être accompagné sans urgence vitale.',
    keywords: ['médecin', 'spécialiste', 'rendez-vous', 'généraliste', 'kiné', 'psy', 'dentiste', 'opticien', 'mutuelle', 'remboursement', 'ordonnance', 'pharmacie', 'bien-être', 'fatigue'],
    urgencySignals: ['douleur', 'grave', 'urgent', 'sang', 'ne peut plus'],
    implicitNeeds: ['trouver un médecin acceptant nouveaux patients', 'comprendre le système de santé', 'aide pour prise en charge'],
    intelligentQuestions: [
      "C'est pour vous ou pour quelqu'un d'autre ?",
      "C'est urgent ou vous avez le temps de trouver ?",
      "Il y a déjà un médecin traitant ou vous êtes sans médecin ?",
    ],
    hiddenStakes: ['désert médical', 'difficultés financières non exprimées', 'barrière langue ou numérique'],
    commonMistakes: ['envoyer directement aux urgences pour un besoin non urgent', 'ignorer la question de la mutuelle'],
    humanPresences: ['médecin de garde', 'maison de santé', 'CPAM', 'infirmier libéral', 'pharmacien'],
    risks: [{ level: 'high', description: 'Si symptômes graves — rediriger vers urgences' }],
    neverReject: true,
  },

  // ── MOBILITÉ ──────────────────────────────────────────────────────────────────
  {
    id: 'mobilite',
    domain: 'mobilite',
    label: 'Problème de mobilité ou de déplacement',
    description: 'Problème de voiture, besoin de transport, difficulté à se déplacer.',
    keywords: ['voiture', 'transport', 'bus', 'permis', 'véhicule', 'panne', 'garage', 'déplacement', 'taxi', 'mobilité', 'conducteur', 'trajet'],
    urgencySignals: ['panne', 'urgence', 'coincé', 'bloqué'],
    implicitNeeds: ['trouver un transport adapté', 'aide pour véhicule en panne', 'accès mobilité réduite'],
    intelligentQuestions: [
      "C'est un problème ponctuel ou une question d'organisation sur le long terme ?",
      "La voiture est en panne ou c'est plutôt un besoin de transport régulier ?",
    ],
    hiddenStakes: ['isolement par manque de mobilité', 'impact sur emploi ou rendez-vous médicaux'],
    commonMistakes: ['ignorer l\'impact de la mobilité sur le reste de la situation'],
    humanPresences: ['garagiste de confiance', 'voisin qui peut aider', 'association transport solidaire'],
    risks: [{ level: 'medium', description: 'Isolement si mobilité est la seule option' }],
    neverReject: true,
  },

  // ── VOISINAGE ─────────────────────────────────────────────────────────────────
  {
    id: 'voisinage',
    domain: 'voisinage',
    label: 'Relation de voisinage — conflit ou coordination',
    description: 'Bruit, conflit, demande d\'aide au voisin, ou besoin de coordination de proximité.',
    keywords: ['voisin', 'bruit', 'nuisance', 'conflit de voisinage', 'immeuble', 'copropriété', 'dispute', 'plainte', 'trouble', 'nuisance sonore'],
    urgencySignals: ['violence', 'menace', 'urgence', 'danger'],
    implicitNeeds: ['être entendu', 'trouver une solution amiable', 'comprendre ses droits'],
    intelligentQuestions: [
      "C'est un conflit récent ou ça dure depuis longtemps ?",
      "Vous avez déjà parlé directement au voisin ?",
      "Il y a une menace ou violence dans la situation ?",
      "Vous êtes locataire ? Votre bailleur est au courant ?",
    ],
    hiddenStakes: ['peur d\'escalade', 'droits non connus', 'impact sur bien-être quotidien'],
    commonMistakes: ['minimiser le conflit', 'proposer une action légale avant d\'explorer la médiation'],
    humanPresences: ['médiateur de voisinage', 'bailleur', 'conciliateur de justice', 'mairie'],
    risks: [{ level: 'high', description: 'Escalade vers violence si non traité' }],
    neverReject: true,
  },

  // ── RÉPARATION ────────────────────────────────────────────────────────────────
  {
    id: 'reparation',
    domain: 'reparation',
    label: 'Réparation d\'objet, appareil ou équipement',
    description: 'Quelque chose à réparer — appareil électroménager, objet du quotidien, vélo, meuble.',
    keywords: ['réparer', 'réparation', 'lave-linge', 'réfrigérateur', 'télé', 'ordinateur', 'téléphone', 'vélo', 'meuble', 'chaise', 'cassé', 'en panne', 'ne marche plus'],
    urgencySignals: ['urgent', 'lave-linge', 'réfrigérateur', 'nourriture', 'perd tout'],
    implicitNeeds: ['trouver quelqu\'un de compétent et fiable', 'ne pas se faire arnaquer', 'comprendre si réparation vaut le coût'],
    intelligentQuestions: [
      "C'est quoi l'objet à réparer ?",
      "C'est en panne totale ou ça fonctionne partiellement ?",
      "Vous savez si c'est encore sous garantie ?",
    ],
    hiddenStakes: ['budget limité pour remplacement', 'impact fort si objet indispensable (lave-linge, frigo)'],
    commonMistakes: ['orienter vers le remplacement sans explorer la réparation'],
    humanPresences: ['réparateur local', 'repair café', 'bricoleur de confiance', 'revendeur agréé'],
    risks: [{ level: 'medium', description: 'Urgence si objet indispensable (lave-linge, réfrigérateur)' }],
    neverReject: true,
  },

  // ── ACCOMPAGNEMENT ────────────────────────────────────────────────────────────
  {
    id: 'accompagnement',
    domain: 'accompagnement',
    label: 'Accompagnement humain — besoin de présence',
    description: 'Besoin d\'être accompagné dans une démarche, un rendez-vous, une situation difficile.',
    keywords: ['accompagner', 'accompagnement', 'seul', 'je n\'ose pas', 'j\'ai besoin de quelqu\'un', 'rendez-vous médical', 'entretien', 'tribunal', 'démarche'],
    urgencySignals: ['rendez-vous demain', 'tribunal', 'urgence'],
    implicitNeeds: ['présence rassurante', 'quelqu\'un qui comprend la situation', 'soutien non professionnel'],
    intelligentQuestions: [
      "C'est pour quel type de démarche ou moment ?",
      "Il y a une date ou un rendez-vous en vue ?",
      "Vous cherchez quelqu'un du coin ou ça peut être à distance ?",
    ],
    hiddenStakes: ['anxiété sociale', 'isolement', 'situation de vulnérabilité'],
    commonMistakes: ['sous-estimer le besoin de présence physique', 'orienter vers des services professionnels quand un bénévole suffit'],
    humanPresences: ['bénévole de confiance', 'association d\'accompagnement', 'voisin solidaire', 'pair aidant'],
    risks: [{ level: 'medium', description: 'Rendez-vous manqué si non accompagné' }],
    neverReject: true,
  },

  // ── SOUTIEN ───────────────────────────────────────────────────────────────────
  {
    id: 'soutien',
    domain: 'soutien',
    label: 'Soutien moral, émotionnel ou psychosocial',
    description: 'Besoin d\'être écouté, de parler, de trouver un espace de parole sans jugement.',
    keywords: ['parler à quelqu\'un', 'écoute', 'soutien moral', 'épuisé', 'je n\'en peux plus', 'seul', 'pas bien', 'déprimé', 'anxieux', 'stressé', 'perdu', 'à bout'],
    urgencySignals: ['crise', 'danger', 'idées noires', 'suicide', 'ne veut plus'],
    implicitNeeds: ['être entendu sans jugement', 'ne pas être seul', 'trouver des ressources doucement'],
    intelligentQuestions: [
      "Vous cherchez plutôt quelqu'un à qui parler librement, ou quelqu'un qui peut vous aider concrètement à avancer ?",
      "C'est une situation ponctuelle ou quelque chose qui dure depuis un moment ?",
    ],
    hiddenStakes: ['crise sous-jacente non exprimée', 'isolement profond', 'honte de demander de l\'aide'],
    commonMistakes: [
      'minimiser la détresse émotionnelle',
      'proposer une thérapie payante immédiatement',
      'bombarder de questions avant d\'avoir établi confiance',
      'poser des questions psychologiques génériques ("comment vous sentez-vous ?")',
    ],
    humanPresences: ['bénévole d\'écoute', 'ligne d\'écoute', 'pair aidant', 'association locale', 'psychologue si besoin'],
    risks: [
      { level: 'critical', description: 'Risque suicidaire si mots comme "idées noires", "plus envie", "en finir"' },
      { level: 'high', description: 'Détresse sévère nécessitant orientation vers professionnel' },
    ],
    neverReject: true,
  },

  // ── URGENCE DU QUOTIDIEN ──────────────────────────────────────────────────────
  {
    id: 'urgence_quotidien',
    domain: 'urgence_quotidien',
    label: 'Urgence du quotidien — besoin immédiat',
    description: 'Situation soudaine nécessitant une aide rapide, sans être une urgence médicale.',
    keywords: ['urgent', 'maintenant', 'vite', 'immédiatement', 'aujourd\'hui', 'ce soir', 'bloqué', 'coincé', 'plus rien', 'dehors'],
    urgencySignals: ['nuit', 'froid', 'enfant', 'seul', 'danger', 'ce soir'],
    implicitNeeds: ['aide immédiate', 'ressource accessible maintenant', 'ne pas rester seul avec la situation'],
    intelligentQuestions: [
      "C'est quoi l'urgence précise là maintenant ?",
      "Vous êtes seul ou il y a quelqu'un avec vous ?",
      "Il y a un risque pour votre sécurité ou celle de quelqu'un d'autre ?",
    ],
    hiddenStakes: ['vulnérabilité cachée', 'enfant ou personne dépendante impliquée'],
    commonMistakes: ['traiter l\'urgence du quotidien comme une urgence médicale', 'minimiser'],
    humanPresences: ['voisin de confiance', 'association d\'urgence sociale', 'SAMU social (115)'],
    risks: [
      { level: 'high', description: 'Enfant ou personne vulnérable impliquée' },
      { level: 'medium', description: 'Exposition au froid ou à l\'insécurité' },
    ],
    neverReject: true,
  },

  // ── COORDINATION FAMILIALE ────────────────────────────────────────────────────
  {
    id: 'coordination_familiale',
    domain: 'coordination_familiale',
    label: 'Coordination familiale ou entre proches',
    description: 'Organisation autour d\'un proche — parent âgé, enfant, proche malade — coordination entre membres de la famille.',
    keywords: ['famille', 'parent', 'frère', 'sœur', 'enfant', 'proche', 'coordination', 'organisation', 'aidant', 'aidant familial', 'garde', 'relais'],
    urgencySignals: ['hospitalisation', 'urgence', 'seul', 'crise', 'personne dépendante'],
    implicitNeeds: ['coordination entre plusieurs personnes', 'trouver un relais', 'ne pas tout porter seul'],
    intelligentQuestions: [
      "C'est pour organiser quoi exactement — soins, présence, démarches ?",
      "Il y a d'autres membres de la famille impliqués ou vous êtes seul à gérer ?",
      "C'est une situation récente ou ça dure depuis longtemps ?",
    ],
    hiddenStakes: ['épuisement de l\'aidant', 'conflits familiaux sous-jacents', 'culpabilité'],
    commonMistakes: ['ignorer l\'épuisement de l\'aidant', 'se concentrer uniquement sur le bénéficiaire'],
    humanPresences: ['travailleur social', 'médiateur familial', 'association aidants', 'coordinateur de soins'],
    risks: [{ level: 'high', description: 'Épuisement de l\'aidant pouvant mener à une rupture d\'accompagnement' }],
    neverReject: true,
  },

  // ── ISOLEMENT ─────────────────────────────────────────────────────────────────
  {
    id: 'isolement',
    domain: 'isolement',
    label: 'Isolement social ou rupture de lien',
    description: 'Personne seule, sans réseau, qui cherche du lien, de la présence ou à briser l\'isolement.',
    keywords: ['seul', 'isolé', 'personne', 'pas d\'amis', 'pas de réseau', 'solitude', 'lien social', 'rencontrer des gens', 'activité', 'sortir'],
    urgencySignals: ['déprimé', 'pas bien', 'idées noires', 'à bout'],
    implicitNeeds: ['lien humain', 'activité de groupe', 'sentiment d\'appartenance'],
    intelligentQuestions: [
      "Vous cherchez plutôt à rencontrer des gens, à trouver une activité, ou simplement quelqu'un à qui parler ?",
      "Il y a quelque chose de spécifique qui vous empêche de sortir ou de rencontrer des gens ?",
    ],
    hiddenStakes: ['dépression sous-jacente', 'handicap ou mobilité limitée', 'barrière langue'],
    commonMistakes: ['minimiser l\'isolement comme simple solitude', 'proposer des solutions numériques pour un besoin physique'],
    humanPresences: ['association de quartier', 'bénévole de visite', 'groupe local', 'voisin bienveillant'],
    risks: [
      { level: 'high', description: 'Dépression si isolement sévère et prolongé' },
    ],
    neverReject: true,
  },

  // ── BESOINS LOCAUX ────────────────────────────────────────────────────────────
  {
    id: 'besoins_locaux',
    domain: 'besoins_locaux',
    label: 'Besoin local — trouver quelqu\'un ou quelque chose près de chez soi',
    description: 'Besoin de trouver une ressource, un service, une personne compétente à proximité.',
    keywords: ['proche de chez moi', 'dans mon quartier', 'local', 'autour de moi', 'trouver quelqu\'un', 'recommandation', 'de confiance', 'bon', 'fiable'],
    urgencySignals: ['urgent', 'maintenant', 'rapidement'],
    implicitNeeds: ['confiance', 'proximité', 'recommandation humaine plutôt qu\'algorithme'],
    intelligentQuestions: [
      "C'est pour trouver quoi exactement — une personne, un service, une ressource ?",
      "Il y a une urgence de temps ?",
      "Vous avez déjà essayé de trouver ou c'est le début de la recherche ?",
    ],
    hiddenStakes: ['méfiance envers les plateformes automatiques', 'besoin de recommandation humaine'],
    commonMistakes: ['renvoyer vers une liste générique sans personnalisation'],
    humanPresences: ['réseau local', 'association de quartier', 'voisinage', 'mairie'],
    risks: [],
    neverReject: true,
  },
];

// ─── Lookup functions ─────────────────────────────────────────────────────────

export function findUniversalSituation(text: string): SituationNode[] {
  const t = text.toLowerCase();
  const scored = UNIVERSAL_SITUATIONS.map(node => {
    const kwMatches = node.keywords.filter(kw => t.includes(kw)).length;
    const urgencyBonus = node.urgencySignals.some(s => t.includes(s)) ? 1 : 0;
    return { node, score: kwMatches + urgencyBonus };
  });
  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(s => s.node);
}

export function getDomainLabel(domain: UniversalDomain): string {
  const labels: Record<UniversalDomain, string> = {
    habitat: 'Habitat',
    education: 'Éducation',
    administratif: 'Administratif',
    aide_humaine: 'Aide humaine',
    sante_legere: 'Santé',
    mobilite: 'Mobilité',
    voisinage: 'Voisinage',
    reparation: 'Réparation',
    accompagnement: 'Accompagnement',
    soutien: 'Soutien',
    urgence_quotidien: 'Urgence quotidien',
    coordination_familiale: 'Coordination familiale',
    isolement: 'Isolement',
    besoins_locaux: 'Besoins locaux',
  };
  return labels[domain] || domain;
}

export function buildUniversalKnowledgeContext(text: string): string {
  const nodes = findUniversalSituation(text);
  if (!nodes.length) return '';

  const node = nodes[0];
  const criticalRisks = node.risks.filter(r => r.level === 'critical' || r.level === 'high');

  const parts: string[] = [
    `[SITUATION : ${node.label}]`,
    `DOMAINE : ${getDomainLabel(node.domain)}`,
  ];

  if (criticalRisks.length > 0) {
    parts.push(`RISQUES : ${criticalRisks.map(r => r.description).join(' / ')}`);
  }

  if (node.implicitNeeds.length > 0) {
    parts.push(`BESOINS IMPLICITES : ${node.implicitNeeds.slice(0, 3).join(' / ')}`);
  }

  if (node.intelligentQuestions.length > 0) {
    parts.push(`QUESTIONS PRIORITAIRES : ${node.intelligentQuestions.slice(0, 2).join(' | ')}`);
  }

  if (node.hiddenStakes.length > 0) {
    parts.push(`ENJEUX CACHÉS : ${node.hiddenStakes.slice(0, 2).join(' / ')}`);
  }

  parts.push(`PRÉSENCES HUMAINES POSSIBLES : ${node.humanPresences.slice(0, 3).join(', ')}`);
  parts.push(`ERREURS À ÉVITER : ${node.commonMistakes.slice(0, 2).join(' / ')}`);

  return parts.join('\n');
}
