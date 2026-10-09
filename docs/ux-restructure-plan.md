# UX Restructure Plan — content hierarchy & information priority

Status: approved direction (2026-10-09). Companion to `DESIGN.md` (look &
feel law) — this document governs the **information architecture**: what
lives where, at which depth, and in what priority order. `AGENTS.md`
architecture laws (static export, stateless components, function-first
data, i18n en/bn) are unchanged.

Evidence base: the local audit walkthrough (screenshots in
`.temp/ux-audit/`, gitignored) plus two owner observations:

1. **Content hierarchy is broken** — tabs inside tabs, 3–4 content layers
   stacked in the same UI.
2. **Information priority is inverted** — the UI shows trivia while the
   actions and numbers users actually need are missing or buried.

---

## 1. Diagnosis (concrete)

### Hierarchy

- `/dashboard` stacks four levels on one page: page cards (Welcome /
  Get-started / Quick Stats / My Organizations / Profile / Security) →
  the org workspace section → tabs (Members · Settings · Donations ·
  Billing) → a second tab row inside Members (Members / Pending
  Invites). The org name appears twice on the same screen, and the nav's
  "Organizations" dropdown duplicates the My Organizations card.
- Admin navigation is split across three places: the nav dropdown
  (3 destinations), the Admin home link list (3 *different*
  destinations), and per-page back-links ("Admin Home" vs
  "← Back to Admin").
- The campaign form is the inverse failure: zero hierarchy — ten
  undifferentiated sections in one column, save button only at the end.

### Priority

- The dashboard leads with trivia ("Welcome back!", an always-on
  get-started card aimed at users with *no org*, two static counts) and
  buries the work: donation confirmations are the third tab and require
  picking a campaign from a `<select>` before anything renders. An
  owner's questions — *what needs my confirmation? how much was raised?
  what is still draft?* — have no answer on screen.
- Campaign rows show title/slug/status but not raised-vs-goal, pending
  report counts, or dates.
- Admin home shows (silently failing) stat cards and a link list instead
  of the review queues that are the actual job.
- Noise: redundant "Goal: X" chip under a progress bar that already says
  "N% of X BDT" (removed in Phase 0), duplicate org names on cards,
  twelve identical "View campaign →" links.
- Missing: copy buttons on payment numbers, org description in the
  request-review modal, verification badge on public org profiles.

---

## 2. Target information architecture

### Two shells

- **Public** (`/`, `/campaigns`, `/campaigns/detail`, `/orgs/public`,
  auth pages): keeps the current top navbar + footer.
- **Console** (`/dashboard/*`, `/admin/*`): a persistent left sidebar —
  org switcher pinned on top (workspace) or section nav (admin); top
  navbar collapses to brand + account. Sidebar sections are **routes**,
  one level deep: deep-linkable, back-button friendly, and no nested
  tabs anywhere. (Lighter alternative if the top-nav shell must stay: a
  secondary horizontal section bar under the navbar.)

### Workspace routes

| Route | Answers | Content |
|---|---|---|
| `/dashboard` | "What needs me?" | Pending donation reports with inline confirm/reject; counts (pending confirmations, drafts awaiting submission, total raised); recent activity feed |
| `/dashboard/campaigns` | "How are they doing?" | Current list + raised/goal/progress, pending-report badge, dates, search + status filter |
| `/dashboard/donations` | "Who gave?" | Cross-campaign by default (`list_org_donation_reports`), campaign filter chips, pending queue + confirmed history |
| `/dashboard/members` | "Who is on the team?" | One table: active members **and** pending invites together (status badges, inline actions) — sub-tabs deleted |
| `/dashboard/billing` | "What do we pay?" | Current plan + renewal, plan grid |
| `/dashboard/settings` | "How is it configured?" | Org name/slug/description; profile & password move to `/profile` (account-level), linked from the account menu |

### Admin console

Same shell; sidebar sections: Overview / Campaign review / Org requests /
Organizations / Plans / Subscriptions. The nav "Admin" dropdown collapses
to a single link. Admin **Overview leads with the queues** (pending org
requests N, pending campaigns N — each a link), stats demoted below; a
failed stats load shows an error + retry (Phase 0 fixed the silent
variant). The request-review modal must show the org description.

### Kill list / add list

Kill: Welcome-back card, always-on get-started card (becomes contextual
empty states), Quick Stats as-is, Profile/Security cards on the
dashboard, the goal chip (done), duplicate org names, repeated
"View campaign →".
Add: pending-confirmation counts wherever campaigns appear, copy buttons
on payment numbers (done), raised/goal on cards and rows, org
description in review modals, verified badge on public org profiles,
proof points (total raised, org count) on the landing hero.
Campaign form: grouped sections (Basics / Story / Goal & dates /
Payouts) with a sticky save bar.

