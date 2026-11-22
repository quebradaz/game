// v29: desempenho na horda (iPhone 11 e celulares médios). Medido com tools/perf/bench-horda.js (CPU 4x mais
// lenta, 24 zumbis vivos): os três maiores custos do quadro eram trabalho de canvas que não muda a imagem.
//  1. Reflexo do chão molhado: copiava a tela inteira para um canvas pequeno A CADA quadro (no Safari isso força
//     descarregar e copiar o canvas principal). Agora a cópia é refeita a cada quadro na alta e na média (que roda a 30 fps, então metade das cópias de antes; qualidade
//     alta/média; na baixa não tem reflexo); as ondas continuam animando em todo quadro.
//  2. Manchas de sangue no cenário: cada gota que caía sujava um bloco de 1024x360 e obrigava a copiá-lo de novo
//     no quadro seguinte. Agora as manchas entram juntas a cada 2-3 quadros, em blocos de 256 px, e só a faixa
//     da tela com sangue é desenhada (bloco limpo nem é desenhado).
//  3. Zumbi descendo a escada na zona clara (zLift): usava um canvas do tamanho da tela por zumbi. Agora usa um do
//     tamanho do sprite.
// Uso: node tools/patches/v29-desempenho.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

// ---------- 1. reflexo: cópia da tela a cada N quadros ----------
rep(`      if (!C.rf || C.rf[0].width !== VW) C.rf = mkCanvas(VW, H);
      const rx = C.rf[1];
      rx.setTransform(1, 0, 0, -1, 0, H);
      rx.drawImage(g2.canvas, 0, G0 - 3 - SH, VW, SH, 0, 0, VW, H);
      rx.setTransform(1, 0, 0, 1, 0, 0);`,
`      if (!C.rf || C.rf[0].width !== VW) {
        C.rf = mkCanvas(VW, H);
        C.rfN = 99;
      }
      // v29: copiar a tela é o passo caro; o reflexo ondulado aguenta 1-2 quadros de atraso sem ninguém notar
      if (++C.rfN >= [1, 1, 2][QUAL.tier] || S.mode !== "play") {
        C.rfN = 0;
        const rx = C.rf[1];
        rx.setTransform(1, 0, 0, -1, 0, H);
        rx.drawImage(g2.canvas, 0, G0 - 3 - SH, VW, SH, 0, 0, VW, H);
        rx.setTransform(1, 0, 0, 1, 0, 0);
      }`);

// ---------- 2. manchas: fila + blocos menores + só a faixa usada ----------
rep(`function decalTiles(x0, x1, fn) {
  const L = LAYERS[S.mi];
  if (!L) return;
  for (const t of L.decT) {
    if (t.x >= x1 || t.x + t.w <= x0) continue;
    fn(t.cx, t.x);`,
`// v29: as manchas vão para uma fila e entram nos blocos juntas a cada poucos quadros (ver decalPump); cada bloco
// sujo custa uma cópia inteira dele quando é desenhado, então juntar várias gotas numa entrada só poupa muito.
const DQ = { q: [], f: 0, every: [2, 2, 3] };
function decalTiles(x0, x1, fn, y0, y1) {
  if (!LAYERS[S.mi]) return;
  DQ.q.push(x0, x1, fn, y0 == null ? 0 : y0, y1 == null ? VH : y1);
}
function decalPump(force) {
  if (!DQ.q.length) return;
  if (!force && ++DQ.f < DQ.every[QUAL.tier] && DQ.q.length < 1500) return;
  DQ.f = 0;
  const Q = DQ.q;
  DQ.q = [];
  for (let i = 0; i < Q.length; i += 5) decalApply(Q[i], Q[i + 1], Q[i + 2], Q[i + 3], Q[i + 4]);
}
function decalApply(x0, x1, fn, y0, y1) {
  const L = LAYERS[S.mi];
  if (!L) return;
  y0 = Math.max(0, Math.floor(y0) - 2);
  y1 = Math.min(VH, Math.ceil(y1) + 2);
  for (const t of L.decT) {
    if (t.x >= x1 || t.x + t.w <= x0) continue;
    fn(t.cx, t.x);
    // faixa vertical com sangue: drawTiles só desenha ela (bloco limpo tem h = 0 e é pulado)
    if (!t.h) {
      t.y0 = y0;
      t.h = y1 - y0;
    } else {
      const e = Math.max(t.y0 + t.h, y1);
      t.y0 = Math.min(t.y0, y0);
      t.h = e - t.y0;
    }`);
