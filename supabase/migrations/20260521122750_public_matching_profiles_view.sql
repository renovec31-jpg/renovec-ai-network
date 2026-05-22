/*
  # Public Matching Profiles View — Anonymized for Guest Visitors

  ## Purpose
  Expose a privacy-safe version of capability_profiles for unauthenticated visitors
  during the guest matching flow. No PII is exposed.

  ## What is exposed (safe for anon)
  - id, profile_type, availability
  - First name initial + title (NOT full name)
  - explicit_capabilities, help_formats (what they offer)
  - success_contexts (what situations they've helped with)
  - sav_points (trust score — not PII)
  - vitrine_hero_title, vitrine_pitch, vitrine_services (AI-generated marketing copy)
  - vitrine_badges, vitrine_response_time
  - city (approximate zone — NOT exact coordinates)
  - is_published filter enforced

  ## What is NOT exposed
  - user_id
  - exact lat/lng coordinates
  - email, phone, address
  - summary (may contain personal details)
  - relational_style (may be personal)
  - vitrine_bio (may contain personal details)
  - tagline if too personal (excluded, use vitrine_pitch instead)

  ## Security
  - SECURITY INVOKER: executes with caller's privileges, respects RLS
  - Only published profiles (is_published = true)
  - No joins to user_profiles or auth.users
*/

DROP VIEW IF EXISTS public.public_matching_profiles;

CREATE VIEW public.public_matching_profiles
  WITH (security_invoker = true)
AS
SELECT
  id,
  -- Safe identity: just first letter of title + title (no surname)
  upper(left(title, 1))                       AS initial,
  title,
  profile_type,
  city,
  availability,
  -- Capabilities (core matching data)
  explicit_capabilities,
  implicit_capabilities,
  success_contexts,
  help_formats,
  -- Trust signal (score only, no PII)
  sav_points,
  -- AI vitrine fields (marketing copy, safe)
  vitrine_hero_title,
  vitrine_pitch,
  vitrine_services,
  vitrine_portfolio,
  vitrine_faq,
  vitrine_badges,
  vitrine_response_time,
  vitrine_generated_at
FROM capability_profiles
WHERE is_published = true;

GRANT SELECT ON public.public_matching_profiles TO anon;
GRANT SELECT ON public.public_matching_profiles TO authenticated;
