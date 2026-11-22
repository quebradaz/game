// v29: tira 12 itens repetidos (iguais ou quase iguais a outro do catálogo) e põe 12 peças novas no lugar,
// cada uma com um desenho que o jogo ainda não tinha. Cada peça nova herda a origem da excluída
// (mesmo nível do passe, do caminho do nível, do baú ou da loja), então nenhuma trilha fica com buraco.
// Quem já tinha um item excluído fica com o gêmeo (a peça igual que continua no jogo) E ganha a peça nova.
// Uso: node tools/patches/v29-itens-repetidos.js index.html   ·   `node tools/patches/v29-itens-repetidos.js sql` imprime o SQL.
const fs = require('fs');

// [excluído, gêmeo que fica, id novo, slot, tipo novo, nome novo, cor base, cor de detalhe, raridade, origem, ponto do acessório, extra]
//   raridade: 0 comum, 1 incomum, 2 raro, 3 exclusivo, 4 lendário · origem: passe | caixa | loja (Z-Coin) | moedas | nivel
//   extra: { lv: nível (passe ou caminho do nível), tr: trilha do passe, z: preço em Z-Coin, price: preço em moedas }
const SWAP = [
  ['bx_c08', 'p1_tapa_olho', 'v29_oculos_y2k', 'acc', 'y2k', 'Óculos Y2K fumê', '#c86a9a', '#4a2a5a', 0, 'caixa', 'face', {}],
  ['z_bone_ouro', 'cx_l01', 'v29_durag_roxo', 'head', 'durag', 'Durag de cetim roxo', '#6a2aa8', '#c08aff', 2, 'loja', 0, { z: 200 }],
  ['cx_r21', 'cx_r14', 'v29_basquete_10', 'chest', 'basquete', 'Regata de basquete 10', '#1e3ab0', '#ffd84a', 2, 'caixa', 0, {}],
  ['lv_coturno_patrulha', 'coturno', 'v29_bag_entrega', 'acc', 'bag', 'Bag de entregador', '#c0262a', '#ffd84a', 3, 'nivel', 'back', { lv: 26 }],
  ['p1_bota_lama', 'coturno', 'v29_pipa_rabiola', 'acc', 'pipa', 'Pipa com rabiola', '#ffd81a', '#1a8a3a', 0, 'passe', 'back', { lv: 29, tr: 'free' }],
  ['s1_cordao_prata', 'corrente_prata', 'v29_camera_live', 'acc', 'camera', 'Câmera de live no peito', '#1e1c24', '#ff3a3a', 2, 'passe', 'neck', { lv: 12, tr: 'free' }],
  ['lv_cordao_vila', 'corrente_prata', 'v29_lenco_jasao', 'acc', 'lenco', 'Lenço de fuga do Jasão', '#c0262a', '#f4ecd0', 3, 'nivel', 'face', { lv: 28 }],
  ['lv_chinelo_laje', 'p1_chinelo_brasil', 'v29_faixa_treino', 'head', 'faixa', 'Faixa de treino da laje', '#e8e4d8', '#1a8a3a', 3, 'nivel', 0, { lv: 4 }],
  ['bone_verde', 'lv_bone_cria', 'v29_bolsa_transversal', 'acc', 'transversal', 'Bolsa transversal do corre', '#34343c', '#ffd84a', 0, 'moedas', 'neck', { price: 150 }],
  ['zc_asas_demonio', 'pp_asas_hell', 'v29_jetpack_reveillon', 'acc', 'jetpack', 'Jetpack do Réveillon', '#c8ccd8', '#ff8a1a', 4, 'loja', 'back', { z: 900 }],
  ['zc_bomber_ouro', 's1_jaqueta_ouro', 'v29_camisa_neon_beach', 'chest', 'sunset', 'Camisa Neon Beach', '#ff3d8b', '#ffb01a', 4, 'loja', 0, { z: 600 }],
  ['z_bone_diamante', 'cx_l02', 'v29_mascara_goleiro', 'acc', 'hoquei', 'Máscara do goleiro do lago', '#ecece6', '#c0262a', 4, 'loja', 'face', { z: 600 }]
];
module.exports = SWAP;

