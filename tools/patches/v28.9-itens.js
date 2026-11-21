// v28.9: 100 itens novos. 42 do passe (14 grátis + 28 premium), 30 só do baú, 28 só da loja Z-Coin.
// Fonte única: o patch do jogo lê daqui, e `node tools/patches/v28.9-itens.js sql` imprime o SQL do servidor
// (shop_items + pass_rewards da temporada 1).
// Cada item: [id, slot, tipo, nome, cor base, cor de detalhe, raridade, extra]
//   raridade no jogo: 0 comum, 1 incomum, 2 raro, 3 exclusivo, 4 lendário (no servidor: 0/1 -> 1, 2/3 -> 2, 4 -> 3)
//   extra: { lv: nível do passe, tr: 'free' | 'prem', z: preço em Z-Coin, leg: estampa da perna, in: cor por baixo }
// Tipos novos desta versão (desenho no patch v28.9-itens-novos.js):
//   cabeça: boina, cangaceiro, cartola, coroa, chifres, aureola
//   rosto: gas (máscara de gás), visor, tapa (tapa-olho), caveira_m (máscara caveira)
//   costas: prancha, taco, violao, asas · pescoço: medalha
//   peito: listrada, xadrez, abada, bomber, caveira, camuflada
//   pernas (estampa sobre calça, bermuda ou cargo): camo, listra2, rasgada
const SPOT = { gas: 'face', visor: 'face', tapa: 'face', caveira_m: 'face', prancha: 'back', taco: 'back', violao: 'back', asas: 'back', medalha: 'neck' };
const SLOT = {
  boina: 'head', cangaceiro: 'head', cartola: 'head', coroa: 'head', chifres: 'head', aureola: 'head', bone: 'head',
  listrada: 'chest', xadrez: 'chest', abada: 'chest', bomber: 'chest', caveira: 'chest', camuflada: 'chest',
  calca: 'legs', bermuda: 'legs', cargo: 'legs', tenis: 'feet', bota: 'feet', chinelo: 'feet', chuteira: 'feet'
};
const P = (lv, tr, id, kind, name, base, d, rar, x) => [id, kind, name, base, d, rar, Object.assign({ lv, tr }, x || {})];
const B = (id, kind, name, base, d, rar, x) => [id, kind, name, base, d, rar, Object.assign({ box: 1 }, x || {})];
const Z = (z, id, kind, name, base, d, rar, x) => [id, kind, name, base, d, rar, Object.assign({ z }, x || {})];

