// v29: ITENS RECEBIDOS. Antes do relatório de fim de partida, uma tela mostra o que você ganhou, um cartão
// por vez: moedas e XP contando, nível novo, XP de passe, caixa, chips e Z-Coin dos chefes, roupas exclusivas
// liberadas e quebrada nova. Os comuns entram rápido; os raros (roxo) e lendários (ouro) entram por último,
// com o verso tremendo antes de virar, raios e faíscas na cor da raridade (as mesmas cores da aura v29).
// O que o servidor devolve depois (submit_run: moedas, XP, nível, passe, caixa) entra na fila quando chega.
// Toque/Enter: primeiro mostra tudo de uma vez, depois vai pro relatório. Gráficos baixos e "reduzir
// movimento" tiram os raios girando e as faíscas.
// Uso: node tools/patches/v29-itens-recebidos.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
if (s.includes('const LOOT = {')) { console.log('já aplicado'); process.exit(0); }
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

// ---------- 1. CSS ----------
rep(`#chestFx{position:fixed;`, `/* ==== ITENS RECEBIDOS (v29): cartões antes do relatório de fim de partida ==== */
#lootFx{position:fixed;inset:0;z-index:58;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:clamp(8px,3vh,22px);padding:max(10px,var(--sat)) max(12px,var(--sar)) max(10px,var(--sab)) max(12px,var(--sal));box-sizing:border-box;background:radial-gradient(ellipse at 50% 55%,rgba(40,26,64,.94),rgba(0,0,0,.97) 72%);cursor:pointer;touch-action:manipulation;user-select:none;-webkit-user-select:none;overflow:hidden}
#lootFx.hidden{display:none}
#lootFx.out{animation:ltOut .32s ease-in forwards}
#lootFx.shake{animation:ltShake .42s linear}
.ltHead{text-align:center;animation:ltHead .5s cubic-bezier(.2,1.5,.4,1) both}
.ltHead b{display:block;font-family:var(--fz);font-weight:400;font-size:clamp(26px,7vh,52px);letter-spacing:3px;color:#ffd84a;text-shadow:3px 3px 0 #000,0 0 18px rgba(255,216,74,.35);line-height:1}
.ltHead small{display:block;margin-top:4px;font:600 clamp(12px,2.6vh,15px)/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#a59fb4}
.ltRow{display:flex;flex-wrap:wrap;justify-content:center;align-items:stretch;gap:clamp(8px,2.2vh,16px);max-width:min(1100px,100%);perspective:700px}
.ltCard{--rc:#e9e4d8;--cw:clamp(104px,17vh,148px);position:relative;width:var(--cw);min-height:calc(var(--cw)*1.32);box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:3px;padding:8px 6px 9px;background:linear-gradient(#221d2c,#15121b);border:3px solid #000;box-shadow:inset 0 0 0 2px #3a3446,inset 0 4px 0 var(--rc),4px 4px 0 rgba(0,0,0,.55);animation:ltIn .5s cubic-bezier(.2,1.5,.4,1) both;transform-style:preserve-3d}
.ltCard.t2,.ltCard.t3{box-shadow:inset 0 0 0 2px var(--rc),inset 0 4px 0 var(--rc),0 0 18px color-mix(in srgb,var(--rc) 55%,transparent),4px 4px 0 rgba(0,0,0,.55)}
.ltCard.t3{--cw:clamp(118px,20vh,172px)}
.ltCard .ltBack{position:absolute;inset:-3px;display:grid;place-items:center;border:3px solid #000;background:repeating-linear-gradient(135deg,#231c30 0 8px,#1a1524 8px 16px);box-shadow:inset 0 0 0 2px var(--rc);font-family:var(--fz);font-size:calc(var(--cw)*.42);color:var(--rc);text-shadow:0 0 14px var(--rc),3px 3px 0 #000;z-index:3;backface-visibility:hidden}
.ltCard.charge{animation:ltCharge .7s linear both}
.ltCard.charge .ltBack{animation:ltGlow .7s ease-in both}
.ltCard.flip{animation:ltFlip .42s cubic-bezier(.2,1.4,.4,1) both}
.ltCard.flip .ltBack{animation:ltBackOff .21s linear forwards}
.ltCard:not(.charge):not(.flip) .ltBack{display:none}
.ltRays{position:absolute;left:50%;top:42%;width:calc(var(--cw)*2.3);aspect-ratio:1;translate:-50% -50%;z-index:-1;pointer-events:none;border-radius:50%;background:repeating-conic-gradient(from 0deg,color-mix(in srgb,var(--rc) 55%,transparent) 0 9deg,transparent 9deg 24deg);-webkit-mask:radial-gradient(circle,#000 18%,transparent 68%);mask:radial-gradient(circle,#000 18%,transparent 68%);opacity:0;animation:ltRays 7s linear infinite,ltFade .5s .05s ease-out forwards}
.ltIc{flex:1 1 auto;display:grid;place-items:center;width:100%;min-height:calc(var(--cw)*.62)}
.ltIc img,.ltIc canvas{width:calc(var(--cw)*.56);height:calc(var(--cw)*.56);object-fit:contain;image-rendering:pixelated}
.ltCard.t2 .ltIc img,.ltCard.t2 .ltIc canvas,.ltCard.t3 .ltIc img,.ltCard.t3 .ltIc canvas{filter:drop-shadow(0 0 8px var(--rc)) drop-shadow(0 0 3px var(--rc))}
.ltIc canvas.map{width:calc(var(--cw)*.9);height:calc(var(--cw)*.52);border:2px solid #000;box-shadow:0 0 0 1px var(--rc);image-rendering:auto}
.ltIc .gl.sy{font-family:system-ui,sans-serif;font-size:calc(var(--cw)*.4)}
.ltIc .gl{font-family:var(--fz);font-size:calc(var(--cw)*.36);line-height:1;color:var(--rc);text-shadow:3px 3px 0 #000,0 0 12px color-mix(in srgb,var(--rc) 50%,transparent)}
.ltV{font-family:var(--fz);font-weight:400;font-size:calc(var(--cw)*.2);line-height:1;color:#fff;text-shadow:2px 2px 0 #000;white-space:nowrap}
.ltN{font:800 clamp(11px,2.3vh,14px)/1.15 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#e9e4d8;text-align:center;max-width:100%;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.ltR{font:900 clamp(10px,1.9vh,12px)/1.1 system-ui,sans-serif;letter-spacing:1px;text-align:center;color:var(--rc);text-shadow:0 0 8px var(--rc),1px 1px 0 #000}
.ltCard.t1 .ltR{color:#a59fb4;text-shadow:1px 1px 0 #000}
.ltSp{position:absolute;left:50%;top:42%;width:6px;height:6px;margin:-3px;background:var(--rc);box-shadow:0 0 6px var(--rc);pointer-events:none;z-index:4;animation:ltSp .9s ease-out forwards}
.ltFlash{position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle,var(--rc),transparent 70%);opacity:0;animation:ltFlash .55s ease-out forwards;z-index:-1}
.ltFoot{display:flex;flex-direction:column;align-items:center;gap:6px;min-height:58px}
.ltFoot .btn{opacity:0;transform:translateY(8px);transition:opacity .3s,transform .3s;pointer-events:none}
#lootFx.done .ltFoot .btn{opacity:1;transform:none;pointer-events:auto;animation:ltPulse 1.6s ease-in-out .4s infinite}
.ltFoot small{font:600 12px/1.2 system-ui,sans-serif;color:#7a7488}
#lootFx.done .ltFoot small{visibility:hidden}
.ltWait{font:600 13px/1.2 system-ui,sans-serif;color:#a59fb4}
.ltWait::after{content:"";display:inline-block;width:1.2em;text-align:left;animation:ltDots 1s steps(4) infinite}
#lootFx.lo .ltRays,#lootFx.lo .ltSp{display:none}
/* celular deitado: uma fileira só, com rolagem lateral; o cartão novo rola pra vista */
@media (max-height:500px){#lootFx{gap:6px}.ltRow{flex-wrap:nowrap;justify-content:flex-start;overflow-x:auto;overflow-y:visible;width:100%;max-width:100%;padding:26px 8px 18px;scroll-snap-type:x proximity;scrollbar-width:none}.ltRow::-webkit-scrollbar{display:none}.ltRow>.ltCard:first-child{margin-left:auto}.ltRow>.ltCard:last-child{margin-right:auto}.ltCard{flex:0 0 auto;scroll-snap-align:center;--cw:clamp(96px,30vh,124px)}.ltCard.t3{--cw:clamp(104px,33vh,134px)}.ltHead b{font-size:clamp(22px,8vh,34px)}.ltFoot{min-height:46px}}
@keyframes ltHead{from{transform:scale(.4) translateY(-20px);opacity:0}}
@keyframes ltIn{0%{transform:translateY(46px) rotateY(80deg) scale(.6);opacity:0}100%{transform:none;opacity:1}}
@keyframes ltCharge{0%{transform:scale(.6);opacity:0}15%{transform:scale(1);opacity:1}30%,100%{transform:translateX(0)}35%{transform:translateX(-2px) rotate(-1deg)}45%{transform:translateX(3px) rotate(1.5deg)}55%{transform:translateX(-3px) rotate(-2deg)}65%{transform:translateX(4px) rotate(2deg) scale(1.03)}75%{transform:translateX(-4px) rotate(-2.5deg) scale(1.05)}85%{transform:translateX(4px) rotate(3deg) scale(1.07)}95%{transform:translateX(-3px) scale(1.08)}}
@keyframes ltGlow{to{box-shadow:inset 0 0 0 2px var(--rc),0 0 26px var(--rc);filter:brightness(1.5)}}
@keyframes ltFlip{0%{transform:rotateY(90deg) scale(1.08)}60%{transform:rotateY(-10deg) scale(1.12)}100%{transform:none}}
@keyframes ltBackOff{to{opacity:0}}
@keyframes ltRays{to{rotate:360deg}}
@keyframes ltFade{to{opacity:1}}
@keyframes ltSp{0%{transform:none;opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(.3);opacity:0}}
@keyframes ltFlash{0%{opacity:.55}100%{opacity:0}}
@keyframes ltPulse{0%,100%{box-shadow:0 0 0 rgba(255,216,74,0)}50%{box-shadow:0 0 16px rgba(255,216,74,.7)}}
@keyframes ltShake{0%,100%{transform:none}20%{transform:translate(-5px,2px)}40%{transform:translate(5px,-3px)}60%{transform:translate(-4px,3px)}80%{transform:translate(3px,-2px)}}
@keyframes ltOut{to{opacity:0;transform:scale(1.04)}}
@keyframes ltDots{0%{content:""}25%{content:"."}50%{content:".."}75%{content:"..."}}
@media (prefers-reduced-motion:reduce){#lootFx *,#lootFx{animation-duration:.01s!important;animation-iteration-count:1!important}.ltRays,.ltSp{display:none}}
#chestFx{position:fixed;`);

