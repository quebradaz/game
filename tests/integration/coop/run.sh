#!/bin/sh
# Testa o co-op online (v29_11_coop_online): presença, perfil, sala, convite, sinais. Postgres local descartável.
# Não toca no Supabase. Uso: sh tests/integration/coop/run.sh   (como um usuário que pode criar bancos)
set -e
D=$(dirname "$0"); M="$D/../../../supabase/migrations"
dropdb --if-exists qz_coop_test; psql -q -d postgres -c "drop role if exists anon; drop role if exists authenticated; drop role if exists service_role" 2>/dev/null || true
createdb qz_coop_test
psql -q -v ON_ERROR_STOP=1 -d qz_coop_test -f "$D/../amigos/mock_supabase.sql" -f "$D/mock.sql" \
  -f "$M/v28_8_amigos.sql" -f "$M/v29_11_coop_online.sql" -f "$D/test.sql"
# aplicar de novo não pode quebrar
psql -q -v ON_ERROR_STOP=1 -d qz_coop_test -f "$M/v29_11_coop_online.sql"
dropdb qz_coop_test
echo "coop: todos os testes passaram (e a migração reaplica)"
