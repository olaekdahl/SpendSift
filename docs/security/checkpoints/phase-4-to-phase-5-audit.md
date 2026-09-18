# Phase 4 to Phase 5 security checkpoint

Checkpoint date: 2026-09-17

## Executive summary

Phase 4 passes for local use with fictional CSV statements. The implementation has no confirmed exploitable Critical, High, or Medium vulnerability, no exposed secret, and no registry-known dependency vulnerability. Phase 5 may proceed locally under `PHASE-5-SECURITY-GATE.md`.

Production deployment and real financial statements remain blocked. A production-equivalent environment must prove trusted proxy-header handling, ingress limits, memory behavior, monitoring, retention, TLS, and cache isolation.

## Implemented boundary

- One authenticated, same-origin, POST-only Route Handler verifies identity before reading a body.
- PostgreSQL enforces five attempts per account per hour, network-aware throttling, one active import per account, opaque ten-minute permits, and 24-hour attempt cleanup.
- The handler streams into a bounded 5 MiB buffer and never writes a source file to disk or PostgreSQL.
- `csv-parse` validates UTF-8 CSV with bounded rows, columns, lines, fields, headers, and record shape.
- Zod validates explicit date, description, amount or debit/credit, and date-format mappings.
- Merchant normalization and recurrence detection are deterministic, separate modules with stable reason codes.
- Import and transaction SHA-256 fingerprints include the verified user ID and have user-scoped unique constraints.
- Atomic database functions persist normalized transactions, mappings, and suggestions without accepting a client `user_id`.
- Direct client table writes remain denied. Owner-only RLS controls reads, and owner-safe foreign keys protect relationships.
- Suggestions require explicit edit, approve, merge, reject, or defer actions with optimistic concurrency tokens.
- Audit events contain only opaque IDs, safe event and reason codes, counts, and duration buckets.
- Spreadsheet export helpers neutralize ASCII and full-width formula prefixes before quoting cells.

## Audit findings and remediation

The first independent review found no exploitable vulnerability. It requested stronger executable evidence for endpoint rate limiting, sequential deduplication, cross-user fingerprint scope, and audit privacy. Browser tests now cover those paths.

A follow-up review confirmed the remediation. Additional database hardening bounds direct RPC JSON payloads independently of the HTTP route and prunes private attempt records after 24 hours.

The following are deployment concerns, not approvals:

- Network throttling assumes a trusted ingress proxy strips untrusted forwarding headers and sets the authoritative client address.
- JavaScript heap reclamation is runtime-controlled. The request buffer is bounded and cleared, but production memory limits and monitoring still require verification.
- The in-process parser is bounded by file and structure limits. Production load testing must confirm the hosting resource budget.

## Verification results

- Formatting, ESLint, and strict TypeScript: passed.
- Unit and component tests: 18 files and 108 tests passed.
- Database reset: all three migrations applied from an empty database.
- Database tests: 102 pgTAP assertions passed.
- Browser tests: 50 desktop and mobile scenarios passed.
- Accessibility and horizontal-overflow checks: passed for the upload and review interfaces.
- Production build: passed; the import API and protected pages remain dynamic.
- Production cache test: two simultaneous accounts received isolated `private, no-store` responses.
- Dependency audit: zero known advisories; installed dependency tree valid.
- Git-visible Gitleaks scan: no leak found.

## Decision

**Conditional go for local Phase 5 implementation with fictional data. No-go for production deployment or real financial statements.**
