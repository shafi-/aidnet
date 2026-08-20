-- ====================================================================
-- Campaigns / Donation Discovery Platform
-- ====================================================================
-- Extends the existing RBAC + RLS layer. Preserves deny-by-default RLS,
-- can_perform(), is_system_admin(). Publishing to 'live' is gated by
-- is_system_admin() ONLY (owners cannot self-publish).
-- ====================================================================

-- ====================================================================
-- ENUM
-- ====================================================================

DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM (
    'draft', 'pending_review', 'live', 'rejected', 'closed'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ====================================================================
-- TABLES
-- ====================================================================

CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  goal_amount NUMERIC(14, 2),
  currency VARCHAR(3) DEFAULT 'BDT',
  start_date DATE,
  end_date DATE,
  is_zakat_eligible BOOLEAN DEFAULT false,
  status campaign_status DEFAULT 'draft',
  created_by UUID REFERENCES profiles(id),
  verified_by UUID REFERENCES profiles(id),
  verified_at TIMESTAMPTZ,
  verification_notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS donation_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  bkash_number TEXT,
  bkash_account_name TEXT,
  nagad_number TEXT,
  nagad_account_name TEXT,
  rocket_number TEXT,
  rocket_account_name TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_name TEXT,
  bank_routing_number TEXT,
  bank_branch TEXT,
  donation_url TEXT,
  qr_image_url TEXT,
  instructions TEXT,
  is_preferred BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  label_bn TEXT
);

CREATE TABLE IF NOT EXISTS campaign_tag_map (
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES campaign_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (campaign_id, tag_id)
);