// ---------- 2. HTML: a tela fica por cima do relatório ----------
rep(`<div id="rotate"><div class="ph"></div>`, `<div id="lootFx" class="hidden" role="dialog" aria-label="Itens recebidos"><div class="ltHead"><b class="yo">ITENS RECEBIDOS</b><small id="ltSub"></small></div><div class="ltRow" id="ltRow"></div><div class="ltFoot"><span class="ltWait hidden" id="ltWait">conferindo com o servidor</span><button class="btn yo" id="ltGo">VER RELATORIO</button><small>toque para pular</small></div></div>

<div id="rotate"><div class="ph"></div>`);

// ---------- 3. JS: objeto LOOT (antes do CHEST, que ele imita no som e nas cores) ----------
rep(`const CHEST = {
  C: [`, `// v29: tela ITENS RECEBIDOS antes do relatório de fim de partida (ver tools/patches/v29-itens-recebidos.js)
const LOOT = {
  // cores de raridade: as mesmas da aura v29 (raro/exclusivo roxo, lendário ouro)
  RC: { 1: "#e9e4d8", 2: "rgb(196,108,255)", 3: "rgb(255,184,46)" },
  RN: { 1: "COMUM", 2: "RARO", 3: "LENDÁRIO" },
  on: 0, q: [], cards: {}, pend: 0, busy: 0, all: 0, tm: 0,
  el: () => document.getElementById("lootFx"),
  // abre por cima do relatório. pend: ainda espera a resposta do servidor
  open(pend) {
    const el = this.el();
    clearTimeout(this.tm); clearTimeout(this.safe);
    this.on = 1; this.t0 = performance.now(); this.q = []; this.cards = {}; this.pend = !!pend; this.busy = 0; this.all = 0; this.n = 0;
    $("ltRow").innerHTML = "";
    $("ltSub").textContent = "";
    el.className = typeof QUAL !== "undefined" && QUAL.tier >= 2 ? "lo" : "";
    $("ltWait").classList.toggle("hidden", !this.pend);
    // o servidor pode não responder: depois de 5 s a fila fecha com o que tiver
    if (this.pend) this.safe = setTimeout(() => this.done(), 5000);
    this.tm = setTimeout(() => this.next(), 520);
  },
  /** soma um prêmio. k: coins|xp|lvl|pass|box|chip|zcoin|item|map. a: quantidade/valor, o: extras */
  add(k, a, o) {
    if (!this.on) return;
    o = o || {};
    const key = k === "item" || k === "map" ? k + ":" + o.id : k, c = this.cards[key];
    // já mostrado: só atualiza o número (ex.: moedas do servidor no lugar da conta local)
    if (c) {
      if (o.set || k === "lvl") c.a = a; else if (k !== "item" && k !== "map") c.a += a;
      if (o.sub) c.sub = o.sub;
      if (c.el) this.fill(c);
      return;
    }
    if ((k === "coins" || k === "xp" || k === "pass" || k === "chip" || k === "zcoin" || k === "box") && !(a > 0)) return;
    const it = k === "item" ? LOOK.ITEMS[o.id] : null;
    const t = it ? (it.rar >= 4 ? 3 : it.rar >= 2 ? 2 : 1) : k === "zcoin" || k === "chip" || k === "map" ? 2 : k === "lvl" ? 2 : 1;
    const card = { k, a, t, id: o.id, sub: o.sub || "", ord: this.n++ };
    this.cards[key] = card;
    this.q.push(card);
    // comuns primeiro, depois raros, lendários por último
    this.q.sort((x, y) => x.t - y.t || x.ord - y.ord);
    if (!this.busy && !this.tm) this.next();
  },
  items(ids) {
    (ids || []).forEach((id) => LOOK.ITEMS[id] && this.add("item", 1, { id }));
  },
  // o servidor respondeu (ou desistiu): sem mais espera
  done() {
    clearTimeout(this.safe);
    this.pend = 0;
    $("ltWait").classList.add("hidden");
    if (!this.busy && !this.tm) this.next();
  },
  next() {
    this.tm = 0;
    if (!this.on) return;
    // esperando o servidor (até 1,8 s): assim a fila sai em ordem, comuns antes dos raros
    if (this.pend && !this.all && performance.now() - this.t0 < 1800) { this.tm = setTimeout(() => this.next(), 120); return; }
    const c = this.q.shift();
    if (!c) {
      this.busy = 0;
      if (!this.pend) this.finish();
      return;
    }
    this.busy = 1;
    this.el().classList.remove("done");
    const fast = this.all || (typeof REDUCED !== "undefined" && REDUCED.matches);
    const el = this.card(c), row = $("ltRow");
    row.append(el);
    if (row.scrollWidth > row.clientWidth) try { el.scrollIntoView({ behavior: fast ? "auto" : "smooth", inline: "center", block: "nearest" }); } catch (e) {}
    if (c.t >= 2 && !fast) {
      // raro/lendário: verso tremendo e brilhando, depois vira
      el.classList.add("charge");
      try { SFX.whoosh(); } catch (e) {}
      this.tm = setTimeout(() => {
        el.classList.remove("charge");
        el.classList.add("flip");
        this.burst(el, c);
        this.count(c);
        this.tm = setTimeout(() => this.next(), c.t >= 3 ? 950 : 650);
      }, 720);
    } else {
      if (!fast) try { SFX.swap(); } catch (e) {}
      if (c.t >= 2) this.burst(el, c, 1);
      this.count(c, fast);
      this.tm = setTimeout(() => this.next(), fast ? 60 : 380);
    }
  },
  card(c) {
    const el = document.createElement("div"), col = this.RC[c.t];
    el.className = "ltCard t" + c.t;
    el.style.setProperty("--rc", c.k === "coins" ? "#ffd84a" : c.k === "xp" || c.k === "lvl" ? "#7dff6a" : c.k === "pass" ? "#3ee6c8" : c.k === "map" ? "#ff9a3a" : col);
    el.innerHTML = (c.t >= 2 ? '<div class="ltRays"></div><div class="ltBack">?</div>' : "") + '<div class="ltIc"></div><b class="ltV"></b><span class="ltN"></span><small class="ltR"></small>';
    const ic = el.querySelector(".ltIc"), img = (src) => { const im = new Image(); im.alt = ""; im.src = src; ic.append(im); }, gl = (t, sy) => { const b = document.createElement("span"); b.className = "gl" + (sy ? " sy" : ""); b.textContent = t; ic.append(b); };
    if (c.k === "coins") img(ICON_GOLD);
    else if (c.k === "zcoin") img(ICON_ZC);
    else if (c.k === "chip") img(ICON_CHIP);
    else if (c.k === "box") img(this.boxIcon());
    else if (c.k === "xp") gl("XP");
    else if (c.k === "pass") gl("★", 1);
    else if (c.k === "lvl") gl("▲", 1);
    else if (c.k === "item") { const cv = document.createElement("canvas"); try { LOOK.thumb(cv, [c.id]); } catch (e) {} ic.append(cv); }
    else if (c.k === "map") {
      try { const mi = MAPS.findIndex((m) => m.id === c.id), cv = scenePreview(mi, 192, 108); cv.className = "map"; ic.append(cv); } catch (e) { gl("⌂"); }
    }
    c.el = el;
    this.fill(c, 1);
    return el;
  },
  // textos do cartão; v0: número começa em zero (vai contar)
  fill(c, v0) {
    const el = c.el, V = el.querySelector(".ltV"), N = el.querySelector(".ltN"), R = el.querySelector(".ltR");
    const nm = { coins: "MOEDAS", xp: "XP DE NÍVEL", pass: "XP DO PASSE", box: c.a > 1 ? "CAIXAS" : "CAIXA", chip: c.a > 1 ? "CHIPS DE TECNOLOGIA" : "CHIP DE TECNOLOGIA", zcoin: "Z-COIN" }[c.k];
    if (c.k === "lvl") { V.textContent = "NÍVEL " + c.a; N.textContent = c.sub || "Subiu de nível!"; R.textContent = "NÍVEL NOVO"; }
    else if (c.k === "item") { const it = LOOK.ITEMS[c.id]; V.textContent = ""; N.textContent = it ? it.name : c.id; R.textContent = this.RN[c.t]; }
    else if (c.k === "map") { V.textContent = ""; N.textContent = c.sub; R.textContent = "QUEBRADA NOVA"; }
    else { V.textContent = c.k === "box" ? (c.a > 1 ? "x" + c.a : "") : "+" + (v0 && !c.shown && c.a >= 4 ? 0 : c.a); N.textContent = nm; R.textContent = c.t >= 2 ? this.RN[c.t] : c.k === "box" ? "ABRA NO PASSE" : ""; }
    V.style.display = V.textContent ? "" : "none";
  },
  // número contando de 0 até o valor
  count(c, fast) {
    const V = c.el.querySelector(".ltV"), pre = "+";
    if (!/^(coins|xp|pass|chip|zcoin)$/.test(c.k) || fast || c.a < 4) { c.shown = 1; this.fill(c); return; }
    const t0 = performance.now(), dur = Math.min(900, 300 + c.a / 6);
    const step = () => {
      if (!this.on) return;
      const k = Math.min(1, (performance.now() - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      V.textContent = pre + Math.round(c.a * e);
      if (k < 1 && !this.all) requestAnimationFrame(step); else { c.shown = 1; this.fill(c); }
    };
    requestAnimationFrame(step);
  },
  burst(el, c, quiet) {
    if (!quiet) try { (c.t >= 3 ? SFX.perk : SFX.buy)(); } catch (e) {}
    const lo = typeof QUAL !== "undefined" && QUAL.tier >= 2, n = lo ? 0 : c.t >= 3 ? 22 : 12;
    for (let i = 0; i < n; i++) {
      const p = document.createElement("i"), a = Math.random() * Math.PI * 2, d = 50 + Math.random() * (c.t >= 3 ? 110 : 70);
      p.className = "ltSp";
      p.style.setProperty("--dx", Math.cos(a) * d + "px");
      p.style.setProperty("--dy", Math.sin(a) * d - 20 + "px");
      p.style.animationDelay = Math.random() * 0.12 + "s";
      el.append(p);
      setTimeout(() => p.remove(), 1200);
    }
    if (!quiet && c.t >= 3) {
      const f = document.createElement("div"), fx = this.el();
      f.className = "ltFlash";
      f.style.setProperty("--rc", this.RC[3]);
      fx.append(f);
      setTimeout(() => f.remove(), 700);
      fx.classList.remove("shake"); void fx.offsetWidth; fx.classList.add("shake");
    }
  },
  finish() {
    const el = this.el();
    if (!$("ltRow").children.length) return this.close(); // nada pra mostrar
    el.classList.add("done");
    const n = $("ltRow").children.length, best = Math.max(0, ...Object.values(this.cards).map((c) => c.t));
    $("ltSub").textContent = n + (n > 1 ? " prêmios" : " prêmio") + (best >= 3 ? " · tem LENDÁRIO!" : best >= 2 && Object.values(this.cards).some((c) => c.k === "item" && c.t >= 2) ? " · tem roupa RARA!" : "");
  },
  // toque: 1º mostra tudo de uma vez; 2º fecha e mostra o relatório
  tap() {
    if (!this.on) return;
    const el = this.el();
    if (el.classList.contains("done")) return this.close();
    this.all = 1;
    clearTimeout(this.tm); this.tm = 0;
    $("ltRow").querySelectorAll(".charge,.flip").forEach((e) => e.classList.remove("charge", "flip"));
    Object.values(this.cards).forEach((c) => { if (c.el) { c.shown = 1; this.fill(c); } });
    while (this.q.length) { this.next(); clearTimeout(this.tm); this.tm = 0; }
    this.busy = 0;
    if (!this.pend) this.finish();
  },
  close() {
    if (!this.on) return;
    const el = this.el();
    this.on = 0;
    clearTimeout(this.tm); clearTimeout(this.safe); this.tm = 0;
    el.classList.add("out");
    setTimeout(() => { if (!this.on) el.className = "hidden"; }, 320);
    try { SFX.swap(); } catch (e) {}
  },
  // baú de madeira em pixel art (igual ao das caixas grátis)
  boxIcon() {
    return this._box || (this._box = pixIcon(["............", "..aaaaaaaa..", ".abbbbbbbba.", ".acbbbbbbca.", ".aaaaddaaaa.", ".acbbdebbca.", ".abbbddbbba.", ".acbbbbbbca.", ".abbbbbbbba.", ".acbbbbbbca.", "..aaaaaaaa..", "............"], { a: "#0a0608", b: "#7a4a24", c: "#8a8478", d: "#d8a820", e: "#2a1a08" }));
  }
};
$("lootFx").onclick = (e) => { if (e.target.id === "ltGo") { e.stopPropagation(); LOOT.close(); } else LOOT.tap(); };
addEventListener("keydown", (e) => {
  if (!LOOT.on || !["Enter", "Space", "Escape", "NumpadEnter"].includes(e.code)) return;
  e.preventDefault(); e.stopImmediatePropagation();
  if (e.code === "Escape") LOOT.close(); else LOOT.tap();
}, true);
const CHEST = {
  C: [`);

