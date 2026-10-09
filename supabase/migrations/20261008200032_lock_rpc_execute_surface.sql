-- ====================================================================
-- Enforce the RPC EXECUTE surface and pin trigger-function search paths
-- ====================================================================
-- Database lints 0011 + 0028 remediation. Era-1 migrations granted
-- EXECUTE to authenticated but never revoked the Postgres default
-- EXECUTE FROM PUBLIC, so most functions stayed callable without a
-- session (lint 0028). Later migrations fixed this piecemeal with the
-- paired REVOKE ... FROM PUBLIC, anon; GRANT ... TO authenticated
-- pattern — this migration finishes the rollout in one idempotent,
-- reviewable statement of the whole surface:
--
--   anon            exactly the six intentional public functions (C),
--                   plus can_perform (RLS policy machinery, end of B)
--   authenticated   every other client-facing RPC (D)
--   postgres only   trigger + internal helpers, no RPC surface (B)
--
-- This is defense in depth, not an auth fix: every function in D/B
-- already carries its own authorization gate (can_perform /
-- is_system_admin / ownership checks) per supabase/README.md.
-- Section B follows the 20260830200000 precedent: REVOKE ALL (not just
-- EXECUTE) because Supabase default privileges grant EXECUTE to the API
-- roles, and only an explicit per-role revoke overrides every source.
--
-- The 0027-family finding — "signed-in users can execute SECURITY
-- DEFINER functions" — is accepted by design and NOT remediated here:
-- deny-all RLS means every RPC must be SECURITY DEFINER (an INVOKER
-- function reads nothing), and revoking authenticated would break the
-- app. See supabase/README.md ("RPC EXECUTE surface & accepted lints").

-- ====================================================================
-- A. Pin search_path on the trigger functions (lint 0011)
-- ====================================================================
-- Bodies verbatim from initial_schema; the linter flags the missing
-- SET clause. All references are schema-qualified or pg_catalog, so the
-- pin is behaviorally a no-op — it just closes the role-mutable path.

CREATE OR REPLACE FUNCTION donate.audit_table_changes()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  operation TEXT;
  v_resource_id UUID;
  v_org_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    operation := TG_TABLE_NAME || '.deleted';
    old_data := to_jsonb(OLD);
    v_resource_id := OLD.id;
  ELSIF TG_OP = 'UPDATE' THEN
    operation := TG_TABLE_NAME || '.updated';
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
    v_resource_id := NEW.id;
  ELSIF TG_OP = 'INSERT' THEN
    operation := TG_TABLE_NAME || '.created';
    new_data := to_jsonb(NEW);
    v_resource_id := NEW.id;
  END IF;

  IF TG_TABLE_NAME = 'organizations' THEN
    v_org_id := v_resource_id;
  ELSIF TG_TABLE_NAME = 'organization_members' THEN
    IF TG_OP = 'DELETE' THEN
      v_org_id := OLD.organization_id;
    ELSE
      v_org_id := NEW.organization_id;
    END IF;
  ELSE
    v_org_id := NULL;
  END IF;

  INSERT INTO donate.audit_logs (user_id, organization_id, action, resource_type, resource_id, metadata, ip_address)
  VALUES (auth.uid(), v_org_id, operation, TG_TABLE_NAME, v_resource_id,
    jsonb_build_object('old', old_data, 'new', new_data, 'operation', TG_OP), inet_client_addr());

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

CREATE OR REPLACE FUNCTION donate.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = donate, shared, extensions, private;

-- ====================================================================
-- B. Postgres-only: trigger + internal helpers + approval bypass
-- ====================================================================
-- No client code reaches any of these (none are registered in
-- client/src/types/rpc.ts). SECURITY DEFINER callers invoke them as the
-- function owner, which retains EXECUTE implicitly, so internal call
-- chains are unaffected.

-- B1. Trigger functions and internal helpers
REVOKE ALL ON FUNCTION donate.audit_table_changes()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION donate.audit_table_changes() TO postgres;

REVOKE ALL ON FUNCTION donate.update_updated_at_column()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION donate.update_updated_at_column() TO postgres;

-- Trigger: trg_attach_default_plan ON organizations (squash 2049).
REVOKE ALL ON FUNCTION donate.attach_default_plan()
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION donate.attach_default_plan() TO postgres;

REVOKE ALL ON FUNCTION donate.audit_action(UUID, UUID, TEXT, TEXT, UUID, JSONB)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION donate.audit_action(UUID, UUID, TEXT, TEXT, UUID, JSONB) TO postgres;

REVOKE ALL ON FUNCTION donate.sync_campaign_raised(UUID)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION donate.sync_campaign_raised(UUID) TO postgres;

