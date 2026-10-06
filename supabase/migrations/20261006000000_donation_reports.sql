-- ====================================================================
-- Donor-reported donations (Option C): donors report out-of-band
-- transfers (bKash/Nagad/bank/…); the organization confirms or rejects
-- each report. raised_amount = sum of CONFIRMED reports, recomputed in
-- the same RPC that reviews a report. The platform never moves money.
-- ====================================================================

SET search_path = donate, shared, extensions, private;

-- Synchronous HTTP for captcha verification inside RPCs (no edge
-- functions: the DB function calls Cloudflare siteverify directly).
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- --------------------------------------------------------------------
-- Private platform settings (reachable only via SECURITY DEFINER fns —
-- `private` is already last in the functions' search_path chain).
-- turnstile_secret_key: Cloudflare Turnstile SECRET key. When empty,
-- captcha verification is skipped (local dev / e2e). Set it in prod to
-- enforce. The SITE key is public: client env NEXT_PUBLIC_TURNSTILE_SITE_KEY.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS private.platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT ''
);

INSERT INTO private.platform_settings (key, value) VALUES
  ('turnstile_secret_key', '')
ON CONFLICT (key) DO NOTHING;

-- --------------------------------------------------------------------
-- donation_reports: one row per donor-claimed transfer. `pending` rows
-- never count toward raised_amount; only `confirmed` rows do.
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS donation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  currency VARCHAR(3) NOT NULL,
  method TEXT NOT NULL DEFAULT 'other',
  reference TEXT,
  donor_name TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'rejected')),
  reporter_ip_hash TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donation_reports_campaign_status
  ON donation_reports(campaign_id, status);
CREATE INDEX IF NOT EXISTS idx_donation_reports_ip_created
  ON donation_reports(reporter_ip_hash, created_at);

ALTER TABLE donation_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS deny_all_donation_reports ON donation_reports;
CREATE POLICY deny_all_donation_reports ON donation_reports
  FOR ALL USING (false) WITH CHECK (false);

CREATE OR REPLACE TRIGGER update_donation_reports_updated_at
  BEFORE UPDATE ON donation_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER audit_donation_reports_changes
  AFTER INSERT OR UPDATE OR DELETE ON donation_reports
  FOR EACH ROW EXECUTE FUNCTION audit_table_changes();

-- ====================================================================
-- RPCs
-- ====================================================================

-- Recompute the campaign's public raised total from confirmed reports.
CREATE OR REPLACE FUNCTION donate.sync_campaign_raised(p_campaign_id UUID)
RETURNS void
LANGUAGE sql SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $$
  UPDATE campaigns c
  SET raised_amount = COALESCE((
        SELECT SUM(amount) FROM donation_reports
        WHERE campaign_id = c.id AND status = 'confirmed'
      ), 0),
      updated_at = NOW()
  WHERE c.id = p_campaign_id;
$$;

-- Fail-closed captcha check. Empty secret = verification disabled
-- (local/e2e only — production must set turnstile_secret_key).
CREATE OR REPLACE FUNCTION donate.verify_turnstile(
  p_token TEXT,
  p_remoteip TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $$
DECLARE
  secret TEXT;
  response http_response;
BEGIN
  SELECT value INTO secret
  FROM private.platform_settings WHERE key = 'turnstile_secret_key';
  IF secret IS NULL OR secret = '' THEN
    RETURN true; -- verification not configured (dev/e2e)
  END IF;

  BEGIN
    SELECT http INTO response
    FROM http_post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      'secret=' || secret
        || '&response=' || COALESCE(p_token, '')
        || COALESCE('&remoteip=' || p_remoteip, ''),
      'application/x-www-form-urlencoded'
    );
    RETURN COALESCE((response.content::jsonb ->> 'success')::boolean, false);
  EXCEPTION WHEN OTHERS THEN
    -- Fail closed: an unreachable verifier must not open the gate.
    RETURN false;
  END;
END;
$$;

