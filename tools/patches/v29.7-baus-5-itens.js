// v29.7: baús de Z-Coin com 5 itens e lista do dia.
//   Baú raro: 1 rara que você não tem + 4 comuns. Baú lendário: 1 lendária que você não tem + 1 rara + 3 comuns.
//   Item repetido vira moedas do jogo (valor vem do servidor, chest_dupe).
// Antes de comprar, o cartão do baú mostra a lista de hoje (trilhos com rolagem lateral, um por raridade),
// a chance de cada item, quais você já tem e quanto tempo falta para a lista trocar (meia-noite de Brasília).
// Depois de comprar: o baú abre (CHEST) e em seguida os 5 cartões entram na tela ITENS RECEBIDOS (LOOT),
// comuns primeiro e a garantida por último; repetido aparece como "REPETIDO · +N MOEDAS".
// Tudo é sorteado no servidor (supabase/migrations/v29_7_baus_5_itens.sql). Se chest_shop.reveal = true,
// o mesmo cartão mostra os 5 itens exatos que vêm.
// Aplicar depois de v28.10-baus.js e v29-itens-recebidos.js.
// Uso: node tools/patches/v29.7-baus-5-itens.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
if (s.includes('/* v29.7: baús com 5 itens */')) { console.log('já aplicado'); process.exit(0); }
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

// ---------- 1. CSS ----------
rep(`.chCard.off{filter:grayscale(.6);opacity:.75}`, `.chCard.off{filter:grayscale(.6);opacity:.75}
/* v29.7: baús com 5 itens */
.chShop{grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))}
.chCard .gt b{color:var(--cc)}
.chPool{grid-column:1/-1;display:grid;gap:6px;padding:6px;background:rgba(0,0,0,.35);border:2px solid #000;min-width:0}
.chPool>header{display:flex;justify-content:space-between;gap:8px;align-items:baseline;font:700 12px/1.2 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#e9e4d8}
.chPool>header span{color:var(--mute);font-weight:600;white-space:nowrap}
.chSl{--rc:#e9e4d8;display:grid;gap:3px;min-width:0}
.chSl.r2{--rc:rgb(196,108,255)}.chSl.r3{--rc:rgb(255,184,46)}
.chSl>div{display:flex;justify-content:space-between;gap:6px;font:600 11px/1.25 system-ui,sans-serif;color:var(--mute)}
.chSl>div b{color:var(--rc);font-weight:800;letter-spacing:.3px}
.chRail{display:flex;gap:4px;overflow-x:auto;scroll-snap-type:x proximity;padding:1px 1px 5px;scrollbar-width:thin;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch}
.chRail i{position:relative;flex:none;width:46px;height:46px;display:grid;place-items:center;background:#1a1622;border:2px solid #000;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rc) 60%,#000);scroll-snap-align:start}
.chRail i canvas{width:40px;height:40px;image-rendering:pixelated}
.chRail i.own canvas{opacity:.42;filter:grayscale(.5)}
.chRail i.own:after{content:"TEM";position:absolute;left:1px;bottom:1px;padding:0 2px;background:#000;color:#ffd84a;font:800 8px/1.3 system-ui,sans-serif}
.chRail i.fx{box-shadow:inset 0 0 0 2px var(--rc),0 0 6px color-mix(in srgb,var(--rc) 60%,transparent)}
.chPool small{font:500 11px/1.3 system-ui,sans-serif;color:var(--mute)}
.ltCard.dup .ltIc canvas{opacity:.55;filter:grayscale(.4)}
.ltCard.dup .ltR{color:#ffd84a}`);

// ---------- 2. leitura: guarda moedas por repetido e hora da troca ----------
rep(`      this.chests = ch && ch.chests || null;`, `      this.chests = ch && ch.chests || null;
      this.chDupe = ch && ch.dupe || {};
      this.chNext = ch && ch.next ? Date.parse(ch.next) : 0;`);

