-- ====================================================================
-- Public org directory
-- ====================================================================
-- The public /orgs directory lists every organization reachable through
-- the existing public surface: same visibility rule as
-- get_public_org_by_slug (>= 1 active member), same safe public fields.
-- EXECUTE surface mirrors 20261008200032_lock_rpc_execute_surface.sql.
-- ====================================================================

CREATE OR REPLACE FUNCTION donate.get_public_orgs()
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $$
  SELECT o.id, o.name, o.slug, o.description, o.created_at
  FROM donate.organizations o
  WHERE EXISTS (
    SELECT 1
    FROM donate.organization_members om
    WHERE om.organization_id = o.id
      AND om.status = 'active'
  )
  ORDER BY o.name;
$$;

REVOKE EXECUTE ON FUNCTION donate.get_public_orgs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION donate.get_public_orgs() TO anon, authenticated;