rep(`function decalFlush(L) {
  for (let i = 0; i < L.decT.length; i++) {
    const t = L.decT[i];
    if (!t.dirty) continue;
    const [a, b] = t.dirty;
    t.dirty = null;
    if (b <= a) continue;
    t.cx.globalCompositeOperation = "destination-in";
    t.cx.drawImage(L.mainT[i].c, a, 0, b - a, VH, a, 0, b - a, VH);`,
`function decalFlush(L) {
  for (let i = 0; i < L.decT.length; i++) {
    const t = L.decT[i];
    if (!t.dirty) continue;
    const [a, b] = t.dirty;
    t.dirty = null;
    if (b <= a) continue;
    // v29: bloco de mancha (256) dentro do bloco do cenário (1024): mesma posição x no mundo
    const mt = L.mainT[Math.floor(t.x / TILE)], ox = t.x - mt.x;
    t.cx.globalCompositeOperation = "destination-in";
    t.cx.drawImage(mt.c, ox + a, t.y0, b - a, t.h, a, t.y0, b - a, t.h);`);
rep(`  if (L) for (const t of L.decT) {
    t.cx.clearRect(0, 0, t.w, VH);
    t.dirty = null;
  }`,
`  DQ.q = [];
  if (L) for (const t of L.decT) {
    t.cx.clearRect(0, 0, t.w, VH);
    t.dirty = null;
    t.y0 = 0;
    t.h = 0;
  }`);
rep(`function tileBlank(W, H) {
  const out = [];
  for (let x = 0; x < W; x += TILE) {
    const w2 = Math.min(TILE, W - x), [c, cx_] = mkCanvas(w2, H);
    out.push({ x, w: w2, c, cx: cx_, dirty: null });
  }
  return out;
}`,
`// v29: blocos de mancha de 256 px (TILE é múltiplo): cada cópia de bloco sujo fica 4x menor
const DTILE = 256;
function tileBlank(W, H) {
  const out = [];
  for (let x = 0; x < W; x += DTILE) {
    const w2 = Math.min(DTILE, W - x), [c, cx_] = mkCanvas(w2, H);
    out.push({ x, w: w2, c, cx: cx_, dirty: null, y0: 0, h: 0 });
  }
  return out;
}`);
rep(`  if (S.decalN > 0) {
    decalFlush(L);
    drawTiles(g, L.decT, camX);
  }`,
`  decalPump(S.mode !== "play");
  if (S.decalN > 0) {
    decalFlush(L);
    drawTiles(g, L.decT, camX);
  }`);
// decal(): manda a faixa vertical
rep(`  decalTiles(x, x + w2, (c, ox) => {
    if (a < 1) c.globalAlpha = a;
    c.fillStyle = col;
    c.fillRect(x - ox, y, w2, h);
    if (a < 1) c.globalAlpha = 1;
  });`,
`  decalTiles(x, x + w2, (c, ox) => {
    if (a < 1) c.globalAlpha = a;
    c.fillStyle = col;
    c.fillRect(x - ox, y, w2, h);
    if (a < 1) c.globalAlpha = 1;
  }, y, y + h);`);
// stampSpr: a mancha entra depois, então guarda os valores agora (o sprite volta para o pool e é reaproveitado)
rep(`  const v = GSPR[s.vi][s.sz], R = Math.max(v.w, v.h) + 2;
  decalTiles(s.x - R, s.x + R, (c, ox) => {
    c.save();
    c.globalAlpha = 0.9;
    c.translate(s.x - ox, s.y);
    c.rotate(s.k * Math.PI / 2);
    c.scale(s.mi ? -1 : 1, 1);
    c.drawImage(v.sh[fi], -v.ox, -v.oy);
    c.restore();
  });`,
`  const v = GSPR[s.vi][s.sz], R = Math.max(v.w, v.h) + 2, sx = s.x, sy = s.y, sk = s.k, smi = s.mi;
  decalTiles(sx - R, sx + R, (c, ox) => {
    c.save();
    c.globalAlpha = 0.9;
    c.translate(sx - ox, sy);
    c.rotate(sk * Math.PI / 2);
    c.scale(smi ? -1 : 1, 1);
    c.drawImage(v.sh[fi], -v.ox, -v.oy);
    c.restore();
  }, sy - R, sy + R);`);

