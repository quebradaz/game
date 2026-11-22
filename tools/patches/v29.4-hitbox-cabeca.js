// v29.4: tiro na cabeça certinho. Antes a cabeça era uma faixa fixa no alto de uma caixa parada (ZT.head px a partir
// do topo, 70% da largura, centrada no pé): não acompanhava a animação. O zumbi curvado ou correndo tinha a cabeça
// fora da faixa, o tiro no ombro contava como cabeça, e no rastejante e no cachorro a cabeça (na frente, embaixo)
// ficava fora da caixa inteira: não dava para acertar.
// Agora: a cabeça de cada quadro de cada animação vem de tools/hitbox/cabecas.json (gerado por
// tools/hitbox/gerar-cabecas.js) e é posta no mundo como o sprite é desenhado (pé, lado, escala). O tiro acerta a
// caixa do corpo OU a da cabeça; se entra pelo corpo, anda pelo sprite até o primeiro pixel desenhado e só é
// cabeça se esse pixel for da cabeça (tiro de baixo para cima que atravessa as pernas não vira headshot).
// Uso: node tools/patches/v29.4-hitbox-cabeca.js index.html
const fs = require('fs'), path = require('path');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};
const CAB = JSON.parse(fs.readFileSync(path.join(__dirname, '../hitbox/cabecas.json'), 'utf8'));

// 1) quadro que está na tela: uma função só, usada pelo desenho e pelo tiro
rep(`function drawZ0(c, z) {
  const key = z.type + "_" + z.anim, s = SHEETS[key] || SHEETS[z.type + "_Walk"];
  let fr;
  const kk = SHEETS[key] ? key : z.type + "_Walk";
  if (z.duck > 0) fr = Math.min(s.n - 1, z.type === "zx" ? 2 : 1);
  else if (z.anim === "Dead") fr = Math.min(s.n - 1, z.at | 0);
  else if (z.anim === "Hurt") fr = Math.min(s.n - 1, z.at | 0);
  else if (z.anim === "Jump") fr = Math.min(s.n - 2, Math.max(2, z.at | 0));
  else fr = (z.at * (s.sub || 1) | 0) % s.n;
`, `// v29.4: animação e quadro que o zumbi mostra agora (o tiro usa o mesmo quadro que está desenhado)
function zFrame(z) {
  const key = z.type + "_" + z.anim, s = SHEETS[key] || SHEETS[z.type + "_Walk"];
  let fr;
  const kk = SHEETS[key] ? key : z.type + "_Walk";
  if (z.duck > 0) fr = Math.min(s.n - 1, z.type === "zx" ? 2 : 1);
  else if (z.anim === "Dead") fr = Math.min(s.n - 1, z.at | 0);
  else if (z.anim === "Hurt") fr = Math.min(s.n - 1, z.at | 0);
  else if (z.anim === "Jump") fr = Math.min(s.n - 2, Math.max(2, z.at | 0));
  else fr = (z.at * (s.sub || 1) | 0) % s.n;
  return [kk, fr, s];
}
function drawZ0(c, z) {
  const [kk, fr, s] = zFrame(z);
`);

