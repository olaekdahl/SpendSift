---
name: "Security phase audit"
description: "Use between SubTrack implementation phases to perform an evidence-based application-security audit and issue a go/no-go decision before the next phase. This prompt documents findings but does not remediate application code."
argument-hint: "Phase transition, for example: Phase 2 to Phase 3"
agent: "agent"
---

# SubTrack security phase audit

Phase transition under review: `${input:phaseTransition}`

Stop feature development. Do not begin the proposed next phase.

Act as a senior application-security engineer. Perform a thorough, evidence-based security assessment of the current SubTrack repository after the completed phase and before additional development occurs.

Treat existing security documents as the previous baseline. Identify what changed, which earlier findings are resolved, which remain open, and whether the completed phase introduced regressions or new trust boundaries.

## Operating rules

This is an analysis and planning task, not a remediation task.

You may:

- Inspect all repository files and Git history available in the workspace.
- Run read-only security, dependency, and quality checks.
- Run existing formatting, linting, type-checking, test, accessibility, and production-build commands.
- Create a phase-specific audit report under `docs/security/checkpoints/`.
- Update security assessment documents under `docs/security/` when evidence or architecture changed.
- Add security tasks and a gate to `IMPLEMENTATION_PLAN.md` or an existing todo list.

Do not:

- Begin the next implementation phase.
- Change application behavior.
- Remediate findings in application source or configuration.
- Install, remove, or upgrade dependencies.
- Modify package versions or the lockfile.
- Run `npm audit fix`, especially with `--force`.
- Add authentication, Supabase, migrations, uploads, integrations, or other product features.
- Delete files.
- Commit, push, deploy, or purchase anything.
- Print secrets, tokens, credentials, financial data, or sensitive values.
- Report generic best practices as confirmed vulnerabilities.
- Claim a vulnerability without repository evidence.
- Weaken tests or controls to obtain passing results.

Preserve all existing user changes.

If you discover a credential or secret, do not display its value. Redact it and report only its file, approximate location, type, exposure status, and required containment steps.

## Evidence standard

Classify a finding as confirmed only when it has at least one of these forms of evidence:

- Direct source-code evidence.
- Configuration evidence.
- Lockfile and authoritative advisory evidence.
- Reproducible test evidence.
- Reproducible command output.
- A demonstrated unsafe data flow.

If you cannot prove an issue, classify it as `Likely`, `Needs verification`, or `Design gap`. Do not invent file paths, line numbers, commands, results, CVEs, or data flows.

Distinguish clearly among:

- Existing behavior.
- Partially implemented behavior.
- Planned behavior.
- Previously reported behavior that is now remediated.
- Future risk that is not currently exploitable.

## Standards and references

Use current official sources when looking up guidance or advisories. Assess applicable controls against:

- OWASP Top 10:2025.
- OWASP Application Security Verification Standard.
- OWASP File Upload Cheat Sheet.
- OWASP CSV Injection guidance.
- OWASP Content Security Policy guidance.
- OWASP Session Management Cheat Sheet.
- OWASP Authentication Cheat Sheet.
- OWASP Authorization Cheat Sheet.
- OWASP Logging Cheat Sheet.
- OWASP Third-Party JavaScript Management guidance.
- Applicable CWE classifications.
- Official Next.js 16 security and data-security documentation installed with the repository and current official online guidance when needed.
- Official React security guidance.
- Official npm dependency-audit documentation.
- Official Supabase authentication and Row Level Security guidance when authentication or persistence exists or is the next phase.

## Step 1: Establish the checkpoint baseline

1. Parse the completed and proposed next phases from `${input:phaseTransition}`. If the transition is ambiguous, ask one concise clarifying question before continuing.
2. Inspect the repository structure and Git status.
3. Read at minimum:
   - `README.md`
   - `IMPLEMENTATION_PLAN.md`
   - `package.json`
   - `package-lock.json`
   - Next.js configuration
   - TypeScript configuration
   - ESLint configuration
   - `.gitignore`
   - environment-file templates
   - all architecture, product, deployment, privacy, and security documentation
   - the most recent report under `docs/security/checkpoints/`, if one exists
4. Record pre-existing uncommitted changes without reverting them.
5. Identify the actual commands available for development, build, formatting, linting, type checking, unit tests, component tests, integration tests, end-to-end tests, and accessibility tests.
6. Record exact installed versions of security-relevant dependencies.
7. Compare the current tree with the previous audit baseline and summarize the security-relevant delta.
8. Determine directly whether the application contains:
   - Route Handlers or API endpoints
   - Server Actions
   - `proxy.ts` or middleware
   - Server Components and Client Components
   - database access
   - authentication or authorization
   - Row Level Security policies
   - external network requests
   - HTML or Markdown rendering
   - file-upload controls or parsers
   - redirects
   - cookies
   - local or session storage
   - environment-variable access
   - logs, analytics, monitoring, or third-party scripts
   - background jobs, webhooks, or provider integrations

