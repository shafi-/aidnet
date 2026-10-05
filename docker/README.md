# docker/ — shared local Supabase stack (custom compose)

One hand-authored docker compose stack serving **all products** from a single
Supabase backend — one database, one auth, one API gateway. This is the local
mirror of the multi-product strategy: schema-per-product, shared `auth.users`
and shared profile data, all through one URL.

This replaces `supabase start` for local development. No Supabase CLI needed
to run it (the CLI remains useful for `gen types`, `db dump`, and scratch
experiments on other ports).

## Services & ports

Ports follow the repo's local-testing offset profile (`supabase/config.toml`):
55321/55322/55323/55324, so nothing in `client/.env.local` or
`supabase/seed-auth.sh` changes when switching between this stack and a CLI
stack (run one OR the other — they share ports).

| Port  | Service              | Notes                                        |
|-------|----------------------|----------------------------------------------|
| 55321 | Kong gateway         | `/rest/v1`, `/auth/v1`, `/storage/v1`        |
| 55322 | Postgres (supabase/postgres:17) | `postgresql://postgres:postgres@127.0.0.1:55322/postgres` |
| 55323 | Studio               | SQL editor, table browser across all schemas |
| 55324 | Inbucket web UI      | All auth emails from all products, one inbox |
| 55325 | Inbucket SMTP        | (GoTrue delivers here internally)            |

Not included (add back when a product needs them): realtime, edge-runtime,
pooler (supavisor), logflare/analytics, imgproxy.

## Usage

```sh
sh docker/bootstrap.sh          # up + migrations + seed.sql + seed-auth.sh (idempotent)
sh docker/bootstrap.sh --fresh  # wipe db volume + storage first, then full seed

docker compose -f docker/docker-compose.yml down      # stop
docker compose -f docker/docker-compose.yml logs -f   # logs
```

Then run the client:

```sh
cd client && pnpm dev                 # http://localhost:3000
# or, to mirror e2e conditions (static export):
cd client && pnpm build && pnpm exec serve out -l 3000
```

Seeded logins (all products, one credential store):
`admin@donate.app`, `owner@donate.app`, `member@donate.app` — `Password123!`.

## How the multi-product part works

- **One credential store**: every product authenticates against the same
  GoTrue (`auth.users`). "Is this user already one of ours?" is inherently
  true across products; a shared `profiles` row follows `auth.users.id`.
- **Schema per product**: each product repo owns a Postgres schema and pushes
  only it. Donate's objects live in the `donate` schema (the only API-exposed
  schema); the `shared` data layer (`shared.profiles`) is reachable only
  through SECURITY DEFINER product functions. To add a product, list its
  schema in `PGRST_DB_SCHEMAS` (docker/.env) and run
  `docker compose up -d rest studio`.
- **Per-repo migrations**: `bootstrap.sh` applies `supabase/migrations/*.sql`
  in order, tracked in the `local_migrations` ledger table (like
  `supabase db push`). When a product moves to its own migration tool
  (sqitch/flyway with a per-schema history table), it points at
  `127.0.0.1:55322` and this ledger is retired.
- **Reset semantics**: `bootstrap.sh --fresh` wipes everything. To reset only
  one product later: `DROP SCHEMA <product> CASCADE` (+ its history table),
  then re-apply that product's stream — auth users and shared data survive.

## Security notes

- `docker/.env` holds **local-only demo secrets** (JWT secret, HS256 keys,
  postgres password). Never reuse them in a hosted project.
- Add `docker/volumes/db/data/` and `docker/volumes/storage/` are gitignored
  (live database + uploaded files).
