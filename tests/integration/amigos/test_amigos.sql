-- Testes da migração v28_8_amigos. Rodar: tests/integration/amigos/run.sh
\set ON_ERROR_STOP 1
insert into auth.users values
 ('00000000-0000-0000-0000-00000000000a', '{"avatar_url":"http://a"}'),
 ('00000000-0000-0000-0000-00000000000b', '{}'),
 ('00000000-0000-0000-0000-00000000000c', '{}'),
 ('00000000-0000-0000-0000-00000000000d', '{}');
insert into public.profiles (id, name, last_seen) values
 ('00000000-0000-0000-0000-00000000000a', 'Alfa', now() - interval '3 days'),
 ('00000000-0000-0000-0000-00000000000b', 'Bravo', now()),
 ('00000000-0000-0000-0000-00000000000c', 'Charlie', now()),
 ('00000000-0000-0000-0000-00000000000d', null, now());
insert into public.player_stats (user_id, best_wave, kills, matches) values
 ('00000000-0000-0000-0000-00000000000a', 12, 500, 9), ('00000000-0000-0000-0000-00000000000b', 7, 100, 3), ('00000000-0000-0000-0000-00000000000c', 20, 900, 30);
insert into public.map_stats (user_id, map_id, best_wave, best_kills, best_seconds) values
 ('00000000-0000-0000-0000-00000000000a', 'favela', 12, 300, 600), ('00000000-0000-0000-0000-00000000000b', 'favela', 7, 90, 300), ('00000000-0000-0000-0000-00000000000c', 'favela', 20, 800, 1200);

