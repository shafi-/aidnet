# Test Creation Guideline

Testing conventions for the `donate` client (static-export NextJS + Supabase).
Two tiers: **unit** (Vitest, colocated) and **e2e** (Playwright, `client/tests/e2e/`).

The database is the real security boundary: DB functions enforce authorization
(`SECURITY DEFINER` + deny-all RLS). Client-side checks and naming are UX and
organization only — never treat them as security.

---

## 1. Architecture laws (read before writing any test)

These rules define what the code under test must look like. If a test fights
these laws, the _code_ is wrong, not the test.

1. **One repository per entity.** Every RPC call lives in a repository class
   extending `BaseRepository`. Services never call `callRpc`.
2. **Services orchestrate only.** They receive repositories via constructor
   injection with singleton defaults:
   ```ts
   export class TodoService {
     constructor(private todoRepo: TodoRepository = new TodoRepository()) {}
   }
   export const todoService = new TodoService() // composition root — keep stable
   ```
   The exported singletons are the default composition root; do not remove them.
3. **Audience naming.** `System*` = system-admin-only operations.
   `Org*` / plain names = org-owner/member-facing. The prefix `Admin` alone is
   banned (ambiguous between system admin and org admin).
4. **Route access is declared centrally** in one map consumed by the layout
   evaluator; pages must not hand-roll their own redirect logic.

## 2. Tier 1 — Unit tests (Vitest)

- Colocated next to source: `src/services/TodoService.test.ts`,
  `src/repositories/TodoRepository.test.ts`.
- **What to test per layer:**
  - Service: correct repo called with expected args, passthrough or
    transformation of results, error propagation (`ServiceData` error shape).
  - Repository: exact RPC function name + params object, via the fake RPC
    client from `src/testing/`.
- **Mocks:** use `src/testing/mockRpcClient.ts` (route table keyed by RPC
  function name; records calls; loud-fails on unregistered calls) and typed
  repo mocks. Never stub network or Supabase internals directly.
- **Fixtures** must be compile-checked against generated types:
  ```ts
  type RpcReturn<F extends DbFunction> =
    Database['public']['Functions'][F]['Returns']
  ```
  A schema change that breaks a fixture is a test failure, not silent drift.
- Run: `pnpm test:unit:ci` (CI mode) / `pnpm test:unit` (watch).

## 3. Tier 2 — E2E tests (Playwright)

### File organization — each page owns its behavior

- One spec per page/feature: `<feature>.spec.ts`.
- A page's spec contains ALL behavior for that page — content AND outgoing
  navigation. Do not split page navigation into a shared file.
- No cross-file duplicate scenarios: a link `A → B` is tested once, in
  `A.spec.ts`.

### Naming (Given / When / Then)

```
When <condition>, <action> → <expect>
When <action>, <expected>
```

### Assertions — real outcomes, never tautological

- Assert URLs, rendered text, persisted state (reload to prove saves).
- No CSS-class state assertions; no self-equal values.
- Redirects assert the expected target.
- Data-dependent tests: assert section renders, then early-return if empty;
  `test.fail()` only marks a known unmet precondition.

### API-contract assertions alongside UI

For UI backed by an RPC, assert the contract too via `lib/api.ts`
(`signIn`, `anonRpc`, `rpc`, `getPublicCampaigns`, …), guarded by
`test.skip(!SUPABASE_URL, ...)`.

### Seed data

- `global-setup.mjs` runs `supabase/seed-auth.sh` (idempotent) before the
  `setup` project: demo org + active Pro subscription + 14 campaigns.
- Rely ONLY on seeded data; users:
  `admin@donate.app`, `owner@donate.app`, `member@donate.app`
  (`Password123!`).

### Authentication strategy

- Cached storage states from the `setup` project
  (`tests/e2e/.auth/{systemAdmin,orgOwner,orgMember}.json`) — regenerated each
  run, gitignored.
- Scope state to a describe so anon tests stay anon; auth-flow specs log in via
  UI and never reuse cached state.

## 4. Checklist before adding a test

1. Correct layer? (repo arg-mapping → unit repo spec; orchestration → unit service spec; user journey → e2e)
2. Unit: fixture typed via `RpcReturn<F>`? mock registered for every RPC hit?
3. E2E: correct owning page spec? Given/When/Then title? Real outcome asserted?
4. Scenario duplicated anywhere? Consolidate into the owner.
5. Backend-backed e2e has env-guarded API assertion?
6. Auth-scoped correctly?
7. Passes prettier + lint (pre-commit enforces staged files).

## Templates

Unit:

```ts
import { describe, expect, it, vi } from 'vitest'
import { TodoService } from './TodoService'
import { todoRepoFixture } from '@/testing/fixtures'

const makeRepo = () => ({
  createTodo: vi
    .fn()
    .mockResolvedValue({ data: todoRepoFixture.create, error: null }),
})

describe('TodoService', () => {
  it('createTodo delegates with mapped args', async () => {
    const repo = makeRepo()
    const svc = new TodoService(repo as never)
    await svc.createTodo('org-1', 'Title')
    expect(repo.createTodo).toHaveBeenCalledWith('org-1', 'Title', null)
  })
})
```

E2E:

```ts
import { test, expect } from '@playwright/test'

test.describe('Feature Page', () => {
  test('When anon loads page, key content renders', async ({ page }) => {
    await page.goto('/feature/')
    await expect(page.locator('h1')).toContainText('Feature')
  })
})
```
