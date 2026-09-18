# Phase 1 to Phase 2 security checkpoint

Checkpoint date: 2026-09-17

## Executive summary

SubTrack can begin Phase 2 implementation in the local development environment. The current Phase 1 application has a Low risk rating, no confirmed exposed secret, no registry-known dependency vulnerability, and no reachable Critical or High vulnerability.

The three current Phase 1 issues identified by the baseline audit are remediated and covered by automated tests:

- Browser responses include a tested security-header baseline and omit framework disclosure.
- Subscription and savings Client Components receive field-allowlisted DTOs instead of complete records.
- External provider URLs require HTTPS, reject credentials and control characters, display the destination hostname, and prevent opener access.

Production deployment remains blocked. Phase 2 completion also remains blocked until authentication, session refresh, server-only data access, per-operation authorization, Row Level Security, cache isolation, logging, retention, and two-user isolation tests work locally.

## Phase transition

- Completed phase: Phase 1, foundation and fictional demo.
- Proposed phase: Phase 2, database and authentication.
- Decision: Conditional go for local implementation; no-go for production deployment.

## Security-relevant delta

The repository now includes:

- A strict-TypeScript Next.js 16 App Router demonstration.
- A static-compatible Content Security Policy and supporting browser headers.
- Explicit browser DTOs for subscription list and savings views.
- HTTPS-only external URL validation and render-time revalidation.
- A reusable phase security-audit prompt.
- Git ignore coverage for local credentials, financial files, databases, browser sessions, cloud state, and generated security artifacts.

The repository does not yet include:

- Supabase clients or environment configuration.
- Authentication or session cookies.
- A database, migrations, grants, or RLS policies.
- A server-only data-access layer.
- Private user data.
- Route Handlers, Server Actions, or a session-refresh proxy.
- Statement upload or parsing.

## Verification evidence

The following checks pass before Phase 2 begins:

- `npm run format:check`.
- `npm run lint`.
- `npm run typecheck`.
- `npm test`: seven files and 20 tests.
- `npm run test:e2e`: 14 desktop and mobile tests, including focused security and Axe checks.
- `npm run build`: 17 static pages generated.
- `npm audit --json`: zero advisories across 561 dependency nodes.
- `npm ls --all`: no invalid, missing required, or extraneous dependency.
- Gitleaks official container: two commits and approximately 630 KB scanned, with no leaks found.
- Production header probe: CSP and supporting headers present; `X-Powered-By` absent.

The fallback history pattern search matched only the placeholder `SUPABASE_SERVICE_ROLE_KEY` name in `.env.example`. It did not expose a credential value.

## Carried findings

These design gaps remain open and block Phase 2 completion:

- SEC-004: Authentication and session lifecycle must be implemented and tested.
- SEC-005: Authorization, least-privilege grants, RLS, and two-user isolation must be implemented and tested.
- SEC-006: Authenticated responses and session refresh must prevent shared caching.
- SEC-007: Structured security logging and redaction must be implemented.
- SEC-008: The approved statement-upload design remains a Phase 4 implementation gate.
- SEC-009: Data retention, export, deletion, backup, and support-access rules require executable behavior and later product review.
- SEC-010: Full development dependency attestation remains incomplete because one registry endpoint returned `404` during the baseline audit.

SEC-011 is closed for the current local history because Git metadata now exists and Gitleaks found no leak. Repeat history scanning after any credential-bearing environment is introduced and before deployment.

## Approved Phase 2 design

Phase 2 uses these controls:

1. Run Supabase locally with separate placeholder configuration from any future production project.
2. Use `@supabase/ssr` request-scoped server clients.
3. Use `proxy.ts` for token refresh and copy Supabase cache headers to every returned response.
4. Use `getClaims()` to verify identity. Never authorize from `getSession()` alone.
5. Recheck authentication inside every Server Action and Route Handler.
6. Put private reads and writes behind `server-only` DAL modules.
7. Select minimal columns and return route-specific DTOs.
8. Derive ownership from verified `auth.uid()`, never submitted `user_id`.
9. Revoke `anon` and `authenticated` grants before granting only required operations.
10. Enable RLS and create separate `select`, `insert`, `update`, and `delete` policies with explicit roles.
11. Use both `using` and `with check` on updates and index every policy ownership column.
12. Keep all future-feature tables inaccessible until their implementation phase.
13. Write pgTAP owner, other-user, anonymous, ownership-reassignment, denied-write-integrity, and cross-owner foreign-key tests.
14. Mark authenticated responses private and non-cacheable and test two users through the application.
15. Record allowlisted security events without credentials or financial content.

## Limitations

- No production Supabase project, deployment edge, CDN, DNS, TLS, backup system, or secret manager exists to assess.
- Local implementation cannot prove production environment separation or hosted email behavior.
- The deployment owner remains unassigned.
- Mermaid renderer validation remains a documented limitation; diagram source fences and obvious syntax were reviewed.

## Decision

**Conditional go for local Phase 2 implementation.**

Do not deploy, connect production data, or mark Phase 2 complete until all Phase 2 implementation checks pass, a post-Phase 2 audit finds no unresolved reachable Critical or High issue, and the deployment owner approves the production boundary.
