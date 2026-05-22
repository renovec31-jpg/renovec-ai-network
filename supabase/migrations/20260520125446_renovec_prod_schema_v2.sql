/*
  # RENOVEC HCN — Production Schema v2

  ## Summary
  Extends the core schema with all missing production-grade tables required by the dev-ready spec.
  Adds sessions enrichment, payments, trust_reviews, public contributions feed, admin_events,
  and aligns capability_profiles with the richer prod model (impact_summary, sav_points columns).

  ## Changes

  ### 1. capability_profiles — new columns
  - `impact_summary` text: human-readable summary of observed impact
  - `sav_points` integer: cached total SAV points for quick display
  - `tagline` text: one-line summary used on cards

  ### 2. sessions — enriched
  Already exists. Add `ended_at` timestamptz and `scheduled_at` timestamptz if missing.

  ### 3. payments
  New table. Records payment intent and outcome per session.

  ### 4. trust_reviews
  New table. Replaces trust_signals with richer structure aligned to spec (clarity, usefulness,
  reliability, pedagogy, reassurance, follow_through + qualitative_summary).

  ### 5. contributions (public feed)
  New table. Public/shareable contribution records derived from sessions or events.

  ### 6. admin_events
  New table. Audit log for moderator and admin actions.

  ## Security
  - RLS enabled on all new tables
  - Payments readable only by payer or receiver
  - Trust reviews readable by reviewer and reviewed user
  - Contributions: public ones readable by all authenticated users
  - Admin events: only moderators/admins via service role (no self-service)
*/

-- =====================
-- CAPABILITY PROFILES — enrichment columns
-- =====================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'capability_profiles' AND column_name = 'tagline'
  ) THEN
    ALTER TABLE capability_profiles ADD COLUMN tagline text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'capability_profiles' AND column_name = 'impact_summary'
  ) THEN
    ALTER TABLE capability_profiles ADD COLUMN impact_summary text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'capability_profiles' AND column_name = 'sav_points'
  ) THEN
    ALTER TABLE capability_profiles ADD COLUMN sav_points integer DEFAULT 0;
  END IF;
END $$;

-- =====================
-- SESSIONS — enrich with scheduling
-- =====================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'scheduled_at'
  ) THEN
    ALTER TABLE sessions ADD COLUMN scheduled_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sessions' AND column_name = 'ended_at'
  ) THEN
    ALTER TABLE sessions ADD COLUMN ended_at timestamptz;
  END IF;
END $$;

-- =====================
-- PAYMENTS
-- =====================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  payer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'EUR',
  status text NOT NULL DEFAULT 'pending',
  provider_payment_id text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payer can read own payments"
  ON payments FOR SELECT TO authenticated
  USING (auth.uid() = payer_id OR auth.uid() = receiver_id);

CREATE POLICY "Payer can insert payment"
  ON payments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = payer_id);

CREATE POLICY "Participants can update payment status"
  ON payments FOR UPDATE TO authenticated
  USING (auth.uid() = payer_id OR auth.uid() = receiver_id)
  WITH CHECK (auth.uid() = payer_id OR auth.uid() = receiver_id);

CREATE INDEX IF NOT EXISTS payments_payer_idx ON payments(payer_id);
CREATE INDEX IF NOT EXISTS payments_receiver_idx ON payments(receiver_id);
CREATE INDEX IF NOT EXISTS payments_session_idx ON payments(session_id);

-- =====================
-- TRUST REVIEWS (enriched, replaces basic trust_signals for reviews)
-- =====================
CREATE TABLE IF NOT EXISTS trust_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id uuid REFERENCES needs(id) ON DELETE SET NULL,
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reviewed_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  clarity_score integer DEFAULT 0 CHECK (clarity_score BETWEEN 0 AND 100),
  usefulness_score integer DEFAULT 0 CHECK (usefulness_score BETWEEN 0 AND 100),
  reliability_score integer DEFAULT 0 CHECK (reliability_score BETWEEN 0 AND 100),
  pedagogy_score integer DEFAULT 0 CHECK (pedagogy_score BETWEEN 0 AND 100),
  reassurance_score integer DEFAULT 0 CHECK (reassurance_score BETWEEN 0 AND 100),
  follow_through_score integer DEFAULT 0 CHECK (follow_through_score BETWEEN 0 AND 100),
  qualitative_summary text DEFAULT '',
  is_public boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trust_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reviewer can read reviews they wrote"
  ON trust_reviews FOR SELECT TO authenticated
  USING (auth.uid() = reviewer_id OR auth.uid() = reviewed_id);

CREATE POLICY "Reviewer can insert review"
  ON trust_reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reviewer_id AND reviewer_id <> reviewed_id);

CREATE INDEX IF NOT EXISTS trust_reviews_reviewed_idx ON trust_reviews(reviewed_id);
CREATE INDEX IF NOT EXISTS trust_reviews_session_idx ON trust_reviews(session_id);

-- =====================
-- CONTRIBUTIONS (public feed)
-- =====================
CREATE TABLE IF NOT EXISTS contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  need_id uuid REFERENCES needs(id) ON DELETE SET NULL,
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  contribution_type text NOT NULL DEFAULT 'clarification',
  title text NOT NULL DEFAULT '',
  context_label text DEFAULT '',
  summary text DEFAULT '',
  impact_label text DEFAULT '',
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authors can read own contributions"
  ON contributions FOR SELECT TO authenticated
  USING (auth.uid() = author_id OR is_public = true);

CREATE POLICY "Authors can insert contributions"
  ON contributions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own contributions"
  ON contributions FOR UPDATE TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE INDEX IF NOT EXISTS contributions_author_idx ON contributions(author_id);
CREATE INDEX IF NOT EXISTS contributions_public_idx ON contributions(is_public, created_at DESC);

-- =====================
-- ADMIN EVENTS (audit log)
-- =====================
CREATE TABLE IF NOT EXISTS admin_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL DEFAULT '',
  entity_type text NOT NULL DEFAULT '',
  entity_id uuid,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_events ENABLE ROW LEVEL SECURITY;

-- Admin events are insert-only from service role; no self-service read
-- Authenticated users cannot read or write admin events directly
-- (service role bypasses RLS; this prevents accidental exposure)
CREATE POLICY "No direct user access to admin events"
  ON admin_events FOR SELECT TO authenticated
  USING (false);

CREATE INDEX IF NOT EXISTS admin_events_entity_idx ON admin_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS admin_events_actor_idx ON admin_events(actor_id);
CREATE INDEX IF NOT EXISTS admin_events_created_idx ON admin_events(created_at DESC);

-- =====================
-- CONTRIBUTION EVENTS — enrich with impact_label and context_category
-- =====================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contribution_events' AND column_name = 'impact_label'
  ) THEN
    ALTER TABLE contribution_events ADD COLUMN impact_label text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contribution_events' AND column_name = 'context_category'
  ) THEN
    ALTER TABLE contribution_events ADD COLUMN context_category text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'contribution_events' AND column_name = 'is_public'
  ) THEN
    ALTER TABLE contribution_events ADD COLUMN is_public boolean DEFAULT false;
  END IF;
END $$;
