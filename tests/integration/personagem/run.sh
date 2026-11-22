#!/bin/sh
# Testa a migração do personagem num Postgres local descartável (não toca no Supabase).
# Uso: PGHOST=... PGPORT=... PGUSER=postgres sh tests/integration/personagem/run.sh
set -e
D=$(dirname "$0"); M="$D/../../../supabase/migrations"
dropdb --if-exists qz_personagem_test; createdb qz_personagem_test
psql -q -v ON_ERROR_STOP=1 -d qz_personagem_test -f "$D/../amigos/mock_supabase.sql" \
  -c "revoke update on public.profiles from anon, authenticated; insert into auth.users (id) values ('00000000-0000-0000-0000-000000000001'); insert into public.profiles (id) values ('00000000-0000-0000-0000-000000000001');" \
  -f "$M/v29_0_personagem.sql" -f "$D/test_personagem.sql"
