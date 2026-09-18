# Phase 5 security gate

Gate status: **Conditional go for local insights implementation with fictional data**

Gate date: 2026-09-17

## Decision

Phase 5 may implement local insights over owner-scoped normalized records. Do not deploy, enable external notification delivery, or use real financial data until the Phase 5-to-Phase 6 checkpoint passes and deployment controls are approved.

## Entry evidence

- [x] Phase 4 import processing has a completed security checkpoint.
- [x] Imported transactions and suggestions are owner-scoped and deduplicated.
- [x] Subscription creation requires an explicit reviewed approval or merge.
- [x] Raw statement bytes are not persisted.
- [x] Current unit, database, browser, production, dependency, and secret checks pass.

## Price-history gate

- [ ] Detect price changes from owner-linked transactions only.
- [ ] Use integer minor units and basis points without floating-point persistence.
- [ ] Apply a documented tolerance for rounding, tax, and foreign-exchange noise.
- [ ] Present a possible change and require confirmation before appending price history or changing a subscription price.
- [ ] Keep history append-oriented; do not allow silent client rewrites.
- [ ] Enforce owner-safe subscription relationships, controlled RPC writes, RLS reads, and redacted events.

## Overlap and savings gate

- [ ] Treat category overlap as an advisory signal, never a duplicate or cancellation claim.
- [ ] Make overlap thresholds configurable without accepting executable rules.
- [ ] Calculate budget state, potential savings, and realized savings from integer minor units.
- [ ] Count realized savings only after an explicit confirmed cancellation workflow.
- [ ] Return route-specific DTOs without transaction descriptions, provenance internals, or ownership fields.

## Calendar and reminder gate

- [ ] Derive upcoming charges from owner subscriptions and calendar dates.
- [ ] Apply the user's locale and IANA time zone only at display and reminder boundaries.
- [ ] Create reminders through controlled owner-scoped operations with deduplication.
- [ ] Keep direct anonymous and cross-user access denied.
- [ ] Keep notification delivery behind an interface; Phase 5 sends no email, SMS, or push notification.
- [ ] Store no sensitive transaction content in reminder payloads or audit events.

## Required tests

- [ ] Price increase, decrease, tolerance, basis-point, confirmation, and stale-write cases.
- [ ] Owner, anonymous, and known-ID cross-user isolation for price history and reminders.
- [ ] Monthly and annual equivalents across every supported frequency.
- [ ] Overlap thresholds, exclusions, wording, and false-positive boundaries.
- [ ] Budget status, potential savings, and realized-savings invariants.
- [ ] Month-end, leap-year, locale, time-zone, and reminder deduplication cases.
- [ ] Browser accessibility and responsive coverage for insights, calendar, reminders, and savings.
- [ ] Formatting, linting, strict typing, all tests, production build, cache isolation, dependency audit, and Gitleaks pass.

## Completion decision

Phase 5 is complete only when every implementation and test item passes and the Phase 5-to-Phase 6 checkpoint audit issues a go decision.

Current decision: **Conditional go for local Phase 5 implementation with fictional data only.**
