// v29.6: LOJA DE LENDÁRIOS. As roupas vendidas por Z-Coin ganham uma loja própria, separada da loja de moedas:
// lendárias e raras vendidas por Z-Coin, em seções (DESTAQUE, NA CABEÇA, ROUPAS, ACESSÓRIOS, RARAS), cada uma num trilho de cards com rolagem lateral.
// Fica na LOJA (aba "★ LENDÁRIOS"); a aba Z-COIN de Passe e Loja ganha o atalho para ela no lugar da lista de texto.
// Compra: dois toques (o primeiro arma, o segundo compra) e a mesma RPC de antes, buy_item. Preço e posse vêm do servidor.
// Aplicar DEPOIS de v29.6-zcoin-vitrine.js (usa ZSHOP e o #msZcBox). Uso: node tools/patches/v29.6-lendarios.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

// ---------- CSS ----------
rep('#bZc{white-space:nowrap;',
  '/* v29.6: loja de lendários */\n' +
  '#msLend{color:#ffd277}\n' +
  '#mshop.zcOn #msZcBox{overflow-y:auto;overflow-x:hidden;min-height:0;scrollbar-width:thin;scrollbar-color:#6a3aa8 transparent;padding-right:2px}\n' +
  '.lgTop{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin:0 0 4px}.lgTop p{margin:0;font-size:12px;color:#cfc4e0}\n' +
  '.lgTop .btn{padding:4px 10px;font-size:14px;min-height:30px}\n' +
  '.lgSec{margin:6px 0 2px}\n' +
  '.lgH{display:flex;align-items:baseline;gap:8px;padding:0 4px;border-left:4px solid #ffc23a;margin-left:2px}.lgH b{font:400 17px var(--fy);letter-spacing:1px;color:#ffd277}.lgH small{font-size:12px;color:#a89cbc}\n' +
  '.lgSec.feat .lgH{border-color:#ff8a3a}.lgSec.feat .lgH b{color:#ffb35a}\n' +
  '.lgRail{gap:10px}\n' +
  '.lgCard{flex:0 0 clamp(124px,19%,160px);scroll-snap-align:start;display:flex;flex-direction:column;gap:4px;padding:7px;position:relative;text-align:center;user-select:none;-webkit-user-select:none;' +
  'background:linear-gradient(180deg,#3a2a12 0%,#1b130b 75%);border:2px solid #000;box-shadow:inset 0 0 0 2px #ffc23a,4px 4px 0 rgba(0,0,0,.55)}\n' +
  '.lgCard.big{flex-basis:clamp(160px,26%,220px);background:linear-gradient(180deg,#4a2410 0%,#1b0f08 78%);box-shadow:inset 0 0 0 2px #ff9a3a,0 0 14px rgba(255,150,50,.25),4px 4px 0 rgba(0,0,0,.55)}\n' +
  '.lgCard canvas{width:100%;aspect-ratio:1;image-rendering:pixelated;background:radial-gradient(circle at 50% 58%,rgba(255,190,60,.28),transparent 66%)}\n' +
  '.lgCard .lgTag{position:absolute;top:5px;left:5px;font:700 9px system-ui,sans-serif;letter-spacing:.5px;color:#1a0d00;background:#ffc23a;border:1px solid #000;padding:1px 4px}\n' +
  '.lgCard .lgNm{font:400 14px var(--fy);color:#fff1cf;line-height:1.1;min-height:2.2em;display:flex;align-items:center;justify-content:center}\n' +
  '.lgCard .btn{margin-top:auto;padding:5px 4px;font-size:16px;min-height:36px;display:inline-flex;align-items:center;justify-content:center;gap:5px;white-space:nowrap}\n' +
  '.lgCard .btn .ic{width:18px;height:18px;flex:0 0 18px}\n' +
  '.lgCard .btn.poor{filter:saturate(.35) brightness(.8)}.lgCard .btn.ok{background:#3ee68a}\n' +
  '.lgCard.rare{background:linear-gradient(180deg,#2a1840 0%,#150f1d 75%);box-shadow:inset 0 0 0 2px #b070ff,4px 4px 0 rgba(0,0,0,.55)}.lgCard.rare canvas{background:radial-gradient(circle at 50% 58%,rgba(170,90,255,.28),transparent 66%)}.lgCard.rare .lgTag{background:#b070ff;color:#fff}.lgCard.rare .lgNm{color:#ecdcff}\n' +
  '.lgSec.rare .lgH{border-color:#b070ff}.lgSec.rare .lgH b{color:#d9a6ff}\n' +
  '.lgCard.own{opacity:.72}.lgCard.own .btn{font-size:14px}\n' +
  '@media (max-height:500px){.lgTop p{display:none}.lgTop .btn{min-height:26px;font-size:13px;padding:2px 8px}.lgCard{flex-basis:clamp(112px,21%,150px);padding:5px;gap:3px}.lgCard.big{flex-basis:clamp(150px,28%,210px)}.lgCard canvas{width:auto;height:clamp(64px,24vh,110px);align-self:center}.lgCard .lgNm{font-size:12px}.lgCard .btn{min-height:30px;font-size:14px}.lgH b{font-size:15px}}\n' +
  '#bZc{white-space:nowrap;');

