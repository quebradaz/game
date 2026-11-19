// v28 fase A: proporção de móveis e garrafas, praia nova (céu limpo, mar em faixas, sem cidade nem musgo na água).
// Uso: node tools/patches/v28-fase-a-cenario.js index.html  (aplica uma vez; falha se o trecho esperado não existir)
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

// ---------- garrafas: ~12 px (antes ~19 px, maior que a cadeira). Personagem tem ~62 px: 1 px ≈ 2,8 cm.
rep('  const t = BOTTLE_T[id] || BOTTLE_T.longneck, [bw, bh, sh, nw, nh, ch] = t.s, W = bw + 2, H = bh + sh + nh + ch + 2;',
  `  const t = BOTTLE_T[id] || BOTTLE_T.longneck, [bw, bh, sh, nw, nh, ch] = bottleDims(t), W = bw + 2, H = bh + sh + nh + ch + 2;`);
rep(`    const by = 1 + ch + nh + sh, ly = by + bh - t.lab[1] - t.lab[2];`,
  `    const lab1 = Math.round(t.lab[1] * BOTTLE_K), lab2 = Math.max(1, Math.round(t.lab[2] * 0.5)), by = 1 + ch + nh + sh, ly = by + bh - lab1 - lab2;`);
rep(`          if (k === "body" && y >= ly && y < ly + t.lab[2]) c = i === w2 - 1 ? shade(t.lab[0], -0.3) : t.lab[0];
          if (k === "body" && y === ly + (t.lab[2] >> 1) && i >= (w2 >> 1) - 1 && i <= w2 >> 1 && w2 >= 4) c = t.lab[3];`,
  `          if (k === "body" && y >= ly && y < ly + lab2) c = i === w2 - 1 ? shade(t.lab[0], -0.3) : t.lab[0];
          if (k === "body" && y === ly + (lab2 >> 1) && i >= (w2 >> 1) - 1 && i <= w2 >> 1 && w2 >= 4) c = t.lab[3];`);
rep('function bottleSpr(id) {', `// v28: medidas reduzidas para a escala do personagem (cerveja 600 ml ≈ 12 px de altura, 6 px de largura com contorno)
const BOTTLE_K = 0.55;
function bottleDims(t) {
  const [bw, bh, sh, nw, nh, ch] = t.s;
  return [Math.max(3, Math.round(bw * 0.65)), Math.max(3, Math.round(bh * BOTTLE_K)), sh ? Math.max(1, Math.round(sh * 0.5)) : 0, Math.max(1, Math.round(nw * 0.6)), nh ? Math.max(1, Math.round(nh * 0.5)) : 0, ch];
}
function bottleSpr(id) {`);
rep(`function bottleH(id) {
  const t = BOTTLE_T[id] || BOTTLE_T.longneck, s = t.s;
  return s[1] + s[2] + s[4] + s[5] + 2;
}`, `function bottleH(id) {
  const s = bottleDims(BOTTLE_T[id] || BOTTLE_T.longneck);
  return s[1] + s[2] + s[4] + s[5] + 2;
}`);

