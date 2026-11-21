-- v28.8b: curva de nível do servidor igual à nova curva do jogo (PR #16, thread da curva de níveis):
-- lvlNeed(n) = 300 + 90(n-1) + 5(n-1)², com teto no nível 50. A curva antiga (300 × 1,22^(n-1)) continua
-- disponível: com level_quad nulo, lvl_need volta a usar level_base × level_grow^(n-1).
-- Aplicada no projeto em 2026-11-21 (migração v28_8b_curva_nivel).
alter table public.meta_config
  add column if not exists level_lin integer,
  add column if not exists level_quad integer,
  add column if not exists level_max integer;
update public.meta_config set level_lin = 90, level_quad = 5, level_max = 50 where id = 1;

create or replace function public.lvl_need(l integer) returns integer language sql stable security definer set search_path to '' as $f$
  select case when c.level_quad is not null
    then c.level_base + c.level_lin * (greatest(l, 1) - 1) + c.level_quad * (greatest(l, 1) - 1) * (greatest(l, 1) - 1)
    else (round(c.level_base * power(c.level_grow, least(greatest(l, 1), 80) - 1) / 10) * 10)::int end
  from public.meta_config c where c.id = 1;
$f$;

-- no nível máximo para de subir; o XP fica parado logo abaixo do próximo nível
create or replace function public.char_xp_add(p_uid uuid, p_xp integer)
returns jsonb language plpgsql security definer set search_path to '' as $f$
declare lv int; x int; ups int := 0; need int; mx int := coalesce((select level_max from public.meta_config where id = 1), 1000);
begin
  insert into public.wallets (user_id) values (p_uid) on conflict do nothing;
  select char_level, char_xp + greatest(p_xp, 0) into lv, x from public.wallets where user_id = p_uid for update;
  loop
    need := public.lvl_need(lv);
    exit when x < need or lv >= mx or ups >= 200;
    x := x - need; lv := lv + 1; ups := ups + 1;
  end loop;
  if lv >= mx then lv := mx; x := least(x, public.lvl_need(lv) - 1); end if;
  update public.wallets set char_level = lv, char_xp = x, updated_at = now() where user_id = p_uid;
  return jsonb_build_object('level', lv, 'xp', x, 'need', public.lvl_need(lv), 'ups', ups, 'max', mx);
end $f$;
revoke execute on function public.lvl_need(integer) from public, anon, authenticated;
revoke execute on function public.char_xp_add(uuid, integer) from public, anon, authenticated;