// ---------- 3. zLift: canvas do tamanho do sprite, não da tela ----------
rep(`    if (!ZL_C || ZL_C[0].width !== lc.width || ZL_C[0].height !== lc.height) ZL_C = mkCanvas(lc.width, lc.height);
    const [cv2, x2] = ZL_C;
    x2.setTransform(1, 0, 0, 1, 0, 0);
    x2.globalCompositeOperation = "source-over";
    x2.clearRect(0, 0, cv2.width, cv2.height);
    x2.setTransform(LQ, 0, 0, LQ, -camX * LQ, 0);
    drawZimg(x2, VIMG[z.v + ":" + z._fk] || IMG[z._fk], z._fk, z._fr | 0, z.x, z.y, z.face, 1, sc);
    x2.setTransform(LQ, 0, 0, LQ, 0, 0);
    x2.globalCompositeOperation = "source-in";
    x2.fillStyle = "rgba(0,0,0," + al.toFixed(3) + ")";
    x2.fillRect(0, a.y1, VW, VH - a.y1);
    lx.save();
    lx.setTransform(1, 0, 0, 1, 0, 0);
    lx.drawImage(cv2, 0, 0);
    lx.restore();`,
`    // v29: recorte do tamanho do quadro do sprite (antes: um canvas do tamanho da luz inteira por zumbi)
    const f2 = (SHEETS[z._fk] || { f: 64 }).f * sc, ox = Math.floor((z.x - f2 - camX) * LQ), oy = Math.floor((z.y - f2 - 2) * LQ), sw = Math.ceil(f2 * 2 * LQ) + 2, shh = Math.ceil((f2 + 4) * LQ) + 2;
    if (!ZL_C || ZL_C[0].width < sw || ZL_C[0].height < shh) ZL_C = mkCanvas(Math.max(sw, ZL_C ? ZL_C[0].width : 0), Math.max(shh, ZL_C ? ZL_C[0].height : 0));
    const [cv2, x2] = ZL_C;
    x2.setTransform(1, 0, 0, 1, 0, 0);
    x2.globalCompositeOperation = "source-over";
    x2.clearRect(0, 0, sw, shh);
    x2.setTransform(LQ, 0, 0, LQ, -camX * LQ - ox, -oy);
    drawZimg(x2, VIMG[z.v + ":" + z._fk] || IMG[z._fk], z._fk, z._fr | 0, z.x, z.y, z.face, 1, sc);
    x2.setTransform(LQ, 0, 0, LQ, -ox, -oy);
    x2.globalCompositeOperation = "source-in";
    x2.fillStyle = "rgba(0,0,0," + al.toFixed(3) + ")";
    x2.fillRect(0, a.y1, VW, VH - a.y1);
    lx.save();
    lx.setTransform(1, 0, 0, 1, 0, 0);
    lx.drawImage(cv2, 0, 0, sw, shh, ox, oy, sw, shh);
    lx.restore();`);

// ---------- 4. o que cada qualidade liga (pedido do dono, 2026-11-22) ----------
// ALTA: tudo. MÉDIA: só o reflexo do chão fica dos efeitos pesados. BAIXA: sem parallax, sem luz pesada, sem reflexo.
// "Parallax" = camadas de fundo que deslizam em velocidades diferentes (3 camadas da quebrada, nuvens, primeiro plano).
// "Luz pesada" = tinta colorida das lâmpadas, cones de luz, raios de sol e bloom. A escuridão com as luzes básicas
// fica em todas, porque ela faz parte do jogo (zumbi no escuro).
rep(`function setQuality(mode) {`, `// v29: o que cada nível de qualidade desenha (0 alta, 1 média, 2 baixa)
const QFX = { parallax: () => QUAL.tier === 0, heavyLight: () => QUAL.tier === 0, reflex: () => QUAL.tier <= 1 };
function setQuality(mode) {`);
rep(`    for (const l of L.scn) g2.drawImage(l.c, Math.round(camX * l.p), 0, VW, VH, 0, 0, VW, VH);`,
`    // v29: sem parallax (média/baixa) fica só a camada mais perto da quebrada
    const L2 = QFX.parallax() ? L.scn : L.scn.slice(-1);
    for (const l of L2) g2.drawImage(l.c, Math.round(camX * l.p), 0, VW, VH, 0, 0, VW, VH);`);
rep(`    g2.globalAlpha = 0.6;
    tile(g2, cl, S.t * 3 * w + camX * 0.04 + 300, 34, 640);
    g2.globalAlpha = 0.95;
    tile(g2, cl, S.t * 7 * w + camX * 0.08, 2, 640);`,
`    if (QFX.parallax()) {
      g2.globalAlpha = 0.6;
      tile(g2, cl, S.t * 3 * w + camX * 0.04 + 300, 34, 640);
      g2.globalAlpha = 0.95;
      tile(g2, cl, S.t * 7 * w + camX * 0.08, 2, 640);
    }`);
