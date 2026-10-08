-- ============================================================================
-- pgTAP: public.can_perform(permission, org_id) — the unified ACTION gate.
--
-- Contract under test:
--   1. system_admin transcends org membership, org existence and tiers
--   2. unknown org  -> false; suspended org allows ONLY org:read/org:update
--   3. active membership required: owner shortcut OR role_permissions row
--   4. feature gate is data-driven: enforced iff ANY active plan declares
--      the permission's namespace (feature key = text before first ':')
--
-- Self-contained: BEGIN ... ROLLBACK. Fixture plans are created here so the
-- gating assertions do not depend on seed data.
-- ============================================================================

BEGIN;
SELECT plan(18);

-- ----------------------------------------------------------------------------
-- FIXTURES (superuser context)
-- ----------------------------------------------------------------------------
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at) VALUES
  ('a1a1a1a1-1111-4111-8111-a1a1a1a1a1a1', 'pgtap-owner@test.local',   '', now()),
  ('a2a2a2a2-2222-4222-8222-a2a2a2a2a2a2', 'pgtap-member@test.local',  '', now()),
  ('a3a3a3a3-3333-4333-8333-a3a3a3a3a3a3', 'pgtap-sysadmin@test.local','', now()),
  ('a4a4a4a4-4444-4444-8444-a4a4a4a4a4a4', 'pgtap-outsider@test.local','' , now())
ON CONFLICT (id) DO NOTHING;

UPDATE profiles SET is_system_admin = true
WHERE id = 'a3a3a3a3-3333-4333-8333-a3a3a3a3a3a3';

-- Primary org: owned by OWNER, MEMBER holds the seeded 'member' role.
INSERT INTO organizations (id, name, slug, status, created_by) VALUES
  ('b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1', 'PGTAP Org', 'pgtap-org', 'active',
   'a1a1a1a1-1111-4111-8111-a1a1a1a1a1a1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO organization_members (organization_id, user_id, role, status, is_owner) VALUES
  ('b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1', 'a1a1a1a1-1111-4111-8111-a1a1a1a1a1a1', 'admin',  'active', true),
  ('b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1', 'a2a2a2a2-2222-4222-8222-a2a2a2a2a2a2', 'member', 'active', false)
ON CONFLICT DO NOTHING;

-- Second org used to prove feature-gating flips with the attached plan.
INSERT INTO organizations (id, name, slug, status, created_by) VALUES
  ('b2b2b2b2-2222-4222-8222-b2b2b2b2b2b2', 'PGTAP Full Org', 'pgtap-full-org', 'active',
   'a4a4a4a4-4444-4444-8444-a4a4a4a4a4a4')
ON CONFLICT (id) DO NOTHING;

INSERT INTO organization_members (organization_id, user_id, role, status, is_owner) VALUES
  ('b2b2b2b2-2222-4222-8222-b2b2b2b2b2b2', 'a4a4a4a4-4444-4444-8444-a4a4a4a4a4a4', 'admin', 'active', true)
ON CONFLICT DO NOTHING;

-- Plans: narrow vs full capability sets (both active).
INSERT INTO subscription_plans (name, features, is_active) VALUES
  ('PGTAP Narrow Plan', '["invites"]'::jsonb, true),
  ('PGTAP Full Plan',   '["invites","campaigns"]'::jsonb, true);

-- The org-create trigger already attached the Free plan to each fixture org.
-- REPLACE it (single active subscription per fixture) so feature checks see
-- exactly the plan this suite intends — never a leftover default row.
DELETE FROM organization_subscriptions
WHERE organization_id IN (
  'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1',
  'b2b2b2b2-2222-4222-8222-b2b2b2b2b2b2'
);

INSERT INTO organization_subscriptions
  (organization_id, plan_id, status, current_period_start, current_period_end)
SELECT o.id,
       CASE o.slug WHEN 'pgtap-org' THEN narrow.id ELSE fullp.id END,
       'active', now(), now() + interval '30 days'
FROM organizations o
CROSS JOIN LATERAL (SELECT id FROM subscription_plans WHERE name = 'PGTAP Narrow Plan') narrow
CROSS JOIN LATERAL (SELECT id FROM subscription_plans WHERE name = 'PGTAP Full Plan') fullp
WHERE o.slug IN ('pgtap-org', 'pgtap-full-org');

-- ----------------------------------------------------------------------------
-- 1) SYSTEM ADMIN transcends everything
-- ----------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub',
  'a3a3a3a3-3333-4333-8333-a3a3a3a3a3a3', false);
