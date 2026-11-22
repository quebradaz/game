-- Testes da compra de Z-Coin. Cada bloco falha com exceção se o resultado não for o esperado.
\set A '''00000000-0000-0000-0000-00000000000a'''
\set B '''00000000-0000-0000-0000-00000000000b'''
\set C '''00000000-0000-0000-0000-00000000000c'''
create temp table t (k text primary key, v uuid);
grant select on t to authenticated;
do $$ declare r jsonb; begin
  r := public.zc_order_open('00000000-0000-0000-0000-00000000000a', 'saco');
  if (r->>'price_cents')::int <> 1290 or (r->>'zcoin')::int <> 330 then raise exception 'preço/zcoin errados %', r; end if;
  insert into t values ('o1', (r->>'order')::uuid);
  r := public.zc_order_open('00000000-0000-0000-0000-00000000000a', 'mochila');
  insert into t values ('o2', (r->>'order')::uuid);
  raise notice 'ok: abre pedido com preço do servidor';
end $$;
do $$ begin perform public.zc_order_open('00000000-0000-0000-0000-00000000000a', 'gratis'); raise exception 'aceitou pacote inválido';
exception when others then if sqlerrm <> 'PACOTE_INVALIDO' then raise; end if; raise notice 'ok: pacote inválido recusado'; end $$;
do $$ begin perform public.zc_order_open('00000000-0000-0000-0000-00000000000c', 'saco'); raise exception 'aceitou sem nome';
exception when others then if sqlerrm <> 'SEM_NOME' then raise; end if; raise notice 'ok: conta sem nome recusada'; end $$;

-- valor diferente: não credita e marca falha
do $$ declare r jsonb; o uuid := (select v from t where k = 'o2'); begin
  r := public.zc_order_pay(o, 'tx-barato-1', 'slug1', 100, 100, 'pix', null, 'webhook');
  if r->>'ok' <> 'false' or (select status from public.zc_orders where id = o) <> 'failed' then raise exception 'valor errado passou %', r; end if;
  if exists (select 1 from public.ledger) then raise exception 'creditou com valor errado'; end if;
  raise notice 'ok: valor diferente não credita';
end $$;

-- pagamento certo credita uma vez; repetir (webhook + jogo) não duplica
do $$ declare r jsonb; o uuid := (select v from t where k = 'o1'); begin
  r := public.zc_order_pay(o, 'tx-saco-0001', 'slugA', 1290, 1310, 'credit_card', 'https://x/r', 'webhook');
  if r->>'ok' <> 'true' or r->>'already' <> 'false' then raise exception 'não pagou %', r; end if;
  r := public.zc_order_pay(o, 'tx-saco-0001', 'slugA', 1290, 1310, 'credit_card', null, 'jogo');
  if r->>'already' <> 'true' then raise exception 'pagou duas vezes %', r; end if;
  if (select zcoin from public.wallets where user_id = '00000000-0000-0000-0000-00000000000a') <> 330 then raise exception 'saldo errado'; end if;
  if (select count(*) from public.ledger where reason = 'compra InfinitePay' and ref = 'ip:tx-saco-0001') <> 1 then raise exception 'ledger errado'; end if;
  raise notice 'ok: credita uma vez só (330 Z-Coin, uma linha no ledger)';
end $$;

-- mesma transação usada para outro pedido é recusada
do $$ declare r jsonb; o uuid; begin
  r := public.zc_order_open('00000000-0000-0000-0000-00000000000b', 'saco'); o := (r->>'order')::uuid;
  perform public.zc_order_pay(o, 'tx-saco-0001', 'slugA', 1290, 1290, 'pix', null, 'jogo');
  raise exception 'reaproveitou transação';
exception when others then if sqlerrm <> 'TRANSACAO_DE_OUTRO_PEDIDO' then raise; end if; raise notice 'ok: transação de outro pedido recusada'; end $$;

-- o jogador só vê o próprio pedido, e não chama as funções de servidor
set role authenticated;
select set_config('qz.uid', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  if public.zc_order_status((select v from t where k = 'o1'))->>'status' <> 'unknown' then raise exception 'viu pedido de outro'; end if;
  raise notice 'ok: não vê pedido de outra conta';
end $$;
select set_config('qz.uid', '00000000-0000-0000-0000-00000000000a', false);
do $$ declare r jsonb; begin
  r := public.zc_order_status((select v from t where k = 'o1'));
  if r->>'status' <> 'paid' or (r->>'wallet')::int <> 330 then raise exception 'status errado %', r; end if;
  raise notice 'ok: vê o próprio pedido pago';
end $$;
do $$ begin perform public.zc_order_pay((select v from t where k = 'o2'), 'tx-hack-0001', 's', 2490, 2490, 'pix', null, 'jogo'); raise exception 'jogador creditou sozinho';
exception when insufficient_privilege then raise notice 'ok: jogador não chama zc_order_pay'; end $$;
do $$ begin perform public.zc_order_open('00000000-0000-0000-0000-00000000000a', 'saco'); raise exception 'jogador abriu pedido direto';
exception when insufficient_privilege then raise notice 'ok: jogador não chama zc_order_open'; end $$;
do $$ begin perform 1 from public.zc_orders; raise exception 'leu a tabela';
exception when insufficient_privilege then raise notice 'ok: jogador não lê zc_orders'; end $$;
do $$ begin if jsonb_array_length(public.zc_packs_list()) <> 4 then raise exception 'pacotes'; end if; raise notice 'ok: lista 4 pacotes'; end $$;
reset role;
