/*
  # Phase 3 — Massive seed: 10,000 synthetic capability profiles (v3)

  ## Summary
  Single INSERT...SELECT using generate_series and CASE expressions for
  capability arrays. Geographic distribution ~40% France, 20% Europe,
  15% Africa, 15% Americas, 10% Asia.
*/

INSERT INTO capability_profiles (
  user_id, title, tagline, summary, availability,
  explicit_capabilities, implicit_capabilities, success_contexts,
  relational_style, help_formats, impact_summary,
  sav_points, lat, lng, city, country_code, profile_type,
  is_published, created_at, updated_at
)
SELECT
  seed_uid,

  (ARRAY[
    'Accompagnement dans les transitions de vie',
    'Aide aux démarches administratives',
    'Soutien scolaire et orientation',
    'Médiation et résolution de conflits',
    'Diagnostic technique et réparation',
    'Accompagnement émotionnel et écoute',
    'Orientation professionnelle et reconversion',
    'Aide juridique et droits sociaux',
    'Soutien aux personnes âgées',
    'Aide à la parentalité',
    'Coaching et développement personnel',
    'Traduction et interprétariat',
    'Aide numérique et informatique',
    'Soutien en santé mentale',
    'Mobilité et accessibilité',
    'Aide financière et budget',
    'Accompagnement à la création d''entreprise',
    'Soutien en situation d''urgence',
    'Mise en relation et réseautage',
    'Aide à la recherche de logement',
    'Formation et transmission de savoir',
    'Coordination et gestion de projet',
    'Aide aux réfugiés et primo-arrivants',
    'Soutien aux aidants familiaux',
    'Résolution de problèmes complexes',
    'Diagnostic financier et conseil',
    'Accompagnement post-séparation',
    'Aide à la rédaction et communication',
    'Support en situation de deuil',
    'Aide à l''insertion professionnelle'
  ])[((n-1) % 30) + 1] AS title,

  'Aide concrète dans des situations humaines réelles.' AS tagline,
  'Présence engagée et bienveillante. Capacité à clarifier, orienter et accompagner.' AS summary,

  (ARRAY[
    'Disponible maintenant',
    'Disponible cette semaine',
    'Disponible ce mois-ci',
    'Disponible bientôt',
    'Disponible sur demande',
    'Disponible les week-ends',
    'Disponible en soirée'
  ])[((n-1) % 7) + 1] AS availability,

  CASE ((n-1) % 20)
    WHEN  0 THEN ARRAY['Écoute active','Orientation','Clarification']
    WHEN  1 THEN ARRAY['Rédaction de dossiers','Droits sociaux','Procédures administratives']
    WHEN  2 THEN ARRAY['Soutien aux devoirs','Méthodologie','Accompagnement scolaire']
    WHEN  3 THEN ARRAY['Médiation','Communication non-violente','Gestion de conflit']
    WHEN  4 THEN ARRAY['Diagnostic technique','Petites réparations','Dépannage']
    WHEN  5 THEN ARRAY['Soutien émotionnel','Présence bienveillante','Résilience']
    WHEN  6 THEN ARRAY['Bilan de compétences','CV et lettre de motivation','Simulation entretien']
    WHEN  7 THEN ARRAY['Droits des locataires','Procédures judiciaires','Protection sociale']
    WHEN  8 THEN ARRAY['Aide à domicile','Compagnie','Activités adaptées']
    WHEN  9 THEN ARRAY['Conseils parentaux','Gestion comportement','Communication famille']
    WHEN 10 THEN ARRAY['Définition d''objectifs','Plan d''action','Motivation']
    WHEN 11 THEN ARRAY['Traduction','Interprétariat médical','Accompagnement linguistique']
    WHEN 12 THEN ARRAY['Aide Windows/Mac','Navigation internet','Sécurité numérique']
    WHEN 13 THEN ARRAY['Premiers secours psychologiques','Gestion du stress','Ressources thérapeutiques']
    WHEN 14 THEN ARRAY['Transport adapté','Accompagnement déplacement','Aide mobilité']
    WHEN 15 THEN ARRAY['Gestion budgétaire','Négociation de dettes','Planification financière']
    WHEN 16 THEN ARRAY['Business plan','Statuts juridiques','Financement']
    WHEN 17 THEN ARRAY['Évaluation de crise','Orientation urgente','Mise en sécurité']
    WHEN 18 THEN ARRAY['Introduction dans des réseaux','Connexions pertinentes','Facilitation']
    ELSE         ARRAY['Recherche de logement','Dossier locatif','Droits locataires']
  END AS explicit_capabilities,

  ARRAY[]::text[] AS implicit_capabilities,
  ARRAY[]::text[] AS success_contexts,
  'Posture d''écoute et d''action. Style direct, sans jargon.' AS relational_style,
  ARRAY[]::text[] AS help_formats,
  'Impact concret sur les situations aidées.' AS impact_summary,

  ((n * 17 + 3) % 501) AS sav_points,

  -- Latitude
  (ARRAY[
    48.8566,48.8566,48.8566,48.8566,48.8736,48.8462,48.8870,
    45.7640,45.7640,45.7485,43.2965,43.2965,43.3120,
    43.6047,43.6047,44.8378,44.8378,43.7102,47.2184,47.2184,
    48.5734,50.6292,50.6292,49.4432,47.3220,45.1885,48.6921,
    49.2583,47.9029,43.1242,48.3905,45.7772,45.4397,47.4784,
    50.8503,51.5074,51.5074,52.5200,52.5200,41.9028,40.4168,
    48.2082,47.3769,52.3676,38.7169,41.3874,46.2044,59.3293,
    55.6761,59.9139,
    33.5731,33.5731,36.7372,36.8190,14.6928,14.6928,
    5.3599,5.3599,4.0511,-1.2921,5.5560,6.5244,34.0209,
    40.7128,40.7128,34.0522,45.5017,45.5017,-23.5505,-23.5505,
    -34.6037,4.7110,-12.0464,19.4326,25.7617,-33.4489,
    35.6762,35.6762,31.2304,28.6139,1.3521,37.5665,25.2048
  ])[((n-1) % 84) + 1]
  + ((((n * 31337 + 7) % 3000) - 1500)::double precision / 10000.0) AS lat,

  -- Longitude
  (ARRAY[
    2.3522,2.3522,2.3522,2.3522,2.3472,2.3242,2.3900,
    4.8357,4.8357,4.8520,5.3698,5.3698,5.3954,
    1.4442,1.4442,-0.5792,-0.5792,7.2620,-1.5536,-1.5536,
    7.7521,3.0573,3.0573,4.0317,5.0415,5.7245,6.1844,
    -0.3706,0.1966,5.9280,-4.4860,3.0870,4.3872,-0.5632,
    4.3517,-0.1278,-0.1278,13.4050,13.4050,12.4964,-3.7038,
    16.3738,8.5417,4.9041,-9.1399,2.1686,6.1432,18.0686,
    12.5683,10.7522,
    -7.5898,-7.5898,3.0869,10.1658,-17.4441,-17.4441,
    -3.9670,-3.9670,11.5174,36.8219,-0.1969,3.3792,-6.8416,
    -74.0060,-74.0060,-118.2437,-73.5673,-73.5673,-46.6333,-46.6333,
    -58.3816,-74.0721,-77.0428,-99.1332,-80.1918,-70.6693,
    139.6503,139.6503,121.4737,77.2090,103.8198,126.9780,55.2708
  ])[((n-1) % 84) + 1]
  + ((((n * 13337 + 3) % 3000) - 1500)::double precision / 10000.0) AS lng,

  (ARRAY[
    'Paris','Paris','Paris','Paris','Paris','Paris','Paris',
    'Lyon','Lyon','Lyon','Marseille','Marseille','Marseille',
    'Toulouse','Toulouse','Bordeaux','Bordeaux','Nice','Nantes','Nantes',
    'Strasbourg','Lille','Lille','Reims','Dijon','Grenoble','Nancy',
    'Caen','Le Mans','Toulon','Brest','Clermont-Ferrand','Saint-Étienne','Angers',
    'Bruxelles','Londres','Londres','Berlin','Berlin','Rome','Madrid',
    'Vienne','Zürich','Amsterdam','Lisbonne','Barcelone','Genève','Stockholm',
    'Copenhague','Oslo',
    'Casablanca','Casablanca','Alger','Tunis','Dakar','Dakar',
    'Abidjan','Abidjan','Yaoundé','Nairobi','Accra','Lagos','Rabat',
    'New York','New York','Los Angeles','Montréal','Montréal','São Paulo','São Paulo',
    'Buenos Aires','Bogotá','Lima','Mexico City','Miami','Santiago',
    'Tokyo','Tokyo','Shanghai','New Delhi','Singapour','Séoul','Dubaï'
  ])[((n-1) % 84) + 1] AS city,

  (ARRAY[
    'FR','FR','FR','FR','FR','FR','FR',
    'FR','FR','FR','FR','FR','FR',
    'FR','FR','FR','FR','FR','FR','FR',
    'FR','FR','FR','FR','FR','FR','FR',
    'FR','FR','FR','FR','FR','FR','FR',
    'BE','GB','GB','DE','DE','IT','ES',
    'AT','CH','NL','PT','ES','CH','SE',
    'DK','NO',
    'MA','MA','DZ','TN','SN','SN',
    'CI','CI','CM','KE','GH','NG','MA',
    'US','US','US','CA','CA','BR','BR',
    'AR','CO','PE','MX','US','CL',
    'JP','JP','CN','IN','SG','KR','AE'
  ])[((n-1) % 84) + 1] AS country_code,

  (ARRAY[
    'individual','individual','individual','individual',
    'individual','individual','individual','individual',
    'individual','individual','individual','individual',
    'professional','professional','professional','professional',
    'association','association','association',
    'company'
  ])[((n-1) % 20) + 1] AS profile_type,

  true AS is_published,
  now() - (((n % 730) + 1) * interval '1 day') AS created_at,
  now() - (((n % 365)) * interval '1 day') AS updated_at

FROM
  (SELECT id AS seed_uid FROM auth.users ORDER BY created_at LIMIT 1) u,
  generate_series(1, 10000) AS n
ON CONFLICT DO NOTHING;
