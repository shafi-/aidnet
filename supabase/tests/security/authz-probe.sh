#!/usr/bin/env bash
# ======================================================================
# supabase/tests/security/authz-probe.sh
# ----------------------------------------------------------------------
# Cross-tenant authorization pentest for the donate API surface.
#
# Validates (through the real HTTP gateway, with real JWTs) that:
#   * a user from org B CANNOT read or mutate org A's resources via any RPC
#   * system-admin functions reject non-admins; DB-revoked functions reject
#     everyone but the migration role
#   * postgres-owned views stay inaccessible to client roles (RLS bypass)
#   * anon can reach only the intended public surface
#   * direct table access stays RLS-gated (no drafts to anon)
#
# The attacker tenant is created THROUGH legitimate flows (signup →
# submit_org_request → admin approval), so the probe never needs DB
# access and validates the same path a real abuser would take.
#
# Usage:
#   bash supabase/tests/security/authz-probe.sh
#
# Environment (all optional — defaults fit the docker/ local stack):
#   SUPABASE_API_URL   default http://127.0.0.1:55321
#   SUPABASE_ANON_KEY  default: read from docker/.env, then client/.env.local
#   ADMIN_EMAIL / OWNER_EMAIL / MEMBER_EMAIL / PASSWORD   seeded actors
#
# Requires: bash 3.2+, curl, node (JSON parsing — a client devDependency).
# Exit code: 0 = every probe matched its expectation; 1 = at least one
# LEAK (or a broken positive control — never ship on a broken harness).
#
# NOTE: each run leaves a pentest user + a pentest org behind. The org is
# removed by the next `supabase/seed-auth.sh` cleanup pass; the auth user
# remains (harmless locally).
#
# IMPLEMENTATION NOTE: probe_rpc/probe_get take the RPC name and payload as
# FUNCTION ARGUMENTS on purpose. Nesting literal JSON (with \" escapes)
# inside "$( ... )" command substitution gets re-tokenized by bash and
# mangles multi-field payloads (PGRST102) — do not "simplify" it back.
# ======================================================================
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
API_URL="${SUPABASE_API_URL:-http://127.0.0.1:55321}"
PASSWORD="${PASSWORD:-Password123!}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@donate.app}"
OWNER_EMAIL="${OWNER_EMAIL:-owner@donate.app}"
MEMBER_EMAIL="${MEMBER_EMAIL:-member@donate.app}"

# --- resolve anon key (env → docker/.env → client/.env.local) ----------
ANON_KEY="${SUPABASE_ANON_KEY:-}"
if [ -z "$ANON_KEY" ] && [ -f "$ROOT/docker/.env" ]; then
  ANON_KEY="$(grep -E '^ANON_KEY=' "$ROOT/docker/.env" | cut -d= -f2-)"
fi
if [ -z "$ANON_KEY" ] && [ -f "$ROOT/client/.env.local" ]; then
  ANON_KEY="$(grep -E '^NEXT_PUBLIC_SUPABASE_ANON_KEY=' "$ROOT/client/.env.local" | cut -d= -f2-)"
fi
if [ -z "$ANON_KEY" ]; then
  echo "ERROR: no anon key (set SUPABASE_ANON_KEY or run from the repo with docker/.env)" >&2
  exit 1
fi

PASS=0; FAIL=0

# login <email> -> access token (empty on failure)
login() {
  curl -s -X POST "$API_URL/auth/v1/token?grant_type=password" \
    -H "apikey: $ANON_KEY" -H "Content-Type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"$PASSWORD\"}" |
    node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).access_token||'')}catch(e){console.log('')}})"
}

# http <method> <path> <token> <payload-or-"-"> -> "<status>|<body>"
http() {
  local method="$1" path="$2" token="$3" payload="$4" out
  out=$(curl -s -w '\n%{http_code}' -X "$method" "$API_URL$path" \
    -H "apikey: $ANON_KEY" -H "Authorization: Bearer $token" \
    -H "Content-Type: application/json" ${payload:+-d "$payload"})
  printf '%s|%s' "${out##*$'\n'}" "${out%$'\n'*}"
}

# json1 <js-accessor> — extracts one value from a "<status>|<body>" response
# piped on stdin.
json1() {
  node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const j=JSON.parse(d.split('|')[1]);console.log(eval(process.argv[1])||'')}catch(e){console.log('')}})" "$1"
}

# probe <label> <expected-regex> <response> — PASS when response matches.
# Expectations describe the DENIAL (or the allowed shape), so any drift
# shows up as a LEAK. Case-insensitive extended regex.
probe() {
  local label="$1" expect="$2" resp="$3"
  if echo "$resp" | grep -qiE "$expect"; then
    PASS=$((PASS + 1))
    printf '  PASS  %s\n' "$label"
  else
    FAIL=$((FAIL + 1))
    printf '  LEAK  %s\n        got: %s\n' "$label" "$(echo "$resp" | head -c 160)"
  fi
}

