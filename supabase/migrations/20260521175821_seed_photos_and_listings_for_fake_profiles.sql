/*
  # Seed photos and listings for fake/seed profiles

  1. Assigns Pexels avatar_url and cover_url to all seed profiles
  2. Inserts 2-4 listings per seed profile (services + optional objects/demands)
*/

-- ── 1. AVATAR & COVER PHOTOS ────────────────────────────────────────────────

DO $$
DECLARE
  rec  RECORD;
  av   TEXT;
  cv   TEXT;
  idx  INT;
  n_av INT := 12;
  n_cv INT := 10;

  avatars TEXT[] := ARRAY[
    'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
    'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
    'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
    'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
    'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
    'https://images.pexels.com/photos/1587014/pexels-photo-1587014.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
    'https://images.pexels.com/photos/1043471/pexels-photo-1043471.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
    'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
    'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
    'https://images.pexels.com/photos/733872/pexels-photo-733872.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
    'https://images.pexels.com/photos/1542085/pexels-photo-1542085.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop',
    'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop'
  ];

  covers TEXT[] := ARRAY[
    'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg?auto=compress&cs=tinysrgb&w=800&h=300&fit=crop',
    'https://images.pexels.com/photos/1181406/pexels-photo-1181406.jpeg?auto=compress&cs=tinysrgb&w=800&h=300&fit=crop',
    'https://images.pexels.com/photos/574077/pexels-photo-574077.jpeg?auto=compress&cs=tinysrgb&w=800&h=300&fit=crop',
    'https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg?auto=compress&cs=tinysrgb&w=800&h=300&fit=crop',
    'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=800&h=300&fit=crop',
    'https://images.pexels.com/photos/3861958/pexels-photo-3861958.jpeg?auto=compress&cs=tinysrgb&w=800&h=300&fit=crop',
    'https://images.pexels.com/photos/1181244/pexels-photo-1181244.jpeg?auto=compress&cs=tinysrgb&w=800&h=300&fit=crop',
    'https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg?auto=compress&cs=tinysrgb&w=800&h=300&fit=crop',
    'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=800&h=300&fit=crop',
    'https://images.pexels.com/photos/3861964/pexels-photo-3861964.jpeg?auto=compress&cs=tinysrgb&w=800&h=300&fit=crop'
  ];
BEGIN
  FOR rec IN
    SELECT id, title
    FROM capability_profiles
    WHERE is_seed = true AND (avatar_url IS NULL OR avatar_url = '')
  LOOP
    idx := (ascii(substring(rec.title, 1, 1)) + length(rec.title)) % n_av + 1;
    av  := avatars[idx];
    cv  := covers[(idx % n_cv) + 1];
    UPDATE capability_profiles SET avatar_url = av, cover_url = cv WHERE id = rec.id;
  END LOOP;
END $$;

-- ── 2. LISTINGS SEED ────────────────────────────────────────────────────────

DO $$
DECLARE
  rec    RECORD;
  cap1   TEXT;
  cap2   TEXT;
  cap3   TEXT;
  price1 TEXT;
  price2 TEXT;
  sidx   INT;
  oidx   INT;
  n_si   INT := 8;
  n_oi   INT := 6;

  svc_imgs TEXT[] := ARRAY[
    'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    'https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    'https://images.pexels.com/photos/1181671/pexels-photo-1181671.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    'https://images.pexels.com/photos/3861972/pexels-photo-3861972.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    'https://images.pexels.com/photos/3183165/pexels-photo-3183165.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    'https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    'https://images.pexels.com/photos/3184317/pexels-photo-3184317.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    'https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop'
  ];

  obj_imgs TEXT[] := ARRAY[
    'https://images.pexels.com/photos/4226870/pexels-photo-4226870.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    'https://images.pexels.com/photos/1029757/pexels-photo-1029757.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    'https://images.pexels.com/photos/3945683/pexels-photo-3945683.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    'https://images.pexels.com/photos/4226765/pexels-photo-4226765.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    'https://images.pexels.com/photos/1350789/pexels-photo-1350789.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop',
    'https://images.pexels.com/photos/4226791/pexels-photo-4226791.jpeg?auto=compress&cs=tinysrgb&w=600&h=400&fit=crop'
  ];

  already_seeded_ids uuid[];
