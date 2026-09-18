# Azure preview deployment guide

## Scope

This guide deploys SubTrack as a fictional-data-only preview on Azure Container Apps. It does not configure a custom domain, production monitoring, or a production Supabase project.

Read these documents first:

- `CLOUD-DECISION.md` records the provider comparison and cost estimate.
- `EMAIL-VERIFICATION-EXCEPTION.md` defines the temporary Auth exception.
- `PREREQUISITES.md` defines controls that still block production and real financial data.
- `ROLLBACK-AND-CLEANUP.md` contains rollback and deletion steps.

## Architecture

The Bicep deployment creates one isolated Azure resource group containing:

- A Basic Azure Container Registry with its admin account disabled.
- A user-assigned managed identity with `AcrPull` scoped only to that registry.
- A Log Analytics workspace with 30-day retention.
- A Container Apps managed environment with the Consumption workload profile.
- One externally accessible Container App with managed HTTPS ingress.

The app runs with 0.5 vCPU, 1 GiB memory, zero minimum replicas, and one maximum replica. Startup, readiness, and liveness probes use `/api/health`. The container runs as UID 1001 and binds to `0.0.0.0:3000`.

The database and Auth service run in a separate Supabase preview project. Do not use an existing production project.

## Verified toolchain

The deployment preparation used:

- Node.js 24.16.0.
- npm 11.13.0.
- Next.js 16.3.5.
- Azure CLI 2.87.0.
- Bicep CLI 0.47.16.
- Docker Engine 29.5.2 and Buildx 0.34.1.
- Supabase CLI 2.117.0.
- Trivy 0.74.0, pinned by image digest in the deployment scripts.
- Gitleaks 8.30.1, pinned by image digest in the deployment scripts.

The Dockerfile pins `node:24.16.0-alpine3.23` at digest `sha256:2bdb65ed1dab192432bc31c95f94155ca5ad7fc1392fb7eb7526ab682fa5bf14`. The runtime stage removes npm, Yarn, and Corepack, which the application does not need.

## Environment inventory

| Variable                               | Purpose                                                                                | Timing            | Exposure                          | Requirement                | Source                                             | Destination                         |
| -------------------------------------- | -------------------------------------------------------------------------------------- | ----------------- | --------------------------------- | -------------------------- | -------------------------------------------------- | ----------------------------------- |
| `APP_URL`                              | Exact trusted application origin for Auth callbacks and origin checks.                 | Runtime           | Server-only                       | Required                   | Derived from the Container Apps environment domain | Container App environment           |
| `DEPLOYMENT_STAGE`                     | Labels local, preview, or production behavior.                                         | Runtime           | Server-only                       | Required in cloud          | Bicep sets `preview`                               | Container App environment           |
| `ALLOW_UNVERIFIED_EMAIL`               | Authorizes the temporary preview exception.                                            | Runtime           | Server-only                       | Required in this preview   | Bicep sets `true`                                  | Container App environment           |
| `NEXT_PUBLIC_SUPABASE_URL`             | Browser-safe Supabase project API URL. Current code reads it on the server at runtime. | Runtime           | Public                            | Required                   | Separate preview Supabase project                  | Container App environment           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser-safe Supabase publishable key.                                                 | Runtime           | Public, stored as an Azure secret | Required                   | Separate preview Supabase project                  | Container Apps secret reference     |
| `NODE_ENV`                             | Enables production Next.js behavior and secure cookies.                                | Build and runtime | Server-only                       | Required                   | Docker and Bicep                                   | Container image and app environment |
| `HOSTNAME`                             | Binds the standalone server to all container interfaces.                               | Runtime           | Server-only                       | Required                   | Dockerfile sets `0.0.0.0`                          | Container image                     |
| `PORT`                                 | Selects the standalone server port.                                                    | Runtime           | Server-only                       | Required                   | Dockerfile sets `3000`                             | Container image                     |
| `SUPABASE_ACCESS_TOKEN`                | Authenticates Supabase CLI and Management API deployment operations.                   | Deployment only   | Secret                            | Required for hosted setup  | Supabase account token                             | Calling shell only                  |
| `SUPABASE_DB_PASSWORD`                 | Authenticates hosted migration operations.                                             | Deployment only   | Secret                            | Required for database push | Preview project creation                           | Calling shell only                  |
| `SUPABASE_PROJECT_REF`                 | Identifies the separate preview project.                                               | Deployment only   | Public identifier                 | Required                   | Supabase project                                   | Calling shell only                  |

