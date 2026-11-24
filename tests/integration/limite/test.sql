-- Testes do limite de gasto, idade, histórico e devolução. Cada bloco falha com exceção se o resultado não for o esperado.
-- Contas do mock: A = Ana (tem lead no CRM), B = Beto (admin do CRM), C = sem nome.
-- Pacotes (v29.5): punhado R$ 4,90 / 300 Z, saco R$ 20 / 700 Z, mochila R$ 35 / 1050 Z, cofre R$ 65 / 1400 Z.
create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('qz.uid', u, false) $$;
create function pg_temp.pay(o uuid, tx text) returns jsonb language sql as $$
  select public.zc_order_pay(o, tx, 'slug-' || tx, (select price_cents from public.zc_orders where id = o),
    (select price_cents from public.zc_orders where id = o), 'pix', null, 'webhook') $$;
create function pg_temp.err(q text) returns text language plpgsql as $$
begin execute q; return 'SEM ERRO'; exception when others then return sqlerrm; end $$;
create temp table t (k text primary key, v uuid);

-- 1. sem idade declarada não abre pedido
do $$ declare e text; begin
  e := pg_temp.err($q$select public.zc_order_open('00000000-0000-0000-0000-00000000000a', 'saco')$q$);
  if e <> 'IDADE_PENDENTE' then raise exception 'abriu sem idade: %', e; end if;
  raise notice 'ok: sem idade declarada o servidor recusa o pedido';
end $$;

-- 2. adulto sem teto compra normal
do $$ declare r jsonb; begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
  r := public.zc_age_set(false);
  if r->>'age' <> 'adult' or r->'limit_cents' <> 'null'::jsonb then raise exception 'adulto errado %', r; end if;
  r := public.zc_order_open('00000000-0000-0000-0000-00000000000a', 'saco');
  insert into t values ('saco', (r->>'order')::uuid);
  perform pg_temp.pay((r->>'order')::uuid, 'tx-saco-0001');
  r := public.zc_spend_info();
  if (r->>'month_cents')::int <> 2000 then raise exception 'gasto do mês errado %', r; end if;
  raise notice 'ok: adulto sem teto compra e o gasto do mês soma R$ 20';
end $$;

-- 3. teto de R$ 50 vale na hora e barra o que passa
do $$ declare r jsonb; e text; begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
  r := public.zc_limit_set(5000);
  if (r->>'limit_cents')::int <> 5000 or r->'next' <> 'null'::jsonb then raise exception 'baixar não valeu na hora %', r; end if;
  e := pg_temp.err($q$select public.zc_order_open('00000000-0000-0000-0000-00000000000a', 'mochila')$q$);
  if e <> 'LIMITE_MES' then raise exception 'passou do teto (20 + 35 > 50): %', e; end if;
  r := public.zc_order_open('00000000-0000-0000-0000-00000000000a', 'punhado');
  insert into t values ('punhado', (r->>'order')::uuid);
  if (public.zc_spend_info()->>'month_cents')::int <> 2490 then raise exception 'pedido aberto não conta no mês'; end if;
  raise notice 'ok: teto de R$ 50 vale na hora, recusa a mochila e aceita o punhado (pedido aberto conta)';
end $$;

-- 4. subir o teto espera 72 h; tirar o teto também; dá para desistir
do $$ declare r jsonb; begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
  r := public.zc_limit_set(10000);
  if (r->>'limit_cents')::int <> 5000 or (r->'next'->>'limit_cents')::int <> 10000 then raise exception 'subir valeu na hora %', r; end if;
  if (r->'next'->>'at')::timestamptz < now() + interval '71 hours' then raise exception 'espera curta %', r; end if;
  update public.zc_limits set next_at = now() - interval '1 second' where user_id = '00000000-0000-0000-0000-00000000000a';
  r := public.zc_spend_info();
  if (r->>'limit_cents')::int <> 10000 or r->'next' <> 'null'::jsonb then raise exception 'não aplicou depois da espera %', r; end if;
  r := public.zc_limit_set(null);
  if (r->>'limit_cents')::int <> 10000 or r->'next' = 'null'::jsonb then raise exception 'tirar o teto valeu na hora %', r; end if;
  r := public.zc_limit_cancel();
  if r->'next' <> 'null'::jsonb or (r->>'limit_cents')::int <> 10000 then raise exception 'cancelar falhou %', r; end if;
  raise notice 'ok: subir/tirar o teto só vale depois da espera, e dá para desistir';
end $$;

