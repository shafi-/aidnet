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
SET search_path = public
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
CREATE OR REPLACE FUNCTION public.get_my_subscription(p_org_id uuid)
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
SET search_path = public
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

REVOKE EXECUTE ON FUNCTION public.get_my_subscription(UUID) FROM PUBLIC;
-- anon keeps EXECUTE deliberately (same rationale as can_perform): the
-- guard yields an empty result for unauthenticated callers, and revoking
-- would turn anonymous evaluations into hard SQL errors instead.
GRANT EXECUTE ON FUNCTION public.get_my_subscription(UUID) TO anon, authenticated;

-- ---------------------------------------------------------------------------
-- C. invites: role-sensitive read (no viewers, no bare members).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view invites" ON invites;
CREATE POLICY "Members with invites:read can view invites" ON invites
  FOR SELECT USING (
    private.rls_is_system_admin()
    OR private.rls_has_role_permission(organization_id, 'invites:read')
  );

-- ---------------------------------------------------------------------------
-- D. Admin read parity on operational tables.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Members can view campaigns" ON campaigns;
CREATE POLICY "Members can view campaigns" ON campaigns
  FOR SELECT USING (
    private.rls_is_active_member(org_id)
    OR private.rls_is_system_admin()
  );

DROP POLICY IF EXISTS "Members can view campaign_tag_map" ON campaign_tag_map;
CREATE POLICY "Members can view campaign_tag_map" ON campaign_tag_map
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_tag_map.campaign_id
        AND private.rls_is_active_member(c.org_id)
    )
    OR private.rls_is_system_admin()
  );

DROP POLICY IF EXISTS "Members can view donation_methods" ON donation_methods;
CREATE POLICY "Members can view donation_methods" ON donation_methods
  FOR SELECT USING (
    private.rls_is_active_member(organization_id)
    OR private.rls_is_system_admin()
  );

DROP POLICY IF EXISTS "Members can view todos" ON todos;
CREATE POLICY "Members can view todos" ON todos
  FOR SELECT USING (
    private.rls_is_active_member(organization_id)
    OR private.rls_is_system_admin()
  );

-- ---------------------------------------------------------------------------
-- E. Subscription writes are function-mediated only.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Owners can create own subscription" ON organization_subscriptions;
DROP POLICY IF EXISTS "Owners can update own subscription" ON organization_subscriptions;
