-- v29: passe de batalha mais difícil de subir, sem virar parede.
-- Antes: 1.000 XP por nível (40 níveis = 40.000), partida vencida dava ~2.000 XP e 5 missões por semana davam ~15.000.
-- Um jogador fechava 15 níveis em 3 dias. Agora:
--   1. Nível com custo crescente: nível n custa xp_per + xp_step × (n-1)  → 1.000 no 1, 1.500 no 6, 4.900 no 40
--      (total 118.000). XP para chegar no nível L = xp_per·L + xp_step·L(L-1)/2.
--   2. XP de partida: onda × 12 + abates ÷ 5 (até 40 por onda) + 80 por chefe. Vitória típica ≈ 640 (era ≈ 2.070).
--   3. Ritmo do dia: os primeiros 2.000 XP de partida do dia (horário de Brasília) contam inteiros, o que passar
--      disso conta pela metade. Missões não entram nessa conta.
--   4. Missões dão metade do XP de passe (1.000 a 2.000).
--   5. Quem já tinha XP fica no MESMO nível e com a mesma fração da barra (nada é tirado).
-- Ritmo esperado na temporada de 8 semanas: quem joga ~3 partidas por dia e faz as missões fecha o passe na
-- semana 7; quem joga 1 partida por dia chega perto do nível 20.
-- Todos os números ficam em tabela (seasons / meta_config), nada fixo no código.

alter table public.seasons add column if not exists xp_step integer not null default 0;

alter table public.meta_config
  add column if not exists pass_wave integer,
  add column if not exists pass_kill_div integer,
  add column if not exists pass_kill_cap integer,
  add column if not exists pass_boss integer,
  add column if not exists pass_day_full integer,
  add column if not exists pass_day_rate numeric;
update public.meta_config set pass_wave = 12, pass_kill_div = 5, pass_kill_cap = 40, pass_boss = 80,
  pass_day_full = 2000, pass_day_rate = 0.5 where id = 1;

alter table public.pass_progress
  add column if not exists day date,
  add column if not exists day_xp integer not null default 0;

-- XP total para chegar ao nível L
create or replace function public.pass_xp_for(p_season integer, p_level integer) returns bigint
language sql stable security definer set search_path to '' as $f$
  select se.xp_per::bigint * greatest(p_level, 0) + se.xp_step::bigint * greatest(p_level, 0) * (greatest(p_level, 0) - 1) / 2
  from public.seasons se where se.id = p_season;
$f$;

-- nível alcançado com p_xp (no máximo o último nível da temporada)
create or replace function public.pass_level(p_season integer, p_xp bigint) returns integer
language plpgsql stable security definer set search_path to '' as $f$
declare se public.seasons; l int := 0;
begin
  select * into se from public.seasons where id = p_season;
  if not found then return 0; end if;
  while l < se.levels and public.pass_xp_for(p_season, l + 1) <= p_xp loop l := l + 1; end loop;
  return l;
end $f$;

-- soma o XP de uma partida aceita no passe, já com o ritmo do dia. Devolve o XP que entrou e o do dia.
create or replace function public.pass_add_match(p_uid uuid, p_season integer, p_wave integer, p_kills integer, p_bosses integer)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare c public.meta_config; pp public.pass_progress; today date := (now() at time zone 'America/Sao_Paulo')::date;
  base int; dx int; full_part int; got int;
begin
  select * into c from public.meta_config where id = 1;
  base := ((greatest(p_wave, 0) * c.pass_wave + least(greatest(p_kills, 0), c.pass_kill_cap * greatest(p_wave, 1)) / c.pass_kill_div
    + c.pass_boss * greatest(p_bosses, 0)) * public.xp_mult())::int;
  insert into public.pass_progress (user_id, season) values (p_uid, p_season) on conflict do nothing;
  select * into pp from public.pass_progress where user_id = p_uid and season = p_season for update;
  dx := case when pp.day = today then pp.day_xp else 0 end;
  full_part := least(base, greatest(c.pass_day_full - dx, 0));
  got := full_part + floor((base - full_part) * c.pass_day_rate)::int;
  update public.pass_progress set xp = xp + got, day = today, day_xp = dx + got where user_id = p_uid and season = p_season;
  return jsonb_build_object('xp', got, 'base', base, 'day_xp', dx + got, 'day_full', c.pass_day_full);
