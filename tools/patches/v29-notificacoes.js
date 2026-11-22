// v29: CAIXA DE NOTIFICAÇÕES. Um sino na tela inicial (com contador de não lidas) abre uma gaveta lateral onde
// cai tudo o que acontece com a conta: pedidos e aceites de amizade, prêmios do passe liberados e pegos, missões
// completas, caixas novas, compras, drops de chefe, subida de nível, evento ativo e versão nova do jogo.
// Itens raros e lendários: moldura e etiqueta na cor da raridade; a aura atrás da roupa vem do LOOK.thumb (v29-aura.js).
// Fora de partida, cada notificação nova desliza no topo da tela por 3 s; dentro da partida ela só entra na caixa.
// Tudo é lido do que o servidor já devolve (get_economy, get_friends, respostas das compras): não precisa de
// migração. As notificações ficam no aparelho, separadas por conta (localStorage qz_notif_<nome>).
// Uso: node tools/patches/v29-notificacoes.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};
if (s.indexOf('const NOTIF = {') >= 0) throw new Error('patch v29-notificacoes já aplicado');

// ---------- 1. CSS ----------
const BELL = `<svg viewBox="0 0 16 16" shape-rendering="crispEdges" aria-hidden="true"><path fill="#000" d="M6 1h4v1h2v1h1v6h1v2h1v2H1v-2h1V9h1V3h1V2h2z"/><path fill="#ffd84a" d="M6 2h4v1h2v6h1v2h1v1H2v-1h1V9h1V3h2z"/><path fill="#fff4b8" d="M5 4h1v4H5z"/><path fill="#b8861a" d="M11 4h1v5h1v2h-2z"/><path fill="#000" d="M6 13h4v1H9v1H7v-1H6z"/><path fill="#ffd84a" d="M7 13h2v1H7z"/></svg>`;
rep(`#qzUpd.hidden{display:none}`, `/* ==== NOTIFICAÇÕES (v29): sino + gaveta + aviso deslizante. Classes com prefixo nt (a .pop global é do dinheiro) ==== */
#ntBell{position:absolute;right:max(12px,var(--sar));top:calc(max(10px,var(--sat)) + 80px);width:46px;height:40px;padding:0;display:grid;place-items:center;background:rgba(10,8,16,.82);border:2px solid #000;box-shadow:inset 0 0 0 1px #4a4458,3px 3px 0 rgba(0,0,0,.5);cursor:pointer;zoom:var(--ui)}
#ntBell svg{width:26px;height:26px;image-rendering:pixelated}
#ntBell.on svg{animation:ntRing 4s ease-in-out infinite;transform-origin:50% 8%}
#ntBell i{position:absolute;right:-7px;top:-7px;min-width:19px;height:19px;padding:0 4px;box-sizing:border-box;display:grid;place-items:center;font:800 11px/1 var(--fs);font-style:normal;color:#fff;background:#e0283a;border:2px solid #000;border-radius:10px}
#ntBell i.hidden{display:none}
@media (max-height:500px){#ntBell{zoom:calc(.8*var(--ui))}}
@keyframes ntRing{0%,84%,100%{transform:rotate(0)}87%{transform:rotate(16deg)}90%{transform:rotate(-14deg)}93%{transform:rotate(9deg)}96%{transform:rotate(-5deg)}}
#ntScr{position:fixed;inset:0;z-index:45;background:rgba(4,2,8,.6);display:flex;justify-content:flex-end;font-family:var(--fs);color:#e9e4d8}
#ntScr.hidden{display:none}
.ntPanel{position:relative;width:min(460px,96vw);height:100%;box-sizing:border-box;display:flex;flex-direction:column;background:linear-gradient(#1d1826,#120f18);border-left:3px solid #000;box-shadow:inset 3px 0 0 #3a3446,-8px 0 24px rgba(0,0,0,.6);padding:max(8px,var(--sat)) max(10px,var(--sar)) max(8px,var(--sab)) 12px;animation:ntIn .22s ease-out}
@keyframes ntIn{from{transform:translateX(40px);opacity:0}}
.ntHead{display:flex;align-items:center;gap:10px}
.ntHead b{font-family:var(--fz);font-weight:400;font-size:26px;letter-spacing:2px;color:#ffd84a;text-shadow:2px 2px 0 #000;line-height:1}
.ntHead small{display:block;font:600 12px/1.2 var(--fs);color:#a59fb4;letter-spacing:0}
.ntHead .ntX{margin-left:auto;width:38px;height:38px;font:800 18px/1 var(--fs);color:#e9e4d8;background:#2a2433;border:2px solid #000;box-shadow:inset 0 0 0 1px #4a4458;cursor:pointer}
.ntTabs{display:flex;gap:5px;margin:8px 0 6px;overflow-x:auto;scrollbar-width:none;flex:0 0 auto}
.ntTabs::-webkit-scrollbar{display:none}
.ntTabs button{flex:0 0 auto;font:800 12px/1 var(--fs);letter-spacing:.5px;padding:7px 9px;color:#bdb6cc;background:#221d2b;border:2px solid #000;box-shadow:inset 0 0 0 1px #3a3446;cursor:pointer}
.ntTabs button.on{color:#1a0d00;background:#ffd84a;box-shadow:inset 0 -3px 0 #b8861a}
.ntTabs button em{font-style:normal;margin-left:4px;padding:1px 5px;border-radius:8px;background:#e0283a;color:#fff;font-size:10px}
.ntList{flex:1 1 auto;min-height:0;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;display:flex;flex-direction:column;gap:6px;padding:2px 2px 8px 0}
.ntDay{font:800 11px/1 var(--fs);letter-spacing:1.5px;color:#7d768c;margin:6px 0 0}
.ntRow{position:relative;display:grid;grid-template-columns:54px 1fr auto;gap:10px;align-items:center;padding:8px 10px 8px 8px;background:#1a1622;border:2px solid #000;box-shadow:inset 0 0 0 1px #2e2838;contain:layout paint}
.ntRow.nw{background:#221c2c;box-shadow:inset 3px 0 0 #ffd84a,inset 0 0 0 1px #3a3446}
.ntRow.nr2{box-shadow:inset 3px 0 0 #c46cff,inset 0 0 0 1px #3a3446}
.ntRow.nr3{box-shadow:inset 3px 0 0 #ffb82e,inset 0 0 0 1px #5a4a18;background:linear-gradient(90deg,rgba(255,184,46,.08),transparent 60%),#1a1622}
.ntIc{position:relative;width:54px;height:54px;display:grid;place-items:center;background:#0f0c14;border:2px solid #000;overflow:hidden;isolation:isolate}
.ntIc canvas,.ntIc img,.ntIc .em{position:relative;z-index:1;max-width:46px;max-height:46px;image-rendering:pixelated}
.ntIc .em{font-size:26px;line-height:1}
/* a aura da roupa vem do LOOK.thumb (patch v29-aura.js); aqui só a moldura na cor da raridade */
.ntIc.nr2{border-color:#4a2370}.ntIc.nr3{border-color:#5a3e06}
.ntTx{min-width:0}
.ntTx b{display:block;font:800 14px/1.25 var(--fs);color:#f2ede2}
.ntTx p{margin:2px 0 0;font:500 13px/1.3 var(--fs);color:#bdb6cc;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ntTx .rr{display:inline-block;margin:0 0 3px;padding:2px 5px;font:800 10px/1 var(--fs);letter-spacing:1px;color:#000;background:#c46cff}
.ntRow.nr3 .ntTx .rr{background:#ffb82e}
.ntTx time{display:block;margin-top:3px;font:600 11px/1 var(--fs);color:#7d768c}
.ntGo{display:flex;flex-direction:column;align-items:flex-end;gap:4px}
.ntGo button{font:800 12px/1 var(--fs);letter-spacing:.5px;padding:9px 11px;color:#1a0d00;background:#ffd84a;border:2px solid #000;box-shadow:inset 0 -3px 0 #b8861a;cursor:pointer;white-space:nowrap}
.ntGo button.alt{color:#e9e4d8;background:#2a2433;box-shadow:inset 0 0 0 1px #4a4458}
.ntGo .ok{font:800 12px/1 var(--fs);color:#7dff6a}
.ntEmpty{margin:auto;max-width:300px;text-align:center;font:500 14px/1.45 var(--fs);color:#a59fb4;padding:20px 0}
.ntEmpty svg{width:52px;height:52px;display:block;margin:0 auto 10px;opacity:.45;image-rendering:pixelated}
.ntFoot{display:flex;gap:6px;padding-top:6px;border-top:1px solid #2e2838;flex:0 0 auto}
.ntFoot button{flex:1;font:800 12px/1 var(--fs);padding:9px 6px;color:#bdb6cc;background:#221d2b;border:2px solid #000;box-shadow:inset 0 0 0 1px #3a3446;cursor:pointer}
#ntPop{position:fixed;left:50%;top:calc(var(--sat) + 8px);z-index:46;width:max-content;max-width:min(440px,90vw);transform:translate(-50%,-140%);transition:transform .28s cubic-bezier(.2,.9,.3,1.2);display:grid;grid-template-columns:42px 1fr;gap:10px;align-items:center;padding:6px 14px 6px 6px;background:#1d1826;border:2px solid #000;box-shadow:inset 0 0 0 1px #4a4458,inset 0 -3px 0 #ffd84a,4px 4px 0 rgba(0,0,0,.5);font-family:var(--fs);color:#f2ede2;cursor:pointer}
#ntPop.in{transform:translate(-50%,0)}
#ntPop.nr2{box-shadow:inset 0 0 0 1px #4a4458,inset 0 -3px 0 #c46cff,0 0 18px rgba(196,108,255,.45),4px 4px 0 rgba(0,0,0,.5)}
#ntPop.nr3{box-shadow:inset 0 0 0 1px #5a4a18,inset 0 -3px 0 #ffb82e,0 0 22px rgba(255,184,46,.5),4px 4px 0 rgba(0,0,0,.5)}
#ntPop .ntIc{width:42px;height:42px}
#ntPop .ntIc canvas,#ntPop .ntIc img{max-width:36px;max-height:36px}
#ntPop .ntIc .em{font-size:20px}
#ntPop b{display:block;font:800 13px/1.2 var(--fs)}
#ntPop p{margin:1px 0 0;font:500 12px/1.25 var(--fs);color:#bdb6cc;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60vw}
@media (max-height:440px){.ntHead b{font-size:22px}.ntTabs{margin:6px 0 4px}.ntTabs button{padding:6px 8px}.ntList{gap:5px}.ntTx b{font-size:13px}.ntTx p{font-size:12px}.ntTx time{margin-top:2px}.ntGo button{padding:8px 9px}.ntRow{grid-template-columns:46px 1fr auto;padding:5px 8px 5px 6px;gap:8px}.ntIc{width:46px;height:46px}.ntIc canvas,.ntIc img{max-width:40px;max-height:40px}}
@media (prefers-reduced-motion:reduce){#ntBell.on svg,.ntPanel{animation:none!important}#ntPop{transition:none}}
#qzUpd.hidden{display:none}`);

