# Testes das migrações (Postgres local)

Roda a migração num banco vazio que imita o de produção e confere as regras com `assert`.

```sh
# Postgres 16 local na porta 55432
createdb -h <socket> -p 55432 -U postgres qz
psql ... -d qz -f supabase/tests/base_stub.sql
psql ... -d qz -f supabase/migrations/v28_8_moedas_nivel_servidor.sql
psql ... -d qz -f supabase/migrations/v28_8b_curva_nivel.sql
psql ... -d qz -f supabase/migrations/v28_8c_moedas_de_nivel.sql
psql ... -d qz -f supabase/tests/v28_8_moedas_nivel_test.sql   # termina com NOTICE: TUDO OK
```

`base_stub.sql` é uma cópia simplificada do esquema de produção em 2026-11-21 (sem RLS, sem dados).
