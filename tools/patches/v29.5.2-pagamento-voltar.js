// v29.5.2: a janela "ABRINDO O PAGAMENTO" não prende mais o jogador.
// Antes: se o jogador desistia na página da InfinitePay e voltava (botão voltar, gesto, fechar a aba do
// pagamento), o jogo voltava do cache do navegador com a janela ainda girando e sem botão nenhum.
// Agora:
//   - botão VOLTAR na janela de espera (na hora em "abrindo", depois de 8 s em "confirmando");
//   - ao voltar pro jogo (pageshow do cache, aba visível de novo ou foco) sem a compra aprovada, a espera
//     some, o jogo confere o pedido uma vez e mostra "COMPRA NÃO FINALIZADA" com OK;
//   - tempo limite de 25 s para a página de pagamento abrir ("O PAGAMENTO NÃO ABRIU");
//   - o pedido continua guardado: se for aprovado depois, a Z-Coin entra (webhook) e o jogo avisa
//     na próxima conferência, como antes;
//   - OK/VOLTAR deixam o jogador na loja (antes o OK sempre levava pro início) e reativam os COMPRAR.
// Uso: node tools/patches/v29.5.2-pagamento-voltar.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

// CSS do botão VOLTAR
rep('#zpOv .zpSpin:nth-child(2){animation-delay:.15s}',
  '#zpOv #zpX{display:block;margin:14px auto 0}#zpOv #zpX.hidden{display:none}\n' +
  '#zpOv .zpSpin:nth-child(2){animation-delay:.15s}');

// botão na janela
rep('<button class="btn yo hidden" id="zpOk">OK</button></div></div>',
  '<button class="btn yo hidden" id="zpOk">OK</button><button class="btn alt hidden" id="zpX">VOLTAR</button></div></div>');

// ov: 4º argumento = em quantos ms o VOLTAR aparece na espera (sem ele, nunca)
rep('    $("zpWait").classList.toggle("hidden", state !== "wait");\n' +
  '    $("zpOk").classList.toggle("hidden", state === "wait");\n' +
  '  },',
  '    $("zpWait").classList.toggle("hidden", state !== "wait");\n' +
  '    $("zpOk").classList.toggle("hidden", state === "wait");\n' +
  '    clearTimeout(this.tmX); $("zpX").classList.add("hidden");\n' +
  '    if (state === "wait" && xIn != null) this.tmX = setTimeout(() => $("zpX").classList.remove("hidden"), xIn);\n' +
  '    if (!state) document.querySelectorAll("[data-act=pack]").forEach((b) => b.disabled = false);\n' +
  '  },\n' +
  '  // jogador fechou a espera: para de esperar a página abrir; o pedido (se já existe) segue guardado\n' +
  '  quit() {\n' +
  '    this.go = this.left = null; this.hid = 1; clearTimeout(this.tmo);\n' +
  '    this.ov(0);\n' +
  '  },\n' +
  '  // voltou pro jogo depois de ir pra InfinitePay sem a compra aprovada\n' +
  '  ret() {\n' +
  '    if (!this.left || $("zpOv").className !== "wait") return;\n' +
  '    this.go = this.left = null; clearTimeout(this.tmo);\n' +
  '    const pend = this.get();\n' +
  '    const nope = () => this.ov("info", "COMPRA NÃO FINALIZADA", "Você voltou antes de concluir o pagamento. Se pagou e a InfinitePay aprovar depois, a Z-Coin entra sozinha na sua conta e o jogo avisa.");\n' +
  '    if (!pend || !NET.logged) return nope();\n' +
  '    this.ov("wait", "CONFERINDO O PEDIDO", "Um instante...", 0);\n' +
  '    let done = 0;\n' +
  '    const end = (f) => { if (done || $("zpOv").className !== "wait") return; done = 1; f(); };\n' +
  '    setTimeout(() => end(nope), 1e4);\n' +
  '    NET.fn("zcoin-checkout", { action: "confirm", order: pend.order }).then((r) => {\n' +
  '      const st = r && r.status;\n' +
  '      if (st === "paid") return end(() => this.paid(r.zcoin || pend.z));\n' +
  '      if (st === "failed" || st === "invalid") this.put(null);\n' +
  '      end(nope);\n' +
  '    }, () => end(nope));\n' +
  '  },');
rep('  ov(state, title, sub) {', '  ov(state, title, sub, xIn) {');

