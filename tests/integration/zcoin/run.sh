#!/bin/sh
# Testa a compra de Z-Coin (v29_zcoin_checkout) num Postgres local descartável. Não toca no Supabase.
# Uso: sh tests/integration/zcoin/run.sh   (como um usuário que pode criar bancos)
set -e
D=$(dirname "$0"); M="$D/../../../supabase/migrations"
dropdb --if-exists qz_zcoin_test; createdb qz_zcoin_test
psql -q -v ON_ERROR_STOP=1 -d qz_zcoin_test -f "$D/mock.sql" -f "$M/v29_zcoin_checkout.sql" -f "$D/test.sql"
dropdb qz_zcoin_test
echo "zcoin: todos os testes passaram"
