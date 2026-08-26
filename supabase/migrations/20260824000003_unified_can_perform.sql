-- ============================================================================
-- UNIFIED AUTHORIZATION GATE: public.can_perform(permission, org_id)
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

CREATE OR REPLACE FUNCTION public.can_perform(
  permission_name TEXT,
  p_org_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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
REVOKE EXECUTE ON FUNCTION public.can_perform(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_perform(TEXT, UUID) TO anon, authenticated;
