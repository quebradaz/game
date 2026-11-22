// v28.10: baús vendidos por Z-Coin na aba BAÚS (antes CAIXAS).
//   Baú raro (roxo, cintas de prata): sempre uma roupa rara que você não tem.
//   Baú lendário de ouro: sempre uma roupa lendária que você não tem.
// O servidor decide tudo (supabase/migrations/v28_10_baus.sql): get_chest_shop() mostra preço, modo e a roupa
// do dia; buy_chest(tier, item) cobra e entrega. No modo "à mostra" (padrão) a roupa aparece antes de pagar;
// no modo sorteio aparece só "uma roupa rara/lendária que você não tem". Compra pede um segundo toque.
// Sem a migração aplicada, get_chest_shop falha e a seção de venda simplesmente não aparece.
// A animação de abrir ganhou pele por raridade: madeira (grátis), roxo (raro), ouro (lendário).
// Uso: node tools/patches/v28.10-baus.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

// ---------- 1. CSS ----------
rep(`.ecOdds{display:grid;`, `/* v28.10: baús à venda */
.chShop{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;margin:4px 0 10px}
.chCard{--cc:#b04aff;position:relative;display:grid;grid-template-columns:76px minmax(0,1fr);gap:4px 10px;align-items:center;padding:10px;border:3px solid #000;background:linear-gradient(160deg,color-mix(in srgb,var(--cc) 22%,#16131c),#0e0c13 70%);box-shadow:inset 0 0 0 2px color-mix(in srgb,var(--cc) 70%,#000),3px 3px 0 rgba(0,0,0,.5)}
.chCard.t3{--cc:#ffc21a}
.chCard .bx{grid-row:span 3;width:76px;height:62px;image-rendering:pixelated;filter:drop-shadow(0 0 8px color-mix(in srgb,var(--cc) 60%,transparent))}
.chCard .nm{font-family:var(--fz);font-size:20px;line-height:1;color:var(--cc);letter-spacing:1px}
.chCard .gt{font:600 13px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#e9e4d8}
.chCard .gt small{display:block;color:var(--mute);font-weight:500;font-size:12px}
.chCard .it{display:flex;gap:8px;align-items:center;grid-column:1/-1;padding:6px;background:rgba(0,0,0,.35);border:2px solid #000}
.chCard .it canvas{width:52px;height:52px;image-rendering:pixelated;flex:none}
.chCard .it b{font:700 13px/1.25 system-ui,sans-serif;color:var(--cc)}.chCard .it small{display:block;color:var(--mute);font:500 11px/1.2 system-ui,sans-serif}
.chCard button{grid-column:1/-1;min-height:40px}
.chCard button.ok{background:#7dff6a;color:#0a1a06}
.chCard.off{filter:grayscale(.6);opacity:.75}
.ecOdds{display:grid;`);

// ---------- 2. aba ----------
rep(`<button data-t="box">CAIXAS</button>`, `<button data-t="box">BAÚS</button>`);

// ---------- 3. leitura da vitrine junto com a economia ----------
rep(`    return first.then(() => NET.rpc("get_economy", {})).then((d) => {
      this.data = d;`, `    return first.then(() => Promise.all([NET.rpc("get_economy", {}), NET.rpc("get_chest_shop", {}).catch(() => null)])).then(([d, ch]) => {
      this.chests = ch && ch.chests || null;
      this.data = d;`);

// ---------- 4. aba BAÚS ----------
rep(`      B.innerHTML = '<div class="ecRow"><div><b>Caixas fechadas: ' + d.boxes + "</b><small>Você ganha uma caixa grátis cada vez que completa um mapa (vence a onda 20). Caixas não são vendidas.</small></div>"`,
  `      B.innerHTML = this.chestShop(esc) + '<div class="ecRow"><div><b>Baús grátis fechados: ' + d.boxes + "</b><small>Você ganha um baú grátis cada vez que completa um mapa (vence a onda 20).</small></div>"`);
rep(`      B.innerHTML = this.chestShop(esc) +`, `      this.chArm = null;
      B.innerHTML = this.chestShop(esc) +`);