# probe_absent <label> <must-NOT-match regex> <response> — negative security
# properties grep cannot express as a positive match.
probe_absent() {
  local label="$1" forbidden="$2" resp="$3"
  if echo "$resp" | grep -qiE "$forbidden"; then
    FAIL=$((FAIL + 1))
    printf '  LEAK  %s\n        got: %s\n' "$label" "$(echo "$resp" | head -c 160)"
  else
    PASS=$((PASS + 1))
    printf '  PASS  %s\n' "$label"
  fi
}

# probe_rpc <label> <expected-regex> <fn> <token> <payload>
probe_rpc() {
  probe "$1" "$2" "$(http POST "/rest/v1/rpc/$3" "$4" "$5")"
}

# probe_get <label> <expected-regex> <path> <token>
probe_get() {
  probe "$1" "$2" "$(http GET "$3" "$4" '-')"
}

echo "== authz-probe against $API_URL =="

# --- tokens -------------------------------------------------------------
ADMIN=$(login "$ADMIN_EMAIL")
OWNER=$(login "$OWNER_EMAIL")
MEMBER=$(login "$MEMBER_EMAIL")
for t in "$ADMIN" "$OWNER" "$MEMBER"; do
  [ -n "$t" ] || { echo "ERROR: could not login seeded actors — is the stack seeded (supabase/seed-auth.sh)?" >&2; exit 1; }
done

# --- attacker tenant via legitimate flows (unique per run) ---------------
SUFFIX="$(date +%s)"
ATK_EMAIL="pentest-$SUFFIX@evil.test"
ATK_SLUG="pentest-evil-$SUFFIX"
http POST /auth/v1/signup "$ANON_KEY" \
  "{\"email\":\"$ATK_EMAIL\",\"password\":\"$PASSWORD\",\"data\":{\"full_name\":\"Pentest Attacker\"}}" > /dev/null
ATK=$(login "$ATK_EMAIL")
[ -n "$ATK" ] || { echo "ERROR: attacker signup/login failed" >&2; exit 1; }

http POST /rest/v1/rpc/submit_org_request "$ATK" \
  "{\"p_org_name\":\"Pentest Evil\",\"p_org_slug\":\"$ATK_SLUG\"}" > /dev/null
REQ_ID=$(http POST /rest/v1/rpc/get_all_org_requests "$ADMIN" '{}' |
  json1 "j.find(x=>x.org_slug==='$ATK_SLUG').id")
[ -n "$REQ_ID" ] || { echo "ERROR: attacker org request not found" >&2; exit 1; }
http POST /rest/v1/rpc/approve_org_request "$ADMIN" "{\"p_request_id\":\"$REQ_ID\"}" > /dev/null

# --- resource ids ---------------------------------------------------------
ORGA=$(http POST /rest/v1/rpc/get_my_organizations "$OWNER" '{}' | json1 "j[0].id")
ORGB=$(http POST /rest/v1/rpc/get_my_organizations "$ATK" '{}' | json1 "j.find(o=>o.slug==='$ATK_SLUG').id")
CAMPAIGN=$(http POST /rest/v1/rpc/get_campaigns "$OWNER" "{\"p_org_id\":\"$ORGA\"}" | json1 "j.find(c=>c.slug==='demo-draft-tagged').id")
MEMBER_ID=$(http POST /rest/v1/rpc/get_organization_members "$OWNER" "{\"target_org_id\":\"$ORGA\"}" | json1 "j.find(m=>m.email==='$MEMBER_EMAIL').user_id")
PLAN_ID=$(http POST /rest/v1/rpc/get_subscription_plans "$ATK" '{}' | json1 "j.find(p=>p.name==='Pro').id")
for v in "$ORGA" "$ORGB" "$CAMPAIGN" "$MEMBER_ID" "$PLAN_ID"; do
  [ -n "$v" ] || { echo "ERROR: setup could not resolve a resource id" >&2; exit 1; }
done

echo "== positive controls (must SUCCEED — a failure means a broken harness) =="
probe_rpc "owner: get_campaigns(own org)"           '"title"'  get_campaigns "$OWNER" "{\"p_org_id\":\"$ORGA\"}"
probe_rpc "member: create_todo(own org)"            '"id"'     create_todo "$MEMBER" "{\"p_organization_id\":\"$ORGA\",\"p_title\":\"authz-probe\"}"
probe_rpc "member: has_feature(own org)"            'true'     has_feature "$MEMBER" "{\"p_org_id\":\"$ORGA\",\"p_feature\":\"todos\"}"
probe_rpc "owner: get_org_meta(own org)"            '^200'     get_org_meta "$OWNER" "{\"p_org_id\":\"$ORGA\"}"
probe_rpc "owner: update_org_meta(own org)"         'true'     update_org_meta "$OWNER" "{\"p_org_id\":\"$ORGA\",\"p_name\":\"Demo Organization\"}"

