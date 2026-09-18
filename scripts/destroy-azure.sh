#!/usr/bin/env bash

set -Eeuo pipefail

subscription_id="${AZURE_SUBSCRIPTION_ID:-}"
resource_group="rg-subtrack-preview-weu"
what_if_only=false

usage() {
  cat <<'EOF'
Usage: ./scripts/destroy-azure.sh --subscription-id <id> [options]

Options:
  --subscription-id <id>     Required Azure subscription ID.
  --resource-group <name>    Dedicated preview resource group.
  --what-if                  List the exact resources without deleting them.
  --help                     Show this message.
EOF
}

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --subscription-id)
      [[ $# -ge 2 ]] || fail "--subscription-id requires a value"
      subscription_id="$2"
      shift 2
      ;;
    --resource-group)
      [[ $# -ge 2 ]] || fail "--resource-group requires a value"
      resource_group="$2"
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

command -v az >/dev/null 2>&1 || fail "Required command is unavailable: az"
[[ -n "$subscription_id" ]] || fail "Provide --subscription-id or AZURE_SUBSCRIPTION_ID"

current_subscription_id="$(az account show --query id --output tsv 2>/dev/null)" || fail "Azure CLI is not authenticated"
if [[ "$current_subscription_id" != "$subscription_id" ]]; then
  fail "The active Azure subscription does not match. Run: az account set --subscription $subscription_id"
fi

if [[ "$(az group exists --name "$resource_group")" != "true" ]]; then
  printf 'Resource group %s does not exist. Nothing to delete.\n' "$resource_group"
  exit 0
fi

ownership_ok="$(az group show --name "$resource_group" --query "tags.application == 'subtrack' && tags.environment == 'preview' && tags.managedBy == 'bicep'" --output tsv)"
[[ "$ownership_ok" == "true" ]] || fail "Refusing to delete $resource_group because its ownership tags do not identify the SubTrack preview"

printf 'Resources in %s:\n' "$resource_group"
az resource list --resource-group "$resource_group" --query '[].{name:name,type:type}' --output table

if [[ "$what_if_only" == "true" ]]; then
  printf 'Cleanup preview complete. No resources were deleted.\n'
  exit 0
fi

az group delete --name "$resource_group" --yes
printf 'Deleted only the SubTrack preview resource group: %s\n' "$resource_group"
printf 'Restore hosted Supabase Auth settings separately; this script does not modify or delete Supabase projects.\n'