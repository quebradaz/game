-- v29: venda de Z-Coin pelo checkout integrado da InfinitePay, com crédito automático.
--
-- Fluxo (quem decide é sempre o servidor; o jogo só pergunta o resultado):
--   1. O jogo chama a Edge Function `zcoin-checkout` (com login) pedindo um pacote.
--   2. A função abre um pedido aqui (zc_order_open), cria o link na InfinitePay com o preço DESTA tabela
--      e o código do pedido como order_nsu, e devolve o endereço do checkout.
--   3. O jogador paga (cartão ou Pix) na página da InfinitePay e volta ao jogo pelo redirect_url.
--   4. A InfinitePay avisa a Edge Function `zcoin-webhook`; o jogo também pede a confirmação ao voltar.
--      Nos dois caminhos a função pergunta à InfinitePay (/payment_check) se o pagamento existe e está pago.
--      Só então chama zc_order_pay, que credita uma única vez e lança no ledger.
--   5. O jogo consulta zc_order_status até ver "paid" e mostra "compra aprovada".
--
-- Por que não confiar no jogo: o endereço de volta e qualquer dado que o aparelho mande podem ser forjados.
-- O que vale é a resposta da InfinitePay ao servidor, casada com o pedido aberto aqui (código, valor, data).

-- ---------- pacotes (preço em centavos; a fonte da verdade é aqui, não o jogo)
create table if not exists public.zc_packs (
  id text primary key,
  name text not null,
  zcoin integer not null check (zcoin > 0),
  bonus integer not null default 0 check (bonus >= 0),
  price_cents integer not null check (price_cents >= 100),
  sort smallint not null default 0,
  active boolean not null default true
);
alter table public.zc_packs enable row level security;

insert into public.zc_packs (id, name, zcoin, bonus, price_cents, sort) values
  ('punhado', 'Punhado', 100, 0, 490, 1),
  ('saco', 'Saco', 300, 30, 1290, 2),
  ('mochila', 'Mochila', 650, 100, 2490, 3),
  ('cofre', 'Cofre', 1400, 300, 4990, 4)
on conflict (id) do update set name = excluded.name, zcoin = excluded.zcoin, bonus = excluded.bonus,
  price_cents = excluded.price_cents, sort = excluded.sort;

-- ---------- pedidos. id = order_nsu enviado à InfinitePay
create table if not exists public.zc_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pack_id text not null references public.zc_packs (id),
  zcoin integer not null,
  price_cents integer not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  checkout_url text,
  invoice_slug text,
  transaction_nsu text unique,
  paid_amount integer,
  capture_method text,
  receipt_url text,
  paid_via text,
  fail_reason text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
create index if not exists zc_orders_user on public.zc_orders (user_id, created_at desc);
alter table public.zc_orders enable row level security;
-- nenhuma política: o jogo não lê nem escreve direto.

