# Local release readiness

Release date: 2026-09-17

## Decision

The repository is ready for local use and CI with fictional data. It is not approved for deployment or real financial data.

## First-release acceptance criteria

| Criterion                                                                                      | Evidence                                                                                                                                          | Status         |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| A user can register, sign in, and access only their records.                                   | Auth browser flows, forged-cookie rejection, known-ID cross-user tests, explicit grants, forced RLS, and 191 pgTAP assertions.                    | Passed locally |
| A user can manage subscriptions manually.                                                      | Create, edit, status, cancellation boundary, archive, local delete, stale-write, and cross-user browser tests.                                    | Passed locally |
| A user can import a fictional CSV and approve recurring-charge suggestions.                    | Strict parser fixtures, mapping preview, deterministic detection, review actions, deduplication, rate limits, and desktop/mobile import journeys. | Passed locally |
| Dashboard totals, renewals, trials, price changes, overlaps, budgets, and savings work.        | Integer calculation tests, price confirmation, overlap threshold, provider-confirmed savings, calendar, and reminder workflows.                   | Passed locally |
| Cancellation guidance does not claim automatic cancellation.                                   | Owner guide UI, provider-confirmation wording, safe hostname links, and explicit provider-cancellation confirmation.                              | Passed locally |
| The interface works on mobile and desktop and meets accessibility requirements.                | Desktop Chrome and Pixel 7 projects, axe WCAG 2.1 A/AA checks, keyboard controls, reduced-motion CSS, and horizontal-overflow assertions.         | Passed locally |
| Linting, strict typing, tests, integration tests, end-to-end tests, and production build pass. | `npm run verify` and production cache isolation.                                                                                                  | Passed locally |

## Final local verification

The final release command runs:

- Prettier check.
- ESLint.
- Strict TypeScript.
- 153 unit and component tests across 22 files.
- Clean database reset across five migrations.
- Application-schema database lint.
- 191 pgTAP assertions across five SQL suites.
- 76 Playwright scenarios across desktop and mobile.
- Next.js production build.
- Two-user production cache-isolation test.

Additional checks:

- `npm audit`: zero known advisories.
- `npm ls --all`: valid dependency tree.
- Gitleaks v8.30.1: no Git-visible or history finding.
- Scoped `auth`, `public`, and `private` PostgreSQL backup restored successfully into a disposable database.

Dependency currency is separate from vulnerability status. `npm outdated` reports newer major releases for Node types, ESLint, and TypeScript, plus newer React and Prettier releases. The locked tree has no advisory. ESLint 10 is deferred because the installed Next.js dependency chain still includes `eslint-plugin-import`, whose declared peer range ends at ESLint 9. Review these upgrades with their framework compatibility changes instead of forcing them into this release.

## Implemented product boundaries

- Supabase email/password authentication with confirmation and recovery.
- Private profiles, subscriptions, normalized imports, insights, reminders, budgets, savings goals, and cancellation guides.
- Manual subscription CRUD and provider-cancellation distinction.
- Bounded UTF-8 CSV import with explicit mapping and review.
- Deterministic merchant normalization and recurrence detection.
- Price-change confirmation, category-overlap guidance, budget and savings calculations, calendar, and in-app reminders.
- Password-reauthenticated JSON export and current-account deletion.
- Local privacy notice, loading states, owner-blind not-found responses, and generic errors.

## Residual deployment blockers

Do not deploy or accept real data until all of these are implemented and approved:

- Trusted reverse proxy that strips and sets forwarding headers.
- Production-equivalent HTTPS, secure cookies, HSTS scope, CSP, CDN, and cache verification.
- Measured request, memory, process, database-pool, timeout, and export-size limits.
- Scheduled retention cleanup, backup expiry, restore objectives, and deletion behavior in backups.
- Monitoring, alerting, log access, audit integrity, and incident response.
- Production SMTP and hosted Auth rate-limit verification.
- Secret management, credential rotation, CI provenance, branch protection, and release approvals.
- Privacy/legal review, data-location and subprocessor review, and support-access controls.
- Final staging penetration test and two-user cache test through the deployed edge.

## Known non-blocking local observation

React development mode can emit “Encountered a script tag while rendering React component” during authentication navigation. Repository review found no application script injection or raw HTML sink, production builds pass, and no security impact is demonstrated. Treat any change in this behavior or any production occurrence as a new investigation.

## Deferred work

The first release excludes bank connections, email scanning, external email, SMS, or push delivery, household sharing, native applications, multi-currency conversion, community cancellation content, broad statement formats, and automated cancellation or negotiation. See `docs/future-roadmap.md`.
