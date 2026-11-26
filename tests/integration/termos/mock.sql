-- Imitação mínima de zc_limits (v29_8_limite_gasto) por cima do esboço dos baús: só a idade importa aqui.
create table if not exists public.zc_limits (user_id uuid primary key, age text check (age in ('adult', 'minor')));
-- Imitação mínima do CRM (v29_5_crm): o lead perde o dono quando a conta some.
create table if not exists public.crm_leads (id bigserial primary key, user_id uuid unique references public.profiles (id) on delete set null,
  name text, email text, paid_cents integer not null default 0, follow_up date, removed_at timestamptz, updated_at timestamptz default now());
create table if not exists public.crm_events (id bigserial primary key, lead_id bigint not null references public.crm_leads (id) on delete cascade,
  by_admin uuid, kind text not null check (kind in ('pedido', 'pagamento', 'falha', 'etapa', 'nota', 'whatsapp', 'email', 'ligacao', 'retorno', 'remocao')),
  body text not null, created_at timestamptz default now());
