export interface MockProfile {
  id: string;
  prenom: string;
  ville: string;
  capacite: string;
  tags: string[];
  disponibilite: 'disponible' | 'bientôt';
  pts: number;
  color: string;
}

export const MOCK_PROFILES: MockProfile[] = [
  { id: 'm1', prenom: 'Thomas', ville: 'Toulouse', capacite: 'Comptabilité et gestion', tags: ['micro-entreprise', 'bilan', 'TVA'], disponibilite: 'disponible', pts: 84, color: '#F26522' },
  { id: 'm2', prenom: 'Camille', ville: 'Albi', capacite: 'Dépannage informatique', tags: ['PC', 'Mac', 'réseau'], disponibilite: 'disponible', pts: 67, color: '#2ECC71' },
  { id: 'm3', prenom: 'Léo', ville: 'Montauban', capacite: 'Bricolage et petits travaux', tags: ['plomberie', 'électricité', 'montage'], disponibilite: 'bientôt', pts: 45, color: '#3498DB' },
  { id: 'm4', prenom: 'Marine', ville: 'Castres', capacite: 'Cours de guitare', tags: ['acoustique', 'débutant', 'intermédiaire'], disponibilite: 'disponible', pts: 52, color: '#E91E8C' },
  { id: 'm5', prenom: 'Arnaud', ville: 'Toulouse', capacite: 'Aide à la rédaction de CV', tags: ['entretien', 'reconversion', 'LinkedIn'], disponibilite: 'disponible', pts: 91, color: '#F39C12' },
  { id: 'm6', prenom: 'Sophie', ville: 'Muret', capacite: 'Écoute active et soutien', tags: ['anxiété', 'solitude', 'transition'], disponibilite: 'disponible', pts: 73, color: '#1ABC9C' },
  { id: 'm7', prenom: 'Karim', ville: 'Blagnac', capacite: 'Formation Excel avancé', tags: ['tableaux croisés', 'macros', 'VBA'], disponibilite: 'disponible', pts: 58, color: '#E74C3C' },
  { id: 'm8', prenom: 'Nathalie', ville: 'Colomiers', capacite: 'Accompagnement parentalité', tags: ['adolescent', 'communication', 'éducation'], disponibilite: 'bientôt', pts: 62, color: '#16A085' },
  { id: 'm9', prenom: 'Florian', ville: 'Tournefeuille', capacite: 'Réparation vélo', tags: ['route', 'VTT', 'entretien'], disponibilite: 'disponible', pts: 39, color: '#D35400' },
  { id: 'm10', prenom: 'Émilie', ville: 'Ramonville', capacite: 'Cours de yoga', tags: ['hatha', 'débutant', 'relaxation'], disponibilite: 'disponible', pts: 81, color: '#8E44AD' },
  { id: 'm11', prenom: 'Baptiste', ville: 'Toulouse', capacite: 'Développement web', tags: ['React', 'Node', 'API'], disponibilite: 'bientôt', pts: 96, color: '#FF6B35' },
  { id: 'm12', prenom: 'Lola', ville: 'Balma', capacite: 'Ateliers couture', tags: ['retouche', 'patron', 'machine'], disponibilite: 'disponible', pts: 44, color: '#2ECC71' },
];

export interface MockFeedItem {
  id: string;
  type: 'service' | 'object' | 'demand';
  title: string;
  author: string;
  city: string;
  time: string;
  color: string;
}

export const MOCK_FEED: MockFeedItem[] = [
  { id: 'f1', type: 'service', title: 'Cours de piano pour débutant adulte', author: 'Claire M.', city: 'Toulouse', time: 'il y a 12 min', color: '#60a5fa' },
  { id: 'f2', type: 'demand', title: 'Recherche aide pour déménagement samedi', author: 'Youssef B.', city: 'Blagnac', time: 'il y a 28 min', color: '#fbbf24' },
  { id: 'f3', type: 'object', title: 'Machine à coudre Singer en bon état', author: 'Monique D.', city: 'Muret', time: 'il y a 45 min', color: '#22c55e' },
  { id: 'f4', type: 'service', title: 'Aide administrative et courriers', author: 'Antoine R.', city: 'Colomiers', time: 'il y a 1h', color: '#60a5fa' },
  { id: 'f5', type: 'demand', title: 'Besoin d\'un plombier pour fuite urgente', author: 'Nadia K.', city: 'Ramonville', time: 'il y a 1h30', color: '#fbbf24' },
  { id: 'f6', type: 'service', title: 'Promenade de chiens — disponible matin', author: 'Hugo L.', city: 'Toulouse', time: 'il y a 2h', color: '#60a5fa' },
  { id: 'f7', type: 'object', title: 'Lot de livres jeunesse (30 livres)', author: 'Sandrine V.', city: 'Balma', time: 'il y a 2h30', color: '#22c55e' },
  { id: 'f8', type: 'service', title: 'Soutien scolaire maths collège', author: 'Lucas P.', city: 'Tournefeuille', time: 'il y a 3h', color: '#60a5fa' },
  { id: 'f9', type: 'demand', title: 'Cherche quelqu\'un pour garder un chat 1 semaine', author: 'Emma F.', city: 'Toulouse', time: 'il y a 3h', color: '#fbbf24' },
  { id: 'f10', type: 'service', title: 'Initiation photo smartphone', author: 'Didier C.', city: 'Albi', time: 'il y a 4h', color: '#60a5fa' },
  { id: 'f11', type: 'object', title: 'Table de jardin teck — gratuit', author: 'Valérie M.', city: 'Castres', time: 'il y a 5h', color: '#22c55e' },
  { id: 'f12', type: 'demand', title: 'Recherche cours de français pour adulte', author: 'Amira S.', city: 'Toulouse', time: 'il y a 5h', color: '#fbbf24' },
];