// ---------- 2. HTML ----------
rep(`<button id="bFeed" class="yo">FEEDBACK</button>`, `<button id="bFeed" class="yo">FEEDBACK</button>
  <button id="ntBell" aria-label="Notificações">${BELL}<i class="hidden" id="ntBadge">0</i></button>`);
rep(`<div id="qzUpd" class="hidden">`, `<div id="ntScr" class="hidden" role="dialog" aria-label="Notificações"><div class="ntPanel">
  <div class="ntHead"><div><b>NOTIFICAÇÕES</b><small id="ntSub">Tudo o que chegou pra você</small></div><button class="ntX" id="ntClose" aria-label="Fechar">✕</button></div>
  <div class="ntTabs" id="ntTabs"></div>
  <div class="ntList" id="ntList"></div>
  <div class="ntFoot"><button id="ntReadAll">MARCAR TUDO COMO LIDO</button><button id="ntClear">APAGAR AS LIDAS</button></div>
</div></div>
<div id="ntPop" aria-live="polite"></div>
<div id="qzUpd" class="hidden">`);

// ---------- 3. ganchos nos sistemas que já existem ----------
const T = (code) => `try { ${code} } catch (e) {}`;
// amigos: a lista do servidor chega aqui (badge e tela de amigos)
rep(`  setBadge(n) {`, `  setBadge(n) {
    ${T('NOTIF.friends(FRIENDS.list);')}`);
