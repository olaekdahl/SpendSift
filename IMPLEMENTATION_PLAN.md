# Implementation plan

This checklist tracks implementation and verification. Complete one phase and summarize its results before starting the next phase.

Before starting each new phase, run the workspace prompt `/security-phase-audit` in GitHub Copilot Agent mode and enter the transition, such as `Phase 2 to Phase 3`. You can also select **Security phase audit** from **Chat: Run Prompt...**. Review its go/no-go decision before continuing.

## Phase 1: Foundation

Goal: Provide a local, responsive product demonstration with fictional data and a reliable developer toolchain.

- [x] Confirm that the workspace starts empty.
- [x] Create the product requirements and architecture documents.
- [x] Scaffold Next.js with the App Router, strict TypeScript, Tailwind CSS, and npm.
- [x] Configure ESLint and Prettier.
- [x] Configure Vitest, React Testing Library, and Playwright.
- [x] Create shared design tokens and accessible UI primitives.
- [x] Create responsive desktop and mobile navigation.
- [x] Create the landing page and short demo onboarding entry.
- [x] Build the dashboard with fictional totals, insights, and empty-state support.
- [x] Build subscription list and detail screens with fictional data.
- [x] Add calendar, import, savings, and settings route surfaces for complete navigation.
- [x] Add light and dark themes with reduced-motion support.
- [x] Run formatting, linting, strict type checking, unit tests, browser tests, and a production build.
- [x] Check desktop and mobile layouts in a real browser.
- [x] Document exact local viewing and testing steps.

Phase 1 does not use Supabase, accept real statement files, or persist user changes.

## Security gate before Phase 2

Status: **Conditional go for local Phase 2 implementation; production deployment remains blocked.** See `docs/security/checkpoints/phase-1-to-phase-2-audit.md` and `docs/security/PHASE-2-SECURITY-GATE.md`.

- [x] Create the evidence-based security audit.
- [x] Create the current and planned threat model.
- [x] Create the security remediation plan.
- [x] Create the Phase 2 security gate and draft RLS verification matrix.
- [x] Remediate the current Phase 1 header, client-payload, and outbound-URL findings.
- [ ] Review and accept, revise, or reject every security finding.
- [x] Repeat secret scanning against the canonical Git repository and its history.
- [x] Approve the authentication and session lifecycle for local implementation.
- [x] Approve the server-only data-access layer and minimal DTO boundaries for local implementation.
- [x] Approve per-operation authorization and deny-by-default RLS rules for local implementation.
- [x] Approve protected rendering and authenticated cache isolation for local implementation.
- [x] Approve conservative sensitive-data inventory and lifecycle defaults for local implementation.
- [x] Approve the security logging and redaction design for local implementation.
- [x] Approve the bounded statement-upload design as a future Phase 4 prerequisite.
- [x] Approve the current security-header baseline for local implementation.
- [x] Record passing repository verification evidence.
- [x] Record product, security, and engineering approval for local implementation.
- [x] Record a conditional Phase 2 local-development go decision.
- [ ] Record deployment-owner approval before production deployment.

## Phase 2: Database and authentication

Goal: Give each user a secure account and private Supabase-backed storage.

- [ ] Create SQL migrations for every required entity, constraint, relationship, and index.
- [ ] Configure Supabase browser and server clients without exposing server secrets.
- [ ] Implement sign-up, sign-in, sign-out, password reset, and protected routes.
- [ ] Implement onboarding and profile settings.
- [ ] Enable Row Level Security on every user-owned table.
- [ ] Add policy verification and two-user isolation tests.
- [ ] Replace fictional repositories with user-scoped persistence.

## Phase 3: Manual subscription management

Goal: Let an authenticated user manage the complete life cycle of a subscription record.

- [ ] Implement validated create, read, edit, archive, and delete operations.
- [ ] Support every required billing frequency and status.
- [ ] Add monthly and annual cost conversions and renewal calculations.
- [ ] Add clear provider-cancellation boundaries.
- [ ] Add focused unit, integration, and component tests.

## Phase 4: Statement import

Goal: Turn a fictional CSV statement into reviewable recurring-charge suggestions without retaining the original file.

- [ ] Implement the provider-neutral importer contract and CSV adapter.
- [ ] Add safe upload validation, column mapping, and preview.
- [ ] Add merchant normalization with extensive unit tests.
- [ ] Add deterministic recurrence detection, confidence scores, and reasons.
- [ ] Implement edit, reject, merge, defer, and approval actions.
- [ ] Prevent duplicate imports and duplicate transactions.
- [ ] Add downloadable fictional CSV samples.
- [ ] Add integration and Playwright coverage for the import journey.

## Phase 5: Insights

Goal: Help the user understand changes, overlaps, upcoming costs, budget status, and possible savings.

- [ ] Implement price-increase detection and confirmation.
- [ ] Implement configurable possible-overlap detection.
- [ ] Implement budgets, savings targets, potential savings, and realized savings.
- [ ] Implement the upcoming-charge calendar.
- [ ] Implement in-app reminders behind a notification service interface.
- [ ] Add calculation and workflow tests.

## Phase 6: Cancellation and privacy

Goal: Give the user accurate cancellation guidance and direct control over their data.

- [ ] Implement editable cancellation guides and verification dates.
- [ ] Add cancellation disclaimers and safe external links.
- [ ] Add data export and confirmed account deletion.
- [ ] Add a privacy page and audit-event coverage.
- [ ] Complete security, privacy, keyboard, screen-reader, contrast, and reduced-motion reviews.

## Phase 7: Production readiness

Goal: Verify release behavior and document deployment without purchasing or deploying services.

- [ ] Complete unit, component, integration, and primary-journey Playwright tests.
- [ ] Run dependency and security audits and assess each result.
- [ ] Improve performance, loading states, and generic error handling.
- [ ] Verify linting, type checking, tests, and the production build in a clean environment.
- [ ] Add non-developer setup, operation, backup, and deployment instructions.
- [ ] Document the deferred roadmap.

## Release gate

Do not mark the first release complete until every acceptance criterion in `docs/product-requirements.md` passes. Do not begin a later phase before the current phase works and has a plain-language completion summary.
