// v29: loja de armas da partida (LOJA DA QUEBRADA) com layout novo.
// - Cards com holofote atrás da arma, faixa na cor do ranking, arma maior no PC, barra de DPS no card e selo EQUIPADA.
// - Comparação com a arma que você já tem no mesmo espaço: cada barra mostra +X verde / -X vermelho.
// - PC: interface cresce com a tela (--auto), vitrine menor e mais colunas. Celular: cards mais baixos e
//   degradê no fim da grade quando tem mais itens pra rolar.
// Uso: node tools/patches/v29-armas.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};
if (s.includes('/* ==== ARMAS v29')) throw new Error('v29-armas já aplicado');

// ---------- CSS ----------
rep(`@media (max-height:380px){.shInfo{height:96px}.shGrid{grid-auto-rows:78px}}`, `@media (max-height:380px){.shInfo{height:96px}.shGrid{grid-auto-rows:78px}}
/* ==== ARMAS v29: cards, comparação, PC ==== */
.shCard{--rk:#3a3446;background:radial-gradient(ellipse at 50% 58%,rgba(255,177,90,.16),transparent 62%),#26232d repeating-linear-gradient(45deg,rgba(0,0,0,.18) 0 2px,transparent 2px 6px);box-shadow:inset 0 -3px 0 var(--rk)}
.shCard .ci canvas{filter:drop-shadow(0 3px 0 rgba(0,0,0,.45));max-width:94%;height:auto!important}
.shCard .cf{align-items:center;gap:6px}
.shCard .dp{flex:1;height:4px;max-width:70px;background:#2a2430;border:1px solid #000;margin-left:auto}.shCard .dp i{display:block;height:100%;background:#ff9a3c}
.shCard.mine{box-shadow:inset 0 -3px 0 var(--rk),inset 0 0 0 1px #2aa83c}
.shCard.mine .cn{color:#7dff6a}
.shCard.sel{border-color:#ff9a3c;box-shadow:inset 0 -3px 0 var(--rk),inset 0 0 0 1px #ffd9a8,0 0 12px rgba(255,154,60,.5)}
.shCard.sel .ci{background:radial-gradient(ellipse at 50% 60%,rgba(255,177,90,.22),transparent 65%)}
.shCard.poor .ci canvas{opacity:.55}
.shCard .cn{display:flex;justify-content:space-between;gap:6px}.shCard .cn small{color:#8a8494;font-size:inherit}
.sb .dl{font-style:normal;min-width:44px;text-align:right;white-space:nowrap;font-size:.8em}
.sb .dl.up{color:#7dff6a}.sb .dl.dn{color:#ff6b5e}.sb .dl.eq{color:#6a6478}
.shCmp{color:#8a8494}.shCmp b{color:#e9e4d8;font-weight:400}
.shGrid.more{-webkit-mask-image:linear-gradient(#000 82%,transparent);mask-image:linear-gradient(#000 82%,transparent)}
@media (max-height:500px){.shGrid{grid-auto-rows:72px}.sb .dl{min-width:36px}}
@media (max-width:760px){.sb .t{display:none}.sb .l{width:auto;flex:1}.shBars{column-gap:16px}.shLeft{min-width:170px;width:28%}}
@media (min-width:1000px) and (min-height:700px){
  #shop{zoom:var(--auto)}
  .shLeft{width:26%}
  .shGrid{grid-template-columns:repeat(auto-fill,minmax(190px,1fr));grid-auto-rows:118px;gap:6px;padding:6px}
  .shInfo{height:118px}
}
`);

// ---------- cards ----------
rep(`      b.className = "shCard" + (UI.shopSel.id === it.id ? " sel" : "") + (p.cash < st.price && !st.dis ? " poor" : "");`,
  `      b.className = "shCard" + (UI.shopSel.id === it.id ? " sel" : "") + (p.cash < st.price && !st.dis ? " poor" : "") + (it.t === "gun" && owns(it.id) ? " mine" : "");`);
rep(`      paintIcon(b.querySelector("canvas"), it.icon, 150, 48);`, `      const big = innerWidth >= 1000 && innerHeight >= 700;
      paintIcon(b.querySelector("canvas"), it.icon, big ? 230 : 150, big ? 66 : 48);
      if (it.t === "gun") {
        const ow = p.ws.find((w2) => w2 && w2.id === it.id), inst = ow || { id: it.id, rk: "blue" }, rk = RANKS[inst.rk || "blue"];
        b.style.setProperty("--rk", rk.c);
        const cf = b.querySelector(".cf"), dp = document.createElement("span");
        dp.className = "dp";
        dp.title = "DPS " + dps(inst);
        dp.innerHTML = '<i style="width:' + (Math.min(1, dps(inst) / 1300) * 100 | 0) + '%"></i>';
        cf.insertBefore(dp, cf.children[1] || null);
        const cn = b.querySelector(".cn");
        cn.innerHTML = it.name + "<small>" + (WEAP[it.id].slot === "sec" ? "SEC" : "PRI") + "</small>";
      }`);
rep(`    UI.shopInfo();
    UI.shopLoadout();
  },`, `    UI.shopInfo();
    UI.shopLoadout();
    const more = () => grid.classList.toggle("more", grid.scrollHeight - grid.scrollTop - grid.clientHeight > 8);
    grid.onscroll = more;
    requestAnimationFrame(more);
  },`);

// ---------- comparação com a arma do mesmo espaço ----------
rep(`    $("shBars").innerHTML = h;
    $("shCash").textContent = "R$" + p.cash;`, `    $("shBars").innerHTML = h;
    if (it.t === "gun" && !owns(it.id)) {
      const vs = p.ws[gunSlotFor(it.id)] || p.ws[p.cur] || p.ws[1];
      if (vs && WEAP[vs.id]) {
        const val = (w2) => { const W = WEAP[w2.id], q = wst(w2); return [Math.round(q.dmg * W.pellets), dps(w2), Math.round(60 / q.rate), Math.round((1 - W.spread / 0.17) * 100), q.mag, q.pierce]; };
        const a = val({ id: it.id, rk: "blue" }), b2 = val(vs);
        $("shBars").querySelectorAll(".sb").forEach((el, i) => {
          if (i >= a.length) return;
          const d = a[i] - b2[i], e = document.createElement("i");
          e.className = "dl " + (d > 0 ? "up" : d < 0 ? "dn" : "eq");
          e.textContent = d > 0 ? "+" + d : d < 0 ? "\\u2212" + -d : "=";
          el.append(e);
        });
        const ds = $("shBars").querySelectorAll(".shDesc"), c = document.createElement("span");
        c.className = "shCmp";
        c.innerHTML = " \xB7 vs sua <b>" + WEAP[vs.id].name + "</b>";
        if (ds.length) ds[ds.length - 1].append(c);
        else { const dv = document.createElement("div"); dv.className = "shDesc"; dv.append(c); $("shBars").append(dv); }
      }
    }
    $("shCash").textContent = "R$" + p.cash;`);

fs.writeFileSync(F, s);
console.log('v29-armas ok');
