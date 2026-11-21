#!/bin/sh
# Roda os testes da área de amigos num Postgres local descartável (não toca no Supabase).
# Uso: PGHOST=... PGPORT=... PGUSER=postgres sh tests/integration/amigos/run.sh
set -e
D=$(dirname "$0"); M="$D/../../../supabase/migrations"
dropdb --if-exists qz_amigos_test; createdb qz_amigos_test
psql -q -v ON_ERROR_STOP=1 -d qz_amigos_test -f "$D/mock_supabase.sql" -f "$M/v28_8_amigos.sql" -f "$D/test_amigos.sql"
