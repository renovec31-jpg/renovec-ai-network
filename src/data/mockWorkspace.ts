import type { MatchingProfile, ContextLine } from '../contexts/WorkspaceContext';

export const MOCK_MATCHING_PROFILES: MatchingProfile[] = [
  {
    id: 'mp-1',
    name: 'Sophie Delacroix',
    tagline: 'Architecte d\'interieur · Renovation ecologique',
    city: 'Lyon 3e',
    avatar_url: null,
    capabilities: ['Renovation thermique', 'Design bioclimatique', 'Accompagnement chantier'],
    score: 94,
    availability: 'Disponible cette semaine',
  },
  {
    id: 'mp-2',
    name: 'Atelier Bois & Pierre',
    tagline: 'Menuiserie et maconnerie traditionnelle',
    city: 'Villeurbanne',
    avatar_url: null,
    capabilities: ['Menuiserie sur-mesure', 'Restauration pierre', 'Isolation naturelle'],
    score: 88,
    availability: 'Sous 10 jours',
  },
  {
    id: 'mp-3',
    name: 'Marc Fontaine',
    tagline: 'Plombier-chauffagiste · Systemes basse consommation',
    city: 'Lyon 7e',
    avatar_url: null,
    capabilities: ['Pompe a chaleur', 'Plancher chauffant', 'Solaire thermique'],
    score: 85,
    availability: 'Disponible la semaine prochaine',
  },
  {
    id: 'mp-4',
    name: 'Cooperative Les Toits Verts',
    tagline: 'Isolation et toitures vegetalisees',
    city: 'Caluire',
    avatar_url: null,
    capabilities: ['Isolation combles', 'Toiture vegetalisee', 'Etancheite ecologique'],
    score: 82,
    availability: 'Disponible sous 15 jours',
  },
];

export const MOCK_CONTEXT_ISOLATION: ContextLine[] = [
  { label: 'Situation', value: 'Renovation thermique d\'un appartement T3' },
  { label: 'Lieu', value: 'Lyon 3e arrondissement' },
  { label: 'Urgence', value: 'Moyenne — avant l\'hiver prochain' },
  { label: 'Budget', value: 'Autour de 15 000 EUR, aides comprises' },
  { label: 'Contrainte', value: 'Copropriete — accord syndic necessaire' },
];

export const MOCK_CONTEXT_PLOMBERIE: ContextLine[] = [
  { label: 'Situation', value: 'Fuite sous evier persistante' },
  { label: 'Lieu', value: 'Lyon 7e' },
  { label: 'Urgence', value: 'Haute — degats des eaux possibles' },
  { label: 'Contrainte', value: 'Locataire — besoin facture pour proprietaire' },
];

export const MOCK_CONTEXT_NEUTRAL: ContextLine[] = [];

export const MOCK_PUBLICATION_DRAFT = {
  title: 'Recherche artisan pour isolation combles',
  description: 'Appartement T3, 65m2, dernier etage. Les combles sont accessibles mais non isoles. Recherche un professionnel pour isolation par soufflage ou panneaux. Copropriete de 12 lots, accord du syndic obtenu.',
  tags: ['isolation', 'combles', 'copropriete', 'lyon'],
};

export const MOCK_PROFILE_DETAIL = {
  id: 'mp-1',
  name: 'Sophie Delacroix',
  tagline: 'Architecte d\'interieur specialisee en renovation ecologique',
  city: 'Lyon 3e',
  bio: 'Depuis 12 ans, j\'accompagne des particuliers et des coproprietes dans leurs projets de renovation. Mon approche combine performance thermique et qualite de vie au quotidien.',
  capabilities: ['Renovation thermique', 'Design bioclimatique', 'Accompagnement chantier', 'Etude thermique', 'Dossier aides financieres'],
  services: [
    { title: 'Diagnostic & conseil', price: 'A partir de 250 EUR', format: 'Visite + rapport' },
    { title: 'Accompagnement chantier complet', price: 'Sur devis', format: 'Suivi mensuel' },
    { title: 'Dossier MaPrimeRenov', price: '150 EUR', format: 'Dossier cle en main' },
  ],
  trustScore: 4.7,
  reviewCount: 23,
  availability: 'Disponible cette semaine',
  responseTime: 'Repond en moins de 2h',
};
