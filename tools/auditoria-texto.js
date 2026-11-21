// Auditoria de tamanho de texto em 7 resoluções: prints + report.json com a altura-x real de cada texto visível.
// Uso: node tools/serve.js . 8377 & node tools/auditoria-texto.js <pasta-saida> [porta] [resolucoes,csv] [p|m|g]
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2] || 'audit/before', PORT = process.argv[3] || 8377;
const VPS = {
  'cel-pequeno': { width: 640, height: 360 },
  'iphone-se': { width: 667, height: 375 },
  'cel-20x9': { width: 780, height: 360 },
  'iphone-14': { width: 844, height: 390 },
  'tablet': { width: 1024, height: 768 },
  'pc-hd': { width: 1366, height: 768 },
  'pc-fullhd': { width: 1920, height: 1080 },
};
const only = process.argv[4] ? process.argv[4].split(',') : Object.keys(VPS);
const UISZ = process.argv[5] || 'm';
fs.mkdirSync(OUT, { recursive: true });
const ECOD = {
  wallet: { chips: 12, zcoin: 340 }, items: [], skills: {}, costs: {}, boxes: 2, tut: 1,
  pass: { name: 'TEMPORADA 1 · QUEBRADA SINISTRA', levels: 40, xp: 7450, xp_per: 1000, ends: '2026-12-31T00:00:00Z', free: [1, 2, 3], prem: [], premium: false,
    rewards: Array.from({ length: 40 }, (_, i) => [{ l: i + 1, t: 'free', k: 'coins', a: 100 + i * 20 }, { l: i + 1, t: 'prem', k: 'zcoin', a: 10 }]).flat() },
  missions: [{ text: 'Mate 300 zumbis', progress: 120, target: 300, coins: 200, xp: 400, slot: 0 }, { text: 'Venca a onda 10 no Complexo', progress: 0, target: 1, coins: 300, xp: 600, zcoin: 5, slot: 1 }],
  shop: [{ id: 'x', kind: 'item', rarity: 3, price: 400 }],
};
const SCREENS = [
  ['login', async p => { await p.evaluate(() => UI.show('login')); }],
  ['inicio', async p => { await p.evaluate(() => { UI.show('title'); }); }],
  ['perfil', async p => { await p.click('#bProfile'); }],
  ['passe', async p => { await p.evaluate(ed => { NET.st.name = 'NORDUK'; ECO.ready = 1; ECO.data = ed; ECO.chips = 12; ECO.zcoin = 340; ECO.paint(); UI.show('ecoScr'); ECO.show('pass'); }, ECOD); }],
  ['missoes', async p => { await p.evaluate(() => ECO.show('mis')); }],
  ['caixas', async p => { await p.evaluate(() => ECO.show('box')); }],
  ['zcoin', async p => { await p.evaluate(() => ECO.show('shop')); }],
  ['personagem', async p => { await p.evaluate(() => UI.show('title')); await p.click('#bChar'); }],
  ['inventario', async p => { await p.click('#lkTabs [data-t=inv]'); }],
  ['habilidades', async p => { await p.click('#lkTabs [data-t=skill]'); }],
  ['loja', async p => { await p.evaluate(() => UI.show('title')); await p.click('#bMShop'); }],
  ['ajustes', async p => { await p.evaluate(() => UI.show('title')); await p.click('#bSet'); }],
  ['ajuda', async p => { await p.evaluate(() => UI.show('title')); await p.click('#bHelp'); }],
  ['feedback', async p => { await p.evaluate(() => UI.show('title')); await p.click('#bFeed'); }],
  ['campanhas', async p => { await p.evaluate(() => UI.show('title')); await p.click('#bPlay'); }],
  ['mapas', async p => { await p.evaluate(() => { const c = document.querySelector('#cpList .cpCard:not(.soon)') || document.querySelector('#cpList > *'); c && c.click(); }); }],
  ['partida', async p => { await p.click('#bStart'); await p.waitForTimeout(9000); }],
  ['pausa', async p => { await p.keyboard.press('Escape'); }],
];
const RATIO_OLD = { Pixelzone: 7 / 16, Yoster: 10 / 16, GothicByte: 8 / 16, Oxygene: 13 / 16 };
(async () => {
  const b = await chromium.launch();
  const report = {};
  for (const vp of only) {
    const ctx = await b.newContext({ viewport: VPS[vp], hasTouch: VPS[vp].width < 1000, isMobile: false });
    await ctx.addInitScript(sz => { try { const d = JSON.parse(localStorage.getItem('qz_save') || '{}'); d.uiSize = sz; d.created = 1; d.matches = 3; d.level = 7; localStorage.setItem('qz_save', JSON.stringify(d)); } catch (e) {} }, UISZ);
    const p = await ctx.newPage();
    p.on('pageerror', e => console.log(vp, 'ERR', e.message));
    await p.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'load' });
    await p.waitForTimeout(2500);
    await p.evaluate(() => { try { SAVE.unlink && SAVE.unlink(); } catch (e) {} try { acctHome(); } catch (e) { console.log(e.message); } });
    await p.waitForTimeout(600);
    report[vp] = {};
    for (const [name, fn] of SCREENS) {
      try { await fn(p); } catch (e) { console.log(vp, name, 'falhou', e.message.split('\n')[0]); continue; }
      await p.waitForTimeout(500);
      const m = await p.evaluate(RATIO0 => {
        const res = [];
        const RATIO = {};
        const cv = document.createElement('canvas').getContext('2d');
        const xr = f => { if (RATIO[f] == null) { cv.font = '100px "' + f + '"'; RATIO[f] = cv.measureText('x').actualBoundingBoxAscent / 100 || 0.5; } return RATIO[f]; };
        const W = innerWidth, H = innerHeight;
        const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const seen = new Set();
        let n;
        while ((n = walk.nextNode())) {
          const t = n.nodeValue.trim();
          if (!t) continue;
          const el = n.parentElement;
          if (seen.has(el)) continue;
          seen.add(el);
          const r = el.getBoundingClientRect();
          if (!r.width || !r.height || r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) continue;
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
          let o = el, hid = false; while (o) { const c = getComputedStyle(o); if (c.display === 'none' || +c.opacity === 0) { hid = true; break; } o = o.parentElement; }
          if (hid) continue;
          const z = el.currentCSSZoom || 1;
          const fs = parseFloat(cs.fontSize) * z;
          const fam = cs.fontFamily.split(',')[0].replace(/['"]/g, '').trim();
          const xh = fs * xr(fam);
          res.push({ t: t.slice(0, 40), fs: +fs.toFixed(1), fam, xh: +xh.toFixed(1), sel: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ').join('.') : '') });
        }
        return res;
      }, 0);
      // texto desenhado no canvas (HUD): só contamos que existe
      await p.screenshot({ path: `${OUT}/${vp}-${name}.png` });
      const bad = m.filter(x => x.xh < 6), small = m.filter(x => x.xh >= 6 && x.xh < 7);
      report[vp][name] = { n: m.length, ilegivel: bad.length, pequeno: small.length, minXh: m.length ? Math.min(...m.map(x => x.xh)) : null, piores: m.sort((a, c) => a.xh - c.xh).slice(0, 6) };
    }
    await ctx.close();
  }
  fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
  for (const vp in report) {
    console.log('==', vp);
    for (const s in report[vp]) { const r = report[vp][s]; console.log(s.padEnd(12), 'textos', String(r.n).padStart(3), 'ilegiveis', String(r.ilegivel).padStart(3), 'pequenos', String(r.pequeno).padStart(3), 'menor x', r.minXh); }
  }
  await b.close();
})();
