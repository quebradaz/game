// v29.0: personagem feminina. O rig ganha look.body (0 = Marcus, 1 = Duda): cabeça de queixo mais fino, cílios,
// busto, cintura e quadril no mesmo tronco que as roupas pintam (então as 100+ peças vestem as duas sem arte nova),
// braços um pouco mais finos e 5 cabelos novos (longo, rabo de cavalo, coque, cacheado e chanel).
// A escolha só aparece em "CRIE SEU PERSONAGEM" e fica gravada no servidor (profiles.body, RPC set_body, uma vez só);
// contas que já existiam ficam com o Marcus. Migração: supabase/migrations/v29_0_personagem.sql
// Uso: node tools/patches/v29.0-personagem.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

// ---------- 1. rig: cabeça feminina, cabelos novos ----------
rep(`const RIG_HEAD_PV = [4, 15];`, `const RIG_HEAD_PV = [4, 15];
/* v29: cabeça da Duda — queixo e mandíbula mais finos, pescoço mais fino; l = boca */
const RIG_HEAD_F = [
  "............",
  "..ssssssss..",
  "..sssssssss.",
  ".ssssssssss.",
  ".ssssssssss.",
  ".ssssssssss.",
  ".ssssssssss.",
  ".sSssssssss.",
  "..sssssssSs.",
  "..sssssssss.",
  "..ssSssssm..",
  "...ssSssss..",
  "...ssSSs....",
  "...ssS......",
  "...sssS....."
];`);
rep(`function rigHairRows(st) {`, `/* v29: cabelos compridos (servem pros dois; a Duda começa com um deles). base = curto de cima, o resto cai atrás */
(function() {
  const base = (x, y) => { const r = HAIR_STYLES[0].rows; return y >= 0 && y < r.length && x >= 0 && x < 12 && r[y][x] !== "." ? r[y][x] : 0; };
  HAIR_STYLES.push(
    { name: "Longo", long: 1, fn: function(x, y) {
      const b = base(x, y);
      if (b) return b;
      if (y >= 1 && y <= 3 && x >= 2 && x <= 9) return y === 1 && x > 5 ? "l" : "h";
      if (x >= -2 && x <= 2 && y >= 2 && y <= 21 - (x + 2)) return x === -2 ? "H" : (x + y) % 5 === 0 ? "l" : x === 2 && y > 9 ? "H" : "h";
      return 0;
    }, box: [-2, 0, 12, 22] },
    { name: "Rabo de cavalo", long: 1, fn: function(x, y) {
      const b = base(x, y);
      if (b) return b;
      if (y >= 1 && y <= 2 && x >= 2 && x <= 9) return x > 5 ? "l" : "h";
      if (x === 0 && y >= 2 && y <= 3) return "d";
      const c = -2.2 + Math.sin((y - 3) * 0.32) * 0.8, w = y < 6 ? 1.6 : y < 14 ? 1.3 : 0.8;
      if (y >= 2 && y <= 17 && Math.abs(x - c) <= w) return x < c - 0.4 ? "H" : y % 4 === 1 ? "l" : "h";
      return 0;
    }, box: [-4, 0, 14, 18] },
    { name: "Coque", fn: function(x, y) {
      const b = base(x, y);
      if (b) return b;
      if (y >= 1 && y <= 2 && x >= 2 && x <= 9) return x > 5 ? "l" : "h";
      const d = Math.hypot((x - 1.5) / 2.8, (y + 1) / 2.6);
      if (d <= 1) return d > 0.7 ? "H" : (x + y) % 3 === 0 ? "l" : "h";
      return 0;
    }, box: [-2, -4, 12, 12] },
    { name: "Cacheado", long: 1, fn: function(x, y) {
      const dx = x - 4, dy = y - 3, top = Math.hypot(dx / 8, dy / 6.4) <= 1 && !(x >= 6 && y >= 4) && !(x >= 9 && y >= 2);
      const back = x >= -4 && x <= 3 && y >= 3 && y <= 18 - Math.max(0, x) * 1.5 && !(y > 15 && (x + y) % 3 === 0);
      if (!top && !back) return 0;
      if (y > 8 && x > 3) return 0;
      return (x * 5 + y * 3) % 7 === 0 ? "l" : (x * 3 + y * 5) % 6 === 0 || x < -3 ? "H" : "h";
    }, box: [-4, -4, 16, 23] },
    { name: "Chanel", long: 1, fn: function(x, y) {
      const b = base(x, y);
      if (b) return b;
      if (y >= 1 && y <= 3 && x >= 2 && x <= 10) return y === 1 && x > 5 ? "l" : x === 10 ? "H" : "h";
      if (x >= -1 && x <= 3 && y >= 2 && y <= 12) return x === -1 || y === 12 ? "H" : "h";
      return 0;
    }, box: [-1, 0, 12, 13] }
  );
})();
/* com boné: cabelo comprido continua caindo atrás, só some o que ficaria por cima/por fora da aba */
function rigHairUnderLong(st) {
  if (st.under) return st.under;
  const r = rigHairRows(st), rows = r.rows.map((row, j) => j + r.oy < 4 ? ".".repeat(row.length) : row);
  return st.under = { name: st.name, rows, ox: r.ox, oy: r.oy };
}
function rigHairRows(st) {`);
rep(`    const st = look.hatOn && !(HAIR_STYLES[look.hair] || HAIR_STYLES[0]).skinHair ? rigHairUnder() : rigHairRows(HAIR_STYLES[look.hair] || HAIR_STYLES[0]);`,
  `    const hs0 = HAIR_STYLES[look.hair] || HAIR_STYLES[0], st = look.hatOn && !hs0.skinHair ? (hs0.long ? rigHairUnderLong(hs0) : rigHairUnder()) : rigHairRows(hs0);`);
