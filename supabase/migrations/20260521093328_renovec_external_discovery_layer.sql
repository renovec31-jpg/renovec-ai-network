/*
  # RENOVEC — External Discovery Layer

  ## Purpose
  Implements the 3-layer discovery architecture:
  - Layer 1: Internal network (capability_profiles, existing tables)
  - Layer 2: External signals discovered from the web
  - Layer 3: Conversion tracking (invitations, outreach, dossiers)

  ## New Tables

  ### external_signals
  Stores detected external capacities, people, structures, or resources found via web signals.
  Each signal is a qualified lead that can be matched to RENOVEC situations.

  Columns:
  - id: UUID primary key
  - signal_type: 'person' | 'structure' | 'resource' | 'offer'
  - source_platform: where it was found (LinkedIn, Pages Jaunes, Annuaire, etc.)
  - source_url: original URL (nullable, for public pages only)
  - display_name: name of the person/structure
  - tagline: short human-readable description
  - summary: fuller description of what they offer
  - capabilities: JSONB array of capability descriptors
  - domains: JSONB array of relevant domains
  - location_hint: city, region or distance descriptor
  - is_local: boolean
  - confidence_score: 0.0-1.0 AI qualification score
  - freshness_score: 0.0-1.0 how recent/active the signal is
  - relevance_tags: JSONB string array
  - raw_signal: JSONB of original scraped/detected data
  - source_status: 'raw' | 'qualified' | 'deduplicated' | 'matched' | 'archived'
  - conversion_status: 'none' | 'invited' | 'contacted' | 'joined' | 'declined'
  - conversion_need_id: FK to needs if this signal was matched to a situation
  - matched_at: when this signal was matched to a situation
  - created_at, updated_at

  ### signal_discovery_runs
  Tracks when discovery was run for a given situation, to avoid redundant API calls.

  Columns:
  - id: UUID
  - need_id: FK to needs
  - user_id: FK to auth.users
  - query_text: the situation text used for discovery
  - signals_found: count of signals returned
  - ran_at: timestamp

  ### signal_conversions
  Records conversion actions taken on external signals.

  Columns:
  - id: UUID
  - signal_id: FK to external_signals
  - need_id: FK to needs (the situation that triggered this)
  - user_id: the user taking action
  - action: 'invite_sent' | 'message_sent' | 'need_created' | 'dossier_opened'
  - context_note: short note attached to the conversion action
  - created_at

  ## Security
  - RLS enabled on all tables
  - Users can read all qualified signals (discovery is semi-public within RENOVEC)
  - Only authenticated users can trigger conversions
  - Only service role can insert/update signals (done via edge function)
*/

-- ── external_signals ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS external_signals (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_type         text NOT NULL DEFAULT 'person'
                        CHECK (signal_type IN ('person','structure','resource','offer')),
  source_platform     text NOT NULL DEFAULT 'web',
  source_url          text,
  display_name        text NOT NULL DEFAULT '',
  tagline             text NOT NULL DEFAULT '',
  summary             text NOT NULL DEFAULT '',
  capabilities        jsonb NOT NULL DEFAULT '[]',
  domains             jsonb NOT NULL DEFAULT '[]',
  location_hint       text,
  is_local            boolean NOT NULL DEFAULT false,
  confidence_score    numeric(4,3) NOT NULL DEFAULT 0.5
                        CHECK (confidence_score >= 0 AND confidence_score <= 1),
  freshness_score     numeric(4,3) NOT NULL DEFAULT 0.5
                        CHECK (freshness_score >= 0 AND freshness_score <= 1),
  relevance_tags      jsonb NOT NULL DEFAULT '[]',
  raw_signal          jsonb NOT NULL DEFAULT '{}',
  source_status       text NOT NULL DEFAULT 'qualified'
                        CHECK (source_status IN ('raw','qualified','deduplicated','matched','archived')),
  conversion_status   text NOT NULL DEFAULT 'none'
                        CHECK (conversion_status IN ('none','invited','contacted','joined','declined')),
  conversion_need_id  uuid REFERENCES needs(id) ON DELETE SET NULL,
  matched_at          timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE external_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read qualified signals"
  ON external_signals FOR SELECT
  TO authenticated
  USING (source_status IN ('qualified','deduplicated','matched'));

CREATE POLICY "Service role can insert signals"
  ON external_signals FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can update signals"
  ON external_signals FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS external_signals_confidence_idx
  ON external_signals (confidence_score DESC);

CREATE INDEX IF NOT EXISTS external_signals_domains_idx
  ON external_signals USING gin (domains);

CREATE INDEX IF NOT EXISTS external_signals_capabilities_idx
  ON external_signals USING gin (capabilities);

CREATE INDEX IF NOT EXISTS external_signals_conversion_idx
  ON external_signals (conversion_status, source_status);

-- ── signal_discovery_runs ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS signal_discovery_runs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id         uuid REFERENCES needs(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query_text      text NOT NULL DEFAULT '',
  signals_found   int NOT NULL DEFAULT 0,
  ran_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE signal_discovery_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own discovery runs"
  ON signal_discovery_runs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own discovery runs"
  ON signal_discovery_runs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ── signal_conversions ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS signal_conversions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id     uuid NOT NULL REFERENCES external_signals(id) ON DELETE CASCADE,
  need_id       uuid REFERENCES needs(id) ON DELETE SET NULL,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action        text NOT NULL DEFAULT 'invite_sent'
                  CHECK (action IN ('invite_sent','message_sent','need_created','dossier_opened')),
  context_note  text NOT NULL DEFAULT '',
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE signal_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own conversions"
  ON signal_conversions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversions"
  ON signal_conversions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
