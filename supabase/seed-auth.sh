#!/usr/bin/env bash
# ====================================================================
# supabase/seed-auth.sh
# --------------------------------------------------------------------
# Seeds login-able auth users + demo data for local dev / e2e.
# Must be run AFTER `supabase db reset` (which only applies seed.sql,
# and raw SQL auth.users inserts are invisible to GoTrue).
#
# Produces:
#   admin@donate.app      / Password123!  (system admin - NO org membership)
#   owner@donate.app      / Password123!  (org owner - owns demo org)
#   member@donate.app     / Password123!  (plain org member)
#   + 14 LIVE demo campaigns (1 zakat) + donation methods for the org
# ====================================================================
set -euo pipefail

PROJECT="donate-local"
API_URL="${SUPABASE_API_URL:-http://127.0.0.1:55321}"
PW="Password123!"
ADMIN_EMAIL="admin@donate.app"
OWNER_EMAIL="owner@donate.app"
MEMBER_EMAIL="member@donate.app"

# --- resolve service role key + db container -------------------------
SERVICE_ROLE_KEY="$(supabase status --output env 2>/dev/null | awk -F'"' '/SERVICE_ROLE_KEY/{print $2}' | tr -d '[:space:]')"
if [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "ERROR: could not read SERVICE_ROLE_KEY from 'supabase status'" >&2
  exit 1
fi

DB_CONTAINER="$(docker ps --filter "label=com.supabase.cli.project=${PROJECT}" --format '{{.Names}}' | grep -E 'db_' | head -1)"
if [ -z "$DB_CONTAINER" ]; then
  echo "ERROR: supabase db container for project '${PROJECT}' not running" >&2
  exit 1
fi

psql() { docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 "$@"; }

# --- create auth users via GoTrue (scrypt password) -------------------
create_user() {
  local email="$1"
  local resp
  resp="$(curl -s -X POST "${API_URL}/auth/v1/admin/users" \
    -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
    -H "apikey: ${SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"${email}\",\"password\":\"${PW}\",\"email_confirm\":true}")"
  # 200/201 = created, 409/400 with "already exists" = fine
  if echo "$resp" | grep -qiE '"id"'; then
    echo "  created ${email}"
  elif echo "$resp" | grep -qiE 'already exists|user.*exist'; then
    echo "  ${email} already exists (ok)"
  else
    echo "  WARN create ${email}: ${resp}" >&2
  fi
}

echo "==> creating auth users"
create_user "$ADMIN_EMAIL"
create_user "$OWNER_EMAIL"
create_user "$MEMBER_EMAIL"

# --- promote admin to system admin -----------------------------------
echo "==> promoting ${ADMIN_EMAIL} to system admin"
psql -c "UPDATE profiles SET is_system_admin = true WHERE email = '${ADMIN_EMAIL}';"

# --- create demo organization for org owner ---------------------------
echo "==> creating demo organization for ${OWNER_EMAIL}"
psql -c "
DO \$\$
DECLARE v_owner_id UUID; v_org_id UUID;
BEGIN
  SELECT id INTO v_owner_id FROM profiles WHERE email = '${OWNER_EMAIL}';
  IF v_owner_id IS NULL THEN RAISE EXCEPTION 'owner user not found'; END IF;

  -- Check if org already exists, get its ID
  SELECT id INTO v_org_id FROM organizations WHERE slug = 'demo-org';

  IF v_org_id IS NULL THEN
    -- Create the organization
    INSERT INTO organizations (name, slug, description)
    VALUES ('Demo Organization', 'demo-org', 'Organization for testing and demonstration purposes')
    RETURNING id INTO v_org_id;
  END IF;

  -- Add the owner as an org member with admin role and owner flag if not already a member
  INSERT INTO organization_members (organization_id, user_id, role, status, is_owner)
  VALUES (v_org_id, v_owner_id, 'admin', 'active', true)
  ON CONFLICT (organization_id, user_id) DO NOTHING;
END \$\$;
"

# --- link member into demo org -------------------------------------
echo "==> linking ${MEMBER_EMAIL} into demo org"
psql -c "
INSERT INTO organization_members (organization_id, user_id, role, status, is_owner)
SELECT o.id, p.id, 'member', 'active', false
FROM organizations o, profiles p
WHERE o.slug = 'demo-org' AND p.email = '${MEMBER_EMAIL}'
ON CONFLICT (organization_id, user_id) DO NOTHING;
"

# --- demo campaigns + donation methods -------------------------------
echo "==> seeding demo campaigns + donation methods"
psql -c "
DO \$\$
DECLARE v_org UUID; v_admin_id UUID; v_owner_id UUID;
BEGIN
  SELECT id INTO v_org FROM organizations WHERE slug = 'demo-org';
  SELECT id INTO v_admin_id FROM profiles WHERE email = '${ADMIN_EMAIL}';
  SELECT id INTO v_owner_id FROM profiles WHERE email = '${OWNER_EMAIL}';
  IF v_org IS NULL THEN RAISE EXCEPTION 'demo org not found'; END IF;

  INSERT INTO campaigns (org_id, title, slug, description, goal_amount, currency, is_zakat_eligible, status, is_active, created_by)
  SELECT v_org, 'Demo Campaign ' || g, 'demo-campaign-' || g,
         'A humanitarian campaign seeded for local testing.', 100000 + g*1000, 'BDT',
         (g = 1), 'live', true, v_owner_id
  FROM generate_series(1,14) g
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO donation_methods (organization_id, bkash_number, bkash_account_name, nagad_number, bank_name, bank_account_number, donation_url, is_preferred)
  VALUES (v_org, '01700000000', 'Demo Organization', '01800000000', 'Demo Bank', '1234567890', 'https://demo.org/donate', true)
  ON CONFLICT DO NOTHING;
END \$\$;
"

echo "==> done."
