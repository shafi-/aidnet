-- ====================================================================
-- Org listing + suspension support WITHOUT the view-rework architecture.
-- The prior view rework (security_hardening / update_org_views_with_meta)
-- rebuilt organization_view/organization_detail_view with security_invoker
-- and coupled functions to those views via DROP VIEW … CASCADE. That made
-- `db reset` non-reproducible. Here we instead inline the org_meta JOIN
-- inside the listing functions (exactly what the view did), so the client's
-- OrganizationDetailView / OrganizationView contracts still hold, with no
-- view, no CASCADE coupling, and base-table RLS still enforced on the
-- SECURITY INVOKER path.
-- ====================================================================

-- System admin: all orgs with suspension status + display metadata.
DROP FUNCTION IF EXISTS get_all_organizations();
CREATE OR REPLACE FUNCTION get_all_organizations()
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
    GROUP BY o.id, o.slug, o.status, o.created_by, o.created_at, o.updated_at,
             COALESCE(om.name, o.name), COALESCE(om.description, o.description), om.logo_url, om.website_url, om.contact_email,
             om.contact_phone, om.address, om.social_links, om.settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION get_all_organizations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_all_organizations() TO authenticated;

-- Member: orgs the current user belongs to, with suspension status so the
--   selector can disable suspended orgs.
DROP FUNCTION IF EXISTS get_my_organizations();
CREATE OR REPLACE FUNCTION get_my_organizations()
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
  WHERE om.user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION get_my_organizations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_my_organizations() TO authenticated;

-- Single org detail for a member (org:read). Status lets the UI detect and
--   disable suspended orgs in the selector and on restore.
DROP FUNCTION IF EXISTS get_organization(UUID);
CREATE OR REPLACE FUNCTION get_organization(target_org_id UUID)
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
  WHERE o.id = target_org_id
    AND can_perform('org:read', target_org_id)
  GROUP BY o.id, o.slug, o.status, o.created_by, o.created_at, o.updated_at,
           COALESCE(om.name, o.name), COALESCE(om.description, o.description), om.logo_url, om.website_url, om.contact_email,
           om.contact_phone, om.address, om.social_links, om.settings;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION get_organization(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_organization(UUID) TO authenticated;