Do not rely on prior summaries when current implementation evidence is available.

## Step 2: Update the system and data-flow inventory

Document the current:

- Pages and routes.
- Server and client boundaries.
- Entry points.
- Trust boundaries.
- Data stores.
- Browser storage.
- External dependencies and network destinations.
- Build and deployment assumptions.
- Personal and financial data.
- Authentication and authorization enforcement points.
- File receipt, parsing, retention, and deletion paths.
- Administrative and support access paths.

Create or update Mermaid diagrams for the current system and the proposed next-phase boundary when the architecture changed.

Do not let Mermaid tooling block the audit:

1. Make at most one validator attempt per changed diagram.
2. If the validator is unavailable, errors, or stalls, check the source fences and obvious syntax manually.
3. Record renderer validation as a limitation.
4. Continue the audit and complete every other deliverable.

## Step 3: Update the threat model

Use STRIDE or an equivalent structured method.

Consider these assets where applicable:

- User identity and authentication sessions.
- Profiles and preferences.
- Subscription records.
- Transaction records and merchant descriptions.
- Uploaded financial statements and temporary raw bytes.
- Import metadata and column mappings.
- Budgets and savings information.
- Cancellation links, instructions, phone numbers, and notes.
- Audit events and application logs.
- Environment secrets and Supabase credentials.
- Future bank-connection and email-access tokens.
- Source, dependency, build, deployment, backup, and export artifacts.

Consider these actors:

- Unauthenticated internet user.
- Malicious authenticated user.
- Attacker with a stolen session.
- Malicious uploaded file.
- Compromised dependency.
- Accidental developer exposure.
- Misconfigured deployment.
- Overprivileged database client.
- Curious or malicious support administrator.
- Automated bot.

For every credible new or changed threat, document:

- Asset.
- Entry point.
- Trust boundary.
- Attack scenario.
- Existing control.
- Missing control.
- Likelihood.
- Impact.
- Recommended mitigation.
- Phase by which the mitigation must exist.

## Step 4: Audit source and configuration changes

Inspect the complete security-relevant source tree, with extra attention to code added or changed in the completed phase.

### Client and server boundaries

Check for:

- Sensitive code or environment values imported into Client Components.
- `NEXT_PUBLIC_*` variables that expose more than intended.
- Server-only values or full database objects serialized to the browser.
- Sensitive fields in React Server Component payloads or static output.
- Authorization decisions made only in browser code.
- Unsafe browser storage.
- Inappropriate caching of authenticated content.
- Private content in generated static pages.
- Server Actions treated as inaccessible because the UI hides them.

For private data, require a `server-only` data-access layer that authenticates, authorizes, selects minimal columns, and returns route-specific DTOs.

### Input and output handling

Search for and assess:

- `dangerouslySetInnerHTML` and direct DOM or HTML assignment.
- Dynamic URLs and unsafe protocols.
- Redirect parameters and query-string use.
- Unvalidated route parameters and object identifiers.
- User-controlled HTML, Markdown, notes, or merchant text.
- Open redirects and phishing-friendly behavior.
- Injection into SQL, shell commands, templates, logs, headers, or exports.
- Formula-like values that can reach CSV or spreadsheet output.
- Missing or browser-only Zod validation.
- Unsafe error messages, stack traces, paths, or internal details.

### Server operations

For every Route Handler, API route, Server Action, proxy, middleware, webhook, or worker, verify:

- Authentication.
- Object-level authorization.
- Server-side validation.
- CSRF and origin handling.
- Method restrictions.
- CORS policy.
- Generic error handling.
- Request and response size limits.
- Rate limiting and abuse controls.
- Idempotency and transaction boundaries.
- Cache behavior.
- Redacted logging and audit events.

### Links and navigation

Check:

- External links with `target="_blank"` and missing `noopener` or `noreferrer`.
- Cancellation URLs without server-side HTTPS validation.
- Unvalidated redirect destinations.
- UI that implies a provider action succeeded when only a link opened.
- Display of destination provenance or hostname where trust matters.

### Browser and deployment controls

Assess:

- Content Security Policy.
- `frame-ancestors` and clickjacking protection.
- `X-Content-Type-Options`.
- `Referrer-Policy`.
- `Permissions-Policy`.
- Cross-origin isolation policies where configured.
- HSTS at the HTTPS deployment boundary.
- Secure, HttpOnly, and SameSite cookies.
- Production source maps.
- Technology-identifying headers.
- Private response caching at the framework, CDN, and browser layers.

Do not recommend an unsafe wildcard CSP to silence violations.

