#!/usr/bin/env bash
# ====================================================================
# supabase/seed-auth.sh
# --------------------------------------------------------------------
# Seeds login-able auth users + demo data for local dev / e2e.
# Must be run AFTER `supabase db reset` (which only applies seed.sql,
# and raw SQL auth.users inserts are invisible to GoTrue).
#
# Produces:
#   test@example.com   / Password123!  (org owner + system admin)
#   member@example.com / Password123!  (plain org member)
#   + 14 LIVE demo campaigns (1 zakat) + donation methods for the org
# ====================================================================
set -euo pipefail

PROJECT="donate-local"
API_URL="${SUPABASE_API_URL:-http://127.0.0.1:55321}"
PW="Password123!"
OWNER_EMAIL="test@example.com"
MEMBER_EMAIL="member@example.com"

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
create_user "$OWNER_EMAIL"
create_user "$MEMBER_EMAIL"

# --- promote owner to system admin -----------------------------------
echo "==> promoting ${OWNER_EMAIL} to system admin"
psql -c "UPDATE profiles SET is_system_admin = true WHERE email = '${OWNER_EMAIL}';"

# --- link member into owner's org -------------------------------------
echo "==> linking ${MEMBER_EMAIL} into owner org"
psql -c "
INSERT INTO organization_members (organization_id, user_id, role, status, is_owner)
SELECT om.organization_id, p.id, 'member', 'active', false
FROM organization_members om
JOIN profiles p ON p.email = '${MEMBER_EMAIL}'
WHERE om.user_id = (SELECT id FROM profiles WHERE email = '${OWNER_EMAIL}') AND om.is_owner = true
ON CONFLICT (organization_id, user_id) DO NOTHING;
"

# --- demo campaigns + donation methods -------------------------------
echo "==> seeding demo campaigns + donation methods"
psql -c "
DO \$\$
DECLARE v_org UUID;
BEGIN
  SELECT organization_id INTO v_org
  FROM organization_members
  WHERE user_id = (SELECT id FROM profiles WHERE email = '${OWNER_EMAIL}') AND is_owner = true
  LIMIT 1;
  IF v_org IS NULL THEN RAISE EXCEPTION 'owner organization not found'; END IF;

  INSERT INTO campaigns (org_id, title, slug, description, goal_amount, currency, is_zakat_eligible, status, is_active, created_by)
  SELECT v_org, 'Demo Campaign ' || g, 'demo-campaign-' || g,
         'A humanitarian campaign seeded for local testing.', 100000 + g*1000, 'BDT',
         (g = 1), 'live', true, (SELECT id FROM profiles WHERE email = '${OWNER_EMAIL}')
  FROM generate_series(1,14) g
  ON CONFLICT (slug) DO NOTHING;

  INSERT INTO donation_methods (organization_id, bkash_number, bkash_account_name, nagad_number, bank_name, bank_account_number, donation_url, is_preferred)
  VALUES (v_org, '01700000000', 'Demo Organization', '01800000000', 'Demo Bank', '1234567890', 'https://demo.org/donate', true)
  ON CONFLICT DO NOTHING;
END \$\$;
"

echo "==> done."
