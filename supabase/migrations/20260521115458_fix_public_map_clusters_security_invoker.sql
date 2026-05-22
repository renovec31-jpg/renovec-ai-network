/*
  # Fix Security Definer on public_map_clusters view

  ## Issue
  The view `public.public_map_clusters` was implicitly created with SECURITY DEFINER
  (PostgreSQL default for views), meaning it executes with the privileges of the view
  owner rather than the querying role. This bypasses RLS on the underlying tables.

  ## Fix
  Recreate the view with SECURITY INVOKER so it executes with the caller's privileges,
  respecting RLS policies on `capability_profiles`.

  ## Notes
  - SECURITY INVOKER is the correct default for public-facing views
  - The underlying `capability_profiles` table has RLS enabled with is_published = true filter in the view
  - anon and authenticated grants are re-applied after recreation
*/

DROP VIEW IF EXISTS public.public_map_clusters;

CREATE VIEW public.public_map_clusters
  WITH (security_invoker = true)
AS
WITH base AS (
  SELECT
    round(lat::numeric, 1)  AS glat,
    round(lng::numeric, 1)  AS glng,
    CASE
      WHEN array_length(explicit_capabilities, 1) > 0 THEN explicit_capabilities[1]
      ELSE title
    END AS cap_label,
    city
  FROM capability_profiles
  WHERE is_published = true
    AND lat IS NOT NULL
    AND lng IS NOT NULL
),
agg AS (
  SELECT
    glat,
    glng,
    count(*)::integer                  AS profile_count,
    min(cap_label)                     AS sample_capability,
    (array_agg(city ORDER BY city))[1] AS city
  FROM base
  GROUP BY glat, glng
  HAVING count(*) >= 1
)
SELECT
  glat                                                                                        AS grid_lat,
  glng                                                                                        AS grid_lng,
  profile_count,
  sample_capability,
  city,
  (glat + ((hashtext(glat::text || '|' || glng::text) % 400)::double precision / 20000.0))  AS display_lat,
  (glng + ((hashtext(glng::text || '|' || glat::text) % 400)::double precision / 20000.0))  AS display_lng
FROM agg;

GRANT SELECT ON public.public_map_clusters TO anon;
GRANT SELECT ON public.public_map_clusters TO authenticated;
