export type MockCapability = {
  id: string;
  display_name: string;
  avatar_url: string;
  title: string;
  summary: string;
  tagline: string;
  explicit_capabilities: string[];
  implicit_capabilities: string[];
  success_contexts: string[];
  relational_style: string;
  help_formats: string[];
  availability: string;
  impact_summary: string;
  trust_signals: {
    clarity: number;
    usefulness: number;
    reliability: number;
    pedagogy: number;
    follow_through: number;
  };
  qualitative_reads: string[];
  contributions: Array<{
    context: string;
    contribution: string;
    impact: string;
  }>;
  sav_points: number;
};

export const MOCK_CAPABILITIES: MockCapability[] = [
  {
    id: 'mock-1',
    display_name: 'Camille Renard',
    avatar_url: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&dpr=2',
    title: 'Clarté dans les transitions professionnelles',
    tagline: 'Aide les personnes qui doutent à voir ce qu\'elles savent déjà.',
    summary: 'J\'accompagne des personnes qui vivent un moment charnière — reconversion, prise de décision difficile, perte de sens — et qui ont besoin de mettre de l\'ordre dans leur réflexion avant d\'agir. Ce que j\'apporte n\'est pas une réponse toute faite, c\'est une capacité à poser les bonnes questions au bon moment.',
    explicit_capabilities: ['Accompagnement de transition', 'Clarification de décision', 'Écoute active structurée', 'Reformulation de projet de vie'],
    implicit_capabilities: ['Détection des non-dits', 'Rassurance sans simplification', 'Mise en mouvement douce'],
    success_contexts: [
      'Reconversion professionnelle après 10+ ans dans un secteur',
      'Décision entre deux directions de vie opposées',
      'Sortie de burnout ou période d\'épuisement professionnel',
      'Premier pas vers une activité indépendante',
    ],
    relational_style: 'Je m\'adapte au rythme de chaque personne. Je pose beaucoup de questions et je reformule plutôt que je ne prescris. Certains me disent qu\'après un échange, ils ont « enfin eu l\'impression d\'être vraiment entendus ».',
    help_formats: ['Échange oral', 'Diagnostic écrit', 'Accompagnement sur plusieurs échanges'],
    availability: 'Disponible cette semaine',
    impact_summary: '47 situations accompagnées · Principalement des transitions de vie et des blocages professionnels',
    trust_signals: { clarity: 92, usefulness: 89, reliability: 95, pedagogy: 87, follow_through: 91 },
    qualitative_reads: [
      'Apporte souvent de la clarté avant une décision importante',
      'Très utile dans les situations de doute prolongé',
      'Forte capacité de rassurance sans simplification excessive',
    ],
    contributions: [
      { context: 'Reconversion d\'une juriste vers la formation', contribution: 'Trois échanges pour clarifier les peurs réelles vs les peurs imaginées, identifier les compétences transférables non nommées', impact: 'Décision prise avec confiance, formation lancée deux mois plus tard' },
      { context: 'Burnout d\'un cadre dirigeant', contribution: 'Accompagnement pour mettre des mots sur ce qui s\'est passé et poser les premières bases de reconstruction', impact: 'Première vraie prise de recul depuis 18 mois' },
    ],
    sav_points: 214,
  },
  {
    id: 'mock-2',
    display_name: 'Thomas Lebrun',
    avatar_url: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&dpr=2',
    title: 'Diagnostic technique et résolution de problèmes complexes',
    tagline: 'Trouve ce que les autres n\'ont pas cherché au bon endroit.',
    summary: 'Ma valeur est dans la capacité à poser un diagnostic rigoureux avant d\'agir. Je travaille dans les situations où plusieurs tentatives ont déjà échoué — parce que le problème n\'avait pas encore été correctement posé. Je combine une approche méthodique avec une sensibilité aux dimensions humaines et organisationnelles.',
    explicit_capabilities: ['Diagnostic système', 'Analyse de cause racine', 'Architecture de solution', 'Résolution sous contrainte'],
    implicit_capabilities: ['Identification des angles morts', 'Reformulation du problème réel', 'Communication technique non-technique'],
    success_contexts: [
      'Problèmes techniques répétitifs dont la cause n\'a pas été identifiée',
      'Projets qui ont dérapé malgré plusieurs tentatives de correction',
      'Situations où plusieurs personnes ont des diagnostics contradictoires',
      'Transition ou migration de système avec risque élevé',
    ],
    relational_style: 'Je pose beaucoup de questions avant de donner un avis. Je pars du principe que la description du problème n\'est jamais le problème lui-même. Je traduis le technique en langage accessible quand c\'est nécessaire.',
    help_formats: ['Diagnostic écrit', 'Échange oral', 'Mission courte de 2-3 jours', 'Revue de situation'],
    availability: 'Disponible maintenant',
    impact_summary: '31 diagnostics réalisés · Spécialisé dans les situations où plusieurs tentatives ont déjà échoué',
    trust_signals: { clarity: 94, usefulness: 96, reliability: 93, pedagogy: 84, follow_through: 97 },
    qualitative_reads: [
      'Identifie rapidement ce que les autres ont manqué',
      'Très utile quand la situation semble complexe sans raison claire',
      'Fiable même dans les délais contraints',
    ],
    contributions: [
      { context: 'Dépannage d\'une PME avec des pannes récurrentes inexpliquées', contribution: 'Diagnostic système sur 2 jours révélant une interaction entre deux logiciels rarement couplés', impact: 'Zéro panne dans les 4 mois suivants' },
      { context: 'Projet de migration ralenti depuis 6 mois', contribution: 'Identification de la vraie cause de blocage (politique interne, pas technique) et proposition d\'approche alternative', impact: 'Déblocage complet en 3 semaines' },
    ],
    sav_points: 187,
  },
  {
    id: 'mock-3',
    display_name: 'Sophie Marchand',
    avatar_url: 'https://images.pexels.com/photos/1587009/pexels-photo-1587009.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&dpr=2',
    title: 'Intelligence financière pour non-financiers',
    tagline: 'Rend lisibles les chiffres qui bloquent ceux qui ne sont pas formés à les lire.',
    summary: 'Je traduis la finance pour les personnes qui n\'ont pas de formation comptable mais qui ont besoin de comprendre leur situation financière pour décider. Mon rôle n\'est pas de faire à leur place — c\'est de rendre compréhensible ce qui paraît opaque, et de poser les bases d\'une autonomie réelle.',
    explicit_capabilities: ['Lecture de bilan', 'Plan de financement', 'Gestion de trésorerie', 'Dossier bancaire', 'Compréhension fiscale basique'],
    implicit_capabilities: ['Pédagogie de la complexité', 'Désanxiété face aux chiffres', 'Orientation vers l\'autonomie'],
    success_contexts: [
      'Première activité indépendante sans culture financière',
      'Dossier de financement à monter pour une banque ou un investisseur',
      'Situation financière floue après plusieurs années d\'activité',
      'Décision d\'investissement ou de développement à financer',
    ],
    relational_style: 'Je n\'ai jamais eu de patience pour les explications condescendantes. J\'explique simplement parce que les choses sont simples quand on les tient par le bon bout. Je commence toujours par ce que la personne comprend déjà.',
    help_formats: ['Échange oral', 'Diagnostic financier écrit', 'Atelier de compréhension', 'Mission courte'],
    availability: 'Disponible cette semaine',
    impact_summary: '63 accompagnements · Majoritairement des indépendants et petites structures',
    trust_signals: { clarity: 97, usefulness: 94, reliability: 91, pedagogy: 98, follow_through: 89 },
    qualitative_reads: [
      'Exceptionnellement claire, même pour des sujets difficiles',
      'Transforme l\'anxiété en compréhension actionnable',
      'Forte pédagogie, zéro condescendance',
    ],
    contributions: [
      { context: 'Artisan voulant structurer son activité', contribution: 'Explication complète du bilan, du compte de résultat et du plan de trésorerie sur deux séances de 1h30', impact: 'Premier dossier bancaire monté et accepté de manière autonome' },
      { context: 'Freelance en difficulté de trésorerie', contribution: 'Diagnostic rapide, identification des fuites non visibles, plan d\'action sur 3 mois', impact: 'Retour à l\'équilibre en 2 mois' },
    ],
    sav_points: 298,
  },
  {
    id: 'mock-4',
    display_name: 'Julien Faure',
    avatar_url: 'https://images.pexels.com/photos/3796217/pexels-photo-3796217.jpeg?auto=compress&cs=tinysrgb&w=160&h=160&dpr=2',
    title: 'Médiation et résolution de tensions humaines',
    tagline: 'Crée les conditions pour que deux parties puissent s\'entendre sans s\'humilier.',
    summary: 'Je travaille dans les situations de tension — conflits d\'équipe, désaccords entre associés, ruptures de confiance dans une relation professionnelle. Ma capacité particulière est de rendre possible une conversation que les deux parties avaient renoncé à avoir.',
    explicit_capabilities: ['Médiation de conflit', 'Facilitation de dialogue', 'Négociation de désaccord', 'Restauration de confiance'],
    implicit_capabilities: ['Neutralité effective', 'Reformulation sans jugement', 'Désescalade émotionnelle'],
    success_contexts: [
      'Conflit entre associés ou co-fondateurs',
      'Tension d\'équipe non résolue malgré plusieurs tentatives',
      'Rupture de confiance entre manager et collaborateur',
      'Désaccord profond sur une décision stratégique',
    ],
    relational_style: 'Je ne prends pas parti. Je facilite. Je crée un espace où les deux parties peuvent dire ce qu\'elles n\'ont pas pu dire — et entendre ce qu\'elles n\'avaient pas voulu entendre. Certains me disent que j\'ai une capacité étrange à rendre les gens calmes.',
    help_formats: ['Échange oral', 'Session de médiation', 'Accompagnement sur plusieurs échanges'],
    availability: 'Disponible ce mois',
    impact_summary: '28 médiations · Taux de résolution positive estimé à 78%',
    trust_signals: { clarity: 88, usefulness: 91, reliability: 94, pedagogy: 82, follow_through: 96 },
    qualitative_reads: [
      'Capable de désamorcer des situations très tendues',
      'Grande neutralité perçue par les deux parties',
      'Très fiable sur la durée, même dans les situations complexes',
    ],
    contributions: [
      { context: 'Conflit entre deux co-fondateurs sur la direction produit', contribution: 'Trois sessions de médiation pour identifier les vrais désaccords sous les désaccords de surface', impact: 'Accord trouvé, collaboration préservée, rôles clarifiés' },
      { context: 'Tension d\'équipe après restructuration', contribution: 'Facilitation d\'une réunion impossible, recadrage sur les enjeux partagés', impact: 'Reprise de la collaboration en deux semaines' },
    ],
    sav_points: 156,
  },
];
