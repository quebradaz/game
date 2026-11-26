-- Complemento do mock de amigos para a migração v29_11_coop_online (Postgres local, não é o esquema real completo).
create extension if not exists pgcrypto schema extensions;
alter table public.profiles add column if not exists body smallint;
create table public.progress (user_id uuid primary key references auth.users(id) on delete cascade, data jsonb, ts bigint, updated_at timestamptz default now());
create table public.items_owned (user_id uuid references auth.users(id) on delete cascade, item_id text, source text, created_at timestamptz default now(), primary key (user_id, item_id));
create table public.shop_items (item_id text primary key, rarity int, price_z int, kind text, active boolean default true);
create table public.chest_shop (tier int primary key, name text, price_z int, active boolean default true, reveal boolean default false, daily_limit int, extras int[] not null default '{}');
create table public.chest_pool (tier int references public.chest_shop(tier), rarity int, size int, primary key (tier, rarity));
alter table public.progress enable row level security; alter table public.items_owned enable row level security;
alter table public.shop_items enable row level security; alter table public.chest_shop enable row level security; alter table public.chest_pool enable row level security;
insert into public.chest_shop (tier, name, price_z, extras) values (2, 'Baú raro', 150, '{1,1,1,1}'), (3, 'Baú lendário', 600, '{2,1,1,1}');
insert into public.chest_pool values (2, 2, 10), (2, 1, 12), (3, 3, 8), (3, 2, 10), (3, 1, 12);
