// v29: loja de roupas e inventário mais bonitos e fáceis de usar.
// - Filtro por raridade (com contagem), busca por nome sem acento e "só o que não tenho", na loja e no inventário.
// - Moldura e fundo com a cor da raridade em todo card (antes só o lendário tinha).
// - Loja ganha aba TUDO e um PROVADOR: tocar num item veste ele no seu personagem, num palco à esquerda.
// - Cards menores no celular deitado (cabem 2 a 3 vezes mais itens por tela), rodapé curto.
// - Inventário: os 8 espaços numa faixa só, contagem de itens.
// Uso: node tools/patches/v29-loja.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};
const cut = (from, to, b) => {
  const i = s.indexOf(from), j = s.indexOf(to, i);
  if (i < 0 || j < 0 || s.indexOf(from, i + 1) >= 0) throw new Error('cut ' + from.slice(0, 60));
  s = s.slice(0, i) + b + s.slice(j);
};
if (s.includes('/* ==== LOJA v29')) throw new Error('v29-loja já aplicado');

// ---------- 1. CSS ----------
rep(`.lkKit .d{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}\n`, `.lkKit .d{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
/* ==== LOJA v29: raridade, filtros, provador ==== */
.r0{--rc:#9a94a6;--rg:rgba(154,148,166,.10)}.r1{--rc:#3a8ad8;--rg:rgba(58,138,216,.20)}.r2{--rc:#b05ae8;--rg:rgba(176,90,232,.22)}.r3{--rc:#e8b840;--rg:rgba(232,184,64,.24)}.r4{--rc:#ff8a1a;--rg:rgba(255,138,26,.28)}
.lkShopItem[class*=" r"],.lkItem[class*=" r"]{border-color:#000;box-shadow:inset 0 0 0 2px var(--rc);background:linear-gradient(to top,var(--rg),transparent 70%),#1f1b27}
.lkShopItem[class*=" r"] .rar{background:var(--rc);color:#120e1a;text-transform:uppercase;font-size:10px;letter-spacing:.5px}
.lkShopItem[class*=" r"] canvas,.lkItem[class*=" r"] canvas{background:radial-gradient(circle at 50% 60%,var(--rg),transparent 70%),radial-gradient(circle at 50% 55%,#2c2638,#16131d 70%)}
.lkItem{position:relative}.lkItem .rb{position:absolute;left:3px;top:3px;width:8px;height:8px;background:var(--rc);border:1px solid #000}
.lkItem.on{border-color:#2aa83c;box-shadow:inset 0 0 0 2px #2aa83c}
.lkShopItem.try{outline:3px solid #fff;outline-offset:-1px}
.lkShopItem .th{position:relative;align-self:center;line-height:0}
.lkShopItem .own{position:absolute;left:-2px;bottom:-2px;font-style:normal;font-size:10px;padding:1px 4px;background:#2aa83c;color:#fff;border:1px solid #000;line-height:1.1}
.flBar{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:4px;align-items:center;flex:0 0 auto}
.flQ{font:600 16px/1.1 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;padding:5px 8px;background:#120e1a;color:#fff;border:2px solid #000;box-shadow:inset 0 0 0 1px #3a3446;width:150px;min-height:32px;border-radius:0;-webkit-appearance:none;appearance:none}
.flQ::placeholder{color:#6a6478}
.flChip{font-size:13px;padding:3px 7px;min-height:30px;background:#24202d;color:#e9e4d8;border:2px solid #000;display:inline-flex;gap:5px;align-items:center}.flChip.all{--rc:#e01010}.flChip.all.on{color:#fff}.flChip.all.on small{color:#ffd0d0}
.flChip i{width:9px;height:9px;background:var(--rc);border:1px solid #000;font-style:normal}
.flChip small{color:#8a8494;font:700 11px/1 system-ui,sans-serif}
.flChip.on{background:var(--rc);color:#120e1a;box-shadow:inset 0 -3px 0 rgba(0,0,0,.35)}.flChip.on small{color:#120e1a}
.flChip:disabled{opacity:.35}
.flChip.tg.on{--rc:#2aa83c;color:#fff}.flChip.tg.on small{color:#fff}
.flCount{font:600 12px/1 system-ui,sans-serif;color:#8a8494;margin-left:auto}
.flEmpty{grid-column:1/-1;font:600 14px/1.3 system-ui,sans-serif;color:#8a8494;padding:14px 4px;text-align:center}
#mshop .panel{max-width:min(1180px,98vw);width:100%}
.msBody{display:flex;gap:10px;flex:1 1 auto;min-height:0}
.msStage{flex:0 0 196px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 6px;background:radial-gradient(ellipse at 50% 30%,rgba(255,216,74,.10),transparent 65%),#16131d;border:2px solid #000;box-shadow:inset 0 0 0 1px #3a3446;overflow:hidden}
.msStage .stH{font-size:13px;letter-spacing:1px;color:#ffd84a}
#msPrev{width:176px;height:176px;image-rendering:pixelated;background:radial-gradient(ellipse at 50% 88%,var(--rg,rgba(255,255,255,.06)) 0,transparent 55%),radial-gradient(ellipse at 50% 80%,#2c2638 0,#17141e 70%);border:2px solid #000;cursor:pointer;flex:0 0 auto}
.msTry{display:flex;flex-direction:column;align-items:center;gap:3px;text-align:center;min-height:0}
.msTry b{font-size:15px;color:#fff;line-height:1.05}
.msTry i{font-style:normal;font-size:10px;padding:1px 5px;background:var(--rc,#3a3446);color:#120e1a;border:1px solid #000;text-transform:uppercase;letter-spacing:.5px}
.msTry p{margin:0;font:600 12px/1.25 system-ui,sans-serif;color:#8a8494}
.msTry .tryOff{font-size:12px;padding:4px 8px;background:#24202d;color:#e9e4d8;border:2px solid #000}
#mshop .msGrid{grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:6px;overflow:auto;flex:1 1 auto;min-width:0}
#mshop .msItem{cursor:pointer}
#mshop .lkShopItem canvas,#mshop .lkKit canvas{width:84px;height:84px}
#mshop .msItem .n{font-size:15px}
#mshop .segNote{font-size:12px;text-align:center}
.lkSlotsR{grid-template-columns:repeat(8,minmax(0,1fr))}
.lkSlot{min-height:36px;padding:3px 5px}
.invBar{display:flex;flex-direction:column;gap:4px}
@media (max-height:500px){
  #mshop .panel{padding-top:6px;padding-bottom:6px}
  #mshop h3{display:none}
  #mshop .msHead{margin-bottom:4px}
  .msStage{flex-basis:138px;padding:4px}
  #msPrev{width:128px;height:128px}
  .msTry b{font-size:13px}.msTry p{display:none}
  #mshop .msGrid{grid-template-columns:repeat(auto-fill,minmax(104px,1fr));gap:4px}
  #mshop .msItem{padding:3px 4px;gap:2px}
  #mshop .lkShopItem canvas,#mshop .lkKit canvas{width:54px;height:54px}
  #mshop .msItem .n{font-size:12px;padding-right:0;min-height:2.1em;margin-top:12px}
  #mshop .lkKit .n{margin-top:0;padding-right:30px}
  #mshop .lkKit .d{display:none}
  #mshop .msItem button{font-size:12px;padding:3px 2px}
  #mshop .msItem .rar{font-size:9px;left:3px;right:auto;top:3px}
  #mshop .lkShopItem .own{font-size:9px;padding:0 3px}
  #mshop .segNote{display:none}
  #mshop .row .btn{font-size:16px;padding:3px 18px}
  .msSub button{padding:4px 7px;font-size:13px}
  .flChip{min-height:28px;padding:2px 6px;font-size:12px}
  .flQ{width:120px;min-height:28px;padding:3px 6px}
  .lkSlotsR{gap:2px}.lkSlot{min-height:32px;padding:2px 4px}.lkSlot b{font-size:10px}.lkSlot span{font-size:11px}
  .lkItem{min-height:0;padding:3px}.lkItem canvas{width:56px;height:56px}.lkItem .nm{font-size:11px}
  .lkGrid{grid-template-columns:repeat(auto-fill,minmax(74px,1fr));gap:4px}
}
@media (max-width:700px){.msStage{flex-basis:116px}#msPrev{width:108px;height:108px}.msStage .stH{font-size:11px}.msTry b{font-size:11px}}
@media (max-width:560px){.msStage{display:none}}
`);

