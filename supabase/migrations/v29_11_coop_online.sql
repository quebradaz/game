-- v29.11: co-op online. Presença (quem está on), perfil do amigo (estatísticas + itens mais raros),
-- sala (lobby) com código, convite de amigo e troca de sinais para a conexão direta entre aparelhos (WebRTC).
--
-- Mesmo padrão do resto do banco: tabelas com RLS ligado e nenhuma política, ninguém lê nem escreve direto.
-- Tudo passa por funções SECURITY DEFINER com search_path vazio que só agem sobre auth.uid().
-- O cliente nunca vê o id (uuid) de outro jogador: dentro da sala cada um é um número de vaga (0 = anfitrião).
--
-- Quem entra numa sala:
--   - amigo aceito, por convite (lobby_invite + lobby_answer), ou
--   - qualquer jogador logado com nome que digitar o código da sala (lobby_join). Pedido do dono em 26/11/2026:
--     "quero que dê para jogar com outros jogadores também".
-- A partida em si não passa pelo banco: os aparelhos se falam direto (WebRTC) e, se a rede não deixar,
-- pelo canal de broadcast do Supabase Realtime (tópico secreto da sala, que só quem está nela recebe).
-- Depende de v28_8_amigos.sql (friendships) e de v29_7_baus_5_itens.sql (chest_pool, chest_shop.extras).

-- ---------------------------------------------------------------- presença
alter table public.profiles add column if not exists online_at timestamptz;
alter table public.profiles add column if not exists online_state text;

