-- ============================================================================
-- pgTAP: get_my_subscription(p_org_id) — caller authorization (TDD).
--
-- Contract:
--   * active member of the org        -> sees the org's active subscription
--   * authenticated NON-member        -> EMPTY result (was: leaked row!)
--   * system_admin                    -> sees any org's subscription
--   * anonymous                       -> EMPTY result
--
-- NOTE: written BEFORE migration 20260824000005. The non-member and anon
-- assertions are expected to FAIL until that migration lands.
-- ============================================================================

BEGIN;
SELECT plan(4);

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at) VALUES
  ('e1e1e1e1-1111-4111-8111-e1e1e1e1e1e1', 'sub-owner@test.local',     '', now()),
  ('e2e2e2e2-2222-4222-8222-e2e2e2e2e2e2', 'sub-member@test.local',   '', now()),
  ('e3e3e3e3-3333-4333-8333-e3e3e3e3e3e3', 'sub-sysadmin@test.local','', now()),
  ('e4e4e4e4-4444-4444-8444-e4e4e4e4e4e4', 'sub-outsider@test.local','' , now())
ON CONFLICT (id) DO NOTHING;

UPDATE profiles SET is_system_admin = true
WHERE id = 'e3e3e3e3-3333-4333-8333-e3e3e3e3e3e3';

INSERT INTO organizations (id, name, slug, status, created_by) VALUES
  ('f1f1f1f1-1111-4111-8111-f1f1f1f1f1f1', 'Sub Org A', 'sub-org-a', 'active',
   'e1e1e1e1-1111-4111-8111-e1e1e1e1e1e1'),
  ('f2f2f2f2-2222-4222-8222-f2f2f2f2f2f2', 'Sub Org B', 'sub-org-b', 'active',
   'e4e4e4e4-4444-4444-8444-e4e4e4e4e4e4')
ON CONFLICT (id) DO NOTHING;

INSERT INTO organization_members (organization_id, user_id, role, status, is_owner) VALUES
  ('f1f1f1f1-1111-4111-8111-f1f1f1f1f1f1', 'e1e1e1e1-1111-4111-8111-e1e1e1e1e1e1', 'admin',  'active', true),
  ('f1f1f1f1-1111-4111-8111-f1f1f1f1f1f1', 'e2e2e2e2-2222-4222-8222-e2e2e2e2e2e2', 'member', 'active', false),
  ('f2f2f2f2-2222-4222-8222-f2f2f2f2f2f2', 'e4e4e4e4-4444-4444-8444-e4e4e4e4e4e4', 'admin',  'active', true)
ON CONFLICT DO NOTHING;

-- One visible plan + one attached subscription per org.
INSERT INTO subscription_plans (name, features, is_active) VALUES
  ('PGTAP Sub Plan', '["members"]'::jsonb, true);

-- Replace the trigger-created default row so each fixture org has EXACTLY
-- one subscription (the function under test must not be rescued by a
-- leftover Free plan).
DELETE FROM organization_subscriptions
WHERE organization_id IN (
  'f1f1f1f1-1111-4111-8111-f1f1f1f1f1f1',
  'f2f2f2f2-2222-4222-8222-f2f2f2f2f2f2'
);

INSERT INTO organization_subscriptions
  (organization_id, plan_id, status, current_period_start, current_period_end)
SELECT o.id, p.id, 'active', now(), now() + interval '30 days'
FROM organizations o
CROSS JOIN LATERAL (
  SELECT id FROM subscription_plans WHERE name = 'PGTAP Sub Plan'
) p
WHERE o.slug IN ('sub-org-a', 'sub-org-b');

-- ----------------------------------------------------------------------------
-- MEMBER of Org A: allowed
-- ----------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub',
  'e2e2e2e2-2222-4222-8222-e2e2e2e2e2e2', false);
SET ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM get_my_subscription('f1f1f1f1-1111-4111-8111-f1f1f1f1f1f1')),
  1::bigint,
  'member of the org sees its subscription'
);

SELECT is(
  (SELECT count(*) FROM get_my_subscription('f2f2f2f2-2222-4222-8222-f2f2f2f2f2f2')),
  0::bigint,
  'member of another org gets an EMPTY result — no cross-org leak'
);

RESET ROLE;

-- ----------------------------------------------------------------------------
-- SYSTEM ADMIN: allowed anywhere
-- ----------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub',
  'e3e3e3e3-3333-4333-8333-e3e3e3e3e3e3', false);
SET ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM get_my_subscription('f1f1f1f1-1111-4111-8111-f1f1f1f1f1f1')),
  1::bigint,
  'system_admin can read any org subscription'
);

RESET ROLE;

-- ----------------------------------------------------------------------------
-- ANONYMOUS: empty
-- (clear the claims GUC first — auth.uid() decodes it regardless of role,
--  and a stale admin sub would masquerade through the guard)
-- ----------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', '', false);
SET ROLE anon;

SELECT is(
  (SELECT count(*) FROM get_my_subscription('f1f1f1f1-1111-4111-8111-f1f1f1f1f1f1')),
  0::bigint,
  'anonymous callers get an EMPTY result'
);

RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '', false);
SELECT * FROM finish();
ROLLBACK;
