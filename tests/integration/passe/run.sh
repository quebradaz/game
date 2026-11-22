#!/bin/sh
# Roda os testes do passe v29 num Postgres local descartável (não toca no Supabase).
# Uso: PGHOST=... PGPORT=... PGUSER=postgres sh tests/integration/passe/run.sh
set -e
D=$(dirname "$0"); M="$D/../../../supabase/migrations"
dropdb --if-exists qz_passe_test; createdb qz_passe_test
psql -q -v ON_ERROR_STOP=1 -d qz_passe_test -f "$D/mock.sql" -f "$M/v29_passe_dificil.sql" -f "$D/test.sql"