-- 5. menor de idade: teto padrão, máximo, e virar adulto espera
do $$ declare r jsonb; e text; begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
  r := public.zc_age_set(true);
  if r->>'age' <> 'minor' or (r->>'limit_cents')::int <> 5000 then raise exception 'menor sem teto padrão %', r; end if;
  e := pg_temp.err('select public.zc_limit_set(20000)');
  if e <> 'LIMITE_MENOR' then raise exception 'menor passou do máximo: %', e; end if;
  e := pg_temp.err('select public.zc_limit_set(null)');
  if e <> 'LIMITE_MENOR' then raise exception 'menor tirou o teto: %', e; end if;
  e := pg_temp.err($q$select public.zc_order_open('00000000-0000-0000-0000-00000000000b', 'cofre')$q$);
  if e <> 'LIMITE_MES' then raise exception 'menor comprou R$ 65: %', e; end if;
  r := public.zc_limit_set(3000);
  if (r->>'limit_cents')::int <> 3000 then raise exception 'menor não baixou %', r; end if;
  r := public.zc_age_set(false);
  if r->>'age' <> 'minor' or r->'next'->>'age' <> 'adult' then raise exception 'virou adulto na hora %', r; end if;
  update public.zc_limits set next_at = now() - interval '1 second' where user_id = '00000000-0000-0000-0000-00000000000b';
  r := public.zc_spend_info();
  if r->>'age' <> 'adult' or (r->>'limit_cents')::int <> 3000 then raise exception 'adulto depois da espera errado %', r; end if;
  r := public.zc_age_set(true);
  if r->>'age' <> 'minor' or (r->>'limit_cents')::int <> 3000 then raise exception 'voltar a menor não valeu na hora %', r; end if;
  raise notice 'ok: menor tem teto de R$ 50 (máx. R$ 100), recusa o cofre e só vira adulto depois da espera';
end $$;

-- 6. histórico só da própria conta
do $$ declare r jsonb; begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
  r := public.zc_my_orders();
  if jsonb_array_length(r) <> 2 then raise exception 'histórico com % linhas', jsonb_array_length(r); end if;
  if r->0->>'pack' <> 'punhado' or r->0->>'status' <> 'pending' then raise exception 'ordem errada %', r; end if;
  if r->1->>'name' <> 'Saco' or (r->1->>'can_refund')::boolean is not true then raise exception 'saco sem devolução %', r; end if;
  perform pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
  if jsonb_array_length(public.zc_my_orders()) <> 0 then raise exception 'viu compra de outra conta'; end if;
  raise notice 'ok: histórico mostra só as compras da conta, mais novas primeiro';
end $$;

-- 7. devolução: tira a Z-Coin na hora, uma vez só, registra no CRM e sai do gasto do mês
do $$ declare r jsonb; e text; o uuid := (select v from t where k = 'saco'); begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
  e := pg_temp.err(format('select public.zc_refund_request(%L)', o));
  if e <> 'PEDIDO_NAO_ENCONTRADO' then raise exception 'pediu devolução de outra conta: %', e; end if;
  perform pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
  r := public.zc_refund_request(o, '  comprei sem querer  ');
  if (r->>'wallet')::int <> 0 or (r->>'zcoin')::int <> 700 then raise exception 'não tirou a Z-Coin %', r; end if;
  if (select reason from public.zc_refunds where order_id = o) <> 'comprei sem querer' then raise exception 'motivo não limpo'; end if;
  e := pg_temp.err(format('select public.zc_refund_request(%L)', o));
  if e <> 'DEVOLUCAO_JA_PEDIDA' then raise exception 'pediu duas vezes: %', e; end if;
  if (select count(*) from public.crm_events where kind = 'devolucao') <> 1 then raise exception 'CRM sem registro'; end if;
  if (public.zc_spend_info()->>'month_cents')::int <> 490 then raise exception 'devolução ainda conta no mês'; end if;
  if (public.zc_my_orders()->1->'refund'->>'status') <> 'pedido' then raise exception 'histórico sem a devolução'; end if;
  e := pg_temp.err(format('select public.zc_refund_request(%L)', (select v from t where k = 'punhado')));
  if e <> 'PEDIDO_NAO_PAGO' then raise exception 'devolveu pedido não pago: %', e; end if;
  raise notice 'ok: devolução tira 700 Z-Coin na hora, uma vez só, vai para o CRM e sai do gasto do mês';
end $$;

-- 8. prazo de 7 dias e Z-Coin já usada
do $$ declare r jsonb; e text; o uuid; begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
  perform public.zc_limit_set(100000);
  update public.zc_limits set next_at = null, limit_cents = null where user_id = '00000000-0000-0000-0000-00000000000a';
  r := public.zc_order_open('00000000-0000-0000-0000-00000000000a', 'mochila'); o := (r->>'order')::uuid;
  perform pg_temp.pay(o, 'tx-velho-0001');
  update public.zc_orders set paid_at = now() - interval '7 days 1 minute' where id = o;
  e := pg_temp.err(format('select public.zc_refund_request(%L)', o));
  if e <> 'PRAZO_DEVOLUCAO' then raise exception 'devolveu depois de 7 dias: %', e; end if;
  if (public.zc_my_orders()->0->>'can_refund')::boolean then raise exception 'histórico oferece devolução fora do prazo'; end if;
  r := public.zc_order_open('00000000-0000-0000-0000-00000000000a', 'cofre'); o := (r->>'order')::uuid;
  insert into t values ('cofre', o);
  perform pg_temp.pay(o, 'tx-cofre-0001');
  perform public.wallet_add('00000000-0000-0000-0000-00000000000a', 'zcoin', -1500, 'gastou na loja');
  e := pg_temp.err(format('select public.zc_refund_request(%L)', o));
  if e <> 'ZCOIN_JA_USADA' then raise exception 'devolveu Z-Coin já gasta: %', e; end if;
  raise notice 'ok: fora dos 7 dias ou com a Z-Coin já gasta, a devolução é recusada';
