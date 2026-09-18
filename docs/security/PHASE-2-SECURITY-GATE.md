# Phase 2 security gate

Gate status: **Blocked**

Assessment date: 2026-09-17

## Decision

Do not begin Phase 2 database, authentication, Supabase, migration, or private-data work until every blocking item below is complete and the product owner and security reviewer record approval.

A checked evidence item means the current audit produced supporting evidence. It does not mean that an unimplemented control works. Approval and implementation checks remain separate.

## Current evidence

- [x] The visible working tree contains no confirmed exposed secret.
- [ ] A history-aware secret scan passes in the canonical Git repository. This workspace has no Git metadata.
- [x] `npm audit --json` reports no known vulnerability in the locked dependency tree as of 2026-09-17.
- [x] No unresolved reachable Critical or High dependency vulnerability is identified in the current snapshot.
- [x] The current server and client component boundaries are inventoried in `SECURITY-AUDIT.md` and `THREAT-MODEL.md`.
- [x] A draft server-only DAL and minimal DTO design is documented.
- [x] A draft authentication and session design is documented.
- [x] A draft authorization and RLS verification matrix is documented.
- [x] A sensitive-data inventory and proposed retention model is documented.
- [x] A draft security-event and redaction policy is documented.
- [x] A bounded statement-upload security design is documented.
- [x] A production security-header strategy is documented.
- [x] Required security tests are identified.
- [x] Phase 1 responses include tested baseline security headers and omit `X-Powered-By`.
- [x] Phase 1 subscription and savings Client Components receive field-allowlisted DTOs.
- [x] Phase 1 provider URLs require HTTPS, reject credentials and control characters, and display the destination hostname.
- [x] All current Phase 1 repository verification commands pass and their results are recorded in `SECURITY-AUDIT.md`.

## Required human approvals

- [ ] The product owner approves the data inventory, minimum fields, retention periods, export behavior, deletion behavior, and support-access model.
- [ ] The security reviewer approves the authentication and session lifecycle.
- [ ] The security reviewer approves the authorization model and RLS matrix.
- [ ] The security reviewer approves the authenticated caching strategy.
- [ ] The security reviewer approves the DAL and DTO boundary.
- [ ] The security reviewer approves the logging and redaction policy.
- [ ] The security reviewer approves the statement-upload security contract as a future Phase 4 prerequisite.
- [ ] The deployment owner approves separate development and production Supabase projects and secret handling.
- [ ] The product owner and security reviewer record a Phase 2 go decision at the end of this document.

## Authentication and session gate

- [ ] Use the supported Supabase SSR integration with request-scoped server clients.
- [ ] Verify identity on the server with current trusted claims or a server-confirmed user. Do not authorize from unverified cookie data or hidden UI state.
- [ ] Recheck authentication inside every Server Action and route handler, not only in layouts or navigation.
- [ ] Define session creation, refresh, idle expiry, absolute expiry, logout, revocation, password-reset, and stolen-session response.
- [ ] Define `Secure`, `HttpOnly`, `SameSite`, domain, path, and expiry behavior for every authentication cookie.
- [ ] Keep authentication and refresh tokens out of `localStorage`, `sessionStorage`, Client Component props, logs, analytics, and user-facing errors.
- [ ] Require recent authentication for account deletion, email changes, password changes, data export where appropriate, and other sensitive identity operations.
- [ ] Return generic authentication and password-reset responses that resist email enumeration.
- [ ] Define account and network-aware rate limits for sign-up, sign-in, reset, resend, and recovery.
- [ ] Identify tests for forged, expired, revoked, replayed, logged-out, and reset sessions and direct protected-entry access.

## Authorization and DAL gate

- [ ] Create one `server-only` data-access layer for private reads and writes.
- [ ] Authenticate and authorize inside the DAL or immediately before each operation.
- [ ] Return narrow route-specific DTOs rather than database rows.
- [ ] Select only required database columns.
- [ ] Derive `user_id` from verified server context and ignore or reject client ownership fields.
- [ ] Validate all untrusted identifiers and input with server-side Zod schemas.
- [ ] Define object-level authorization for reads, creates, updates, archives, deletes, exports, and account deletion.
- [ ] Ensure ordinary request paths use user-scoped clients and cannot import an RLS-bypassing credential.
- [ ] Add bundle and RSC payload checks for secrets and unnecessary private fields.

## Proposed RLS verification matrix

This matrix is a draft until the security reviewer approves it. `Allow` applies only to the authenticated row owner through an approved operation. `Deferred` means Phase 2 creates no client-role grant for that table.

