// v29.12: EVOLUIR ARMA na LOJA DA QUEBRADA + HUD da partida mais legível.
// Evolução (dinheiro da partida, R$):
// - Toda arma de fogo que você tem pode evoluir na loja do mercador: R$ 20.000 por nível, 3 níveis (★★★).
//   Nível 1: +20% de dano. Nível 2: +40% de dano e pente/reserva +20%. Nível 3: +60% de dano, pente +20%,
//   recarga 15% mais rápida e +1 perfuração. Soma por cima do ranking (azul/roxa/dourada/diamante).
// - Com o teto de R$ 35 mil, dá no máximo uma evolução por pausa: a arma cresce ao longo da partida.
// - A evolução fica na arma: se você largar ou trocar, quem pegar no chão leva os níveis junto.
// - É dinheiro da partida (não vai pro servidor), igual ao resto da loja do mercador; nada de Z-Coin.
// HUD:
// - Slot mostra o NOME da arma (antes só o ranking), as estrelas da evolução e uma barra de recarga.
// - Vida com "93/150", colete em prata (não confunde com o dinheiro), dinheiro com ponto de milhar.
// - Corrige a borda do aviso de notificação que ficava aparecendo no topo da tela durante a partida.
// Uso: node tools/patches/v29.12-evolucao-hud.js index.html
const fs = require('fs'), path = require('path');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};
if (s.includes('/* ==== EVOLUÇÃO v29.12')) throw new Error('v29.12-evolucao-hud já aplicado');

// ---------------------------------------------------------------- CSS
rep(`</style>`, `/* ==== EVOLUÇÃO v29.12: loja + HUD ==== */
#ntPop:not(.in){visibility:hidden;transition:transform .28s cubic-bezier(.2,.9,.3,1.2),visibility 0s .28s}
.shBuyRow{display:flex;gap:3px;flex:1;min-height:0}.shBuyRow .shBtn{flex:1;min-width:0}
.shBtn.evo{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;line-height:1.05;background:linear-gradient(#8dff7a,#2aa83c);box-shadow:inset 0 2px 0 #d8ffc8,inset 0 -3px 0 #146a22;color:#062a0c}
.shBtn.evo small{font-size:.82em;opacity:.9}
.shBtn.evo.poor{background:#1c3a1e;color:#8ad88a;box-shadow:none}
.shBtn.evo:disabled{background:#3a3640;color:#8a8494;box-shadow:none}
.shBtn.evo.hidden{display:none}
.evS{color:#7dff6a;letter-spacing:-1px;font-style:normal;white-space:nowrap}.evS .o{color:#4a4458}
.shCard .evS{margin-right:5px}
.shEvo{color:#c9c2d6}.shEvo b{color:#7dff6a;font-weight:400}.shEvo em{font-style:normal}
@media (max-height:500px){.shEvo em{display:none}.shBuyRow{flex:1 0 36px}.shBuy .shBtnRow{flex:1 1 auto;min-height:0}.shBuyRow:has(.evo:not(.hidden)) .buy{font-size:12px;line-height:1.1;white-space:normal;padding:0 2px}.shBtn.evo{font-size:12px}.shBtn.evo small{font-size:11px}}
.slot .sk{max-width:calc(100% - 8px)!important;overflow:hidden!important;text-overflow:ellipsis}
.slot .sk .evS{margin-left:3px;font-size:.92em}
.slot.rel::after{content:'';position:absolute;left:2px;right:2px;bottom:2px;height:3px;background:linear-gradient(90deg,#ffd84a calc(var(--rp,0)*100%),rgba(0,0,0,.55) 0)}
.slot{box-shadow:inset 0 0 0 1px #3a3446,inset 0 -3px 0 color-mix(in srgb,var(--rk) 70%,transparent)}
.slot.empty{box-shadow:inset 0 0 0 1px #3a3446}
.slot.low .sa b{animation:lowAmmo .45s steps(2) infinite}
@keyframes lowAmmo{to{color:#fff}}
#hpTxt small{opacity:.75;font-size:.8em}
#arm{height:5px!important;background:#14161a!important}#arm i{background:linear-gradient(#eef3f8,#9fb0c2)!important}
#arm.none{opacity:0!important}
@media (max-height:400px){#shGo{font-size:11px!important;line-height:1.05!important}.shBuyRow{flex:1 0 32px}}
@media (prefers-reduced-motion:reduce){.slot.low .sa b{animation:none}}
</style>`);

