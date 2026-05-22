/*
  # Profile photo + listings feed

  ## New columns on capability_profiles
  - `avatar_url` text — profile photo URL
  - `cover_url`  text — banner/cover photo URL

  ## New table: profile_listings
  Marketplace feed: services, new or second-hand objects, resources, demands.

  ## Security
  - RLS enabled — anon/auth can read published listings
  - Owner (via capability_profiles.user_id) can CRUD their own listings
*/

-- 1. Photo columns on capability_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'capability_profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE capability_profiles ADD COLUMN avatar_url text DEFAULT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'capability_profiles' AND column_name = 'cover_url'
  ) THEN
    ALTER TABLE capability_profiles ADD COLUMN cover_url text DEFAULT NULL;
  END IF;
END $$;

-- 2. profile_listings table
CREATE TABLE IF NOT EXISTS profile_listings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id    uuid NOT NULL REFERENCES capability_profiles(id) ON DELETE CASCADE,
  listing_type  text NOT NULL DEFAULT 'service'
                  CHECK (listing_type IN ('service','object_new','object_used','resource','demand')),
  title         text NOT NULL DEFAULT '',
  description   text NOT NULL DEFAULT '',
  price_hint    text NOT NULL DEFAULT 'Sur demande',
  condition     text DEFAULT NULL
                  CHECK (condition IS NULL OR condition IN ('new','like_new','good','fair')),
  category      text DEFAULT '',
  image_urls    text[] DEFAULT ARRAY[]::text[],
  tags          text[] DEFAULT ARRAY[]::text[],
  is_available  boolean NOT NULL DEFAULT true,
  is_published  boolean NOT NULL DEFAULT true,
  view_count    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profile_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published listings"
  ON profile_listings FOR SELECT
  TO anon, authenticated
  USING (is_published = true AND is_available = true);

CREATE POLICY "Profile owner can insert listings"
  ON profile_listings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM capability_profiles cp
      WHERE cp.id = profile_listings.profile_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Profile owner can update listings"
  ON profile_listings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM capability_profiles cp
      WHERE cp.id = profile_listings.profile_id AND cp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM capability_profiles cp
      WHERE cp.id = profile_listings.profile_id AND cp.user_id = auth.uid()
    )
  );

CREATE POLICY "Profile owner can delete listings"
  ON profile_listings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM capability_profiles cp
      WHERE cp.id = profile_listings.profile_id AND cp.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_profile_listings_profile_id ON profile_listings(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_listings_type       ON profile_listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_profile_listings_created    ON profile_listings(created_at DESC);
