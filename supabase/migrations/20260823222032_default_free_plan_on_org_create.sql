-- Every organization must come alive with a baseline capability set.
-- Previously, orgs created via approve_org_request (and onboarding personal
-- orgs) had NO subscription => zero features => no tabs/settings at all.
-- Only the seeded demo org carried a plan.
--
-- Strategy: one AFTER INSERT trigger on organizations covers ALL creation
-- paths (approval flow, handle_new_user personal orgs, seeds) without
-- touching committed functions. The Free plan row is looked up by name at
-- trigger time; if seed order hasn't created it yet, we skip silently.

-- 1. Free tier includes 'settings': an org admin must be able to manage the
--    metadata collected in their own request regardless of payment state.
UPDATE subscription_plans
SET features = features || '["settings"]'::jsonb
WHERE name = 'Free'
  AND NOT features @> '["settings"]'::jsonb;

CREATE OR REPLACE FUNCTION public.attach_default_plan()
RETURNS TRIGGER AS $$
DECLARE
  v_free_plan_id UUID;
BEGIN
  SELECT id INTO v_free_plan_id
  FROM subscription_plans
  WHERE name = 'Free'
  LIMIT 1;

  IF v_free_plan_id IS NULL THEN
    RETURN NEW; -- plans not seeded yet; nothing to attach
  END IF;

  INSERT INTO organization_subscriptions
    (organization_id, plan_id, status, current_period_start, current_period_end)
  SELECT NEW.id, v_free_plan_id, 'active', NOW(), NOW() + interval '1 month'
  WHERE NOT EXISTS (
    SELECT 1 FROM organization_subscriptions
    WHERE organization_id = NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_attach_default_plan ON organizations;
CREATE TRIGGER trg_attach_default_plan
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION public.attach_default_plan();

-- 2. Backfill: organizations that predate this trigger and have no plan.
INSERT INTO organization_subscriptions
  (organization_id, plan_id, status, current_period_start, current_period_end)
SELECT o.id, p.id, 'active', NOW(), NOW() + interval '1 month'
FROM organizations o
CROSS JOIN LATERAL (
  SELECT id FROM subscription_plans WHERE name = 'Free' LIMIT 1
) p
WHERE p.id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM organization_subscriptions os
    WHERE os.organization_id = o.id
  );
