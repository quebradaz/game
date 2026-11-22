// v29: compra de Z-Coin pelo checkout integrado da InfinitePay, com crédito automático.
// O jogo pede o link ao servidor (Edge Function zcoin-checkout), abre a página da InfinitePay e, na volta,
// pede ao servidor para conferir. Quem confirma e credita é sempre o servidor (zcoin-webhook / payment_check);
// o jogo só mostra o resultado. Servidor: supabase/migrations/v29_zcoin_checkout.sql e supabase/functions/zcoin-*.
// Uso: node tools/patches/v29-zcoin-checkout.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

// ----- CSS da janela de confirmação
rep('.ecNote{color:var(--mute);font-size:12px;margin:8px 0}',
  '.ecNote{color:var(--mute);font-size:12px;margin:8px 0}\n' +
  '#zpOv{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;background:rgba(6,4,12,.82);padding:16px}\n' +
  '#zpOv.hidden{display:none}\n' +
  '#zpOv .zpBox{width:min(420px,100%);box-sizing:border-box;text-align:center;padding:18px 16px;background:linear-gradient(#221b31,#141019);border:2px solid #000;box-shadow:inset 0 0 0 2px #5b3a8a,0 0 40px rgba(176,74,255,.35);border-radius:10px}\n' +
  '#zpOv .zpIco{width:72px;height:72px;margin:0 auto 8px;image-rendering:pixelated;background-size:100% 100%}\n' +
  '#zpOv.ok .zpIco{animation:zpPulse 1.2s ease-in-out infinite}@keyframes zpPulse{50%{filter:drop-shadow(0 0 14px #c86aff) brightness(1.2)}}\n' +
  '#zpOv .zpT{font-family:var(--fy);font-size:20px;color:#fff;letter-spacing:1px;margin-bottom:6px}#zpOv.ok .zpT{color:#c86aff}\n' +
  '#zpOv .zpS{font-family:system-ui,sans-serif;font-size:14px;line-height:1.35;color:#d9d3e6;margin-bottom:12px}\n' +
  '#zpOv .zpSpin{display:inline-block;width:10px;height:10px;margin:0 3px;background:#c86aff;animation:hplow .5s steps(2) infinite alternate}\n' +
  '#zpOv .zpSpin:nth-child(2){animation-delay:.15s}#zpOv .zpSpin:nth-child(3){animation-delay:.3s}');

// ----- janela no HTML
rep('<div id="ecoScr" class="screen shadeFull hidden">',
  '<div id="zpOv" class="hidden" role="dialog" aria-live="polite"><div class="zpBox"><div class="zpIco ic zc"></div><div class="zpT" id="zpT"></div><div class="zpS" id="zpS"></div><div id="zpWait"><i class="zpSpin"></i><i class="zpSpin"></i><i class="zpSpin"></i></div><button class="btn yo hidden" id="zpOk">OK</button></div></div>\n' +
  '<div id="ecoScr" class="screen shadeFull hidden">');

// ----- NET: chamada às Edge Functions com login
rep('    deleteAccount() {\n',
  '    fn(name, body) {\n' +
  '      return call("/functions/v1/" + name, { method: "POST", body: body || {} });\n' +
  '    },\n' +
  '    deleteAccount() {\n');

// ----- pacotes: id do pacote no servidor; preço mostrado aqui é só vitrine (o servidor cobra o da tabela zc_packs)
rep('  // pacotes de Z-Coin: venda pelo link de checkout da InfinitePay (crédito manual pelo administrador).\n' +
  '  // link: o endereço do checkout; enquanto for null, o botão mostra "em breve".\n' +
  '  packs: [{ n: "Punhado", z: 100, b: 0, p: "R$ 4,90" }, { n: "Saco", z: 300, b: 30, p: "R$ 12,90" }, { n: "Mochila", z: 650, b: 100, p: "R$ 24,90" }, { n: "Cofre", z: 1400, b: 300, p: "R$ 49,90" }],\n' +
  '  link: null,\n',
  '  // pacotes de Z-Coin: checkout integrado da InfinitePay (cartão ou Pix), crédito automático no servidor.\n' +
  '  // O preço que vale é o da tabela zc_packs; o daqui é só o que aparece na tela.\n' +
  '  packs: [{ id: "punhado", n: "Punhado", z: 100, b: 0, p: "R$ 4,90" }, { id: "saco", n: "Saco", z: 300, b: 30, p: "R$ 12,90" }, { id: "mochila", n: "Mochila", z: 650, b: 100, p: "R$ 24,90" }, { id: "cofre", n: "Cofre", z: 1400, b: 300, p: "R$ 49,90" }],\n' +
  '  payOn: true,\n');