end $f$;

-- partida: igual à v28.8, só troca a conta do XP do passe
create or replace function public.submit_run(p_run bigint, p_wave integer, p_kills integer, p_seconds integer, p_shots integer, p_hits integer, p_bosses integer, p_won boolean, p_heads integer default 0, p_night boolean default false)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare uid uuid := auth.uid(); r public.runs; real_s int; why text := null; ok boolean; w date; s int; pxp int := 0; px jsonb; box bigint;
  c public.meta_config; v_coins int; cxp int; lv jsonb;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  select * into r from public.runs where id = p_run and user_id = uid for update;
  if not found then raise exception 'PARTIDA_DESCONHECIDA'; end if;
  if r.ended_at is not null then raise exception 'PARTIDA_JA_ENVIADA'; end if;
  real_s := extract(epoch from now() - r.started_at)::int;
  if p_wave is null or p_wave < 0 or p_wave > 20 then why := 'onda';
  elsif p_seconds < 0 or p_seconds > real_s + 20 then why := 'tempo maior que o real';
  elsif p_wave > 1 and real_s < (p_wave - 1) * 20 then why := 'rapido demais';
  elsif p_kills < 0 or p_kills > 60 * greatest(p_wave, 1) + 40 then why := 'abates';
  elsif p_shots < 0 or p_hits < 0 or p_hits > p_shots + p_kills * 2 then why := 'tiros';
  elsif p_heads < 0 or p_heads > p_kills then why := 'cabeca';
  elsif p_bosses < 0 or p_bosses > 3 then why := 'chefes';
  elsif p_won and p_wave < 20 then why := 'vitoria';
  end if;
  ok := why is null;
  update public.runs set ended_at = now(), wave = p_wave, kills = p_kills, seconds = p_seconds, shots = p_shots, hits = p_hits,
    bosses = p_bosses, won = p_won, accepted = ok, reason = why where id = p_run;
  if not ok then return jsonb_build_object('ok', false, 'reason', why); end if;
  update public.player_stats set matches = matches + 1, wins = wins + (case when p_won then 1 else 0 end), kills = kills + p_kills,
    deaths = deaths + (case when p_won then 0 else 1 end), shots = shots + p_shots, hits = hits + p_hits, bosses = bosses + p_bosses,
    best_wave = greatest(best_wave, p_wave), play_seconds = play_seconds + p_seconds, updated_at = now()
  where user_id = uid;
  insert into public.map_stats as m (user_id, map_id, matches, wins, kills, play_seconds, best_wave, best_kills, best_seconds, best_at)
  values (uid, r.map_id, 1, case when p_won then 1 else 0 end, p_kills, p_seconds, p_wave, p_kills, p_seconds, now())
  on conflict (user_id, map_id) do update set
    matches = m.matches + 1, wins = m.wins + excluded.wins, kills = m.kills + excluded.kills, play_seconds = m.play_seconds + excluded.play_seconds,
    best_wave = case when (excluded.best_wave, excluded.best_kills, -excluded.best_seconds) > (m.best_wave, m.best_kills, -m.best_seconds) then excluded.best_wave else m.best_wave end,
    best_kills = case when (excluded.best_wave, excluded.best_kills, -excluded.best_seconds) > (m.best_wave, m.best_kills, -m.best_seconds) then excluded.best_kills else m.best_kills end,
    best_seconds = case when (excluded.best_wave, excluded.best_kills, -excluded.best_seconds) > (m.best_wave, m.best_kills, -m.best_seconds) then excluded.best_seconds else m.best_seconds end,
    best_at = case when (excluded.best_wave, excluded.best_kills, -excluded.best_seconds) > (m.best_wave, m.best_kills, -m.best_seconds) then now() else m.best_at end;
  select * into c from public.meta_config where id = 1;
  v_coins := round(p_wave * c.coins_wave + p_kills * c.coins_kill)::int + (case when p_won then c.win_coins else 0 end);
  cxp := round(p_wave * c.xp_wave + p_kills * c.xp_kill)::int + (case when p_won then c.win_xp else 0 end);
  perform public.wallet_add(uid, 'coin', v_coins, 'partida ' || r.map_id, null, p_run);
  lv := public.char_xp_add(uid, cxp);
  -- XP do passe (v29: conta nova + ritmo do dia)
  s := public.cur_season();
  if s is not null then px := public.pass_add_match(uid, s, p_wave, p_kills, p_bosses); pxp := (px ->> 'xp')::int; end if;
  w := public.ensure_week();
  insert into public.mission_progress (user_id, week, slot) select uid, w, slot from public.mission_week where week = w on conflict do nothing;
  update public.mission_progress p set progress = case m.kind
      when 'kills' then p.progress + p_kills when 'heads' then p.progress + p_heads when 'bosses' then p.progress + p_bosses
      when 'matches' then p.progress + 1 when 'wins' then p.progress + (case when p_won then 1 else 0 end)
      when 'wave_any' then greatest(p.progress, p_wave) when 'wave_night' then greatest(p.progress, case when p_night then p_wave else 0 end)
      else p.progress end
    from public.mission_week m where p.user_id = uid and p.week = w and m.week = w and m.slot = p.slot and not p.claimed;
  if p_won then insert into public.boxes (user_id, source, run_id) values (uid, 'vitoria ' || r.map_id, p_run) returning id into box; end if;
  return jsonb_build_object('ok', true, 'pass_xp', pxp, 'pass_base', coalesce((px ->> 'base')::int, 0),
    'pass_day', coalesce((px ->> 'day_xp')::int, 0), 'pass_day_full', coalesce((px ->> 'day_full')::int, 0), 'box', box,
    'coins', v_coins, 'char_xp', cxp, 'wallet_coins', (select w2.coins from public.wallets w2 where w2.user_id = uid),
    'level', lv -> 'level', 'xp', lv -> 'xp', 'need', lv -> 'need', 'ups', lv -> 'ups');
