-- ====================================================================
-- Collapse get_public_campaigns back to a single overload
-- ====================================================================
-- 20261008084101 re-created the (zakat_filter, org_filter, result_limit)
-- overload — new return shape: address, created_at, updated_at, rich
-- donation_methods, label_bn tags — without dropping the (org_filter,
-- result_limit, zakat_filter) overload the application squash had kept.
-- Both declare the same parameter names, so Postgres cannot resolve the
-- client's named-argument call {zakat_filter, org_filter, result_limit}
-- and PostgREST answers "Could not choose the best candidate function"
-- (300 Multiple Choices) on every public campaign listing.
--
-- Keep the newer overload: the client's PublicCampaign type is generated
-- against its return shape. Merge back the behaviors the re-created body
-- lost and its sibling get_public_campaign_by_slug carries: suspended
-- orgs are filtered out (the documented reason the squash kept the other
-- overload) and org display fields prefer edited org_meta.

CREATE OR REPLACE FUNCTION donate.get_public_campaigns(
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
    COALESCE(meta.name, o.name),
    o.slug,
    COALESCE(meta.logo_url, o.logo_url),
    COALESCE(meta.description, o.description),
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
  LEFT JOIN org_meta meta ON meta.organization_id = o.id
  WHERE c.status = 'live'
    AND c.is_active = true
    AND o.status = 'active'
    AND o.id IN (
      SELECT mem.organization_id
      FROM organization_members mem
      WHERE mem.organization_id = o.id AND mem.status = 'active'
    )
    AND (zakat_filter IS NULL OR c.is_zakat_eligible = zakat_filter)
    AND (org_filter IS NULL OR c.org_id = org_filter)
  ORDER BY c.updated_at DESC, c.created_at DESC, c.id DESC
  LIMIT result_limit;
$$;

-- The stale overload the squash kept. The pgTAP suite's positional call
-- (NULL::uuid, 12) was the last positional consumer and is re-spelled to
-- the surviving signature in the same change.
DROP FUNCTION IF EXISTS donate.get_public_campaigns(UUID, INT, BOOLEAN);

GRANT EXECUTE ON FUNCTION donate.get_public_campaigns(BOOLEAN, UUID, INT)
  TO anon, authenticated;