rep('let h = \'<p class="ecNote">Seu código para a compra: <b>\' + esc(NET.st.name || "") + "</b>. Informe esse nome no pagamento; a Z-Coin entra na conta quando o pagamento for confirmado.</p>";',
  'let h = this.storeApp ? "" : \'<p class="ecNote">O pagamento abre na página segura da InfinitePay (cartão ou Pix). Quando aprovar, você volta pro jogo e a Z-Coin entra sozinha na conta.</p>\';');


rep('" Z-Coin</b><small>" + p.p + \' no Pix</small></div><button class="btn alt" data-act="pack" data-i="\' + i + \'">\' + (this.link ? "COMPRAR" : "EM BREVE") + "</button></div>");',
  '" Z-Coin</b><small>" + p.p + \' · cartão ou Pix</small></div><button class="btn yo" data-act="pack" data-i="\' + i + \'">\' + (this.payOn ? "COMPRAR" : "EM BREVE") + "</button></div>");');

rep('    else if (a === "pack") {\n' +
  '      b.disabled = false;\n' +
  '      if (this.link) window.open(this.link, "_blank", "noopener");\n' +
  '      else UI.toast && UI.toast("VENDA DE Z-COIN EM BREVE", "#c86aff");\n' +
  '    }\n',
  '    else if (a === "pack") {\n' +
  '      const p = this.packs[+b.dataset.i];\n' +
  '      if (!this.payOn || !p) { b.disabled = false; UI.toast && UI.toast("VENDA DE Z-COIN EM BREVE", "#c86aff"); return; }\n' +
  '      ZPAY.buy(p).catch((e) => fail(e));\n' +
  '    }\n');

// ----- erros do servidor
rep('SEM_CAIXA: "Nenhuma caixa para abrir" };',
  'SEM_CAIXA: "Nenhuma caixa para abrir", PACOTE_INVALIDO: "Pacote indisponível", MUITOS_PEDIDOS: "Muitas compras abertas. Espere um pouco.", CHECKOUT_FALHOU: "O pagamento não abriu. Tente de novo.", SEM_NOME: "Escolha o nome do personagem primeiro" };');