SET ROLE authenticated;

SELECT is(
  can_perform('invites:create', 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'),
  true,
  'system_admin passes on a normal org'
);

SELECT is(
  can_perform('invites:create', '00000000-0000-4000-8000-000000000000'),
  true,
  'system_admin passes even for a nonexistent org'
);

RESET ROLE;

-- ----------------------------------------------------------------------------
-- 2) OWNER on PGTAP Org (Narrow plan: invites only)
-- ----------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub',
  'a1a1a1a1-1111-4111-8111-a1a1a1a1a1a1', false);
SET ROLE authenticated;

SELECT is(
  can_perform('invites:create', 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'),
  true,
  'owner invites:create allowed — plan declares invites and org has it'
);

SELECT is(
  can_perform('campaigns:create', 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'),
  false,
  'owner campaigns:create denied — campaigns are plan-managed and Narrow lacks them'
);

SELECT is(
  can_perform('campaigns:read', 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'),
  false,
  'owner campaigns:read denied — feature gate applies even to owners'
);

SELECT is(
  can_perform('org:update', 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'),
  true,
  'owner org:update allowed — "org" namespace is not plan-managed anywhere'
);

SELECT is(
  can_perform('weird:thing', 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'),
  true,
  'unmanaged namespace passes on role check alone (owner shortcut)'
);

SELECT is(
  can_perform('invites:create', '00000000-0000-4000-8000-000000000000'),
  false,
  'unknown org denies a non-admin even when permission is otherwise fine'
);

-- Suspension contract: ONLY org info/metadata remains manageable.
UPDATE organizations SET status = 'suspended'
WHERE id = 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1';

SELECT is(
  can_perform('org:read', 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'),
  true,
  'suspended: owner keeps org:read'
);

SELECT is(
  can_perform('org:update', 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'),
  true,
  'suspended: owner keeps org:update (metadata management)'
);

SELECT is(
  can_perform('invites:create', 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'),
  false,
  'suspended: owner denied invites:create despite plan + role'
);

SELECT is(
  can_perform('campaigns:read', 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'),
  false,
  'suspended: plain reads beyond org info are actions too — denied'
);

UPDATE organizations SET status = 'active'
WHERE id = 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1';

RESET ROLE;

-- sysadmin still transcends suspension
SELECT set_config('request.jwt.claim.sub',
  'a3a3a3a3-3333-4333-8333-a3a3a3a3a3a3', false);
SET ROLE authenticated;

SELECT is(
  can_perform('invites:create', 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'),
  true,
  'system_admin transcends suspension'
);

RESET ROLE;

-- ----------------------------------------------------------------------------
-- 3) MEMBER with seeded 'member' role (has invites:read etc.)
-- ----------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub',
  'a2a2a2a2-2222-4222-8222-a2a2a2a2a2a2', false);
SET ROLE authenticated;

SELECT is(
  can_perform('invites:read', 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'),
  true,
  'member invites:read via role_permissions + plan feature'
);

SELECT is(
  can_perform('members:delete', 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'),
  false,
  'member members:delete denied — role lacks the permission'
);

RESET ROLE;

-- ----------------------------------------------------------------------------
-- 4) OWNER of second org proves gating flips with the plan (Full plan)
-- ----------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub',
  'a4a4a4a4-4444-4444-8444-a4a4a4a4a4a4', false);
SET ROLE authenticated;

SELECT is(
  can_perform('campaigns:create', 'b2b2b2b2-2222-4222-8222-b2b2b2b2b2b2'),
  true,
  'same owner action allowed once the org plan declares campaigns'
);

SELECT is(
  can_perform('invites:create', 'b2b2b2b2-2222-4222-8222-b2b2b2b2b2b2'),
  true,
  'invites:create allowed under Full plan'
);

RESET ROLE;

-- ----------------------------------------------------------------------------
-- 5) OUTSIDER has no path in
-- ----------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub',
  'a4a4a4a4-4444-4444-8444-a4a4a4a4a4a4', false);
SET ROLE authenticated;

SELECT is(
  can_perform('invites:read', 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'),
  false,
  'outsider denied — not a member, regardless of permission shape'
);

RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '', false);
SELECT * FROM finish();
ROLLBACK;
