-- ====================================================================
-- FIX: product-table DML grants targeted the retired `public` schema
-- ====================================================================
-- The restore-table-grants section in the squash (originally
-- 20260823201030) granted `ON ALL TABLES IN SCHEMA public`, but the
-- product tables live in `donate` — public is retired. The initial
-- schema's `ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA donate`
-- never fires in practice: migrations are applied by the
-- `supabase_admin` role (local `db reset` and hosted `db push` alike),
-- and default privileges match by creating role.
--
-- Net effect on every fresh deploy: SECURITY INVOKER functions — this
-- project's standard (can_perform, get_membership, get_pending_campaigns,
-- ...) — fail with `permission denied for table ...` on their first
-- base-table read. Reported as:
--   * org admin: get_membership → permission denied for table
--     organization_members
--   * system admin: get_pending_campaigns unreachable (permission denied
--     for table campaigns)
--
-- Security model unchanged (supabase/README.md): RLS stays ENABLE +
-- deny-all + permissive policies on every donate table — these grants
-- only restore the access PATH that RLS gates, mirroring the existing
-- direct `GRANT SELECT ON shared.profiles TO authenticated`.
--
-- The DO block force-enables RLS on any donate table missing it so the
-- broad grant can never outlive a missing-RLS mistake.

GRANT USAGE ON SCHEMA donate TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA donate
  TO anon, authenticated, service_role;

-- Future tables created by whichever role runs migrations (supabase_admin
-- locally and on hosted pushes; postgres in raw psql flows) receive the
-- same access PATH automatically. The FOR ROLE postgres entry is kept from
-- the initial schema's intent; the unqualified entry covers the role that
-- actually applies migrations.
ALTER DEFAULT PRIVILEGES IN SCHEMA donate
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA donate
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated, service_role;

-- Deny-all baseline requires RLS to actually be ON; enforce it.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'donate'
      AND c.relkind = 'r'
      AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE donate.%I ENABLE ROW LEVEL SECURITY', r.relname);
    RAISE NOTICE 'Enabled RLS on donate.%', r.relname;
  END LOOP;
END $$;
