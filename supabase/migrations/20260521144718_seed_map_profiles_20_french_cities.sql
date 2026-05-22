/*
  # Seed: 20 realistic French profiles for the map

  ## Problem
  Both user_profiles and capability_profiles have FK constraints requiring
  real auth.users entries. Seed data cannot bypass this without modifying
  the FK constraints, which would weaken schema integrity.

  ## Solution
  1. Add `display_name` and `zone` columns to capability_profiles so seed
     rows can be self-contained (no user_profiles join required)
  2. Make user_id nullable in capability_profiles for seed-only rows
  3. Insert 20 seed rows directly into capability_profiles
  4. Update the CartePage query strategy: read display_name/zone from
     capability_profiles directly (populated for seed rows), with
     user_profiles as optional enrichment for real users

  ## New columns on capability_profiles
  - `display_name` text nullable — overrides user_profiles join for seed rows
  - `zone`         text nullable — mobility zone (local / distance / both)
  - `is_seed`      boolean default false — marks seed rows for easy filtering
*/

-- Add display_name, zone, is_seed to capability_profiles
ALTER TABLE capability_profiles
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS zone         text DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS is_seed      boolean DEFAULT false;

-- Make user_id nullable so seed rows don't need an auth entry
ALTER TABLE capability_profiles
  ALTER COLUMN user_id DROP NOT NULL;

-- ── Seed: 20 profiles ─────────────────────────────────────────────────────────
INSERT INTO capability_profiles
  (id, user_id, title, display_name, city, lat, lng, zone, explicit_capabilities,
   is_published, is_seed, availability, sav_points, created_at, updated_at)
