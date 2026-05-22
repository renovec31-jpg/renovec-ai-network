/*
  # Fix RLS policies with always-true WITH CHECK clauses

  ## Issues fixed

  1. `m_conversation_members` — `m_conv_members_insert`:
     WITH CHECK was `true`, allowing any authenticated user to insert a membership
     for any user_id into any conversation. Fixed to enforce that users can only
     add themselves as a member, and only to conversations linked to their own situations.

  2. `m_conversations` — `m_conversations_insert`:
     WITH CHECK was `true`, allowing any authenticated user to create a conversation
     for any situation_id. Fixed to require the situation belongs to the inserting user.

  3. `m_conversations` — `m_conversations_update`:
     WITH CHECK was `true` (USING already checked membership but the check clause
     allowed promoting any conversation_id or situation_id). Fixed WITH CHECK to
     mirror the USING predicate. Also fixes a bug in the USING clause where
     `cm.conversation_id = cm.id` was self-referential instead of joining to the
     parent table.

  4. `m_matches` — `m_matches_update`:
     WITH CHECK was `true`. Fixed to mirror the USING predicate (situation owned
     by the authenticated user).

  ## Notes
  - `m_matches_service_insert` (WITH CHECK true, service_role) is intentional —
    the edge function uses the service role key to insert matches. Left unchanged.
  - The broken self-join in `m_conversations_select` is also corrected here.
*/

-- ── m_conversation_members: insert ──────────────────────────────────────────

DROP POLICY IF EXISTS "m_conv_members_insert" ON m_conversation_members;

CREATE POLICY "m_conv_members_insert"
  ON m_conversation_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- User can only add themselves
    auth.uid() = user_id
    AND
    -- Conversation must belong to a situation owned by this user
    EXISTS (
      SELECT 1
      FROM m_conversations c
      JOIN m_situations s ON s.id = c.situation_id
      WHERE c.id = conversation_id
        AND s.user_id = auth.uid()
    )
  );

-- ── m_conversations: insert ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "m_conversations_insert" ON m_conversations;

CREATE POLICY "m_conversations_insert"
  ON m_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM m_situations s
      WHERE s.id = situation_id
        AND s.user_id = auth.uid()
    )
  );

-- ── m_conversations: select (fix self-referential bug) ──────────────────────

DROP POLICY IF EXISTS "m_conversations_select" ON m_conversations;

CREATE POLICY "m_conversations_select"
  ON m_conversations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM m_conversation_members cm
      WHERE cm.conversation_id = m_conversations.id
        AND cm.user_id = auth.uid()
    )
  );

-- ── m_conversations: update ──────────────────────────────────────────────────

DROP POLICY IF EXISTS "m_conversations_update" ON m_conversations;

CREATE POLICY "m_conversations_update"
  ON m_conversations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM m_conversation_members cm
      WHERE cm.conversation_id = m_conversations.id
        AND cm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM m_conversation_members cm
      WHERE cm.conversation_id = m_conversations.id
        AND cm.user_id = auth.uid()
    )
  );

-- ── m_matches: update ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "m_matches_update" ON m_matches;

CREATE POLICY "m_matches_update"
  ON m_matches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM m_situations s
      WHERE s.id = m_matches.situation_id
        AND s.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM m_situations s
      WHERE s.id = m_matches.situation_id
        AND s.user_id = auth.uid()
    )
  );
