# SubTrack security audit

Audit date: 2026-09-17

## Executive summary

The current local Phase 6 application has a **Low** overall security risk for fictional data. It implements verified server sessions, private persistence, subscription management, bounded CSV import, owner insights, cancellation guidance, password-protected export, and confirmed account deletion. This assessment found no evidence of a currently reachable Critical or High vulnerability, no exposed credential, and no known vulnerability reported for the locked npm dependency tree.

The repository can proceed to Phase 7 local release hardening. Production deployment and real financial statements remain blocked pending trusted ingress, resource, monitoring, retention, legal, support-access, and hosted-infrastructure verification.

The assessment tracks 11 original findings. Seven are remediated for the current local application; four future or deployment items remain open:

| Severity      | Open | Remediated |
| ------------- | ---: | ---------: |
| Critical      |    0 |          0 |
| High          |    0 |          4 |
| Medium        |    1 |          3 |
| Low           |    0 |          1 |
| Informational |    1 |          1 |

**Baseline recommendation, now superseded:** Phase 2 was a no-go before its security gate and implementation evidence existed. The Phase 2 checkpoint now permits local Phase 3 work while production remains blocked.

## Phase 2 checkpoint update

Phase 2 local implementation completed after the baseline audit. The current local application remains **Low risk**, with no confirmed exploitable vulnerability and no unresolved reachable Critical or High dependency advisory.

The following baseline findings are remediated for the current application:

- **SEC-004:** Email/password registration, confirmation, sign-in, sign-out, and recovery use request-scoped Supabase SSR clients and verified `getClaims()` identity. Browser tests cover the complete flows.
- **SEC-005:** All user-owned tables enable RLS and begin with revoked client grants. Only Phase 2 operations receive grants and policies. Forty-nine pgTAP assertions plus a browser cross-user known-ID test pass.
- **SEC-006:** Private routes render dynamically, Supabase refresh cache headers propagate, and a production test requires `private` and `no-store`.
- **SEC-011:** Git history is present. A redacted Gitleaks scan found no leak across the available history and current checkpoint.

**Phase 3 recommendation:** Conditional go for local implementation. Subscription writes remain denied until Phase 3 adds mutation-specific DAL methods, column grants, policies, and tests. Production deployment remains no-go pending hosted infrastructure and deployment-owner review.

## Phase 3 checkpoint update

Phase 3 manual subscription management completed locally with no confirmed exploitable vulnerability. Strict Server Action schemas, a server-only mutation DAL, column-level grants, owner RLS, optimistic locking, database constraints, redacted audit triggers, and browser DTO allowlists protect create, edit, archive, and local delete operations.

The checkpoint remediated one defense-in-depth gap by enforcing `next_billing_date >= start_date` in PostgreSQL in addition to application validation. Seventy pgTAP assertions and 38 desktop/mobile browser checks pass. Phase 4 may proceed only with fictional CSV files under `PHASE-4-SECURITY-GATE.md`.

## Phase 4 checkpoint update

Phase 4 statement import completed locally with no confirmed exploitable vulnerability. The implementation verifies identity and exact origin before reading a bounded request body, parses only UTF-8 CSV through a maintained parser, applies fixed structural limits, and keeps source bytes out of storage and logs.

User-scoped fingerprints, unique constraints, advisory locks, opaque permits, account and network-aware rate limits, one-active-import enforcement, controlled database functions, owner-only reads, optimistic review actions, and content-free audit events protect normalized records. Independent review gaps for endpoint rate limiting, sequential deduplication, cross-user fingerprint scope, and audit privacy received browser coverage. PostgreSQL also bounds direct RPC JSON payloads and prunes expired attempts.

Current evidence includes 108 unit and component tests, 102 pgTAP assertions, 50 desktop/mobile browser scenarios, a production build and cache-isolation check, zero npm advisories, a valid dependency tree, and a clean Git-visible Gitleaks scan.

**Phase 5 recommendation:** Conditional go for local insights implementation with fictional data. The trusted-proxy address boundary, hosting memory behavior, ingress controls, monitoring, retention, and production cache behavior remain deployment blockers.

## Phase 5 checkpoint update

Phase 5 insights completed locally with no confirmed exploitable vulnerability. Price changes are derived from the newest owner-linked charge and re-derived under a row lock before immutable history and current price change atomically. Category overlap remains an advisory, currency-separated signal with a bounded owner preference. Realized savings require explicit provider confirmation and clear on reactivation.

In-app reminders use owner-safe source keys, event-date identity, IANA time-zone conversion, optimistic status changes, and no external delivery. Atomic profile preferences validate currency, locale, time zone, money, and overlap bounds in PostgreSQL. The post-audit matrix passes 139 unit/component tests, 155 pgTAP assertions, 62 desktop/mobile browser scenarios, production build and cache isolation, dependency checks, and secret scanning.

**Phase 6 recommendation:** Conditional go for local cancellation guidance, export, deletion, and privacy implementation with fictional data. Production and real financial data remain blocked.

## Phase 6 checkpoint update

Phase 6 cancellation guidance and privacy controls completed locally with no confirmed exploitable vulnerability. Owner guides use dual-layer URL and content validation, owner-safe relationships, optimistic writes, and content-free audit events. Export and deletion authenticate before bounded body reads, require exact same origin and current-password reauthentication, and bind one-time database permits to a newly issued verified Auth session.

Exports use fixed-name private JSON responses and exclude tokens, raw statement bytes, network fingerprints, and unrelated users. Account deletion targets only `auth.uid()`, cascades every owner row, expires current cookies, rejects replay, and retains one anonymous content-free receipt. The privacy page explicitly identifies unresolved deployment retention and support policies.

The post-audit matrix passes 153 unit/component tests, 191 pgTAP assertions, 76 desktop/mobile browser scenarios, production build and cache isolation, dependency checks, and secret scanning.

**Phase 7 recommendation:** Go for local release hardening and documentation. Deployment and real financial data remain blocked pending infrastructure approval.

## Final release checkpoint

The final whole-repository audit found no confirmed exploitable vulnerability and verified every first-release acceptance criterion. A clean locked install and the complete `npm run verify` gate pass. Application schemas lint cleanly, all automated test layers pass, production cache isolation holds, dependency and signature checks pass, a CycloneDX SBOM is generated, and history plus Git-visible secret scans are clean.

Release hardening adds route-specific loading states without weakening owner-blind 404 status, a generic root error document, pinned CI actions, application-schema linting, one complete release command, and tested local backup and restore instructions.

**Final decision:** Go for local use, CI, and the isolated fictional-data preview. No-go for production or real financial data until every prerequisite in `docs/deployment/PREREQUISITES.md` receives implementation evidence and approval.

## Scope

