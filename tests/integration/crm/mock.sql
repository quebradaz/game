-- Imitação mínima do Supabase com as colunas reais que o CRM lê (conferidas no banco em 22/11/2026).
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;
create extension if not exists citext;
create schema auth;
create table auth.users (id uuid primary key, email text, raw_app_meta_data jsonb default '{"provider":"google"}', last_sign_in_at timestamptz);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('qz.uid', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, name citext unique, name_changes int default 0,
  created_at timestamptz default now(), last_seen timestamptz default now(), show_photo boolean default true, body smallint default 0);
create table public.wallets (user_id uuid primary key references public.profiles(id) on delete cascade, chips int default 0, coins int default 0, zcoin int default 0,
  char_level int default 1, char_xp int default 0, updated_at timestamptz);
create table public.player_stats (user_id uuid primary key references public.profiles(id) on delete cascade, matches int default 0, wins int default 0, kills int default 0,
  deaths int default 0, shots bigint default 0, hits bigint default 0, bosses int default 0, best_wave int default 0, play_seconds bigint default 0, updated_at timestamptz);
create table public.runs (id bigserial primary key, user_id uuid references public.profiles(id) on delete cascade, map_id text, started_at timestamptz default now(),
  ended_at timestamptz, wave int, kills int, seconds int, shots int, hits int, bosses int, won boolean, accepted boolean, reason text);
create table public.map_stats (user_id uuid references public.profiles(id) on delete cascade, map_id text, matches int, wins int, best_wave int);
create table public.ledger (id bigserial primary key, user_id uuid references public.profiles(id) on delete cascade, currency text, delta int, reason text, ref text, run_id bigint, created_at timestamptz default now());
create table public.pass_progress (user_id uuid references public.profiles(id) on delete cascade, season int, xp int, premium boolean, claimed_free int[], claimed_prem int[]);
create table public.items_owned (user_id uuid references public.profiles(id) on delete cascade, item_id text);
create table public.friendships (user_low uuid references auth.users(id) on delete cascade, user_high uuid references auth.users(id) on delete cascade, status text);
create table public.zc_packs (id text primary key);
insert into public.zc_packs values ('punhado'), ('saco');
create table public.zc_orders (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  pack_id text not null references public.zc_packs(id), zcoin int not null, price_cents int not null, status text not null default 'pending',
  paid_amount int, capture_method text, fail_reason text, created_at timestamptz not null default now(), paid_at timestamptz);
alter default privileges in schema public grant execute on functions to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

-- a = admin, b = Beto (já comprou antes da migração), c = Caio, d = sem nome
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@exemplo.com'), ('00000000-0000-0000-0000-00000000000b', 'beto@exemplo.com'),
  ('00000000-0000-0000-0000-00000000000c', 'caio@exemplo.com'), ('00000000-0000-0000-0000-00000000000d', 'dani@exemplo.com');
insert into public.profiles (id, name) values ('00000000-0000-0000-0000-00000000000a', 'Dono'), ('00000000-0000-0000-0000-00000000000b', 'Beto'),
  ('00000000-0000-0000-0000-00000000000c', 'Caio'), ('00000000-0000-0000-0000-00000000000d', null);
insert into public.wallets (user_id, char_level, coins) values ('00000000-0000-0000-0000-00000000000b', 7, 500), ('00000000-0000-0000-0000-00000000000c', 3, 20);
insert into public.player_stats (user_id, matches, best_wave) values ('00000000-0000-0000-0000-00000000000b', 12, 9);
insert into public.runs (user_id, map_id, wave) values ('00000000-0000-0000-0000-00000000000b', 'rocinha', 9);
insert into public.ledger (user_id, currency, delta, reason) values ('00000000-0000-0000-0000-00000000000b', 'zcoin', 100, 'zcoin_compra');
insert into public.friendships values ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000c', 'accepted');
-- pedido antigo, já pago, antes do CRM existir
insert into public.zc_orders (user_id, pack_id, zcoin, price_cents, status, paid_amount, paid_at)
  values ('00000000-0000-0000-0000-00000000000b', 'punhado', 100, 490, 'paid', 490, now() - interval '2 days');
