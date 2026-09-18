# Architecture

## Decision status

This document records the first-release architecture. Phase 2 implements local Supabase authentication, PostgreSQL persistence, protected server-rendered routes, onboarding, and Row Level Security. Statement parsing remains deferred to Phase 4.

## Technology baseline

- Next.js App Router and React provide server-rendered pages and interactive client components.
- TypeScript runs in strict mode.
- Tailwind CSS provides responsive styling.
- Accessible, locally owned components follow shadcn/ui patterns and use Radix primitives where behavior requires them.
- Supabase provides PostgreSQL, authentication, and row-level authorization starting in Phase 2.
- Zod validates all untrusted input at application boundaries.
- Vitest and React Testing Library cover units and components.
- Playwright covers critical browser journeys.
- ESLint and Prettier enforce code and formatting standards.

Use current stable, mutually compatible package versions. Commit the npm lockfile to make installations repeatable.

## Application boundaries

Organize code by product feature under `src/features`. Keep route files thin and place calculations, validation, and data access in the owning feature.

The primary features are:

- Authentication
- Subscriptions
- Statement parsing and column mapping
- Merchant normalization
- Recurrence detection and confidence scoring
- Price history
- Duplicate detection
- Reminders and notification delivery
- Budgets and savings
- Cancellation guidance

Shared UI belongs in `src/components`. Shared formatting and small platform utilities belong in `src/lib`. Server-only modules use the `server-only` guard where appropriate.

## Data flow

Browser components send validated commands to server actions or route handlers. Server code verifies the authenticated user, validates input with Zod, and accesses Supabase with a user-scoped client. PostgreSQL Row Level Security provides a second authorization boundary.

Use structured results with either validated data or a stable, generic error code. Do not return internal errors or sensitive details to the browser.

`src/proxy.ts` refreshes authentication tokens with `getClaims()`, propagates Supabase cache headers, and redirects unauthenticated requests away from private routes. The protected application layout repeats verified identity and onboarding checks. Every Server Action verifies identity independently.

Server-only DAL modules under `src/server/dal` select minimal columns and map rows into route-specific DTOs. Client Components never import database clients or receive complete database rows.

## Financial data rules

- Represent money as integer minor units and pair it with an ISO 4217 currency code.
- Store calendar dates as PostgreSQL `date` values when time of day has no meaning.
- Store audit and system timestamps as UTC `timestamptz` values.
- Format dates, money, and time in the user's locale and time zone at the display boundary.
- Never use floating-point values for stored money.

## Statement import design

Define a statement importer interface that returns a normalized, provider-neutral transaction shape. The initial CSV adapter implements that interface. Future OFX, QFX, and text-based PDF adapters can reuse mapping, review, detection, and persistence workflows.

Process an import in these stages:

1. Validate file metadata, byte size, encoding, type, and row limits.
2. Parse CSV with a maintained parser instead of splitting text manually.
3. Map source columns to canonical fields.
4. Preview and validate normalized rows.
5. Calculate nonreversible hashes for import and transaction duplicate detection.
6. Normalize merchant names in a dedicated deterministic module.
7. Group transactions and run recurrence detection in a separate deterministic module.
8. Save only normalized data required for review and detection.
9. Discard the raw upload.
10. Create subscriptions only after explicit user approval.

The application sanitizes exported spreadsheet cells that start with formula control characters. Logs contain only event types, counts, opaque identifiers, and safe error codes.

## Future-provider interfaces

Keep these interfaces independent from the core subscription model:

- `StatementImporter` converts source files into canonical transactions.
- `BankConnectionProvider` retrieves read-only transactions in a future release.
- `EmailDiscoveryProvider` produces review candidates in a future release.
- `NotificationService` delivers in-app reminders now and can support email, push, or SMS adapters later.

No Phase 1 code implements bank, email, or external notification providers.

## Database and authorization

Phase 2 adds migrations for profiles, subscriptions, transactions, statement imports, column mappings, merchant aliases, price history, reminders, budgets, savings goals, cancellation guides, and audit events.

Every user-owned row includes `user_id`. Every table enables Row Level Security and begins with revoked `anon` and `authenticated` grants. Phase 2 grants only profile preferences, onboarding budgets and savings goals, and subscription reads. Future tables remain inaccessible until their owning phase adds reviewed policies. Server code also filters by verified ownership. Cross-owner foreign keys are blocked, and pgTAP plus browser tests verify two-user isolation.

Never place a Supabase service-role key in browser code. Reserve elevated credentials for narrowly scoped, server-only administration when a user-scoped operation cannot meet the requirement.

## Security controls

- Authenticate and authorize every protected read and write.
- Validate browser, file, URL, and database input.
- Rate-limit imports, authentication-sensitive actions, exports, and deletion.
- Use secure, HTTP-only cookies through the supported Supabase server integration.
- Keep security audit events free of transaction text and secrets.
- Require recent authentication and explicit confirmation for account deletion.
- Delete or anonymize user-owned data according to documented retention behavior.
- Keep production secrets in environment configuration and placeholders in `.env.example`.

## Architectural decisions

### Server-first rendering

Use React Server Components by default. Add client components only for direct interaction, browser APIs, or local visual state. This reduces browser JavaScript and keeps sensitive work on the server.

### Deterministic discovery

Use explainable rules for merchant normalization and recurrence detection. Keep these modules pure and test them with fictional fixtures. The detector can suggest a candidate but cannot persist a confirmed subscription.

### Progressive persistence

Phase 1 uses immutable fictional data so that interface work does not depend on credentials. Phase 2 replaces protected-page reads and preference writes with Supabase-backed server-only repositories. The public preview and pre-import exercise remain fictional. Later phases add mutation methods only through their owning DAL and RLS changes.

### Replaceable product name

Keep the display name in one application metadata module. Do not duplicate it in business logic or database identifiers.
