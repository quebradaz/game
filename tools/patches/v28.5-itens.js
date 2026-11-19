// v28.5: 120 itens novos das caixas (40 comuns, 40 raros, 40 lendários) + 4 lendários da temporada 1.
// Fonte única: o patch do jogo lê daqui, e `node tools/patches/v28.5-itens.js sql` imprime o SQL do servidor.
// Cada item: [id, slot, tipo, nome, base, detalhe?, extra?]. Sombra e realce saem da base.
const KIND = {
  bone: ['head', 'Boné'], bone_virado: ['head', 'Boné virado'], viseira: ['head', 'Viseira'], bandana: ['head', 'Bandana'],
  touca: ['head', 'Touca'], pescador: ['head', 'Chapéu de pescador'], panama: ['head', 'Panamá'], capacete: ['head', 'Capacete'],
  jaqueta: ['chest', 'Jaqueta'], camiseta: ['chest', 'Camiseta'], regata: ['chest', 'Regata'], moletom: ['chest', 'Moletom'],
  capuz: ['chest', 'Moletom com capuz'], time: ['chest', 'Camisa de time'], havaiana: ['chest', 'Camisa florida'], tatica: ['chest', 'Camisa tática'],
  social: ['chest', 'Camisa social'], calca: ['legs', 'Calça'], bermuda: ['legs', 'Bermuda'], cargo: ['legs', 'Calça cargo'],
  tenis: ['feet', 'Tênis'], bota: ['feet', 'Bota'], chuteira: ['feet', 'Chuteira'], chinelo: ['feet', 'Chinelo'],
  aviador: ['acc', 'Óculos aviador', 'face'], redondo: ['acc', 'Óculos redondos', 'face'], mascara: ['acc', 'Máscara', 'face'],
  cordao: ['acc', 'Cordão', 'neck'], bandana_n: ['acc', 'Lenço', 'neck'], cachecol: ['acc', 'Cachecol', 'neck'], fone: ['acc', 'Fone', 'neck'],
  mochila: ['acc', 'Mochila', 'back'], mochila_p: ['acc', 'Mochila pequena', 'back'], capa: ['acc', 'Capa', 'back'], pochete: ['acc', 'Pochete', 'waist']
};
// 40 tipos em ordem fixa: 9 de cabeça, 13 de peito, 6 de pernas, 5 de pés, 7 acessórios
const SEQ = ['bone', 'bone_virado', 'viseira', 'bandana', 'touca', 'pescador', 'panama', 'capacete', 'bone',
  'jaqueta', 'camiseta', 'regata', 'moletom', 'capuz', 'time', 'havaiana', 'tatica', 'social', 'jaqueta', 'camiseta', 'capuz', 'time',
  'calca', 'bermuda', 'cargo', 'calca', 'bermuda', 'cargo',
  'tenis', 'bota', 'chuteira', 'chinelo', 'tenis',
  'aviador', 'cordao', 'bandana_n', 'cachecol', 'mochila', 'capa', 'pochete'];
