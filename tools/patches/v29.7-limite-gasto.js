// v29.7: compra de Z-Coin com responsabilidade (ideia 7, aprovada pelo dono em 24/11).
//   - Idade perguntada uma vez, antes da primeira compra (o servidor recusa pedido sem idade: IDADE_PENDENTE).
//   - Menor de 18: aviso de pedir autorização ao responsável a cada compra + teto obrigatório (R$ 50, máx. R$ 100).
//   - LIMITE DE GASTO: teto mensal opcional. Baixar vale na hora; subir/tirar espera 72 h (o servidor manda).
//   - MINHAS COMPRAS: todas as compras da conta (zc_my_orders), comprovante e pedido de devolução em até 7 dias
//     (CDC art. 49). A Z-Coin da compra sai da carteira ao pedir; se for negado, volta.
// Servidor: supabase/migrations/v29_7_limite_gasto.sql. Não mexe nos baús nem no checkout (só embrulha ZPAY.buy).
// Uso: node tools/patches/v29.7-limite-gasto.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

// ---------- CSS
rep('#zpOv.hidden{display:none}',
  '#zpOv.hidden{display:none}\n' +
  '/* v29.7: limite de gasto e minhas compras */\n' +
  '.zcMine{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;margin:8px 0 2px}\n' +
  '.zcMine .btn{font-size:14px;padding:6px 12px;min-height:34px}\n' +
  '.zcMo{flex-basis:100%;text-align:center;font:12px system-ui,sans-serif;color:#cfc4e0}.zcMo:empty{display:none}\n' +
  '#zhOv{position:fixed;inset:0;z-index:81;display:flex;align-items:center;justify-content:center;background:rgba(6,4,12,.86);padding:12px}\n' +
  '#zhOv.hidden{display:none}\n' +
  '#zhOv .zhBox{width:min(560px,100%);max-height:100%;display:flex;flex-direction:column;box-sizing:border-box;background:linear-gradient(#221b31,#141019);border:2px solid #000;box-shadow:inset 0 0 0 2px #5b3a8a,0 0 40px rgba(176,74,255,.35);border-radius:10px;overflow:hidden}\n' +
  '#zhOv.ask .zhBox{width:min(440px,100%)}\n' +
  '#zhOv .zhHead{display:flex;align-items:center;gap:8px;padding:10px 12px 6px}\n' +
  '#zhOv .zhHead b{flex:1;font-family:var(--fy);font-size:20px;color:#fff;letter-spacing:1px}\n' +
  '#zhOv .zhX{width:36px;height:36px;background:#24202d;color:#e9e4d8;border:2px solid #000;box-shadow:inset 0 0 0 1px #4a4458;font:700 16px system-ui,sans-serif;cursor:pointer}\n' +
  '#zhOv .zhTabs{display:flex;gap:6px;padding:0 12px 8px}#zhOv.ask .zhTabs{display:none}\n' +
  '#zhOv .zhTabs button{flex:1;min-height:34px;background:#24202d;color:#cfc4e0;border:2px solid #000;font-family:var(--fy);font-size:15px;cursor:pointer}\n' +
  '#zhOv .zhTabs button.on{background:#6a2fb0;color:#fff}\n' +
  '#zhOv .zhBody{overflow-y:auto;padding:0 12px 12px;font:14px/1.35 system-ui,sans-serif;color:#d9d3e6;scrollbar-width:thin;scrollbar-color:#6a3aa8 transparent}\n' +
  '#zhOv .zhBody p{margin:4px 0 10px}#zhOv .zhBody small{color:#a99fbd}\n' +
  '#zhOv .zhBtns{display:flex;flex-direction:column;gap:8px;margin-top:6px}#zhOv .zhBtns .btn{width:100%}\n' +
  '#zhOv .zhRow{display:grid;grid-template-columns:1fr auto;gap:2px 10px;padding:9px 10px;margin-bottom:8px;background:rgba(0,0,0,.28);border:1px solid #3a2f4c}\n' +
  '#zhOv .zhRow b{color:#fff}#zhOv .zhRow .zhP{text-align:right;font-weight:700;color:#fff}\n' +
  '#zhOv .zhRow .zhA{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:6px;margin-top:4px}\n' +
  '#zhOv .zhRow .zhA .btn{font-size:13px;padding:5px 10px;min-height:30px}\n' +
  '#zhOv .zhTag{display:inline-block;padding:1px 6px;margin-left:4px;font-size:11px;font-weight:700;border:1px solid #000;color:#0a0a0a;background:#9a92a8;vertical-align:1px}\n' +
  '#zhOv .zhTag.ok{background:#7dff6a}#zhOv .zhTag.wa{background:#ffc23a}#zhOv .zhTag.no{background:#ff7a7a}#zhOv .zhTag.rf{background:#c86aff}\n' +
  '#zhOv .zhMeter{height:12px;background:#0d0a12;border:2px solid #000;box-shadow:inset 0 0 0 1px #4a4458;margin:6px 0 4px}\n' +
  '#zhOv .zhMeter i{display:block;height:100%;background:#b070ff}#zhOv .zhMeter.full i{background:#ff7a7a}\n' +
  '#zhOv .zhOpts{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:6px 0}\n' +
  '#zhOv .zhOpts .btn{font-size:14px;padding:6px 4px;min-height:36px}#zhOv .zhOpts .btn.on{box-shadow:inset 0 0 0 2px #fff}#zhOv .btn:disabled{opacity:.3;filter:grayscale(1);cursor:not-allowed}\n' +
  '#zhOv .zhOwn{display:flex;gap:6px;align-items:center;margin:6px 0}\n' +
  '#zhOv input,#zhOv textarea{box-sizing:border-box;background:#0d0a12;color:#fff;border:2px solid #4a4458;padding:7px;font:15px system-ui,sans-serif}\n' +
  '#zhOv .zhOwn input{width:110px}#zhOv textarea{width:100%;min-height:60px;resize:vertical}\n' +
  '#zhOv .zhBox2{padding:9px 10px;margin:8px 0;background:rgba(200,106,255,.12);border:1px solid #6a3aa8}\n' +
  '#zhOv .zhWarn{background:rgba(255,194,58,.12);border-color:#a87b1c}\n' +
  '@media (max-height:500px){#zhOv{padding:6px}#zhOv .zhHead b{font-size:17px}#zhOv .zhBody{font-size:13px}#zhOv .zhOpts{grid-template-columns:repeat(6,1fr)}}');

