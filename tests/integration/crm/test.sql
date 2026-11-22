-- Testes do CRM (v29_5_crm). Cada bloco para com erro se algo não sair como esperado.
insert into public.crm_admins values ('00000000-0000-0000-0000-00000000000a');

-- 1. leads criados dos pedidos antigos
do $$ declare l public.crm_leads; begin
  select * into l from public.crm_leads where user_id = '00000000-0000-0000-0000-00000000000b';
  assert l.stage = 'comprou' and l.paid_cents = 490 and l.orders = 1 and l.email = 'beto@exemplo.com', 'backfill: ' || row_to_json(l)::text;
end $$;

set role authenticated;

-- 2. sem login e jogador comum não entram
do $$ begin
  perform set_config('qz.uid', '', false);
  begin perform public.crm_resumo(); raise exception 'FALHOU: sem login entrou'; exception when insufficient_privilege then null; end;
  perform set_config('qz.uid', '00000000-0000-0000-0000-00000000000c', false);
  assert (public.crm_me()->>'admin')::boolean = false, 'jogador comum não é admin';
  begin perform public.crm_jogadores('', 'recentes', 50, 0); raise exception 'FALHOU: jogador listou'; exception when insufficient_privilege then null; end;
  begin perform public.crm_jogador('00000000-0000-0000-0000-00000000000b'); raise exception 'FALHOU: jogador leu ficha'; exception when insufficient_privilege then null; end;
  begin perform public.crm_apagar_jogador('00000000-0000-0000-0000-00000000000b', 'Beto'); raise exception 'FALHOU: jogador apagou'; exception when insufficient_privilege then null; end;
  begin perform public.crm_lead_etapa(1, 'vip'); raise exception 'FALHOU: jogador mexeu no funil'; exception when insufficient_privilege then null; end;
end $$;

-- 3. jogador comum não lê as tabelas do CRM direto (RLS sem política)
reset role;
revoke all on public.crm_admins, public.crm_leads, public.crm_events, public.crm_audit from anon, authenticated;
grant select on public.crm_admins, public.crm_leads, public.crm_events, public.crm_audit to authenticated; -- pior caso: grant padrão do Supabase
set role authenticated;
do $$ begin
  assert (select count(*) from public.crm_leads) = 0, 'RLS deixou ler crm_leads';
  assert (select count(*) from public.crm_admins) = 0, 'RLS deixou ler crm_admins';
end $$;

-- 4. admin vê resumo, lista, pesquisa e ficha
do $$ declare r jsonb; begin
  perform set_config('qz.uid', '00000000-0000-0000-0000-00000000000a', false);
  assert (public.crm_me()->>'admin')::boolean, 'admin reconhecido';
  r := public.crm_resumo();
  assert (r->>'jogadores')::int = 4 and (r->>'compradores')::int = 1 and (r->>'receita_total')::int = 490, 'resumo: ' || r::text;
  r := public.crm_jogadores('', 'recentes', 50, 0);
  assert (r->>'total')::int = 4, 'lista total';
  r := public.crm_jogadores('bet', 'recentes', 50, 0);
  assert (r->>'total')::int = 1 and r->'linhas'->0->>'nome' = 'Beto', 'busca por nome';
  r := public.crm_jogadores('caio@', 'recentes', 50, 0);
  assert (r->>'total')::int = 1, 'busca por e-mail';
  r := public.crm_jogadores('00000000-0000-0000-0000-00000000000d', 'recentes', 50, 0);
  assert (r->>'total')::int = 1, 'busca por código';
  r := public.crm_jogadores('', 'nivel', 1, 0);
  assert r->'linhas'->0->>'nome' = 'Beto' and jsonb_array_length(r->'linhas') = 1, 'ordem por nível e limite';
  r := public.crm_jogador('00000000-0000-0000-0000-00000000000b');
  assert r->'perfil'->>'email' = 'beto@exemplo.com' and (r->>'amigos')::int = 1 and jsonb_array_length(r->'pedidos') = 1
    and r->'lead'->>'etapa' = 'comprou', 'ficha: ' || r::text;
end $$;

-- 5. funil: novo pedido do Caio vira lead em "Abriu o checkout"; pago vai para "Comprou"; segunda compra, "Comprou de novo"
reset role;
insert into public.zc_orders (user_id, pack_id, zcoin, price_cents) values ('00000000-0000-0000-0000-00000000000c', 'saco', 330, 1290);
do $$ begin assert (select stage from public.crm_leads where user_id = '00000000-0000-0000-0000-00000000000c') = 'checkout', 'lead novo em checkout'; end $$;
update public.zc_orders set status = 'paid', paid_amount = 1290, paid_at = now(), capture_method = 'pix' where user_id = '00000000-0000-0000-0000-00000000000c';
do $$ declare l public.crm_leads; begin
  select * into l from public.crm_leads where user_id = '00000000-0000-0000-0000-00000000000c';
  assert l.stage = 'comprou' and l.paid_cents = 1290 and l.paid_orders = 1, 'pago: ' || row_to_json(l)::text;
