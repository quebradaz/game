// Prints da vitrine de Z-Coin (v29.6): menu inicial, Passe e Loja › Z-COIN e LOJA › Z-COIN, no celular deitado e no PC.
// Serve o index.html em http://localhost/ (trava de domínio). Uso: node tools/qa/zcoin-vitrine.js <pasta-saida> [index.html]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || 'out', HTML = process.argv[3] || 'index.html';
fs.mkdirSync(OUT, { recursive: true });
const VPS = { pc: { width: 1366, height: 768 }, celular: { width: 844, height: 390 }, 'celular-pequeno': { width: 667, height: 375 } };
const html = fs.readFileSync(HTML);
(async () => {
  const b = await chromium.launch();
  let bad = 0;
  for (const [vp, size] of Object.entries(VPS)) {
    const ctx = await b.newContext({ viewport: size, deviceScaleFactor: 2, hasTouch: vp !== 'pc', isMobile: vp !== 'pc' });
    await ctx.addInitScript(() => { try { const d = JSON.parse(localStorage.getItem('qz_save') || '{}'); d.created = 1; d.matches = 3; d.level = 8; d.xp = 900; d.coins = 4200; localStorage.setItem('qz_save', JSON.stringify(d)); } catch (e) {} });
    await ctx.route('http://localhost/**', (r) => { const u = new URL(r.request().url()); if (u.pathname === '/' || u.pathname === '/index.html') return r.fulfill({ body: html, contentType: 'text/html' }); const f = path.join(path.dirname(HTML), u.pathname); return fs.existsSync(f) ? r.fulfill({ path: f }) : r.fulfill({ status: 404 }); });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => { bad++; console.log(vp, 'ERR', e.message); });
    await p.goto('http://localhost/', { waitUntil: 'load' });
    await p.waitForTimeout(2500);
    // finge conta logada com economia do servidor
    await p.evaluate(() => {
      NET.logged = 1;
      ECO.refresh = () => Promise.resolve(null);
      ECO.data = { pass: null, wallet: { chips: 3, zcoin: 250 }, items: [], shop: [{ id: Object.keys(LOOK.ITEMS).find((k) => LOOK.ITEMS[k].rar >= 4), price: 600, rarity: 3 }], missions: [], boxes: 0 };
      ECO.ready = 1; ECO.chips = 3; ECO.zcoin = 250; ECO.items = [];
      ECO.paint();
      UI.show('title');
    });
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${OUT}/${vp}-1-menu.png` });
    const fit = await p.evaluate(() => { const r = document.getElementById('bZc').getBoundingClientRect(), row = document.querySelector('.tRow').getBoundingClientRect(); return { btn: [Math.round(r.left), Math.round(r.right), Math.round(r.top)], row: [Math.round(row.left), Math.round(row.right)], vw: innerWidth }; });
    console.log(vp, 'menu', JSON.stringify(fit));
    await p.click('#bZc');
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT}/${vp}-2-passe-zcoin.png` });
    // rola o trilho para o fim (toque no celular, roda do mouse no PC)
    const rail = await p.$('#ecBody .zcRail');
    const bx = await rail.boundingBox();
    if (vp === 'pc') { await p.mouse.move(bx.x + bx.width / 2, bx.y + bx.height / 2); await p.mouse.wheel(0, 900); }
    else await p.evaluate(() => { const r = document.querySelector('#ecBody .zcRail'); r.scrollBy({ left: 2000 }); });
    await p.waitForTimeout(800);
    const sc = await p.evaluate(() => { const r = document.querySelector('#ecBody .zcRail'); return { left: Math.round(r.scrollLeft), max: r.scrollWidth - r.clientWidth }; });
    console.log(vp, 'rolagem', JSON.stringify(sc));
    await p.screenshot({ path: `${OUT}/${vp}-3-passe-zcoin-rolado.png` });
    // LOJA › Z-COIN
    await p.evaluate(() => { msTab = 'skin'; showMShop(); });
    await p.waitForTimeout(300);
    await p.click('#msZc');
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT}/${vp}-4-loja-zcoin.png` });
    // compra: o card chama ZPAY.buy com o pacote certo (sem sair da página)
    const got = await p.evaluate(() => new Promise((res) => { ZPAY.buy = (pk) => { res(pk.id); return Promise.resolve(); }; document.querySelectorAll('#msZcBox .zcCard .btn')[1].click(); setTimeout(() => res('nada'), 500); }));
    console.log(vp, 'compra', got);
    if (got !== 'saco') bad++;
    await ctx.close();
  }
  await b.close();
  console.log(bad ? 'FALHOU ' + bad : 'ok');
  process.exit(bad ? 1 : 0);
})();
