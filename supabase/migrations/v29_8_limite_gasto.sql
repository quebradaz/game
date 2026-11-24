-- v29.8: compra de Z-Coin com responsabilidade.
--   1. Teto mensal opcional (em reais) que o próprio jogador escolhe. Baixar vale na hora; subir ou tirar
--      só vale depois de uma espera (padrão 72 h), para segurar compra por impulso.
--   2. Idade declarada antes da primeira compra. Menor de 18 recebe aviso de pedir autorização ao responsável
--      e um teto obrigatório (padrão R$ 50, máximo R$ 100 por mês).
--   3. Histórico com todas as compras da conta (zc_orders), com comprovante quando houver.
--   4. Pedido de devolução em até 7 dias depois do pagamento (CDC art. 49, direito de arrependimento).
--      A Z-Coin daquela compra sai da carteira na hora do pedido (para não ser gasta enquanto analisamos).
--      O admin do CRM aprova (e faz o estorno no painel da InfinitePay) ou nega (a Z-Coin volta).
-- Tudo é conferido aqui no servidor: zc_order_open (chamada pela Edge Function) recusa o pedido que
-- estoura o teto, então nenhum aparelho alterado passa por cima.
-- Idempotente: pode rodar de novo sem duplicar nada.

-- ---------- valores ajustáveis (uma linha só)
create table if not exists public.zc_spend_cfg (
  id boolean primary key default true check (id),
  minor_default_cents integer not null default 5000,
  minor_max_cents integer not null default 10000,
  raise_wait interval not null default interval '72 hours',
  refund_days integer not null default 7,
  pending_window interval not null default interval '1 hour'
);
insert into public.zc_spend_cfg (id) values (true) on conflict do nothing;
alter table public.zc_spend_cfg enable row level security;

-- ---------- escolha de cada jogador. next_* = mudança agendada (subir/tirar o teto, menor -> adulto)
create table if not exists public.zc_limits (
  user_id uuid primary key references auth.users (id) on delete cascade,
  age text check (age in ('adult', 'minor')),
  limit_cents integer check (limit_cents is null or limit_cents >= 0),
  next_at timestamptz,
  next_limit_cents integer check (next_limit_cents is null or next_limit_cents >= 0),
  next_age text check (next_age in ('adult', 'minor')),
  updated_at timestamptz not null default now()
);
alter table public.zc_limits enable row level security;

