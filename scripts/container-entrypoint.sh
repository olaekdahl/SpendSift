#!/bin/sh

set -eu

deployment_stage="${DEPLOYMENT_STAGE:-local}"
allow_unverified_email="${ALLOW_UNVERIFIED_EMAIL:-false}"

case "$deployment_stage" in
  local | preview | production) ;;
  *)
    echo "Deployment environment configuration is invalid" >&2
    exit 1
    ;;
esac

case "$allow_unverified_email" in
  true | false) ;;
  *)
    echo "Deployment environment configuration is invalid" >&2
    exit 1
    ;;
esac

if [ "$deployment_stage" = "production" ] && [ "$allow_unverified_email" = "true" ]; then
  echo "Unsafe deployment configuration: production cannot allow unverified email" >&2
  exit 1
fi

exec node server.js