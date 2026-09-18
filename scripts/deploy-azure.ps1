[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F-]{36}$')]
    [string]$SubscriptionId,

    [string]$Location = 'westeurope',
    [string]$ResourceGroup = 'rg-subtrack-preview-weu',

    [ValidatePattern('^[a-z0-9]{5,50}$')]
    [string]$RegistryName = 'acrsubtrackpreve82d',

    [string]$ImageTag = $env:IMAGE_TAG,
    [switch]$WhatIfOnly
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$RepositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$TemplateFile = Join-Path $RepositoryRoot 'infra/azure/main.bicep'
$PullIdentityName = 'id-subtrack-preview-acr'
$LogWorkspaceName = 'log-subtrack-preview-weu'
$ContainerEnvironmentName = 'cae-subtrack-preview-weu'
$ContainerAppName = 'ca-subtrack-preview'
$TrivyImage = 'aquasec/trivy@sha256:62b1e65e8869bc4b4c6aa4fa2b21595256c7c2f6018a9d9ad61caf87187c1969'
$GitleaksImage = 'ghcr.io/gitleaks/gitleaks@sha256:c00b6bd0aeb3071cbcb79009cb16a60dd9e0a7c60e2be9ab65d25e6bc8abbb7f'

function Assert-Command {
    param([Parameter(Mandatory = $true)][string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command is unavailable: $Name"
    }
}

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Command failed with exit code $LASTEXITCODE"
    }
}

foreach ($CommandName in @('az', 'docker', 'git', 'npm')) {
    Assert-Command -Name $CommandName
}

if (-not (Test-Path $TemplateFile -PathType Leaf)) {
    throw "Bicep template is missing: $TemplateFile"
}

$SupabaseUrl = $env:NEXT_PUBLIC_SUPABASE_URL
$SupabasePublishableKey = $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

if ($SupabaseUrl -notmatch '^https://[a-z0-9-]+\.supabase\.co/?$') {
    throw 'NEXT_PUBLIC_SUPABASE_URL must identify a hosted Supabase project'
}

if ([string]::IsNullOrWhiteSpace($SupabasePublishableKey) -or $SupabasePublishableKey.Length -lt 20) {
    throw 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing or invalid'
}

$CurrentSubscriptionId = (& az account show --query id --output tsv 2>$null).Trim()
if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($CurrentSubscriptionId)) {
    throw 'Azure CLI is not authenticated'
}

if ($CurrentSubscriptionId -ne $SubscriptionId) {
    throw "The active Azure subscription does not match. Run: az account set --subscription $SubscriptionId"
}

$AccountName = (& az account show --query name --output tsv).Trim()
$TenantId = (& az account show --query tenantId --output tsv).Trim()
Write-Host "Azure account: $AccountName"
Write-Host "Subscription: $SubscriptionId"
Write-Host "Tenant: $($TenantId.Substring(0, 4))...$($TenantId.Substring($TenantId.Length - 4))"
Write-Host "Region: $Location"

$GroupExists = ((& az group exists --name $ResourceGroup).Trim() -eq 'true')
if ($GroupExists) {
    $OwnershipOk = (& az group show --name $ResourceGroup --query "tags.application == 'subtrack' && tags.environment == 'preview' && tags.managedBy == 'bicep'" --output tsv).Trim()
    if ($OwnershipOk -ne 'true') {
        throw "Resource group $ResourceGroup exists without the required SubTrack preview ownership tags"
    }
}
else {
    $RegistryAvailable = (& az acr check-name --name $RegistryName --query nameAvailable --output tsv).Trim()
    if ($RegistryAvailable -ne 'true') {
        throw "Azure Container Registry name is unavailable: $RegistryName"
    }
}

if ([string]::IsNullOrWhiteSpace($ImageTag)) {
    $CommitId = (& git -C $RepositoryRoot rev-parse --short=12 HEAD).Trim()
    $WorkingTreeState = & git -C $RepositoryRoot status --porcelain
    if ($WorkingTreeState) {
        $ImageTag = "git-$CommitId-$(Get-Date -AsUTC -Format 'yyyyMMddHHmmss')"
    }
    else {
        $ImageTag = "git-$CommitId"
    }
}

if ($ImageTag -notmatch '^[A-Za-z0-9_][A-Za-z0-9_.-]{0,127}$') {
    throw 'The image tag format is invalid'
}

$RegistryLoginServer = "$RegistryName.azurecr.io"
$ProposedImage = "$RegistryLoginServer/subtrack:$ImageTag"
$BaseParameters = @(
    "location=$Location",
    "resourceGroupName=$ResourceGroup",
    "containerRegistryName=$RegistryName",
    "pullIdentityName=$PullIdentityName",
    "logAnalyticsWorkspaceName=$LogWorkspaceName",
    "containerAppsEnvironmentName=$ContainerEnvironmentName",
    "containerAppName=$ContainerAppName"
)