// ---------- 2. HTML: provador ao lado da grade ----------
rep(`    <div class="msGrid" id="msGrid"></div>
    <p class="segNote" id="msNote">`, `    <div class="msBody"><div class="msStage" id="msStage"><div class="stH">PROVADOR</div><canvas id="msPrev" width="176" height="176" title="Toque pra virar"></canvas><div class="msTry" id="msTry"></div></div><div class="msGrid" id="msGrid"></div></div>
    <p class="segNote" id="msNote">`);
rep(`  $("msNote").textContent = "Melhorias agora ficam em PERSONAGEM \\u203A HABILIDADES. Roupas e acess\\xF3rios s\\xE3o s\\xF3 visual: n\\xE3o mudam dano nem vida. Kit sai 20% mais barato.";`,
  `  $("msNote").textContent = "Toque num item pra provar. Roupas s\\xE3o s\\xF3 visual \\xB7 kit sai 20% mais barato \\xB7 melhorias ficam em PERSONAGEM \\u203A HABILIDADES.";`);

// ---------- 3. JS: filtros compartilhados + inventário ----------
rep(`  function itemCard(k, onClick, state) {
    const it = ITEMS[k], b = h("button", "lkItem" + (state ? " " + state : ""));
    const cv = h("canvas");`, `  // ---------- v29: filtro por raridade + busca (loja e inventário) ----------
  const RAR_UP = ["COMUM", "INCOMUM", "RARO", "EXCLUSIVO", "LEND\\xC1RIO"];
  const FL = { shop: { r: -1, q: "", own: 0 }, inv: { r: -1, q: "" } };
  const norm = (t) => String(t || "").normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().trim();
  const flHit = (k, st, noRar) => (noRar || st.r < 0 || ITEMS[k].rar === st.r) && (!st.q || norm(ITEMS[k].name).indexOf(norm(st.q)) >= 0) && (!st.own || !owns(k));
  // barra: busca, chips de raridade com contagem, "não tenho" (opcional). redraw() redesenha só a lista, sem perder o foco da busca.
  function filterBar(st, keys, redraw, withOwn) {
    const bar = h("div", "flBar"), q = h("input", "flQ"), chips = [];
    q.type = "search";
    q.placeholder = "Buscar item";
    q.value = st.q;
    q.setAttribute("aria-label", "Buscar item pelo nome");
    q.autocomplete = "off";
    q.spellcheck = false;
    bar.append(q);
    const mk = (r, label) => {
      const b = h("button", "flChip" + (r >= 0 ? " r" + r : " all"));
      if (r >= 0) b.append(h("i"));
      b.append(document.createTextNode(label + " "));
      const n = h("small");
      b.append(n);
      b.onclick = () => { st.r = st.r === r && r >= 0 ? -1 : r; SFX.swap && SFX.swap(); sync(); redraw(); };
      chips.push([r, b, n]);
      bar.append(b);
    };
    mk(-1, "TODAS");
    for (let r = 0; r < RAR_UP.length; r++) if (keys.some((k) => ITEMS[k].rar === r)) mk(r, RAR_UP[r]);
    let own = null;
    if (withOwn) {
      own = h("button", "flChip tg", "N\\xC3O TENHO");
      own.onclick = () => { st.own = st.own ? 0 : 1; SFX.swap && SFX.swap(); sync(); redraw(); };
      bar.append(own);
    }
    function sync() {
      chips.forEach(([r, b, n]) => {
        const c = keys.filter((k) => (r < 0 || ITEMS[k].rar === r) && flHit(k, st, true)).length;
        n.textContent = c;
        b.classList.toggle("on", st.r === r);
        b.disabled = c === 0 && st.r !== r;
      });
      if (own) own.classList.toggle("on", !!st.own);
    }
    q.oninput = () => { st.q = q.value; sync(); redraw(); };
    sync();
    return bar;
  }
  function itemCard(k, onClick, state) {
    const it = ITEMS[k], b = h("button", "lkItem" + (k ? " r" + (it.rar | 0) : "") + (state ? " " + state : ""));
    if (k) { b.append(h("i", "rb")); b.title = it.name + " \\xB7 " + RAR[it.rar | 0]; }
    const cv = h("canvas");`);

