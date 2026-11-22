// v29: aura de raridade. Itens raros (roxo) e lendários (dourado) brilham POR TRÁS da roupa, sem cobrir a skin.
// Como fica barato no celular: o brilho é pré-renderizado uma vez por quadro do sheet, quando o visual muda
// (buildLook), e na partida custa 1 drawImage por quadro só para o jogador. Sem shadowBlur, sem filter.
// - Partida: sheet de aura junto do sheet do corpo; pulsa devagar e, no lendário, solta 3 faíscas.
// - Prévias (guarda-roupa, avatar, passe): o mesmo brilho, guardado em cache por pose.
// - Miniaturas (loja, inventário, passe, baú): o halo segue o contorno do item, guardado junto da miniatura.
// - Cartões da loja/inventário ficam com o patch da loja (v29-loja.js); aqui só o halo dentro da miniatura.
// Uso: node tools/patches/v29-aura.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};
if (s.includes('const AURA = (function')) throw new Error('v29-aura já aplicado');

// ---------- 1. motor da aura (logo depois do cache de sheets do rig) ----------
rep(`/* ---------- sheet build + cache ---------- */
const RIG_CACHE = {}, RIG_CACHE_KEYS = [];`, `/* ---------- v29: aura de raridade (brilho por trás, pré-renderizado) ----------
   tier 1 = raro/exclusivo (roxo), tier 2 = lendário (dourado). A máscara de cada tier sai da diferença entre
   o personagem completo e o personagem sem aqueles itens; vira um halo desfocado que é desenhado ANTES do corpo,
   então nunca cobre um pixel da roupa ou da pele. */
const AURA = (function () {
  const COL = [null, [196, 108, 255], [255, 184, 46]], R = 5, K = 3, AMAX = 0.72;
  const tier = (id) => { try { const it = LOOK.ITEMS[id]; return !it ? 0 : it.rar >= 4 ? 2 : it.rar >= 2 ? 1 : 0; } catch (e) { return 0; } };
  function parts(E) {
    const a = [[], [], []];
    for (const k in E) { const v = E[k]; if (v && v.id) a[tier(v.id)].push(k); }
    return a;
  }
  const has = (P) => P[1].length + P[2].length > 0;
  function strip(E, slots) { const o = {}; for (const k in E) o[k] = E[k]; for (const k of slots) o[k] = null; return o; }
  // desfoque de caixa separável, 2 passadas (fica perto de um gaussiano)
  let T1 = null, T2 = null;
  function blur(a, W, H, r) {
    if (!T1 || T1.length !== W * H) { T1 = new Float32Array(W * H); T2 = new Float32Array(W * H); }
    const n = 2 * r + 1;
    let src = a;
    for (let pass = 0; pass < 2; pass++) {
      for (let y = 0; y < H; y++) {
        const o = y * W;
        let acc = 0;
        for (let x = 0; x <= r && x < W; x++) acc += src[o + x];
        for (let x = 0; x < W; x++) {
          T1[o + x] = acc / n;
          const xi = x + r + 1, xo = x - r;
          if (xi < W) acc += src[o + xi];
          if (xo >= 0) acc -= src[o + xo];
        }
      }
      for (let x = 0; x < W; x++) {
        let acc = 0;
        for (let y = 0; y <= r && y < H; y++) acc += T1[y * W + x];
        for (let y = 0; y < H; y++) {
          T2[y * W + x] = acc / n;
          const yi = y + r + 1, yo = y - r;
          if (yi < H) acc += T1[yi * W + x];
          if (yo >= 0) acc -= T1[yo * W + x];
        }
      }
      src = T2;
    }
    return T2;
  }
  // m1/m2 (Float32, 0..1) -> pixels RGBA do halo em out (Uint32, little-endian ABGR), só onde dst está vazio
  function paint(m1, m2, W, H, r, out, keepOpaque) {
    const g1 = m1 ? blur(m1, W, H, r).slice() : null, g2 = m2 ? blur(m2, W, H, r) : null;
    let any = 0;
    for (let i = 0; i < W * H; i++) {
      if (keepOpaque && out[i] >>> 24) continue;
      const a1 = g1 ? g1[i] : 0, a2 = g2 ? g2[i] : 0, t = a1 + a2;
      if (t < 0.004) continue;
      const al = Math.min(1, t * K) * AMAX, w2 = a2 / t, w1 = 1 - w2;
      const r0 = COL[1][0] * w1 + COL[2][0] * w2, g0 = COL[1][1] * w1 + COL[2][1] * w2, b0 = COL[1][2] * w1 + COL[2][2] * w2;
      out[i] = ((al * 255) << 24 | (b0 << 16) | (g0 << 8) | r0) >>> 0;
      any = 1;
    }
    return any;
  }
  // um quadro do rig: devolve Uint32Array F*F com o halo (ou null). Estraga RZ.col: chamar antes do render final.
  let M1 = null, M2 = null;
  function frame(L, E, po, P) {
    const F = RIG_F, N = F * F;
    if (!M1) { M1 = new Float32Array(N); M2 = new Float32Array(N); }
    rigRender(L, strip(E, P[1].concat(P[2])), po);
    const base = RZ.col.slice();
    let mid = null;
    if (P[1].length && P[2].length) { rigRender(L, strip(E, P[2]), po); mid = RZ.col.slice(); }
    rigRender(L, E, po);
    const full = RZ.col;
    // lendário: completo x sem lendário ; raro: sem lendário x sem nada
    const legRef = P[2].length ? (mid || base) : null, rarTop = P[1].length ? (mid || full) : null;
    let n1 = 0, n2 = 0;
    for (let i = 0; i < N; i++) {
      const f = full[i];
      M2[i] = legRef && f >>> 24 && f !== legRef[i] ? (n2++, 1) : 0;
      M1[i] = rarTop && !M2[i] && rarTop[i] >>> 24 && rarTop[i] !== base[i] ? (n1++, 1) : 0;
    }
    if (!n1 && !n2) return null;
    const out = new Uint32Array(N);
    return paint(n1 ? M1 : null, n2 ? M2 : null, F, F, R, out, false) ? out : null;
  }
  function toCanvas(px, W, H) {
    const c = mkCanvas(W, H), id = c[1].createImageData(W, H);
    new Uint32Array(id.data.buffer).set(px);
    c[1].putImageData(id, 0, 0);
    return c;
  }
  // ---- partida: sheet de aura do mesmo layout do sheet do corpo (só o neutro; as variações de mira usam ele) ----
  let cur = null;
  function sheet(C, name, an) {
    const P = parts(C.E);
    if (!has(P)) return;
    const F = RIG_F, c = mkCanvas(an.n * F, F);
    let any = 0;
    for (let i = 0; i < an.n; i++) {
      const po = an.fn(i, an.n), p2 = {};
      for (const k in po) p2[k] = po[k];
      const px = frame(C.L, C.E, p2, P);
      if (!px) continue;
      const fc = toCanvas(px, F, F);
      c[1].drawImage(fc[0], i * F, 0);
      any = 1;
    }
    if (any) (C.aura || (C.aura = {}))[name] = c[0];
    C.auraT = P[2].length ? 2 : 1;
  }
  function use(C) { cur = C; }
  const pulse = (t) => 0.66 + 0.16 * Math.sin(t * 2.3);
  // faíscas do lendário: 3 pontos que sobem perto do corpo (fillRect, sem alocação)
  function sparks(ctx, x, y, sc, t) {
    ctx.fillStyle = "#ffe28a";
    for (let k = 0; k < 3; k++) {
      const ph = (t * 0.55 + k / 3) % 1, sx = Math.sin(k * 2.7 + t * 1.3) * 11 + (k - 1) * 6;
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.9;
      const z = Math.max(1, Math.round(sc));
      ctx.fillRect(Math.round(x + sx * sc), Math.round(y - (14 + ph * 44) * sc), z, z);
    }
    ctx.globalAlpha = 1;
  }
  function drawPlayer(c, p, key, fr) {
    if (!cur || !cur.aura || p.dead) return;
    const k0 = key.split("~")[0], an = k0.slice(k0.indexOf("_b") + 2), im = cur.aura[an];
    if (!im) return;
    const s = SHEETS[key] || SHEETS[k0], F = RIG_F, fi = Math.min((s ? s.n : 1) - 1, Math.max(0, fr | 0)), t = performance.now() / 1000;
    c.save();
    c.translate(Math.round(p.x), Math.round(p.y));
    if (p.face < 0) c.scale(-1, 1);
    c.imageSmoothingEnabled = true;
    // 2 passadas: uma normal (cor) e uma aditiva (luz), pra aparecer tanto em parede clara quanto à noite
    const a = pulse(t);
    c.globalAlpha = a;
    c.drawImage(im, fi * F, 0, F, F, -RIG_AX, -F, F, F);
    c.globalCompositeOperation = "lighter";
    c.globalAlpha = a * 0.35;
    c.drawImage(im, fi * F, 0, F, F, -RIG_AX, -F, F, F);
    c.globalCompositeOperation = "source-over";
    c.imageSmoothingEnabled = false;
    c.globalAlpha = 1;
    if (cur.auraT === 2 && !(typeof fxReduced === "function" && fxReduced())) sparks(c, 0, 0, 1, t);
    c.restore();
  }
  // ---- prévias de menu: cache por visual + pose ----
  const PC = {}, PK = [];
  function preview(ctx, x, y, L, E, anim, fi, po, scale, face) {
    const P = parts(E);
    if (!has(P)) return;
    const k = rigKey(L, E) + "|" + anim + "|" + fi;
    let cv = PC[k];
    if (cv === void 0) {
      const px = frame(L, E, po, P);
      cv = PC[k] = px ? toCanvas(px, RIG_F, RIG_F)[0] : null;
      PK.push(k);
      while (PK.length > 96) delete PC[PK.shift()];
    }
    if (!cv) return;
    const t = performance.now() / 1000;
    ctx.save();
    if (face < 0) { ctx.translate(Math.round(x), 0); ctx.scale(-1, 1); x = 0; }
    ctx.imageSmoothingEnabled = scale > 1;
    ctx.globalAlpha = pulse(t);
    ctx.drawImage(cv, 0, 0, RIG_F, RIG_F, Math.round(x - RIG_AX * scale), Math.round(y - RIG_F * scale), RIG_F * scale, RIG_F * scale);
    ctx.globalAlpha = 1;
    ctx.imageSmoothingEnabled = false;
    if (P[2].length) sparks(ctx, x, y, scale, t);
    ctx.restore();
  }
  return { tier, parts, has, paint, sheet, use, drawPlayer, preview, COL };
})();
/* ---------- sheet build + cache ---------- */
const RIG_CACHE = {}, RIG_CACHE_KEYS = [];`);

