-- v28.8: moedas comuns, nível e XP do personagem passam a morar no servidor.
-- Antes: o jogo somava moedas, XP e nível no save do aparelho (qz_save) e mandava para `progress`,
-- que o próprio jogador pode reescrever. Agora quem soma é o servidor, nas mesmas funções que já
-- conferem a partida (submit_run) e pagam prêmios (claim_mission, grant_prize); toda entrada e saída
-- de moeda vai para o `ledger` com currency = 'coin'.
-- O save do aparelho continua guardando visual, recordes e mapas vencidos; moedas, XP e nível de lá
-- passam a ser só um espelho do que o servidor devolve.
-- Aplicada no projeto em 2026-11-21 (migração v28_8_moedas_nivel_servidor). Os preços (final do arquivo) saem de:
--   node tools/serve.js . 8377 &  node tools/patches/v28.8-precos-sql.js

-- ---------- carteira: moedas, nível e XP ----------
alter table public.wallets
  add column if not exists coins integer not null default 0 check (coins >= 0),
  add column if not exists char_level integer not null default 1 check (char_level >= 1),
  add column if not exists char_xp integer not null default 0 check (char_xp >= 0),
  add column if not exists meta_imported boolean not null default false;

alter table public.ledger drop constraint if exists ledger_currency_check;
alter table public.ledger add constraint ledger_currency_check check (currency = any (array['chip', 'zcoin', 'coin']));

-- ---------- valores de jogo (os mesmos de CONFIG.meta e CONFIG.boss.win no index.html) ----------
create table if not exists public.meta_config (
  id integer primary key default 1 check (id = 1),
  coins_wave numeric not null, coins_kill numeric not null, win_coins integer not null,
  xp_wave numeric not null, xp_kill numeric not null, win_xp integer not null,
  level_base integer not null, level_grow numeric not null,
  -- teto da importação única do save antigo (por partida aceita no servidor, mais uma folga)
  import_coins_per_match integer not null, import_coins_extra integer not null,
  import_xp_per_match integer not null, import_xp_extra integer not null
);
alter table public.meta_config enable row level security;
-- PALPITE: tetos de importação. Uma partida vencida na onda 20 com o máximo de abates aceito dá
-- 20×6 + 1.240×0,4 + 400 ≈ 1.016 moedas e 20×45 + 1.240×2 + 250 = 3.630 XP. A folga cobre partidas
-- jogadas antes de existir conta (e prêmios de missão e caixa, que eram somados no aparelho).
insert into public.meta_config values (1, 6, 0.4, 400, 45, 2, 250, 300, 1.22, 1100, 5000, 3700, 15000)
on conflict (id) do nothing;

-- ---------- preços em moedas (loja do menu: roupas comuns e kits) ----------
create table if not exists public.coin_prices (
  item_id text primary key, price integer not null check (price > 0), active boolean not null default true
);
create table if not exists public.coin_kits (
  kit_id text primary key, items text[] not null, active boolean not null default true
);
alter table public.coin_prices enable row level security;
alter table public.coin_kits enable row level security;

-- ---------- livro: moedas também passam por aqui ----------
create or replace function public.wallet_add(p_uid uuid, p_cur text, p_delta integer, p_reason text, p_ref text default null, p_run bigint default null)
returns void language plpgsql security definer set search_path to '' as $f$
begin
  if p_delta = 0 then return; end if;
  insert into public.wallets (user_id) values (p_uid) on conflict do nothing;
  if p_cur = 'chip' then update public.wallets set chips = chips + p_delta, updated_at = now() where user_id = p_uid;
  elsif p_cur = 'coin' then update public.wallets set coins = coins + p_delta, updated_at = now() where user_id = p_uid;
  elsif p_cur = 'zcoin' then update public.wallets set zcoin = zcoin + p_delta, updated_at = now() where user_id = p_uid;
  else raise exception 'MOEDA_INVALIDA'; end if;
  insert into public.ledger (user_id, currency, delta, reason, ref, run_id) values (p_uid, p_cur, p_delta, p_reason, p_ref, p_run);
end $f$;

