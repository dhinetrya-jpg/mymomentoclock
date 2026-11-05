#!/bin/sh
# Explicit operator action only. No DSN/password on argv or output; libpq service file is a secret.
set -eu
[ "${PAYMENT_MIGRATION_APPROVED:-}" = operator-reviewed ] || { echo 'Migration requires operator-reviewed approval and backup/restore preflight' >&2;exit 1; }
[ -n "${PGSERVICEFILE:-}" ] && [ -r "$PGSERVICEFILE" ] || { echo 'Supply a secret PGSERVICEFILE with [payment] entry' >&2;exit 1; }
root=${PAYMENT_MIGRATION_ROOT:-/migrations}
psql 'service=payment sslmode=verify-full connect_timeout=5' -X -v ON_ERROR_STOP=1 --single-transaction -f "$root/001_secure_payments.sql"
psql 'service=payment sslmode=verify-full connect_timeout=5' -X -v ON_ERROR_STOP=1 -f "$root/003_payment_application.sql"
psql 'service=payment sslmode=verify-full connect_timeout=5' -X -v ON_ERROR_STOP=1 -f "$root/005_provider_sandbox.sql"
if [ "${PAYMENT_VALIDATE_EXISTING:-}" = reviewed ]; then
 psql 'service=payment sslmode=verify-full connect_timeout=5' -X -v ON_ERROR_STOP=1 -f "$root/004_payment_validate.sql"
fi
# Migration 002 touches unrelated legacy tables and is a separate reviewed maintenance action.