// ---------- 3. cartão do baú ----------
const i0 = s.indexOf('  // v28.10: baús à venda (servidor manda preço, modo e a roupa do dia)\n  chestShop(esc) {');
const i1 = s.indexOf('  // primeiro toque arma, segundo toque (em até 4 s) compra', i0);
if (i0 < 0 || i1 < 0) throw new Error('chestShop');
s = s.slice(0, i0) + `  // v29.7: baús à venda com 5 itens; o servidor manda a lista de hoje, o modo e quando a lista troca
  chestShop(esc) {
    const L = this.chests;
    if (!L || !L.length) return "";
    const RN = { 1: "comum", 2: "rara", 3: "lendária" }, RP = { 1: "comuns", 2: "raras", 3: "lendárias" };
    const pc = (x) => (x * 100 >= 10 ? Math.round(x * 100) : Math.round(x * 1000) / 10).toString().replace(".", ",") + "%";
    const left = this.chNext ? Math.max(0, this.chNext - Date.now()) : 0, hh = Math.floor(left / 36e5), mm = Math.floor(left % 36e5 / 6e4);
    const when = this.chNext ? "Lista nova em " + (hh ? hh + "h " : "") + mm + "min" : "Lista nova todo dia";
    const th = (id, cls) => '<i class="' + cls + '" title="' + esc(LOOK.ITEMS[id] ? LOOK.ITEMS[id].name : id) + '"><canvas data-th="' + esc(id) + '"></canvas></i>';
    let h = '<div class="chShop">';
    L.forEach((c) => {
      const t = c.tier, full = c.today >= c.limit, none = c.left <= 0, ex = c.extras || [], pool = c.pool || [];
      // quantos itens por raridade: 1 garantido da raridade do baú + extras
      const slots = { [t]: 1 };
      ex.forEach((r) => (slots[r] = (slots[r] || 0) + 1));
      const parts = Object.keys(slots).sort((a, b) => b - a).map((r) => slots[r] + " " + (slots[r] > 1 ? RP[r] : RN[r]));
      let what = "";
      if (c.reveal && c.item) {
        // modo à mostra: os 5 itens exatos
        what = '<div class="chPool"><header>HOJE VEM<span>' + when + '</span></header><div class="chSl r' + t + '"><div class="chRail">' + [c.item].concat(c.offer || []).map((id) => {
          const p = pool.find((x) => x.id === id);
          return th(id, (p && p.own ? "own" : "") + (id === c.item ? " fx" : ""));
        }).join("") + "</div></div><small>Troca amanhã ou depois que você comprar. Repetido vira moedas.</small></div>";
      } else if (pool.length) {
        what = '<div class="chPool"><header>O QUE PODE VIR HOJE<span>' + when + "</span></header>";
        [3, 2, 1].forEach((r) => {
          const P = pool.filter((x) => x.r === r);
          if (!P.length) return;
          const own = P.filter((x) => x.own).length, k = r === t ? 1 : ex.filter((y) => y === r).length;
          let info;
          if (r === t) info = "<b>1 " + RN[r].toUpperCase() + " GARANTIDA</b><span>só das " + (P.length - own) + " que você não tem · " + (P.length - own ? pc(1 / (P.length - own)) + " cada" : "—") + "</span>";
          else info = "<b>" + k + " " + (k > 1 ? RP[r] : RN[r]).toUpperCase() + "</b><span>" + pc(Math.min(1, k / P.length)) + " cada · repetida +" + (this.chDupe[r] || 0) + " moedas</span>";
          // garantida: os que você não tem primeiro
          const ord = r === t ? P.slice().sort((a, b) => a.own - b.own) : P;
          what += '<div class="chSl r' + r + '"><div>' + info + '</div><div class="chRail">' + ord.map((x) => th(x.id, x.own ? "own" : "")).join("") + "</div></div>";
        });
        what += "<small>Sorteio na compra, feito pelo servidor. Faltam para você " + c.left + " de " + c.total + " " + RP[t] + " de hoje.</small></div>";
      }
      const btn = none ? '<button class="btn alt" disabled>VOCÊ TEM TODAS DE HOJE</button>' : full ? '<button class="btn alt" disabled>VOLTE AMANHÃ</button>' : '<button class="btn yo" data-act="chest" data-tier="' + t + '" data-item="' + esc(c.item || "") + '" data-price="' + c.price + '">COMPRAR · ' + c.price + " Z</button>";
      h += '<div class="chCard t' + t + (none || full ? " off" : "") + '"><canvas class="bx" width="56" height="46" data-bx="' + t + '"></canvas><span class="nm">' + esc(c.name).toUpperCase() + '</span><span class="gt"><b>' + (1 + ex.length) + " itens:</b> " + parts.join(" + ") + "<small>hoje " + c.today + "/" + c.limit + "</small></span><span></span>" + what + btn + "</div>";
    });
    return h + "</div>";
  },
  // depois do baú abrir: os 5 itens na tela ITENS RECEBIDOS (repetido mostra as moedas)
  chestLoot(r) {
    const L = r && r.items;
    if (!L || !L.length || typeof LOOT === "undefined") return;
    LOOT.open(0);
    $("ltGo").textContent = "PRONTO";
    L.forEach((x) => {
      if (!LOOK.ITEMS[x.item]) return;
      LOOT.add("item", 1, { id: x.item, t: x.r, sub: x.dupe ? "REPETIDO · +" + x.coins + " MOEDAS" : "" });
      const c = LOOT.cards["item:" + x.item];
      if (c && x.dupe) c.dup = 1;
    });
    if (r.coins > 0) LOOT.add("coins", r.coins, { sub: "dos repetidos" });
  },
` + s.slice(i1);