## Step 5: Audit dependencies and supply-chain risk

Run safe, non-mutating commands where supported:

- `npm audit --json`
- `npm outdated --json`
- `npm ls --all`
- existing formatting, linting, type-checking, testing, and build commands

For every reported dependency vulnerability:

1. Confirm the installed version in the lockfile.
2. Identify whether it is production or development only.
3. Identify the complete dependency path.
4. Verify the advisory with an authoritative source.
5. Determine whether vulnerable behavior is reachable in SubTrack.
6. Separate direct and transitive dependencies.
7. Record the fixed version when one exists.
8. Explain likely compatibility or breaking-change risk.
9. Do not treat registry severity alone as application-risk evidence.

Also inspect:

- Lifecycle scripts.
- Unexpected or unused packages.
- Broad-capability packages.
- Git, URL, local-path, prerelease, or unpinned sources.
- Lockfile consistency and integrity metadata.
- Runtime third-party scripts.
- Package scripts that download or execute remote content.

Never run an automatic dependency fix during the audit.

## Step 6: Search for secrets and sensitive information

Inspect tracked and untracked project files, generated artifacts, fixtures, screenshots, logs, and available Git history for:

- API keys and access tokens.
- Private keys and passwords.
- Connection strings and database URLs.
- Supabase server or service-role credentials.
- Bank, email, notification, analytics, and provider credentials.
- Real financial records, statements, merchant descriptions, account numbers, or card numbers.
- Personal email addresses or personal data used in tests.
- Sensitive values in source maps, traces, reports, or documentation.

Inspect `.gitignore` and environment-file handling. Confirm that secret-bearing files are ignored and that required templates contain placeholders only.

Classify each result as:

- Confirmed secret.
- Placeholder.
- Fictional test value.
- Suspicious pattern requiring human review.

If a real secret appears committed, classify it as Critical and recommend these containment steps without performing them:

1. Revoke or rotate it.
2. Remove it from the current tree.
3. Assess Git history exposure.
4. Review provider access logs.
5. Prevent recurrence.

## Step 7: Apply phase-specific review depth

Review every applicable area, and emphasize the completed and proposed phases.

### Authentication and Supabase

When authentication or persistence exists or is next, review:

- Server-side identity verification.
- Secure cookie lifecycle.
- Authentication inside every server operation.
- Deny-by-default grants and RLS on every user-owned table.
- Ownership derived from verified server context, not client input.
- Object-level access and two-user isolation tests.
- Service-role isolation in server-only code.
- Minimal database privileges.
- Safe public publishable-key use.
- Separate development and production projects.
- Session revocation, password reset, enumeration resistance, and rate limiting.
- Protected response caching and refresh-header propagation.
- Account deletion, export, backups, and audit logging.

Maintain a table-by-table RLS verification matrix. Do not write migrations during the audit.

### Manual subscription management

Review:

- Validation and authorization for create, read, edit, archive, and delete.
- Ownership reassignment and mass-assignment risks.
- Safe website and cancellation URLs.
- Distinction between deleting a record and cancelling a service.
- Money, currency, date, status, and billing-frequency integrity.
- Concurrency and audit behavior.

### Statement import

Before accepting a real statement, review the complete pipeline:

1. Receive.
2. Authenticate and rate-limit.
3. Validate bytes, type, encoding, dimensions, and structure.
4. Parse under bounded time and memory.
5. Normalize and validate every field.
6. Detect recurring charges deterministically.
7. Present minimal suggestions.
8. Obtain explicit user approval.
9. Persist approved user-owned data transactionally.
10. Delete raw data on every terminal path.
11. Record a redacted audit event.

Assess file size, row count, line length, column count, field length, parser timeout, memory, concurrency, malformed quoting, delimiter, encoding, null bytes, Unicode, control characters, duplicate headers, oversized values, filename handling, temporary storage, retention, deduplication, idempotency, cross-user isolation, stored XSS, log injection, and CSV formula injection.

Treat values beginning with `=`, `+`, `-`, `@`, tab, carriage return, line feed, or equivalent full-width characters as spreadsheet risks at export time. Do not claim that antivirus can reliably validate CSV content, and do not send statements to public scanning or AI services.

### Insights, reminders, budgets, and savings

Review:

- Integer-minor-unit calculations and currency separation.
- Authorization for historical transactions and price changes.
- False-positive handling and user confirmation.
- Reminder privacy and notification payload minimization.
- Background-job privileges and replay safety.
- Honest savings and duplicate-service claims.

### Cancellation, privacy, export, and deletion

Review:

- HTTPS destination validation and provenance.
- Stale or malicious shared guidance.
- Accurate cancellation disclaimers.
- Data inventory and minimization.
- Export completeness and formula safety.
- Account deletion across primary data, backups, providers, sessions, and audit exceptions.
- Support and administrator access.
- Privacy-copy accuracy.