-- XP para passar do nível l (igual a lvlNeed no jogo)
create or replace function public.lvl_need(l integer) returns integer language sql stable security definer set search_path to '' as $f$
  select (round(c.level_base * power(c.level_grow, greatest(l, 1) - 1) / 10) * 10)::int from public.meta_config c where c.id = 1;
$f$;

-- soma XP de personagem e sobe de nível; devolve nível, XP dentro do nível e quantos níveis subiu
create or replace function public.char_xp_add(p_uid uuid, p_xp integer)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare lv int; x int; ups int := 0; need int;
begin
  insert into public.wallets (user_id) values (p_uid) on conflict do nothing;
  select char_level, char_xp + greatest(p_xp, 0) into lv, x from public.wallets where user_id = p_uid for update;
  loop
    need := public.lvl_need(lv);
    exit when x < need or ups >= 200;
    x := x - need; lv := lv + 1; ups := ups + 1;
  end loop;
  update public.wallets set char_level = lv, char_xp = x, updated_at = now() where user_id = p_uid;
  return jsonb_build_object('level', lv, 'xp', x, 'need', public.lvl_need(lv), 'ups', ups);
end $f$;

-- prêmio de passe/caixa: moedas agora entram no servidor
create or replace function public.grant_prize(p_uid uuid, p_kind text, p_amount integer, p_item text, p_reason text)
returns jsonb language plpgsql security definer set search_path to '' as $f$
begin
  if p_kind = 'chip' then perform public.wallet_add(p_uid, 'chip', p_amount, p_reason);
  elsif p_kind = 'zcoin' then perform public.wallet_add(p_uid, 'zcoin', p_amount, p_reason);
  elsif p_kind = 'coins' then perform public.wallet_add(p_uid, 'coin', p_amount, p_reason);
  elsif p_kind = 'item' then insert into public.items_owned values (p_uid, p_item, p_reason, now()) on conflict do nothing;
  end if;
  return jsonb_build_object('kind', p_kind, 'amount', p_amount, 'item', p_item);
end $f$;

-- missão: as moedas da recompensa agora entram no servidor
create or replace function public.claim_mission(p_slot integer)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare uid uuid := auth.uid(); w date := public.ensure_week(); m public.mission_week; pr public.mission_progress; s int := public.cur_season();
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  select * into m from public.mission_week where week = w and slot = p_slot;
  if not found then raise exception 'SEM_MISSAO'; end if;
  select * into pr from public.mission_progress where user_id = uid and week = w and slot = p_slot for update;
  if not found or pr.progress < m.target then raise exception 'MISSAO_INCOMPLETA'; end if;
  if pr.claimed then raise exception 'JA_RESGATADO'; end if;
  update public.mission_progress set claimed = true where user_id = uid and week = w and slot = p_slot;
  if m.coins > 0 then perform public.wallet_add(uid, 'coin', m.coins, 'missao ' || w || ' ' || p_slot); end if;
  if m.zcoin > 0 then perform public.wallet_add(uid, 'zcoin', m.zcoin, 'missao ' || w || ' ' || p_slot); end if;
  if m.chips > 0 then perform public.wallet_add(uid, 'chip', m.chips, 'missao ' || w || ' ' || p_slot); end if;
  if s is not null then
    insert into public.pass_progress (user_id, season) values (uid, s) on conflict do nothing;
    update public.pass_progress set xp = xp + m.xp where user_id = uid and season = s;
  end if;
  return jsonb_build_object('coins', m.coins, 'xp', m.xp, 'zcoin', m.zcoin, 'chips', m.chips,
    'wallet_coins', (select coins from public.wallets where user_id = uid));
end $f$;

