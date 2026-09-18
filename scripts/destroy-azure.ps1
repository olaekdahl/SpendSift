[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F-]{36}$')]
    [string]$SubscriptionId,

    [string]$ResourceGroup = 'rg-subtrack-preview-weu',
    [switch]$WhatIfOnly
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    throw 'Required command is unavailable: az'
}

$CurrentSubscriptionId = (& az account show --query id --output tsv 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($CurrentSubscriptionId)) {
    throw 'Azure CLI is not authenticated'
}

if ($CurrentSubscriptionId -ne $SubscriptionId) {
    throw "The active Azure subscription does not match. Run: az account set --subscription $SubscriptionId"
}

$GroupExists = ((& az group exists --name $ResourceGroup).Trim() -eq 'true')
if (-not $GroupExists) {
    Write-Host "Resource group $ResourceGroup does not exist. Nothing to delete."
    exit 0
}

$OwnershipOk = (& az group show --name $ResourceGroup --query "tags.application == 'subtrack' && tags.environment == 'preview' && tags.managedBy == 'bicep'" --output tsv).Trim()
if ($OwnershipOk -ne 'true') {
    throw "Refusing to delete $ResourceGroup because its ownership tags do not identify the SubTrack preview"
}

Write-Host "Resources in ${ResourceGroup}:"
& az resource list --resource-group $ResourceGroup --query '[].{name:name,type:type}' --output table
if ($LASTEXITCODE -ne 0) {
    throw 'Unable to list the preview resources'
}

if ($WhatIfOnly) {
    Write-Host 'Cleanup preview complete. No resources were deleted.'
    exit 0
}

& az group delete --name $ResourceGroup --yes
if ($LASTEXITCODE -ne 0) {
    throw 'Azure resource-group deletion failed'
}

Write-Host "Deleted only the SubTrack preview resource group: $ResourceGroup"
Write-Host 'Restore hosted Supabase Auth settings separately; this script does not modify or delete Supabase projects.'