/*
  # Seed Engine — 1 000 profils synthétiques déterministes v3

  Génère 1 000 lignes dans capability_profiles avec :
  - Noms/prénoms français réalistes (50 prénoms × 50 noms)
  - 50 villes françaises réelles avec coordonnées GPS
  - Zone déterministe : local (i%3=0) / distance (i%3=1) / both (i%3=2)
  - Bio courte générée, 2–5 capacités métier
  - user_id = NULL (profils synthétiques sans compte auth)
  - is_seed = true pour identification
  - pg_catalog.setseed(0.42) pour reproductibilité
  - Skip si 1000 rows is_seed déjà présentes
*/

DO $$
DECLARE
  prenoms TEXT[] := ARRAY[
    'Liam','Emma','Noah','Olivia','Elias','Léa','Hugo','Jade','Lucas','Camille',
    'Nathan','Chloé','Théo','Inès','Louis','Manon','Ethan','Lucie','Mathis','Clara',
    'Tom','Alice','Adam','Sarah','Romain','Laura','Alexis','Julie','Baptiste','Elise',
    'Maxime','Margot','Nicolas','Zoé','Pierre','Charlotte','Antoine','Amélie','Simon','Sophie',
    'Julien','Céline','Thomas','Pauline','Florian','Clémence','Damien','Anaïs','Adrien','Audrey'
  ];
  noms TEXT[] := ARRAY[
    'Martin','Bernard','Thomas','Petit','Robert','Richard','Durand','Dubois','Moreau','Laurent',
    'Simon','Michel','Lefebvre','Leroy','Roux','David','Bertrand','Morel','Fournier','Girard',
    'Bonnet','Dupont','Lambert','Fontaine','Rousseau','Vincent','Muller','Lefevre','Faure','Andre',
    'Mercier','Blanc','Guerin','Boyer','Garnier','Chevalier','François','Legrand','Gauthier','Garcia',
    'Perrin','Robin','Clement','Morin','Nicolas','Henry','Roussel','Mathieu','Gautier','Masson'
  ];
  ville_names TEXT[] := ARRAY[
    'Paris','Lyon','Marseille','Toulouse','Bordeaux',
    'Nantes','Lille','Strasbourg','Montpellier','Nice',
    'Rennes','Grenoble','Metz','Caen','Poitiers',
    'Perpignan','Limoges','Clermont-Ferrand','Tours','Amiens',
    'Rouen','Toulon','Brest','Le Havre','Dijon',
    'Angers','Reims','Saint-Étienne','Le Mans','Villeurbanne',
    'Nîmes','Versailles','Argenteuil','Mulhouse','Pau',
    'Avignon','Besançon','Bayonne','Antibes','Cannes',
    'Nancy','Colmar','Orléans','Calais','Dunkerque',
    'Valenciennes','Cherbourg','Saint-Malo','Ajaccio','Bastia'
  ];
  ville_lats FLOAT[] := ARRAY[
    48.853,45.748,43.296,43.604,44.837,
    47.218,50.629,48.584,43.610,43.710,
    48.113,45.188,49.120,49.183,46.580,
    42.699,45.834,45.777,47.394,49.895,
    49.443,43.124,48.389,49.493,47.322,
    47.478,49.258,45.439,48.000,45.766,
    43.836,48.805,48.948,47.750,43.299,
    43.949,47.237,43.493,43.580,43.552,
    48.692,48.079,47.903,50.952,51.034,
    50.357,49.633,48.649,41.919,42.697
  ];
  ville_lngs FLOAT[] := ARRAY[
    2.349,4.834,5.381,1.444,-0.580,
    -1.553,3.057,7.748,3.876,7.262,
    -1.678,5.724,6.176,-0.370,0.340,
    2.895,1.261,3.082,0.690,2.296,
    1.099,5.928,-4.486,0.107,5.041,
    -0.554,4.032,4.387,0.200,4.879,
    4.360,2.130,2.247,7.339,-0.370,
    4.806,6.024,-1.474,7.127,7.017,
    6.184,7.358,1.909,1.858,2.376,
    3.524,-1.622,-2.025,8.738,9.451
  ];
  capacites TEXT[] := ARRAY[
    'Aide rédaction CV','Préparation entretiens','Coaching reconversion',
    'Création entreprise','Conseil comptabilité','Formation Excel',
    'Accompagnement RH','Lettres de motivation','Stratégie marketing',
    'Gestion de projets','Aide administrative','Démarches Pôle Emploi',
    'Conseil juridique','Prise de parole','Mentorat professionnel',
    'Dépannage informatique','Installation Linux','Développement web',
    'Réparation smartphone','Cours de programmation','Formation WordPress',
    'Réparation vélo','Bricolage','Plomberie de base','Électricité courante',
    'Formation photographie','Retouche photo','Montage vidéo',
    'Cours de dessin','Cours de guitare','Cours de piano',
    'Ateliers couture','Design graphique','Écriture créative',
    'Écoute active','Médiation familiale','Soutien scolaire',
    'Cours de cuisine','Jardinage','Transport de personnes'
  ];
  zones TEXT[] := ARRAY['local','distance','both'];
  bios TEXT[] := ARRAY[
    'Passionné·e par le partage de compétences et l''entraide locale.',
    'J''aime aider les gens à résoudre leurs problèmes concrets.',
    'Fort·e de plusieurs années d''expérience, je propose mon aide.',
    'Disponible pour accompagner ceux qui en ont besoin.',
    'Convaincu·e que l''intelligence collective change les choses.',
    'Je crois au pouvoir des réseaux humains et de la solidarité.',
    'Toujours partant·e pour transmettre ce que je sais.',
    'L''entraide est au cœur de mes valeurs.',
    'Je mets mes compétences au service des autres volontiers.',
    'Curieux·se et engagé·e dans ma communauté.'
  ];
  avails TEXT[] := ARRAY[
    'Disponible maintenant','Disponible ce weekend','Disponible en soirée',
    'Disponible sous 48h','Disponible la semaine prochaine','Bientôt disponible'
  ];
  profile_types TEXT[] := ARRAY['individual','artisan','independant','formateur'];

  i INT; j INT;
  prenom TEXT; nom TEXT; display TEXT;
  ville TEXT; vlat FLOAT; vlng FLOAT;
  zone TEXT; bio TEXT; avail TEXT;
  seed_uuid UUID;
  cap_count INT;
  caps TEXT[];
  cap_idx INT;
  ville_idx INT;
  sav INT;
