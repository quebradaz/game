-- Testes da migração v29_11_coop_online. Rodar: tests/integration/coop/run.sh
\set ON_ERROR_STOP 1
insert into auth.users values
 ('00000000-0000-0000-0000-00000000000a', '{"avatar_url":"https://a"}'),
 ('00000000-0000-0000-0000-00000000000b', '{}'),
 ('00000000-0000-0000-0000-00000000000c', '{}'),
 ('00000000-0000-0000-0000-00000000000d', '{}'),
 ('00000000-0000-0000-0000-00000000000e', '{}');
insert into public.profiles (id, name, last_seen) values
 ('00000000-0000-0000-0000-00000000000a', 'Alfa', now()),
 ('00000000-0000-0000-0000-00000000000b', 'Bravo', now()),
 ('00000000-0000-0000-0000-00000000000c', 'Charlie', now()),
 ('00000000-0000-0000-0000-00000000000d', null, now()),
 ('00000000-0000-0000-0000-00000000000e', 'Eco', now());
insert into public.player_stats (user_id, best_wave, kills, matches, wins) values
 ('00000000-0000-0000-0000-00000000000a', 12, 500, 9, 1), ('00000000-0000-0000-0000-00000000000b', 7, 100, 3, 0);
insert into public.map_stats (user_id, map_id, best_wave, best_kills, best_seconds, matches) values
 ('00000000-0000-0000-0000-00000000000b', 'adega', 7, 90, 300, 3);
insert into public.progress (user_id, data) values
 ('00000000-0000-0000-0000-00000000000b', '{"level": 4, "look": {"skin": 2, "hairStyle": 1}, "eq": {"chest": "moletom_capuz"}, "inv": ["moletom_capuz", "lenda_x", "comum_y"]}'),
 ('00000000-0000-0000-0000-00000000000c', '{"inv": ["moletom_capuz"]}'),
 ('00000000-0000-0000-0000-00000000000a', '{"inv": ["moletom_capuz", "comum_y"]}');
insert into public.shop_items values ('lenda_x', 3, 0, 'box', true), ('comum_y', 1, 0, 'box', true), ('rara_z', 2, 0, 'pass', true);
insert into public.items_owned values ('00000000-0000-0000-0000-00000000000b', 'rara_z', 'passe 1 nivel 9', now());
-- A e B amigos; C sem amizade
insert into public.friendships (user_low, user_high, requested_by, status) values
 ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000a', 'accepted');

create function pg_temp.as_user(u text) returns void language sql as $$ select set_config('qz.uid', u, false); select null::void $$;
create function pg_temp.expect_err(q text, code text) returns void language plpgsql as $$
begin
  begin execute q; exception when others then
    if sqlerrm <> code then raise exception 'esperava % e veio %', code, sqlerrm; end if; return; end;
  raise exception 'esperava erro % em: %', code, q;
end $$;
create function pg_temp.eq(a anyelement, b anyelement, what text) returns void language plpgsql as $$
begin if a is distinct from b then raise exception 'FALHOU %: veio % esperava %', what, a, b; end if; raise notice 'ok %', what; end $$;
create table pg_temp.v (k text primary key, val text);
grant all on pg_temp.v to authenticated;
grant execute on all functions in schema pg_temp to authenticated;

set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
-- acesso direto negado
select pg_temp.expect_err('select * from public.coop_lobbies', 'permission denied for table coop_lobbies');
select pg_temp.expect_err('select * from public.coop_signals', 'permission denied for table coop_signals');
select pg_temp.expect_err('select public.coop_prune(null)', 'permission denied for function coop_prune');

-- presença
select pg_temp.eq((public.online_ping('menu')->'invites')::text, '[]', 'ping sem convites');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.online_ping('menu');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.eq((select online from public.friends_online() where name = 'Bravo'), true, 'amigo aparece on');

-- perfil: amigo pode, desconhecido não
select pg_temp.eq(public.player_profile('bravo')->>'level', '4', 'perfil: nível');
select pg_temp.eq(public.player_profile('Bravo')->'stats'->>'kills', '100', 'perfil: abates');
select pg_temp.eq(public.player_profile('Bravo')->'items'->0->>'id', 'lenda_x', 'perfil: lendário primeiro');
select pg_temp.eq(public.player_profile('Bravo')->'items'->0->>'drop', '12.5', 'perfil: chance do lendário 1/8');
select pg_temp.eq(public.player_profile('Bravo')->'items'->0->>'own', '25.0', 'perfil: 1 de 4 jogadores tem o lendário');
select pg_temp.eq(public.player_profile('Bravo')->'items'->1->>'id', 'rara_z', 'perfil: rara do passe em segundo');
select pg_temp.eq(public.player_profile('Bravo')->'items'->1->>'drop', null, 'perfil: item do passe não tem chance de baú');
select pg_temp.eq((select count(*) from jsonb_array_elements(public.player_profile('Bravo')->'items'))::int, 4, 'perfil: 4 itens (inv + items_owned)');
select pg_temp.expect_err($q$select public.player_profile('Charlie')$q$, 'PERFIL_FECHADO');
select pg_temp.expect_err($q$select public.player_profile('Zulu')$q$, 'JOGADOR_NAO_ENCONTRADO');