-- partida: mesma conferência de antes; se aceita, o servidor paga moedas e XP de personagem
create or replace function public.submit_run(p_run bigint, p_wave integer, p_kills integer, p_seconds integer, p_shots integer, p_hits integer, p_bosses integer, p_won boolean, p_heads integer default 0, p_night boolean default false)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare uid uuid := auth.uid(); r public.runs; real_s int; why text := null; ok boolean; w date; s int; pxp int; box bigint;
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
  -- moedas e XP do personagem (mesma conta do jogo: onda × 6 + abates × 0,4, vitória +400; onda × 45 + abates × 2, vitória +250)
  select * into c from public.meta_config where id = 1;
  v_coins := round(p_wave * c.coins_wave + p_kills * c.coins_kill)::int + (case when p_won then c.win_coins else 0 end);
  cxp := round(p_wave * c.xp_wave + p_kills * c.xp_kill)::int + (case when p_won then c.win_xp else 0 end);
  perform public.wallet_add(uid, 'coin', v_coins, 'partida ' || r.map_id, null, p_run);
  lv := public.char_xp_add(uid, cxp);
  -- XP do passe
  s := public.cur_season();
  pxp := ((p_wave * 20 + least(p_kills, 60 * greatest(p_wave, 1)) + 200 * p_bosses) * public.xp_mult())::int;
  if s is not null then
    insert into public.pass_progress (user_id, season) values (uid, s) on conflict do nothing;
    update public.pass_progress set xp = xp + pxp where user_id = uid and season = s;
  end if;
  -- missões da semana
  w := public.ensure_week();
  insert into public.mission_progress (user_id, week, slot) select uid, w, slot from public.mission_week where week = w on conflict do nothing;
  update public.mission_progress p set progress = case m.kind
      when 'kills' then p.progress + p_kills when 'heads' then p.progress + p_heads when 'bosses' then p.progress + p_bosses
      when 'matches' then p.progress + 1 when 'wins' then p.progress + (case when p_won then 1 else 0 end)
      when 'wave_any' then greatest(p.progress, p_wave) when 'wave_night' then greatest(p.progress, case when p_night then p_wave else 0 end)
      else p.progress end
    from public.mission_week m where p.user_id = uid and p.week = w and m.week = w and m.slot = p.slot and not p.claimed;
  -- caixa grátis por vencer o mapa
  if p_won then insert into public.boxes (user_id, source, run_id) values (uid, 'vitoria ' || r.map_id, p_run) returning id into box; end if;
  return jsonb_build_object('ok', true, 'pass_xp', pxp, 'box', box,
    'coins', v_coins, 'char_xp', cxp, 'wallet_coins', (select w2.coins from public.wallets w2 where w2.user_id = uid),
    'level', lv -> 'level', 'xp', lv -> 'xp', 'need', lv -> 'need', 'ups', lv -> 'ups');
end $f$;

-- loja do menu: roupa comum com moedas
create or replace function public.buy_look(p_item text)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare uid uuid := auth.uid(); pr int; have int;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  select price into pr from public.coin_prices where item_id = p_item and active;
  if not found then raise exception 'ITEM_INVALIDO'; end if;
  if exists (select 1 from public.items_owned where user_id = uid and item_id = p_item) then raise exception 'JA_TEM'; end if;
  insert into public.wallets (user_id) values (uid) on conflict do nothing;
  select coins into have from public.wallets where user_id = uid for update;
  if have < pr then raise exception 'MOEDAS_INSUFICIENTES'; end if;
  perform public.wallet_add(uid, 'coin', -pr, 'loja ' || p_item);
  insert into public.items_owned values (uid, p_item, 'moedas', now());
  return jsonb_build_object('items', jsonb_build_array(p_item), 'coins', (select coins from public.wallets where user_id = uid));
end $f$;

-- kit: 20% de desconto sobre as peças que o jogador ainda não tem (igual a kitPrice no jogo)
create or replace function public.buy_kit(p_kit text)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare uid uuid := auth.uid(); k public.coin_kits; sm int; pr int; have int;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  select * into k from public.coin_kits where kit_id = p_kit and active;
  if not found then raise exception 'ITEM_INVALIDO'; end if;
  insert into public.wallets (user_id) values (uid) on conflict do nothing;
  select coins into have from public.wallets where user_id = uid for update;
  select coalesce(sum(cp.price), 0) into sm from unnest(k.items) as i(id)
    left join public.coin_prices cp on cp.item_id = i.id and cp.active
    where not exists (select 1 from public.items_owned o where o.user_id = uid and o.item_id = i.id);
  if sm = 0 then raise exception 'JA_TEM'; end if;
  pr := (round(sm * 0.8 / 10) * 10)::int;
  if have < pr then raise exception 'MOEDAS_INSUFICIENTES'; end if;
  perform public.wallet_add(uid, 'coin', -pr, 'kit ' || p_kit);
  insert into public.items_owned select uid, i.id, 'kit ' || p_kit, now() from unnest(k.items) as i(id) on conflict do nothing;
  return jsonb_build_object('items', to_jsonb(k.items), 'price', pr, 'coins', (select coins from public.wallets where user_id = uid));
