#!/usr/bin/env bash
# Applies the migration to a fresh database and runs the RLS tests.
# Usage: PGHOST=... PGPORT=... PGUSER=postgres tests/sql/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB=ops_sql_test
psql -q -c "drop database if exists $DB" -c "create database $DB"
psql -q -d $DB -v ON_ERROR_STOP=1 -f tests/sql/supabase_stub.sql
psql -q -d $DB -v ON_ERROR_STOP=1 -f supabase/migrations/20261108000000_ops_core.sql
# The migration must be safe to run twice.
psql -q -d $DB -v ON_ERROR_STOP=1 -f supabase/migrations/20261108000000_ops_core.sql
psql -q -d $DB -v ON_ERROR_STOP=1 -f tests/sql/rls_test.sql