-- Called only inside propose_donation (SECURITY DEFINER context).
REVOKE ALL ON FUNCTION donate.verify_turnstile(TEXT, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION donate.verify_turnstile(TEXT, TEXT) TO postgres;

-- System-admin RPCs: signed-in callers only; the in-function
-- is_system_admin() gate is the boundary (e2e asserts admins can promote
-- via RPC, so these stay on the accepted authenticated tier).
REVOKE EXECUTE ON FUNCTION donate.grant_system_admin(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.grant_system_admin(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION donate.get_system_admins() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.get_system_admins() TO authenticated;

-- can_perform is RLS policy machinery: policies on organizations,
-- organization_members, todos and invites evaluate it AS THE QUERYING
-- ROLE, so anon and authenticated must keep EXECUTE or every policy
-- check errors. Its linter finding is accepted (see README); only the
-- implicit PUBLIC grant is traded for explicit ones.
REVOKE EXECUTE ON FUNCTION donate.can_perform(TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION donate.can_perform(TEXT, UUID) TO anon, authenticated;

-- B2. create_organization — keep the 20260830200000 posture: orgs must
-- go through submit_org_request -> approve_org_request (or the personal
-- org trigger). Re-asserted so hosted drift cannot resurrect it.
REVOKE ALL ON FUNCTION donate.create_organization(TEXT, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon, authenticated, service_role;

-- ====================================================================
-- C. Deliberate public surface — anon EXECUTE stays (lint 0028 accepted)
-- ====================================================================
-- Guest donation with Turnstile, pre-login invite validation, and the
-- public landing/campaign/org reads. PUBLIC is revoked so the grant list
-- is explicit; authenticated keeps access for signed-in usage of the
-- same pages.

REVOKE EXECUTE ON FUNCTION donate.get_public_campaigns(BOOLEAN, UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION donate.get_public_campaigns(BOOLEAN, UUID, INT) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION donate.get_public_campaign_by_slug(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION donate.get_public_campaign_by_slug(TEXT) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION donate.get_public_org_by_slug(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION donate.get_public_org_by_slug(TEXT) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION donate.get_public_donation_reports(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION donate.get_public_donation_reports(UUID, INT) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION donate.propose_donation(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION donate.propose_donation(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION donate.validate_invite(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION donate.validate_invite(TEXT, TEXT) TO anon, authenticated;

-- ====================================================================
-- D. Auth-only RPCs — signed-in callers only (lint 0028 remediation)
-- ====================================================================
-- Every UI flow that reaches these runs with a user JWT (requests carry
-- the `authenticated` role), so anon revocation changes no signed-in
-- behavior. Signatures match the current stream; the statements are
-- idempotent so re-running or replaying on a drifted project heals it.

-- Profile
REVOKE EXECUTE ON FUNCTION donate.get_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.get_my_profile() TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.update_my_profile(TEXT, TEXT, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.update_my_profile(TEXT, TEXT, JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.get_user_profile(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.get_user_profile(UUID) TO authenticated;

-- Organizations and members
REVOKE EXECUTE ON FUNCTION donate.ensure_my_personal_org() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.ensure_my_personal_org() TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.get_my_organizations(INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.get_my_organizations(INT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.get_organization(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.get_organization(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.add_organization_member(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.add_organization_member(UUID, TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.get_organization_members(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.get_organization_members(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.update_member_role(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.update_member_role(UUID, UUID, TEXT) TO authenticated;

-- Org metadata
REVOKE EXECUTE ON FUNCTION donate.get_org_meta(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.get_org_meta(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.update_org_meta(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.update_org_meta(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, JSONB, JSONB) TO authenticated;

-- Org requests (submitter + system-admin review)
REVOKE EXECUTE ON FUNCTION donate.submit_org_request(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.submit_org_request(TEXT, TEXT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.get_all_org_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.get_all_org_requests() TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.approve_org_request(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.approve_org_request(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.reject_org_request(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.reject_org_request(UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.set_org_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.set_org_status(UUID, TEXT) TO authenticated;

-- Invites (accept requires a session; validate_invite above stays public)
REVOKE EXECUTE ON FUNCTION donate.accept_invite(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.accept_invite(TEXT) TO authenticated;

-- System admin reads
REVOKE EXECUTE ON FUNCTION donate.get_all_organizations(INT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.get_all_organizations(INT, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.get_system_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.get_system_stats() TO authenticated;

-- Subscriptions (org billing + system-admin plan management)
REVOKE EXECUTE ON FUNCTION donate.get_subscription_plans() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.get_subscription_plans() TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.get_subscription_history(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.get_subscription_history(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.get_my_subscription(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.get_my_subscription(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.subscribe_to_plan(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.subscribe_to_plan(UUID, UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.change_plan(UUID, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.change_plan(UUID, UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.cancel_subscription(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.cancel_subscription(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.has_feature(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.has_feature(UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.create_subscription_plan(TEXT, TEXT, NUMERIC, NUMERIC, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.create_subscription_plan(TEXT, TEXT, NUMERIC, NUMERIC, JSONB) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.update_subscription_plan(UUID, TEXT, TEXT, NUMERIC, NUMERIC, JSONB, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.update_subscription_plan(UUID, TEXT, TEXT, NUMERIC, NUMERIC, JSONB, BOOLEAN) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.get_organization_subscriptions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.get_organization_subscriptions() TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.pause_subscription(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.pause_subscription(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.unpause_subscription(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.unpause_subscription(UUID) TO authenticated;

-- Campaign admin (org dashboard + system-admin review)
REVOKE EXECUTE ON FUNCTION donate.get_campaign_payment_methods(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.get_campaign_payment_methods(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.set_campaign_payment_methods(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.set_campaign_payment_methods(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.get_campaign_beneficiary(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.get_campaign_beneficiary(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.set_campaign_beneficiary(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.set_campaign_beneficiary(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Donation reports (org review queue; public reads stay in section C)
REVOKE EXECUTE ON FUNCTION donate.list_donation_reports(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.list_donation_reports(UUID, TEXT) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.confirm_donation_report(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.confirm_donation_report(UUID) TO authenticated;
REVOKE EXECUTE ON FUNCTION donate.reject_donation_report(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.reject_donation_report(UUID, TEXT) TO authenticated;