// 2) caixa da cabeça no mundo + decisão cabeça/corpo
rep(`function zBox(z) {
  return [z.x - z.w / 2, z.y - zH(z), z.x + z.w / 2, z.y];
}`, `function zBox(z) {
  return [z.x - z.w / 2, z.y - zH(z), z.x + z.w / 2, z.y];
}
// v29.4: cabeça de cada quadro, em pixels do sprite (virado para a direita): ZHEAD.tam[tipo] = [larg, alt],
// ZHEAD.q[animação] = [x0, y0, x0, y0, ...] um par por quadro. Gerado por tools/hitbox/gerar-cabecas.js.
const ZHEAD = ${JSON.stringify(CAB)};
// retângulo da cabeça no mundo [x0, y0, x1, y1], igual ao que está desenhado (pé em z.x/z.y, lado, escala)
function zHead(z) {
  const [kk, fr, s] = zFrame(z), q = ZHEAD.q[kk], tm = ZHEAD.tam[z.type], sc = z.sc || 1;
  if (!q || !tm || q.length < fr * 2 + 2) {
    // sem mapa (arte nova ainda não gerada): o jeito antigo, faixa no alto da caixa
    const b = zBox(z);
    return [z.x - z.w * 0.35, b[1], z.x + z.w * 0.35, b[1] + z.headH];
  }
  const P = CONFIG.hitbox.headPad, x0 = q[fr * 2] - P, y0 = q[fr * 2 + 1] - P - (z.armor === 1 ? CONFIG.hitbox.helmet : 0), x1 = q[fr * 2] + tm[0] + P, y1 = q[fr * 2 + 1] + tm[1] + P;
  const a = z.face < 0 ? z.x - (x1 - s.ax) * sc : z.x + (x0 - s.ax) * sc, b2 = z.face < 0 ? z.x - (x0 - s.ax) * sc : z.x + (x1 - s.ax) * sc;
  return [a, z.y - (s.f - y0) * sc, b2, z.y - (s.f - y1) * sc];
}
// silhueta (alfa) de um quadro, feita na primeira vez que alguém atira nele
const ZALPHA = {};
function zAlpha(kk, fr) {
  const k = kk + ":" + fr;
  if (ZALPHA[k] !== void 0) return ZALPHA[k];
  const s = SHEETS[kk], im = IMG[kk];
  let m = null;
  try {
    const [c, x] = mkCanvas(s.f, s.f);
    x.drawImage(im, fr * s.f, 0, s.f, s.f, 0, 0, s.f, s.f);
    const d = x.getImageData(0, 0, s.f, s.f).data;
    m = new Uint8Array(s.f * s.f);
    for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 100 ? 1 : 0;
  } catch (e) {
  }
  return ZALPHA[k] = m;
}
// o tiro entrou no corpo em t e na cabeça em th (th >= t): é cabeça se o primeiro pixel desenhado no caminho for da
// cabeça. Pixels na altura da cabeça e colados nela (cabelo, coque, gola, mochila do Capitão) não seguram a bala:
// mirou na cabeça, pega na cabeça. Já o tiro que sobe atravessando pernas ou barriga, ou que pega as costas do
// rastejante longe da cabeça, fica no corpo.
function zHeadFirst(z, ox, oy, dx, dy, t, th, hb) {
  if (th <= t) return true;
  const [kk, fr, s] = zFrame(z), sc = z.sc || 1, m = zAlpha(kk, fr), f = s.f, K = CONFIG.hitbox.near * sc;
  if (!m) return oy + dy * t <= hb[3];
  const st = 0.5 * sc;
  for (let u = t; u <= th; u += st) {
    const wx = ox + dx * u, wy = oy + dy * u;
    if (wy >= hb[1] && wy <= hb[3] && wx >= hb[0] - K && wx <= hb[2] + K) continue;
    const lx = Math.floor(z.face < 0 ? (z.x - wx) / sc + s.ax : (wx - z.x) / sc + s.ax), ly = Math.floor(f - (z.y - wy) / sc);
    if (lx >= 0 && ly >= 0 && lx < f && ly < f && m[ly * f + lx]) return false;
  }
  return true;
}`);

// 3) o tiro: acerta corpo ou cabeça, e a cabeça é a do quadro desenhado
rep(`      const b = zBox(z), t = rayBox(mx, my, dx, dy, b[0], b[1], b[2], b[3]);
      if (t < end) hits.push([t, z]);
    }
    hits.sort((a2, b) => a2[0] - b[0]);
    let pierce = st.pierce, mul = 1, stop = end;
    for (const [t, z] of hits) {
      const hy = my + dy * t;
      const head = hy < z.y - zH(z) + z.headH;`, `      // corpo: a caixa de sempre, mas sem o ar acima da cabeça (o tiro que passa por cima não pega)
      const hb = zHead(z), b = zBox(z);
      b[1] = Math.max(b[1], hb[1]);
      const tb = rayBox(mx, my, dx, dy, b[0], b[1], b[2], b[3]), th = rayBox(mx, my, dx, dy, hb[0], hb[1], hb[2], hb[3]), t = Math.min(tb, th);
      if (t < end) hits.push([t, z, th, hb]);
    }
    hits.sort((a2, b) => a2[0] - b[0]);
    let pierce = st.pierce, mul = 1, stop = end;
    for (const [t, z, th, hb] of hits) {
      const head = th < Infinity && zHeadFirst(z, mx, my, dx, dy, t, th, hb), ht = head ? th : t, hy = my + dy * ht;`);
// a mancha de sangue sai onde a bala bateu (na cabeça, quando é cabeça)
rep(`      hurtZ(z, dmg, head, "gun", dx, mx + dx * t, hy);`, `      hurtZ(z, dmg, head, "gun", dx, mx + dx * ht, hy);`);

