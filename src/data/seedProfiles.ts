export interface SeedProfile {
  id: string;
  prenom: string;
  initiale: string;
  lat: number;
  lng: number;
  domaine: 'professionnel' | 'technique' | 'créatif' | 'relationnel' | 'personnel';
  capacite: string;
  disponibilite: 'disponible' | 'occupé' | 'bientôt';
  pts: number;
  tags: string[];
  membreDepuis: string;
  color: string;
}

const TOULOUSE = { lat: 43.6047, lng: 1.4442 };

const PRENOMS = [
  'Liam','Emma','Noah','Olivia','Elias','Léa','Hugo','Jade','Lucas','Camille',
  'Nathan','Chloé','Théo','Inès','Louis','Manon','Ethan','Lucie','Mathis','Clara',
  'Tom','Alice','Adam','Sarah','Romain','Laura','Alexis','Julie','Baptiste','Elise',
  'Maxime','Margot','Nicolas','Zoé','Pierre','Charlotte','Antoine','Amélie','Simon','Sophie',
  'Julien','Céline','Thomas','Pauline','Florian','Clémence','Damien','Anaïs','Adrien','Audrey',
  'Sébastien','Laetitia','Arnaud','Virginie','Quentin','Nathalie','Vincent','Isabelle','Christophe','Sandrine',
  'Xavier','Mélanie','Benoît','Valérie','Stéphane','Catherine','Laurent','Patricia','Didier','Sylvie',
  'Mohamed','Fatima','Karim','Nadia','Youssef','Leila','Amine','Samira','Hamza','Amira',
  'Mehdi','Hafida','Rachid','Souad','Bilal','Zineb','Omar','Khadija','Ali','Malika',
  'Carlos','Maria','Diego','Elena','Jorge','Carmen','Alejandro','Ana','Roberto','Isabella',
  'Luca','Sofia','Marco','Giulia','Andrea','Valentina','Francesco','Martina','Alessandro','Sara',
  'Amara','Fatou','Moussa','Aissatou','Ibrahim','Mariama','Abdoulaye','Fatoumata','Seydou','Aminata',
  'Wei','Mei','Jun','Ling','Chen','Yun','Xiao','Hui','Fang','Jing',
  'Sasha','Natasha','Ivan','Olga','Dmitri','Anya','Sergei','Elena','Mikhail','Irina',
  'Ryan','Jessica','Tyler','Ashley','Brandon','Brittany','Derek','Tiffany','Travis','Amber',
  'Jean','Marie','Paul','Anne','Bernard','Monique','Michel','Françoise','Gérard','Martine',
  'Yann','Gwenaëlle','Erwan','Maëlle','Loïc','Rozenn','Gaël','Morgane','Ronan','Nolwenn',
  'Mehmet','Fatma','Ahmet','Ayse','Mustafa','Hatice','Ali','Zeynep','Hüseyin','Emine',
  'Raj','Priya','Arjun','Meera','Vikram','Anita','Rahul','Sunita','Amit','Kavya',
  'Léonie','Raphaël','Mathilde','Gabriel','Océane','Axel','Solène','Enzo','Romane','Nolan',
];

const NOMS = [
  'Martin','Bernard','Thomas','Petit','Robert','Richard','Durand','Dubois','Moreau','Laurent',
  'Simon','Michel','Lefebvre','Leroy','Roux','David','Bertrand','Morel','Fournier','Girard',
  'Bonnet','Dupont','Lambert','Fontaine','Rousseau','Vincent','Muller','Lefevre','Faure','Andre',
  'Mercier','Blanc','Guerin','Boyer','Garnier','Chevalier','François','Legrand','Gauthier','Garcia',
  'Perrin','Robin','Clement','Morin','Nicolas','Henry','Roussel','Mathieu','Gautier','Masson',
  'Marchal','Dumont','Lopez','Nguyen','Martinez','Caron','Da Silva','Renard','Noel','Roy',
  'Aubert','Adam','Meunier','Moulin','Lemaire','Benoit','Giraud','Carpentier','Collet','Leclercq',
  'Vasseur','Brun','Schneider','Gerard','Rey','Lacroix','Vidal','Denis','Etienne','Picard',
  'Bazin','Leclerc','Barbier','Conte','Gilles','Riviere','Arnaud','Fleury','Prevost','Dufour',
  'Baudoin','Colin','Lebrun','Jacques','Boucheron','Mallet','Renaud','Lecomte','Fernandez','Breton',
];

