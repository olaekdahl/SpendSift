# Phase 3 security gate

Gate status: **Conditional go for local implementation; production blocked**

Gate date: 2026-09-17

## Decision

Phase 3 may add manual subscription management locally. Subscription writes must remain inaccessible until the migration, DAL, Server Actions, and complete owner-isolation tests land together.

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

- [ ] Define Zod schemas for create and update commands.
- [ ] Reject unknown fields and never accept `user_id`, audit timestamps, source, or confidence from a manual-entry form.
- [ ] Parse money into integer minor units without floating-point storage.
- [ ] Validate currency, billing frequency, custom intervals, statuses, dates, optional notes, and HTTPS URLs.
- [ ] Create subscriptions only in a `server-only` DAL.
- [ ] Derive ownership from the verified session inside every Server Action.
- [ ] Return stable generic action results without database details.
- [ ] Revalidate affected routes after successful mutations.
- [ ] Prevent stale updates from silently overwriting newer changes.

## Required grants and RLS

- [ ] Grant only the subscription columns required for owner insert and update.
- [ ] Keep `id`, `user_id`, `created_at`, `updated_at`, `source_import_id`, `source`, and automatic confidence fields outside manual update grants where appropriate.
- [ ] Add a separate owner `insert` policy with `with check`.
- [ ] Add a separate owner `update` policy with both `using` and `with check`.
- [ ] Add a separate owner `delete` policy with `using`.
- [ ] Keep anonymous access denied.
- [ ] Keep other-user access denied for known IDs.
- [ ] Preserve redacted audit events for insert, update, archive, and delete.

## Required product semantics

- [ ] Create, view, and edit every required subscription field.
- [ ] Archive without claiming that the provider cancelled the service.
- [ ] Delete only the local record after explicit confirmation.
- [ ] Mark active, trial, paused, cancelled, expired, and needs-review states accurately.
- [ ] Explain that provider confirmation is required for cancellation.
- [ ] Calculate monthly and annual equivalents consistently for every supported frequency.
- [ ] Calculate upcoming renewals using the user's locale and time zone.

## Required tests

- [ ] Owner create succeeds and returns the expected record.
- [ ] Owner update succeeds only with a current concurrency token.
- [ ] Owner archive succeeds without changing provider-cancellation claims.
- [ ] Owner delete removes only the selected local record.
- [ ] Anonymous writes fail.
- [ ] Cross-user reads and writes fail for known IDs.
- [ ] Ownership and protected-field mass assignment fail.
- [ ] Invalid money, date, status, interval, URL, and oversized text fail before database access.
- [ ] Denied writes leave the target row unchanged.
- [ ] Audit events contain only allowlisted metadata.
- [ ] Browser tests cover create, edit, archive, and delete.
- [ ] Formatting, linting, strict typing, unit/component tests, database tests, browser/accessibility tests, production build, production cache test, dependency audit, and Gitleaks pass.

## Completion decision

Phase 3 is complete only when every required implementation and test item passes and the Phase 3-to-Phase 4 checkpoint audit issues a go decision.

Current decision: **Conditional go for local Phase 3 implementation.**
