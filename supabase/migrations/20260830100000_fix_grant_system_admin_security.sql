-- Fix grant_system_admin: was SECURITY INVOKER, which runs as the caller
-- (authenticated role).  RLS policy `deny_all_profiles` blocks UPDATE on
-- profiles, so the function always failed with "User not found".
--
-- Changing to SECURITY DEFINER makes the UPDATE run as the function owner
-- (postgres), bypassing RLS.  The internal is_system_admin() check is the
-- real authorization guard — same pattern used by every other DB function.
ALTER FUNCTION public.grant_system_admin(uuid)
  SECURITY DEFINER
  SET search_path TO 'public';