The application has no required build-time secret. It does not use a Supabase service-role or secret key. Do not add either key to the Container App.

`NEXT_PUBLIC_` variables become build-time constants if client code imports them. The current application reads both Supabase values only in dynamically rendered server code, so one image can receive them at runtime. Reassess this classification before adding a browser Supabase client.

## Create the Supabase preview project

The initial CLI login asks for a personal access token. Enter it directly in the terminal prompt. Do not paste it into a command argument, source file, chat, or documentation.

```bash
npx supabase login
npx supabase orgs list
```

If more than one organization is available, select the approved organization and confirm its plan before creating a project. Name the project `SubTrack Preview` so the configuration scripts can distinguish it from production.

Create the project in a European region close to West Europe. Let the CLI prompt for the database password, or read it into the shell without echoing it:

```bash
read -r -s -p "Preview database password: " SUPABASE_DB_PASSWORD
export SUPABASE_DB_PASSWORD
npx supabase projects create "SubTrack Preview" --org-id "$SUPABASE_ORG_ID" --region "$SUPABASE_REGION"
```

Set the returned 20-character project ref without storing it in the repository:

```bash
export SUPABASE_PROJECT_REF="<preview-project-ref>"
```

## Apply database migrations

Link only the new preview project. Never run `db reset --linked`.

```bash
npx supabase link --project-ref "$SUPABASE_PROJECT_REF"
npx supabase db push --dry-run
npx supabase db push
npx supabase migration list
npx supabase db lint --linked --schema public,private --level warning --fail-on error
npx supabase test db --linked
```

Do not add `--include-seed`. The repository seed contains no application data, and all verification uses fictional transactional fixtures.

## Load deployment values safely

Copy only the project URL and publishable key from the Supabase **Connect** dialog. Read them into the shell so the key does not enter shell history:

```bash
read -r -p "Preview Supabase URL: " NEXT_PUBLIC_SUPABASE_URL
read -r -s -p "Preview Supabase publishable key: " NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
export NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Do not retrieve, export, or deploy the service-role or secret key.

## Validate without creating resources

Run the provider-side validation and what-if operation:

```bash
./scripts/deploy-azure.sh \
  --subscription-id e82ded3f-cc6c-4019-8e87-5dca164a5449 \
  --resource-group rg-subtrack-preview-weu \
  --registry acrsubtrackpreve82d \
  --what-if
```

PowerShell uses the same environment variables:

```powershell
./scripts/deploy-azure.ps1 `
  -SubscriptionId e82ded3f-cc6c-4019-8e87-5dca164a5449 `
  -ResourceGroup rg-subtrack-preview-weu `
  -RegistryName acrsubtrackpreve82d `
  -WhatIfOnly
```

## Deploy Azure resources and the image

Run one deployment script without the dry-run flag. The script:

1. Verifies the active subscription and resource ownership tags.
2. Runs Bicep validation and what-if.
3. Runs `npm run verify`, `npm audit`, and redacted secret scans over full Git history plus uncommitted tracked and untracked candidates.
4. Builds the pinned multi-stage image.
5. Fails on fixed High or Critical Trivy findings.
6. Creates the isolated foundation.
7. Pushes the image to ACR.
8. Resolves an immutable image digest.
9. Repeats what-if with that digest.
10. Deploys the app and checks its public health endpoint.

```bash
./scripts/deploy-azure.sh \
  --subscription-id e82ded3f-cc6c-4019-8e87-5dca164a5449 \
  --resource-group rg-subtrack-preview-weu \
  --registry acrsubtrackpreve82d
