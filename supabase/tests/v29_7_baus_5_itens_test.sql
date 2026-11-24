-- Testes da migração v29_7 (baús com 5 itens e lista do dia). Ver supabase/tests/README.md.
-- Ordem: base_stub.sql, v28_8_moedas_nivel_servidor.sql, v28_10_baus.sql, v29_7_baus_5_itens.sql, este arquivo.
\set ON_ERROR_STOP 1
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000e1'), ('00000000-0000-0000-0000-0000000000e2');
insert into public.wallets (user_id, zcoin, coins) values ('00000000-0000-0000-0000-0000000000e1', 50000, 0), ('00000000-0000-0000-0000-0000000000e2', 50000, 0);
-- 8 comuns, 6 raras, 6 lendárias de baú + uma da loja e uma desligada (nunca entram na lista)
insert into public.shop_items (item_id, rarity, price_z, kind, active)
  select 'c' || i, 1, null::int, 'box', true from generate_series(1, 8) i
  union all select 'r' || i, 2, null, 'box', true from generate_series(1, 6) i
  union all select 'l' || i, 3, null, 'box', true from generate_series(1, 6) i
  union all select 'loja_l', 3, 900, 'item', true
  union all select 'l_off', 3, null, 'box', false;
-- listas pequenas para o teste: lendário 2 lendárias, 3 raras, 5 comuns; raro 3 raras, 5 comuns
update public.chest_pool set size = case rarity when 3 then 2 when 2 then 3 else 5 end;
-- dia controlado pelo teste
create or replace function public.chest_today() returns date language sql stable set search_path to '' as $f$
  select coalesce(nullif(current_setting('test.day', true), ''), '2026-11-24')::date;
$f$;