// ---------- 4. fim de partida: monta a fila ----------
rep(`    if (!S.lab) NET.endRun({ wave: S.round, kills: S.stats.kills, shots: S.stats.shots, hits: S.stats.hitShots, bosses: S.stats.boss || 0, won: win, heads: S.stats.head, night: S.period === "noite" }).then((r) => {
      if (srv) ECO.runMeta(r);
      if (!r || !r.ok) return;
      ECO.refresh();`, `    // v29: ITENS RECEBIDOS por cima do relatório. Com conta, moedas/XP/nível vêm do servidor (runMeta)
    LOOT.open(!S.lab);
    if (!srv) { LOOT.add("coins", coins); LOOT.add("xp", xp); }
    (S.loot || []).forEach((l) => LOOT.add(l.k, l.a));
    if (S.lab) LOOT.done();
    if (!S.lab) NET.endRun({ wave: S.round, kills: S.stats.kills, shots: S.stats.shots, hits: S.stats.hitShots, bosses: S.stats.boss || 0, won: win, heads: S.stats.head, night: S.period === "noite" }).then((r) => {
      if (srv) ECO.runMeta(r);
      if (!r || !r.ok) return LOOT.done();
      LOOT.add("pass", r.pass_xp | 0);
      if (r.box) LOOT.add("box", 1);
      // roupas liberadas pelo nível do servidor aparecem no refresh (LOOK.checkUnlocks avisa o LOOT)
      ECO.refresh().then(() => LOOT.done(), () => LOOT.done());`);
