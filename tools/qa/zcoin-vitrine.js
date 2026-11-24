// Prints da vitrine de Z-Coin (v29.6): menu inicial, Passe e Loja › Z-COIN e LOJA › Z-COIN, no celular deitado e no PC.
// Serve o index.html em http://localhost/ (trava de domínio). Uso: node tools/qa/zcoin-vitrine.js <pasta-saida> [index.html]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || 'out', HTML = process.argv[3] || 'index.html';
fs.mkdirSync(OUT, { recursive: true });
const VPS = { pc: { width: 1366, height: 768 }, celular: { width: 844, height: 390 }, 'celular-pequeno': { width: 667, height: 375 } };
const html = fs.readFileSync(HTML);
const __TV__ = (/TERMS = \{\s*V: "([^"]+)"/.exec(require('fs').readFileSync(process.argv[3] || 'index.html', 'utf8')) || [])[1] || '';
(async () => {
  const b = await chromium.launch();
  let bad = 0;
  for (const [vp, size] of Object.entries(VPS)) {
    const ctx = await b.newContext({ viewport: size, deviceScaleFactor: 2, hasTouch: vp !== 'pc', isMobile: vp !== 'pc' });
    await ctx.addInitScript((v) => { try { localStorage.setItem('qz_terms', JSON.stringify({ v })); } catch (e) {} }, __TV__); // termos já aceitos (v29.11)
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
      // catálogo igual ao do servidor (shop_items ativos, 24/11): lendárias de 600 e 900 Z e as raras de 200 Z
      const L6 = ['zc_chifres_ouro', 'zc_cangaceiro_ouro', 'zc_aureola_neon', 'zc_visor_ouro', 'zc_gas_ouro', 'zc_caveira_ouro', 'zc_prancha_ouro', 'zc_violao_neon', 'zc_taco_ouro', 'zc_camuflada_lava', 'zc_calca_camo_ouro', 'z_jaqueta_zumbi', 'v29_mascara_goleiro', 'v29_camisa_neon_beach', 'z_mochila_dragao', 'z_tenis_ouro', 'zc_coroa_diamante', 'z_capacete_ouro', 'zc_cartola_neon'];
      const L9 = ['zc_aureola_ouro', 's1_cordao_diamante', 's1_capacete_caveira', 's1_moletom_quebrada', 's1_tatica_sangue', 's1_jaqueta_ouro', 'v29_jetpack_reveillon', 'zc_asas_fenix', 'zc_coroa_fogo'];
      const shop = L6.map((id) => ({ id, price: 600, rarity: 3, kind: 'item' })).concat(L9.map((id) => ({ id, price: 900, rarity: 3, kind: 'item' })), ['zc_abada_neon', 'zc_tapa_neon', 'zc_tenis_cromado', 'z_jaqueta_neon', 'zc_calca_camo_neve', 'zc_boina_neon', 'zc_bermuda_rasgada_rosa', 'v29_durag_roxo', 'zc_medalha_ouro', 'zc_xadrez_real', 'zc_taco_neon', 'zc_listrada_ouro'].map((id) => ({ id, price: 200, rarity: 2, kind: 'item' })));
      ECO.data = { pass: null, wallet: { chips: 3, zcoin: 700 }, items: ['z_jaqueta_zumbi'], shop, missions: [], boxes: 0 };
      ECO.ready = 1; ECO.chips = 3; ECO.zcoin = 700; ECO.items = ['z_jaqueta_zumbi'];
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
    // LOJA › LENDÁRIOS: seções, rolagem, compra em dois toques
    await p.evaluate(() => { ZPAY.ov(0); msTab = 'skin'; showMShop(); });
    await p.click('#msLend');
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${OUT}/${vp}-5-lendarios.png` });
    const lg = await p.evaluate(() => ({ secs: [...document.querySelectorAll('#msZcBox .lgH b')].map((e) => e.textContent), cards: document.querySelectorAll('#msZcBox .lgCard').length, raras: document.querySelectorAll('#msZcBox [data-lend="zc_abada_neon"]').length, sua: document.querySelectorAll('#msZcBox .lgCard.own').length }));
    console.log(vp, 'lendarios', JSON.stringify(lg));
    if (lg.cards !== 40 || lg.raras !== 1 || lg.sua !== 1 || lg.secs[4] !== 'RARAS') bad++;
    await p.evaluate(() => { document.querySelectorAll('#msZcBox .lgRail')[3].scrollBy({ left: 2000 }); document.getElementById('msZcBox').scrollTop = 9999; });
    await p.waitForTimeout(600);
    await p.screenshot({ path: `${OUT}/${vp}-6-lendarios-rolado.png` });
    const buy = await p.evaluate(() => new Promise((res) => {
      let called = null;
      NET.rpc = (fn, a) => { called = fn + ':' + a.p_item; return Promise.resolve({ ok: true }); };
      ECO.got = () => Promise.resolve();
      const b = document.querySelector('#msZcBox button[data-lend][data-price="600"]');
      b.click();
      const armed = b.textContent;
      setTimeout(() => { b.click(); setTimeout(() => res({ armed, called }), 200); }, 150);
    }));
    console.log(vp, 'compra lendaria', JSON.stringify(buy));
    if (buy.armed !== 'CONFIRMAR' || !/^buy_item:/.test(buy.called || '')) bad++;
    await ctx.close();
  }
  await b.close();
  console.log(bad ? 'FALHOU ' + bad : 'ok');
  process.exit(bad ? 1 : 0);
})();
