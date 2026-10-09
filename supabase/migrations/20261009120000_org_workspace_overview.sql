-- ====================================================================
-- Org workspace overview RPCs (UX restructure groundwork)
-- --------------------------------------------------------------------
-- Powers the restructured workspace surfaces: a cross-campaign donation
-- review queue (donors report against a campaign; owners review per org,
-- not per campaign) and a one-call overview for the workspace landing
-- page ("what needs my attention").
-- ====================================================================

SET search_path = donate, shared, extensions, private;

-- Org: donation reports across ALL of the org's campaigns, newest first.
-- p_status filters the review queue ('pending') vs the history
-- ('confirmed'/'rejected'); pass NULL-ish '' for every status.
CREATE OR REPLACE FUNCTION donate.list_org_donation_reports(
  p_org_id UUID,
  p_status TEXT DEFAULT 'pending',
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  campaign_id UUID,
  campaign_title TEXT,
  amount NUMERIC,
  currency VARCHAR(3),
  method TEXT,
  reference TEXT,
  donor_name TEXT,
  message TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $$
BEGIN
  IF NOT can_perform('donations:manage', p_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT r.id, r.campaign_id, c.title, r.amount, r.currency, r.method,
         r.reference, r.donor_name, r.message, r.status, r.created_at
  FROM donation_reports r
  JOIN campaigns c ON c.id = r.campaign_id
  WHERE r.org_id = p_org_id
    AND (p_status = '' OR r.status = p_status)
  ORDER BY r.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 200);
END;
$$;

REVOKE EXECUTE ON FUNCTION donate.list_org_donation_reports(UUID, TEXT, INT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.list_org_donation_reports(UUID, TEXT, INT)
  TO authenticated;

-- Org: the workspace landing summary — what needs attention and the
-- headline numbers. Read-only rollup, so plain members may call it.
CREATE OR REPLACE FUNCTION donate.get_org_overview(p_org_id UUID)
RETURNS TABLE (
  pending_donation_reports BIGINT,
  confirmed_donations BIGINT,
  raised_total NUMERIC,
  live_campaigns BIGINT,
  pending_review_campaigns BIGINT,
  draft_campaigns BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $$
BEGIN
  IF NOT can_perform('org:read', p_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM donation_reports r
      WHERE r.org_id = p_org_id AND r.status = 'pending'),
    (SELECT COUNT(*) FROM donation_reports r
      WHERE r.org_id = p_org_id AND r.status = 'confirmed'),
    (SELECT COALESCE(SUM(c.raised_amount), 0) FROM campaigns c
      WHERE c.org_id = p_org_id),
    (SELECT COUNT(*) FROM campaigns c
      WHERE c.org_id = p_org_id AND c.status = 'live'),
    (SELECT COUNT(*) FROM campaigns c
      WHERE c.org_id = p_org_id AND c.status = 'pending_review'),
    (SELECT COUNT(*) FROM campaigns c
      WHERE c.org_id = p_org_id AND c.status = 'draft');
END;
$$;

REVOKE EXECUTE ON FUNCTION donate.get_org_overview(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.get_org_overview(UUID) TO authenticated;
