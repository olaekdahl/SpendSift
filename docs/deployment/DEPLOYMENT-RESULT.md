# Preview deployment result

## Status

**Deployed and live as a non-production preview.** The public HTTPS endpoint, hosted authentication, owner isolation, and fictional-user cleanup passed. Real financial data and production use remain blocked.

## Deployment record

| Field                    | Result                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Selected provider        | Microsoft Azure                                                                                                              |
| Selected service         | Azure Container Apps, Consumption workload profile                                                                           |
| Region                   | West Europe (`westeurope`)                                                                                                   |
| Deployment date          | Initial app at 2026-09-18 18:01:45 UTC; final secure revision at 18:35:36 UTC                                                |
| Deployed URL             | `https://ca-subtrack-preview.redpebble-c159d20a.westeurope.azurecontainerapps.io`                                            |
| Azure subscription       | `Purchase Portal Beta Refactor` (`e82d...5449`)                                                                              |
| Azure tenant             | `6bac...3269`                                                                                                                |
| Git base commit          | `5278ab4f0c3bf553809b2b4c200eb8c425338863`                                                                                   |
| Working-tree state       | Modified and untracked deployment changes; no commit was created                                                             |
| Container image          | `acrsubtrackpreve82d.azurecr.io/subtrack@sha256:56463583ec9b84d4e6974abae925d01fb1d4c7a71c1ef61c5772b5286245ce85`            |
| Node base image          | `node:24.16.0-alpine3.23@sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14`                            |
| Scaling                  | 0.5 vCPU, 1 GiB, minimum zero, maximum one                                                                                   |
| Supabase project         | `SubTrack Preview` (`lsqe...yipe`), Central EU (Frankfurt), Free plan                                                        |
| Email verification       | Disabled only for this preview through verified `mailer_autoconfirm=true`                                                    |
| Estimated recurring cost | About USD 5-10 per month; Supabase Free adds USD 0 under its included limits                                                 |
| Cleanup                  | `./scripts/destroy-azure.sh --subscription-id e82ded3f-cc6c-4019-8e87-5dca164a5449 --resource-group rg-subtrack-preview-weu` |

## Azure resources

| Type                       | Name                       |
| -------------------------- | -------------------------- |
| Resource group             | `rg-subtrack-preview-weu`  |
| Azure Container Registry   | `acrsubtrackpreve82d`      |
| User-assigned identity     | `id-subtrack-preview-acr`  |
| Log Analytics workspace    | `log-subtrack-preview-weu` |
| Container Apps environment | `cae-subtrack-preview-weu` |
| Container App              | `ca-subtrack-preview`      |

The `AcrPull` role assignment is scoped only to `acrsubtrackpreve82d`. The Container Apps environment reports no separate infrastructure resource group.

## Environment-variable names

The Container App receives these names. This record never stores their values:

- `NODE_ENV`
- `APP_URL`
- `DEPLOYMENT_STAGE`
- `ALLOW_UNVERIFIED_EMAIL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

No service-role or secret key is configured.

## Completed checks

- Repository formatting passed before deployment changes.
- ESLint passed before deployment changes.
- TypeScript passed before deployment changes and after the app safety changes.
- All 165 Vitest tests passed.
- All 191 pgTAP assertions passed both locally and against the hosted Frankfurt database.
- One import browser scenario timed out once at five seconds. Its focused desktop and mobile rerun passed, and the complete rerun passed all 76 scenarios.
- The Next.js 16.3.5 standalone production build passed.
- The production cache-isolation scenario passed.
- `npm audit` reported zero vulnerabilities across 588 dependency nodes.
- Bicep compiled with no diagnostics.
- Azure validation and what-if succeeded with no diagnostics and no resource creation.
- Both cleanup dry runs returned a safe no-op before deployment and later verified the live ownership tags while listing exactly the five preview resources without deleting them.
- The production configuration conflict exits the container with status 1 before Node starts.
- Local container health, static assets, security headers, preview banner, non-root execution, and file exclusions passed.
- Trivy 0.74.0 initially found fixed base-image issues. Runtime hardening removed the package managers and updated the affected crypto libraries; the repeat scan reported zero fixed High or Critical findings.
- The six repository migrations applied to the empty preview project. Hosted migration history and schema lint passed.
- The live landing page, health endpoint, and static stylesheet returned 200 over HTTPS on desktop and mobile.
- Plain HTTP returned 301 to the exact HTTPS URL. HSTS, CSP, opener, resource, permissions, referrer, MIME, and frame headers passed; `X-Powered-By` was absent. HSTS is host-scoped and does not claim provider-owned subdomains.
- Rendered source and static bundles contained zero service-role, secret-key, or Management API token markers.
- The required preview warning appeared without horizontal overflow on desktop and mobile.
- Two users registered without an email-confirmation action, received distinct secure HttpOnly `SameSite=Lax` sessions, survived a reload, signed out, and were denied protected routes after sign-out.
- A second fictional user received the normal not-found response for the first user's known subscription ID. The owner could still read the record.
- Both fictional isolation-test users deleted themselves through the application. A later interrupted verification left two `preview-* @example.test` users; cleanup removed only that known namespace. One unrelated account with three records remains, and the owner confirmed that all of its data is fictional. No subscription record remains from automated verification.
- A fictional password-reset request returned the same non-enumerating response on desktop and mobile. Email delivery was not required for this check.
- The email-verification restoration drill verified `mailer_autoconfirm=false`, then immediately restored and verified the required preview setting `mailer_autoconfirm=true`.
- The Supabase security advisor reported zero Error findings, 17 warnings for the reviewed authenticated security-definer RPCs, and one informational finding for the intentionally policy-free `audit_events` table.
- The Azure revision was healthy with the immutable image, all three health probes, managed-identity pull, HTTPS-only ingress, 0.5 vCPU, 1 GiB, zero minimum replicas, and one maximum replica.
- Log Analytics reported 15 console entries and zero sensitive-term matches after final verification.
- Azure documentation confirms that Container Apps appends client-supplied `X-Forwarded-For` values and supplies the authoritative client IP at the rightmost position. Both network-throttling paths now validate and use only that rightmost IP. Three spoofing unit tests and four desktop/mobile throttling browser scenarios pass.
- The live authenticated dashboard response remained `private, no-store` through Container Apps ingress during the two-user isolation journey.
- Azure Monitor reported zero requests and zero replicas for every one-minute sample from `18:53Z` through `19:12Z`, proving the final revision scales to zero. The Container Apps CLI retained stale replica-object metadata after the metrics reached zero.
- After that zero-replica period, the live two-user journey activated the app, verified authenticated `private, no-store` responses through ingress, passed owner isolation, and deleted its test users.

## Deployment corrections

- The first full gate found one transient import-test timeout. Its focused rerun and the complete 76-scenario rerun passed.
- Initial Trivy scanning found fixed High OpenSSL issues and a fixed Critical issue in the unused global npm toolchain. The runtime image now upgrades the affected Alpine libraries and removes npm, Yarn, and Corepack.
- Hosted pgTAP initially failed because `cli_login_postgres` could not use the `extensions` schema or automatically assume `postgres`. Migration `20260918010000_hosted_pgtap.sql` grants only extension-schema usage to that CLI role, and tests now set their administrative setup role explicitly. All 191 hosted assertions pass.
- Two deployment attempts stopped before Azure creation because new files needed formatting and hosted Supabase variables overrode local browser-test values. The scripts now isolate the local release environment.
- The eight-worker local browser suite produced unrelated, non-reproducing UI timeouts under load. Capping Playwright at four workers produced a clean 76-scenario run and preserves full parallel coverage within the local stack's capacity.
- Gitleaks 8.30.1 rejected the old `--source` syntax. Both scripts now use the current positional repository argument, and the scan passes across 10 commits.
- The deployment scripts scan uncommitted tracked and untracked Git candidates separately, so a dirty preview deployment cannot bypass the history scan. The production gate rejects any dirty working tree.
- Supabase returned HTTP 402 when the Free project received paid session-timeout settings. The rejected update was atomic. The final Auth update omits those Pro-only fields and stays inside the confirmed cost boundary.

## Known limitations and security warnings

- Real financial data is prohibited.
- Email ownership is not proven while the preview exception is active.
- The Supabase Free plan does not support session time-box or inactivity controls, so preview sessions use the provider default lifetime.
- Password-reset mail uses Supabase's best-effort hosted sender unless separate SMTP is approved.
- Scale-to-zero introduces cold-start latency.
- ACR continues charging while the app has zero replicas.
- Log ingestion and outbound network transfer remain usage-based.
- Production retention, backup restoration, monitoring, alerting, legal, support-access, and penetration-test gates remain unresolved.
- A production edge and abuse test must revalidate the rightmost forwarded-address assumption before real financial data is allowed.
