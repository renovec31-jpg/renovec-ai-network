/*
  # Fix: allow anonymous read of published capability profiles

  ## Problem
  The existing SELECT policy on capability_profiles is restricted to the
  `authenticated` role. Unauthenticated visitors (anon role) cannot read
  any rows, so the map on /carte appears empty for logged-out users.

  ## Change
  Add a separate SELECT policy for the `anon` role that allows reading
  rows where is_published = true. Seed rows and real published profiles
  are both covered by this condition.
*/

CREATE POLICY "Anon can read published capability profiles"
  ON capability_profiles
  FOR SELECT
  TO anon
  USING (is_published = true);
