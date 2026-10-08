-- ============================================================================
-- pgTAP: personal organizations + campaign-scoped payment methods.
--
-- Contract (migrations 20261008131048 / 20261008131049):
--   * ensure_my_personal_org() lazily provisions the caller's own org
--     (kind='personal', sole owner-admin membership, org_meta, Free plan
--     auto-attached) and is idempotent
--   * two individuals always get distinct personal orgs
--   * campaigns:create inside the personal org passes the feature gate
--     (Free carries 'campaigns') and turns off when the plan drops it
--   * campaign payment methods: owner reads/writes, other members and
--     outsiders are denied, anon is denied outright (REVOKE)
--   * public detail serves the campaign's own methods; the personal
--     campaign is publicly listed (the org has an active member)
--   * get_my_organizations exposes kind='personal'
-- ============================================================================

BEGIN;
SELECT plan(22);

INSERT INTO auth.users (id, email, encrypted_password, confirmed_at) VALUES
  ('b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1', 'pg-individual@test.local', '', now()),
  ('b2b2b2b2-2222-4222-8222-b2b2b2b2b2b2', 'pg-outsider@test.local',  '', now())
ON CONFLICT (id) DO NOTHING;

-- ----------------------------------------------------------------------------
-- ensure_my_personal_org: shape, idempotency, distinctness
-- ----------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1', false);

SELECT lives_ok('SELECT ensure_my_personal_org()',
  'ensure_my_personal_org provisions a personal org');