-- ---------- abre um pedido (só a Edge Function, com a chave de serviço)
create or replace function public.zc_order_open(p_uid uuid, p_pack text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare pk public.zc_packs; oid uuid; recent int;
begin
  if p_uid is null then raise exception 'SEM_LOGIN'; end if;
  if not exists (select 1 from public.profiles where id = p_uid and name is not null) then raise exception 'SEM_NOME'; end if;
  select * into pk from public.zc_packs where id = p_pack and active;
  if pk.id is null then raise exception 'PACOTE_INVALIDO'; end if;
  select count(*) into recent from public.zc_orders
    where user_id = p_uid and status = 'pending' and created_at > now() - interval '1 hour';
  if recent >= 8 then raise exception 'MUITOS_PEDIDOS'; end if;
  insert into public.zc_orders (user_id, pack_id, zcoin, price_cents)
    values (p_uid, pk.id, pk.zcoin + pk.bonus, pk.price_cents) returning id into oid;
  return jsonb_build_object('order', oid, 'price_cents', pk.price_cents, 'zcoin', pk.zcoin + pk.bonus,
    'description', 'Quebrada Z - ' || pk.name || ' (' || (pk.zcoin + pk.bonus) || ' Z-Coin)');
end $$;

create or replace function public.zc_order_set_url(p_order uuid, p_url text)
returns void language sql security definer set search_path = '' as $$
  update public.zc_orders set checkout_url = p_url where id = p_order and status = 'pending';
$$;

-- ---------- credita um pedido pago. Chamada só depois que a InfinitePay confirmou em /payment_check.
-- Idempotente: o mesmo pedido ou a mesma transação nunca creditam duas vezes.
create or replace function public.zc_order_pay(p_order uuid, p_tx text, p_slug text, p_amount integer,
  p_paid_amount integer, p_method text, p_receipt text, p_via text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare o public.zc_orders;
begin
  select * into o from public.zc_orders where id = p_order for update;
  if o.id is null then raise exception 'PEDIDO_NAO_ENCONTRADO'; end if;
  if o.status = 'paid' then
    return jsonb_build_object('ok', true, 'already', true, 'zcoin', o.zcoin);
  end if;
  if p_tx is null or length(p_tx) < 6 then raise exception 'TRANSACAO_INVALIDA'; end if;
  if exists (select 1 from public.zc_orders where transaction_nsu = p_tx and id <> p_order) then
    raise exception 'TRANSACAO_DE_OUTRO_PEDIDO';
  end if;
  -- o valor cobrado tem de ser o preço do pedido; paid_amount pode ser maior (juros do parcelamento)
  if p_amount is distinct from o.price_cents or coalesce(p_paid_amount, 0) < o.price_cents then
    update public.zc_orders set status = 'failed', fail_reason = 'valor ' || coalesce(p_amount::text, '?') || '/' || coalesce(p_paid_amount::text, '?')
      where id = p_order;
    return jsonb_build_object('ok', false, 'error', 'VALOR_DIFERENTE');
  end if;
  update public.zc_orders set status = 'paid', transaction_nsu = p_tx, invoice_slug = p_slug, paid_amount = p_paid_amount,
    capture_method = p_method, receipt_url = p_receipt, paid_via = p_via, paid_at = now()
    where id = p_order;
  perform public.wallet_add(o.user_id, 'zcoin', o.zcoin, 'compra InfinitePay', 'ip:' || p_tx);
  return jsonb_build_object('ok', true, 'already', false, 'zcoin', o.zcoin);
end $$;

-- ---------- o jogo pergunta como está o próprio pedido (com login)
create or replace function public.zc_order_status(p_order uuid)
returns jsonb language sql security definer set search_path = '' stable as $$
  select coalesce((select jsonb_build_object('status', o.status, 'zcoin', o.zcoin, 'pack', o.pack_id,
      'created_at', o.created_at, 'paid_at', o.paid_at,
      'wallet', (select w.zcoin from public.wallets w where w.user_id = o.user_id))
    from public.zc_orders o where o.id = p_order and o.user_id = auth.uid()),
    jsonb_build_object('status', 'unknown'));
$$;

-- ---------- pacotes que o jogo mostra (nome, Z-Coin, preço)
create or replace function public.zc_packs_list()
returns jsonb language sql security definer set search_path = '' stable as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'zcoin', zcoin, 'bonus', bonus, 'price_cents', price_cents) order by sort), '[]'::jsonb)
  from public.zc_packs where active;
$$;

revoke all on function public.zc_order_open(uuid, text) from public, anon, authenticated;
revoke all on function public.zc_order_set_url(uuid, text) from public, anon, authenticated;
revoke all on function public.zc_order_pay(uuid, text, text, integer, integer, text, text, text) from public, anon, authenticated;
grant execute on function public.zc_order_open(uuid, text) to service_role;
grant execute on function public.zc_order_set_url(uuid, text) to service_role;
grant execute on function public.zc_order_pay(uuid, text, text, integer, integer, text, text, text) to service_role;
revoke all on function public.zc_order_status(uuid) from public, anon;
grant execute on function public.zc_order_status(uuid) to authenticated;
revoke all on function public.zc_packs_list() from public;
grant execute on function public.zc_packs_list() to anon, authenticated;
