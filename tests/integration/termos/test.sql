-- Testes da v29_11 (aceite dos termos e baú de sorteio só para adulto). Cada bloco falha com exceção se der errado.
-- Ordem: base_stub, v28_8_moedas_nivel_servidor, v28_10_baus, v29_7_baus_5_itens, mock.sql, v29_11_termos, este arquivo.
\set ON_ERROR_STOP 1
insert into public.profiles (id) values ('00000000-0000-0000-0000-0000000000a1'), ('00000000-0000-0000-0000-0000000000a2'), ('00000000-0000-0000-0000-0000000000a3');
insert into public.wallets (user_id, zcoin, coins) select id, 50000, 0 from public.profiles;
insert into public.shop_items (item_id, rarity, price_z, kind, active)
  select 'c' || i, 1, null::int, 'box', true from generate_series(1, 8) i
  union all select 'r' || i, 2, null, 'box', true from generate_series(1, 6) i
  union all select 'l' || i, 3, null, 'box', true from generate_series(1, 6) i;
update public.chest_shop set reveal = false;
insert into public.zc_limits values ('00000000-0000-0000-0000-0000000000a1', 'adult'), ('00000000-0000-0000-0000-0000000000a2', 'minor');
create function pg_temp.err(q text) returns text language plpgsql as $$
begin execute q; return 'SEM ERRO'; exception when others then return sqlerrm; end $$;

-- 1. aceite: sem login, versão velha e sem confirmar idade são recusados; o certo grava uma vez só
do $$ declare r jsonb; e text; begin
  perform set_config('test.uid', '', false);
  e := pg_temp.err($q$select public.terms_accept('2026-11-24', true)$q$);
  assert e = 'SEM_LOGIN', 'sem login: ' || e;
  perform set_config('test.uid', '00000000-0000-0000-0000-0000000000a1', false);
  r := public.terms_status();
  assert r->>'version' = '2026-11-24' and (r->>'accepted')::boolean = false, 'status antes ' || r::text;
  e := pg_temp.err($q$select public.terms_accept('2026-11-19', true)$q$);
  assert e = 'TERMOS_DESATUALIZADOS', 'versão velha: ' || e;
  e := pg_temp.err($q$select public.terms_accept('2026-11-24', false)$q$);
  assert e = 'TERMOS_IDADE', 'sem idade ok: ' || e;
  r := public.terms_accept('2026-11-24', true);
  assert (r->>'accepted')::boolean and r->>'accepted_at' is not null, 'aceitou ' || r::text;
  r := public.terms_accept('2026-11-24', true);
  assert (select count(*) from public.terms_accept) = 1, 'aceite duplicado';
  raise notice 'ok: aceite dos termos guardado uma vez, com versão e hora do servidor';
end $$;

-- 2. versão nova pede aceite de novo
do $$ declare r jsonb; begin
  perform set_config('test.uid', '00000000-0000-0000-0000-0000000000a1', false);
  update public.legal_cfg set terms_version = '2027-01-10';
  r := public.terms_status();
  assert (r->>'accepted')::boolean = false, 'versão nova já aceita? ' || r::text;
  update public.legal_cfg set terms_version = '2026-11-24';
  raise notice 'ok: versão nova dos termos volta a pedir aceite';
end $$;

