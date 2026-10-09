-- ============================================================================
-- pgTAP: RPC EXECUTE grant surface — the privilege-level tripwire.
--
-- The API surface is three tiers (20261008200032; see supabase/README.md):
--   anon            exactly the six intentional public functions
--   authenticated   every other client-facing RPC
--   postgres only   trigger + internal helpers (no RPC surface)
--
-- Behavioral suites prove the in-function authorization gates; this suite
-- proves the DB privileges themselves, so a future migration that forgets
-- the paired REVOKE (the Era-1 mistake that required 20261008200032) fails
-- here before it leaks. Pure catalog assertions — no fixtures.
-- ============================================================================

BEGIN;
SELECT plan(25);

-- ----------------------------------------------------------------------------
-- ANON: the six deliberate public functions, and nothing else
-- ----------------------------------------------------------------------------
SELECT is(has_function_privilege('anon', 'donate.get_public_campaigns(boolean,uuid,int)',         'EXECUTE'), true, 'anon: get_public_campaigns (public listing)');
SELECT is(has_function_privilege('anon', 'donate.get_public_campaign_by_slug(text)',              'EXECUTE'), true, 'anon: get_public_campaign_by_slug (public detail)');
SELECT is(has_function_privilege('anon', 'donate.get_public_org_by_slug(text)',                   'EXECUTE'), true, 'anon: get_public_org_by_slug (public org page)');
SELECT is(has_function_privilege('anon', 'donate.get_public_donation_reports(uuid,int)',          'EXECUTE'), true, 'anon: get_public_donation_reports (public report feed)');
SELECT is(has_function_privilege('anon', 'donate.propose_donation(uuid,numeric,text,text,text,text,text)', 'EXECUTE'), true, 'anon: propose_donation (guest donation + Turnstile)');
SELECT is(has_function_privilege('anon', 'donate.validate_invite(text,text)',                     'EXECUTE'), true, 'anon: validate_invite (pre-login invite check)');

SELECT is(has_function_privilege('anon', 'donate.get_my_profile()',                'EXECUTE'), false, 'anon: get_my_profile DB-revoked');
SELECT is(has_function_privilege('anon', 'donate.accept_invite(text)',             'EXECUTE'), false, 'anon: accept_invite DB-revoked (accept requires a session)');
SELECT is(has_function_privilege('anon', 'donate.get_subscription_plans()',        'EXECUTE'), false, 'anon: get_subscription_plans DB-revoked');
SELECT is(has_function_privilege('anon', 'donate.set_org_status(uuid,text)',       'EXECUTE'), false, 'anon: set_org_status DB-revoked');
SELECT is(has_function_privilege('anon', 'donate.add_organization_member(uuid,text,text)', 'EXECUTE'), false, 'anon: add_organization_member DB-revoked');
SELECT is(has_function_privilege('anon', 'donate.create_organization(text,text,text,jsonb)', 'EXECUTE'), false, 'anon: create_organization DB-revoked (approval workflow only)');

-- can_perform is the RLS policy gate (organizations/members/todos/invites
-- policies evaluate it as the querying role) — anon MUST keep EXECUTE.
SELECT is(has_function_privilege('anon', 'donate.can_perform(text,uuid)', 'EXECUTE'), true, 'anon: can_perform callable (RLS policy machinery, accepted lint)');

-- ----------------------------------------------------------------------------
-- AUTHENTICATED: client RPCs, but not the internals
-- ----------------------------------------------------------------------------
SELECT is(has_function_privilege('authenticated', 'donate.get_my_profile()',        'EXECUTE'), true,  'authenticated: get_my_profile callable');
SELECT is(has_function_privilege('authenticated', 'donate.accept_invite(text)',     'EXECUTE'), true,  'authenticated: accept_invite callable');
SELECT is(has_function_privilege('authenticated', 'donate.get_subscription_plans()', 'EXECUTE'), true, 'authenticated: get_subscription_plans callable');
SELECT is(has_function_privilege('authenticated', 'donate.get_public_campaigns(boolean,uuid,int)', 'EXECUTE'), true, 'authenticated: public reads stay callable when signed in');

SELECT is(has_function_privilege('authenticated', 'donate.can_perform(text,uuid)',        'EXECUTE'), true,  'authenticated: can_perform callable (RLS policies evaluate it as the querying role)');
SELECT is(has_function_privilege('authenticated', 'donate.grant_system_admin(uuid)',      'EXECUTE'), true,  'authenticated: grant_system_admin callable (is_system_admin gate inside)');
SELECT is(has_function_privilege('authenticated', 'donate.get_system_admins()',           'EXECUTE'), true,  'authenticated: get_system_admins callable (is_system_admin gate inside)');
SELECT is(has_function_privilege('authenticated', 'donate.audit_table_changes()',         'EXECUTE'), false, 'authenticated: audit trigger function not RPC-callable');
SELECT is(has_function_privilege('authenticated', 'donate.update_updated_at_column()',    'EXECUTE'), false, 'authenticated: updated_at trigger function not RPC-callable');

-- ----------------------------------------------------------------------------
-- POSTGRES: internals usable by the migration/seed role
-- ----------------------------------------------------------------------------
SELECT is(has_function_privilege('postgres', 'donate.can_perform(text,uuid)', 'EXECUTE'), true, 'postgres: can_perform available to migration role');

-- ----------------------------------------------------------------------------
-- VIEWS: security_invoker (20261008200031) — inside the RLS boundary
-- ----------------------------------------------------------------------------
SELECT is(
  (SELECT bool_and(reloptions @> ARRAY['security_invoker=true'])
   FROM pg_class
   WHERE oid IN ('donate.profile_view'::regclass, 'donate.organization_view'::regclass,
                 'donate.organization_detail_view'::regclass, 'donate.member_view'::regclass,
                 'donate.role_view'::regclass)),
  true,
  'all five API views are security_invoker'
);

-- ----------------------------------------------------------------------------
-- TRIGGER FUNCTIONS: search_path pinned (lint 0011)
-- ----------------------------------------------------------------------------
SELECT is(
  (SELECT proconfig @> ARRAY['search_path=donate, shared, extensions, private']
   FROM pg_proc WHERE oid = 'donate.audit_table_changes()'::regprocedure),
  true,
  'audit_table_changes pins search_path'
);
SELECT is(
  (SELECT proconfig @> ARRAY['search_path=donate, shared, extensions, private']
   FROM pg_proc WHERE oid = 'donate.update_updated_at_column()'::regprocedure),
  true,
  'update_updated_at_column pins search_path'
);

SELECT * FROM finish();
ROLLBACK;
