/*
  # Public Map Clusters View — Privacy-Safe Aggregated Data

  ## Purpose
  Expose anonymized, aggregated capability profile data for the public landing page map teaser.
  No exact GPS, no full names, no contact details. Only zone-level density and one capability label per cell.

  ## What it returns
  - Grid cell (lat/lng rounded to 0.1 degrees ≈ ~10km)
  - Count of profiles in that cell
  - One representative capability label
  - City name (most common in cell)
  - Jittered display centroid (deterministic ±0.02 deg ≈ ~2km, not reversible to exact coords)

  ## Security
  - No user_id, no email, no exact GPS coordinates exposed
  - Only published profiles (is_published = true)
  - Accessible to anon for landing page public queries
*/

DROP VIEW IF EXISTS public.public_map_clusters;

CREATE VIEW public.public_map_clusters AS
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
    count(*)::integer                                      AS profile_count,
    min(cap_label)                                         AS sample_capability,
    -- most common city in this cell
    (array_agg(city ORDER BY city))[1]                    AS city
  FROM base
  GROUP BY glat, glng
  HAVING count(*) >= 1
)
SELECT
  glat                                                              AS grid_lat,
  glng                                                              AS grid_lng,
  profile_count,
  sample_capability,
  city,
  -- Deterministic jitter: ±0.02 deg derived from cell key, hides exact centroid
  (glat + ((hashtext(glat::text || '|' || glng::text) % 400)::double precision / 20000.0))  AS display_lat,
  (glng + ((hashtext(glng::text || '|' || glat::text) % 400)::double precision / 20000.0))  AS display_lng
FROM agg;

-- Allow unauthenticated (landing page visitors) to query aggregated data
GRANT SELECT ON public.public_map_clusters TO anon;
GRANT SELECT ON public.public_map_clusters TO authenticated;
