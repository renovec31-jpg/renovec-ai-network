/*
  # Revoke PUBLIC execute on credit_sav

  The proacl showed =X/postgres (PUBLIC grant) remaining after role-specific revokes.
  Revoke from PUBLIC to fully lock down the function.
*/

REVOKE EXECUTE ON FUNCTION public.credit_sav(uuid, integer, text) FROM PUBLIC;
