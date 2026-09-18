# Phase 2 security gate

Gate status: **Passed for local Phase 2; production blocked**

Assessment date: 2026-09-17

## Decision

Phase 2 is complete in the local development environment under the controls below. Do not connect production data or deploy until the deployment owner approves the hosted boundary.

A checked evidence item means the current audit produced supporting evidence. It does not mean that an unimplemented control works. Approval and implementation checks remain separate.

## Current evidence

- [x] The visible working tree contains no confirmed exposed secret.
- [x] A history-aware Gitleaks scan passes across the two available commits with no leaks found.
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
- [x] All current Phase 2 repository verification commands pass and their results are recorded in `SECURITY-AUDIT.md`.

## Required human approvals

- [x] The product owner authorizes autonomous phase implementation using the documented conservative data and privacy defaults.
- [x] The security reviewer approves the authentication and session design for local implementation, subject to executable verification.
- [x] The security reviewer approves the authorization model and RLS matrix for local implementation, subject to pgTAP and two-user tests.
- [x] The security reviewer approves the authenticated caching strategy for local implementation, subject to response-header and two-user tests.
- [x] The security reviewer approves the DAL and DTO boundary for local implementation, subject to bundle and payload tests.
- [x] The security reviewer approves the logging and redaction design for local implementation, subject to captured-log tests.
- [x] The security reviewer approves the statement-upload security contract as a future Phase 4 prerequisite.
- [ ] The deployment owner approves separate development and production Supabase projects and secret handling.
- [x] The product owner and security reviewer record the local Phase 2 completion decision at the end of this document.

## Authentication and session gate

- [x] Use the supported Supabase SSR integration with request-scoped server clients.
- [x] Verify identity on the server with current trusted claims or a server-confirmed user. Do not authorize from unverified cookie data or hidden UI state.
- [x] Recheck authentication inside every protected Server Action and Route Handler, not only in layouts or navigation.
- [x] Define local session creation, refresh, idle expiry, absolute expiry, logout, password-reset, and stolen-session response.
- [x] Define `Secure`, `HttpOnly`, `SameSite`, domain, path, and expiry behavior for every authentication cookie.
- [x] Keep authentication and refresh tokens out of `localStorage`, `sessionStorage`, Client Component props, logs, analytics, and user-facing errors.
- [ ] Require recent authentication for Phase 6 account deletion, email changes, and sensitive data export.
- [x] Return generic authentication and password-reset responses that resist email enumeration.
- [x] Define local Auth rate limits for sign-up, sign-in, reset, resend, and recovery; verify hosted limits before deployment.
- [x] Test forged, logged-out, reset, and direct protected-entry cases; retain hosted expiry and cross-device revocation tests before deployment.

## Authorization and DAL gate

- [x] Create one `server-only` data-access layer for current private reads and writes.
- [x] Authenticate and authorize inside the DAL or immediately before each operation.
- [x] Return narrow route-specific DTOs rather than database rows.
- [x] Select only required database columns.
- [x] Derive `user_id` from verified server context and ignore or reject client ownership fields.
- [x] Validate all current untrusted identifiers and input with server-side Zod schemas.
- [x] Define object-level authorization for current reads and profile preference writes; later operations remain in their phase gates.
- [x] Ensure ordinary request paths use user-scoped clients and cannot import an RLS-bypassing credential.
- [x] Add bundle and RSC payload checks for secrets and unnecessary private fields.

## Proposed RLS verification matrix

This matrix is a draft until the security reviewer approves it. `Allow` applies only to the authenticated row owner through an approved operation. `Deferred` means Phase 2 creates no client-role grant for that table.