// ---------------------------------------------------------------- loja: botão EVOLUIR ao lado de comprar/munição
rep(`          <button class="shBtn buy" id="shBuyBtn">COMPRAR</button>`,
`          <div class="shBuyRow"><button class="shBtn buy" id="shBuyBtn">COMPRAR</button><button class="shBtn evo hidden" id="shEvoBtn"></button></div>`);

// cards: estrelas na arma que você tem
rep(`        cn.innerHTML = it.name + "<small>" + (WEAP[it.id].slot === "sec" ? "SEC" : "PRI") + "</small>";`,
`        cn.innerHTML = it.name + "<small>" + (ow && ow.ev ? EVO.stars(ow) : "") + (WEAP[it.id].slot === "sec" ? "SEC" : "PRI") + "</small>";`);

// painel: linha da evolução + quanto melhora no próximo nível; botão evoluir
rep(`    $("shCash").textContent = "R$" + p.cash;
    const bb = $("shBuyBtn");`, `    EVO.info(it);
    $("shCash").textContent = "R$" + fmtR(p.cash);
    const bb = $("shBuyBtn");`);

// equipamento: estrelas
rep(`    const rk = (w2) => \`<b style="color:\${RANKS[w2.rk || "blue"].c};font-weight:400">\${RANKS[w2.rk || "blue"].n}</b> \`;`,
`    const rk = (w2) => \`<b style="color:\${RANKS[w2.rk || "blue"].c};font-weight:400">\${RANKS[w2.rk || "blue"].n}</b> \` + (w2.ev ? EVO.stars(w2) + " " : "");`);

// ---------------------------------------------------------------- HUD
rep(`      $("cashV").textContent = cash;`, `      $("cashV").textContent = fmtR(cash);`);
rep(`      const w3 = p.ws[i], el = $("slot" + i), key = w3 ? w3.id + ":" + w3.rk + ":" + w3.mag + "/" + w3.res + ":" + (p.cur === i) : "none";`,
`      const w3 = p.ws[i], el = $("slot" + i), key = w3 ? w3.id + ":" + w3.rk + ":" + (w3.ev | 0) + ":" + w3.mag + "/" + w3.res + ":" + (p.cur === i) : "none";`);
rep(`      el.querySelector(".sk").textContent = (i ? "2" : "1") + " \\xB7 " + RANKS[w3.rk || "blue"].n;`,
`      el.querySelector(".sk").innerHTML = (i ? "2" : "1") + " \\xB7 " + WEAP[w3.id].name + (w3.ev ? EVO.stars(w3) : "");
      el.title = WEAP[w3.id].name + " " + RANKS[w3.rk || "blue"].n + (w3.ev ? " \\xB7 N\\xCDVEL " + w3.ev : "");`);
rep(`    if (rel) rb.style.setProperty("--p", (1 - p.relT / p.relMax).toFixed(3));`,
`    if (rel) rb.style.setProperty("--p", (1 - p.relT / p.relMax).toFixed(3));
    for (let i = 0; i < 2; i++) {
      const se = $("slot" + i), r = rel && p.cur === i;
      if (se.classList.contains("rel") !== r) se.classList.toggle("rel", r);
      if (r) se.style.setProperty("--rp", (1 - p.relT / p.relMax).toFixed(2));
    }`);
rep(`      $("hpTxt").textContent = Math.ceil(p.hp);`, `      $("hpTxt").innerHTML = Math.ceil(p.hp) + "<small>/" + Math.round(p.maxHp) + "</small>";`);

