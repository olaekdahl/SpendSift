# Phase 4 security gate

Gate status: **Conditional go for fictional local CSV implementation only**

Gate date: 2026-09-17

## Decision

Phase 4 may implement CSV import locally with fictional data. Do not use a real bank or card statement, deploy the importer, or enable another file format until every item below passes and the Phase 4-to-Phase 5 audit records a go decision.

## Entry evidence

- [x] Phase 3 checkpoint reports Low current risk and no confirmed exploitable vulnerability.
- [x] Every protected operation verifies signed claims.
- [x] Subscription mutation DAL, grants, RLS, optimistic locking, and audit events pass.
- [x] Future import tables remain closed to `anon` and `authenticated` roles.
- [x] The numeric upload and parser ceilings in `THREAT-MODEL.md` are approved as maximums.
- [x] The public sample statement is fictional and explicitly allowlisted in `.gitignore`.
- [x] Current checks, dependency audit, and Git-visible secret scan pass.

## Receive and rate-limit gate

- [ ] Use one authenticated Route Handler or Server Action as the upload entry point.
- [ ] Verify identity before reading the file body.
- [ ] Require same-origin requests and reject unsupported methods.
- [ ] Allow one active import per account.
- [ ] Limit attempts to five per account per hour and add network-aware throttling.
- [ ] Accept exactly one file.
- [ ] Stream or otherwise enforce the 5 MiB cap before unbounded buffering.
- [ ] Reject empty files and misleading double extensions.
- [ ] Do not store or log the supplied filename.
- [ ] Return generic safe error codes without parser internals or financial content.

## CSV validation gate

- [ ] Permit `.csv` only for the first release.
- [ ] Treat `text/csv` and documented compatibility MIME values as hints, not proof.
- [ ] Accept UTF-8 with an optional UTF-8 BOM only.
- [ ] Reject invalid UTF-8, null bytes, unsupported control characters, and unsupported encodings.
- [ ] Parse with a maintained RFC 4180-capable library, not string splitting.
- [ ] Enforce at most 10,000 data rows, 64 columns, 64 KiB lines, and 8 KiB source fields.
- [ ] Reject empty and duplicate normalized headers.
- [ ] Reject malformed quotes and unsafe row-shape ambiguity.
- [ ] Normalize canonical text to NFC and collapse merchant whitespace.
- [ ] Validate dates, signed integer minor-unit amounts, currency, and mapped columns with Zod.

## Processing and persistence gate

- [ ] Separate statement parsing, column mapping, merchant normalization, recurrence detection, review state, and persistence modules.
- [ ] Calculate cryptographic import and transaction fingerprints scoped to the verified user.
- [ ] Enforce duplicate-import and duplicate-transaction uniqueness in PostgreSQL.
- [ ] Make retries idempotent and concurrency-safe.
- [ ] Do not create a subscription during parsing or detection.
- [ ] Require explicit approve, edit, merge, reject, or defer decisions.
- [ ] Persist only normalized data needed for review or explicitly approved data.
- [ ] Enforce ownership with server-derived `user_id`, column grants, RLS, and parent-child owner-safe foreign keys.
- [ ] Add reviewed import, transaction, mapping, and merchant-alias policies only with their DAL operations.
- [ ] Delete raw bytes on success, rejection, validation failure, parser error, timeout, and recovery cleanup.

## Output and logging gate

- [ ] Render headers, merchant descriptions, and errors as text only.
- [ ] Keep raw rows, filenames, transaction descriptions, amounts, account data, and statement content out of logs.
- [ ] Record only opaque import ID, event type, safe status, counts, duration bucket, and safe error code.
- [ ] Keep audit events append-only and inaccessible to direct client writes.
- [ ] Apply target-specific formula neutralization to every untrusted CSV export cell, including `=`, `+`, `-`, `@`, tab, CR, LF, and full-width variants.
- [ ] Explain raw-file deletion, retained normalized data, and detection limitations before upload.

## Required tests

- [ ] Valid fictional CSV and every supported column-mapping shape.
- [ ] Empty, oversized, too-many-row, too-many-column, overlong-line, and overlong-field input.
- [ ] Invalid UTF-8, BOM, null byte, controls, duplicate headers, malformed quotes, and inconsistent rows.
- [ ] Malicious filename and MIME mismatch.
- [ ] Formula-prefix fixtures and safe export behavior.
- [ ] Merchant normalization aliases and noisy identifiers.
- [ ] Weekly, monthly, quarterly, annual, and billing-date-shift recurrence patterns.
- [ ] Confidence scoring and plain-language reason stability.
- [ ] Duplicate import, duplicate transaction, retry, and concurrent submission.
- [ ] Owner, anonymous, and known-ID cross-user isolation for every import table.
- [ ] Raw-byte cleanup on every success and failure path.
- [ ] Approve, edit, merge, reject, defer, and import summary workflows.
- [ ] Captured logs contain no prohibited content.
- [ ] Desktop/mobile browser and accessibility coverage for upload, mapping, preview, review, and completion.
- [ ] Formatting, linting, strict typing, all tests, production build, production cache test, dependency audit, and Gitleaks pass.

## Completion decision

Phase 4 is complete only when all implementation and verification items pass and the Phase 4-to-Phase 5 checkpoint audit issues a go decision.

Current decision: **Conditional go for fictional local CSV implementation only.**
