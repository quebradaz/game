-- v29.5: CRM dos jogadores (página /crm). Só administradores entram.
--
-- Segurança: o repositório é público e a página /crm também. Quem decide se a pessoa é admin é o banco,
-- nunca a página: toda função crm_* confere auth.uid() em crm_admins e para com SEM_ACESSO se não for.
-- As tabelas novas têm RLS ligada e nenhuma política, então ninguém lê ou escreve direto pela API.
--
-- Funil: quando um jogador abre um pedido de Z-Coin (zc_orders), ele vira lead. O pagamento aprovado
-- move o lead sozinho para "Comprou" e, na segunda compra, para "Comprou de novo". As outras etapas
-- (boas-vindas, VIP, desistiu) o admin move à mão. Cada mudança fica no histórico do lead.
--
-- O lead guarda uma cópia do nome, e-mail e valores. Se o perfil for apagado, o lead fica anonimizado
-- ("Jogador removido") e os valores continuam contando no faturamento.
--
-- Admin: não vai neste arquivo (o repositório é público). Depois de aplicar, rode no SQL Editor:
--   insert into public.crm_admins (user_id) select id from auth.users where email = '<seu e-mail>';

-- ---------- quem pode entrar no CRM
create table if not exists public.crm_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.crm_admins enable row level security;

create or replace function public.crm_is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (select 1 from public.crm_admins a where a.user_id = auth.uid())
$$;

create or replace function public.crm_guard()
returns void language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.crm_is_admin() then raise exception 'SEM_ACESSO' using errcode = '42501'; end if;
end $$;

