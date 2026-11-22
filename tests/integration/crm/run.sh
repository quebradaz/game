#!/bin/sh
# Testa o CRM (v29_5_crm) num Postgres local descartável. Não toca no Supabase.
# Uso: sh tests/integration/crm/run.sh   (como um usuário que pode criar bancos)
set -e
D=$(dirname "$0"); M="$D/../../../supabase/migrations"
dropdb --if-exists qz_crm_test; createdb qz_crm_test
psql -q -v ON_ERROR_STOP=1 -d qz_crm_test -f "$D/mock.sql" -f "$M/v29_5_crm.sql" -f "$D/test.sql"
# aplicar duas vezes não pode quebrar nem duplicar leads
psql -q -v ON_ERROR_STOP=1 -d qz_crm_test -f "$M/v29_5_crm.sql"
test "$(psql -tAq -d qz_crm_test -c 'select count(*) from public.crm_leads')" = 3
dropdb qz_crm_test
echo "crm: migração reaplicada sem duplicar"
