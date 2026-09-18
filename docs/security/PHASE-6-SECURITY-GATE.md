# Phase 6 security gate

Gate status: **Passed for local Phase 6 with fictional data; production blocked**

Gate date: 2026-09-17

## Decision

Phase 6 may implement owner-managed cancellation guidance, data export, and account deletion locally. Production and real financial data remain blocked. Export and deletion require recent password verification and explicit confirmation.

## Cancellation guidance gate

- [x] Store guides per owner and subscription with owner-safe foreign keys.
- [x] Validate cancellation URLs as HTTPS without credentials or controls in both application and database layers.
- [x] Bound phone numbers, instructions, notes, and verification dates.
- [x] Distinguish user-maintained guidance from provider-confirmed cancellation.
- [x] Show destination hostnames and use `noopener noreferrer` for new tabs.
- [x] Keep community or shared guidance out of scope.
- [x] Add owner, anonymous, known-ID cross-user, stale-write, and redacted-audit tests.

## Export gate

- [x] Authenticate before reading the request body and require exact same origin.
- [x] Reauthenticate with the current password without logging, storing, or returning it.
- [x] Use a fixed generated filename and `private, no-store` response headers.
- [x] Export only the verified user's records through a controlled database operation.
- [x] Include a schema version and generated timestamp without secrets, tokens, raw statement bytes, or unrelated users.
- [x] Use JSON for the first export to avoid spreadsheet formula execution.
- [x] Add two-user isolation, cache, content-disposition, and prohibited-content tests.

## Account deletion gate

- [x] Reauthenticate with the current password immediately before deletion.
- [x] Require an exact typed confirmation separate from local subscription deletion.
- [x] Delete only the verified current Auth user through a narrowly granted controlled function.
- [x] Cascade all owner rows and verify no orphan remains.
- [x] Revoke the session and expire every application authentication cookie.
- [x] Keep a content-free deletion receipt without retaining user identity or financial data.
- [x] Return a generic result that does not expose database or authentication internals.
- [x] Add wrong-password, missing-confirmation, cross-user, stale-session, cascade, cookie, and replay tests.

## Privacy and accessibility gate

- [x] Publish accurate local data, retention, export, deletion, backup, support, and limitation disclosures.
- [x] Link privacy controls from settings and make destructive actions keyboard and screen-reader accessible.
- [x] Verify focus, labels, contrast, reduced motion, mobile layout, and no horizontal overflow.
- [x] Confirm logs and audit events contain no passwords, exports, financial fields, cancellation notes, or raw statement content.
- [x] Keep deployment-specific privacy, backup expiry, legal, and support-access claims explicitly unresolved.

## Required checks

- [x] Formatting, linting, strict typing, unit/component tests, database tests, and desktop/mobile browser tests pass.
- [x] Production build and two-user cache isolation pass.
- [x] Dependency audit and dependency tree checks pass.
- [x] Git-visible and history-aware secret scans pass.
- [x] The Phase 6-to-Phase 7 checkpoint audit issues a go decision before release hardening.

## Completion decision

Phase 6 is complete only when every gate item passes and the Phase 6-to-Phase 7 checkpoint audit issues a go decision.

Current decision: **Passed for local Phase 6 with fictional data. Conditional go for Phase 7 release hardening without deployment.**