-- Public: a donor reports a transfer they made outside the platform.
CREATE OR REPLACE FUNCTION donate.propose_donation(
  p_campaign_id UUID,
  p_amount NUMERIC,
  p_method TEXT DEFAULT 'other',
  p_reference TEXT DEFAULT NULL,
  p_donor_name TEXT DEFAULT NULL,
  p_message TEXT DEFAULT NULL,
  p_turnstile_token TEXT DEFAULT NULL
)
RETURNS TABLE (id UUID, status TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $$
DECLARE
  v_campaign campaigns;
  v_ip_hash TEXT;
  v_report_id UUID;
  v_status TEXT;
  v_created_at TIMESTAMPTZ;
BEGIN
  SELECT * INTO v_campaign FROM campaigns WHERE campaigns.id = p_campaign_id;
  IF NOT FOUND OR v_campaign.status <> 'live' THEN
    RAISE EXCEPTION 'Campaign not open for donations';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  -- Turnstile first: never spend a rate-limit slot on an unverified bot.
  v_ip_hash := MD5(COALESCE(
    current_setting('request.headers', true)::json ->> 'x-forwarded-for', ''
  ));
  IF NOT verify_turnstile(p_turnstile_token, NULLIF(v_ip_hash, '')) THEN
    RAISE EXCEPTION 'Verification failed. Please try again.';
  END IF;

  -- Abuse caps: per-reporter cooldown and per-campaign queue ceiling.
  IF (
    SELECT COUNT(*) FROM donation_reports
    WHERE reporter_ip_hash = v_ip_hash
      AND donation_reports.created_at > NOW() - INTERVAL '24 hours'
  ) >= 10 THEN
    RAISE EXCEPTION 'Too many reports from this device. Try again later.';
  END IF;
  IF (
    SELECT COUNT(*) FROM donation_reports
    WHERE donation_reports.campaign_id = p_campaign_id
      AND donation_reports.status = 'pending'
  ) >= 200 THEN
    RAISE EXCEPTION 'This campaign has too many reports awaiting review.';
  END IF;

  INSERT INTO donation_reports (
    campaign_id, org_id, amount, currency, method,
    reference, donor_name, message, reporter_ip_hash
  ) VALUES (
    p_campaign_id, v_campaign.org_id, p_amount, v_campaign.currency,
    LEFT(p_method, 40), LEFT(p_reference, 120), LEFT(p_donor_name, 80),
    LEFT(p_message, 500), v_ip_hash
  ) RETURNING donation_reports.id, donation_reports.status,
    donation_reports.created_at
    INTO v_report_id, v_status, v_created_at;

  RETURN QUERY SELECT v_report_id, v_status, v_created_at;
END;
$$;

GRANT EXECUTE ON FUNCTION donate.propose_donation(
  UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT
) TO anon, authenticated;

-- Public: confirmed reports for a campaign (privacy-safe columns only —
-- reference, message and review data never leave the org).
CREATE OR REPLACE FUNCTION donate.get_public_donation_reports(
  p_campaign_id UUID,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  amount NUMERIC,
  currency VARCHAR(3),
  method TEXT,
  donor_name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $$
  SELECT r.id, r.amount, r.currency, r.method, r.donor_name, r.created_at
  FROM donation_reports r
  WHERE r.campaign_id = p_campaign_id AND r.status = 'confirmed'
  ORDER BY r.created_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 50);
$$;

GRANT EXECUTE ON FUNCTION donate.get_public_donation_reports(UUID, INT)
  TO anon, authenticated;

-- Org: review queue / confirmed list for one campaign.
CREATE OR REPLACE FUNCTION donate.list_donation_reports(
  p_campaign_id UUID,
  p_status TEXT DEFAULT 'pending'
)
RETURNS TABLE (
  id UUID,
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
DECLARE
  v_org_id UUID;
BEGIN
  SELECT org_id INTO v_org_id FROM campaigns WHERE campaigns.id = p_campaign_id;
  IF NOT can_perform('donations:manage', v_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  SELECT r.id, r.amount, r.currency, r.method, r.reference,
         r.donor_name, r.message, r.status, r.created_at
  FROM donation_reports r
  WHERE r.campaign_id = p_campaign_id
    AND r.status = p_status
  ORDER BY r.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION donate.list_donation_reports(UUID, TEXT)
  TO authenticated;

CREATE OR REPLACE FUNCTION donate.confirm_donation_report(p_report_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $$
DECLARE
  v_campaign_id UUID;
BEGIN
  SELECT campaign_id INTO v_campaign_id FROM donation_reports
  WHERE donation_reports.id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF NOT can_perform('donations:manage', (
    SELECT org_id FROM campaigns WHERE campaigns.id = v_campaign_id
  )) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE donation_reports
  SET status = 'confirmed', reviewed_by = auth.uid(), reviewed_at = NOW()
  WHERE donation_reports.id = p_report_id AND donation_reports.status = 'pending';
  IF NOT FOUND THEN RETURN false; END IF;

  PERFORM sync_campaign_raised(v_campaign_id);
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION donate.reject_donation_report(
  p_report_id UUID,
  p_note TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $$
DECLARE
  v_campaign_id UUID;
BEGIN
  SELECT campaign_id INTO v_campaign_id FROM donation_reports
  WHERE donation_reports.id = p_report_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF NOT can_perform('donations:manage', (
    SELECT org_id FROM campaigns WHERE campaigns.id = v_campaign_id
  )) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE donation_reports
  SET status = 'rejected', reviewed_by = auth.uid(), reviewed_at = NOW(),
      review_note = LEFT(p_note, 300)
  WHERE donation_reports.id = p_report_id AND donation_reports.status = 'pending';
  IF NOT FOUND THEN RETURN false; END IF;

  PERFORM sync_campaign_raised(v_campaign_id);
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION donate.confirm_donation_report(UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION donate.reject_donation_report(UUID, TEXT)
  TO authenticated;

-- Permission: org admins review the donation queue (owners bypass
-- can_perform via is_owner). Seeded like campaigns:* above.
INSERT INTO role_permissions (role, permission) VALUES
  ('admin', 'donations:manage')
ON CONFLICT (role, permission) DO NOTHING;
