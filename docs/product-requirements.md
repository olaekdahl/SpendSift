# Product requirements

## Product summary

SubTrack helps individual consumers discover, review, and manage personal subscriptions. The first release supports manual entry and CSV statement imports. It never claims to cancel services automatically or guarantee complete detection.

## First-release journey

A user can:

1. Create an account or sign in.
2. Complete a short onboarding flow for currency, budget, savings, and reminders.
3. Add a subscription manually or upload a CSV statement.
4. Map statement columns and preview normalized transactions.
5. Review, edit, merge, defer, approve, or reject each recurring-charge suggestion.
6. View confirmed subscriptions, estimated costs, renewals, trials, price increases, and possible overlaps.
7. Set a monthly budget and savings target.
8. Find cancellation guidance and record a subscription as paused, cancelled, expired, or archived.
9. Export or delete their data.

## Functional requirements

### Accounts and onboarding

- Support Supabase email and password sign-up, sign-in, sign-out, and password reset.
- Protect application routes and every data-changing operation.
- Store a preferred currency, locale-ready display settings, time zone, optional monthly budget, optional savings goal, and reminder preferences.
- Default to USD while keeping currency explicit on every monetary record.

### Dashboard

- Show estimated monthly and annual costs, active subscription count, amount spent this month, budget remaining, and potential monthly savings.
- Show renewals within 30 days, trials ending soon, recent price increases, and possible overlapping services.
- Summarize spending by category.
- Provide useful empty states when no subscriptions exist.

### Subscription management

- Create, view, edit, archive, and delete local subscription records.
- Store merchant name, display name, category, amount in integer minor units, currency, billing frequency, dates, status, payment nickname, website, cancellation details, notes, reminder lead time, source, and optional detection confidence.
- Support weekly, monthly, every two months, quarterly, every six months, annual, and custom billing intervals.
- Support trial, active, paused, cancelled, expired, and needs-review statuses.
- Distinguish deleting a local record from cancelling a service with its provider.

### Statement import

- Explain data handling before upload.
- Accept CSV files through file selection and drag and drop.
- Enforce file-size, row-count, encoding, and supported-type limits.
- Let the user map date, description, amount, debit, and credit columns.
- Preview data before processing.
- Normalize merchant descriptions and detect recurring charges without an AI model.
- Explain each suggestion with a confidence score and plain-language reasons.
- Require approval before creating a subscription.
- Let the user edit, reject, merge, or defer each suggestion.
- Prevent duplicate transactions and duplicate imports.
- Discard the original file after parsing and retain only approved or detection-required normalized data.
- Provide downloadable fictional sample statements.

### Insights

- Detect meaningful price increases and ask the user to confirm them.
- Record the previous amount, new amount, percentage change, and detection date.
- Ignore small tax, rounding, and foreign-exchange differences where appropriate.
- Flag two or more active services in the same configurable category as possible overlaps, not definite duplicates.
- Calculate budget status, potential savings, and realized savings from integer minor units.

### Reminders and cancellation guidance

- Provide in-app reminders for renewals, trials, annual charges, price increases, and deferred reviews.
- Show upcoming charges in a calendar or chronological list.
- Keep notification delivery behind an interface that can support email later.
- Store editable cancellation URLs, phone numbers, instructions, verification dates, and user notes.
- Open external cancellation pages in a new tab and state that only the provider can confirm cancellation.

## Quality requirements

- Meet WCAG 2.1 AA expectations with keyboard access, visible focus indicators, screen-reader labels, sufficient contrast, and reduced-motion support.
- Support mobile touch targets and responsive desktop navigation.
- Use server-side operations for secrets and sensitive work.
- Validate untrusted input with Zod.
- Never expose Supabase service-role credentials to browser code.
- Never log transaction descriptions, account numbers, statement contents, authentication tokens, or financial data.
- Rate-limit imports and sensitive endpoints.
- Protect CSV handling from formula injection, malicious filenames, unexpected encodings, oversized files, and excessive rows.
- Use generic user-facing errors and a content-free security audit trail.
- Keep all tests fictional and free of real financial information.

## First-release acceptance criteria

The release is complete when all of these statements are true:

- A user can register, sign in, and access only their own records.
- A user can manage subscriptions manually.
- A user can import a fictional CSV statement and approve recurring-charge suggestions.
- Dashboard totals, renewals, trials, price increases, overlaps, budgets, and savings work correctly.
- Cancellation guidance does not claim automatic cancellation.
- The interface works on mobile and desktop devices and meets the accessibility requirements.
- Linting, strict type checking, unit tests, integration tests, end-to-end tests, and a production build pass.

## Deferred work

The first release excludes bank connections, email scanning, external email or SMS delivery, household sharing, native mobile applications, broad international statement support, community cancellation content, and automatic cancellation or negotiation.
