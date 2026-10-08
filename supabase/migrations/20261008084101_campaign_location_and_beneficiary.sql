-- ====================================================================
-- Campaign work-location + person-beneficiary verification
-- ====================================================================
-- 1. campaigns.address — where the work will happen (public information).
-- 2. create_campaign / update_campaign grow a trailing p_address; old
--    signatures are dropped so PostgREST resolves one function per name.
-- 3. campaign_beneficiary — 1:1 protected table for person-beneficiary
--    verification data (PII). It is NEVER part of public reads: the public
--    campaign functions project the campaigns table only. Access goes
--    through set/get_campaign_beneficiary (SECURITY DEFINER, gated to the
--    owning org's campaigns:update / campaigns:read or system admin).
-- 4. Payment input reuses the org-level donation_methods that the public
--    campaign detail already embeds — no schema change needed.
-- ====================================================================

SET search_path = donate, shared, extensions, private;

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS address TEXT;

CREATE TABLE IF NOT EXISTS campaign_beneficiary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT,
  national_id TEXT,
  document_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE campaign_beneficiary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_campaign_beneficiary ON campaign_beneficiary;
CREATE POLICY deny_all_campaign_beneficiary ON campaign_beneficiary
  FOR ALL USING (false);

-- PII table: reachable ONLY through the gated functions. The blanket
-- access-path grants (default privileges from the grants fix) must not
-- apply here.
REVOKE ALL ON campaign_beneficiary FROM anon, authenticated;


-- create_campaign: + p_address (old signature dropped: PostgREST resolves
-- functions by named arguments, so overlapping overloads are ambiguous)
DROP FUNCTION IF EXISTS create_campaign(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, VARCHAR, DATE, DATE, BOOLEAN);
CREATE OR REPLACE FUNCTION create_campaign(
  p_org_id UUID,
  p_title TEXT,
  p_slug TEXT,
  p_description TEXT DEFAULT NULL,
  p_cover_image_url TEXT DEFAULT NULL,
  p_goal_amount NUMERIC(14, 2) DEFAULT NULL,
  p_currency VARCHAR(3) DEFAULT 'BDT',
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_is_zakat_eligible BOOLEAN DEFAULT false,
  p_address TEXT DEFAULT NULL
)
RETURNS SETOF campaigns AS $$
BEGIN
  IF NOT can_perform('campaigns:create', p_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  INSERT INTO campaigns (
    org_id, title, slug, description, cover_image_url, goal_amount,
    currency, start_date, end_date, is_zakat_eligible, address,
    created_by, status
  )
  VALUES (
    p_org_id, p_title, p_slug, p_description, p_cover_image_url, p_goal_amount,
    p_currency, p_start_date, p_end_date, p_is_zakat_eligible, p_address,
    auth.uid(), 'draft'
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = donate, shared, extensions, private;

GRANT EXECUTE ON FUNCTION create_campaign(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, VARCHAR, DATE, DATE, BOOLEAN, TEXT) TO authenticated;


-- update_campaign: + p_address (old signature dropped, see above)
DROP FUNCTION IF EXISTS update_campaign(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, VARCHAR, DATE, DATE, BOOLEAN, campaign_status);
CREATE OR REPLACE FUNCTION update_campaign(
  p_campaign_id UUID,
  p_title TEXT DEFAULT NULL,
  p_slug TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_cover_image_url TEXT DEFAULT NULL,
  p_goal_amount NUMERIC(14, 2) DEFAULT NULL,
  p_currency VARCHAR(3) DEFAULT NULL,
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL,
  p_is_zakat_eligible BOOLEAN DEFAULT NULL,
  p_status campaign_status DEFAULT NULL,
  p_address TEXT DEFAULT NULL
)
RETURNS SETOF campaigns AS $$
DECLARE
  v_org_id UUID;
  v_status campaign_status;
BEGIN
  SELECT org_id, status INTO v_org_id, v_status FROM campaigns WHERE id = p_campaign_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  -- Only system admin may change status to/from live or rejected.
  IF p_status IS NOT NULL AND p_status <> v_status THEN
    IF NOT is_system_admin() THEN
      RAISE EXCEPTION 'Only a system admin may change campaign status';
    END IF;
  END IF;

  -- Members may edit non-published campaigns only.
  IF NOT is_system_admin() AND v_status IN ('live', 'rejected') THEN
    RAISE EXCEPTION 'Cannot edit a published or rejected campaign';
  END IF;

  IF NOT can_perform('campaigns:update', v_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  UPDATE campaigns
  SET
    title = COALESCE(p_title, title),
    slug = COALESCE(p_slug, slug),
    description = COALESCE(p_description, description),
    cover_image_url = COALESCE(p_cover_image_url, cover_image_url),
    goal_amount = COALESCE(p_goal_amount, goal_amount),
    currency = COALESCE(p_currency, currency),
    start_date = COALESCE(p_start_date, start_date),
    end_date = COALESCE(p_end_date, end_date),
    is_zakat_eligible = COALESCE(p_is_zakat_eligible, is_zakat_eligible),
    status = COALESCE(p_status, status),
    updated_at = NOW(),
    address = p_address
  WHERE id = p_campaign_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = donate, shared, extensions, private;

GRANT EXECUTE ON FUNCTION update_campaign(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, VARCHAR, DATE, DATE, BOOLEAN, campaign_status, TEXT) TO authenticated;


-- Person-beneficiary verification (PII): write path gated to the owning
-- org's campaigns:update (or system admin); read path to campaigns:read
-- (or system admin). Definer so the deny-all RLS on campaign_beneficiary
-- is the only gate, and public reads can never reach these rows.
CREATE OR REPLACE FUNCTION set_campaign_beneficiary(
  p_campaign_id UUID,
  p_full_name TEXT,
  p_relationship TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_national_id TEXT DEFAULT NULL,
  p_document_url TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id FROM campaigns WHERE id = p_campaign_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF NOT (can_perform('campaigns:update', v_org_id) OR is_system_admin()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  INSERT INTO campaign_beneficiary AS cb
    (campaign_id, full_name, relationship, phone, national_id, document_url, notes)
  VALUES
    (p_campaign_id, p_full_name, p_relationship, p_phone, p_national_id,
     p_document_url, p_notes)
  ON CONFLICT (campaign_id) DO UPDATE
  SET full_name = EXCLUDED.full_name,
      relationship = EXCLUDED.relationship,
      phone = EXCLUDED.phone,
      national_id = EXCLUDED.national_id,
      document_url = EXCLUDED.document_url,
      notes = EXCLUDED.notes,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

CREATE OR REPLACE FUNCTION get_campaign_beneficiary(p_campaign_id UUID)
RETURNS TABLE (
  full_name TEXT,
  relationship TEXT,
  phone TEXT,
  national_id TEXT,
  document_url TEXT,
  notes TEXT
) AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id FROM campaigns WHERE id = p_campaign_id;
  IF v_org_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT (can_perform('campaigns:read', v_org_id) OR is_system_admin()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT cb.full_name, cb.relationship, cb.phone, cb.national_id,
         cb.document_url, cb.notes
  FROM campaign_beneficiary cb
  WHERE cb.campaign_id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

GRANT EXECUTE ON FUNCTION set_campaign_beneficiary(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign_beneficiary(UUID) TO authenticated;


-- Public reads: expose the work location. The (uuid, int, boolean)
-- overload of get_public_campaigns is unused by the client and is left
-- untouched. RETURN type changed, so each function is dropped first;
-- EXECUTE grants are re-issued right after (dropping loses grants).
DROP FUNCTION IF EXISTS get_public_campaigns(BOOLEAN, UUID, INT);
CREATE OR REPLACE FUNCTION get_public_campaigns(
  zakat_filter BOOLEAN DEFAULT NULL,
  org_filter UUID DEFAULT NULL,
  result_limit INT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  org_id UUID,
  org_name TEXT,
  org_slug TEXT,
  org_logo_url TEXT,
  org_description TEXT,
  title TEXT,
  slug TEXT,
  description TEXT,
  cover_image_url TEXT,
  goal_amount NUMERIC,
  raised_amount NUMERIC,
  currency VARCHAR,
  start_date DATE,
  end_date DATE,
  is_zakat_eligible BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  address TEXT,
  donation_methods JSONB,
  tags JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $$
  SELECT
    c.id,
    c.org_id,
    o.name,
    o.slug,
    o.logo_url,
    o.description,
    c.title,
    c.slug,
    c.description,
    c.cover_image_url,
    c.goal_amount,
    c.raised_amount,
    c.currency,
    c.start_date,
    c.end_date,
    c.is_zakat_eligible,
    c.created_at,
    c.updated_at,
    c.address,
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', dm.id,
        'bkash_number', dm.bkash_number,
        'bkash_account_name', dm.bkash_account_name,
        'nagad_number', dm.nagad_number,
        'nagad_account_name', dm.nagad_account_name,
        'rocket_number', dm.rocket_number,
        'rocket_account_name', dm.rocket_account_name,
        'bank_name', dm.bank_name,
        'bank_account_number', dm.bank_account_number,
        'bank_account_name', dm.bank_account_name,
        'bank_routing_number', dm.bank_routing_number,
        'bank_branch', dm.bank_branch,
        'donation_url', dm.donation_url,
        'qr_image_url', dm.qr_image_url,
        'instructions', dm.instructions,
        'is_preferred', dm.is_preferred
      ))
      FROM donation_methods dm
      WHERE dm.organization_id = c.org_id
    ), '[]'::jsonb),
    COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', t.id,
        'slug', t.slug,
        'label', t.label,
        'label_bn', t.label_bn
      ))
      FROM campaign_tag_map ctm
      JOIN campaign_tags t ON t.id = ctm.tag_id
      WHERE ctm.campaign_id = c.id
    ), '[]'::jsonb)
  FROM campaigns c
  JOIN organizations o ON o.id = c.org_id
  WHERE c.status = 'live'
    AND c.is_active = true
    AND o.id IN (
      SELECT om.organization_id
      FROM organization_members om
      WHERE om.organization_id = o.id AND om.status = 'active'
    )
    AND (zakat_filter IS NULL OR c.is_zakat_eligible = zakat_filter)
    AND (org_filter IS NULL OR c.org_id = org_filter)
  ORDER BY c.updated_at DESC, c.created_at DESC, c.id DESC
  LIMIT result_limit;
$$;
GRANT EXECUTE ON FUNCTION get_public_campaigns(BOOLEAN, UUID, INT)
  TO anon, authenticated;

DROP FUNCTION IF EXISTS get_public_campaign_by_slug(TEXT);
CREATE OR REPLACE FUNCTION get_public_campaign_by_slug(p_slug TEXT)
RETURNS TABLE(
  id UUID,
  title TEXT,
  slug TEXT,
  description TEXT,
  goal_amount NUMERIC,
  raised_amount NUMERIC,
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
  address TEXT,
  donation_methods JSONB,
  tags JSONB
) AS $$
  SELECT
    c.id,
    c.title,
    c.slug,
    c.description,
    c.goal_amount,
    c.raised_amount,
    c.currency,
    c.start_date,
    c.end_date,
    c.cover_image_url,
    c.is_zakat_eligible,
    c.org_id,
    COALESCE(om.name, o.name) AS org_name,
    o.slug AS org_slug,
    COALESCE(om.description, o.description) AS org_description,
    COALESCE(om.logo_url, o.logo_url) AS org_logo_url,
    c.address,
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
          'qr_image_url', dm.qr_image_url,
          'instructions', dm.instructions,
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
    AND o.status = 'active'
    AND c.slug = p_slug
  GROUP BY c.id, o.id, om.organization_id
  ORDER BY c.created_at DESC
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = donate, shared, extensions, private;
GRANT EXECUTE ON FUNCTION get_public_campaign_by_slug(TEXT)
  TO anon, authenticated;