// economia: passe, missões, caixas e evento
rep(`if (!$("ecoScr").classList.contains("hidden")) this.show(this.tab);`, `if (!$("ecoScr").classList.contains("hidden")) this.show(this.tab);
      ${T('NOTIF.eco(d);')}`);
// compras e resgates
rep(`const a = b.dataset.act, done = (r) => this.got(r).then(() => this.show());`, `const a = b.dataset.act, done = (r) => {
      ${T('NOTIF.acted(a, b, r);')}
      return this.got(r).then(() => this.show());
    };`);
rep(`      CHEST.play(r, this.prize(r.kind, r.amount, r.item));`, `      CHEST.play(r, this.prize(r.kind, r.amount, r.item));
      ${T('NOTIF.acted("box", b, r);')}`);
// drops de chefe (na partida: só entra na caixa, sem aviso por cima do jogo)
rep(`UI.toast && UI.toast("+1 CHIP DE TECNOLOGIA", "#3ee6c8");`, `UI.toast && UI.toast("+1 CHIP DE TECNOLOGIA", "#3ee6c8");
        ${T('NOTIF.push({ id: "dr:c:" + NET.st.run + ":" + kind, k: "drop", t: "O chefe largou um chip", b: "+1 chip de tecnologia", ic: "chip", r: 2 });')}`);
