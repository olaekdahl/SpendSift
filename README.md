# SubTrack

SubTrack is a mobile-friendly web application that helps individual consumers identify, track, and manage personal subscriptions. The product name is temporary and lives in one application configuration value so that it can change later.

## Current status

The local first-release feature set is complete: authentication, private persistence, subscription management, bounded fictional CSV import, insights, in-app reminders, owner cancellation guides, password-protected JSON export, and confirmed account deletion.

Use only the downloadable fictional CSV sample. Real statements and production deployment remain blocked until trusted ingress, resource, monitoring, retention, and hosted security controls pass their deployment gates.

## Local setup

You need:

- Node.js 24 or a compatible active LTS release.
- npm.
- Docker with its daemon running.

Run these commands from the project folder:

```bash
npm install
npm run db:start
npm run dev
```

The local environment file is ignored by Git. It contains only the local public project URL and publishable key. To recreate it after a fresh clone:

1. Run `npm run db:start`.
2. Read the `API_URL` and `PUBLISHABLE_KEY` values printed by the command.
3. Create `.env.local` from `.env.example`.
4. Set `APP_URL=http://localhost:3000`.
5. Set `NEXT_PUBLIC_SUPABASE_URL` to the local `API_URL`.
6. Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` to the local `PUBLISHABLE_KEY`.
7. Leave `SUPABASE_SECRET_KEY` unset. Normal application requests do not need it.

Open [the local SubTrack site](http://localhost:3000) in your browser. Create an account, then open [local Mailpit](http://127.0.0.1:54324) to read the confirmation message. Mailpit does not send email outside your computer.

After onboarding, open `/import`, select `public/samples/demo-statement.csv`, confirm the suggested mapping, and review each detected charge. The original bytes remain in bounded request memory only; SubTrack retains normalized records needed for duplicate checks and review.

A future deployment must use a trusted reverse proxy that strips untrusted `X-Forwarded-For` and `X-Real-IP` headers and supplies the authoritative client address. Do not expose the importer directly to the internet without that boundary.

To stop the local database services, run:

```bash
npm run db:stop
```

### Future hosted Supabase setup

Do not create hosted resources until you approve deployment work. When that phase begins:

1. Visit [Supabase](https://supabase.com/) and create separate development and production projects.
2. Open the project's **Connect** dialog.
3. Copy the project URL and **Publishable key** into the deployment secret manager as `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Set `APP_URL` to the exact HTTPS application origin.
5. Do not put a secret or service-role key in a `NEXT_PUBLIC_` variable. Ordinary application requests must use the signed-in user's session and Row Level Security.

## Project checks

Run the complete destructive local release gate:

```bash
npm run verify
```

This command resets the local database. Use it only when disposable local data is acceptable.

For individual checks, run:

Run these commands before you accept a change:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run db:reset
npm run db:test
npm run test:e2e
npm run build
npm run test:e2e:production
```

The first Playwright run might require this browser installation command:

```bash
npx playwright install chromium
```

## Preview deployment

The live preview runs on Azure Container Apps with a separate non-production Supabase project. It scales from zero to one replica and must use fictional data only.

Open the [SubTrack preview](https://ca-subtrack-preview.redpebble-c159d20a.westeurope.azurecontainerapps.io). Email verification is temporarily disabled there. Do not enter real financial information.

- Read `docs/deployment/CLOUD-DECISION.md` for the Azure and AWS comparison.
- Read `docs/deployment/DEPLOYMENT-GUIDE.md` for the validated CLI workflow.
- Read `docs/deployment/EMAIL-VERIFICATION-EXCEPTION.md` before disabling Confirm Email.
- Read `docs/deployment/ROLLBACK-AND-CLEANUP.md` before changing or deleting resources.
- Read `docs/deployment/DEPLOYMENT-RESULT.md` for the verified deployment state.

## Documentation

- Read `docs/product-requirements.md` for first-release requirements.
- Read `docs/architecture.md` for technical boundaries and security decisions.
- Read `IMPLEMENTATION_PLAN.md` for phase status and checklists.
- Read `docs/future-roadmap.md` for intentionally deferred features.
- Read `docs/operations.md` for start, backup, restore, update, troubleshooting, and incident procedures.
- Read `docs/deployment/PREREQUISITES.md` for the unresolved production prerequisites and staged rollout process.

## Privacy notice

SubTrack handles personal account settings and normalized fictional statement data locally. It does not store uploaded source files, log statement contents, or send financial data to an AI service. Detected subscriptions and savings estimates can be incomplete or inaccurate. You must review suggestions and confirm cancellations with each provider.
