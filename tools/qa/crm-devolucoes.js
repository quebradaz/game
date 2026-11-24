// Prints da tela Devoluções do CRM (v29.8) com o servidor imitado. Nada sai da máquina.
// Uso: node tools/qa/crm-devolucoes.js <pasta-saida>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || 'out';
fs.mkdirSync(OUT, { recursive: true });
const html = fs.readFileSync(path.join(__dirname, '../../crm/index.html'));
const now = Date.now(), iso = (h) => new Date(now - h * 36e5).toISOString();
let list = [
  { id: 2, order: 'o2', nome: 'Ana', zcoin: 700, centavos: 2000, motivo: 'comprei sem querer', status: 'pedido', nota: null, pedido_em: iso(2), pago_em: iso(30), transacao: 'tx-8f3a21', metodo: 'pix' },
  { id: 1, order: 'o1', nome: 'Beto', zcoin: 300, centavos: 490, motivo: null, status: 'negado', nota: 'Z-Coin já usada no passe', pedido_em: iso(80), pago_em: iso(90), transacao: 'tx-11aa02', metodo: 'credit_card' }];
let bad = 0, decided = null;
(async () => {
  const b = await chromium.launch();
  for (const [vp, size] of Object.entries({ pc: { width: 1366, height: 768 }, celular: { width: 390, height: 844 } })) {
    const ctx = await b.newContext({ viewport: size, deviceScaleFactor: 2, isMobile: vp !== 'pc', hasTouch: vp !== 'pc' });
    await ctx.addInitScript(() => localStorage.setItem('qz_crm_auth', JSON.stringify({ at: 'x', rt: 'y', exp: Date.now() + 36e5 })));
    await ctx.route('http://localhost/**', (r) => r.fulfill({ body: html, contentType: 'text/html' }));
    await ctx.route('https://wjjuuqvdttjuzsgqueuj.supabase.co/**', (r) => {
      const fn = r.request().url().split('/rpc/')[1];
      const a = JSON.parse(r.request().postData() || '{}');
      let body = null;
      if (fn === 'crm_me') body = { admin: true, name: 'BRUXO' };
      else if (fn === 'zc_refunds_list') body = list;
      else if (fn === 'zc_refund_decide') { decided = a; list = list.map((x) => x.id === a.p_refund ? Object.assign({}, x, { status: a.p_ok ? 'aprovado' : 'negado', nota: a.p_note }) : x); body = { ok: true }; }
      else body = {};
      return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => { bad++; console.log(vp, 'ERR', e.message); });
    p.on('dialog', (d) => d.accept());
    await p.goto('http://localhost/#devolucoes');
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/crm-${vp}-devolucoes.png` });
    const n = await p.$$eval('[data-rfok]', (e) => e.length);
    console.log(vp, 'pedidos abertos com botões:', n); if (n !== 1) bad++;
    if (vp === 'pc') {
      await p.fill('[data-rfn="2"]', 'Estorno feito no Pix');
      await p.click('[data-rfok="2"]');
      await p.waitForTimeout(600);
      console.log('decidiu', JSON.stringify(decided));
      if (!decided || decided.p_ok !== true || decided.p_note !== 'Estorno feito no Pix') bad++;
      await p.screenshot({ path: `${OUT}/crm-${vp}-aprovada.png` });
      list[0].status = 'pedido';
    }
    await ctx.close();
  }
  await b.close();
  console.log(bad ? bad + ' falha(s)' : 'tudo ok');
  process.exit(bad ? 1 : 0);
})();