// ---------- janela (fica ao lado da janela do pagamento)
rep('<button class="btn alt hidden" id="zpX">VOLTAR</button></div></div>',
  '<button class="btn alt hidden" id="zpX">VOLTAR</button></div></div>\n' +
  '<div id="zhOv" class="hidden" role="dialog" aria-modal="true" aria-labelledby="zhT"><div class="zhBox"><div class="zhHead"><b id="zhT">MINHAS COMPRAS</b><button class="zhX" id="zhX" aria-label="Fechar">✕</button></div><div class="zhTabs" id="zhTabs"><button data-zt="hist">COMPRAS</button><button data-zt="lim">LIMITE DE GASTO</button></div><div class="zhBody" id="zhBody"></div></div></div>');

// ---------- botões embaixo da vitrine
rep('    return h + \'</div><button class="zcArr r" aria-label="Próximo">&rsaquo;</button></div><div class="zcDots">\' + P.map(() => "<i></i>").join("") + "</div>";',
  '    return h + \'</div><button class="zcArr r" aria-label="Próximo">&rsaquo;</button></div><div class="zcDots">\' + P.map(() => "<i></i>").join("") + "</div>" + ZLIM.bar();');
rep('    root.querySelectorAll(".zcShop").forEach((w) => this.wire(w));\n',
  '    root.querySelectorAll(".zcShop").forEach((w) => this.wire(w));\n' +
  '    ZLIM.month();\n');