// ----- ZPAY: abre o checkout, guarda o pedido e, na volta, pergunta ao servidor até ele confirmar
rep('\nECO.paint();\nlet helpBack',
  '\nECO.paint();\n' +
  'const ZPAY = {\n' +
  '  LS: "qz_zc_order",\n' +
  '  busy: 0,\n' +
  '  get() { try { const o = JSON.parse(localStorage.getItem(this.LS) || "null"); return o && Date.now() - o.t < 864e5 ? o : null; } catch (e) { return null; } },\n' +
  '  put(o) { try { o ? localStorage.setItem(this.LS, JSON.stringify(o)) : localStorage.removeItem(this.LS); } catch (e) {} },\n' +
  '  ov(state, title, sub) {\n' +
  '    const el = $("zpOv");\n' +
  '    el.className = state ? state : "hidden";\n' +
  '    $("zpT").textContent = title || ""; $("zpS").textContent = sub || "";\n' +
  '    $("zpWait").classList.toggle("hidden", state !== "wait");\n' +
  '    $("zpOk").classList.toggle("hidden", state === "wait");\n' +
  '  },\n' +
  '  buy(p) {\n' +
  '    if (!NET.logged) return Promise.reject(new Error("SEM_LOGIN"));\n' +
  '    this.ov("wait", "ABRINDO O PAGAMENTO", p.n + " · " + (p.z + p.b) + " Z-Coin · " + p.p);\n' +
  '    return NET.fn("zcoin-checkout", { action: "create", pack: p.id }).then((r) => {\n' +
  '      if (!r || !r.url || !/^https:\\/\\/([a-z0-9-]+\\.)*infinitepay\\.io\\//i.test(r.url)) throw new Error("CHECKOUT_FALHOU");\n' +
  '      this.put({ order: r.order, z: r.zcoin, t: Date.now() });\n' +
  '      location.href = r.url;\n' +
  '    }, (e) => { this.ov(0); throw e; });\n' +
  '  },\n' +
  '  // volta do checkout: ?zcpay=1&order_nsu=...&transaction_nsu=...&slug=...&receipt_url=...\n' +
  '  fromUrl() {\n' +
  '    const q = new URLSearchParams(location.search);\n' +
  '    if (!q.has("zcpay")) return null;\n' +
  '    const r = { order: q.get("order_nsu") || "", tx: q.get("transaction_nsu") || "", slug: q.get("slug") || "", receipt: q.get("receipt_url") || "" };\n' +
  '    ["zcpay", "order_nsu", "transaction_nsu", "slug", "receipt_url", "capture_method"].forEach((k) => q.delete(k));\n' +
  '    try { history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : "") + location.hash); } catch (e) {}\n' +
  '    return r;\n' +
  '  },\n' +
  '  check(back) {\n' +
  '    const pend = this.get();\n' +
  '    const order = back && back.order || pend && pend.order;\n' +
  '    if (!order || this.busy || !NET.logged) return;\n' +
  '    if (pend && back && back.order && pend.order !== back.order) this.put(null);\n' +
  '    this.busy = 1;\n' +
  '    const z = pend && pend.z;\n' +
  '    if (back) this.ov("wait", "CONFIRMANDO SUA COMPRA", "Estamos conferindo o pagamento com a InfinitePay. Não feche o jogo.");\n' +
  '    const body = { action: "confirm", order, transaction_nsu: back && back.tx || void 0, slug: back && back.slug || void 0, receipt_url: back && back.receipt || void 0 };\n' +
  '    const t0 = Date.now();\n' +
  '    const step = () => NET.fn("zcoin-checkout", body).then((r) => {\n' +
  '      const st = r && r.status;\n' +
  '      if (st === "paid") return this.paid(r.zcoin || z);\n' +
  '      if (st === "failed" || st === "unknown" || st === "invalid") return this.bad(back);\n' +
  '      // ainda pendente: o aviso da InfinitePay pode demorar alguns segundos\n' +
  '      const age = Date.now() - t0;\n' +
  '      if (back && age < 18e4) return new Promise((ok) => setTimeout(ok, age < 3e4 ? 3e3 : 8e3)).then(step);\n' +
  '      this.busy = 0;\n' +
  '      if (back) this.ov("info", "PAGAMENTO EM ANÁLISE", "A InfinitePay ainda não aprovou. Assim que aprovar, a Z-Coin entra sozinha na sua conta e o jogo avisa.");\n' +
  '    }, () => {\n' +
  '      this.busy = 0;\n' +
  '      if (back) this.ov("info", "SEM CONEXÃO", "Não deu para conferir agora. Quando a internet voltar, o jogo confere de novo sozinho.");\n' +
  '    });\n' +
  '    step();\n' +
  '  },\n' +
  '  paid(z) {\n' +
  '    this.busy = 0; this.put(null);\n' +
  '    SFX.buy && SFX.buy();\n' +
  '    this.ov("ok", "COMPRA APROVADA!", "+" + (z || "") + " Z-Coin na sua conta. Valeu por apoiar o Quebrada Z!");\n' +
  '    ECO.refresh();\n' +
  '  },\n' +
  '  bad(back) {\n' +
  '    this.busy = 0; this.put(null);\n' +
  '    if (back) this.ov("info", "COMPRA NÃO CONFIRMADA", "O pagamento não foi aprovado ou não bate com o pedido. Se o dinheiro saiu, fale com a gente em Ajustes › Feedback com o comprovante.");\n' +
  '  }\n' +
  '};\n' +
  '$("zpOk").onclick = () => { ZPAY.ov(0); UI.show("title"); };\n' +
  'document.querySelectorAll("#zpOv .ic.zc").forEach((e) => e.style.backgroundImage = `url(${ICON_ZC})`);\n' +
  '{\n' +
  '  const back = ZPAY.fromUrl();\n' +
  '  setTimeout(() => ZPAY.check(back), back ? 300 : 2500);\n' +
  '  document.addEventListener("visibilitychange", () => { if (!document.hidden) ZPAY.check(null); });\n' +
  '}\n' +
  'let helpBack');

fs.writeFileSync(F, s);
console.log('ok v29-zcoin-checkout');