This assessment covers the repository content available at `/home/ola/SpendSift` on 2026-09-17, including the local Phase 6 implementation:

- Next.js App Router routes and layouts under `src/app`.
- Shared and feature components under `src/components` and `src/features`.
- Fictional data, schemas, calculations, tests, and the public sample CSV.
- npm manifests and lockfile.
- Next.js, TypeScript, ESLint, Prettier, Vitest, and Playwright configuration.
- Environment templates and ignore rules.
- Product, architecture, roadmap, and implementation documentation.
- Generated dependency metadata needed for supply-chain analysis.

The assessment does not cover a hosted production environment, CDN, DNS, TLS termination, hosted backups, production SMTP, production secret management, or CI/CD because none is present in this workspace. Local Supabase configuration, migrations, policies, authentication, and available Git history are covered.

## Methodology

The assessment uses evidence from source and configuration review, safe command output, and official guidance. It distinguishes current behavior from planned behavior and treats an unimplemented control as a design gap rather than a confirmed vulnerability.

The review references:

- [OWASP Top 10:2025](https://top10.owasp.org/2025/).
- [OWASP ASVS 5.0.0](https://github.com/OWASP/ASVS/tree/v5.0.0).
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).
- [OWASP CSV Injection guidance](https://community.owasp.org/attacks/CSV_Injection).
- [OWASP Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html).
- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).
- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).
- [OWASP Third-Party JavaScript Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Third_Party_Javascript_Management_Cheat_Sheet.html).
- [Next.js 16 data-security guidance](https://nextjs.org/docs/app/guides/data-security).
- [Next.js 16 Content Security Policy guidance](https://nextjs.org/docs/app/guides/content-security-policy).
- [React guidance for raw HTML](https://react.dev/reference/react-dom/components/common#dangerously-setting-the-inner-html).
- [npm audit documentation](https://docs.npmjs.com/cli/v11/commands/npm-audit/).
- [Supabase server-side authentication for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs).
- [Supabase Row Level Security guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

## Baseline architecture and security posture

The sections below preserve the original Phase 1 audit snapshot. Current implementation evidence appears in the phase checkpoint updates above, `docs/architecture.md`, and `docs/security/checkpoints/`.

### Routes and rendering

The application exposes these routes:

| Route                 | Component boundary                                           | Current data                                                           |
| --------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `/`                   | Server Component                                             | Static marketing copy and fictional preview                            |
| `/dashboard`          | Server Component                                             | Fictional subscriptions and calculated summaries                       |
| `/subscriptions`      | Server Component passing a minimal DTO to a Client Component | Fictional list fields only                                             |
| `/subscriptions/[id]` | Statically generated Server Component                        | One fictional subscription selected from an allowlisted build-time set |
| `/import`             | Server Component containing an interactive Client Component  | Hard-coded fictional suggestions; no upload control                    |
| `/calendar`           | Server Component                                             | Fictional renewals                                                     |
| `/savings`            | Server Component passing a minimal DTO to a Client Component | Active fictional savings fields only                                   |
| `/settings`           | Server Component containing an interactive Client Component  | Session-memory preferences only                                        |

The root and route-group layouts are Server Components. Client Components are limited to the application shell, theme provider, theme toggle, subscription explorer, import review exercise, savings planner, and preferences exercise.

### Implemented entry points and trust boundaries

The current implementation contains:

- No `route.ts` handler or API endpoint.
- No Server Action or `"use server"` module.
- No `proxy.ts` or middleware.
- No authentication, cookie access, redirect parameter, CORS configuration, or rate limiter.
- No file input, upload handler, parser, temporary file, or database.
- No application `fetch()`, XHR, WebSocket, or analytics request.
- No application use of `localStorage` or `sessionStorage`. `next-themes` stores the non-sensitive theme name under its default `theme` key in `localStorage`.
- No `dangerouslySetInnerHTML`, direct HTML assignment, dynamic Markdown renderer, `eval()`, or application DOM manipulation.
- No application console or structured logging.
- One external provider link rendered from a revalidated HTTPS subscription URL. Current values are fixed `https://example.com` URLs, the destination hostname is visible, and the link uses `target="_blank"` with `rel="noopener noreferrer"`.
- Google fonts declared through `next/font/google`. Next.js downloads and self-hosts these at build time, so the browser does not load font files from Google at runtime.
- A public fictional CSV download at `/samples/demo-statement.csv`.

### Current data stores

- Fictional subscription objects live in `src/features/subscriptions/demo-data.ts`.
- Interactive review, savings, and preference changes live only in React component memory and reset on reload.
- The selected theme is the only browser-persisted value and is not personal or financial data.
- Generated `.next`, coverage, Playwright report, and test-result directories are ignored by `.gitignore`. These artifacts currently contain only fictional data, but future tests must continue to avoid real data.

### Current safeguards

- TypeScript strict mode is enabled.
- Zod validates the static fictional subscription fixture at module load.
- Money uses integer minor units.
- React renders text through normal JSX; no raw HTML sink exists.
- Subscription and savings Client Components receive explicit field-allowlisted DTOs instead of complete subscription objects.
- External website validation permits HTTPS only and rejects credentials and raw or encoded control characters.
- The only new-tab link prevents opener access with `rel="noopener noreferrer"`.
- Production responses include a baseline CSP, clickjacking protection, MIME sniffing protection, a restrictive referrer policy, a permissions policy, and cross-origin isolation headers. Next.js framework disclosure is disabled.
- Environment files are ignored except `.env.example`, which contains placeholders.
- The product copy says detection and savings estimates can be inaccurate and that only a provider can confirm cancellation.
- No UI copy claims PCI, SOC 2, bank-grade security, guaranteed discovery, guaranteed cancellation, or guaranteed savings.

### Planned boundaries

Phase 2 plans Supabase authentication and PostgreSQL. Phase 4 plans CSV statement ingestion. Neither boundary exists in code. The required design places all private reads and writes behind a `server-only` data-access layer that authenticates the request, authorizes the specific object, validates input, and returns a minimal route-specific DTO. PostgreSQL grants and RLS provide independent defense in depth.

See `THREAT-MODEL.md` for current and planned data-flow diagrams.

## Commands executed

| Command or check                                                                             | Result                                                                                                                                                                                           |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Repository file inventory                                                                    | 66 project files found outside dependency internals at baseline                                                                                                                                  |
| `git status --short --branch`                                                                | Not available: the workspace has no `.git` directory                                                                                                                                             |
| Targeted source searches                                                                     | No Server Actions, route handlers, proxy, middleware, application environment reads, unsafe HTML sinks, application network calls, application logs, uploads, cookies, or direct browser storage |
| `npm audit --json`                                                                           | Passed; zero advisories across 561 dependency nodes                                                                                                                                              |
| `npm outdated --json`                                                                        | Five direct packages have newer releases; no advisory establishes that current versions are vulnerable                                                                                           |
| `npm ls --all --json`                                                                        | Passed; no invalid, missing required, or extraneous dependency problems                                                                                                                          |
| Lockfile provenance inspection                                                               | Lockfile version 3; 561 package entries; all resolved sources use `registry.npmjs.org`; no resolved package lacks integrity metadata                                                             |
| Lifecycle-script inspection                                                                  | `unrs-resolver@1.12.2` has a postinstall script and is reachable only through ESLint development tooling; `fsevents@2.3.3` is an optional lockfile entry and is not installed on Linux           |
| `npm audit signatures --omit=dev`                                                            | Passed; 30 production packages have verified registry signatures and 22 have verified attestations                                                                                               |
| `npm audit signatures`                                                                       | Incomplete; npm returned `404` for the development dependency `whatwg-url@17.1.1` attestation endpoint                                                                                           |
| Zod URL protocol probe                                                                       | Baseline `z.url()` accepted `javascript:`, `data:`, and `ftp:`; the replacement schema rejects unsafe schemes, credentials, and control characters                                               |
| Secret-pattern and sensitive-fixture searches                                                | No credential, private key, personal email, 12-19 digit account/card pattern, or government identifier found in application source or public fixtures                                            |
| Production response-header probe                                                             | Baseline lacked security headers; the remediated build returns the configured policy headers and omits `X-Powered-By`                                                                            |
| Formatting, lint, type check, tests, accessibility tests, end-to-end tests, production build | Recorded in **Verification results**                                                                                                                                                             |

## Findings

### SEC-001: Browser response security policy was not configured

- **Status:** Confirmed; remediated for Phase 1 on 2026-09-17
- **Severity:** Low
- **Confidence:** High
- **CWE:** CWE-693, Protection Mechanism Failure; CWE-1021, Improper Restriction of Rendered UI Layers or Frames
- **OWASP:** A02:2025 Security Misconfiguration
- **Affected file:** Baseline `next.config.ts:1-5`; remediation `next.config.ts:3-45`
- **Evidence:** At audit baseline, `next.config.ts` exported an empty configuration. It defined no CSP, `frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS strategy, or `poweredByHeader: false`.
- **Attack prerequisites:** The application must be deployed and loaded by a victim. A framing attack requires an attacker-controlled page; CSP becomes materially useful if another content-injection defect appears.
- **Realistic scenario:** An attacker frames SubTrack and overlays instructions or controls to mislead a user. Phase 1 has no sensitive server operation, so present impact is limited. The same configuration would provide inadequate defense in depth after account and data-changing features exist.
- **Potential impact:** UI redress, unnecessary technology disclosure, broader effect from a future injection defect, and referrer leakage to outbound providers.
- **Existing controls:** React escapes text by default; no unsafe HTML sink or runtime third-party script exists; external links use `noreferrer`.
- **Recommended remediation:** Design and test a Next.js-compatible CSP without permissive wildcards. Include `frame-ancestors`, `object-src`, `base-uri`, `form-action`, and narrow source directives. Add `nosniff`, a restrictive referrer policy, a least-privilege permissions policy, and `poweredByHeader: false`. Add HSTS only at the HTTPS production boundary after confirming every covered host supports HTTPS. Consider report-only rollout before enforcement and decide explicitly between nonce-based dynamic rendering and a tested static-compatible policy.
- **Remediation evidence:** `next.config.ts:3-45` now sets a static-compatible CSP, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, and `Cross-Origin-Resource-Policy`, and disables `X-Powered-By`. `e2e/security.spec.ts:3-23` asserts the headers. A production probe confirmed the configured values and absence of `X-Powered-By`.
- **Residual work:** The static Phase 1 CSP requires inline script and style allowances for the current Next.js rendering output. Before private public deployment, evaluate nonce-based dynamic rendering or a tested hash/SRI strategy. Add HSTS only after the deployment owner confirms the complete HTTPS host boundary.
- **Verification:** Assert production response headers, run CSP browser tests on every route, verify no console violations, and confirm the application cannot be framed by an untrusted origin.
- **Blocking phase:** Policy design before Phase 2; enforcement before public deployment.

### SEC-002: Full subscription records crossed the server-to-client boundary

- **Status:** Design gap; current Phase 1 serialization remediated on 2026-09-17
- **Severity:** Medium
- **Confidence:** High
- **CWE:** CWE-201, Exposure of Sensitive Information Through Sent Data
- **OWASP:** A01:2025 Broken Access Control; A06:2025 Insecure Design
- **Affected files:** Baseline `src/app/(app)/subscriptions/page.tsx:28` and `src/app/(app)/savings/page.tsx:21`; remediation `src/features/subscriptions/browser-data.ts:1-61`
- **Evidence:** At audit baseline, both routes passed the full `demoSubscriptions` array to Client Components. The model included merchant descriptions, dates, payment-method nicknames, website, source, previous price, and savings-candidate state, even when a specific client view did not require every field. Next.js documents that props crossing into Client Components are serialized to the client.
- **Attack prerequisites:** Phase 2 replaces demo records with private user data while retaining the same broad prop contracts.
- **Realistic scenario:** A route needs only display name, amount, cadence, and selected state, but serializes the entire database-style record into the React Server Component payload. Browser tooling, injected client code, or a compromised dependency can read fields that were never displayed.
- **Potential impact:** Unnecessary exposure of personal financial metadata in browser-accessible payloads and a larger blast radius for a client-side compromise.
- **Existing controls:** Current records are fictional. No database, secrets, or other users exist.
- **Recommended remediation:** Create a dedicated `server-only` DAL before Phase 2. Authenticate and authorize in that layer, select only required columns, and return narrow route-specific DTOs. Do not pass database row types to Client Components. Restrict `process.env` and database imports to server-only modules. Consider React taint APIs as defense in depth, not as a replacement for DTO minimization.
- **Remediation evidence:** `browser-data.ts` now defines separate list and savings DTO allowlists. The two Server Component pages map complete fictional records before the Client Component boundary. Unit tests reject reintroduction of unused fields, and Playwright verifies that representative merchant, payment, and price-history values do not appear in serialized list or savings responses.
- **Residual work:** Phase 2 still requires the approved `server-only` DAL, operation-level authorization, minimal database column selection, and route-specific DTO tests for real user data.
- **Verification:** Inspect RSC/network payloads and assert that private or unused fields are absent. Add type-level and integration tests for each DTO.
- **Blocking phase:** Phase 2.

### SEC-003: URL validation did not restrict outbound protocols

- **Status:** Design gap; current Phase 1 validation remediated on 2026-09-17
- **Severity:** Medium
- **Confidence:** High
- **CWE:** CWE-20, Improper Input Validation
- **OWASP:** A05:2025 Injection; A06:2025 Insecure Design
- **Affected files:** Baseline `src/features/subscriptions/schema.ts:52` and `src/app/(app)/subscriptions/[id]/page.tsx:147-149`; remediation `src/features/subscriptions/schema.ts:38-71, 93` and `src/app/(app)/subscriptions/[id]/page.tsx:47-57, 156-167`
- **Evidence:** At audit baseline, the model used `z.url()` and the detail page rendered the value as an external `href`. A runtime probe confirmed that this schema accepted syntactically valid `javascript:`, `data:`, and `ftp:` values in addition to HTTPS. Current fixtures used only `https://example.com`.
- **Attack prerequisites:** A later manual-entry, cancellation-guide, import, support, or community workflow stores a URL controlled by an untrusted or compromised actor.
- **Realistic scenario:** A malicious cancellation guide stores a non-HTTP URL. A user trusts the SubTrack cancellation UI and follows the link, causing an unexpected protocol action or navigation to attacker-controlled content. Browser and React treatment of individual schemes can vary and must not be the primary control.
- **Potential impact:** Phishing, unsafe protocol invocation, or client-side code execution where a browser/runtime permits it.
- **Existing controls at baseline:** Values were static HTTPS placeholders, JSX did not render raw HTML, and `rel="noreferrer"` prevented opener access.
- **Recommended remediation:** Validate on the server with a shared Zod schema that parses `new URL(value)`, permits only `https:` by default, optionally permits `http:` only for explicit local development, rejects embedded credentials and control characters, and applies any required hostname policy. Revalidate stored URLs before rendering.
- **Remediation evidence:** `safeExternalUrlSchema` now permits explicit HTTPS URLs only and rejects embedded credentials plus raw or percent-encoded control characters. The detail route revalidates before rendering, displays the destination hostname, and uses `noopener noreferrer`. Ten unit cases and a browser assertion pass.
- **Residual work:** Reuse this schema at every future server-side write boundary, define provenance and moderation for shared cancellation guides, and decide whether any hostname restrictions are required.
- **Verification:** Add unit tests rejecting `javascript:`, `data:`, `file:`, `ftp:`, protocol-relative, credential-bearing, encoded-control, and malformed URLs. Add a browser test for safe external navigation.
- **Blocking phase:** Phase 3 for editable websites and Phase 6 for cancellation guidance.

### SEC-004: Authentication and session design is not approved

- **Status:** Remediated for local Phase 2; hosted deployment verification remains
- **Severity:** High
- **Confidence:** High
- **CWE:** CWE-287, Improper Authentication; CWE-613, Insufficient Session Expiration; CWE-1275, Sensitive Cookie with Improper SameSite Attribute
- **OWASP:** A07:2025 Authentication Failures
- **Affected files:** `IMPLEMENTATION_PLAN.md:49-59` and `docs/architecture.md:42-44, 96-101`
- **Evidence:** Authentication is a Phase 2 checklist item and no implementation exists. The architecture states broad goals but does not define token verification, refresh behavior, cookie attributes, cache-header propagation, session expiration/revocation, generic authentication responses, rate limits, or reauthentication for account deletion.
- **Attack prerequisites:** Phase 2 begins without an approved design and server code trusts client session state or relies only on route visibility.
- **Realistic scenario:** Server code trusts `getSession()` data read from a forgeable cookie or checks authentication only in a layout. A direct Server Action or route request then reads private data or performs a sensitive operation for an unverified identity.
- **Potential impact:** Account takeover, unauthorized financial-data access, session fixation or replay, and user enumeration.
- **Existing controls:** Supabase is the selected authentication provider; documentation calls for secure HTTP-only cookies and server-side checks; no current identity or private data exists.
- **Recommended remediation:** Approve a Supabase SSR design using request-scoped server clients and Next.js 16 `proxy.ts` refresh behavior. Verify identity with `getClaims()` or a current server-confirmed user, never trust `getSession()` alone for authorization, and recheck authentication inside every Server Action or handler. Define `Secure`, `HttpOnly`, `SameSite`, host/path, idle, absolute, refresh, logout, revocation, password-reset, reauthentication, generic-error, and automated-abuse behavior. Never place auth or refresh tokens in web storage.
- **Verification:** Test forged, expired, revoked, and replayed sessions; logout invalidation; password reset; generic responses; rate limits; direct calls to every server entry point; and reauthentication before account deletion or sensitive identity changes.
- **Blocking phase:** Before Phase 2 implementation.

### SEC-005: Authorization and RLS rules are not specified or testable

- **Status:** Remediated for current Phase 2 operations; future tables remain deny-by-default
- **Severity:** High
- **Confidence:** High
- **CWE:** CWE-862, Missing Authorization; CWE-639, Authorization Bypass Through User-Controlled Key
- **OWASP:** A01:2025 Broken Access Control
- **Affected files:** `IMPLEMENTATION_PLAN.md:49-59` and `docs/architecture.md:86-90`
- **Evidence:** No database migration or policy exists. Documentation states that rows will have `user_id`, RLS, ownership checks, and two-user tests, but it does not define grants and allowed operations for each table. The planned dynamic record pattern makes object-level authorization mandatory.
- **Attack prerequisites:** Supabase tables or server operations become available without deny-by-default grants, per-operation RLS, and server ownership verification.
- **Realistic scenario:** A malicious authenticated user changes a subscription, import, transaction, or guide identifier in a direct Data API or server request and reads or modifies another user's record. A service-role client used in a normal path would bypass RLS entirely.
- **Potential impact:** Cross-user disclosure, modification, or deletion of financial records and account data.
- **Existing controls:** The architecture intends user IDs, RLS, server-side ownership checks, and multi-user isolation tests. The service-role placeholder is labeled server-only.
- **Recommended remediation:** Approve the RLS matrix in `PHASE-2-SECURITY-GATE.md`. In one migration per table, enable RLS, revoke default `anon` and `authenticated` grants, grant only needed operations, and create explicit `to authenticated` policies for `select`, `insert`, `update`, and `delete`. Derive ownership from verified `auth.uid()`, overwrite any client-supplied `user_id`, use both `using` and `with check`, index policy columns, and test owner, other-user, anonymous, malformed-ID, and denied-write integrity cases. Do not provision an RLS-bypassing key to normal request paths.
- **Verification:** Run pgTAP policy tests for every table and server integration tests with at least two users. Direct Data API calls must fail for anonymous and non-owner access even when identifiers are known.
- **Blocking phase:** Before Phase 2 implementation.

### SEC-006: Authenticated rendering and cache behavior is unresolved

- **Status:** Remediated at the application boundary; hosted CDN verification remains
- **Severity:** High
- **Confidence:** Medium
- **CWE:** CWE-525, Use of Web Browser Cache Containing Sensitive Information
- **OWASP:** A01:2025 Broken Access Control; A06:2025 Insecure Design
- **Affected files:** `next.config.ts:1-5`, current App Router pages under `src/app/(app)`, and `docs/architecture.md:105-117`
- **Evidence:** The current production build prerenders all Phase 1 pages, and no protected-response cache policy exists. Supabase's official SSR guidance warns that caching responses containing refreshed `Set-Cookie` headers can sign another user into the wrong session or expose another user's response unless cache headers are propagated correctly.
- **Attack prerequisites:** Phase 2 adds session-bound rendering behind a CDN or shared cache but retains static/shared caching or drops Supabase refresh cache headers.
- **Realistic scenario:** A session-refresh response containing private HTML and `Set-Cookie` is cached and served to another visitor. Alternatively, user-specific data enters a statically generated artifact or shared RSC cache.
- **Potential impact:** Cross-user session and financial-data disclosure.
- **Existing controls:** Phase 1 data is public and fictional. No cookies or private response exists now. Next.js production browser source maps remain disabled by default.
- **Recommended remediation:** Define protected routes as request-bound and prevent shared caching of authenticated HTML, RSC payloads, and session refresh responses. Preserve Supabase `Cache-Control`, `Expires`, and `Pragma` headers when constructing proxy responses. Use `private, no-store` where sensitive content or session changes require it. Never include user data in static parameters or build-time generation. Document logout cache clearing behavior.
- **Verification:** Inspect production headers and route manifests; test two users through a caching proxy; prove that no user-specific response or `Set-Cookie` can be replayed to another user; inspect built output for private fixtures.
- **Blocking phase:** Phase 2.

### SEC-007: Security logging and redaction policy was incomplete

- **Status:** Remediated for current local operations; deployment monitoring remains
- **Severity:** Medium
- **Confidence:** High
- **CWE:** CWE-117, Improper Output Neutralization for Logs; CWE-532, Insertion of Sensitive Information into Log File; CWE-778, Insufficient Logging
- **OWASP:** A09:2025 Security Logging and Alerting Failures
- **Affected files:** `docs/architecture.md:58-64, 96-101` and `docs/product-requirements.md:80-88`
- **Evidence:** The documents correctly prohibit transaction text and secrets in logs and plan an `audit_events` table, but they do not define an event allowlist, schema, redaction function, retention, access, tamper resistance, alert thresholds, failure behavior, or tests. Current source contains no application logger.
- **Attack prerequisites:** Authentication, imports, exports, deletion, or administrative operations begin before a logging contract exists.
- **Realistic scenario:** An import error logs a raw transaction description containing line breaks or spreadsheet content, exposing financial information and enabling log injection. Conversely, failed authorization or account deletion is not logged, leaving an intrusion undetected.
- **Potential impact:** Sensitive-data leakage, forged log entries, weak incident response, and loss of accountability.
- **Existing controls:** No sensitive operation currently logs anything. Requirements explicitly prohibit financial content, account numbers, tokens, and statement contents in logs.
- **Recommended remediation:** Define structured event names and allowlisted fields for authentication, authorization failure, import lifecycle, export, deletion, key configuration changes, and administrative access. Use opaque object IDs, safe reason codes, interaction IDs, UTC timestamps, and actor IDs. Exclude tokens, cookies, emails where unnecessary, filenames, merchant text, transaction amounts/descriptions, request/response bodies, connection strings, and stack traces from user-facing output. Sanitize CR/LF and delimiters. Define retention, access, integrity, alerting, and failure behavior.
- **Verification:** Unit-test redaction and log-injection handling; integration-test required success and failure events; scan captured logs to prove prohibited values never appear; test logger failure without exposing details or bypassing controls.
- **Blocking phase:** Define before Phase 2; fully implement before Phase 4.
- **Remediation evidence:** Import success, failure, and review operations write allowlisted event names, opaque IDs, safe reason codes, counts, and duration buckets. Direct client audit-table access remains denied. pgTAP and browser assertions prove merchant descriptions, filenames, and amounts do not enter event details.

### SEC-008: Statement-upload security limits and lifecycle were not enforceable

- **Status:** Remediated for local fictional CSV use; production verification remains
- **Severity:** High
- **Confidence:** High
- **CWE:** CWE-434, Unrestricted Upload of File with Dangerous Type; CWE-770, Allocation of Resources Without Limits or Throttling; CWE-1236, Improper Neutralization of Formula Elements in a CSV File
- **OWASP:** A05:2025 Injection; A06:2025 Insecure Design
- **Affected files:** `docs/architecture.md:47-64`, `docs/product-requirements.md:49-67, 84-87`, and `src/app/(app)/import/page.tsx:14-50`
- **Evidence:** No file input or parser exists. The documents describe the intended stages but do not set numeric byte, row, line, column, field, time, memory, concurrency, or rate limits; a supported encoding policy; duplicate-header behavior; control-character rules; temporary-storage mechanics; or a precise CSV export policy. The import page accurately labels processing as planned.
- **Attack prerequisites:** Phase 4 accepts attacker-controlled CSV files without implementing and testing the complete control contract first.
- **Realistic scenario:** An authenticated bot submits many oversized or pathologically quoted CSV files to exhaust memory or CPU. Malicious merchant text later reaches HTML, logs, or CSV export. A formula-prefixed exported cell executes when a user opens it in spreadsheet software.
- **Potential impact:** Denial of service, stored injection, privacy breach, cross-user data exposure, formula injection, and undeleted raw financial files.
- **Existing controls:** No upload exists now. Requirements call for allowlisting, limits, raw-file deletion, fictional tests, no AI transfer, deduplication, and user approval.
- **Recommended remediation:** Approve the explicit pipeline and limits in `THREAT-MODEL.md` and `SECURITY-REMEDIATION-PLAN.md`. Authenticate before reading a body; rate-limit by account and network signal; stream with a hard byte cap; ignore the supplied path; validate extension, MIME as a hint, encoding, null/control bytes, delimiter, headers, row shape, and bounded dimensions; parse with a maintained library under time and memory limits; normalize Unicode; validate every canonical field; keep raw data in bounded private ephemeral storage; persist only necessary normalized records; bind import hashes and records to the verified user; require approval; delete raw bytes in success and failure paths; and append a redacted audit event. Treat antivirus as limited defense because CSV has no reliable magic signature and privacy rules may prohibit third-party scanning. Escape formula-capable exports at export time for the intended spreadsheet target, including `=`, `+`, `-`, `@`, tab, CR, LF, and full-width variants.
- **Verification:** Unit tests, parser fuzzing, resource-limit tests, duplicate/idempotency tests, cross-user tests, cleanup tests for every failure path, log scans, malicious filename and encoding fixtures, formula-injection fixtures, and end-to-end approval tests.
- **Blocking phase:** Security design approval before Phase 2; implementation before Phase 4 accepts any file.
- **Remediation evidence:** The authenticated same-origin Route Handler enforces the approved 5 MiB, 10,000-row, 64-column, 64 KiB line, and 8 KiB field limits before bounded persistence. UTF-8, header, row-shape, date, amount, filename, and MIME checks pass. User-scoped fingerprints, one-active-import locking, account and network throttles, atomic controlled functions, direct-RPC payload caps, explicit review, and memory-only raw bytes pass unit, database, and browser tests.
- **Residual work:** A production-equivalent ingress must set authoritative forwarding headers and enforce edge limits. Hosting memory behavior, load limits, monitoring, and retention require deployment-owner verification. Real financial statements remain prohibited.

### SEC-009: Sensitive-data retention and deletion rules are incomplete

- **Status:** Design gap
- **Severity:** Medium
- **Confidence:** High
- **CWE:** CWE-359, Exposure of Private Personal Information to an Unauthorized Actor
- **OWASP:** A06:2025 Insecure Design
- **Affected files:** `docs/product-requirements.md:18-88` and `docs/architecture.md:66-101`
- **Evidence:** The product defines many personal and financial fields and requires account deletion, but it does not assign retention periods, backup behavior, support access, export inclusion, deletion/anonymization behavior, or legal holds by data type. Raw statement deletion is the only explicit short-lived retention rule.
- **Attack prerequisites:** Phase 2 stores profiles or subscription data without an approved lifecycle, or support/backup systems receive data without minimum-access rules.
- **Realistic scenario:** Old transactions, merchant descriptions, cancellation notes, or audit records remain in primary storage and backups after a user deletes their account, expanding breach impact and contradicting user expectations.
- **Potential impact:** Excessive financial-data exposure, privacy harm, and inability to fulfill deletion or export promises accurately.
- **Existing controls:** The design calls for data minimization, raw-file disposal, account deletion, and no financial data in AI services or tests.
- **Recommended remediation:** Approve the data inventory in **Privacy review**. Set purpose-bound fields, retention clocks, backup expiry, support roles, export format, account-deletion sequencing, anonymization rules, and audit-retention exceptions. Remove fields that lack a current product purpose. Keep payment methods as user-provided nicknames only and prohibit full account/card numbers.
- **Verification:** Schema review, automated retention jobs with tests, export completeness tests, deletion tests across primary and backup restoration procedures, and periodic access review.
- **Blocking phase:** Phase 2.

### SEC-010: Full development-dependency provenance verification is incomplete

- **Status:** Needs verification
- **Severity:** Informational
- **Confidence:** High
- **CWE:** CWE-1357, Reliance on Insufficiently Trustworthy Component
- **OWASP:** A03:2025 Software Supply Chain Failures
- **Affected files:** `package-lock.json` and the installed npm dependency tree
- **Evidence:** `npm audit signatures --omit=dev` verified registry signatures for 30 production packages and attestations for 22. The full command stopped because npm returned `404` for the `whatwg-url@17.1.1` attestation endpoint. This is not evidence that the package is malicious or vulnerable.
- **Attack prerequisites:** A compromised or substituted development dependency executes during install, build, lint, or test.
- **Realistic scenario:** A compromised toolchain package runs with developer or CI credentials. The current check cannot establish provenance for every development package.
- **Potential impact:** Developer/CI credential theft, source modification, or poisoned build artifacts.
- **Existing controls:** Lockfile v3, registry-only resolved sources, complete integrity metadata, no npm advisories, and only one installed package with a postinstall script, reachable through ESLint development tooling.
- **Recommended remediation:** Define CI provenance policy, use clean installs from the lockfile, isolate build credentials, minimize lifecycle scripts, run advisory checks continuously, review package changes, and decide how CI treats packages without attestations. Do not equate a missing attestation with a vulnerability.
- **Verification:** Re-run signature verification with a current npm CLI and registry, capture package-level exceptions, and review CI egress and token permissions.
- **Blocking phase:** Before public deployment; no Phase 2 block unless a reachable High or Critical advisory appears.

### SEC-011: Git history and tracked-file exposure could not be assessed

- **Status:** Remediated for available local history
- **Severity:** Informational
- **Confidence:** High
- **CWE:** Not applicable
- **OWASP:** A03:2025 Software Supply Chain Failures
- **Affected location:** Repository root
- **Evidence:** `git status --short --branch` returned `fatal: not a git repository`. The current tree has no `.git` directory, so tracked state, pre-existing changes, commit history, ignored-file tracking, branch protection, and historical secret exposure cannot be established.
- **Attack prerequisites:** A real credential or sensitive fixture existed in the canonical repository history or build artifacts outside this workspace.
- **Realistic scenario:** The current tree is clean, but an old Supabase secret remains in a prior commit that a collaborator or attacker can still retrieve.
- **Potential impact:** Historical credential exposure and weak supply-chain traceability.
- **Existing controls:** The visible tree contains only placeholders; `.gitignore` excludes environment files, private-key files, build output, and test reports.
- **Recommended remediation:** Repeat the audit in a canonical clone with complete history. Run an approved history-aware secret scanner, review tracked ignored files, confirm branch protection and required reviews, and document credential-rotation procedures. If a real secret is found, revoke it, remove it from the current tree, assess history exposure, review provider access logs, and prevent recurrence.
- **Verification:** Clean secret-scan results for the working tree and history, plus repository-policy evidence.
- **Blocking phase:** Before placing Phase 2 credentials in the repository environment.

## Remaining design gaps summary

The following controls remain future or deployment work and are not current local vulnerabilities:

- Hosted TLS, HSTS, CSP hardening, CDN, cache, and trusted-proxy verification.
- Production import memory, load, queue, ingress, monitoring, alerting, and retention evidence.
- Account export, recent-authenticated deletion, backup expiry, and support-access rules.
- Complete security-event operations, administrator access review, and tamper monitoring.
- CI provenance, protected-branch, and continuous secret-scanning policy.

## Dependency findings

### Advisory result

`npm audit --json` reported zero known vulnerabilities: zero Critical, High, Moderate, Low, or Informational advisories. Therefore, there is no evidence of a reachable known dependency vulnerability in this snapshot. This result is time-bound and registry-dependent.

### Security-relevant locked versions

| Package                | Locked version | Root classification |
| ---------------------- | -------------- | ------------------- |
| `next`                 | 16.3.5         | Production          |
| `react`                | 19.2.8         | Production          |
| `react-dom`            | 19.2.8         | Production          |
| `zod`                  | 4.6.5          | Production          |
| `next-themes`          | 0.4.6          | Production          |
| `lucide-react`         | 1.47.0         | Production          |
| `tailwindcss`          | 4.3.3          | Development         |
| `typescript`           | 5.9.3          | Development         |
| `vitest`               | 5.0.1          | Development         |
| `jsdom`                | 30.1.0         | Development         |
| `@playwright/test`     | 1.63.0         | Development         |
| `@axe-core/playwright` | 4.13.0         | Development         |

### Outdated direct packages

`npm outdated --json` reported newer releases for `@types/node`, ESLint, React, React DOM, and TypeScript. Outdated status alone is not a vulnerability. React and React DOM have a newer minor release; the other latest versions cross a major-version boundary and may require compatibility changes. No automatic upgrade is recommended by this audit.

### Dependency paths and lifecycle scripts

- `unrs-resolver@1.12.2` runs `node postinstall.js`. It is a development-only transitive dependency of `eslint-import-resolver-typescript`, reached through `eslint-config-next`.
- `fsevents@2.3.3` is present only as an optional lockfile entry and is not installed on this Linux host.
- No Git, URL, local-path, or prerelease dependency source appears in the lockfile.
- No runtime third-party script is loaded into the browser.
- No direct dependency was identified as unused during the source review.

## Secrets review

### Result

No confirmed secret was found.

| Item                                                               | Classification                                  | Evidence                                                                        |
| ------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`                                         | Placeholder                                     | `.env.example:2` uses a non-project placeholder URL                             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`                                    | Placeholder                                     | `.env.example:3` uses descriptive placeholder text                              |
| `SUPABASE_SERVICE_ROLE_KEY`                                        | Placeholder for a future server-only credential | `.env.example:6` contains no real key and warns against `NEXT_PUBLIC_` exposure |
| Merchant names, amounts, dates, and masked payment nicknames       | Fictional test data                             | Source fixtures and sample CSV use invented services and masked nicknames       |
| Private key or certificate files                                   | Not found                                       | Project file search returned none                                               |
| Personal email, government ID, or 12-19 digit account/card pattern | Not found in source or public fixtures          | Targeted pattern searches returned no match                                     |

The service-role placeholder is not itself a leak. For Phase 2, prefer the current Supabase publishable-key terminology and do not provision an RLS-bypassing secret to ordinary request paths. If elevated access is unavoidable, isolate it in a narrowly scoped server-only module and never pass it to the browser, logs, tests, or error output.

Because Git history is unavailable, the assessment cannot prove that a secret never appeared in an earlier commit.

## Privacy review

### Current UI claims

The reviewed UI does not claim PCI compliance, SOC 2 compliance, bank-grade security, guaranteed subscription detection, guaranteed cancellation, or guaranteed savings. The landing page and dashboard disclose that estimates may be incomplete or inaccurate. Subscription details state that opening a provider page or deleting a local record does not cancel a service. The import page says the upload implementation is planned and warns against real financial data in Phase 1.

### Planned data inventory

Retention values below are proposed maximums that require product, legal, and privacy approval before implementation.

| Data type                    | Purpose and minimum fields                                                                                                       | Storage and access                                                                         | Logging                                                                       | Export and deletion                                                                                                    | Proposed retention                                                                   |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Authentication identity      | Supabase user ID, verified email, auth-provider metadata needed by Supabase                                                      | Supabase Auth; user and narrowly authorized support operations                             | Event type and opaque user ID only; never password, token, or cookie          | Include account identity summary in export; delete through approved account workflow                                   | While account is active; provider-defined recovery window after deletion if approved |
| Authentication session       | Opaque session/refresh material and expiry                                                                                       | Secure cookie and Supabase Auth only                                                       | Never raw token; use a safe correlation value if needed                       | Not exported; revoke on logout, reset risk events, and account deletion                                                | Shortest provider-supported active lifecycle with idle and absolute policy           |
| Profile                      | User ID, currency, time zone, locale, reminder preferences                                                                       | PostgreSQL behind DAL and RLS; owner and minimal support access                            | Do not log values unless a safe preference-change event requires a field name | Export; delete with account                                                                                            | Account lifetime plus documented backup expiry                                       |
| Subscription                 | Names, category, price in minor units, currency, cadence, dates, status, optional nickname, safe URLs, notes, source, confidence | PostgreSQL behind DAL and RLS; owner only by default                                       | Opaque record ID and action only; no notes, merchant text, amount, or URL     | Export; delete or archive at user request; remove on account deletion                                                  | Account lifetime; archived retention must be user-controlled and documented          |
| Transaction                  | Date, signed amount in minor units, currency, normalized merchant, deduplication hash, minimal source link                       | PostgreSQL behind DAL and RLS                                                              | Never description, amount, raw row, account/card data, or hash input          | Export normalized approved data; delete with import/account according to product rules                                 | Keep only while needed for detection/history; define a bounded period before Phase 4 |
| Raw statement                | Bytes needed to validate and parse one upload                                                                                    | Private bounded ephemeral memory or storage outside webroot                                | Never filename, content, row, description, or account data                    | Never export as a retained artifact; delete on success, rejection, error, timeout, and process recovery                | Minutes, not days; enforce automatic expiry                                          |
| Import metadata              | Owner, timestamps, safe status, format, byte/row counts, nonreversible deduplication hash, safe error code                       | PostgreSQL behind DAL and RLS                                                              | Safe status/counts and opaque import ID only                                  | Export safe metadata; delete with account after any fraud-abuse retention exception                                    | Bounded operational period; justify deduplication retention separately               |
| Column mapping               | Canonical field-to-header positions or sanitized header labels                                                                   | PostgreSQL behind DAL and RLS                                                              | Do not log user header text                                                   | Export if useful; delete with account                                                                                  | Account lifetime only if reuse provides value; otherwise import lifetime             |
| Merchant alias               | Normalized alias and canonical merchant reference                                                                                | PostgreSQL behind DAL and RLS                                                              | Never raw statement description                                               | Export; delete with account                                                                                            | Account lifetime or until user removes it                                            |
| Price history                | Subscription ID, old/new minor units, detection and confirmation dates                                                           | PostgreSQL behind DAL and RLS                                                              | Event and opaque record ID only                                               | Export; delete with subscription/account                                                                               | Account lifetime unless user deletes related subscription                            |
| Reminder                     | Type, related object ID, due date, status, delivery preference                                                                   | PostgreSQL behind DAL and RLS                                                              | Safe event type and result only                                               | Export; delete after completion or account deletion                                                                    | Short bounded period after completion                                                |
| Budget and savings goal      | Currency, monthly amount in minor units, effective dates                                                                         | PostgreSQL behind DAL and RLS                                                              | Do not log amount                                                             | Export; delete with account                                                                                            | Account lifetime plus backup expiry                                                  |
| Cancellation guide and notes | Safe URL, optional phone, instructions, verification date, user notes                                                            | PostgreSQL behind DAL and RLS; shared/community content requires separate moderation model | Never notes, phone, or instructions                                           | Export user-owned fields; delete with account; shared content needs provenance rules                                   | User-owned: account lifetime; shared: separately approved policy                     |
| Audit event                  | Event type, timestamp, actor ID, object type/opaque ID, result, safe reason, interaction ID                                      | Append-oriented protected store; user access only through a filtered DTO if offered        | This is the log record; exclude financial and authentication content          | Export only a safe user-facing subset; anonymize actor after account deletion if security retention requires the event | Define security and legal period before Phase 2; delete after expiry                 |
| Environment secret           | Supabase server secret and future provider secrets                                                                               | Deployment secret manager; server-only modules                                             | Never log                                                                     | Never export to user; rotate and destroy by provider process                                                           | Active use plus controlled rotation overlap only                                     |
| Future bank token            | Provider token and connection ID, not bank credentials                                                                           | Secret manager or encrypted server store; provider adapter only                            | Opaque connection ID and event only                                           | Do not include raw token in export; revoke and delete on disconnect/account deletion                                   | Connection lifetime plus provider revocation evidence                                |
| Future email token           | Minimal OAuth token and granted scopes                                                                                           | Secret manager or encrypted server store; email adapter only                               | Opaque connection ID and event only                                           | Do not include raw token in export; revoke and delete on disconnect/account deletion                                   | Connection lifetime plus provider revocation evidence                                |
| Test and browser artifacts   | Fictional fixtures, screenshots, traces, reports                                                                                 | Local/CI artifact store with access and expiry controls                                    | Fictional data only                                                           | Not part of user export; delete by CI retention                                                                        | Short CI troubleshooting period                                                      |

### Data-minimization challenges

- Do not collect full card or account numbers. A user-created nickname is sufficient.
- Do not retain a raw statement to improve convenience; retain only approved or strictly detection-required normalized fields.
- Do not retain transaction description noise after a normalized merchant and deduplication evidence satisfy the product purpose unless a documented review need exists.
- Do not make phone number, website, notes, start date, or trial date mandatory when the feature does not need them.
- Do not expose audit internals, IP addresses, or support metadata in routine user queries.
- Do not add analytics or third-party scripts to authenticated financial pages without a separate data-flow and vendor review.

## Verification results

Ordinary correctness failures remain separate from security findings unless evidence establishes a security effect.

| Check                                                            | Final result                                                                                                                                                                                                                 | Security interpretation                                                                                                                                        |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx prettier --check docs/security/*.md IMPLEMENTATION_PLAN.md` | Passed for all four security documents and the updated implementation plan                                                                                                                                                   | Audit deliverables are consistently formatted                                                                                                                  |
| `npm run format:check`                                           | Passed after formatting four previously nonconforming files                                                                                                                                                                  | Repository formatting is clean                                                                                                                                 |
| `npm run lint`                                                   | Passed with no reported issue                                                                                                                                                                                                | No ESLint finding blocked the assessment                                                                                                                       |
| `npm run typecheck`                                              | Passed under strict TypeScript configuration                                                                                                                                                                                 | No TypeScript error blocked the assessment                                                                                                                     |
| `npm test`                                                       | Passed after Phase 2: 10 test files and 40 tests                                                                                                                                                                             | Unit and component checks pass, including authentication, money parsing, HTTPS URL rejection, and browser DTO allowlists                                       |
| `npm run test:e2e`                                               | Passed after Phase 2: 28 tests across desktop Chromium and mobile Chromium                                                                                                                                                   | Registration, confirmation, recovery, onboarding, logout, cross-user denial, application flows, Axe checks, headers, payload minimization, and safe links pass |
| `npm run build`                                                  | Passed with Next.js 16.3.5; 17 static pages generated                                                                                                                                                                        | The production build succeeds; all current product routes are public static or statically generated content                                                    |
| `npm audit --json`                                               | Passed: zero advisories across 561 dependency nodes                                                                                                                                                                          | No registry-known dependency vulnerability was identified at audit time                                                                                        |
| `npm ls --all --parseable`                                       | Passed                                                                                                                                                                                                                       | No invalid, missing required, or extraneous installed package was reported                                                                                     |
| `npm outdated --json`                                            | Completed; newer releases exist for `@types/node`, ESLint, React, React DOM, and TypeScript                                                                                                                                  | Version drift alone is not a vulnerability, and this audit made no package change                                                                              |
| Production `GET /` header probe                                  | Returned `200 OK` with the configured CSP, `Cross-Origin-Opener-Policy`, `Cross-Origin-Resource-Policy`, `Permissions-Policy`, `Referrer-Policy`, `X-Content-Type-Options`, and `X-Frame-Options`; `X-Powered-By` was absent | Confirms Phase 1 remediation of SEC-001. HSTS remains deployment-dependent, and the public cache policy must not apply to future authenticated responses       |

## Limitations

- No hosted deployment, reverse proxy, CDN, DNS, TLS, backup, production SMTP, or cloud configuration was available.
- Local Supabase Auth, migrations, grants, RLS, and application behavior were tested; hosted-provider behavior remains unverified.
- Statement upload does not exist and therefore cannot be penetration-tested.
- `npm audit` covers advisories known to the configured npm registry at command time and does not prove that dependencies are defect-free.
- Full development dependency signature verification stopped on a missing registry attestation endpoint. Production dependency signature verification passed.
- Secret-pattern searches can miss unknown formats and cannot examine external systems.
- Automated accessibility testing is not a complete manual accessibility assessment.
- Mermaid semantic rendering was not completed because the available validator workflow repeatedly stalled. Both diagrams were reviewed as source and have balanced `mermaid` code fences, but a renderer-level syntax check remains outstanding.

## Overall conclusion

The local Phase 2 application has no evidence of an exploitable Critical or High defect. Authentication, private persistence, RLS, cache isolation, client-payload minimization, URL safety, and baseline headers are implemented and covered by automated tests.

That local result does not establish production readiness. Hosted secrets, TLS, CDN behavior, backups, SMTP, monitoring, and operational access require deployment evidence. Statement upload requires the separate enforced pipeline before it can accept any file.

## Current go/no-go recommendation

**Conditional go for local Phase 3 implementation. No-go for production deployment.** Keep subscription writes denied until the Phase 3 DAL, policies, and tests land together.
