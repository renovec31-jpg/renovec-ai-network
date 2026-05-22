/*
  # Fix avatars bucket: remove broad SELECT policy that allows listing

  Public buckets serve files via direct URL without needing a SELECT policy.
  The "Avatar public read" policy on storage.objects allowed any client to
  list all files in the bucket, which is more permissive than needed.

  Fix: drop the broad public SELECT policy. Direct public URL access (via
  the CDN / storage public URL) is controlled by the bucket's `public` flag,
  not by RLS policies, so removing this policy does not break image loading.
*/

DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