cut(`    const list = d.inv.filter((k) => ITEMS[k].slot === want);
    const grid = h("div", "lkGrid");`, `    const shopB = h("button", "btn alt lkShopB", "IR PRA LOJA");`, `    const all = d.inv.filter((k) => ITEMS[k] && ITEMS[k].slot === want), st = FL.inv;
    const grid = h("div", "lkGrid"), cnt = h("span", "flCount");
    const draw = () => {
      grid.innerHTML = "";
      const list = all.filter((k) => flHit(k, st));
      cnt.textContent = list.length + (list.length === 1 ? " item" : " itens") + (list.length < all.length ? " de " + all.length : "");
      if (want === "head" || want === "acc") grid.append(itemCard(null, () => { ui.eq[ui.slot] = null; SFX.swap && SFX.swap(); refresh(); }, ui.eq[ui.slot] ? "" : "on"));
      list.forEach((k) => {
        const on = want === "acc" ? ui.eq[ui.slot] === k : ui.eq[want] === k, elsewhere = !on && isOn(ui.eq, k);
        grid.append(itemCard(k, () => {
          if (on) { if (want === "head" || want === "acc") ui.eq[ui.slot] = null; }
          else { if (elsewhere) SLOTS.forEach((s) => { if (ui.eq[s] === k) ui.eq[s] = null; }); equipInto(ui.eq, k, ui.slot); }
          SFX.swap && SFX.swap();
          refresh();
        }, on ? "on" : elsewhere ? "used" : ""));
      });
      if (!all.length) grid.append(h("p", "lkNote", "Nada aqui ainda. Tem item novo na LOJA, aba VISUAL."));
      else if (!list.length) grid.append(h("p", "flEmpty", "Nenhum item com esse filtro."));
    };
    if (all.length > 1) { const fb = filterBar(st, all, draw, false); fb.append(cnt); R.append(fb); }
    draw();
    R.append(grid);
`);