rep(`    const lvR = srv ? { ups: 0, msg: [] } : LEVEL.gain(D, xp), ups = lvR.ups;`, `    const lvR = srv ? { ups: 0, msg: [] } : LEVEL.gain(D, xp), ups = lvR.ups;
    if (ups) LOOT.add("lvl", D.level, { sub: lvR.msg.join(" · ") });`);
rep(`    $("unlockMsg").textContent = !nx ? win ?`, `    if (nx && (win || S.unlockedNow) && !wasWon) LOOT.add("map", 1, { id: nx.id, sub: nx.name });
    $("unlockMsg").textContent = !nx ? win ?`);

// ---------- 5. servidor: moedas, XP e nível do submit_run ----------
rep(`    if (!r) return add("Sem conexão com o servidor: moedas e XP desta partida não contaram");
    if (!r.ok) return add("Partida recusada pelo servidor (" + (r.reason || "?") + "): sem moedas e XP");
    const D = SAVE.d, lv0 = D.level;`, `    if (!r) return add("Sem conexão com o servidor: moedas e XP desta partida não contaram");
    if (!r.ok) return add("Partida recusada pelo servidor (" + (r.reason || "?") + "): sem moedas e XP");
    const D = SAVE.d, lv0 = D.level;
    LOOT.add("coins", r.coins | 0, { set: 1 });
    LOOT.add("xp", r.char_xp | 0, { set: 1 });`);
