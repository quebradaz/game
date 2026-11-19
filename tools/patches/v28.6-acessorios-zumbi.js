// v28.6: acessórios dos zumbis grudados no corpo. Capacete de obra, capacete de moto, bobes e botijão passam a ser
// desenhados no rig (acompanham cabeça e tronco em todo quadro), como o boné. Zumbi de capacete ganha uma segunda
// folha sem capacete, usada quando o capacete quebra. Uso: node tools/patches/v28.6-acessorios-zumbi.js index.html
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

rep('const RIG_DEFAULT_LOOK = { skin: 0, eyes: 0, hair: 0, hairC: 0 };', `/* v28.6: capacetes, bobes e botijão dos zumbis no rig */
RIG_ITEMS.zh_obra = { slot: "hat", pal: { base: "#f2c230", shade: "#c99a1c", light: "#ffe27a" }, layers: { hat: function(R, A, it) {
  const p = it.pal, P = { h: R.c(p.base), H: R.c(p.shade), l: R.c(p.light) };
  rigOnHead(R, A, ["....hhhh.....", "..hhllhhhh...", ".hhlhhhhhhh..", ".hhhhhhhhhh..", "HHHHHHHHHHHHH"], P, -1, -2, 13, true);
} } };
RIG_ITEMS.zh_moto = { slot: "hat", pal: { base: "#b8302a", shade: "#7a1d18", light: "#ff7a6a" }, layers: { hat: function(R, A, it) {
  const p = it.pal, P = { h: R.c(p.base), H: R.c(p.shade), l: R.c(p.light), v: R.c("#1a1a28"), V: R.c("#9ab8e0") };
  rigOnHead(R, A, ["...hhhhhh...", "..hhllhhhh..", ".hhlhhhhhhh.", ".hhhhhhhhhh.", ".hhhhhhvvvvh", ".hhhhhhvVvvh", ".hhhhhhvvvvh", ".hhhhhhhhhhh", ".HHHHHHHHHH.", "..HHHHHHHH.."], P, 0, -1, 13, true);
} } };
RIG_ITEMS.zh_bobes = { slot: "hat", pal: { base: "#ff8ab8" }, layers: { hat: function(R, A, it) {
  const P = { a: R.c("#ff8ab8"), b: R.c("#8ac8ff"), c: R.c("#f2f2f2"), A: R.c("#c0587a"), B: R.c("#5a8ab8"), C: R.c("#b8b8b8") };
  rigOnHead(R, A, [".aa.bb.cc..", ".AA.BB.CC.."], P, 1, -1, 13, true);
} } };
RIG_ITEMS.zh_gas = { slot: "back", pal: { base: "#d4572a", shade: "#8e2f12", light: "#f08a5a" }, layers: { back: function(R, A, it) {
  const p = it.pal, P = { h: R.c(p.base), H: R.c(p.shade), l: R.c(p.light), g: R.c("#9aa0a6"), G: R.c("#5a6066") };
  rigOnTorso(R, A, ["..gg..", "..GG..", ".hhhh.", "hllhhH", "hlhhhH", "hlhhhH", "hhhhhH", "hlhhhH", "hlhhhH", "HhhhHH", ".HHHH."], P, 20, -15, 1, true);
} } };
const RIG_DEFAULT_LOOK = { skin: 0, eyes: 0, hair: 0, hairC: 0 };`);
rep(`  garicap: { id: "bone", pal: { base: "#ff9a3c", shade: "#c25a1c", light: "#ffe27a" } }
};`, `  garicap: { id: "bone", pal: { base: "#ff9a3c", shade: "#c25a1c", light: "#ffe27a" } },
  hardhat: { id: "zh_obra" },
  moto: { id: "zh_moto" },
  rollers: { id: "zh_bobes" }
};
const ZBACK = { gas: { id: "zh_gas" } };
/* capacetes que quebram: o zumbi ganha a folha "<variante>~" sem o capacete */
const ZARM = { hardhat: 1, moto: 1 };`);
rep(`  function lookEq(base, vid) {
    const d = BASE[base], v = vid && ZV[vid] || {}`, `  function lookEq(base, vid) {
    const nh = !!(vid && vid.slice(-1) === "~");
    if (nh) vid = vid.slice(0, -1);
    const d = BASE[base], v = vid && ZV[vid] || {}`);
rep('feet: g2("feet"), belt: null, face: null, hat: ZHAT[v.acc] || null, back: null, front: null',
  'feet: g2("feet"), belt: null, face: null, hat: nh ? null : ZHAT[v.acc] || null, back: ZBACK[v.acc] || null, front: null');
rep(`        VIMG[vid + ":" + k] = IMG[k];`, `        VIMG[vid + ":" + k] = IMG[k];
        if (ZARM[v.acc]) {
          VIMG[vid + "~:" + k] = IMG[k];
          pending.push([vid + "~", v.base, k]);
        }`);
rep('if (v.shirt || v.pants || v.skin || v.hair || VO[vid] || ZHAT[v.acc]) pending.push',
  'if (v.shirt || v.pants || v.skin || v.hair || VO[vid] || ZHAT[v.acc] || ZBACK[v.acc]) pending.push');
rep('  if (!v.acc || ZHAT[v.acc] || z.armor === 0 && (v.acc === "hardhat" || v.acc === "moto")) return;',
  '  if (!v.acc || ZHAT[v.acc] || ZBACK[v.acc]) return;');
rep('  drawZimg(c, VIMG[z.v + ":" + kk] || IMG[kk], kk, fr, z.x, z.y, z.face, a, sc);',
  '  drawZimg(c, VIMG[(z.armor === 0 && ZARM[(ZV[z.v] || {}).acc] ? z.v + "~" : z.v) + ":" + kk] || IMG[kk], kk, fr, z.x, z.y, z.face, a, sc);');
fs.writeFileSync(F, s);
console.log('ok');
