-- Testes do passe v29. Cada bloco levanta exceção se o resultado não for o esperado.
create function pg_temp.eq(a anyelement, b anyelement, what text) returns void language plpgsql as $$
begin if a is distinct from b then raise exception 'FALHOU %: esperado %, veio %', what, b, a; end if; raise notice 'ok  %', what; end $$;

-- curva
select pg_temp.eq(public.pass_xp_for(1, 1), 1000::bigint, 'nivel 1 custa 1000');
select pg_temp.eq(public.pass_xp_for(1, 2), 2100::bigint, 'nivel 2 custa 1100');
select pg_temp.eq(public.pass_xp_for(1, 40) - public.pass_xp_for(1, 39), 4900::bigint, 'nivel 40 custa 4900');
select pg_temp.eq(public.pass_xp_for(1, 40), 118000::bigint, 'passe inteiro = 118000');
select pg_temp.eq(public.pass_level(1, 999), 0, 'nivel 0 com 999');
select pg_temp.eq(public.pass_level(1, 2100), 2, 'nivel 2 exato');
select pg_temp.eq(public.pass_level(1, 999999), 40, 'teto no 40');

-- migração mantém o nível e a fração de quem já jogou
select pg_temp.eq((select public.pass_level(1, xp) from public.pass_progress where user_id = '00000000-0000-0000-0000-00000000000a'), 15, 'A segue no 15');
select pg_temp.eq((select xp from public.pass_progress where user_id = '00000000-0000-0000-0000-00000000000a'), 25500 + 1935, 'A com 77,4% da barra do 16');
select pg_temp.eq((select xp from public.pass_progress where user_id = '00000000-0000-0000-0000-00000000000b'), 287, 'B igual');
select pg_temp.eq((select public.pass_level(1, xp) from public.pass_progress where user_id = '00000000-0000-0000-0000-00000000000c'), 40, 'C segue completo');

-- missões pela metade
select pg_temp.eq((select sum(xp)::int from public.mission_pool), 3500, 'pool pela metade');
select pg_temp.eq((select xp from public.mission_week where week = '2026-11-16'), 1500, 'semana atual pela metade');
select pg_temp.eq((select xp from public.mission_week where week = '2026-11-09'), 4000, 'semana passada intacta');

-- partida: vitória da foto (onda 20, 1069 abates, 3 chefes) = 240 + 800/5 + 240 = 640
select pg_temp.eq((public.pass_add_match('00000000-0000-0000-0000-00000000000b', 1, 20, 1069, 3) ->> 'xp')::int, 640, 'vitoria = 640');
select pg_temp.eq((public.pass_add_match('00000000-0000-0000-0000-00000000000b', 1, 10, 300, 0) ->> 'xp')::int, 180, 'onda 10 = 180');
select pg_temp.eq((public.pass_add_match('00000000-0000-0000-0000-00000000000b', 1, 20, 1069, 3) ->> 'xp')::int, 640, '3a partida ainda inteira (1460)');
-- 1460 + 640: 540 inteiros + 100/2 = 590
select pg_temp.eq((public.pass_add_match('00000000-0000-0000-0000-00000000000b', 1, 20, 1069, 3) ->> 'xp')::int, 590, 'passa do limite do dia: metade do excesso');
select pg_temp.eq((public.pass_add_match('00000000-0000-0000-0000-00000000000b', 1, 20, 1069, 3) ->> 'xp')::int, 320, 'depois do limite: metade');
select pg_temp.eq((select xp from public.pass_progress where user_id = '00000000-0000-0000-0000-00000000000b'), 287 + 640 + 180 + 640 + 590 + 320, 'xp somado');
-- dia novo zera o ritmo
update public.pass_progress set day = day - 1 where user_id = '00000000-0000-0000-0000-00000000000b';
select pg_temp.eq((public.pass_add_match('00000000-0000-0000-0000-00000000000b', 1, 20, 1069, 3) ->> 'xp')::int, 640, 'dia novo volta inteiro');
-- evento x2 dobra a base
insert into public.xp_events values ('x2', 2, now() - interval '1 hour', now() + interval '1 hour');
select pg_temp.eq((public.pass_add_match('00000000-0000-0000-0000-00000000000a', 1, 10, 300, 0) ->> 'base')::int, 360, 'evento x2');
delete from public.xp_events;

-- resgate usa a curva nova
set qz.uid = '00000000-0000-0000-0000-00000000000b';
do $$ begin perform public.claim_pass(3, 'free'); raise exception 'deveria travar'; exception when others then
  if sqlerrm <> 'NIVEL_NAO_ALCANCADO' then raise; end if; raise notice 'ok  nivel 3 travado com 3297'; end $$;
select pg_temp.eq(public.claim_pass(2, 'free') ->> 'ok', 'true', 'nivel 2 liberado');
set qz.uid = '00000000-0000-0000-0000-00000000000a';
-- A: 27435 + 360 = 27795, o 16 pede 28000
do $$ begin perform public.claim_pass(16, 'free'); raise exception 'deveria travar'; exception when others then
  if sqlerrm <> 'NIVEL_NAO_ALCANCADO' then raise; end if; raise notice 'ok  A travado no 16 (faltam 205)'; end $$;
select pg_temp.eq((public.pass_add_match('00000000-0000-0000-0000-00000000000a', 1, 20, 1069, 3) ->> 'xp')::int, 640, 'A joga mais uma');
select pg_temp.eq(public.claim_pass(16, 'free') ->> 'ok', 'true', 'A pega o 16');
do $$ begin perform public.claim_pass(16, 'free'); raise exception 'deveria travar'; exception when others then
  if sqlerrm <> 'JA_RESGATADO' then raise; end if; raise notice 'ok  16 nao paga duas vezes'; end $$;
