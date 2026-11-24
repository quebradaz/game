#!/bin/sh
# Testa limite de gasto, idade, histórico e devolução (v29_7_limite_gasto) num Postgres local descartável.
# Não toca no Supabase. Uso: sh tests/integration/limite/run.sh   (como um usuário que pode criar bancos)
set -e
D=$(dirname "$0"); M="$D/../../../supabase/migrations"
dropdb --if-exists qz_limite_test; createdb qz_limite_test
psql -q -v ON_ERROR_STOP=1 -d qz_limite_test -f "$D/../zcoin/mock.sql" -f "$D/mock.sql" \
  -f "$M/v29_zcoin_checkout.sql" -f "$M/v29_5_zcoin_pacotes.sql" -f "$M/v29_7_limite_gasto.sql" -f "$D/test.sql"
# aplicar de novo não pode quebrar nem apagar escolhas
psql -q -v ON_ERROR_STOP=1 -d qz_limite_test -f "$M/v29_7_limite_gasto.sql"
test "$(psql -tAq -d qz_limite_test -c 'select count(*) from public.zc_limits where age is not null')" -ge 1
dropdb qz_limite_test
echo "limite: todos os testes passaram (e a migração reaplica sem perder nada)"
