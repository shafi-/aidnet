-- ====================================================================
-- Lock the exposed views behind the function-only API surface
-- ====================================================================
-- The blanket DML grants (squash restore section, re-issued by
-- 20261007141523) grant ON ALL TABLES IN SCHEMA donate — which includes
-- the five views. Views execute with their OWNER's privileges (no
-- security_invoker), so a SELECT grant turns each view into an RLS
-- bypass: anon could read every profile (email, full_name, metadata)
-- through profile_view, plus org rosters and roles through member_view /
-- organization_view / organization_detail_view / role_view — and
-- profile_view is auto-updatable, so anon writes land in shared.profiles.
--
-- The client never reads views directly; they exist only as function
-- return types. SECURITY DEFINER callers (get_user_profile,
-- get_organization_members, add_organization_member, update_member_role,
-- create_organization, update_my_profile) run as the owner and are
-- unaffected by revoking the API roles.
--
-- update_organization returns through organization_view while running as
-- SECURITY INVOKER, so its caller would need SELECT on the view. Flip it
-- to SECURITY DEFINER: its can_perform('org:update') check already is
-- the authorization boundary, and it is the identical predicate to the
-- RLS UPDATE policy on organizations, so the effective gate is
-- unchanged.
--
-- Note: ALTER DEFAULT PRIVILEGES ... ON TABLES (20261007141523) also
-- covers views created later, so a NEW view would re-leak until revoked.
-- 08_anon_surface_sweep now asserts these five stay unreadable, so a
-- regression fails the suite — same tripwire model as tables.

REVOKE ALL ON donate.profile_view             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON donate.member_view              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON donate.organization_view        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON donate.organization_detail_view FROM PUBLIC, anon, authenticated;
REVOKE ALL ON donate.role_view                FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION donate.update_organization(
  target_org_id UUID,
  new_name TEXT DEFAULT NULL,
  new_slug TEXT DEFAULT NULL,
  new_description TEXT DEFAULT NULL,
  new_settings JSONB DEFAULT NULL
)
RETURNS SETOF donate.organization_view
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = donate, shared, extensions, private
AS $function$
BEGIN
  IF NOT can_perform('org:update', target_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE organizations
  SET
    name = COALESCE(new_name, name),
    slug = COALESCE(new_slug, slug),
    description = COALESCE(new_description, description),
    settings = COALESCE(new_settings, settings),
    updated_at = NOW()
  WHERE id = target_org_id;

  RETURN QUERY SELECT * FROM organization_view WHERE id = target_org_id;
END;
$function$;

REVOKE ALL ON FUNCTION donate.update_organization(UUID, TEXT, TEXT, TEXT, JSONB)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION donate.update_organization(UUID, TEXT, TEXT, TEXT, JSONB)
  TO authenticated;
