-- ====================================================================
-- Organization Request Workflow
-- ====================================================================
-- This migration implements the clean org request + approval workflow:
-- 1. org_requests table: User-submitted org creation requests
-- 2. organizations table: Gets status column (active/suspended)  
-- 3. org_meta table: Org metadata (org_admin writable)
-- 4. Request/approval flow functions
-- ====================================================================

-- ====================================================================
-- 1. ADD STATUS COLUMN TO ORGANIZATIONS TABLE
-- ====================================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
-- Values: 'active' (fully functional), 'suspended' (read-only, no new campaigns)

-- created_by is required by the org insertion below; folded in from the
-- view-rework migration so this feature migration is self-contained.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- ====================================================================
-- 2. CREATE ORG_REQUESTS TABLE
-- ====================================================================

CREATE TABLE IF NOT EXISTS org_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  org_name TEXT NOT NULL,
  org_slug TEXT NOT NULL UNIQUE,
  org_description TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  rejection_reason TEXT,
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL
);

-- ====================================================================
-- 3. CREATE ORG_META TABLE
-- ====================================================================

CREATE TABLE IF NOT EXISTS org_meta (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  social_links JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- 4. CREATE REQUEST SUBMISSION FUNCTION
-- ====================================================================

CREATE OR REPLACE FUNCTION submit_org_request(
  p_org_name TEXT,
  p_org_slug TEXT,
  p_org_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
  INSERT INTO org_requests (user_id, org_name, org_slug, org_description)
  VALUES (auth.uid(), p_org_name, p_org_slug, p_org_description)
  RETURNING id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION submit_org_request(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION submit_org_request(TEXT, TEXT, TEXT) TO authenticated;

-- ====================================================================
-- 4b. CREATE REQUEST APPROVAL FUNCTION
-- ====================================================================

CREATE OR REPLACE FUNCTION approve_org_request(p_request_id UUID)
RETURNS UUID AS $$
DECLARE
  v_request org_requests;
  v_org_id UUID;
  v_user_id UUID;
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  -- Get the request details
  SELECT * INTO v_request
  FROM org_requests
  WHERE id = p_request_id AND status = 'pending';

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'Request not found or not in pending status';
  END IF;

  -- Create the organization (name is NOT NULL on the base table; org_meta
  -- below remains the editable metadata source)
  INSERT INTO organizations (name, slug, created_by, status)
  VALUES (v_request.org_name, v_request.org_slug, v_request.user_id, 'active')
  RETURNING id INTO v_org_id;

  -- Create org_meta with initial data
  INSERT INTO org_meta (organization_id, name, description, updated_by)
  VALUES (v_org_id, v_request.org_name, v_request.org_description, auth.uid());

  -- Add user as org_admin + owner
  INSERT INTO organization_members (organization_id, user_id, role, status, is_owner)
  VALUES (v_org_id, v_request.user_id, 'admin', 'active', true);

  -- Update request status
  UPDATE org_requests
  SET status = 'approved',
      created_org_id = v_org_id,
      reviewed_at = NOW(),
      reviewed_by = auth.uid()
  WHERE id = p_request_id;

  RETURN v_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION approve_org_request(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION approve_org_request(UUID) TO authenticated;

-- ====================================================================
-- 6. CREATE REQUEST REJECTION FUNCTION
-- ====================================================================

CREATE OR REPLACE FUNCTION reject_org_request(
  p_request_id UUID,
  p_rejection_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  UPDATE org_requests
  SET status = 'rejected',
      rejection_reason = p_rejection_reason,
      reviewed_at = NOW(),
      reviewed_by = auth.uid()
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not in pending status';
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION reject_org_request(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION reject_org_request(UUID, TEXT) TO authenticated;

-- ====================================================================
-- 8. UPDATE PUBLIC FUNCTIONS TO FILTER SUSPENDED ORGS
-- ====================================================================

CREATE OR REPLACE FUNCTION get_public_campaigns(
  org_filter UUID DEFAULT NULL,
  result_limit INT DEFAULT 20,
  zakat_filter BOOLEAN DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  slug TEXT,
  description TEXT,
  goal_amount NUMERIC,
  currency TEXT,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  cover_image_url TEXT,
  is_zakat_eligible BOOLEAN,
  org_id UUID,
  org_name TEXT,
  org_slug TEXT,
  org_description TEXT,
  org_logo_url TEXT,
  donation_methods JSONB,
  tags JSONB
) AS $$
  SELECT
    c.id,
    c.title,
    c.slug,
    c.description,
    c.goal_amount,
    c.currency,
    c.start_date,
    c.end_date,
    c.cover_image_url,
    c.is_zakat_eligible,
    c.org_id,
    om.name AS org_name,
    o.slug AS org_slug,
    om.description AS org_description,
    om.logo_url AS org_logo_url,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'bkash_number', dm.bkash_number,
          'bkash_account_name', dm.bkash_account_name,
          'nagad_number', dm.nagad_number,
          'nagad_account_name', dm.nagad_account_name,
          'rocket_number', dm.rocket_number,
          'rocket_account_name', dm.rocket_account_name,
          'bank_name', dm.bank_name,
          'bank_account_number', dm.bank_account_number,
          'bank_account_name', dm.bank_account_name,
          'donation_url', dm.donation_url,
          'is_preferred', dm.is_preferred
        ) ORDER BY dm.is_preferred DESC, dm.id
      ) FILTER (WHERE dm.id IS NOT NULL),
      '[]'::jsonb
    ) AS donation_methods,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'label', t.label,
          'slug', t.slug
        ) ORDER BY t.label
      ) FILTER (WHERE t.id IS NOT NULL),
      '[]'::jsonb
    ) AS tags
  FROM campaigns c
  JOIN organizations o ON c.org_id = o.id
  LEFT JOIN org_meta om ON o.id = om.organization_id
  LEFT JOIN donation_methods dm ON o.id = dm.organization_id
  LEFT JOIN campaign_tag_map ctm ON c.id = ctm.campaign_id
  LEFT JOIN campaign_tags t ON ctm.tag_id = t.id
  WHERE c.status = 'live'
    AND o.status = 'active' -- Only active organizations
    AND (org_filter IS NULL OR c.org_id = org_filter)
    AND (zakat_filter IS NULL OR c.is_zakat_eligible = zakat_filter)
  GROUP BY c.id, o.id, om.organization_id
  ORDER BY c.created_at DESC
  LIMIT COALESCE(result_limit, 20);
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION get_public_campaigns(UUID, INT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_public_campaigns(UUID, INT, BOOLEAN) TO anon, authenticated;

-- ====================================================================
-- 9. CREATE ORG STATUS MANAGEMENT FUNCTIONS
-- ====================================================================

CREATE OR REPLACE FUNCTION set_org_status(p_org_id UUID, p_status TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  IF p_status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'Invalid status: must be active or suspended';
  END IF;

  UPDATE organizations SET status = p_status WHERE id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization not found';
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION set_org_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_org_status(UUID, TEXT) TO authenticated;

-- ====================================================================
-- 10. CREATE FUNCTIONS FOR ORG_META MANAGEMENT
-- ====================================================================

CREATE OR REPLACE FUNCTION get_org_meta(p_org_id UUID)
RETURNS SETOF org_meta AS $$
BEGIN
  IF NOT can_perform('read:org', p_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY SELECT * FROM org_meta WHERE organization_id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION get_org_meta(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_org_meta(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION update_org_meta(
  p_org_id UUID,
  p_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_logo_url TEXT DEFAULT NULL,
  p_website_url TEXT DEFAULT NULL,
  p_contact_email TEXT DEFAULT NULL,
  p_contact_phone TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_social_links JSONB DEFAULT NULL,
  p_settings JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
  IF NOT can_perform('update:org', p_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE org_meta SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    logo_url = COALESCE(p_logo_url, logo_url),
    website_url = COALESCE(p_website_url, website_url),
    contact_email = COALESCE(p_contact_email, contact_email),
    contact_phone = COALESCE(p_contact_phone, contact_phone),
    address = COALESCE(p_address, address),
    social_links = COALESCE(p_social_links, social_links),
    settings = COALESCE(p_settings, settings),
    updated_by = auth.uid(),
    updated_at = NOW()
  WHERE organization_id = p_org_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Organization metadata not found';
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION update_org_meta(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION update_org_meta(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) TO authenticated;

-- ====================================================================
-- 11. CREATE FUNCTIONS FOR ORG REQUESTS VIEWING
-- ====================================================================

CREATE OR REPLACE FUNCTION get_my_org_requests()
RETURNS TABLE(
  id UUID,
  org_name TEXT,
  org_slug TEXT,
  org_description TEXT,
  status TEXT,
  rejection_reason TEXT,
  requested_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  created_org_id UUID
) AS $$
  SELECT
    id, org_name, org_slug, org_description, status, rejection_reason,
    requested_at, reviewed_at, created_org_id
  FROM org_requests
  WHERE user_id = auth.uid()
  ORDER BY requested_at DESC;
$$ LANGUAGE sql SECURITY INVOKER SET search_path = public;

REVOKE EXECUTE ON FUNCTION get_my_org_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_my_org_requests() TO authenticated;

CREATE OR REPLACE FUNCTION get_all_org_requests()
RETURNS TABLE(
  id UUID,
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  org_name TEXT,
  org_slug TEXT,
  org_description TEXT,
  status TEXT,
  rejection_reason TEXT,
  requested_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by_email TEXT,
  created_org_id UUID
) AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  RETURN QUERY
  SELECT
    r.id,
    r.user_id,
    p.email AS user_email,
    p.full_name AS user_name,
    r.org_name,
    r.org_slug,
    r.org_description,
    r.status,
    r.rejection_reason,
    r.requested_at,
    r.reviewed_at,
    reviewer.email AS reviewed_by_email,
    r.created_org_id
  FROM org_requests r
  JOIN profiles p ON r.user_id = p.id
  LEFT JOIN profiles reviewer ON r.reviewed_by = reviewer.id
  ORDER BY
    CASE r.status
      WHEN 'pending' THEN 1
      WHEN 'approved' THEN 2
      WHEN 'rejected' THEN 3
    END,
    r.requested_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION get_all_org_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_all_org_requests() TO authenticated;

-- ====================================================================
-- 12. RLS POLICIES FOR NEW TABLES
-- ====================================================================

-- org_requests RLS
ALTER TABLE org_requests ENABLE ROW LEVEL SECURITY;

-- Users can see their own requests
CREATE POLICY "Users can see their own org requests"
ON org_requests FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can create their own requests
CREATE POLICY "Users can create their own org requests"
ON org_requests FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- System admins can see all requests (enforced by function, not RLS)

-- org_meta RLS
ALTER TABLE org_meta ENABLE ROW LEVEL SECURITY;

-- Members can read their org's metadata
CREATE POLICY "Members can read their org metadata"
ON org_meta FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_meta.organization_id
      AND user_id = auth.uid()
      AND status = 'active'
  )
);

-- org_admin can update their org's metadata (enforced by function)
CREATE POLICY "org_admin can update their org metadata"
ON org_meta FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = org_meta.organization_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role = 'admin'
  )
);

-- ====================================================================
-- MIGRATION COMPLETE
-- ====================================================================