---

## 3. Responsive behavior (mobile)

The console shell inverts gracefully — **same hierarchy rules, no
nested tabs anywhere**:

- **Shell**: compact top bar (brand, **org switcher chip always
  visible**, account avatar, hamburger). The sidebar becomes a right
  slide-in drawer reusing `MobileDrawer` mechanics (focus trap, Escape,
  scroll lock), sections first, marketing links + account in a footer
  group. A bottom tab bar is the upgrade path if mobile usage becomes
  primary (6 sections don't fit; "More" buckets recreate hidden
  hierarchies).
- **Pages**: single-column stacks in priority order — attention queue
  first with inline ≥44px touch targets (DESIGN.md §2.6), stats as a
  2-up grid, activity feed last. No accordions (hiding content is the
  sin being fixed).
- **Tables become cards** on small screens: title, status badge, and the
  numbers that matter; row actions behind a "…" dropdown (Radix menu).
  Same component, responsive variant — not two implementations. This is
  also the fix for the desktop-only admin tables found in the audit.
- **Forms**: grouped sections stack; the sticky save bar keeps the
  primary action in reach.
- Public donor pages already stack well (audited); they only inherit the
  content fixes.

---

## 4. Data layer (function-first)

New RPCs (migration `20261009120000_org_workspace_overview.sql`,
applied; SECURITY DEFINER, pinned search_path, `can_perform` gates,
paired REVOKE FROM PUBLIC,anon / GRANT TO authenticated):

- `list_org_donation_reports(p_org_id, p_status, p_limit)` →
  `OrgDonationReport[]` (report + `campaign_id` + `campaign_title`),
  cross-campaign, newest first.
- `get_org_overview(p_org_id)` → single `OrgOverview` row (pending
  reports, confirmed donations, raised total, live/pending/draft
  campaign counts).

Client wiring shipped with it: regenerated `database.ts`; names
registered in `types/rpc.ts` (`DonationReport.ListForOrg`,
`Org.Overview`); `OrgDonationReport` / `OrgOverview` types; repository
methods (`DonationReportRepository.listForOrg`,
`OrganizationRepository.getOverview`); service methods (overview
unwraps the single RETURNS TABLE row); repo + service unit specs.

Possibly later: `get_org_activity(org_id)` for the activity feed.

---

## 5. Rollout

- **Phase 0 — quick wins (done)**: members-tab refetch loop fix
  (stabilized `usePermissions` predicates), nav longest-match active
  state (`isNavLinkActive`), goal chip removal, payment copy buttons,
  admin stats error + retry.
- **Phase 1 — primitives** (`components/ui`, per DESIGN.md §4) plus
  console-shell pieces: `ConsoleShell`/Sidebar, `PageHeader`, `StatCard`,
  `ActivityList`, `SegmentedControl`. Console pieces shipped with 3A
  (`ConsoleShell`, `PageHeader`, `StatCard`, `OrgSwitcher`,
  `NoOrgOnboarding`); the remaining `components/ui` primitives stay with
  3B.
- **Phase 2 — feedback layer**: Toast provider, content-shaped
  skeletons, ConfirmDialog replacing `window.confirm`.
- **Phase 3A — IA restructure (done)**: DB groundwork (done) → console
  shell (done) → route split `/dashboard/{donations,members,billing,
  settings}` (done) → members/invites merge (done) → admin shell with
  queues-first overview and a single nav Admin link (done). `ROUTE_ACCESS`
  needed no changes (`/dashboard` + `/admin` prefixes cover the new
  routes); e2e updated in the same commits; copy in en + bn.
- **Phase 3B — restyle surfaces** (DESIGN.md §6 order: marketing → auth
  → workspace → admin), now styling the *new* structure.
- **Phase 4 — polish**: branded 404, OG image, PNG icon set,
  reduced-motion + touch-target audit, dead-dependency cleanup.
- **DESIGN.md is amended alongside 3A** (§4 inventory, §5.1 shell,
  §5.4–5.6 page plans) so the design law matches the new structure.

**DoD per phase** (AGENTS.md + DESIGN.md §6): tsc, lint, prettier, unit
suite green; `playwright test --list` parses; touched pages' e2e pass
against the seeded stack; zero new raw-palette classes outside
`components/ui`; no new `dark:` usage; i18n complete in both locales.
