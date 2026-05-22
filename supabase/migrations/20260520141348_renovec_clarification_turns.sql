/*
  # Add clarification_turns table

  ## Purpose
  Store each turn of the coordinator conversation so the AI has
  real memory — it reads every prior exchange before responding.

  ## New Tables
  - `clarification_turns`
    - `id` (uuid, primary key)
    - `need_id` (uuid, FK to needs)
    - `user_id` (uuid, FK to auth.users)
    - `role` ('coordinator' | 'user') — who said this
    - `content` (text) — what was said
    - `turn_index` (int) — order in the conversation
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Users can only read/write their own turns
*/

CREATE TABLE IF NOT EXISTS clarification_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id uuid NOT NULL REFERENCES needs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('coordinator', 'user')),
  content text NOT NULL DEFAULT '',
  turn_index integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clarification_turns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own clarification turns"
  ON clarification_turns FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clarification turns"
  ON clarification_turns FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS clarification_turns_need_id_idx ON clarification_turns(need_id);
CREATE INDEX IF NOT EXISTS clarification_turns_user_id_idx ON clarification_turns(user_id);
