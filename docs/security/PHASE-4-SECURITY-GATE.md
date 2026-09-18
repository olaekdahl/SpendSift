# Phase 4 security gate

Gate status: **Passed for fictional local CSV use; production and real statements blocked**

Gate date: 2026-09-17

## Decision

Phase 4 CSV import is complete for local use with fictional data. Do not use a real bank or card statement, deploy the importer, or enable another file format. Production requires trusted-proxy, memory-resource, retention, and hosted-infrastructure verification.

## Entry evidence

- [x] Phase 3 checkpoint reports Low current risk and no confirmed exploitable vulnerability.
- [x] Every protected operation verifies signed claims.
- [x] Subscription mutation DAL, grants, RLS, optimistic locking, and audit events pass.
- [x] Future import tables remain closed to `anon` and `authenticated` roles.
- [x] The numeric upload and parser ceilings in `THREAT-MODEL.md` are approved as maximums.
- [x] The public sample statement is fictional and explicitly allowlisted in `.gitignore`.
- [x] Current checks, dependency audit, and Git-visible secret scan pass.

## Receive and rate-limit gate

- [x] Use one authenticated Route Handler as the upload entry point.
- [x] Verify identity before reading the file body.
- [x] Require same-origin requests and reject unsupported methods.
- [x] Allow one active import per account.
- [x] Limit attempts to five per account per hour and add network-aware throttling.
- [x] Accept exactly one file.
- [x] Stream and enforce the 5 MiB cap before unbounded buffering.
- [x] Reject empty files and misleading double extensions.
- [x] Do not store or log the supplied filename.
- [x] Return generic safe error codes without parser internals or financial content.

## CSV validation gate

- [x] Permit `.csv` only for the first release.
- [x] Treat `text/csv` and documented compatibility MIME values as hints, not proof.
- [x] Accept UTF-8 with an optional UTF-8 BOM only.
- [x] Reject invalid UTF-8, null bytes, unsupported control characters, and unsupported encodings.
- [x] Parse with maintained `csv-parse`, not string splitting.
- [x] Enforce at most 10,000 data rows, 64 columns, 64 KiB lines, and 8 KiB source fields.
- [x] Reject empty and duplicate normalized headers.
- [x] Reject malformed quotes and unsafe row-shape ambiguity.
- [x] Normalize canonical text to NFC and collapse merchant whitespace.
- [x] Validate dates, signed integer minor-unit amounts, currency, and mapped columns with Zod.

## Processing and persistence gate

- [x] Separate statement parsing, column mapping, merchant normalization, recurrence detection, review state, and persistence modules.
- [x] Calculate cryptographic import and transaction fingerprints scoped to the verified user.
- [x] Enforce duplicate-import and duplicate-transaction uniqueness in PostgreSQL.
- [x] Make retries idempotent and concurrency-safe.
- [x] Do not create a subscription during parsing or detection.
- [x] Require explicit approve, edit, merge, reject, or defer decisions.
- [x] Persist only normalized data needed for review or explicitly approved data.
- [x] Enforce ownership with server-derived `user_id`, column grants, RLS, and parent-child owner-safe foreign keys.
- [x] Add reviewed import, transaction, mapping, and merchant-alias policies only with their DAL operations.
- [x] Keep raw bytes in bounded request memory only and release them on every success and failure path.

## Output and logging gate

- [x] Render headers, merchant descriptions, and errors as text only.
- [x] Keep raw rows, filenames, transaction descriptions, amounts, account data, and statement content out of logs.
- [x] Record only opaque import ID, event type, safe status, counts, duration bucket, and safe error code.
- [x] Keep audit events append-only and inaccessible to direct client writes.
- [x] Apply target-specific formula neutralization to every untrusted CSV export cell, including `=`, `+`, `-`, `@`, tab, CR, LF, and full-width variants.
- [x] Explain raw-file deletion, retained normalized data, and detection limitations before upload.

## Required tests

- [x] Valid fictional CSV and every supported column-mapping shape.
- [x] Empty, oversized, too-many-row, too-many-column, overlong-line, and overlong-field input.
- [x] Invalid UTF-8, BOM, null byte, controls, duplicate headers, malformed quotes, and inconsistent rows.
- [x] Malicious filename and MIME mismatch.
- [x] Formula-prefix fixtures and safe export behavior.
- [x] Merchant normalization aliases and noisy identifiers.
- [x] Weekly, monthly, quarterly, annual, and billing-date-shift recurrence patterns.
- [x] Confidence scoring and plain-language reason stability.
- [x] Duplicate import, duplicate transaction, retry, and concurrent submission.
- [x] Owner, anonymous, and known-ID cross-user isolation for every import table.
- [x] Raw bytes are never persisted; bounded buffers are cleared on success and failure.
- [x] Approve, edit, merge, reject, defer, and import summary workflows.
- [x] Audit-log assertions contain no prohibited content.
- [x] Desktop/mobile browser and accessibility coverage for upload, mapping, preview, review, and completion.
- [x] Formatting, linting, strict typing, all tests, production build, production cache test, dependency audit, and Gitleaks pass.

## Completion decision

Phase 4 is complete only when all implementation and verification items pass and the Phase 4-to-Phase 5 checkpoint audit issues a go decision.

Current decision: **Passed for fictional local CSV use. Conditional go for local Phase 5 implementation. Production and real statement use remain blocked.**
