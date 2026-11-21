-- v28.8c: as moedas que cada nível dá (CONFIG.meta.road, tipo "coins", PR #16) passam a ser pagas pelo servidor,
-- uma vez por nível, quando o XP de personagem sobe o nível (submit_run → char_xp_add). Vão para o ledger
-- como 'coin' com motivo "nivel N". wallets.lv_paid guarda até que nível já foi pago (igual a d.lvPaid no jogo).
-- Na importação do save antigo: save que ainda não passou pelo LEVEL.settle (lvV <> 288) recebe as moedas dos
-- níveis que já tinha; save que já passou tem essas moedas dentro de d.coins e não recebe de novo.
-- AINDA NÃO APLICADA no projeto (aguardando aprovação).
create table if not exists public.level_rewards (level integer primary key, coins integer not null check (coins > 0));
alter table public.level_rewards enable row level security;
insert into public.level_rewards (level, coins) values (2,150), (8,250), (14,350), (18,400), (23,500), (27,600), (29,650), (33,750), (37,850), (39,900), (42,1000), (44,1000), (47,1200), (49,1500)
on conflict (level) do update set coins = excluded.coins;

alter table public.wallets add column if not exists lv_paid integer not null default 1;

create or replace function public.char_xp_add(p_uid uuid, p_xp integer)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare lv int; x int; ups int := 0; need int; paid int; lc int := 0; mx int := coalesce((select level_max from public.meta_config where id = 1), 1000);
begin
  insert into public.wallets (user_id) values (p_uid) on conflict do nothing;
  select char_level, char_xp + greatest(p_xp, 0), lv_paid into lv, x, paid from public.wallets where user_id = p_uid for update;
  loop
    need := public.lvl_need(lv);
    exit when x < need or lv >= mx or ups >= 200;
    x := x - need; lv := lv + 1; ups := ups + 1;
  end loop;
  if lv >= mx then lv := mx; x := least(x, public.lvl_need(lv) - 1); end if;
  update public.wallets set char_level = lv, char_xp = x, lv_paid = greatest(lv_paid, lv), updated_at = now() where user_id = p_uid;
  -- moedas dos níveis novos, uma linha no livro por nível
  for need, lc in select r.level, r.coins from public.level_rewards r where r.level > paid and r.level <= lv order by r.level loop
    perform public.wallet_add(p_uid, 'coin', lc, 'nivel ' || need);
  end loop;
  select coalesce(sum(r.coins), 0) into lc from public.level_rewards r where r.level > paid and r.level <= lv;
  return jsonb_build_object('level', lv, 'xp', x, 'need', public.lvl_need(lv), 'ups', ups, 'max', mx, 'level_coins', lc);
end $f$;
revoke execute on function public.char_xp_add(uuid, integer) from public, anon, authenticated;

-- importação: decide até que nível as moedas já estão dentro do saldo do save
create or replace function public.import_meta()
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare uid uuid := auth.uid(); w public.wallets; c public.meta_config; d jsonb; n int; v_coins int; lv int; x int; tot bigint; srv_tot bigint; cap bigint; res jsonb; lp int; srv_lvc int;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  insert into public.wallets (user_id) values (uid) on conflict do nothing;
  select * into w from public.wallets where user_id = uid for update;
  if not w.meta_imported then
    select * into c from public.meta_config where id = 1;
    select coalesce(data, '{}'::jsonb) into d from public.progress where user_id = uid;
    select coalesce(matches, 0) into n from public.player_stats where user_id = uid;
    n := coalesce(n, 0);
    v_coins := case when coalesce(d ->> 'coins', '') ~ '^[0-9]{1,9}$' then (d ->> 'coins')::int else 0 end;
    v_coins := least(v_coins, c.import_coins_per_match * n + c.import_coins_extra);
    lv := case when coalesce(d ->> 'level', '') ~ '^[0-9]{1,3}$' then least(greatest((d ->> 'level')::int, 1), 60) else 1 end;
    x := case when coalesce(d ->> 'xp', '') ~ '^[0-9]{1,9}$' then (d ->> 'xp')::int else 0 end;
    select coalesce(sum(public.lvl_need(g)), 0) + x into tot from generate_series(1, lv - 1) g;
    cap := c.import_xp_per_match::bigint * n + c.import_xp_extra;
    tot := least(tot, cap);
    -- partidas que o servidor já pagou também estão no save; moedas de nível que o servidor já pagou não estão
    select coalesce(sum(delta), 0) into srv_lvc from public.ledger where user_id = uid and currency = 'coin' and reason like 'nivel %';
    v_coins := greatest(v_coins, w.coins - srv_lvc) + srv_lvc;
    select coalesce(sum(public.lvl_need(g)), 0) + w.char_xp into srv_tot from generate_series(1, w.char_level - 1) g;
    tot := greatest(tot, srv_tot);
    -- moedas de nível já pagas pelo jogo (LEVEL.settle marca lvV = 288 e lvPaid)
    lp := case when d ->> 'lvV' = '288' and coalesce(d ->> 'lvPaid', '') ~ '^[0-9]{1,3}$' then least(greatest((d ->> 'lvPaid')::int, 1), lv) else 1 end;
    lp := greatest(lp, w.lv_paid);
    update public.wallets set meta_imported = true, char_level = 1, char_xp = 0, lv_paid = lp where user_id = uid;
    perform public.wallet_add(uid, 'coin', v_coins - w.coins, 'importacao do save');
    perform public.char_xp_add(uid, tot::int);
    insert into public.items_owned (user_id, item_id, source, created_at)
      select uid, cp.item_id, 'importacao', now() from public.coin_prices cp
      where d -> 'inv' ? cp.item_id on conflict do nothing;
  end if;
  select jsonb_build_object('coins', w2.coins, 'level', w2.char_level, 'xp', w2.char_xp, 'need', public.lvl_need(w2.char_level)) into res
    from public.wallets w2 where w2.user_id = uid;
  return res;
end $f$;
revoke execute on function public.import_meta() from public, anon;
grant execute on function public.import_meta() to authenticated;

