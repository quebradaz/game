-- v28.7: roupa lendária só sai do baú (0,5%) ou é comprada com Z-Coin.
-- Já aplicado no projeto (migrations v28_7_lendarios_so_bau_e_loja e v28_7_ajuste_faixas_bau).

-- passe premium: os 5 lendários viram Z-Coin (900 no total)
update public.pass_rewards r set kind = 'zcoin', item_id = null,
  amount = case r.level when 10 then 100 when 20 then 150 when 25 then 150 when 30 then 200 when 40 then 300 else 100 end
where r.season = 1 and r.kind = 'item' and r.item_id in (select item_id from public.shop_items where rarity = 3);

-- os 5 lendários do passe vão para a loja Z-Coin
update public.shop_items set kind = 'item', price_z = 900, active = true where kind = 'pass' and rarity = 3;

-- baú: lendária 0,5% · 25 Z-Coin 1% · chip 3% · rara 11% · comum 45% · moedas 39,5%
-- (open_box foi reescrita no lugar; as faixas ficaram assim)
--   if x < 0.005 then t := 3; k := 'item';
--   elsif x < 0.015 then k := 'zcoin'; a := 25; t := 2;
--   elsif x < 0.045 then t := 2; k := 'chip'; a := 1;
--   elsif x < 0.155 then t := 2; k := 'item';
--   elsif x < 0.605 then t := 1; k := 'item';
--   else t := 1; k := 'coins'; a := 200 + (floor(random() * 5) * 100)::int;
