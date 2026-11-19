-- v28.5 (parte 2): temporada 1, sorteio da caixa por raridade, foto no ranking, feedback.
-- A parte 1 (lista de itens em shop_items) sai de: node tools/patches/v28.5-itens.js sql

-- temporada 1: passe com 5 lendários + 2 raros; loja com 5 lendários + 2 raros
update public.shop_items set kind = 'box' where item_id in ('s1_jaqueta_vinho','s1_camisa_tatica_noite','s1_calca_couro_vinho','s1_capacete_neon','z_moletom_roxo');
update public.shop_items set price_z = null where item_id = 'z_moletom_roxo';
update public.shop_items set active = false where item_id = 'pacote_s1';
update public.pass_rewards set kind = 'zcoin', amount = 50, item_id = null where season = 1 and track = 'prem' and level = 5;
update public.pass_rewards set kind = 'coins', amount = 1500, item_id = null where season = 1 and track = 'prem' and level = 15;
update public.pass_rewards set item_id = 's1_moletom_quebrada' where season = 1 and track = 'prem' and level = 25;
update public.pass_rewards set kind = 'chip', amount = 1, item_id = null where season = 1 and track = 'prem' and level = 33;

-- caixa: lendário 4% (item 3%, 25 Z-Coin 1%), raro 14% (item 11%, chip 3%), comum 82% (item 45%, moedas 37%)
create or replace function public.open_box(p_box bigint) returns jsonb language plpgsql security definer set search_path to '' as $f$
declare uid uuid := auth.uid(); b public.boxes; x float := random(); k text; a int := 0; it text; t int := 1; res jsonb;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  select * into b from public.boxes where id = p_box and user_id = uid for update;
  if not found then raise exception 'SEM_CAIXA'; end if;
  if b.opened_at is not null then raise exception 'JA_ABERTA'; end if;
  if x < 0.01 then k := 'zcoin'; a := 25; t := 3;
  elsif x < 0.04 then t := 3; k := 'item';
  elsif x < 0.07 then t := 2; k := 'chip'; a := 1;
  elsif x < 0.18 then t := 2; k := 'item';
  elsif x < 0.63 then t := 1; k := 'item';
  else t := 1; k := 'coins'; a := 200 + (floor(random() * 5) * 100)::int;
  end if;
  if k = 'item' then
    select item_id into it from public.shop_items s where s.active and s.kind = 'box' and s.rarity = t
      and not exists (select 1 from public.items_owned o where o.user_id = uid and o.item_id = s.item_id) order by random() limit 1;
    if it is null then
      if t = 3 then k := 'zcoin'; a := 25; elsif t = 2 then k := 'chip'; a := 1; else k := 'coins'; a := 600; end if;
    end if;
  end if;
  update public.boxes set opened_at = now(), prize_kind = k, prize_amount = a, prize_item = it where id = p_box;
  res := public.grant_prize(uid, k, a, it, 'caixa ' || p_box);
  return coalesce(res, '{}'::jsonb) || jsonb_build_object('tier', t);
end $f$;

-- foto do Google no ranking (o jogador pode desligar)
alter table public.profiles add column if not exists show_photo boolean not null default true;
drop function if exists public.get_leaderboard(text, integer);
create function public.get_leaderboard(p_map text, p_limit integer default 20)
returns table(pos bigint, name text, best_wave integer, best_kills integer, best_seconds integer, me boolean, photo text)
language sql stable security definer set search_path to '' as $f$
  with r as (
    select row_number() over (order by s.best_wave desc, s.best_kills desc, s.best_seconds asc, s.best_at asc) as pos,
      p.name::text as name, s.best_wave, s.best_kills, s.best_seconds, s.user_id = auth.uid() as me,
      case when p.show_photo then coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture') end as photo
    from public.map_stats s join public.profiles p on p.id = s.user_id left join auth.users u on u.id = s.user_id
    where s.map_id = p_map and p.name is not null and s.best_wave > 0
  )
  select * from r where pos <= least(greatest(p_limit, 1), 100) or me order by pos;
$f$;
grant execute on function public.get_leaderboard(text, integer) to anon, authenticated;

create or replace function public.set_show_photo(p_on boolean) returns void language plpgsql security definer set search_path to '' as $f$
begin
  if auth.uid() is null then raise exception 'SEM_LOGIN'; end if;
  update public.profiles set show_photo = p_on where id = auth.uid();
end $f$;
revoke execute on function public.set_show_photo(boolean) from public, anon;
grant execute on function public.set_show_photo(boolean) to authenticated;

-- feedback dos jogadores (lido pelo dono no SQL Editor: select * from feedback order by id desc)
create table if not exists public.feedback (
  id bigserial primary key,
  user_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in ('bug','ideia','elogio','outro')),
  body text not null check (char_length(body) between 3 and 1000),
  ver text, device text, created_at timestamptz not null default now()
);
alter table public.feedback enable row level security;
create or replace function public.send_feedback(p_kind text, p_body text, p_ver text default null, p_device text default null)
returns void language plpgsql security definer set search_path to '' as $f$
declare uid uuid := auth.uid();
begin
  if p_kind not in ('bug','ideia','elogio','outro') then raise exception 'TIPO_INVALIDO'; end if;
  if char_length(coalesce(trim(p_body), '')) < 3 then raise exception 'TEXTO_CURTO'; end if;
  if uid is not null and (select count(*) from public.feedback where user_id = uid and created_at > now() - interval '1 day') >= 10 then raise exception 'LIMITE_FEEDBACK'; end if;
  if uid is null and (select count(*) from public.feedback where user_id is null and created_at > now() - interval '1 hour') >= 60 then raise exception 'LIMITE_FEEDBACK'; end if;
  insert into public.feedback (user_id, kind, body, ver, device) values (uid, p_kind, left(trim(p_body), 1000), left(p_ver, 20), left(p_device, 120));
end $f$;
grant execute on function public.send_feedback(text, text, text, text) to anon, authenticated;
