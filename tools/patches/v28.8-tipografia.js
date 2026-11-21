// v28.8: textos legíveis em qualquer celular e PC, e tipografia mais "de quebrada".
// Uso: node tools/patches/v28.8-tipografia.js index.html
//
// O que muda:
// 1. Pixelzone (a fonte de texto corrido) desenha os glifos pequenos demais: 16 px dela têm a altura de
//    um 11 px comum. O @font-face ganha size-adjust, então TODO texto em Pixelzone cresce de uma vez,
//    sem mexer em centenas de regras. O texto desenhado no canvas compensa e fica igual.
// 2. Piso de tamanho: nenhum texto fica abaixo de ~12 px de leitura (rótulos do HUD, etiquetas, notas).
// 3. Celular deitado: tira o zoom de 0,8 que encolhia o canto da tela inicial.
// 4. PC e tablet: a interface cresce com a tela (--auto), em vez de ficar do tamanho de um celular no meio
//    de um monitor Full HD. Ajustes › Tamanho da interface continua multiplicando por cima.
// 5. Imersão: títulos com sombra dura de pixel, subtítulos em GothicByte cor de neon, contorno preto nos
//    rótulos que ficam por cima do cenário, entrelinha maior em parágrafos.
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
if (s.indexOf('v28.8 tipografia') >= 0) throw new Error('já aplicado');

// 1. Pixelzone maior em todo lugar (o canvas compensa logo abaixo)
const PZ = 1.5;
rep("@font-face{font-family:'Pixelzone';", "@font-face{font-family:'Pixelzone';size-adjust:" + PZ * 100 + "%;");
rep('c.font = "16px Pixelzone";', 'c.font = "' + +(16 / PZ).toFixed(3) + 'px Pixelzone";');