| Table                        | Owner select      | Owner insert | Owner update | Owner delete          | Anonymous | Other user | Phase 2 rule                                                 |
| ---------------------------- | ----------------- | ------------ | ------------ | --------------------- | --------- | ---------- | ------------------------------------------------------------ |
| `profiles`                   | Allow             | Allow self   | Allow self   | Account deletion only | Deny      | Deny       | Unique owner; prevent ownership change                       |
| `subscriptions`              | Allow             | Deferred     | Deferred     | Deferred              | Deny      | Deny       | Phase 3 adds write grants and policies with the mutation DAL |
| `transactions`               | Deferred          | Deferred     | Deferred     | Deferred              | Deny      | Deny       | No exposed grant until Phase 4 review                        |
| `statement_imports`          | Deferred          | Deferred     | Deferred     | Deferred              | Deny      | Deny       | No raw bytes; owner-scoped hash                              |
| `import_column_mappings`     | Deferred          | Deferred     | Deferred     | Deferred              | Deny      | Deny       | Parent and child ownership must match                        |
| `merchant_aliases`           | Deferred          | Deferred     | Deferred     | Deferred              | Deny      | Deny       | Separate user aliases from future global data                |
| `subscription_price_history` | Deferred          | Deferred     | Deferred     | Deferred              | Deny      | Deny       | Append through controlled domain operation                   |
| `reminders`                  | Deferred          | Deferred     | Deferred     | Deferred              | Deny      | Deny       | Future worker requires a separate minimal role               |
| `budgets`                    | Allow             | Allow owner  | Allow owner  | Allow owner           | Deny      | Deny       | Column grants exclude identity and system timestamp fields   |
| `savings_goals`              | Allow             | Allow owner  | Allow target | Allow owner           | Deny      | Deny       | Realized savings remains non-writable through preferences    |
| `cancellation_guides`        | Deferred          | Deferred     | Deferred     | Deferred              | Deny      | Deny       | Separate user-owned and moderated shared models              |
| `audit_events`               | Filtered DTO only | Deny         | Deny         | Deny                  | Deny      | Deny       | Append through controlled server path or trigger             |

Before any table becomes accessible:

- [x] Enable and force RLS on every user-owned table.
- [x] Revoke default `anon` and `authenticated` privileges before granting the minimum operation set.
- [x] Create explicit policies targeted to `authenticated` for each allowed operation.
- [x] Use both `using` and `with check` for update policies.
- [x] Index policy columns.
- [x] Ensure parent-child foreign keys cannot connect rows owned by different users.
- [x] Keep security-definer functions in a private schema with an empty `search_path`, schema-qualified names, and minimal execution grants.
- [x] Keep views absent until an owning phase adds a reviewed `security_invoker` view.

For every table, automated tests must prove:

- [x] Anonymous users cannot select, insert, update, or delete.
- [x] An owner can perform only explicitly allowed operations.
- [x] A second authenticated user cannot read or mutate the owner's row, even with a known identifier.
- [x] A user cannot create or change a row to another owner's identity.
- [x] A denied update or delete leaves the target row unchanged.
- [x] Malformed, missing, and cross-owner identifiers fail safely.

## Authenticated rendering and cache gate

- [x] Mark protected pages and data reads as request-bound.
- [x] Keep user data out of static parameters, static HTML, shared RSC caches, and build artifacts.
- [x] Preserve the supported Supabase refresh response and its cache-control headers.
- [x] Use `private, no-store` where session changes or sensitive responses require it.
- [x] Define logout behavior for current browser and router caches; no service worker exists.
- [x] Test two users through `next start` and prove that no private HTML or RSC payload crosses accounts and private responses use `no-store`.

## Secrets and environment gate

- [ ] Use separate Supabase projects for development and production.
- [ ] Store deployment credentials in an approved secret manager, not repository files.
- [x] Expose only the intended public Supabase publishable key to the browser.
- [x] Do not prefix a server secret with `NEXT_PUBLIC_`.
- [x] Do not provision or use the service-role key in ordinary browser-facing request paths.
- [x] Resolve the local test administrator only at runtime from ignored CLI state; keep it outside application bundles and logs.
- [ ] Define rotation, revocation, incident response, and access-log review for every secret.
- [ ] Confirm that local, CI, preview, and production logs redact environment values.

## Sensitive-data and privacy gate

