-- Testes da migração v28_10 (baús vendidos por Z-Coin). Ver supabase/tests/README.md.
-- Ordem: base_stub.sql, v28_8_moedas_nivel_servidor.sql, v28_10_baus.sql, este arquivo.
\set ON_ERROR_STOP 1
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000d1'), ('00000000-0000-0000-0000-0000000000d2');
insert into public.wallets (user_id, zcoin) values ('00000000-0000-0000-0000-0000000000d1', 5000), ('00000000-0000-0000-0000-0000000000d2', 100);
-- 3 roupas de baú por raridade + uma da loja (que nunca pode sair do baú)
insert into public.shop_items (item_id, rarity, price_z, kind, active) values
  ('c1', 1, null, 'box', true), ('r1', 2, null, 'box', true), ('r2', 2, null, 'box', true), ('r3', 2, null, 'box', true),
  ('l1', 3, null, 'box', true), ('l2', 3, null, 'box', true), ('l3', 3, null, 'box', true),
  ('loja_l', 3, 900, 'item', true), ('l_off', 3, null, 'box', false);

do $$ declare r jsonb; s jsonb; it text; e text; z0 int;
begin
  perform set_config('test.uid', '00000000-0000-0000-0000-0000000000d1', false);

  -- vitrine: dois baús, oferta do dia já escolhida, sempre da raridade certa
  s := public.get_chest_shop();
  assert jsonb_array_length(s->'chests') = 2, 'dois baus ' || s::text;
  assert (s->'chests'->0->>'item') in ('r1','r2','r3'), 'oferta rara ' || s::text;
  assert (s->'chests'->1->>'item') in ('l1','l2','l3'), 'oferta lendaria ' || s::text;
  assert (s->'chests'->1->>'left')::int = 3 and (s->'chests'->1->>'total')::int = 3, 'contagem ignora loja e inativos';
  assert public.get_chest_shop()->'chests'->1->>'item' = s->'chests'->1->>'item', 'oferta fica igual no mesmo dia';

  -- reveal: comprar sem dizer o item ou com item errado não cobra nada
  z0 := (select zcoin from public.wallets where user_id = auth.uid());
  begin perform public.buy_chest(3, null); e := 'ok'; exception when others then e := sqlerrm; end;
  assert e = 'OFERTA_MUDOU', 'sem item: ' || e;
  begin perform public.buy_chest(3, 'loja_l'); e := 'ok'; exception when others then e := sqlerrm; end;
  assert e = 'OFERTA_MUDOU', 'item errado: ' || e;
  assert (select zcoin from public.wallets where user_id = auth.uid()) = z0, 'nada cobrado';

  -- compra lendária: vem exatamente a oferta, cobra 600, grava no ledger e em boxes
  it := s->'chests'->1->>'item';
  r := public.buy_chest(3, it);
  assert r->>'item' = it and (r->>'tier')::int = 3, 'veio a oferta ' || r::text;
  assert (r->>'zcoin')::int = z0 - 600, 'cobrou 600 ' || r::text;
  assert exists (select 1 from public.items_owned where user_id = auth.uid() and item_id = it), 'roupa entregue';
  assert exists (select 1 from public.ledger where user_id = auth.uid() and currency = 'zcoin' and delta = -600), 'ledger';
  assert exists (select 1 from public.boxes where user_id = auth.uid() and source = 'loja' and tier = 3 and prize_item = it and opened_at is not null), 'boxes';
  -- a oferta seguinte é outra lendária que ele não tem
  s := public.get_chest_shop();
  assert (s->'chests'->1->>'item') in ('l1','l2','l3') and s->'chests'->1->>'item' <> it, 'nova oferta ' || s::text;
  assert (s->'chests'->1->>'today')::int = 1, 'conta compra de hoje';

  -- limite por dia (lendário: 2)
  r := public.buy_chest(3, s->'chests'->1->>'item');
  s := public.get_chest_shop();
  begin perform public.buy_chest(3, s->'chests'->1->>'item'); e := 'ok'; exception when others then e := sqlerrm; end;
  assert e = 'LIMITE_BAU_DIA', 'limite: ' || e;

  -- modo sorteio: sempre rara, nunca repetida; quando acabam, recusa sem cobrar
  update public.chest_shop set reveal = false, daily_limit = 10 where tier = 2;
  for i in 1..3 loop
    r := public.buy_chest(2);
    assert r->>'item' in ('r1','r2','r3'), 'sorteio raro ' || r::text;
  end loop;
  assert (select count(*) from public.items_owned where user_id = auth.uid() and item_id in ('r1','r2','r3')) = 3, 'sem repetir';
  z0 := (select zcoin from public.wallets where user_id = auth.uid());
  begin perform public.buy_chest(2); e := 'ok'; exception when others then e := sqlerrm; end;
  assert e = 'TUDO_COLETADO', 'acabou: ' || e;
  assert (select zcoin from public.wallets where user_id = auth.uid()) = z0, 'acabou e nao cobrou';
  assert (public.get_chest_shop()->'chests'->0->>'left')::int = 0, 'left zero';

  -- sem Z-Coin suficiente
  perform set_config('test.uid', '00000000-0000-0000-0000-0000000000d2', false);
  begin perform public.buy_chest(2); e := 'ok'; exception when others then e := sqlerrm; end;
  assert e = 'ZCOIN_INSUFICIENTE', 'pobre: ' || e;
  assert not exists (select 1 from public.items_owned where user_id = auth.uid()), 'pobre sem roupa';

  -- oferta de ontem é trocada
  s := public.get_chest_shop();
  update public.chest_offers set day = day - 1, item_id = 'l1' where user_id = auth.uid() and tier = 3;
  insert into public.items_owned values (auth.uid(), 'l1', 'teste', now());
  assert public.get_chest_shop()->'chests'->1->>'item' in ('l2','l3'), 'troca oferta velha ou ja possuida';

  -- baú desligado e sem login
  update public.chest_shop set active = false where tier = 3;
  begin perform public.buy_chest(3, 'l2'); e := 'ok'; exception when others then e := sqlerrm; end;
  assert e = 'BAU_INVALIDO', 'desligado: ' || e;
  perform set_config('test.uid', '', false);
  begin perform public.get_chest_shop(); e := 'ok'; exception when others then e := sqlerrm; end;
  assert e = 'SEM_LOGIN', 'login: ' || e;
  raise notice 'TUDO OK';
end $$;

-- o jogo (authenticated) não chama as funções internas
do $$ begin
  assert not has_function_privilege('authenticated', 'public.chest_pick(uuid, int)', 'execute'), 'chest_pick fechada';
  assert not has_function_privilege('authenticated', 'public.chest_offer(uuid, int)', 'execute'), 'chest_offer fechada';
  assert has_function_privilege('authenticated', 'public.buy_chest(int, text)', 'execute'), 'buy_chest aberta';
  assert not has_function_privilege('anon', 'public.buy_chest(int, text)', 'execute'), 'anon sem buy_chest';
end $$;
