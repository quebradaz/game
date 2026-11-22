-- Testes da migração v29_1 (Cofre do barraco: regras de desbloqueio no servidor). Ver supabase/tests/README.md.
-- Ordem: base_stub.sql, v28_8_moedas_nivel_servidor.sql, v28_8_niveis.sql, v29_1_cofre.sql, este arquivo.
\set ON_ERROR_STOP 1
insert into public.skill_costs (skill, level, chips) values ('grana', 1, 1), ('grana', 2, 2), ('grana', 3, 3) on conflict do nothing;
insert into public.profiles (id, created_at) values ('00000000-0000-0000-0000-0000000000d1', '2026-11-01'), ('00000000-0000-0000-0000-0000000000d2', '2026-11-01');
insert into public.wallets (user_id, chips, char_level) values ('00000000-0000-0000-0000-0000000000d1', 200, 26), ('00000000-0000-0000-0000-0000000000d2', 0, 1);
insert into public.player_stats (user_id, best_wave) values ('00000000-0000-0000-0000-0000000000d1', 19);
insert into public.progress (user_id, data) values ('00000000-0000-0000-0000-0000000000d2', '{"skills":{"cofre":3,"grana":2}}');

create function pg_temp.err(q text) returns text language plpgsql as $$
begin execute q; return 'OK'; exception when others then return sqlerrm; end $$;

do $$ declare r jsonb;
begin
  perform set_config('test.uid', '00000000-0000-0000-0000-0000000000d1', false);
  -- sem Lábia 3
  assert pg_temp.err('select public.buy_skill(''cofre'')') = 'NIVEL_PERSONAGEM', 'nivel 26 barra';
  update public.wallets set char_level = 27 where user_id = auth.uid();
  assert pg_temp.err('select public.buy_skill(''cofre'')') = 'ONDA_INSUFICIENTE', 'onda 19 barra';
  update public.player_stats set best_wave = 20 where user_id = auth.uid();
  assert pg_temp.err('select public.buy_skill(''cofre'')') = 'REQUISITO', 'sem labia barra';
  perform public.buy_skill('labia'); perform public.buy_skill('labia'); perform public.buy_skill('labia');
  assert (select chips from public.wallets where user_id = auth.uid()) = 200 - 9, 'labia 2+3+4';
  r := public.buy_skill('cofre');
  assert (r->>'level')::int = 1 and (r->>'chips')::int = 191 - 8, 'cofre 1 ' || r::text;
  r := public.buy_skill('cofre'); r := public.buy_skill('cofre');
  assert (r->>'level')::int = 3 and (r->>'chips')::int = 191 - 38, 'cofre 3 ' || r::text;
  assert pg_temp.err('select public.buy_skill(''cofre'')') = 'NIVEL_MAXIMO', 'cofre max';
  -- habilidade sem regra continua igual
  r := public.buy_skill('grana');
  assert (r->>'level')::int = 1, 'grana livre';
  -- save antigo não importa o cofre
  perform set_config('test.uid', '00000000-0000-0000-0000-0000000000d2', false);
  r := public.import_skills();
  assert r = '{"grana":2}'::jsonb, 'import sem cofre ' || r::text;
  raise notice 'TUDO OK';
end $$;