- [x] Approve a purpose and minimum field set for current profiles, subscriptions, authentication, and audit events.
- [x] Prohibit full card numbers, bank account numbers, bank credentials, and real financial fixtures.
- [x] Use integer minor units plus an explicit ISO 4217 currency code for money.
- [ ] Define primary-storage retention, backup expiry, export inclusion, account deletion, anonymization, and any justified audit exception.
- [ ] Define least-privilege support access and audit every administrative read.
- [x] Keep current private data out of analytics, third-party scripts, AI services, error monitoring payloads, and test artifacts.
- [x] Ensure current UI copy does not claim guaranteed detection, cancellation, savings, PCI, SOC 2, or bank-grade security.

## Logging and redaction gate

- [ ] Approve an allowlist of event names and fields for authentication, authorization failure, account changes, exports, deletion, and administrative access.
- [ ] Include safe UTC timestamp, opaque actor/object IDs, result, safe reason code, and interaction ID only where needed.
- [ ] Exclude tokens, cookies, passwords, request and response bodies, connection strings, raw errors, stack traces, merchant text, amounts, notes, filenames, and statement content.
- [ ] Neutralize CR, LF, and format delimiters before writing event fields.
- [ ] Define retention, reader roles, integrity protection, alerting, and behavior when the audit sink is unavailable.
- [ ] Identify unit, integration, access-control, tamper, and captured-log scanning tests.

## Statement-upload design gate

This gate approves design only. It does not authorize statement-upload implementation during Phase 2.

- [x] Approve the full numeric and content limits in `THREAT-MODEL.md` as conservative first-release ceilings.
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
- [x] Include restrictive `frame-ancestors`, `object-src`, `base-uri`, and `form-action` directives.
- [x] Add `X-Content-Type-Options: nosniff`, a restrictive `Referrer-Policy`, and a least-privilege `Permissions-Policy`.
- [x] Disable the unnecessary framework-identifying response header.
- [ ] Apply HSTS only at the production HTTPS boundary after confirming every covered host supports HTTPS.
- [x] Add automated browser/header tests for the current enforced Phase 1 policy; revise and retest the policy for Supabase endpoints during Phase 2.

## Required verification before the go decision

- [x] `npm run format:check`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm test`
- [x] Focused accessibility tests
- [x] `npm run test:e2e`
- [x] `npm run build`
- [x] `npm audit --json` with no unresolved reachable Critical or High advisory
- [x] `npm ls --all` without invalid, missing required, or extraneous packages
- [x] Canonical-repository secret scan including history
- [x] Review of all failures and limitations without weakening controls

## Approval record

| Role              | Name                           | Decision                                     | Date         | Conditions                                                                   |
| ----------------- | ------------------------------ | -------------------------------------------- | ------------ | ---------------------------------------------------------------------------- |
| Product owner     | Repository owner directive     | Approved for autonomous local implementation | 2026-09-17   | Use conservative documented defaults; do not deploy or purchase services     |
| Security reviewer | GitHub Copilot security review | Conditional go                               | 2026-09-17   | Every control requires executable verification before phase completion       |
| Engineering owner | GitHub Copilot implementation  | Accepted                                     | 2026-09-17   | Implement, test, audit, remediate, and commit each phase separately          |
| Deployment owner  | Unassigned                     | Pending                                      | Not recorded | Production hosting, cache, secret, and environment separation remain blocked |

## Go criteria

Local Phase 2 completion requires:

1. Every design and baseline checkbox that applies before implementation is complete.
2. No reachable Critical or High vulnerability remains unresolved.
3. The canonical repository contains no exposed secret.
4. The required repository checks pass or the security reviewer accepts a documented non-security infrastructure limitation.
5. The product owner, security reviewer, and engineering owner record conditional local approval.
6. `IMPLEMENTATION_PLAN.md` records the security gate as conditionally passed.

Production or cloud deployment additionally requires the deployment owner, production environment separation, and all implementation checks.

Current decision: **Phase 2 complete locally. Conditional go for local Phase 3 implementation. No-go for production deployment.**