-- ---------------------------------------------------------------- tabelas
create table if not exists public.coop_lobbies (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  secret text not null default encode(extensions.gen_random_bytes(12), 'hex'),
  host uuid not null references auth.users (id) on delete cascade,
  map_id text not null default 'adega',
  camp int not null default 0,
  seed int,
  state text not null default 'open' check (state in ('open', 'playing', 'closed')),
  gen int not null default 0,
  max_players int not null default 3 check (max_players between 2 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists coop_lobbies_code_live on public.coop_lobbies (code) where state <> 'closed';
create index if not exists coop_lobbies_host_idx on public.coop_lobbies (host);

create table if not exists public.coop_members (
  lobby uuid not null references public.coop_lobbies (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  slot int not null check (slot between 0 and 2),
  ready boolean not null default false,
  joined_at timestamptz not null default now(),
  seen_at timestamptz not null default now(),
  primary key (lobby, user_id),
  unique (lobby, slot)
);
create index if not exists coop_members_user_idx on public.coop_members (user_id);

create table if not exists public.coop_invites (
  id bigint generated always as identity primary key,
  lobby uuid not null references public.coop_lobbies (id) on delete cascade,
  from_user uuid not null references auth.users (id) on delete cascade,
  to_user uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (lobby, to_user)
);
create index if not exists coop_invites_to_idx on public.coop_invites (to_user) where status = 'pending';
create index if not exists coop_invites_from_idx on public.coop_invites (from_user, created_at);

create table if not exists public.coop_signals (
  id bigint generated always as identity primary key,
  lobby uuid not null references public.coop_lobbies (id) on delete cascade,
  from_slot int not null,
  to_slot int not null,
  kind text not null check (kind in ('offer', 'answer', 'ice', 'bye')),
  body text not null check (length(body) <= 20000),
  created_at timestamptz not null default now()
);
create index if not exists coop_signals_to_idx on public.coop_signals (lobby, to_slot, id);

alter table public.coop_lobbies enable row level security;
alter table public.coop_members enable row level security;
alter table public.coop_invites enable row level security;
alter table public.coop_signals enable row level security;
revoke all on public.coop_lobbies, public.coop_members, public.coop_invites, public.coop_signals from anon, authenticated;

-- limites (ajustáveis aqui): convites por 10 min, sinais guardados por sala, quanto tempo sem sinal tira da sala
create or replace function public.coop_limits()
returns table (invites_10min int, signals_max int, member_timeout interval, invite_ttl interval, online_window interval)
language sql immutable set search_path to ''
as $$ select 20, 300, interval '40 seconds', interval '3 minutes', interval '50 seconds' $$;
revoke all on function public.coop_limits() from public, anon, authenticated;

-- ---------------------------------------------------------------- utilitários internos
create or replace function public.coop_need_name()
returns uuid
language plpgsql stable security definer set search_path to ''
as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  if not exists (select 1 from public.profiles where id = uid and name is not null) then raise exception 'SEM_NOME'; end if;
  return uid;
end $$;
revoke all on function public.coop_need_name() from public, anon, authenticated;

create or replace function public.coop_are_friends(a uuid, b uuid)
returns boolean
language sql stable security definer set search_path to ''
as $$
  select exists (select 1 from public.friendships f
    where f.user_low = least(a, b) and f.user_high = greatest(a, b) and f.status = 'accepted')
$$;
revoke all on function public.coop_are_friends(uuid, uuid) from public, anon, authenticated;

-- tira quem sumiu (sem sinal há mais que member_timeout); sala sem anfitrião fecha
create or replace function public.coop_prune(p_lobby uuid)
returns void
language plpgsql security definer set search_path to ''
as $$
declare lim record; h uuid;
begin
  select * into lim from public.coop_limits();
  select host into h from public.coop_lobbies where id = p_lobby and state <> 'closed';
  if h is null then return; end if;
  if exists (select 1 from public.coop_members where lobby = p_lobby and user_id = h and seen_at < now() - lim.member_timeout)
     or not exists (select 1 from public.coop_members where lobby = p_lobby and user_id = h) then
    update public.coop_lobbies set state = 'closed', updated_at = now() where id = p_lobby;
    delete from public.coop_members where lobby = p_lobby;
    return;
  end if;
  delete from public.coop_members where lobby = p_lobby and seen_at < now() - lim.member_timeout;
end $$;
revoke all on function public.coop_prune(uuid) from public, anon, authenticated;

-- sai de qualquer outra sala (um jogador fica em uma sala por vez)
create or replace function public.coop_leave_all(p_uid uuid, p_keep uuid)
returns void
language plpgsql security definer set search_path to ''
as $$
declare r record;
begin
  for r in select m.lobby, l.host from public.coop_members m join public.coop_lobbies l on l.id = m.lobby
           where m.user_id = p_uid and m.lobby is distinct from p_keep loop
    if r.host = p_uid then
      update public.coop_lobbies set state = 'closed', updated_at = now() where id = r.lobby;
      delete from public.coop_members where lobby = r.lobby;
    else
      delete from public.coop_members where lobby = r.lobby and user_id = p_uid;
    end if;
  end loop;
end $$;
revoke all on function public.coop_leave_all(uuid, uuid) from public, anon, authenticated;

create or replace function public.coop_add_member(p_lobby uuid, p_uid uuid)
returns int
language plpgsql security definer set search_path to ''
as $$
declare l public.coop_lobbies; s int; n int;
begin
  select * into l from public.coop_lobbies where id = p_lobby for update;
  if not found or l.state = 'closed' then raise exception 'SALA_FECHADA'; end if;
  perform public.coop_prune(p_lobby);
  select * into l from public.coop_lobbies where id = p_lobby;
  if l.state = 'closed' then raise exception 'SALA_FECHADA'; end if;
  select slot into s from public.coop_members where lobby = p_lobby and user_id = p_uid;
  if s is not null then
    update public.coop_members set seen_at = now() where lobby = p_lobby and user_id = p_uid;
    return s;
  end if;
  if l.state = 'playing' then raise exception 'SALA_JOGANDO'; end if;
  select count(*) into n from public.coop_members where lobby = p_lobby;
  if n >= l.max_players then raise exception 'SALA_CHEIA'; end if;
  perform public.coop_leave_all(p_uid, p_lobby);
  select min(g) into s from generate_series(1, l.max_players - 1) g
    where not exists (select 1 from public.coop_members where lobby = p_lobby and slot = g);
  if s is null then raise exception 'SALA_CHEIA'; end if;
  insert into public.coop_members (lobby, user_id, slot) values (p_lobby, p_uid, s);
  update public.coop_lobbies set updated_at = now() where id = p_lobby;
  return s;
end $$;
revoke all on function public.coop_add_member(uuid, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------- presença + convites recebidos
-- O jogo chama a cada ~15 s no menu (e mais rápido com a tela de amigos aberta). p_state: menu | sala | partida
create or replace function public.online_ping(p_state text default 'menu')
returns jsonb
language plpgsql security definer set search_path to ''
as $$
declare uid uuid := auth.uid(); lim record; inv jsonb; cur jsonb;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  select * into lim from public.coop_limits();
  update public.profiles set online_at = now(),
    online_state = case when p_state in ('menu', 'sala', 'partida') then p_state else 'menu' end
  where id = uid;
  update public.coop_members set seen_at = now() where user_id = uid;
  select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'from', p.name::text, 'map', l.map_id, 'camp', l.camp,
      'n', (select count(*) from public.coop_members m where m.lobby = l.id), 'max', l.max_players) order by i.created_at desc), '[]'::jsonb)
    into inv
  from public.coop_invites i
  join public.coop_lobbies l on l.id = i.lobby and l.state = 'open'
  join public.profiles p on p.id = i.from_user
  where i.to_user = uid and i.status = 'pending' and i.created_at > now() - lim.invite_ttl
    and not exists (select 1 from public.coop_members m where m.lobby = i.lobby and m.user_id = uid);
  select jsonb_build_object('id', l.id, 'code', l.code, 'state', l.state, 'gen', l.gen) into cur
  from public.coop_members m join public.coop_lobbies l on l.id = m.lobby and l.state <> 'closed'
  where m.user_id = uid limit 1;
  return jsonb_build_object('invites', inv, 'lobby', cur);
end $$;

-- amigos que estão on agora (e se dá pra entrar na sala deles)
create or replace function public.friends_online()
returns table (name text, online boolean, state text)
language sql stable security definer set search_path to ''
as $$
  select p.name::text,
    coalesce(p.online_at > now() - (select online_window from public.coop_limits()), false),
    case when p.online_at > now() - (select online_window from public.coop_limits()) then coalesce(p.online_state, 'menu') end
  from public.friendships f
  join public.profiles p on p.id = case when f.user_low = auth.uid() then f.user_high else f.user_low end
  where auth.uid() is not null and f.status = 'accepted' and (f.user_low = auth.uid() or f.user_high = auth.uid()) and p.name is not null
$$;

-- ---------------------------------------------------------------- perfil de outro jogador
-- Pode ver: amigo aceito, alguém que está na mesma sala, ou você mesmo.
-- "rare": itens que a pessoa tem, com a raridade, quantos % dos jogadores também têm e a chance de sair
-- num baú (só itens de baú: a chance por abertura do baú onde ele é mais provável, quando está na lista do dia).
create or replace function public.player_profile(p_name text)
returns jsonb
language plpgsql stable security definer set search_path to ''
as $$
declare
  uid uuid := auth.uid(); other uuid; pr public.profiles; pg jsonb; st jsonb; maps jsonb; rare jsonb; tot int; fr boolean; since timestamptz;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  select * into pr from public.profiles where name operator(extensions.=) btrim(coalesce(p_name, ''))::extensions.citext;
  if not found then raise exception 'JOGADOR_NAO_ENCONTRADO'; end if;
  other := pr.id;
  fr := public.coop_are_friends(uid, other);
  if other <> uid and not fr and not exists (
      select 1 from public.coop_members a join public.coop_members b on b.lobby = a.lobby
      join public.coop_lobbies l on l.id = a.lobby and l.state <> 'closed'
      where a.user_id = uid and b.user_id = other) then
    raise exception 'PERFIL_FECHADO';
  end if;
  select updated_at into since from public.friendships where user_low = least(uid, other) and user_high = greatest(uid, other) and status = 'accepted';
  select data into pg from public.progress where user_id = other;
  select to_jsonb(s) - 'user_id' - 'updated_at' into st from public.player_stats s where s.user_id = other;
  select coalesce(jsonb_agg(jsonb_build_object('map', m.map_id, 'best_wave', m.best_wave, 'best_kills', m.best_kills, 'matches', m.matches, 'wins', m.wins, 'kills', m.kills) order by m.best_wave desc), '[]'::jsonb)
    into maps from public.map_stats m where m.user_id = other and m.matches > 0;
  select count(*) into tot from public.profiles where name is not null;
  with mine as (
    select o.item_id from public.items_owned o where o.user_id = other
    union
    select jsonb_array_elements_text(case when jsonb_typeof(pg->'inv') = 'array' then pg->'inv' else '[]'::jsonb end)
  ), owners as (
    select x.item_id, count(distinct x.uid) n from (
      select o.user_id uid, o.item_id from public.items_owned o where o.item_id in (select item_id from mine)
      union
      select g.user_id, e.v from public.progress g
        cross join lateral jsonb_array_elements_text(case when jsonb_typeof(g.data->'inv') = 'array' then g.data->'inv' else '[]'::jsonb end) e(v)
        where e.v in (select item_id from mine)
    ) x group by x.item_id
  ), drop_r as (
    -- por raridade: maior chance numa abertura (garantido do baú + extras daquela raridade) / tamanho da lista do dia
    select r.rarity, max(
      ((case when c.tier = r.rarity then 1 else 0 end)
        + coalesce((select count(*) from unnest(c.extras) e where e = r.rarity), 0))::numeric / nullif(r.size, 0)) pct
    from public.chest_pool r join public.chest_shop c on c.tier = r.tier and c.active
    group by r.rarity
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', m.item_id, 'r', si.rarity, 'k', si.kind,
      'own', round(100.0 * coalesce(ow.n, 1) / greatest(tot, 1), 1),
      'drop', case when si.kind = 'box' then round(100 * least(1, d.pct), 1) end)
      order by si.rarity desc nulls last, coalesce(ow.n, 1), m.item_id), '[]'::jsonb)
    into rare
  from (select item_id from mine where item_id ~ '^[a-z0-9_]{1,40}$' limit 400) m
  left join public.shop_items si on si.item_id = m.item_id
  left join owners ow on ow.item_id = m.item_id
  left join drop_r d on d.rarity = si.rarity;
  return jsonb_build_object(
    'name', pr.name::text,
    'me', other = uid,
    'friend', fr,
    'since', since,
    'photo', (select case when pr.show_photo then coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture') end from auth.users u where u.id = other),
    'online', coalesce(pr.online_at > now() - (select online_window from public.coop_limits()), false),
    'state', case when pr.online_at > now() - (select online_window from public.coop_limits()) then pr.online_state end,
    'played_ago_days', case when pr.last_seen is not null then greatest(0, extract(day from now() - pr.last_seen))::int end,
    'level', case when jsonb_typeof(pg->'level') = 'number' then (pg->>'level')::numeric::int end,
    'look', case when jsonb_typeof(pg->'look') = 'object' then pg->'look' end,
    'eq', case when jsonb_typeof(pg->'eq') = 'object' then pg->'eq' end,
    'stats', coalesce(st, '{}'::jsonb),
    'maps', maps,
    'players', tot,
    'items', rare);
end $$;

-- ---------------------------------------------------------------- sala
create or replace function public.lobby_create(p_map text, p_camp int default 0)
returns jsonb
language plpgsql security definer set search_path to ''
as $$
declare uid uuid := public.coop_need_name(); c text; lid uuid; i int := 0;
  alpha constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
begin
  if p_map is null or p_map !~ '^[a-z0-9_]{1,24}$' then raise exception 'MAPA_INVALIDO'; end if;
  perform public.coop_leave_all(uid, null);
  loop
    i := i + 1;
    select string_agg(substr(alpha, 1 + (get_byte(b, k) % length(alpha)), 1), '') into c
      from (select extensions.gen_random_bytes(5) b) x, generate_series(0, 4) k;
    exit when not exists (select 1 from public.coop_lobbies where code = c and state <> 'closed');
    if i > 20 then raise exception 'TENTE_DE_NOVO'; end if;
  end loop;
  insert into public.coop_lobbies (code, host, map_id, camp) values (c, uid, p_map, greatest(0, least(coalesce(p_camp, 0), 9)))
    returning id into lid;
  insert into public.coop_members (lobby, user_id, slot, ready) values (lid, uid, 0, true);
  return jsonb_build_object('id', lid, 'code', c);
end $$;

create or replace function public.lobby_join(p_code text)
returns jsonb
language plpgsql security definer set search_path to ''
as $$
declare uid uuid := public.coop_need_name(); l public.coop_lobbies; s int;
begin
  select * into l from public.coop_lobbies
    where code = upper(btrim(coalesce(p_code, ''))) and state <> 'closed' order by created_at desc limit 1;
  if not found then raise exception 'SALA_NAO_ENCONTRADA'; end if;
  s := public.coop_add_member(l.id, uid);
  return jsonb_build_object('id', l.id, 'code', l.code, 'slot', s);
end $$;

create or replace function public.lobby_invite(p_lobby uuid, p_name text)
returns text
language plpgsql security definer set search_path to ''
as $$
declare uid uuid := public.coop_need_name(); other uuid; lim record; n int; l public.coop_lobbies;
begin
  select * into l from public.coop_lobbies where id = p_lobby and state <> 'closed';
  if not found or not exists (select 1 from public.coop_members where lobby = p_lobby and user_id = uid) then raise exception 'FORA_DA_SALA'; end if;
  select id into other from public.profiles where name operator(extensions.=) btrim(coalesce(p_name, ''))::extensions.citext;
  if other is null then raise exception 'JOGADOR_NAO_ENCONTRADO'; end if;
  if other = uid then raise exception 'VOCE_MESMO'; end if;
  if not public.coop_are_friends(uid, other) then raise exception 'NAO_E_AMIGO'; end if;
  if exists (select 1 from public.coop_members where lobby = p_lobby and user_id = other) then raise exception 'JA_NA_SALA'; end if;
  select * into lim from public.coop_limits();
  select count(*) into n from public.coop_invites where from_user = uid and created_at > now() - interval '10 minutes';
  if n >= lim.invites_10min then raise exception 'MUITOS_CONVITES'; end if;
  insert into public.coop_invites (lobby, from_user, to_user) values (p_lobby, uid, other)
  on conflict (lobby, to_user) do update set from_user = excluded.from_user, status = 'pending', created_at = now();
  return 'CONVIDADO';
end $$;

create or replace function public.lobby_answer(p_invite bigint, p_accept boolean)
returns jsonb
language plpgsql security definer set search_path to ''
as $$
declare uid uuid := public.coop_need_name(); i public.coop_invites; l public.coop_lobbies; s int; lim record;
begin
  select * into lim from public.coop_limits();
  select * into i from public.coop_invites where id = p_invite and to_user = uid for update;
  if not found or i.status <> 'pending' then raise exception 'CONVITE_VENCIDO'; end if;
  if not p_accept then
    update public.coop_invites set status = 'declined' where id = p_invite;
    return jsonb_build_object('ok', false);
  end if;
  if i.created_at < now() - lim.invite_ttl then raise exception 'CONVITE_VENCIDO'; end if;
  select * into l from public.coop_lobbies where id = i.lobby;
  s := public.coop_add_member(i.lobby, uid);
  update public.coop_invites set status = 'accepted' where id = p_invite;
  return jsonb_build_object('id', l.id, 'code', l.code, 'slot', s);
end $$;

-- estado da sala + sinais para mim (os sinais entregues saem do banco). Chamado a cada ~1 s na sala.
create or replace function public.lobby_state(p_lobby uuid)
returns jsonb
language plpgsql security definer set search_path to ''
as $$
declare uid uuid := auth.uid(); l public.coop_lobbies; me int; mem jsonb; sig jsonb; lim record;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  select * into lim from public.coop_limits();
  update public.coop_members set seen_at = now() where lobby = p_lobby and user_id = uid returning slot into me;
  perform public.coop_prune(p_lobby);
  select * into l from public.coop_lobbies where id = p_lobby;
  if not found or l.state = 'closed' then return jsonb_build_object('state', 'closed'); end if;
  select slot into me from public.coop_members where lobby = p_lobby and user_id = uid;
  if me is null then return jsonb_build_object('state', 'closed', 'kicked', true); end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'slot', m.slot, 'name', p.name::text, 'ready', m.ready, 'me', m.user_id = uid,
      'friend', public.coop_are_friends(uid, m.user_id),
      'photo', case when p.show_photo then coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture') end,
      'look', case when jsonb_typeof(g.data->'look') = 'object' then g.data->'look' end,
      'eq', case when jsonb_typeof(g.data->'eq') = 'object' then g.data->'eq' end,
      'level', case when jsonb_typeof(g.data->'level') = 'number' then (g.data->>'level')::numeric::int end,
      'best', s.best_wave, 'kills', s.kills,
      'lag', extract(epoch from now() - m.seen_at)::int) order by m.slot), '[]'::jsonb)
    into mem
  from public.coop_members m
  join public.profiles p on p.id = m.user_id
  left join auth.users u on u.id = m.user_id
  left join public.progress g on g.user_id = m.user_id
  left join public.player_stats s on s.user_id = m.user_id
  where m.lobby = p_lobby;
  with d as (
    delete from public.coop_signals where lobby = p_lobby and to_slot = me returning id, from_slot, kind, body
  ) select coalesce(jsonb_agg(jsonb_build_object('from', from_slot, 'kind', kind, 'body', body) order by id), '[]'::jsonb) into sig from d;
  return jsonb_build_object('id', l.id, 'code', l.code, 'secret', l.secret, 'state', l.state, 'map', l.map_id, 'camp', l.camp,
    'seed', l.seed, 'gen', l.gen, 'max', l.max_players, 'me', me, 'members', mem, 'signals', sig);
