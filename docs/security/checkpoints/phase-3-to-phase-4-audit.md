# Phase 3 to Phase 4 security checkpoint

Checkpoint date: 2026-09-17

## Executive summary

SubTrack can begin local Phase 4 statement-import implementation under the bounded upload contract. Phase 3 manual subscription management has a **Low** current risk rating, no confirmed exploitable vulnerability, no exposed secret, and no registry-known dependency vulnerability.

Subscription create, read, update, archive, and local delete are implemented through strict Server Actions, a `server-only` DAL, column-level grants, and owner-scoped RLS. The user cannot assign ownership, import provenance, confidence, identifiers, or audit timestamps. Optimistic concurrency prevents stale browser state from overwriting newer changes.

Phase 4 must not accept any file until its receive, parse, normalize, review, persist, cleanup, rate-limit, and audit controls are implemented together.

## Phase 3 delta

Phase 3 adds:

- Manual create and edit forms for service, category, amount, currency, billing frequency, custom interval, dates, status, payment nickname, website, cancellation URL and instructions, notes, and reminder lead time.
- Strict server-side Zod validation with unknown-field and duplicate-field rejection.
- Integer-minor-unit money parsing with no floating-point persistence.
- Owner-only subscription insert, update, archive, and delete grants and RLS policies.
- Column-level privilege restrictions for ownership, provenance, confidence, identifiers, and timestamps.
- HTTPS URL checks in both application and database layers.
- Optimistic concurrency through `updated_at` matching.
- Explicit distinction among provider cancellation, local cancelled status, archive, and local deletion.
- Redacted mutation audit events.
- Browser-safe editor DTOs.

## Findings

### New confirmed findings

None remain after remediation.

### Remediated during checkpoint

- A missing database-level check for `next_billing_date >= start_date` was added and tested. Application validation already enforced the rule, but the database now protects direct Data API writes too.
- React Server Action metadata initially caused strict form validation to reject valid submissions. The parser now removes only `$ACTION_*` framework fields while preserving every user-supplied unknown or duplicate field for strict rejection.

### Independent review dispositions

- The cancellation URL constraint correctly checks `cancellation_url` for encoded controls; the reported copy-paste error was not present in the reviewed file.
- Future tables without policies remain intentionally inaccessible because grants are revoked and RLS is enabled and forced.
- Subscription write permissions are intentionally limited to manually editable columns.
- Server Actions rely on Next.js same-origin enforcement, `SameSite=Lax` cookies, and independent claim verification. Any future Route Handler mutation needs an explicit origin review.

## Verification results

- Formatting: passed.
- ESLint: passed.
- Strict TypeScript: passed.
- Unit and component tests: 12 files and 55 tests passed.
- Database reset: both migrations applied from an empty database.
- Database tests: 70 pgTAP assertions passed.
- Browser tests: 38 desktop and mobile tests passed.
- Production build: passed; private and mutation routes render dynamically.
- Production cache test: two simultaneous users receive isolated records with `private, no-store` responses.
- npm audit: zero known advisories.
- Dependency tree: valid.
- Git-visible Gitleaks scan: no leak found.

## Phase 4 security conditions

Before a CSV reaches parsing code:

1. Verify the authenticated user before reading the request body.
2. Apply account and network-aware rate limits and one active import per user.
3. Accept exactly one `.csv` file through a route handler with a hard 5 MiB byte cap.
4. Treat MIME and extension as hints and validate UTF-8 textual CSV structure.
5. Reject null bytes, unsupported encodings, overlong fields, duplicate normalized headers, excessive rows or columns, and malformed quoting.
6. Use a maintained RFC 4180-capable parser under a bounded resource model.
7. Never use the supplied filename for storage paths or logs.
8. Keep raw bytes in memory only for the bounded request or in private generated-name ephemeral storage when unavoidable.
9. Delete raw bytes on success and every failure path.
10. Normalize and validate every canonical field before detection or persistence.
11. Scope import and transaction fingerprints to the verified user.
12. Require explicit review before creating a subscription.
13. Store only approved or strictly detection-required normalized data.
14. Record only redacted event types, counts, opaque IDs, duration buckets, and safe error codes.
15. Neutralize formula-capable values only when exporting to spreadsheet formats.

## Limitations

- Hosted ingress limits, CDN behavior, TLS, malware scanning infrastructure, worker isolation, and production rate limiting cannot be proven locally.
- CSV has no reliable magic signature; content and structure validation remain the primary controls.
- No statement upload exists at this checkpoint, so the parser and cleanup paths cannot yet be penetration-tested.
- Production deployment remains blocked.

## Decision

**Conditional go for local Phase 4 implementation. No-go for production deployment or real financial statements.**

Use only fictional sample statements until the Phase 4-to-Phase 5 audit passes.
