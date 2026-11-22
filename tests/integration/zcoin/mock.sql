-- Imitação mínima do Supabase + carteira/ledger reais (wallet_add copiada do banco) para testar v29_zcoin_checkout.
do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin; exception when duplicate_object then null; end $$;
create extension if not exists citext;
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('qz.uid', true), '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;
create table public.profiles (id uuid primary key references auth.users(id) on delete cascade, name citext unique);
create table public.wallets (user_id uuid primary key, chips int not null default 0, coins int not null default 0, zcoin int not null default 0, updated_at timestamptz);
create table public.ledger (id bigserial primary key, user_id uuid, currency text, delta int, reason text, ref text, run_id bigint, created_at timestamptz default now());
create function public.wallet_add(p_uid uuid, p_cur text, p_delta integer, p_reason text, p_ref text default null, p_run bigint default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_delta = 0 then return; end if;
  insert into public.wallets (user_id) values (p_uid) on conflict do nothing;
  if p_cur = 'zcoin' then update public.wallets set zcoin = zcoin + p_delta, updated_at = now() where user_id = p_uid;
  else raise exception 'MOEDA_INVALIDA'; end if;
  insert into public.ledger (user_id, currency, delta, reason, ref, run_id) values (p_uid, p_cur, p_delta, p_reason, p_ref, p_run);
end $$;
alter default privileges in schema public grant execute on functions to anon, authenticated;
insert into auth.users values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b'), ('00000000-0000-0000-0000-00000000000c');
insert into public.profiles values ('00000000-0000-0000-0000-00000000000a', 'Ana'), ('00000000-0000-0000-0000-00000000000b', 'Beto'), ('00000000-0000-0000-0000-00000000000c', null);