```

Record the printed HTTPS URL and immutable image digest in `DEPLOYMENT-RESULT.md`.

## Configure preview Auth

Read the Supabase personal access token into the shell without echoing it. Then apply and verify only the reviewed preview Auth fields:

```bash
read -r -s -p "Supabase access token: " SUPABASE_ACCESS_TOKEN
export SUPABASE_ACCESS_TOKEN
./scripts/configure-supabase-preview.sh \
  --project-ref "$SUPABASE_PROJECT_REF" \
  --app-url "$DEPLOYED_URL"
```

This command sets the exact Site URL and `/auth/callback` allowlist entry, disables Confirm Email through `mailer_autoconfirm`, denies anonymous and manual-linking flows, requires 12-character mixed-case passwords with digits, rotates refresh tokens, and requires reauthentication for password changes.

The Supabase Free plan does not support session time-box or inactivity controls. The preview therefore uses the provider's default session lifetime. Do not upgrade the organization only for this preview; record this limitation and rely on sign-out, refresh-token rotation, recent-session checks for sensitive actions, and fictional data.

The script refuses to modify a project whose name does not contain both `SubTrack` and `Preview`.

## Verify the live preview

Use fictional users and the downloadable fictional CSV only. Verify:

- `GET /` and one `/_next/static/` asset return 200 over HTTPS.
- `GET /api/health` returns only `{"status":"ok"}`.
- HTTP does not remain available without HTTPS.
- Security headers are present, and `X-Powered-By` is absent.
- The preview warning appears on desktop and mobile.
- A new account receives a session without an email-confirmation action.
- Sign-in, session persistence, sign-out, and protected-route denial work.
- Password-reset behavior is recorded. The hosted default mail service is best effort and rate limited, so reset delivery can remain a preview limitation.
- Two fictional users cannot read or mutate each other's known record IDs.
- Hosted RLS tests pass.
- Container Apps reports 0.5 vCPU, 1 GiB, zero minimum replicas, and one maximum replica.
- Logs contain no passwords, tokens, statement rows, filenames, amounts, or other financial content.

Delete each fictional test account through **Settings > Delete account** after verification. This exercises the reviewed owner-scoped deletion flow without a service-role key.

## Production gate

Run `npm run deploy:gate:production` only from a disposable release environment. It blocks production unless:

- `DEPLOYMENT_STAGE=production`.
- `ALLOW_UNVERIFIED_EMAIL=false`.
- `EMAIL_VERIFICATION_ENABLED=true`.
- `SUPABASE_PROJECT_STAGE=production`.
- The Supabase URL differs from `PREVIEW_SUPABASE_URL`.
- `SECURITY_GATE_FILE` contains production approval with zero unresolved Critical and High findings.
- The complete release gate, dependency audit, and Gitleaks scan pass.

Provide the gate inputs only after you verify the corresponding production evidence:

```bash
export DEPLOYMENT_STAGE=production
export ALLOW_UNVERIFIED_EMAIL=false
export EMAIL_VERIFICATION_ENABLED=true
export SUPABASE_PROJECT_STAGE=production
export PREVIEW_SUPABASE_URL=https://lsqeplgslneqrcanyipe.supabase.co
export NEXT_PUBLIC_SUPABASE_URL=https://<production-project-ref>.supabase.co
export SECURITY_GATE_FILE=/absolute/path/to/approved-production-gate.json
npm run deploy:gate:production
```

The security gate JSON has this schema. Set `approvedForProduction` to `true` only after the deployment owner, security, privacy/legal, and product approvals are recorded:

```json
{
  "approvedForProduction": true,
  "unresolvedCriticalFindings": 0,
  "unresolvedHighFindings": 0
}
```

`EMAIL_VERIFICATION_ENABLED=true` must reflect a current production Management API read showing `mailer_autoconfirm=false`. `SUPABASE_PROJECT_STAGE=production` must identify a separate production project. The gate also requires a clean, committed working tree.

The current preview does not meet these production conditions.
