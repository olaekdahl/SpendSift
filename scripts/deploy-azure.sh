#!/usr/bin/env bash

set -Eeuo pipefail

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly REPOSITORY_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
readonly TEMPLATE_FILE="$REPOSITORY_ROOT/infra/azure/main.bicep"
readonly TRIVY_IMAGE="aquasec/trivy@sha256:62b1e65e8869bc4b4c6aa4fa2b21595256c7c2f6018a9d9ad61caf87187c1969"
readonly GITLEAKS_IMAGE="ghcr.io/gitleaks/gitleaks@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f"

subscription_id="${AZURE_SUBSCRIPTION_ID:-}"
location="westeurope"
resource_group="rg-subtrack-preview-weu"
registry_name="acrsubtrackpreve82d"
pull_identity_name="id-subtrack-preview-acr"
log_workspace_name="log-subtrack-preview-weu"
container_environment_name="cae-subtrack-preview-weu"
container_app_name="ca-subtrack-preview"
image_tag="${IMAGE_TAG:-}"
what_if_only=false
scan_directory=""
working_tree_scan_directory=""

usage() {
  cat <<'EOF'
Usage: ./scripts/deploy-azure.sh --subscription-id <id> [options]

Options:
  --subscription-id <id>     Required Azure subscription ID.
  --location <region>        Azure region. Default: westeurope.
  --resource-group <name>    Dedicated preview resource group.
  --registry <name>          Globally unique Azure Container Registry name.
  --image-tag <tag>          Explicit image tag. Defaults to a Git-derived tag.
  --what-if                  Validate and show changes without creating resources.
  --help                     Show this message.

Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in the
calling environment. The script never prints their values.
EOF
}

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Required command is unavailable: $1"
}

cleanup() {
  if [[ -n "$scan_directory" && -d "$scan_directory" ]]; then
    rm -rf "$scan_directory"
  fi
  if [[ -n "$working_tree_scan_directory" && -d "$working_tree_scan_directory" ]]; then
    rm -rf "$working_tree_scan_directory"
  fi
}

trap cleanup EXIT