BEGIN
  -- collect ids that already have listings to skip them
  SELECT array_agg(DISTINCT profile_id) INTO already_seeded_ids FROM profile_listings;

  FOR rec IN
    SELECT id, title, explicit_capabilities, sav_points, city, profile_type
    FROM capability_profiles
    WHERE is_seed = true
      AND (already_seeded_ids IS NULL OR NOT (id = ANY(already_seeded_ids)))
    LIMIT 1020
  LOOP
    cap1 := COALESCE(rec.explicit_capabilities[1], 'Aide generale');
    cap2 := COALESCE(rec.explicit_capabilities[2], cap1);
    cap3 := COALESCE(rec.explicit_capabilities[3], cap2);

    sidx := (ascii(substring(rec.title, 1, 1)) + length(rec.title)) % n_si + 1;
    oidx := (ascii(substring(cap1, 1, 1)) + length(cap1)) % n_oi + 1;

    price1 := CASE (rec.sav_points % 5)
      WHEN 0 THEN 'Gratuit'
      WHEN 1 THEN 'Sur demande'
      WHEN 2 THEN 'Troc possible'
      WHEN 3 THEN 'A partir de 20 SAV'
      ELSE 'A negocier'
    END;

    price2 := CASE (rec.sav_points % 4)
      WHEN 0 THEN 'Offert'
      WHEN 1 THEN '5 euros symboliques'
      WHEN 2 THEN 'Troc'
      ELSE 'Gratuit'
    END;

    -- Service principal
    INSERT INTO profile_listings (profile_id, listing_type, title, description, price_hint, category, image_urls, tags)
    VALUES (
      rec.id, 'service',
      cap1,
      'Accompagnement personnalise sur ' || LOWER(cap1) || '. Adapte a votre niveau et vos objectifs.',
      price1,
      COALESCE(rec.profile_type, 'service'),
      ARRAY[svc_imgs[sidx]],
      ARRAY[LOWER(cap1), COALESCE(rec.city, 'france')]
    );

    -- Deuxieme service si different
    IF cap2 <> cap1 THEN
      INSERT INTO profile_listings (profile_id, listing_type, title, description, price_hint, category, image_urls, tags)
      VALUES (
        rec.id, 'service',
        cap2 || ' — session decouverte',
        'Premiere session decouverte sur ' || LOWER(cap2) || '. Aucun engagement.',
        'Gratuit (1h)',
        COALESCE(rec.profile_type, 'service'),
        ARRAY[svc_imgs[(sidx % n_si) + 1]],
        ARRAY[LOWER(cap2), 'decouverte']
      );
    END IF;

    -- Objet pour ~33% des profils
    IF rec.sav_points % 3 = 0 THEN
      INSERT INTO profile_listings (profile_id, listing_type, title, description, price_hint, condition, category, image_urls, tags)
      VALUES (
        rec.id,
        CASE WHEN rec.sav_points % 6 < 3 THEN 'object_used' ELSE 'object_new' END,
        CASE
          WHEN cap1 ILIKE '%guitare%' OR cap1 ILIKE '%musique%' THEN 'Materiel musical — bon etat'
          WHEN cap1 ILIKE '%photo%'                             THEN 'Materiel photo — occasion'
          WHEN cap1 ILIKE '%informatique%' OR cap1 ILIKE '%Linux%' THEN 'Accessoire informatique'
          WHEN cap1 ILIKE '%cuisine%'                           THEN 'Ustensile de cuisine — peu utilise'
          WHEN cap1 ILIKE '%jardin%'                            THEN 'Outil de jardinage — occasion'
          WHEN cap1 ILIKE '%couture%'                           THEN 'Fournitures couture — neuf'
          WHEN cap1 ILIKE '%dessin%' OR cap1 ILIKE '%graphisme%' THEN 'Materiel artistique — occasion'
          ELSE 'Objet en lien avec mon activite'
        END,
        'Issu de ma pratique de ' || LOWER(cap1) || '. En bon etat, ne me sert plus.',
        price2,
        CASE WHEN rec.sav_points % 6 < 3 THEN 'good' ELSE 'new' END,
        'objet',
        ARRAY[obj_imgs[oidx]],
        ARRAY[LOWER(cap1), 'objet', COALESCE(rec.city, 'france')]
      );
    END IF;

    -- Demande pour ~25% des profils
    IF rec.sav_points % 4 = 0 AND cap3 <> cap1 THEN
      INSERT INTO profile_listings (profile_id, listing_type, title, description, price_hint, category, tags)
      VALUES (
        rec.id, 'demand',
        'Recherche : ' || cap3,
        'Je cherche quelqu un competent en ' || LOWER(cap3) || '. Echange ou collaboration bienvenue.',
        'Echange de services',
        'demande',
        ARRAY[LOWER(cap3), 'demande', 'echange']
      );
    END IF;

  END LOOP;
END $$;
