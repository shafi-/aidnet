-- ====================================================================
-- Public Campaign Discovery (anonymous)
-- ====================================================================
-- Mirrors get_public_org_by_slug: SECURITY DEFINER, returns only safe
-- public fields for LIVE campaigns of active organizations. No private
-- fields, no RLS dependency (bypasses RLS, enforces status + org checks
-- explicitly). Supports zakat / org filtering and a result limit for the
-- landing page (12 latest).
-- ====================================================================

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
  currency VARCHAR,
  start_date DATE,
  end_date DATE,
  is_zakat_eligible BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  donation_methods JSONB,
  tags JSONB
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
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
    c.currency,
    c.start_date,
    c.end_date,
    c.is_zakat_eligible,
    c.created_at,
    c.updated_at,
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

-- Allow anonymous access (public discovery page, no auth required)
GRANT EXECUTE ON FUNCTION get_public_campaigns(BOOLEAN, UUID, INT) TO anon;
GRANT EXECUTE ON FUNCTION get_public_campaigns(BOOLEAN, UUID, INT) TO authenticated;
