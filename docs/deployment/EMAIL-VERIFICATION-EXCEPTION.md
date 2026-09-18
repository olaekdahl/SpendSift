# Preview email-verification exception

## Status

This exception applies only to the isolated `SubTrack Preview` Supabase project and the Azure Container App labeled `preview`. It never applies to production or an existing Supabase project.

## Reason

The initial preview must let evaluators register and sign in without waiting for email delivery. Supabase documents that disabling **Confirm Email** implicitly confirms new users. This setting increases risk and is not an acceptable production design.

## Technical enforcement

The preview uses these controls together:

- The Supabase Management API sets `mailer_autoconfirm=true` only on a project whose name contains both `SubTrack` and `Preview`.
- `mailer_allow_unverified_email_sign_ins` remains `false`; the exception uses Supabase's supported auto-confirm setting rather than a legacy sign-in bypass.
- The Site URL and redirect allowlist contain the exact Container Apps HTTPS origin and `/auth/callback` path.
- Anonymous sign-in and manual account linking remain disabled.
- Every signup still creates a unique Supabase Auth user and session.
- Row Level Security remains enabled, and application requests use only the signed-in session and publishable key.
- Azure sets `DEPLOYMENT_STAGE=preview` and `ALLOW_UNVERIFIED_EMAIL=true` as server-side runtime values.
- `src/instrumentation.ts` validates the combination when Next.js initializes.
- `scripts/container-entrypoint.sh` exits before Node starts if production enables the exception.
- The root server layout renders the required warning on every page.

The application does not mark users verified in browser code, expose an administrative verification route, or use a service-role key.

## Risks

- A user can register an address they do not control.
- Mistyped addresses can create accounts that cannot receive password-reset messages.
- Automated signup abuse becomes easier.
- Users might mistake the preview for an approved financial-data environment.

## Compensating controls

- Use a separate preview project with fictional data only.
- Keep the visible warning: “Preview environment. Email verification is temporarily disabled. Do not enter real financial information.”
- Keep Supabase signup and token rate limits enabled.
- Keep passwords at 12 characters with lower-case, upper-case, and digit requirements.
- Keep refresh-token rotation and recent-session checks for sensitive actions. The Free plan's lack of session timeouts remains a documented preview limitation.
- Keep one Azure replica maximum and short log retention.
- Delete fictional accounts after testing.
- Do not configure a custom domain or describe the environment as production.

## Restore email verification

For Bash, read the Management API token directly into the shell and run:

```bash
read -r -s -p "Supabase access token: " SUPABASE_ACCESS_TOKEN
export SUPABASE_ACCESS_TOKEN
./scripts/configure-supabase-preview.sh \
  --project-ref "$SUPABASE_PROJECT_REF" \
  --restore-email-verification
```

For PowerShell, set `SUPABASE_ACCESS_TOKEN` through a secure local process and run:

```powershell
./scripts/configure-supabase-preview.ps1 `
  -ProjectRef $env:SUPABASE_PROJECT_REF `
  -RestoreEmailVerification
```

The scripts set and verify:

- `mailer_autoconfirm=false`.
- `mailer_allow_unverified_email_sign_ins=false`.

A restoration drill passed on 2026-09-18. The preview auto-confirm setting was reapplied and verified immediately afterward.

Also redeploy the application with `ALLOW_UNVERIFIED_EMAIL=false`. For production, set `DEPLOYMENT_STAGE=production` and use a separate production Supabase project.

## Mandatory production proof

Before any production deployment:

1. Read the production Auth configuration through `GET /v1/projects/{ref}/config/auth`.
2. Confirm `mailer_autoconfirm` is `false`.
3. Confirm the production project differs from the preview project.
4. Confirm `ALLOW_UNVERIFIED_EMAIL=false` and `DEPLOYMENT_STAGE=production`.
5. Complete one real confirmation flow in production-equivalent staging.
6. Complete password-reset delivery with approved SMTP.
7. Run `npm run deploy:gate:production` with approved security evidence.

Any failed item blocks production.
