# Deployment guide

## Status

This repository is ready for local fictional-data use only. No deployment has been performed or approved. Complete every prerequisite below in a production-equivalent staging environment before using real financial data.

## Required approvals

Obtain explicit approval from:

- The deployment owner for DNS, TLS, CDN, proxy, compute, database, backups, and rollback.
- Security for ingress trust, secrets, Auth, database roles, logs, monitoring, incident response, and final penetration testing.
- Privacy and legal owners for the privacy notice, retention, backup expiry, deletion, data location, subprocessors, and user requests.
- Product for support access, cancellation wording, and notification behavior.

## Target architecture

Use a supported Node.js runtime behind one trusted reverse proxy or managed edge. Use separate Supabase development, staging, and production projects.

The edge must:

- Terminate TLS and redirect HTTP to HTTPS.
- Strip inbound `X-Forwarded-For` and `X-Real-IP`, then set the authoritative client address.
- Preserve the exact `Origin`, `Host`, `Set-Cookie`, `Cache-Control`, `Expires`, and `Pragma` behavior.
- Reject request bodies larger than 5 MiB before forwarding.
- Apply request, connection, and execution timeouts and bounded concurrency.
- Never cache authenticated HTML, React Server Component responses, session refreshes, exports, or account deletion responses.

Do not expose the Node.js process directly to the internet. Network-aware import and account-action limits depend on the trusted forwarding-header boundary.

## Runtime configuration

Set these values in the deployment secret manager:

- `APP_URL`: the exact HTTPS application origin.
- `NEXT_PUBLIC_SUPABASE_URL`: the production Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: the production publishable key.

Do not configure `SUPABASE_SECRET_KEY` for ordinary application requests. Do not expose any secret key through a `NEXT_PUBLIC_` name, browser bundle, build log, or support tool.

Set `NODE_ENV=production`. Verify that authentication cookies are `Secure`, `HttpOnly`, `SameSite=Lax`, and scoped to the expected host and path.

## Supabase configuration

Mirror the reviewed local Auth controls in each hosted project:

- Exact site and redirect URLs with no wildcard production callback.
- Confirmed email sign-up.
- Minimum 12-character passwords with lower-case, upper-case, and digit requirements.
- Refresh-token rotation.
- Bounded absolute and inactivity sessions.
- Secure password changes.
- Hosted Auth abuse limits and production SMTP.
- Anonymous and manual-linking flows disabled.

Keep `auto_expose_new_tables` behavior deny-by-default. Apply only reviewed migrations. Ordinary application traffic must use the publishable key and the signed-in user's session.

## Database migration

1. Back up the target project through the approved provider process.
2. Restore that backup into a separate staging project and verify it before changing production.
3. Run the repository against staging with production-equivalent Auth, edge, and cache settings.
4. Review the migration diff and generated types.
5. Apply migrations through an approved non-interactive release identity.
6. Run schema lint, policy tests, owner-isolation tests, export, deletion, and rollback checks.
7. Record the migration version and verification evidence.

Never run `db:reset` against a hosted project. Never use a developer's personal elevated key in CI or production.

## Security headers

The application sets CSP, clickjacking, MIME, referrer, permissions, opener, and resource policies. Before deployment:

- Validate the CSP against the final hosting output and every route.
- Replace inline script and style allowances with a reviewed nonce or hash strategy where the platform permits it.
- Add HSTS only after every covered host supports HTTPS; include subdomains only after confirming their TLS readiness.
- Keep `X-Powered-By` disabled.
- Do not add browser Supabase, analytics, tags, or third-party scripts without updating CSP and completing a data-flow review.

## Caching

Authenticated and sensitive responses must remain `private, no-store`. Configure the CDN to bypass caching when a request or response contains authentication cookies and to respect origin cache headers.

Repeat the two-user cache test through the real staging CDN and proxy. Confirm that no response body, RSC payload, cookie, export, or redirect from one user reaches another.

## Resource limits

Load-test fictional fixtures at the configured limits:

- 5 MiB CSV body.
- 10,000 data rows.
- 64 columns.
- 64 KiB line length.
- 8 KiB source field length.
- One active import per account.
- Five import and sensitive-account action attempts per account per hour.

Define Node.js memory limits, process count, request timeout, database pool size, queue behavior, and restart policy from measured staging results. Verify that large JSON exports do not exceed memory or edge-response limits.

## Retention and backups

Before deployment, define and test:

- Backup frequency, encryption, access, region, expiry, and restore objectives.
- Deletion behavior in primary storage, replicas, logs, analytics, and backups.
- Scheduled cleanup for expired import and account-action attempts.
- Audit-event retention and tamper detection.
- Legal hold and user-request exceptions.
- Support access roles, approval, masking, and attribution.

The local privacy page intentionally states that these controls are unresolved. Update it only after implementation and approval.

## Monitoring and alerts

Use content-free metrics and safe reason codes. Never log request bodies, passwords, cookies, tokens, exports, statement rows, filenames, merchant descriptions, amounts, cancellation notes, or database connection strings.

Alert on:

- Sustained authentication, import, export, or deletion failures.
- Rate-limit spikes.
- Missing or untrusted forwarding headers.
- Elevated memory, CPU, database connections, and request latency.
- Repeated 5xx responses or process restarts.
- Database policy, migration, or backup failures.
- Secret-scanning or dependency-advisory failures.

## CI/CD

The workflow must use `npm ci`, a pinned Node.js major version, the committed lockfile, isolated credentials, minimal permissions, and reviewed package changes. Run the same commands as `npm run verify`, followed by advisory, dependency-tree, and secret scans.

Do not give pull-request jobs production secrets. Require reviewed changes and passing checks before merge. Generate release provenance and a software bill of materials when selecting a deployment platform.

## Rollout and rollback

1. Deploy to staging with fictional data.
2. Run the complete release gate through the production-equivalent edge.
3. Review logs for prohibited content and CSP violations.
4. Run backup restore and rollback drills.
5. Obtain the required approvals.
6. Deploy during an approved window with monitoring active.
7. Stop rollout on authentication, authorization, cache-isolation, migration, or data-integrity failure.

Rollback application code to the prior immutable artifact. Roll back database changes only through a reviewed forward-fix or tested restoration plan. Never improvise destructive SQL against production.

## Production no-go conditions

Do not deploy or accept real data while any of these conditions remains true:

- Forwarding-header ownership is unverified.
- HTTPS, secure cookies, HSTS scope, CSP, or CDN cache rules are unverified.
- Backup expiry and restore behavior are undefined or untested.
- Scheduled retention, monitoring, alerting, or incident response is absent.
- Privacy/legal or support-access approval is missing.
- A High or Critical reachable advisory or confirmed security finding remains open.
- The final release matrix or secret scan fails.
