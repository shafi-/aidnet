-- Two overloads of get_public_campaigns existed with IDENTICAL argument
-- names but conflicting types:
--   (zakat_filter boolean, org_filter uuid, result_limit int)   -- original
--   (org_filter uuid, result_limit int, zakat_filter boolean)   -- request-flow rework
-- The client always calls with named args {zakat_filter, org_filter,
-- result_limit} (all nullable). With both overloads present PostgREST
-- cannot infer parameter types for NULL literals and answers 300 Multiple
-- Choices, breaking every anon campaign listing.
--
-- Keep the rework version: it additionally filters out suspended orgs.
-- All-NULL calls behave identically on either signature.

DROP FUNCTION IF EXISTS public.get_public_campaigns(
  p_zakat_filter boolean,
  p_org_filter uuid,
  p_result_limit integer
);

-- The original declared its parameters WITHOUT the p_ prefix; drop that
-- spelling too (positional types are what Postgres matches on).
DROP FUNCTION IF EXISTS public.get_public_campaigns(boolean, uuid, integer);