end $$;

create or replace function public.lobby_update(p_lobby uuid, p_map text, p_camp int)
returns text
language plpgsql security definer set search_path to ''
as $$
declare uid uuid := auth.uid();
begin
  if p_map is null or p_map !~ '^[a-z0-9_]{1,24}$' then raise exception 'MAPA_INVALIDO'; end if;
  update public.coop_lobbies set map_id = p_map, camp = greatest(0, least(coalesce(p_camp, 0), 9)), updated_at = now()
    where id = p_lobby and host = uid and state = 'open';
  if not found then raise exception 'SO_ANFITRIAO'; end if;
  -- mudou a fase: todo mundo confirma de novo
  update public.coop_members set ready = (slot = 0) where lobby = p_lobby;
  return 'OK';
end $$;

create or replace function public.lobby_ready(p_lobby uuid, p_ready boolean)
returns text
language plpgsql security definer set search_path to ''
as $$
declare uid uuid := auth.uid();
begin
  update public.coop_members m set ready = coalesce(p_ready, false), seen_at = now()
    from public.coop_lobbies l where l.id = m.lobby and m.lobby = p_lobby and m.user_id = uid and l.state = 'open';
  if not found then raise exception 'FORA_DA_SALA'; end if;
  return 'OK';
end $$;

-- p_seed: semente da partida (horário, baú e barraca saem iguais para todos)
create or replace function public.lobby_start(p_lobby uuid, p_seed int)
returns int
language plpgsql security definer set search_path to ''
as $$
declare uid uuid := auth.uid(); g int;
begin
  perform public.coop_prune(p_lobby);
  if not exists (select 1 from public.coop_lobbies where id = p_lobby and host = uid and state = 'open') then raise exception 'SO_ANFITRIAO'; end if;
  if (select count(*) from public.coop_members where lobby = p_lobby) < 2 then raise exception 'SALA_SOZINHO'; end if;
  if exists (select 1 from public.coop_members where lobby = p_lobby and not ready) then raise exception 'FALTA_PRONTO'; end if;
  update public.coop_lobbies set state = 'playing', gen = gen + 1, updated_at = now(),
    seed = greatest(1, abs(coalesce(p_seed, 1)))
    where id = p_lobby returning gen into g;
  return g;