### Production readiness and integrations

Review:

- TLS and security headers.
- CDN and cache isolation.
- Secret management and rotation.
- CI/CD permissions and protected branches.
- Dependency provenance and release artifacts.
- Monitoring, redaction, alerting, retention, and incident response.
- Provider scopes, OAuth callbacks, webhook verification, token encryption, revocation, vendor retention, and subprocessor risk.

## Step 8: Privacy and product-claim review

For each personal or financial data type, document:

- Purpose.
- Minimum fields.
- Storage location.
- Encryption expectations.
- Authorized roles.
- Logging restrictions.
- Retention period.
- Export behavior.
- Deletion behavior, including backups.

Challenge fields without a current product purpose.

Confirm that UI and documentation do not claim:

- PCI compliance.
- SOC 2 compliance.
- Bank-grade security.
- Guaranteed subscription detection.
- Guaranteed cancellation.
- Guaranteed savings.

## Step 9: Run verification

Run the repository's documented commands for:

- Formatting.
- Linting.
- Strict type checking.
- Unit tests.
- Component tests.
- Integration tests.
- Focused security tests.
- Accessibility tests.
- End-to-end tests when supported.
- Production build.
- Dependency advisory and tree checks.

Do not classify ordinary correctness failures as security vulnerabilities unless they prevent a security control from being verified. Record failures and limitations exactly.

## Finding format

Every finding must include:

- Unique checkpoint-stable ID, such as `SEC-012`.
- Title.
- Status: `Confirmed`, `Likely`, `Needs verification`, `Design gap`, or `Remediated`.
- Severity: `Critical`, `High`, `Medium`, `Low`, or `Informational`.
- Confidence: `High`, `Medium`, or `Low`.
- CWE identifier where applicable.
- OWASP category where applicable.
- Affected file and exact line or smallest practical range.
- Evidence.
- Attack prerequisites.
- Realistic exploitation scenario.
- Potential impact.
- Existing mitigating controls.
- Recommended remediation.
- Verification method.
- Phase by which it must be fixed.

Do not reuse an existing ID for an unrelated issue. Preserve IDs for carried findings and record their changed status.

Severity meanings:

- **Critical:** Immediate compromise, secret exposure, arbitrary code execution, or broad financial-data exposure is realistically possible.
- **High:** A realistic attack can expose or modify sensitive user data or compromise accounts.
- **Medium:** Exploitation requires meaningful preconditions but can still harm users or weaken an important control.
- **Low:** Limited impact or a defense-in-depth weakness.
- **Informational:** Hardening advice, future requirement, or observation without a current exploitable defect.

Do not assign Critical or High severity without a credible attack path and material impact.

## Required deliverables

### Phase checkpoint report

Create a new report at:

`docs/security/checkpoints/<completed-phase>-to-<next-phase>-audit.md`

Use lowercase, hyphenated phase slugs. Never overwrite a prior checkpoint report.

Include:

1. Plain-language executive summary.
2. Phase transition and scope.
3. Methodology and official references.
4. Previous baseline and security-relevant delta.
5. Current architecture and data flows.
6. Commands executed.
7. New findings.
8. Carried, remediated, and regressed findings.
9. Dependency findings.
10. Secrets review.
11. Privacy and product-claim review.
12. Verification results.
13. Limitations.
14. Overall risk rating.
15. Go, conditional go, or no-go recommendation for the proposed next phase.

### Canonical security documents

Update only when evidence changed:

- `docs/security/SECURITY-AUDIT.md`: current finding register and overall posture.
- `docs/security/THREAT-MODEL.md`: current and planned boundaries, threats, and residual risks.
- `docs/security/SECURITY-REMEDIATION-PLAN.md`: remediation status, owners when known, priorities, dependencies, effort, verification, and blocking phase.
- `docs/security/PHASE-<N>-SECURITY-GATE.md`: checklist for the proposed next phase. Create it when absent.

Do not erase historical baseline evidence. Mark a finding remediated only when executable verification supports that status.

### Implementation plan

Update `IMPLEMENTATION_PLAN.md` so the proposed next phase has a security gate before implementation. Do not mark approvals or unimplemented controls complete.

## Final response

After completing the assessment, provide a short plain-language summary with:

- Overall current risk rating.
- Finding counts by severity and status.
- The three most important open risks.
- Whether secrets were found, without displaying them.
- Whether dependencies contain reachable known vulnerabilities.
- Checks that passed or failed.
- Go, conditional go, or no-go recommendation.
- Exact documents created or updated.
- The next recommended action.

Do not begin remediation or the next implementation phase. Stop after delivering the checkpoint assessment and wait for review.