const CAPACITES_PAR_DOMAINE: Record<string, string[]> = {
  professionnel: [
    'Aide à la rédaction de CV', 'Préparation aux entretiens', 'Coaching de reconversion',
    'Aide à la création d\'entreprise', 'Conseil en comptabilité', 'Formation Excel avancé',
    'Accompagnement RH', 'Rédaction de lettres de motivation', 'Stratégie marketing',
    'Gestion de projets', 'Aide administrative', 'Démarches Pôle Emploi',
    'Conseil juridique de base', 'Formation à la prise de parole', 'Mentorat professionnel',
    'Accompagnement VAE', 'Bilan de compétences', 'Formation gestion du temps',
  ],
  technique: [
    'Dépannage informatique', 'Installation Linux', 'Développement web', 'Réparation smartphone',
    'Cours de programmation', 'Formation WordPress', 'Aide tableur / Excel', 'Réparation vélo',
    'Bricolage et petits travaux', 'Plomberie de base', 'Électricité courante',
    'Peinture et décoration', 'Aide à la domotique', 'Installation antenne', 'Réparation électroménager',
    'Formation photographie', 'Retouche photo Lightroom', 'Montage vidéo', 'Aide impression 3D',
  ],
  créatif: [
    'Cours de dessin', 'Cours de guitare', 'Cours de piano', 'Initiation à la poterie',
    'Ateliers couture', 'Cours de peinture aquarelle', 'Aide création logo', 'Design graphique',
    'Initiation calligraphie', 'Cours de chant', 'Aide scénario court-métrage', 'Écriture créative',
    'Fabrication de bijoux', 'Broderie et point de croix', 'Cours de danse', 'Initiation céramique',
    'Illustration numérique', 'Composition musicale', 'Aide mise en scène', 'Fabrication de meubles',
  ],
  relationnel: [
    'Écoute active et soutien', 'Médiation familiale', 'Aide à la parentalité',
    'Accompagnement deuil', 'Soutien anxiété', 'Facilitation de groupe',
    'Aide à la communication de couple', 'Coaching confiance en soi',
    'Accompagnement personnes âgées', 'Aide aux devoirs enfants', 'Soutien scolaire lycée',
    'Accompagnement enfants autistes', 'Aide personnes en situation de handicap',
    'Bénévolat et actions sociales', 'Médiation interculturelle', 'Cours de français pour étrangers',
  ],
  personnel: [
    'Cours de cuisine végétarienne', 'Initiation permaculture', 'Aide jardinage',
    'Transport de personnes', 'Transport de meubles', 'Courses et achats', 'Garde d\'animaux',
    'Promenade de chiens', 'Babysitting', 'Aide aux personnes âgées', 'Yoga et méditation',
    'Cours de sport à domicile', 'Aide à l\'organisation / rangement', 'Coaching sommeil',
    'Alimentation et nutrition', 'Formation premiers secours', 'Langue des signes de base',
    'Cours de langues (anglais, espagnol)', 'Traduction de documents', 'Aide déménagement',
  ],
};

