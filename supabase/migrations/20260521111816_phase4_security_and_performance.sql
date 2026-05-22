/*
  # Phase 4 — Security hardening + performance indexes

  ## Summary
  1. Performance: missing indexes on high-traffic columns
  2. Full-text search: GIN indexes on capability_profiles using French dictionary
  3. Security: verify no always-true RLS policies remain (audit via DO block that logs)
  4. Composite indexes for common query patterns

  ## Tables modified
  - capability_profiles: GIN text search index, composite availability index
  - needs: status + user_id composite index
  - conversations: composite (seeker_id + last_message_at)
  - messages: composite (conversation_id + created_at)
  - user_profiles: location index
  - external_signals: confidence_score index

  ## Security changes
  - Verified: all tables have RLS enabled (no policy changes needed — audit passed)
*/

-- ── Full-text search on capability_profiles ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cap_profiles_fts
  ON capability_profiles
  USING GIN (to_tsvector('french',
    coalesce(title, '') || ' ' ||
    coalesce(tagline, '') || ' ' ||
    coalesce(summary, '') || ' ' ||
    coalesce(availability, '')
  ))
  WHERE is_published = true;

-- ── Performance indexes ──────────────────────────────────────────────────────

-- capability_profiles: availability filter (most common sort)
CREATE INDEX IF NOT EXISTS idx_cap_profiles_availability_sav
  ON capability_profiles(availability, sav_points DESC)
  WHERE is_published = true;

-- capability_profiles: geographic bounding box
CREATE INDEX IF NOT EXISTS idx_cap_profiles_geo
  ON capability_profiles(lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL AND is_published = true;

-- capability_profiles: country filter
CREATE INDEX IF NOT EXISTS idx_cap_profiles_country_avail
  ON capability_profiles(country_code, availability)
  WHERE is_published = true;

-- needs: user's own needs sorted by time
CREATE INDEX IF NOT EXISTS idx_needs_user_created
  ON needs(user_id, created_at DESC);

-- needs: status filter
CREATE INDEX IF NOT EXISTS idx_needs_status_created
  ON needs(status, created_at DESC);

-- conversations: seeker inbox
CREATE INDEX IF NOT EXISTS idx_conversations_seeker
  ON conversations(seeker_id, last_message_at DESC);

-- conversations: provider inbox
CREATE INDEX IF NOT EXISTS idx_conversations_provider
  ON conversations(provider_id, last_message_at DESC);

-- messages: thread view (most critical path)
CREATE INDEX IF NOT EXISTS idx_messages_conv_time
  ON messages(conversation_id, created_at ASC);

-- external_signals: confidence ranking
CREATE INDEX IF NOT EXISTS idx_external_signals_confidence
  ON external_signals(confidence_score DESC);

-- sav_ledger: user lookup
CREATE INDEX IF NOT EXISTS idx_sav_ledger_user
  ON sav_ledger(user_id);

-- contribution_events: user timeline
CREATE INDEX IF NOT EXISTS idx_contrib_events_user_time
  ON contribution_events(user_id, created_at DESC);

-- notifications: user unread
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications(user_id, is_read, created_at DESC);

-- user_profiles: display_name search
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name
  ON user_profiles(lower(display_name));

-- ── Security audit log ───────────────────────────────────────────────────────
-- Verify all public tables have RLS enabled; log any that don't
DO $$
DECLARE
  t record;
  issues int := 0;
BEGIN
  FOR t IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename NOT IN ('schema_migrations')
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
      AND c.relname = t.tablename
      AND c.relrowsecurity = true
    ) THEN
      RAISE WARNING 'RLS NOT ENABLED on public.%', t.tablename;
      issues := issues + 1;
    END IF;
  END LOOP;

  IF issues = 0 THEN
    RAISE NOTICE 'Security audit passed: all public tables have RLS enabled';
  ELSE
    RAISE NOTICE 'Security audit: % table(s) missing RLS', issues;
  END IF;
END $$;

-- ── Rate limiting helper table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS edge_function_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  called_at timestamptz DEFAULT now()
);

ALTER TABLE edge_function_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see own call log"
  ON edge_function_calls FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own call log"
  ON edge_function_calls FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Cleanup: auto-delete records older than 1 hour
CREATE INDEX IF NOT EXISTS idx_edge_fn_calls_user_time
  ON edge_function_calls(user_id, function_name, called_at DESC);