// ---------- 2. sheet do corpo: a aura entra na fila ociosa (mesma da mira), na frente, então trocar de roupa não trava ----------
rep(`function rigBuildSheet(C, name, b) {
  const an = RIG_ANIMS[name],`, `function rigBuildSheet(C, name, b) {
  if (b === "aura") { try { AURA.sheet(C, name, RIG_ANIMS[name]); } catch (e) { console.warn("aura", e); } return; }
  const an = RIG_ANIMS[name],`);
rep(`    if (RIG_ANIMS[name].aim) for (const b of RIG_AIMB) if (b) C.pending.push([name, b]);
  }`, `    if (RIG_ANIMS[name].aim) for (const b of RIG_AIMB) if (b) C.pending.push([name, b]);
  }
  try { if (AURA.has(AURA.parts(E))) C.pending.unshift(...Object.keys(RIG_ANIMS).filter((n) => n !== "Dead").map((n) => [n, "aura"])); } catch (e) {}`);
rep(`  rigApplyArm(L, E);
  RIG_CUR.ms = C.ms;`, `  rigApplyArm(L, E);
  AURA.use(C);
  RIG_CUR.ms = C.ms;`);

// ---------- 3. prévias: rigDrawFrame desenha o halo antes do corpo (opts.aura === false desliga) ----------
rep(`  if (!po.arms && opts.arms !== false) po.arms = RIG_ARMS_REST;
  const A = rigRender(L, E, po);`, `  if (!po.arms && opts.arms !== false) po.arms = RIG_ARMS_REST;
  if (opts.aura !== false) try { AURA.preview(ctx, x, y, L, E, anim, Math.max(0, Math.min(an.n - 1, frame | 0)), po, scale, opts.face); } catch (e) { console.warn("aura", e); }
  const A = rigRender(L, E, po);`);

