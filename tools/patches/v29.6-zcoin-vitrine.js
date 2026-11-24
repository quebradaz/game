// v29.6: vitrine de Z-Coin com rolagem lateral.
// - Os pacotes viram cards com arte (as moedas crescem: punhado, saco, mochila, cofre) num trilho que rola para o lado
//   no toque (celular), na roda do mouse, arrastando com o mouse ou pelas setas (PC).
// - A mesma vitrine aparece na aba Z-COIN de "Passe e Loja" e numa aba Z-COIN dentro da LOJA.
// - Botão "Z-COIN" no menu inicial abre a vitrine.
// O fluxo de pagamento não muda: o botão do card continua sendo data-act="pack" e passa por ECO.act -> ZPAY.buy.
// Uso: node tools/patches/v29.6-zcoin-vitrine.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

// ---------- CSS ----------
rep('#msZc{color:#d9a6ff}',
  '#msZc{color:#d9a6ff}\n' +
  '/* v29.6: vitrine de Z-Coin (cards em trilho lateral) */\n' +
  '.zcShop{position:relative;margin:2px 0 8px}\n' +
  '.zcRail{display:flex;gap:10px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;scroll-padding:0 4px;padding:6px 4px 12px;scrollbar-width:thin;scrollbar-color:#6a3aa8 transparent;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;cursor:grab;touch-action:pan-x pan-y}\n' +
  '.zcRail.drag{cursor:grabbing;scroll-snap-type:none}.zcRail.drag *{pointer-events:none}\n' +
  '.zcRail::-webkit-scrollbar{height:6px}.zcRail::-webkit-scrollbar-thumb{background:#6a3aa8}\n' +
  '.zcCard{--zc:#b98cff;--zg:rgba(160,90,255,.35);flex:0 0 clamp(160px,30%,250px);scroll-snap-align:start;display:flex;flex-direction:column;align-items:stretch;gap:4px;padding:8px 8px 9px;position:relative;' +
  'background:linear-gradient(180deg,#2a1840 0%,#17101f 70%);border:2px solid #000;box-shadow:inset 0 0 0 2px var(--zc),4px 4px 0 rgba(0,0,0,.55);text-align:center;user-select:none;-webkit-user-select:none}\n' +
  '.zcCard.t0{--zc:#8d7aa8;--zg:rgba(150,120,200,.25)}.zcCard.t1{--zc:#b070ff;--zg:rgba(170,90,255,.35)}.zcCard.t2{--zc:#d58bff;--zg:rgba(215,120,255,.45)}.zcCard.t3{--zc:#ffc23a;--zg:rgba(255,190,60,.45);background:linear-gradient(180deg,#3a2a12 0%,#1b130b 72%)}\n' +
  '.zcCard .zcArt{display:block;width:100%;aspect-ratio:3/2;image-rendering:pixelated;background:radial-gradient(ellipse at 50% 60%,var(--zg),transparent 68%)}\n' +
  '.zcCard .zcNm{font:400 15px var(--fy);letter-spacing:1px;color:var(--zc);text-transform:uppercase;line-height:1.05;min-height:2.1em;display:flex;align-items:center;justify-content:center}\n' +
  '.zcCard .zcAmt{display:flex;align-items:center;justify-content:center;gap:5px;font:400 26px var(--fy);color:#fff;line-height:1;text-shadow:2px 2px 0 #000}\n' +
  '.zcCard .zcAmt i{width:20px;height:20px;flex:0 0 20px}\n' +
  '.zcCard .zcBon{align-self:center;font:700 11px system-ui,sans-serif;letter-spacing:.5px;color:#1a0d00;background:#ffd84a;border:1px solid #000;padding:1px 6px;min-height:15px}\n' +
  '.zcCard .zcBon.no{visibility:hidden}\n' +
  '.zcCard .zcTot{font-size:12px;color:#cfc4e0;min-height:15px}\n' +
  '.zcCard .btn{margin-top:auto;padding:6px 6px;font-size:16px;min-height:38px;white-space:nowrap}\n' +
  '.zcCard.t3 .zcRib{position:absolute;top:5px;right:5px;font:700 10px system-ui,sans-serif;letter-spacing:.5px;color:#1a0d00;background:#ffc23a;border:2px solid #000;padding:1px 5px}\n' +
  '.zcArr{position:absolute;top:calc(50% - 22px);z-index:2;width:34px;height:44px;border:2px solid #000;background:#24202d;color:#e9e4d8;font:400 26px var(--fy);line-height:1;box-shadow:inset 0 0 0 1px #6a3aa8,3px 3px 0 rgba(0,0,0,.55);cursor:pointer;padding:0}\n' +
  '.zcArr.l{left:-6px}.zcArr.r{right:-6px}.zcArr:disabled{opacity:0;pointer-events:none}\n' +
  '.zcDots{display:flex;justify-content:center;gap:6px;margin-top:-4px}.zcDots i{width:8px;height:8px;background:#4a4458;border:1px solid #000}.zcDots i.on{background:#b070ff}\n' +
  '.zcPay{font-size:12px;color:#cfc4e0;text-align:center;margin:0 0 2px}\n' +
  '.zcHd{font:400 15px var(--fy);letter-spacing:1px;color:#d9a6ff;margin:10px 0 2px}\n' +
  '#msZcBox{display:none;flex:1 1 auto;min-width:0}#mshop.zcOn #msZcBox{display:block}#mshop.zcOn .msStage,#mshop.zcOn .msGrid{display:none!important}\n' +
  '#bZc{white-space:nowrap;color:#e7c8ff;box-shadow:inset 0 0 0 1px #8a3ad8,4px 4px 0 rgba(0,0,0,.55);display:inline-flex;align-items:center;gap:6px}\n' +
  '#bZc .ic{width:1em;height:1em;flex:0 0 1em;background-size:contain}\n' +
  '@media (hover:hover){.zcCard:hover{transform:translateY(-2px)}}\n' +
  '@media (max-height:500px){#bZc .ic{display:none}.zcCard{flex-basis:clamp(140px,34%,240px);padding:6px 6px 7px;gap:3px}.zcCard .zcArt{aspect-ratio:auto;width:auto;height:clamp(56px,22vh,90px);align-self:center}.zcCard .zcBon,.zcCard .zcTot{min-height:0}.zcPay{font-size:11px}.zcCard .zcNm{font-size:13px;min-height:2em}.zcCard .zcAmt{font-size:22px}.zcCard .btn{min-height:34px;font-size:15px}.zcRail{padding-bottom:8px}}');