| Table                        | Owner select      | Owner insert | Owner update | Owner delete          | Anonymous | Other user | Phase 2 rule                                                         |
| ---------------------------- | ----------------- | ------------ | ------------ | --------------------- | --------- | ---------- | -------------------------------------------------------------------- |
| `profiles`                   | Allow             | Allow self   | Allow self   | Account deletion only | Deny      | Deny       | Unique owner; prevent ownership change                               |
| `subscriptions`              | Allow             | Allow        | Allow        | Allow                 | Deny      | Deny       | Server assigns owner; archive is distinct from provider cancellation |
| `transactions`               | Deferred          | Deferred     | Deferred     | Deferred              | Deny      | Deny       | No exposed grant until Phase 4 review                                |
| `statement_imports`          | Deferred          | Deferred     | Deferred     | Deferred              | Deny      | Deny       | No raw bytes; owner-scoped hash                                      |
| `import_column_mappings`     | Deferred          | Deferred     | Deferred     | Deferred              | Deny      | Deny       | Parent and child ownership must match                                |
| `merchant_aliases`           | Deferred          | Deferred     | Deferred     | Deferred              | Deny      | Deny       | Separate user aliases from future global data                        |
| `subscription_price_history` | Deferred          | Deferred     | Deferred     | Deferred              | Deny      | Deny       | Append through controlled domain operation                           |
| `reminders`                  | Deferred          | Deferred     | Deferred     | Deferred              | Deny      | Deny       | Future worker requires a separate minimal role                       |
| `budgets`                    | Deferred          | Deferred     | Deferred     | Deferred              | Deny      | Deny       | Owner-scoped uniqueness and currency rules                           |
| `savings_goals`              | Deferred          | Deferred     | Deferred     | Deferred              | Deny      | Deny       | Realized values follow confirmed state transitions                   |
| `cancellation_guides`        | Deferred          | Deferred     | Deferred     | Deferred              | Deny      | Deny       | Separate user-owned and moderated shared models                      |
| `audit_events`               | Filtered DTO only | Deny         | Deny         | Deny                  | Deny      | Deny       | Append through controlled server path or trigger                     |

Before any table becomes accessible:

- [ ] Enable RLS and force it where appropriate.
- [ ] Revoke default `anon` and `authenticated` privileges before granting the minimum operation set.
- [ ] Create explicit policies targeted to `authenticated` for each allowed operation.
- [ ] Use both `using` and `with check` for update policies.
- [ ] Index policy columns.
- [ ] Ensure parent-child foreign keys cannot connect rows owned by different users.
- [ ] Keep security-definer functions in a private schema with an empty `search_path`, schema-qualified names, and minimal execution grants.
- [ ] Configure exposed views with `security_invoker = true` or keep them outside exposed schemas.

For every table, automated tests must prove:

- [ ] Anonymous users cannot select, insert, update, or delete.
- [ ] An owner can perform only explicitly allowed operations.
- [ ] A second authenticated user cannot read or mutate the owner's row, even with a known identifier.
- [ ] A user cannot create or change a row to another owner's identity.
- [ ] A denied update or delete leaves the target row unchanged.
- [ ] Malformed, missing, and cross-owner identifiers fail safely.

## Authenticated rendering and cache gate

- [ ] Mark protected pages and data reads as request-bound.
- [ ] Keep user data out of static parameters, static HTML, shared RSC caches, and build artifacts.
- [ ] Preserve the supported Supabase refresh response and its cache-control headers.
- [ ] Use `private, no-store` where session changes or sensitive responses require it.
- [ ] Define logout behavior for browser, CDN, router, and service-worker caches if any are introduced.
- [ ] Test two users through a production-like cache and prove that no private HTML, RSC payload, or `Set-Cookie` response crosses accounts.

## Secrets and environment gate

- [ ] Use separate Supabase projects for development and production.
- [ ] Store deployment credentials in an approved secret manager, not repository files.
- [ ] Expose only the intended public Supabase publishable key to the browser.
- [ ] Do not prefix a server secret with `NEXT_PUBLIC_`.
- [ ] Do not provision or use the service-role key in ordinary browser-facing request paths.
- [ ] If an elevated key is unavoidable, document the operation, isolate it in `server-only` code, minimize its scope and lifetime, and test bundle exclusion.
- [ ] Define rotation, revocation, incident response, and access-log review for every secret.
- [ ] Confirm that local, CI, preview, and production logs redact environment values.

## Sensitive-data and privacy gate