rep(`setTimeout(() => UI.toast && UI.toast("+" + r.zcoin + " Z-COIN", "#c86aff"), 900);`, `setTimeout(() => UI.toast && UI.toast("+" + r.zcoin + " Z-COIN", "#c86aff"), 900);
        ${T('NOTIF.push({ id: "dr:z:" + NET.st.run + ":" + kind, k: "drop", t: "O chefe largou Z-Coin", b: "+" + r.zcoin + " Z-Coin", ic: "zc", r: 3 });')}`);
// subida de nível no fim da partida
rep(`if (msg.length) add("Nível novo: " + msg.join(", "));`, `if (msg.length) add("Nível novo: " + msg.join(", "));
      ${T('NOTIF.push({ id: "lv:" + D.level, k: "lvl", t: "Subiu pro nível " + D.level + "!", b: msg.length ? "Liberou: " + msg.join(", ") : "Seu personagem está mais forte.", ic: "lvl" });')}`);
// versão nova
rep(`$("qzUpd").classList.remove("hidden");`, `$("qzUpd").classList.remove("hidden");
    ${T('NOTIF.push({ id: "up:" + m[1], k: "upd", t: "Versão nova: v" + m[1], b: nt ? nt[1] : "Atualize para pegar as novidades.", ic: "upd", go: "upd" });')}`);
// ao voltar pra tela inicial o sino se atualiza
rep(`if (id === "title") TITLE.refresh();`, `if (id === "title") { TITLE.refresh(); ${T('NOTIF.badge();')} }`);