// prendedor do rabo de cavalo ("d") na cor do cabelo escurecida
rep(`    const hp = st.skinHair ? { h: R.c(sp.base), H: R.c(sp.shade), l: R.c(sp.light) } : { h: R.c(hc.base), H: R.c(hc.shade), l: R.c(hc.light) };`,
  `    const hp = st.skinHair ? { h: R.c(sp.base), H: R.c(sp.shade), l: R.c(sp.light) } : { h: R.c(hc.base), H: R.c(hc.shade), l: R.c(hc.light), d: R.c("#c0262a") };`);

// ---------- 2. rig: cabeça, olhos e boca por corpo ----------
rep(`    R.spr(RIG_HEAD, pal, A.neck.x, A.neck.y, RIG_HEAD_PV[0], RIG_HEAD_PV[1], A.head.a);
    R.end(true, 1 << G_.chest);`, `    if (look.body === 1) pal.m = R.c(shade(sp.shade, -0.08));
    R.spr(look.body === 1 ? RIG_HEAD_F : RIG_HEAD, pal, A.neck.x, A.neck.y, RIG_HEAD_PV[0], RIG_HEAD_PV[1], A.head.a);
    R.end(true, 1 << G_.chest);`);
rep(`    R.spr(["bbb", "...", "we."], ep, A.neck.x, A.neck.y, RIG_HEAD_PV[0] - 8, RIG_HEAD_PV[1] - 4, A.head.a);`,
  `    if (look.body === 1) { ep.k = R.c("#120c0e"); ep.e = R.c(LOOK_EYES[look.eyes] || LOOK_EYES[0]); }
    R.spr(look.body === 1 ? [".bb.", "..kk", "wek."] : ["bbb", "...", "we."], ep, A.neck.x, A.neck.y, RIG_HEAD_PV[0] - 8, RIG_HEAD_PV[1] - 4, A.head.a);`);

// ---------- 3. rig: tronco (busto, cintura), quadril e braços ----------
rep(`      if (st !== "jacket") fr = Math.min(fr, k < 6 ? 8.6 : fr);`, `      if (st !== "jacket") fr = Math.min(fr, k < 6 ? 8.6 : fr);
      if (fem) {
        if (k >= 11.5 && k < 19) fr = 7.6 + (k < 13 ? 1 : k < 17.5 ? 2 : 1);
        else if (k >= 4 && k < 11.5) fr -= 1;
        else if (k < 4) fr -= 0.6;
        if (k >= 6 && k < 13) bk += 1;
        if (k > 20.6) bk += 0.6;
      }`);
rep(`    const sk = R.c(look.skinP.base), skS = R.c(look.skinP.shade), top = 23 + br, hood = st === "hoodie";`,
  `    const sk = R.c(look.skinP.base), skS = R.c(look.skinP.shade), top = 23 + br, hood = st === "hoodie", fem = look.body === 1;`);
// sombra embaixo do busto
rep(`      if (hood && k > 17 && v < -5.5) return v < bk + 1.4 ? Sd : B;`, `      if (fem && k >= 11.5 && k < 12.6 && v > 6.2) return Sd;
      if (hood && k > 17 && v < -5.5) return v < bk + 1.4 ? Sd : B;`);
