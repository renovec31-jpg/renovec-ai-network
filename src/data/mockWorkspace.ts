import type { MatchingProfile, ContextLine } from '../contexts/WorkspaceContext';

export const MOCK_MATCHING_PROFILES: MatchingProfile[] = [
  {
    id: 'mp-1',
    name: 'Laurent Esquié',
    tagline: 'Plombier-chauffagiste · Spécialiste PAC et plancher chauffant',
    city: 'Merville (31)',
    avatar_url: null,
    capabilities: ['Pompe à chaleur', 'Plancher chauffant', 'Dépannage urgent'],
    score: 96,
    availability: 'Disponible demain matin',
  },
  {
    id: 'mp-2',
    name: 'Claire Fontan',
    tagline: 'Architecte DPLG · Rénovation énergétique et patrimoine',
    city: 'Toulouse (31)',
    avatar_url: null,
    capabilities: ['Étude thermique', 'Suivi chantier', 'Dossier MaPrimeRénov'],
    score: 91,
    availability: 'Disponible cette semaine',
  },
  {
    id: 'mp-3',
    name: 'Rémi Delcros',
    tagline: 'Maçon · Pierre, brique toulousaine et enduits à la chaux',
    city: 'L\'Isle-Jourdain (32)',
    avatar_url: null,
    capabilities: ['Maçonnerie traditionnelle', 'Enduits chaux', 'Rénovation façade'],
    score: 87,
    availability: 'Sous 10 jours',
  },
];

export const MOCK_CONTEXT_RENOVATION: ContextLine[] = [
  { label: 'Situation', value: 'Rénovation énergétique maison toulousaine' },
  { label: 'Lieu', value: 'Merville, Haute-Garonne' },
  { label: 'Urgence', value: 'Moyenne — avant l\'hiver' },
  { label: 'Budget', value: 'Enveloppe 20 000 EUR avec aides' },
  { label: 'Contrainte', value: 'Bâtiment ancien — respect du bâti' },
];

export const MOCK_CONTEXT_PLOMBERIE: ContextLine[] = [
  { label: 'Situation', value: 'Problème de plomberie / chauffage' },
  { label: 'Lieu', value: 'Toulouse et environs' },
  { label: 'Urgence', value: 'Haute — intervention rapide souhaitée' },
  { label: 'Contrainte', value: 'Disponibilité immédiate nécessaire' },
];

export const MOCK_PUBLICATION_DRAFT = {
  title: 'Recherche artisan pour isolation combles — maison 1960',
  description: 'Maison individuelle de 1960, 110m2, quartier Lardenne à Toulouse. Combles perdus non isolés, accès trappe grenier. Recherche professionnel pour isolation par soufflage (ouate de cellulose ou laine minérale). DPE actuel : E. Objectif : passer en C minimum. Budget prévu avec MaPrimeRénov.',
  tags: ['isolation', 'combles', 'toulouse', 'maison-1960', 'DPE'],
};

export const MOCK_PROFILE_DETAIL = {
  id: 'mp-1',
  name: 'Laurent Esquié',
  tagline: 'Plombier-chauffagiste depuis 18 ans · Merville et grand Toulouse',
  city: 'Merville (31)',
  bio: 'Installé à Merville depuis 2008. Je travaille principalement sur les systèmes de chauffage basse consommation : pompes à chaleur, planchers chauffants, solaire thermique. Intervention rapide pour les urgences plomberie dans un rayon de 30 km.',
  capabilities: ['Pompe à chaleur air/eau', 'Plancher chauffant', 'Solaire thermique', 'Dépannage plomberie', 'Entretien chaudière'],
  services: [
    { title: 'Diagnostic chauffage', price: 'Gratuit sur devis', format: 'Visite 1h + rapport' },
    { title: 'Installation PAC', price: 'À partir de 8 000 EUR', format: 'Fourniture + pose' },
    { title: 'Dépannage urgent', price: '85 EUR/intervention', format: 'Déplacement inclus 30 km' },
  ],
  trustScore: 4.8,
  reviewCount: 31,
  availability: 'Disponible demain matin',
  responseTime: 'Répond en moins d\'1h',
};
