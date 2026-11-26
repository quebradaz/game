// v29.1: dois acertos do menu.
// 1. A foto do personagem (card VOCÊ no início e PERFIL) agora mostra a roupa equipada. Antes o drawAvatar
//    pegava o visual atual mas montava o equipamento pela skin antiga (shim de recolor), então boné, camisa
//    e afins trocados no guarda-roupa nunca apareciam na foto. Agora usa o equipamento do rig atual
//    (RIG_CUR.eq, que o LOOK.apply monta a cada troca), com o shim só de reserva.
// 2. O número da versão sai do canto inferior esquerdo (ficava em cima da foto do card VOCÊ) e vai pro
//    canto superior direito, acima do botão AJUDA, respeitando o recorte do celular.
// Uso: node tools/patches/v29.1-avatar-versao.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

// ---------- 1. foto do personagem segue a roupa equipada ----------
rep(`const L = look || (RIG_CUR ? RIG_CUR.look : RIG_DEFAULT_LOOK), E = eq || rigEqFromSkin(skin || SAVE.d.skin || "padrao");`,
  `const L = look || (RIG_CUR ? RIG_CUR.look : RIG_DEFAULT_LOOK), E = eq || (!skin && RIG_CUR && RIG_CUR.eq) || rigEqFromSkin(skin || SAVE.d.skin || "padrao");`);

// ---------- 2. versão no canto superior direito ----------
rep(`#qzVer{position:fixed;left:var(--sal);bottom:calc(var(--sab) + 2px);`,
  `#qzVer{position:fixed;right:var(--sar);top:calc(env(safe-area-inset-top) + 3px);`);

fs.writeFileSync(F, s);
console.log('ok v29.1 avatar + versão');
