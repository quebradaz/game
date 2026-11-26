// v29.12: loot compartilhado no co-op online + largar arma arrastando pra fora do HUD.
//
// O que muda:
//  - Online, quem manda no loot do mundo é o anfitrião: armas que caem de zumbi (brutamonte), da onda especial e as
//    douradas dos chefes, e os power-ups (munição cheia, um tiro só, grana em dobro, kabum). Cada uma ganha um número
//    e aparece no mesmo lugar para todos. O convidado não sorteia loot do mundo (senão cada um veria um diferente).
//  - Pegar: quem chegar primeiro leva. O convidado pede ao anfitrião ("tk") e a arma some para todos ("gone"). Se outro
//    pegou antes, some da tela dele ("nogo").
//  - Power-up vale para a tropa inteira: quem pegar, todo mundo recebe o efeito (o kabum mata no anfitrião e cada um
//    ganha os R$400).
//  - Chefe derrotado no online solta uma dourada para cada jogador (mesma regra do pool, sem repetir quando dá).
//  - Arrastar a arma do slot 1 ou 2 para fora do HUD larga ela no chão (no PC também: tecla Z larga a arma da mão).
//    No online a arma largada aparece para os amigos ("FULANO LARGOU M4 DOURADA") e qualquer um pode pegar.
// Uso: node tools/patches/v29.12-loot-online.js index.html   (sobe QZ_VERSION/CACHE para o número seguinte)
const fs = require('fs');
const path = require('path');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 90));
  s = s.split(a).join(b);
};

// ---------------------------------------------------------------- CSS
rep('.slots{display:flex;gap:6px}', `.slots{display:flex;gap:6px}
/* v29.12: arrastar a arma pra fora do HUD */
.slot{touch-action:none}.slot.drag{opacity:.25!important;outline:2px dashed #ffd84a;outline-offset:-2px}
#dragGhost{position:fixed;left:0;top:0;z-index:60;pointer-events:none;width:156px;height:44px;image-rendering:pixelated;transform:translate(-50%,-70%);filter:drop-shadow(0 0 6px #ffd84a) drop-shadow(2px 2px 0 #000);transition:filter .12s}
#dragGhost.out{filter:drop-shadow(0 0 10px #ff9a3c) drop-shadow(2px 2px 0 #000)}
#dragHint{position:fixed;z-index:60;pointer-events:none;transform:translate(-50%,10px);font:700 11px/1 var(--fz,monospace);letter-spacing:1px;color:#ffd84a;text-shadow:2px 2px 0 #000;white-space:nowrap}`);

// ---------------------------------------------------------------- armas no chão
rep(`function spawnItem(id, rk, x, y, o = {}) {
  var _a, _b;
  if (!WEAP[id]) return;`, `function spawnItem(id, rk, x, y, o = {}) {
  var _a, _b;
  if (!WEAP[id]) return;
  // v29.12: online, loot do mundo só nasce no anfitrião (o convidado recebe pela rede)
  if (ONL.live() && !ONL.itemOk(o)) return;`);
rep(`  S.items.push(it);
  while (S.items.length > CONFIG.items.cap) {`, `  S.items.push(it);
  ONL.itemNew(it, o);
  while (S.items.length > CONFIG.items.cap) {`);
rep(`function takeItem(it) {
  const p = S.player;
  if (!p || p.dead || !S.items.includes(it)) return;`, `function takeItem(it) {
  const p = S.player;
  if (!p || p.dead || !S.items.includes(it)) return;
  // v29.12: online, quem chegar primeiro leva (o anfitrião decide)
  if (it.iid && ONL.live() && !S.netTake && !ONL.takeOk(it)) return;`);
rep(`{ mag: old.mag, res: old.res, np: CONFIG.items.repick, vx: p.face * 60 }`, `{ mag: old.mag, res: old.res, np: CONFIG.items.repick, vx: p.face * 60, mine: 1 }`);
rep(`function owns(id) {`, `// v29.12: larga a arma do slot no chão (arrastar pra fora do HUD ou tecla Z)
function dropGun(i) {
  const p = S.player;
  if (!p || p.dead || p.down > 0 || S.mode !== "play" || i !== 0 && i !== 1) return;
  const w = p.ws[i];
  if (!w) return;
  p.ws[i] = null;
  spawnItem(w.id, w.rk || "blue", p.x + p.face * 14, p.y - 24, { mag: w.mag, res: w.res, np: CONFIG.items.repick, vx: p.face * 90, vy: -170, mine: 1, drop: 1, ev: w.ev });
  if (p.cur === i) {
    p.cur = p.ws[1 - i] ? 1 - i : 2;
    p.relT = 0;
    p.swapT = 0.35;
  }
  if (p.lastGun === i) p.lastGun = p.ws[1 - i] ? 1 - i : 0;
  SFX.swap();
  UI.toast("LARGOU " + WEAP[w.id].name + " " + RANKS[w.rk || "blue"].n, RANKS[w.rk || "blue"].c);
}
function owns(id) {`);

