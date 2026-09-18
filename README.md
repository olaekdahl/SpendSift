# SubTrack

SubTrack is a mobile-friendly web application that helps individual consumers identify, track, and manage personal subscriptions. The product name is temporary and lives in one application configuration value so that it can change later.

## Current status

Phase 2 provides local email and password authentication, protected application routes, onboarding, private Supabase persistence, Row Level Security, stored preferences, and user-owned subscription reads. The public landing-page preview and import-review exercise use fictional information.

Manual subscription writes begin in Phase 3. Real statement processing begins in Phase 4. Do not enter real financial information until the relevant security gate passes.

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

## Documentation

- Read `docs/product-requirements.md` for first-release requirements.
- Read `docs/architecture.md` for technical boundaries and security decisions.
- Read `IMPLEMENTATION_PLAN.md` for phase status and checklists.
- Read `docs/future-roadmap.md` for intentionally deferred features.

## Privacy notice

SubTrack handles personal account settings locally in Phase 2 and handles sensitive financial information in later phases. The application must never store uploaded statement files permanently, log statement contents, or send financial data to an AI service. Detected subscriptions and savings estimates can be incomplete or inaccurate. You must review suggestions and confirm cancellations with each provider.
