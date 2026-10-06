#!/bin/sh
set -eu

DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-hierarchy_hub}"
PATH="/repo/apps/api/node_modules/.bin:$PATH"

url() {
  printf 'postgresql://%s:%s@%s:%s/%s' "$1" "$2" "$DB_HOST" "$DB_PORT" "$DB_NAME"
}

export DATABASE_URL="$(url hh_app "$APP_DB_PASSWORD")"
if [ -n "${MIGRATOR_DB_PASSWORD:-}" ]; then
  export MIGRATOR_DATABASE_URL="$(url hh_migrator "$MIGRATOR_DB_PASSWORD")?sslmode=require"
fi

admin() {
  PGHOST="$DB_HOST" PGPORT="$DB_PORT" PGUSER="$MASTER_DB_USER" PGPASSWORD="$MASTER_DB_PASSWORD" \
    PGSSLMODE=verify-full PGSSLROOTCERT="$DATABASE_SSL_CA_FILE" \
    psql -v ON_ERROR_STOP=1 "$@"
}

case "${1:-api}" in
  api)
    exec node dist/main.js
    ;;
  setup)
    admin -d postgres \
      -v migrator_password="$MIGRATOR_DB_PASSWORD" \
      -v app_password="$APP_DB_PASSWORD" \
      -f prisma/setup/roles.sql
    admin -d postgres -c "grant hh_migrator to current_user"
    if ! admin -d postgres -tAc "select 1 from pg_database where datname = '$DB_NAME'" | grep -q 1; then
      admin -d postgres -c "create database $DB_NAME owner hh_migrator"
    fi
    admin -d "$DB_NAME" -v DBNAME="$DB_NAME" -f prisma/setup/database.sql
    echo "database ready"
    ;;
  migrate)
    exec node scripts/prisma-as.mjs migrator migrate deploy
    ;;
  load-sample)
    exec tsx scripts/load-live.ts
    ;;
  *)
    echo "unknown command: $1 (use api, setup, migrate or load-sample)" >&2
    exit 1
    ;;
esac