// ---------- lógica
rep('// v29.6: vitrine de Z-Coin (cards com arte em trilho lateral).',
  `// v29.7: limite de gasto, idade, minhas compras e devolução. Quem decide é o servidor (v29_7_limite_gasto.sql);
// aqui só se pergunta, mostra e avisa antes de abrir o pagamento.
Object.assign(ECO_ERR, {
  LIMITE_MES: "Passou do seu limite de gasto do mês",
  IDADE_PENDENTE: "Informe sua idade antes de comprar",
  LIMITE_MENOR: "Menor de 18: o limite vai até R$ 100 por mês",
  LIMITE_INVALIDO: "Valor de limite inválido",
  PRAZO_DEVOLUCAO: "Passou o prazo de 7 dias para devolução",
  ZCOIN_JA_USADA: "Você já usou parte dessa Z-Coin. Fale com a gente em Ajustes › Feedback",
  DEVOLUCAO_JA_PEDIDA: "Você já pediu a devolução dessa compra",
  DEVOLUCAO_JA_ANALISADA: "Essa devolução já foi analisada",
  PEDIDO_NAO_PAGO: "Só dá para devolver compra aprovada"
});
const ZLIM = {
  info: null, list: null, tab: "hist", res: null, OPTS: [2000, 5000, 10000, 20000, 50000],
  cents(p) { return Math.round(parseFloat(String(p && p.p || "").replace(/[^\\d,]/g, "").replace(",", ".")) * 100) || 0; },
  brl(c) { return "R$ " + ((c || 0) / 100).toFixed(2).replace(".", ",").replace(/\\B(?=(\\d{3})+(?!\\d))/g, "."); },
  esc(t) { return String(t == null ? "" : t).replace(/[&<>"']/g, (c) => "&#" + c.charCodeAt(0) + ";"); },
  day(t, h) { const d = new Date(t); return isNaN(d) ? "" : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: h ? void 0 : "2-digit" }) + (h ? " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : ""); },
  bar() { return '<div class="zcMine"><button class="btn alt" data-zh="hist">MINHAS COMPRAS</button><button class="btn alt" data-zh="lim">LIMITE DE GASTO</button><span class="zcMo"></span></div>'; },
  load() { return NET.rpc("zc_spend_info", {}).then((r) => (this.info = r)); },
  // "este mês: R$ x de R$ y" embaixo da vitrine
  month() {
    const put = () => document.querySelectorAll(".zcMo").forEach((e) => {
      const i = this.info;
      e.textContent = !i ? "" : i.limit_cents != null ? "Este mês: " + this.brl(i.month_cents) + " de " + this.brl(i.limit_cents) + " do seu limite" : i.month_cents ? "Este mês: " + this.brl(i.month_cents) + " em Z-Coin" : "";
    });
    put();
    if (NET.logged && !DEV.on) this.load().then(put, () => {});
  },
  free() { document.querySelectorAll("[data-act=pack]").forEach((b) => b.disabled = false); },
  // ---- janela
  open(tab) {
    SFX.swap && SFX.swap();
    this.tab = tab || this.tab;
    const f = this.res; this.res = null; f && f(null);
    $("zhOv").className = "";
    $("zhT").textContent = "Z-COIN";
    this.draw();
    if (NET.logged) Promise.all([this.load().catch(() => null), NET.rpc("zc_my_orders", { p_limit: 100 }).then((l) => (this.list = l || []), () => (this.list = this.list || "erro"))]).then(() => { if (!$("zhOv").className) this.draw(); });
  },
  close() {
    $("zhOv").className = "hidden";
    if (this.res) { const f = this.res; this.res = null; f(null); }
  },
  // pergunta com botões; resolve com o valor do botão (null = fechou)
  ask(title, html, btns) {
    const f = this.res; this.res = null; f && f(null);
    $("zhOv").className = "ask";
    $("zhT").textContent = title;
    $("zhBody").innerHTML = html + '<div class="zhBtns">' + btns.map((b) => '<button class="btn ' + (b[2] || "alt") + '" data-zq="' + b[0] + '">' + b[1] + "</button>").join("") + "</div>";
    const fb = $("zhBody").querySelector("[data-zq]"); fb && fb.focus();
    return new Promise((ok) => (this.res = ok));
  },
  answer(v) { const f = this.res; this.res = null; $("zhOv").className = "hidden"; f && f(v); },
  draw() {
    const B = $("zhBody");
    document.querySelectorAll("#zhTabs button").forEach((b) => b.classList.toggle("on", b.dataset.zt === this.tab));
    if (!NET.logged) { B.innerHTML = "<p>Entre na sua conta para ver suas compras e escolher um limite de gasto.</p>"; return; }
    B.innerHTML = this.tab === "lim" ? this.limHtml() : this.histHtml();
  },
  histHtml() {
    const L = this.list;
    if (L == null) return '<p>Carregando suas compras...</p>';
    if (L === "erro") return '<p>Não deu para carregar agora. Confira a internet e abra de novo.</p>';
    if (!L.length) return '<p>Nenhuma compra de Z-Coin nesta conta ainda.</p>';
    const now = Date.now(), dias = this.info && this.info.refund_days || 7;
    let h = '<p><small>Compras de Z-Coin desta conta, das mais novas para as mais antigas. Compra aprovada pode ser devolvida em até ' + dias + ' dias (Código de Defesa do Consumidor, art. 49).</small></p>';
    L.forEach((o) => {
      const old = o.status === "pending" && now - new Date(o.created_at) > 36e5;
      const st = o.status === "paid" ? ["ok", "APROVADA"] : o.status === "failed" ? ["no", "RECUSADA"] : old ? ["", "NÃO FINALIZADA"] : ["wa", "AGUARDANDO"];
      const rf = o.refund, RS = { pedido: ["rf", "DEVOLUÇÃO EM ANÁLISE"], aprovado: ["rf", "DEVOLVIDA"], negado: ["no", "DEVOLUÇÃO NEGADA"], cancelado: ["", "DEVOLUÇÃO CANCELADA"] };
      const rt = rf && RS[rf.status];
      h += '<div class="zhRow"><div><b>' + this.esc(o.name) + "</b> · " + (o.zcoin | 0) + ' Z-Coin<span class="zhTag ' + st[0] + '">' + st[1] + "</span>" + (rt ? '<span class="zhTag ' + rt[0] + '">' + rt[1] + "</span>" : "") +
        "<br><small>" + this.day(o.created_at, 1) + (o.method ? " · " + (o.method === "pix" ? "Pix" : o.method === "credit_card" ? "cartão" : this.esc(o.method)) : "") + "</small>" +
        (rf && rf.note ? "<br><small>Resposta: " + this.esc(rf.note) + "</small>" : "") + '</div><div class="zhP">' + this.brl(o.price_cents) + "</div>";
      const a = [];
      if (o.receipt && /^https:\\/\\//i.test(o.receipt)) a.push('<a class="btn alt" href="' + this.esc(o.receipt) + '" target="_blank" rel="noopener">COMPROVANTE</a>');
      if (o.can_refund) a.push('<button class="btn alt" data-zrf="' + this.esc(o.id) + '">PEDIR DEVOLUÇÃO</button><small style="align-self:center">até ' + this.day(o.refund_until) + "</small>");
      if (rf && rf.status === "pedido") a.push('<button class="btn alt" data-zrc="' + (rf.id | 0) + '">DESISTIR DA DEVOLUÇÃO</button>');
      h += (a.length ? '<div class="zhA">' + a.join("") + "</div>" : "") + "</div>";
    });
    return h;
  },
  limHtml() {
    const i = this.info;
    if (!i) return '<p>Carregando seu limite...</p>';
    const minor = i.age === "minor", lim = i.limit_cents, max = i.minor_max_cents || 10000, w = i.wait_hours || 72;
    let h = "";
    if (lim != null) {
      const pc = Math.min(100, lim ? i.month_cents / lim * 100 : 100);
      h += "<p>Este mês: <b>" + this.brl(i.month_cents) + "</b> de <b>" + this.brl(lim) + '</b></p><div class="zhMeter' + (pc >= 100 ? " full" : "") + '"><i style="width:' + pc + '%"></i></div><p><small>Sobra ' + this.brl(Math.max(0, lim - i.month_cents)) + ". O mês renova no dia 1º. Pedido aberto na última hora conta até ser pago ou expirar.</small></p>";
    } else h += "<p>Sem limite de gasto. Este mês: <b>" + this.brl(i.month_cents) + "</b> em Z-Coin.</p>";
    if (i.next) {
      const n = i.next, what = n.age === "adult" && n.limit_cents === lim ? "Você passa a ser tratado como maior de 18" : n.limit_cents == null ? "O limite sai" : "O limite passa para " + this.brl(n.limit_cents);
      h += '<div class="zhBox2">' + what + " em " + this.day(n.at, 1) + '. <button class="btn alt" data-zlc style="font-size:13px;padding:4px 10px;min-height:28px;margin-left:4px">DESISTIR</button></div>';
    }
    if (minor) h += '<div class="zhBox2 zhWarn">Você informou que tem <b>menos de 18 anos</b>. Toda compra precisa da autorização do seu responsável, e o limite vai até ' + this.brl(max) + " por mês.</div>";
    h += '<p><b>Escolha seu limite por mês</b><br><small>Baixar vale na hora. Subir ou tirar só vale depois de ' + w + " horas, para dar tempo de pensar.</small></p><div class=\\"zhOpts\\">";
    const opts = [null].concat(this.OPTS);
    opts.forEach((c) => {
      const off = minor && (c == null || c > max), on = c === lim;
      h += '<button class="btn ' + (on ? "yo on" : "alt") + '" data-zl="' + (c == null ? "" : c) + '"' + (off ? " disabled" : "") + ">" + (c == null ? "SEM LIMITE" : this.brl(c).replace(",00", "")) + "</button>";
    });
    h += '</div><div class="zhOwn"><span>Outro valor: R$</span><input id="zhIn" type="number" inputmode="numeric" min="0" max="' + (minor ? max / 100 : 10000) + '" step="1" placeholder="0"><button class="btn yo" data-zl="own" style="font-size:14px;padding:6px 12px;min-height:34px">SALVAR</button></div>';
    h += "<p><small>Idade informada: " + (minor ? "menos de 18" : i.age === "adult" ? "18 ou mais" : "ainda não informada") + '. <a href="#" data-zage>Mudar</a></small></p>';
    return h;
  },
  setLim(c) {
    const old = this.info && this.info.limit_cents;
    return NET.rpc("zc_limit_set", { p_cents: c }).then((r) => {
      this.info = r; this.draw(); this.month();
      const now = r.limit_cents === c && !r.next;
      UI.toast && UI.toast(now ? (c == null ? "SEM LIMITE" : "LIMITE: " + this.brl(c) + " POR MÊS") : "MUDANÇA AGENDADA PARA " + this.day(r.next.at, 1), "#c86aff");
    }, (e) => UI.toast && UI.toast(ecoErr(e), "#ff5a5a"));
  },
  // ---- antes de abrir o pagamento
  askAge() {
    const i = this.info || {}, d = i.minor_default_cents || 5000, m = i.minor_max_cents || 10000;
    return this.ask("ANTES DA SUA PRIMEIRA COMPRA", "<p>Z-Coin é comprada com dinheiro de verdade. Para cuidar de quem joga, a gente pergunta a idade uma vez.</p><p><small>Quem tem menos de 18 anos só compra com autorização do responsável e tem limite de " + this.brl(d) + " por mês (ajustável até " + this.brl(m) + ").</small></p>",
      [["adult", "TENHO 18 ANOS OU MAIS", "yo"], ["minor", "TENHO MENOS DE 18"], ["", "VOLTAR"]]).then((v) => {
      if (!v) return false;
      return NET.rpc("zc_age_set", { p_minor: v === "minor" }).then((r) => (this.info = r, true));
    });
  },
  gate(p) {
    if (!NET.logged) return Promise.resolve(true);
    const cost = this.cents(p);
    return this.load().catch(() => null).then((i) => {
      // servidor ainda sem a v29.7: segue como antes (ele mesmo não confere teto)
      if (!i) return true;
      return (i.age ? Promise.resolve(true) : this.askAge()).then((go) => {
        if (!go) return false;
        i = this.info;
        const lim = i.limit_cents, left = lim == null ? Infinity : lim - i.month_cents;
        if (cost > left) {
          return this.ask("LIMITE DO MÊS", "<p>Seu limite é <b>" + this.brl(lim) + "</b> por mês e já foram <b>" + this.brl(i.month_cents) + "</b>. Sobra " + this.brl(Math.max(0, left)) + " e esse pacote custa " + this.brl(cost) + ".</p><p><small>O mês renova no dia 1º. Pedido aberto na última hora conta até ser pago ou expirar.</small></p>",
            [["lim", "VER MEU LIMITE"], ["", "OK", "yo"]]).then((v) => { if (v === "lim") this.open("lim"); return false; });
        }
        if (i.age === "minor") {
          return this.ask("PEÇA PARA O SEU RESPONSÁVEL", '<div class="zhBox2 zhWarn">Você informou que tem <b>menos de 18 anos</b>.</div><p>Essa compra é de dinheiro de verdade: <b>' + this.esc(p.n) + " · " + this.brl(cost) + "</b>. Só continue se o seu pai, mãe ou responsável estiver junto, de acordo, e for quem paga.</p><p><small>Este mês: " + this.brl(i.month_cents) + " de " + this.brl(lim) + ".</small></p>",
            [["ok", "MEU RESPONSÁVEL AUTORIZOU", "yo"], ["", "VOLTAR"]]).then((v) => v === "ok");
        }
        return true;
      });
    });
  },
  refund(id) {
    const o = (this.list || []).find((x) => x.id === id);
    if (!o) return;
    this.ask("PEDIR DEVOLUÇÃO", "<p><b>" + this.esc(o.name) + "</b> · " + (o.zcoin | 0) + " Z-Coin · " + this.brl(o.price_cents) + "</p><p>As " + (o.zcoin | 0) + " Z-Coin dessa compra saem da sua carteira agora. A gente analisa e devolve o dinheiro pelo mesmo meio do pagamento. Se for negado, a Z-Coin volta.</p><p><small>Motivo (opcional)</small></p><textarea id=\\"zhWhy\\" maxlength=\\"300\\"></textarea>",
      [["go", "CONFIRMAR DEVOLUÇÃO", "yo"], ["", "VOLTAR"]]);
    const why = () => { const t = $("zhWhy"); return t ? t.value : ""; };
    const f = this.res || (() => {});
    this.res = (v) => {
      if (v !== "go") { f(v); return v === "" && this.open("hist"); }
      NET.rpc("zc_refund_request", { p_order: id, p_reason: why() }).then((r) => {
        UI.toast && UI.toast("DEVOLUÇÃO PEDIDA · -" + (r.zcoin | 0) + " Z-COIN", "#c86aff");
        ECO.refresh && ECO.refresh();
      }, (e) => UI.toast && UI.toast(ecoErr(e), "#ff5a5a")).then(() => this.open("hist"));
    };
  },
  cancelRefund(rid) {
    NET.rpc("zc_refund_cancel", { p_refund: rid }).then(() => {
      UI.toast && UI.toast("DEVOLUÇÃO CANCELADA · A Z-COIN VOLTOU", "#c86aff");
      ECO.refresh && ECO.refresh();
    }, (e) => UI.toast && UI.toast(ecoErr(e), "#ff5a5a")).then(() => this.open("hist"));
  }
};
document.addEventListener("click", (e) => {
  const z = e.target.closest("[data-zh]");
  if (z) { e.stopPropagation(); ZLIM.open(z.dataset.zh); }
}, true);
$("zhX").onclick = () => ZLIM.close();
$("zhOv").onclick = (e) => { if (e.target.id === "zhOv") ZLIM.close(); };
$("zhTabs").onclick = (e) => { const b = e.target.closest("button[data-zt]"); if (b) { ZLIM.tab = b.dataset.zt; ZLIM.draw(); } };
$("zhBody").onclick = (e) => {
  const t = e.target, q = t.closest("[data-zq]");
  if (q) return ZLIM.answer(q.dataset.zq);
  const rf = t.closest("[data-zrf]"); if (rf) return ZLIM.refund(rf.dataset.zrf);
  const rc = t.closest("[data-zrc]"); if (rc) { rc.disabled = true; return ZLIM.cancelRefund(+rc.dataset.zrc); }
  if (t.closest("[data-zlc]")) return NET.rpc("zc_limit_cancel", {}).then((r) => { ZLIM.info = r; ZLIM.draw(); ZLIM.month(); }, (er) => UI.toast && UI.toast(ecoErr(er), "#ff5a5a"));
  if (t.closest("[data-zage]")) {
    e.preventDefault();
    return ZLIM.askAge().then(() => ZLIM.open("lim"));
  }
  const l = t.closest("[data-zl]");
  if (l) {
    if (l.dataset.zl === "own") {
      const v = Math.round(parseFloat($("zhIn").value));
      if (!(v >= 0)) return UI.toast && UI.toast("DIGITE UM VALOR EM REAIS", "#ff5a5a");
      return ZLIM.setLim(v * 100);
    }
    return ZLIM.setLim(l.dataset.zl === "" ? null : +l.dataset.zl);
  }
};
addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("zhOv").classList.contains("hidden")) { e.stopPropagation(); ZLIM.close(); } }, true);
// toda compra passa pela conferência de idade/limite antes de abrir o pagamento
ZPAY.buy0 = ZPAY.buy;
ZPAY.buy = function (p) { return ZLIM.gate(p).then((go) => go ? this.buy0(p) : ZLIM.free()); };
// v29.6: vitrine de Z-Coin (cards com arte em trilho lateral).`);

// versão
rep("const QZ_VERSION='29.6';", "const QZ_VERSION='29.7';");
s = s.replace(/const QZ_NOTE='[^']*';/, "const QZ_NOTE='Limite de gasto de Z-Coin, aviso para menor de idade, minhas compras e devolução em 7 dias';");
fs.writeFileSync(F, s);
const sw = require('path').join(require('path').dirname(F), 'sw.js');
if (fs.existsSync(sw)) fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/qz-v29\.6\b/, 'qz-v29.7'));
console.log('v29.7 limite de gasto aplicado');