end $$;
-- pagar de novo o mesmo pedido (webhook repetido) não soma duas vezes
update public.zc_orders set status = 'paid' where user_id = '00000000-0000-0000-0000-00000000000c';
do $$ begin assert (select paid_cents from public.crm_leads where user_id = '00000000-0000-0000-0000-00000000000c') = 1290, 'não soma duas vezes'; end $$;
insert into public.zc_orders (user_id, pack_id, zcoin, price_cents, status, paid_amount, paid_at) values ('00000000-0000-0000-0000-00000000000c', 'punhado', 100, 490, 'paid', 490, now());
do $$ declare l public.crm_leads; begin
  select * into l from public.crm_leads where user_id = '00000000-0000-0000-0000-00000000000c';
  assert l.stage = 'recorrente' and l.paid_orders = 2 and l.orders = 2 and l.paid_cents = 1780, 'recorrente: ' || row_to_json(l)::text;
end $$;
-- pedido recusado registra no histórico
insert into public.zc_orders (user_id, pack_id, zcoin, price_cents) values ('00000000-0000-0000-0000-00000000000d', 'punhado', 100, 490);
update public.zc_orders set status = 'failed', fail_reason = 'valor 1/490' where user_id = '00000000-0000-0000-0000-00000000000d';
do $$ begin
  assert exists (select 1 from public.crm_events e join public.crm_leads l on l.id = e.lead_id
    where l.user_id = '00000000-0000-0000-0000-00000000000d' and e.kind = 'falha'), 'falha no histórico';
end $$;

-- 6. admin move etapa, anota e marca retorno
set role authenticated;
do $$ declare lid bigint; r jsonb; begin
  perform set_config('qz.uid', '00000000-0000-0000-0000-00000000000a', false);
  select (x->>'id')::bigint into lid from jsonb_array_elements(public.crm_leads_lista()) x where x->>'nome' = 'Beto';
  r := public.crm_lead_etapa(lid, 'boas_vindas');
  assert r->>'etapa' = 'boas_vindas' and r->'historico'->0->>'texto' like 'Etapa: Comprou → Boas-vindas', 'etapa: ' || (r->'historico'->0)::text;
  r := public.crm_lead_nota(lid, 'whatsapp', 'Mandei obrigado pela compra');
  assert r->'historico'->0->>'tipo' = 'whatsapp', 'nota';
  r := public.crm_lead_retorno(lid, current_date);
  assert r->>'retorno' = current_date::text and (public.crm_resumo()->>'retornos_hoje')::int = 1, 'retorno';
  begin perform public.crm_lead_etapa(lid, 'qualquer'); raise exception 'FALHOU: etapa inválida'; exception when raise_exception then
    if sqlerrm <> 'ETAPA_INVALIDA' then raise; end if; end;
  begin perform public.crm_lead_nota(lid, 'nota', '   '); raise exception 'FALHOU: nota vazia'; exception when raise_exception then
    if sqlerrm <> 'TEXTO_INVALIDO' then raise; end if; end;
end $$;

-- 7. apagar perfil
do $$ declare lid bigint; begin
  perform set_config('qz.uid', '00000000-0000-0000-0000-00000000000a', false);
  begin perform public.crm_apagar_jogador('00000000-0000-0000-0000-00000000000a', 'Dono'); raise exception 'FALHOU: admin se apagou'; exception when raise_exception then
    if sqlerrm <> 'NAO_PODE_SE_APAGAR' then raise; end if; end;
  begin perform public.crm_apagar_jogador('00000000-0000-0000-0000-00000000000b', 'beto errado'); raise exception 'FALHOU: confirmação errada'; exception when raise_exception then
    if sqlerrm <> 'CONFIRMACAO_ERRADA' then raise; end if; end;
  assert (public.crm_apagar_jogador('00000000-0000-0000-0000-00000000000b', 'Beto')->>'ok')::boolean, 'apagou';
  assert (public.crm_apagar_jogador('00000000-0000-0000-0000-00000000000d', 'APAGAR')->>'ok')::boolean, 'apagou sem nome';
end $$;
reset role;
do $$ declare l public.crm_leads; begin
  assert not exists (select 1 from auth.users where id = '00000000-0000-0000-0000-00000000000b'), 'conta saiu do auth';
  assert not exists (select 1 from public.profiles where id = '00000000-0000-0000-0000-00000000000b'), 'perfil saiu';
  assert not exists (select 1 from public.wallets where user_id = '00000000-0000-0000-0000-00000000000b'), 'carteira saiu';
  assert not exists (select 1 from public.friendships where user_low = '00000000-0000-0000-0000-00000000000b'), 'amizade saiu';
  select * into l from public.crm_leads where name = 'Jogador removido' and paid_cents = 490;
  assert l.user_id is null and l.email is null and l.removed_at is not null, 'lead anonimizado: ' || row_to_json(l)::text;
  assert not exists (select 1 from public.crm_events where lead_id = l.id and body like '%obrigado%'), 'nota com dado pessoal apagada';
  assert (select count(*) from public.crm_audit where action = 'apagar_jogador') = 2, 'auditoria';
  assert (select count(*) from public.profiles) = 2, 'os outros continuam';
end $$;

-- 8. rodar a migração de novo não duplica nada (idempotente) é testado pelo run.sh
\echo 'crm: todos os testes passaram'
