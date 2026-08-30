-- ====================================================================
-- handle_new_user(): profiles row only
-- ====================================================================
-- Previously, this trigger also auto-created a personal organization
-- and membership for every new signup. That caused:
--   1. Users to have 2 orgs after accepting an invite (personal + invited)
--   2. Auto-select to never fire (only fires for exactly 1 org)
--   3. Non-deterministic e2e test behavior under suite timing
--
-- Organizations are now created exclusively via the request→approve flow
-- (approve_org_request) or the seed script. The trigger only ensures
-- a profiles row exists so FK constraints (organization_members.user_id)
-- are satisfied from the moment the user is created.
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
