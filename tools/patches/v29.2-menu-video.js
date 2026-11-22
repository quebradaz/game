// v29.2: fundo do menu com vídeo de partidas de verdade passando pelas quebradas (feito no Remotion, tools/remotion).
// Uso: node tools/patches/v29.2-menu-video.js index.html
//
// O que muda:
// 1. Um <video id="tVid"> mudo, em loop, por cima do canvas antigo (#tBg) e por baixo do degradê/linhas (#tFx).
//    Ele só aparece quando já está tocando; até lá (ou se falhar) fica a arte pintada de sempre.
// 2. Gráfico BAIXO, "reduzir movimento" do sistema e economia de dados: sem vídeo, fica a arte de sempre.
//    O vídeo só baixa (preload none) quando pode tocar, então quem está no baixo não gasta dados com ele.
// 3. Enquanto o vídeo toca, o canvas do menu para de desenhar (poupa bateria) e o selo "AGORA NA QUEBRADA"
//    mostra a quebrada que está passando no vídeo.
// 4. Vídeo para quando a partida começa e quando o app vai para segundo plano.
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
if (s.indexOf('v29.2 menu video') >= 0) throw new Error('já aplicado');

// mesma linha do tempo de tools/remotion/src/MenuFundo.tsx (24 fps, 5,5 s por quebrada, 1,25 s de fusão)
const META = { passo: 4.25, fus: 1.25, ids: ['adega', 'lava', 'quadra', 'laje', 'cristo', 'copa', 'lapa'] };

// 1. o elemento
rep('<canvas id="tBg"></canvas>',
  '<canvas id="tBg"></canvas>\n<video id="tVid" muted playsinline loop preload="none" disablepictureinpicture aria-hidden="true"></video>');

// CSS: mesma caixa do #tBg, entra com fusão
rep('body.playing #tBg,body.playing #tFx{display:none}',
  '/* v29.2 menu video */\n' +
  '#tVid{position:fixed;inset:0;width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .9s ease;pointer-events:none;image-rendering:pixelated;background:transparent}\n' +
  '#tVid.on{opacity:1}\n' +
  'body.playing #tBg,body.playing #tFx,body.playing #tVid{display:none}');

// 2-4. lógica, dentro do TITLE
rep(`  start() {
    if (this.on) return;
    this.on = 1;
    this.fit();`,
`  // v29.2 menu video: fundo em vídeo (só fora do gráfico baixo, sem "reduzir movimento" e sem economia de dados)
  VID: ${JSON.stringify(META)},
  vidOk() {
    const cn = navigator.connection;
    return QUAL.tier < 2 && !REDUCED.matches && !(cn && cn.saveData) && !this.vidBad;
  },
  vidSync() {
    const v = $("tVid");
    if (!v) return;
    if (!this.on || !this.vidOk() || document.hidden) {
      if (!v.paused) v.pause();
      if (!this.vidOk()) v.classList.remove("on");
      return;
    }
    if (!v.getAttribute("src")) {
      v.addEventListener("playing", () => v.classList.add("on"));
      v.addEventListener("error", () => {
        this.vidBad = 1;
        v.classList.remove("on");
      });
      const fmt = v.canPlayType('video/mp4; codecs="avc1.4D401F"') ? "mp4" : v.canPlayType('video/webm; codecs="vp9"') ? "webm" : "";
      if (!fmt) {
        this.vidBad = 1;
        return;
      }
      v.setAttribute("src", "media/menu/menu-fundo." + fmt);
    }
    const p = v.play();
    if (p && p.catch) p.catch(() => {
    });
  },
  vidOn() {
    const v = $("tVid");
    return !!(v && v.classList.contains("on") && !v.paused);
  },
  start() {
    if (this.on) return;
    this.on = 1;
    this.fit();
    this.vidSync();`);

rep(`  stop() {
    this.on = 0;
  },`, `  stop() {
    this.on = 0;
    this.vidSync();
  },`);

// com o vídeo na tela, o canvas não desenha; o selo segue a quebrada do vídeo
rep(`  draw() {
    const c = $("tBg"), x = c.getContext("2d"), W = c.width, H = c.height, t = (performance.now() - this.t0) / 1e3, red = REDUCED.matches;`,
`  draw() {
    if (this.vidOn()) return this.vidLabel();
    const c = $("tBg"), x = c.getContext("2d"), W = c.width, H = c.height, t = (performance.now() - this.t0) / 1e3, red = REDUCED.matches;`);

rep(`  refresh() {
    const D = SAVE.d;
    $("tCoins").textContent = D.coins;`,
`  vidLabel() {
    const V = this.VID, v = $("tVid"), i = Math.floor((v.currentTime + V.fus / 2) / V.passo) % V.ids.length, id = V.ids[i];
    if (id === this.cur) return;
    this.cur = id;
    const m = MAPS.find((q) => q.id === id), b = $("tPeriod");
    b.textContent = m ? m.name : id.toUpperCase();
    b.style.color = "#ffc21a";
  },
  refresh() {
    const D = SAVE.d;
    $("tCoins").textContent = D.coins;`);

// trocar a qualidade no menu liga/desliga o vídeo na hora; voltar do segundo plano retoma
rep(`function applyTier(t) {
  t = clamp(t, 0, 2);
  const ch = t !== QUAL.tier;
  QUAL.tier = t;`, `function applyTier(t) {
  t = clamp(t, 0, 2);
  const ch = t !== QUAL.tier;
  QUAL.tier = t;
  try {
    if (ch && TITLE.on) TITLE.vidSync();
  } catch (e) {
  }`);
const j = s.lastIndexOf('</script>');
s = s.slice(0, j) + nl(`document.addEventListener("visibilitychange", () => {
  try {
    TITLE.vidSync();
  } catch (e) {
  }
});
`) + s.slice(j);

fs.writeFileSync(F, s);
console.log('ok v29.2 menu video');