end $$;

-- 9. admin do CRM: só admin vê; negar devolve a Z-Coin; não decide duas vezes
do $$ declare r jsonb; e text; rid bigint := (select id from public.zc_refunds limit 1); begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
  e := pg_temp.err('select public.zc_refunds_list()');
  if e <> 'SEM_ACESSO' then raise exception 'jogador viu a lista: %', e; end if;
  e := pg_temp.err(format('select public.zc_refund_decide(%s, true)', rid));
  if e <> 'SEM_ACESSO' then raise exception 'jogador decidiu: %', e; end if;
  perform pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
  r := public.zc_refunds_list();
  if jsonb_array_length(r) <> 1 or r->0->>'nome' <> 'Ana' or r->0->>'status' <> 'pedido' then raise exception 'lista errada %', r; end if;
  r := public.zc_refund_decide(rid, false, 'Z-Coin já usada no passe');
  if (select zcoin from public.wallets where user_id = '00000000-0000-0000-0000-00000000000a') <> 1650 then
    raise exception 'saldo depois de negar: %', (select zcoin from public.wallets where user_id = '00000000-0000-0000-0000-00000000000a');
  end if;
  e := pg_temp.err(format('select public.zc_refund_decide(%s, true)', rid));
  if e <> 'DEVOLUCAO_JA_ANALISADA' then raise exception 'decidiu duas vezes: %', e; end if;
  if (select count(*) from public.crm_events where kind = 'devolucao') <> 2 then raise exception 'CRM sem a decisão'; end if;
  raise notice 'ok: só admin vê e decide; negar devolve as 700 Z-Coin; não decide duas vezes';
end $$;

-- 10. aprovar e desistir
do $$ declare r jsonb; e text; o uuid; rid bigint; w int; begin
  perform pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
  r := public.zc_order_open('00000000-0000-0000-0000-00000000000a', 'punhado'); o := (r->>'order')::uuid;
  perform pg_temp.pay(o, 'tx-punhado-01');
  w := (select zcoin from public.wallets where user_id = '00000000-0000-0000-0000-00000000000a');
  rid := (public.zc_refund_request(o)->>'refund')::bigint;
  r := public.zc_refund_cancel(rid);
  if (r->>'wallet')::int <> w then raise exception 'desistir não devolveu a Z-Coin %', r; end if;
  e := pg_temp.err(format('select public.zc_refund_cancel(%s)', rid));
  if e <> 'DEVOLUCAO_JA_ANALISADA' then raise exception 'desistiu duas vezes: %', e; end if;
  r := public.zc_order_open('00000000-0000-0000-0000-00000000000a', 'punhado'); o := (r->>'order')::uuid;
  perform pg_temp.pay(o, 'tx-punhado-02');
  rid := (public.zc_refund_request(o)->>'refund')::bigint;
  perform pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
  r := public.zc_refund_decide(rid, true);
  if r->>'status' <> 'aprovado' or (select zcoin from public.wallets where user_id = '00000000-0000-0000-0000-00000000000a') <> w then
    raise exception 'aprovar mexeu errado na carteira %', r;
  end if;
  perform pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
  if (select x->'refund'->>'status' from jsonb_array_elements(public.zc_my_orders()) x where x->>'id' = o::text) <> 'aprovado' then raise exception 'histórico sem aprovação'; end if;
  raise notice 'ok: desistir devolve a Z-Coin; aprovar mantém a Z-Coin fora e aparece no histórico';
end $$;

-- 11. permissões
do $$ declare e text; begin
  set local role anon;
  e := pg_temp.err('select public.zc_spend_info()');
  reset role;
  if e not like 'permission denied%' then raise exception 'anon chamou zc_spend_info: %', e; end if;
  set local role authenticated;
  e := pg_temp.err($q$select public.zc_order_open('00000000-0000-0000-0000-00000000000a', 'saco')$q$);
  reset role;
  if e not like 'permission denied%' then raise exception 'jogador abriu pedido direto: %', e; end if;
  set local role authenticated;
  e := pg_temp.err($q$select public.zc_month_cents('00000000-0000-0000-0000-00000000000a')$q$);
  reset role;
  if e not like 'permission denied%' then raise exception 'jogador leu gasto de outro: %', e; end if;
  raise notice 'ok: anon não chama nada; jogador não abre pedido direto nem lê ajudantes internos';
end $$;