BEGIN
  IF (SELECT COUNT(*) FROM capability_profiles WHERE is_seed = true) >= 1000 THEN
    RAISE NOTICE 'Already seeded, skipping.';
    RETURN;
  END IF;

  PERFORM pg_catalog.setseed(0.42);

  FOR i IN 1..1000 LOOP
    seed_uuid := (md5('renovec-seed-' || i::TEXT))::UUID;

    IF EXISTS (SELECT 1 FROM capability_profiles WHERE id = seed_uuid) THEN
      CONTINUE;
    END IF;

    prenom    := prenoms[1 + MOD(i + FLOOR(random()*3)::INT, 50)];
    nom       := noms[1 + MOD(i*3 + FLOOR(random()*5)::INT, 50)];
    display   := prenom || ' ' || LEFT(nom,1) || '.';

    ville_idx := 1 + MOD(FLOOR(random()*50)::INT, 50);
    ville     := ville_names[ville_idx];
    vlat      := ville_lats[ville_idx] + (random()-0.5)*0.12;
    vlng      := ville_lngs[ville_idx] + (random()-0.5)*0.14;

    zone      := zones[1 + MOD(i-1, 3)];
    bio       := bios[1 + MOD(FLOOR(random()*10)::INT, 10)];
    avail     := avails[1 + MOD(FLOOR(random()*6)::INT, 6)];
    sav       := 10 + FLOOR(random()*320)::INT;

    cap_count := 2 + MOD(i-1, 4);
    caps      := ARRAY[]::TEXT[];
    j := 0;
    WHILE (array_length(caps,1) IS NULL OR array_length(caps,1) < cap_count) AND j < 200 LOOP
      j       := j + 1;
      cap_idx := 1 + MOD((i * 7 + j * 13), 40);
      IF NOT (caps @> ARRAY[capacites[cap_idx]]) THEN
        caps  := caps || capacites[cap_idx];
      END IF;
    END LOOP;

    INSERT INTO capability_profiles (
      id, user_id, title, display_name, tagline, summary,
      explicit_capabilities, implicit_capabilities, success_contexts,
      help_formats, availability, zone, city, lat, lng,
      sav_points, is_published, is_seed, profile_type
    ) VALUES (
      seed_uuid,
      NULL,
      prenom || ' ' || nom,
      display,
      caps[1],
      bio,
      caps,
      ARRAY[]::TEXT[],
      ARRAY['Accompagnement personnalisé','Résolution de problèmes concrets'],
      ARRAY['En ligne','En présentiel'],
      avail,
      zone,
      ville,
      vlat,
      vlng,
      sav,
      true,
      true,
      profile_types[1 + MOD(i-1, 4)]
    );
  END LOOP;

  RAISE NOTICE 'Seed complete.';
END $$;
