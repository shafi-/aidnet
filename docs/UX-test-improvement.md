# UX Test Improvement Plan

Audit of every page: what it has, what users expect, what tests should cover, and what needs fixing. Organized by domain.

---

## Public / Marketing

### Landing Page `/`

**What it has:**
- Nav: brand "SupaNext", conditional links (Dashboard/Profile if logged in, Sign In/Get Started if logged out)
- Hero: heading "Welcome to SupaNext", subtext, conditional CTA (Go to Dashboard if logged in, Get Started/Sign In if logged out)
- Campaigns section: heading "Latest Campaigns", "See more ->" link, grid of CampaignCards (max 12)
- Feature cards: "Secure Authentication", "Function-First Database", "Modern UI Components"
- Auth loading state

**What users expect:**
- See campaign cards with cover image, title, org name, description, goal, zakat badge
- Click any campaign card → campaign detail
- "See more" → campaigns browse page
- Logged in users see personalized nav and quick access to dashboard

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| Landing page loads | ✅ Exists in `landing.spec.ts` | |
| Hero shows for logged out user | ✅ Exists | |
| Hero shows welcome for logged in user | ✅ Exists | |
| Campaign cards render with correct data | ✅ Exists | |
| Campaign card click → detail page | ✅ Exists | |
| Feature cards visible | ✅ Exists | |
| Auth nav: Dashboard + Profile links visible | ✅ Fixed | Updated to check landing nav structure, not AppLayout nav |
| Sign in / Get Started buttons work | ✅ Exists | |

**Fixes needed:**
- `auth-links.spec.ts`: Update authenticated nav test to check for "Dashboard" + "Profile" links in the landing nav, not email/sign-out (those are AppLayout nav)

---

### About Page `/about`

**What it has:**
- Heading "About SupaNext"
- Feature list: RLS, multi-tenant orgs, RBAC, function-first DB, static export

**What users expect:** Static info page. No actions.

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| About page loads with heading | ❌ Missing | Need to add |
| Feature list items visible | ❌ Missing | Need to add |

**Fixes needed:**
- Add `about.spec.ts` with basic smoke tests

---

### Privacy Page `/privacy`

**What it has:**
- Heading "Privacy Policy"
- Data Collection / Data Usage sections

**What users expect:** Static info page. No actions.

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| Privacy page loads | ❌ Missing | Need to add |

**Fixes needed:**
- Add `privacy.spec.ts` smoke test

---

### Campaign Browse `/campaigns`

**What it has:**
- Heading "Discover Campaigns"
- "<- Home" link
- Zakat filter toggle: "All Campaigns" / "Zakat Eligible" (with checkmark) + "Clear filter" when active
- Campaign card grid
- Loading / error / empty states

**What users expect:**
- Filter by zakat eligibility
- Click card → detail page
- See campaign cards with image, title, org, description, goal

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| Page loads with heading | ✅ Exists in `campaigns-browse.spec.ts` | |
| Zakat filter toggles | ✅ Exists | |
| Campaign cards clickable | ✅ Exists | |
| Clear filter link works | ✅ Exists | |
| Empty state shows when no results | ❌ Missing | |
| Back to home link works | ❌ Missing | |

**Fixes needed:**
- Add empty state test (filter to zakat when no zakat campaigns exist)

---

### Campaign Detail `/campaigns/detail?slug={slug}`

**What it has:**
- "<- Back to campaigns" link
- Campaign title (h1), zakat badge, org name (links to public org page)
- Cover image (conditional)
- Description
- Goal, start date, end date chips
- Tag chips
- "Donate Directly" section: disclaimer, "Donate via {host}" button (opens external), donation method rows (bKash/Nagad/Rocket/Bank), instructions, QR code

**What users expect:**
- View full campaign info
- Click org name → public org page
- Donate via external link (opens new tab)
- See donation methods and QR code if provided

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| Campaign detail loads with title | ❌ Missing | `campaign-detail.spec.ts` exists but all tests are failing |
| Org name links to public org page | ❌ Missing | |
| Donate button opens external URL | ❌ Missing | |
| Zakat badge shows when eligible | ❌ Missing | |
| Back to campaigns link works | ❌ Missing | |
| Invalid slug shows error | ❌ Missing | |
| Missing slug shows error | ❌ Missing | |