// ---------- HTML: aba na LOJA ----------
rep('<div class="seg" id="msTabs"><button data-t="skin">VISUAL</button>',
  '<div class="seg" id="msTabs"><button data-t="skin">VISUAL</button><button data-t="lend" id="msLend">★ LENDÁRIOS</button>');

// ---------- JS ----------
// LOJA: aba LENDÁRIOS usa o mesmo espaço da aba Z-COIN
rep(`  $("mshop").classList.toggle("zcOn", msTab === "zc");
  if (msTab === "zc") {`,
  `  $("mshop").classList.toggle("zcOn", msTab === "zc" || msTab === "lend");
  if (msTab === "lend") {
    const zb = $("msZcBox"), sy = zb.scrollTop;
    zb.innerHTML = LEND.html();
    LEND.mount(zb);
    $("msNote").textContent = "Roupas são só visual. Toque no preço e depois em CONFIRMAR.";
    UI.show("mshop");
    return;
  }
  if (msTab === "zc") {`);

// Passe e Loja › Z-COIN: a lista de roupas vira o atalho para a loja de lendários
rep(`      if (!this.storeApp && (d.shop || []).length) h += '<div class="zcHd">ROUPAS POR Z-COIN</div>';
      (d.shop || []).forEach((it) => {
        const own = this.items.indexOf(it.id) >= 0 || (d.items || []).indexOf(it.id) >= 0;
        h += '<div class="ecRow"><div><b>' + esc(this.name(it.id)) + "</b><small>" + (it.kind === "pack" ? "Jaqueta zumbi (lendária) + jaqueta neon + moletom roxo + 50 Z-Coin" : it.rarity >= 3 ? "Lendária" : "Rara") + "</small></div>" + (own ? "<b>✓ SUA</b>" : '<button class="btn yo" data-act="item" data-id="' + it.id + '">' + it.price + " Z</button>") + "</div>";
      });`,
  `      const nL = LEND.list().length;
      if (nL) h += '<div class="ecRow"><div><b>★ LOJA DE LENDÁRIOS</b><small>' + nL + ' roupas lendárias e raras por Z-Coin, em seções com destaque.</small></div><button class="btn yo" data-golend="1">VER ›</button></div>';`);

