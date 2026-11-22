-- v29: troca de 12 itens repetidos (gerado por node tools/patches/v29-itens-repetidos.js sql)
begin;

-- 1) itens novos no catálogo do servidor
insert into public.shop_items (item_id, rarity, price_z, kind, active) values
('v29_oculos_y2k',1,null,'box',true),
('v29_durag_roxo',2,200,'item',true),
('v29_basquete_10',2,null,'box',true),
('v29_pipa_rabiola',1,null,'pass',true),
('v29_camera_live',2,null,'pass',true),
('v29_jetpack_reveillon',3,900,'item',true),
('v29_camisa_neon_beach',3,600,'item',true),
('v29_mascara_goleiro',3,600,'item',true)
on conflict (item_id) do update set rarity = excluded.rarity, price_z = excluded.price_z, kind = excluded.kind, active = true;

-- 2) os repetidos saem da venda, do baú e do passe (a linha fica, desligada, pra o histórico não quebrar)
update public.shop_items set active = false where item_id in ('bx_c08', 'z_bone_ouro', 'cx_r21', 'lv_coturno_patrulha', 'p1_bota_lama', 's1_cordao_prata', 'lv_cordao_vila', 'lv_chinelo_laje', 'bone_verde', 'zc_asas_demonio', 'zc_bomber_ouro', 'z_bone_diamante');

update public.pass_rewards set item_id = 'v29_pipa_rabiola' where season = 1 and kind = 'item' and item_id = 'p1_bota_lama';
update public.pass_rewards set item_id = 'v29_camera_live' where season = 1 and kind = 'item' and item_id = 's1_cordao_prata';

-- 3) loja de moedas: o novo entra no preço do antigo
insert into public.coin_prices (item_id, price) values ('v29_bolsa_transversal',150) on conflict (item_id) do update set price = excluded.price;
delete from public.coin_prices where item_id = 'bone_verde';

-- 4) quem tinha um repetido: ganha o gêmeo (mesma cara) e a peça nova; o repetido sai do inventário
with m(old_id, twin, novo) as (values
  ('bx_c08', 'p1_tapa_olho', 'v29_oculos_y2k'),
  ('z_bone_ouro', 'cx_l01', 'v29_durag_roxo'),
  ('cx_r21', 'cx_r14', 'v29_basquete_10'),
  ('lv_coturno_patrulha', 'coturno', 'v29_bag_entrega'),
  ('p1_bota_lama', 'coturno', 'v29_pipa_rabiola'),
  ('s1_cordao_prata', 'corrente_prata', 'v29_camera_live'),
  ('lv_cordao_vila', 'corrente_prata', 'v29_lenco_jasao'),
  ('lv_chinelo_laje', 'p1_chinelo_brasil', 'v29_faixa_treino'),
  ('bone_verde', 'lv_bone_cria', 'v29_bolsa_transversal'),
  ('zc_asas_demonio', 'pp_asas_hell', 'v29_jetpack_reveillon'),
  ('zc_bomber_ouro', 's1_jaqueta_ouro', 'v29_camisa_neon_beach'),
  ('z_bone_diamante', 'cx_l02', 'v29_mascara_goleiro')
)
insert into public.items_owned (user_id, item_id, source)
select o.user_id, x.item_id, 'troca_v29' from public.items_owned o join m on m.old_id = o.item_id
cross join lateral (values (m.twin), (m.novo)) x(item_id)
on conflict do nothing;
delete from public.items_owned where item_id in ('bx_c08', 'z_bone_ouro', 'cx_r21', 'lv_coturno_patrulha', 'p1_bota_lama', 's1_cordao_prata', 'lv_cordao_vila', 'lv_chinelo_laje', 'bone_verde', 'zc_asas_demonio', 'zc_bomber_ouro', 'z_bone_diamante');

commit;
