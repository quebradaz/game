// Prints dos baús de Z-Coin com 5 itens (v29.7): aba BAÚS com a lista do dia e chances, compra do baú lendário
// (abre o baú e mostra os 5 cartões, com um repetido virando moedas), no celular deitado e no PC.
// O servidor é simulado no navegador com a mesma regra da migração v29_7. Uso: node tools/qa/baus-5-itens.js <saida> [index.html]
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
  const ok = (c, m) => { if (!c) { bad++; console.log('FALHA', m); } };
  for (const [vp, size] of Object.entries(VPS)) {
    const ctx = await b.newContext({ viewport: size, deviceScaleFactor: 2, hasTouch: vp !== 'pc', isMobile: vp !== 'pc' });
    await ctx.addInitScript((v) => { try { localStorage.setItem('qz_terms', JSON.stringify({ v })); } catch (e) {} }, __TV__); // termos já aceitos (v29.12)
    await ctx.addInitScript(() => { try { const d = JSON.parse(localStorage.getItem('qz_save') || '{}'); d.created = 1; d.matches = 3; d.level = 8; d.coins = 4200; localStorage.setItem('qz_save', JSON.stringify(d)); } catch (e) {} });
    await ctx.route('http://localhost/**', (r) => { const u = new URL(r.request().url()); if (u.pathname === '/' || u.pathname === '/index.html') return r.fulfill({ body: html, contentType: 'text/html' }); const f = path.join(path.dirname(HTML), u.pathname); return fs.existsSync(f) ? r.fulfill({ path: f }) : r.fulfill({ status: 404 }); });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => { bad++; console.log(vp, 'ERR', e.message); });
    await p.goto('http://localhost/', { waitUntil: 'load' });
    await p.waitForTimeout(2500);
    await p.evaluate(() => {
      // lista do dia fixa: 8 lendárias, 10 raras, 12 comuns (tamanhos da migração), tiradas do catálogo do jogo
      const ids = Object.keys(LOOK.ITEMS), by = (f) => ids.filter((k) => f(LOOK.ITEMS[k].rar || 1));
      const L = by((r) => r >= 4).slice(0, 8), R = by((r) => r === 2 || r === 3).slice(0, 10), C = by((r) => r <= 1).slice(0, 12);
      const own = new Set([L[0], L[1], R[2], C[0], C[3], C[5]]);
      const pool = (t) => (t === 3 ? L.map((id) => ({ id, r: 3 })) : []).concat(R.map((id) => ({ id, r: 2 })), C.map((id) => ({ id, r: 1 }))).map((x) => Object.assign(x, { own: own.has(x.id) }));
      const shop = () => ({ zcoin: 1500, dupe: { 1: 150, 2: 400, 3: 1000 }, next: new Date(Date.now() + 9 * 36e5 + 41 * 6e4).toISOString(), chests: [2, 3].map((t) => {
        const P = pool(t), g = P.filter((x) => x.r === t);
        return { tier: t, name: t === 3 ? 'Baú lendário de ouro' : 'Baú raro', price: t === 3 ? 600 : 150, reveal: false, limit: t === 3 ? 2 : 5, today: 0, extras: t === 3 ? [2, 1, 1, 1] : [1, 1, 1, 1], item: null, pool: P, left: g.filter((x) => !x.own).length, total: g.length };
      }) });
      window.__buy = { items: [{ item: L[4], r: 3, dupe: false, coins: 0 }, { item: R[6], r: 2, dupe: false, coins: 0 }, { item: C[0], r: 1, dupe: true, coins: 150 }, { item: C[7], r: 1, dupe: false, coins: 0 }, { item: C[9], r: 1, dupe: false, coins: 0 }] };
      NET.logged = 1;
      NET.rpc = (fn, a) => {
        window.__last = fn + ':' + JSON.stringify(a || {});
        if (fn === 'get_chest_shop') return Promise.resolve(shop());
        if (fn === 'get_economy') return Promise.resolve(ECO.data);
        if (fn === 'buy_chest') { const r = window.__buy.items; return Promise.resolve({ kind: 'item', amount: 0, item: r[0].item, tier: a.p_tier, box: 77, items: r, coins: 150, zcoin: 900 }); }
        return Promise.resolve({});
      };
      ECO.data = { pass: null, wallet: { chips: 3, zcoin: 1500 }, items: [...own], shop: [], missions: [], boxes: 1 };
      ECO.ready = 1; ECO.chips = 3; ECO.zcoin = 1500; ECO.items = [...own];
      const ch = shop(); ECO.chests = ch.chests; ECO.chDupe = ch.dupe; ECO.chNext = Date.parse(ch.next);
      ECO.refresh = () => Promise.resolve(null);
      ECO.got = () => Promise.resolve();
      UI.show('ecoScr');
      ECO.show('box');
    });
    await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT}/${vp}-1-baus.png` });
    const info = await p.evaluate(() => ({
      cards: document.querySelectorAll('#ecBody .chCard').length,
      gt: [...document.querySelectorAll('#ecBody .chCard .gt')].map((e) => e.textContent),
      rails: [...document.querySelectorAll('#ecBody .chCard')].map((c) => c.querySelectorAll('.chRail').length),
      thumbs: document.querySelectorAll('#ecBody .chCard.t3 .chRail i').length,
      own: document.querySelectorAll('#ecBody .chCard.t3 .chRail i.own').length,
      slot: [...document.querySelectorAll('#ecBody .chCard.t3 .chSl > div:first-child')].map((e) => e.textContent),
      wide: document.documentElement.scrollWidth > innerWidth + 1
    }));
    console.log(vp, JSON.stringify(info));
    ok(info.cards === 2, 'dois baus');
    ok(/5 itens: 1 lendária \+ 1 rara \+ 3 comuns/.test(info.gt[1]), 'texto lendario ' + info.gt[1]);
    ok(/5 itens: 1 rara \+ 4 comuns/.test(info.gt[0]), 'texto raro ' + info.gt[0]);
    ok(info.rails[0] === 2 && info.rails[1] === 3, 'trilhos por raridade');
    ok(info.thumbs === 30 && info.own === 6, 'miniaturas e TEM');
    ok(/só das 6 que você não tem · 17% cada/.test(info.slot[0]), 'chance garantida ' + info.slot[0]);
    ok(/3 COMUNS25% cada · repetida \+150 moedas/.test(info.slot[2]), 'chance comum ' + info.slot[2]);
    ok(!info.wide, 'sem rolagem lateral da página');
    // rola o trilho das comuns do baú lendário até o fim
    await p.evaluate(() => { const c = document.querySelector('#ecBody .chCard.t3'); c.scrollIntoView({ block: 'start' }); const r = c.querySelectorAll('.chRail')[2]; r.scrollBy({ left: 2000 }); });
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/${vp}-2-bau-lendario-lista.png` });
    // compra: dois toques no baú lendário
    await p.evaluate(() => { const bt = document.querySelector('#ecBody .chCard.t3 button[data-act="chest"]'); bt.scrollIntoView({ block: 'center' }); });
    const bt = await p.$('#ecBody .chCard.t3 button[data-act="chest"]');
    await bt.click(); await p.waitForTimeout(200); await bt.click();
    await p.waitForTimeout(1900);
    await p.screenshot({ path: `${OUT}/${vp}-3-abrindo.png` });
    const last = await p.evaluate(() => window.__last);
    ok(/^buy_chest:\{"p_tier":3/.test(last), 'chamou buy_chest ' + last);
    await p.waitForTimeout(8000);
    await p.screenshot({ path: `${OUT}/${vp}-4-cinco-itens.png` });
    const lt = await p.evaluate(() => ({ on: LOOT.on, n: document.querySelectorAll('#ltRow .ltCard').length, dup: document.querySelectorAll('#ltRow .ltCard.dup').length, rs: [...document.querySelectorAll('#ltRow .ltR')].map((e) => e.textContent), go: document.getElementById('ltGo').textContent, chest: document.getElementById('chestFx').classList.contains('hidden') }));
    console.log(vp, 'loot', JSON.stringify(lt));
    ok(lt.chest && lt.on, 'bau fechou e loot abriu');
    ok(lt.n === 6 && lt.dup === 1, '5 itens + moedas');
    ok(lt.rs.includes('REPETIDO · +150 MOEDAS') && lt.rs.includes('LENDÁRIO') && lt.go === 'PRONTO', 'legendas ' + lt.rs);
    await ctx.close();
  }
  await b.close();
  console.log(bad ? 'FALHOU ' + bad : 'ok');
  process.exit(bad ? 1 : 0);
})();
