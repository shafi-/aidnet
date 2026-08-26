-- ============================================================================
-- get_campaign_tag_ids(p_campaign_id)
--
-- Read the tag ids currently attached to one campaign. Companion to
-- set_campaign_tags (which is destructive: DELETE-all-then-INSERT), so any
-- client that edits tags must load the current ids first or it silently
-- wipes them.
--
-- Authorization: SECURITY INVOKER + deny-by-default RLS on campaign_tag_map,
-- plus an explicit can_perform check matching get_campaign's house style.
-- Unknown campaign id -> org lookup is NULL -> can_perform FALSE -> no rows.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_campaign_tag_ids(p_campaign_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT m.tag_id
  FROM campaign_tag_map m
  WHERE m.campaign_id = p_campaign_id
    AND can_perform(
      'campaigns:read',
      (SELECT c.org_id FROM campaigns c WHERE c.id = p_campaign_id)
    )
  ORDER BY m.tag_id ASC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_campaign_tag_ids(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_campaign_tag_ids(UUID) TO authenticated;