// 4) ajustes no CONFIG (margem em volta da cabeça e altura do capacete)
rep(`const ZT = {`, `// v29.4: cabeça dos zumbis (pixels do sprite): margem em volta, quanto o capacete (obra/moto) sobe a cabeça e até que\n// distância da cabeça o que está na mesma altura (cabelo, mochila) não segura o tiro
CONFIG.hitbox = { headPad: 1, helmet: 4, near: 8 };
const ZT = {`);

// 5) tela de teste (DEV > Hitboxes): mostra a cabeça certa
// (a caixa verde antes multiplicava a escala duas vezes: o brutamonte aparecia com uma caixa bem maior que a de verdade)
rep(`    const sc = z.sc || 1, w = (z.w || 20) * sc, h = (z.h || 56) * sc, hh = ((ZT[z.type] || {}).head || 14) * sc;
    c.strokeStyle = "#7dff6a";
    c.strokeRect(Math.round(z.x - w / 2) + 0.5, Math.round(z.y - h) + 0.5, Math.round(w), Math.round(h));
    c.strokeStyle = "#ff4a4a";
    c.strokeRect(Math.round(z.x - w * 0.35) + 0.5, Math.round(z.y - h) + 0.5, Math.round(w * 0.7), Math.round(hh));`, `    const hb = zHead(z), b = zBox(z);
    b[1] = Math.max(b[1], hb[1]);
    c.strokeStyle = "#7dff6a";
    c.strokeRect(Math.round(b[0]) + 0.5, Math.round(b[1]) + 0.5, Math.round(b[2] - b[0]), Math.round(b[3] - b[1]));
    c.strokeStyle = "#ff4a4a";
    c.strokeRect(Math.round(hb[0]) + 0.5, Math.round(hb[1]) + 0.5, Math.round(hb[2] - hb[0]), Math.round(hb[3] - hb[1]));`);

// 6) o coice do tiro vale para o PRÓXIMO tiro, não para este: antes o recuo era somado antes de calcular a direção da
// bala, então até o primeiro tiro saía acima da mira (pistola ~3°, sniper comum ~10°) e passava por cima da cabeça.
// Rajada continua subindo igual (cada tiro usa o coice acumulado dos anteriores).
rep(`  p.recA = zr ? p.recA : Math.min(0.24, p.recA + (GUNREC[W.kind] || 0.04));`, `  const rec0 = p.recA;
  p.recA = zr ? p.recA : Math.min(0.24, p.recA + (GUNREC[W.kind] || 0.04));`);
rep(`  const gp = gunPoints(p), [mx, my] = gp.muz, pan = (mx - S.cam.x) / VW * 2 - 1;`, `  const rec1 = p.recA;
  p.recA = rec0;
  const gp = gunPoints(p), [mx, my] = gp.muz, pan = (mx - S.cam.x) / VW * 2 - 1;
  p.recA = rec1;`);

// 7) ajuda de mira (celular): puxava sempre para o peito, até quando o dedo mirava a cabeça. Agora puxa para o que
// estiver mais perto da mira: peito ou cabeça.
rep(`    const tx2 = z.x, ty = z.y - zH(z) * 0.62, d = Math.hypot(tx2 - sx, ty - sy);
    if (d > 420) continue;
    let da = Math.atan2(ty - sy, tx2 - sx) - a;
    da = Math.atan2(Math.sin(da), Math.cos(da));
    if (Math.abs(da) < bd) {
      bd = Math.abs(da);
      best = a + da;
    }`, `    const hb = zHead(z);
    for (const [tx2, ty] of [[z.x, z.y - zH(z) * 0.62], [(hb[0] + hb[2]) / 2, (hb[1] + hb[3]) / 2]]) {
      const d = Math.hypot(tx2 - sx, ty - sy);
      if (d > 420) continue;
      let da = Math.atan2(ty - sy, tx2 - sx) - a;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      if (Math.abs(da) < bd) {
        bd = Math.abs(da);
        best = a + da;
      }
    }`);

rep(`const QZ_VERSION='29.3.1';`, `const QZ_VERSION='29.4';`);
s = s.replace(/const QZ_NOTE='[^']*';/, `const QZ_NOTE='Tiro na cabeça certinho: a cabeça dos zumbis acompanha a animação';`);
fs.writeFileSync(F, s);

const SW = path.join(path.dirname(F), 'sw.js');
let w = fs.readFileSync(SW, 'utf8');
if (!w.includes('const CACHE = "qz-v29.3.1";')) throw new Error('sw CACHE');
fs.writeFileSync(SW, w.replace('const CACHE = "qz-v29.3.1";', 'const CACHE = "qz-v29.4";'));
console.log('ok');