-- ---------- leads (um por jogador comprador) e histórico
create table if not exists public.crm_leads (
  id bigserial primary key,
  user_id uuid unique references auth.users (id) on delete set null,
  name text,
  email text,
  stage text not null default 'checkout'
    check (stage in ('checkout', 'comprou', 'boas_vindas', 'recorrente', 'vip', 'perdido')),
  orders integer not null default 0,
  paid_orders integer not null default 0,
  paid_cents integer not null default 0,
  first_order_at timestamptz,
  last_order_at timestamptz,
  last_paid_at timestamptz,
  follow_up date,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists crm_leads_stage on public.crm_leads (stage, updated_at desc);
alter table public.crm_leads enable row level security;

create table if not exists public.crm_events (
  id bigserial primary key,
  lead_id bigint not null references public.crm_leads (id) on delete cascade,
  kind text not null check (kind in ('pedido', 'pagamento', 'falha', 'etapa', 'nota', 'whatsapp', 'email', 'ligacao', 'retorno', 'remocao')),
  body text not null,
  by_admin uuid,
  created_at timestamptz not null default now()
);
create index if not exists crm_events_lead on public.crm_events (lead_id, created_at desc);
alter table public.crm_events enable row level security;

-- registro de exclusões feitas pelo CRM (quem apagou, quando; sem dado pessoal do jogador)
create table if not exists public.crm_audit (
  id bigserial primary key,
  admin_id uuid,
  action text not null,
  target uuid,
  detail text,
  created_at timestamptz not null default now()
);
alter table public.crm_audit enable row level security;

create or replace function public.crm_stage_label(p text)
returns text language sql immutable set search_path = '' as $$
  select case p when 'checkout' then 'Abriu o checkout' when 'comprou' then 'Comprou' when 'boas_vindas' then 'Boas-vindas'
    when 'recorrente' then 'Comprou de novo' when 'vip' then 'VIP' when 'perdido' then 'Desistiu' else p end
$$;

-- ---------- gatilho: cada pedido de Z-Coin alimenta o lead
create or replace function public.crm_on_order()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  l public.crm_leads;
  nm text; em text; brl text;
begin
  select p.name::text into nm from public.profiles p where p.id = new.user_id;
  select u.email::text into em from auth.users u where u.id = new.user_id;
  brl := 'R$ ' || replace(to_char(new.price_cents / 100.0, 'FM999999990.00'), '.', ',');

  insert into public.crm_leads (user_id, name, email, first_order_at)
  values (new.user_id, nm, em, new.created_at)
  on conflict (user_id) do update set name = coalesce(excluded.name, crm_leads.name), email = coalesce(excluded.email, crm_leads.email)
  returning * into l;

  if tg_op = 'INSERT' then
    update public.crm_leads set orders = orders + 1, last_order_at = new.created_at, updated_at = now() where id = l.id;
    insert into public.crm_events (lead_id, kind, body)
      values (l.id, 'pedido', 'Abriu o checkout: ' || new.zcoin || ' Z-Coin (' || new.pack_id || '), ' || brl);
  end if;

  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid') then
    update public.crm_leads set paid_orders = paid_orders + 1, paid_cents = paid_cents + coalesce(new.paid_amount, new.price_cents),
      last_paid_at = coalesce(new.paid_at, now()), updated_at = now() where id = l.id
      returning * into l;
    insert into public.crm_events (lead_id, kind, body)
      values (l.id, 'pagamento', 'Pagamento aprovado: ' || new.zcoin || ' Z-Coin, ' || brl || coalesce(' via ' || new.capture_method, ''));
    if l.stage in ('checkout', 'perdido') then
      update public.crm_leads set stage = 'comprou' where id = l.id;
      insert into public.crm_events (lead_id, kind, body) values (l.id, 'etapa', 'Etapa: ' || public.crm_stage_label(l.stage) || ' → Comprou (automático)');
    elsif l.paid_orders >= 2 and l.stage in ('comprou', 'boas_vindas') then
      update public.crm_leads set stage = 'recorrente' where id = l.id;
      insert into public.crm_events (lead_id, kind, body) values (l.id, 'etapa', 'Etapa: ' || public.crm_stage_label(l.stage) || ' → Comprou de novo (automático)');
    end if;
  elsif new.status = 'failed' and tg_op = 'UPDATE' and old.status is distinct from 'failed' then
    insert into public.crm_events (lead_id, kind, body)
      values (l.id, 'falha', 'Pagamento recusado ou divergente' || coalesce(': ' || new.fail_reason, ''));
  end if;
  return new;
end $$;
revoke all on function public.crm_on_order() from public, anon, authenticated;

drop trigger if exists crm_on_order on public.zc_orders;
create trigger crm_on_order after insert or update of status on public.zc_orders
  for each row execute function public.crm_on_order();

-- pedidos que já existiam viram leads (roda uma vez; depois o gatilho cuida)
do $$
declare o record;
begin
  if not exists (select 1 from public.crm_leads) then
    for o in select * from public.zc_orders order by created_at loop
      insert into public.crm_leads (user_id, name, email, first_order_at, orders, last_order_at)
      select o.user_id, p.name::text, u.email::text, o.created_at, 0, o.created_at
        from auth.users u left join public.profiles p on p.id = u.id where u.id = o.user_id
      on conflict (user_id) do nothing;
      update public.crm_leads set orders = orders + 1, last_order_at = o.created_at,
        paid_orders = paid_orders + (o.status = 'paid')::int,
        paid_cents = paid_cents + case when o.status = 'paid' then coalesce(o.paid_amount, o.price_cents) else 0 end,
        last_paid_at = case when o.status = 'paid' then coalesce(o.paid_at, o.created_at) else last_paid_at end
        where user_id = o.user_id;
    end loop;
    update public.crm_leads set stage = case when paid_orders >= 2 then 'recorrente' when paid_orders = 1 then 'comprou' else 'checkout' end;
    insert into public.crm_events (lead_id, kind, body) select id, 'nota', 'Lead criado a partir dos pedidos que já existiam' from public.crm_leads;
  end if;
end $$;

-- ---------- funções do CRM (todas exigem admin)

create or replace function public.crm_me()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'SEM_LOGIN' using errcode = '42501'; end if;
  return jsonb_build_object('admin', public.crm_is_admin(),
    'email', (select u.email from auth.users u where u.id = auth.uid()),
    'name', (select p.name from public.profiles p where p.id = auth.uid()));
end $$;

create or replace function public.crm_resumo()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb;
begin
  perform public.crm_guard();
  select jsonb_build_object(
    'jogadores', (select count(*) from public.profiles),
    'novos_7d', (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'ativos_7d', (select count(*) from public.profiles where last_seen > now() - interval '7 days'),
    'ativos_hoje', (select count(*) from public.profiles where last_seen > now() - interval '1 day'),
    'partidas_7d', (select count(*) from public.runs where started_at > now() - interval '7 days'),
    'leads_abertos', (select count(*) from public.crm_leads where stage <> 'perdido' and removed_at is null),
    'compradores', (select count(*) from public.crm_leads where paid_orders > 0),
    'receita_mes', (select coalesce(sum(coalesce(paid_amount, price_cents)), 0) from public.zc_orders where status = 'paid' and paid_at >= date_trunc('month', now())),
    'receita_total', (select coalesce(sum(paid_cents), 0) from public.crm_leads),
    'pendentes', (select count(*) from public.zc_orders where status = 'pending'),
    'retornos_hoje', (select count(*) from public.crm_leads where follow_up <= current_date and stage <> 'perdido'),
    'etapas', (select coalesce(jsonb_object_agg(stage, n), '{}') from (select stage, count(*) n from public.crm_leads group by stage) s),
    'cadastros_14d', (select coalesce(jsonb_agg(jsonb_build_object('dia', d::date, 'n',
        (select count(*) from public.profiles p where p.created_at >= d and p.created_at < d + interval '1 day')) order by d), '[]')
      from generate_series(current_date - 13, current_date, interval '1 day') d),
    'ultimas_compras', (select coalesce(jsonb_agg(x order by x->>'quando' desc), '[]') from (
        select jsonb_build_object('lead', l.id, 'nome', coalesce(l.name, 'sem nome'), 'zcoin', o.zcoin, 'centavos', coalesce(o.paid_amount, o.price_cents),
          'status', o.status, 'quando', coalesce(o.paid_at, o.created_at)) x
        from public.zc_orders o left join public.crm_leads l on l.user_id = o.user_id
        order by coalesce(o.paid_at, o.created_at) desc limit 8) t)
  ) into r;
  return r;
end $$;

-- lista com pesquisa por nome, e-mail ou código; p_ordem: recentes | ativos | nivel | gasto | nome
create or replace function public.crm_jogadores(p_busca text default '', p_ordem text default 'recentes', p_limite integer default 50, p_offset integer default 0)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare q text := nullif(btrim(coalesce(p_busca, '')), ''); r jsonb; tot integer;
begin
  perform public.crm_guard();
  p_limite := least(greatest(coalesce(p_limite, 50), 1), 200);
  p_offset := greatest(coalesce(p_offset, 0), 0);
  with base as (
    select p.id, p.name::text nome, u.email::text email, p.created_at, p.last_seen, coalesce(w.char_level, 1) nivel,
      coalesce(w.coins, 0) moedas, coalesce(w.zcoin, 0) zcoin, coalesce(w.chips, 0) chips,
      coalesce(s.matches, 0) partidas, coalesce(s.best_wave, 0) melhor_onda, coalesce(s.play_seconds, 0) segundos,
      coalesce(l.paid_cents, 0) gasto, l.stage etapa, l.id lead
    from public.profiles p
    join auth.users u on u.id = p.id
    left join public.wallets w on w.user_id = p.id
    left join public.player_stats s on s.user_id = p.id
    left join public.crm_leads l on l.user_id = p.id
    where q is null or p.name::text ilike '%' || q || '%' or u.email::text ilike '%' || q || '%' or p.id::text ilike q || '%'
  )
  select (select count(*) from base),
    coalesce((select jsonb_agg(to_jsonb(b)) from (
      select * from base order by
        case when p_ordem = 'nome' then lower(nome) end asc nulls last,
        case when p_ordem = 'ativos' then last_seen end desc nulls last,
        case when p_ordem = 'nivel' then nivel end desc,
        case when p_ordem = 'gasto' then gasto end desc,
        created_at desc
      limit p_limite offset p_offset) b), '[]')
  into tot, r;
  return jsonb_build_object('total', tot, 'linhas', r);
end $$;

-- ficha completa de um jogador
create or replace function public.crm_jogador(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare r jsonb; lid bigint;
begin
  perform public.crm_guard();
  if not exists (select 1 from public.profiles where id = p_id) then raise exception 'NAO_ENCONTRADO'; end if;
  select id into lid from public.crm_leads where user_id = p_id;
  select jsonb_build_object(
    'perfil', (select jsonb_build_object('id', p.id, 'nome', p.name, 'criado', p.created_at, 'visto', p.last_seen, 'trocas_nome', p.name_changes,
        'corpo', p.body, 'email', u.email, 'provedor', u.raw_app_meta_data->>'provider', 'ultimo_login', u.last_sign_in_at,
        'admin', exists (select 1 from public.crm_admins a where a.user_id = p.id))
      from public.profiles p join auth.users u on u.id = p.id where p.id = p_id),
    'carteira', (select to_jsonb(w) - 'user_id' from public.wallets w where w.user_id = p_id),
    'estatisticas', (select to_jsonb(s) - 'user_id' from public.player_stats s where s.user_id = p_id),
    'passe', (select jsonb_build_object('temporada', pp.season, 'xp', pp.xp, 'premium', pp.premium,
        'resgates', coalesce(array_length(pp.claimed_free, 1), 0) + coalesce(array_length(pp.claimed_prem, 1), 0))
      from public.pass_progress pp where pp.user_id = p_id order by pp.season desc limit 1),
    'itens', (select count(*) from public.items_owned where user_id = p_id),
    'amigos', (select count(*) from public.friendships where status = 'accepted' and (user_low = p_id or user_high = p_id)),
    'mapas', (select coalesce(jsonb_agg(jsonb_build_object('mapa', m.map_id, 'partidas', m.matches, 'vitorias', m.wins, 'melhor_onda', m.best_wave) order by m.matches desc), '[]')
      from public.map_stats m where m.user_id = p_id),
    'partidas', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('mapa', r.map_id, 'inicio', r.started_at, 'onda', r.wave, 'abates', r.kills,
        'segundos', r.seconds, 'venceu', r.won, 'aceita', r.accepted, 'motivo', r.reason) x
      from public.runs r where r.user_id = p_id order by r.started_at desc limit 10) t),
    'extrato', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('moeda', g.currency, 'valor', g.delta, 'motivo', g.reason, 'quando', g.created_at) x
      from public.ledger g where g.user_id = p_id order by g.created_at desc limit 25) t),
    'pedidos', (select coalesce(jsonb_agg(x), '[]') from (select jsonb_build_object('id', o.id, 'pacote', o.pack_id, 'zcoin', o.zcoin, 'centavos', o.price_cents,
        'status', o.status, 'quando', o.created_at, 'pago', o.paid_at, 'metodo', o.capture_method, 'motivo', o.fail_reason) x
      from public.zc_orders o where o.user_id = p_id order by o.created_at desc limit 25) t),
    'lead', case when lid is null then null else public.crm_lead_json(lid) end
  ) into r;
  return r;
