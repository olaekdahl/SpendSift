# Operations guide

## Scope

This guide operates the local fictional-data release. It does not approve a hosted deployment or real financial statements.

## Start and stop

From the repository root:

```bash
npm ci
npm run db:start
npm run dev
```

Open `http://localhost:3000`. Use Mailpit at `http://127.0.0.1:54324` for local confirmation and recovery email.

Inspect local service status without printing credentials into logs:

```bash
npm run db:status
```

Stop the application with `Ctrl+C`, then stop Supabase:

```bash
npm run db:stop
```

## Environment

Create `.env.local` from `.env.example`. Set:

- `APP_URL` to the exact application origin.
- `NEXT_PUBLIC_SUPABASE_URL` to the local `API_URL`.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the local `PUBLISHABLE_KEY`.

Leave `SUPABASE_SECRET_KEY` unset. The application uses the signed-in user's session and database authorization. Playwright resolves a local administrative key at test runtime only.

Never print `.env.local`, `supabase status -o env`, cookies, or database URLs into issue trackers or CI logs.

## Release verification

The full local release gate is destructive to local database contents because it runs `db:reset`:

```bash
npm run verify
```

It runs formatting, linting, strict typing, unit and component tests, a clean migration reset, application-schema linting, pgTAP, desktop and mobile Playwright, the production build, and production cache isolation.

Run dependency and secret checks separately:

```bash
npm audit
npm ls --all
```

Use an approved history-aware secret scanner before every release. The repository's generated browser state, exports, dumps, and financial formats are ignored by Git.

## Database lifecycle

Apply every migration to a disposable local database and regenerate types:

```bash
npm run db:reset
npm run db:lint
npm run db:test
npm run db:types
npm run typecheck
```

Commit migrations and generated `src/lib/supabase/database.types.ts` together. Never edit generated database types manually.

### Local backup

Use this procedure only for fictional local data. The `backups/` directory is ignored by Git.

```bash
mkdir -p backups
DB_URL="$(npx supabase status -o env | sed -n 's/^DB_URL=//p' | tr -d '"')"
pg_dump --dbname="$DB_URL" \
  --schema=auth \
  --schema=public \
  --schema=private \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="backups/subtrack-$(date -u +%Y%m%dT%H%M%SZ).dump"
unset DB_URL
```

Store backup files outside synced folders. Do not attach them to issues or commits.

The scoped archive contains Auth and application-owned schemas. It intentionally excludes Supabase-managed service schemas such as `realtime` and `storage`.

### Local restore drill

Restore into a separate disposable PostgreSQL database so the running local Supabase project remains unchanged. Stop the Next.js process first.

```bash
DB_URL="$(npx supabase status -o env | sed -n 's/^DB_URL=//p' | tr -d '"')"
RESTORE_DB_URL="${DB_URL%/*}/subtrack_restore_verification"
psql "$DB_URL" --set ON_ERROR_STOP=on \
  --command='drop database if exists subtrack_restore_verification with (force)' \
  --command='create database subtrack_restore_verification'
psql "$RESTORE_DB_URL" --set ON_ERROR_STOP=on \
  --command='drop schema public cascade' \
  --command='create schema if not exists extensions' \
  --command='create extension if not exists pgcrypto with schema extensions' \
  --command='create extension if not exists pgtap with schema extensions'
pg_restore --dbname="$RESTORE_DB_URL" \
  --no-owner \
  --no-privileges \
  --exit-on-error \
  backups/subtrack-YYYYMMDDTHHMMSSZ.dump
psql "$RESTORE_DB_URL" --command="select count(*) from information_schema.tables where table_schema in ('auth', 'public', 'private')"
psql "$DB_URL" --set ON_ERROR_STOP=on \
  --command='drop database subtrack_restore_verification with (force)'
unset DB_URL RESTORE_DB_URL
```

The restore drill verifies archive integrity and schema recovery, not application traffic against that temporary database. A hosted restore requires the deployment owner's approved provider procedure and a separate staging project.

## Retention

- CSV source bytes are memory-only and are never stored.
- Import and sensitive-account action attempts are pruned opportunistically after 24 hours when another action starts.
- Account deletion removes Auth and owner rows and leaves an anonymous content-free receipt.
- No scheduled cleanup service, hosted backup expiry, legal hold, or support-access policy exists in this local release.

A deployed environment must schedule attempt cleanup and verify backup expiry independently.

## Updates

1. Review package release notes and security advisories.
2. Update one dependency group at a time.
3. Run `npm install` to update the lockfile.
4. Review lifecycle-script and lockfile changes.
5. Run `npm run verify`, `npm audit`, dependency-tree validation, and secret scanning.
6. Commit only reviewed source, migration, lockfile, and documentation changes.

## Troubleshooting

### Supabase does not start

Confirm Docker is running, then inspect status:

```bash
docker version
npm run db:status
npm run db:start
```

Do not use interactive privilege escalation. Resolve Docker permissions outside the application repository.

### Authentication email does not arrive

Open Mailpit at `http://127.0.0.1:54324`. Confirm `APP_URL` matches the browser origin and the local callback URL appears in `supabase/config.toml`.

### Database types are stale

```bash
npm run db:reset
npm run db:types
npm run typecheck
```

### Browser tests use the wrong service

Playwright owns ports `3107` and `3108`. Stop unrelated processes on those ports, then rerun the test. Do not point tests at a production service.

### Schema lint reports pgTAP errors

Use `npm run db:lint`. It intentionally checks `public` and `private`; linting the bundled `extensions` schema reports third-party pgTAP compatibility noise that this repository does not own.

## Incident response

For a suspected credential or data exposure:

1. Stop affected traffic and preserve content-free timestamps and opaque IDs.
2. Revoke or rotate the affected credential in the provider.
3. Do not paste tokens, cookies, statement content, exports, or database dumps into chat or tickets.
4. Review Auth, database, edge, and deployment logs using approved access.
5. Assess affected users and data types.
6. Fix the root cause, rerun the release and security gates, and document the outcome.
7. Notify users or authorities only through the deployment owner's approved legal and incident process.