rep(`    R.area(P.x, P.y, P.a, -6.6, -2, 7.6, 5.6, function(lx, ly) {
      if (ly > 3.5 && Math.abs(lx - 0.5) > 5.5 - (ly - 3.5) * 1.5) return 0;
      return lx < -4.5 ? s : b;
    });`, `    const fem = look.body === 1;
    R.area(P.x, P.y, P.a, fem ? -8 : -6.6, -2, 7.6, 5.6, function(lx, ly) {
      if (fem && lx < -6.6 && Math.hypot((lx + 6.6) / 1.5, (ly - 1.6) / 2.8) > 1) return 0;
      if (ly > 3.5 && Math.abs(lx - (fem ? 0 : 0.5)) > (fem ? 6.6 : 5.5) - (ly - 3.5) * 1.5) return 0;
      return lx < -4.5 ? s : b;
    });`);
rep(`  R.cap(sh[0], sh[1], el[0], el[1], 2.6, 2.4, function(t, e, d) {`, `  const thin = look.body === 1 ? 0.3 : 0;
  R.cap(sh[0], sh[1], el[0], el[1], 2.6 - thin, 2.4 - thin, function(t, e, d) {`);
rep(`  R.cap(el[0], el[1], hd[0], hd[1], 2.3, 2, function(t, e, d) {`, `  R.cap(el[0], el[1], hd[0], hd[1], 2.3 - thin, 2 - thin, function(t, e, d) {`);

// ---------- 4. rig: look.body passa pela normalização e pela chave do cache ----------
rep(`    hair: look.hair != null ? look.hair : RIG_DEFAULT_LOOK.hair, hairC: look.hairC != null ? look.hairC : RIG_DEFAULT_LOOK.hairC
  };`, `    hair: look.hair != null ? look.hair : RIG_DEFAULT_LOOK.hair, hairC: look.hairC != null ? look.hairC : RIG_DEFAULT_LOOK.hairC,
    body: look.body === 1 ? 1 : 0
  };`);
rep(`  let s = [look.skin, look.eyes, look.hair, look.hairC].join(",");`, `  let s = [look.skin, look.eyes, look.hair, look.hairC].join(",") + (look.body ? ",f" : "");`);

// ---------- 5. LOOK: save, prévia e criação ----------
rep(`  const defLook = () => ({ skin: 0, eyes: 0, hairStyle: 0, hairColor: 0 });`, `  const defLook = () => ({ skin: 0, eyes: 0, hairStyle: 0, hairColor: 0, body: 0 });
  // v29: corpo do personagem. Escolhido só na criação; com conta, quem manda é o servidor (profiles.body)
  const BODIES = [{ name: "MARCUS", hair: 0 }, { name: "DUDA", hair: HAIR_STYLES.findIndex((z) => z.name === "Rabo de cavalo") }];
  const bodyName = (b) => (BODIES[b] || BODIES[0]).name;`);
rep(`    L.hairColor = clampI(L.hairColor, HAIR_COLS.length, L0.hairColor);`, `    L.hairColor = clampI(L.hairColor, HAIR_COLS.length, L0.hairColor);
    L.body = L.body === 1 ? 1 : 0;`);
rep(`    return { skin: L.skin, eyes: L.eyes, hair: L.hairStyle, hairC: L.hairColor };`, `    return { skin: L.skin, eyes: L.eyes, hair: L.hairStyle, hairC: L.hairColor, body: L.body === 1 ? 1 : 0 };`);
rep(`  function renderLookTab(R) {
    const L = ui.look;`, `  function renderLookTab(R) {
    const L = ui.look;
    if (ui.mode === "create") {
      const row = h("div", "lkRow lkBody");
      row.append(h("div", "lkLab", "QUEM"));
      const box = h("div", "lkBodyB");
      BODIES.forEach((bd, i) => {
        const b = h("button", "lkBodyC" + ((L.body | 0) === i ? " on" : ""));
        const cv = h("canvas");
        cv.width = 96; cv.height = 96;
        const lk = Object.assign({}, L, { body: i });
        if ((L.body | 0) !== i) lk.hairStyle = bd.hair;
        try { rigDrawFrame(cv.getContext("2d"), 46, 156, rigLook(lk), eqItems(ui.eq, lk), "Idle", 0, 2, { face: 1 }); } catch (e) {}
        b.append(cv);
        b.append(h("b", null, bd.name));
        b.onclick = () => {
          if ((L.body | 0) === i) return;
          SFX.swap && SFX.swap();
          L.body = i;
          if (L.hairStyle === BODIES[1 - i].hair || L.hairStyle === 0) L.hairStyle = bd.hair;
          refresh();
        };
        box.append(b);
      });
      row.append(box);
      R.append(row);
      R.append(h("p", "lkNote lkWarn", "Escolha com calma: o personagem fica na conta pra sempre. Cabelo, pele e roupa dá pra trocar depois."));
    } else {
      const row = h("div", "lkRow");
      row.append(h("div", "lkLab", "QUEM"));
      row.append(h("div", "lkVal lkFixed", bodyName(L.body) + " · fixo da conta"));
      R.append(row);
    }`);
