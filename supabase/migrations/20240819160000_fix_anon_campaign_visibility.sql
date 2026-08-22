-- Public campaign visibility must not depend on tables hidden from anon by RLS.
-- Two fixes:
-- 1. Anon table policy required an active organization_members row, but members
--    RLS denies anon SELECT on that table -> subquery always empty -> anon could
--    never see ANY live campaign.
-- 2. get_campaign_by_slug gated everything behind can_perform()/is_system_admin(),
--    so even live+active campaigns were invisible without a session.

DROP POLICY IF EXISTS "Anon can view live campaigns" ON campaigns;

CREATE POLICY "Anon can view live campaigns"
  ON campaigns
  FOR SELECT
  TO anon
  USING (status = 'live' AND is_active = true);

CREATE OR REPLACE FUNCTION public.get_campaign_by_slug(p_slug text)
  RETURNS SETOF campaigns
  LANGUAGE sql
  SET search_path TO 'public'
AS $function$
  SELECT * FROM campaigns
  WHERE slug = p_slug
    AND (
      can_perform('campaigns:read', org_id)
      OR is_system_admin()
      OR (status = 'live' AND is_active)
    );
$function$;