const TAGS_PAR_DOMAINE: Record<string, string[][]> = {
  professionnel: [
    ['CV', 'Entretien'], ['Reconversion', 'Carrière'], ['Création', 'Entreprise'],
    ['Comptabilité', 'Finance'], ['RH', 'Recrutement'], ['Marketing', 'Stratégie'],
    ['Administratif', 'Démarches'], ['Juridique', 'Conseil'], ['Gestion', 'Projet'],
  ],
  technique: [
    ['Informatique', 'Dépannage'], ['Code', 'Web'], ['Réparation', 'Bricolage'],
    ['Plomberie', 'Travaux'], ['Photo', 'Vidéo'], ['Linux', 'Logiciel'],
    ['Vélo', 'Mécanique'], ['Électricité', 'Installation'],
  ],
  créatif: [
    ['Dessin', 'Peinture'], ['Musique', 'Chant'], ['Couture', 'Textile'],
    ['Design', 'Graphisme'], ['Écriture', 'Narration'], ['Poterie', 'Céramique'],
    ['Danse', 'Scène'], ['Photo', 'Illustration'],
  ],
  relationnel: [
    ['Écoute', 'Soutien'], ['Parentalité', 'Enfants'], ['Médiation', 'Conflit'],
    ['Soutien scolaire', 'Devoirs'], ['Confiance', 'Coaching'], ['Social', 'Bénévolat'],
    ['Langues', 'Intégration'], ['Handicap', 'Accompagnement'],
  ],
  personnel: [
    ['Cuisine', 'Recettes'], ['Jardinage', 'Nature'], ['Transport', 'Mobilité'],
    ['Animaux', 'Garde'], ['Sport', 'Bien-être'], ['Yoga', 'Méditation'],
    ['Langues', 'Traduction'], ['Rangement', 'Organisation'], ['Déménagement', 'Logistique'],
  ],
};

const COULEURS = [
  '#E05C2A', '#2E86AB', '#2ECC71', '#E74C3C', '#3498DB',
  '#F39C12', '#1ABC9C', '#9B59B6', '#E91E8C', '#00BCD4',
  '#FF6B35', '#4CAF50', '#FF5722', '#607D8B', '#795548',
];

const DISPONIBILITES: SeedProfile['disponibilite'][] = ['disponible', 'occupé', 'bientôt'];
const DOMAINES: SeedProfile['domaine'][] = ['professionnel', 'technique', 'créatif', 'relationnel', 'personnel'];
const MEMBRES_DEPUIS = ['2 semaines', '1 mois', '2 mois', '3 mois', '4 mois', '5 mois', '6 mois', '8 mois', '10 mois', '1 an', '1 an et demi'];

function seededRand(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function pick<T>(arr: T[], seed: number): T {
  return arr[Math.floor(seededRand(seed) * arr.length)];
}

function generateProfiles(): SeedProfile[] {
  const profiles: SeedProfile[] = [];
  for (let i = 0; i < 1000; i++) {
    const s = i * 7 + 13;
    const prenom = pick(PRENOMS, s + 1);
    const nom = pick(NOMS, s + 2);
    const initiale = prenom[0] + nom[0];
    const domaine = DOMAINES[i % 5];
    const capaciteList = CAPACITES_PAR_DOMAINE[domaine];
    const capacite = pick(capaciteList, s + 3);
    const tagsList = TAGS_PAR_DOMAINE[domaine];
    const tags = pick(tagsList, s + 4);
    const color = pick(COULEURS, s + 5);

    // disponibilite: 35% disponible, 45% occupé, 20% bientôt
    let disponibilite: SeedProfile['disponibilite'];
    const dr = seededRand(s + 6);
    if (dr < 0.35) disponibilite = 'disponible';
    else if (dr < 0.80) disponibilite = 'occupé';
    else disponibilite = 'bientôt';

    // Scatter around Toulouse — non-uniform using two separate randoms
    const latOffset = (seededRand(s + 7) * 0.3 - 0.15);
    const lngOffset = (seededRand(s + 8) * 0.3 - 0.15);

    const pts = Math.round(10 + seededRand(s + 9) * 330);
    const membreDepuis = pick(MEMBRES_DEPUIS, s + 10);

    profiles.push({
      id: `seed-${i}`,
      prenom,
      initiale,
      lat: TOULOUSE.lat + latOffset,
      lng: TOULOUSE.lng + lngOffset,
      domaine,
      capacite,
      disponibilite,
      pts,
      tags,
      membreDepuis,
      color,
    });
  }
  return profiles;
}

export const SEED_PROFILES = generateProfiles();
