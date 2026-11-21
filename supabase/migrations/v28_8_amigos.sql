-- v28.8: área de amigos. Pedido de amizade pelo nome exato do personagem, lista de amigos e ranking só entre amigos.
-- Mesmo padrão do resto do banco: a tabela tem RLS ligado e nenhuma política, o jogo não lê nem escreve nela direto;
-- tudo passa por funções SECURITY DEFINER com search_path vazio, que só agem sobre auth.uid().
-- O cliente nunca vê o id (uuid) de outro jogador: só nome, foto (se o jogador deixou mostrar) e números.

create table if not exists public.friendships (
  user_low uuid not null references auth.users (id) on delete cascade,
  user_high uuid not null references auth.users (id) on delete cascade,
  requested_by uuid not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_low, user_high),
  check (user_low < user_high),
  check (requested_by = user_low or requested_by = user_high)
);
create index if not exists friendships_high_idx on public.friendships (user_high);
create index if not exists friendships_req_idx on public.friendships (requested_by) where status = 'pending';

alter table public.friendships enable row level security;
revoke all on public.friendships from anon, authenticated;

-- limites (ajustáveis aqui)
create or replace function public.friend_limits()
returns table (max_friends int, max_pending_out int, decline_wait interval, max_requests_day int)
language sql immutable set search_path to ''
as $$ select 100, 20, interval '7 days', 30 $$;
revoke all on function public.friend_limits() from public, anon, authenticated;

-- ===== pedir amizade (ou aceitar, se a outra pessoa já tinha pedido)
create or replace function public.friend_request(p_name text)
returns text
language plpgsql security definer set search_path to ''
as $$
declare
  uid uuid := auth.uid(); other uuid; lo uuid; hi uuid; f public.friendships; lim record; n int;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  if not exists (select 1 from public.profiles where id = uid and name is not null) then raise exception 'SEM_NOME'; end if;
  select id into other from public.profiles where name operator(extensions.=) btrim(coalesce(p_name, ''))::extensions.citext;
  if other is null then raise exception 'JOGADOR_NAO_ENCONTRADO'; end if;
  if other = uid then raise exception 'VOCE_MESMO'; end if;
  select * into lim from public.friend_limits();
  lo := least(uid, other); hi := greatest(uid, other);
  -- trava o par para dois pedidos ao mesmo tempo não criarem duas linhas
  perform pg_advisory_xact_lock(hashtextextended(lo::text || hi::text, 0));
  select * into f from public.friendships where user_low = lo and user_high = hi for update;

  if found and f.status = 'accepted' then raise exception 'JA_AMIGOS'; end if;
  if found and f.status = 'pending' and f.requested_by = uid then raise exception 'JA_PEDIU'; end if;

  if found and f.status = 'pending' and f.requested_by = other then
    -- os dois querem: vira amizade
    if (select count(*) from public.friendships where status = 'accepted' and (user_low = uid or user_high = uid)) >= lim.max_friends
      then raise exception 'LIMITE_AMIGOS'; end if;
    if (select count(*) from public.friendships where status = 'accepted' and (user_low = other or user_high = other)) >= lim.max_friends
      then raise exception 'LIMITE_AMIGOS_DELE'; end if;
    update public.friendships set status = 'accepted', updated_at = now() where user_low = lo and user_high = hi;
    return 'ACEITO';
  end if;

  -- quem foi recusado espera antes de pedir de novo (a pessoa que recusou pode pedir quando quiser)
  if found and f.status = 'declined' and f.requested_by = uid and f.updated_at > now() - lim.decline_wait
    then raise exception 'RECUSADO_ESPERA'; end if;

  select count(*) into n from public.friendships where requested_by = uid and status = 'pending';
  if n >= lim.max_pending_out then raise exception 'LIMITE_PEDIDOS'; end if;
  select count(*) into n from public.friendships where requested_by = uid and created_at > now() - interval '1 day';
  if n >= lim.max_requests_day then raise exception 'LIMITE_PEDIDOS'; end if;
  if (select count(*) from public.friendships where status = 'accepted' and (user_low = uid or user_high = uid)) >= lim.max_friends
    then raise exception 'LIMITE_AMIGOS'; end if;

  insert into public.friendships (user_low, user_high, requested_by, status)
  values (lo, hi, uid, 'pending')
  on conflict (user_low, user_high) do update
    set requested_by = excluded.requested_by, status = 'pending', created_at = now(), updated_at = now();
  return 'ENVIADO';
end $$;

