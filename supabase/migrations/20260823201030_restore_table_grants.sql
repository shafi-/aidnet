-- Restore standard Supabase table privileges for anon/authenticated.
--
-- initial_schema grants SELECT only on views (profile_view, organization_view,
-- ...) and EXECUTE on functions, but several committed SECURITY INVOKER
-- functions (get_membership, can_perform) read base tables directly. Without
-- table DML grants those functions fail with "permission denied" on every
-- fresh `supabase db reset`.
--
-- Security model is unchanged: RLS stays enable + deny-all + permissive
-- policies; these grants only restore the access PATH that RLS gates.
-- See supabase/README.md (functions are THE authorization boundary).

GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA private TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA private GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
