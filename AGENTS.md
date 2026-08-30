# AGENTS.md — Operating Rules for AI Agents

You are working on **donate**: a static-export NextJS client backed by Supabase
(PostgreSQL functions + Auth + Edge Functions). Read this file fully before
changing anything. Canonical companions:

- `CLAUDE.md` — architecture overview and directory map
- `supabase/README.md` — database architecture philosophy
- `client/tests/test-creation-guideline.md` — testing law (both tiers)

---

## 1. Hard laws (violating these breaks the project)

### Workspace hygiene
- **NEVER use `/tmp` for any file.** All scratch/diagnostic/temp files go in
  `.temp/` at the repo root (create with `mkdir -p .temp` if missing). `/tmp`
  is OFF-LIMITS — agents that reach for it cause cross-session file leakage and
  confuse the user. Add `.temp/` to `.gitignore` (already done).
- Diagnostic Playwright specs, throwaway scripts, curl output captures, etc. all
  live in `.temp/`. If a tool call would write to `/tmp`, STOP and use `.temp/`.

### Data access
- **Function-first**: ALL reads/writes go through PostgreSQL functions called via
  RPC (`this.callRpc(Rpc.X.Y, params)`). NEVER query tables with `.from()` from
  client code. There is always (or should be) a function — if missing, write a
  migration.
- **One repository per entity** in `client/src/repositories/`, extending
  `BaseRepository`. Every `callRpc` lives there. Services NEVER call `callRpc`.
- **RPC function names are a repository-layer secret.** Only repositories know
  them: a service calls a domain method (`todoRepo.getTodos(orgId)`), the
  repository translates it to the actual function
  (`callRpc(Rpc.Todo.GetMany, ...)`). Services, hooks, containers and components
  must not import `Rpc` or reference `'fn_name'` strings — if they seem to need
  to, the repository is missing a method.
- **Services are thin orchestration**: constructor injection with singleton
  defaults —
  ```ts
  export class TodoService {
    constructor(private todoRepo: TodoRepository = new TodoRepository()) {}
  }
  export const todoService = new TodoService() // composition root: keep stable
  ```
- **Naming by audience**: `System*` = system-admin-only operations,
  `Org*`/plain = org-owner/member-facing. The prefix `Admin` alone is banned
  (ambiguous vs org admins).
- **RPC names are type-checked**: add names only in `client/src/types/rpc.ts`
  with `satisfies DbFunction` — and consume them ONLY from repositories. After
  schema changes regenerate:
  `supabase gen types typescript > client/src/types/database.ts`.

### Security layering (do not blur these)
1. **Database functions are THE authorization boundary** (`SECURITY DEFINER` +
   deny-all RLS + role checks inside each function). Any new function must
   implement its own authorization check.
2. Client-side access control is UX only:
   - Route gating lives ONLY in `client/src/lib/routeAccess.ts`
     (`ROUTE_ACCESS`: public / authenticated / systemAdmin, fail-closed) enforced
     by `RouteAccessGuard` in the root layout. Pages must not hand-roll
     redirect/deny logic.
   - Role checks via `useSystemAdmin()`, `usePermissions()`, `useRequireAuth()`.
3. NEVER treat client checks as security, and never bypass DB functions as a
   "quick fix".

### Frontend constraints (static export)
- No server components, no NextJS API routes, no `[param]` dynamic segments.
  Use query params: `/orgs?id=xxx`, validated via `useRequiredParam(key)` +
  `isUuid()` / `isInviteToken()`.
- Components are stateless: props in, callbacks out. Only containers touch
  services. All state lives in containers/hooks/providers.
- Auth is edge-function-based (sign-up/sign-in/reset), centralized in the auth
  provider — not NextJS auth.

---

## 2. Testing law (summary — full text in test-creation-guideline.md)

Two tiers. Write the cheaper tier that catches the bug.

**Unit (Vitest, colocated `*.test.ts`)** — default choice:
- Repo specs: assert exact RPC function name + params via
  `createMockRpcGateway` from `client/src/testing/mockRpcClient.ts`
  (route table keyed by function name; loud-fails on unregistered calls).
