-- ============================================================================
-- pgTAP: Anonymous + bare-authenticated REST surface sweep.
--
-- The blanket DML grants (20260823201030) let PostgREST ADDRESS every table;
-- safety therefore rests entirely on RLS. This suite plants one row in every
-- sensitive table (as superuser), then proves that:
--   * anonymous callers see NOTHING anywhere, except the one deliberate
--     public surface: live campaigns
--   * an authenticated user with NO org membership sees the same zeros
--
-- Any new table or policy change that widens exposure breaks this suite.
-- ============================================================================

BEGIN;
SELECT plan(40);

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at) VALUES
  ('9a1a1a1a-1111-4111-8111-a1a1a1a1a1a1', 'sweep-owner@test.local',    '', now()),
  ('9a2a2a2a-2222-4222-8222-a2a2a2a2a2a2', 'sweep-outsider@test.local','' , now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO organizations (id, name, slug, status, created_by) VALUES
  ('9b1b1b1b-1111-4111-8111-b1b1b1b1b1b1', 'Sweep Org', 'sweep-org', 'active',
   '9a1a1a1a-1111-4111-8111-a1a1a1a1a1a1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO organization_members (organization_id, user_id, role, status, is_owner) VALUES
  ('9b1b1b1b-1111-4111-8111-b1b1b1b1b1b1', '9a1a1a1a-1111-4111-8111-a1a1a1a1a1a1',
   'admin', 'active', true)
ON CONFLICT DO NOTHING;

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES ('9b9b9b9b-9999-4999-8999-b9b9b9b9b9b9', 'orphan-profile@test.local', '', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email) VALUES
  ('9b9b9b9b-9999-4999-8999-b9b9b9b9b9b9', 'orphan-profile@test.local')
ON CONFLICT (id) DO NOTHING;

INSERT INTO org_requests (id, user_id, org_name, org_slug)
VALUES ('9c1c1c1c-1111-4111-8111-c1c1c1c1c1c1',
        '9a1a1a1a-1111-4111-8111-a1a1a1a1a1a1', 'Sweep Requested', 'sweep-requested');

INSERT INTO audit_logs (action, resource_type)
VALUES ('sweep-probe', 'sweep');

INSERT INTO campaign_tags (slug, label)
VALUES ('sweep-tag', 'Sweep Tag');

INSERT INTO campaigns (org_id, title, slug, status) VALUES
  ('9b1b1b1b-1111-4111-8111-b1b1b1b1b1b1', 'Draft Sweep', 'sweep-draft', 'draft'),
  ('9b1b1b1b-1111-4111-8111-b1b1b1b1b1b1', 'Live Sweep',  'sweep-live',  'live');

INSERT INTO campaign_tag_map (campaign_id, tag_id)
SELECT c.id, t.id FROM campaigns c, campaign_tags t
WHERE c.slug = 'sweep-live' AND t.slug = 'sweep-tag';

INSERT INTO donation_methods (organization_id) VALUES
  ('9b1b1b1b-1111-4111-8111-b1b1b1b1b1b1');

INSERT INTO invites (organization_id, email, token, invited_by)
VALUES ('9b1b1b1b-1111-4111-8111-b1b1b1b1b1b1', 'sweep-invitee@test.local',
        'sweep-token', '9a1a1a1a-1111-4111-8111-a1a1a1a1a1a1');

INSERT INTO org_meta (organization_id, name)
VALUES ('9b1b1b1b-1111-4111-8111-b1b1b1b1b1b1', 'Sweep Meta');

INSERT INTO subscription_plans (name, features) VALUES ('Sweep Plan', '[]'::jsonb);

INSERT INTO organization_subscriptions
  (organization_id, plan_id, status, current_period_start, current_period_end)
SELECT o.id, p.id, 'active', now(), now() + interval '30 days'
FROM organizations o
CROSS JOIN LATERAL (
  SELECT id FROM subscription_plans WHERE name = 'Sweep Plan'
) p
WHERE o.slug = 'sweep-org';

INSERT INTO subscription_history (organization_id, plan_id, action)
SELECT o.id, p.id, 'sweep'
FROM organizations o
CROSS JOIN LATERAL (
  SELECT id FROM subscription_plans WHERE name = 'Sweep Plan'
) p
WHERE o.slug = 'sweep-org';

INSERT INTO roles (name) VALUES ('sweep_role');
INSERT INTO role_permissions (role, permission) VALUES ('sweep_role', 'invites:create');

-- ============================================================================
-- ANONYMOUS surface — everything hidden except live campaigns
-- ============================================================================
SET ROLE anon;

SELECT is((SELECT count(*) FROM audit_logs),          0::bigint, 'anon: audit_logs hidden');
SELECT is((SELECT count(*) FROM campaign_tags),       0::bigint, 'anon: campaign_tags hidden');
SELECT is((SELECT count(*) FROM campaign_tag_map),    0::bigint, 'anon: campaign_tag_map hidden');
SELECT is((SELECT count(*) FROM donation_methods),    0::bigint, 'anon: donation_methods hidden');
SELECT is((SELECT count(*) FROM invites),             0::bigint, 'anon: invites hidden');
SELECT is((SELECT count(*) FROM org_meta),            0::bigint, 'anon: org_meta hidden');
SELECT is((SELECT count(*) FROM org_requests),        0::bigint, 'anon: org_requests hidden');
SELECT is((SELECT count(*) FROM organization_members),0::bigint, 'anon: organization_members hidden');
SELECT is((SELECT count(*) FROM organization_subscriptions), 0::bigint,
  'anon: organization_subscriptions hidden');
SELECT is((SELECT count(*) FROM organizations WHERE slug = 'sweep-org'), 0::bigint,
  'anon: member-gated organizations hidden');
SELECT throws_ok('SELECT count(*) FROM profiles', '42P01', NULL,
  'anon: profiles schema-invisible (no USAGE on shared)');
SELECT is((SELECT count(*) FROM roles),               0::bigint, 'anon: roles hidden');
SELECT is((SELECT count(*) FROM role_permissions),    0::bigint, 'anon: role_permissions hidden');
SELECT is((SELECT count(*) FROM subscription_history),0::bigint, 'anon: subscription_history hidden');
SELECT is((SELECT count(*) FROM subscription_plans WHERE name = 'Sweep Plan'), 0::bigint,
  'anon: subscription_plans hidden');

-- Views run with OWNER privileges (no security_invoker), so any SELECT
-- grant on them bypasses base-table RLS entirely. Direct access is
-- revoked (20261008180847); these stay locked or the suite fails.
SELECT throws_ok('SELECT count(*) FROM profile_view', '42501', NULL,
  'anon: profile_view revoked (owner-rights view)');
SELECT throws_ok('SELECT count(*) FROM member_view', '42501', NULL,
  'anon: member_view revoked (owner-rights view)');
SELECT throws_ok('SELECT count(*) FROM organization_view', '42501', NULL,
  'anon: organization_view revoked (owner-rights view)');
SELECT throws_ok('SELECT count(*) FROM organization_detail_view', '42501', NULL,
  'anon: organization_detail_view revoked (owner-rights view)');
SELECT throws_ok('SELECT count(*) FROM role_view', '42501', NULL,
  'anon: role_view revoked (owner-rights view)');

-- The ONE deliberate public surface: live campaigns only.
SELECT is(
  (SELECT count(*) FROM campaigns WHERE slug IN ('sweep-draft','sweep-live')),
  1::bigint,
  'anon: sees exactly the LIVE campaign'
);

SELECT is(
  (SELECT count(*) FROM campaigns WHERE slug = 'sweep-draft'),
  0::bigint,
  'anon: draft campaigns stay hidden'
);

RESET ROLE;

-- ============================================================================
-- BARE AUTHENTICATED outsider (has only his auto-created personal org) —
-- foreign data hidden; deliberate surfaces (role catalog, campaign_tags,
-- own audit trail, own org's subscription) remain visible.
-- ============================================================================
SELECT set_config('request.jwt.claim.sub',
  '9a2a2a2a-2222-4222-8222-a2a2a2a2a2a2', false);
SET ROLE authenticated;

SELECT is((SELECT count(*) FROM audit_logs
             WHERE user_id <> auth.uid()
               AND organization_id NOT IN (
                 SELECT organization_id FROM organization_members
                 WHERE user_id = auth.uid() AND status = 'active')),
          0::bigint, 'auth-outsider: audit trail limited to own rows/orgs');
SELECT cmp_ok((SELECT count(*) FROM campaign_tags)::int, '>=', 1,
  'auth-outsider: campaign_tags catalog readable by design');
SELECT is((SELECT count(*) FROM campaign_tag_map),    0::bigint, 'auth-outsider: campaign_tag_map hidden');
SELECT is((SELECT count(*) FROM donation_methods),    0::bigint, 'auth-outsider: donation_methods hidden');
SELECT is((SELECT count(*) FROM invites),             0::bigint, 'auth-outsider: invites hidden');
SELECT is((SELECT count(*) FROM org_meta),            0::bigint, 'auth-outsider: org_meta hidden');
SELECT is((SELECT count(*) FROM org_requests),        0::bigint, 'auth-outsider: org_requests hidden');
SELECT is((SELECT count(*) FROM organization_members
             WHERE organization_id NOT IN (
               SELECT organization_id FROM organization_members
               WHERE user_id = auth.uid() AND status = 'active')),
          0::bigint, 'auth-outsider: no FOREIGN membership rows visible');
SELECT is((SELECT count(*) FROM organization_subscriptions os
             WHERE os.organization_id NOT IN (
               SELECT om.organization_id FROM organization_members om
               WHERE om.user_id = auth.uid() AND om.status = 'active' AND om.is_owner)),
          0::bigint, 'auth-outsider: subscriptions of non-owned orgs hidden');
SELECT is((SELECT count(*) FROM organizations WHERE slug = 'sweep-org'), 0::bigint,
  'auth-outsider: foreign organizations hidden');
SELECT is((SELECT count(*) FROM profiles WHERE id <> auth.uid()), 0::bigint,
  'auth-outsider: other users profiles hidden');
SELECT is((SELECT count(*) FROM subscription_history),0::bigint, 'auth-outsider: subscription_history hidden');
SELECT is((SELECT count(*) FROM campaigns WHERE slug = 'sweep-draft'),
  0::bigint, 'auth-outsider: drafts hidden even when live ones exist');

-- Same view lockout as the anon section: authenticated roles have no
-- direct view access either (function-only API surface).
SELECT throws_ok('SELECT count(*) FROM profile_view', '42501', NULL,
  'auth-outsider: profile_view revoked (owner-rights view)');
SELECT throws_ok('SELECT count(*) FROM member_view', '42501', NULL,
  'auth-outsider: member_view revoked (owner-rights view)');
SELECT throws_ok('SELECT count(*) FROM organization_view', '42501', NULL,
  'auth-outsider: organization_view revoked (owner-rights view)');
SELECT throws_ok('SELECT count(*) FROM organization_detail_view', '42501', NULL,
  'auth-outsider: organization_detail_view revoked (owner-rights view)');
SELECT throws_ok('SELECT count(*) FROM role_view', '42501', NULL,
  'auth-outsider: role_view revoked (owner-rights view)');

SELECT set_config('request.jwt.claim.sub', '', false);
SELECT * FROM finish();
ROLLBACK;
