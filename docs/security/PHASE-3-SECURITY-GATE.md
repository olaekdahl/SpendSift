# Phase 3 security gate

Gate status: **Passed for local Phase 3; production blocked**

Gate date: 2026-09-17

## Decision

Phase 3 manual subscription management is complete locally. The migration, DAL, Server Actions, and owner-isolation tests landed together and passed the Phase 3-to-Phase 4 checkpoint.

## Entry evidence

- [x] Phase 2 checkpoint reports Low current risk and no confirmed exploitable vulnerability.
- [x] Authenticated identity uses verified Supabase claims.
- [x] Session cookies are HttpOnly and `SameSite=Lax`.
- [x] Protected production responses are private and `no-store`.
- [x] Subscription reads use a server-only DAL and RLS.
- [x] Subscription `insert`, `update`, and `delete` are currently denied to client roles.
- [x] Cross-user known-ID reads return the same not-found result as absent records.
- [x] Current database, browser, accessibility, build, dependency, and secret checks pass.

## Required mutation boundary

- [x] Define Zod schemas for create and update commands.
- [x] Reject unknown fields and never accept `user_id`, audit timestamps, source, or confidence from a manual-entry form.
- [x] Parse money into integer minor units without floating-point storage.
- [x] Validate currency, billing frequency, custom intervals, statuses, dates, optional notes, and HTTPS URLs.
- [x] Create subscriptions only in a `server-only` DAL.
- [x] Derive ownership from the verified session inside every Server Action.
- [x] Return stable generic action results without database details.
- [x] Revalidate affected routes after successful mutations.
- [x] Prevent stale updates from silently overwriting newer changes.

## Required grants and RLS

- [x] Grant only the subscription columns required for owner insert and update.
- [x] Keep `id`, `user_id`, `created_at`, `updated_at`, `source_import_id`, `source`, and automatic confidence fields outside manual update grants where appropriate.
- [x] Add a separate owner `insert` policy with `with check`.
- [x] Add a separate owner `update` policy with both `using` and `with check`.
- [x] Add a separate owner `delete` policy with `using`.
- [x] Keep anonymous access denied.
- [x] Keep other-user access denied for known IDs.
- [x] Preserve redacted audit events for insert, update, archive, and delete.

## Required product semantics

- [x] Create, view, and edit every required subscription field.
- [x] Archive without claiming that the provider cancelled the service.
- [x] Delete only the local record after explicit confirmation.
- [x] Mark active, trial, paused, cancelled, expired, and needs-review states accurately.
- [x] Explain that provider confirmation is required for cancellation.
- [x] Calculate monthly and annual equivalents consistently for every supported frequency.
- [x] Calculate upcoming renewals using the user's locale and time zone.

## Required tests

- [x] Owner create succeeds and returns the expected record.
- [x] Owner update succeeds only with a current concurrency token.
- [x] Owner archive succeeds without changing provider-cancellation claims.
- [x] Owner delete removes only the selected local record.
- [x] Anonymous writes fail.
- [x] Cross-user reads and writes fail for known IDs.
- [x] Ownership and protected-field mass assignment fail.
- [x] Invalid money, date, status, interval, URL, and oversized text fail before database access.
- [x] Denied writes leave the target row unchanged.
- [x] Audit events contain only allowlisted metadata.
- [x] Browser tests cover create, edit, archive, and delete.
- [x] Formatting, linting, strict typing, unit/component tests, database tests, browser/accessibility tests, production build, production cache test, dependency audit, and Gitleaks pass.

## Completion decision

Phase 3 is complete only when every required implementation and test item passes and the Phase 3-to-Phase 4 checkpoint audit issues a go decision.

Current decision: **Passed for local Phase 3 implementation.**