end $f$;

-- uma vez por conta: traz moedas, nível, XP e roupas compradas com moedas do save antigo (progress.data),
-- com teto pelas partidas que o servidor aceitou. Contas criadas depois desta migração não importam nada.
create or replace function public.import_meta()
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare uid uuid := auth.uid(); w public.wallets; c public.meta_config; d jsonb; n int; v_coins int; lv int; x int; tot bigint; srv_tot bigint; cap bigint; res jsonb;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  insert into public.wallets (user_id) values (uid) on conflict do nothing;
  select * into w from public.wallets where user_id = uid for update;
  if not w.meta_imported then
    select * into c from public.meta_config where id = 1;
    select coalesce(data, '{}'::jsonb) into d from public.progress where user_id = uid;
    select coalesce(matches, 0) into n from public.player_stats where user_id = uid;
    n := coalesce(n, 0);
    -- moedas: o que o save diz, até o teto
    v_coins := case when coalesce(d ->> 'coins', '') ~ '^[0-9]{1,9}$' then (d ->> 'coins')::int else 0 end;
    v_coins := least(v_coins, c.import_coins_per_match * n + c.import_coins_extra);
    -- nível: converte nível + XP em XP total, aplica o teto e refaz o nível
    lv := case when coalesce(d ->> 'level', '') ~ '^[0-9]{1,3}$' then least(greatest((d ->> 'level')::int, 1), 60) else 1 end;
    x := case when coalesce(d ->> 'xp', '') ~ '^[0-9]{1,9}$' then (d ->> 'xp')::int else 0 end;
    select coalesce(sum(public.lvl_need(g)), 0) + x into tot from generate_series(1, lv - 1) g;
    cap := c.import_xp_per_match::bigint * n + c.import_xp_extra;
    tot := least(tot, cap);
    -- se o servidor já pagou partidas antes desta importação (migração aplicada antes do jogo novo chegar
    -- ao aparelho), essas partidas também estão no save: fica o maior dos dois, sem somar duas vezes
    v_coins := greatest(v_coins, w.coins);
    select coalesce(sum(public.lvl_need(g)), 0) + w.char_xp into srv_tot from generate_series(1, w.char_level - 1) g;
    tot := greatest(tot, srv_tot);
    update public.wallets set meta_imported = true, char_level = 1, char_xp = 0 where user_id = uid;
    perform public.wallet_add(uid, 'coin', v_coins - w.coins, 'importacao do save');
    perform public.char_xp_add(uid, tot::int);
    -- roupas da loja de moedas que já estavam no inventário do aparelho
    insert into public.items_owned (user_id, item_id, source, created_at)
      select uid, cp.item_id, 'importacao', now() from public.coin_prices cp
      where d -> 'inv' ? cp.item_id on conflict do nothing;
  end if;
  select jsonb_build_object('coins', w2.coins, 'level', w2.char_level, 'xp', w2.char_xp, 'need', public.lvl_need(w2.char_level)) into res
    from public.wallets w2 where w2.user_id = uid;
  return res;
end $f$;

-- conta nova: já nasce importada (nada a trazer do save)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path to '' as $f$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.progress (user_id) values (new.id) on conflict do nothing;
  insert into public.player_stats (user_id) values (new.id) on conflict do nothing;
  insert into public.wallets (user_id, meta_imported) values (new.id, true) on conflict do nothing;
  return new;
end $f$;