// ---------- HTML ----------
// botão Z-COIN no menu inicial (depois de LOJA)
rep('<button class="btn alt yo" id="bMShop">LOJA</button>',
  '<button class="btn alt yo" id="bMShop">LOJA</button><button class="btn alt yo" id="bZc" aria-label="Comprar Z-Coin"><i class="ic zc"></i>Z-COIN</button>');
// aba Z-COIN dentro da LOJA (antes pulava para Passe e Loja)
rep('<button data-t="zc" id="msZc">Z-COIN ›</button>', '<button data-t="zc" id="msZc">Z-COIN</button>');
rep('<div class="msGrid" id="msGrid"></div></div>', '<div class="msGrid" id="msGrid"></div><div id="msZcBox"></div></div>');

// ---------- JS ----------
// aba Z-COIN de Passe e Loja: cards no lugar da lista
rep(`let h = this.storeApp ? "" : '<p class="ecNote">O pagamento abre na página segura da InfinitePay (cartão ou Pix). Quando aprovar, você volta pro jogo e a Z-Coin entra sozinha na conta.</p>';
      if (!this.storeApp) this.packs.forEach((p, i) => h += '<div class="ecRow"><div><b>' + p.n + " · " + p.z + (p.b ? " + " + p.b + " de bônus" : "") + " Z-Coin</b><small>" + p.p + ' · cartão ou Pix</small></div><button class="btn yo" data-act="pack" data-i="' + i + '">' + (this.payOn ? "COMPRAR" : "EM BREVE") + "</button></div>");`,
  `let h = this.storeApp ? "" : ZSHOP.html();
      if (!this.storeApp && (d.shop || []).length) h += '<div class="zcHd">ROUPAS POR Z-COIN</div>';`);
