-- ============================================================================
-- pgTAP: Anon get_public_campaign_by_slug test
--
-- Verifies that anonymous users can access live campaigns via slug
-- but cannot access non-live campaigns by slug.
-- ============================================================================
BEGIN;
SELECT plan(3);

-- Insert test data as superuser
INSERT INTO auth.users (id, email, encrypted_password, confirmed_at) VALUES
  ('9c1c1c1c-1111-4111-8111-c1c1c1c1c1c1', 'slug-test@anon.local', '', now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO organizations (id, name, slug, status, created_by) VALUES
  ('9d1d1d1d-1111-4111-8111-d1d1d1d1d1d1', 'Slug Test Org', 'slug-test-org', 'active',
   '9c1c1c1c-1111-4111-8111-c1c1c1c1c1c1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO organization_members (organization_id, user_id, role, status, is_owner) VALUES
  ('9d1d1d1d-1111-4111-8111-d1d1d1d1d1d1', '9c1c1c1c-1111-4111-8111-c1c1c1c1c1c1',
   'admin', 'active', true)
ON CONFLICT DO NOTHING;

INSERT INTO campaigns (org_id, title, slug, status) VALUES
  ('9d1d1d1d-1111-4111-8111-d1d1d1d1d1d1', 'Live Slug Test',  'live-slug-test',  'live'),
  ('9d1d1d1d-1111-4111-8111-d1d1d1d1d1d1', 'Draft Slug Test', 'draft-slug-test', 'draft')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- ANON should see live campaigns by slug, hide drafts
-- ============================================================================
SET ROLE anon;

SELECT is(
  (SELECT count(*) FROM get_public_campaign_by_slug('live-slug-test')),
  1::bigint,
  'anon: get_public_campaign_by_slug returns live campaign'
);

SELECT is(
  (SELECT count(*) FROM get_public_campaign_by_slug('draft-slug-test')),
  0::bigint,
  'anon: get_public_campaign_by_slug hides draft campaigns'
);

SELECT is(
  (SELECT count(*) FROM get_public_campaign_by_slug('nonexistent-slug')),
  0::bigint,
  'anon: get_public_campaign_by_slug returns empty for missing campaigns'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;