-- 3. baú de sorteio: adulto compra, menor e sem idade são barrados e não perdem Z-Coin
do $$ declare r jsonb; e text; z int; begin
  perform set_config('test.uid', '00000000-0000-0000-0000-0000000000a1', false);
  r := public.buy_chest(2, null);
  assert jsonb_array_length(r->'items') = 5, 'adulto comprou ' || r::text;
  perform set_config('test.uid', '00000000-0000-0000-0000-0000000000a2', false);
  e := pg_temp.err($q$select public.buy_chest(2, null)$q$);
  assert e = 'BAU_SO_ADULTO', 'menor: ' || e;
  perform set_config('test.uid', '00000000-0000-0000-0000-0000000000a3', false);
  e := pg_temp.err($q$select public.buy_chest(3, null)$q$);
  assert e = 'IDADE_PENDENTE_BAU', 'sem idade: ' || e;
  select zcoin into z from public.wallets where user_id = '00000000-0000-0000-0000-0000000000a2';
  assert z = 50000, 'menor perdeu Z-Coin ' || z;
  -- modo de transição (jogo velho no ar): sem idade passa, menor declarado continua barrado
  update public.legal_cfg set chest_need_age = false;
  perform set_config('test.uid', '00000000-0000-0000-0000-0000000000a2', false);
  e := pg_temp.err($q$select public.buy_chest(2, null)$q$);
  assert e = 'BAU_SO_ADULTO', 'menor na transição: ' || e;
  perform set_config('test.uid', '00000000-0000-0000-0000-0000000000a3', false);
  r := public.buy_chest(3, null);
  assert r->>'item' is not null, 'sem idade na transição ' || r::text;
  delete from public.boxes where user_id = '00000000-0000-0000-0000-0000000000a3';
  update public.legal_cfg set chest_need_age = true;
  assert (select count(*) from public.boxes where user_id <> '00000000-0000-0000-0000-0000000000a1') = 0, 'compra barrada ficou gravada';
  raise notice 'ok: baú de sorteio só para adulto; menor e sem idade não perdem nada';
end $$;

-- 4. baú à mostra (sem sorteio) segue liberado para menor; trava desligável
do $$ declare r jsonb; it text; begin
  perform set_config('test.uid', '00000000-0000-0000-0000-0000000000a2', false);
  update public.chest_shop set reveal = true where tier = 2;
  it := (select x->>'item' from jsonb_array_elements(public.get_chest_shop()->'chests') x where (x->>'tier')::int = 2);
  r := public.buy_chest(2, it);
  assert r->>'item' = it, 'menor no baú à mostra ' || r::text;
  update public.chest_shop set reveal = false;
  update public.legal_cfg set chest_minor_block = false;
  r := public.buy_chest(3, null);
  assert r->>'item' is not null, 'trava desligada ' || r::text;
  update public.legal_cfg set chest_minor_block = true;
  raise notice 'ok: baú à mostra liberado para menor; trava desligável pelo legal_cfg';
end $$;

-- 5. excluir a conta apaga os aceites e tira nome e e-mail do CRM (os valores ficam)
do $$ declare l public.crm_leads; begin
  insert into public.crm_leads (user_id, name, email, paid_cents) values ('00000000-0000-0000-0000-0000000000a1', 'Ana', 'ana@exemplo.com', 2000);
  insert into public.crm_events (lead_id, kind, body) select id, 'whatsapp', 'falei com a Ana no 21 9...' from public.crm_leads;
  insert into public.crm_events (lead_id, kind, body) select id, 'pagamento', 'R$ 20,00 pix' from public.crm_leads;
  delete from public.profiles where id = '00000000-0000-0000-0000-0000000000a1';
  assert (select count(*) from public.terms_accept) = 0, 'aceite ficou depois de excluir a conta';
  select * into l from public.crm_leads;
  assert l.user_id is null and l.email is null and l.name = 'Jogador removido' and l.removed_at is not null, 'lead não anonimizou';
  assert l.paid_cents = 2000, 'valor sumiu';
  assert not exists (select 1 from public.crm_events where body like '%Ana%'), 'nota com dado pessoal ficou';
  assert exists (select 1 from public.crm_events where kind = 'pagamento' and body = 'R$ 20,00 pix'), 'evento de pagamento sumiu';
  assert exists (select 1 from public.crm_events where kind = 'remocao'), 'sem registro da remoção';
  raise notice 'ok: excluir a conta apaga o aceite e tira nome, e-mail e notas do CRM; valores ficam';
end $$;
