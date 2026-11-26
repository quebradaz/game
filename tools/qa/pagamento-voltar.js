// QA v29.5.2: a janela "ABRINDO O PAGAMENTO" não prende o jogador (voltar, desistir, tempo limite).
// Sem servidor de verdade: NET.fn é trocado por respostas falsas e a página da InfinitePay é falsa.
// Uso: node tools/qa/pagamento-voltar.js <pasta-saida> [index.html]
const { chromium, devices } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || 'out', HTML = process.argv[3] || 'index.html';
fs.mkdirSync(OUT, { recursive: true });
const html = fs.readFileSync(HTML);
const VPS = {
  iphone: { ...devices['iPhone 13 landscape'] },
  pc: { viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 }
};
const ok = [], bad = [];
const expect = (name, cond, info) => { (cond ? ok : bad).push(name + (cond ? '' : ' → ' + JSON.stringify(info))); };

const __TV__ = (/TERMS = \{\s*V: "([^"]+)"/.exec(require('fs').readFileSync(process.argv[3] || 'index.html', 'utf8')) || [])[1] || '';
(async () => {
  const b = await chromium.launch();
  for (const [vp, opt] of Object.entries(VPS)) {
    const ctx = await b.newContext(opt);
    await ctx.addInitScript((v) => { try { localStorage.setItem('qz_terms', JSON.stringify({ v })); } catch (e) {} }, __TV__); // termos já aceitos (v29.12)
    await ctx.addInitScript(() => { try { const d = JSON.parse(localStorage.getItem('qz_save') || '{}'); d.created = 1; d.matches = 3; localStorage.setItem('qz_save', JSON.stringify(d)); } catch (e) {} });
    await ctx.route('http://localhost/**', (r) => { const u = new URL(r.request().url()); if (u.pathname === '/' || u.pathname === '/index.html') return r.fulfill({ body: html, contentType: 'text/html' }); const f = path.join(path.dirname(HTML), u.pathname); return fs.existsSync(f) ? r.fulfill({ path: f }) : r.fulfill({ status: 404 }); });
    // página de pagamento: 204 = o navegador não sai do jogo (simula ir e voltar sem recarregar)
    await ctx.route('https://checkout.infinitepay.io/**', (r) => r.fulfill({ status: 204 }));
    const p = await ctx.newPage();
    p.on('pageerror', (e) => bad.push(vp + ' ERRO JS ' + e.message));
    await p.goto('http://localhost/', { waitUntil: 'load' });
    await p.waitForTimeout(2500);
    const st = () => p.evaluate(() => ({ cls: $('zpOv').className, t: $('zpT').textContent, x: !$('zpX').classList.contains('hidden'), ok: !$('zpOk').classList.contains('hidden'), dis: [...document.querySelectorAll('[data-act=pack]')].filter((b) => b.disabled).length, eco: !$('ecoScr').classList.contains('hidden'), ord: localStorage.getItem('qz_zc_order') }));
    // modo de teste: logado, create/confirm falsos
    const mock = (cfg) => p.evaluate((cfg) => {
      Object.defineProperty(NET, 'logged', { get: () => true, configurable: true });
      window.__cfg = cfg;
      NET.fn = (name, body) => {
        const c = window.__cfg;
        if (body.action === 'create') return c.create === 'never' ? new Promise(() => {}) : new Promise((ok) => setTimeout(() => ok({ url: 'https://checkout.infinitepay.io/norduk/x', order: 'ord-' + Date.now(), zcoin: 1400 }), 600));
        return new Promise((ok) => setTimeout(() => ok({ status: c.status || 'pending', zcoin: 1400 }), 500));
      };
      ECO.refresh = () => Promise.resolve();
      ECO.ready = true; ECO.data = ECO.data || { pass: { name: 'TEMPORADA 1 · HELL DE JANEIRO' }, shop: [], missions: [], boxes: 0, zcoin: 20, chips: 1 };
      localStorage.removeItem('qz_zc_order');
      ZPAY.ov(0);
      ZPAY.open();
      ECO.show('shop');
    }, cfg);
    // v29.12: depois do toque no pacote vem o aviso de entrega imediata; confirma e segue
    const buy = () => p.evaluate(() => document.querySelectorAll('[data-act=pack]')[3].click())
      .then(() => p.waitForFunction(() => document.querySelector('#zhBody [data-zq=ok]') && $('zhOv').className === 'ask', null, { timeout: 3000 }).catch(() => {}))
      .then(() => p.evaluate(() => { const o = document.querySelector('#zhBody [data-zq=ok]'); if (o && $('zhOv').className === 'ask') o.click(); }));

    // 1) VOLTAR aparece na hora e fecha a espera, reativando o COMPRAR
    await mock({ create: 'never' });
    await p.waitForTimeout(500);
    await buy();
    await p.waitForTimeout(300);
    let s = await st();
    await p.screenshot({ path: `${OUT}/${vp}-1-abrindo-com-voltar.png` });
    expect(vp + ' abrindo mostra VOLTAR', s.cls === 'wait' && s.x, s);
    await p.click('#zpX');
    await p.waitForTimeout(300);
    s = await st();
    await p.screenshot({ path: `${OUT}/${vp}-2-depois-do-voltar.png` });
    expect(vp + ' VOLTAR fecha e fica na loja', s.cls === 'hidden' && s.dis === 0 && s.eco, s);

    // 2) foi pra InfinitePay, desistiu e voltou (aba visível de novo / cache do navegador)
    for (const ev of ['visibilitychange', 'pageshow']) {
      await mock({ status: 'pending' });
      await buy();
      await p.waitForTimeout(1500);
      s = await st();
      expect(vp + ' ' + ev + ': saiu pro pagamento com pedido guardado', s.cls === 'wait' && !!s.ord, s);
      await p.evaluate((ev) => ev === 'pageshow' ? dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })) : document.dispatchEvent(new Event('visibilitychange')), ev);
      await p.waitForTimeout(150);
      if (ev === 'visibilitychange') await p.screenshot({ path: `${OUT}/${vp}-3-conferindo.png` });
      await p.waitForTimeout(900);
      s = await st();
      if (ev === 'visibilitychange') await p.screenshot({ path: `${OUT}/${vp}-4-compra-nao-finalizada.png` });
      expect(vp + ' ' + ev + ': mostra COMPRA NÃO FINALIZADA com OK e mantém o pedido', s.cls === 'info' && s.t === 'COMPRA NÃO FINALIZADA' && s.ok && !!s.ord, s);
      await p.click('#zpOk');
      await p.waitForTimeout(200);
      s = await st();
      expect(vp + ' ' + ev + ': OK fecha e fica na loja', s.cls === 'hidden' && s.eco && s.dis === 0, s);
    }

    // 3) pedido pendente aprovado depois: ao voltar, credita e avisa
    await mock({ status: 'pending' });
    await buy();
    await p.waitForTimeout(1500);
    await p.evaluate(() => { window.__cfg.status = 'paid'; document.dispatchEvent(new Event('visibilitychange')); });
    await p.waitForTimeout(1200);
    s = await st();
    await p.screenshot({ path: `${OUT}/${vp}-5-aprovada-depois.png` });
    expect(vp + ' aprovado depois: COMPRA APROVADA e limpa o pedido', s.cls === 'ok' && s.t === 'COMPRA APROVADA!' && !s.ord, s);
    await p.click('#zpOk');

    // 4) pedido cancelado na InfinitePay: avisa e apaga o pedido
    await mock({ status: 'failed' });
    await buy();
    await p.waitForTimeout(1500);
    await p.evaluate(() => dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true })));
    await p.waitForTimeout(1000);
    s = await st();
    expect(vp + ' cancelado: COMPRA NÃO FINALIZADA e apaga o pedido', s.cls === 'info' && !s.ord, s);
    await p.click('#zpOk');

    // 5) "CONFIRMANDO SUA COMPRA" (volta do checkout) ganha VOLTAR depois de 8 s e não reabre sozinho
    if (vp === 'iphone') {
      await mock({ status: 'pending' });
      await p.evaluate(() => { localStorage.setItem('qz_zc_order', JSON.stringify({ order: 'ord-x', z: 1400, t: Date.now() })); ZPAY.busy = 0; ZPAY.check({ order: 'ord-x' }); });
      await p.waitForTimeout(1000);
      s = await st();
      expect('confirmando: sem VOLTAR no começo', s.cls === 'wait' && !s.x, s);
      await p.waitForTimeout(8000);
      s = await st();
      await p.screenshot({ path: `${OUT}/${vp}-6-confirmando-com-voltar.png` });
      expect('confirmando: VOLTAR depois de 8 s', s.cls === 'wait' && s.x, s);
      await p.click('#zpX');
      await p.waitForTimeout(5000);
      s = await st();
      expect('confirmando: depois do VOLTAR a janela não volta', s.cls === 'hidden', s);
    }

    // 6) tempo limite: a página não abre em 25 s
    if (vp === 'pc') {
      await mock({ create: 'never' });
      await buy();
      await p.waitForTimeout(25500);
      s = await st();
      await p.screenshot({ path: `${OUT}/${vp}-7-tempo-limite.png` });
      expect('tempo limite: O PAGAMENTO NÃO ABRIU com OK', s.cls === 'info' && s.t === 'O PAGAMENTO NÃO ABRIU' && s.ok, s);
      await p.click('#zpOk');
      await mock({ create: 'never' });
      await buy();
      await p.waitForTimeout(300);
      await p.keyboard.press('Escape');
      await p.waitForTimeout(200);
      s = await st();
      expect('Esc fecha a espera no PC', s.cls === 'hidden', s);
    }
    await ctx.close();
  }
  await b.close();
  console.log('OK ' + ok.length + '\n  ' + ok.join('\n  '));
  console.log('FALHOU ' + bad.length + (bad.length ? '\n  ' + bad.join('\n  ') : ''));
  process.exit(bad.length ? 1 : 0);
})();
