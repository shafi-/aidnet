-- update_org_meta had two defects:
-- 1. Permission checked 'update:org' — no such grant exists anywhere
--    (role_permissions and every other function use 'org:update'), so any
--    non-owner admin was always rejected.
-- 2. A missing org_meta row raised 'Organization metadata not found'.
--    Absence is a NORMAL state for pre-existing orgs (seed never created
--    meta rows) and for orgs whose metadata was never edited; saving from
--    the Settings tab must upsert, not explode.

CREATE OR REPLACE FUNCTION public.update_org_meta(
  p_org_id uuid,
  p_name text DEFAULT NULL::text,
  p_description text DEFAULT NULL::text,
  p_logo_url text DEFAULT NULL::text,
  p_website_url text DEFAULT NULL::text,
  p_contact_email text DEFAULT NULL::text,
  p_contact_phone text DEFAULT NULL::text,
  p_address text DEFAULT NULL::text,
  p_social_links jsonb DEFAULT NULL::jsonb,
  p_settings jsonb DEFAULT NULL::jsonb
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NOT can_perform('org:update', p_org_id) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE org_meta SET
    name = COALESCE(p_name, name),
    description = COALESCE(p_description, description),
    logo_url = COALESCE(p_logo_url, logo_url),
    website_url = COALESCE(p_website_url, website_url),
    contact_email = COALESCE(p_contact_email, contact_email),
    contact_phone = COALESCE(p_contact_phone, contact_phone),
    address = COALESCE(p_address, address),
    social_links = COALESCE(p_social_links, social_links),
    settings = COALESCE(p_settings, settings),
    updated_by = auth.uid(),
    updated_at = NOW()
  WHERE organization_id = p_org_id;

  IF NOT FOUND THEN
    -- Baseline row seeded from the organizations record so the editor has
    -- something coherent to upsert against.
    INSERT INTO org_meta (organization_id, name, description, updated_by)
    SELECT o.id, o.name, o.description, auth.uid()
    FROM organizations o WHERE o.id = p_org_id;
  END IF;

  RETURN true;
END;
$function$;