// ---------- cadeiras e mesas na altura certa (mesa 26 px ≈ 73 cm, assento 16 px ≈ 45 cm, encosto 28 px ≈ 80 cm)
rep(`function plasticChair(c, x, yBase, col = "#c0392b") {
  P.r(c, x, yBase - 24, 3, 12, col);
  P.r(c, x, yBase - 13, 14, 3, col);
  P.r(c, x + 1, yBase - 10, 2, 10, shade(col, -0.2));
  P.r(c, x + 11, yBase - 10, 2, 10, shade(col, -0.2));
  P.r(c, x, yBase - 24, 3, 1, shade(col, 0.25));
}
function plasticTable(c, x, yBase, col = "#e3e0d6") {
  P.r(c, x, yBase - 18, 30, 3, col);
  P.r(c, x + 2, yBase - 15, 26, 1, shade(col, -0.25));
  P.r(c, x + 4, yBase - 15, 2, 15, shade(col, -0.15));
  P.r(c, x + 24, yBase - 15, 2, 15, shade(col, -0.15));
  bottle(c, x + 8, yBase - 29, "#7a4a12", 11);
  P.r(c, x + 15, yBase - 23, 3, 5, "#e8e2c6");
  P.r(c, x + 20, yBase - 23, 3, 5, "#e8e2c6");
}`, `function plasticChair(c, x, yBase, col = "#c0392b") {
  P.r(c, x, yBase - 28, 3, 13, col);
  P.r(c, x, yBase - 16, 14, 3, col);
  P.r(c, x, yBase - 16, 14, 1, shade(col, 0.2));
  P.r(c, x + 1, yBase - 13, 2, 13, shade(col, -0.2));
  P.r(c, x + 11, yBase - 13, 2, 13, shade(col, -0.2));
  P.r(c, x, yBase - 28, 3, 1, shade(col, 0.25));
}
function plasticTable(c, x, yBase, col = "#e3e0d6") {
  P.r(c, x, yBase - 26, 30, 3, col);
  P.r(c, x + 2, yBase - 23, 26, 1, shade(col, -0.25));
  P.r(c, x + 4, yBase - 23, 2, 23, shade(col, -0.15));
  P.r(c, x + 24, yBase - 23, 2, 23, shade(col, -0.15));
  bottle(c, x + 8, yBase - 37, "#7a4a12", 11);
  P.r(c, x + 15, yBase - 30, 3, 4, "#e8e2c6");
  P.r(c, x + 20, yBase - 30, 3, 4, "#e8e2c6");
}`);
rep(`function dominoTable(c, R, x, yb) {
  P.r(c, x + 12, yb - 18, 8, 18, "#7a766e");
  P.r(c, x + 12, yb - 18, 2, 18, "#a09a8e");
  P.r(c, x, yb - 22, 32, 5, O_);
  P.r(c, x + 1, yb - 21, 30, 3, "#9a958a");
  P.r(c, x + 1, yb - 21, 30, 1, "#c0baae");
  for (let i = 0; i < 5; i++) P.r(c, x + 4 + i * 5, yb - 24, 3, 2, "#f2efe6");
  for (const sx of [x - 12, x + 38]) {
    P.r(c, sx, yb - 11, 8, 11, "#7a766e");
    P.r(c, sx - 1, yb - 12, 10, 2, "#9a958a");
  }
}`, `function dominoTable(c, R, x, yb) {
  P.r(c, x + 12, yb - 22, 8, 22, "#7a766e");
  P.r(c, x + 12, yb - 22, 2, 22, "#a09a8e");
  P.r(c, x, yb - 26, 32, 5, O_);
  P.r(c, x + 1, yb - 25, 30, 3, "#9a958a");
  P.r(c, x + 1, yb - 25, 30, 1, "#c0baae");
  for (let i = 0; i < 5; i++) P.r(c, x + 4 + i * 5, yb - 28, 3, 2, "#f2efe6");
  for (const sx of [x - 12, x + 38]) {
    P.r(c, sx, yb - 15, 8, 15, "#7a766e");
    P.r(c, sx - 1, yb - 16, 10, 2, "#9a958a");
  }
}`);
rep(`function barStool(c, x, yb, col = "#c0262a") {
  P.r(c, x, yb - 20, 10, 3, O_);
  P.r(c, x + 1, yb - 19, 8, 1, col);
  P.r(c, x + 4, yb - 17, 2, 15, "#8a8f9c");
  P.r(c, x + 1, yb - 2, 8, 2, "#5a6068");
}`, `function barStool(c, x, yb, col = "#c0262a") {
  P.r(c, x, yb - 26, 10, 3, O_);
  P.r(c, x + 1, yb - 25, 8, 1, col);
  P.r(c, x + 4, yb - 23, 2, 21, "#8a8f9c");
  P.r(c, x + 2, yb - 11, 6, 1, "#8a8f9c");
  P.r(c, x + 1, yb - 2, 8, 2, "#5a6068");
}`);
rep(`function kitchenTable(c, x, yb, w2 = 60) {
  P.r(c, x, yb - 22, w2, 5, O_);
  for (let i = 0; i < w2 - 2; i += 4) P.r(c, x + 1 + i, yb - 21, 4, 4, (i / 4 | 0) % 2 ? "#c0262a" : "#f2f2f2");
  P.r(c, x + 1, yb - 18, w2 - 2, 4, "rgba(192,38,42,.6)");
  P.r(c, x + 4, yb - 14, 3, 14, "#6a4a2a");
  P.r(c, x + w2 - 7, yb - 14, 3, 14, "#6a4a2a");
}`, `function kitchenTable(c, x, yb, w2 = 60) {
  P.r(c, x, yb - 26, w2, 5, O_);
  for (let i = 0; i < w2 - 2; i += 4) P.r(c, x + 1 + i, yb - 25, 4, 4, (i / 4 | 0) % 2 ? "#c0262a" : "#f2f2f2");
  P.r(c, x + 1, yb - 22, w2 - 2, 4, "rgba(192,38,42,.6)");
  P.r(c, x + 4, yb - 18, 3, 18, "#6a4a2a");
  P.r(c, x + w2 - 7, yb - 18, 3, 18, "#6a4a2a");
}`);
rep(`function longTable(c, x, yb, w2) {
  P.r(c, x, yb - 20, w2, 4, O_);
  P.r(c, x + 1, yb - 19, w2 - 2, 2, "#8a5a32");
  P.r(c, x + 4, yb - 16, 3, 16, "#5a3a1a");
  P.r(c, x + w2 - 7, yb - 16, 3, 16, "#5a3a1a");
}`, `function longTable(c, x, yb, w2) {
  P.r(c, x, yb - 26, w2, 4, O_);
  P.r(c, x + 1, yb - 25, w2 - 2, 2, "#8a5a32");
  P.r(c, x + 4, yb - 22, 3, 22, "#5a3a1a");
  P.r(c, x + w2 - 7, yb - 22, 3, 22, "#5a3a1a");
}`);
rep(`function woodChair(c, x, yb, dir = 1) {
  P.r(c, dir > 0 ? x : x + 10, yb - 30, 3, 30, "#6a4a2a");
  P.r(c, x, yb - 14, 14, 3, "#8a5a32");
  P.r(c, dir > 0 ? x + 11 : x, yb - 12, 3, 12, "#6a4a2a");`, `function woodChair(c, x, yb, dir = 1) {
  P.r(c, dir > 0 ? x : x + 10, yb - 30, 3, 30, "#6a4a2a");
  P.r(c, x, yb - 16, 14, 3, "#8a5a32");
  P.r(c, dir > 0 ? x + 11 : x, yb - 14, 3, 14, "#6a4a2a");`);