const RAW = [
  // ---------- passe, trilha grátis (níveis ímpares, que estavam vazios) ----------
  P(1, 'free', 'p1_boina_vovo', 'boina', 'Boina do vovô', '#5a5a62', '#e8e4d8', 0),
  P(3, 'free', 'p1_listrada_orla', 'listrada', 'Camiseta listrada da orla', '#e8e4d8', '#2a4a8a', 0),
  P(7, 'free', 'p1_bermuda_camuflada', 'bermuda', 'Bermuda camuflada', '#5a6a3a', '#3a4a22', 0, { leg: 'camo' }),
  P(9, 'free', 'p1_chinelo_brasil', 'chinelo', 'Chinelo verde e amarelo', '#1a8a3a', '#ffd81a', 0),
  P(11, 'free', 'p1_medalha_bronze', 'medalha', 'Medalha de bronze', '#b8702e', '#ffd8a0', 1),
  P(13, 'free', 'p1_xadrez_flanela', 'xadrez', 'Camisa xadrez de flanela', '#8a1e22', '#16141c', 1),
  P(17, 'free', 'p1_tapa_olho', 'tapa', 'Tapa-olho do pirata da laje', '#1c1c22', '#4a4a52', 1),
  P(19, 'free', 'p1_calca_rasgada', 'calca', 'Calça rasgada', '#3a5a8a', '#a8c0e0', 1, { leg: 'rasgada' }),
  P(21, 'free', 'p1_taco_madeira', 'taco', 'Taco de madeira', '#a8702e', '#5a3a1e', 1),
  P(23, 'free', 'p1_abada_bloco', 'abada', 'Abadá do bloco', '#ffd81a', '#c0262a', 1),
  P(27, 'free', 'p1_cangaceiro_couro', 'cangaceiro', 'Chapéu de cangaceiro', '#7a4a2a', '#ffd84a', 1),
  P(29, 'free', 'p1_bota_lama', 'bota', 'Bota de lama', '#4a3a2a', '#2a2018', 0),
  P(31, 'free', 'p1_gas_surrada', 'gas', 'Máscara de gás surrada', '#4a5a3a', '#7ab0c8', 1),
  P(33, 'free', 'p1_prancha_isopor', 'prancha', 'Prancha de isopor', '#f4f0e4', '#2ab0ff', 1),
  // ---------- passe, trilha premium (Hell de Janeiro). Ficam moedas em 15, chips em 8 16 24 32 33 36 e Z-Coin em 5 10 20 30 38 ----------
  P(1, 'prem', 'pp_bone_hell', 'bone', 'Boné Hell de Janeiro', '#16141c', '#ff3a1a', 2),
  P(2, 'prem', 'pp_caveira_morro', 'caveira', 'Camiseta caveira do morro', '#16141c', '#e8e4d8', 2),
  P(3, 'prem', 'pp_tenis_brasa', 'tenis', 'Tênis brasa', '#2a0a0a', '#ff6a1a', 2),
  P(4, 'prem', 'pp_visor_neon', 'visor', 'Visor neon', '#1a1c24', '#3effa8', 2),
  P(6, 'prem', 'pp_calca_camo_noite', 'calca', 'Calça camuflada noturna', '#1e2230', '#3a4258', 2, { leg: 'camo' }),
  P(7, 'prem', 'pp_boina_vermelha', 'boina', 'Boina vermelha', '#a8141c', '#ffd84a', 2),
  P(9, 'prem', 'pp_bomber_vinho', 'bomber', 'Jaqueta bomber vinho', '#5a1420', '#ffd84a', 2),
  P(11, 'prem', 'pp_medalha_prata', 'medalha', 'Medalha de prata', '#c8ccd8', '#5a8aba', 2),
  P(12, 'prem', 'pp_xadrez_neon', 'xadrez', 'Camisa xadrez neon', '#1a1626', '#ff3d8b', 2),
  P(13, 'prem', 'pp_bermuda_listras', 'bermuda', 'Bermuda de listras', '#16141c', '#ff3d8b', 2, { leg: 'listra2' }),
  P(14, 'prem', 'pp_taco_prego', 'taco', 'Taco com pregos', '#6a4a2a', '#c8ccd8', 2),
  P(17, 'prem', 'pp_caveira_m', 'caveira_m', 'Máscara caveira', '#e8e4d8', '#16141c', 2),
  P(18, 'prem', 'pp_chuteira_neon', 'chuteira', 'Chuteira neon', '#16141c', '#3effa8', 2),
  P(19, 'prem', 'pp_abada_hell', 'abada', 'Abadá Hell de Janeiro', '#ff3a1a', '#16141c', 2),
  P(21, 'prem', 'pp_cartola_malandro', 'cartola', 'Cartola do malandro', '#16141c', '#c0262a', 2),
  P(22, 'prem', 'pp_violao_roda', 'violao', 'Violão da roda de samba', '#a8682a', '#16141c', 2),
  P(23, 'prem', 'pp_cargo_camo', 'cargo', 'Cargo camuflada urbana', '#4a4c54', '#2a2a30', 2, { leg: 'camo' }),
  P(25, 'prem', 'pp_chifres_hell', 'chifres', 'Chifres do Hell', '#c0262a', '#ffd84a', 3),
  P(26, 'prem', 'pp_listrada_neon', 'listrada', 'Camiseta listrada neon', '#16141c', '#1ec8e8', 2),
  P(27, 'prem', 'pp_bota_cangaco', 'bota', 'Bota de cangaço', '#5a3a1e', '#ffd84a', 2),
  P(28, 'prem', 'pp_gas_neon', 'gas', 'Máscara de gás neon', '#16141c', '#3effa8', 2),
  P(29, 'prem', 'pp_prancha_fogo', 'prancha', 'Prancha de fogo', '#ff6a1a', '#16141c', 2),
  P(31, 'prem', 'pp_cangaceiro_prata', 'cangaceiro', 'Chapéu de cangaceiro prata', '#3a2418', '#c8ccd8', 2),
  P(34, 'prem', 'pp_bomber_neon', 'bomber', 'Bomber neon', '#1a1626', '#3ee6ff', 2),
  P(35, 'prem', 'pp_calca_rasgada_preta', 'calca', 'Calça rasgada preta', '#1e1c24', '#5a5a64', 2, { leg: 'rasgada' }),
  P(37, 'prem', 'pp_tapa_ouro', 'tapa', 'Tapa-olho de ouro', '#16141c', '#d8a820', 2),
  P(39, 'prem', 'pp_coroa_lata', 'coroa', 'Coroa de lata', '#a8acb8', '#c0262a', 2),
  P(40, 'prem', 'pp_asas_hell', 'asas', 'Asas do Hell', '#2a0a10', '#ff3a1a', 4), // único lendário do passe (decisão do Norduk, 2026-11-21)
  // ---------- só no baú: 10 comuns, 10 raros, 10 lendários ----------
  B('bx_c01', 'boina', 'Boina cáqui', '#8a7e52', '#e8e4d8', 0),
  B('bx_c02', 'listrada', 'Camiseta listrada marinho', '#22305a', '#e8e4d8', 0),
  B('bx_c03', 'xadrez', 'Camisa xadrez marrom', '#6a4a30', '#c8b890', 0),
  B('bx_c04', 'calca', 'Calça camuflada oliva', '#5a6a32', '#3e4a22', 0, { leg: 'camo' }),
  B('bx_c05', 'bermuda', 'Bermuda rasgada jeans', '#4a6a9a', '#a8c0e0', 0, { leg: 'rasgada' }),
  B('bx_c06', 'taco', 'Taco de beisebol', '#c8a07a', '#6a4a30', 0),
  B('bx_c07', 'medalha', 'Medalha de lata', '#8a8a92', '#c0262a', 0),
  B('bx_c08', 'tapa', 'Tapa-olho preto', '#1c1c22', '#4a4a52', 0),
  B('bx_c09', 'abada', 'Abadá azul', '#2a6ab0', '#e8e4d8', 0),
  B('bx_c10', 'tenis', 'Tênis de lona', '#c0262a', '#e8e4d8', 0),
  B('bx_r01', 'cangaceiro', 'Chapéu de cangaceiro vermelho', '#8a1e22', '#ffd84a', 2),
  B('bx_r02', 'cartola', 'Cartola roxa', '#5a2a8a', '#ffd84a', 2),
  B('bx_r03', 'bomber', 'Bomber laranja de resgate', '#ff6a1a', '#16141c', 2),
  B('bx_r04', 'caveira', 'Camiseta caveira neon', '#16141c', '#3effa8', 2),
  B('bx_r05', 'gas', 'Máscara de gás amarela', '#c8a020', '#7ab0c8', 2),
  B('bx_r06', 'visor', 'Visor vermelho', '#16141c', '#ff3a2a', 2),
  B('bx_r07', 'prancha', 'Prancha do Arpoador', '#2ab0ff', '#ffd81a', 2),
  B('bx_r08', 'violao', 'Violão de pagode', '#6a3a1e', '#ffd84a', 2),
  B('bx_r09', 'cargo', 'Cargo de listra dupla', '#16141c', '#ffd81a', 2, { leg: 'listra2' }),
  B('bx_r10', 'boina', 'Boina militar', '#3e5a30', '#c0262a', 2),
  B('bx_l01', 'coroa', 'Coroa do Rei do Morro', '#d8a820', '#c0262a', 4),
  B('bx_l02', 'aureola', 'Auréola do Cristo', '#ffe070', '#ffffff', 4),
  B('bx_l03', 'asas', 'Asas de anjo', '#f4f0e4', '#ffd84a', 4),
  B('bx_l04', 'chifres', 'Chifres de obsidiana', '#1e1428', '#a84aff', 4),
  B('bx_l05', 'violao', 'Violão de ouro', '#d8a820', '#16141c', 4),
  B('bx_l06', 'bomber', 'Bomber galáxia', '#2a0a5a', '#ff5ab8', 4),
  B('bx_l07', 'camuflada', 'Camuflada radioativa', '#1a3a1a', '#5aff1a', 4),
  B('bx_l08', 'gas', 'Máscara de gás do apocalipse', '#2a0010', '#ff3a2a', 4),
  B('bx_l09', 'prancha', 'Prancha de diamante', '#9ff4ff', '#ffffff', 4),
  B('bx_l10', 'cartola', 'Cartola da Lapa', '#f4f0e4', '#c0262a', 4),
  // ---------- só na loja Z-Coin: 10 raros (200), 14 lendários (600), 4 lendários top (900) ----------
  Z(200, 'zc_boina_neon', 'boina', 'Boina neon', '#ff3d8b', '#ffffff', 2),
  Z(200, 'zc_listrada_ouro', 'listrada', 'Camiseta listrada ouro e preto', '#16141c', '#d8a820', 2),
  Z(200, 'zc_xadrez_real', 'xadrez', 'Camisa xadrez real', '#1a3ad8', '#ffd84a', 2),
  Z(200, 'zc_tapa_neon', 'tapa', 'Tapa-olho neon', '#16141c', '#1ec8e8', 2),
  Z(200, 'zc_medalha_ouro', 'medalha', 'Medalha de ouro', '#d8a820', '#ffffff', 2),
  Z(200, 'zc_calca_camo_neve', 'calca', 'Calça camuflada neve', '#e8ecf0', '#8a9aa8', 2, { leg: 'camo' }),
  Z(200, 'zc_taco_neon', 'taco', 'Taco neon', '#16141c', '#ff3d8b', 2),
  Z(200, 'zc_abada_neon', 'abada', 'Abadá neon', '#9aff1a', '#16141c', 2),
  Z(200, 'zc_tenis_cromado', 'tenis', 'Tênis cromado', '#e0e4ec', '#5a6a8a', 2),
  Z(200, 'zc_bermuda_rasgada_rosa', 'bermuda', 'Bermuda rasgada rosa', '#ff5ab8', '#ffffff', 2, { leg: 'rasgada' }),
  Z(600, 'zc_coroa_diamante', 'coroa', 'Coroa de diamante', '#9ff4ff', '#ff3d8b', 4),
  Z(600, 'zc_aureola_neon', 'aureola', 'Auréola neon', '#3effa8', '#ffffff', 4),
  Z(600, 'zc_chifres_ouro', 'chifres', 'Chifres de ouro', '#d8a820', '#ffffff', 4),
  Z(600, 'zc_cangaceiro_ouro', 'cangaceiro', 'Cangaceiro de ouro', '#d8a820', '#16141c', 4),
  Z(600, 'zc_cartola_neon', 'cartola', 'Cartola neon', '#0a0a14', '#3effa8', 4),
  Z(600, 'zc_visor_ouro', 'visor', 'Visor de ouro', '#d8a820', '#ff3a1a', 4),
  Z(600, 'zc_gas_ouro', 'gas', 'Máscara de gás de ouro', '#d8a820', '#9ff4ff', 4),
  Z(600, 'zc_caveira_ouro', 'caveira_m', 'Máscara caveira de ouro', '#d8a820', '#16141c', 4),
  Z(600, 'zc_prancha_ouro', 'prancha', 'Prancha de ouro', '#d8a820', '#ffffff', 4),
  Z(600, 'zc_violao_neon', 'violao', 'Violão neon', '#0a0a14', '#ff1ad8', 4),
  Z(600, 'zc_taco_ouro', 'taco', 'Taco de ouro', '#d8a820', '#16141c', 4),
  Z(600, 'zc_bomber_ouro', 'bomber', 'Bomber de ouro', '#d8a820', '#16141c', 4),
  Z(600, 'zc_camuflada_lava', 'camuflada', 'Camuflada lava', '#3a0a0a', '#ff4a0a', 4),
  Z(600, 'zc_calca_camo_ouro', 'calca', 'Calça camuflada de ouro', '#16141c', '#d8a820', 4, { leg: 'camo' }),
  Z(900, 'zc_asas_fenix', 'asas', 'Asas da fênix', '#ff6a1a', '#ffd84a', 4),
  Z(900, 'zc_asas_demonio', 'asas', 'Asas do demônio', '#16141c', '#c0262a', 4),
  Z(900, 'zc_coroa_fogo', 'coroa', 'Coroa de fogo', '#ff4a0a', '#ffe070', 4),
  Z(900, 'zc_aureola_ouro', 'aureola', 'Auréola dourada', '#d8a820', '#fff0a0', 4)
];

