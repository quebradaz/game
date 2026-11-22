-- v28.10: baús vendidos por Z-Coin com raridade garantida.
--   Baú raro (tier 2): sempre uma roupa rara que o jogador ainda não tem.
--   Baú lendário de ouro (tier 3): sempre uma roupa lendária que o jogador ainda não tem.
-- As roupas saem de shop_items com kind = 'box' (as mesmas do baú grátis).
-- Tudo é decidido aqui no servidor; o jogo só mostra e pede a compra.
--
-- Dois modos por baú (coluna chest_shop.reveal), trocáveis no SQL Editor sem atualizar o jogo:
--   reveal = true  (padrão): o baú mostra ANTES da compra qual roupa vem hoje. Sem sorteio pago.
--                  A oferta troca todo dia (horário de Brasília) e logo depois de cada compra.
--   reveal = false : a roupa é sorteada na hora da compra, dentro da raridade do baú.
--                    Atenção: é caixa de recompensa paga (ver ECA Digital, Lei 15.211/2025).
-- Limite por dia por jogador em chest_shop.daily_limit. Preços em chest_shop.price_z.

create table if not exists public.chest_shop (
  tier int primary key check (tier in (2, 3)),
  name text not null,
  price_z int not null check (price_z > 0),
  active boolean not null default true,
  reveal boolean not null default true,
  daily_limit int not null default 3 check (daily_limit > 0)
);
alter table public.chest_shop enable row level security;
insert into public.chest_shop (tier, name, price_z, reveal, daily_limit) values
  (2, 'Baú raro', 150, true, 5),
  (3, 'Baú lendário de ouro', 600, true, 2)
on conflict (tier) do nothing;

-- oferta do dia de cada jogador (só usada no modo reveal)
create table if not exists public.chest_offers (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier int not null references public.chest_shop(tier),
  day date not null,
  item_id text not null,
  primary key (user_id, tier)
);
alter table public.chest_offers enable row level security;

-- a compra fica registrada em boxes (já aberta), com o tier do baú
alter table public.boxes add column if not exists tier int;
create index if not exists boxes_shop_day on public.boxes (user_id, tier, created_at) where source = 'loja';

create or replace function public.chest_today() returns date language sql stable set search_path to '' as $f$
  select (now() at time zone 'America/Sao_Paulo')::date;
$f$;

-- uma roupa da raridade que o jogador não tem (null se já tiver todas)
create or replace function public.chest_pick(p_uid uuid, p_tier int) returns text language sql volatile security definer set search_path to '' as $f$
  select s.item_id from public.shop_items s
  where s.active and s.kind = 'box' and s.rarity = p_tier
    and not exists (select 1 from public.items_owned o where o.user_id = p_uid and o.item_id = s.item_id)
  order by random() limit 1;
$f$;

-- oferta válida de hoje; cria ou troca se for de outro dia ou se o jogador já tiver a roupa
create or replace function public.chest_offer(p_uid uuid, p_tier int) returns text language plpgsql security definer set search_path to '' as $f$
declare o public.chest_offers; it text; d date := public.chest_today();
begin
  select * into o from public.chest_offers where user_id = p_uid and tier = p_tier;
  if found and o.day = d and not exists (select 1 from public.items_owned where user_id = p_uid and item_id = o.item_id)
     and exists (select 1 from public.shop_items where item_id = o.item_id and active and kind = 'box') then
    return o.item_id;
  end if;
  it := public.chest_pick(p_uid, p_tier);
  if it is null then
    delete from public.chest_offers where user_id = p_uid and tier = p_tier;
    return null;
  end if;
  insert into public.chest_offers (user_id, tier, day, item_id) values (p_uid, p_tier, d, it)
    on conflict (user_id, tier) do update set day = excluded.day, item_id = excluded.item_id;
  return it;
end $f$;

create or replace function public.chest_bought_today(p_uid uuid, p_tier int) returns int language sql stable security definer set search_path to '' as $f$
  select count(*)::int from public.boxes
  where user_id = p_uid and source = 'loja' and tier = p_tier
    and created_at >= (public.chest_today()::timestamp at time zone 'America/Sao_Paulo');
$f$;

-- vitrine dos baús: preço, modo, oferta do dia (se reveal), quantas roupas faltam, compras de hoje
create or replace function public.get_chest_shop() returns jsonb language plpgsql security definer set search_path to '' as $f$
declare uid uuid := auth.uid(); c public.chest_shop; arr jsonb := '[]'::jsonb;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  for c in select * from public.chest_shop where active order by tier loop
    arr := arr || jsonb_build_object(
      'tier', c.tier, 'name', c.name, 'price', c.price_z, 'reveal', c.reveal, 'limit', c.daily_limit,
      'today', public.chest_bought_today(uid, c.tier),
      'item', case when c.reveal then public.chest_offer(uid, c.tier) end,
      'left', (select count(*) from public.shop_items s where s.active and s.kind = 'box' and s.rarity = c.tier
                 and not exists (select 1 from public.items_owned o where o.user_id = uid and o.item_id = s.item_id)),
      'total', (select count(*) from public.shop_items s where s.active and s.kind = 'box' and s.rarity = c.tier));
  end loop;
  return jsonb_build_object('chests', arr, 'zcoin', (select zcoin from public.wallets where user_id = uid));
end $f$;

-- compra. p_item é a roupa que o jogador viu (obrigatória no modo reveal; se a oferta mudou, nada é cobrado)
create or replace function public.buy_chest(p_tier int, p_item text default null) returns jsonb language plpgsql security definer set search_path to '' as $f$
declare uid uuid := auth.uid(); c public.chest_shop; z int; it text; bid bigint;
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
  else
    it := public.chest_pick(uid, p_tier);
    if it is null then raise exception 'TUDO_COLETADO'; end if;
  end if;
  if coalesce(z, 0) < c.price_z then raise exception 'ZCOIN_INSUFICIENTE'; end if;
  perform public.wallet_add(uid, 'zcoin', -c.price_z, 'bau ' || p_tier || ' ' || it);
  insert into public.boxes (user_id, source, created_at, opened_at, prize_kind, prize_amount, prize_item, tier)
    values (uid, 'loja', now(), now(), 'item', 0, it, p_tier) returning id into bid;
  insert into public.items_owned (user_id, item_id, source, created_at) values (uid, it, 'bau ' || bid, now());
  delete from public.chest_offers where user_id = uid and tier = p_tier;
  return jsonb_build_object('kind', 'item', 'amount', 0, 'item', it, 'tier', p_tier, 'box', bid,
    'zcoin', (select zcoin from public.wallets where user_id = uid));
end $f$;

revoke execute on function public.chest_today() from public, anon, authenticated;
revoke execute on function public.chest_pick(uuid, int) from public, anon, authenticated;
revoke execute on function public.chest_offer(uuid, int) from public, anon, authenticated;
revoke execute on function public.chest_bought_today(uuid, int) from public, anon, authenticated;
revoke execute on function public.get_chest_shop() from public, anon;
revoke execute on function public.buy_chest(int, text) from public, anon;
grant execute on function public.get_chest_shop() to authenticated;
grant execute on function public.buy_chest(int, text) to authenticated;