// ---------- 4. o módulo ----------
rep(`$("bEcoBack").onclick = () => UI.show("title");`, `$("bEcoBack").onclick = () => UI.show("title");
// ===== NOTIFICAÇÕES (v29): caixa única de tudo o que acontece com a conta. Vive no aparelho, uma lista por conta.
// Fontes: get_friends (pedidos/aceites), get_economy (passe, missões, caixas, evento), respostas de compra e
// resgate, drops de chefe, nível novo e versão nova. "seen" guarda os ids que já viraram notificação para nunca
// repetir, mesmo depois que a lista apaga as antigas.
const NOTIF = {
  max: 80, list: [], seen: [], meta: {}, key: null, tab: "all", popQ: [], popT: 0,
  CAT: { fr: "fr", fra: "fr", pass: "pz", mis: "pz", box: "pz", drop: "pz", lvl: "pz", buy: "lj", bpass: "lj", open: "pz", evt: "av", upd: "av", hi: "av" },
  TABS: [["all", "TUDO"], ["pz", "PRÊMIOS"], ["fr", "AMIGOS"], ["lj", "COMPRAS"], ["av", "AVISOS"]],
  RN: ["", "", "RARO", "LENDÁRIO"],
  esc: (t) => String(t == null ? "" : t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]),
  // a conta muda (entrar/sair): troca de lista
  sync() {
    const k = "qz_notif_" + (NET.logged && NET.st.name ? NET.st.name.toLowerCase() : "_");
    if (k === this.key) return;
    this.key = k;
    let o = null;
    try { o = JSON.parse(localStorage.getItem(k) || "null"); } catch (e) {}
    this.list = o && o.l || []; this.seen = o && o.s || []; this.meta = o && o.m || {};
    if (!o) this.push({ id: "hi", k: "hi", t: "Chegou a caixa de notificações", b: "Pedidos de amizade, prêmios do passe, compras e novidades ficam guardados aqui.", ic: "bell" }, 1);
  },
  save() {
    if (this.seen.length > 400) this.seen = this.seen.slice(-300);
    try { localStorage.setItem(this.key, JSON.stringify({ l: this.list, s: this.seen, m: this.meta })); } catch (e) {}
  },
  has(id) { return this.seen.indexOf(id) >= 0; },
  // o = { id, k (tipo), t (título), b (texto), ic ("item"|"coin"|"chip"|"zc"|"fr"|...), it (id da roupa), r (2 raro, 3 lendário), go, arg }
  push(o, quiet) {
    this.sync();
    if (this.has(o.id)) return false;
    this.seen.push(o.id);
    o.ts = o.ts || Date.now();
    o.nw = 1;
    this.list.unshift(o);
    // apaga as mais velhas já lidas primeiro
    while (this.list.length > this.max) {
      let i = this.list.length - 1;
      while (i > 0 && this.list[i].nw) i--;
      this.list.splice(i, 1);
    }
    this.save();
    this.badge();
    if (this.open) this.draw();
    else if (!quiet) this.pop(o);
    return true;
  },
  // a ação da notificação já foi feita (prêmio pego, pedido respondido): some o botão
  done(id, txt) {
    this.sync();
    const n = this.list.find((x) => x.id === id);
    if (!n || n.ok) return;
    n.ok = txt || "feito";
    this.save();
    if (this.open) this.draw();
  },
  unread() { this.sync(); return this.list.filter((n) => n.nw).length; },
  badge() {
    const n = this.unread(), e = $("ntBadge");
    e.textContent = n > 9 ? "9+" : n;
    e.classList.toggle("hidden", !n);
    $("ntBell").classList.toggle("on", !!n);
    $("ntBell").setAttribute("aria-label", n ? "Notificações: " + n + " novas" : "Notificações");
  },
  icon(n, cls) {
    const r = n.r >= 2 ? " nr" + n.r : "";
    let a;
    if (n.it && LOOK.ITEMS[n.it]) a = '<canvas data-nt="' + this.esc(n.it) + '"></canvas>';
    else if (n.ic === "coin" || n.ic === "zc" || n.ic === "chip") a = '<img alt="" src="' + (n.ic === "zc" ? ICON_ZC : n.ic === "chip" ? ICON_CHIP : ICON_GOLD) + '">';
    else a = '<span class="em">' + ({ fr: "🤝", fra: "🤝", lvl: "⭐", upd: "⬆️", evt: "🔥", mis: "🎯", box: "📦", pass: "🎟️", bell: "🔔" }[n.ic] || "🔔") + "</span>";
    return '<div class="ntIc' + r + (cls || "") + '">' + a + "</div>";
  },
  paintThumbs(el) {
    el.querySelectorAll("canvas[data-nt]").forEach((c) => { try { LOOK.thumb(c, [c.dataset.nt]); } catch (e) {} });
  },
  ago(ts) {
    const m = Math.floor((Date.now() - ts) / 6e4);
    if (m < 1) return "agora";
    if (m < 60) return "há " + m + " min";
    const h = Math.floor(m / 60);
    if (h < 24) return "há " + h + " h";
    return new Date(ts).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }) + " às " + new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  },
  day(ts) {
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    return ts >= +d0 ? "HOJE" : ts >= +d0 - 864e5 ? "ONTEM" : "ANTES";
  },
  btn(n) {
    if (n.ok) return '<span class="ok">✓ ' + this.esc(n.ok) + "</span>";
    const L = { pass: "PEGAR", mis: "PEGAR", box: "ABRIR", fr: "RESPONDER", fra: "VER", upd: "ATUALIZAR", evt: "VER", buy: "VESTIR", open: "VESTIR", bpass: "VER" }[n.go ? n.k : ""];
    return L ? '<button data-go="' + this.esc(n.id) + '"' + (n.k === "fra" || n.k === "evt" || n.k === "bpass" ? ' class="alt"' : "") + ">" + L + "</button>" : "";
  },
  draw() {
    this.sync();
    const L = this.list, isNw = (n) => n.nw || this.fresh && this.fresh.indexOf(n.id) >= 0, cnt = (c) => L.filter((n) => isNw(n) && (c === "all" || this.CAT[n.k] === c)).length;
    $("ntTabs").innerHTML = this.TABS.map(([c, t]) => { const k = cnt(c); return '<button data-t="' + c + '"' + (c === this.tab ? ' class="on"' : "") + ">" + t + (k ? "<em>" + k + "</em>" : "") + "</button>"; }).join("");
    const show = L.filter((n) => this.tab === "all" || this.CAT[n.k] === this.tab);
    const nw = cnt("all");
    $("ntSub").textContent = nw ? (nw === 1 ? "1 nova" : nw + " novas") : "Tudo lido";
    if (!show.length) {
      $("ntList").innerHTML = '<div class="ntEmpty">' + ${JSON.stringify(BELL)} + (this.tab === "all" ? "Nada por aqui ainda. Jogue, chame os amigos e suba o passe: o que chegar aparece aqui." : "Nada nesta aba por enquanto.") + "</div>";
      return;
    }
    let h = "", last = "";
    for (const n of show) {
      const d = this.day(n.ts);
      if (d !== last) { h += '<div class="ntDay">' + d + "</div>"; last = d; }
      h += '<div class="ntRow' + (isNw(n) ? " nw" : "") + (n.r >= 2 ? " nr" + n.r : "") + '">' + this.icon(n) + '<div class="ntTx">' + (n.r >= 2 ? '<span class="rr">' + this.RN[n.r] + "</span>" : "") + "<b>" + this.esc(n.t) + "</b>" + (n.b ? "<p>" + this.esc(n.b) + "</p>" : "") + "<time>" + this.ago(n.ts) + '</time></div><div class="ntGo">' + this.btn(n) + "</div></div>";
    }
    $("ntList").innerHTML = h;
    this.paintThumbs($("ntList"));
  },
  show() {
    this.sync();
    this.open = 1;
    this.tab = "all";
    this.fresh = this.list.filter((n) => n.nw).map((n) => n.id);
    $("ntScr").classList.remove("hidden");
    $("ntPop").classList.remove("in");
    this.draw();
    $("ntList").scrollTop = 0;
    SFX.swap && SFX.swap();
    // abriu a caixa: tudo o que estava na tela conta como lido, mas o destaque fica até fechar
    this.list.forEach((n) => n.nw = 0);
    this.save();
    this.badge();
    if (NET.logged) { try { FRIENDS.badge(); } catch (e) {} }
  },
  hide() {
    this.open = 0;
    this.fresh = null;
    $("ntScr").classList.add("hidden");
    this.badge();
  },
  // aviso deslizante: só fora da partida, um por vez
  pop(n) {
    if (S.mode === "play" || S.mode === "pause") return;
    this.popQ.push(n);
    if (!this.popT) this.popNext();
  },
  popNext() {
    const n = this.popQ.shift(), el = $("ntPop");
    if (!n) { this.popT = 0; return; }
    el.className = n.r >= 2 ? "nr" + n.r : "";
    el.innerHTML = this.icon(n) + "<div><b>" + this.esc(n.t) + "</b>" + (n.b ? "<p>" + this.esc(n.b) + "</p>" : "") + "</div>";
    this.paintThumbs(el);
    void el.offsetWidth;
    el.classList.add("in");
    this.popT = setTimeout(() => { el.classList.remove("in"); this.popT = setTimeout(() => this.popNext(), 320); }, 3200);
  },
  // ---------- fontes ----------
  friends(L) {
    if (!NET.logged || !L) return;
    this.sync();
    const rec = L.filter((f) => f.kind === "recebido").map((f) => f.name), am = L.filter((f) => f.kind === "amigo").map((f) => f.name), env = L.filter((f) => f.kind === "enviado").map((f) => f.name);
    rec.forEach((nm) => this.push({ id: "fr:" + nm, k: "fr", t: nm + " quer ser seu amigo", b: "Aceite para disputar o ranking entre amigos.", ic: "fr", go: 1 }));
    // pedido respondido em outro lugar: tira o botão e deixa o id livre para um pedido novo no futuro
    this.list.forEach((n) => {
      if (n.k !== "fr" || n.ok) return;
      const nm = n.id.slice(3);
      if (rec.indexOf(nm) < 0) { n.ok = am.indexOf(nm) >= 0 ? "agora são amigos" : "respondido"; this.seen = this.seen.filter((x) => x !== n.id); n.id += ":" + n.ts; }
    });
    // quem eu chamei e agora é amigo: aceitou
    (this.meta.sent || []).forEach((nm) => { if (am.indexOf(nm) >= 0) this.push({ id: "fra:" + nm + ":" + Date.now(), k: "fra", t: nm + " aceitou seu pedido", b: "Vocês agora são amigos. Vejam quem aguenta mais no RANKING > AMIGOS.", ic: "fra", go: 1 }); });
    this.meta.sent = env;
    this.save();
  },
  eco(d) {
    if (!d) return;
    this.sync();
    const P = d.pass;
    if (P && P.rewards) {
      const lv = Math.min(P.levels, Math.floor(P.xp / P.xp_per)), fresh = [];
      P.rewards.forEach((r) => {
        const id = "ps:" + P.name + ":" + r.l + ":" + r.t, st = ECO.passState(P, lv, r.l, r.t);
        if (st === "can" && !this.has(id)) fresh.push([id, r]);
        if (st === "done") this.done(id, "pego");
      });
      const mk = ([id, r]) => {
        const it = r.k === "item" ? LOOK.ITEMS[r.i] : null, tier = CHEST.tier({ kind: r.k, item: r.i });
        return { id, k: "pass", t: "Prêmio do passe liberado", b: "Nível " + r.l + (r.t === "prem" ? " ★ premium" : "") + ": " + ECO.prize(r.k, r.a, r.i), it: it ? r.i : null, ic: r.k === "coins" ? "coin" : r.k === "zcoin" ? "zc" : r.k === "chip" ? "chip" : "pass", r: it && tier >= 2 ? tier : 0, go: 1, arg: r.l + ":" + r.t };
      };
      // muitos de uma vez (primeira abertura): um resumo + só os raros/lendários separados
      if (fresh.length > 3) {
        const big = fresh.filter(([, r]) => r.k === "item" && CHEST.tier({ kind: r.k, item: r.i }) >= 2);
        fresh.forEach(([id]) => this.seen.push(id));
        this.push({ id: "psn:" + P.name + ":" + lv, k: "pass", t: fresh.length + " prêmios do passe esperando", b: "Do nível " + fresh[0][1].l + " ao " + fresh[fresh.length - 1][1].l + ". Pegue antes da temporada acabar.", ic: "pass", go: 1, arg: fresh[0][1].l + ":" + fresh[0][1].t });
        big.forEach((x) => { this.seen = this.seen.filter((y) => y !== x[0]); this.push(mk(x), 1); });
      } else fresh.forEach((x) => this.push(mk(x)));
    }
    (d.missions || []).forEach((m) => {
      const id = "ms:" + this.week() + ":" + m.slot + ":" + m.text;
      if (m.progress >= m.target && !m.claimed) this.push({ id, k: "mis", t: "Missão completa", b: m.text + " · " + m.coins + " moedas + " + m.xp + " XP" + (m.zcoin ? " + " + m.zcoin + " Z-Coin" : ""), ic: "mis", go: 1 });
      if (m.claimed) this.done(id, "pego");
    });
    const bx = d.boxes | 0, was = this.meta.boxes;
    if (was != null && bx > was) this.push({ id: "bx:" + Date.now(), k: "box", t: bx - was === 1 ? "Caixa nova!" : bx - was + " caixas novas!", b: "Você tem " + bx + (bx === 1 ? " caixa fechada." : " caixas fechadas."), ic: "box", go: 1 });
    if (!bx) this.list.forEach((n) => { if (n.k === "box" && !n.ok) n.ok = "aberta"; });
    this.meta.boxes = bx;
    if (d.event && new Date(d.event.ends) > Date.now()) this.push({ id: "ev:" + d.event.name + ":" + d.event.ends, k: "evt", t: "Evento: " + d.event.name, b: "XP do passe x" + d.event.mult + " até " + new Date(d.event.ends).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) + ".", ic: "evt", go: 1 });
    this.save();
  },
  week() {
    const t = new Date(Date.now() - 3 * 36e5);
    t.setHours(0, 0, 0, 0);
    t.setDate(t.getDate() - (t.getDay() + 6) % 7);
    return t.toISOString().slice(0, 10);
  },
  acted(a, b, r) {
    const now = Date.now();
    if (a === "claim") {
      const P = ECO.data && ECO.data.pass, l = +b.dataset.l, t = b.dataset.t, rw = P && (P.rewards || []).find((x) => x.l === l && x.t === t);
      if (P) this.done("ps:" + P.name + ":" + l + ":" + t, "pego");
      if (rw) {
        const it = rw.k === "item" ? LOOK.ITEMS[rw.i] : null, tier = CHEST.tier({ kind: rw.k, item: rw.i });
        this.push({ id: "pc:" + now, k: it ? "open" : "pass", t: "Você pegou: " + ECO.prize(rw.k, rw.a, rw.i), b: "Passe, nível " + l + (t === "prem" ? " ★ premium" : "") + (it ? ". Já está no seu guarda-roupa." : "."), it: it ? rw.i : null, ic: rw.k === "zcoin" ? "zc" : rw.k === "chip" ? "chip" : "coin", r: it && tier >= 2 ? tier : 0, go: it ? 1 : 0 });
      }
    } else if (a === "mis") {
      this.list.forEach((n) => { if (n.k === "mis" && !n.ok && n.id.indexOf("ms:" + this.week() + ":" + b.dataset.s + ":") === 0) n.ok = "pego"; });
      this.push({ id: "mc:" + now, k: "mis", t: "Missão paga", b: r && r.coins ? "+" + r.coins + " moedas" + (r.zcoin ? " + " + r.zcoin + " Z-Coin" : "") : "Prêmio na conta.", ic: "mis" }, 1);
    } else if (a === "item") {
      const id = b.dataset.id, it = LOOK.ITEMS[id], tier = CHEST.tier({ kind: "item", item: id });
      this.push({ id: "by:" + id + ":" + now, k: "buy", t: "Compra aprovada: " + ECO.name(id), b: "Já está no seu guarda-roupa.", it: it ? id : null, ic: "zc", r: tier >= 2 ? tier : 0, go: it ? 1 : 0 });
    } else if (a === "buypass") {
      this.push({ id: "bp:" + now, k: "bpass", t: "Passe premium ativado", b: "A trilha ★ premium está liberada. Pegue os prêmios dos níveis que você já tem.", ic: "pass", r: 3, go: 1 });
    } else if (a === "box" && r) {
      const it = r.kind === "item" ? LOOK.ITEMS[r.item] : null, tier = CHEST.tier(r);
      this.push({ id: "bo:" + now, k: it ? "open" : "box", t: "Saiu da caixa: " + ECO.prize(r.kind, r.amount, r.item), b: it ? "Roupa nova no guarda-roupa." : "Já está na sua conta.", it: it ? r.item : null, ic: r.kind === "zcoin" ? "zc" : r.kind === "chip" ? "chip" : "coin", r: tier >= 2 ? tier : 0, go: it ? 1 : 0 }, 1);
    }
  },
  // ---------- o botão de cada notificação ----------
  go(id) {
    const n = this.list.find((x) => x.id === id);
    if (!n) return;
    this.hide();
    SFX.swap && SFX.swap();
    if (n.k === "pass" || n.k === "bpass" || n.k === "evt" || n.k === "mis" || n.k === "box") {
      UI.show("ecoScr");
      if (n.arg) ECO.sel = n.arg;
      ECO.show(n.k === "mis" ? "mis" : n.k === "box" ? "box" : "pass");
      ECO.refresh();
    } else if (n.k === "fr" || n.k === "fra") FRIENDS.show();
    else if (n.k === "upd") { const b = $("qzUpdGo"); b && b.onclick ? b.click() : location.reload(); }
    else if (n.k === "buy" || n.k === "open") { UI.show("title"); $("bChar").click(); }
  }
};
$("ntBell").onclick = () => NOTIF.show();
$("ntClose").onclick = () => NOTIF.hide();
$("ntScr").onclick = (e) => { if (e.target.id === "ntScr") NOTIF.hide(); };
$("ntTabs").onclick = (e) => { const b = e.target.closest("button[data-t]"); if (b) { NOTIF.tab = b.dataset.t; NOTIF.draw(); } };
$("ntList").onclick = (e) => { const b = e.target.closest("button[data-go]"); if (b) NOTIF.go(b.dataset.go); };
$("ntReadAll").onclick = () => { NOTIF.fresh = null; NOTIF.list.forEach((n) => n.nw = 0); NOTIF.save(); NOTIF.draw(); NOTIF.badge(); };
$("ntClear").onclick = () => { NOTIF.list = NOTIF.list.filter((n) => n.nw || NOTIF.fresh && NOTIF.fresh.indexOf(n.id) >= 0); NOTIF.save(); NOTIF.draw(); NOTIF.badge(); };
$("ntPop").onclick = () => { clearTimeout(NOTIF.popT); NOTIF.popT = 0; NOTIF.popQ = []; $("ntPop").classList.remove("in"); NOTIF.show(); };
addEventListener("keydown", (e) => { if (NOTIF.open && e.key === "Escape") { e.stopPropagation(); NOTIF.hide(); } }, true);
// na tela inicial, confere pedidos de amizade a cada 90 s (leve: uma chamada) enquanto o app está aberto na frente
setInterval(() => {
  if (!NET.logged || DEV.on || document.hidden || $("title").classList.contains("hidden")) return;
  try { FRIENDS.badge(); } catch (e) {}
}, 9e4);
NOTIF.badge();`);

fs.writeFileSync(F, s);
console.log('ok v29-notificacoes');