// ---------------------------------------------------------------- power-ups
rep(`function dropPow(x, y, k) {
  k = k || pick(["max", "insta", "dbl", "nuke", "max", "dbl"]);
  S.pows.push({ k, x, y, t: 0, life: CONFIG.powLife || 15 });`, `function dropPow(x, y, k, pid) {
  // v29.12: online, power-up só nasce no anfitrião
  if (ONL.live() && ONL.guest() && !pid) return;
  k = k || pick(["max", "insta", "dbl", "nuke", "max", "dbl"]);
  const pw = { k, x, y, t: 0, life: CONFIG.powLife || 15 };
  S.pows.push(pw);
  ONL.powNew(pw, pid);`);
rep(`    pw.got = 1;
    takePow(pw);
  }`, `    pw.got = 1;
    if (ONL.powTake(pw)) takePow(pw);
  }`);
// nuke no convidado: os zumbis morrem pelo anfitrião (aqui só o susto e a grana)
rep(`    for (const z of S.zs) if (z.state !== "dead" && !z.boss) killZ(z, false, "nuke");
    addCash(400);`, `    if (!ONL.guest()) for (const z of S.zs) if (z.state !== "dead" && !z.boss) killZ(z, false, "nuke");
    addCash(400);`);

// ---------------------------------------------------------------- chefes: uma dourada por jogador
rep(`    bossGold(z);
    dropPow(z.x + 30, z.y - 20, "max");`, `    bossGold(z);
    ONL.bossExtra(z);
    dropPow(z.x + 30, z.y - 20, "max");`);
rep(`    bossGold(z);
    dropPow(z.x + 34, z.y - 20, "max");`, `    bossGold(z);
    ONL.bossExtra(z);
    dropPow(z.x + 34, z.y - 20, "max");`);

