-- Imitação mínima do esquema de economia (só o que o passe usa) para testar v29_passe_dificil.sql num Postgres local.
do $$ begin create role anon nologin; create role authenticated nologin; exception when duplicate_object then null; end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('qz.uid', true), '')::uuid $$;
create table public.seasons (id int primary key, name text, starts_at timestamptz, ends_at timestamptz, levels int, xp_per int, premium_price int);
create table public.pass_progress (user_id uuid, season int, xp int not null default 0, premium boolean default false,
  claimed_free int[] default '{}', claimed_prem int[] default '{}', primary key (user_id, season));
create table public.pass_rewards (season int, level int, track text, kind text, amount int, item_id text);
create table public.meta_config (id int primary key, coins_wave int, coins_kill numeric, win_coins int, xp_wave int, xp_kill int, win_xp int);
create table public.xp_events (name text, mult numeric, starts_at timestamptz, ends_at timestamptz);
create table public.mission_pool (id serial, kind text, target int, xp int);
create table public.mission_week (week date, slot int, xp int);
create table public.mission_progress (user_id uuid, week date, slot int, claimed boolean default false);
create table public.runs (id bigint); create table public.wallets (user_id uuid, coins int);
create function public.cur_season() returns int language sql stable as $$ select 1 $$;
create function public.cur_week() returns date language sql stable as $$ select date '2026-11-16' $$;
create function public.xp_mult() returns numeric language sql stable as $$ select coalesce((select max(mult) from public.xp_events where now() >= starts_at and now() < ends_at), 1) $$;
create function public.grant_prize(u uuid, k text, a int, i text, why text) returns jsonb language sql as $$ select jsonb_build_object('ok', true) $$;
insert into public.seasons values (1, 'T1', now() - interval '3 days', now() + interval '50 days', 40, 1000, 600);
insert into public.meta_config values (1, 6, 0.4, 400, 45, 2, 250);
insert into public.mission_pool (kind, target, xp) values ('kills', 500, 3000), ('wins', 1, 4000);
insert into public.mission_week values ('2026-11-16', 1, 3000), ('2026-11-09', 1, 4000);
-- jogadores antes da migração: A no nível 15 com 77,4% da barra, B no 0, C com o passe completo
insert into public.pass_progress (user_id, season, xp, claimed_free) values
  ('00000000-0000-0000-0000-00000000000a', 1, 15774, '{1,2,3,4,5,6,7,8,9,10,11,12,13,14,15}'),
  ('00000000-0000-0000-0000-00000000000b', 1, 287, '{}'),
  ('00000000-0000-0000-0000-00000000000c', 1, 41000, '{}');
insert into public.pass_rewards select 1, l, 'free', 'coin', 100, null from generate_series(1, 40) l;
