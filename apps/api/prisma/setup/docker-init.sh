#!/bin/bash
# runs once, the first time the local docker database starts
# creates the two users, the main database and a separate one for integration tests
set -euo pipefail

SETUP=/setup

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  -v migrator_password="$HH_MIGRATOR_PASSWORD" -v app_password="$HH_APP_PASSWORD" \
  -f "$SETUP/roles.sql"

# the migrator can create databases locally so `prisma migrate dev` can make its scratch copy
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -c "alter role hh_migrator createdb"

for db in hierarchy_hub hierarchy_hub_test; do
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres -c "create database $db owner hh_migrator"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$db" -v DBNAME="$db" -f "$SETUP/database.sql"
done