VALUES
  ('b2000001-0000-0000-0000-000000000001', null, 'Coach professionnelle',        'Sophie Marchand',      'Paris',            48.8566,  2.3522, 'both',     ARRAY['coaching', 'bilan de compétences', 'transition carrière'],           true, true, 'Disponible',      120, now(), now()),
  ('b2000001-0000-0000-0000-000000000002', null, 'Formateur web & no-code',      'Julien Faure',         'Lyon',             45.7640,  4.8357, 'both',     ARRAY['développement web', 'no-code', 'formation', 'React'],                 true, true, 'Disponible',       85, now(), now()),
  ('b2000001-0000-0000-0000-000000000003', null, 'Consultante RH',               'Amina Bensalah',       'Bordeaux',         44.8378, -0.5792, 'local',    ARRAY['ressources humaines', 'recrutement', 'cohésion d''équipe'],            true, true, 'Sur demande',      60, now(), now()),
  ('b2000001-0000-0000-0000-000000000004', null, 'Développeur fullstack',        'Thomas Girard',        'Marseille',        43.2965,  5.3698, 'distance', ARRAY['développement', 'Node.js', 'Python', 'mentorat technique'],            true, true, 'Disponible',      200, now(), now()),
  ('b2000001-0000-0000-0000-000000000005', null, 'Directrice artistique',        'Clara Fontaine',       'Toulouse',         43.6047,  1.4442, 'both',     ARRAY['graphisme', 'direction artistique', 'branding', 'Figma'],             true, true, 'Disponible',       75, now(), now()),
  ('b2000001-0000-0000-0000-000000000006', null, 'Expert stratégie digitale',    'Marc Lefevre',         'Nantes',           47.2184, -1.5536, 'distance', ARRAY['stratégie digitale', 'growth hacking', 'SEO', 'analytics'],           true, true, 'Disponible',      140, now(), now()),
  ('b2000001-0000-0000-0000-000000000007', null, 'Avocate droit du travail',     'Isabelle Dupont',      'Strasbourg',       48.5734,  7.7521, 'local',    ARRAY['droit du travail', 'conseil juridique', 'droit des affaires'],         true, true, 'Sur rendez-vous',  50, now(), now()),
  ('b2000001-0000-0000-0000-000000000008', null, 'Scrum Master certifié',        'Kevin Moreau',         'Lille',            50.6292,  3.0573, 'both',     ARRAY['gestion de projet', 'agile', 'scrum', 'facilitation'],                true, true, 'Disponible',      110, now(), now()),
  ('b2000001-0000-0000-0000-000000000009', null, 'Psychologue du travail',       'Laura Petit',          'Rennes',           48.1173, -1.6778, 'local',    ARRAY['psychologie', 'bien-être', 'gestion du stress', 'accompagnement'],     true, true, 'Sur demande',      90, now(), now()),
  ('b2000001-0000-0000-0000-000000000010', null, 'Consultant innovation',        'Antoine Bernard',      'Montpellier',      43.6119,  3.8772, 'both',     ARRAY['innovation', 'design thinking', 'ateliers créatifs', 'stratégie'],     true, true, 'Disponible',      160, now(), now()),
  ('b2000001-0000-0000-0000-000000000011', null, 'Photographe corporate',        'Nadia Rousseau',       'Nice',             43.7102,  7.2620, 'local',    ARRAY['photographie', 'portrait', 'reportage', 'retouche'],                  true, true, 'Sur demande',      40,  now(), now()),
  ('b2000001-0000-0000-0000-000000000012', null, 'Ingénieur data & ML',          'Pierre Leclerc',       'Grenoble',         45.1885,  5.7245, 'distance', ARRAY['data science', 'machine learning', 'Python', 'analyse de données'],    true, true, 'Disponible',      180, now(), now()),
  ('b2000001-0000-0000-0000-000000000013', null, 'Médiatrice & CNV',             'Fatima Ouali',         'Metz',             49.1193,  6.1757, 'both',     ARRAY['médiation', 'communication non-violente', 'coaching', 'conflits'],     true, true, 'Disponible',       70, now(), now()),
  ('b2000001-0000-0000-0000-000000000014', null, 'Comptable pour indépendants',  'Guillaume Morin',      'Rouen',            49.4432,  1.0993, 'local',    ARRAY['comptabilité', 'fiscalité', 'conseil financier', 'bilan'],              true, true, 'Sur rendez-vous',  55, now(), now()),
  ('b2000001-0000-0000-0000-000000000015', null, 'Rédactrice web B2B',           'Céline Durand',        'Tours',            47.3941,  0.6848, 'distance', ARRAY['rédaction web', 'content strategy', 'copywriting', 'SEO'],              true, true, 'Disponible',       95, now(), now()),
  ('b2000001-0000-0000-0000-000000000016', null, 'Architecte & rénovation',      'Romain Blanchard',     'Dijon',            47.3220,  5.0415, 'local',    ARRAY['architecture', 'rénovation énergétique', 'permis de construire'],       true, true, 'Sur demande',      65, now(), now()),
  ('b2000001-0000-0000-0000-000000000017', null, 'Formatrice langues',           'Yasmine Chabane',      'Clermont-Ferrand', 45.7797,  3.0863, 'both',     ARRAY['anglais', 'arabe', 'formation linguistique', 'interculturel'],          true, true, 'Disponible',       80, now(), now()),
  ('b2000001-0000-0000-0000-000000000018', null, 'Product Manager UX',           'Nicolas Aubert',       'Angers',           47.4784, -0.5632, 'distance', ARRAY['product management', 'UX research', 'roadmap', 'user testing'],         true, true, 'Disponible',      130, now(), now()),
  ('b2000001-0000-0000-0000-000000000019', null, 'Nutritionniste & coach santé', 'Marie-Christine Gros', 'Le Havre',         49.4938,  0.1079, 'local',    ARRAY['nutrition', 'coaching santé', 'bien-être', 'diététique'],               true, true, 'Sur demande',      45,  now(), now()),
  ('b2000001-0000-0000-0000-000000000020', null, 'Formateur prise de parole',    'Bertrand Renard',      'Reims',            49.2583,  4.0317, 'both',     ARRAY['prise de parole', 'leadership', 'formation', 'communication'],          true, true, 'Disponible',      105, now(), now())
ON CONFLICT (id) DO NOTHING;
