// Prints e conferência do limite de gasto / minhas compras (v29.7), no celular deitado e no PC.
// O servidor é imitado aqui (mesmas respostas das funções de v29_7_limite_gasto.sql); nada sai da máquina.
// Uso: node tools/qa/limite-gasto.js <pasta-saida> [index.html]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || 'out', HTML = process.argv[3] || 'index.html';
fs.mkdirSync(OUT, { recursive: true });
const VPS = { pc: { width: 1366, height: 768 }, celular: { width: 844, height: 390 }, 'celular-pequeno': { width: 667, height: 375 } };
const html = fs.readFileSync(HTML);
let bad = 0;
const ok = (c, m) => { console.log((c ? 'ok  ' : 'FALHA ') + m); if (!c) bad++; };
(async () => {
  const b = await chromium.launch();
  for (const [vp, size] of Object.entries(VPS)) {
    const ctx = await b.newContext({ viewport: size, deviceScaleFactor: 2, hasTouch: vp !== 'pc', isMobile: vp !== 'pc' });
    await ctx.addInitScript(() => { try { const d = JSON.parse(localStorage.getItem('qz_save') || '{}'); d.created = 1; d.matches = 3; d.level = 8; localStorage.setItem('qz_save', JSON.stringify(d)); } catch (e) {} });
    await ctx.route('http://localhost/**', (r) => { const u = new URL(r.request().url()); if (u.pathname === '/' || u.pathname === '/index.html') return r.fulfill({ body: html, contentType: 'text/html' }); const f = path.join(path.dirname(HTML), u.pathname); return fs.existsSync(f) ? r.fulfill({ path: f }) : r.fulfill({ status: 404 }); });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => { bad++; console.log(vp, 'ERR', e.message); });
    await p.goto('http://localhost/', { waitUntil: 'load' });
    await p.waitForTimeout(2500);
    await p.evaluate(() => {
      Object.defineProperty(NET, 'logged', { get: () => true, configurable: true });
      ECO.refresh = () => Promise.resolve(null);
      ECO.data = { pass: null, wallet: { chips: 3, zcoin: 700 }, items: [], shop: [], missions: [], boxes: 0 };
      ECO.ready = 1; ECO.zcoin = 700; ECO.payOn = 1;
      const H = 36e5, now = Date.now(), iso = (t) => new Date(t).toISOString();
      const S = window.__srv = { calls: [], info: { age: null, limit_cents: null, own_limit_cents: null, next: null, month_cents: 2000, minor_default_cents: 5000, minor_max_cents: 10000, wait_hours: 72, refund_days: 7 },
        orders: [
          { id: 'o4', pack: 'punhado', name: 'Punhado', zcoin: 300, price_cents: 490, status: 'pending', created_at: iso(now - 3 * H), paid_at: null, method: null, receipt: null, can_refund: false, refund: null },
          { id: 'o3', pack: 'saco', name: 'Saco', zcoin: 700, price_cents: 2000, status: 'paid', created_at: iso(now - 26 * H), paid_at: iso(now - 26 * H), method: 'pix', receipt: 'https://checkout.infinitepay.io/recibo/x', refund_until: iso(now + 6 * 24 * H), can_refund: true, refund: null },
          { id: 'o2', pack: 'mochila', name: 'Mochila de dinheiro', zcoin: 1050, price_cents: 3500, status: 'paid', created_at: iso(now - 4 * 24 * H), paid_at: iso(now - 4 * 24 * H), method: 'credit_card', receipt: null, can_refund: false, refund: { id: 9, status: 'pedido', at: iso(now - 3 * 24 * H), note: null } },
          { id: 'o1', pack: 'cofre', name: 'Cofre', zcoin: 1400, price_cents: 6500, status: 'failed', created_at: iso(now - 12 * 24 * H), paid_at: null, method: null, receipt: null, can_refund: false, refund: null }] };
      NET.rpc = (fn, a) => {
        S.calls.push(fn);
        const I = S.info;
        if (fn === 'zc_spend_info') return Promise.resolve(Object.assign({}, I));
        if (fn === 'zc_age_set') { I.age = a.p_minor ? 'minor' : 'adult'; if (a.p_minor) I.limit_cents = Math.min(I.limit_cents == null ? 5000 : I.limit_cents, 10000); return Promise.resolve(Object.assign({}, I)); }
        if (fn === 'zc_limit_set') {
          if (I.age === 'minor' && (a.p_cents == null || a.p_cents > 10000)) return Promise.reject(new Error('LIMITE_MENOR'));
          if (a.p_cents != null && (I.limit_cents == null || a.p_cents <= I.limit_cents)) { I.limit_cents = a.p_cents; I.next = null; }
          else I.next = { at: new Date(Date.now() + 72 * H).toISOString(), limit_cents: a.p_cents, age: null };
          return Promise.resolve(Object.assign({}, I));
        }
        if (fn === 'zc_limit_cancel') { I.next = null; return Promise.resolve(Object.assign({}, I)); }
        if (fn === 'zc_my_orders') return Promise.resolve(JSON.parse(JSON.stringify(S.orders)));
        if (fn === 'zc_refund_request') { const o = S.orders.find((x) => x.id === a.p_order); o.can_refund = false; o.refund = { id: 10, status: 'pedido', at: new Date().toISOString(), note: null }; S.why = a.p_reason; return Promise.resolve({ ok: true, zcoin: o.zcoin, wallet: 0 }); }
        if (fn === 'zc_refund_cancel') { const o = S.orders.find((x) => x.refund && x.refund.id === a.p_refund); o.refund.status = 'cancelado'; return Promise.resolve({ ok: true }); }
        return Promise.reject(new Error('rpc ' + fn));
      };
      // o pagamento em si não abre: só registra que chegou lá
      ZPAY.buy0 = (pk) => { S.paid = pk.id; return Promise.resolve(); };
      msTab = 'zc'; showMShop();
    });
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${OUT}/${vp}-1-loja-botoes.png` });
    const btns = await p.evaluate(() => [...document.querySelectorAll('#msZcBox [data-zh]')].map((e) => e.textContent).join('|'));
    ok(btns === 'MINHAS COMPRAS|LIMITE DE GASTO', vp + ' botões embaixo da vitrine: ' + btns);
    const fitBtns = await p.evaluate(() => { const r = document.querySelector('#msZcBox [data-zh=lim]'); r.scrollIntoView({ block: 'nearest' }); const q = r.getBoundingClientRect(); return q.right <= innerWidth && q.bottom <= innerHeight + 1; });
    ok(fitBtns, vp + ' botão LIMITE cabe na tela depois de rolar');

    // 1ª compra: pergunta a idade
    const click = (i) => p.evaluate((i) => document.querySelectorAll('#msZcBox .zcCard .btn')[i].click(), i);
    await click(0);
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${vp}-2-idade.png` });
    ok(await p.evaluate(() => $('zhT').textContent === 'ANTES DA SUA PRIMEIRA COMPRA' && $('zhOv').className === 'ask'), vp + ' pergunta a idade antes da 1ª compra');
    await p.click('#zhBody [data-zq=minor]');
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${vp}-3-aviso-menor.png` });
    ok(await p.evaluate(() => $('zhT').textContent === 'PEÇA PARA O SEU RESPONSÁVEL' && __srv.info.limit_cents === 5000), vp + ' menor: aviso do responsável e limite de R$ 50');
    await p.click('#zhBody [data-zq=ok]');
    await p.waitForTimeout(300);
    ok(await p.evaluate(() => __srv.paid === 'punhado'), vp + ' autorizou: segue para o pagamento do punhado');

    // passa do limite (R$ 20 + R$ 35 > R$ 50)
    await p.evaluate(() => { __srv.paid = null; ZLIM.free(); });
    await click(2);
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${vp}-4-limite-do-mes.png` });
    ok(await p.evaluate(() => $('zhT').textContent === 'LIMITE DO MÊS' && !__srv.paid), vp + ' mochila passa do limite: barra antes do pagamento');
    await p.click('#zhBody [data-zq=lim]');
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/${vp}-5-limite-menor.png` });
    ok(await p.evaluate(() => document.querySelector('#zhBody [data-zl=""]').disabled && document.querySelector('#zhBody [data-zl="20000"]').disabled), vp + ' menor: SEM LIMITE e acima de R$ 100 desligados');
    ok(await p.evaluate(() => document.querySelectorAll('[data-act=pack]:disabled').length === 0), vp + ' botões de compra reativados');

    // adulto: subir limite fica agendado
    await p.evaluate(() => { __srv.info.age = 'adult'; __srv.info.limit_cents = 5000; ZLIM.open('lim'); });
    await p.waitForTimeout(400);
    await p.click('#zhBody [data-zl="20000"]');
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/${vp}-6-limite-agendado.png` });
    ok(await p.evaluate(() => !!__srv.info.next && /DESISTIR/.test($('zhBody').textContent)), vp + ' subir o limite: fica agendado com DESISTIR');

    // minhas compras
    await p.click('#zhTabs [data-zt=hist]');
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${vp}-7-minhas-compras.png` });
    const tags = await p.evaluate(() => [...document.querySelectorAll('#zhBody .zhTag')].map((e) => e.textContent).join('|'));
    ok(tags === 'NÃO FINALIZADA|APROVADA|APROVADA|DEVOLUÇÃO EM ANÁLISE|RECUSADA', vp + ' estados: ' + tags);
    await p.click('#zhBody [data-zrf=o3]');
    await p.waitForTimeout(300);
    await p.fill('#zhWhy', 'comprei sem querer');
    await p.screenshot({ path: `${OUT}/${vp}-8-pedir-devolucao.png` });
    await p.click('#zhBody [data-zq=go]');
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT}/${vp}-9-devolucao-pedida.png` });
    ok(await p.evaluate(() => __srv.why === 'comprei sem querer' && document.querySelectorAll('#zhBody [data-zrc]').length === 2 && $('zhOv').className === ''), vp + ' devolução pedida aparece em análise');
    await p.keyboard.press('Escape');
    await p.waitForTimeout(200);
    ok(await p.evaluate(() => $('zhOv').className === 'hidden'), vp + ' Esc fecha');
    await ctx.close();
  }
  await b.close();
  console.log(bad ? bad + ' falha(s)' : 'tudo ok');
  process.exit(bad ? 1 : 0);
})();
