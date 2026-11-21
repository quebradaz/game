// v28.8: tela do passe com os prêmios visíveis. Trilha horizontal (rolagem lateral com encaixe), cada nível é uma
// coluna com o prêmio grátis em cima e o premium embaixo; níveis liberados acesos; o nível em andamento mostra a barra;
// tocar num prêmio abre a prévia ao lado (roupa no manequim, moeda/chip/Z-Coin com o ícone grande).
// Usa só o que get_economy já manda (pass.rewards, xp, xp_per, free, prem, premium). Nada muda no servidor.
// Uso: node tools/patches/v28.8-passe-visual.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

// ---------- CSS ----------
rep('.ecNote{color:var(--mute);font-size:12px;margin:8px 0}\n', `.ecNote{color:var(--mute);font-size:12px;margin:8px 0}
/* v28.8: passe visual (trilha lateral com prêmios) */
.bpHead{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:12px;align-items:center;padding:4px 2px 10px;border-bottom:1px solid #2a2638}
.bpLv{display:flex;flex-direction:column;align-items:center;justify-content:center;width:62px;height:62px;border:2px solid #000;background:radial-gradient(circle at 50% 35%,#3a2a08,#140d00);box-shadow:inset 0 0 0 2px var(--gold),0 0 14px rgba(255,201,60,.35);line-height:1}
.bpLv small{font-size:10px;color:var(--mute);letter-spacing:1px}.bpLv b{font-family:var(--fy);font-size:28px;color:var(--gold);text-shadow:2px 2px 0 #000}
.bpXp b{color:var(--ink);font-size:14px}.bpXp small{color:var(--mute);display:block;font-size:12px}
.bpXp .ecPb{height:10px;border:1px solid #000}.bpXp .ecPb i{background:linear-gradient(90deg,#3e9a2a,#7dff6a)}
#ecBody .bpPrem{color:#1a0d00;text-shadow:none;background:linear-gradient(180deg,#ffe070,#c9a227);border:2px solid #000;padding:6px 10px;font-family:var(--fy);font-size:14px}
.bpMain{display:grid;grid-template-columns:minmax(150px,200px) minmax(0,1fr);gap:10px;padding-top:10px}
.bpPrev{display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px;padding:8px;border:2px solid #000;background:#16121f;box-shadow:inset 0 0 0 1px var(--bc,#4a4458);min-width:0}
.bpPrev .art{width:120px;height:120px;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle,color-mix(in srgb,var(--bc,#4a4458) 35%,transparent),transparent 70%)}
.bpPrev .art canvas{width:120px;height:120px;image-rendering:pixelated}.bpPrev .art img{width:72px;height:72px;image-rendering:pixelated}
.bpPrev .tg{font-size:11px;letter-spacing:1px;color:var(--bc,#a59fb4);font-weight:800}
.bpPrev .nm{font-family:var(--fy);font-size:17px;color:var(--ink);line-height:1.1}
.bpPrev .sb{font-size:12px;color:var(--mute)}
.bpPrev button{min-height:34px;padding:4px 14px;margin-top:4px}
.bpRail{position:relative;min-width:0;display:grid;grid-template-columns:22px minmax(0,1fr);gap:4px}
.bpTags{display:grid;grid-template-rows:22px 1fr 1fr;gap:6px;padding-bottom:10px}
.bpTags span{writing-mode:vertical-rl;transform:rotate(180deg);font-size:11px;letter-spacing:2px;font-weight:800;text-align:center;color:var(--mute);border:1px solid #2a2638;background:#120f1a}
.bpTags span.p{color:var(--gold);border-color:#5a4a1a}
.bpTrack{display:flex;gap:6px;overflow-x:auto;scroll-snap-type:x proximity;scroll-behavior:smooth;padding-bottom:10px;scrollbar-width:thin;scrollbar-color:#4a4458 transparent}
.bpCol{flex:0 0 92px;scroll-snap-align:center;display:grid;grid-template-rows:22px 1fr 1fr;gap:6px}
.bpN{position:relative;display:flex;align-items:center;justify-content:center;font-family:var(--fy);font-size:14px;color:var(--mute);background:#2a2638;border:1px solid #000;overflow:hidden}
.bpN i{position:absolute;left:0;top:0;bottom:0;background:#3e9a2a}.bpN span{position:relative;text-shadow:1px 1px 0 #000}
.bpCol.on .bpN{color:#fff}.bpCol.on .bpN i{width:100%}
.bpCol.nx .bpN{color:#fff;box-shadow:0 0 0 2px var(--gold)}
.bpCard{position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;gap:2px;padding:6px 4px 4px;min-height:108px;border:2px solid #000;background:#1a1624;box-shadow:inset 0 0 0 1px var(--bc,#3a3446);cursor:pointer;font-size:11px;color:var(--ink)}
.bpCard.prem{background:linear-gradient(180deg,#221a10,#16121a)}
.bpCard .ico{width:56px;height:56px;display:flex;align-items:center;justify-content:center}
.bpCard .ico canvas{width:56px;height:56px;image-rendering:pixelated}.bpCard .ico img{width:34px;height:34px;image-rendering:pixelated}
.bpCard .am{font-weight:800;line-height:1.1;text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bpCard .st{margin-top:auto;font-size:10px;color:var(--mute);letter-spacing:.5px}
.bpCard button{margin-top:auto;min-height:26px;padding:2px 10px;font-size:12px;animation:bpPulse 1.2s ease-in-out infinite}
.bpCard.lock .ico,.bpCard.lock .am{opacity:.45;filter:grayscale(.6)}
.bpCard.need .ico,.bpCard.need .am{opacity:.7}
.bpCard.can{box-shadow:inset 0 0 0 2px #7dff6a,0 0 12px rgba(125,255,106,.35)}
.bpCard.done::after{content:"\\2713";position:absolute;right:4px;top:2px;color:#7dff6a;font-size:16px;font-weight:900;text-shadow:1px 1px 0 #000}
.bpCard.done .ico,.bpCard.done .am{opacity:.6}
.bpCard.none{cursor:default;background:repeating-linear-gradient(135deg,#14111c 0 6px,#17131f 6px 12px);box-shadow:none;border-color:#1e1a28}
.bpCard.sel{outline:2px solid var(--gold);outline-offset:1px}
.bpCard.r2{--bc:#b04aff}.bpCard.r3{--bc:#ffc21a}.bpPrev.r2{--bc:#b04aff}.bpPrev.r3{--bc:#ffc21a}
.bpNav{display:flex;justify-content:center;gap:8px;margin-top:2px}
.bpNav button{min-height:30px;padding:2px 12px;font-size:14px}
@keyframes bpPulse{50%{transform:scale(1.06)}}
@media (max-width:560px){.bpMain{grid-template-columns:1fr}.bpPrev{flex-direction:row;text-align:left}.bpPrev .art,.bpPrev .art canvas{width:84px;height:84px}}
@media (max-height:500px){.bpHead{grid-template-columns:auto minmax(0,1fr) auto;gap:8px;padding:0 2px 4px}
  .bpLv{width:40px;height:40px}.bpLv small{font-size:8px}.bpLv b{font-size:18px}.bpXp b{font-size:13px}.bpXp .ecPb{height:7px;margin-top:2px}
  .bpMain{grid-template-columns:130px minmax(0,1fr);padding-top:4px;gap:6px}.bpPrev{padding:4px;gap:2px}
  .bpPrev .art,.bpPrev .art canvas{width:72px;height:72px}.bpPrev .art img{width:44px;height:44px}.bpPrev .nm{font-size:14px}
  .bpPrev .sb{font-size:11px!important}.bpPrev button{min-height:28px;padding:2px 10px}
  .bpTrack,.bpTags{padding-bottom:4px}.bpTrack,.bpCol,.bpTags{gap:4px}.bpCol,.bpTags{grid-template-rows:18px 1fr 1fr}.bpN{font-size:12px}
  .bpCol{flex-basis:74px}.bpCard{min-height:74px;padding:3px 2px 2px}.bpCard .ico,.bpCard .ico canvas{width:36px;height:36px}.bpCard .ico img{width:26px;height:26px}
  .bpCard .am{font-size:11px!important}.bpCard .st{font-size:9px}.bpCard button{min-height:22px;font-size:11px;padding:1px 8px}
  .bpNav,#ecoScr .bpMain~.ecNote{display:none}
  #ecoScr .rkBox{max-height:calc(100vh - 110px)}#ecoScr .ecNote{margin:4px 0}}
`);

