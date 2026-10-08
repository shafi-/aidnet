-- ====================================================================
-- pgTAP: Campaign RLS + publishing + public discovery
-- ====================================================================
-- Covers: anon cannot see non-live; anon discovers live via
-- get_public_campaigns(); org member CRUD own campaigns; org member
-- CANNOT publish (only is_system_admin can); cross-org denied;
-- zakat filter correctness; landing limit returns <= 12.
-- ====================================================================

BEGIN;
SELECT plan(13);

-- Start from a clean slate: seed.sql may have populated live campaigns.
DELETE FROM campaigns;
DELETE FROM campaign_tag_map;

-- ====================================================================
-- SETUP
-- ====================================================================

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'owner@test.com', '', now()),
  ('33333333-3333-3333-3333-333333333333', 'member@test.com', '', now()),
  ('55555555-5555-5555-5555-555555555555', 'outsider@test.com', '', now()),
  ('66666666-6666-6666-6666-666666666666', 'sysadmin@test.com', '', now()),
  ('77777777-7777-7777-7777-777777777777', 'other@test.com', '', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, is_system_admin) VALUES
  ('11111111-1111-1111-1111-111111111111', 'owner@test.com', false),
  ('33333333-3333-3333-3333-333333333333', 'member@test.com', false),
  ('55555555-5555-5555-5555-555555555555', 'outsider@test.com', false),
  ('66666666-6666-6666-6666-666666666666', 'sysadmin@test.com', true),
  ('77777777-7777-7777-7777-777777777777', 'other@test.com', false)
ON CONFLICT (id) DO UPDATE SET is_system_admin = EXCLUDED.is_system_admin, email = EXCLUDED.email;

INSERT INTO organizations (id, name, slug) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Campaign Org', 'campaign-org'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Other Org', 'other-org')
ON CONFLICT (id) DO NOTHING;

INSERT INTO organization_members (organization_id, user_id, role, status, is_owner) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'admin',  'active', true),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'member', 'active', false),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '77777777-7777-7777-7777-777777777777', 'admin',  'active', true)
ON CONFLICT (organization_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status, is_owner = EXCLUDED.is_owner;

-- Seed campaigns directly (superuser context)
INSERT INTO campaigns (id, org_id, title, slug, status, is_zakat_eligible, is_active) VALUES
  ('d1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Draft Camp', 'draft-1', 'draft', false, true),
  ('22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Pending Camp', 'pending-1', 'pending_review', false, true),
  ('33333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Live Camp', 'live-1', 'live', false, true),
  ('44444444-4444-4444-4444-444444444444', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Zakat Camp', 'live-zakat', 'live', true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO campaigns (org_id, title, slug, status, is_zakat_eligible, is_active)
SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Limit ' || g, 'live-limit-' || g, 'live', false, true
FROM generate_series(1, 12) g
ON CONFLICT (slug) DO NOTHING;

INSERT INTO campaigns (id, org_id, title, slug, status, is_active) VALUES
  ('b9999999-9999-9999-9999-999999999999', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Other Camp', 'other-1', 'live', true)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- TEST 1: Anon cannot see non-live campaigns (direct table query)
-- ====================================================================

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '', true);
SET ROLE anon;

SELECT is(
  (SELECT count(*) FROM campaigns WHERE org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' AND status <> 'live'),
  0::bigint,
  'Anon sees 0 non-live campaigns (RLS blocks all but live)'
);

-- ====================================================================
-- TEST 2: Anon discovers live campaigns via get_public_campaigns()
-- ====================================================================

SELECT is(
  (SELECT count(*) FROM get_public_campaigns(NULL::boolean)),
  15::bigint,
  'Anon sees 15 live campaigns via get_public_campaigns()'
);

-- ====================================================================
-- TEST 11: Zakat filter correctness
-- ====================================================================

SELECT is(
  (SELECT count(*) FROM get_public_campaigns(true)),
  1::bigint,
  'Zakat filter returns only the 1 zakat-eligible live campaign'
);

-- ====================================================================
-- TEST 12: Landing limit returns <= 12
-- ====================================================================

SELECT is(
  (SELECT count(*) FROM get_public_campaigns(NULL::boolean, NULL::uuid, 12)),
  12::bigint,
  'Landing limit returns exactly 12 campaigns'
);

-- ====================================================================
-- TEST 3-6: Org member CRUD on own campaigns
-- ====================================================================

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
SET ROLE authenticated;

SELECT lives_ok(
  $$SELECT create_campaign('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Temp Camp', 'temp-slug')$$,
  'Member can create a campaign (has campaigns:create)'
);

SELECT isnt_empty(
  $$SELECT * FROM get_campaigns('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') WHERE slug = 'temp-slug'$$,
  'Member can read the campaign they created'
);

SELECT lives_ok(
  $$SELECT update_campaign((SELECT id FROM get_campaigns('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') WHERE slug = 'temp-slug' LIMIT 1), p_title := 'Temp Updated')$$,
  'Member can update their own campaign'
);

SELECT lives_ok(
  $$SELECT delete_campaign((SELECT id FROM get_campaigns('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') WHERE slug = 'temp-slug' LIMIT 1))$$,
  'Member can delete their own campaign'
);

-- ====================================================================
-- TEST 7: Org member CANNOT publish (only is_system_admin can)
-- ====================================================================

SELECT throws_ok(
  $$SELECT verify_campaign('22222222-2222-2222-2222-222222222222')$$,
  'Not authorized: system admin required',
  'Member cannot verify/publish a campaign'
);

-- ====================================================================
-- TEST 8: Owner cannot self-publish via update_campaign status change
-- ====================================================================

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
SET ROLE authenticated;

SELECT throws_ok(
  $$SELECT update_campaign('22222222-2222-2222-2222-222222222222', p_status := 'live')$$,
  'Only a system admin may change campaign status',
  'Owner cannot self-publish a campaign'
);

-- ====================================================================
-- TEST 9: System admin CAN publish
-- ====================================================================

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '66666666-6666-6666-6666-666666666666', true);
SET ROLE authenticated;

SELECT lives_ok(
  $$SELECT verify_campaign('22222222-2222-2222-2222-222222222222')$$,
  'System admin can verify/publish a campaign'
);

SELECT is(
  (SELECT status FROM campaigns WHERE id = '22222222-2222-2222-2222-222222222222'),
  'live',
  'Verified campaign status is now live'
);

-- ====================================================================
-- TEST 10: Cross-org access denied
-- ====================================================================

RESET ROLE;
SELECT set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);
SET ROLE authenticated;

SELECT is(
  (SELECT count(*) FROM get_campaigns('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')),
  0::bigint,
  'Member of org A cannot read campaigns of org B'
);

RESET ROLE;

-- ====================================================================
ROLLBACK;