end $$;

create or replace function public.crm_lead_json(p_lead bigint)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', l.id, 'user_id', l.user_id, 'nome', coalesce(l.name, 'sem nome'), 'email', l.email, 'etapa', l.stage,
    'pedidos', l.orders, 'pagos', l.paid_orders, 'centavos', l.paid_cents, 'primeiro', l.first_order_at, 'ultimo', l.last_order_at,
    'ultimo_pago', l.last_paid_at, 'retorno', l.follow_up, 'removido', l.removed_at, 'atualizado', l.updated_at,
    'historico', (select coalesce(jsonb_agg(jsonb_build_object('tipo', e.kind, 'texto', e.body, 'quando', e.created_at) order by e.created_at desc, e.id desc), '[]')
      from public.crm_events e where e.lead_id = l.id))
  from public.crm_leads l where l.id = p_lead
$$;
revoke all on function public.crm_lead_json(bigint) from public, anon, authenticated;

create or replace function public.crm_lead(p_lead bigint)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.crm_guard();
  if not exists (select 1 from public.crm_leads where id = p_lead) then raise exception 'NAO_ENCONTRADO'; end if;
  return public.crm_lead_json(p_lead);
end $$;

-- funil: todos os leads (sem histórico, que vem em crm_lead)
create or replace function public.crm_leads_lista()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.crm_guard();
  return coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'user_id', l.user_id, 'nome', coalesce(l.name, 'sem nome'), 'email', l.email,
      'etapa', l.stage, 'pedidos', l.orders, 'pagos', l.paid_orders, 'centavos', l.paid_cents, 'ultimo', l.last_order_at,
      'retorno', l.follow_up, 'removido', l.removed_at) order by l.updated_at desc)
    from public.crm_leads l), '[]');