do $$ declare s jsonb; r jsonb; p jsonb; e text; z0 int; c0 int; ids text[]; ids2 text[]; it jsonb; n int;
begin
  perform set_config('test.uid', '00000000-0000-0000-0000-0000000000e1', false);
  assert (select reveal from public.chest_shop where tier = 3) = false, 'modo sorteio ligado pela migração';

  -- vitrine: lista do dia com o tamanho certo por raridade, sem item da loja nem desligado
  s := public.get_chest_shop();
  p := s->'chests'->1->'pool';
  assert jsonb_array_length(p) = 10, 'lista lendario 2+3+5 ' || p::text;
  assert (select count(*) from jsonb_array_elements(p) x where (x->>'r')::int = 3) = 2, 'duas lendarias';
  assert (select count(*) from jsonb_array_elements(p) x where (x->>'r')::int = 1) = 5, 'cinco comuns';
  assert not exists (select 1 from jsonb_array_elements(p) x where x->>'id' in ('loja_l', 'l_off')), 'sem loja/desligado';
  assert jsonb_array_length(s->'chests'->0->'pool') = 8, 'lista raro 3+5';
  assert s->'chests'->1->'extras' = '[2,1,1,1]'::jsonb and s->'chests'->0->'extras' = '[1,1,1,1]'::jsonb, 'posicoes extras';
  assert (s->'dupe'->>'1')::int = 150 and (s->'dupe'->>'2')::int = 400, 'moedas por repetido';
  assert (s->>'next')::timestamptz = '2026-11-25 00:00:00-03'::timestamptz, 'troca a meia-noite de Brasilia ' || (s->>'next');
  assert s->'chests'->1->>'item' is null, 'sorteio nao mostra item escolhido';
  -- mesma lista para outro jogador no mesmo dia
  perform set_config('test.uid', '00000000-0000-0000-0000-0000000000e2', false);
  assert (select array_agg(x->>'id' order by x->>'id') from jsonb_array_elements(public.get_chest_shop()->'chests'->1->'pool') x)
       = (select array_agg(x->>'id' order by x->>'id') from jsonb_array_elements(p) x), 'lista igual para todos';
  perform set_config('test.uid', '00000000-0000-0000-0000-0000000000e1', false);

  -- compra lendária: 5 itens = 1 lendária + 1 rara + 3 comuns, todos da lista de hoje, sem repetir no baú
  z0 := (select zcoin from public.wallets where user_id = auth.uid());
  r := public.buy_chest(3);
  assert jsonb_array_length(r->'items') = 5, 'cinco itens ' || r::text;
  assert (r->'items'->0->>'r')::int = 3 and r->'items'->0->>'item' = r->>'item', 'primeiro e a lendaria garantida';
  assert (r->'items'->1->>'r')::int = 2, 'segundo e raro';
  assert (select count(*) from jsonb_array_elements(r->'items') x where (x->>'r')::int = 1) = 3, 'tres comuns';
  assert (select count(distinct x->>'item') from jsonb_array_elements(r->'items') x) = 5, 'sem repetir dentro do bau';
  assert not exists (select 1 from jsonb_array_elements(r->'items') x
                     where not exists (select 1 from jsonb_array_elements(p) y where y->>'id' = x->>'item')), 'tudo da lista do dia';
  assert (r->>'zcoin')::int = z0 - 600, 'cobrou 600';
  assert (select count(*) from public.items_owned o where o.user_id = auth.uid()
          and o.item_id in (select x->>'item' from jsonb_array_elements(r->'items') x)) = 5, 'cinco entregues';
  assert (r->>'coins')::int = 0, 'nada repetido na primeira';
  assert (select jsonb_array_length(extras) from public.boxes where id = (r->>'box')::bigint) = 5, 'boxes guarda os 5';

  -- repetidos viram moedas: o jogador ganha todas as comuns e raras de hoje antes de comprar o baú raro
  insert into public.items_owned (user_id, item_id, source, created_at)
    select auth.uid(), x->>'id', 'teste', now() from jsonb_array_elements(p) x where (x->>'r')::int = 1
    on conflict do nothing;
  insert into public.items_owned (user_id, item_id, source, created_at)
    select auth.uid(), x->>'id', 'teste', now() from jsonb_array_elements(public.get_chest_shop()->'chests'->0->'pool') x where (x->>'r')::int = 1
    on conflict do nothing;
  c0 := (select coins from public.wallets where user_id = auth.uid());
  r := public.buy_chest(2);
  assert jsonb_array_length(r->'items') = 5, 'raro cinco ' || r::text;
  assert (r->'items'->0->>'r')::int = 2 and (r->'items'->0->>'dupe')::boolean = false, 'rara garantida nova';
  assert (select count(*) from jsonb_array_elements(r->'items') x where (x->>'dupe')::boolean and (x->>'coins')::int = 150) = 4, '4 comuns repetidas = 150 cada';
  assert (r->>'coins')::int = 600 and (select coins from public.wallets where user_id = auth.uid()) = c0 + 600, 'moedas creditadas';
  assert exists (select 1 from public.ledger where user_id = auth.uid() and currency = 'coin' and delta = 600), 'ledger das moedas';

  -- garantido nunca repete: quando já tem todas as lendárias de hoje, recusa sem cobrar
  insert into public.items_owned (user_id, item_id, source, created_at)
    select auth.uid(), x->>'id', 'teste', now() from jsonb_array_elements(p) x where (x->>'r')::int = 3 on conflict do nothing;
  assert (public.get_chest_shop()->'chests'->1->>'left')::int = 0, 'left zero';
  z0 := (select zcoin from public.wallets where user_id = auth.uid());
  begin perform public.buy_chest(3); e := 'ok'; exception when others then e := sqlerrm; end;
  assert e = 'TUDO_COLETADO', 'acabou hoje: ' || e;
  assert (select zcoin from public.wallets where user_id = auth.uid()) = z0, 'nao cobrou';

  -- no dia seguinte a lista roda e volta a ter lendária nova
  ids := (select array_agg(x->>'id' order by x->>'id') from jsonb_array_elements(p) x);
  n := 0;
  for i in 1..5 loop
    perform set_config('test.day', ('2026-11-24'::date + i)::text, false);
    ids2 := (select array_agg(x->>'id' order by x->>'id') from jsonb_array_elements(public.get_chest_shop()->'chests'->1->'pool') x);
    if ids2 is distinct from ids then n := n + 1; end if;
  end loop;
  assert n >= 4, 'lista troca de um dia para o outro (' || n || '/5)';
  perform set_config('test.day', '2026-11-26', false);
  if (public.get_chest_shop()->'chests'->1->>'left')::int > 0 then
    r := public.buy_chest(3);
    assert (r->'items'->0->>'dupe')::boolean = false, 'lendaria nova no outro dia';
  end if;

  -- modo à mostra (chave de volta): os 5 itens aparecem antes e a compra entrega exatamente eles
  update public.chest_shop set reveal = true where tier = 2;
  perform set_config('test.day', '2026-11-28', false);
  perform set_config('test.uid', '00000000-0000-0000-0000-0000000000e2', false);
  s := public.get_chest_shop();
  assert s->'chests'->0->>'item' is not null and jsonb_array_length(s->'chests'->0->'offer') = 4, 'oferta com 4 extras ' || s::text;
  assert public.get_chest_shop()->'chests'->0->'offer' = s->'chests'->0->'offer', 'oferta fica igual';
  begin perform public.buy_chest(2, 'r_errado'); e := 'ok'; exception when others then e := sqlerrm; end;
  assert e = 'OFERTA_MUDOU', 'item errado: ' || e;
  r := public.buy_chest(2, s->'chests'->0->>'item');
  assert (select array_agg(x->>'item') from jsonb_array_elements(r->'items') x)
       = array[s->'chests'->0->>'item'] || (select array_agg(v) from jsonb_array_elements_text(s->'chests'->0->'offer') v), 'veio a oferta ' || r::text;

  -- limite por dia continua valendo
  -- (a compra acima tem created_at = agora, então volta o dia para hoje de verdade)
  perform set_config('test.day', ((now() at time zone 'America/Sao_Paulo')::date)::text, false);
  update public.chest_shop set daily_limit = 1 where tier = 2;
  s := public.get_chest_shop();
  begin perform public.buy_chest(2, s->'chests'->0->>'item'); e := 'ok'; exception when others then e := sqlerrm; end;
  assert e = 'LIMITE_BAU_DIA', 'limite: ' || e;
  raise notice 'TUDO OK';
end $$;

do $$ begin
  assert not has_function_privilege('authenticated', 'public.chest_pool_today(int, int)', 'execute'), 'pool fechada';
  assert not has_function_privilege('authenticated', 'public.chest_pick_extras(int, text)', 'execute'), 'extras fechada';
  assert has_function_privilege('authenticated', 'public.buy_chest(int, text)', 'execute'), 'buy_chest aberta';
  assert not has_function_privilege('anon', 'public.get_chest_shop()', 'execute'), 'anon sem vitrine';
end $$;