while [[ $# -gt 0 ]]; do
  case "$1" in
    --subscription-id)
      [[ $# -ge 2 ]] || fail "--subscription-id requires a value"
      subscription_id="$2"
      shift 2
      ;;
    --location)
      [[ $# -ge 2 ]] || fail "--location requires a value"
      location="$2"
      shift 2
      ;;
    --resource-group)
      [[ $# -ge 2 ]] || fail "--resource-group requires a value"
      resource_group="$2"
      shift 2
      ;;
    --registry)
      [[ $# -ge 2 ]] || fail "--registry requires a value"
      registry_name="$2"
      shift 2
      ;;
    --image-tag)
      [[ $# -ge 2 ]] || fail "--image-tag requires a value"
      image_tag="$2"
      shift 2
      ;;
    --what-if)
      what_if_only=true
      shift
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      fail "Unknown option: $1"
      ;;
  esac
done

for command_name in az docker git jq npm curl; do
  require_command "$command_name"
done

[[ -f "$TEMPLATE_FILE" ]] || fail "Bicep template is missing: $TEMPLATE_FILE"
[[ -n "$subscription_id" ]] || fail "Provide --subscription-id or AZURE_SUBSCRIPTION_ID"
[[ "$subscription_id" =~ ^[0-9a-fA-F-]{36}$ ]] || fail "The subscription ID format is invalid"
[[ "$registry_name" =~ ^[a-z0-9]{5,50}$ ]] || fail "The registry name must contain 5-50 lower-case letters or digits"

supabase_url="${NEXT_PUBLIC_SUPABASE_URL:-}"
supabase_publishable_key="${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}"

[[ "$supabase_url" =~ ^https://[a-z0-9-]+\.supabase\.co/?$ ]] || fail "NEXT_PUBLIC_SUPABASE_URL must identify a hosted Supabase project"
[[ ${#supabase_publishable_key} -ge 20 ]] || fail "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing or invalid"

current_subscription_id="$(az account show --query id --output tsv 2>/dev/null)" || fail "Azure CLI is not authenticated"
if [[ "$current_subscription_id" != "$subscription_id" ]]; then
  fail "The active Azure subscription does not match. Run: az account set --subscription $subscription_id"
fi

account_name="$(az account show --query name --output tsv)"
tenant_id="$(az account show --query tenantId --output tsv)"
printf 'Azure account: %s\nSubscription: %s\nTenant: %s...%s\nRegion: %s\n' \
  "$account_name" "$subscription_id" "${tenant_id:0:4}" "${tenant_id: -4}" "$location"

if [[ "$(az group exists --name "$resource_group")" == "true" ]]; then
  ownership_ok="$(az group show --name "$resource_group" --query "tags.application == 'subtrack' && tags.environment == 'preview' && tags.managedBy == 'bicep'" --output tsv)"
  [[ "$ownership_ok" == "true" ]] || fail "Resource group $resource_group exists without the required SubTrack preview ownership tags"
else
  registry_available="$(az acr check-name --name "$registry_name" --query nameAvailable --output tsv)"
  [[ "$registry_available" == "true" ]] || fail "Azure Container Registry name is unavailable: $registry_name"
fi

if [[ -z "$image_tag" ]]; then
  commit_id="$(git -C "$REPOSITORY_ROOT" rev-parse --short=12 HEAD)"
  if [[ -n "$(git -C "$REPOSITORY_ROOT" status --porcelain)" ]]; then
    image_tag="git-${commit_id}-$(date -u +%Y%m%d%H%M%S)"
  else
    image_tag="git-${commit_id}"
  fi
fi

[[ "$image_tag" =~ ^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$ ]] || fail "The image tag format is invalid"

registry_login_server="${registry_name}.azurecr.io"
proposed_image="${registry_login_server}/subtrack:${image_tag}"

base_parameters=(
  "location=$location"
  "resourceGroupName=$resource_group"
  "containerRegistryName=$registry_name"
  "pullIdentityName=$pull_identity_name"
  "logAnalyticsWorkspaceName=$log_workspace_name"
  "containerAppsEnvironmentName=$container_environment_name"
  "containerAppName=$container_app_name"
)

validate_and_preview() {
  local image_reference="$1"
  printf 'Validating Bicep deployment...\n'
  az deployment sub validate \
    --name subtrack-preview-validation \
    --location "$location" \
    --template-file "$TEMPLATE_FILE" \
    --parameters "${base_parameters[@]}" \
      "containerImage=$image_reference" \
      "deployContainerApp=true" \
      "supabaseUrl=$supabase_url" \
      "supabasePublishableKey=$supabase_publishable_key" \
    --only-show-errors \
    --output none

  printf 'Reviewing Azure what-if changes...\n'
  az deployment sub what-if \
    --name subtrack-preview-what-if \
    --location "$location" \
    --template-file "$TEMPLATE_FILE" \
    --parameters "${base_parameters[@]}" \
      "containerImage=$image_reference" \
      "deployContainerApp=true" \
      "supabaseUrl=$supabase_url" \
      "supabasePublishableKey=$supabase_publishable_key" \
    --result-format ResourceIdOnly \
    --no-pretty-print
}

validate_and_preview "$proposed_image"

if [[ "$what_if_only" == "true" ]]; then
  printf 'What-if complete. No Azure resources were created.\n'
  exit 0
fi

printf 'Running the complete local release gate...\n'
(
  cd "$REPOSITORY_ROOT"
  unset NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  npm run verify
  npm audit --audit-level=high
)

printf 'Scanning Git history for secrets...\n'
if command -v gitleaks >/dev/null 2>&1; then
  gitleaks git --redact --no-banner "$REPOSITORY_ROOT"
else
  docker run --rm \
    --volume "$REPOSITORY_ROOT:/repo:ro" \
    --workdir /repo \
    "$GITLEAKS_IMAGE" \
    git --redact --no-banner /repo
fi

printf 'Scanning uncommitted Git candidates for secrets...\n'
working_tree_scan_directory="$(mktemp -d)"
git -C "$REPOSITORY_ROOT" diff --no-ext-diff HEAD > "$working_tree_scan_directory/tracked-changes.patch"
while IFS= read -r -d '' path; do
  destination="$working_tree_scan_directory/untracked/$path"
  mkdir -p "$(dirname "$destination")"
  cp -- "$REPOSITORY_ROOT/$path" "$destination"
done < <(git -C "$REPOSITORY_ROOT" ls-files --others --exclude-standard -z)

if command -v gitleaks >/dev/null 2>&1; then
  gitleaks dir --redact --no-banner "$working_tree_scan_directory"
else
  docker run --rm \
    --volume "$working_tree_scan_directory:/scan:ro" \
    "$GITLEAKS_IMAGE" \
    dir --redact --no-banner /scan
fi

local_image="subtrack-preview:${image_tag}"
printf 'Building production image %s...\n' "$local_image"
docker build --pull --tag "$local_image" "$REPOSITORY_ROOT"

printf 'Scanning the runtime image for fixed High and Critical vulnerabilities...\n'
scan_directory="$(mktemp -d)"
docker save "$local_image" --output "$scan_directory/subtrack.tar"
docker run --rm \
  --volume "$scan_directory:/scan" \
  "$TRIVY_IMAGE" \
  image --input /scan/subtrack.tar \
  --scanners vuln \
  --severity HIGH,CRITICAL \
  --ignore-unfixed \
  --exit-code 1 \
  --format json \
  --output /scan/report.json \
  --no-progress >/dev/null
jq '{high: ([.Results[]?.Vulnerabilities[]? | select(.Severity == "HIGH")] | length), critical: ([.Results[]?.Vulnerabilities[]? | select(.Severity == "CRITICAL")] | length)}' "$scan_directory/report.json"

printf 'Creating or updating the isolated Azure foundation...\n'
az deployment sub create \
  --name subtrack-preview-foundation \
  --location "$location" \
  --template-file "$TEMPLATE_FILE" \
  --parameters "${base_parameters[@]}" "deployContainerApp=false" \
  --only-show-errors \
  --output none

actual_login_server="$(az acr show --name "$registry_name" --resource-group "$resource_group" --query loginServer --output tsv)"
[[ "$actual_login_server" == "$registry_login_server" ]] || fail "The created registry login server does not match the expected name"

printf 'Uploading the application image to %s...\n' "$registry_login_server"
az acr login --name "$registry_name" --only-show-errors >/dev/null
remote_tagged_image="${registry_login_server}/subtrack:${image_tag}"
docker tag "$local_image" "$remote_tagged_image"
docker push "$remote_tagged_image"

image_digest="$(az acr repository show --name "$registry_name" --image "subtrack:$image_tag" --query digest --output tsv)"
[[ "$image_digest" =~ ^sha256:[a-f0-9]{64}$ ]] || fail "Azure did not return a valid image digest"
immutable_image="${registry_login_server}/subtrack@${image_digest}"

validate_and_preview "$immutable_image"

printf 'Deploying the Container App from the immutable image digest...\n'
deployed_url="$(az deployment sub create \
  --name subtrack-preview-application \
  --location "$location" \
  --template-file "$TEMPLATE_FILE" \
  --parameters "${base_parameters[@]}" \
    "containerImage=$immutable_image" \
    "deployContainerApp=true" \
    "supabaseUrl=$supabase_url" \
    "supabasePublishableKey=$supabase_publishable_key" \
  --only-show-errors \
  --query properties.outputs.deployedUrl.value \
  --output tsv)"

[[ "$deployed_url" =~ ^https:// ]] || fail "Azure did not return an HTTPS application URL"
curl --fail --silent --show-error --retry 12 --retry-all-errors --retry-delay 5 "$deployed_url/api/health" >/dev/null

printf '\nDeployment complete.\n'
printf 'Resource group: %s\n' "$resource_group"
printf 'Container App: %s\n' "$container_app_name"
printf 'Image: %s\n' "$immutable_image"
printf 'URL: %s\n' "$deployed_url"
printf 'Cleanup: ./scripts/destroy-azure.sh --subscription-id %s --resource-group %s\n' "$subscription_id" "$resource_group"