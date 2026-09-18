# Phase 2 to Phase 3 security checkpoint

Checkpoint date: 2026-09-17

## Executive summary

SubTrack can begin Phase 3 implementation in the local development environment. The completed Phase 2 boundary has a **Low** current risk rating, no confirmed exploitable vulnerability, no exposed credential, and no registry-known dependency vulnerability.

Authentication, sessions, private persistence, and authorization now exist and have executable verification. Phase 3 subscription mutations remain unavailable because the `authenticated` database role has subscription `select` only, and the DAL exposes read methods only. This deny-by-default state is intentional and becomes the central Phase 3 implementation gate.

Production deployment remains blocked pending hosted Supabase configuration, HTTPS/HSTS validation, CDN behavior, production secret management, monitoring, backups, and deployment-owner approval.

## Scope and delta

Phase 2 adds:

- Supabase CLI 2.117.0 and a reproducible local Docker stack.
- `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.116.0, and the `server-only` guard.
- Email/password sign-up, confirmation, sign-in, sign-out, password reset, and password update.
- HttpOnly `SameSite=Lax` cookie sessions with refresh-token rotation and bounded local session lifetime.
- Next.js 16 `proxy.ts` token refresh using verified `getClaims()` data.
- Public authentication routes and dynamically rendered protected routes.
- A server-only profile and subscription DAL with minimal SQL column selection.
- Exact browser DTO allowlists for subscription, savings, and settings Client Components.
- Onboarding and stored preferences for currency, time zone, reminders, budget, and savings goal.
- A migration containing all required first-release tables, constraints, owner-safe foreign keys, indexes, triggers, grants, and RLS.
- Redacted audit events for profile, subscription, budget, and savings-goal row changes.
- Local Mailpit confirmation and recovery testing.

No real statement upload, subscription mutation, bank connection, email account integration, deployment, or purchase occurs.

## Current trust boundaries

1. Public requests reach landing and authentication pages.
2. The proxy refreshes Auth tokens, propagates no-cache headers, and redirects unauthenticated private-route requests.
3. Protected layouts and every protected Server Action independently verify signed claims.
4. Server-only DAL modules select minimal fields and apply explicit owner filters.
5. PostgreSQL grants and RLS independently restrict rows and columns.
6. Browser components receive minimal DTOs and never receive database credentials or complete rows.
7. Local test code resolves the CLI-generated administrative key at runtime from ignored Supabase state; application source never imports it.

## Findings

### New confirmed findings

None.

### Remediated findings

- **SEC-004:** Local authentication and session design is implemented and tested. Hosted provider and deployment review remains open.
- **SEC-005:** Current Phase 2 tables have deny-by-default grants and tested owner policies. Future tables remain closed with no client grants.
- **SEC-006:** Protected routes are dynamic, refresh cache headers propagate, and a `next start` test proves authenticated HTML is `private` and `no-store`.
- **SEC-011:** Git history is available. A redacted Gitleaks scan reports no leak.

### Carried design gaps

- **SEC-007, Medium:** Database row-change events are redacted and inaccessible to client roles. Hosted retention, alerting, authentication-event integration, and operational access remain open before deployment and Phase 4.
- **SEC-008, High design gate:** Statement upload remains unimplemented and must satisfy the approved bounded pipeline before Phase 4 accepts a file.
- **SEC-009, Medium:** Export, account deletion, backup expiry, and support-access behavior remain Phase 6 work.
- **SEC-010, Informational:** Full development-dependency attestation remains incomplete because the registry previously returned one missing attestation endpoint.

### Independent review dispositions

- Future tables without policies are not exposed: both `anon` and `authenticated` grants are revoked, RLS is enabled, and pgTAP proves the denial. Their policies remain deferred to the owning phase.
- Subscription mutation policies and DAL methods are intentionally absent because Phase 3 owns create, edit, archive, and delete. Their absence prevents premature writes.
- PostgreSQL executes each function call in the caller's transaction; `complete_onboarding` is atomic and uses unique constraints plus upserts.
- Direct audit-table read access remains intentionally denied. A future user-facing activity view must use a filtered DTO or safe view.
- Auth endpoints return generic errors and Supabase rate limits are configured locally. Hosted limits and abuse monitoring require deployment verification.
- Auth cookies use path `/` because callback, recovery, and all protected route groups require the same session. Restricting one cookie to multiple disjoint paths is not supported.
- The CSP intentionally excludes Supabase browser endpoints because the application has no browser Supabase client. Add only reviewed origins if a later feature requires direct browser connectivity.

## Verification results

- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 10 files and 40 tests passed.
- `npm run db:reset`: passed from an empty local database.
- `npm run db:test`: 49 pgTAP assertions passed.
- `npm run test:e2e`: 28 desktop and mobile tests passed.
- `npm run build`: passed; all private routes are dynamically rendered.
- `npm run test:e2e:production`: two simultaneous accounts receive different private records, and both responses are `private` and `no-store`.
- `npm audit --json`: zero advisories across 587 dependency nodes.
- `npm ls --all`: passed with no invalid, missing required, or extraneous package.
- Gitleaks history scan: no leak found across the available commits.
- Editor diagnostics: no source or test error.

A React development-only warning about script tags appears during some authentication navigations. No application component contains a script element or raw HTML sink, the warning originates in React's development runtime, production build and tests pass, and no security impact is demonstrated.

## Secrets review

No confirmed secret is present in tracked source or history.

- `.env.example` contains placeholders only.
- `.env.local` is ignored and contains only the local application origin, local Supabase URL, and public publishable key.
- Application code never reads a secret or service-role environment variable.
- Local E2E support resolves the CLI-generated administrative key at runtime from `supabase/.temp`, which is ignored, and does not print or persist it.
- Hosted production credentials do not exist in this workspace.

## Privacy and product claims

- Profile, budget, and savings values are stored only for the signed-in owner.
- Money remains integer minor units plus explicit currency.
- No full bank or card number is collected.
- No real statement file is accepted.
- No financial content is sent to analytics, AI, or third-party runtime scripts.
- UI copy does not claim guaranteed detection, cancellation, savings, PCI, SOC 2, or bank-grade security.

## Phase 3 requirements

Before subscription writes become available:

1. Add server-side Zod schemas for create and update commands.
2. Derive `user_id` only from verified claims.
3. Add DAL create, update, archive, and delete methods with explicit selected columns.
4. Grant only required subscription columns and operations.
5. Add separate owner `insert`, `update`, and `delete` policies with `with check` on writes.
6. Prevent ID, ownership, source, confidence, and audit timestamps from client assignment where the workflow does not require them.
7. Validate HTTPS URLs and all monetary, date, status, frequency, and custom-interval invariants.
8. Keep archive, local deletion, and provider cancellation semantically distinct.
9. Test owner CRUD, cross-user known-ID attempts, mass assignment, malformed values, denied-write integrity, audit events, and concurrent stale updates.
10. Preserve generic errors and no-store protected responses.

## Limitations

- Hosted Supabase, CDN, TLS, DNS, backup, SMTP, monitoring, and secret-manager behavior are not available locally.
- Deployment-owner approval remains absent.
- The local database administrator exists only for migration and test tooling and is not an application path.
- Mermaid rendering remains a nonblocking documented limitation; source structure was reviewed.

## Decision

**Conditional go for local Phase 3 implementation. No-go for production deployment.**

Run the Phase 3 security tests and the next checkpoint audit before beginning statement import.