// buy: VOLTAR na hora, tempo limite e marca que saiu pro pagamento
rep('    this.ov("wait", "ABRINDO O PAGAMENTO", p.n + " · " + (p.z + p.b) + " Z-Coin · " + p.p);\n' +
  '    return NET.fn("zcoin-checkout", { action: "create", pack: p.id }).then((r) => {\n' +
  '      if (!r || !r.url || !/^https:\\/\\/([a-z0-9-]+\\.)*infinitepay\\.io\\//i.test(r.url)) throw new Error("CHECKOUT_FALHOU");\n' +
  '      this.put({ order: r.order, z: r.zcoin, t: Date.now() });\n' +
  '      location.href = r.url;\n' +
  '    }, (e) => { this.ov(0); throw e; });',
  '    const go = this.go = {}; this.left = null;\n' +
  '    this.ov("wait", "ABRINDO O PAGAMENTO", p.n + " · " + (p.z + p.b) + " Z-Coin · " + p.p, 0);\n' +
  '    clearTimeout(this.tmo);\n' +
  '    this.tmo = setTimeout(() => {\n' +
  '      if (this.go !== go || document.hidden) return;\n' +
  '      this.go = this.left = null;\n' +
  '      this.ov("info", "O PAGAMENTO NÃO ABRIU", "A página da InfinitePay demorou demais para abrir. Confira a internet e tente de novo. Se pagou, a Z-Coin entra sozinha quando for aprovada.");\n' +
  '    }, 25e3);\n' +
  '    return NET.fn("zcoin-checkout", { action: "create", pack: p.id }).then((r) => {\n' +
  '      if (this.go !== go) return;\n' +
  '      if (!r || !r.url || !/^https:\\/\\/([a-z0-9-]+\\.)*infinitepay\\.io\\//i.test(r.url)) throw new Error("CHECKOUT_FALHOU");\n' +
  '      this.put({ order: r.order, z: r.zcoin, t: Date.now() });\n' +
  '      this.left = go;\n' +
  '      location.href = r.url;\n' +
  '    }).catch((e) => { if (this.go !== go) return; this.go = null; clearTimeout(this.tmo); this.ov(0); throw e; });');

// check: VOLTAR depois de 8 s em "confirmando"; se o jogador fechou, o resto da conferência fica quieto
rep('    this.busy = 1;\n    const z = pend && pend.z;\n' +
  '    if (back) this.ov("wait", "CONFIRMANDO SUA COMPRA", "Estamos conferindo o pagamento com a InfinitePay. Não feche o jogo.");',
  '    this.busy = 1; this.hid = 0;\n    const z = pend && pend.z;\n' +
  '    if (back) this.ov("wait", "CONFIRMANDO SUA COMPRA", "Estamos conferindo o pagamento com a InfinitePay. Não feche o jogo.", 8e3);');
rep('      if (back && age < 18e4) return new Promise',
  '      if (back && this.hid) back = null;\n' +
  '      if (back && age < 18e4) return new Promise');
rep('      if (back) this.ov("info", "SEM CONEXÃO",', '      if (back && !this.hid) this.ov("info", "SEM CONEXÃO",');
rep('  bad(back) {\n    this.busy = 0; this.put(null);\n    if (back) this.ov(',
  '  bad(back) {\n    this.busy = 0; this.put(null);\n    if (back && !this.hid) this.ov(');

// OK fica na loja quando a compra começou lá; VOLTAR/Esc fecham a espera
rep('$("zpOk").onclick = () => { ZPAY.ov(0); UI.show("title"); };',
  '$("zpOk").onclick = () => { ZPAY.ov(0); if ($("ecoScr").classList.contains("hidden")) UI.show("title"); };\n' +
  '$("zpX").onclick = () => ZPAY.quit();\n' +
  'addEventListener("keydown", (e) => { if (e.key === "Escape" && !$("zpX").classList.contains("hidden") && $("zpOv").className === "wait") ZPAY.quit(); });');

// volta pro jogo: cache do navegador (iPhone/Safari), aba visível de novo ou foco
rep('  document.addEventListener("visibilitychange", () => { if (!document.hidden) ZPAY.check(null); });',
  '  document.addEventListener("visibilitychange", () => { if (!document.hidden) { ZPAY.ret(); ZPAY.check(null); } });\n' +
  '  addEventListener("pageshow", (e) => { if (e.persisted) { ZPAY.ret(); ZPAY.check(null); } });\n' +
  '  addEventListener("focus", () => setTimeout(() => ZPAY.ret(), 400));');

// versão
rep("const QZ_VERSION='29.5.1';", "const QZ_VERSION='29.5.2';");
s = s.replace(/const QZ_NOTE='[^']*';/, "const QZ_NOTE='Pagamento de Z-Coin com botão de voltar: desistir não trava mais a tela';");

fs.writeFileSync(F, s);
console.log('ok');
