-- Imitação mínima do CRM por cima do mock da compra de Z-Coin (tests/integration/zcoin/mock.sql).
create table public.crm_admins (user_id uuid primary key);
create function public.crm_is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (select 1 from public.crm_admins a where a.user_id = auth.uid()) $$;
create function public.crm_guard() returns void language plpgsql stable security definer set search_path = '' as $$
begin if not public.crm_is_admin() then raise exception 'SEM_ACESSO' using errcode = '42501'; end if; end $$;
create table public.crm_leads (id bigserial primary key, user_id uuid unique);
create table public.crm_events (id bigserial primary key, lead_id bigint not null references public.crm_leads (id), by_admin uuid,
  kind text not null constraint crm_events_kind_check check (kind in ('pedido', 'nota')), body text not null, created_at timestamptz default now());
insert into public.crm_admins values ('00000000-0000-0000-0000-00000000000b');
insert into public.crm_leads (user_id) values ('00000000-0000-0000-0000-00000000000a');