- Service specs: mock repos via `mockRepository<T>({ ... })`; assert delegation,
  unwrapping transforms, error propagation.
- Fixtures from `client/src/testing/fixtures.ts`, typed against `@/types`;
  prefer `RpcReturn<'fn_name'>` so schema changes break the fixture loudly.
- Run: `pnpm test:unit:ci`. Dummy Supabase env comes from `vitest.config.ts`
  (lib/supabase validates env at import time; unit tests never hit network).

**E2E (Playwright)** — user journeys only:
- A page's spec owns ALL its behavior including outgoing navigation. A link
  `A → B` is tested once, in `A.spec.ts`. No cross-file duplicates.
- Titles: `When <condition>, <action>` (Given/When/Then).
- Assert real outcomes (URLs, visible text, persistence-after-reload). Never
  CSS-class state assertions.
- Backend-backed UI gets an env-guarded API-contract assertion via
  `tests/e2e/lib/api.ts` helpers (`test.skip(!SUPABASE_URL, ...)`).
- Seed data is guaranteed by `global-setup.mjs` → `supabase/seed-auth.sh`
  (idempotent). Rely only on seeded users/data. Skip with `SKIP_E2E_SEED=1`.
- Auth: feature tests reuse cached storage states (`tests/e2e/.auth/*.json`,
  regenerated per run, gitignored — NEVER commit); auth-flow tests log in via UI.
- Seeded logins: `admin@donate.app`, `owner@donate.app`, `member@donate.app`
  (`Password123!`).

**Definition of done for any change**: `tsc --noEmit` clean · `next lint` clean ·
`prettier --check` clean · unit suite green · (if routes/pages touched)
`playwright test --list` still parses. Pre-commit hook enforces lint+prettier on
staged client files.

CI runs format/lint/typecheck/unit only — e2e requires a locally seeded
Supabase (`supabase start && supabase db reset && ./supabase/seed-auth.sh`),
so run e2e manually before merging UI changes.

---

## 3. Recipes

**Add a DB operation**
1. Migration: `supabase migration new <name>` → `CREATE OR REPLACE FUNCTION`
   with authorization checks, `SECURITY DEFINER`, structured return (prefer
   views).
2. Test locally: `supabase db reset`, then `psql` the function.
3. Regenerate types; register the name under the right audience group in
   `types/rpc.ts`.
4. Add method to the entity repository (map params verbatim).
5. Expose via service if orchestration/transform needed; wire container.

**Add a page**
1. Classify the route ONCE in `ROUTE_ACCESS` (fail-closed default).
2. Container fetches via service(s); components stay stateless.
3. Unit-test service logic; e2e spec owned by that page (GWT naming).
4. Static-export-safe URLs only (query params, trailing-slash consistent).

**Extend an entity**
1. New columns/functions → migration + regenerated `database.ts`.
2. Update the entity's repository + fixtures; adjust `RpcReturn` usage.
3. If audience differs from current naming (System vs Org), split the
   repository/service — do not grow mixed-audience classes.

---

## 4. Known gotchas

- `global-setup` must stay `.mjs`: Node loads it as CJS otherwise and
  `import.meta` crashes.
- `RETURNS TABLE(...)` functions arrive wrapped in an array via PostgREST;
  repositories return raw rows, services unwrap `[0] ?? null`.
- macOS bash 3.2: no `mapfile`; scripts must be portable.
- `tests/e2e/.auth/*.json` hold live session tokens — gitignored, never commit.
- Vitest needs the dummy env in `vitest.config.ts`; removing it breaks all
  spec collection (module-load throw from `lib/supabase`).
- After editing seeds, `supabase db reset` wipes data — re-run
  `./supabase/seed-auth.sh` (global-setup does this automatically per run).
- Temp files go in `.temp/` (repo root), NOT `/tmp` — see Hard Law above.
  Create it if missing: `mkdir -p .temp`. Add `.temp/` to `.gitignore`.

## 5. Change discipline

- Atomic commits: one logical concern per commit, conventional messages
  (`feat|fix|refactor|test|docs|chore(scope): summary`).
- Behavior-preserving refactors land separately from behavior changes.
- Commit only what was asked; never amend pushed history; push/PR only on
  explicit request.
