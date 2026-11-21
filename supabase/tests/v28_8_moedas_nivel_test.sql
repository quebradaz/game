-- Testes da migração v28_8 (moedas, nível e XP no servidor). Ver supabase/tests/README.md.
\set ON_ERROR_STOP 1
insert into public.profiles (id) values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'), ('00000000-0000-0000-0000-00000000000c');
insert into public.progress (user_id, data) values ('00000000-0000-0000-0000-00000000000c', '{"coins":300,"level":2,"xp":300}');
insert into public.player_stats (user_id, matches) values ('00000000-0000-0000-0000-00000000000c', 0);
insert into public.wallets (user_id) values ('00000000-0000-0000-0000-00000000000c');
insert into public.progress (user_id, data) values
 ('00000000-0000-0000-0000-00000000000a', '{"coins":5000,"level":3,"xp":100,"inv":["bone_preto","oculos_escuro"]}'),
 ('00000000-0000-0000-0000-00000000000b', '{"coins":999999999,"level":99,"xp":5}');
insert into public.player_stats (user_id, matches) values ('00000000-0000-0000-0000-00000000000a', 2), ('00000000-0000-0000-0000-00000000000b', 0);
insert into public.wallets (user_id) values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');

do $$ declare r jsonb; r2 jsonb; rid bigint; e text;
begin
  -- importação
  perform set_config('test.uid', '00000000-0000-0000-0000-00000000000a', false);
  r := public.import_meta();
  assert (r->>'coins')::int = 5000, 'import coins ' || r::text;
  assert (r->>'level')::int = 3 and (r->>'xp')::int = 100, 'import level ' || r::text;
  assert exists (select 1 from public.items_owned where user_id = auth.uid() and item_id = 'bone_preto'), 'inv importado';
  assert not exists (select 1 from public.items_owned where user_id = auth.uid() and item_id = 'oculos_escuro'), 'gratis nao importa';
  update public.progress set data = '{"coins":99999}' where user_id = auth.uid();
  r := public.import_meta();
  assert (r->>'coins')::int = 5000, 'import so uma vez ' || r::text;
  -- usuário C: servidor pagou uma partida antes de importar; save local já inclui essa partida
  perform set_config('test.uid', '00000000-0000-0000-0000-00000000000c', false);
  rid := public.start_run('lapa');
  update public.runs set started_at = now() - interval '10 minutes' where id = rid;
  r := public.submit_run(rid, 10, 100, 590, 300, 200, 1, false, 20, false);
  r := public.import_meta();
  assert (r->>'coins')::int = 300 and (r->>'level')::int = 2, 'sem dobrar ' || r::text;
  raise notice 'C importou: %', r;
  -- trapaça: teto
  perform set_config('test.uid', '00000000-0000-0000-0000-00000000000b', false);
  r := public.import_meta();
  assert (r->>'coins')::int = 5000, 'teto moedas ' || r::text;
  assert (r->>'level')::int <= 13, 'teto nivel ' || r::text;
  raise notice 'trapaceiro importou: %', r;
  -- partida aceita
  perform set_config('test.uid', '00000000-0000-0000-0000-00000000000a', false);
  rid := public.start_run('lapa');
  update public.runs set started_at = now() - interval '10 minutes' where id = rid;
  r := public.submit_run(rid, 10, 100, 590, 300, 200, 1, false, 20, false);
  assert (r->>'ok')::boolean and (r->>'coins')::int = 100 and (r->>'char_xp')::int = 650, 'run ' || r::text;
  assert (r->>'wallet_coins')::int = 5100, 'saldo ' || r::text;
  raise notice 'run: %', r;
  assert (select count(*) from public.ledger where run_id = rid and currency = 'coin' and delta = 100) = 1, 'ledger run';
  -- partida recusada (rápida demais): nada
  rid := public.start_run('lapa');
  r := public.submit_run(rid, 10, 100, 5, 300, 200, 1, false, 20, false);
  assert not (r->>'ok')::boolean, 'recusada ' || r::text;
  assert (select coins from public.wallets where user_id = auth.uid()) = 5100, 'recusada nao paga';
  -- vitória: +400 / +250
  rid := public.start_run('lapa');
  update public.runs set started_at = now() - interval '20 minutes' where id = rid;
  r := public.submit_run(rid, 20, 500, 1190, 900, 700, 3, true, 50, true);
  assert (r->>'coins')::int = 120 + 200 + 400 and (r->>'char_xp')::int = 900 + 1000 + 250, 'vitoria ' || r::text;
  raise notice 'vitoria: %', r;
  -- loja
  r := public.buy_look('bone_vermelho');
  assert (r->>'coins')::int = 5820 - 150, 'buy_look ' || r::text;
  begin perform public.buy_look('bone_vermelho'); raise exception 'deveria falhar'; exception when others then e := sqlerrm; end;
  assert e = 'JA_TEM', e;
  begin perform public.buy_look('nao_existe'); exception when others then e := sqlerrm; end;
  assert e = 'ITEM_INVALIDO', e;
  r := public.buy_kit('kit_carioca');
  raise notice 'kit: %', r;
  begin perform public.buy_kit('kit_carioca'); exception when others then e := sqlerrm; end;
  assert e = 'JA_TEM', e;
  -- sem saldo
  perform set_config('test.uid', '00000000-0000-0000-0000-00000000000b', false);
  update public.wallets set coins = 10 where user_id = auth.uid();
  begin perform public.buy_look('bone_vermelho'); exception when others then e := sqlerrm; end;
  assert e = 'MOEDAS_INSUFICIENTES', e;
  -- missão e prêmio
  perform set_config('test.uid', '00000000-0000-0000-0000-00000000000a', false);
  r := public.get_economy();
  assert (r->'wallet'->>'coins')::int > 0 and r->'wallet' ? 'level', 'eco ' || (r->'wallet')::text;
  update public.mission_progress set progress = 999 where user_id = auth.uid();
  r2 := public.claim_mission(1);
  raise notice 'missao: %', r2;
  assert (r2->>'wallet_coins')::int = (select coins from public.wallets where user_id = auth.uid()), 'missao saldo';
  r := public.grant_prize(auth.uid(), 'coins', 300, null, 'teste');
  assert exists (select 1 from public.ledger where reason = 'teste' and currency = 'coin' and delta = 300), 'grant coins';
  -- nível: confere com a fórmula do jogo
  assert public.lvl_need(1) = 300 and public.lvl_need(2) = 370 and public.lvl_need(5) = 660, 'lvl_need ' || public.lvl_need(5);
  raise notice 'TUDO OK';
end $$;
-- permissões
select has_function_privilege('authenticated', 'public.wallet_add(uuid,text,integer,text,text,bigint)', 'execute') wallet_add,
       has_function_privilege('authenticated', 'public.char_xp_add(uuid,integer)', 'execute') char_xp_add,
       has_function_privilege('authenticated', 'public.buy_look(text)', 'execute') buy_look,
       has_function_privilege('anon', 'public.import_meta()', 'execute') anon_import;