rep(`  drawFront(g, L, camX);\n`, `  if (QFX.parallax()) drawFront(g, L, camX);\n`);
// reflexo: some só na baixa
rep(`    const p = per(), k = wet() ? 0.4 : REFL[p] || 0.3;
    {`, `    const p = per(), k = wet() ? 0.4 : REFL[p] || 0.3;
    if (QFX.reflex()) {`);
// raios de sol: luz pesada
rep(`    if (QUAL.tier === 2) return;
    const s = SKY[p], a = s.rayA`, `    if (!QFX.heavyLight()) return;
    const s = SKY[p], a = s.rayA`);
// cones das lâmpadas
rep(`lampK = periodCfg().lamps, hi = QUAL.tier < 2 && !fxReduced();`, `lampK = periodCfg().lamps, hi = QFX.heavyLight() && !fxReduced();`);
// tinta colorida das luzes: só na alta
rep(`tint: [1, 1, 0], fps30: 0 };`, `tint: [1, 0, 0], fps30: 0 };`);
rep(`media: "Menos part\\xEDculas e ambienta\\xE7\\xE3o. Bom para a maioria dos celulares.", baixa: "O mais leve: luz simplificada, tela mais estreita, poucas part\\xEDculas, sem ambienta\\xE7\\xE3o." };`,
`media: "Menos part\\xEDculas, fundo sem parallax e luz simples; o reflexo do ch\\xE3o fica. Bom para a maioria dos celulares.", baixa: "O mais leve: sem parallax, sem reflexo, luz simples e poucas part\\xEDculas." };`);
// alta: deixa claro que tem tudo
rep(`alta: "Todas as part\\xEDculas, chuva e a ambienta\\xE7\\xE3o completa." };`.replace(' };', ','), `alta: "Tudo ligado: parallax, luzes coloridas, raios de sol, bloom, reflexo e todas as part\\xEDculas.",`);

// ---------- 5. média travada em 30 fps (pedido do dono, 2026-11-22) ----------
// Quadro estável no iPhone. O automático continua: média → baixa se nem 30 aguentar; média → alta se sobrar
// folga (quadro leve por 60 s), medindo o tempo de trabalho do quadro, já que o fps fica preso em 30.
rep(`nextT = Math.max(nextT + 1e3 / (QUAL.fps30 && S.mode === "play" ? 30 : 60), ts);`,
`nextT = Math.max(nextT + 1e3 / ((QUAL.fps30 || QUAL.tier === 1) && S.mode === "play" ? 30 : 60), ts);`);
rep(`  if (S.mode === "play") fpsWatch(rdt);
  try {
    if (S.hitStop > 0) S.hitStop -= dt;
    else if (S.mode === "play" || S.mode === "over") update(dt);`,
`  if (S.mode === "play") fpsWatch(rdt);
  const wt0 = performance.now();
  try {
    if (S.hitStop > 0) S.hitStop -= dt;
    else if (S.mode === "play" || S.mode === "over") update(dt);`);
rep(`    if (S.mode === "play") UI.hud();
  } catch (e) {`, `    if (S.mode === "play") UI.hud();
    if (S.mode === "play") FPSW.work = lerp(FPSW.work, performance.now() - wt0, 0.05);
  } catch (e) {`);
rep(`const FPSW = { ema: 60, low: 0, high: 0, vlow: 0 };`, `const FPSW = { ema: 60, low: 0, high: 0, vlow: 0, work: 10 };`);
rep(`  if (QUAL.mode !== "auto") return;
  if (QUAL.fps30) {`, `  if (QUAL.mode !== "auto") return;
  if (QUAL.tier === 1 && !QUAL.fps30) {
    if (FPSW.ema < 27) {
      FPSW.low += rdt;
      FPSW.high = 0;
      if (FPSW.low > 3) {
        FPSW.low = 0;
        applyTier(2);
      }
    } else if (FPSW.work < 7) {
      FPSW.high += rdt;
      FPSW.low = 0;
      if (FPSW.high > 60) {
        FPSW.high = 0;
        applyTier(0);
      }
    } else {
      FPSW.low = Math.max(0, FPSW.low - rdt);
      FPSW.high = 0;
    }
    return;
  }
  if (QUAL.fps30) {`);
rep(`media: "Menos part\\xEDculas, fundo sem parallax e luz simples; o reflexo do ch\\xE3o fica. Bom para a maioria dos celulares."`,
`media: "30 fps est\\xE1veis, menos part\\xEDculas, fundo sem parallax e luz simples; o reflexo do ch\\xE3o fica. Bom para a maioria dos celulares."`);

fs.writeFileSync(F, s);
console.log('ok v29-desempenho');
