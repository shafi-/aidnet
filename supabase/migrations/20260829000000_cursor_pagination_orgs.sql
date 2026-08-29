-- Add cursor-based pagination to listing RPCs
-- Functions accept p_limit + p_cursor, return rows directly.
-- Client determines has_more (items.length === limit) and next cursor (last item id).

-- -----------------------------------------------------------------------------
-- get_all_organizations: add p_limit + p_cursor
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_all_organizations();
CREATE OR REPLACE FUNCTION get_all_organizations(
  p_limit int default 20,
  p_cursor text default null
)
RETURNS TABLE(
  id UUID,
  slug TEXT,
  status TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  member_count BIGINT,
  name TEXT,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  social_links JSONB,
  settings JSONB
) AS $$
DECLARE
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 100);
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;
  RETURN QUERY
    SELECT
      o.id,
      o.slug,
      o.status,
      o.created_by,
      o.created_at,
      o.updated_at,
      COUNT(DISTINCT mem.user_id) AS member_count,
      COALESCE(om.name, o.name) AS name,
      COALESCE(om.description, o.description) AS description,
      om.logo_url,
      om.website_url,
      om.contact_email,
      om.contact_phone,
      om.address,
      om.social_links,
      om.settings
    FROM organizations o
    LEFT JOIN organization_members mem
      ON o.id = mem.organization_id AND mem.status = 'active'
    LEFT JOIN org_meta om
      ON o.id = om.organization_id
    WHERE (p_cursor IS NULL OR o.id::text > p_cursor)
    GROUP BY o.id, o.slug, o.status, o.created_by, o.created_at, o.updated_at,
             om.name, om.description, om.logo_url, om.website_url, om.contact_email,
             om.contact_phone, om.address, om.social_links, om.settings
    ORDER BY o.id ASC
    LIMIT v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION get_all_organizations(int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_all_organizations(int, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- get_my_organizations: add p_limit + p_cursor
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_my_organizations();
CREATE OR REPLACE FUNCTION get_my_organizations(
  p_limit int default 20,
  p_cursor text default null
)
RETURNS TABLE(
  id UUID,
  slug TEXT,
  status TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  user_id UUID,
  user_role TEXT,
  membership_status TEXT,
  joined_at TIMESTAMPTZ,
  name TEXT,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  social_links JSONB,
  settings JSONB
) AS $$
  SELECT
    o.id,
    o.slug,
    o.status,
    o.created_by,
    o.created_at,
    o.updated_at,
    om.user_id,
    om.role AS user_role,
    om.status AS membership_status,
    om.joined_at,
    COALESCE(m.name, o.name) AS name,
    COALESCE(m.description, o.description) AS description,
    m.logo_url,
    m.website_url,
    m.contact_email,
    m.contact_phone,
    m.address,
    m.social_links,
    m.settings
  FROM organizations o
  LEFT JOIN organization_members om
    ON o.id = om.organization_id
  LEFT JOIN org_meta m
    ON o.id = m.organization_id
  WHERE om.user_id = auth.uid()
    AND (p_cursor IS NULL OR o.id::text > p_cursor)
  ORDER BY o.id ASC
  LIMIT least(greatest(coalesce(p_limit, 20), 1), 100);
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION get_my_organizations(int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_my_organizations(int, text) TO authenticated;