// ---------------------------------------------------------------- rede (dentro do ONL)
rep(`st.nid = 0; st.zq = []; st.zmap = {}; st.votes = {}; st.ev = {};`, `st.nid = 0; st.zq = []; st.zmap = {}; st.votes = {}; st.ev = {}; st.iid = 0; st.imap = {}; st.pid = 0; st.pwDone = {};`);
rep(`  function onEv(e, who) {
    const k = e[0];
`, `  function onEv(e, who) {
    const k = e[0];
    if (lootEv(e, who)) return;
`);
rep(`  // balão da frase em cima do personagem na partida`, `  // ---------- loot (v29.12): o anfitrião numera, quem chegar primeiro leva ----------
  function nm(who) { const b = pup(who); return b ? b.name : "PARCEIRO"; }
  function itemOk(o) { return host() || !!(o && (o.mine || o.net)); }
  function itemNew(it, o) {
    if (!live()) return;
    st.imap = st.imap || {};
    if (o && o.net) { it.iid = o.iid; st.imap[it.iid] = it; return; }
    it.iid = st.me * 1e6 + (st.iid = (st.iid || 0) + 1);
    st.imap[it.iid] = it;
    ev(-1, ["it", it.iid, it.id, it.rk, Math.round(it.x), Math.round(it.y), Math.round(it.vx), Math.round(it.vy), it.mag == null ? null : it.mag, it.res == null ? null : it.res, Math.round((it.np || 0) * 10) / 10, o && o.drop ? 1 : 0, it.ev == null ? null : it.ev]);
  }
  function unItem(it) {
    if (!it) return;
    const i = S.items.indexOf(it);
    if (i >= 0) S.items.splice(i, 1);
    if (S.pickSel === it) S.pickSel = null;
  }
  function gotToast(who, id, rk) {
    if ((rk === "gold" || rk === "diamond") && WEAP[id] && RANKS[rk]) UI.toast(nm(who) + " PEGOU " + WEAP[id].name + " " + RANKS[rk].n, RANKS[rk].c);
  }
  function takeOk(it) {
    if (host()) {
      delete st.imap[it.iid];
      ev(-1, ["gone", it.iid, 0, it.id, it.rk, it.mag == null ? null : it.mag, it.res == null ? null : it.res, it.ev == null ? null : it.ev]);
      return true;
    }
    if (it.pend && now() - it.pend < 1500) return false;
    it.pend = now();
    ev(0, ["tk", it.iid]);
    flush();
    return false;
  }
  function powNew(pw, pid) {
    if (!live()) return;
    if (pid) { pw.pid = pid; return; }
    if (!host()) return;
    pw.pid = st.pid = (st.pid || 0) + 1;
    ev(-1, ["pw", pw.pid, pw.k, Math.round(pw.x), Math.round(pw.y)]);
  }
  function powTake(pw) {
    if (!live() || !pw.pid) return true;
    if (host()) { ev(-1, ["pg", pw.pid, 0, pw.k]); return true; }
    ev(0, ["pt", pw.pid]);
    flush();
    return false;
  }
  function bossExtra(z) {
    if (!host()) return;
    const n = (S.bots || []).filter((b) => b.remote && !b.gone).length;
    for (let i = 0; i < n; i++) try { bossGold(z); } catch (x) { console.warn(x); }
  }
  function lootEv(e, who) {
    const k = e[0];
    if (k === "it") {
      if (st.imap && st.imap[e[1]]) return true;
      spawnItem(e[2], e[3], e[4], e[5], { vx: e[6], vy: e[7], mag: e[8] == null ? void 0 : e[8], res: e[9] == null ? void 0 : e[9], np: +e[10] || 0, net: 1, iid: e[1], ev: e[12] == null ? void 0 : e[12] });
      if (e[11] && WEAP[e[2]] && RANKS[e[3]]) UI.toast(nm(who) + " LARGOU " + WEAP[e[2]].name + " " + RANKS[e[3]].n, RANKS[e[3]].c);
      return true;
    }
    if (k === "tk") {
      if (!host()) return true;
      const it = st.imap[e[1]];
      if (!it || !S.items.includes(it)) { delete st.imap[e[1]]; ev(who, ["nogo", e[1]]); return true; }
      unItem(it);
      delete st.imap[e[1]];
      ev(-1, ["gone", e[1], who, it.id, it.rk, it.mag == null ? null : it.mag, it.res == null ? null : it.res, it.ev == null ? null : it.ev]);
      gotToast(who, it.id, it.rk);
      return true;
    }
    if (k === "gone") {
      if (host()) return true;
      const it = st.imap[e[1]];
      delete st.imap[e[1]];
      if (e[2] === st.me) {
        let o = it && S.items.includes(it) ? it : null;
        if (!o) { o = { id: e[3], rk: e[4], mag: e[5] == null ? void 0 : e[5], res: e[6] == null ? void 0 : e[6], iid: e[1], ev: e[7] == null ? void 0 : e[7], x: 0, y: 0, t: 0, life: 1 }; S.items.push(o); }
        S.netTake = 1;
        try { takeItem(o); } finally { S.netTake = 0; }
        unItem(o);
      } else {
        unItem(it);
        gotToast(e[2], e[3], e[4]);
      }
      return true;
    }
    if (k === "nogo") { const it = st.imap[e[1]]; delete st.imap[e[1]]; unItem(it); return true; }
    if (k === "pw") { if (!host()) dropPow(e[3], e[4], e[2], e[1]); return true; }
    if (k === "pt") {
      if (!host()) return true;
      const pw = S.pows.find((q) => q.pid === e[1]);
      if (pw && !pw.got) {
        pw.got = 1;
        takePow(pw);
        ev(-1, ["pg", e[1], who, pw.k]);
        if (POWS[pw.k]) UI.toast(nm(who) + ": " + POWS[pw.k].n, POWS[pw.k].c);
      }
      return true;
    }
    if (k === "pg") {
      if (host()) return true;
      st.pwDone = st.pwDone || {};
      if (st.pwDone[e[1]]) return true;
      st.pwDone[e[1]] = 1;
      const pw = S.pows.find((q) => q.pid === e[1]);
      if (pw) pw.got = 1;
      if (!POWS[e[3]]) return true;
      takePow({ k: e[3] });
      if (e[2] !== st.me) UI.toast(nm(e[2]) + ": " + POWS[e[3]].n, POWS[e[3]].c);
      return true;
    }
    return false;
  }

  // balão da frase em cima do personagem na partida`);