-- sala
select pg_temp.expect_err($q$select public.lobby_create('ADEGA; drop', 0)$q$, 'MAPA_INVALIDO');
insert into pg_temp.v select 'lobby', public.lobby_create('adega', 0)->>'id';
insert into pg_temp.v select 'code', (public.lobby_state((select val::uuid from pg_temp.v where k = 'lobby'))->>'code');
select pg_temp.eq(length((select val from pg_temp.v where k = 'code')), 5, 'código de 5 letras');
select pg_temp.eq(public.lobby_state((select val::uuid from pg_temp.v where k = 'lobby'))->>'me', '0', 'anfitrião é a vaga 0');
-- convite: só amigo
select pg_temp.expect_err($q$select public.lobby_invite((select val::uuid from pg_temp.v where k = 'lobby'), 'Charlie')$q$, 'NAO_E_AMIGO');
select pg_temp.eq(public.lobby_invite((select val::uuid from pg_temp.v where k = 'lobby'), 'Bravo'), 'CONVIDADO', 'convite para amigo');
-- quem não está na sala não convida
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_err($q$select public.lobby_invite((select val::uuid from pg_temp.v where k = 'lobby'), 'Alfa')$q$, 'FORA_DA_SALA');
select pg_temp.eq(public.lobby_state((select val::uuid from pg_temp.v where k = 'lobby'))->>'state', 'closed', 'quem não está na sala não vê nada');
-- B recebe e aceita
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
insert into pg_temp.v select 'inv', public.online_ping('menu')->'invites'->0->>'id';
select pg_temp.eq(public.online_ping('menu')->'invites'->0->>'from', 'Alfa', 'convite chega com o nome de quem chamou');
select pg_temp.eq(public.lobby_answer((select val::bigint from pg_temp.v where k = 'inv'), true)->>'slot', '1', 'aceitou: vaga 1');
select pg_temp.expect_err($q$select public.lobby_answer((select val::bigint from pg_temp.v where k = 'inv'), true)$q$, 'CONVITE_VENCIDO');
select pg_temp.eq(public.online_ping('sala')->'lobby'->>'code', (select val from pg_temp.v where k = 'code'), 'ping mostra a sala atual');
-- C (não é amigo) entra pelo código
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.expect_err($q$select public.lobby_join('ZZZZZ')$q$, 'SALA_NAO_ENCONTRADA');
select pg_temp.eq(public.lobby_join(lower((select val from pg_temp.v where k = 'code')))->>'slot', '2', 'código (minúsculo) entra na vaga 2');
-- na mesma sala dá pra ver o perfil
select pg_temp.eq(public.player_profile('Alfa')->>'name', 'Alfa', 'perfil de quem está na sala');
-- sala cheia
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select pg_temp.expect_err(format('select public.lobby_join(%L)', (select val from pg_temp.v where k = 'code')), 'SALA_CHEIA');
-- sem nome não entra
select pg_temp.as_user('00000000-0000-0000-0000-00000000000d');
select pg_temp.expect_err(format('select public.lobby_join(%L)', (select val from pg_temp.v where k = 'code')), 'SEM_NOME');

-- membros e sinais
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.eq(jsonb_array_length(public.lobby_state((select val::uuid from pg_temp.v where k = 'lobby'))->'members'), 3, 'três na sala');
select pg_temp.eq(public.lobby_state((select val::uuid from pg_temp.v where k = 'lobby'))->'members'->1->'look'->>'skin', '2', 'visual do parceiro vem junto');
select pg_temp.eq(public.lobby_signal((select val::uuid from pg_temp.v where k = 'lobby'), 1, 'offer', '{"sdp":"x"}'), 'OK', 'sinal para a vaga 1');
select pg_temp.expect_err($q$select public.lobby_signal((select val::uuid from pg_temp.v where k = 'lobby'), 0, 'offer', 'x')$q$, 'SEM_DESTINO');
select pg_temp.expect_err($q$select public.lobby_signal((select val::uuid from pg_temp.v where k = 'lobby'), 1, 'hack', 'x')$q$, 'SINAL_INVALIDO');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.eq(public.lobby_state((select val::uuid from pg_temp.v where k = 'lobby'))->'signals'->0->>'body', '{"sdp":"x"}', 'B recebe o sinal');
select pg_temp.eq(jsonb_array_length(public.lobby_state((select val::uuid from pg_temp.v where k = 'lobby'))->'signals'), 0, 'sinal entregue sai do banco');