rep(`h += '<div class="ecRow"><div><b>' + esc(this.name(it.id)) + "</b><small>" + (it.kind === "pack" ? "Jaqueta zumbi (lendária) + jaqueta neon + moletom roxo + 50 Z-Coin" : it.rarity >= 3 ? "Lendária" : "Rara") + "</small></div>" + (own ? "<b>✓ SUA</b>" : '<button class="btn yo" data-act="item" data-id="' + it.id + '">' + it.price + " Z</button>") + "</div>";
      });
      B.innerHTML = h;`,
  `h += '<div class="ecRow"><div><b>' + esc(this.name(it.id)) + "</b><small>" + (it.kind === "pack" ? "Jaqueta zumbi (lendária) + jaqueta neon + moletom roxo + 50 Z-Coin" : it.rarity >= 3 ? "Lendária" : "Rara") + "</small></div>" + (own ? "<b>✓ SUA</b>" : '<button class="btn yo" data-act="item" data-id="' + it.id + '">' + it.price + " Z</button>") + "</div>";
      });
      B.innerHTML = h;
      ZSHOP.mount(B);`);

// LOJA: aba Z-COIN mostra a vitrine no lugar do provador e da grade
rep(`  if (msTab === "up") msTab = "skin";
  LOOK.shopGrid(g2);`,
  `  if (msTab === "up") msTab = "skin";
  $("mshop").classList.toggle("zcOn", msTab === "zc");
  if (msTab === "zc") {
    const zb = $("msZcBox");
    zb.innerHTML = ECO.storeApp ? '<p class="ecNote">A compra de Z-Coin não está disponível neste app.</p>' : ZSHOP.html();
    ZSHOP.mount(zb);
    $("msNote").textContent = "Z-Coin compra roupas, baús e o passe premium. Também cai de chefes e missões.";
    UI.show("mshop");
    return;
  }
  LOOK.shopGrid(g2);`);