end $f$;

-- resgate: o nível vem da curva nova
create or replace function public.claim_pass(p_level integer, p_track text)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare uid uuid := auth.uid(); s int := public.cur_season(); pp public.pass_progress; rw public.pass_rewards;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  select * into pp from public.pass_progress where user_id = uid and season = s for update;
  if not found then raise exception 'SEM_TEMPORADA'; end if;
  select * into rw from public.pass_rewards where season = s and level = p_level and track = p_track;
  if not found then raise exception 'SEM_PREMIO'; end if;
  if public.pass_level(s, pp.xp) < p_level then raise exception 'NIVEL_NAO_ALCANCADO'; end if;
  if p_track = 'prem' and not pp.premium then raise exception 'SEM_PASSE'; end if;
  if (p_track = 'free' and p_level = any(pp.claimed_free)) or (p_track = 'prem' and p_level = any(pp.claimed_prem)) then raise exception 'JA_RESGATADO'; end if;
  if p_track = 'free' then update public.pass_progress set claimed_free = claimed_free || p_level where user_id = uid and season = s;
  else update public.pass_progress set claimed_prem = claimed_prem || p_level where user_id = uid and season = s; end if;
  return public.grant_prize(uid, rw.kind, rw.amount, rw.item_id, 'passe ' || s || ' nivel ' || p_level);
end $f$;