rep(`  function lpTableSet(c, x, yb, col) {
    P.r(c, x, yb - 18, 26, 3, O_);
    P.r(c, x + 1, yb - 17, 24, 1, col);
    P.r(c, x + 12, yb - 15, 2, 15, "#5a5e66");
    P.r(c, x + 6, yb - 1, 14, 1, "#5a5e66");
    bottle(c, x + 4, yb - 18, "#7a4a12", 9);
    P.r(c, x + 15, yb - 23, 4, 5, "#f2e8b0");
    P.r(c, x + 15, yb - 23, 4, 1, "#fff");`, `  function lpTableSet(c, x, yb, col) {
    P.r(c, x, yb - 26, 26, 3, O_);
    P.r(c, x + 1, yb - 25, 24, 1, col);
    P.r(c, x + 12, yb - 23, 2, 23, "#5a5e66");
    P.r(c, x + 6, yb - 1, 14, 1, "#5a5e66");
    bottle(c, x + 4, yb - 35, "#7a4a12", 9);
    P.r(c, x + 15, yb - 30, 3, 4, "#f2e8b0");
    P.r(c, x + 15, yb - 30, 3, 1, "#fff");`);

// ---------- praia: céu limpo até o horizonte (sem cidade, morros, ilhas), mar em faixas pontilhadas com ondas em perspectiva
{
  const a = s.indexOf(nl('    var pt = mkCanvas(190, 120);\n'));
  const b = s.indexOf(nl('    // mar\n'), a);
  if (a < 0 || b < 0 || s.indexOf(nl('    var pt = mkCanvas(190, 120);\n'), a + 10) >= 0) throw new Error('copa sky markers');
  s = s.slice(0, a) + nl(`    // v28: céu limpo até o horizonte, sem cidade, morros nem ilhas (o jogador está no calçadão olhando o mar).
    // Sol, lua e nuvens vêm do FXV.
    var sk = SEA_SKY[pr] || SEA_SKY.noite;
    for (y = 0; y < B; y++) {
      var tt = y / B;
      P.r(sx, 0, y, w, 1, tt < 0.62 ? mix(sk[0], sk[1], tt / 0.62) : mix(sk[1], sk[2], (tt - 0.62) / 0.38));
    }
    if (pr === "noite") for (k = 0; k < 170; k++) px(R.i(0, w - 1), R.i(0, B - 40), R() < 0.3 ? "#fff6e0" : "#a898c8");
`) + s.slice(b);
}
rep('  var SKYC = {', `  var SEA_SKY = { dia: ["#3f86cc", "#86c0e6", "#d6eef6"], tarde: ["#34366e", "#b8607a", "#ffc488"], noite: ["#07051a", "#241034", "#5c1e40"] };
  var SKYC = {`);