// o atalho de v29.5 ($("msZc") pulava para Passe e Loja) sai: agora é uma aba normal da LOJA.
// ZPAY.open: com conta abre a aba Z-COIN de Passe e Loja (mostra o saldo); sem conta abre a vitrine da LOJA.
rep(`ZPAY.open = () => {
  SFX.swap && SFX.swap();
  UI.show("ecoScr");
  ECO.show("shop");
  ECO.refresh();
};`,
  `ZPAY.open = () => {
  SFX.swap && SFX.swap();
  if (!ECO.ready) { msTab = "zc"; showMShop(); return; }
  UI.show("ecoScr");
  ECO.show("shop");
  ECO.refresh();
};
// v29.6: vitrine de Z-Coin (cards com arte em trilho lateral). Usada em Passe e Loja › Z-COIN e em LOJA › Z-COIN.
const ZSHOP = {
  html() {
    const P = ECO.packs, nf = (n) => String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ".");
    let h = '<p class="zcPay">Pagamento na página segura da InfinitePay (cartão ou Pix). Aprovou, a Z-Coin entra sozinha na conta.</p><div class="zcShop"><button class="zcArr l" aria-label="Anterior">&lsaquo;</button><div class="zcRail" tabindex="0" aria-label="Pacotes de Z-Coin">';
    P.forEach((p, i) => {
      const t = Math.min(3, Math.round(i * 3 / Math.max(1, P.length - 1)));
      h += '<div class="zcCard t' + t + '">' + (t === 3 ? '<span class="zcRib">MAIOR</span>' : "") + '<canvas class="zcArt" width="96" height="64" data-zc="' + t + '"></canvas><span class="zcNm">' + p.n + '</span><span class="zcAmt"><i class="ic zc"></i>' + nf(p.z) + '</span><span class="zcBon' + (p.b ? "" : " no") + '">+' + nf(p.b) + ' BÔNUS</span><span class="zcTot">' + (p.b ? "Total " + nf(p.z + p.b) + " Z-Coin" : "") + '</span><button class="btn yo" data-act="pack" data-i="' + i + '">' + (ECO.payOn ? p.p : "EM BREVE") + "</button></div>";
    });
    return h + '</div><button class="zcArr r" aria-label="Próximo">&rsaquo;</button></div><div class="zcDots">' + P.map(() => "<i></i>").join("") + "</div>";
  },
  mount(root) {
    root.querySelectorAll(".ic.zc").forEach((e) => e.style.backgroundImage = \`url(\${ICON_ZC})\`);
    root.querySelectorAll("canvas[data-zc]").forEach((c) => this.art(c, +c.dataset.zc));
    root.querySelectorAll(".zcShop").forEach((w) => this.wire(w));
  },
  // um trilho: setas, pontinhos (se houver .zcDots logo depois), roda do mouse, arrasto e teclado
  wire(w) {
    const rail = w.querySelector(".zcRail"), L = w.querySelector(".zcArr.l"), R = w.querySelector(".zcArr.r"), dw = w.nextElementSibling && w.nextElementSibling.classList.contains("zcDots") ? w.nextElementSibling : null, dots = dw ? [...dw.children] : [];
    const step = () => { const c = rail.firstElementChild; return c ? c.offsetWidth + 10 : rail.clientWidth * 0.8; };
    const upd = () => {
      const max = rail.scrollWidth - rail.clientWidth - 2;
      L.disabled = rail.scrollLeft <= 2;
      R.disabled = rail.scrollLeft >= max;
      const k = max <= 0 ? -1 : Math.round(rail.scrollLeft / step());
      dots.forEach((d, i) => d.classList.toggle("on", max <= 0 || i === k || (rail.scrollLeft >= max && i >= dots.length - Math.round(rail.clientWidth / step()))));
      if (dw) dw.style.visibility = max <= 0 ? "hidden" : "";
    };
    L.onclick = () => { SFX.swap && SFX.swap(); rail.scrollBy({ left: -step(), behavior: "smooth" }); };
    R.onclick = () => { SFX.swap && SFX.swap(); rail.scrollBy({ left: step(), behavior: "smooth" }); };
    rail.addEventListener("scroll", upd, { passive: true });
    // roda do mouse vertical vira rolagem lateral
    rail.addEventListener("wheel", (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || rail.scrollWidth <= rail.clientWidth) return;
      e.preventDefault();
      rail.scrollBy({ left: e.deltaY, behavior: "auto" });
    }, { passive: false });
    // arrastar com o mouse (no toque o navegador já rola sozinho)
    let dx = null, x0 = 0, s0 = 0, moved = 0;
    rail.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse" || e.button) return; dx = e.pointerId; x0 = e.clientX; s0 = rail.scrollLeft; moved = 0; });
    rail.addEventListener("pointermove", (e) => {
      if (dx !== e.pointerId) return;
      const d = e.clientX - x0;
      if (!moved && Math.abs(d) > 6) { moved = 1; rail.classList.add("drag"); try { rail.setPointerCapture(dx); } catch (er) {} }
      if (moved) rail.scrollLeft = s0 - d;
    });
    const end = () => {
      if (dx === null) return;
      dx = null;
      if (moved) {
        rail.classList.remove("drag");
        const n = Math.round(rail.scrollLeft / step());
        rail.scrollTo({ left: n * step(), behavior: "smooth" });
        // não deixa o fim do arrasto virar clique em COMPRAR
        rail.addEventListener("click", (e) => { e.stopPropagation(); e.preventDefault(); }, { capture: true, once: true });
        setTimeout(() => { moved = 0; }, 0);
      }
    };
    rail.addEventListener("pointerup", end);
    rail.addEventListener("pointercancel", end);
    rail.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); R.onclick(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); L.onclick(); }
    });
    requestAnimationFrame(upd);
    setTimeout(upd, 250);
  },
  // arte em pixel: quanto maior o pacote, mais moedas (punhado, saco, mochila, cofre)
  art(cv, t) {
    const g = cv.getContext("2d"), W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    g.imageSmoothingEnabled = false;
    const r = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x | 0, y | 0, w, h); };
    const O = "#160a26";
    // uma moeda deitada (10x5) com borda escura
    const coin = (x, y, gold) => {
      const face = gold ? "#ffe07a" : "#d9a6ff", edge = gold ? "#c9891c" : "#7a35c8", hi = gold ? "#fff6c8" : "#f4e4ff";
      r(x + 2, y, 6, 1, O); r(x, y + 1, 10, 3, O); r(x + 2, y + 4, 6, 1, O);
      r(x + 2, y + 1, 6, 1, face); r(x + 1, y + 2, 8, 1, face); r(x + 1, y + 3, 8, 1, edge); r(x + 3, y + 1, 2, 1, hi);
    };
    const stack = (x, y, n, gold) => { for (let i = 0; i < n; i++) coin(x, y - i * 2, gold); };
    // moeda de pé (de frente), com o Z
    const big = (x, y, sz) => { const im = ZSHOP.img; if (im && im.complete && im.naturalWidth) { g.imageSmoothingEnabled = true; g.drawImage(im, x, y, sz, sz); g.imageSmoothingEnabled = false; } };
    const spark = (x, y, c) => { r(x, y - 2, 1, 5, c); r(x - 2, y, 5, 1, c); };
    const base = H - 6;
    // sombra no chão
    g.fillStyle = "rgba(0,0,0,.45)";
    g.beginPath(); g.ellipse(W / 2, base + 2, 18 + t * 8, 3, 0, 0, Math.PI * 2); g.fill();
    if (t === 0) {
      // punhado: três montinhos
      stack(36, base - 4, 2); stack(46, base - 3, 3); stack(41, base - 1, 1); stack(52, base - 2, 1);
      big(42, base - 26, 16);
      spark(30, base - 18, "#e7c8ff");
    } else if (t === 1) {
      // saco de pano amarrado, moedas na boca e no chão
      const S = "#8a5a2b", Sd = "#5e3a18", Sl = "#b37a3c";
      r(34, base - 26, 28, 26, O); r(32, base - 22, 32, 20, O);
      r(35, base - 25, 26, 24, S); r(33, base - 21, 30, 18, S); r(35, base - 6, 26, 4, Sd); r(58, base - 22, 4, 18, Sd); r(36, base - 22, 4, 12, Sl);
      r(40, base - 31, 16, 6, O); r(41, base - 30, 14, 4, S); r(42, base - 32, 12, 2, O);
      r(39, base - 27, 18, 2, "#e8d0a0"); r(38, base - 27, 1, 2, O); r(57, base - 27, 1, 2, O);
      big(40, base - 21, 16);
      stack(18, base - 3, 3); stack(26, base - 1, 1); stack(66, base - 2, 2); stack(74, base - 1, 1);
      coin(43, base - 36);
      spark(22, base - 16, "#e7c8ff"); spark(74, base - 20, "#e7c8ff");
    } else if (t === 2) {
      // mochila aberta transbordando
      const M = "#3f6b3a", Md = "#284a25", Ml = "#5f9456";
      r(28, base - 30, 40, 30, O);
      r(29, base - 29, 38, 28, M); r(29, base - 6, 38, 5, Md); r(62, base - 29, 5, 24, Md); r(30, base - 28, 4, 18, Ml);
      r(33, base - 16, 30, 12, O); r(34, base - 15, 28, 10, Ml); r(34, base - 7, 28, 2, Md); r(46, base - 13, 4, 3, "#c9c2b0");
      r(24, base - 26, 5, 20, O); r(25, base - 25, 3, 18, Md); r(67, base - 26, 5, 20, O); r(68, base - 25, 3, 18, Md);
      // moedas saindo pela boca
      stack(31, base - 30, 3); stack(40, base - 32, 4); stack(50, base - 31, 4); stack(58, base - 29, 3);
      big(38, base - 46, 18);
      stack(12, base - 3, 4); stack(20, base - 1, 2); stack(74, base - 3, 3); stack(82, base - 1, 1);
      spark(16, base - 22, "#e7c8ff"); spark(80, base - 24, "#e7c8ff"); spark(62, base - 44, "#fff");
    } else {
      // cofre aberto cheio, com brilho dourado
      g.fillStyle = "rgba(255,200,70,.22)"; g.beginPath(); g.arc(W / 2, base - 20, 30, 0, Math.PI * 2); g.fill();
      const C = "#5b6472", Cd = "#3a414c", Cl = "#8a95a6";
      r(30, base - 40, 38, 40, O);
      r(31, base - 39, 36, 38, C); r(31, base - 4, 36, 3, Cd); r(63, base - 39, 4, 36, Cd); r(32, base - 38, 3, 32, Cl);
      r(35, base - 35, 28, 28, O); r(36, base - 34, 26, 26, "#1a1410");
      // prateleiras de moedas
      stack(37, base - 12, 3, 1); stack(45, base - 12, 4, 1); stack(52, base - 12, 3, 1);
      stack(38, base - 24, 2); stack(46, base - 25, 3); stack(52, base - 24, 2);
      // porta aberta à direita
      r(68, base - 40, 12, 40, O); r(69, base - 39, 10, 38, Cl); r(69, base - 39, 2, 38, Cd); r(72, base - 24, 5, 5, O); r(73, base - 23, 3, 3, "#ffc23a");
      big(14, base - 22, 18);
      stack(20, base - 1, 3, 1); stack(12, base - 1, 2); stack(82, base - 2, 4, 1); stack(88, base, 1);
      spark(24, base - 36, "#fff1b0"); spark(84, base - 40, "#fff1b0"); spark(49, base - 44, "#fff");
    }
  }
};
ZSHOP.img = new Image();
ZSHOP.img.onload = () => document.querySelectorAll("canvas[data-zc]").forEach((c) => ZSHOP.art(c, +c.dataset.zc));
ZSHOP.img.src = ICON_ZC;
// botão Z-COIN do menu inicial
$("bZc").onclick = () => ZPAY.open();
if (ECO.storeApp) { $("bZc").classList.add("hidden"); $("msZc").classList.add("hidden"); }
$("msZcBox").onclick = (e) => {
  const b = e.target.closest("button[data-act]");
  if (b) ECO.act(b);
};`);
rep('$("msZc").onclick = () => ZPAY.open();\n', '');
// o ícone do botão do menu precisa da imagem (a varredura de v29.5 só pega os .chip)
rep('document.querySelectorAll("#zpOv .ic.zc").forEach((e) => e.style.backgroundImage = `url(${ICON_ZC})`);',
  'document.querySelectorAll("#zpOv .ic.zc, #bZc .ic.zc").forEach((e) => e.style.backgroundImage = `url(${ICON_ZC})`);');

// versão
s = s.replace(/const QZ_VERSION='[^']*';/, "const QZ_VERSION='29.6';");
s = s.replace(/const QZ_NOTE='[^']*';/, "const QZ_NOTE='Vitrine de Z-Coin: cards com rolagem lateral, aba Z-COIN na loja e botão no menu';");

fs.writeFileSync(F, s);
console.log('ok v29.6-zcoin-vitrine');
