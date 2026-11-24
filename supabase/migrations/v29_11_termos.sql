-- v29.11: termos de uso e proteção legal.
--   1. Aceite dos Termos de Uso e da Política de Privacidade guardado no servidor, por versão, com a hora do
--      servidor (prova de que a pessoa aceitou aquela versão). O jogo pede o aceite de novo quando a versão muda.
--   2. Baú de sorteio pago (chest_shop.reveal = false) só para quem declarou 18 anos ou mais.
--      ECA Digital (Lei 15.211/2025): proíbe caixa de recompensa paga em jogo acessível a criança e adolescente.
--      Quem ainda não declarou a idade recebe IDADE_PENDENTE_BAU (o jogo pergunta a idade e tenta de novo);
--      menor recebe BAU_SO_ADULTO. Baú à mostra (reveal = true) não tem sorteio e segue liberado para todos.
--      Para desligar a trava (não recomendado): update public.legal_cfg set chest_minor_block = false;
--   3. Quem exclui a própria conta no jogo (Edge Function delete-account) some também do CRM: o lead perde
--      nome e e-mail e as notas de contato são apagadas, como já fazia o "apagar" do CRM. Antes ficavam lá
--      (crm_leads.user_id só virava null). Os valores das compras continuam, sem ninguém ligado a eles.
-- Depende de v29_5_crm (crm_leads), v29_7_baus_5_itens (boxes.tier, chest_shop) e v29_8_limite_gasto (zc_limits.age).
-- Idempotente: pode rodar de novo sem duplicar nada.

-- ---------- valores ajustáveis (uma linha só)
create table if not exists public.legal_cfg (
  id boolean primary key default true check (id),
  terms_version text not null default '2026-11-24',
  chest_minor_block boolean not null default true
);
insert into public.legal_cfg (id) values (true) on conflict do nothing;
alter table public.legal_cfg enable row level security;

-- ---------- aceites (um por conta e versão). Some junto com a conta (LGPD: exclusão a pedido).
create table if not exists public.terms_accept (
  user_id uuid not null references public.profiles (id) on delete cascade,
  version text not null check (version ~ '^\d{4}-\d{2}-\d{2}$'),
  age_ok boolean not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, version)
);
alter table public.terms_accept enable row level security;

-- versão em vigor e se esta conta já aceitou
create or replace function public.terms_status()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'version', c.terms_version,
    'accepted', exists (select 1 from public.terms_accept a where a.user_id = auth.uid() and a.version = c.terms_version),
    'accepted_at', (select a.accepted_at from public.terms_accept a where a.user_id = auth.uid() and a.version = c.terms_version))
  from public.legal_cfg c $$;

-- grava o aceite. Só a versão em vigor (aparelho com jogo velho não grava aceite de texto antigo).
create or replace function public.terms_accept(p_version text, p_age_ok boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); v text;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  select terms_version into v from public.legal_cfg;
  if p_version is distinct from v then raise exception 'TERMOS_DESATUALIZADOS'; end if;
  if p_age_ok is not true then raise exception 'TERMOS_IDADE'; end if;
  insert into public.terms_accept (user_id, version, age_ok) values (uid, v, true)
    on conflict (user_id, version) do nothing;
  return public.terms_status();
end $$;

-- ---------- trava do baú de sorteio para menor (gatilho: não reescreve buy_chest)
-- buy_chest grava a compra em boxes (source = 'loja', tier); o erro aqui desfaz a compra inteira, Z-Coin incluída.
create or replace function public.chest_minor_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare blk boolean; rev boolean; a text;
begin
  if new.source <> 'loja' or new.tier is null then return new; end if;
  select chest_minor_block into blk from public.legal_cfg;
  if blk is not true then return new; end if;
  select reveal into rev from public.chest_shop where tier = new.tier;
  if rev is not false then return new; end if;
  select age into a from public.zc_limits where user_id = new.user_id;
  if a is null then raise exception 'IDADE_PENDENTE_BAU'; end if;
  if a <> 'adult' then raise exception 'BAU_SO_ADULTO'; end if;
  return new;
end $$;
drop trigger if exists chest_minor_guard on public.boxes;
create trigger chest_minor_guard before insert on public.boxes for each row execute function public.chest_minor_guard();

-- ---------- conta apagada -> lead anonimizado (o "on delete set null" de crm_leads.user_id passa por aqui)
create or replace function public.crm_lead_forget()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.user_id is not null and new.user_id is null and new.removed_at is null then
    new.name := 'Jogador removido';
    new.email := null;
    new.follow_up := null;
    new.removed_at := now();
    new.updated_at := now();
    update public.crm_events set body = '[removido junto com o perfil]'
      where lead_id = new.id and kind in ('nota', 'whatsapp', 'email', 'ligacao');
    insert into public.crm_events (lead_id, kind, body) values (new.id, 'remocao', 'Jogador excluiu a conta. Dados pessoais removidos; valores mantidos.');
  end if;
  return new;
end $$;
drop trigger if exists crm_lead_forget on public.crm_leads;
create trigger crm_lead_forget before update of user_id on public.crm_leads for each row execute function public.crm_lead_forget();

revoke all on function public.crm_lead_forget() from public, anon, authenticated;
revoke all on function public.terms_status() from public, anon;
revoke all on function public.terms_accept(text, boolean) from public, anon;
revoke all on function public.chest_minor_guard() from public, anon, authenticated;
grant execute on function public.terms_status(), public.terms_accept(text, boolean) to authenticated;