rep(`  function seaBack(c, R, x0, x1, shore) {
    var p = pal(), w = x1 - x0, y, x, k;
    sandSet();
    P.vgrad(c, x0, HZ, w, shore - HZ, p.s);
    P.r(c, x0, HZ, w, 1, p.hz);
    P.r(c, x0, HZ + 1, w, 1, shade(p.hz, -0.12));
    for (y = HZ + 3; y < shore - 8; y += 3 + ((y - HZ) / 18 | 0)) {
      var d = (y - HZ) / (shore - HZ);
      for (x = x0 + R.i(0, 30); x < x1; x += R.i(20, 50) + (1 - d) * 30) {
        var l = R.i(4, 8 + d * 16), lt = R() < 0.6;
        P.r(c, x, y, l, 1, lt ? p.rl : p.rd);
        if (d > 0.35 && lt) P.r(c, x + 2, y + 1, l - 3, 1, p.rd);
      }
    }`, `  // v28: mar por faixas de profundidade (horizonte claro, fundo escuro, raso esverdeado) com pontilhado entre as faixas
  // e cristas de onda em perspectiva: finas e juntas no horizonte, longas e espaçadas perto da areia.
  var SEA = {
    dia: { c: ["#c4e6f2", "#6cbcdc", "#2f8cc0", "#226fa4", "#2a98b0"], crest: "#eaf8fc", trough: "#1c5a8c" },
    tarde: { c: ["#ffd2a0", "#d48a8a", "#6a5488", "#33427a", "#2f6a8a"], crest: "#ffe6c4", trough: "#262a58" },
    noite: { c: ["#8a3456", "#4a1e48", "#22183c", "#16203e", "#1c3448"], crest: "#b88ab8", trough: "#0a0a1c" }
  };
  function seaBack(c, R, x0, x1, shore) {
    var p = pal(), q = SEA[per()], w = x1 - x0, H = shore - HZ, y, x, k, n = q.c.length - 1;
    sandSet();
    for (y = 0; y < H; y++) {
      var tq = Math.pow(y / H, 0.85) * n, i0 = Math.min(n - 1, tq | 0), f = tq - i0, ca = q.c[i0], cb = q.c[i0 + 1], near0 = f < 0.5, dk = near0 ? f : 1 - f, oth = near0 ? cb : ca;
      P.r(c, x0, HZ + y, w, 1, near0 ? ca : cb);
      if (dk > 0.34) for (x = x0 + (y & 1); x < x1; x += 2) P.r(c, x, HZ + y, 1, 1, oth);
      else if (dk > 0.2) for (x = x0 + (y & 1) * 2; x < x1; x += 4) P.r(c, x, HZ + y, 1, 1, oth);
    }
    P.r(c, x0, HZ, w, 1, p.hz);
    for (y = HZ + 2; y < shore - 12; ) {
      var d = (y - HZ) / H, tq2 = Math.pow(d, 0.85) * n, rc = q.c[Math.min(n, Math.round(tq2))], cr = d < 0.22 ? mix(rc, q.crest, 0.45) : q.crest;
      for (x = x0 + R.i(0, 12); x < x1; ) {
        var L = 3 + R.i(0, 4 + Math.round(d * 18));
        P.r(c, x, y, L, 1, cr);
        if (d > 0.25) P.r(c, x + 1, y + 1, Math.max(1, L - 2), 1, q.trough);
        x += L + R.i(6, 14) + Math.round((1 - d) * 18);
      }
      y += 2 + Math.round(d * d * 9);
    }`);

// ---------- SCN: praia sem camadas de cidade e morro; decay não põe musgo na linha do mar nem grafite na areia
rep('    if (st === "praia") return [{ c: hillsSea(P, R, W(0.04), p, SEA_HZ, 0.04, m), p: 0.04 }, { c: orla(P, R, W(0.1), SEA_HZ), p: 0.1 }];',
  '    // praia: só o céu e o mar do próprio mapa (sem cidade nem morros atrás)\n    if (st === "praia") return [];');
rep(`        found++;
        py += 12;
        const r = R();`, `        found++;
        py += 12;
        // praia: a linha do horizonte do mar (y ~150) é água, não telhado
        if (beach && py - 12 >= 140 && py - 12 <= 160) continue;
        const r = R();`);
rep(`    const W = m.w, id = x.getImageData(0, 0, W, VH), d = id.data;`, `    const W = m.w, id = x.getImageData(0, 0, W, VH), d = id.data, beach = STYLE[m.id] === "praia";`);
rep(`      if (!(GRAF.im.complete && GRAF.im.width > 0)) continue;
      const done = [];`, `      if (!(GRAF.im.complete && GRAF.im.width > 0) || beach && out) continue;
      const done = [];`);
// a função orla não é mais usada
{
  const a = s.indexOf(nl('  function orla(P, R, W, HZ) {\n'));
  const b = s.indexOf(nl('  // Corcovado:'), a);
  if (a < 0 || b < 0) throw new Error('orla markers');
  s = s.slice(0, a) + s.slice(b);
}
fs.writeFileSync(F, s);
console.log('ok');