rep(`    over, quit, backToLobby, guestRounds, tick, begin, drawSays, toastMenu, lobbyMsg,`, `    over, quit, backToLobby, guestRounds, tick, begin, drawSays, toastMenu, lobbyMsg,
    itemOk, itemNew, takeOk, powNew, powTake, bossExtra,`);

// ---------------------------------------------------------------- HUD: arrastar pra largar + tecla Z
rep(`$("slot2").onclick = () => {
  S.input.slot = 2;
};`, `$("slot2").onclick = () => {
  S.input.slot = 2;
};
// v29.12: arrastar a arma pra fora do HUD larga ela no chão
(() => {
  let d = null, skipT = 0;
  const gh = document.createElement("canvas"), hint = document.createElement("div");
  gh.id = "dragGhost"; gh.className = "hidden"; hint.id = "dragHint"; hint.className = "hidden";
  document.body.append(gh, hint);
  const box = () => document.querySelector('[data-hud="slots"]').getBoundingClientRect();
  const outside = (e) => { const r = box(); return e.clientX < r.left - 10 || e.clientX > r.right + 10 || e.clientY < r.top - 10 || e.clientY > r.bottom + 10; };
  const stop = () => { if (d) d.el.classList.remove("drag"); gh.classList.add("hidden"); hint.classList.add("hidden"); };
  for (const i of [0, 1]) {
    const el = $("slot" + i);
    el.addEventListener("pointerdown", (e) => {
      const p = S.player;
      if (!p || !p.ws[i] || S.mode !== "play") return;
      d = { i, id: e.pointerId, x: e.clientX, y: e.clientY, on: 0, el };
      try { el.setPointerCapture(e.pointerId); } catch (x) {}
    });
    el.addEventListener("pointermove", (e) => {
      if (!d || e.pointerId !== d.id) return;
      if (!d.on && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 14) {
        const w = S.player && S.player.ws[d.i];
        if (!w || S.mode !== "play") { d = null; return; }
        d.on = 1;
        el.classList.add("drag");
        paintIcon(gh, w.id, 78, 22);
        gh.classList.remove("hidden");
        hint.classList.remove("hidden");
      }
      if (!d.on) return;
      const out = outside(e);
      gh.style.left = hint.style.left = e.clientX + "px";
      gh.style.top = hint.style.top = e.clientY + "px";
      gh.classList.toggle("out", out);
      hint.textContent = out ? "SOLTA PRA LARGAR NO CHÃO" : "ARRASTA PRA FORA";
    });
    const end = (e) => {
      if (!d || e.pointerId !== d.id) return;
      const dd = d;
      stop();
      d = null;
      if (!dd.on) return;
      skipT = performance.now() + 400;
      if (e.type === "pointerup" && outside(e)) dropGun(dd.i);
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("click", (e) => { if (performance.now() < skipT) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
  }
})();`);
rep(`    if (e.code === "KeyX") cyclePick();`, `    if (e.code === "KeyX") cyclePick();
    if (e.code === "KeyZ" && S.player && (S.player.cur === 0 || S.player.cur === 1)) dropGun(S.player.cur);`);

// ---------------------------------------------------------------- versão (número seguinte ao que estiver no arquivo)
const vm = /const QZ_VERSION='(\d+)\.(\d+)(?:\.\d+)?';/.exec(s);
if (!vm) throw new Error('QZ_VERSION');
const NV = vm[1] + '.' + (+vm[2] + 1);
s = s.replace(vm[0], `const QZ_VERSION='${NV}';`);
rep(/const QZ_NOTE='[^']*';/.exec(s)[0], `const QZ_NOTE='Online: o loot é da tropa. Armas e power-ups caem iguais para todos, o chefe solta uma dourada por jogador e dá para arrastar a arma pra fora do HUD e largar pro amigo';`);
fs.writeFileSync(F, s);
const SW = path.join(path.dirname(F), 'sw.js');
let w = fs.readFileSync(SW, 'utf8');
const cm = /const CACHE = "qz-v[^"]*";/.exec(w);
if (!cm) throw new Error('sw CACHE');
fs.writeFileSync(SW, w.replace(cm[0], `const CACHE = "qz-v${NV}";`));
console.log('ok', NV);