// ---------- 4. partida: halo atrás do jogador (antes do rastro, do melee e do corpo) ----------
rep(`  if (p.dead) {
    drawSheet(c, bodyKey(p), bodyFrame(p), p.x, p.y, p.face);
    return;
  }
  if (p.trail) for (let i = 0; i < p.trail.length; i++) {`, `  if (p.dead) {
    drawSheet(c, bodyKey(p), bodyFrame(p), p.x, p.y, p.face);
    return;
  }
  AURA.drawPlayer(c, p, bodyKey(p), bodyFrame(p));
  if (p.trail) for (let i = 0; i < p.trail.length; i++) {`);

// ---------- 5. miniaturas: o manequim não brilha; o item raro/lendário ganha halo no contorno ----------
rep(`    rigDrawFrame(thX, 0, 0, look, E, "Idle", 0, 1, {});`, `    rigDrawFrame(thX, 0, 0, look, E, "Idle", 0, 1, { aura: false });`);
rep(`    x.putImageData(id, 0, 0);
    THS[ck] = {`, `    // v29: halo da raridade em volta do item, só nos pixels vazios (fica atrás do item e do manequim)
    const at = keys.length === 1 && n && !opt.full ? AURA.tier(keys[0]) : 0;
    if (at) {
      const om = new Float32Array(TH * TH);
      for (let oy = 0; oy < TH; oy++) for (let ox = 0; ox < TH; ox++) {
        const sx = wx + (ox / s | 0), sy = wy + (oy / s | 0);
        if (sx >= 0 && sy >= 0 && sx < F && sy < F && mask[sy * F + sx]) om[oy * TH + ox] = 1;
      }
      AURA.paint(at === 1 ? om : null, at === 2 ? om : null, TH, TH, 3 + s, out, true);
    }
    x.putImageData(id, 0, 0);
    THS[ck] = {`);

fs.writeFileSync(F, s);
console.log('v29-aura ok');
