-- ====================================================================
-- Campaign-scoped payment methods
-- ====================================================================
-- Payment channels move from org-keyed (donation_methods) to per-campaign:
-- each campaign — org-run or personal — carries the account donors actually
-- pay into. Structured like campaign_beneficiary: a 1:1 protected table,
-- reachable ONLY through set/get_campaign_payment_methods (SECURITY DEFINER,
-- gated to the owning org's campaigns:update / campaigns:read or system
-- admin).
--
-- donation_methods stays in place untouched: get_public_campaign_by_slug
-- falls back to it (COALESCE) so campaigns created before the client ships
-- this change keep rendering the org's methods.
-- ====================================================================

SET search_path = donate, shared, extensions, private;

CREATE TABLE IF NOT EXISTS campaign_payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL UNIQUE REFERENCES campaigns(id) ON DELETE CASCADE,
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

ALTER TABLE campaign_payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deny_all_campaign_payment_methods ON campaign_payment_methods;
CREATE POLICY deny_all_campaign_payment_methods ON campaign_payment_methods
  FOR ALL USING (false);

-- Payment details are payout instructions: reachable ONLY through the gated
-- functions. The blanket access-path grants (default privileges from the
-- grants fix) must not apply here.
REVOKE ALL ON campaign_payment_methods FROM anon, authenticated;


-- Write path: gated to the owning org's campaigns:update (or system admin).
CREATE OR REPLACE FUNCTION set_campaign_payment_methods(
  p_campaign_id UUID,
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

  INSERT INTO campaign_payment_methods AS cpm
    (campaign_id, bkash_number, bkash_account_name, nagad_number,
     nagad_account_name, rocket_number, rocket_account_name, bank_name,
     bank_account_number, bank_account_name, bank_routing_number, bank_branch,
     donation_url, qr_image_url, instructions, is_preferred)
  VALUES
    (p_campaign_id, p_bkash_number, p_bkash_account_name, p_nagad_number,
     p_nagad_account_name, p_rocket_number, p_rocket_account_name, p_bank_name,
     p_bank_account_number, p_bank_account_name, p_bank_routing_number,
     p_bank_branch, p_donation_url, p_qr_image_url, p_instructions,
     p_is_preferred)
  ON CONFLICT (campaign_id) DO UPDATE
  SET bkash_number = EXCLUDED.bkash_number,
      bkash_account_name = EXCLUDED.bkash_account_name,
      nagad_number = EXCLUDED.nagad_number,
      nagad_account_name = EXCLUDED.nagad_account_name,
      rocket_number = EXCLUDED.rocket_number,
      rocket_account_name = EXCLUDED.rocket_account_name,
      bank_name = EXCLUDED.bank_name,
      bank_account_number = EXCLUDED.bank_account_number,
      bank_account_name = EXCLUDED.bank_account_name,
      bank_routing_number = EXCLUDED.bank_routing_number,
      bank_branch = EXCLUDED.bank_branch,
      donation_url = EXCLUDED.donation_url,
      qr_image_url = EXCLUDED.qr_image_url,
      instructions = EXCLUDED.instructions,
      is_preferred = EXCLUDED.is_preferred,
      updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;


-- Read path: gated to the owning org's campaigns:read (or system admin).
CREATE OR REPLACE FUNCTION get_campaign_payment_methods(p_campaign_id UUID)
RETURNS TABLE (
  campaign_id UUID,
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
  is_preferred BOOLEAN
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
  SELECT cpm.campaign_id, cpm.bkash_number, cpm.bkash_account_name,
         cpm.nagad_number, cpm.nagad_account_name, cpm.rocket_number,
         cpm.rocket_account_name, cpm.bank_name, cpm.bank_account_number,
         cpm.bank_account_name, cpm.bank_routing_number, cpm.bank_branch,
         cpm.donation_url, cpm.qr_image_url, cpm.instructions,
         cpm.is_preferred
  FROM campaign_payment_methods cpm
  WHERE cpm.campaign_id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

GRANT EXECUTE ON FUNCTION set_campaign_payment_methods(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
REVOKE EXECUTE ON FUNCTION set_campaign_payment_methods(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_campaign_payment_methods(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION get_campaign_payment_methods(UUID) FROM PUBLIC, anon;


-- Public detail: campaign methods win; org methods remain the fallback for
-- campaigns created before the client writes per-campaign methods. Return
-- type unchanged, so the function is dropped first and grants re-issued.
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
      (
        SELECT jsonb_agg(jsonb_build_object(
          'bkash_number', x.bkash_number,
          'bkash_account_name', x.bkash_account_name,
          'nagad_number', x.nagad_number,
          'nagad_account_name', x.nagad_account_name,
          'rocket_number', x.rocket_number,
          'rocket_account_name', x.rocket_account_name,
          'bank_name', x.bank_name,
          'bank_account_number', x.bank_account_number,
          'bank_account_name', x.bank_account_name,
          'donation_url', x.donation_url,
          'qr_image_url', x.qr_image_url,
          'instructions', x.instructions,
          'is_preferred', x.is_preferred
        ) ORDER BY x.is_preferred DESC, x.id)
        FROM campaign_payment_methods x
        WHERE x.campaign_id = c.id
      ),
      (
        SELECT jsonb_agg(jsonb_build_object(
          'bkash_number', x.bkash_number,
          'bkash_account_name', x.bkash_account_name,
          'nagad_number', x.nagad_number,
          'nagad_account_name', x.nagad_account_name,
          'rocket_number', x.rocket_number,
          'rocket_account_name', x.rocket_account_name,
          'bank_name', x.bank_name,
          'bank_account_number', x.bank_account_number,
          'bank_account_name', x.bank_account_name,
          'donation_url', x.donation_url,
          'qr_image_url', x.qr_image_url,
          'instructions', x.instructions,
          'is_preferred', x.is_preferred
        ) ORDER BY x.is_preferred DESC, x.id)
        FROM donation_methods x
        WHERE x.organization_id = c.org_id
      ),
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


-- Backfill: every existing campaign inherits its org's methods so public
-- pages render identically after this migration (multi-row orgs: first row
-- wins per campaign).
INSERT INTO campaign_payment_methods
  (campaign_id, bkash_number, bkash_account_name, nagad_number,
   nagad_account_name, rocket_number, rocket_account_name, bank_name,
   bank_account_number, bank_account_name, bank_routing_number, bank_branch,
   donation_url, qr_image_url, instructions, is_preferred)
SELECT c.id, dm.bkash_number, dm.bkash_account_name, dm.nagad_number,
       dm.nagad_account_name, dm.rocket_number, dm.rocket_account_name,
       dm.bank_name, dm.bank_account_number, dm.bank_account_name,
       dm.bank_routing_number, dm.bank_branch, dm.donation_url,
       dm.qr_image_url, dm.instructions, dm.is_preferred
FROM campaigns c
JOIN donation_methods dm ON dm.organization_id = c.org_id
ON CONFLICT (campaign_id) DO NOTHING;
