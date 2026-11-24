#!/bin/sh
# Testa os baús de Z-Coin (v28_10 + v29_7: 5 itens e lista do dia) num Postgres local descartável. Não toca no Supabase.
# Uso: sh tests/integration/baus/run.sh   (como um usuário que pode criar bancos; PG* no ambiente se precisar)
set -e
D=$(dirname "$0"); R="$D/../../../supabase"
dropdb --if-exists qz_baus_test; createdb qz_baus_test
psql -q -v ON_ERROR_STOP=1 -d qz_baus_test -f "$R/tests/base_stub.sql" -f "$R/migrations/v28_8_moedas_nivel_servidor.sql" \
  -f "$R/migrations/v28_10_baus.sql" -f "$R/migrations/v29_7_baus_5_itens.sql" -f "$R/tests/v29_7_baus_5_itens_test.sql"
dropdb qz_baus_test
echo "baus: todos os testes passaram"