-- economia: a carteira passa a trazer moedas, nível e XP
create or replace function public.get_economy()
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare uid uuid := auth.uid(); w date; s int; r jsonb;
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
    'pass', (select jsonb_build_object('season', se.id, 'name', se.name, 'ends', se.ends_at, 'levels', se.levels, 'xp_per', se.xp_per, 'price', se.premium_price,
       'xp', pp.xp, 'premium', pp.premium, 'free', pp.claimed_free, 'prem', pp.claimed_prem,
       'rewards', (select jsonb_agg(jsonb_build_object('l', level, 't', track, 'k', kind, 'a', amount, 'i', item_id) order by level, track) from public.pass_rewards where season = se.id))
       from public.seasons se join public.pass_progress pp on pp.season = se.id and pp.user_id = uid where se.id = s),
    'boxes', (select count(*) from public.boxes where user_id = uid and opened_at is null),
    'event', (select jsonb_build_object('name', e.name, 'mult', e.mult, 'ends', e.ends_at) from public.xp_events e where now() >= e.starts_at and now() < e.ends_at order by e.mult desc limit 1)
  ) into r;
  return r;
end $f$;

-- ---------- permissões: só as funções que o jogo chama ficam abertas, e só para quem entrou ----------
revoke execute on function public.wallet_add(uuid, text, integer, text, text, bigint) from public, anon, authenticated;
revoke execute on function public.char_xp_add(uuid, integer) from public, anon, authenticated;
revoke execute on function public.grant_prize(uuid, text, integer, text, text) from public, anon, authenticated;
revoke execute on function public.lvl_need(integer) from public, anon, authenticated;
revoke execute on function public.buy_look(text) from public, anon;
revoke execute on function public.buy_kit(text) from public, anon;
revoke execute on function public.import_meta() from public, anon;
grant execute on function public.buy_look(text) to authenticated;
grant execute on function public.buy_kit(text) to authenticated;
grant execute on function public.import_meta() to authenticated;

-- ---------- preços (gerado por tools/patches/v28.8-precos-sql.js) ----------
insert into public.coin_prices (item_id, price) values
('bone_preto',150),
('bone_vermelho',150),
('bone_verde',150),
('bone_azul',150),
('bone_virado',180),
('viseira',160),
('bandana_vermelha',140),
('bandana_preta',140),
('touca',170),
('chapeu_pescador',250),
('panama',350),
('capacete_moto',600),
('chapeu_palha',220),
('camiseta_preta',100),
('corta_vento_vermelho',150),
('moletom_time',250),
('jaqueta_jeans',400),
('regata_branca',120),
('camisa_time',200),
('camisa_havaiana',300),
('camisa_tatica',500),
('jaqueta_couro',550),
('moletom_capuz',280),
('camisa_social',260),
('jeans_claro',140),
('bermuda',150),
('bermuda_praia',180),
('calca_cargo',260),
('calca_moletom',200),
('calca_couro',500),
('tenis_branco',140),
('tenis_preto',130),
('chinelo',120),
('coturno',300),
('chuteira',260),
('bota',350),
('oculos_redondo',200),
('oculos_aviador',350),
('mascara',150),
('bandana_pescoco',140),
('cordao_ouro',600),
('corrente_prata',400),
('fone',260),
('mochila_escolar',220),
('mochila_tatica',450),
('mochila_pequena',160),
('capa_chuva',300),
('cinto_utilidades',200),
('pochete',170),
('coldre_perna',280),
('coldre_ombro',300)
on conflict (item_id) do update set price = excluded.price, active = true;
insert into public.coin_kits (kit_id, items) values
('kit_carioca',array['regata_branca','bermuda','chinelo','oculos_escuro','bone_azul']),
('kit_tatico',array['camisa_tatica','calca_cargo','coturno','mochila_tatica','cinto_utilidades']),
('kit_baile',array['bone_virado','corrente_prata','camisa_time','bermuda','tenis_branco']),
('kit_praia',array['chapeu_palha','oculos_redondo','regata_branca','bermuda_praia','chinelo']),
('kit_lapa',array['panama','camisa_social','cordao_ouro','jeans_claro','sapato_preto']),
('kit_cristo',array['chapeu_pescador','moletom_capuz','calca_cargo','bota','mochila_pequena']),
('kit_orla',array['viseira','regata_branca','bermuda_praia','tenis_branco','fone'])
on conflict (kit_id) do update set items = excluded.items, active = true;