-- ===== aceitar ou recusar um pedido recebido
create or replace function public.friend_respond(p_name text, p_accept boolean)
returns text
language plpgsql security definer set search_path to ''
as $$
declare uid uuid := auth.uid(); other uuid; lo uuid; hi uuid; lim record;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  select id into other from public.profiles where name operator(extensions.=) btrim(coalesce(p_name, ''))::extensions.citext;
  if other is null then raise exception 'JOGADOR_NAO_ENCONTRADO'; end if;
  lo := least(uid, other); hi := greatest(uid, other);
  perform pg_advisory_xact_lock(hashtextextended(lo::text || hi::text, 0));
  perform 1 from public.friendships
    where user_low = lo and user_high = hi and status = 'pending' and requested_by = other for update;
  if not found then raise exception 'SEM_PEDIDO'; end if;
  if p_accept then
    select * into lim from public.friend_limits();
    if (select count(*) from public.friendships where status = 'accepted' and (user_low = uid or user_high = uid)) >= lim.max_friends
      then raise exception 'LIMITE_AMIGOS'; end if;
    if (select count(*) from public.friendships where status = 'accepted' and (user_low = other or user_high = other)) >= lim.max_friends
      then raise exception 'LIMITE_AMIGOS_DELE'; end if;
    update public.friendships set status = 'accepted', updated_at = now() where user_low = lo and user_high = hi;
    return 'ACEITO';
  end if;
  update public.friendships set status = 'declined', updated_at = now() where user_low = lo and user_high = hi;
  return 'RECUSADO';
end $$;

-- ===== desfazer amizade ou cancelar um pedido que eu enviei
create or replace function public.friend_remove(p_name text)
returns text
language plpgsql security definer set search_path to ''
as $$
declare uid uuid := auth.uid(); other uuid; lo uuid; hi uuid;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  select id into other from public.profiles where name operator(extensions.=) btrim(coalesce(p_name, ''))::extensions.citext;
  if other is null then raise exception 'JOGADOR_NAO_ENCONTRADO'; end if;
  lo := least(uid, other); hi := greatest(uid, other);
  delete from public.friendships
    where user_low = lo and user_high = hi
      and (status = 'accepted' or (status = 'pending' and requested_by = uid));
  if not found then raise exception 'SEM_AMIZADE'; end if;
  return 'REMOVIDO';
end $$;

-- ===== minha lista: amigos, pedidos recebidos e enviados (recusados não aparecem para ninguém)
create or replace function public.get_friends()
returns table (name text, photo text, kind text, best_wave int, kills int, matches int, played_ago_days int, since timestamptz)
language sql stable security definer set search_path to ''
as $$
  with mine as (
    select case when f.user_low = auth.uid() then f.user_high else f.user_low end as other, f.*
    from public.friendships f
    where auth.uid() is not null and (f.user_low = auth.uid() or f.user_high = auth.uid()) and f.status <> 'declined'
  )
  select p.name::text,
    case when p.show_photo then coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture') end,
    case when m.status = 'accepted' then 'amigo' when m.requested_by = auth.uid() then 'enviado' else 'recebido' end,
    -- números só para amigo aceito: pedido pendente mostra só o nome
    case when m.status = 'accepted' then coalesce(s.best_wave, 0) end,
    case when m.status = 'accepted' then coalesce(s.kills, 0) end,
    case when m.status = 'accepted' then coalesce(s.matches, 0) end,
    case when m.status = 'accepted' and p.last_seen is not null then greatest(0, extract(day from now() - p.last_seen))::int end,
    m.updated_at
  from mine m
  join public.profiles p on p.id = m.other
  left join public.player_stats s on s.user_id = m.other
  left join auth.users u on u.id = m.other
  where p.name is not null
  order by 3, 4 desc nulls last, 1;
$$;

-- ===== ranking de um mapa só entre mim e meus amigos (mesmo critério do ranking geral)
create or replace function public.get_friends_leaderboard(p_map text)
returns table (pos bigint, name text, best_wave int, best_kills int, best_seconds int, me boolean, photo text)
language sql stable security definer set search_path to ''
as $$
  with ids as (
    select auth.uid() as id where auth.uid() is not null
    union
    select case when f.user_low = auth.uid() then f.user_high else f.user_low end
    from public.friendships f
    where f.status = 'accepted' and (f.user_low = auth.uid() or f.user_high = auth.uid())
  )
  select row_number() over (order by s.best_wave desc, s.best_kills desc, s.best_seconds asc, s.best_at asc),
    p.name::text, s.best_wave, s.best_kills, s.best_seconds, s.user_id = auth.uid(),
    case when p.show_photo then coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture') end
  from ids
  join public.map_stats s on s.user_id = ids.id and s.map_id = p_map and s.best_wave > 0
  join public.profiles p on p.id = s.user_id and p.name is not null
  left join auth.users u on u.id = s.user_id
  order by 1;
$$;

-- só quem está logado chama; ninguém anônimo
revoke all on function public.friend_request(text) from public, anon;
revoke all on function public.friend_respond(text, boolean) from public, anon;
revoke all on function public.friend_remove(text) from public, anon;
revoke all on function public.get_friends() from public, anon;
revoke all on function public.get_friends_leaderboard(text) from public, anon;
grant execute on function public.friend_request(text) to authenticated;
grant execute on function public.friend_respond(text, boolean) to authenticated;
grant execute on function public.friend_remove(text) to authenticated;
grant execute on function public.get_friends() to authenticated;
grant execute on function public.get_friends_leaderboard(text) to authenticated;