**Fixes needed:**
- Rewrite `campaign-detail.spec.ts` — current version uses wrong selectors for CampaignCard (doesn't set `cover_image_url` so fallback div shows instead of image, and the card link structure is wrong)

---

### Public Org `/orgs/public?slug={slug}`

**What it has:**
- Org name (h1), description
- About card: created date, slug
- Sign In / Create Account buttons

**What users expect:**
- View org info publicly
- Navigate to auth from here

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| Public org page loads | ✅ Exists in `public-org.spec.ts` | |
| Org name and description visible | ✅ Exists | |
| Invalid slug shows error | ✅ Exists | |

**Fixes needed:** None — this page is well tested.

---

## Auth

### Login `/auth/login`

**What it has:**
- Heading "Sign In", subtext "Welcome back to SupaNext"
- Email input (`#email`), password input (`#password`), remember me checkbox
- "Forgot password?" link → `/auth/reset-password/`
- "Sign In" submit button (shows "Signing in..." when loading)
- "Don't have an account? Sign up" link → `/auth/register`
- "<- Back to home" link → `/`
- Error alert (conditional)

**What users expect:**
- Login with valid credentials → redirect to dashboard
- See error on invalid credentials
- Navigate to register, forgot password, home

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| Login form renders all fields | ✅ Exists in `auth.spec.ts` | |
| Can login with valid credentials | ❌ Failing | Supabase rate limiting under parallel load. Passes in isolation |
| Shows error on invalid credentials | ✅ Exists | |
| Register link navigates correctly | ✅ Exists | |
| Forgot password link navigates correctly | ✅ Exists | |
| Back to home link works | ❌ Missing | |

**Fixes needed:**
- Auth tests are rate-limited under parallel execution. Add `retries: 1` to playwright.config.ts to handle transient failures
- Add "back to home" link test

---

### Register `/auth/register`

**What it has:**
- Heading "Create Account", subtext "Join SupaNext today"
- Full Name input (optional), Email, Password, Confirm Password inputs
- Terms disclaimer
- "Create Account" submit button
- "Already have an account? Sign in" link
- "<- Back to home" link

**What users expect:**
- Create account with valid data → redirect to dashboard
- Validation: all required fields, password match, min 6 chars
- See error on duplicate email

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| Register form renders all fields | ✅ Exists | |
| Can register new account | ✅ Exists | |
| Password mismatch shows error | ✅ Exists | |
| Short password shows error | ✅ Exists | |
| Login link navigates correctly | ✅ Exists | |

**Fixes needed:** None — well tested.

---

### Reset Password `/auth/reset-password`

**What it has:**
- Heading "Reset Password"
- Email input, "Send reset link" button
- Success state: heading "Check your email", message, "Back to login" link

**What users expect:**
- Enter email → receive reset link
- See confirmation message
- Navigate back to login

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| Reset form renders | ✅ Exists | |
| Submit shows success state | ✅ Exists | |
| Back to login link works | ❌ Failing | Same rate limiting issue as login test |

**Fixes needed:**
- Rate limiting issue — same fix as login (retries)

---

## Profile

### Profile `/profile`

**What it has:**
- Heading "Profile"
- Email: read-only display (`<p>` with user email)
- Full Name: editable text input (pre-filled from profile)
- Organization: read-only display (current org name or "None")
- "Save" button (shows "Saving..." when loading)

**What users expect:**
- View and edit full name
- See current org
- Save changes → confirmation

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| Profile page loads with user data | ✅ Exists in `profile.spec.ts` | |
| Full name input is editable | ✅ Exists | |
| Save button works | ✅ Exists | |
| Email display is read-only | ✅ Exists | |
| Current org displayed | ✅ Exists | |
| Profile link from dashboard navigates correctly | ❌ Failing | Test expects email in nav but dashboard has no nav component |

**Fixes needed:**
- `profile.spec.ts:57`: The "profile link from dashboard" test tries to click `nav.getByRole('link', { name: email })` but the dashboard page has no AppLayout nav. Fix: navigate directly to `/profile` instead of trying to click through from dashboard, or check the actual dashboard content for a profile link

---

## Dashboard

### Dashboard `/dashboard`

**What it has:**
- Heading "Dashboard", welcome message with email
- QuickStats cards: Organizations count, Members count (if org), Campaigns count (if org), Active Tasks (if org)
- DashboardCards:
  - My Organizations: lists user's orgs with member count, current org highlighted
  - Profile Settings: email display, "Update Profile ->" link
  - Security: "Change Password" link → `/auth/reset-password/`
- OrgDashboard (if currentOrg set): org name, description, tabs (Todos/Members/Settings/Billing — conditional on subscription features)

**What users expect:**
- See overview of their account
- Quick access to orgs, profile, security
- If org selected: full org management dashboard

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| Dashboard loads with heading | ✅ Exists in `dashboard.spec.ts` | |
| Welcome message shows email | ✅ Exists | |
| QuickStats visible | ✅ Exists | |
| DashboardCards visible | ✅ Exists | |
| "Manage Organizations" link → /orgs | ✅ Exists | |
| "Update Profile" link → /profile | ✅ Exists | |
| "Change Password" link works | ✅ Exists | |
| Nav shows navigation links | ✅ Fixed | Now checks dashboard content links, not AppLayout nav |
| Profile link navigates to profile | ❌ Failing | Tries to click nav email link but dashboard has no nav |
| Sign out from dashboard | ❌ Failing | Tries to click nav "Sign out" but dashboard has no nav |

**Fixes needed:**
- `dashboard.spec.ts:75` (profile link): Dashboard page has no nav. Fix: navigate to profile via DashboardCards "Update Profile" link, or go to `/profile` directly
- `dashboard.spec.ts:86` (sign out): Dashboard page has no nav. Fix: test sign out from a page that HAS nav (like `/campaigns`), or test the auth state clearing directly

---

### OrgDashboard Tabs (within `/dashboard`)

**What it has:**
- Org name (h1), description
- Tabs: Todos, Members, Settings, Billing (each conditional on subscription features and user role)

#### Todos Tab (requires `hasFeature('todos')`)
- Todo input + "Add" button
- Todo list with checkboxes, delete buttons

#### Members Tab (requires `hasFeature('members')`)
- Members sub-tab: member list with role select + remove
- Pending Invites sub-tab: invite form + invite list with revoke
- Admin only: add member by email, invite by email with role

#### Settings Tab (requires `hasFeature('settings')` + admin role)
- Org name input, slug input, description textarea
- "Save Changes" button

#### Billing Tab (owner only)
- Current plan info with status badge
- Cancel Subscription button
- Available plans grid with Monthly/Yearly toggle
- "Pay Now" button per plan
- Billing history table

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| OrgDashboard shows org name | ✅ Exists in `dashboard-org.spec.ts` | |
| Billing tab visible for owner | ✅ Exists | |
| Todos tab visible when feature enabled | ❌ Skipped | Subscription plan doesn't have 'todos' feature |
| Members tab visible when feature enabled | ❌ Skipped | Same |
| Settings tab visible when admin | ❌ Skipped | Same |
| Tab switching works | ❌ Skipped | Same |

**Fixes needed:**
- All OrgDashboard tab tests are skipped because the seeded org's subscription plan doesn't include those features. Options:
  1. Seed a subscription with all features enabled
  2. Create a test subscription in the test setup
  3. Test against a plan that has all features

---

### Dashboard Campaigns `/dashboard/campaigns`

**What it has:**
- Heading "Campaigns", org name subtext
- "New Campaign" button (if has `campaigns:create` permission)
- Campaign list: title, status badge, zakat badge, slug
- Actions per campaign: "Submit for Review" (draft/rejected), "Edit" link, "Delete" button (if has permission + not live)
- Empty state: "No campaigns yet"
- "Go to Organizations" link (if no currentOrg)

**What users expect:**
- See all campaigns for their org
- Create, edit, delete campaigns
- Submit for review
- Status badges showing campaign state

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| Campaigns page loads | ✅ Exists in `dashboard-campaigns.spec.ts` | |
| Campaign list shows campaigns | ✅ Exists | |
| Status badges visible | ✅ Exists | |
| New Campaign button visible | ✅ Exists | |
| Campaign form shows all fields | ❌ Failing | Test expects CampaignForm fields but the page shows the campaign list, not the form |
| Edit link navigates to edit form | ❌ Failing | Test tries to click Edit link but campaign is not draft status, so Edit link may not show |
| Submit for Review shows for draft | ❌ Failing | Same — campaign status issue |
| Delete button works | ❌ Missing | |

**Fixes needed:**
- `dashboard-campaigns.spec.ts:45` (form fields): Test navigates to `/dashboard/campaigns` but expects form fields. Fix: navigate to `/dashboard/campaigns/new` instead, or separate list tests from form tests
- `dashboard-campaigns.spec.ts:95` (edit link): Campaign may not be in draft status. Fix: check campaign status or create a draft campaign in test setup
- `dashboard-campaigns.spec.ts:124` (submit for review): Same status issue

---

### New Campaign `/dashboard/campaigns/new`

**What it has:**
- Heading "New Campaign"
- "<- Back" link → `/dashboard/campaigns`
- CampaignForm: Title, Slug, Description, Cover Image URL, Goal Amount, Currency, Start Date, End Date, Zakat eligible checkbox, Tags
- "Create Campaign" submit button, "Cancel" button

**What users expect:**
- Fill form → create campaign → redirect to campaigns list
- Tags are toggleable pills
- Slug auto-generates from title

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| Form renders all fields | ❌ Missing | Need dedicated test |
| Can create campaign | ❌ Missing | Need dedicated test |
| Cancel navigates back | ❌ Missing | |
| Back link works | ❌ Missing | |

**Fixes needed:**
- Add new test file or extend `dashboard-campaigns.spec.ts` with form-specific tests

---

### Edit Campaign `/dashboard/campaigns/edit?id={uuid}`

**What it has:**
- Heading "Edit Campaign"
- "<- Back" link
- CampaignForm pre-filled with existing data
- "Save Changes" submit button

**What users expect:**
- Form pre-filled with current campaign data
- Edit and save → redirect to campaigns list

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| Form pre-fills with campaign data | ❌ Missing | Need dedicated test |
| Can save changes | ❌ Missing | |
| Invalid ID shows error | ❌ Missing | |

**Fixes needed:**
- Add edit campaign tests

---

## Organizations

### Orgs Page `/orgs`

**What it has:**
- Heading "Organizations"
- "Create Organization" / "Cancel" toggle button
- Org cards: name, description, member count
- Create form: Organization Name, Slug (with pattern validation), Description, "Create" / "Cancel" buttons
- Empty state: "No organizations yet"

**What users expect:**
- See all their orgs as cards
- Create new org → auto-select as current org → redirect to dashboard
- Click org card → select as current org

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| Orgs page loads | ✅ Exists in `orgs-management.spec.ts` | |
| Create form toggles | ✅ Exists | |
| Can create org | ❌ Failing | Test fills form and submits but org creation fails — likely `createOrganization` service call error |
| Org cards visible | ✅ Exists | |
| Click org card → selects org | ❌ Failing | Card click doesn't navigate or set org |

**Fixes needed:**
- `orgs-management.spec.ts:36` (create org): The `createOrganization` call signature was fixed (4 args) but may still have issues. Check if form submission actually triggers the service call. The test may need to wait for the redirect after form submit
- `orgs-management.spec.ts` (card click): Org card click should navigate to `/orgs?id={id}` which triggers org selection. Test may need to wait for navigation

---

### Invite `/invite?token={token}`

**What it has:**
- Multiple states: loading, invalid, expired, error, accepted, valid (logged in/out)
- "Accept Invitation" button (logged in)
- "Sign in" button (logged out)

**What users expect:**
- Click invite link → see org name → accept → join org

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| Invalid token shows error | ❌ Missing | |
| Expired token shows error | ❌ Missing | |
| Valid token + logged out shows sign in | ❌ Missing | |
| Valid token + logged in shows accept | ❌ Missing | |

**Fixes needed:**
- Add `invite.spec.ts` tests (requires generating valid invite tokens)

---

## Admin

### Admin Dashboard `/admin`

**What it has:**
- Heading "System Admin"
- Stats: Organizations count, Users count, Members count, Recent Signups
- Links: Manage Organizations, Subscription Plans, Organization Subscriptions
- Access Denied state for non-admins

**What users expect:**
- See system-wide stats
- Navigate to admin sub-pages

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| Admin page loads | ✅ Exists in `admin.spec.ts` | |
| Stats visible | ✅ Exists | |
| Navigation links work | ✅ Exists | |
| Non-admin sees access denied | ✅ Exists | |

**Fixes needed:** None — well tested.

---

### Admin Organizations `/admin/orgs`

**What it has:**
- Heading "All Organizations"
- Table: Name, Slug, Members columns
- Access Denied for non-admins

**What users expect:**
- View all orgs in the system

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| Orgs table loads | ✅ Exists in `admin.spec.ts` | |
| Table shows org data | ✅ Exists | |

**Fixes needed:** None.

---

### Admin Plans `/admin/plans`

**What it has:**
- "<- Back to Admin" link
- Heading "Subscription Plans"
- "Create Plan" button → toggles form
- Create/Edit form: Name, Description, Price Monthly ($), Price Yearly ($), Features (comma-separated)
- Plans table: Name, Description, Monthly, Yearly, Features badges, Status badge, Edit/Activate/Deactivate buttons

**What users expect:**
- Create, edit, activate/deactivate plans
- See plan features as badges
- Form toggles open/close

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| Create Plan button opens form | ✅ Fixed | Root cause: `features` from DB returned as JSON string, `.map()` crashed |
| Cancel button closes form | ✅ Fixed | |
| Plans table shows seed plans | ✅ Fixed | |
| Edit and Activate/Deactivate buttons exist | ✅ Fixed | |
| Edit opens pre-filled form | ✅ Fixed | |
| Create plan submits | ✅ Fixed | |

**Fixes applied:**
- `normalizeFeatures()` utility added at `src/lib/normalizeFeatures.ts` — parses JSON string features to array
- Applied to: `admin/plans/page.tsx`, `BillingTab.tsx`, `useSubscription.ts`
- Non-admin users now see Access Denied instead of crash

---

### Admin Campaigns Review `/admin/campaigns`

**What it has:**
- Heading "Campaign Review Queue"
- Campaign list with titles, slugs, zakat badges
- Detail view: campaign info, Verification Notes textarea, "Verify & Publish" button, "Reject" button
- Feedback messages

**What users expect:**
- See pending campaigns
- Review and approve/reject with notes

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| Review queue loads | ✅ Exists in `admin.spec.ts` | |
| Empty state shows | ✅ Exists | |
| Can verify campaign | ❌ Missing | |
| Can reject campaign | ❌ Missing | |

**Fixes needed:**
- Add verify/reject tests (requires a pending campaign in test data)

---

### Admin Subscriptions `/admin/subscriptions`

**What it has:**
- "<- Back to Admin" link
- Heading "Organization Subscriptions"
- Table: Organization, Plan, Status, Period, Price, Renewal, Actions
- Actions: History button, Pause/Unpause buttons
- Billing History panel: Date, Action, Plan, Amount, Status, Notes

**What users expect:**
- View all subscriptions
- Pause/unpause subscriptions
- View billing history

**Tests needed:**
| Test | Status | Notes |
|------|--------|-------|
| Subscriptions table loads | ✅ Exists in `subscription.spec.ts` | |
| Table shows subscription data | ✅ Exists | |
| History button works | ❌ Missing | |
| Pause/Unpause works | ❌ Missing | |

**Fixes needed:**
- `subscription.spec.ts:79` (plans page loads): Failing — likely same admin auth issue. Check if test navigates to the right URL
- Add history/pause tests

---

## Summary of All Failures

| # | Test File | Test | Root Cause | Fix |
|---|-----------|------|------------|-----|
| 1 | `admin-management.spec.ts` | Create Plan button opens form | Admin auth gate failing under load OR `showCreate` toggle broken | Add retries, verify admin check |
| 2 | `admin-management.spec.ts` | Cancel closes form | Same as #1 | Same |
| 3 | `admin-management.spec.ts` | Plans table shows seed plans | Same as #1 | Same |
| 4 | `admin-management.spec.ts` | Edit/Deactivate buttons exist | Same as #1 | Same |
| 5 | `admin-management.spec.ts` | Edit opens pre-filled form | Same as #1 | Same |
| 6 | `admin-management.spec.ts` | Create plan submits | Same as #1 | Same |
| 7 | `auth.spec.ts` | Login with valid credentials | Supabase rate limiting under parallel load | Add `retries: 1` |
| 8 | `auth.spec.ts` | Reset password back to login | Same rate limiting | Same |
| 9 | `dashboard-campaigns.spec.ts` | Campaign form shows all fields | Test navigates to list page, not form page | Fix navigation to `/dashboard/campaigns/new` |
| 10 | `dashboard-campaigns.spec.ts` | Edit link navigates | Campaign not in draft status | Check status or create draft in setup |
| 11 | `dashboard-campaigns.spec.ts` | Submit for Review shows | Same as #10 | Same |
| 12 | `dashboard.spec.ts` | Profile link navigates | Dashboard has no nav component | Navigate via DashboardCards link or directly |
| 13 | `dashboard.spec.ts` | Sign out from dashboard | Dashboard has no nav component | Test on page with nav, or test auth state |
| 14 | `orgs-management.spec.ts` | Can create org | Form submit may not trigger service call | Wait for redirect, verify org created |
| 15 | `profile.spec.ts` | Profile link from dashboard | Dashboard has no nav component | Navigate directly to /profile |
| 16 | `subscription.spec.ts` | Plans page loads | Admin auth gate failing | Add retries |

---

## Priority Fix Order

1. **Add `retries: 1`** to `playwright.config.ts` — fixes auth rate limiting (tests 7, 8, 16, possibly 1-6)
2. **Fix admin-management tests** — verify admin auth works, check if "Create Plan" button selector is correct
3. **Fix dashboard.spec.ts** — remove nav-based tests, use DashboardCards links or direct navigation
4. **Fix profile.spec.ts** — remove nav-based test, navigate directly
5. **Fix dashboard-campaigns.spec.ts** — separate list tests from form tests, fix campaign status assumptions
6. **Fix orgs-management.spec.ts** — verify form submit triggers correct service call
7. **Add missing tests** — about, privacy, campaign detail, invite, new campaign form, edit campaign form
