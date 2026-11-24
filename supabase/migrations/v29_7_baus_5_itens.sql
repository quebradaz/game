-- v29.7: baús de Z-Coin entregam 5 itens, e a lista do que pode vir roda todo dia.
--   Baú raro (tier 2):          1 rara que você não tem + 4 comuns.
--   Baú lendário de ouro (3):   1 lendária que você não tem + 1 rara + 3 comuns.
-- Os extras (comuns e a rara do lendário) podem ser itens que o jogador já tem: aí viram moedas do jogo
-- (valor em chest_dupe). Um mesmo baú nunca traz o mesmo item duas vezes.
--
-- Lista do dia: cada baú tem uma lista de itens por raridade (tamanho em chest_pool), igual para todos os
-- jogadores, que troca à meia-noite de Brasília. Ela sai de um embaralhamento fixo por dia
-- (md5 do dia + baú + item), então não precisa de tarefa agendada e todo mundo vê a mesma lista.
-- O jogo mostra a lista inteira e a chance de cada item ANTES da compra.
--
-- Modo (chest_shop.reveal, trocável no SQL Editor sem atualizar o jogo):
--   reveal = false : os 5 itens são sorteados da lista do dia na hora da compra (escolha do dono em 24/11/2026).
--                    Atenção: é caixa de recompensa paga para o ECA Digital (Lei 15.211/2025), mesmo com a
--                    lista e as chances à mostra.
--   reveal = true  : os 5 itens do baú ficam à mostra antes de pagar (oferta por jogador, troca todo dia e
--                    depois de cada compra). Sem sorteio pago. Para voltar: update public.chest_shop set reveal = true;
-- Depende de v28_10_baus.sql.

-- quantos itens de cada raridade entram na lista do dia de cada baú
create table if not exists public.chest_pool (
  tier int not null references public.chest_shop(tier),
  rarity int not null check (rarity between 1 and 3),
  size int not null check (size > 0),
  primary key (tier, rarity)
);
alter table public.chest_pool enable row level security;
insert into public.chest_pool (tier, rarity, size) values
  (2, 2, 10), (2, 1, 12),
  (3, 3, 8), (3, 2, 10), (3, 1, 12)
on conflict (tier, rarity) do nothing;

-- raridade de cada item extra do baú (além do garantido, que é da raridade do próprio baú)
alter table public.chest_shop add column if not exists extras int[] not null default '{}';
update public.chest_shop set extras = '{1,1,1,1}' where tier = 2 and extras = '{}';
update public.chest_shop set extras = '{2,1,1,1}' where tier = 3 and extras = '{}';

-- moedas do jogo por item repetido, por raridade
create table if not exists public.chest_dupe (
  rarity int primary key check (rarity between 1 and 3),
  coins int not null check (coins >= 0)
);
alter table public.chest_dupe enable row level security;
insert into public.chest_dupe (rarity, coins) values (1, 150), (2, 400), (3, 1000) on conflict (rarity) do nothing;

-- oferta à mostra (reveal) guarda também os extras; a compra guarda o que saiu
alter table public.chest_offers add column if not exists extras text[] not null default '{}';
alter table public.boxes add column if not exists extras jsonb;

-- lista do dia de um baú para uma raridade (mesma para todos, troca à meia-noite de Brasília)
create or replace function public.chest_pool_today(p_tier int, p_rarity int) returns setof text language sql stable security definer set search_path to '' as $f$
  select s.item_id from public.shop_items s
  where s.active and s.kind = 'box' and s.rarity = p_rarity
  order by md5(public.chest_today()::text || ':' || p_tier || ':' || p_rarity || ':' || s.item_id), s.item_id
  limit coalesce((select size from public.chest_pool where tier = p_tier and rarity = p_rarity), 0);
$f$;

