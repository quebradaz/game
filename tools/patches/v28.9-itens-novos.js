// v28.9: 100 itens novos (passe, baú e loja Z-Coin) com 19 tipos de peça novos desenhados no rig.
// Lista em tools/patches/v28.9-itens.js. Uso: node tools/patches/v28.9-itens-novos.js index.html
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
const LIST = require('./v28.9-itens.js');

// ---------- dados: [id, slot, tipo, nome, base, detalhe, raridade, origem, ponto, estampa da perna] ----------
const data = LIST.map((it) => [it.id, it.slot, it.kind, it.name, it.base, it.d, it.rar, it.src, it.spot || 0, it.leg || 0]);
rep('const LOOK = (function () {', '// v28.9: 100 itens novos (passe, baú, loja Z-Coin). Gerado de tools/patches/v28.9-itens.js\n// [id, slot, tipo, nome, cor base, detalhe, raridade, origem, ponto do acessório, estampa da perna]\nconst V289_ITEMS = ' + JSON.stringify(data) + ';\nconst LOOK = (function () {');
rep('  for (const k in ITEMS) ITEMS[k].id = k;\n', `  V289_ITEMS.forEach((q) => {
    const b = q[4], x = { d: q[5], unlock: { src: q[7] } };
    if (q[8]) x.spot = q[8];
    if (q[9]) x.ldec = q[9];
    if (q[1] === "head") x.hideHair = 1;
    if (q[2] === "chifres" || q[2] === "aureola" || q[2] === "coroa") x.keepHair = 1;
    if (q[2] === "bomber") x.in = [q[5], shade(q[5], -0.4)];
    ITEMS[q[0]] = I(q[1], q[2], q[3], 0, q[6], [b, shade(b, -0.4), shade(b, 0.28)], x);
  });
  for (const k in ITEMS) ITEMS[k].id = k;
`);