rep(`    d.look = Object.assign({}, ui.look);
    d.eq = Object.assign({}, ui.eq);
    d.created = true;`, `    const wasCreate = ui.mode === "create";
    // o corpo só muda na criação; no guarda-roupa ele volta ao que está gravado
    if (!wasCreate) ui.look.body = d.look && d.look.body === 1 ? 1 : 0;
    d.look = Object.assign({}, ui.look);
    d.eq = Object.assign({}, ui.eq);
    d.created = true;
    if (wasCreate && typeof acctBodyLock === "function") acctBodyLock(d.look.body);`);
rep(`  return { ITEMS, KITS, OUTFITS, SLOTS, SKIN_TONES, EYES, HAIR_NAMES, HAIR_COLS, sanitize,`, `  return { BODIES, bodyName, ITEMS, KITS, OUTFITS, SLOTS, SKIN_TONES, EYES, HAIR_NAMES, HAIR_COLS, sanitize,`);

// ---------- 6. conta: o servidor guarda o corpo e vale sobre o save ----------
rep(`      return call("/rest/v1/profiles?select=id,name,name_changes,name_changed_at&limit=1").then((a) => {`,
  `      return call("/rest/v1/profiles?select=*&limit=1").then((a) => {`);
rep(`function acctHome() {`, `// v29: o corpo do personagem é da conta. Servidor tem valor -> vale ele; servidor vazio e personagem já criado -> grava o daqui.
function acctBodyApply(b) {
  const L = SAVE.d.look;
  if (!L || (b !== 0 && b !== 1) || L.body === b) return;
  L.body = b;
  if (b === 0 && LOOK.BODIES[1] && L.hairStyle === LOOK.BODIES[1].hair) L.hairStyle = 0;
  SAVE.save();
  try { LOOK.apply(); } catch (e) {}
  try { TITLE.refresh(); } catch (e) {}
}
function acctBodyLock(b) {
  const p = NET.st.profile;
  if (DEV.on || !NET.logged || !p || !("body" in p)) return Promise.resolve(null);
  if (p.body === 0 || p.body === 1) { acctBodyApply(p.body); return Promise.resolve(p.body); }
  return NET.rpc("set_body", { p_body: b === 1 ? 1 : 0 }).then((v) => {
    if (v === 0 || v === 1) { p.body = v; acctBodyApply(v); }
    return v;
  }).catch(() => null);
}
function acctBodySync() {
  const p = NET.st.profile;
  if (!p || !("body" in p)) return;
  if (p.body === 0 || p.body === 1) acctBodyApply(p.body);
  else if (SAVE.d.created) acctBodyLock(SAVE.d.look && SAVE.d.look.body);
}
function acctHome() {
  acctBodySync();`);

// ---------- 7. CSS da escolha ----------
rep(`</style>`, `/* v29: escolha de personagem na criação */
.lkBody{align-items:flex-start}
.lkBodyB{display:flex;gap:10px;flex-wrap:wrap}
.lkBodyC{display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px 10px 6px;background:#1f1b27;border:2px solid #000;box-shadow:inset 0 0 0 1px #3a3446;cursor:pointer;color:#bdb6cc}
.lkBodyC canvas{width:80px;height:80px;image-rendering:pixelated;background:radial-gradient(circle at 50% 40%,#3a3446,#1a1622 75%)}
.lkBodyC b{font-family:var(--fz);font-weight:400;font-size:20px;letter-spacing:2px;line-height:1}
.lkBodyC.on{background:#2e2838;box-shadow:inset 0 0 0 2px #ffd84a,0 0 10px rgba(255,216,74,.35);color:#ffd84a}
.lkNote.lkWarn{color:#ffd84a}
.lkFixed{color:#bdb6cc}
@media (max-height:440px){.lkBodyC canvas{width:60px;height:60px}.lkBodyC{padding:2px 8px 4px}}
</style>`);

fs.writeFileSync(F, s);
console.log('ok v29.0 personagem');