-- garantido: da lista de hoje, da raridade do baú, que o jogador não tem (null se já tiver todas de hoje)
create or replace function public.chest_pick(p_uid uuid, p_tier int) returns text language sql volatile security definer set search_path to '' as $f$
  select p.id from public.chest_pool_today(p_tier, p_tier) as p(id)
  where not exists (select 1 from public.items_owned o where o.user_id = p_uid and o.item_id = p.id)
  order by random() limit 1;
$f$;

-- extras: um por posição de chest_shop.extras, da lista de hoje, sem repetir dentro do baú (podem ser repetidos do jogador)
create or replace function public.chest_pick_extras(p_tier int, p_main text) returns text[] language plpgsql volatile security definer set search_path to '' as $f$
declare r int; it text; res text[] := '{}';
begin
  foreach r in array coalesce((select extras from public.chest_shop where tier = p_tier), '{}') loop
    select p.id into it from public.chest_pool_today(p_tier, r) as p(id)
      where p.id is distinct from p_main and not (p.id = any(res)) order by random() limit 1;
    if it is not null then res := res || it; end if;
  end loop;
  return res;
end $f$;

-- oferta à mostra de hoje (só modo reveal); troca se for de outro dia, se o garantido já for dele ou saiu da lista
create or replace function public.chest_offer(p_uid uuid, p_tier int) returns text language plpgsql security definer set search_path to '' as $f$
declare o public.chest_offers; it text; d date := public.chest_today();
begin
  select * into o from public.chest_offers where user_id = p_uid and tier = p_tier;
  if found and o.day = d and not exists (select 1 from public.items_owned where user_id = p_uid and item_id = o.item_id)
     and o.item_id in (select public.chest_pool_today(p_tier, p_tier))
     and cardinality(o.extras) = cardinality(coalesce((select extras from public.chest_shop where tier = p_tier), '{}')) then
    return o.item_id;
  end if;
  it := public.chest_pick(p_uid, p_tier);
  if it is null then
    delete from public.chest_offers where user_id = p_uid and tier = p_tier;
    return null;
  end if;
  insert into public.chest_offers (user_id, tier, day, item_id, extras) values (p_uid, p_tier, d, it, public.chest_pick_extras(p_tier, it))
    on conflict (user_id, tier) do update set day = excluded.day, item_id = excluded.item_id, extras = excluded.extras;
  return it;
end $f$;

-- vitrine: preço, modo, limite, lista do dia com a raridade e se o jogador já tem cada item, quando a lista troca
create or replace function public.get_chest_shop() returns jsonb language plpgsql security definer set search_path to '' as $f$
declare uid uuid := auth.uid(); c public.chest_shop; arr jsonb := '[]'::jsonb; it text;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  for c in select * from public.chest_shop where active order by tier loop
    it := case when c.reveal then public.chest_offer(uid, c.tier) end;
    arr := arr || jsonb_build_object(
      'tier', c.tier, 'name', c.name, 'price', c.price_z, 'reveal', c.reveal, 'limit', c.daily_limit,
      'today', public.chest_bought_today(uid, c.tier),
      'extras', to_jsonb(c.extras),
      'item', it,
      'offer', case when it is not null then to_jsonb((select extras from public.chest_offers where user_id = uid and tier = c.tier)) end,
      'pool', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'r', cp.rarity,
                 'own', exists (select 1 from public.items_owned o where o.user_id = uid and o.item_id = p.id))
                 order by cp.rarity desc)
               from public.chest_pool cp cross join lateral public.chest_pool_today(c.tier, cp.rarity) as p(id)
               where cp.tier = c.tier), '[]'::jsonb),
      'left', (select count(*) from public.chest_pool_today(c.tier, c.tier) as p(id)
                 where not exists (select 1 from public.items_owned o where o.user_id = uid and o.item_id = p.id)),
      'total', (select count(*) from public.chest_pool_today(c.tier, c.tier)));
  end loop;
  return jsonb_build_object('chests', arr, 'zcoin', (select zcoin from public.wallets where user_id = uid),
    'dupe', (select jsonb_object_agg(rarity::text, coins) from public.chest_dupe),
    'next', ((public.chest_today() + 1)::timestamp at time zone 'America/Sao_Paulo'));