rep(`      const msg = LEVEL.pay(D, lv0, true);
      SAVE.save();
      if (msg.length) add("Nível novo: " + msg.join(", "));`, `      const msg = LEVEL.pay(D, lv0, true);
      SAVE.save();
      LOOT.add("lvl", D.level, { sub: msg.join(" · ") });
      if (msg.length) add("Nível novo: " + msg.join(", "));`);

// ---------- 6. drops de chefe guardados na partida ----------
rep(`      if (r.chip) {
        this.chips++;`, `      if (r.chip) {
        (S.loot = S.loot || []).push({ k: "chip", a: 1 });
        this.chips++;`);
rep(`      if (r.zcoin) {
        this.zcoin += r.zcoin;`, `      if (r.zcoin) {
        (S.loot = S.loot || []).push({ k: "zcoin", a: r.zcoin });
        this.zcoin += r.zcoin;`);
rep(`  S.stats = { kills: 0, head: 0, melee: 0, doors: 0, special: 0, boss: 0, shots: 0, hitShots: 0, crits: 0, dmg: 0, bestHit: 0, spent: 0, picked: 0, lost: 0, bestRound: 0, hurt: 0, t: 0, wk: {} };
  S.shopOpen = false;`, `  S.stats = { kills: 0, head: 0, melee: 0, doors: 0, special: 0, boss: 0, shots: 0, hitShots: 0, crits: 0, dmg: 0, bestHit: 0, spent: 0, picked: 0, lost: 0, bestRound: 0, hurt: 0, t: 0, wk: {} };
  S.loot = [];
  S.shopOpen = false;`);

// ---------- 7. roupas exclusivas liberadas: o LOOT recebe os ids ----------
rep(`    if (fresh.length) SAVE.save();
    return fresh.map((k) => ITEMS[k].name);`, `    if (fresh.length) SAVE.save();
    if (fresh.length && typeof LOOT !== "undefined") LOOT.items(fresh);
    return fresh.map((k) => ITEMS[k].name);`);

fs.writeFileSync(F, s);
console.log('ok: v29 itens recebidos');
