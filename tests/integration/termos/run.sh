#!/bin/sh
# Testa a v29_10 (aceite dos termos e baú de sorteio só para adulto) num Postgres local descartável. Não toca no Supabase.
# Uso: sh tests/integration/termos/run.sh   (como um usuário que pode criar bancos; PG* no ambiente se precisar)
set -e
D=$(dirname "$0"); R="$D/../../../supabase"
dropdb --if-exists qz_termos_test; createdb qz_termos_test
psql -q -v ON_ERROR_STOP=1 -d qz_termos_test -f "$R/tests/base_stub.sql" -f "$R/migrations/v28_8_moedas_nivel_servidor.sql" \
  -f "$R/migrations/v28_10_baus.sql" -f "$R/migrations/v29_7_baus_5_itens.sql" -f "$D/mock.sql" \
  -f "$R/migrations/v29_10_termos.sql" -f "$D/test.sql"
# aplicar de novo não pode quebrar
psql -q -v ON_ERROR_STOP=1 -d qz_termos_test -f "$R/migrations/v29_10_termos.sql"
dropdb qz_termos_test
echo "termos: todos os testes passaram (e a migração reaplica)"
