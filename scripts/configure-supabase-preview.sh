#!/usr/bin/env bash

set -Eeuo pipefail

project_ref="${SUPABASE_PROJECT_REF:-}"
app_url=""
restore_email_verification=false

usage() {
  cat <<'EOF'
Usage: ./scripts/configure-supabase-preview.sh --project-ref <ref> [options]

Options:
  --project-ref <ref>              Required 20-character preview project ref.
  --app-url <https-url>            Required when configuring the preview.
  --restore-email-verification     Re-enable Confirm Email without changing URLs.
  --help                           Show this message.

Set SUPABASE_ACCESS_TOKEN in the calling environment. The script never prints it.
EOF
}

fail() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --project-ref)
      [[ $# -ge 2 ]] || fail "--project-ref requires a value"
      project_ref="$2"
      shift 2
      ;;
    --app-url)
      [[ $# -ge 2 ]] || fail "--app-url requires a value"
      app_url="${2%/}"
      shift 2
      ;;
    --restore-email-verification)
      restore_email_verification=true
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

for command_name in curl jq; do
  command -v "$command_name" >/dev/null 2>&1 || fail "Required command is unavailable: $command_name"
done

access_token="${SUPABASE_ACCESS_TOKEN:-}"
[[ "$project_ref" =~ ^[a-z]{20}$ ]] || fail "SUPABASE_PROJECT_REF must contain exactly 20 lower-case letters"
[[ ${#access_token} -ge 20 ]] || fail "SUPABASE_ACCESS_TOKEN is missing or invalid"

if [[ "$restore_email_verification" != "true" ]]; then
  [[ "$app_url" =~ ^https://[^/]+$ ]] || fail "--app-url must be an exact HTTPS origin without a path"
fi

api_url="https://api.supabase.com/v1/projects/${project_ref}"
authorization_header="Authorization: Bearer ${access_token}"
project_name="$(curl --fail-with-body --silent --show-error \
  --header "$authorization_header" \
  "$api_url" | jq -r '.name')"

project_name_lower="${project_name,,}"
if [[ "$project_name_lower" != *subtrack* || "$project_name_lower" != *preview* ]]; then
  fail "Refusing to modify a project whose name does not contain both SubTrack and Preview"
fi

if [[ "$restore_email_verification" == "true" ]]; then
  request_body="$(jq -n '{
    mailer_autoconfirm: false,
    mailer_allow_unverified_email_sign_ins: false
  }')"

  curl --fail-with-body --silent --show-error \
    --request PATCH \
    --header "$authorization_header" \
    --header 'Content-Type: application/json' \
    --data "$request_body" \
    "$api_url/config/auth" |
    jq -e '{mailer_autoconfirm, mailer_allow_unverified_email_sign_ins} |
      select(.mailer_autoconfirm == false and .mailer_allow_unverified_email_sign_ins == false)'

  printf 'Email verification is restored for Supabase project %s.\n' "$project_ref"
  exit 0
fi

callback_url="${app_url}/auth/callback"
request_body="$(jq -n \
  --arg app_url "$app_url" \
  --arg callback_url "$callback_url" \
  '{
    site_url: $app_url,
    uri_allow_list: $callback_url,
    disable_signup: false,
    external_email_enabled: true,
    external_anonymous_users_enabled: false,
    security_manual_linking_enabled: false,
    mailer_autoconfirm: true,
    mailer_allow_unverified_email_sign_ins: false,
    password_min_length: 12,
    password_required_characters: "abcdefghijklmnopqrstuvwxyz:ABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789",
    refresh_token_rotation_enabled: true,
    security_refresh_token_reuse_interval: 10,
    security_update_password_require_reauthentication: true
  }')"

curl --fail-with-body --silent --show-error \
  --request PATCH \
  --header "$authorization_header" \
  --header 'Content-Type: application/json' \
  --data "$request_body" \
  "$api_url/config/auth" |
  jq -e \
    --arg app_url "$app_url" \
    --arg callback_url "$callback_url" \
    '{
      site_url,
      uri_allow_list,
      mailer_autoconfirm,
      mailer_allow_unverified_email_sign_ins,
      external_anonymous_users_enabled,
      security_manual_linking_enabled,
      password_min_length,
      refresh_token_rotation_enabled
    } | select(
      .site_url == $app_url and
      .uri_allow_list == $callback_url and
      .mailer_autoconfirm == true and
      .mailer_allow_unverified_email_sign_ins == false and
      .external_anonymous_users_enabled == false and
      .security_manual_linking_enabled == false and
      .password_min_length == 12 and
      .refresh_token_rotation_enabled == true
    )'

printf 'Configured and verified preview Auth for Supabase project %s.\n' "$project_ref"