-- ============================================================================
-- READ/WRITE SPLIT (recursion-free authorization architecture)
--
--   * public.can_perform(...) gates USER ACTIONS only (RPC mutations).
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
RETURNS UUID LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.rls_is_system_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  -- Reads the CALLER'S OWN profile row (permitted by profiles' own-row policy)
  SELECT COALESCE(
    (SELECT is_system_admin FROM profiles WHERE id = auth.uid()), false
  );
$$;

CREATE OR REPLACE FUNCTION private.rls_is_active_member(p_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  -- Own membership row: permitted by organization_members' self-row policy
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION private.rls_is_owner(p_org_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_id = p_org_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND is_owner = true
  );
$$;

CREATE OR REPLACE FUNCTION private.rls_org_status(p_org_id UUID)
RETURNS TEXT LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
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
  FOR SELECT USING (
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
  FOR SELECT USING (private.rls_is_active_member(org_id));

DROP POLICY IF EXISTS "Members can view campaign_tag_map" ON campaign_tag_map;
CREATE POLICY "Members can view campaign_tag_map" ON campaign_tag_map
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM campaigns c
      WHERE c.id = campaign_tag_map.campaign_id
        AND private.rls_is_active_member(c.org_id)
    )
  );

DROP POLICY IF EXISTS "Members can view donation_methods" ON donation_methods;
CREATE POLICY "Members can view donation_methods" ON donation_methods
  FOR SELECT USING (private.rls_is_active_member(organization_id));

DROP POLICY IF EXISTS "Admins can view invites" ON invites;
CREATE POLICY "Admins can view invites" ON invites
  FOR SELECT USING (private.rls_is_active_member(organization_id));

DROP POLICY IF EXISTS "Owners can view own subscription" ON organization_subscriptions;
CREATE POLICY "Owners can view own subscription" ON organization_subscriptions
  FOR SELECT USING (private.rls_is_owner(organization_id));

DROP POLICY IF EXISTS "Members can view todos" ON todos;
CREATE POLICY "Members can view todos" ON todos
  FOR SELECT USING (private.rls_is_active_member(organization_id));

-- ---------------------------------------------------------------------------
-- 4. can_perform = ACTION GATE ONLY (rewrites the unified version):
--    sysadmin | org-active (suspended allows ONLY org info/metadata) |
--    membership + role permission | plan-managed subscription feature
-- ---------------------------------------------------------------------------

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