function Invoke-ValidationAndWhatIf {
    param([Parameter(Mandatory = $true)][string]$ImageReference)

    $DeploymentParameters = $BaseParameters + @(
        "containerImage=$ImageReference",
        'deployContainerApp=true',
        "supabaseUrl=$SupabaseUrl",
        "supabasePublishableKey=$SupabasePublishableKey"
    )

    Write-Host 'Validating Bicep deployment...'
    $ValidateArguments = @(
        'deployment', 'sub', 'validate',
        '--name', 'subtrack-preview-validation',
        '--location', $Location,
        '--template-file', $TemplateFile,
        '--parameters'
    ) + $DeploymentParameters + @('--only-show-errors', '--output', 'none')
    Invoke-CheckedCommand -Command 'az' -Arguments $ValidateArguments

    Write-Host 'Reviewing Azure what-if changes...'
    $WhatIfArguments = @(
        'deployment', 'sub', 'what-if',
        '--name', 'subtrack-preview-what-if',
        '--location', $Location,
        '--template-file', $TemplateFile,
        '--parameters'
    ) + $DeploymentParameters + @('--result-format', 'ResourceIdOnly', '--no-pretty-print')
    Invoke-CheckedCommand -Command 'az' -Arguments $WhatIfArguments
}

Invoke-ValidationAndWhatIf -ImageReference $ProposedImage

if ($WhatIfOnly) {
    Write-Host 'What-if complete. No Azure resources were created.'
    exit 0
}

Write-Host 'Running the complete local release gate...'
Push-Location $RepositoryRoot
try {
    Remove-Item Env:NEXT_PUBLIC_SUPABASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY -ErrorAction SilentlyContinue
    Invoke-CheckedCommand -Command 'npm' -Arguments @('run', 'verify')
    Invoke-CheckedCommand -Command 'npm' -Arguments @('audit', '--audit-level=high')
}
finally {
    $env:NEXT_PUBLIC_SUPABASE_URL = $SupabaseUrl
    $env:NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = $SupabasePublishableKey
    Pop-Location
}

Write-Host 'Scanning Git history for secrets...'
if (Get-Command gitleaks -ErrorAction SilentlyContinue) {
    Invoke-CheckedCommand -Command 'gitleaks' -Arguments @('git', '--redact', '--no-banner', $RepositoryRoot)
}
else {
    Invoke-CheckedCommand -Command 'docker' -Arguments @(
        'run', '--rm',
        '--volume', "${RepositoryRoot}:/repo:ro",
        '--workdir', '/repo',
        $GitleaksImage,
        'git', '--redact', '--no-banner', '/repo'
    )
}

Write-Host 'Scanning uncommitted Git candidates for secrets...'
$WorkingTreeScanDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "subtrack-working-tree-$([guid]::NewGuid())"
New-Item -ItemType Directory -Path $WorkingTreeScanDirectory | Out-Null
try {
    $TrackedChanges = & git -C $RepositoryRoot diff --no-ext-diff HEAD
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to generate the tracked working-tree diff'
    }
    Set-Content -LiteralPath (Join-Path $WorkingTreeScanDirectory 'tracked-changes.patch') -Value $TrackedChanges -Encoding utf8

    $UntrackedFiles = @(& git -C $RepositoryRoot ls-files --others --exclude-standard)
    if ($LASTEXITCODE -ne 0) {
        throw 'Unable to list untracked Git candidates'
    }
    foreach ($RelativePath in $UntrackedFiles) {
        $Destination = Join-Path $WorkingTreeScanDirectory "untracked/$RelativePath"
        New-Item -ItemType Directory -Path (Split-Path $Destination -Parent) -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $RepositoryRoot $RelativePath) -Destination $Destination
    }

    if (Get-Command gitleaks -ErrorAction SilentlyContinue) {
        Invoke-CheckedCommand -Command 'gitleaks' -Arguments @('dir', '--redact', '--no-banner', $WorkingTreeScanDirectory)
    }
    else {
        Invoke-CheckedCommand -Command 'docker' -Arguments @(
            'run', '--rm',
            '--volume', "${WorkingTreeScanDirectory}:/scan:ro",
            $GitleaksImage,
            'dir', '--redact', '--no-banner', '/scan'
        )
    }
}
finally {
    Remove-Item $WorkingTreeScanDirectory -Recurse -Force -ErrorAction SilentlyContinue
}

$LocalImage = "subtrack-preview:$ImageTag"
Write-Host "Building production image $LocalImage..."
Invoke-CheckedCommand -Command 'docker' -Arguments @('build', '--pull', '--tag', $LocalImage, $RepositoryRoot)