- [ ] Approve a purpose and minimum field set for profiles, subscriptions, authentication, and audit events.
- [ ] Prohibit full card numbers, bank account numbers, bank credentials, and real financial fixtures.
- [ ] Use integer minor units plus an explicit ISO 4217 currency code for money.
- [ ] Define primary-storage retention, backup expiry, export inclusion, account deletion, anonymization, and any justified audit exception.
- [ ] Define least-privilege support access and audit every administrative read.
- [ ] Keep private financial data out of analytics, third-party scripts, AI services, error monitoring payloads, and test artifacts.
- [ ] Ensure current and future UI copy does not claim guaranteed detection, cancellation, savings, PCI, SOC 2, or bank-grade security.

## Logging and redaction gate

- [ ] Approve an allowlist of event names and fields for authentication, authorization failure, account changes, exports, deletion, and administrative access.
- [ ] Include safe UTC timestamp, opaque actor/object IDs, result, safe reason code, and interaction ID only where needed.
- [ ] Exclude tokens, cookies, passwords, request and response bodies, connection strings, raw errors, stack traces, merchant text, amounts, notes, filenames, and statement content.
- [ ] Neutralize CR, LF, and format delimiters before writing event fields.
- [ ] Define retention, reader roles, integrity protection, alerting, and behavior when the audit sink is unavailable.
- [ ] Identify unit, integration, access-control, tamper, and captured-log scanning tests.

## Statement-upload design gate

This gate approves design only. It does not authorize statement-upload implementation during Phase 2.

- [ ] Approve the full numeric and content limits in `THREAT-MODEL.md`.
- [ ] Authenticate and rate-limit before reading the file body.
- [ ] Stream input with a hard byte cap and bounded queue, time, memory, rows, columns, lines, and fields.
- [ ] Allow exactly one `.csv` file and treat MIME as a hint because CSV has no reliable magic signature.
- [ ] Support UTF-8 with an optional BOM only for the first release; reject invalid bytes, nulls, and unsupported encodings.
- [ ] Use a maintained streaming CSV parser and reject malformed or ambiguous structure safely.
- [ ] Normalize and validate every mapped field on the server.
- [ ] Keep raw bytes in private ephemeral storage under generated names, outside webroot and backups.
- [ ] Delete raw bytes on success, rejection, timeout, exception, restart recovery, and expiry.
- [ ] Scope cryptographic import and row fingerprints to the verified user and enforce transactional idempotency.
- [ ] Require explicit approval before creating a subscription.
- [ ] Render statement content as text and prohibit raw HTML.
- [ ] Neutralize formula-capable cells at CSV export, including `=`, `+`, `-`, `@`, tab, CR, LF, and full-width variants.
- [ ] Record redacted import events without financial content or filenames.
- [ ] Identify parser fuzzing, resource, cleanup, concurrency, cross-user, formula, logging, and end-to-end tests.

## Security-header gate

- [ ] Approve a CSP compatible with the final rendering model and known Supabase endpoints. Do not use unsafe wildcards to make errors disappear.
- [ ] Include restrictive `frame-ancestors`, `object-src`, `base-uri`, and `form-action` directives.
- [ ] Plan `X-Content-Type-Options: nosniff`, a restrictive `Referrer-Policy`, and a least-privilege `Permissions-Policy`.
- [ ] Disable the unnecessary framework-identifying response header.
- [ ] Apply HSTS only at the production HTTPS boundary after confirming every covered host supports HTTPS.
- [ ] Plan report-only CSP rollout where needed and automated browser/header tests before enforcement.

## Required verification before the go decision

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] Focused accessibility tests
- [ ] `npm run test:e2e`
- [ ] `npm run build`
- [ ] `npm audit --json` with no unresolved reachable Critical or High advisory
- [ ] `npm ls --all` without invalid, missing required, or extraneous packages
- [ ] Canonical-repository secret scan including history
- [ ] Review of all failures and limitations without weakening controls

## Approval record

| Role              | Name       | Decision | Date         | Conditions                                                          |
| ----------------- | ---------- | -------- | ------------ | ------------------------------------------------------------------- |
| Product owner     | Unassigned | Pending  | Not recorded | Data lifecycle and product behavior require approval                |
| Security reviewer | Unassigned | Pending  | Not recorded | All design sections and test plans require approval                 |
| Engineering owner | Unassigned | Pending  | Not recorded | Delivery and verification ownership require approval                |
| Deployment owner  | Unassigned | Pending  | Not recorded | Hosting, cache, secret, and environment separation require approval |

## Go criteria

Phase 2 can begin only when:

1. Every checkbox that applies before Phase 2 is complete.
2. No reachable Critical or High vulnerability remains unresolved.
3. The canonical repository contains no exposed secret.
4. The required repository checks pass or the security reviewer accepts a documented non-security infrastructure limitation.
5. The product owner, security reviewer, engineering owner, and deployment owner record approval.
6. `IMPLEMENTATION_PLAN.md` records the security gate as passed.

Current decision: **No-go**.