// desenha as miniaturas depois que a aba é montada
rep(`    } else {
      let h = '<p class="ecNote">Seu código para a compra:`, `      B.querySelectorAll("canvas[data-bx]").forEach((c) => CHEST.icon(c, +c.dataset.bx));
      B.querySelectorAll(".chCard canvas[data-th]").forEach((c) => LOOK.thumb(c, [c.dataset.th]));
    } else {
      let h = '<p class="ecNote">Seu código para a compra:`);

// ---------- 5. cartões dos baús + compra ----------
rep(`  // v28.8: trilha do passe.`, `  // v28.10: baús à venda (servidor manda preço, modo e a roupa do dia)
  chestShop(esc) {
    const L = this.chests;
    if (!L || !L.length) return "";
    let h = '<div class="chShop">';
    L.forEach((c) => {
      const t = c.tier, rn = t === 3 ? "lendária" : "rara", it = c.item && LOOK.ITEMS[c.item], full = c.today >= c.limit, none = c.left <= 0;
      const what = c.reveal ? (it ? '<div class="it"><canvas data-th="' + c.item + '"></canvas><div><small>HOJE VEM</small><b>' + esc(it.name) + "</b><small>Troca amanhã ou depois que você comprar</small></div></div>" : "") : '<div class="it"><div><small>SORTEIO</small><b>Uma roupa ' + rn + " que você ainda não tem</b><small>Todas têm a mesma chance</small></div></div>";
      const btn = none ? '<button class="btn alt" disabled>VOCÊ TEM TODAS</button>' : full ? '<button class="btn alt" disabled>VOLTE AMANHÃ</button>' : '<button class="btn yo" data-act="chest" data-tier="' + t + '" data-item="' + esc(c.item || "") + '" data-price="' + c.price + '">COMPRAR · ' + c.price + " Z</button>";
      h += '<div class="chCard t' + t + (none || full ? " off" : "") + '"><canvas class="bx" width="56" height="46" data-bx="' + t + '"></canvas><span class="nm">' + esc(c.name).toUpperCase() + '</span><span class="gt">Sempre uma roupa ' + rn + "<small>Faltam " + c.left + " de " + c.total + " · hoje " + c.today + "/" + c.limit + "</small></span><span></span>" + what + btn + "</div>";
    });
    return h + "</div>";
  },
  // primeiro toque arma, segundo toque (em até 4 s) compra
  chestBuy(b) {
    if (this.chArm !== b) {
      if (this.chArm) { this.chArm.classList.remove("ok"); this.chArm.textContent = "COMPRAR · " + this.chArm.dataset.price + " Z"; }
      this.chArm = b;
      b.disabled = false;
      b.classList.add("ok");
      b.textContent = "TOQUE DE NOVO · " + b.dataset.price + " Z";
      clearTimeout(this.chT);
      this.chT = setTimeout(() => { if (this.chArm === b) { b.classList.remove("ok"); b.textContent = "COMPRAR · " + b.dataset.price + " Z"; this.chArm = null; } }, 4e3);
      return;
    }
    this.chArm = null;
    clearTimeout(this.chT);
    NET.rpc("buy_chest", { p_tier: +b.dataset.tier, p_item: b.dataset.item || null }).then((r) => {
      CHEST.play(Object.assign({ skin: r.tier }, r), this.prize(r.kind, r.amount, r.item));
      if (r.zcoin != null) this.zcoin = r.zcoin;
      return this.refresh().then(() => this.show("box"));
    }, (e) => {
      b.disabled = false;
      UI.toast && UI.toast(ecoErr(e), "#ff5a5a");
      if (/OFERTA_MUDOU|LIMITE_BAU_DIA|TUDO_COLETADO/.test(e && e.message || "")) this.refresh().then(() => this.show("box"));
    });
  },
  // v28.8: trilha do passe.`);
rep(`    b.disabled = true;
    if (a === "buypass")`, `    if (a === "chest") return this.chestBuy(b);
    b.disabled = true;
    if (a === "buypass")`);