// ---------- render ----------
const A = '    if (this.tab === "pass") {\n';
const Bm = '    } else if (this.tab === "mis") {\n';
const i0 = s.indexOf(A), i1 = s.indexOf(Bm);
if (i0 < 0 || i1 < i0 || s.indexOf(A, i0 + 1) >= 0) throw new Error('bloco do passe não encontrado');
const old = s.slice(i0, i1);
if (old.indexOf('ecLv') < 0) throw new Error('bloco do passe mudou');
s = s.slice(0, i0) + `    if (this.tab === "pass") {
      if (!P) return B.innerHTML = '<p class="ecNote">Nenhuma temporada ativa agora.</p>';
      this.passView(B, P, evH, esc);
` + s.slice(i1);

rep(`  act(b) {
    const a = b.dataset.act, done = (r) => this.got(r).then(() => this.show());`, `  // v28.8: trilha do passe. sel = prêmio na prévia ("nível:trilha"); a rolagem é mantida entre redesenhos.
  passIco(r, big) {
    if (r.k === "item" && LOOK.ITEMS[r.i]) return '<canvas data-th="' + r.i + '"' + (big ? ' data-full="1"' : "") + "></canvas>";
    return '<img alt="" src="' + (r.k === "zcoin" ? ICON_ZC : r.k === "chip" ? ICON_CHIP : ICON_GOLD) + '">';
  },
  passState(P, lv, l, t) {
    const done = (t === "free" ? P.free : P.prem).indexOf(l) >= 0;
    return done ? "done" : lv < l ? "lock" : t === "prem" && !P.premium ? "need" : "can";
  },
  passView(B, P, evH, esc) {
    const lv = Math.min(P.levels, Math.floor(P.xp / P.xp_per)), inLv = P.xp % P.xp_per, ends = new Date(P.ends), max = lv >= P.levels;
    const old = B.querySelector(".bpTrack"), keep = old ? old.scrollLeft : null, byL = {};
    (P.rewards || []).forEach((r) => (byL[r.l] = byL[r.l] || {})[r.t] = r);
    const tier = (r) => CHEST.tier({ kind: r.k, item: r.i });
    // prévia: o que o jogador escolheu; senão o primeiro prêmio para pegar; senão o próximo prêmio (de preferência roupa)
    if (!this.sel || !(byL[+this.sel.split(":")[0]] || {})[this.sel.split(":")[1]]) {
      let pick = null, next = null, nextItem = null;
      for (let l = 1; l <= P.levels && !pick; l++) for (const t of ["free", "prem"]) {
        const r = (byL[l] || {})[t];
        if (!r) continue;
        const st = this.passState(P, lv, l, t);
        if (st === "can") { pick = l + ":" + t; break; }
        if (l > lv && !next) next = l + ":" + t;
        if (l > lv && !nextItem && r.k === "item") nextItem = l + ":" + t;
      }
      this.sel = pick || nextItem || next || "1:free";
    }
    let h = evH + '<div class="bpHead"><div class="bpLv"><small>NÍVEL</small><b class="num">' + lv + '</b></div><div class="bpXp"><b>' + (max ? "Passe completo!" : "Rumo ao nível " + (lv + 1) + " de " + P.levels) + "</b><small>" + (max ? P.levels + " de " + P.levels : inLv + " / " + P.xp_per + " XP") + " · termina em " + ends.toLocaleDateString("pt-BR") + '</small><div class="ecPb"><i style="width:' + (max ? 100 : inLv / P.xp_per * 100) + '%"></i></div></div>' + (P.premium ? '<b class="bpPrem">★ PREMIUM</b>' : '<button class="btn yo" data-act="buypass">PREMIUM · ' + P.price + " Z</button>") + "</div>";
    h += '<div class="bpMain"><div class="bpPrev" id="bpPrev"></div><div class="bpRail"><div class="bpTags"><span></span><span>GRÁTIS</span><span class="p">★ PREMIUM</span></div><div><div class="bpTrack" id="bpTrack">';
    for (let l = 1; l <= P.levels; l++) {
      const R = byL[l] || {}, cell = (t) => {
        const r = R[t];
        if (!r) return '<div class="bpCard none ' + t + '"></div>';
        const st = this.passState(P, lv, l, t);
        return '<div class="bpCard ' + t + " " + st + " r" + tier(r) + (this.sel === l + ":" + t ? " sel" : "") + '" data-l="' + l + '" data-t="' + t + '"><div class="ico">' + this.passIco(r) + '</div><span class="am">' + esc(this.prize(r.k, r.a, r.i)) + "</span>" + (st === "can" ? '<button class="btn yo" data-act="claim" data-l="' + l + '" data-t="' + t + '">PEGAR</button>' : '<span class="st">' + (st === "done" ? "PEGO" : st === "need" ? "★ PREMIUM" : "🔒 NÍVEL " + l) + "</span>") + "</div>";
      };
      h += '<div class="bpCol' + (l <= lv ? " on" : l === lv + 1 ? " nx" : "") + '" data-l="' + l + '"><div class="bpN"><i style="width:' + (l === lv + 1 ? inLv / P.xp_per * 100 : 0) + '%"></i><span>' + l + "</span></div>" + cell("free") + cell("prem") + "</div>";
    }
    h += '</div><div class="bpNav"><button class="btn alt" data-bp="-1" aria-label="Voltar níveis">‹</button><button class="btn alt" data-bp="0">MEU NÍVEL</button><button class="btn alt" data-bp="1" aria-label="Avançar níveis">›</button></div></div></div></div>';
    h += '<p class="ecNote">XP de passe por partida: onda × 20 + abates + 200 por chefe. Missões dão mais. Toque num prêmio para ver.</p>';
    B.innerHTML = h;
    const tr = $("bpTrack"), center = (l, smooth) => {
      const c = tr.querySelector('.bpCol[data-l="' + l + '"]');
      if (!c) return;
      const x = c.offsetLeft - tr.offsetLeft - (tr.clientWidth - c.offsetWidth) / 2;
      if (smooth) tr.scrollTo({ left: x, behavior: "smooth" });
      else { tr.style.scrollBehavior = "auto"; tr.scrollLeft = x; tr.style.scrollBehavior = ""; }
    };
    B.querySelectorAll("canvas[data-th]").forEach((c) => LOOK.thumb(c, [c.dataset.th]));
    this.passPrev(P, lv, byL, esc);
    if (keep != null) { tr.style.scrollBehavior = "auto"; tr.scrollLeft = keep; tr.style.scrollBehavior = ""; }
    else center(+this.sel.split(":")[0]);
    tr.onclick = (e) => {
      if (e.target.closest("button[data-act]")) return;
      const c = e.target.closest(".bpCard[data-l]");
      if (!c) return;
      this.sel = c.dataset.l + ":" + c.dataset.t;
      tr.querySelectorAll(".bpCard.sel").forEach((x) => x.classList.remove("sel"));
      c.classList.add("sel");
      SFX.swap && SFX.swap();
      this.passPrev(P, lv, byL, esc);
    };
    // roda do mouse rola de lado no PC
    tr.onwheel = (e) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { tr.scrollLeft += e.deltaY; e.preventDefault(); }
    };
    B.querySelector(".bpNav").onclick = (e) => {
      const b = e.target.closest("button[data-bp]");
      if (!b) return;
      const d = +b.dataset.bp;
      if (!d) center(Math.min(P.levels, lv + 1), 1);
      else tr.scrollBy({ left: d * tr.clientWidth * 0.8, behavior: "smooth" });
    };
  },
  passPrev(P, lv, byL, esc) {
    const el = $("bpPrev"), [ls, t] = this.sel.split(":"), l = +ls, r = (byL[l] || {})[t];
    if (!el || !r) return;
    const st = this.passState(P, lv, l, t), it = r.k === "item" ? LOOK.ITEMS[r.i] : null, tr = CHEST.tier({ kind: r.k, item: r.i });
    const RN = ["comum", "incomum", "raro", "exclusivo", "lendário"];
    const tag = it ? "ROUPA · " + (RN[it.rar] || "").toUpperCase() : r.k === "zcoin" ? "Z-COIN" : r.k === "chip" ? "CHIP DE TECNOLOGIA" : "MOEDAS";
    const why = st === "done" ? "Você já pegou." : st === "can" ? "Liberado! Pegue agora." : st === "need" ? "Nível liberado. Precisa do passe premium." : "Falta " + Math.max(0, l * P.xp_per - P.xp) + " XP para o nível " + l + ".";
    el.className = "bpPrev r" + tr;
    el.innerHTML = '<div class="art">' + this.passIco(r, 1) + '</div><div><span class="tg">' + tag + '</span><div class="nm">' + esc(this.prize(r.k, r.a, r.i)) + '</div><div class="sb">Nível ' + l + " · trilha " + (t === "prem" ? "★ premium" : "grátis") + '</div><div class="sb">' + why + "</div>" + (st === "can" ? '<button class="btn yo" data-act="claim" data-l="' + l + '" data-t="' + t + '">PEGAR</button>' : "") + "</div>";
    el.querySelectorAll("canvas[data-th]").forEach((c) => LOOK.thumb(c, [c.dataset.th], { full: !!c.dataset.full }));
  },
  act(b) {
    const a = b.dataset.act, done = (r) => this.got(r).then(() => this.show());`);

fs.writeFileSync(F, s);
console.log('ok');
