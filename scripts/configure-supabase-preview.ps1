[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-z]{20}$')]
    [string]$ProjectRef,

    [string]$AppUrl,
    [switch]$RestoreEmailVerification
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$AccessToken = $env:SUPABASE_ACCESS_TOKEN
if ([string]::IsNullOrWhiteSpace($AccessToken) -or $AccessToken.Length -lt 20) {
    throw 'SUPABASE_ACCESS_TOKEN is missing or invalid'
}

if (-not $RestoreEmailVerification) {
    $AppUrl = $AppUrl.TrimEnd('/')
    if ($AppUrl -notmatch '^https://[^/]+$') {
        throw '-AppUrl must be an exact HTTPS origin without a path'
    }
}

$Headers = @{ Authorization = "Bearer $AccessToken" }
$ApiUrl = "https://api.supabase.com/v1/projects/$ProjectRef"
$Project = Invoke-RestMethod -Method Get -Uri $ApiUrl -Headers $Headers
$ProjectName = $Project.name.ToLowerInvariant()
if (-not $ProjectName.Contains('subtrack') -or -not $ProjectName.Contains('preview')) {
    throw 'Refusing to modify a project whose name does not contain both SubTrack and Preview'
}

if ($RestoreEmailVerification) {
    $Body = @{
        mailer_autoconfirm                    = $false
        mailer_allow_unverified_email_sign_ins = $false
    } | ConvertTo-Json

    $Result = Invoke-RestMethod -Method Patch -Uri "$ApiUrl/config/auth" -Headers $Headers -ContentType 'application/json' -Body $Body
    if ($Result.mailer_autoconfirm -ne $false -or $Result.mailer_allow_unverified_email_sign_ins -ne $false) {
        throw 'Supabase did not restore email verification'
    }

    [pscustomobject]@{
        mailer_autoconfirm                    = $Result.mailer_autoconfirm
        mailer_allow_unverified_email_sign_ins = $Result.mailer_allow_unverified_email_sign_ins
    }
    Write-Host "Email verification is restored for Supabase project $ProjectRef."
    exit 0
}

$CallbackUrl = "$AppUrl/auth/callback"
$Body = @{
    site_url                                      = $AppUrl
    uri_allow_list                                 = $CallbackUrl
    disable_signup                                 = $false
    external_email_enabled                         = $true
    external_anonymous_users_enabled               = $false
    security_manual_linking_enabled                = $false
    mailer_autoconfirm                              = $true
    mailer_allow_unverified_email_sign_ins          = $false
    password_min_length                             = 12
    password_required_characters                    = 'abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789'
    refresh_token_rotation_enabled                  = $true
    security_refresh_token_reuse_interval           = 10
    security_update_password_require_reauthentication = $true
} | ConvertTo-Json

$Result = Invoke-RestMethod -Method Patch -Uri "$ApiUrl/config/auth" -Headers $Headers -ContentType 'application/json' -Body $Body
$Valid =
    $Result.site_url -eq $AppUrl -and
    $Result.uri_allow_list -eq $CallbackUrl -and
    $Result.mailer_autoconfirm -eq $true -and
    $Result.mailer_allow_unverified_email_sign_ins -eq $false -and
    $Result.external_anonymous_users_enabled -eq $false -and
    $Result.security_manual_linking_enabled -eq $false -and
    $Result.password_min_length -eq 12 -and
    $Result.refresh_token_rotation_enabled -eq $true

if (-not $Valid) {
    throw 'Supabase preview Auth configuration verification failed'
}

[pscustomobject]@{
    site_url                            = $Result.site_url
    uri_allow_list                       = $Result.uri_allow_list
    mailer_autoconfirm                   = $Result.mailer_autoconfirm
    mailer_allow_unverified_email_sign_ins = $Result.mailer_allow_unverified_email_sign_ins
    external_anonymous_users_enabled     = $Result.external_anonymous_users_enabled
    security_manual_linking_enabled      = $Result.security_manual_linking_enabled
    password_min_length                  = $Result.password_min_length
    refresh_token_rotation_enabled       = $Result.refresh_token_rotation_enabled
}
Write-Host "Configured and verified preview Auth for Supabase project $ProjectRef."