// ---------- 6. mensagens de erro ----------
rep(`SEM_CAIXA: "Nenhuma caixa para abrir" };`, `SEM_CAIXA: "Nenhum baú para abrir", OFERTA_MUDOU: "A roupa do baú mudou. Confira de novo", LIMITE_BAU_DIA: "Limite de hoje para esse baú", TUDO_COLETADO: "Você já tem todas dessa raridade", BAU_INVALIDO: "Baú indisponível" };`);

// ---------- 7. pele do baú: madeira, roxo, ouro ----------
const i0 = s.indexOf('  draw(x, k) {\n    const W = 320, H = 200, t = this.t'), i1 = s.indexOf('\n};\nconst ECO_ERR', i0);
if (i0 < 0 || i1 < 0) throw new Error('CHEST.draw');
let d = s.slice(i0, i1);
const pal = { '"#7a4a24"': 'pk.b', '"#9a6232"': 'pk.hi', '"#5a3418"': 'pk.ln', '"#6a3e1e"': 'pk.lid', '"#8a5630"': 'pk.lhi', '"#4a2a12"': 'pk.in', '"#8a8478"': 'pk.st', '"#c8c2b4"': 'pk.sh', '"#6a645a"': 'pk.sd', '"#d8a820"': 'pk.lk' };
for (const k in pal) { if (d.indexOf(k) < 0) throw new Error('cor ' + k); d = d.split(k).join(pal[k]); }
d = d.replace('const P = (X, Y, w, h, c) =>', 'const pk = CHEST.SK[this.skin || 0] || CHEST.SK[0], P = (X, Y, w, h, c) =>');
s = s.slice(0, i0) + d + s.slice(i1);
rep(`  play(r, label) {
    const el = $("chestFx")`, `  // peles: 0 madeira (baú grátis), 2 roxo com prata (raro), 3 ouro (lendário)
  SK: {
    0: { b: "#7a4a24", hi: "#9a6232", ln: "#5a3418", lid: "#6a3e1e", lhi: "#8a5630", in: "#4a2a12", st: "#8a8478", sh: "#c8c2b4", sd: "#6a645a", lk: "#d8a820" },
    2: { b: "#4a2470", hi: "#6a3a98", ln: "#341854", lid: "#3e1e60", lhi: "#5a3088", in: "#24103a", st: "#a8b4c8", sh: "#eef4ff", sd: "#6a7488", lk: "#eef4ff" },
    3: { b: "#c8901a", hi: "#f4c83a", ln: "#9a6a10", lid: "#b07a14", lhi: "#e8b42c", in: "#6a4608", st: "#fff0a0", sh: "#ffffff", sd: "#c8a040", lk: "#b04aff" }
  },
  // miniatura do baú fechado (cartão da loja): 56 x 46
  icon(cv, skin) {
    const x = cv.getContext("2d"), q = this.SK[skin] || this.SK[0], P = (X, Y, w, h, c) => { x.fillStyle = c; x.fillRect(X, Y, w, h); }, bx = 2, by = 42;
    x.clearRect(0, 0, cv.width, cv.height);
    P(bx - 1, by + 1, 54, 3, "rgba(0,0,0,.5)");
    P(bx, by - 26, 52, 28, "#0a0608"); P(bx + 1, by - 25, 50, 26, q.b); P(bx + 1, by - 25, 50, 3, q.hi);
    for (let i = 0; i < 4; i++) P(bx + 1, by - 18 + i * 5, 50, 1, q.ln);
    P(bx, by - 40, 52, 15, "#0a0608"); P(bx + 1, by - 39, 50, 13, q.lid); P(bx + 1, by - 39, 50, 2, q.lhi);
    for (const sx of [6, 42]) { P(bx + sx, by - 39, 4, 40, q.st); P(bx + sx, by - 39, 1, 40, q.sh); }
    P(bx + 1, by - 26, 50, 1, "#fff8d8");
    P(bx + 22, by - 30, 8, 9, "#0a0608"); P(bx + 23, by - 29, 6, 7, q.lk); P(bx + 25, by - 27, 2, 3, "#2a1a08");
  },
  play(r, label) {
    this.skin = r.skin || 0;
    const el = $("chestFx")`);

fs.writeFileSync(F, s);
console.log('ok v28.10-baus');
