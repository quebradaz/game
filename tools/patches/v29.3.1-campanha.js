// v29.3.1: a campanha voltou a abrir. Desde o menu com vídeo (v29.2) o rótulo do vídeo gravava o id do mapa
// ("adega", "lapa"...) em TITLE.cur, que também guarda o período do dia (dia/tarde/noite). Ao abrir a campanha,
// buildSelect copiava esse id para S.period e buildMap quebrava em ARTIMG[per] (imagem inexistente), então a
// tela "ESCOLHE A QUEBRADA" nunca aparecia. Agora o vídeo usa TITLE.vcur para o rótulo, o período continua
// andando pelo relógio do menu e S.period só aceita um período que existe.
// Uso: node tools/patches/v29.3.1-campanha.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

rep(`  vidLabel() {
    const V = this.VID, v = $("tVid"), i = Math.floor((v.currentTime + V.fus / 2) / V.passo) % V.ids.length, id = V.ids[i];
    if (id === this.cur) return;
    this.cur = id;`,
`  vidLabel() {
    // o período do dia segue o relógio do menu mesmo com o vídeo (a partida usa TITLE.cur como período)
    const ws = this.weights((performance.now() - this.t0) / 1e3);
    this.cur = ws.length > 1 && ws[1][1] > 0.5 ? ws[1][0] : ws[0][0];
    const V = this.VID, v = $("tVid"), i = Math.floor((v.currentTime + V.fus / 2) / V.passo) % V.ids.length, id = V.ids[i];
    if (id === this.vcur) return;
    this.vcur = id;`);

// sem vídeo, draw() volta a escrever o período no rótulo: força a reescrita quando o vídeo parar
rep(`    if (dom !== this.cur) {
      const first = this.cur === null;`,
`    if (dom !== this.cur || this.vcur) {
      this.vcur = null;
      const first = this.cur === null;`);

rep(`  S.period = TITLE.cur || "noite";`,
`  S.period = CONFIG.periods[TITLE.cur] && ARTIMG[TITLE.cur] ? TITLE.cur : "noite";`);

rep(`const QZ_VERSION='29.3';`, `const QZ_VERSION='29.3.1';`);
s = s.replace(/const QZ_NOTE='[^']*';/, `const QZ_NOTE='Correção: a campanha voltou a abrir ao clicar em JOGAR';`);
fs.writeFileSync(F, s);

const SW = require('path').join(require('path').dirname(F), 'sw.js');
let w = fs.readFileSync(SW, 'utf8');
if (!w.includes('const CACHE = "qz-v29.3";')) throw new Error('sw CACHE');
fs.writeFileSync(SW, w.replace('const CACHE = "qz-v29.3";', 'const CACHE = "qz-v29.3.1";'));
console.log('ok');