// ---------------------------------------------------------------- lógica (fim do script: as funções são globais, então dá pra embrulhar)
const JS = `
/* ==== EVOLUÇÃO v29.12: evoluir arma na loja da partida ==== */
// preço fixo por nível (R$ da partida). dmg/mag/rel multiplicam por cima do ranking; pierce soma.
CONFIG.evo = { price: 2e4, max: 3, lv: [null, { dmg: 1.2 }, { dmg: 1.4, mag: 1.2 }, { dmg: 1.6, mag: 1.2, rel: 0.85, pierce: 1 }] };
function fmtR(n) {
  return String(Math.round(n)).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".");
}
const EVO = (() => {
  const C = () => CONFIG.evo;
  const lv = (w) => Math.min(C().max, (w && w.ev) | 0);
  const stars = (w) => {
    const n = lv(w);
    return '<i class="evS">' + "\\u2605".repeat(n) + '<span class="o">' + "\\u2605".repeat(C().max - n) + "</span></i>";
  };
  const state = (w) => {
    if (!w || !WEAP[w.id]) return null;
    const n = lv(w);
    if (n >= C().max) return { max: 1, dis: 1, n };
    return { price: C().price, n, next: n + 1, dis: 0 };
  };
  // o que o próximo nível muda, em palavras
  const what = (k) => {
    const L = C().lv, a = L[k - 1] || {}, b = L[k], o = [];
    o.push("+" + Math.round((b.dmg / (a.dmg || 1) - 1) * 100) + "% dano");
    if (b.mag && !a.mag) o.push("+" + Math.round((b.mag - 1) * 100) + "% pente");
    if (b.rel && !a.rel) o.push("recarga " + Math.round((1 - b.rel) * 100) + "% mais r\\xE1pida");
    if (b.pierce && !a.pierce) o.push("+" + b.pierce + " perfura");
    return o.join(" \\xB7 ");
  };
  function buy(w) {
    const p = S.player, st = state(w);
    if (!st || st.dis) return false;
    if (p.cash < st.price) {
      SFX.deny();
      UI.deny(st.price);
      return false;
    }
    p.cash -= st.price;
    S.stats.spent += st.price;
    S.stats.evo = (S.stats.evo || 0) + 1;
    UI.pop(-st.price);
    SFX.buy();
    w.ev = st.next;
    w.mag = wst(w).mag;
    UI.toast(WEAP[w.id].name + " EVOLUIU \\xB7 N\\xCDVEL " + w.ev, "#7dff6a");
    return true;
  }
  // painel da loja: linha da evolução, setas do próximo nível e o botão
  function info(it) {
    const p = S.player, eb = $("shEvoBtn");
    if (!eb) return;
    const w = it && it.t === "gun" ? p.ws.find((x) => x && x.id === it.id) : null, st = state(w);
    eb.classList.toggle("hidden", !st);
    if (!st) return;
    const bars = $("shBars"), d = document.createElement("span"), ds = bars.querySelectorAll(".shDesc");
    d.className = "shEvo";
    d.innerHTML = " \\xB7 EVOLU\\xC7\\xC3O " + stars(w) + (st.max ? " <b>m\\xE1x</b>" : '<em> \\xB7 pr\\xF3ximo: <b>' + what(st.next) + "</b></em>");
    if (ds.length) ds[ds.length - 1].append(d);
    else { const dv = document.createElement("div"); dv.className = "shDesc"; dv.append(d); bars.append(dv); }
    if (!st.max) {
      const val = (w2) => { const W = WEAP[w2.id], q = wst(w2); return [Math.round(q.dmg * W.pellets), dps(w2), Math.round(60 / q.rate), null, q.mag, q.pierce]; };
      const a = val(Object.assign({}, w, { ev: st.next })), b = val(w);
      bars.querySelectorAll(".sb").forEach((el, i) => {
        if (i >= a.length || a[i] == null || a[i] === b[i] || el.querySelector(".dl")) return;
        const e = document.createElement("i");
        e.className = "dl up";
        e.textContent = "+" + (a[i] - b[i]);
        el.append(e);
      });
    }
    eb.disabled = !!st.dis;
    eb.classList.toggle("poor", !st.dis && p.cash < st.price);
    eb.innerHTML = st.max ? "<b>M\\xC1XIMO</b><small>\\u2605\\u2605\\u2605</small>" : "<b>EVOLUIR \\u2605" + st.next + "</b><small>R$" + fmtR(st.price) + "</small>";
  }
  return { lv, stars, state, buy, info, what };
})();
{
  // status da arma: evolução por cima do ranking
  const wst0 = wst;
  wst = function (w2) {
    const s2 = wst0(w2), n = EVO.lv(w2);
    if (!n) return s2;
    const K = CONFIG.evo.lv[n];
    s2.dmg *= K.dmg;
    if (K.mag) { s2.mag = Math.round(s2.mag * K.mag); s2.res = Math.round(s2.res * K.mag); }
    if (K.rel) s2.rel *= K.rel;
    if (K.pierce) s2.pierce += K.pierce;
    return s2;
  };
  // a evolução fica na arma: troca de ranking da mesma arma, largar no chão e pegar de volta
  const gw0 = giveWeapon;
  giveWeapon = function (id, rk, slotForce, ammo) {
    const p = S.player, sl = slotForce != null ? slotForce : gunSlotFor(id), cur = p && p.ws[sl], ev = cur && cur.id === id ? cur.ev | 0 : 0;
    const old = gw0.apply(this, arguments), nw = p && p.ws[sl];
    if (nw && nw.id === id && ev > (nw.ev | 0)) nw.ev = ev;
    return old;
  };
  const si0 = spawnItem;
  spawnItem = function (id, rk, x, y, o) {
    const it = si0.apply(this, arguments);
    if (it && o && o.ev) it.ev = o.ev | 0;
    return it;
  };
  const gd0 = giveAndDrop;
  giveAndDrop = function () {
    const n0 = S.items ? S.items.length : 0, old = gd0.apply(this, arguments);
    if (old && old.ev && S.items) {
      for (let i = S.items.length - 1; i >= 0; i--) {
        const q = S.items[i];
        if (q.id === old.id && !q.ev && q.t === 0) { q.ev = old.ev; break; }
      }
    }
    return old;
  };
  const ti0 = takeItem;
  takeItem = function (it) {
    const had = !!(it && S.items && S.items.includes(it)), e = (it && it.ev) | 0, r = ti0.apply(this, arguments);
    if (had && e && !S.items.includes(it)) {
      const w = S.player.ws.find((x) => x && x.id === it.id);
      if (w && (w.ev | 0) < e) { w.ev = e; const st = wst(w); w.mag = Math.min(st.mag, w.mag); }
      UI.toast(WEAP[it.id].name + " \\xB7 N\\xCDVEL " + e, "#7dff6a");
    }
    return r;
  };
}
$("shEvoBtn").onclick = () => {
  const it = UI.shopSel, w = it && it.t === "gun" ? S.player.ws.find((x) => x && x.id === it.id) : null;
  if (w && EVO.buy(w)) {
    UI.shopRender();
    const sy = $("shRound").querySelector(".say");
    if (sy) sy.textContent = "\\u201C" + pick(["AGORA SIM, ESSA A\\xCD T\\xC1 BRABA.", "MEXI NO GATILHO PRA TU.", "VAI ESTRAGAR ZUMBI COM ISSO A\\xCD.", "TRABALHO DE PRIMEIRA, PARCEIRO."]) + "\\u201D";
  }
};
</script>
</body>`;
rep(`</script>
</body>`, JS);

// ---------------------------------------------------------------- versão (próximo número a partir do que estiver na main)
const vm = /const QZ_VERSION='(\d+)\.(\d+)(?:\.\d+)?';/.exec(s);
if (!vm) throw new Error('QZ_VERSION');
const V = vm[1] + '.' + (+vm[2] + 1);
s = s.replace(vm[0], `const QZ_VERSION='${V}';`);
s = s.replace(/const QZ_NOTE='[^']*';/, `const QZ_NOTE='Evolua sua arma na loja do mercador: R$ 20 mil por nível, até 3 estrelas. HUD novo com o nome da arma e barra de recarga';`);
fs.writeFileSync(F, s);

const SW = path.join(path.dirname(F), 'sw.js');
let w = fs.readFileSync(SW, 'utf8');
const cm = /const CACHE = "qz-v[\d.]+";/.exec(w);
if (!cm) throw new Error('sw CACHE');
fs.writeFileSync(SW, w.replace(cm[0], `const CACHE = "qz-v${V}";`));
console.log('ok v' + V);
