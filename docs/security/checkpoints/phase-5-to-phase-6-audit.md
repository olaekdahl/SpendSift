# Phase 5 to Phase 6 security checkpoint

Checkpoint date: 2026-09-17

## Executive summary

Phase 5 passes for local use with fictional data. Independent review found no confirmed exploitable vulnerability in price detection, overlap guidance, budgets, savings, calendar calculations, or in-app reminders. Phase 6 may proceed locally under `PHASE-6-SECURITY-GATE.md`.

Production deployment and real financial data remain blocked by hosted ingress, resource, monitoring, retention, cache, and operational controls.

## Implemented boundary

- Price candidates come only from the newest owner-linked normalized transaction in the subscription currency.
- JavaScript and PostgreSQL apply the same $0.50 and 200-basis-point noise thresholds and reject implausible changes above 500,000 basis points.
- Confirmation re-derives the candidate in PostgreSQL, locks the current subscription version, appends immutable history, updates price atomically, and clears the related reminder.
- Category overlaps remain advisory, exclude `Other` and inactive records, separate currencies, and use an owner-configurable threshold from two to five services.
- Potential and realized savings use integer minor units. Realized savings exist only after an explicit provider-confirmed cancellation and clear on reactivation.
- The upcoming calendar uses date-only arithmetic. In-app reminders use owner-safe sources, event-date identity, locale and IANA time-zone display, and optimistic status updates.
- Notification delivery remains behind an in-app interface with no email, SMS, or push transport.
- Profile, budget, goal, overlap, and reminder preferences save atomically through one validated database function.
- Client DTOs exclude ownership, source transaction details, merchant descriptions, and audit internals.

## Audit findings and remediation

The independent review found no exploitable vulnerability. Its hardening recommendations were completed:

- The price-history basis-point ceiling is 500,000 and checks occur before an unsafe integer cast.
- Browser coverage now includes price decreases, reminder dismissal, and invalid preference rollback.
- The UI explains nearest-cent monthly-equivalent rounding.
- Reminder refresh is no longer directly executable by client roles.
- Reminder uniqueness uses the underlying event date, so time-zone changes do not resurrect read or dismissed events.
- Confirmed latest transactions cannot cause a false candidate from an older transaction.
- Aggregate insights separate currencies and inactive subscriptions clear pending price reminders.

The review also described RLS-enabled tables without policies as a critical residual issue. That conclusion is a false positive: those future tables have revoked client grants and forced RLS, so no policy means deny-by-default. Existing pgTAP assertions verify this state.

## Verification results

- Formatting, ESLint, and strict TypeScript: passed.
- Unit and component tests: 20 files and 139 tests passed.
- Database reset: all four migrations applied from an empty database.
- Database tests: 155 pgTAP assertions passed.
- Browser tests: 62 desktop and mobile scenarios passed.
- Accessibility and horizontal-overflow checks: passed across protected insight routes.
- Production build: passed; protected routes remain dynamic.
- Production cache test: two simultaneous accounts received isolated `private, no-store` responses.
- Dependency audit: zero known advisories; installed dependency tree valid.
- Git-visible Gitleaks scan: no leak found.

## Decision

**Conditional go for local Phase 6 implementation with fictional data. No-go for production deployment or real financial data.**