echo "== attacker (org B) reading org A =="
probe_rpc "get_campaigns(orgA)"                     '\|\[\]$'   get_campaigns "$ATK" "{\"p_org_id\":\"$ORGA\"}"
probe_rpc "get_campaign(orgA campaign)"             '\|\[\]$'   get_campaign "$ATK" "{\"p_campaign_id\":\"$CAMPAIGN\"}"
probe_rpc "get_donation_methods(orgA)"              '\|\[\]$'   get_donation_methods "$ATK" "{\"p_org_id\":\"$ORGA\"}"
probe_rpc "get_my_subscription(orgA)"               '\|\[\]$|^null$' get_my_subscription "$ATK" "{\"p_org_id\":\"$ORGA\"}"
probe_rpc "get_subscription_history(orgA)"          '\|\[\]$'   get_subscription_history "$ATK" "{\"p_org_id\":\"$ORGA\"}"
probe_rpc "get_organization(orgA)"                  '\|\[\]$'   get_organization "$ATK" "{\"target_org_id\":\"$ORGA\"}"
probe_rpc "get_membership(orgA)"                    '\|\[\]$|^null$' get_membership "$ATK" "{\"p_org_id\":\"$ORGA\"}"
probe_rpc "get_invites(orgA)"                       '\|\[\]$'   get_invites "$ATK" "{\"p_organization_id\":\"$ORGA\"}"
probe_rpc "get_todos(orgA)"                         '\|\[\]$'   get_todos "$ATK" "{\"p_organization_id\":\"$ORGA\"}"
probe_rpc "get_campaign_tag_ids(orgA campaign)"     '\|\[\]$'   get_campaign_tag_ids "$ATK" "{\"p_campaign_id\":\"$CAMPAIGN\"}"
probe_rpc "has_feature(orgA) [regression: leak]"    'false'    has_feature "$ATK" "{\"p_org_id\":\"$ORGA\",\"p_feature\":\"todos\"}"
probe_rpc "get_user_profile(orgA member)"           '\|\[\]$'   get_user_profile "$ATK" "{\"target_user_id\":\"$MEMBER_ID\"}"

echo "== attacker (org B) mutating org A =="
probe_rpc "get_org_meta(orgA)"                      'not authorized' get_org_meta "$ATK" "{\"p_org_id\":\"$ORGA\"}"
probe_rpc "update_org_meta(orgA)"                   'not authorized' update_org_meta "$ATK" "{\"p_org_id\":\"$ORGA\",\"p_name\":\"HACKED\"}"
probe_rpc "update_organization(orgA)"               'not authorized' update_organization "$ATK" "{\"target_org_id\":\"$ORGA\",\"new_name\":\"HACKED\"}"
probe_rpc "delete_organization(orgA)"               'not authorized' delete_organization "$ATK" "{\"target_org_id\":\"$ORGA\"}"
probe_rpc "set_org_status(orgA,suspended)"          'not authorized' set_org_status "$ATK" "{\"p_org_id\":\"$ORGA\",\"p_status\":\"suspended\"}"
probe_rpc "add_organization_member(orgA)"           'not authorized' add_organization_member "$ATK" "{\"target_org_id\":\"$ORGA\",\"target_user_email\":\"$MEMBER_EMAIL\"}"
probe_rpc "update_member_role(orgA)"                'not authorized' update_member_role "$ATK" "{\"target_org_id\":\"$ORGA\",\"target_user_id\":\"$MEMBER_ID\",\"new_role\":\"admin\"}"
probe_rpc "remove_organization_member(orgA)"        'not authorized' remove_organization_member "$ATK" "{\"target_org_id\":\"$ORGA\",\"target_user_id\":\"$MEMBER_ID\"}"
probe_rpc "create_todo(orgA)"                       'not authorized' create_todo "$ATK" "{\"p_organization_id\":\"$ORGA\",\"p_title\":\"hack\"}"
probe_rpc "create_invite(orgA)"                     'not authorized' create_invite "$ATK" "{\"p_organization_id\":\"$ORGA\",\"p_email\":\"x@x.test\"}"
probe_rpc "create_campaign(orgA)"                   'not authorized' create_campaign "$ATK" "{\"p_org_id\":\"$ORGA\",\"p_title\":\"hack\",\"p_slug\":\"pentest-hack-$SUFFIX\"}"
probe_rpc "submit_campaign_for_review(orgA camp)"   'not authorized|not found' submit_campaign_for_review "$ATK" "{\"p_campaign_id\":\"$CAMPAIGN\"}"
probe_rpc "set_campaign_tags(orgA campaign)"        'not authorized|not found' set_campaign_tags "$ATK" "{\"p_campaign_id\":\"$CAMPAIGN\",\"p_tag_ids\":[]}"
probe_rpc "subscribe_to_plan(orgA)"                 'not authorized|only organization owners' subscribe_to_plan "$ATK" "{\"p_org_id\":\"$ORGA\",\"p_plan_id\":\"$PLAN_ID\",\"p_billing_period\":\"monthly\"}"
probe_rpc "cancel_subscription(orgA)"               'not authorized|only organization owners' cancel_subscription "$ATK" "{\"p_org_id\":\"$ORGA\"}"