end $$;

-- fim da partida: a sala volta a ficar aberta e todo mundo confirma de novo para a próxima
create or replace function public.lobby_end(p_lobby uuid)
returns text
language plpgsql security definer set search_path to ''
as $$
declare uid uuid := auth.uid();
begin
  update public.coop_lobbies set state = 'open', updated_at = now() where id = p_lobby and host = uid and state = 'playing';
  if found then update public.coop_members set ready = (slot = 0) where lobby = p_lobby; end if;
  return 'OK';
end $$;

create or replace function public.lobby_leave(p_lobby uuid)
returns text
language plpgsql security definer set search_path to ''
as $$
declare uid uuid := auth.uid(); h uuid;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  select host into h from public.coop_lobbies where id = p_lobby;
  if h = uid then
    update public.coop_lobbies set state = 'closed', updated_at = now() where id = p_lobby;
    delete from public.coop_members where lobby = p_lobby;
  else
    delete from public.coop_members where lobby = p_lobby and user_id = uid;
    update public.coop_lobbies set updated_at = now() where id = p_lobby;
  end if;
  return 'OK';
end $$;

create or replace function public.lobby_kick(p_lobby uuid, p_slot int)
returns text
language plpgsql security definer set search_path to ''
as $$
declare uid uuid := auth.uid();
begin
  if not exists (select 1 from public.coop_lobbies where id = p_lobby and host = uid and state <> 'closed') then raise exception 'SO_ANFITRIAO'; end if;
  if p_slot = 0 then raise exception 'SO_ANFITRIAO'; end if;
  delete from public.coop_members where lobby = p_lobby and slot = p_slot;
  return 'OK';
