/*
  # Final Indexes & Security Hardening

  ## Purpose
  Ensure all performance-critical columns have indexes before launch.

  ## Indexes Added
  - capability_profiles: city, availability, profile_type, sav_points (filter + sort)
  - needs: user_id, status
  - conversations: seeker_id, provider_id, last_message_at
  - messages: conversation_id + created_at, sender_id
  - notifications: user_id + is_read (unread count), user_id + created_at
  - contributions: author_id, is_public + created_at
  - trust_reviews: reviewed_id, reviewer_id
  - contribution_events: user_id + created_at
  - sav_ledger: user_id
*/

-- ── Capability profiles ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cap_profiles_city
  ON capability_profiles (city) WHERE city IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cap_profiles_availability
  ON capability_profiles (availability) WHERE availability IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cap_profiles_profile_type
  ON capability_profiles (profile_type) WHERE profile_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cap_profiles_sav_points
  ON capability_profiles (sav_points DESC);

CREATE INDEX IF NOT EXISTS idx_cap_profiles_published_sav
  ON capability_profiles (is_published, sav_points DESC) WHERE is_published = true;

-- ── Needs ────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_needs_user_id ON needs (user_id);
CREATE INDEX IF NOT EXISTS idx_needs_status ON needs (status);
CREATE INDEX IF NOT EXISTS idx_needs_user_status ON needs (user_id, status);

-- ── Conversations ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_conversations_seeker ON conversations (seeker_id);
CREATE INDEX IF NOT EXISTS idx_conversations_provider ON conversations (provider_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations (last_message_at DESC);

-- ── Messages ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_messages_conv_created ON messages (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id);

-- ── Notifications ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

-- ── Contributions ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_contributions_author ON contributions (author_id);

CREATE INDEX IF NOT EXISTS idx_contributions_public_created
  ON contributions (is_public, created_at DESC) WHERE is_public = true;

-- ── Trust reviews ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_trust_reviews_reviewed ON trust_reviews (reviewed_id);
CREATE INDEX IF NOT EXISTS idx_trust_reviews_reviewer ON trust_reviews (reviewer_id);

-- ── Contribution events ──────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_contrib_events_user_created
  ON contribution_events (user_id, created_at DESC);

-- ── SAV ledger ───────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sav_ledger_user ON sav_ledger (user_id);

-- ── User profiles ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_profiles_created ON user_profiles (created_at DESC);
