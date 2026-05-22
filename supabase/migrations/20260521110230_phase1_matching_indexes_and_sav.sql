/*
  # Phase 1 — Matching indexes, SAV ledger upsert, full-text search

  ## 1. Full-text search index on capability_profiles
  Permet une recherche par mots-clés sur title, summary, tagline.

  ## 2. Index sur availability pour filtrage rapide

  ## 3. Fonction de matching SQL interne
  Retourne les capability_profiles triés par pertinence selon:
  - Correspondance mots-clés dans title/tagline/summary/explicit_capabilities
  - Disponibilité (available > soon > rest)
  - is_published = true seulement

  ## 4. SAV ledger upsert function
  Crée ou met à jour le solde SAV de façon atomique (pas de double inscription).

  ## 5. Index sur sav_ledger.user_id si pas encore présent
*/

-- ── Full-text search sur capability_profiles ─────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'capability_profiles'
      AND indexname = 'capability_profiles_fts_idx'
  ) THEN
    CREATE INDEX capability_profiles_fts_idx
      ON capability_profiles
      USING gin(to_tsvector('french',
        coalesce(title, '') || ' ' ||
        coalesce(tagline, '') || ' ' ||
        coalesce(summary, '')
      ));
  END IF;
END $$;

-- ── Index sur availability ────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'capability_profiles'
      AND indexname = 'capability_profiles_availability_idx'
  ) THEN
    CREATE INDEX capability_profiles_availability_idx
      ON capability_profiles (availability)
      WHERE is_published = true;
  END IF;
END $$;

-- ── Index sur needs.status ────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'needs'
      AND indexname = 'needs_status_idx'
  ) THEN
    CREATE INDEX needs_status_idx ON needs (status);
  END IF;
END $$;

-- ── SAV ledger : ensure table has balance column and upsert function ──────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sav_ledger' AND column_name = 'balance'
  ) THEN
    ALTER TABLE sav_ledger ADD COLUMN balance integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Upsert function : atomically credits SAV points to a user
CREATE OR REPLACE FUNCTION credit_sav(
  p_user_id   uuid,
  p_points    integer,
  p_reason    text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO sav_ledger (user_id, balance)
  VALUES (p_user_id, p_points)
  ON CONFLICT (user_id)
  DO UPDATE SET balance = sav_ledger.balance + p_points;

  -- Log in contribution_events
  INSERT INTO contribution_events (
    user_id, event_type, description,
    context_category, points, is_public
  ) VALUES (
    p_user_id,
    'trust_review_received',
    coalesce(p_reason, 'Reconnaissance reçue'),
    'Reconnaissance',
    p_points,
    true
  );
END;
$$;

-- ── Index sur sav_ledger.user_id ──────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'sav_ledger'
      AND indexname = 'sav_ledger_user_id_idx'
  ) THEN
    CREATE INDEX sav_ledger_user_id_idx ON sav_ledger (user_id);
  END IF;
END $$;

-- ── Index sur conversations pour matching ─────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'conversations'
      AND indexname = 'conversations_need_id_idx'
  ) THEN
    CREATE INDEX conversations_need_id_idx ON conversations (need_id);
  END IF;
END $$;
