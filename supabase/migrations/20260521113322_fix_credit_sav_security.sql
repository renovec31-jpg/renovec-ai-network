/*
  # Fix security issues on public.credit_sav

  ## Issues Fixed
  1. Function Search Path Mutable — set fixed search_path to prevent search_path injection
  2. Public Can Execute SECURITY DEFINER Function — revoke EXECUTE from anon
  3. Signed-In Users Can Execute SECURITY DEFINER Function — revoke EXECUTE from authenticated
     (function is internal infrastructure, should only be called by service role / internal triggers)

  ## Changes
  - Recreate credit_sav with SET search_path = public, pg_temp
  - REVOKE EXECUTE from both anon and authenticated roles
*/

-- Recreate with fixed search_path to prevent search_path injection attacks
CREATE OR REPLACE FUNCTION public.credit_sav(
  p_user_id uuid,
  p_points  integer,
  p_reason  text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO sav_ledger (user_id, balance)
  VALUES (p_user_id, p_points)
  ON CONFLICT (user_id)
  DO UPDATE SET balance = sav_ledger.balance + p_points;

  INSERT INTO contribution_events (
    user_id, event_type, description,
    context_category, points, is_public
  ) VALUES (
    p_user_id,
    'trust_review_received',
    coalesce(nullif(trim(p_reason), ''), 'Reconnaissance reçue'),
    'Reconnaissance',
    p_points,
    true
  );
END;
$$;

-- Revoke execution from public-facing roles
-- This function is internal infrastructure — only callable by service role or internal DB triggers
REVOKE EXECUTE ON FUNCTION public.credit_sav(uuid, integer, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.credit_sav(uuid, integer, text) FROM authenticated;
