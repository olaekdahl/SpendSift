# SubTrack

SubTrack is a mobile-friendly web application that helps individual consumers identify, track, and manage personal subscriptions. The product name is temporary and lives in one application configuration value so that it can change later.

## Current status

Phase 1 provides a local demonstration with fictional data. It does not connect to a bank, process a real statement, authenticate users, or store data in Supabase.

Do not enter real financial or personal information into the Phase 1 demo.

## Local setup

You need Node.js 24 or a compatible active LTS release and npm.

Run these commands from the project folder:

```bash
npm install
npm run dev
```

Open [the local SubTrack site](http://localhost:3000) in your browser. Select **Explore demo** to open the fictional dashboard.

## Project checks

Run these commands before you accept a change:

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run test:e2e
npm run build
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

SubTrack handles sensitive financial information in later phases. The application must never store uploaded statement files permanently, log statement contents, or send financial data to an AI service. Detected subscriptions and savings estimates can be incomplete or inaccurate. You must review suggestions and confirm cancellations with each provider.