create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('qz.uid', u, false); select null::void $$;
create function pg_temp.expect_err(q text, code text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then
    if sqlerrm <> code then raise exception 'esperava % e veio %', code, sqlerrm; end if; return; end;
  raise exception 'esperava erro % em: %', code, q;
end $$;
create function pg_temp.eq(a anyelement, b anyelement, what text) returns void language plpgsql as $$
begin if a is distinct from b then raise exception 'FALHOU %: veio % esperava %', what, a, b; end if; raise notice 'ok %', what; end $$;
grant execute on all functions in schema pg_temp to authenticated;

set role authenticated;
-- acesso direto à tabela é negado
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_err('select * from public.friendships', 'permission denied for table friendships');
select pg_temp.expect_err('insert into public.friendships values (''00000000-0000-0000-0000-00000000000a'',''00000000-0000-0000-0000-00000000000b'',''00000000-0000-0000-0000-00000000000a'',''accepted'')', 'permission denied for table friendships');
select pg_temp.expect_err('select public.friend_limits()', 'permission denied for function friend_limits');

-- pedidos
select pg_temp.expect_err($q$select public.friend_request('Alfa')$q$, 'VOCE_MESMO');
select pg_temp.expect_err($q$select public.friend_request('Ninguem')$q$, 'JOGADOR_NAO_ENCONTRADO');
select pg_temp.eq(public.friend_request(' bravo '), 'ENVIADO', 'pedido A->B (nome sem diferenciar maiúscula)');
select pg_temp.expect_err($q$select public.friend_request('Bravo')$q$, 'JA_PEDIU');
select pg_temp.eq((select kind from public.get_friends() where name = 'Bravo'), 'enviado', 'A vê pedido enviado');
select pg_temp.eq((select best_wave from public.get_friends() where name = 'Bravo'), null::int, 'pendente não mostra números');
select pg_temp.expect_err($q$select public.friend_respond('Bravo', true)$q$, 'SEM_PEDIDO'); -- quem pediu não aceita o próprio pedido

-- C não vê nada de A e B
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.eq((select count(*) from public.get_friends()), 0::bigint, 'terceiro não vê pedidos alheios');

-- B aceita
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.eq((select kind from public.get_friends() where name = 'Alfa'), 'recebido', 'B vê pedido recebido');
select pg_temp.eq(public.friend_respond('Alfa', true), 'ACEITO', 'B aceita');
select pg_temp.eq((select best_wave from public.get_friends() where name = 'Alfa'), 12, 'amigo mostra recorde');
select pg_temp.eq((select played_ago_days from public.get_friends() where name = 'Alfa'), 3, 'jogou há 3 dias');
select pg_temp.eq((select photo from public.get_friends() where name = 'Alfa'), 'http://a', 'foto do amigo');
select pg_temp.expect_err($q$select public.friend_request('Alfa')$q$, 'JA_AMIGOS');

-- ranking de amigos: B + A, sem C
select pg_temp.eq((select string_agg(name || ':' || pos, ',' order by pos) from public.get_friends_leaderboard('favela')), 'Alfa:1,Bravo:2', 'ranking só com amigos');
select pg_temp.eq((select name from public.get_friends_leaderboard('favela') where me), 'Bravo', 'linha do próprio jogador');

-- pedido cruzado vira amizade: C pede para B, B pede para C
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.eq(public.friend_request('Bravo'), 'ENVIADO', 'C->B');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.eq(public.friend_request('Charlie'), 'ACEITO', 'B->C aceita o pedido que já existia');
select pg_temp.eq((select count(*) from public.get_friends_leaderboard('favela')), 3::bigint, 'B vê A e C no ranking');
-- A não vê C (amigo de amigo não conta)
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.eq((select string_agg(name, ',' order by pos) from public.get_friends_leaderboard('favela')), 'Alfa,Bravo', 'amigo de amigo fica de fora');

-- recusar e esperar
select pg_temp.eq(public.friend_request('Charlie'), 'ENVIADO', 'A->C');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.eq(public.friend_respond('Alfa', false), 'RECUSADO', 'C recusa');
select pg_temp.eq((select count(*) from public.get_friends() where name = 'Alfa'), 0::bigint, 'recusado some da lista de C');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.eq((select count(*) from public.get_friends() where name = 'Charlie'), 0::bigint, 'recusado some da lista de A');
select pg_temp.expect_err($q$select public.friend_request('Charlie')$q$, 'RECUSADO_ESPERA');
-- quem recusou pode pedir depois
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.eq(public.friend_request('Alfa'), 'ENVIADO', 'quem recusou pode pedir');
select pg_temp.eq(public.friend_remove('Alfa'), 'REMOVIDO', 'C cancela o pedido enviado');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_err($q$select public.friend_remove('Charlie')$q$, 'SEM_AMIZADE');

-- desfazer amizade
select pg_temp.eq(public.friend_remove('Bravo'), 'REMOVIDO', 'A desfaz com B');
select pg_temp.eq((select count(*) from public.get_friends_leaderboard('favela')), 1::bigint, 'ranking volta a ter só A');

-- jogador sem nome não pede
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select pg_temp.expect_err($q$select public.friend_request('Alfa')$q$, 'SEM_NOME');
-- sem login
select pg_temp.as_user('');
select pg_temp.expect_err($q$select public.friend_request('Alfa')$q$, 'SEM_LOGIN');
select pg_temp.eq((select count(*) from public.get_friends()), 0::bigint, 'sem login: lista vazia');

-- anônimo nem chama
reset role; set role anon;
select pg_temp.expect_err($q$select public.get_friends()$q$, 'permission denied for function get_friends');
select pg_temp.expect_err($q$select public.friend_request('Alfa')$q$, 'permission denied for function friend_request');
reset role;

-- limite de pedidos pendentes (20)
insert into auth.users select ('00000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid from generate_series(1, 21) i;
insert into public.profiles (id, name) select ('00000000-0000-0000-0001-' || lpad(i::text, 12, '0'))::uuid, 'Extra' || i from generate_series(1, 21) i;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.friend_request('Extra' || i) from generate_series(1, 18) i; -- já há 2 do teste? (não: os anteriores foram resolvidos)
select public.friend_request('Extra19'), public.friend_request('Extra20');
select pg_temp.expect_err($q$select public.friend_request('Extra21')$q$, 'LIMITE_PEDIDOS');
reset role;

-- conta apagada leva as amizades junto
delete from auth.users where id = '00000000-0000-0000-0000-00000000000c';
select pg_temp.eq((select count(*) from public.friendships where '00000000-0000-0000-0000-00000000000c' in (user_low, user_high)), 0::bigint, 'cascata ao excluir conta');
\echo TODOS OS TESTES PASSARAM