echo "== attacker vs system surface =="
probe_rpc "verify_campaign"                         'system admin required' verify_campaign "$ATK" "{\"p_campaign_id\":\"$CAMPAIGN\"}"
probe_rpc "get_pending_campaigns()"                 'system admin required' get_pending_campaigns "$ATK" '{}'
probe_rpc "get_all_organizations()"                 'system admin required' get_all_organizations "$ATK" '{}'
probe_rpc "get_system_stats()"                      'system admin required' get_system_stats "$ATK" '{}'
probe_rpc "get_system_admins()"                     'system admin required' get_system_admins "$ATK" '{}'
probe_rpc "get_all_org_requests()"                  'system admin required' get_all_org_requests "$ATK" '{}'
probe_rpc "approve_org_request(self-approval)"      'system admin required' approve_org_request "$ATK" "{\"p_request_id\":\"$REQ_ID\"}"
probe_rpc "grant_system_admin()"                    'system admin required' grant_system_admin "$ATK" "{\"target_user_id\":\"$MEMBER_ID\"}"
probe_rpc "get_organization_subscriptions()"        '\|\[\]$'   get_organization_subscriptions "$ATK" '{}'
probe_rpc "set_system_admin [DB-revoked]"           'permission denied|^40[34]' set_system_admin "$ATK" "{\"p_user_id\":\"$MEMBER_ID\"}"
probe_rpc "create_organization [DB-revoked]"        'permission denied|^40[34]' create_organization "$ATK" "{\"org_name\":\"x\",\"org_slug\":\"pentest-x-$SUFFIX\"}"
probe_rpc "bootstrap_system_admin [DB-revoked]"     'permission denied|^40[34]' bootstrap_system_admin "$ATK" '{}'

echo "== member vs owner-only actions on own org =="
probe_rpc "member: subscribe_to_plan(own org)"      'not authorized|only organization owners' subscribe_to_plan "$MEMBER" "{\"p_org_id\":\"$ORGA\",\"p_plan_id\":\"$PLAN_ID\",\"p_billing_period\":\"monthly\"}"
probe_rpc "member: update_member_role(own org)"     'not authorized' update_member_role "$MEMBER" "{\"target_org_id\":\"$ORGA\",\"target_user_id\":\"$MEMBER_ID\",\"new_role\":\"admin\"}"
probe_rpc "member: add_organization_member(own org)" 'not authorized' add_organization_member "$MEMBER" "{\"target_org_id\":\"$ORGA\",\"target_user_email\":\"$ADMIN_EMAIL\"}"

echo "== views must stay client-inaccessible (RLS bypass surface) =="
probe_get "owner: GET /rest/v1/member_view"         '^4[0-9][0-9]\|' "/rest/v1/member_view?select=email&limit=2" "$OWNER"
probe_get "owner: GET /rest/v1/profile_view"        '^4[0-9][0-9]\|' "/rest/v1/profile_view?select=email" "$OWNER"
probe_get "owner: GET /rest/v1/organization_view"   '^4[0-9][0-9]\|' "/rest/v1/organization_view?select=user_id&limit=2" "$OWNER"

echo "== anon surface =="
probe_get "anon: GET /rest/v1/member_view"          '^4[0-9][0-9]\|' "/rest/v1/member_view?select=email&limit=2" "$ANON_KEY"
probe_get "anon: GET /rest/v1/campaigns (RLS gate)" '^200\|'         "/rest/v1/campaigns?select=slug,status&limit=50" "$ANON_KEY"
probe_absent "anon: campaigns contain no draft rows" '"draft"'       "$(http GET "/rest/v1/campaigns?select=slug,status&limit=50" "$ANON_KEY" '-')"
probe_rpc "anon: get_subscription_plans (public)"   '^200'     get_subscription_plans "$ANON_KEY" '{}'
probe_rpc "anon: get_my_organizations"              '^40[13]'  get_my_organizations "$ANON_KEY" '{}'

echo "== summary =="
echo "   PASS: $PASS   LEAK/FAIL: $FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo "RESULT: LEAK — do not ship. Investigate every LEAK line above."
  exit 1
fi
echo "RESULT: CLEAN — no authorization drift detected."
exit 0
