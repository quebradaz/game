// v28.4: interface que cabe no celular deitado (tela inicial menor, textos legíveis) e opção de tamanho em Ajustes.
// --ui é o multiplicador (Pequeno 0,85 · Médio 1 · Grande 1,2). Uso: node tools/patches/v28-tamanho-ui.js index.html
const fs = require('fs');
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
const i = s.indexOf('</style>');
s = s.slice(0, i) + nl(`/* v28.4: tamanho da interface. --ui vem de Ajustes › Tamanho da interface. */
:root{--ui:1}
.panel{zoom:var(--ui)}
.tRow .btn{font-size:calc(24px*var(--ui))}
.bigPlay{font-size:calc(48px*var(--ui))}
.tChips,.tMarcus,#bHelp,.tNow{zoom:var(--ui)}
/* celular deitado (tela baixa): tela inicial compacta, textos de painel no mínimo 13 px */
@media (max-height:500px){
  #tLogo{height:min(30vh,140px)}
  .bigPlay{font-size:calc(28px*var(--ui));padding:calc(6px*var(--ui)) calc(30px*var(--ui)) calc(4px*var(--ui))}
  .tMenu{gap:6px}
  .tRow{gap:5px;flex-wrap:wrap;justify-content:center;max-width:calc(100vw - 2*max(12px,var(--sal)) - 220px)}
  .tRow .btn{min-width:0;font-size:calc(14px*var(--ui));padding:calc(5px*var(--ui)) calc(10px*var(--ui));letter-spacing:.5px}
  .tChips{flex-direction:row;flex-wrap:wrap;gap:4px;max-width:44vw}
  .tChips .chip{padding:2px 6px;font-size:13px}
  .tChips .ic{width:16px!important;height:16px!important}
  .tMarcus{zoom:calc(.8*var(--ui))}
  .tNow{zoom:calc(.8*var(--ui))}
  #bHelp{zoom:calc(.8*var(--ui))}
  .btn{font-size:16px;padding:6px 14px}
  .panel{padding:10px 14px}
  .panel p,.segNote,.ecNote,.ecRow small,.rkList .rkRow,.ecLv .pr,.lvRow,.stat .l{font-size:13px}
  .panel h3{font-size:20px}
}
`) + s.slice(i);
rep('    <div class="seg" id="qualSeg">', `    <p style="margin:6px 0 8px">Tamanho da interface</p>
    <div class="seg" id="uiSeg"><button data-v="p">Pequeno</button><button data-v="m">Médio</button><button data-v="g">Grande</button></div>
    <p style="margin:6px 0 8px">Qualidade visual</p>
    <div class="seg" id="qualSeg">`);
// o título "Qualidade visual" já existia logo antes de qualSeg: remove a duplicata
{
  const dup = nl('    <p style="margin:6px 0 8px">Qualidade visual</p>\n    <p style="margin:6px 0 8px">Tamanho da interface</p>');
  if (s.indexOf(dup) < 0) throw new Error('titulo qualidade');
  s = s.replace(dup, nl('    <p style="margin:6px 0 8px">Tamanho da interface</p>'));
}
rep('function qualSync() {', `// v28.4: tamanho da interface (salvo no save)
const UI_SIZES = { p: 0.85, m: 1, g: 1.2 };
function uiSize(v) {
  v = UI_SIZES[v] ? v : "m";
  document.documentElement.style.setProperty("--ui", UI_SIZES[v]);
  for (const b of document.querySelectorAll("#uiSeg button")) b.classList.toggle("on", b.dataset.v === v);
  return v;
}
for (const b of document.querySelectorAll("#uiSeg button")) b.onclick = () => {
  SAVE.d.uiSize = uiSize(b.dataset.v);
  SAVE.save();
  SFX.swap && SFX.swap();
};
uiSize(SAVE.d.uiSize);
function qualSync() {`);
s = s.replace(/const QZ_VERSION='28\.3';/, "const QZ_VERSION='28.4';").replace(/const QZ_NOTE='[^']*';/, "const QZ_NOTE='Interface cabe no celular: tela inicial menor, textos maiores e opcao de tamanho em Ajustes';");
fs.writeFileSync(F, s);
console.log('ok');
