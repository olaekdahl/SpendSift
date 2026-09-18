# Rollback and cleanup

## Application rollback

Container Apps runs in single-revision mode. Azure keeps the old revision serving traffic until the new revision passes startup and readiness probes. A failed update therefore leaves traffic on the last ready revision.

Record every deployed immutable ACR digest in `DEPLOYMENT-RESULT.md`. To roll back after a successful but defective release, create a new revision from the last known-good digest:

```bash
az containerapp update \
  --name ca-subtrack-preview \
  --resource-group rg-subtrack-preview-weu \
  --image "acrsubtrackpreve82d.azurecr.io/subtrack@<previous-sha256-digest>"
```

Then verify:

```bash
curl --fail --show-error \
  https://<container-app-hostname>/api/health
az containerapp revision list \
  --name ca-subtrack-preview \
  --resource-group rg-subtrack-preview-weu \
  --query '[].{name:name,active:properties.active,healthy:properties.healthState,image:properties.template.containers[0].image}' \
  --output table
```

Do not roll back by changing a mutable image tag.

## Database rollback

The preview project starts empty and receives reviewed migrations through `supabase db push`. Never run `db reset --linked`, improvised destructive SQL, or a migration-history repair as a rollback shortcut.

For an application-only failure, roll back the container and leave the additive database schema in place. For a schema failure:

1. Stop the application rollout.
2. Preserve the failed project for investigation.
3. Prefer a reviewed forward migration.
4. If restoration is required, restore into a separate preview project through the approved Supabase backup process.
5. Re-run migration, RLS, and two-user isolation checks before changing application configuration.

## Restore email verification

Before promoting beyond this preview, run:

```bash
./scripts/configure-supabase-preview.sh \
  --project-ref "$SUPABASE_PROJECT_REF" \
  --restore-email-verification
```

The command requires `SUPABASE_ACCESS_TOKEN` in the calling shell and verifies `mailer_autoconfirm=false`. Also redeploy with `ALLOW_UNVERIFIED_EMAIL=false`.

## Preview Azure cleanup

Preview the exact target first:

```bash
./scripts/destroy-azure.sh \
  --subscription-id e82ded3f-cc6c-4019-8e87-5dca164a5449 \
  --resource-group rg-subtrack-preview-weu \
  --what-if
```

Delete only the dedicated preview resource group:

```bash
./scripts/destroy-azure.sh \
  --subscription-id e82ded3f-cc6c-4019-8e87-5dca164a5449 \
  --resource-group rg-subtrack-preview-weu
```

The script checks the active subscription and requires exact `application=subtrack`, `environment=preview`, and `managedBy=bicep` tags. It refuses any group that lacks those ownership tags.

PowerShell uses:

```powershell
./scripts/destroy-azure.ps1 `
  -SubscriptionId e82ded3f-cc6c-4019-8e87-5dca164a5449 `
  -ResourceGroup rg-subtrack-preview-weu `
  -WhatIfOnly

./scripts/destroy-azure.ps1 `
  -SubscriptionId e82ded3f-cc6c-4019-8e87-5dca164a5449 `
  -ResourceGroup rg-subtrack-preview-weu
```

Do not run cleanup automatically after a successful deployment.

## Supabase cleanup

The Azure cleanup scripts never modify Supabase. Before deleting the preview project:

1. Delete fictional users through the application's account-deletion control.
2. Restore email verification if the project remains available.
3. Confirm the project name and 20-character ref identify `SubTrack Preview`.
4. Delete that project through the Supabase dashboard or `npx supabase projects delete <preview-ref>` only after separate confirmation.

Never target an existing development, staging, or production Supabase project.