// ---------- desenho dos tipos novos ----------
rep('  function rigDef(it) {', `  // v28.9: tipos novos. Peito e pernas usam o corte de uma peça que já existe e ganham estampa;
  // cabeça, rosto, pescoço e costas são sprites próprios (cabeça: molde 12x15, frente = +x; tronco: u pra cima, v pra frente)
  Object.assign(STYLE, { listrada: "tee", xadrez: "shirt", abada: "tank", bomber: "jacket", caveira: "tee", camuflada: "shirt" });
  const hash2 = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) % 100; };
  const CAMO = (u, v, sz) => { const a = Math.floor((u + 60) / sz), b = Math.floor((v + 60 + (a % 2) * sz * 0.5) / sz); return hash2(a, b); };
  const SKULL = [".www.", "wkwkw", "wwwww", ".wkw.", ".w.w."];
  Object.assign(CHEST_DECOR, {
    listrada: (R, it) => { const d = R.c(it.def.d), D = R.c(shade(it.def.d, -0.3)), S = R.c(it.pal.shade); return (u, v, col) => u < 21 && Math.floor(u + 60) % 4 < 2 ? (col === S ? D : d) : 0; },
    xadrez: (R, it) => { const d = R.c(it.def.d), D = R.c(shade(it.def.d, 0.25)), S = R.c(shade(it.pal.base, 0.18)); return (u, v) => { const a = Math.floor(u + 60) % 5 < 1, b = Math.floor(v + 60) % 5 < 1, c = Math.floor(u + 60) % 5 === 2 || Math.floor(v + 60) % 5 === 2; return a && b ? D : a || b ? d : c ? S : 0; }; },
    abada: (R, it) => { const d = R.c(it.def.d), D = R.c(shade(it.def.d, -0.3)), S = R.c(it.pal.shade); return (u, v, col) => { const k = ((u * 0.8 - v) % 9 + 9) % 9; return k < 2.2 ? (col === S ? D : d) : 0; }; },
    bomber: (R, it) => { const S = R.c(it.pal.shade), d = R.c(it.def.d); return (u, v, col) => u < 2.2 ? d : u > 3 && u < 20 && Math.floor(u + 60) % 5 === 0 && col !== S ? S : 0; },
    caveira: (R, it) => { const w = R.c(it.def.d), k = R.c(it.pal.base); return (u, v) => { const y = Math.floor(17.5 - u), x = Math.floor(v + 0.5); if (y < 0 || y > 4 || x < 0 || x > 4) return 0; const c = SKULL[y][x]; return c === "w" ? w : c === "k" ? k : 0; }; },
    camuflada: (R, it) => { const d = R.c(it.def.d), D = R.c(shade(it.pal.base, 0.3)), K = R.c(shade(it.pal.base, -0.35)); return (u, v) => { const h = CAMO(u, v, 3); return h < 22 ? d : h < 50 ? D : h < 64 ? K : 0; }; }
  });
  Object.assign(LEG_DECOR, {
    camo: (R, it, far) => { const d = R.c(far ? shade(it.def.d, -0.16) : it.def.d), D = R.c(shade(it.pal.base, far ? 0.12 : 0.3)); return (g, t, dd) => { const h = CAMO((g + t) * 9, dd * 1.2, 2.6); return h < 28 ? d : h < 52 ? D : 0; }; },
    listra2: (R, it, far) => { const d = R.c(far ? shade(it.def.d, -0.16) : it.def.d); return (g, t, dd) => Math.abs(dd + 1.1) < 0.5 || Math.abs(dd - 0.5) < 0.5 ? d : 0; },
    rasgada: (R, it, far) => { const d = R.c(far ? shade(it.def.d, -0.16) : it.def.d), W = R.c(far ? "#c8c2b4" : "#f4f0e4"); return (g, t, dd) => {
      const knee = g === 0 ? t > 0.78 : t < 0.16, thigh = g === 0 && t > 0.3 && t < 0.4 && dd > -1 && dd < 1.2, shin = g === 1 && t > 0.5 && t < 0.56 && dd > -0.6 && dd < 1;
      if (knee && Math.abs(dd - 0.2) < 1.7) return Math.abs(dd - 0.2) > 1.2 || (g === 0 ? t < 0.82 : t > 0.12) ? W : d;
      return thigh || shin ? W : 0; }; }
  });
  // paleta dos sprites novos: h base, H sombra, l realce, d detalhe, D detalhe escuro, w detalhe claro, k quase preto, v/V lente
  const nPal = (R, it) => { const p = it.pal, d = it.def.d || p.light; return { h: R.c(p.base), H: R.c(p.shade), l: R.c(p.light), d: R.c(d), D: R.c(shade(d, -0.35)), w: R.c(shade(d, 0.45)), k: R.c("#141016"), v: R.c(d), V: R.c(shade(d, 0.55)), r: R.c("#2a6ab0"), R: R.c("#16285e") }; };
  // grade a partir de uma função (pra peças diagonais e curvas)
  const grid = (w, h, f) => { const out = []; for (let y = 0; y < h; y++) { let r = ""; for (let x = 0; x < w; x++) r += f(x, y) || "."; out.push(r); } return out; };
  const NHAT = {
    boina: [0, -2, ["......hh.....", "..hhhhhhhhh..", ".hhlllhhhhhh.", "hhhhhhhhhhhhh", ".HHHHHHHHHH.."]],
    cangaceiro: [-2, -3, ["h..............h", "hh....hhhh....hh", ".hh..hhllhh..hh.", "..hhhhhhhhhhhhh.", "...hdhdwdhdhdh..", "...HHHHHHHHHHH.."]],
    cartola: [0, -5, ["..hhhhhhhh..", "..hlhhhhhh..", "..hlhhhhhh..", "..hlhhhhhh..", "..dddddddd..", "..hhhhhhhh..", "HHHHHHHHHHHH"]],
    coroa: [1, -3, [".w..w...w.", "hh.hlh.hh.", "hhhhhhhhhh", "hdhhwhhdhh", "HHHHHHHHHH"]],
    chifres: [1, -4, ["w.......w.", "lw.....lw.", "hl.....hl.", ".hH...hH..", ".HH...HH.."]],
    aureola: [1, -6, ["..wwwww..", "ww.....ww", "..lllll.."]]
  };
  const NFACE = {
    gas: [0, 4, ["......hhhhh.", "HHHHHHhvVvh.", "......hvvvhh", "......hhhhhh", ".......hHddd", ".......hhdDd", "........hHH."]],
    visor: [1, 4, ["......kkkkk", "HHHHHHvVvvv", "......vvvvk"]],
    tapa: [0, 3, ["dd..........", ".ddd....hhh.", "....dddhlhh.", ".......hhhh.", "........hh.."]],
    caveira_m: [5, 7, ["..hhhhh", ".hhhhhh", ".hDhDhD", ".hDhDhD", "..hhhh."]]
  };
  const NTORSO = {
    medalha: [22, -1, ["r.....", ".R...r", "..rRr.", "...h..", "..hlh.", "..HhH."]],
    prancha: [34, -19, grid(9, 34, (x, y) => { const c = 5.5 - y * 0.1, w = y < 3 ? 1 + y * 0.6 : y > 30 ? 2.6 - (y - 30) * 0.5 : 2.6, dx = x - c; if (Math.abs(dx) > w) return 0; if (Math.abs(y - 17) < 1) return "d"; return dx < -w + 1 ? "l" : dx > w - 1 ? "H" : "h"; })],
    taco: [33, -17, grid(12, 26, (x, y) => { const c = 2 + y * 0.32, w = y < 12 ? 1.6 : y < 20 ? 1.6 - (y - 12) * 0.12 : 0.7, dx = x - c; if (y > 22) return Math.abs(dx) < 1.2 ? "d" : 0; if (Math.abs(dx) > w) return 0; if (y < 11 && y % 4 === 1 && dx > 0) return "w"; return dx < -w + 0.8 ? "l" : dx > w - 0.8 ? "H" : "h"; })],
    violao: [33, -19, grid(13, 30, (x, y) => {
      if (y < 4) return x >= 6 && x <= 8 ? (y % 2 ? "D" : "d") : 0;
      if (y < 15) return x === 7 ? "D" : x === 6 || x === 8 ? "d" : 0;
      const by = y < 21 ? (y - 18) / 3.2 : (y - 25) / 4.6, bx = (x - 6.5) / (y < 21 ? 4.2 : 6), r = bx * bx + by * by;
      if (y >= 15 && y < 21 && r <= 1 || y >= 21 && r <= 1) { const rr = (x - 6.5) * (x - 6.5) + (y - 22) * (y - 22); if (rr < 2.6) return "k"; return r > 0.72 ? "H" : bx < -0.4 ? "l" : "h"; }
      return 0; })],
    asas: [37, -25, grid(21, 30, (x, y) => {
      // x 0 = ponta (atrás), x 20 = ombro; borda de cima sobe do ombro até a ponta, penas caem dela
      const top = 15 * Math.pow(x / 20, 1.4), bot = (x < 9 ? 7 + x * 2.3 : 27.7 - (x - 9) * 0.8) - (x % 3 === 1 ? 1.6 : 0);
      if (y < top || y > bot) return 0;
      if (y < top + 1.2) return "l";
      if (y > bot - 2) return "d";
      if (y < top + 4) return x % 2 ? "h" : "l";
      return x % 3 === 1 ? "H" : "h"; })]
  };
  function rigNew(def, it) {
    const k = it.kind;
    if (def.slot === "hat" && NHAT[k]) { const h = NHAT[k]; def.layers.hat = function (R, A, e) { rigOnHead(R, A, h[2], nPal(R, e), h[0], h[1], G_.hat, true); }; if (it.keepHair) def.keepHair = 1; }
    if (def.slot === "face" && NFACE[k]) { const h = NFACE[k]; def.layers.face = function (R, A, e) { rigOnHead(R, A, h[2], nPal(R, e), h[0], h[1], G_.face, true); }; }
    if ((def.slot === "front" || def.slot === "back") && NTORSO[k]) {
      const h = NTORSO[k], lay = def.slot, grp = lay === "back" ? G_.back : G_.front;
      def.layers[lay] = function (R, A, e) { rigOnTorso(R, A, h[2], nPal(R, e), h[0], h[1], grp, true); };
    }
    return def;
  }
  function rigDef(it) {`);
rep('      const k = it.stripe ? "stripe" : it.kind', '      const k = it.ldec ? it.ldec : it.stripe ? "stripe" : it.kind');
rep(`    }
    return def;
  }
  function registerRig() {`, `    }
    return rigNew(def, it);
  }
  function registerRig() {`);
// coroa, chifres e auréola deixam o cabelo inteiro
rep('  L.hatOn = !!E.hat;', '  L.hatOn = !!E.hat && !E.hat.keepHair;');

// ---------- texto das caixas ----------
rep('São 40 roupas de cada raridade.', 'São 50 roupas de cada raridade.');

fs.writeFileSync(F, s);
console.log('ok', LIST.length, 'itens');
