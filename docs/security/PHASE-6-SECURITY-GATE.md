# Phase 6 security gate

Gate status: **Conditional go for local cancellation and privacy implementation with fictional data**

Gate date: 2026-09-17

## Decision

Phase 6 may implement owner-managed cancellation guidance, data export, and account deletion locally. Production and real financial data remain blocked. Export and deletion require recent password verification and explicit confirmation.

## Cancellation guidance gate

- [ ] Store guides per owner and subscription with owner-safe foreign keys.
- [ ] Validate cancellation URLs as HTTPS without credentials or controls in both application and database layers.
- [ ] Bound phone numbers, instructions, notes, and verification dates.
- [ ] Distinguish user-maintained guidance from provider-confirmed cancellation.
- [ ] Show destination hostnames and use `noopener noreferrer` for new tabs.
- [ ] Keep community or shared guidance out of scope.
- [ ] Add owner, anonymous, known-ID cross-user, stale-write, and redacted-audit tests.

## Export gate

- [ ] Authenticate before reading the request body and require exact same origin.
- [ ] Reauthenticate with the current password without logging, storing, or returning it.
- [ ] Use a fixed generated filename and `private, no-store` response headers.
- [ ] Export only the verified user's records through a controlled database operation.
- [ ] Include a schema version and generated timestamp without secrets, tokens, raw statement bytes, or unrelated users.
- [ ] Use JSON for the first export to avoid spreadsheet formula execution.
- [ ] Add two-user isolation, cache, content-disposition, and prohibited-content tests.

## Account deletion gate

- [ ] Reauthenticate with the current password immediately before deletion.
- [ ] Require an exact typed confirmation separate from local subscription deletion.
- [ ] Delete only the verified current Auth user through a narrowly granted controlled function.
- [ ] Cascade all owner rows and verify no orphan remains.
- [ ] Revoke the session and expire every application authentication cookie.
- [ ] Keep a content-free deletion receipt without retaining user identity or financial data.
- [ ] Return a generic result that does not expose database or authentication internals.
- [ ] Add wrong-password, missing-confirmation, cross-user, stale-session, cascade, cookie, and replay tests.

## Privacy and accessibility gate

- [ ] Publish accurate local data, retention, export, deletion, backup, support, and limitation disclosures.
- [ ] Link privacy controls from settings and make destructive actions keyboard and screen-reader accessible.
- [ ] Verify focus, labels, contrast, reduced motion, mobile layout, and no horizontal overflow.
- [ ] Confirm logs and audit events contain no passwords, exports, financial fields, cancellation notes, or raw statement content.
- [ ] Keep deployment-specific privacy, backup expiry, legal, and support-access claims explicitly unresolved.

## Required checks

- [ ] Formatting, linting, strict typing, unit/component tests, database tests, and desktop/mobile browser tests pass.
- [ ] Production build and two-user cache isolation pass.
- [ ] Dependency audit and dependency tree checks pass.
- [ ] Git-visible and history-aware secret scans pass.
- [ ] The Phase 6-to-Phase 7 checkpoint audit issues a go decision before release hardening.

## Completion decision

Phase 6 is complete only when every gate item passes and the Phase 6-to-Phase 7 checkpoint audit issues a go decision.

Current decision: **Conditional go for local Phase 6 implementation with fictional data only.**
