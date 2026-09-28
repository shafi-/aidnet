-- ====================================================================
-- SQUASHED APPLICATION MIGRATIONS
-- ====================================================================
-- This single migration replays migrations 2-23 (everything after the
-- initial schema) in their original chronological order. The end schema
-- is identical to applying those 22 files individually. Squashed because
-- the project had never been deployed, so no remote had consumed the
-- individual version markers. Original files remain in git history.
-- ====================================================================
-- Schema layout: everything here belongs to the donate product schema
-- (see 20240814160000_initial_schema.sql for the layout and role-level
-- search_path). The SET below routes all unqualified DDL in this file
-- into donate; `shared` is only in the chain so function bodies and FKs
-- resolve shared.profiles.
-- ====================================================================

CREATE SCHEMA IF NOT EXISTS donate;
CREATE SCHEMA IF NOT EXISTS shared;

SET search_path = donate, shared, extensions, private;


-- ====================================================================
-- SQUASHED: 20240815160000_add_subscriptions.sql
-- ====================================================================
-- ====================================================================
-- Subscription Management
-- ====================================================================
-- System admins create packages. Org owners subscribe/upgrade/downgrade.
-- System admins can pause/unpause. One active subscription per org.
-- Org users see features based on active subscription.
-- ====================================================================

-- ====================================================================
-- TABLES
-- ====================================================================

CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC DEFAULT 0,
  price_yearly NUMERIC DEFAULT 0,
  features JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE organization_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  billing_period TEXT NOT NULL DEFAULT 'monthly',
  current_period_start TIMESTAMPTZ DEFAULT NOW(),
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  action TEXT NOT NULL,
  amount NUMERIC DEFAULT 0,
  payment_status TEXT DEFAULT 'paid',
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ====================================================================
-- INDEXES
-- ====================================================================

CREATE INDEX idx_subscription_plans_is_active ON subscription_plans(is_active);
CREATE INDEX idx_organization_subscriptions_org_id ON organization_subscriptions(organization_id);
CREATE INDEX idx_organization_subscriptions_plan_id ON organization_subscriptions(plan_id);
CREATE INDEX idx_organization_subscriptions_status ON organization_subscriptions(status);
CREATE INDEX idx_subscription_history_org_id ON subscription_history(organization_id);
CREATE INDEX idx_subscription_history_plan_id ON subscription_history(plan_id);
CREATE INDEX idx_subscription_history_created_at ON subscription_history(created_at);

-- ====================================================================
-- RLS POLICIES
-- ====================================================================

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_history ENABLE ROW LEVEL SECURITY;

-- Deny all by default
CREATE POLICY "deny_all_subscription_plans" ON subscription_plans FOR ALL USING (false);
CREATE POLICY "deny_all_organization_subscriptions" ON organization_subscriptions FOR ALL USING (false);
CREATE POLICY "deny_all_subscription_history" ON subscription_history FOR ALL USING (false);

-- System admins can do everything
CREATE POLICY "System admins can manage subscription plans" ON subscription_plans FOR ALL TO authenticated USING (
  is_system_admin()
);

CREATE POLICY "System admins can manage org subscriptions" ON organization_subscriptions FOR ALL TO authenticated USING (
  is_system_admin()
);

CREATE POLICY "System admins can view subscription history" ON subscription_history FOR SELECT TO authenticated USING (
  is_system_admin()
);

-- Org owners can view their own subscription (owner-only via is_owner short-circuit)
CREATE POLICY "Owners can view own subscription" ON organization_subscriptions FOR SELECT USING (
  can_perform('subscription:read', organization_id)
);

-- Org owners can insert their own subscription (subscribe/upgrade)
CREATE POLICY "Owners can create own subscription" ON organization_subscriptions FOR INSERT WITH CHECK (
  can_perform('subscription:manage', organization_id)
);

-- Org owners can update their own subscription (cancel)
CREATE POLICY "Owners can update own subscription" ON organization_subscriptions FOR UPDATE USING (
  can_perform('subscription:manage', organization_id)
);

-- Org members can view subscription history for their org
CREATE POLICY "Members can view own org subscription history" ON subscription_history FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = subscription_history.organization_id
      AND user_id = auth.uid()
      AND status = 'active'
  )
);

-- Org owners can insert subscription history (for their org)
CREATE POLICY "Owners can create own org subscription history" ON subscription_history FOR INSERT WITH CHECK (
  can_perform('subscription:manage', organization_id)
);

-- ====================================================================
-- HELPER FUNCTIONS
-- ====================================================================

-- Check if org has a specific feature via active subscription.
-- Caller guard is INLINED (active member or system admin), NOT via
-- can_perform: can_perform itself delegates to has_feature (step 4) and a
-- can_perform call here would recurse. Returns false for non-members, so
-- one org's plan capabilities are not probeable by another org's users.
CREATE OR REPLACE FUNCTION has_feature(p_org_id UUID, p_feature TEXT)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_subscriptions os
    JOIN subscription_plans sp ON os.plan_id = sp.id
    WHERE os.organization_id = p_org_id
      AND os.status = 'active'
      AND sp.is_active = true
      AND os.current_period_end > NOW()
      AND sp.features ? p_feature
      AND (
        is_system_admin()
        OR EXISTS (
          SELECT 1 FROM organization_members om
          WHERE om.user_id = auth.uid()
            AND om.organization_id = p_org_id
            AND om.status = 'active'
        )
      )
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

-- ====================================================================
-- SYSTEM ADMIN FUNCTIONS
-- ====================================================================

-- Create subscription plan
CREATE OR REPLACE FUNCTION create_subscription_plan(
  p_name TEXT,
  p_description TEXT,
  p_price_monthly NUMERIC,
  p_price_yearly NUMERIC,
  p_features JSONB
)
RETURNS subscription_plans AS $$
DECLARE
  new_plan subscription_plans;
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Only system admins can create subscription plans';
  END IF;

  INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, features)
  VALUES (p_name, p_description, p_price_monthly, p_price_yearly, p_features)
  RETURNING * INTO new_plan;

  RETURN new_plan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

-- Update subscription plan
CREATE OR REPLACE FUNCTION update_subscription_plan(
  p_plan_id UUID,
  p_name TEXT,
  p_description TEXT,
  p_price_monthly NUMERIC,
  p_price_yearly NUMERIC,
  p_features JSONB,
  p_is_active BOOLEAN
)
RETURNS subscription_plans AS $$
DECLARE
  updated_plan subscription_plans;
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Only system admins can update subscription plans';
  END IF;

  UPDATE subscription_plans
  SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    price_monthly = COALESCE(p_price_monthly, price_monthly),
    price_yearly = COALESCE(p_price_yearly, price_yearly),
    features = COALESCE(p_features, features),
    is_active = COALESCE(p_is_active, is_active),
    updated_at = NOW()
  WHERE id = p_plan_id
  RETURNING * INTO updated_plan;

  IF updated_plan IS NULL THEN
    RAISE EXCEPTION 'Plan not found';
  END IF;

  RETURN updated_plan;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

-- Get all subscription plans
CREATE OR REPLACE FUNCTION get_subscription_plans()
RETURNS SETOF subscription_plans AS $$
  SELECT * FROM subscription_plans ORDER BY price_monthly ASC, price_yearly ASC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

-- Get all organization subscriptions with plan details
CREATE OR REPLACE FUNCTION get_organization_subscriptions()
RETURNS TABLE(
  id UUID,
  organization_id UUID,
  org_name TEXT,
  plan_name TEXT,
  status TEXT,
  billing_period TEXT,
  price_monthly NUMERIC,
  price_yearly NUMERIC,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ
) AS $$
  SELECT
    os.id,
    os.organization_id,
    o.name AS org_name,
    sp.name AS plan_name,
    os.status,
    os.billing_period,
    sp.price_monthly,
    sp.price_yearly,
    os.current_period_start,
    os.current_period_end,
    os.created_at
  FROM organization_subscriptions os
  JOIN organizations o ON os.organization_id = o.id
  JOIN subscription_plans sp ON os.plan_id = sp.id
  ORDER BY os.created_at DESC, os.id DESC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

