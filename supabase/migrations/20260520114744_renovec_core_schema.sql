/*
  # RENOVEC HCN — Core Schema

  ## Summary
  Creates the foundational tables for the Human Capability Network application.

  ## New Tables

  ### users_profiles
  Extended user data beyond Supabase auth: role, location, language, avatar, bio.

  ### needs
  User-submitted situations/problems expressed in free text, with status tracking.

  ### need_attachments
  Files attached to a need.

  ### clarifications
  AI-generated clarification results for a need: reformulation, objective, context, urgency, etc.

  ### capability_profiles
  Rich profiles describing what a person can help with, how they help, in what contexts.

  ### context_tags
  Taxonomy tags for contexts, domains, formats.

  ### capability_context_tags
  Join table linking capability profiles to context tags.

  ### matches
  AI-computed matches between a need and capability profiles.

  ### conversations
  Contextual discussions tied to a need + capability pair.

  ### messages
  Individual messages within a conversation.

  ### sessions
  Formal help sessions (micro-aide, diagnostic, mission, etc.).

  ### contribution_events
  Records of meaningful human contributions.

  ### sav_ledger
  Cumulative contribution capital per user.

  ### trust_signals
  Multidimensional qualitative trust records.

  ### notifications
  In-app notifications.

  ### consents
  GDPR consent records.

  ## Security
  - RLS enabled on all tables
  - Policies restrict access to authenticated owners
  - Public read for capability profiles (discovery)
*/

-- =====================
-- USER PROFILES
-- =====================
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  bio text DEFAULT '',
  location text DEFAULT '',
  language text DEFAULT 'fr',
  roles text[] DEFAULT ARRAY['seeker'],
  onboarding_seeker_done boolean DEFAULT false,
  onboarding_provider_done boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- =====================
-- CONTEXT TAGS
-- =====================
CREATE TABLE IF NOT EXISTS context_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  category text NOT NULL DEFAULT 'domain',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE context_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read context tags"
  ON context_tags FOR SELECT TO authenticated
  USING (true);

-- =====================
-- NEEDS
-- =====================
CREATE TABLE IF NOT EXISTS needs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_text text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  urgency text DEFAULT 'normal',
  is_voice boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE needs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own needs"
  ON needs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own needs"
  ON needs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own needs"
  ON needs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own needs"
  ON needs FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS needs_user_id_idx ON needs(user_id);

-- =====================
-- NEED ATTACHMENTS
-- =====================
CREATE TABLE IF NOT EXISTS need_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id uuid NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url text NOT NULL,
  file_name text NOT NULL DEFAULT '',
  file_type text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE need_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own need attachments"
  ON need_attachments FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own need attachments"
  ON need_attachments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =====================
-- CLARIFICATIONS
-- =====================
CREATE TABLE IF NOT EXISTS clarifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id uuid NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary text DEFAULT '',
  reformulated_objective text DEFAULT '',
  context_description text DEFAULT '',
  urgency_level text DEFAULT 'normal',
  missing_info text[] DEFAULT ARRAY[]::text[],
  vigilance_points text[] DEFAULT ARRAY[]::text[],
  recommended_format text DEFAULT '',
  suggested_questions jsonb DEFAULT '[]'::jsonb,
  answers jsonb DEFAULT '{}'::jsonb,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clarifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own clarifications"
  ON clarifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clarifications"
  ON clarifications FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clarifications"
  ON clarifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS clarifications_need_id_idx ON clarifications(need_id);

-- =====================
-- CAPABILITY PROFILES
-- =====================
CREATE TABLE IF NOT EXISTS capability_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT '',
  summary text DEFAULT '',
  explicit_capabilities text[] DEFAULT ARRAY[]::text[],
  implicit_capabilities text[] DEFAULT ARRAY[]::text[],
  success_contexts text[] DEFAULT ARRAY[]::text[],
  relational_style text DEFAULT '',
  help_formats text[] DEFAULT ARRAY[]::text[],
  availability text DEFAULT 'disponible',
  is_published boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE capability_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published capability profiles"
  ON capability_profiles FOR SELECT TO authenticated
  USING (is_published = true OR auth.uid() = user_id);

CREATE POLICY "Users can insert own capability profile"
  ON capability_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own capability profile"
  ON capability_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS capability_profiles_user_id_idx ON capability_profiles(user_id);

-- =====================
-- CAPABILITY CONTEXT TAGS
-- =====================
CREATE TABLE IF NOT EXISTS capability_context_tags (
  capability_profile_id uuid NOT NULL REFERENCES capability_profiles(id) ON DELETE CASCADE,
  context_tag_id uuid NOT NULL REFERENCES context_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (capability_profile_id, context_tag_id)
);

