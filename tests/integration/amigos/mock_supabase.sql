-- Imitação mínima do Supabase para testar as migrações num Postgres local (não é o esquema real completo).
create role anon nologin; create role authenticated nologin; create role service_role nologin;
create schema extensions; create extension citext schema extensions;
create schema auth;
create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('qz.uid', true), '')::uuid $$;
grant usage on schema auth, extensions to anon, authenticated;
grant usage on schema public to anon, authenticated;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, name extensions.citext unique,
  name_changes int default 0, name_changed_at timestamptz, created_at timestamptz default now(), last_seen timestamptz, show_photo boolean default true);
create table public.player_stats (user_id uuid primary key references auth.users(id) on delete cascade, matches int default 0, wins int default 0,
  kills int default 0, deaths int default 0, shots bigint default 0, hits bigint default 0, bosses int default 0, best_wave int default 0, play_seconds bigint default 0, updated_at timestamptz);
create table public.map_stats (user_id uuid references auth.users(id) on delete cascade, map_id text, matches int default 0, wins int default 0, kills int default 0,
  play_seconds bigint default 0, best_wave int default 0, best_kills int default 0, best_seconds int default 0, best_at timestamptz default now(), primary key (user_id, map_id));
alter table public.profiles enable row level security; alter table public.player_stats enable row level security; alter table public.map_stats enable row level security;
-- como no Supabase: authenticated tem privilégios padrão em public
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant execute on functions to anon, authenticated;
