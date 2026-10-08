-- ============================================================================
-- pgTAP: READ/WRITE SPLIT — the seven read policies converted off can_perform.
--
-- Proves the RLS layer directly (table SELECTs, not RPCs):
--   * members read their org's rows via the private.rls_* helpers
--   * outsiders and anonymous callers read nothing
--   * system admins read everything
--   * organization_members exposes only the caller's own rows
--   * organizations visible to members / creator / sysadmin, nobody else
--
-- Self-contained: BEGIN ... ROLLBACK. No seed dependence: all rows created
-- here as superuser before role switching.
-- ============================================================================

BEGIN;
SELECT plan(15);

INSERT INTO auth.users (id, email, encrypted_password, confirmed_at) VALUES
  ('c1c1c1c1-1111-4111-8111-c1c1c1c1c1c1', 'rls-owner@test.local',    '', now()),
  ('c2c2c2c2-2222-4222-8222-c2c2c2c2c2c2', 'rls-member@test.local',  '', now()),
  ('c3c3c3c3-3333-4333-8333-c3c3c3c3c3c3', 'rls-sysadmin@test.local','', now()),
  ('c4c4c4c4-4444-4444-8444-c4c4c4c4c4c4', 'rls-outsider@test.local','' , now())
ON CONFLICT (id) DO NOTHING;

UPDATE profiles SET is_system_admin = true
WHERE id = 'c3c3c3c3-3333-4333-8333-c3c3c3c3c3c3';

INSERT INTO organizations (id, name, slug, status, created_by) VALUES
  ('d1d1d1d1-1111-4111-8111-d1d1d1d1d1d1', 'RLS Org', 'rls-org', 'active',
   'c1c1c1c1-1111-4111-8111-c1c1c1c1c1c1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO organization_members (organization_id, user_id, role, status, is_owner) VALUES
  ('d1d1d1d1-1111-4111-8111-d1d1d1d1d1d1', 'c1c1c1c1-1111-4111-8111-c1c1c1c1c1c1', 'admin',  'active', true),
  ('d1d1d1d1-1111-4111-8111-d1d1d1d1d1d1', 'c2c2c2c2-2222-4222-8222-c2c2c2c2c2c2', 'member', 'active', false)
ON CONFLICT DO NOTHING;

INSERT INTO campaigns (org_id, title, slug, status)
VALUES ('d1d1d1d1-1111-4111-8111-d1d1d1d1d1d1', 'RLS probe campaign', 'rls-probe-campaign', 'live');

INSERT INTO donation_methods (organization_id) VALUES
  ('d1d1d1d1-1111-4111-8111-d1d1d1d1d1d1');

INSERT INTO invites (organization_id, email, token, invited_by)
VALUES ('d1d1d1d1-1111-4111-8111-d1d1d1d1d1d1', 'invitee@test.local', 'rls-probe-token',
        'c1c1c1c1-1111-4111-8111-c1c1c1c1c1c1');

-- ----------------------------------------------------------------------------
-- MEMBER sees own org's data through the helper-backed policies
-- ----------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub',
  'c2c2c2c2-2222-4222-8222-c2c2c2c2c2c2', false);
SET ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM campaigns WHERE slug = 'rls-probe-campaign'),
  1::bigint,
  'member reads org campaigns'
);

SELECT is(
  (SELECT count(*) FROM donation_methods
    WHERE organization_id = 'd1d1d1d1-1111-4111-8111-d1d1d1d1d1d1'),
  1::bigint,
  'member reads org donation methods'
);

SELECT is(
  (SELECT count(*) FROM invites WHERE token = 'rls-probe-token'),
  1::bigint,
  'member reads org invites (policy grants active members)'
);

SELECT is(
  (SELECT count(*) FROM organization_members om
    WHERE om.organization_id = 'd1d1d1d1-1111-4111-8111-d1d1d1d1d1d1'),
  2::bigint,
  'member sees the org ROSTER (same-org membership rows are visible by design)'
);

SELECT is(
  (SELECT count(*) FROM organization_members
    WHERE organization_id NOT IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active')),
  0::bigint,
  'member sees NO membership rows of orgs they do not belong to'
);

SELECT is(
  (SELECT count(*) FROM campaigns c
    WHERE c.org_id NOT IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid() AND status = 'active')),
  0::bigint,
  'member sees no campaigns outside own memberships'
);

RESET ROLE;

-- ----------------------------------------------------------------------------
-- OUTSIDER (authenticated, no membership of this org) is blind
-- ----------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub',
  'c4c4c4c4-4444-4444-8444-c4c4c4c4c4c4', false);
SET ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM invites
    WHERE organization_id = 'd1d1d1d1-1111-4111-8111-d1d1d1d1d1d1'),
  0::bigint,
  'outsider sees no invites'
);

SELECT is(
  (SELECT count(*) FROM organizations WHERE id = 'd1d1d1d1-1111-4111-8111-d1d1d1d1d1d1'),
  0::bigint,
  'outsider does not see the org row itself'
);

RESET ROLE;

-- ----------------------------------------------------------------------------
-- ANONYMOUS is blind everywhere in this surface
-- (claims GUC must be cleared first — auth.uid() decodes it regardless of
--  current_role, and a stale sub would expose the caller's own rows)
-- ----------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', '', false);
SET ROLE anon;

SELECT is(
  (SELECT count(*) FROM invites),
  0::bigint,
  'anon sees no invites at all'
);

SELECT is(
  (SELECT count(*) FROM organizations WHERE slug = 'rls-org'),
  0::bigint,
  'anon does not see member-gated orgs'
);

SELECT throws_ok(
  'SELECT count(*) FROM profiles',
  '42501',
  NULL,
  'anon is denied shared.profiles outright (deny-all, no grants)'
);

RESET ROLE;

-- ----------------------------------------------------------------------------
-- SYSTEM ADMIN sees everything
-- ----------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub',
  'c3c3c3c3-3333-4333-8333-c3c3c3c3c3c3', false);
SET ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM invites WHERE organization_id = 'd1d1d1d1-1111-4111-8111-d1d1d1d1d1d1'),
  1::bigint,
  'sysadmin reads org invites'
);

SELECT is(
  (SELECT count(*) FROM organizations WHERE id = 'd1d1d1d1-1111-4111-8111-d1d1d1d1d1d1'),
  1::bigint,
  'sysadmin reads any org row'
);

SELECT is(
  (SELECT count(*) FROM donation_methods
    WHERE organization_id = 'd1d1d1d1-1111-4111-8111-d1d1d1d1d1d1'),
  1::bigint,
  'sysadmin reads org donation methods'
);

RESET ROLE;

-- ----------------------------------------------------------------------------
-- CREATOR visibility on organizations (inline policy branch)
-- ----------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub',
  'c1c1c1c1-1111-4111-8111-c1c1c1c1c1c1', false);
SET ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM organizations WHERE id = 'd1d1d1d1-1111-4111-8111-d1d1d1d1d1d1'),
  1::bigint,
  'creator (and owner-member) sees the org row'
);

RESET ROLE;

SELECT set_config('request.jwt.claim.sub', '', false);
SELECT * FROM finish();
ROLLBACK;
