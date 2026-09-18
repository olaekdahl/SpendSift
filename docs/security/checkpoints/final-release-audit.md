# Final local release security audit

Audit date: 2026-09-18

## Executive summary

The final whole-repository review found no confirmed exploitable vulnerability. The repository is approved for local use and CI with fictional data. Production deployment and real financial data remain prohibited.

All first-release acceptance criteria are implemented. Authentication, owner isolation, manual subscription management, bounded CSV import, deterministic insights, reminders, cancellation guidance, export, and deletion have independent application and database controls with executable tests.

## Final findings

### Confirmed exploitable findings

None.

### Remediated during release hardening

- Added route-specific loading states without weakening owner-blind dynamic object responses from HTTP 404 to streamed HTTP 200.
- Added a generic root error document and a protected owner-blind not-found view.
- Added application-schema database linting and one complete release verification command.
- Added pinned CI actions, clean installs, local Supabase configuration, complete test execution, dependency checks, and history plus Git-visible secret scans.
- Tested a scoped `auth`, `public`, and `private` backup and restore against a disposable PostgreSQL database.
- Added operations, deployment, and local release-readiness documentation.

### Deployment prerequisites

- Trusted proxy ownership of forwarding headers.
- Production HTTPS, secure cookies, HSTS, CSP, and CDN/cache verification.
- Measured request, memory, timeout, process, pool, and export-size limits.
- Scheduled retention cleanup and approved backup expiry and restoration objectives.
- Monitoring, alerting, audit integrity, incident response, and credential rotation.
- Privacy/legal, deployment-owner, and support-access approvals.
- Production SMTP, hosted Auth checks, staging penetration testing, and deployed two-user cache verification.

## Verification evidence

- Clean `npm ci`: passed with zero known vulnerabilities.
- `npm run verify`: passed after the loading/404 correction.
- Unit and component tests: 153 tests across 22 files.
- Database migrations: five migrations applied from an empty database.
- Application-schema lint: no `public` or `private` errors.
- Database authorization and behavior: 191 pgTAP assertions.
- Browser journeys: 76 desktop and mobile scenarios.
- Production cache isolation: passed for two simultaneous accounts.
- Dependency tree: valid.
- Production dependencies: 42 verified signatures and 32 attestations.
- SBOM: CycloneDX document generated with 467 components.
- Secret scanning: Gitleaks v8.30.1 found no leak across eight commits or Git-visible files.
- Backup drill: scoped archive restored successfully into a disposable database.

## Decisions

- **Local fictional-data release:** Go.
- **Production deployment:** No-go.
- **Real financial data:** No-go.
- **Phase 7:** Complete after the final release-candidate commit.
