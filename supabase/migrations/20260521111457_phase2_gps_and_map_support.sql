/*
  # Phase 2 — GPS coordinates + map support

  ## Changes
  1. capability_profiles: add lat/lng/city/country_code/profile_type columns
  2. user_profiles: add lat/lng columns
  3. Indexes on lat/lng for geographic queries
  4. Update existing seeded profiles with GPS coordinates via CTE
*/

-- Add GPS to capability_profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='capability_profiles' AND column_name='lat') THEN
    ALTER TABLE capability_profiles ADD COLUMN lat double precision DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='capability_profiles' AND column_name='lng') THEN
    ALTER TABLE capability_profiles ADD COLUMN lng double precision DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='capability_profiles' AND column_name='city') THEN
    ALTER TABLE capability_profiles ADD COLUMN city text DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='capability_profiles' AND column_name='country_code') THEN
    ALTER TABLE capability_profiles ADD COLUMN country_code text DEFAULT 'FR';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='capability_profiles' AND column_name='profile_type') THEN
    ALTER TABLE capability_profiles ADD COLUMN profile_type text DEFAULT 'individual';
  END IF;
END $$;

-- Add GPS to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='lat') THEN
    ALTER TABLE user_profiles ADD COLUMN lat double precision DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='user_profiles' AND column_name='lng') THEN
    ALTER TABLE user_profiles ADD COLUMN lng double precision DEFAULT NULL;
  END IF;
END $$;

-- Spatial indexes
CREATE INDEX IF NOT EXISTS idx_capability_profiles_lat_lng ON capability_profiles(lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL AND is_published = true;

CREATE INDEX IF NOT EXISTS idx_capability_profiles_country ON capability_profiles(country_code)
  WHERE is_published = true;

-- Update existing seeded profiles with GPS using a CTE + row_number
WITH numbered AS (
  SELECT id, (row_number() OVER (ORDER BY created_at))::int AS rn
  FROM capability_profiles
  WHERE lat IS NULL
),
coords(rn, clat, clng, ccity, ccc) AS (
  VALUES
  (1, 48.8566,   2.3522,  'Paris',        'FR'),
  (2, 48.8736,   2.3472,  'Paris',        'FR'),
  (3, 48.8462,   2.3242,  'Paris',        'FR'),
  (4, 48.8870,   2.3900,  'Paris',        'FR'),
  (5, 45.7640,   4.8357,  'Lyon',         'FR'),
  (6, 45.7485,   4.8520,  'Lyon',         'FR'),
  (7, 43.2965,   5.3698,  'Marseille',    'FR'),
  (8, 43.3120,   5.3954,  'Marseille',    'FR'),
  (9, 43.6047,   1.4442,  'Toulouse',     'FR'),
  (10,44.8378,  -0.5792,  'Bordeaux',     'FR'),
  (11,43.7102,   7.2620,  'Nice',         'FR'),
  (12,47.2184,  -1.5536,  'Nantes',       'FR'),
  (13,48.5734,   7.7521,  'Strasbourg',   'FR'),
  (14,50.6292,   3.0573,  'Lille',        'FR'),
  (15,49.4432,   4.0317,  'Reims',        'FR'),
  (16,47.3220,   5.0415,  'Dijon',        'FR'),
  (17,45.1885,   5.7245,  'Grenoble',     'FR'),
  (18,48.6921,   6.1844,  'Nancy',        'FR'),
  (19,49.2583,  -0.3706,  'Caen',         'FR'),
  (20,47.9029,   0.1966,  'Le Mans',      'FR'),
  (21,50.8503,   4.3517,  'Bruxelles',    'BE'),
  (22,51.5074,  -0.1278,  'Londres',      'GB'),
  (23,52.5200,  13.4050,  'Berlin',       'DE'),
  (24,41.9028,  12.4964,  'Rome',         'IT'),
  (25,40.4168,  -3.7038,  'Madrid',       'ES'),
  (26,48.2082,  16.3738,  'Vienne',       'AT'),
  (27,47.3769,   8.5417,  'Zürich',       'CH'),
  (28,52.3676,   4.9041,  'Amsterdam',    'NL'),
  (29,38.7169,  -9.1399,  'Lisbonne',     'PT'),
  (30,59.9139,  10.7522,  'Oslo',         'NO'),
  (31,33.9716,  -7.5898,  'Casablanca',   'MA'),
  (32,36.7372,   3.0869,  'Alger',        'DZ'),
  (33,36.8190,  10.1658,  'Tunis',        'TN'),
  (34,14.6928, -17.4441,  'Dakar',        'SN'),
  (35, 5.3599,  -3.9670,  'Abidjan',      'CI'),
  (36, 4.0511,  11.5174,  'Yaoundé',      'CM'),
  (37,-1.2921,  36.8219,  'Nairobi',      'KE'),
  (38,-33.9249, 18.4241,  'Cape Town',    'ZA'),
  (39,40.7128, -74.0060,  'New York',     'US'),
  (40,45.5017, -73.5673,  'Montréal',     'CA'),
  (41,-23.5505,-46.6333,  'São Paulo',    'BR'),
  (42,-34.6037,-58.3816,  'Buenos Aires', 'AR'),
  (43,19.4326, -99.1332,  'Mexico City',  'MX'),
  (44, 4.7110, -74.0721,  'Bogotá',       'CO'),
  (45,-12.0464,-77.0428,  'Lima',         'PE'),
  (46,35.6762, 139.6503,  'Tokyo',        'JP'),
  (47,31.2304, 121.4737,  'Shanghai',     'CN'),
  (48,28.6139,  77.2090,  'New Delhi',    'IN'),
  (49, 1.3521, 103.8198,  'Singapour',    'SG'),
  (50,37.5665, 126.9780,  'Séoul',        'KR')
)
UPDATE capability_profiles cp
SET
  lat          = c.clat,
  lng          = c.clng,
  city         = c.ccity,
  country_code = c.ccc
FROM numbered n
JOIN coords c ON c.rn = n.rn
WHERE cp.id = n.id;
