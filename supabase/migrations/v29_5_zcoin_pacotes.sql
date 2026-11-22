-- v29.5: novos pacotes de Z-Coin (pedido do dono em 2026-11-22).
-- Pedidos já abertos continuam com o preço e a Z-Coin de quando foram abertos (zc_orders guarda os dois).
update public.zc_packs set name = 'Punhado', zcoin = 300, bonus = 0, price_cents = 490 where id = 'punhado';
update public.zc_packs set name = 'Saco', zcoin = 600, bonus = 100, price_cents = 2000 where id = 'saco';
update public.zc_packs set name = 'Mochila de dinheiro', zcoin = 900, bonus = 150, price_cents = 3500 where id = 'mochila';
update public.zc_packs set name = 'Cofre', zcoin = 1200, bonus = 200, price_cents = 6500 where id = 'cofre';