if (require.main === module && process.argv[2] === 'sql') {
  const q = (s) => "'" + s.replace(/'/g, "''") + "'";
  const srv = (r) => (r >= 4 ? 3 : r >= 2 ? 2 : 1);
  const out = ['-- v29: troca de 12 itens repetidos (gerado por node tools/patches/v29-itens-repetidos.js sql)', 'begin;', ''];
  out.push('-- 1) itens novos no catálogo do servidor');
  const rows = SWAP.filter((r) => ['caixa', 'loja', 'passe'].includes(r[9])).map((r) => '(' + q(r[2]) + ',' + srv(r[8]) + ',' + (r[11].z || 'null') + ',' + q(r[9] === 'loja' ? 'item' : r[9] === 'caixa' ? 'box' : 'pass') + ',true)');
  out.push('insert into public.shop_items (item_id, rarity, price_z, kind, active) values\n' + rows.join(',\n') +
    '\non conflict (item_id) do update set rarity = excluded.rarity, price_z = excluded.price_z, kind = excluded.kind, active = true;', '');
  out.push('-- 2) os repetidos saem da venda, do baú e do passe (a linha fica, desligada, pra o histórico não quebrar)');
  out.push('update public.shop_items set active = false where item_id in (' + SWAP.map((r) => q(r[0])).join(', ') + ');', '');
  SWAP.filter((r) => r[9] === 'passe').forEach((r) => out.push('update public.pass_rewards set item_id = ' + q(r[2]) + " where season = 1 and kind = 'item' and item_id = " + q(r[0]) + ';'));
  out.push('');
  out.push('-- 3) loja de moedas: o novo entra no preço do antigo');
  SWAP.filter((r) => r[9] === 'moedas').forEach((r) => {
    out.push('insert into public.coin_prices (item_id, price) values (' + q(r[2]) + ',' + r[11].price + ') on conflict (item_id) do update set price = excluded.price;');
    out.push('delete from public.coin_prices where item_id = ' + q(r[0]) + ';');
  });
  out.push('');
  out.push('-- 4) quem tinha um repetido: ganha o gêmeo (mesma cara) e a peça nova; o repetido sai do inventário');
  out.push('with m(old_id, twin, novo) as (values\n  ' + SWAP.map((r) => '(' + q(r[0]) + ', ' + q(r[1]) + ', ' + q(r[2]) + ')').join(',\n  ') + '\n)');
  out.push('insert into public.items_owned (user_id, item_id, source)\nselect o.user_id, x.item_id, \'troca_v29\' from public.items_owned o join m on m.old_id = o.item_id\ncross join lateral (values (m.twin), (m.novo)) x(item_id)\non conflict do nothing;');
  out.push('delete from public.items_owned where item_id in (' + SWAP.map((r) => q(r[0])).join(', ') + ');', '');
  out.push('commit;');
  console.log(out.join('\n'));
  process.exit(0);
}
if (require.main !== module) return;

const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const E = s.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
const nl = (t) => t.split('\n').join(E);
const rep = (a, b) => {
  a = nl(a); b = nl(b);
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

// ---------- caminho do nível: o novo fica no mesmo nível ----------
SWAP.filter((r) => r[9] === 'nivel').forEach((r) => rep('[' + r[11].lv + ', "item", "' + r[0] + '"]', '[' + r[11].lv + ', "item", "' + r[2] + '"]'));

// ---------- catálogo: entra o novo, sai o repetido ----------
const data = SWAP.map((r) => [r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7], r[8], r[9], r[10], r[11]]);
rep('const LOOK = (function () {', '// v29: 12 itens repetidos trocados por peças novas (tools/patches/v29-itens-repetidos.js)\n// [excluído, gêmeo, id novo, slot, tipo, nome, base, detalhe, raridade, origem, ponto, extra]\nconst V29_SWAP = ' + JSON.stringify(data) + ';\nconst LOOK = (function () {');
rep('  for (const k in ITEMS) ITEMS[k].id = k;\n', `  // v29: quem tinha um item repetido fica com o gêmeo e com a peça nova (ver sanitize)
  const TWIN = {};
  V29_SWAP.forEach((q) => {
    const b = q[6], o = q[11], x = { d: q[7] };
    if (q[9] === "nivel") x.unlock = { level: o.lv };
    else if (q[9] !== "moedas") x.unlock = { src: q[9] };
    if (q[10]) x.spot = q[10];
    if (q[3] === "head") x.hideHair = 1;
    if (q[4] === "faixa") x.keepHair = 1;
    ITEMS[q[2]] = I(q[3], q[4], q[5], o.price || 0, q[8], [b, shade(b, -0.4), shade(b, 0.28)], x);
    delete ITEMS[q[0]];
    TWIN[q[0]] = [q[1], q[2]];
  });
  for (const k in ITEMS) ITEMS[k].id = k;
`);
rep('    let inv = first ? [] : d.inv.filter((k) => typeof k === "string" && ITEMS[k]);',
  `    if (!first) d.inv = d.inv.reduce((a, k) => a.concat(TWIN[k] || [k]), []);
    if (d.eq && typeof d.eq === "object") for (const s in d.eq) if (TWIN[d.eq[s]]) d.eq[s] = TWIN[d.eq[s]][0];
    let inv = first ? [] : d.inv.filter((k) => typeof k === "string" && ITEMS[k]);`);
rep('    if (typeof ECO !== "undefined" && ECO.items) for (const k of ECO.items) if (ITEMS[k] && d.inv.indexOf(k) < 0) d.inv.push(k);',
  '    if (typeof ECO !== "undefined" && ECO.items) for (const k0 of ECO.items) for (const k of TWIN[k0] || [k0]) if (ITEMS[k] && d.inv.indexOf(k) < 0) d.inv.push(k);');

// ---------- desenho das peças novas ----------
// cabeça: molde 12x15, frente = +x (olho em x 7-10, y 4-5; boca y 8-9) · tronco: [u pra cima, v pra frente] a partir da bacia
rep('  function rigNew(def, it) {', `  // v29: peças novas (troca dos repetidos)
  Object.assign(STYLE, { basquete: "tank", sunset: "shirt" });
  const DIG = { 1: [".w.", "ww.", ".w.", ".w.", "www"], 0: ["www", "w.w", "w.w", "w.w", "www"] };
  Object.assign(CHEST_DECOR, {
    // número 10 no peito e acabamento nas cavas
    basquete: (R, it) => { const d = R.c(it.def.d), w = R.c("#ffffff"); return (u, v) => {
      const y = Math.floor(17 - u), x = Math.floor(v + 3.5);
      if (y >= 0 && y < 5 && x >= 0 && x < 7 && x !== 3) { const g = DIG[x < 3 ? 1 : 0][y][x < 3 ? x : x - 4]; if (g === "w") return d; }
      return u > 19.2 ? w : 0; }; },
    // degradê de pôr do sol (rosa em cima, laranja embaixo) com coqueiros escuros
    sunset: (R, it) => { const b = R.c(it.def.d), m = R.c(mix(it.pal.base, it.def.d, 0.5)), k = R.c("#3a0a4a"), t = R.c("#ffe070"); return (u, v) => {
      const U = Math.floor(u), V = Math.floor(v + 60) - 60;
      const palm = (cv, cu) => { const dv = V - cv, du = U - cu; if (du < 0 && du > -10 && dv === Math.round(du * 0.15)) return 1; if (du === 0 && Math.abs(dv) <= 3 || du === 1 && Math.abs(dv) === 2 || du === -1 && Math.abs(dv) === 3) return 1; return 0; };
      if (palm(2, 11) || palm(-4, 9)) return k;
      if (U === 15 && V > -2 && V < 3 || U === 16 && V > -1 && V < 2) return t;
      return u < 6 ? b : u < 12 ? m : 0; }; }
  });
  Object.assign(NHAT, {
    durag: [0, -2, ["....hhhhhh...", "..hhllllhhh..", ".hhlhhhhhhhh.", "hhhhhhhhhhhhh", "hhhhhhhhhhhhh", "hhhhhdddddddd", "hhhH.........", "hHH..........", "dhd..........", "d..d.........", "d...d........"]],
    faixa: [0, 2, ["hhhhhhhhhhhhh", "dddddddddhddd", "H............", "hH...........", ".H..........."]]
  });
  Object.assign(NFACE, {
    y2k: [0, 4, ["HHHHHH.hhhhh", "......hvVvvh", ".......hhhh."]],
    lenco: [0, 6, ["dd....hhhhhh", ".dhhhhhhhhhh", "..hhhwhhhwhh", "..hhhhhhhhhh", "...Hhhwhhhh.", "......hhhh..", "........h..."]],
    hoquei: [0, 0, ["......hhhh..", ".....hhhhhh.", "HHHHHhdhhdhh", "HHHHHhdhhdhh", ".....hkkhhkk", ".....hhhhhhh", ".....hdhhhdh", ".....hhkhkhh", ".....hdhhdhh", ".....hhkhkhh", "......hhhhh.", ".......HHH.."]]
  });
  Object.assign(NTORSO, {
    // bag de entregador: caixa térmica nas costas com faixa e logo
    bag: [26, -14, grid(10, 13, (x, y) => { if (y === 0 || x === 0) return "l"; if (x === 9 || y === 12) return "H"; if (y === 4 || y === 5) return "d"; if (y === 8 && x > 2 && x < 7) return "w"; return "h"; })],
    // pipa (losango) presa nas costas, com a rabiola caindo
    pipa: [40, -16, grid(14, 26, (x, y) => {
      const cx = 7, cy = 6, dx = Math.abs(x - cx), dy = Math.abs(y - cy);
      if (y <= 12 && dx + dy <= 6) { if (x === cx || y === cy) return "k"; return x < cx ? (y < cy ? "l" : "h") : y < cy ? "h" : "H"; }
      if (y > 12) { const tx = Math.round(cx + Math.sin((y - 12) * 0.55) * 2.2); if (x === tx) return y % 3 === 0 ? "w" : "d"; }
      return 0; })],
    // jetpack: dois tanques e chama
    jetpack: [32, -13, grid(9, 21, (x, y) => {
      if (y < 13) { const t = x < 4 ? x : x > 4 ? x - 5 : -1; if (t < 0) return y > 2 && y < 10 ? "k" : 0; if (y === 0 && (t === 0 || t === 3)) return 0; return t === 0 ? "l" : t === 3 ? "H" : y === 3 ? "d" : "h"; }
      if (y === 13) return x === 4 ? 0 : "k";
      const f = y - 14, side = x < 4 ? 1.5 : x > 4 ? 6.5 : -9, dx = Math.abs(x - side);
      if (dx <= 1.6 - f * 0.2) return f < 2 ? "w" : f < 4 ? "d" : "D";
      return 0; })],
    // câmera de live presa no peito, com luz de gravando
    camera: [20, -1, ["d......", ".d.....", "..d....", "...hhhh", "...hkkh", "...hkVh", "...Hhhr", "..d....", ".d....."]],
    // bolsa transversal: alça na diagonal e bolsinha na frente do peito
    transversal: [22, -2, ["d.......", ".d......", "..d.....", "...d....", "..hhhhh.", "..hlhhh.", "..hhwhh.", "..HHHHH.", ".d......", "d......."]]
  });
  function rigNew(def, it) {`);

fs.writeFileSync(F, s);
console.log('ok', SWAP.length, 'trocas');