-- ---------- pedidos de devolução
create table if not exists public.zc_refunds (
  id bigserial primary key,
  order_id uuid not null unique references public.zc_orders (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  zcoin integer not null,
  price_cents integer not null,
  reason text,
  status text not null default 'pedido' check (status in ('pedido', 'aprovado', 'negado', 'cancelado')),
  note text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid
);
create index if not exists zc_refunds_status on public.zc_refunds (status, created_at);
alter table public.zc_refunds enable row level security;
-- nenhuma política nas três tabelas: só as funções abaixo leem e escrevem.

-- o CRM passa a registrar devoluções na ficha do lead
do $$ begin
  if to_regclass('public.crm_events') is not null then
    alter table public.crm_events drop constraint if exists crm_events_kind_check;
    alter table public.crm_events add constraint crm_events_kind_check check (kind in ('pedido', 'pagamento', 'falha', 'etapa', 'nota',
      'whatsapp', 'email', 'ligacao', 'retorno', 'remocao', 'devolucao'));
  end if;
end $$;

-- ---------- ajudantes internos
-- início do mês corrente no horário de Brasília
create or replace function public.zc_month_start()
returns timestamptz language sql stable set search_path = '' as $$
  select date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'
$$;

-- aplica a mudança agendada se a espera já passou
create or replace function public.zc_limits_tick(p_uid uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.zc_limits set limit_cents = next_limit_cents, age = coalesce(next_age, age),
      next_at = null, next_limit_cents = null, next_age = null, updated_at = now()
    where user_id = p_uid and next_at is not null and next_at <= now();
end $$;

-- teto que vale agora (null = sem teto). Menor nunca passa do máximo de menor.
create or replace function public.zc_limit_now(p_uid uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select case when l.age = 'minor' then least(coalesce(l.limit_cents, c.minor_max_cents), c.minor_max_cents) else l.limit_cents end
  from public.zc_spend_cfg c left join public.zc_limits l on l.user_id = p_uid
$$;

-- quanto já conta no mês: pagos (menos devoluções em andamento ou aprovadas) + pedidos abertos há pouco
create or replace function public.zc_month_cents(p_uid uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(sum(o.price_cents), 0)::int from public.zc_orders o, public.zc_spend_cfg c
  where o.user_id = p_uid and (
      (o.status = 'paid' and o.paid_at >= public.zc_month_start()
        and not exists (select 1 from public.zc_refunds r where r.order_id = o.id and r.status in ('pedido', 'aprovado')))
      or (o.status = 'pending' and o.created_at > now() - c.pending_window))
$$;

create or replace function public.zc_spend_json(p_uid uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'age', l.age,
    'limit_cents', public.zc_limit_now(p_uid),
    'own_limit_cents', l.limit_cents,
    'next', case when l.next_at is null then null else jsonb_build_object('at', l.next_at, 'limit_cents', l.next_limit_cents, 'age', l.next_age) end,
    'month_cents', public.zc_month_cents(p_uid),
    'month_start', public.zc_month_start(),
    'minor_default_cents', c.minor_default_cents, 'minor_max_cents', c.minor_max_cents,
    'wait_hours', (extract(epoch from c.raise_wait) / 3600)::int, 'refund_days', c.refund_days)
  from public.zc_spend_cfg c left join public.zc_limits l on l.user_id = p_uid
$$;

-- ---------- o jogo (com login)
create or replace function public.zc_spend_info()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  perform public.zc_limits_tick(uid);
  return public.zc_spend_json(uid);
end $$;

-- declara a idade. Primeira vez vale na hora; adulto -> menor vale na hora (mais restrito);
-- menor -> adulto espera o mesmo tempo de subir o teto.
create or replace function public.zc_age_set(p_minor boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); l public.zc_limits; c public.zc_spend_cfg; want text;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  if p_minor is null then raise exception 'IDADE_INVALIDA'; end if;
  want := case when p_minor then 'minor' else 'adult' end;
  select * into c from public.zc_spend_cfg;
  perform public.zc_limits_tick(uid);
  insert into public.zc_limits (user_id) values (uid) on conflict do nothing;
  select * into l from public.zc_limits where user_id = uid for update;
  if l.age is null or want = 'minor' then
    update public.zc_limits set age = want, updated_at = now(),
        limit_cents = case when want = 'minor' then least(coalesce(limit_cents, c.minor_default_cents), c.minor_max_cents) else limit_cents end,
        next_at = case when want = 'minor' then null else next_at end,
        next_limit_cents = case when want = 'minor' then null else next_limit_cents end,
        next_age = case when want = 'minor' then null else next_age end
      where user_id = uid and (age is distinct from want or want = 'minor');
  elsif l.age = 'minor' and want = 'adult' and l.next_age is distinct from 'adult' then
    update public.zc_limits set next_at = now() + c.raise_wait, next_age = 'adult', next_limit_cents = limit_cents, updated_at = now()
      where user_id = uid;
  end if;
  return public.zc_spend_json(uid);
end $$;

-- escolhe o teto (centavos; null = sem teto). Baixar vale na hora; subir/tirar fica agendado.
create or replace function public.zc_limit_set(p_cents integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); l public.zc_limits; c public.zc_spend_cfg; cur integer;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  if p_cents is not null and (p_cents < 0 or p_cents > 1000000) then raise exception 'LIMITE_INVALIDO'; end if;
  select * into c from public.zc_spend_cfg;
  perform public.zc_limits_tick(uid);
  insert into public.zc_limits (user_id) values (uid) on conflict do nothing;
  select * into l from public.zc_limits where user_id = uid for update;
  if (l.age = 'minor' or l.next_age = 'minor') and (p_cents is null or p_cents > c.minor_max_cents) then raise exception 'LIMITE_MENOR'; end if;
  cur := public.zc_limit_now(uid);
  if p_cents is not null and (cur is null or p_cents <= cur) then
    -- mais restrito: vale já e cancela subida agendada do teto (a mudança de idade agendada continua)
    update public.zc_limits set limit_cents = p_cents, updated_at = now(),
        next_limit_cents = case when next_age is not null then p_cents else null end,
        next_at = case when next_age is not null then next_at else null end
      where user_id = uid;
  else
    update public.zc_limits set next_at = now() + c.raise_wait, next_limit_cents = p_cents, updated_at = now()
      where user_id = uid;
  end if;
  return public.zc_spend_json(uid);
end $$;

-- desiste da mudança agendada
create or replace function public.zc_limit_cancel()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  update public.zc_limits set next_at = null, next_limit_cents = null, next_age = null, updated_at = now() where user_id = uid;
  return public.zc_spend_json(uid);
end $$;

-- todas as compras da própria conta, mais novas primeiro
create or replace function public.zc_my_orders(p_limit integer default 100)
returns jsonb language plpgsql security definer set search_path = '' stable as $$
declare uid uuid := auth.uid(); c public.zc_spend_cfg;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  select * into c from public.zc_spend_cfg;
  return coalesce((select jsonb_agg(x order by x->>'created_at' desc) from (
    select jsonb_build_object('id', o.id, 'pack', o.pack_id, 'name', coalesce(p.name, o.pack_id), 'zcoin', o.zcoin,
      'price_cents', o.price_cents, 'status', o.status, 'created_at', o.created_at, 'paid_at', o.paid_at,
      'method', o.capture_method, 'receipt', o.receipt_url,
      'refund_until', case when o.status = 'paid' then o.paid_at + make_interval(days => c.refund_days) end,
      'can_refund', o.status = 'paid' and o.paid_at > now() - make_interval(days => c.refund_days) and r.id is null,
      'refund', case when r.id is null then null else jsonb_build_object('id', r.id, 'status', r.status, 'at', r.created_at, 'note', r.note) end) x
    from public.zc_orders o
    left join public.zc_packs p on p.id = o.pack_id
    left join public.zc_refunds r on r.order_id = o.id
    where o.user_id = uid
    order by o.created_at desc
    limit greatest(1, least(coalesce(p_limit, 100), 500))) q), '[]'::jsonb);
end $$;

-- registra na ficha do lead no CRM, se o CRM existir
create or replace function public.zc_refund_log(p_uid uuid, p_body text, p_admin uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if to_regclass('public.crm_leads') is null then return; end if;
  execute 'insert into public.crm_events (lead_id, kind, body, by_admin) select id, ''devolucao'', $1, $2 from public.crm_leads where user_id = $3'
    using p_body, p_admin, p_uid;
end $$;

-- pede a devolução de uma compra paga há no máximo refund_days dias
create or replace function public.zc_refund_request(p_order uuid, p_reason text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); o public.zc_orders; c public.zc_spend_cfg; bal integer; rid bigint;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  select * into c from public.zc_spend_cfg;
  select * into o from public.zc_orders where id = p_order and user_id = uid for update;
  if o.id is null then raise exception 'PEDIDO_NAO_ENCONTRADO'; end if;
  if o.status <> 'paid' then raise exception 'PEDIDO_NAO_PAGO'; end if;
  if exists (select 1 from public.zc_refunds where order_id = o.id) then raise exception 'DEVOLUCAO_JA_PEDIDA'; end if;
  if o.paid_at <= now() - make_interval(days => c.refund_days) then raise exception 'PRAZO_DEVOLUCAO'; end if;
  select zcoin into bal from public.wallets where user_id = uid for update;
  if coalesce(bal, 0) < o.zcoin then raise exception 'ZCOIN_JA_USADA'; end if;
  perform public.wallet_add(uid, 'zcoin', -o.zcoin, 'devolução pedida', 'rf:' || o.id);
  insert into public.zc_refunds (order_id, user_id, zcoin, price_cents, reason)
    values (o.id, uid, o.zcoin, o.price_cents, nullif(left(btrim(coalesce(p_reason, '')), 300), ''))
    returning id into rid;
  perform public.zc_refund_log(uid, 'Pediu devolução de ' || o.zcoin || ' Z-Coin (R$ ' || to_char(o.price_cents / 100.0, 'FM999990D00') || ')'
    || coalesce(': ' || nullif(left(btrim(coalesce(p_reason, '')), 300), ''), ''), null);
  return jsonb_build_object('ok', true, 'refund', rid, 'zcoin', o.zcoin,
    'wallet', (select w.zcoin from public.wallets w where w.user_id = uid));
end $$;

-- desiste do pedido de devolução enquanto não foi analisado: a Z-Coin volta
create or replace function public.zc_refund_cancel(p_refund bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r public.zc_refunds;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  select * into r from public.zc_refunds where id = p_refund and user_id = uid for update;
  if r.id is null then raise exception 'DEVOLUCAO_NAO_ENCONTRADA'; end if;
  if r.status <> 'pedido' then raise exception 'DEVOLUCAO_JA_ANALISADA'; end if;
  update public.zc_refunds set status = 'cancelado', decided_at = now() where id = r.id;
  perform public.wallet_add(uid, 'zcoin', r.zcoin, 'devolução cancelada', 'rf:' || r.order_id);
  perform public.zc_refund_log(uid, 'Desistiu da devolução (' || r.zcoin || ' Z-Coin voltaram)', null);
  return jsonb_build_object('ok', true, 'wallet', (select w.zcoin from public.wallets w where w.user_id = uid));
end $$;

-- ---------- admin do CRM
create or replace function public.zc_refunds_list(p_status text default null)
returns jsonb language plpgsql security definer set search_path = '' stable as $$
begin
  perform public.crm_guard();
  return coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'order', r.order_id, 'user', r.user_id, 'nome', coalesce(pr.name::text, '(sem nome)'),
      'zcoin', r.zcoin, 'centavos', r.price_cents, 'motivo', r.reason, 'status', r.status, 'nota', r.note,
      'pedido_em', r.created_at, 'pago_em', o.paid_at, 'transacao', o.transaction_nsu, 'metodo', o.capture_method,
      'decidido_em', r.decided_at) order by (r.status = 'pedido') desc, r.created_at desc)
    from public.zc_refunds r join public.zc_orders o on o.id = r.order_id left join public.profiles pr on pr.id = r.user_id
    where p_status is null or r.status = p_status), '[]'::jsonb);
end $$;

-- aprova (o estorno do dinheiro é feito no painel da InfinitePay) ou nega (a Z-Coin volta pra carteira)
create or replace function public.zc_refund_decide(p_refund bigint, p_ok boolean, p_note text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.zc_refunds;
begin
  perform public.crm_guard();
  if p_ok is null then raise exception 'DECISAO_INVALIDA'; end if;
  select * into r from public.zc_refunds where id = p_refund for update;
  if r.id is null then raise exception 'DEVOLUCAO_NAO_ENCONTRADA'; end if;
  if r.status <> 'pedido' then raise exception 'DEVOLUCAO_JA_ANALISADA'; end if;
  update public.zc_refunds set status = case when p_ok then 'aprovado' else 'negado' end,
      note = nullif(left(btrim(coalesce(p_note, '')), 300), ''), decided_at = now(), decided_by = auth.uid()
    where id = r.id;
  if not p_ok then perform public.wallet_add(r.user_id, 'zcoin', r.zcoin, 'devolução negada', 'rf:' || r.order_id); end if;
  perform public.zc_refund_log(r.user_id, case when p_ok then 'Devolução aprovada (estornar R$ ' || to_char(r.price_cents / 100.0, 'FM999990D00') || ' na InfinitePay)'
    else 'Devolução negada, ' || r.zcoin || ' Z-Coin voltaram' end || coalesce(': ' || nullif(left(btrim(coalesce(p_note, '')), 300), ''), ''), auth.uid());
  return jsonb_build_object('ok', true, 'status', case when p_ok then 'aprovado' else 'negado' end);
end $$;

-- ---------- abrir pedido agora confere idade e teto (mesma assinatura: a Edge Function não muda)
create or replace function public.zc_order_open(p_uid uuid, p_pack text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pk public.zc_packs; oid uuid; recent int; lim int; spent int;
begin
  if p_uid is null then raise exception 'SEM_LOGIN'; end if;
  if not exists (select 1 from public.profiles where id = p_uid and name is not null) then raise exception 'SEM_NOME'; end if;
  select * into pk from public.zc_packs where id = p_pack and active;
  if pk.id is null then raise exception 'PACOTE_INVALIDO'; end if;
  -- um pedido por vez por conta para a soma do teto não correr
  perform pg_advisory_xact_lock(hashtext('zc_open:' || p_uid::text));
  perform public.zc_limits_tick(p_uid);
  if not exists (select 1 from public.zc_limits where user_id = p_uid and age is not null) then raise exception 'IDADE_PENDENTE'; end if;
  select count(*) into recent from public.zc_orders
    where user_id = p_uid and status = 'pending' and created_at > now() - interval '1 hour';
  if recent >= 8 then raise exception 'MUITOS_PEDIDOS'; end if;
  lim := public.zc_limit_now(p_uid);
  if lim is not null then
    spent := public.zc_month_cents(p_uid);
    if spent + pk.price_cents > lim then raise exception 'LIMITE_MES'; end if;
  end if;
  insert into public.zc_orders (user_id, pack_id, zcoin, price_cents)
    values (p_uid, pk.id, pk.zcoin + pk.bonus, pk.price_cents) returning id into oid;
  return jsonb_build_object('order', oid, 'price_cents', pk.price_cents, 'zcoin', pk.zcoin + pk.bonus,
    'description', 'Quebrada Z - ' || pk.name || ' (' || (pk.zcoin + pk.bonus) || ' Z-Coin)');
end $$;

-- ---------- permissões
revoke all on function public.zc_month_start() from public, anon, authenticated;
revoke all on function public.zc_limits_tick(uuid) from public, anon, authenticated;
revoke all on function public.zc_limit_now(uuid) from public, anon, authenticated;
revoke all on function public.zc_month_cents(uuid) from public, anon, authenticated;
revoke all on function public.zc_spend_json(uuid) from public, anon, authenticated;
revoke all on function public.zc_refund_log(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.zc_order_open(uuid, text) from public, anon, authenticated;
grant execute on function public.zc_order_open(uuid, text) to service_role;
revoke all on function public.zc_spend_info() from public, anon;
revoke all on function public.zc_age_set(boolean) from public, anon;
revoke all on function public.zc_limit_set(integer) from public, anon;
revoke all on function public.zc_limit_cancel() from public, anon;
revoke all on function public.zc_my_orders(integer) from public, anon;
revoke all on function public.zc_refund_request(uuid, text) from public, anon;
revoke all on function public.zc_refund_cancel(bigint) from public, anon;
revoke all on function public.zc_refunds_list(text) from public, anon;
revoke all on function public.zc_refund_decide(bigint, boolean, text) from public, anon;
grant execute on function public.zc_spend_info(), public.zc_age_set(boolean), public.zc_limit_set(integer), public.zc_limit_cancel(),
  public.zc_my_orders(integer), public.zc_refund_request(uuid, text), public.zc_refund_cancel(bigint),
  public.zc_refunds_list(text), public.zc_refund_decide(bigint, boolean, text) to authenticated;