// ---------- 4. JS: loja com aba TUDO, filtros, cards novos e provador ----------
rep(`  const SUBS = [["kits", "KITS"], ["head", "CABE\\xC7A"],`, `  const SUBS = [["kits", "KITS"], ["all", "TUDO"], ["head", "CABE\\xC7A"],`);

cut(`    const keys = Object.keys(ITEMS).filter((k) => ITEMS[k].slot === sub && ITEMS[k].price + (ITEMS[k].unlock ? 1 : 0) > 0);`, `  // itens exclusivos liberados numa partida`, `    const keys = Object.keys(ITEMS).filter((k) => (sub === "all" || ITEMS[k].slot === sub) && ITEMS[k].price + (ITEMS[k].unlock ? 1 : 0) > 0);
    keys.sort((a, b) => (ITEMS[a].unlock ? 1 : 0) - (ITEMS[b].unlock ? 1 : 0) || ITEMS[a].price - ITEMS[b].price || (ITEMS[a].rar | 0) - (ITEMS[b].rar | 0));
    const st = FL.shop, cards = [];
    const draw = () => {
      cards.forEach((c) => c.remove());
      cards.length = 0;
      const list = keys.filter((k) => flHit(k, st));
      list.forEach((k) => { const c = shopCard(k); cards.push(c); g2.append(c); });
      if (!list.length) { const e = h("p", "flEmpty", "Nenhum item com esse filtro."); cards.push(e); g2.append(e); }
    };
    g2.append(filterBar(st, keys, draw, true));
    draw();
    function shopCard(k) {
      const it = ITEMS[k], own = owns(k), on = isOn(d.eq, k), card = h("div", "msItem lkShopItem r" + (it.rar | 0) + (tryKeys.length === 1 && tryKeys[0] === k ? " try" : ""));
      card.append(h("div", "n", it.name));
      card.append(h("i", "rar", RAR[it.rar | 0]));
      const cv = h("canvas"), th = h("div", "th");
      th.append(cv);
      if (own && !on) th.append(h("i", "own", "TENHO"));
      card.append(th);
      thumb(cv, [k]);
      card.onclick = (e) => { if (!e.target.closest("button")) tryOn([k], card); };
      const b = h("button");
      if (on) { b.textContent = "USANDO"; b.className = "eq"; }
      else if (own) b.textContent = "VESTIR";
      else if (it.unlock) { const u = it.unlock, m = MAPS.find((z) => z.id === u.map); b.textContent = u.level ? "N\\xEDvel " + u.level : u.map ? "Onda " + u.wave + (m ? " em " + m.name : "") : u.src === "passe" ? "Passe" : u.src === "loja" ? "Loja Z-Coin" : "Caixa"; b.disabled = true; }
      else { b.textContent = it.price + " moedas"; b.classList.toggle("poor", d.coins < it.price); }
      b.onclick = () => {
        if (on) { if (it.slot === "head" || it.slot === "acc") { SLOTS.forEach((s) => { if (d.eq[s] === k) d.eq[s] = null; }); SFX.swap(); } else return; }
        else {
          if (!own) {
            if (it.unlock) return;
            if (d.coins < it.price) return buyFx(b);
            if (ECO.srvOn()) return srvBuy("buy_look", { p_item: k }, b, [k], () => equipInto(d.eq, k));
            d.coins -= it.price;
            d.inv.push(k);
            SFX.buy();
          } else SFX.swap();
          equipInto(d.eq, k);
        }
        tryKeys = [];
        sanitize(d);
        SAVE.save();
        AVA_CLEAR();
        apply();
        showMShop();
      };
      card.append(b);
      return card;
    }
  }
  // ---------- v29: provador da loja (seu personagem com a peça escolhida) ----------
  let tryKeys = [], tryRaf = 0, tryFace = 1, tryName = "";
  const tryT0 = performance.now();
  function tryEq() { const e = Object.assign({}, D().eq); tryKeys.forEach((k) => { if (ITEMS[k]) equipInto(e, k); }); return e; }
  function tryOn(keys, card, name) {
    tryName = name || "";
    const same = keys.length === tryKeys.length && keys.every((k, i) => tryKeys[i] === k);
    tryKeys = same ? [] : keys.slice();
    SFX.swap && SFX.swap();
    document.querySelectorAll("#msGrid .msItem.try").forEach((c) => c.classList.remove("try"));
    if (!same && card) card.classList.add("try");
    tryInfo();
  }
  function tryInfo() {
    const box = $$("msTry"), st = $$("msStage");
    if (!box) return;
    box.innerHTML = "";
    const one = tryKeys.length === 1 ? ITEMS[tryKeys[0]] : null;
    st.className = "msStage" + (one ? " r" + (one.rar | 0) : "");
    if (!tryKeys.length) { box.append(h("b", null, "Voc\\xEA agora")); box.append(h("p", null, "Toque num item pra ver ele em voc\\xEA antes de comprar.")); }
    else {
      box.append(h("b", null, one ? one.name : tryName || "Kit completo"));
      if (one) box.append(h("i", null, RAR[one.rar | 0]));
      const off = h("button", "tryOff", "TIRAR");
      off.onclick = () => tryOn(tryKeys, null);
      box.append(off);
    }
    if (!tryRaf) tryRaf = requestAnimationFrame(tryTick);
  }
  function tryTick() {
    const cv = $$("msPrev");
    if (!cv || $$("mshop").classList.contains("hidden") || !cv.offsetWidth) { tryRaf = 0; return; }
    const n = animFrames("Idle"), f = Math.floor((performance.now() - tryT0) / animMs("Idle")) % n;
    drawPreview(cv, { eq: tryEq(), anim: "Idle", frame: f, scale: 2, face: tryFace });
    tryRaf = requestAnimationFrame(tryTick);
  }
  (() => { const cv = $$("msPrev"); if (cv) cv.onclick = () => { tryFace = -tryFace; }; })();
`);

// kits: tocar no card prova o kit todo; o provador é atualizado a cada render da loja
rep(`        card.append(h("div", "d", kit.items.map((k) => ITEMS[k].name).join(", ")));`, `        card.append(h("div", "d", kit.items.map((k) => ITEMS[k].name).join(", ")));
        card.onclick = (e) => { if (!e.target.closest("button")) tryOn(kit.items, card, kit.name); };`);
rep(`    g2.append(bar);
    const buyFx = (b) =>`, `    g2.append(bar);
    setTimeout(tryInfo, 0);
    const buyFx = (b) =>`);
// comprar pelo servidor também limpa o provador
rep(`        wear();
        SFX.buy();
        sanitize(d);
        ECO.mirror(r.coins);`, `        wear();
        tryKeys = [];
        SFX.buy();
        sanitize(d);
        ECO.mirror(r.coins);`);
rep(`          kit.items.forEach((k) => equipInto(d.eq, k));
          sanitize(d);
          SAVE.save();`, `          kit.items.forEach((k) => equipInto(d.eq, k));
          tryKeys = [];
          sanitize(d);
          SAVE.save();`);

fs.writeFileSync(F, s);
console.log('v29-loja ok');