end $$;

create or replace function public.crm_lead_etapa(p_lead bigint, p_etapa text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare old text;
begin
  perform public.crm_guard();
  if p_etapa not in ('checkout', 'comprou', 'boas_vindas', 'recorrente', 'vip', 'perdido') then raise exception 'ETAPA_INVALIDA'; end if;
  select stage into old from public.crm_leads where id = p_lead for update;
  if not found then raise exception 'NAO_ENCONTRADO'; end if;
  if old is distinct from p_etapa then
    update public.crm_leads set stage = p_etapa, updated_at = now(),
      follow_up = case when p_etapa = 'perdido' then null else follow_up end where id = p_lead;
    insert into public.crm_events (lead_id, kind, body, by_admin)
      values (p_lead, 'etapa', 'Etapa: ' || public.crm_stage_label(old) || ' → ' || public.crm_stage_label(p_etapa), auth.uid());
  end if;
  return public.crm_lead_json(p_lead);
end $$;

create or replace function public.crm_lead_nota(p_lead bigint, p_tipo text, p_texto text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare t text := btrim(coalesce(p_texto, ''));
begin
  perform public.crm_guard();
  if p_tipo not in ('nota', 'whatsapp', 'email', 'ligacao') then raise exception 'TIPO_INVALIDO'; end if;
  if length(t) < 1 or length(t) > 2000 then raise exception 'TEXTO_INVALIDO'; end if;
  if not exists (select 1 from public.crm_leads where id = p_lead) then raise exception 'NAO_ENCONTRADO'; end if;
  insert into public.crm_events (lead_id, kind, body, by_admin) values (p_lead, p_tipo, t, auth.uid());
  update public.crm_leads set updated_at = now() where id = p_lead;
  return public.crm_lead_json(p_lead);
end $$;

create or replace function public.crm_lead_retorno(p_lead bigint, p_data date)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform public.crm_guard();
  update public.crm_leads set follow_up = p_data, updated_at = now() where id = p_lead;
  if not found then raise exception 'NAO_ENCONTRADO'; end if;
  insert into public.crm_events (lead_id, kind, body, by_admin)
    values (p_lead, 'retorno', case when p_data is null then 'Retorno desmarcado' else 'Retorno marcado para ' || to_char(p_data, 'DD/MM/YYYY') end, auth.uid());
  return public.crm_lead_json(p_lead);
end $$;

-- apaga o perfil de vez. Precisa digitar o nome do jogador (ou "APAGAR" se ele não tiver nome).
-- Apaga a conta no Auth; perfil, save, carteira, itens, partidas, amigos e pedidos saem em cascata
-- (o mesmo caminho da Edge Function delete-account). O lead fica anonimizado e os valores continuam.
create or replace function public.crm_apagar_jogador(p_id uuid, p_confirmacao text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare nm text; lid bigint;
begin
  perform public.crm_guard();
  if p_id = auth.uid() then raise exception 'NAO_PODE_SE_APAGAR'; end if;
  if exists (select 1 from public.crm_admins where user_id = p_id) then raise exception 'NAO_PODE_APAGAR_ADMIN'; end if;
  select p.name::text into nm from public.profiles p where p.id = p_id;
  if not found then raise exception 'NAO_ENCONTRADO'; end if;
  if btrim(coalesce(p_confirmacao, '')) is distinct from coalesce(nm, 'APAGAR') then raise exception 'CONFIRMACAO_ERRADA'; end if;

  select id into lid from public.crm_leads where user_id = p_id;
  if lid is not null then
    update public.crm_leads set name = 'Jogador removido', email = null, removed_at = now(), follow_up = null, updated_at = now() where id = lid;
    update public.crm_events set body = '[removido junto com o perfil]' where lead_id = lid and kind in ('nota', 'whatsapp', 'email', 'ligacao');
    insert into public.crm_events (lead_id, kind, body, by_admin) values (lid, 'remocao', 'Perfil apagado pelo CRM. Dados pessoais removidos; valores mantidos.', auth.uid());
  end if;
  insert into public.crm_audit (admin_id, action, target, detail) values (auth.uid(), 'apagar_jogador', p_id, 'lead ' || coalesce(lid::text, '-'));
  delete from auth.users where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- ---------- permissões: só quem tem login chama; o admin é conferido dentro de cada função
do $$
declare f text;
begin
  foreach f in array array[
    'crm_is_admin()', 'crm_guard()', 'crm_me()', 'crm_resumo()', 'crm_jogadores(text, text, integer, integer)', 'crm_jogador(uuid)',
    'crm_lead(bigint)', 'crm_leads_lista()', 'crm_lead_etapa(bigint, text)', 'crm_lead_nota(bigint, text, text)',
    'crm_lead_retorno(bigint, date)', 'crm_apagar_jogador(uuid, text)'] loop
    execute 'revoke all on function public.' || f || ' from public, anon';
    execute 'grant execute on function public.' || f || ' to authenticated';
  end loop;
end $$;
revoke all on function public.crm_stage_label(text) from anon;
