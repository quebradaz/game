-- v29.1: habilidade "Cofre do barraco" (aumenta o teto de dinheiro da partida em +15% / +25% / +50%).
-- Difícil de abrir, e o servidor confere tudo (o jogo só mostra):
--   * Lábia no nível 3
--   * personagem no nível 27 (wallets.char_level)
--   * ter chegado na onda 20 numa quebrada (player_stats.best_wave)
--   * 8 / 12 / 18 chips por nível (o mais caro da árvore)
-- O jogo deixa o nó "em breve" até esta migração rodar (custo aparece em get_economy.costs).

-- 1. regras de desbloqueio conferidas no servidor (só nós que precisam delas)
create table if not exists public.skill_unlock (
  skill      text primary key,
  char_level integer not null default 0,
  best_wave  integer not null default 0,
  needs      jsonb   not null default '[]'::jsonb  -- [{"id":"labia","lv":3}]
);
alter table public.skill_unlock enable row level security;
drop policy if exists skill_unlock_read on public.skill_unlock;
create policy skill_unlock_read on public.skill_unlock for select using (true);

insert into public.skill_unlock (skill, char_level, best_wave, needs) values
  ('cofre', 27, 20, '[{"id":"labia","lv":3}]')
on conflict (skill) do update set char_level = excluded.char_level, best_wave = excluded.best_wave, needs = excluded.needs;

insert into public.skill_costs (skill, level, chips) values
  ('cofre', 1, 8), ('cofre', 2, 12), ('cofre', 3, 18)
on conflict (skill, level) do update set chips = excluded.chips;

-- 2. buy_skill confere as regras acima antes de cobrar
create or replace function public.buy_skill(p_skill text)
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare uid uuid := auth.uid(); lv int; cost int; ch int; u public.skill_unlock; r jsonb;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  select coalesce((select level from public.skill_levels where user_id = uid and skill = p_skill), 0) into lv;
  select chips into cost from public.skill_costs where skill = p_skill and level = lv + 1;
  if cost is null then raise exception 'NIVEL_MAXIMO'; end if;
  select * into u from public.skill_unlock where skill = p_skill;
  if found then
    if coalesce((select char_level from public.wallets where user_id = uid), 1) < u.char_level then
      raise exception 'NIVEL_PERSONAGEM';
    end if;
    if coalesce((select best_wave from public.player_stats where user_id = uid), 0) < u.best_wave then
      raise exception 'ONDA_INSUFICIENTE';
    end if;
    for r in select * from jsonb_array_elements(u.needs) loop
      if coalesce((select level from public.skill_levels where user_id = uid and skill = r ->> 'id'), 0) < (r ->> 'lv')::int then
        raise exception 'REQUISITO';
      end if;
    end loop;
  end if;
  select chips into ch from public.wallets where user_id = uid for update;
  if coalesce(ch, 0) < cost then raise exception 'CHIPS_INSUFICIENTES'; end if;
  perform public.wallet_add(uid, 'chip', -cost, 'habilidade ' || p_skill || ' ' || (lv + 1));
  insert into public.skill_levels (user_id, skill, level) values (uid, p_skill, lv + 1)
    on conflict (user_id, skill) do update set level = excluded.level;
  return jsonb_build_object('level', lv + 1, 'chips', ch - cost);
end $function$;

-- 3. import_skills (migração do save antigo) não importa nó com regra de desbloqueio
create or replace function public.import_skills()
returns jsonb language plpgsql security definer set search_path = '' as $function$
declare uid uuid := auth.uid(); w public.wallets; p public.profiles; sk jsonb; k text; v int; mx int;
begin
  if uid is null then raise exception 'SEM_LOGIN'; end if;
  select * into w from public.wallets where user_id = uid for update;
  select * into p from public.profiles where id = uid;
  if w.skills_imported or p.created_at >= '2026-11-19 04:00+00' then
    update public.wallets set skills_imported = true where user_id = uid;
    return coalesce((select jsonb_object_agg(skill, level) from public.skill_levels where user_id = uid), '{}'::jsonb);
  end if;
  select coalesce(data -> 'skills', '{}'::jsonb) into sk from public.progress where user_id = uid;
  for k, v in select key, (value)::int from jsonb_each_text(sk) where value ~ '^[0-9]+$' loop
    if exists (select 1 from public.skill_unlock where skill = k) then continue; end if;
    select max(level) into mx from public.skill_costs where skill = k;
    if mx is null then continue; end if;
    insert into public.skill_levels (user_id, skill, level) values (uid, k, least(greatest(v, 0), mx))
      on conflict (user_id, skill) do update set level = greatest(public.skill_levels.level, excluded.level);
  end loop;
  update public.wallets set skills_imported = true where user_id = uid;
  return coalesce((select jsonb_object_agg(skill, level) from public.skill_levels where user_id = uid), '{}'::jsonb);
end $function$;