SELECT is(
  (SELECT count(*) FROM organizations WHERE kind = 'personal'
     AND created_by = 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'),
  1::bigint,
  'exactly one personal org per user'
);

SELECT is(
  (SELECT o.name FROM organizations o
   WHERE o.kind = 'personal' AND o.created_by = 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'),
  'pg-individual',
  'display name falls back to the email local part'
);

SELECT is(
  (SELECT om.role || ':' || om.is_owner::text
   FROM organization_members om
   JOIN organizations o ON o.id = om.organization_id
   WHERE o.kind = 'personal' AND o.created_by = 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'
     AND om.user_id = 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'),
  'admin:true',
  'individual is the sole owner-admin of the personal org'
);

SELECT is(
  (SELECT p.name
   FROM organization_subscriptions os
   JOIN subscription_plans p ON p.id = os.plan_id
   JOIN organizations o ON o.id = os.organization_id
   WHERE o.kind = 'personal' AND o.created_by = 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'),
  'Free',
  'Free plan auto-attached by the org-insert trigger'
);

SELECT is(
  (SELECT count(*) FROM org_meta m
   JOIN organizations o ON o.id = m.organization_id
   WHERE o.kind = 'personal' AND o.created_by = 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'),
  1::bigint,
  'org_meta row created for the public org page'
);

SELECT is(
  (SELECT ensure_my_personal_org()),
  (SELECT id FROM organizations
   WHERE kind = 'personal' AND created_by = 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'),
  'ensure is idempotent: second call returns the same org'
);

SELECT set_config('request.jwt.claim.sub', 'b2b2b2b2-2222-4222-8222-b2b2b2b2b2b2', false);
SELECT lives_ok('SELECT ensure_my_personal_org()',
  'second individual provisions her own personal org'
);
SELECT is(
  (SELECT count(*) FROM organizations
   WHERE kind = 'personal' AND created_by = 'b2b2b2b2-2222-4222-8222-b2b2b2b2b2b2'),
  1::bigint,
  'two individuals hold two distinct personal orgs'
);

-- ----------------------------------------------------------------------------
-- Campaigns + campaign-scoped payment methods inside the personal org
-- ----------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1', false);
SELECT is(
  (SELECT can_perform('campaigns:create',
    (SELECT id FROM organizations
     WHERE kind = 'personal' AND created_by = 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'))),
  true,
  'campaigns:create passes inside the personal org (Free plan carries campaigns)'
);

SELECT lives_ok(
  'SELECT create_campaign(
     (SELECT id FROM organizations WHERE kind = ''personal''
        AND created_by = ''b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1''),
     ''PG Personal Campaign'', ''pg-personal-campaign'')',
  'individual creates a campaign in her personal org'
);

SELECT lives_ok(
  'SELECT set_campaign_payment_methods(
     (SELECT id FROM campaigns WHERE slug = ''pg-personal-campaign''),
     p_bkash_number => ''017000000000'',
     p_bkash_account_name => ''Individual One'',
     p_instructions => ''Send to personal bkash'')',
  'owner saves the campaign payment methods'
);

SELECT is(
  (SELECT bkash_number FROM get_campaign_payment_methods(
     (SELECT id FROM campaigns WHERE slug = 'pg-personal-campaign'))),
  '017000000000',
  'owner reads back the campaign payment methods'
);

-- Outsider (authenticated, runs her own personal org but no membership here)
SELECT set_config('request.jwt.claim.sub', 'b2b2b2b2-2222-4222-8222-b2b2b2b2b2b2', false);
SELECT throws_ok(
  'SELECT get_campaign_payment_methods(
     (SELECT id FROM campaigns WHERE slug = ''pg-personal-campaign''))',
  'P0001',
  'Not authorized',
  'outsider cannot read another individual payment methods'
);
SELECT throws_ok(
  'SELECT set_campaign_payment_methods(
     (SELECT id FROM campaigns WHERE slug = ''pg-personal-campaign''),
     p_bkash_number => ''019999999999'')',
  'P0001',
  'Not authorized',
  'outsider cannot write another individual payment methods'
);

-- Anon: the PII-style table is revoked outright
SET ROLE anon;
SELECT throws_ok(
  'SELECT get_campaign_payment_methods(
     (SELECT id FROM campaigns WHERE slug = ''pg-personal-campaign''))',
  '42501',
  NULL,
  'anon is denied campaign_payment_methods outright (no grants)'
);
RESET ROLE;

-- ----------------------------------------------------------------------------
-- Public surface: live personal campaign lists and serves its own methods
-- ----------------------------------------------------------------------------
UPDATE campaigns SET status = 'live' WHERE slug = 'pg-personal-campaign';

SET ROLE anon;
SELECT is(
  (SELECT count(*) FROM get_public_campaign_by_slug('pg-personal-campaign')),
  1::bigint,
  'anon sees the live personal campaign by slug'
);
SELECT is(
  (SELECT donation_methods->0->>'bkash_number'
   FROM get_public_campaign_by_slug('pg-personal-campaign')),
  '017000000000',
  'public detail serves the campaign own payment methods'
);
SELECT is(
  (SELECT count(*) FROM get_public_campaigns(NULL::boolean, NULL::uuid, NULL)
   WHERE slug = 'pg-personal-campaign'),
  1::bigint,
  'public listing includes personal-org campaigns (org has an active member)'
);
RESET ROLE;

-- ----------------------------------------------------------------------------
-- get_my_organizations exposes kind; gating follows the plan; donations
-- ----------------------------------------------------------------------------
SELECT set_config('request.jwt.claim.sub', 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1', false);
SELECT is(
  (SELECT kind FROM get_my_organizations()
   WHERE id = (SELECT id FROM organizations
               WHERE kind = 'personal'
                 AND created_by = 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1')),
  'personal',
  'get_my_organizations carries kind=personal'
);

SELECT is(
  (SELECT can_perform('donations:manage',
    (SELECT id FROM organizations
     WHERE kind = 'personal' AND created_by = 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'))),
  true,
  'individual confirms donations on her own campaign (admin role holds donations:manage)'
);

-- Drop 'campaigns' from the personal org plan: the feature gate must close.
INSERT INTO subscription_plans (id, name, price_monthly, features, is_active)
VALUES ('b5b5b5b5-5555-4555-8555-b5b5b5b5b5b5', 'Bare Personal Plan', 0,
        '["members"]'::jsonb, true)
ON CONFLICT (id) DO NOTHING;
UPDATE organization_subscriptions
SET plan_id = 'b5b5b5b5-5555-4555-8555-b5b5b5b5b5b5'
WHERE organization_id = (SELECT id FROM organizations
                         WHERE kind = 'personal'
                           AND created_by = 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1');
SELECT is(
  (SELECT can_perform('campaigns:create',
    (SELECT id FROM organizations
     WHERE kind = 'personal' AND created_by = 'b1b1b1b1-1111-4111-8111-b1b1b1b1b1b1'))),
  false,
  'campaigns:create is plan-gated inside the personal org'
);

SELECT * FROM finish();
ROLLBACK;