const TIERS = {
  c: { rar: 0, srv: 1, d: '#e8e4d8', cols: [
    ['cinza', '#6a6a72'], ['bege', '#c8b890'], ['marrom', '#6a4a30'], ['vinho', '#6a1e2a'], ['mostarda', '#c89a2a'], ['oliva', '#5a6a32'],
    ['marinho', '#22305a'], ['creme', '#e8dcc0'], ['grafite', '#34343c'], ['terracota', '#a8502e'], ['areia', '#d8c49a'], ['cáqui', '#8a7e52'],
    ['petróleo', '#1e4a5a'], ['caramelo', '#a8702e'], ['chumbo', '#4a4c54'], ['salmão', '#e08a72'], ['musgo', '#3e5a30'], ['tijolo', '#8a3a26'],
    ['lavanda', '#9a8ac0'], ['ferrugem', '#9a4a1e'], ['jeans', '#4a6a9a'], ['café', '#4a3020'], ['pêssego', '#f0b088'], ['cinza claro', '#a8a8ae'],
    ['verde-água', '#6ab0a0'], ['azul-céu', '#7aa8d8'], ['cereja', '#9a1a2a'], ['ocre', '#b08a3a'], ['índigo', '#2e2e6a'], ['amêndoa', '#c8a07a'],
    ['preto fosco', '#1c1c22'], ['branco gelo', '#ecece6'], ['mostarda escura', '#9a7a1e'], ['verde-garrafa', '#1e4a2e'], ['rosa queimado', '#b0707a'], ['azul-aço', '#4a5a72'],
    ['canela', '#8a5a3a'], ['palha', '#d8c27a'], ['ameixa', '#5a2a4a'], ['névoa', '#8a9aa8']] },
  r: { rar: 2, srv: 2, d: '#ffffff', cols: [
    ['neon rosa', '#ff3d8b'], ['ciano', '#1ec8e8'], ['roxo', '#7a3ac8'], ['laranja-fogo', '#ff6a1a'], ['verde-limão', '#9ae82a'], ['azul-elétrico', '#2a5aff'],
    ['magenta', '#d81ea8'], ['turquesa', '#1ab8a0'], ['amarelo-ouro', '#ffc81e'], ['vermelho-sangue', '#c80a1e'], ['violeta', '#9a4ae8'], ['coral', '#ff6a5a'],
    ['menta', '#4ae8a8'], ['cobalto', '#1e3ab0'], ['pink', '#ff5ab8'], ['esmeralda', '#0a9a5a'], ['âmbar', '#ff9a0a'], ['anil', '#3a2ae8'],
    ['tóxico', '#7aff1a'], ['framboesa', '#c81a5a'], ['safira', '#1a4ac8'], ['tangerina', '#ff8a2a'], ['lilás', '#c08aff'], ['abacate', '#6a9a1e'],
    ['vermelhão', '#e8301e'], ['azul-piscina', '#2ab0ff'], ['uva', '#5a1a8a'], ['manga', '#ffb02a'], ['jade', '#2a9a7a'], ['fúcsia', '#ff1ad8'],
    ['petróleo neon', '#0ac8c8'], ['ouro velho', '#b08a1e'], ['camuflado', '#4a5a2a'], ['carbono', '#1a1c24'], ['marfim', '#f4ecd0'], ['grená', '#7a0a2a'],
    ['azul-noite', '#141e4a'], ['bronze', '#a8682a'], ['rubi', '#a80a3a'], ['oceano', '#0a5a8a']] },
  l: { rar: 4, srv: 3, d: '#ffd84a', cols: [
    ['de ouro', '#d8a820', '#16141c'], ['de diamante', '#9ff4ff', '#ffffff'], ['rubi real', '#c00a2a', '#ffd84a'], ['esmeralda real', '#0aa860', '#ffd84a'],
    ['safira real', '#1a3ad8', '#ffd84a'], ['obsidiana', '#0e0a14', '#a84aff'], ['lava', '#ff4a0a', '#ffe070'], ['gelo eterno', '#c8f0ff', '#3ab0e8'],
    ['galáxia', '#2a0a5a', '#ff5ab8'], ['radioativo', '#5aff1a', '#16141c'], ['do dragão', '#8a0a0a', '#ffb020'], ['da caveira', '#e8e4d8', '#c0262a'],
    ['do baile', '#ff1ad8', '#1ec8e8'], ['da madrugada', '#0a0e2a', '#7ab0ff'], ['do Cristo', '#f4f0e4', '#d8a820'], ['da Lapa', '#c0262a', '#f4f0e4'],
    ['do arco-íris', '#ff3d8b', '#ffd84a'], ['de prata', '#c8ccd8', '#ffffff'], ['do sangue', '#5a0008', '#ff3a2a'], ['do trovão', '#2a2a5a', '#ffe82a'],
    ['solar', '#ffb01a', '#ffffff'], ['lunar', '#d8dcf0', '#7a8ac8'], ['do eclipse', '#1a1020', '#ff8a1a'], ['da selva', '#1a5a1a', '#d8a820'],
    ['do oceano', '#0a4a8a', '#9ff4ff'], ['do fogo-fátuo', '#2affc8', '#16141c'], ['imperial', '#5a0a8a', '#ffd84a'], ['do samba', '#ffd81a', '#1a8a3a'],
    ['do pôr do sol', '#ff6a3a', '#ffd84a'], ['cromado', '#e0e4ec', '#5a6a8a'], ['da praga', '#4a6a1a', '#c8ff4a'], ['fantasma', '#e8f0f4', '#9ab0c8'],
    ['do vampiro', '#2a0010', '#e8e4d8'], ['neon infinito', '#0a0a14', '#3effa8'], ['de platina', '#e8ecf0', '#c0c8d8'], ['do favelado rei', '#16141c', '#d8a820'],
    ['da tempestade', '#3a4a5a', '#9ff4ff'], ['de cobre', '#b8602a', '#ffd8a0'], ['do zumbi', '#4a6a3a', '#8e0f16'], ['estelar', '#141a3a', '#ffffff']] }
};
const LIST = [];
for (const t in TIERS) {
  const T = TIERS[t];
  SEQ.forEach((k, i) => {
    const c = T.cols[i], K = KIND[k], n = String(i + 1).padStart(2, '0');
    LIST.push({ id: 'cx_' + t + n, slot: K[0], kind: k, spot: K[2], name: K[1] + ' ' + c[0], base: c[1], d: c[2] || T.d, rar: T.rar, srv: T.srv, src: 'caixa' });
  });
}
// temporada 1: 1 lendário novo no passe e 3 na loja Z-Coin
LIST.push(
  { id: 's1_moletom_quebrada', slot: 'chest', kind: 'capuz', name: 'Moletom da Quebrada', base: '#16141c', d: '#d8a820', rar: 4, srv: 3, src: 'passe' },
  { id: 'z_bone_diamante', slot: 'head', kind: 'bone', name: 'Boné de diamante', base: '#9ff4ff', d: '#ffffff', rar: 4, srv: 3, src: 'loja', price: 600 },
  { id: 'z_tenis_ouro', slot: 'feet', kind: 'tenis', name: 'Tênis de ouro', base: '#d8a820', d: '#16141c', rar: 4, srv: 3, src: 'loja', price: 600 },
  { id: 'z_mochila_dragao', slot: 'acc', kind: 'mochila', spot: 'back', name: 'Mochila do dragão', base: '#8a0a0a', d: '#ffb020', rar: 4, srv: 3, src: 'loja', price: 600 }
);
module.exports = LIST;
if (require.main === module && process.argv[2] === 'sql') {
  const q = (s) => "'" + s.replace(/'/g, "''") + "'";
  const rows = LIST.map((it) => '(' + q(it.id) + ',' + it.srv + ',' + (it.price || 'null') + ',' + q(it.src === 'caixa' ? 'box' : it.src === 'loja' ? 'item' : 'pass') + ',true)');
  console.log('insert into public.shop_items (item_id, rarity, price_z, kind, active) values\n' + rows.join(',\n') + '\non conflict (item_id) do update set rarity = excluded.rarity, price_z = excluded.price_z, kind = excluded.kind, active = true;');
}
