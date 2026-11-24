// Prints e conferência dos termos de uso (v29.9): aceite no primeiro acesso, termos atualizados, links e baú 18+.
// O servidor é imitado aqui; nada sai da máquina.
// Uso: node tools/qa/termos.js <pasta-saida> [index.html]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || 'out', HTML = process.argv[3] || 'index.html', ROOT = path.dirname(HTML);
fs.mkdirSync(OUT, { recursive: true });
const VPS = { pc: { width: 1366, height: 768 }, celular: { width: 844, height: 390 }, 'celular-pequeno': { width: 667, height: 375 } };
const html = fs.readFileSync(HTML);
let bad = 0;
const ok = (c, m) => { console.log((c ? 'ok  ' : 'FALHA ') + m); if (!c) bad++; };
const route = (ctx) => ctx.route('http://localhost/**', (r) => {
  const u = new URL(r.request().url());
  if (u.pathname === '/' || u.pathname === '/index.html') return r.fulfill({ body: html, contentType: 'text/html' });
  const f = path.join(ROOT, u.pathname);
  return fs.existsSync(f) ? r.fulfill({ path: f }) : r.fulfill({ status: 404 });
});
(async () => {
  const b = await chromium.launch();
  for (const [vp, size] of Object.entries(VPS)) {
    const ctx = await b.newContext({ viewport: size, deviceScaleFactor: 2, hasTouch: vp !== 'pc', isMobile: vp !== 'pc' });
    await ctx.addInitScript(() => { try { const d = JSON.parse(localStorage.getItem('qz_save') || '{}'); d.created = 1; d.matches = 3; d.level = 8; localStorage.setItem('qz_save', JSON.stringify(d)); } catch (e) {} });
    await route(ctx);
    const p = await ctx.newPage();
    p.on('pageerror', (e) => { bad++; console.log(vp, 'ERR', e.message); });
    await p.goto('http://localhost/', { waitUntil: 'load' });
    await p.waitForTimeout(2500);

    // 1. login: aviso com links
    await p.evaluate(() => acctLoginScreen(''));
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${vp}-1-login.png` });
    ok(await p.evaluate(() => [...document.querySelectorAll('#login .tmLegal a')].map((a) => a.getAttribute('href')).join('|') === 'termos.html|privacidade.html'), vp + ' login mostra links dos termos e da privacidade');

    // 2. primeiro acesso (offline): janela de aceite antes da tela inicial
    await p.evaluate(() => { ECO.refresh = () => Promise.resolve(null); window.__home = 0; const h = UI.show; UI.show = function (n) { if (n === 'title') __home++; return h.apply(this, arguments); }; acctHome(); });
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${vp}-2-aceite.png` });
    ok(await p.evaluate(() => !$('tmOv').classList.contains('hidden') && $('tmT').textContent === 'TERMOS E PRIVACIDADE' && __home === 0), vp + ' janela de aceite aparece e segura a tela inicial');
    ok(await p.evaluate(() => { const r = $('tmOk').getBoundingClientRect(); return r.bottom <= innerHeight && r.right <= innerWidth && r.top >= 0; }), vp + ' botão ACEITAR cabe na tela');
    ok(await p.evaluate(() => $('tmOk').disabled), vp + ' ACEITAR começa desligado');
    await p.click('#tmC1');
    ok(await p.evaluate(() => $('tmOk').disabled), vp + ' só uma confirmação não libera');
    await p.keyboard.press('Escape');
    ok(await p.evaluate(() => !$('tmOv').classList.contains('hidden')), vp + ' Esc não fecha a janela');
    await p.click('#tmC2');
    await p.screenshot({ path: `${OUT}/${vp}-3-aceite-marcado.png` });
    await p.click('#tmOk');
    await p.waitForTimeout(300);
    ok(await p.evaluate(() => $('tmOv').classList.contains('hidden') && __home === 1 && JSON.parse(localStorage.qz_terms).v === TERMS.V), vp + ' aceitou: grava a versão e vai para a tela inicial');
    await p.evaluate(() => acctHome());
    await p.waitForTimeout(200);
    ok(await p.evaluate(() => $('tmOv').classList.contains('hidden') && __home === 2), vp + ' não pergunta de novo na mesma versão');

    // 3. com conta e termos antigos: TERMOS ATUALIZADOS e aceite gravado no servidor
    await p.evaluate(() => {
      localStorage.qz_terms = JSON.stringify({ v: '2026-11-19' });
      Object.defineProperty(NET, 'logged', { get: () => true, configurable: true });
      NET.st.profile = { id: 'u-1', name: 'TESTE', body: 0 };
      window.__calls = [];
      NET.rpc = (fn, a) => { __calls.push([fn, a]); if (fn === 'terms_accept') return Promise.resolve({ version: a.p_version, accepted: true }); return Promise.reject(new Error('rpc ' + fn)); };
      acctHome();
    });
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${vp}-4-termos-atualizados.png` });
    ok(await p.evaluate(() => $('tmT').textContent === 'TERMOS ATUALIZADOS' && !$('tmOv').classList.contains('hidden')), vp + ' versão nova pede aceite de novo');
    await p.click('#tmC1'); await p.click('#tmC2'); await p.click('#tmOk');
    await p.waitForTimeout(300);
    ok(await p.evaluate(() => __calls.some((c) => c[0] === 'terms_accept' && c[1].p_version === TERMS.V && c[1].p_age_ok === true) && JSON.parse(localStorage.qz_terms).srv === 'u-1'), vp + ' aceite vai para o servidor uma vez');
    await p.evaluate(() => { __calls = []; acctHome(); });
    await p.waitForTimeout(200);
    ok(await p.evaluate(() => !__calls.some((c) => c[0] === 'terms_accept')), vp + ' não manda o aceite de novo');

    // 4. Ajustes: links
    await p.evaluate(() => UI.show('settings'));
    await p.waitForTimeout(300);
    await p.evaluate(() => document.querySelector('#settings .tmRow').scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(200);
    await p.screenshot({ path: `${OUT}/${vp}-5-ajustes.png` });
    ok(await p.evaluate(() => document.querySelectorAll('#settings .tmRow a').length === 3), vp + ' Ajustes tem Termos, Privacidade e Atendimento');

    // 5. baú de sorteio: menor barrado, sem idade pergunta a idade
    await p.evaluate(() => {
      window.__toast = [];
      const t = UI.toast; UI.toast = (m, c) => { __toast.push(m); return t && t.call(UI, m, c); };
      window.__age = null;
      NET.rpc = (fn, a) => {
        if (fn === 'buy_chest') return Promise.reject(new Error(__age === null ? 'IDADE_PENDENTE_BAU' : 'BAU_SO_ADULTO'));
        if (fn === 'zc_spend_info') return Promise.resolve({ age: __age, minor_default_cents: 5000, minor_max_cents: 10000 });
        if (fn === 'zc_age_set') { __age = a.p_minor ? 'minor' : 'adult'; return Promise.resolve({ age: __age, limit_cents: 5000 }); }
        return Promise.reject(new Error('rpc ' + fn));
      };
      const bt = document.createElement('button'); bt.dataset.tier = '3'; bt.dataset.price = '600'; document.body.appendChild(bt); window.__bt = bt;
      ECO.chestBuy(bt); ECO.chestBuy(bt);
    });
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/${vp}-6-bau-pergunta-idade.png` });
    ok(await p.evaluate(() => $('zhOv').className === 'ask' && $('zhT').textContent === 'ANTES DA SUA PRIMEIRA COMPRA'), vp + ' baú sem idade: pergunta a idade');
    await p.click('#zhBody [data-zq=minor]');
    await p.waitForTimeout(400);
    await p.evaluate(() => { ECO.chestBuy(__bt); ECO.chestBuy(__bt); });
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${vp}-7-bau-menor.png` });
    ok(await p.evaluate(() => __toast.includes('Baú com sorteio é só para maiores de 18 anos.')), vp + ' menor: avisa que baú de sorteio é 18+');

    // 6. vitrine de Z-Coin: link das regras
    await p.evaluate(() => {
      ECO.data = { pass: null, wallet: { chips: 3, zcoin: 700 }, items: [], shop: [], missions: [], boxes: 0 };
      ECO.ready = 1; ECO.zcoin = 700; ECO.payOn = 1;
      NET.rpc = (fn) => fn === 'zc_spend_info' ? Promise.resolve({ age: 'adult', limit_cents: null, month_cents: 0 }) : Promise.reject(new Error('rpc ' + fn));
      msTab = 'zc'; showMShop();
    });
    await p.waitForTimeout(900);
    await p.evaluate(() => { const l = document.querySelector('.zcLegal'); l && l.scrollIntoView({ block: 'nearest' }); });
    await p.waitForTimeout(200);
    await p.screenshot({ path: `${OUT}/${vp}-8-vitrine-link.png` });
    ok(await p.evaluate(() => { const a = document.querySelector('#msZcBox .zcLegal a'); return !!a && a.getAttribute('href') === 'termos.html#compras'; }), vp + ' vitrine tem link das regras de compra');
    await ctx.close();
  }

  // 7. páginas dos termos: cabem no celular em pé e no PC, sem rolagem de lado
  for (const [vp, size] of Object.entries({ 'celular-em-pe': { width: 390, height: 844 }, pc: { width: 1366, height: 768 } })) {
    const ctx = await b.newContext({ viewport: size, deviceScaleFactor: 2, isMobile: vp !== 'pc', hasTouch: vp !== 'pc' });
    await route(ctx);
    const p = await ctx.newPage();
    for (const pg of ['termos', 'privacidade']) {
      await p.goto(`http://localhost/${pg}.html`, { waitUntil: 'load' });
      await p.screenshot({ path: `${OUT}/pagina-${pg}-${vp}.png` });
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${pg}.html sem rolagem de lado (${vp})`);
      ok(await p.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].every((a) => document.getElementById(a.getAttribute('href').slice(1)))), `${pg}.html: índice aponta para seções que existem (${vp})`);
    }
    await ctx.close();
  }
  await b.close();
  console.log(bad ? bad + ' FALHA(S)' : 'termos: tudo ok');
  process.exit(bad ? 1 : 0);
})();
