# DESIGN.md — AidNet Design System

The design law for the AidNet client. `AGENTS.md` governs architecture (stateless
components, function-first data, static export); this file governs how the
product **looks and behaves**. Every new or touched UI file must comply.

**Root cause of the current "basic" look:** the app has three competing accent
blues (`bg-primary` = blue, pages hardcode `indigo-600`, `Loading` uses
`blue-600`), ad-hoc grays, no elevation or density system, and no brand
personality. The fix is not "more decoration" — it is **one token set, applied
everywhere, with a small set of well-made primitives**.

---

## 1. Brand

- **Name:** AidNet — a network of aid.
- **Personality:** trustworthy, warm, modern. A giving platform must feel like a
  bank-grade tool *and* a charity poster at the same time: calm surfaces,
  precise typography, brand warmth reserved for moments that matter (hero,
  auth, donation completion).
- **Brand mark:** a heart carrying three connected network nodes, on an
  indigo→violet gradient tile. Already shipped as the favicon
  (`client/src/app/icon.svg`). Logo usage: ≥24px with clear space equal to the
  mark's radius; white variant for gradient/dark surfaces; never recolor the
  nodes.
- **Voice:** plain, hopeful, concrete. Buttons say what they do ("Create
  campaign", not "Submit"). Errors say what to do next.

## 2. Theme tokens

**Single source of truth: `client/src/app/globals.css` (HSL CSS variables) →
exposed through `tailwind.config.ts` as semantic utilities** (`bg-primary`,
`text-muted-foreground`, `border-border`, …). This layer already exists — it
was simply never given real values or enforced.

> **Hard rule:** raw palette classes (`text-gray-600`, `bg-indigo-600`,
> `border-red-500`) are allowed ONLY inside `components/ui/*` primitives.
> Pages, containers and feature components use semantic classes exclusively.
> (Existing violations migrate per the plan in §6.)

### 2.1 Color

| Token | Value (HSL) | Approx | Used for |
|---|---|---|---|
| `--primary` | `243 75% 59%` | indigo-600 | CTAs, active nav, links, focus ring |
| `--primary-foreground` | `0 0% 100%` | white | text on primary |
| `--ring` | `243 75% 59%` | indigo-600 | focus-visible rings |
| `--background` | `0 0% 100%` | white | page canvas |
| `--foreground` | `224 71% 4%` | slate-950 | body text |
| `--card` / `--card-foreground` | `0 0% 100%` / `224 71% 4%` | — | card surfaces |
| `--muted` | `210 40% 96%` | gray-100 | secondary fills, table heads |
| `--muted-foreground` | `215 16% 47%` | gray-500 | secondary text, captions |
| `--secondary` / `--accent` | `210 40% 96%` | gray-100 | hover fills, subtle buttons |
| `--border` / `--input` | `214 32% 91%` | gray-200 | hairlines, input borders |
| `--destructive` | `0 72% 51%` | red-600 | destructive actions, errors |
| `--success` **(new)** | `161 94% 30%` | emerald-600 | active/verified states, toasts |
| `--warning` **(new)** | `35 95% 44%` | amber-600 | pending/attention states |
| `--info` **(new)** | `201 96% 40%` | sky-600 | informational notices |

`-foreground` pairs for success/warning/info: white on solid fills; the base
color for text on tinted (`X/10`) backgrounds.

**Gradient accent (brand moments only):** indigo-600 → violet-600
(`#4F46E5 → #7C3AED`, 135°). Allowed surfaces: landing hero, auth split panel,
donation-completion moment, the brand tile in the logo/favicon. Nowhere else —
gradients everywhere is what makes UIs feel cheap.

**Status mapping** (one meaning per color, app-wide):

| Status | Color |
|---|---|
| active, verified, completed, joined | success |
| pending, under review, invitation sent | warning |
| suspended, rejected, failed, expired | destructive |
| draft, archived, unknown | muted |

**Chart ramp** (dashboard/admin stats, in order): indigo-500, violet-500,
emerald-500, amber-500, sky-500.

### 2.2 Typography

Already wired correctly: Inter (latin) + Noto Sans Bengali via `next/font`,
self-hosted at build time — zero cost, no runtime third-party requests. Do not
add another font.

| Role | Size/line | Class | Notes |
|---|---|---|---|
| Display | 36/40 bold | `text-4xl font-bold tracking-tight` | landing hero only |
| H1 | 30/36 bold | `text-3xl font-bold tracking-tight` | page titles |
| H2 | 24/32 semibold | `text-2xl font-semibold` | section titles |
| H3 | 20/28 semibold | `text-xl font-semibold` | card titles |
| Body L | 18/28 | `text-lg` | subtitles, lede |
| Body | 16/24 | `text-base` | forms, content |
| Small | 14/20 | `text-sm` | nav, secondary text, tables |
| Caption | 12/16 | `text-xs` | badges, meta |

Bengali: add a `:lang(bn) { line-height adjustments }` base rule (Bengali
script needs ~1.7 body line-height); never shrink Bengali text below 14px.

### 2.3 Radii, elevation, spacing

- **Radius:** `--radius: 0.5rem` stays. Cards `rounded-lg`, buttons/inputs
  `rounded-md`, badges/menu items `rounded`, pills `rounded-full`.
- **Elevation (add to `boxShadow`):**
  - `shadow-sm` — cards, table rows on hover: `0 1px 2px rgb(17 24 39 / 0.06)`
  - `shadow-md` — dropdowns, popovers: `0 10px 15px -3px rgb(17 24 39 / 0.10), 0 4px 6px -4px rgb(17 24 39 / 0.10)`
  - `shadow-lg` — modals, the mobile drawer: `0 20px 40px -12px rgb(17 24 39 / 0.25)`
  - Cards = **border + shadow-sm**, never bare `shadow-md` blobs on gray.
- **Spacing:** 4px grid. App shell: `max-w-7xl px-4 sm:px-6 lg:px-8` (already in
  `AppLayout`). Card padding `p-6`; section rhythm `gap-6`/`gap-8`; page header
  to content `mt-6`.

### 2.4 Motion

150ms (hover/color) and 200ms (enter/exit), `ease-out`. Loading = skeleton
pulses shaped like the content, never blank screens. `prefers-reduced-motion`
disables non-essential animation. No autoplaying carousels.

### 2.5 Iconography & illustration

- **Icons:** `lucide-react` (MIT, tree-shaken) — 16px in menus/badges, 20px in
  nav/forms, 24px empty states; stroke-width 1.75. One icon set, no emoji in
  product chrome.
- **Illustration:** CSS gradients + simple inline SVG shapes only (zero-cost
  law). No stock-photo subscriptions, no external CDNs.

### 2.6 Accessibility (non-negotiable)

- WCAG AA: 4.5:1 body text, 3:1 large text and UI boundaries.
- Focus-visible ring everywhere (already global in `globals.css`) — never
  remove it.
- Touch targets ≥ 44px on mobile.
- Status is never color-only: badge = dot + text.
- The a11y patterns already in the codebase (`aria-current`, `aria-expanded`,
  `aria-controls`, labelled drawers/dialogs) are the standard — keep them.

### 2.7 Dark mode

The `.dark` token block exists; v1 ships **light-only**. Keep `.dark` values in
sync when tokens change so activation later is a `<html class="dark">` toggle,
not a migration.

## 3. Brand assets

| Asset | Status |
|---|---|
| Favicon `client/src/app/icon.svg` | ✅ shipped — heart + network mark on gradient tile; Next serves it via `<link rel="icon">`, static-export safe |
| 192/512 PNG + apple-touch icon | later, generated from the SVG when a PWA manifest lands |
| OG image 1200×630 | later (social sharing for campaigns) |

## 4. Component inventory (`components/ui` — the only home of raw palette classes)

| Component | File | Status | Plan |
|---|---|---|---|
| Button | `ui/button.tsx` | exists | keep cva API; fix `default` to primary token; add `loading` prop (spinner swaps label) |
| Input | `ui/input.tsx` | exists | drop raw grays → tokens; add `hint`; wrap in new `FormField` (label + control + error/hint + required mark) |
| Loading spinner | `ui/loading.tsx` | exists | recolor to `border-primary`; add `Skeleton` component for content-shaped loading |
| Card | new | — | `Card` + `CardHeader/Title/Content`; border + shadow-sm |
| Badge / StatusBadge | new | — | tinted bg + colored dot + label; maps §2.1 statuses |
| Alert | new | — | info/success/warning/destructive variants; **absorbs `EmailVerificationNotice`** styling |
| DropdownMenu | new | — | floating menu panel (nav Organizations/System/account); keyboard + Escape + outside-click |
| Avatar | new | — | initials circle (account menu, member lists) |
| Tabs | new | — | underline tabs for OrgDashboard (Members/Donations/Todos/Settings) |
| Dialog | new | — | modal shell; `ReportDonationDialog` adopts it |
| Progress | new | — | campaign goal bar (primary fill on muted track) |
| EmptyState | new | — | icon + title + body + action; one look everywhere |
| Table primitives | new | — | `Table`/`TH`/`TD` + toolbar; admin + dashboard lists |
| PageHeader | new | — | title + description + actions slot; standard page opener |
| StatCard | new | — | label + value + delta; dashboard/admin stats |

## 5. Page plan (route → container → components)

Architecture unchanged (AGENTS.md): `page.tsx` = container (state + services),
components stateless, copy in `en`/`bn`, query-param URLs. Design work per
route below. "Restyle" = swap raw classes for tokens/primitives, no behavior
change; e2e specs assert text/URLs, so restyles must keep copy stable or update
specs in the same commit.

### 5.1 Shell
| Piece | Files | Design action |
|---|---|---|
| Navbar | `layout/Nav.tsx` | the approved role-first preview: Dashboard/Admin-first for operators, `Discover` demoted, Organizations ▾ (context + request), account ▾ (Avatar + menu) replacing raw email, `whitespace-nowrap`, active underline |
| Mobile drawer | `layout/MobileDrawer.tsx` | grouped sections (Menu / System administration / Account), slide-in panel, shadow-lg |
| Footer | `layout/Footer.tsx` | 3-column link grid, muted, brand + tagline |
| App shell | `layout/AppLayout.tsx` | `bg-background` + optional tinted sections; keep max-w-7xl rhythm |
| Auth shell | `layout/AuthLayout.tsx` | split panel: gradient brand side (mark + tagline) / white form side |

### 5.2 Public / marketing
| Route | Container | Components | Design action |
|---|---|---|---|
| `/` | `app/page.tsx` | new `HeroSection`, `marketing/GetInvolved` (restyle), `CampaignCard` grid | hero w/ display type + gradient headline span + CTA pair; how-it-works (3 icons); featured campaigns |
| `/campaigns` | `app/campaigns/page.tsx` | `CampaignCard` (restyle), `EmptyState`, filter toolbar | responsive card grid; CampaignCard v2: image, status Badge, goal Progress, org-verified mark |
| `/campaigns/detail` | `app/campaigns/detail/page.tsx` | `Progress`, `Dialog` (ReportDonation), donate panel | hero image w/ gradient overlay, sticky donate card on desktop, org trust row |
| `/orgs`, `/orgs/public` | their pages | Table/Card toggle, `StatusBadge` | verified org marks, consistent empty states |
| `/about`, `/privacy`, `/terms`, `/contact` | pages | `PageHeader`, prose styles | typographic prose layout; contact form on `FormField` |

### 5.3 Auth (AuthLayout split panel)
| Route | Components | Design action |
|---|---|---|
| `/auth/login` | `EmailVerificationNotice` → Alert variant | token-styled card, primary button, link row |
| `/auth/register` | same + consent block | verification-required panel restyled via Alert |
| `/auth/reset-password` | — | check-your-email state via Alert/success |
| `/invite` | — | accept/decline states, org context card |

### 5.4 Dashboard (member)
| Route | Components | Design action |
|---|---|---|
| `/dashboard` | `DashboardCards`, `QuickStats` → `StatCard` | stat cards w/ tokens + chart ramp; activity list |
| `/dashboard/campaigns` | Table primitives, `EmptyState` | toolbar (search + New campaign), desktop table / mobile cards |
| `/dashboard/campaigns/new`, `/edit` | `CampaignForm` (restyle), `Turnstile` block | grouped `FormField` sections, sticky save bar |

### 5.5 Organization
| Piece | Components | Design action |
|---|---|---|
| Selector | `OrganizationSelector` → DropdownMenu + Avatar/org mark | current-org context, suspend event notice via Alert |
| Gate | `OrgGate` | EmptyState pattern (no org → request CTA) |
| Tabs | `OrgDashboard`, `MembersTab`, `DonationsTab`, `TodosTab`, `SettingsTab` | underline Tabs; tables on primitives; consistent row actions |

### 5.6 Admin (system) + misc
| Route | Design action |
|---|---|
| `/admin`, `/admin/campaigns`, `/admin/org-requests`, `/admin/orgs`, `/admin/plans`, `/admin/subscriptions` | shared admin pattern: PageHeader + StatCards + Table + StatusBadge + row actions; review queues get warning-tinted pending badges |
| `/org/request` | multi-section FormField form, success state |
| `/profile` | card layout, Avatar, sign-out zone |
| not-found | simple branded 404 (static-export friendly) |

## 6. Implementation phases

1. **Phase 0 — tokens (no visual break):** set §2.1 values in `globals.css`
   (incl. new success/warning/info), extend `tailwind.config.ts`
   (boxShadow scale, fontFamily → `var(--font-inter)`/`var(--font-bengali)`,
   fade/slide keyframes), `:lang(bn)` line-height rule. Existing semantic
   classes instantly become correct; hardcoded pages stay as-is until their pass.
2. **Phase 1 — primitives:** build §4 "new" list + fix existing three; unit
   tests per primitive (variants render, callbacks fire).
3. **Phase 2 — shell:** Navbar/MobileDrawer/Footer/AuthLayout per §5.1 (the
   approved preview becomes real `Nav.tsx`); e2e `navigation.spec.ts` updated
   in the same commit if link text changes.
4. **Phase 3 — surfaces:** marketing → auth → dashboard → org → admin, in that
   order (public trust first, internal density last). One surface group per
   commit; restyles are behavior-preserving.
5. **Phase 4 — polish:** skeletons everywhere, 404, OG image, PNG icon set.

**DoD per phase** (in addition to AGENTS.md): tsc + lint + prettier + unit
suite green; `playwright test --list` parses; any touched page's e2e still
passes against the seeded stack; all new copy in `en.json` + `bn.json`; zero
new raw-palette classes outside `components/ui`.

## 7. Laws (summary)

1. Semantic tokens only outside `components/ui`; primitives are the only place
   raw palette values live.
2. One meaning per color (§2.1 status mapping) — no ad-hoc red/green.
3. Gradient = brand moment only (§2.1); never decoration on functional UI.
4. All copy through i18n (en/bn); all new strings in both files.
5. Zero-cost: self-hosted fonts only (already done), no external CDNs, no paid
   asset services; icons via `lucide-react`, illustrations via SVG/CSS.
6. Static-export safe: no server components, no runtime third-party requests.
7. Accessibility patterns are part of the design, not a follow-up (§2.6).