-- Get subscription history for an org
CREATE OR REPLACE FUNCTION get_subscription_history(p_org_id UUID)
RETURNS TABLE(
  id UUID,
  organization_id UUID,
  org_name TEXT,
  plan_name TEXT,
  action TEXT,
  amount NUMERIC,
  payment_status TEXT,
  invoice_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ
) AS $$
  SELECT
    sh.id,
    sh.organization_id,
    o.name AS org_name,
    sp.name AS plan_name,
    sh.action,
    sh.amount,
    sh.payment_status,
    sh.invoice_number,
    sh.notes,
    sh.created_at
  FROM subscription_history sh
  JOIN organizations o ON sh.organization_id = o.id
  JOIN subscription_plans sp ON sh.plan_id = sp.id
  WHERE sh.organization_id = p_org_id
  ORDER BY sh.created_at DESC, sh.id DESC;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

-- Pause an org's subscription
CREATE OR REPLACE FUNCTION pause_subscription(p_org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_sub organization_subscriptions%ROWTYPE;
  v_plan subscription_plans%ROWTYPE;
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Only system admins can pause subscriptions';
  END IF;

  SELECT * INTO v_sub
  FROM organization_subscriptions
  WHERE organization_id = p_org_id AND status = 'active'
  LIMIT 1;

  IF v_sub IS NULL THEN
    RAISE EXCEPTION 'No active subscription found for this organization';
  END IF;

  UPDATE organization_subscriptions
  SET status = 'paused', updated_at = NOW()
  WHERE id = v_sub.id;

  SELECT * INTO v_plan FROM subscription_plans WHERE id = v_sub.plan_id;

  INSERT INTO subscription_history (organization_id, plan_id, action, notes)
  VALUES (p_org_id, v_sub.plan_id, 'paused', 'Subscription paused by system admin');

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

-- Unpause an org's subscription
CREATE OR REPLACE FUNCTION unpause_subscription(p_org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_sub organization_subscriptions%ROWTYPE;
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Only system admins can unpause subscriptions';
  END IF;

  SELECT * INTO v_sub
  FROM organization_subscriptions
  WHERE organization_id = p_org_id AND status = 'paused'
  LIMIT 1;

  IF v_sub IS NULL THEN
    RAISE EXCEPTION 'No paused subscription found for this organization';
  END IF;

  UPDATE organization_subscriptions
  SET status = 'active', updated_at = NOW()
  WHERE id = v_sub.id;

  INSERT INTO subscription_history (organization_id, plan_id, action, notes)
  VALUES (p_org_id, v_sub.plan_id, 'renewed', 'Subscription unpaused by system admin');

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

-- ====================================================================
-- ORG OWNER FUNCTIONS
-- ====================================================================

-- Subscribe to plan (expires existing active subscription)
CREATE OR REPLACE FUNCTION subscribe_to_plan(
  p_org_id UUID,
  p_plan_id UUID,
  p_billing_period TEXT
)
RETURNS organization_subscriptions AS $$
DECLARE
  v_new_sub organization_subscriptions;
  v_plan subscription_plans;
  v_period_end TIMESTAMPTZ;
BEGIN
  -- Verify owner (owner-only via is_owner short-circuit in can_perform)
  IF NOT can_perform('subscription:manage', p_org_id) THEN
    RAISE EXCEPTION 'Only organization owners can subscribe to plans';
  END IF;

  -- Verify plan exists and is active
  SELECT * INTO v_plan
  FROM subscription_plans
  WHERE id = p_plan_id AND is_active = true;

  IF v_plan IS NULL THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;

  -- Expire existing active subscription
  UPDATE organization_subscriptions
  SET status = 'expired', updated_at = NOW()
  WHERE organization_id = p_org_id AND status = 'active';

  -- Calculate period end
  IF p_billing_period = 'yearly' THEN
    v_period_end := NOW() + INTERVAL '1 year';
  ELSE
    v_period_end := NOW() + INTERVAL '1 month';
  END IF;

  -- Create new subscription
  INSERT INTO organization_subscriptions (
    organization_id, plan_id, status, billing_period,
    current_period_start, current_period_end
  )
  VALUES (p_org_id, p_plan_id, 'active', p_billing_period, NOW(), v_period_end)
  RETURNING * INTO v_new_sub;

  -- Record history
  INSERT INTO subscription_history (organization_id, plan_id, action, amount, payment_status, notes)
  VALUES (
    p_org_id, p_plan_id, 'subscribed',
    CASE WHEN p_billing_period = 'yearly' THEN v_plan.price_yearly ELSE v_plan.price_monthly END,
    'paid',
    'Initial subscription to ' || v_plan.name
  );

  RETURN v_new_sub;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

-- Change plan (upgrade/downgrade, expires old)
CREATE OR REPLACE FUNCTION change_plan(
  p_org_id UUID,
  p_new_plan_id UUID,
  p_billing_period TEXT
)
RETURNS organization_subscriptions AS $$
DECLARE
  v_old_sub organization_subscriptions%ROWTYPE;
  v_new_plan subscription_plans;
  v_new_sub organization_subscriptions;
  v_period_end TIMESTAMPTZ;
  v_action TEXT;
BEGIN
  -- Verify owner (owner-only via is_owner short-circuit in can_perform)
  IF NOT can_perform('subscription:manage', p_org_id) THEN
    RAISE EXCEPTION 'Only organization owners can change plans';
  END IF;

  -- Get current active subscription
  SELECT * INTO v_old_sub
  FROM organization_subscriptions
  WHERE organization_id = p_org_id AND status = 'active'
  LIMIT 1;

  IF v_old_sub IS NULL THEN
    RAISE EXCEPTION 'No active subscription found. Use subscribe_to_plan instead.';
  END IF;

  -- Verify new plan exists and is active
  SELECT * INTO v_new_plan
  FROM subscription_plans
  WHERE id = p_new_plan_id AND is_active = true;

  IF v_new_plan IS NULL THEN
    RAISE EXCEPTION 'Plan not found or inactive';
  END IF;

  -- Determine action
  IF v_new_plan.price_monthly > (
    SELECT price_monthly FROM subscription_plans WHERE id = v_old_sub.plan_id
  ) THEN
    v_action := 'upgraded';
  ELSIF v_new_plan.price_monthly < (
    SELECT price_monthly FROM subscription_plans WHERE id = v_old_sub.plan_id
  ) THEN
    v_action := 'downgraded';
  ELSE
    v_action := 'changed';
  END IF;

  -- Expire old subscription
  UPDATE organization_subscriptions
  SET status = 'expired', updated_at = NOW()
  WHERE id = v_old_sub.id;

  -- Calculate period end
  IF p_billing_period = 'yearly' THEN
    v_period_end := NOW() + INTERVAL '1 year';
  ELSE
    v_period_end := NOW() + INTERVAL '1 month';
  END IF;

  -- Create new subscription
  INSERT INTO organization_subscriptions (
    organization_id, plan_id, status, billing_period,
    current_period_start, current_period_end
  )
  VALUES (p_org_id, p_new_plan_id, 'active', p_billing_period, NOW(), v_period_end)
  RETURNING * INTO v_new_sub;

  -- Record history
  INSERT INTO subscription_history (organization_id, plan_id, action, amount, payment_status, notes)
  VALUES (
    p_org_id, p_new_plan_id, v_action,
    CASE WHEN p_billing_period = 'yearly' THEN v_new_plan.price_yearly ELSE v_new_plan.price_monthly END,
    'paid',
    v_action || ' to ' || v_new_plan.name
  );

  RETURN v_new_sub;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

-- Cancel subscription
CREATE OR REPLACE FUNCTION cancel_subscription(p_org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_sub organization_subscriptions%ROWTYPE;
BEGIN
  -- Verify owner (owner-only via is_owner short-circuit in can_perform)
  IF NOT can_perform('subscription:manage', p_org_id) THEN
    RAISE EXCEPTION 'Only organization owners can cancel subscriptions';
  END IF;

  SELECT * INTO v_sub
  FROM organization_subscriptions
  WHERE organization_id = p_org_id AND status = 'active'
  LIMIT 1;

  IF v_sub IS NULL THEN
    RAISE EXCEPTION 'No active subscription found';
  END IF;

  UPDATE organization_subscriptions
  SET status = 'cancelled', updated_at = NOW()
  WHERE id = v_sub.id;

  INSERT INTO subscription_history (organization_id, plan_id, action, notes)
  VALUES (p_org_id, v_sub.plan_id, 'cancelled', 'Subscription cancelled by owner');

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

-- Get my current subscription
CREATE OR REPLACE FUNCTION get_my_subscription(p_org_id UUID)
RETURNS TABLE(
  id UUID,
  plan_id UUID,
  plan_name TEXT,
  description TEXT,
  price_monthly NUMERIC,
  price_yearly NUMERIC,
  features JSONB,
  status TEXT,
  billing_period TEXT,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ
) AS $$
  SELECT
    os.id,
    sp.id AS plan_id,
    sp.name AS plan_name,
    sp.description,
    sp.price_monthly,
    sp.price_yearly,
    sp.features,
    os.status,
    os.billing_period,
    os.current_period_start,
    os.current_period_end
  FROM organization_subscriptions os
  JOIN subscription_plans sp ON os.plan_id = sp.id
  WHERE os.organization_id = p_org_id
    AND os.status = 'active'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

-- ====================================================================
-- TRIGGERS
-- ====================================================================

CREATE TRIGGER update_subscription_plans_updated_at BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organization_subscriptions_updated_at BEFORE UPDATE ON organization_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- GRANTS
-- ====================================================================

-- System admin functions
GRANT EXECUTE ON FUNCTION create_subscription_plan(TEXT, TEXT, NUMERIC, NUMERIC, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION update_subscription_plan(UUID, TEXT, TEXT, NUMERIC, NUMERIC, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_plans() TO authenticated;
GRANT EXECUTE ON FUNCTION get_organization_subscriptions() TO authenticated;
GRANT EXECUTE ON FUNCTION get_subscription_history(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION pause_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION unpause_subscription(UUID) TO authenticated;

-- Org owner functions
GRANT EXECUTE ON FUNCTION subscribe_to_plan(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION change_plan(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_subscription(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_subscription(UUID) TO authenticated;

-- Feature check
GRANT EXECUTE ON FUNCTION has_feature(UUID, TEXT) TO authenticated;

-- ====================================================================
-- SEED DATA
-- ====================================================================

-- Default subscription plans
INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, features) VALUES
  ('Free', 'Basic features for small teams', 0, 0, '["todos", "members"]'),
  ('Pro', 'Advanced features for growing teams', 29, 290, '["todos", "members", "invites", "settings"]'),
  ('Enterprise', 'Full features for large organizations', 99, 990, '["todos", "members", "invites", "settings", "analytics", "audit"]')
ON CONFLICT DO NOTHING;

-- ====================================================================
-- MIGRATION COMPLETE
-- ====================================================================

-- ====================================================================
-- SQUASHED: 20240816160000_add_public_org_function.sql
-- ====================================================================
-- ====================================================================
-- Public Organization Landing Page
-- ====================================================================
-- Anonymous/public access to org info by slug.
-- SECURITY DEFINER bypasses RLS — only returns safe public fields.
-- ====================================================================

-- View for public org data (no user info, no private fields)
CREATE OR REPLACE FUNCTION get_public_org_by_slug(org_slug TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $$
  SELECT o.id, o.name, o.slug, o.description, o.created_at
  FROM organizations o
  WHERE o.slug = org_slug
    AND EXISTS (
      SELECT 1
      FROM organization_members om
      WHERE om.organization_id = o.id
        AND om.status = 'active'
    );
$$;

-- Allow anonymous access (public page, no auth required)
GRANT EXECUTE ON FUNCTION get_public_org_by_slug(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_public_org_by_slug(TEXT) TO authenticated;

-- ====================================================================
-- SQUASHED: 20240817160000_campaigns_core.sql
-- ====================================================================
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
  raised_amount NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (raised_amount >= 0),
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
  AND org_id IN (
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
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = donate, shared, extensions, private;

CREATE OR REPLACE FUNCTION get_campaigns(p_org_id UUID)
RETURNS SETOF campaigns AS $$
  SELECT * FROM campaigns
  WHERE org_id = p_org_id
    AND can_perform('campaigns:read', p_org_id)
  ORDER BY created_at DESC;
$$ LANGUAGE sql SECURITY INVOKER SET search_path = donate, shared, extensions, private;

CREATE OR REPLACE FUNCTION get_campaign(p_campaign_id UUID)
RETURNS SETOF campaigns AS $$
  SELECT * FROM campaigns
  WHERE id = p_campaign_id
    AND (
      can_perform('campaigns:read', org_id)
      OR is_system_admin()
    );
$$ LANGUAGE sql SECURITY INVOKER SET search_path = donate, shared, extensions, private;

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
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = donate, shared, extensions, private;

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
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = donate, shared, extensions, private;

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
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = donate, shared, extensions, private;

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
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = donate, shared, extensions, private;

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
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = donate, shared, extensions, private;

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
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = donate, shared, extensions, private;

CREATE OR REPLACE FUNCTION get_campaign_by_slug(p_slug TEXT)
RETURNS SETOF campaigns AS $$
  SELECT * FROM campaigns
  WHERE slug = p_slug
    AND (
      can_perform('campaigns:read', org_id)
      OR is_system_admin()
    );
$$ LANGUAGE sql SECURITY INVOKER SET search_path = donate, shared, extensions, private;

-- ====================================================================
-- DONATION METHODS FUNCTIONS (INVOKER)
-- ====================================================================

CREATE OR REPLACE FUNCTION get_donation_methods(p_org_id UUID)
RETURNS SETOF donation_methods AS $$
  SELECT * FROM donation_methods
  WHERE organization_id = p_org_id
    AND can_perform('org:read', p_org_id)
  ORDER BY is_preferred DESC, created_at ASC;
$$ LANGUAGE sql SECURITY INVOKER SET search_path = donate, shared, extensions, private;

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
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = donate, shared, extensions, private;

-- ====================================================================
-- CAMPAIGN TAGS FUNCTIONS (INVOKER)
-- ====================================================================

CREATE OR REPLACE FUNCTION get_campaign_tags()
RETURNS SETOF campaign_tags AS $$
  SELECT * FROM campaign_tags ORDER BY label ASC;
$$ LANGUAGE sql SECURITY INVOKER SET search_path = donate, shared, extensions, private;

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
$$ LANGUAGE plpgsql SECURITY INVOKER SET search_path = donate, shared, extensions, private;

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
  ('member', 'campaigns:update'), ('member', 'campaigns:delete'),
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

-- ====================================================================
-- SQUASHED: 20240818160000_public_campaigns.sql
-- ====================================================================
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
  raised_amount NUMERIC,
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

-- ====================================================================
-- SQUASHED: 20240819160000_fix_anon_campaign_visibility.sql
-- ====================================================================
-- Public campaign visibility must not depend on tables hidden from anon by RLS.
-- Two fixes:
-- 1. Anon table policy required an active organization_members row, but members
--    RLS denies anon SELECT on that table -> subquery always empty -> anon could
--    never see ANY live campaign.
-- 2. get_campaign_by_slug gated everything behind can_perform()/is_system_admin(),
--    so even live+active campaigns were invisible without a session.

DROP POLICY IF EXISTS "Anon can view live campaigns" ON campaigns;

CREATE POLICY "Anon can view live campaigns"
  ON campaigns
  FOR SELECT
  TO anon
  USING (status = 'live' AND is_active = true);

CREATE OR REPLACE FUNCTION donate.get_campaign_by_slug(p_slug text)
  RETURNS SETOF campaigns
  LANGUAGE sql
  SET search_path TO 'donate', 'shared', 'extensions', 'private'
AS $function$
  SELECT * FROM campaigns
  WHERE slug = p_slug
    AND (
      can_perform('campaigns:read', org_id)
      OR is_system_admin()
      OR (status = 'live' AND is_active)
    );
$function$;

-- ====================================================================
-- SQUASHED: 20260822171949_bind_accept_invite_email.sql
-- ====================================================================
-- ====================================================================
-- INVITE EMAIL BINDING
-- ====================================================================
-- accept_invite previously redeemed membership for ANY authenticated
-- user holding the token, regardless of which address the invite was
-- issued to. invites.email is NOT NULL and is the intended owner of
-- the membership; enforcement belongs here at the authorization
-- boundary (SECURITY DEFINER), not in client code.
--
-- Also takes a row lock (FOR UPDATE) so two concurrent redemptions
-- cannot both pass the unaccepted check.

CREATE OR REPLACE FUNCTION donate.accept_invite(p_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_invite invites;
  v_user_email TEXT;
BEGIN
  SELECT * INTO v_invite FROM invites
  WHERE token = p_token AND accepted_at IS NULL AND expires_at > NOW()
  FOR UPDATE;

  IF v_invite IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  SELECT lower(email) INTO v_user_email FROM auth.users WHERE id = auth.uid();

  IF v_user_email IS NULL OR lower(v_invite.email) <> v_user_email THEN
    RAISE EXCEPTION 'Invite issued for a different email';
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role, status, invited_by)
  VALUES (v_invite.organization_id, auth.uid(), v_invite.role, 'active', v_invite.invited_by)
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  UPDATE invites SET accepted_at = NOW() WHERE id = v_invite.id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

-- Keep the grant surface explicit: authenticated redeemers only.
REVOKE EXECUTE ON FUNCTION donate.accept_invite(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.accept_invite(TEXT) TO authenticated;

-- ====================================================================
-- SQUASHED: 20260822180000_validate_invite_requires_email.sql
-- ====================================================================
-- ====================================================================
-- INVITE VALIDATION WITHOUT EMAIL DISCLOSURE
-- ====================================================================
-- The old validate_invite(token) returned the invited email (and role)
-- to any anon caller holding the token. Validation now requires the
-- claimant's email as input and reveals only the organization name on
-- an exact match; anything else returns NULL with no state distinction
-- between wrong-email / expired / already-used / unknown-token.
--
-- Signature changed: CREATE OR REPLACE would leave the leaky 1-arg
-- overload callable, so it is dropped explicitly first.

DROP FUNCTION IF EXISTS donate.validate_invite(TEXT);

CREATE OR REPLACE FUNCTION donate.validate_invite(
  p_token TEXT,
  p_email TEXT
)
RETURNS TEXT -- org name when the pending invite is bound to p_email, else NULL
LANGUAGE sql
SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $$
  SELECT o.name
  FROM invites i
  JOIN organizations o ON o.id = i.organization_id
  WHERE i.token = p_token
    AND lower(i.email) = lower(p_email)
    AND i.accepted_at IS NULL
    AND i.expires_at > NOW()
$$;

-- Pre-auth lookup for the /invite page stays anonymous-capable.
REVOKE EXECUTE ON FUNCTION donate.validate_invite(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION donate.validate_invite(TEXT, TEXT) TO anon, authenticated;

-- ====================================================================
-- SQUASHED: 20260823091921_org_request_workflow.sql
-- ====================================================================
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
$$ LANGUAGE sql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

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
$$ LANGUAGE sql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

REVOKE EXECUTE ON FUNCTION set_org_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION set_org_status(UUID, TEXT) TO authenticated;

-- ====================================================================
-- 10. CREATE FUNCTIONS FOR ORG_META MANAGEMENT
-- ====================================================================

CREATE OR REPLACE FUNCTION get_org_meta(p_org_id UUID)
RETURNS SETOF org_meta AS $$
BEGIN
  IF NOT can_perform('org:read', p_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY SELECT * FROM org_meta WHERE organization_id = p_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

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
  ORDER BY requested_at DESC, id DESC;
$$ LANGUAGE sql SECURITY INVOKER SET search_path = donate, shared, extensions, private;

REVOKE EXECUTE ON FUNCTION get_my_org_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_my_org_requests() TO authenticated;

-- DEFINER (is_system_admin guard inside): the listing joins shared.profiles
-- for requester/reviewer emails — as INVOKER, profiles' own-row RLS would
-- blank every row except the caller's own.
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
    r.requested_at DESC,
    r.id DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

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
-- ====================================================================
-- SQUASHED: 20260823201030_restore_table_grants.sql
-- ====================================================================
-- Restore standard Supabase table privileges for anon/authenticated.
--
-- initial_schema grants SELECT only on views (profile_view, organization_view,
-- ...) and EXECUTE on functions, but several committed SECURITY INVOKER
-- functions (get_membership, can_perform) read base tables directly. Without
-- table DML grants those functions fail with "permission denied" on every
-- fresh `supabase db reset`.
--
-- Security model is unchanged: RLS stays enable + deny-all + permissive
-- policies; these grants only restore the access PATH that RLS gates.
-- See supabase/README.md (functions are THE authorization boundary).

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA private TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA private GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

-- ====================================================================
-- SQUASHED: 20260823222032_default_free_plan_on_org_create.sql
-- ====================================================================
-- Every organization must come alive with a baseline capability set.
-- Previously, orgs created via approve_org_request (and onboarding personal
-- orgs) had NO subscription => zero features => no tabs/settings at all.
-- Only the seeded demo org carried a plan.
--
-- Strategy: one AFTER INSERT trigger on organizations covers ALL creation
-- paths (approval flow, handle_new_user personal orgs, seeds) without
-- touching committed functions. The Free plan row is looked up by name at
-- trigger time; if seed order hasn't created it yet, we skip silently.

-- 1. Free tier includes 'settings': an org admin must be able to manage the
--    metadata collected in their own request regardless of payment state.
UPDATE subscription_plans
SET features = features || '["settings"]'::jsonb
WHERE name = 'Free'
  AND NOT features @> '["settings"]'::jsonb;

CREATE OR REPLACE FUNCTION donate.attach_default_plan()
RETURNS TRIGGER AS $$
DECLARE
  v_free_plan_id UUID;
BEGIN
  SELECT id INTO v_free_plan_id
  FROM subscription_plans
  WHERE name = 'Free'
  LIMIT 1;

  IF v_free_plan_id IS NULL THEN
    RETURN NEW; -- plans not seeded yet; nothing to attach
  END IF;

  INSERT INTO organization_subscriptions
    (organization_id, plan_id, status, current_period_start, current_period_end)
  SELECT NEW.id, v_free_plan_id, 'active', NOW(), NOW() + interval '1 month'
  WHERE NOT EXISTS (
    SELECT 1 FROM organization_subscriptions
    WHERE organization_id = NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

DROP TRIGGER IF EXISTS trg_attach_default_plan ON organizations;
CREATE TRIGGER trg_attach_default_plan
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION donate.attach_default_plan();

-- 2. Backfill: organizations that predate this trigger and have no plan.
INSERT INTO organization_subscriptions
  (organization_id, plan_id, status, current_period_start, current_period_end)
SELECT o.id, p.id, 'active', NOW(), NOW() + interval '1 month'
FROM organizations o
CROSS JOIN LATERAL (
  SELECT id FROM subscription_plans WHERE name = 'Free' LIMIT 1
) p
WHERE p.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM organization_subscriptions os
    WHERE os.organization_id = o.id
  );

-- ====================================================================
-- SQUASHED: 20260824000000_org_status_functions_without_views.sql
-- ====================================================================
-- ====================================================================
-- Org listing + suspension support WITHOUT the view-rework architecture.
-- The prior view rework (security_hardening / update_org_views_with_meta)
-- rebuilt organization_view/organization_detail_view with security_invoker
-- and coupled functions to those views via DROP VIEW … CASCADE. That made
-- `db reset` non-reproducible. Here we instead inline the org_meta JOIN
-- inside the listing functions (exactly what the view did), so the client's
-- OrganizationDetailView / OrganizationView contracts still hold, with no
-- view, no CASCADE coupling, and base-table RLS still enforced on the
-- SECURITY INVOKER path.
-- ====================================================================

-- System admin: all orgs with suspension status + display metadata.
DROP FUNCTION IF EXISTS get_all_organizations();
CREATE OR REPLACE FUNCTION get_all_organizations()
RETURNS TABLE(
  id UUID,
  slug TEXT,
  status TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  member_count BIGINT,
  name TEXT,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  social_links JSONB,
  settings JSONB
) AS $$
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;
  RETURN QUERY
    SELECT
      o.id,
      o.slug,
      o.status,
      o.created_by,
      o.created_at,
      o.updated_at,
      COUNT(DISTINCT mem.user_id) AS member_count,
      COALESCE(om.name, o.name) AS name,
      COALESCE(om.description, o.description) AS description,
      om.logo_url,
      om.website_url,
      om.contact_email,
      om.contact_phone,
      om.address,
      om.social_links,
      om.settings
    FROM organizations o
    LEFT JOIN organization_members mem
      ON o.id = mem.organization_id AND mem.status = 'active'
    LEFT JOIN org_meta om
      ON o.id = om.organization_id
    GROUP BY o.id, o.slug, o.status, o.created_by, o.created_at, o.updated_at,
             COALESCE(om.name, o.name), COALESCE(om.description, o.description), om.logo_url, om.website_url, om.contact_email,
             om.contact_phone, om.address, om.social_links, om.settings;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

REVOKE EXECUTE ON FUNCTION get_all_organizations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_all_organizations() TO authenticated;

-- Member: orgs the current user belongs to, with suspension status so the
--   selector can disable suspended orgs.
DROP FUNCTION IF EXISTS get_my_organizations();
CREATE OR REPLACE FUNCTION get_my_organizations()
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
  settings JSONB
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
    m.settings
  FROM organizations o
  LEFT JOIN organization_members om
    ON o.id = om.organization_id
  LEFT JOIN org_meta m
    ON o.id = m.organization_id
  WHERE om.user_id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

REVOKE EXECUTE ON FUNCTION get_my_organizations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_my_organizations() TO authenticated;

-- Single org detail for a member (org:read). Status lets the UI detect and
--   disable suspended orgs in the selector and on restore.
DROP FUNCTION IF EXISTS get_organization(UUID);
CREATE OR REPLACE FUNCTION get_organization(target_org_id UUID)
RETURNS TABLE(
  id UUID,
  slug TEXT,
  status TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  member_count BIGINT,
  name TEXT,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  social_links JSONB,
  settings JSONB
) AS $$
  SELECT
    o.id,
    o.slug,
    o.status,
    o.created_by,
    o.created_at,
    o.updated_at,
    COUNT(DISTINCT mem.user_id) AS member_count,
    COALESCE(om.name, o.name) AS name,
    COALESCE(om.description, o.description) AS description,
    om.logo_url,
    om.website_url,
    om.contact_email,
    om.contact_phone,
    om.address,
    om.social_links,
    om.settings
  FROM organizations o
  LEFT JOIN organization_members mem
    ON o.id = mem.organization_id AND mem.status = 'active'
  LEFT JOIN org_meta om
    ON o.id = om.organization_id
  WHERE o.id = target_org_id
    AND can_perform('org:read', target_org_id)
  GROUP BY o.id, o.slug, o.status, o.created_by, o.created_at, o.updated_at,
           COALESCE(om.name, o.name), COALESCE(om.description, o.description), om.logo_url, om.website_url, om.contact_email,
           om.contact_phone, om.address, om.social_links, om.settings;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

REVOKE EXECUTE ON FUNCTION get_organization(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_organization(UUID) TO authenticated;

-- ====================================================================
-- SQUASHED: 20260824000001_drop_dup_get_public_campaigns.sql
-- ====================================================================
-- Two overloads of get_public_campaigns existed with IDENTICAL argument
-- names but conflicting types:
--   (zakat_filter boolean, org_filter uuid, result_limit int)   -- original
--   (org_filter uuid, result_limit int, zakat_filter boolean)   -- request-flow rework
-- The client always calls with named args {zakat_filter, org_filter,
-- result_limit} (all nullable). With both overloads present PostgREST
-- cannot infer parameter types for NULL literals and answers 300 Multiple
-- Choices, breaking every anon campaign listing.
--
-- Keep the rework version: it additionally filters out suspended orgs.
-- All-NULL calls behave identically on either signature.

DROP FUNCTION IF EXISTS donate.get_public_campaigns(
  p_zakat_filter boolean,
  p_org_filter uuid,
  p_result_limit integer
);

-- The original declared its parameters WITHOUT the p_ prefix; drop that
-- spelling too (positional types are what Postgres matches on).
DROP FUNCTION IF EXISTS donate.get_public_campaigns(boolean, uuid, integer);

-- ====================================================================
-- SQUASHED: 20260824000002_update_org_meta_upsert.sql
-- ====================================================================
-- update_org_meta had two defects:
-- 1. Permission checked 'update:org' — no such grant exists anywhere
--    (role_permissions and every other function use 'org:update'), so any
--    non-owner admin was always rejected.
-- 2. A missing org_meta row raised 'Organization metadata not found'.
--    Absence is a NORMAL state for pre-existing orgs (seed never created
--    meta rows) and for orgs whose metadata was never edited; saving from
--    the Settings tab must upsert, not explode.

CREATE OR REPLACE FUNCTION donate.update_org_meta(
  p_org_id uuid,
  p_name text DEFAULT NULL::text,
  p_description text DEFAULT NULL::text,
  p_logo_url text DEFAULT NULL::text,
  p_website_url text DEFAULT NULL::text,
  p_contact_email text DEFAULT NULL::text,
  p_contact_phone text DEFAULT NULL::text,
  p_address text DEFAULT NULL::text,
  p_social_links jsonb DEFAULT NULL::jsonb,
  p_settings jsonb DEFAULT NULL::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $function$
BEGIN
  IF NOT can_perform('org:update', p_org_id) THEN
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
    -- Baseline row seeded from the organizations record so the editor has
    -- something coherent to upsert against.
    INSERT INTO org_meta (organization_id, name, description, updated_by)
    SELECT o.id, o.name, o.description, auth.uid()
    FROM organizations o WHERE o.id = p_org_id;
  END IF;

  RETURN true;
END;
$function$;

-- ====================================================================
-- SQUASHED: 20260824000003_unified_can_perform.sql
-- ====================================================================
-- ============================================================================
-- UNIFIED AUTHORIZATION GATE: donate.can_perform(permission, org_id)
--
-- Single source of truth for DB-side access control. Every mutation already
-- routes through this function (directly or via RLS policies), so wiring all
-- checks here enforces them everywhere at once:
--
--   1. Is the caller a system_admin?            -> full authority
--   2. Does the org exist / is it active?       -> suspended allows ONLY
--                                                  org info/metadata
--                                                  (org:read / org:update)
--   3. Is the caller an active member holding   -> owner shortcut or
--      that role-permission?                       role_permissions lookup
--   4. Does the org's ACTIVE subscription       -> delegated to has_feature,
--      include the permission's feature?           gated ONLY when the
--                                                  feature is plan-managed
--
-- Notes:
-- * SECURITY DEFINER so nested reads (organizations, subscriptions) cannot
--   recurse into the same RLS policies that invoke this function.
-- * Feature gating is data-driven: a feature key gates only if at least one
--   active subscription_plan actually declares it in its features array.
--   Keys absent from every plan (e.g. 'org') are treated as core
--   capabilities and pass on the role check alone. Adding the key to any
--   plan instantly starts enforcing it — no code change.
-- ============================================================================

CREATE OR REPLACE FUNCTION donate.can_perform(
  permission_name TEXT,
  p_org_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $$
DECLARE
  v_org_status TEXT;
  v_feature    TEXT;
BEGIN
  ------------------------------------------------------------------
  -- 1) System admin transcends org membership and plan tiers.
  ------------------------------------------------------------------
  IF is_system_admin() THEN
    RETURN TRUE;
  END IF;

  ------------------------------------------------------------------
  -- 2) The org must exist; suspended orgs allow ONLY org info/metadata
  --    management (org:read / org:update) — every other action denied.
  ------------------------------------------------------------------
  SELECT status INTO v_org_status FROM organizations WHERE id = p_org_id;

  IF v_org_status IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_org_status = 'suspended'
     AND permission_name NOT IN ('org:read', 'org:update') THEN
    RETURN FALSE;
  END IF;

  ------------------------------------------------------------------
  -- 3) Caller must be an ACTIVE member: owner passes outright, otherwise
  --    the member's role must hold exactly this permission (or '*').
  ------------------------------------------------------------------
  IF NOT (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = p_org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.is_owner = true
    )
    OR EXISTS (
      SELECT 1
      FROM organization_members om
      JOIN role_permissions rp ON rp.role = om.role
      WHERE om.organization_id = p_org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND rp.permission IN (permission_name, '*')
    )
  ) THEN
    RETURN FALSE;
  END IF;

  ------------------------------------------------------------------
  -- 4) Subscription feature gate — applied only when the permission's
  --    feature namespace is declared by at least one active plan.
  ------------------------------------------------------------------
  v_feature := split_part(permission_name, ':', 1);

  IF EXISTS (
    SELECT 1 FROM subscription_plans
    WHERE is_active = true AND features ? v_feature
  ) THEN
    RETURN has_feature(p_org_id, v_feature);
  END IF;

  RETURN TRUE;
END;
$$;

-- anon keeps EXECUTE deliberately: RLS policies on anon-reachable tables may
-- evaluate this function during anonymous queries, and it answers FALSE
-- safely (auth.uid() is NULL -> no membership). Revoking would convert those
-- evaluations into hard SQL errors instead of a clean denial.
REVOKE EXECUTE ON FUNCTION donate.can_perform(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION donate.can_perform(TEXT, UUID) TO anon, authenticated;

-- ====================================================================
-- SQUASHED: 20260824000004_rls_read_split.sql
-- ====================================================================
-- ============================================================================
-- READ/WRITE SPLIT (recursion-free authorization architecture)
--
--   * donate.can_perform(...) gates USER ACTIONS only (RPC mutations).
--     Read RLS never calls it.
--   * Read RLS uses small dedicated SECURITY INVOKER helpers in schema
--     `private`, all prefixed rls_.
--   * Every table those helpers touch has an INLINE, self-terminating
--     policy (no function calls back into itself), which is what actually
--     removes the recursion class.
--
-- Suspended-org contract (product decision):
--   suspended => members may ONLY manage org info/metadata
--                (org:read / org:update); every other action denied.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Private RLS helpers (SECURITY INVOKER, tiny, single-purpose)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION private.rls_uid()
RETURNS UUID LANGUAGE sql STABLE SECURITY INVOKER SET search_path = donate, shared, extensions, private AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.rls_is_system_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY INVOKER SET search_path = donate, shared, extensions, private AS $$
  -- Reads the CALLER'S OWN profile row (permitted by profiles' own-row policy)
  SELECT COALESCE(
    (SELECT is_system_admin FROM profiles WHERE id = auth.uid()), false
  );
$$;

CREATE OR REPLACE FUNCTION private.rls_is_active_member(p_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY INVOKER SET search_path = donate, shared, extensions, private AS $$
  -- Own membership row: permitted by organization_members' self-row policy
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION private.rls_is_owner(p_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY INVOKER SET search_path = donate, shared, extensions, private AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND is_owner = true
  );
$$;

CREATE OR REPLACE FUNCTION private.rls_org_status(p_org_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY INVOKER SET search_path = donate, shared, extensions, private AS $$
  SELECT status FROM organizations WHERE id = p_org_id;
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA private TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Terminating base policies for the tables helpers read
--    (inline predicates only — nothing here calls a helper on its own table)
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Members can view organizations" ON organizations;
CREATE POLICY "Members can view organizations" ON organizations
  FOR SELECT  TO authenticated USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organizations.id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM profiles me
      WHERE me.id = auth.uid() AND me.is_system_admin
    )
  );

DROP POLICY IF EXISTS "Members can view own memberships" ON organization_members;
CREATE POLICY "Members can view own memberships" ON organization_members
  FOR SELECT USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 3. Convert the seven read policies from can_perform(...) to helpers
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "Members can view campaigns" ON campaigns;
CREATE POLICY "Members can view campaigns" ON campaigns
  FOR SELECT  TO authenticated USING (private.rls_is_active_member(org_id));

DROP POLICY IF EXISTS "Members can view campaign_tag_map" ON campaign_tag_map;
CREATE POLICY "Members can view campaign_tag_map" ON campaign_tag_map
  FOR SELECT  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_tag_map.campaign_id
        AND private.rls_is_active_member(c.org_id)
    )
  );

DROP POLICY IF EXISTS "Members can view donation_methods" ON donation_methods;
CREATE POLICY "Members can view donation_methods" ON donation_methods
  FOR SELECT  TO authenticated USING (private.rls_is_active_member(organization_id));

DROP POLICY IF EXISTS "Admins can view invites" ON invites;
CREATE POLICY "Admins can view invites" ON invites
  FOR SELECT  TO authenticated USING (private.rls_is_active_member(organization_id));

DROP POLICY IF EXISTS "Owners can view own subscription" ON organization_subscriptions;
CREATE POLICY "Owners can view own subscription" ON organization_subscriptions
  FOR SELECT  TO authenticated USING (private.rls_is_owner(organization_id));

DROP POLICY IF EXISTS "Members can view todos" ON todos;
CREATE POLICY "Members can view todos" ON todos
  FOR SELECT  TO authenticated USING (private.rls_is_active_member(organization_id));

-- ---------------------------------------------------------------------------
-- 4. can_perform = ACTION GATE ONLY (rewrites the unified version):
--    sysadmin | org-active (suspended allows ONLY org info/metadata) |
--    membership + role permission | plan-managed subscription feature
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION donate.can_perform(
  permission_name TEXT,
  p_org_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $$
DECLARE
  v_org_status TEXT;
  v_feature    TEXT;
BEGIN
  -- (1) System admin transcends org and tier
  IF private.rls_is_system_admin() THEN
    RETURN TRUE;
  END IF;

  -- (2) Org existence + suspension contract
  v_org_status := private.rls_org_status(p_org_id);
  IF v_org_status IS NULL THEN
    RETURN FALSE;
  END IF;

  IF v_org_status = 'suspended'
     AND permission_name NOT IN ('org:read', 'org:update') THEN
    RETURN FALSE; -- suspended: only org info/metadata management
  END IF;

  -- (3) Active membership holding the role permission (owner shortcut)
  IF NOT (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = p_org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND om.is_owner = true
    )
    OR EXISTS (
      SELECT 1
      FROM organization_members om
      JOIN role_permissions rp ON rp.role = om.role
      WHERE om.organization_id = p_org_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
        AND rp.permission IN (permission_name, '*')
    )
  ) THEN
    RETURN FALSE;
  END IF;

  -- (4) Plan-managed subscription feature (data-driven; unmanaged namespaces
  --     like 'org' pass on the role check alone)
  v_feature := split_part(permission_name, ':', 1);

  IF EXISTS (
    SELECT 1 FROM subscription_plans
    WHERE is_active = true AND features ? v_feature
  ) THEN
    RETURN has_feature(p_org_id, v_feature);
  END IF;

  RETURN TRUE;
END;
$$;

-- ====================================================================
-- SQUASHED: 20260824000005_db_authorization_hardening.sql
-- ====================================================================
-- ============================================================================
-- DB AUTHORIZATION HARDENING (driven by supabase/tests/database pgTAP suites)
--
-- Closes every gap the test layer exposed:
--
--   A. get_my_subscription(p_org_id) leaked any org's plan/billing to any
--      authenticated caller. Now: system_admin OR active member of the org;
--      everyone else gets an empty result. Signature unchanged.
--
--   B. New INVOKER helper private.rls_has_role_permission(org, permission)
--      for read policies that must be ROLE-sensitive without touching
--      can_perform (keeps the read/write split clean).
--
--   C. invites SELECT was bare-membership — a 'viewer' could read invite
--      emails and tokens. Now requires the invites:read role permission.
--
--   D. System admins lost direct-table read parity on operational tables
--      when reads moved off can_perform. Restored via explicit admin branch
--      on todos / campaigns / campaign_tag_map / donation_methods.
--
--   E. organization_subscriptions direct writes by owners are gone — writes
--      are function-mediated only (matches subscription contract tests).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- B. Role-sensitive read helper (INVOKER; terminates through self-row and
--    catalog policies — no recursion possible).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.rls_has_role_permission(
  p_org_id UUID,
  p_permission TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = donate, shared, extensions, private
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM organization_members om
    JOIN role_permissions rp ON rp.role = om.role
    WHERE om.organization_id = p_org_id
      AND om.user_id = auth.uid()
      AND om.status = 'active'
      AND rp.permission IN (p_permission, '*')
  );
$$;

GRANT EXECUTE ON FUNCTION private.rls_has_role_permission(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- A. get_my_subscription — caller must belong to the org (or be admin).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION donate.get_my_subscription(p_org_id uuid)
RETURNS TABLE(
  id uuid,
  plan_id uuid,
  plan_name text,
  description text,
  price_monthly numeric,
  price_yearly numeric,
  features jsonb,
  status text,
  billing_period text,
  current_period_start timestamptz,
  current_period_end timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $function$
  SELECT
    os.id,
    sp.id AS plan_id,
    sp.name AS plan_name,
    sp.description,
    sp.price_monthly,
    sp.price_yearly,
    sp.features,
    os.status,
    os.billing_period,
    os.current_period_start,
    os.current_period_end
  FROM organization_subscriptions os
  JOIN subscription_plans sp ON os.plan_id = sp.id
  WHERE os.organization_id = p_org_id
    AND os.status = 'active'
    AND (
      is_system_admin()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.organization_id = p_org_id
          AND om.user_id = auth.uid()
          AND om.status = 'active'
      )
    )
  LIMIT 1;
$function$;

REVOKE EXECUTE ON FUNCTION donate.get_my_subscription(UUID) FROM PUBLIC;
-- anon keeps EXECUTE deliberately (same rationale as can_perform): the
-- guard yields an empty result for unauthenticated callers, and revoking
-- would turn anonymous evaluations into hard SQL errors instead.
GRANT EXECUTE ON FUNCTION donate.get_my_subscription(UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- C. invites: role-sensitive read (no viewers, no bare members).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view invites" ON invites;
CREATE POLICY "Members with invites:read can view invites" ON invites
  FOR SELECT  TO authenticated USING (
    private.rls_is_system_admin()
    OR private.rls_has_role_permission(organization_id, 'invites:read')
  );

-- ---------------------------------------------------------------------------
-- D. Admin read parity on operational tables.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view campaigns" ON campaigns;
CREATE POLICY "Members can view campaigns" ON campaigns
  FOR SELECT  TO authenticated USING (
    private.rls_is_active_member(org_id)
    OR private.rls_is_system_admin()
  );

DROP POLICY IF EXISTS "Members can view campaign_tag_map" ON campaign_tag_map;
CREATE POLICY "Members can view campaign_tag_map" ON campaign_tag_map
  FOR SELECT  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_tag_map.campaign_id
        AND private.rls_is_active_member(c.org_id)
    )
    OR private.rls_is_system_admin()
  );

DROP POLICY IF EXISTS "Members can view donation_methods" ON donation_methods;
CREATE POLICY "Members can view donation_methods" ON donation_methods
  FOR SELECT  TO authenticated USING (
    private.rls_is_active_member(organization_id)
    OR private.rls_is_system_admin()
  );

DROP POLICY IF EXISTS "Members can view todos" ON todos;
CREATE POLICY "Members can view todos" ON todos
  FOR SELECT  TO authenticated USING (
    private.rls_is_active_member(organization_id)
    OR private.rls_is_system_admin()
  );

-- ---------------------------------------------------------------------------
-- E. Subscription writes are function-mediated only.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owners can create own subscription" ON organization_subscriptions;
DROP POLICY IF EXISTS "Owners can update own subscription" ON organization_subscriptions;

-- ====================================================================
-- SQUASHED: 20260826000000_get_public_campaign_by_slug.sql
-- ====================================================================
-- Single-campaign public read: fetch one live campaign by slug directly
-- instead of pulling the whole public list and filtering client-side.
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

REVOKE EXECUTE ON FUNCTION get_public_campaign_by_slug(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_public_campaign_by_slug(TEXT) TO anon, authenticated;

-- ====================================================================
-- SQUASHED: 20260826115539_get_campaign_tag_ids.sql
-- ====================================================================
-- ============================================================================
-- get_campaign_tag_ids(p_campaign_id)
--
-- Read the tag ids currently attached to one campaign. Companion to
-- set_campaign_tags (which is destructive: DELETE-all-then-INSERT), so any
-- client that edits tags must load the current ids first or it silently
-- wipes them.
--
-- Authorization: SECURITY INVOKER + deny-by-default RLS on campaign_tag_map,
-- plus an explicit can_perform check matching get_campaign's house style.
-- Unknown campaign id -> org lookup is NULL -> can_perform FALSE -> no rows.
-- ============================================================================

CREATE OR REPLACE FUNCTION donate.get_campaign_tag_ids(p_campaign_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = donate, shared, extensions, private
AS $$
  SELECT m.tag_id
  FROM campaign_tag_map m
  WHERE m.campaign_id = p_campaign_id
    AND can_perform(
      'campaigns:read',
      (SELECT c.org_id FROM campaigns c WHERE c.id = p_campaign_id)
    )
  ORDER BY m.tag_id ASC;
$$;

REVOKE EXECUTE ON FUNCTION donate.get_campaign_tag_ids(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.get_campaign_tag_ids(UUID) TO authenticated;

-- ====================================================================
-- SQUASHED: 20260829000000_cursor_pagination_orgs.sql
-- ====================================================================
-- Add cursor-based pagination to listing RPCs
-- Functions accept p_limit + p_cursor, return rows directly.
-- Client determines has_more (items.length === limit) and next cursor (last item id).

-- -----------------------------------------------------------------------------
-- get_all_organizations: add p_limit + p_cursor
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_all_organizations();
CREATE OR REPLACE FUNCTION get_all_organizations(
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
  member_count BIGINT,
  name TEXT,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  social_links JSONB,
  settings JSONB
) AS $$
DECLARE
  v_limit int := least(greatest(coalesce(p_limit, 20), 1), 100);
BEGIN
  IF NOT is_system_admin() THEN
    RAISE EXCEPTION 'Not authorized: system admin required';
  END IF;
  RETURN QUERY
    SELECT
      o.id,
      o.slug,
      o.status,
      o.created_by,
      o.created_at,
      o.updated_at,
      COUNT(DISTINCT mem.user_id) AS member_count,
      COALESCE(om.name, o.name) AS name,
      COALESCE(om.description, o.description) AS description,
      om.logo_url,
      om.website_url,
      om.contact_email,
      om.contact_phone,
      om.address,
      om.social_links,
      om.settings
    FROM organizations o
    LEFT JOIN organization_members mem
      ON o.id = mem.organization_id AND mem.status = 'active'
    LEFT JOIN org_meta om
      ON o.id = om.organization_id
    WHERE (p_cursor IS NULL OR o.id::text > p_cursor)
    GROUP BY o.id, o.slug, o.status, o.created_by, o.created_at, o.updated_at,
             om.name, om.description, om.logo_url, om.website_url, om.contact_email,
             om.contact_phone, om.address, om.social_links, om.settings
    ORDER BY o.id ASC
    LIMIT v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

REVOKE EXECUTE ON FUNCTION get_all_organizations(int, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_all_organizations(int, text) TO authenticated;

-- -----------------------------------------------------------------------------
-- get_my_organizations: add p_limit + p_cursor
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_my_organizations();
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
  settings JSONB
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
    m.settings
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

-- ====================================================================
-- SQUASHED: 20260830000000_handle_new_user_profiles_only.sql
-- ====================================================================
-- ====================================================================
-- handle_new_user(): profiles row only
-- ====================================================================
-- Previously, this trigger also auto-created a personal organization
-- and membership for every new signup. That caused:
--   1. Users to have 2 orgs after accepting an invite (personal + invited)
--   2. Auto-select to never fire (only fires for exactly 1 org)
--   3. Non-deterministic e2e test behavior under suite timing
--
-- Organizations are now created exclusively via the request→approve flow
-- (approve_org_request) or the seed script. The trigger only ensures
-- a profiles row exists so FK constraints (organization_members.user_id)
-- are satisfied from the moment the user is created.
--
-- Schema note: the auth handler lives in `shared` (it fires on the platform
-- auth.users table); this rework replaces the initial org-creating version
-- in place. Drop the pre-refactor leftover in donate if one exists.
DROP FUNCTION IF EXISTS donate.handle_new_user();

CREATE OR REPLACE FUNCTION shared.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO shared.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- ====================================================================
-- SQUASHED: 20260830100000_fix_grant_system_admin_security.sql
-- ====================================================================
-- Fix grant_system_admin: was SECURITY INVOKER, which runs as the caller
-- (authenticated role).  RLS policy `deny_all_profiles` blocks UPDATE on
-- profiles, so the function always failed with "User not found".
--
-- Changing to SECURITY DEFINER makes the UPDATE run as the function owner
-- (postgres), bypassing RLS.  The internal is_system_admin() check is the
-- real authorization guard — same pattern used by every other DB function.
ALTER FUNCTION donate.grant_system_admin(uuid)
  SECURITY DEFINER
  SET search_path TO 'donate', 'shared', 'extensions', 'private';

-- ====================================================================
-- SQUASHED: 20260830200000_security_hardening_legacy_functions.sql
-- ====================================================================
-- =============================================================================
-- Security hardening: close authorization gaps in legacy functions
-- =============================================================================
-- Several functions were SECURITY DEFINER but had NO internal auth check,
-- meaning any authenticated user could call them via PostgREST RPC.
--
-- IMPORTANT: Use REVOKE ALL (not just REVOKE EXECUTE) because Supabase's
-- base setup grants EXECUTE via default privileges from supabase_admin.
-- A plain REVOKE EXECUTE doesn't override that — only REVOKE ALL does.

-- S1: set_system_admin — privilege escalation (any user → system admin)
-- Only used by seed scripts via psql as postgres.
REVOKE ALL ON FUNCTION set_system_admin(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION set_system_admin(UUID) FROM authenticated;
REVOKE ALL ON FUNCTION set_system_admin(UUID) FROM anon;
REVOKE ALL ON FUNCTION set_system_admin(UUID) FROM service_role;
GRANT EXECUTE ON FUNCTION set_system_admin(UUID) TO postgres;

-- S2: create_organization — bypasses org-request approval workflow
-- Orgs must go through submit_org_request → approve_org_request.
REVOKE ALL ON FUNCTION create_organization(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_organization(TEXT, TEXT, TEXT, JSONB) FROM authenticated;
REVOKE ALL ON FUNCTION create_organization(TEXT, TEXT, TEXT, JSONB) FROM anon;
REVOKE ALL ON FUNCTION create_organization(TEXT, TEXT, TEXT, JSONB) FROM service_role;

-- S6: bootstrap_system_admin — first caller becomes admin
-- Admins are seeded via migrations or grant_system_admin only.
REVOKE ALL ON FUNCTION bootstrap_system_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION bootstrap_system_admin() FROM authenticated;
REVOKE ALL ON FUNCTION bootstrap_system_admin() FROM anon;
REVOKE ALL ON FUNCTION bootstrap_system_admin() FROM service_role;

-- S7: dev-only functions — drop entirely (were SECURITY DEFINER, no auth guard)
DROP FUNCTION IF EXISTS reset_development_data();
DROP FUNCTION IF EXISTS create_test_user(TEXT, TEXT, TEXT);

-- S3: get_user_profile — leaked any user's email
-- Fix: only return profile if caller shares an org with target, or is system admin.
CREATE OR REPLACE FUNCTION donate.get_user_profile(target_user_id UUID)
RETURNS SETOF profile_view
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'donate', 'shared', 'extensions', 'private'
AS $function$
  SELECT pv.*
  FROM profile_view pv
  WHERE pv.id = target_user_id
    AND (
      is_system_admin()
      OR EXISTS (
        SELECT 1 FROM organization_members om
        WHERE om.user_id = auth.uid()
          AND om.status = 'active'
          AND EXISTS (
            SELECT 1 FROM organization_members om2
            WHERE om2.user_id = target_user_id
              AND om2.organization_id = om.organization_id
              AND om2.status = 'active'
          )
      )
    );
$function$;

-- S4: get_organization_subscriptions — leaked all billing data
-- Fix: system admin only (this is an admin-panel function).
CREATE OR REPLACE FUNCTION donate.get_organization_subscriptions()
RETURNS TABLE(
  id UUID, organization_id UUID, org_name TEXT, plan_name TEXT,
  status TEXT, billing_period TEXT, price_monthly NUMERIC, price_yearly NUMERIC,
  current_period_start TIMESTAMPTZ, current_period_end TIMESTAMPTZ, created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'donate', 'shared', 'extensions', 'private'
AS $function$
  SELECT
    os.id, os.organization_id, o.name AS org_name, sp.name AS plan_name,
    os.status, os.billing_period, sp.price_monthly, sp.price_yearly,
    os.current_period_start, os.current_period_end, os.created_at
  FROM organization_subscriptions os
  JOIN organizations o ON os.organization_id = o.id
  JOIN subscription_plans sp ON os.plan_id = sp.id
  WHERE is_system_admin()
  ORDER BY os.created_at DESC, os.id DESC;
$function$;

-- S5: get_subscription_history — leaked any org's payment history
-- Fix: require can_perform('org:read') on the target org.
CREATE OR REPLACE FUNCTION donate.get_subscription_history(p_org_id UUID)
RETURNS TABLE(
  id UUID, organization_id UUID, org_name TEXT, plan_name TEXT,
  action TEXT, amount NUMERIC, payment_status TEXT, invoice_number TEXT,
  notes TEXT, created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'donate', 'shared', 'extensions', 'private'
AS $function$
  SELECT
    sh.id, sh.organization_id, o.name AS org_name, sp.name AS plan_name,
    sh.action, sh.amount, sh.payment_status, sh.invoice_number,
    sh.notes, sh.created_at
  FROM subscription_history sh
  JOIN organizations o ON sh.organization_id = o.id
  JOIN subscription_plans sp ON sh.plan_id = sp.id
  WHERE sh.organization_id = p_org_id
    AND can_perform('org:read', p_org_id)
  ORDER BY sh.created_at DESC, sh.id DESC;
$function$;

-- ====================================================================
-- SCHEMA-MOVE GRANT RESTORE (donate)
-- ====================================================================
-- The pre-refactor baseline granted table DML on public to anon/
-- authenticated so SECURITY INVOKER functions and RLS evaluation have an
-- access PATH; RLS (enable + deny-all + permissive policies) remains THE
-- authorization boundary. Reproduce that path for the donate schema.
-- Default privileges (initial migration) cover this too; this explicit
-- block is belt-and-braces for tables created by other roles.
-- ====================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA donate TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA donate TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA donate
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;

-- Views must never carry client grants: postgres-owned views execute with
-- owner privileges and would bypass underlying RLS (cross-org membership +
-- email enumeration leak). "GRANT ... ON ALL TABLES" above includes views,
-- so the revoke is repeated AFTER the grant block. NOTE for future
-- migrations: any new view in donate must revoke client SELECT explicitly.
REVOKE SELECT ON profile_view, organization_view, organization_detail_view,
  member_view, role_view
FROM authenticated, anon, PUBLIC;