-- ====================================================================
-- INDEXES
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_campaigns_org_id ON campaigns(org_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_slug ON campaigns(slug);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_updated_at ON campaigns(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_zakat ON campaigns(is_zakat_eligible);
CREATE INDEX IF NOT EXISTS idx_donation_methods_org_id ON donation_methods(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaign_tags_slug ON campaign_tags(slug);
CREATE INDEX IF NOT EXISTS idx_campaign_tag_map_campaign_id ON campaign_tag_map(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_tag_map_tag_id ON campaign_tag_map(tag_id);

-- ====================================================================
-- RLS
-- ====================================================================

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE donation_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_tag_map ENABLE ROW LEVEL SECURITY;

-- Deny all by default
CREATE POLICY "deny_all_campaigns" ON campaigns FOR ALL USING (false);
CREATE POLICY "deny_all_donation_methods" ON donation_methods FOR ALL USING (false);
CREATE POLICY "deny_all_campaign_tags" ON campaign_tags FOR ALL USING (false);
CREATE POLICY "deny_all_campaign_tag_map" ON campaign_tag_map FOR ALL USING (false);

-- Campaigns: anon sees only LIVE campaigns of active orgs
CREATE POLICY "Anon can view live campaigns" ON campaigns FOR SELECT TO anon USING (
  status = 'live'
  AND is_active = true
  AND organization_id IN (
    SELECT o.id FROM organizations o
    WHERE EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = o.id AND om.status = 'active'
    )
  )
);

-- Campaigns: org members (campaigns:read) get full access to own org's campaigns
CREATE POLICY "Members can view campaigns" ON campaigns FOR SELECT TO authenticated USING (
  can_perform('campaigns:read', org_id)
);
CREATE POLICY "Members can create campaigns" ON campaigns FOR INSERT TO authenticated WITH CHECK (
  can_perform('campaigns:create', org_id)
);
CREATE POLICY "Members can update campaigns" ON campaigns FOR UPDATE TO authenticated USING (
  can_perform('campaigns:update', org_id)
) WITH CHECK (
  can_perform('campaigns:update', org_id)
);
CREATE POLICY "Members can delete campaigns" ON campaigns FOR DELETE TO authenticated USING (
  can_perform('campaigns:delete', org_id)
);
CREATE POLICY "System admin full access campaigns" ON campaigns FOR ALL TO authenticated USING (
  is_system_admin()
) WITH CHECK (
  is_system_admin()
);

-- Donation methods: org-scoped, members read via org:read, manage via campaigns:update
CREATE POLICY "Members can view donation_methods" ON donation_methods FOR SELECT TO authenticated USING (
  can_perform('org:read', organization_id)
);
CREATE POLICY "Members can manage donation_methods" ON donation_methods FOR ALL TO authenticated USING (
  can_perform('campaigns:update', organization_id)
) WITH CHECK (
  can_perform('campaigns:update', organization_id)
);
CREATE POLICY "System admin full access donation_methods" ON donation_methods FOR ALL TO authenticated USING (
  is_system_admin()
) WITH CHECK (
  is_system_admin()
);

-- Campaign tags: reference data readable by authenticated
CREATE POLICY "Authenticated can read campaign_tags" ON campaign_tags FOR SELECT TO authenticated USING (
  auth.uid() IS NOT NULL
);
CREATE POLICY "System admin can manage campaign_tags" ON campaign_tags FOR ALL TO authenticated USING (
  is_system_admin()
) WITH CHECK (
  is_system_admin()
);

-- Campaign tag map: managed by org members with campaigns:update
CREATE POLICY "Members can view campaign_tag_map" ON campaign_tag_map FOR SELECT TO authenticated USING (
  can_perform('campaigns:read', (
    SELECT org_id FROM campaigns WHERE id = campaign_id
  ))
);
CREATE POLICY "Members can manage campaign_tag_map" ON campaign_tag_map FOR ALL TO authenticated USING (
  can_perform('campaigns:update', (
    SELECT org_id FROM campaigns WHERE id = campaign_id
  ))
) WITH CHECK (
  can_perform('campaigns:update', (
    SELECT org_id FROM campaigns WHERE id = campaign_id
  ))
);
CREATE POLICY "System admin full access campaign_tag_map" ON campaign_tag_map FOR ALL TO authenticated USING (
  is_system_admin()
) WITH CHECK (
  is_system_admin()
);

-- ====================================================================
-- CAMPAIGN FUNCTIONS (INVOKER — RLS enforces via can_perform)
-- ====================================================================

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
  p_is_zakat_eligible BOOLEAN DEFAULT false
)
RETURNS SETOF campaigns AS $$
BEGIN
  IF NOT can_perform('campaigns:create', p_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  INSERT INTO campaigns (
    org_id, title, slug, description, cover_image_url, goal_amount,
    currency, start_date, end_date, is_zakat_eligible, created_by, status
  )
  VALUES (
    p_org_id, p_title, p_slug, p_description, p_cover_image_url, p_goal_amount,
    p_currency, p_start_date, p_end_date, p_is_zakat_eligible, auth.uid(), 'draft'
  )
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION get_campaigns(p_org_id UUID)
RETURNS SETOF campaigns AS $$
  SELECT * FROM campaigns
  WHERE org_id = p_org_id
    AND can_perform('campaigns:read', p_org_id)
  ORDER BY created_at DESC;
$$ LANGUAGE sql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION get_campaign(p_campaign_id UUID)
RETURNS SETOF campaigns AS $$
  SELECT * FROM campaigns
  WHERE id = p_campaign_id
    AND (
      can_perform('campaigns:read', org_id)
      OR is_system_admin()
    );
$$ LANGUAGE sql SECURITY INVOKER SET search_path = public;

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
  p_status campaign_status DEFAULT NULL
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
    updated_at = NOW()
  WHERE id = p_campaign_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION delete_campaign(p_campaign_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_org_id UUID;
  v_status campaign_status;
BEGIN
  SELECT org_id, status INTO v_org_id, v_status FROM campaigns WHERE id = p_campaign_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF NOT is_system_admin() AND v_status = 'live' THEN
    RAISE EXCEPTION 'Cannot delete a live campaign';
  END IF;

  IF NOT can_perform('campaigns:delete', v_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM campaigns WHERE id = p_campaign_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION submit_campaign_for_review(p_campaign_id UUID)
RETURNS SETOF campaigns AS $$
DECLARE
  v_org_id UUID;
  v_status campaign_status;
BEGIN
  SELECT org_id, status INTO v_org_id, v_status FROM campaigns WHERE id = p_campaign_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF v_status NOT IN ('draft', 'rejected') THEN
    RAISE EXCEPTION 'Only draft or rejected campaigns can be submitted';
  END IF;

  IF NOT can_perform('campaigns:update', v_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  UPDATE campaigns
  SET status = 'pending_review', updated_at = NOW()
  WHERE id = p_campaign_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

-- ====================================================================
-- ADMIN CAMPAIGN FUNCTIONS (is_system_admin ONLY — no self-publish)
-- ====================================================================

CREATE OR REPLACE FUNCTION verify_campaign(
  p_campaign_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS SETOF campaigns AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  RETURN QUERY
  UPDATE campaigns
  SET
    status = 'live',
    verified_by = auth.uid(),
    verified_at = NOW(),
    verification_notes = p_notes,
    updated_at = NOW()
  WHERE id = p_campaign_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION reject_campaign(
  p_campaign_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS SETOF campaigns AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  RETURN QUERY
  UPDATE campaigns
  SET
    status = 'rejected',
    verified_by = auth.uid(),
    verified_at = NOW(),
    verification_notes = p_notes,
    updated_at = NOW()
  WHERE id = p_campaign_id
  RETURNING *;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION get_pending_campaigns()
RETURNS SETOF campaigns AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;

  RETURN QUERY
  SELECT * FROM campaigns
  WHERE status = 'pending_review'
  ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION get_campaign_by_slug(p_slug TEXT)
RETURNS SETOF campaigns AS $$
  SELECT * FROM campaigns
  WHERE slug = p_slug
    AND (
      can_perform('campaigns:read', org_id)
      OR is_system_admin()
    );
$$ LANGUAGE sql SECURITY INVOKER SET search_path = public;

-- ====================================================================
-- DONATION METHODS FUNCTIONS (INVOKER)
-- ====================================================================

CREATE OR REPLACE FUNCTION get_donation_methods(p_org_id UUID)
RETURNS SETOF donation_methods AS $$
  SELECT * FROM donation_methods
  WHERE organization_id = p_org_id
    AND can_perform('org:read', p_org_id)
  ORDER BY is_preferred DESC, created_at ASC;
$$ LANGUAGE sql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION upsert_donation_methods(
  p_org_id UUID,
  p_bkash_number TEXT DEFAULT NULL,
  p_bkash_account_name TEXT DEFAULT NULL,
  p_nagad_number TEXT DEFAULT NULL,
  p_nagad_account_name TEXT DEFAULT NULL,
  p_rocket_number TEXT DEFAULT NULL,
  p_rocket_account_name TEXT DEFAULT NULL,
  p_bank_name TEXT DEFAULT NULL,
  p_bank_account_number TEXT DEFAULT NULL,
  p_bank_account_name TEXT DEFAULT NULL,
  p_bank_routing_number TEXT DEFAULT NULL,
  p_bank_branch TEXT DEFAULT NULL,
  p_donation_url TEXT DEFAULT NULL,
  p_qr_image_url TEXT DEFAULT NULL,
  p_instructions TEXT DEFAULT NULL,
  p_is_preferred BOOLEAN DEFAULT false
)
RETURNS SETOF donation_methods AS $$
DECLARE
  v_id UUID;
BEGIN
  IF NOT can_perform('campaigns:update', p_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT id INTO v_id FROM donation_methods WHERE organization_id = p_org_id;

  IF v_id IS NULL THEN
    RETURN QUERY
    INSERT INTO donation_methods (
      organization_id, bkash_number, bkash_account_name, nagad_number, nagad_account_name,
      rocket_number, rocket_account_name, bank_name, bank_account_number, bank_account_name,
      bank_routing_number, bank_branch, donation_url, qr_image_url, instructions, is_preferred
    )
    VALUES (
      p_org_id, p_bkash_number, p_bkash_account_name, p_nagad_number, p_nagad_account_name,
      p_rocket_number, p_rocket_account_name, p_bank_name, p_bank_account_number, p_bank_account_name,
      p_bank_routing_number, p_bank_branch, p_donation_url, p_qr_image_url, p_instructions, p_is_preferred
    )
    RETURNING *;
  ELSE
    RETURN QUERY
    UPDATE donation_methods
    SET
      bkash_number = COALESCE(p_bkash_number, bkash_number),
      bkash_account_name = COALESCE(p_bkash_account_name, bkash_account_name),
      nagad_number = COALESCE(p_nagad_number, nagad_number),
      nagad_account_name = COALESCE(p_nagad_account_name, nagad_account_name),
      rocket_number = COALESCE(p_rocket_number, rocket_number),
      rocket_account_name = COALESCE(p_rocket_account_name, rocket_account_name),
      bank_name = COALESCE(p_bank_name, bank_name),
      bank_account_number = COALESCE(p_bank_account_number, bank_account_number),
      bank_account_name = COALESCE(p_bank_account_name, bank_account_name),
      bank_routing_number = COALESCE(p_bank_routing_number, bank_routing_number),
      bank_branch = COALESCE(p_bank_branch, bank_branch),
      donation_url = COALESCE(p_donation_url, donation_url),
      qr_image_url = COALESCE(p_qr_image_url, qr_image_url),
      instructions = COALESCE(p_instructions, instructions),
      is_preferred = COALESCE(p_is_preferred, is_preferred),
      updated_at = NOW()
    WHERE id = v_id
    RETURNING *;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

-- ====================================================================
-- CAMPAIGN TAGS FUNCTIONS (INVOKER)
-- ====================================================================

CREATE OR REPLACE FUNCTION get_campaign_tags()
RETURNS SETOF campaign_tags AS $$
  SELECT * FROM campaign_tags ORDER BY label ASC;
$$ LANGUAGE sql SECURITY INVOKER SET search_path = public;

CREATE OR REPLACE FUNCTION set_campaign_tags(
  p_campaign_id UUID,
  p_tag_ids UUID[]
)
RETURNS BOOLEAN AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id FROM campaigns WHERE id = p_campaign_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  IF NOT can_perform('campaigns:update', v_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  DELETE FROM campaign_tag_map WHERE campaign_id = p_campaign_id;

  IF p_tag_ids IS NOT NULL AND array_length(p_tag_ids, 1) > 0 THEN
    INSERT INTO campaign_tag_map (campaign_id, tag_id)
    SELECT p_campaign_id, unnest(p_tag_ids)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = public;

-- ====================================================================
-- TRIGGERS
-- ====================================================================

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_donation_methods_updated_at BEFORE UPDATE ON donation_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- SEED DATA
-- ====================================================================

INSERT INTO role_permissions (role, permission) VALUES
  ('admin', 'campaigns:read'), ('admin', 'campaigns:create'),
  ('admin', 'campaigns:update'), ('admin', 'campaigns:delete'),
  ('member', 'campaigns:read'), ('member', 'campaigns:create'),
  ('member', 'campaigns:update'),
  ('viewer', 'campaigns:read')
ON CONFLICT (role, permission) DO NOTHING;

INSERT INTO campaign_tags (id, slug, label, label_bn) VALUES
  (gen_random_uuid(), 'zakat', 'Zakat Eligible', 'জাকাত যোগ্য')
ON CONFLICT (slug) DO NOTHING;

-- ====================================================================
-- GRANTS
-- ====================================================================

GRANT EXECUTE ON FUNCTION create_campaign(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, VARCHAR, DATE, DATE, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaigns(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_campaign(UUID, TEXT, TEXT, TEXT, TEXT, NUMERIC, VARCHAR, DATE, DATE, BOOLEAN, campaign_status) TO authenticated;
GRANT EXECUTE ON FUNCTION delete_campaign(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_campaign_for_review(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_campaign(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION reject_campaign(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_campaigns() TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign_by_slug(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_donation_methods(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_donation_methods(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_campaign_tags() TO authenticated;
GRANT EXECUTE ON FUNCTION set_campaign_tags(UUID, UUID[]) TO authenticated;