-- get_economy: manda xp_step e o XP de partida do dia para a tela do passe
create or replace function public.get_economy()
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare uid uuid := auth.uid(); w date; s int; r jsonb; today date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  insert into public.wallets (user_id) values (uid) on conflict do nothing;
  w := public.ensure_week(); s := public.cur_season();
  if s is not null then insert into public.pass_progress (user_id, season) values (uid, s) on conflict do nothing; end if;
  select jsonb_build_object(
    'wallet', (select jsonb_build_object('chips', chips, 'zcoin', zcoin, 'coins', coins, 'level', char_level, 'xp', char_xp,
       'need', public.lvl_need(char_level), 'imported', meta_imported) from public.wallets where user_id = uid),
    'skills', coalesce((select jsonb_object_agg(skill, level) from public.skill_levels where user_id = uid), '{}'::jsonb),
    'costs', (select jsonb_object_agg(skill || ':' || level, chips) from public.skill_costs),
    'items', coalesce((select jsonb_agg(item_id) from public.items_owned where user_id = uid), '[]'::jsonb),
    'shop', (select jsonb_agg(jsonb_build_object('id', item_id, 'rarity', rarity, 'price', price_z, 'kind', kind)) from public.shop_items where active and price_z is not null),
    'week', w,
    'missions', (select jsonb_agg(jsonb_build_object('slot', m.slot, 'kind', m.kind, 'target', m.target, 'text', m.text, 'coins', m.coins, 'xp', m.xp, 'zcoin', m.zcoin, 'chips', m.chips,
       'progress', coalesce(p.progress, 0), 'claimed', coalesce(p.claimed, false)) order by m.slot)
       from public.mission_week m left join public.mission_progress p on p.user_id = uid and p.week = m.week and p.slot = m.slot where m.week = w),
    'pass', (select jsonb_build_object('season', se.id, 'name', se.name, 'ends', se.ends_at, 'levels', se.levels, 'xp_per', se.xp_per,
       'xp_step', se.xp_step, 'price', se.premium_price,
       'xp', pp.xp, 'premium', pp.premium, 'free', pp.claimed_free, 'prem', pp.claimed_prem,
       'day_xp', case when pp.day = today then pp.day_xp else 0 end,
       'day_full', (select pass_day_full from public.meta_config where id = 1),
       'match', (select jsonb_build_object('wave', pass_wave, 'kill_div', pass_kill_div, 'kill_cap', pass_kill_cap, 'boss', pass_boss, 'day_rate', pass_day_rate) from public.meta_config where id = 1),
       'rewards', (select jsonb_agg(jsonb_build_object('l', level, 't', track, 'k', kind, 'a', amount, 'i', item_id) order by level, track) from public.pass_rewards where season = se.id))
       from public.seasons se join public.pass_progress pp on pp.season = se.id and pp.user_id = uid where se.id = s),
    'boxes', (select count(*) from public.boxes where user_id = uid and opened_at is null),
    'event', (select jsonb_build_object('name', e.name, 'mult', e.mult, 'ends', e.ends_at) from public.xp_events e where now() >= e.starts_at and now() < e.ends_at order by e.mult desc limit 1)
  ) into r;
  return r;
end $f$;

revoke all on function public.pass_xp_for(integer, integer), public.pass_level(integer, bigint),
  public.pass_add_match(uuid, integer, integer, integer, integer) from public, anon, authenticated;

-- missões: metade do XP de passe (as já resgatadas não mudam)
update public.mission_pool set xp = xp / 2;
update public.mission_week set xp = xp / 2 where week >= public.cur_week();

-- curva nova na temporada 1, mantendo o nível e a fração da barra de quem já jogou
do $m$
declare r record; base int; step int := 100; l int; frac numeric;
begin
  select xp_per into base from public.seasons where id = 1;
  if base is null then return; end if;
  for r in select user_id, xp from public.pass_progress where season = 1 and xp > 0 for update loop
    l := least(40, r.xp / base);
    frac := case when l >= 40 then 0 else (r.xp - l * base)::numeric / base end;
    update public.pass_progress
      set xp = base * l + step * l * (l - 1) / 2 + floor(frac * (base + step * l))::int
      where user_id = r.user_id and season = 1;
  end loop;
  update public.seasons set xp_step = step where id = 1;
end $m$;