// ---------- 4. compra: abre o baú e depois mostra os 5 ----------
rep(`      CHEST.play(Object.assign({ skin: r.tier }, r), this.prize(r.kind, r.amount, r.item));
      if (r.zcoin != null) this.zcoin = r.zcoin;
      return this.refresh().then(() => this.show("box"));`, `      CHEST.after = () => this.chestLoot(r);
      CHEST.play(Object.assign({ skin: r.tier }, r), r.items && r.items.length > 1 ? r.items.length + " ITENS" : this.prize(r.kind, r.amount, r.item));
      if (r.zcoin != null) this.zcoin = r.zcoin;
      return this.got({ coins: r.coins || 0 }).then(() => this.show("box"));`);

// CHEST: ao fechar (toque ou sozinho 1,2 s depois de abrir) chama o "depois"
rep(`    el.onclick = () => {
      const k = (performance.now() - this.t0) / 1e3;
      if (k < 2.1) this.t0 = performance.now() - 2.1e3;
      else el.classList.add("hidden");
    };`, `    const end = () => { el.classList.add("hidden"); clearTimeout(this.auto); const f = this.after; this.after = null; if (f) f(); };
    el.onclick = () => {
      const k = (performance.now() - this.t0) / 1e3;
      if (k < 2.1) this.t0 = performance.now() - 2.1e3;
      else end();
    };
    clearTimeout(this.auto);
    if (this.after) { const tick = () => { if (el.classList.contains("hidden")) return; if ((performance.now() - this.t0) / 1e3 > 3.3) end(); else this.auto = setTimeout(tick, 150); }; this.auto = setTimeout(tick, 150); }`);

// ---------- 5. LOOT: raridade do servidor, legenda própria e repetido ----------
rep(`    const t = it ? (it.rar >= 4 ? 3 : it.rar >= 2 ? 2 : 1) :`, `    const t = o.t ? o.t : it ? (it.rar >= 4 ? 3 : it.rar >= 2 ? 2 : 1) :`);
rep(`    else if (c.k === "item") { const it = LOOK.ITEMS[c.id]; V.textContent = ""; N.textContent = it ? it.name : c.id; R.textContent = this.RN[c.t]; }`,
  `    else if (c.k === "item") { const it = LOOK.ITEMS[c.id]; V.textContent = ""; N.textContent = it ? it.name : c.id; R.textContent = c.sub || this.RN[c.t]; el.classList.toggle("dup", !!c.dup); }`);
rep(`    this.on = 1; this.t0 = performance.now(); this.q = []; this.cards = {};`, `    $("ltGo").textContent = "VER RELATORIO";
    this.on = 1; this.t0 = performance.now(); this.q = []; this.cards = {};`);

// ---------- 6. mensagem de erro ----------
rep(`TUDO_COLETADO: "Você já tem todas dessa raridade"`, `TUDO_COLETADO: "Você já tem todas de hoje. Amanhã a lista troca"`);

// ---------- 7. versão ----------
s = s.replace(/const QZ_VERSION='[^']*';/, "const QZ_VERSION='29.7';")
  .replace(/const QZ_NOTE='[^']*';/, "const QZ_NOTE='Baús de Z-Coin com 5 itens, lista nova todo dia e repetido virando moedas';");

fs.writeFileSync(F, s);
console.log('ok v29.7-baus-5-itens');
