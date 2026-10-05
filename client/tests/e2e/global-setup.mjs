import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

/**
 * Playwright globalSetup: guarantees the e2e suite's required seed data exists
 * before any test (or the auth.setup project) runs.
 *
 * `supabase/seed-auth.sh` is idempotent (ON CONFLICT DO NOTHING, create_user
 * tolerates existing accounts), so re-running it every suite is safe and will
 * not wipe or duplicate data. It only creates what is missing.
 *
 * Skippable with SKIP_E2E_SEED=1 when the environment already provisions data
 * (e.g. a fresh `supabase db reset && ./supabase/seed-auth.sh` was run manually,
 * or CI seeds differently).
 */
export default async function globalSetup() {
  if (process.env.SKIP_E2E_SEED === '1') {
    console.log('[e2e global-setup] SKIP_E2E_SEED set — assuming seed data present')
    return
  }

  const here = dirname(fileURLToPath(import.meta.url))
  const seedScript = resolve(here, '../../../supabase/seed-auth.sh')

  if (!existsSync(seedScript)) {
    throw new Error(`[e2e global-setup] seed script not found at ${seedScript}`)
  }

  console.log('[e2e global-setup] ensuring e2e seed data (supabase/seed-auth.sh)...')
  try {
    execSync(`bash "${seedScript}"`, {
      stdio: 'inherit',
      // Inherit the environment so SUPABASE_API_URL / supabase CLI are found.
    })
  } catch (err) {
    throw new Error(
      '[e2e global-setup] seeding failed — is local Supabase running and the CLI on PATH? ' +
        'Underlying error: ' +
        (err instanceof Error ? err.message : String(err))
    )
  }
  console.log('[e2e global-setup] seed data ensured')
}
