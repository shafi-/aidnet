-- ====================================================================
-- Personal organizations for individual fundraisers
-- ====================================================================
-- A user with no organization can still fundraise: the first time they
-- need a campaign, the client calls ensure_my_personal_org(), which gives
-- them their OWN organization (kind = 'personal') where they are the sole
-- owner-admin. Every existing gate then works unchanged — can_perform,
-- the Free plan auto-attached by trg_attach_default_plan, donation
-- confirmation, suspension, and the system-admin review queue.
--
-- Personal orgs are a tenancy container, not a listing entry: they are
-- surfaced through their campaigns (and get_public_org_by_slug), while
-- get_my_organizations now carries `kind` so the client can label them.
-- ====================================================================

SET search_path = donate, shared, extensions, private;

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'organization'
  CHECK (kind IN ('organization', 'personal'));

-- One personal org per user, enforced at the schema level so concurrent
-- ensure calls cannot create a second one.
CREATE UNIQUE INDEX IF NOT EXISTS uq_personal_org_per_user
  ON organizations(created_by) WHERE kind = 'personal';


-- Lazy creation/reuse of the caller's personal org. Returns its id.
-- SECURITY DEFINER because deny-all RLS on organizations/organization_members
-- must not gate a self-service provisioning path; the only authority it
-- grants is over the caller's OWN org (created_by = auth.uid()).
CREATE OR REPLACE FUNCTION ensure_my_personal_org()
RETURNS UUID AS $$
DECLARE
  v_uid UUID;
  v_org_id UUID;
  v_name TEXT;
  v_base_slug TEXT;
  v_slug TEXT;
  v_attempt INT;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Idempotent: return the existing personal org (matches the partial
  -- unique index exactly).
  SELECT id INTO v_org_id
  FROM organizations
  WHERE kind = 'personal' AND created_by = v_uid
  LIMIT 1;
  IF v_org_id IS NOT NULL THEN
    RETURN v_org_id;
  END IF;

  SELECT COALESCE(NULLIF(p.full_name, ''), split_part(p.email, '@', 1), 'Fundraiser')
    INTO v_name
  FROM shared.profiles p
  WHERE p.id = v_uid;

  v_base_slug := lower(regexp_replace(COALESCE(v_name, ''), '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := trim(both '-' from v_base_slug);
  IF v_base_slug IS NULL OR v_base_slug = '' THEN
    v_base_slug := 'fundraiser';
  END IF;

  v_slug := v_base_slug;
  v_org_id := NULL;
  FOR v_attempt IN 1..5 LOOP
    BEGIN
      -- trg_attach_default_plan arms the new org with the Free plan.
      INSERT INTO organizations (name, slug, created_by, status, kind)
      VALUES (v_name, v_slug, v_uid, 'active', 'personal')
      RETURNING id INTO v_org_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      v_slug := v_base_slug || '-' || substr(md5(random()::text), 1, 6);
    END;
  END LOOP;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Could not allocate a unique organization slug';
  END IF;

  INSERT INTO org_meta (organization_id, name, updated_by)
  VALUES (v_org_id, v_name, v_uid);

  -- Same membership shape as approve_org_request: sole admin + owner.
  INSERT INTO organization_members (organization_id, user_id, role, status, is_owner)
  VALUES (v_org_id, v_uid, 'admin', 'active', true);

  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

REVOKE EXECUTE ON FUNCTION ensure_my_personal_org() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ensure_my_personal_org() TO authenticated;


-- get_my_organizations: carry `kind` so the client can label personal orgs
-- in the selector and org lists. RETURN type changed, so the function is
-- dropped first; EXECUTE grants are re-issued right after (dropping loses
-- grants).
DROP FUNCTION IF EXISTS get_my_organizations(int, text);
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
  settings JSONB,
  kind TEXT
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
    m.settings,
    o.kind
  FROM organizations o
  LEFT JOIN organization_members om
    ON o.id = om.organization_id
  LEFT JOIN org_meta m
    ON o.id = m.organization_id
  WHERE om.user_id = auth.uid()
    AND (p_cursor IS NULL OR o.id::text > p_cursor)
  ORDER BY o.id ASC
  LIMIT least(greatest(coalesce(p_limit, 20), 1), 100);
$$ LANGUAGE sql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

REVOKE EXECUTE ON FUNCTION get_my_organizations(int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_my_organizations(int, text) TO authenticated;
