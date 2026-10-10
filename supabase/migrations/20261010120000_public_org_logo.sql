-- Public org landing page shows the organization logo. Postgres cannot
-- change a return type via CREATE OR REPLACE, so drop and recreate; the
-- grants below are re-issued to keep the exposure unchanged.
DROP FUNCTION IF EXISTS donate.get_public_org_by_slug(org_slug TEXT);

CREATE FUNCTION donate.get_public_org_by_slug(org_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  created_at TIMESTAMPTZ,
  logo_url TEXT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $$
  SELECT o.id, o.name, o.slug, o.description, o.created_at, o.logo_url
  FROM donate.organizations o
  WHERE o.slug = org_slug
    AND EXISTS (
      SELECT 1
      FROM donate.organization_members om
      WHERE om.organization_id = o.id
        AND om.status = 'active'
    );
$$;

REVOKE EXECUTE ON FUNCTION donate.get_public_org_by_slug(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION donate.get_public_org_by_slug(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION donate.get_public_org_by_slug(TEXT) TO authenticated;