const LIST = RAW.map(([id, kind, name, base, d, rar, x]) => {
  const slot = SPOT[kind] ? 'acc' : SLOT[kind];
  if (!slot) throw new Error('tipo sem slot: ' + kind);
  return Object.assign({ id, slot, kind, spot: SPOT[kind] || 0, name, base, d, rar, srv: rar >= 4 ? 3 : rar >= 2 ? 2 : 1,
    src: x.z ? 'loja' : x.box ? 'caixa' : 'passe' }, x);
});
module.exports = LIST;

if (require.main === module) {
  const ids = new Set();
  LIST.forEach((it) => { if (ids.has(it.id)) throw new Error('id repetido ' + it.id); ids.add(it.id); });
  const n = (f) => LIST.filter(f).length;
  if (process.argv[2] === 'sql') {
    const q = (s) => "'" + s.replace(/'/g, "''") + "'";
    const rows = LIST.map((it) => '(' + q(it.id) + ',' + it.srv + ',' + (it.z || 'null') + ',' + q(it.z ? 'item' : it.box ? 'box' : 'pass') + ',true)');
    console.log('-- v28.9: 100 itens novos (gerado por node tools/patches/v28.9-itens.js sql)\n');
    console.log('insert into public.shop_items (item_id, rarity, price_z, kind, active) values\n' + rows.join(',\n') +
      '\non conflict (item_id) do update set rarity = excluded.rarity, price_z = excluded.price_z, kind = excluded.kind, active = true;\n');
    const pr = LIST.filter((it) => it.lv).map((it) => '(1,' + it.lv + ',' + q(it.tr) + ",'item'," + q(it.id) + ',0)');
    console.log('-- passe da temporada 1: itens nos níveis listados (grátis nos ímpares que estavam vazios, premium no lugar de moedas e Z-Coin)');
    console.log('insert into public.pass_rewards (season, level, track, kind, item_id, amount) values\n' + pr.join(',\n') +
      '\non conflict (season, level, track) do update set kind = excluded.kind, item_id = excluded.item_id, amount = excluded.amount;\n');
    console.log("-- premium devolve 600 Z-Coin no total (o preço do passe): 5 = 50, 10 = 100, 20 = 150, 30 = 200, 38 = 100");
    console.log("update public.pass_rewards set amount = 100 where season = 1 and track = 'prem' and level = 38 and kind = 'zcoin';");
  } else {
    console.log('itens', LIST.length, '| passe grátis', n((i) => i.tr === 'free'), '| passe premium', n((i) => i.tr === 'prem'),
      '| baú', n((i) => i.box), '| loja Z-Coin', n((i) => i.z));
  }
}
