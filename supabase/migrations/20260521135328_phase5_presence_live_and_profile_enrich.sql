/*
  # Phase 5 — Live Presence & Profile Enrichment

  1. Changes to user_profiles
     - Add `last_seen` timestamptz column (updated every 5 min by heartbeat)
     - Add `zone` text column: 'local' | 'distance' | 'both'
     - Add `avatar_url` already exists — confirm no-op

  2. Storage
     - Create `avatars` storage bucket (public)

  3. Security
     - Policy: users can update their own last_seen / zone
     - Avatars bucket: public read, auth write

  4. Indexes
     - Index on last_seen for presence queries
*/

-- last_seen + zone on user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'last_seen'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN last_seen timestamptz DEFAULT now();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'zone'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN zone text DEFAULT 'both';
  END IF;
END $$;

-- Index for presence queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_last_seen ON user_profiles(last_seen DESC);

-- Avatars storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Avatar public read' AND tablename = 'objects'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Avatar public read"
      ON storage.objects FOR SELECT
      TO public
      USING (bucket_id = 'avatars');
    $policy$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Avatar auth upload' AND tablename = 'objects'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Avatar auth upload"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
    $policy$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Avatar auth update' AND tablename = 'objects'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Avatar auth update"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
    $policy$;
  END IF;
END $$;

-- Allow users to update last_seen on their own row
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Users can update own last_seen and zone' AND tablename = 'user_profiles'
  ) THEN
    CREATE POLICY "Users can update own last_seen and zone"
    ON user_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;