end $f$;

-- compra: cobra, entrega os 5 itens (repetido vira moedas) e grava tudo numa linha de boxes
create or replace function public.buy_chest(p_tier int, p_item text default null) returns jsonb language plpgsql security definer set search_path to '' as $f$
declare uid uuid := auth.uid(); c public.chest_shop; z int; it text; ex text[]; bid bigint; e text;
        list jsonb := '[]'::jsonb; r int; dup boolean; cn int; total int := 0;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  select * into c from public.chest_shop where tier = p_tier and active;
  if not found then raise exception 'BAU_INVALIDO'; end if;
  insert into public.wallets (user_id) values (uid) on conflict do nothing;
  -- trava a carteira: duas compras ao mesmo tempo esperam uma pela outra
  select zcoin into z from public.wallets where user_id = uid for update;
  if public.chest_bought_today(uid, p_tier) >= c.daily_limit then raise exception 'LIMITE_BAU_DIA'; end if;
  if c.reveal then
    it := public.chest_offer(uid, p_tier);
    if it is null then raise exception 'TUDO_COLETADO'; end if;
    if p_item is distinct from it then raise exception 'OFERTA_MUDOU'; end if;
    select extras into ex from public.chest_offers where user_id = uid and tier = p_tier;
  else
    it := public.chest_pick(uid, p_tier);
    if it is null then raise exception 'TUDO_COLETADO'; end if;
    ex := public.chest_pick_extras(p_tier, it);
  end if;
  if coalesce(z, 0) < c.price_z then raise exception 'ZCOIN_INSUFICIENTE'; end if;
  perform public.wallet_add(uid, 'zcoin', -c.price_z, 'bau ' || p_tier || ' ' || it);
  insert into public.boxes (user_id, source, created_at, opened_at, prize_kind, prize_amount, prize_item, tier)
    values (uid, 'loja', now(), now(), 'item', 0, it, p_tier) returning id into bid;
  insert into public.items_owned (user_id, item_id, source, created_at) values (uid, it, 'bau ' || bid, now());
  list := jsonb_build_array(jsonb_build_object('item', it, 'r', p_tier, 'dupe', false, 'coins', 0));
  foreach e in array coalesce(ex, '{}') loop
    select rarity into r from public.shop_items where item_id = e;
    dup := exists (select 1 from public.items_owned where user_id = uid and item_id = e);
    if dup then
      cn := coalesce((select coins from public.chest_dupe where rarity = r), 0);
      total := total + cn;
    else
      cn := 0;
      insert into public.items_owned (user_id, item_id, source, created_at) values (uid, e, 'bau ' || bid, now());
    end if;
    list := list || jsonb_build_object('item', e, 'r', r, 'dupe', dup, 'coins', cn);
  end loop;
  if total > 0 then perform public.wallet_add(uid, 'coin', total, 'bau ' || bid || ' repetidos'); end if;
  update public.boxes set extras = list, prize_amount = total where id = bid;
  delete from public.chest_offers where user_id = uid and tier = p_tier;
  return jsonb_build_object('kind', 'item', 'amount', 0, 'item', it, 'tier', p_tier, 'box', bid,
    'items', list, 'coins', total,
    'zcoin', (select zcoin from public.wallets where user_id = uid));
end $f$;

revoke execute on function public.chest_pool_today(int, int) from public, anon, authenticated;
revoke execute on function public.chest_pick(uuid, int) from public, anon, authenticated;
revoke execute on function public.chest_pick_extras(int, text) from public, anon, authenticated;
revoke execute on function public.chest_offer(uuid, int) from public, anon, authenticated;
revoke execute on function public.get_chest_shop() from public, anon;
revoke execute on function public.buy_chest(int, text) from public, anon;
grant execute on function public.get_chest_shop() to authenticated;
grant execute on function public.buy_chest(int, text) to authenticated;

-- escolha do dono em 24/11/2026: lista e chances à mostra, sorteio na compra
update public.chest_shop set reveal = false;
