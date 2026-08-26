-- Single-campaign public read: fetch one live campaign by slug directly
-- instead of pulling the whole public list and filtering client-side.
CREATE OR REPLACE FUNCTION get_public_campaign_by_slug(p_slug TEXT)
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
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION get_public_campaign_by_slug(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_public_campaign_by_slug(TEXT) TO anon, authenticated;
