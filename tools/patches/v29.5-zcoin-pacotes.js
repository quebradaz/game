// v29.5: novos pacotes de Z-Coin e atalhos para a compra.
// Pacotes (o preço que vale é o da tabela zc_packs no servidor; aqui é só vitrine):
//   Punhado 300 por R$ 4,90 · Saco 600 + 100 por R$ 20 · Mochila de dinheiro 900 + 150 por R$ 35 · Cofre 1200 + 200 por R$ 65
// Atalhos: tocar em qualquer saldo de Z-Coin (menu, passe e loja) abre a aba Z-COIN; a LOJA ganha o botão "Z-COIN ›".
// Servidor: supabase/migrations/v29_5_zcoin_pacotes.sql. Uso: node tools/patches/v29.5-zcoin-pacotes.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

rep('packs: [{ id: "punhado", n: "Punhado", z: 100, b: 0, p: "R$ 4,90" }, { id: "saco", n: "Saco", z: 300, b: 30, p: "R$ 12,90" }, { id: "mochila", n: "Mochila", z: 650, b: 100, p: "R$ 24,90" }, { id: "cofre", n: "Cofre", z: 1400, b: 300, p: "R$ 49,90" }],',
  'packs: [{ id: "punhado", n: "Punhado", z: 300, b: 0, p: "R$ 4,90" }, { id: "saco", n: "Saco", z: 600, b: 100, p: "R$ 20,00" }, { id: "mochila", n: "Mochila de dinheiro", z: 900, b: 150, p: "R$ 35,00" }, { id: "cofre", n: "Cofre", z: 1200, b: 200, p: "R$ 65,00" }],');

// CSS: saldo de Z-Coin com cara de botão (sinal de + roxo)
rep('#zpOv.hidden{display:none}',
  '#zpOv.hidden{display:none}\n' +
  '.chip.zcGo{cursor:pointer;position:relative;padding-right:22px}.chip.zcGo::after{content:"+";position:absolute;right:5px;top:50%;transform:translateY(-50%);width:13px;height:13px;line-height:13px;text-align:center;font:700 12px system-ui,sans-serif;color:#fff;background:#8a3ad8;border-radius:3px;box-shadow:0 0 0 1px #000}\n' +
  '.chip.zcGo:hover::after,.chip.zcGo:focus-visible::after{background:#b04aff}\n' +
  '#msZc{color:#d9a6ff}');

// botão Z-COIN na LOJA
rep('<button data-t="skills" id="msSkills">HABILIDADES ›</button></div>',
  '<button data-t="skills" id="msSkills">HABILIDADES ›</button><button data-t="zc" id="msZc">Z-COIN ›</button></div>');

// atalhos (depois do ZPAY; o onclick daqui substitui o das abas da loja)
rep('$("zpOk").onclick = () => { ZPAY.ov(0); UI.show("title"); };',
  '$("zpOk").onclick = () => { ZPAY.ov(0); UI.show("title"); };\n' +
  'ZPAY.open = () => {\n' +
  '  SFX.swap && SFX.swap();\n' +
  '  UI.show("ecoScr");\n' +
  '  ECO.show("shop");\n' +
  '  ECO.refresh();\n' +
  '};\n' +
  'document.querySelectorAll(".chip").forEach((c) => {\n' +
  '  if (!c.querySelector(".ic.zc") || c.closest("#zpOv")) return;\n' +
  '  c.classList.add("zcGo");\n' +
  '  c.setAttribute("role", "button");\n' +
  '  c.setAttribute("tabindex", "0");\n' +
  '  c.setAttribute("aria-label", "Comprar Z-Coin");\n' +
  '  c.onclick = (e) => { e.stopPropagation(); ZPAY.open(); };\n' +
  '  c.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); ZPAY.open(); } };\n' +
  '});\n' +
  '$("msZc").onclick = () => ZPAY.open();');

fs.writeFileSync(F, s);
console.log('ok v29.5-zcoin-pacotes');