ALTER TABLE capability_context_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read capability context tags"
  ON capability_context_tags FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can manage own capability context tags"
  ON capability_context_tags FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM capability_profiles
      WHERE id = capability_profile_id AND user_id = auth.uid()
    )
  );

-- =====================
-- MATCHES
-- =====================
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id uuid NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
  capability_profile_id uuid NOT NULL REFERENCES capability_profiles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score numeric DEFAULT 0,
  reasons text[] DEFAULT ARRAY[]::text[],
  status text DEFAULT 'suggested',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own matches"
  ON matches FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own matches"
  ON matches FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS matches_need_id_idx ON matches(need_id);

-- =====================
-- CONVERSATIONS
-- =====================
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id uuid REFERENCES needs(id) ON DELETE SET NULL,
  seeker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text DEFAULT 'active',
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read conversations"
  ON conversations FOR SELECT TO authenticated
  USING (auth.uid() = seeker_id OR auth.uid() = provider_id);

CREATE POLICY "Seekers can create conversations"
  ON conversations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seeker_id);

CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE TO authenticated
  USING (auth.uid() = seeker_id OR auth.uid() = provider_id)
  WITH CHECK (auth.uid() = seeker_id OR auth.uid() = provider_id);

CREATE INDEX IF NOT EXISTS conversations_seeker_id_idx ON conversations(seeker_id);
CREATE INDEX IF NOT EXISTS conversations_provider_id_idx ON conversations(provider_id);

-- =====================
-- MESSAGES
-- =====================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  message_type text DEFAULT 'text',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation participants can read messages"
  ON messages FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.seeker_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );

CREATE POLICY "Conversation participants can insert messages"
  ON messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (c.seeker_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages(conversation_id);

-- =====================
-- SESSIONS
-- =====================
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  need_id uuid REFERENCES needs(id) ON DELETE SET NULL,
  seeker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_type text NOT NULL DEFAULT 'micro_aide',
  status text DEFAULT 'proposed',
  objective text DEFAULT '',
  deliverables text DEFAULT '',
  next_step text DEFAULT '',
  amount_cents integer DEFAULT 0,
  currency text DEFAULT 'EUR',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read sessions"
  ON sessions FOR SELECT TO authenticated
  USING (auth.uid() = seeker_id OR auth.uid() = provider_id);

CREATE POLICY "Participants can insert sessions"
  ON sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = seeker_id OR auth.uid() = provider_id);

CREATE POLICY "Participants can update sessions"
  ON sessions FOR UPDATE TO authenticated
  USING (auth.uid() = seeker_id OR auth.uid() = provider_id)
  WITH CHECK (auth.uid() = seeker_id OR auth.uid() = provider_id);

-- =====================
-- CONTRIBUTION EVENTS
-- =====================
CREATE TABLE IF NOT EXISTS contribution_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT '',
  description text DEFAULT '',
  context text DEFAULT '',
  points integer DEFAULT 1,
  related_session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE contribution_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own contribution events"
  ON contribution_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own contribution events"
  ON contribution_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- =====================
-- SAV LEDGER
-- =====================
CREATE TABLE IF NOT EXISTS sav_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  total_points integer DEFAULT 0,
  contexts_summary jsonb DEFAULT '{}'::jsonb,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sav_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own SAV ledger"
  ON sav_ledger FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own SAV ledger"
  ON sav_ledger FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own SAV ledger"
  ON sav_ledger FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =====================
-- TRUST SIGNALS
-- =====================
CREATE TABLE IF NOT EXISTS trust_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  giver_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  clarity integer DEFAULT 0,
  usefulness integer DEFAULT 0,
  reliability integer DEFAULT 0,
  pedagogy integer DEFAULT 0,
  follow_through integer DEFAULT 0,
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trust_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read trust signals about themselves"
  ON trust_signals FOR SELECT TO authenticated
  USING (auth.uid() = recipient_id OR auth.uid() = giver_id);

CREATE POLICY "Users can insert trust signals they give"
  ON trust_signals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = giver_id);

CREATE INDEX IF NOT EXISTS trust_signals_recipient_id_idx ON trust_signals(recipient_id);

-- =====================
-- NOTIFICATIONS
-- =====================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  body text DEFAULT '',
  is_read boolean DEFAULT false,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications(user_id);

-- =====================
-- CONSENTS
-- =====================
CREATE TABLE IF NOT EXISTS consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL DEFAULT '',
  consented boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own consents"
  ON consents FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consents"
  ON consents FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