-- começar: só anfitrião, todos prontos
select pg_temp.expect_err($q$select public.lobby_start((select val::uuid from pg_temp.v where k = 'lobby'), 7)$q$, 'SO_ANFITRIAO');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_err($q$select public.lobby_start((select val::uuid from pg_temp.v where k = 'lobby'), 7)$q$, 'FALTA_PRONTO');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.lobby_ready((select val::uuid from pg_temp.v where k = 'lobby'), true);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select public.lobby_ready((select val::uuid from pg_temp.v where k = 'lobby'), true);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
-- trocar a fase tira o pronto de todos
select public.lobby_update((select val::uuid from pg_temp.v where k = 'lobby'), 'lava', 0);
select pg_temp.expect_err($q$select public.lobby_start((select val::uuid from pg_temp.v where k = 'lobby'), 7)$q$, 'FALTA_PRONTO');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_err($q$select public.lobby_update((select val::uuid from pg_temp.v where k = 'lobby'), 'adega', 0)$q$, 'SO_ANFITRIAO');
select public.lobby_ready((select val::uuid from pg_temp.v where k = 'lobby'), true);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select public.lobby_ready((select val::uuid from pg_temp.v where k = 'lobby'), true);
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.eq(public.lobby_start((select val::uuid from pg_temp.v where k = 'lobby'), 4242), 1, 'partida 1 começou');
select pg_temp.eq(public.lobby_state((select val::uuid from pg_temp.v where k = 'lobby'))->>'seed', '4242', 'semente da partida');
select pg_temp.eq(public.lobby_state((select val::uuid from pg_temp.v where k = 'lobby'))->>'map', 'lava', 'fase da partida');
-- durante a partida ninguém novo entra
select pg_temp.as_user('00000000-0000-0000-0000-00000000000e');
select pg_temp.expect_err(format('select public.lobby_join(%L)', (select val from pg_temp.v where k = 'code')), 'SALA_JOGANDO');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.lobby_end((select val::uuid from pg_temp.v where k = 'lobby'));
select pg_temp.eq(public.lobby_state((select val::uuid from pg_temp.v where k = 'lobby'))->>'state', 'open', 'sala aberta de novo');
-- expulsar
select public.lobby_kick((select val::uuid from pg_temp.v where k = 'lobby'), 2);
select pg_temp.eq(jsonb_array_length(public.lobby_state((select val::uuid from pg_temp.v where k = 'lobby'))->'members'), 2, 'expulso saiu');
select pg_temp.as_user('00000000-0000-0000-0000-00000000000c');
select pg_temp.eq(public.lobby_state((select val::uuid from pg_temp.v where k = 'lobby'))->>'kicked', 'true', 'expulso sabe que saiu');
-- quem some sai sozinho; anfitrião some = sala fecha
reset role;
update public.coop_members set seen_at = now() - interval '5 minutes' where slot = 1;
set role authenticated;
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select pg_temp.eq(jsonb_array_length(public.lobby_state((select val::uuid from pg_temp.v where k = 'lobby'))->'members'), 1, 'parceiro sumido sai');
-- criar outra sala fecha a anterior
insert into pg_temp.v select 'lobby2', public.lobby_create('adega', 0)->>'id';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_err(format('select public.lobby_join(%L)', (select val from pg_temp.v where k = 'code')), 'SALA_NAO_ENCONTRADA');
-- anfitrião sai: sala fecha para todos
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
insert into pg_temp.v select 'code2', public.lobby_state((select val::uuid from pg_temp.v where k = 'lobby2'))->>'code';
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select public.lobby_join((select val from pg_temp.v where k = 'code2'));
select pg_temp.as_user('00000000-0000-0000-0000-00000000000a');
select public.lobby_leave((select val::uuid from pg_temp.v where k = 'lobby2'));
select pg_temp.as_user('00000000-0000-0000-0000-00000000000b');
select pg_temp.eq(public.lobby_state((select val::uuid from pg_temp.v where k = 'lobby2'))->>'state', 'closed', 'anfitrião saiu: sala fechou');
select pg_temp.eq(public.online_ping('menu')->'lobby', 'null'::jsonb, 'ninguém fica preso em sala fechada');