// objeto LEND (depois do ZSHOP)
rep('ZSHOP.img = new Image();',
  `const LEND = {
  // seções: DESTAQUE (as de 900 Z ou mais) e o resto por parte do corpo
  SECS: [["feat", "DESTAQUE", "As mais caras da quebrada"], ["head", "NA CABEÇA", ""], ["body", "ROUPAS", "Peito, pernas e pés"], ["acc", "ACESSÓRIOS", "Máscaras, costas e nas mãos"], ["rare", "RARAS", "Mais em conta, também por Z-Coin"]],
  list() {
    const d = ECO.data;
    return (d && d.shop || []).filter((it) => it.kind === "item" && it.rarity >= 2 && LOOK.ITEMS[it.id]);
  },
  owns(id) { return (ECO.items || []).indexOf(id) >= 0 || (ECO.data && ECO.data.items || []).indexOf(id) >= 0; },
  sec(it) {
    if (it.rarity < 3) return "rare";
    if (it.price >= 900) return "feat";
    const sl = LOOK.ITEMS[it.id].slot;
    return sl === "head" ? "head" : sl === "acc" ? "acc" : "body";
  },
  html() {
    if (!ECO.ready || !ECO.data) return '<p class="ecNote">Entre na sua conta para ver a loja de lendários.</p>';
    const L = this.list(), esc = (t) => String(t).replace(/[<>&"]/g, "");
    if (!L.length) return '<p class="ecNote">Nenhuma lendária à venda agora. Volte mais tarde.</p>';
    let h = '<div class="lgTop"><span class="chip"><i class="ic zc"></i><b class="num">' + ECO.zcoin + '</b></span><p>Lendárias e raras · pague com Z-Coin · arraste para o lado para ver mais</p><button class="btn alt" data-lgzc="1">+ Z-COIN</button></div>';
    this.SECS.forEach(([k, nm, sub]) => {
      const it = L.filter((x) => this.sec(x) === k).sort((a, b) => (this.owns(a.id) ? 1 : 0) - (this.owns(b.id) ? 1 : 0) || b.price - a.price);
      if (!it.length) return;
      const big = k === "feat";
      h += '<div class="lgSec' + (big ? " feat" : "") + (k === "rare" ? " rare" : "") + '"><div class="lgH"><b>' + nm + "</b><small>" + (sub ? sub + " · " : "") + it.length + '</small></div><div class="zcShop"><button class="zcArr l" aria-label="Anterior">&lsaquo;</button><div class="zcRail lgRail" tabindex="0" aria-label="' + nm + '">';
      it.forEach((x) => {
        const own = this.owns(x.id), nmI = esc(LOOK.ITEMS[x.id].name);
        h += '<div class="lgCard' + (big ? " big" : "") + (k === "rare" ? " rare" : "") + (own ? " own" : "") + '"><canvas data-lg="' + esc(x.id) + '"></canvas><span class="lgTag">' + (k === "rare" ? "RARA" : "LENDÁRIA") + '</span><span class="lgNm">' + nmI + "</span>" +
          (own ? '<button class="btn alt" disabled>✓ SUA</button>' : '<button class="btn yo' + (ECO.zcoin < x.price ? " poor" : "") + '" data-lend="' + esc(x.id) + '" data-price="' + x.price + '"><i class="ic zc"></i>' + x.price + "</button>") + "</div>";
      });
      h += '</div><button class="zcArr r" aria-label="Próximo">&rsaquo;</button></div></div>';
    });
    return h;
  },
  mount(root) {
    root.querySelectorAll("canvas[data-lg]").forEach((c) => LOOK.thumb(c, [c.dataset.lg], { full: !!c.dataset.full }));
    ZSHOP.mount(root);
  },
  // primeiro toque arma ("CONFIRMAR"), o segundo (em até 4 s) compra
  buy(b) {
    const id = b.dataset.lend, pr = +b.dataset.price, lab = '<i class="ic zc" style="background-image:url(' + ICON_ZC + ')"></i>' + pr;
    if (ECO.zcoin < pr) {
      SFX.deny && SFX.deny();
      UI.toast && UI.toast("FALTA " + (pr - ECO.zcoin) + " Z-COIN", "#c86aff");
      setTimeout(() => { msTab = "zc"; showMShop(); }, 700);
      return;
    }
    if (this.arm !== b) {
      if (this.arm) { this.arm.classList.remove("ok"); this.arm.innerHTML = this.arm._lab; }
      this.arm = b; b._lab = lab;
      b.classList.add("ok");
      b.textContent = "CONFIRMAR";
      clearTimeout(this.t);
      this.t = setTimeout(() => { if (this.arm === b) { b.classList.remove("ok"); b.innerHTML = lab; this.arm = null; } }, 4e3);
      return;
    }
    this.arm = null;
    clearTimeout(this.t);
    b.disabled = true;
    NET.rpc("buy_item", { p_item: id }).then((r) => {
      try { NOTIF.acted("item", { dataset: { id } }, r); } catch (e) {}
      const D = SAVE.d;
      if (D.inv && D.inv.indexOf(id) < 0) D.inv.push(id);
      ECO.items = Array.from(new Set((ECO.items || []).concat([id])));
      SFX.buy && SFX.buy();
      UI.toast && UI.toast(LOOK.ITEMS[id].name.toUpperCase() + " É SUA!", "#ffc23a");
      return ECO.got(r);
    }).then(() => { if (!$("mshop").classList.contains("hidden") && msTab === "lend") showMShop(); }, (e) => {
      b.disabled = false; b.classList.remove("ok"); b.innerHTML = lab;
      UI.toast && UI.toast(ecoErr(e), "#ff5a5a");
    });
  }
};
$("msZcBox").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-lend]");
  if (b) return LEND.buy(b);
  if (e.target.closest("button[data-lgzc]")) { SFX.swap && SFX.swap(); msTab = "zc"; showMShop(); }
});
$("ecBody").addEventListener("click", (e) => {
  if (!e.target.closest("button[data-golend]")) return;
  SFX.swap && SFX.swap();
  msTab = "lend";
  showMShop();
});
ZSHOP.img = new Image();`);

s = s.replace(/const QZ_NOTE='[^']*';/, "const QZ_NOTE='Vitrine de Z-Coin com rolagem lateral, loja de lendárias em seções e botão Z-COIN no menu';");

fs.writeFileSync(F, s);
console.log('ok v29.6-lendarios');
