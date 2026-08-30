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
CREATE OR REPLACE FUNCTION public.get_user_profile(target_user_id UUID)
RETURNS SETOF profile_view
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
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
CREATE OR REPLACE FUNCTION public.get_organization_subscriptions()
RETURNS TABLE(
  id UUID, organization_id UUID, org_name TEXT, plan_name TEXT,
  status TEXT, billing_period TEXT, price_monthly NUMERIC, price_yearly NUMERIC,
  current_period_start TIMESTAMPTZ, current_period_end TIMESTAMPTZ, created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
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
CREATE OR REPLACE FUNCTION public.get_subscription_history(p_org_id UUID)
RETURNS TABLE(
  id UUID, organization_id UUID, org_name TEXT, plan_name TEXT,
  action TEXT, amount NUMERIC, payment_status TEXT, invoice_number TEXT,
  notes TEXT, created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
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