// 2-5. regras novas no fim do <style>, para ganhar das antigas
const i = s.indexOf('</style>');
s = s.slice(0, i) + nl(`/* ===== v28.8 tipografia: legível em celular e PC ===== */
/* --auto: a interface cresce com a tela grande. --uz: zoom total de um painel (tamanho escolhido × tela). */
/* --auto2: metade do crescimento, para os cantos da tela inicial não trombarem com o menu. */
:root{--auto:1;--auto2:1;--uz:calc(var(--ui)*var(--auto));--tx2:#cfc8da;--ol:0 1px 0 #000,1px 0 0 #000,-1px 0 0 #000,0 -1px 0 #000}
@media (min-width:1000px) and (min-height:700px){:root{--auto:1.25;--auto2:1.1}}
@media (min-width:1500px) and (min-height:880px){:root{--auto:1.5;--auto2:1.25}}
@media (min-width:1900px) and (min-height:1040px){:root{--auto:1.75;--auto2:1.35}}
@media (min-width:2500px) and (min-height:1400px){:root{--auto:2.25;--auto2:1.6}}
.shadeFull{zoom:var(--auto)}
.shadeFull .panel{max-height:calc((100vh - 12px) / var(--uz))!important}
.tScreen #tLogo,.tScreen .tMenu{zoom:var(--auto)}
.tChips,.tMarcus,#bHelp,#bFeed,.tNow{zoom:calc(var(--ui)*var(--auto2))!important}
/* passe/ranking/feedback: o painel rola por dentro e o título com VOLTAR fica sempre à vista */
.shadeFull .rkWrap{max-height:calc(100vh / var(--auto) - 12px)}
.rkWrap>.selHead,.rkWrap>.ecBar{flex:0 0 auto}
.shadeFull .rkWrap .rkBox{flex:1 1 auto;min-height:0;max-height:none!important}
#qzVer{font-size:11px;zoom:var(--auto)}
/* tela inicial: a fileira de botões quebra em duas antes de entrar embaixo dos cantos (VOCÊ / AGORA NA QUEBRADA) */
@media (min-height:501px){.tRow{flex-wrap:wrap;justify-content:center;max-width:calc((100vw - 600px * var(--auto2)) / var(--auto))}}
/* celular deitado: o canto da tela inicial não encolhe mais (era 0,8) */
@media (max-height:500px){
  .tMarcus,.tNow,#bHelp,#bFeed{zoom:var(--ui)!important}
  .tRow{flex-wrap:nowrap}
  .tRow .btn{font-size:calc(15px*var(--ui));padding:calc(5px*var(--ui)) calc(8px*var(--ui))}
}
/* parágrafos: entrelinha que dá para ler */
.panel p,.ecNote,.segNote,.skHead p,.ecRow small,.skNode .skT small,.pmT small,.cpCard .cpP,.hlText{line-height:1.3}
.panel p,.ecRow small,.skNode .skT small,.lkVal,.cpCard .cpP{color:var(--tx2)}
/* pisos: Yoster nunca abaixo de 12 px, texto de sistema nunca abaixo de 12 px (13 em texto corrido) */
.sumK,#over .stat .l,.sumH{font-size:12px!important}
.pmT i,#pickList .pkC small,.card .won{font-size:12px}
.hlList div,.hlText,.hlText h4,.chk,#a2hs b{font-size:14px}
.pin,.hlList i{font-size:12px!important}
#cash.max::after{font-size:11px}
#devMenu .dvHead span,#devMenu .dvNote,.qzFail small{font-size:12px}
#hudEdit button,#hudEdit select,.heChk,#hudEdit .heSel{font-size:13px}
.heBox span{font-size:12px}
/* personagem: botões de pose em 2 × 2 para caber na coluna */
#lkPose{flex-wrap:wrap!important;gap:4px}#lkPose button{flex:1 1 calc(50% - 4px)!important}
/* passe: o prêmio de cada nível em letra de ler */
.ecLv .pr{font-size:14px}
/* telas novas da v28.8 (passe visual, amigos, níveis): mesmos pisos, valem quando forem mescladas */
.bpLv small,.bpCard .st,.bpTags span,.bpPrev .tg,.lvS{font-size:12px!important}
/* HUD: rótulos que ficam por cima do cenário ganham contorno e um mínimo de 11-12 px */
.stick .sl,.tbtn .lb,#bNade .lb,.slot .sk,#bAct .at small,#bAct kbd,#compass,#cmpTx{text-shadow:var(--ol)}
.stick .sl{font-size:12px!important;letter-spacing:.5px}
.tbtn .lb{font-size:12px!important;line-height:13px}
#bNade .lb,#bSyr .lb,#bKick .lb,#bDodge .lb{font-size:11px!important;line-height:12px!important}
#bNade b,#nadeChip b,#nadeChip .ng b{font-size:13px}
.slot .sa,.slot.empty .sa{font-size:13px!important}
.slot .sk{font-size:12px!important;line-height:14px}
#bAct .at small{font-size:12px!important}
#bAct kbd{font-size:12px!important}
#pauseBar button,#pbDir{font-size:14px!important}
#compass{font-size:13px}
/* HUD no PC/tablet: a barra de baixo e o topo crescem com a tela (só no layout padrão, sem HUD personalizado) */
@media (min-width:1000px) and (min-height:700px){
  body:not(.noBar):not(:has([data-hud][style*="fixed"])) #strip{zoom:var(--auto);height:calc(54px + var(--sab) / var(--auto))}
  body.playing:not(.noBar):not(:has([data-hud][style*="fixed"])) #gameWrap{height:calc(100% - 54px * var(--auto) - var(--sab))}
  body:not(:has([data-hud][style*="fixed"])) #topC{zoom:var(--auto)}
  #prompt,#wHint,#powers,#banner{zoom:var(--auto)}
}
/* imersão: títulos com sombra dura de pixel; subtítulo verde neon de letreiro */
.selHead .h2{text-shadow:3px 3px 0 #3a1a00,6px 6px 0 rgba(0,0,0,.45)}
.selHead .h2 small{letter-spacing:2px;text-shadow:0 0 8px rgba(125,255,58,.5),2px 2px 0 #000}
.panel h3,.overT{text-shadow:2px 2px 0 rgba(255,255,255,.18);letter-spacing:2px}
.skBr{letter-spacing:3px;text-shadow:0 0 6px currentColor}
`) + s.slice(i);
fs.writeFileSync(F, s);
console.log('ok');