end $$;

create or replace function public.lobby_signal(p_lobby uuid, p_to int, p_kind text, p_body text)
returns text
language plpgsql security definer set search_path to ''
as $$
declare uid uuid := auth.uid(); me int; lim record; n int;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  select slot into me from public.coop_members where lobby = p_lobby and user_id = uid;
  if me is null then raise exception 'FORA_DA_SALA'; end if;
  if p_to = me or not exists (select 1 from public.coop_members where lobby = p_lobby and slot = p_to) then raise exception 'SEM_DESTINO'; end if;
  if p_kind not in ('offer', 'answer', 'ice', 'bye') or length(coalesce(p_body, '')) > 20000 then raise exception 'SINAL_INVALIDO'; end if;
  select * into lim from public.coop_limits();
  delete from public.coop_signals where lobby = p_lobby and created_at < now() - interval '2 minutes';
  select count(*) into n from public.coop_signals where lobby = p_lobby and from_slot = me;
  if n >= lim.signals_max then raise exception 'MUITOS_SINAIS'; end if;
  insert into public.coop_signals (lobby, from_slot, to_slot, kind, body) values (p_lobby, me, p_to, p_kind, coalesce(p_body, ''));
  return 'OK';
end $$;

-- ---------------------------------------------------------------- permissões: só quem está logado
do $$
declare f text;
begin
  foreach f in array array[
    'public.online_ping(text)', 'public.friends_online()', 'public.player_profile(text)',
    'public.lobby_create(text, int)', 'public.lobby_join(text)', 'public.lobby_invite(uuid, text)',
    'public.lobby_answer(bigint, boolean)', 'public.lobby_state(uuid)', 'public.lobby_update(uuid, text, int)',
    'public.lobby_ready(uuid, boolean)', 'public.lobby_start(uuid, int)', 'public.lobby_end(uuid)',
    'public.lobby_leave(uuid)', 'public.lobby_kick(uuid, int)', 'public.lobby_signal(uuid, int, text, text)'] loop
    execute 'revoke all on function ' || f || ' from public, anon';
    execute 'grant execute on function ' || f || ' to authenticated';
  end loop;
end $$;