Write-Host 'Scanning the runtime image for fixed High and Critical vulnerabilities...'
$ScanDirectory = Join-Path ([System.IO.Path]::GetTempPath()) "subtrack-scan-$([guid]::NewGuid())"
New-Item -ItemType Directory -Path $ScanDirectory | Out-Null
try {
    $ImageArchive = Join-Path $ScanDirectory 'subtrack.tar'
    $ScanReport = Join-Path $ScanDirectory 'report.json'
    Invoke-CheckedCommand -Command 'docker' -Arguments @('save', $LocalImage, '--output', $ImageArchive)
    Invoke-CheckedCommand -Command 'docker' -Arguments @(
        'run', '--rm',
        '--volume', "${ScanDirectory}:/scan",
        $TrivyImage,
        'image', '--input', '/scan/subtrack.tar',
        '--scanners', 'vuln',
        '--severity', 'HIGH,CRITICAL',
        '--ignore-unfixed',
        '--exit-code', '1',
        '--format', 'json',
        '--output', '/scan/report.json',
        '--no-progress'
    )

    $Scan = Get-Content $ScanReport -Raw | ConvertFrom-Json
    $Vulnerabilities = @($Scan.Results | ForEach-Object { $_.Vulnerabilities } | Where-Object { $null -ne $_ })
    Write-Host "Image scan: $(@($Vulnerabilities | Where-Object Severity -eq 'HIGH').Count) High, $(@($Vulnerabilities | Where-Object Severity -eq 'CRITICAL').Count) Critical"
}
finally {
    Remove-Item $ScanDirectory -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host 'Creating or updating the isolated Azure foundation...'
$FoundationArguments = @(
    'deployment', 'sub', 'create',
    '--name', 'subtrack-preview-foundation',
    '--location', $Location,
    '--template-file', $TemplateFile,
    '--parameters'
) + $BaseParameters + @('deployContainerApp=false', '--only-show-errors', '--output', 'none')
Invoke-CheckedCommand -Command 'az' -Arguments $FoundationArguments

$ActualLoginServer = (& az acr show --name $RegistryName --resource-group $ResourceGroup --query loginServer --output tsv).Trim()
if ($ActualLoginServer -ne $RegistryLoginServer) {
    throw 'The created registry login server does not match the expected name'
}

Write-Host "Uploading the application image to $RegistryLoginServer..."
Invoke-CheckedCommand -Command 'az' -Arguments @('acr', 'login', '--name', $RegistryName, '--only-show-errors')
$RemoteTaggedImage = "$RegistryLoginServer/subtrack:$ImageTag"
Invoke-CheckedCommand -Command 'docker' -Arguments @('tag', $LocalImage, $RemoteTaggedImage)
Invoke-CheckedCommand -Command 'docker' -Arguments @('push', $RemoteTaggedImage)

$ImageDigest = (& az acr repository show --name $RegistryName --image "subtrack:$ImageTag" --query digest --output tsv).Trim()
if ($ImageDigest -notmatch '^sha256:[a-f0-9]{64}$') {
    throw 'Azure did not return a valid image digest'
}
$ImmutableImage = "$RegistryLoginServer/subtrack@$ImageDigest"

Invoke-ValidationAndWhatIf -ImageReference $ImmutableImage

Write-Host 'Deploying the Container App from the immutable image digest...'
$ApplicationParameters = $BaseParameters + @(
    "containerImage=$ImmutableImage",
    'deployContainerApp=true',
    "supabaseUrl=$SupabaseUrl",
    "supabasePublishableKey=$SupabasePublishableKey"
)
$ApplicationArguments = @(
    'deployment', 'sub', 'create',
    '--name', 'subtrack-preview-application',
    '--location', $Location,
    '--template-file', $TemplateFile,
    '--parameters'
) + $ApplicationParameters + @(
    '--only-show-errors',
    '--query', 'properties.outputs.deployedUrl.value',
    '--output', 'tsv'
)
$DeployedUrl = (& az @ApplicationArguments).Trim()
if ($LASTEXITCODE -ne 0 -or $DeployedUrl -notmatch '^https://') {
    throw 'Azure did not return an HTTPS application URL'
}

Invoke-WebRequest -Uri "$DeployedUrl/api/health" -MaximumRetryCount 12 -RetryIntervalSec 5 | Out-Null

Write-Host ''
Write-Host 'Deployment complete.'
Write-Host "Resource group: $ResourceGroup"
Write-Host "Container App: $ContainerAppName"
Write-Host "Image: $ImmutableImage"
Write-Host "URL: $DeployedUrl"
Write-Host "Cleanup: ./scripts/destroy-azure.ps1 -SubscriptionId $SubscriptionId -ResourceGroup $ResourceGroup"