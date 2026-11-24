// Prints e vídeo da tela ITENS RECEBIDOS (v29). Serve o index.html em http://localhost/ (trava de domínio).
// Uso: node tools/qa/itens-recebidos.js <pasta-saida> [index.html]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || 'out', HTML = process.argv[3] || 'index.html';
fs.mkdirSync(OUT, { recursive: true });
const VPS = { pc: { width: 1366, height: 768 }, celular: { width: 844, height: 390 }, 'celular-pequeno': { width: 667, height: 375 } };
const html = fs.readFileSync(HTML);
const __TV__ = (/TERMS = \{\s*V: "([^"]+)"/.exec(require('fs').readFileSync(process.argv[3] || 'index.html', 'utf8')) || [])[1] || '';
(async () => {
  const b = await chromium.launch();
  for (const [vp, size] of Object.entries(VPS)) {
    for (const mode of vp === 'pc' ? ['servidor', 'sem-conta'] : ['servidor']) {
      const ctx = await b.newContext({ viewport: size, deviceScaleFactor: vp === 'pc' ? 1 : 2, hasTouch: vp !== 'pc', recordVideo: vp === 'celular' || vp === 'pc' && mode === 'servidor' ? { dir: OUT + '/_vid', size } : undefined });
      await ctx.addInitScript((v) => { try { localStorage.setItem('qz_terms', JSON.stringify({ v })); } catch (e) {} }, __TV__); // termos já aceitos (v29.11)
      await ctx.addInitScript(() => { try { const d = JSON.parse(localStorage.getItem('qz_save') || '{}'); d.created = 1; d.matches = 3; d.level = 8; d.xp = 900; localStorage.setItem('qz_save', JSON.stringify(d)); } catch (e) {} });
      await ctx.route('http://localhost/**', (r) => { const u = new URL(r.request().url()); if (u.pathname === '/' || u.pathname === '/index.html') return r.fulfill({ body: html, contentType: 'text/html' }); const f = path.join(path.dirname(HTML), u.pathname); return fs.existsSync(f) ? r.fulfill({ path: f }) : r.fulfill({ status: 404 }); });
      const p = await ctx.newPage();
      p.on('pageerror', (e) => console.log(vp, 'ERR', e.message));
      await p.goto('http://localhost/', { waitUntil: 'load' });
      await p.waitForTimeout(2500);
      const ids = await p.evaluate((mode) => {
        const it = Object.entries(LOOK.ITEMS), leg = it.find(([k, v]) => v.rar >= 4 && v.unlock), rar = it.find(([k, v]) => v.rar === 2 && v.unlock) || it.find(([k, v]) => v.rar === 2);
        startGame();
        S.stats.kills = 1069; S.round = 20; S.earned = 150000;
        S.loot = [{ k: 'chip', a: 1 }, { k: 'zcoin', a: 25 }];
        if (mode === 'servidor') {
          ECO.srvOn = () => true;
          ECO.refresh = () => new Promise((res) => setTimeout(() => { LOOT.items([leg[0]]); res(null); }, 300));
          NET.endRun = () => new Promise((res) => setTimeout(() => res({ ok: true, coins: 948, char_xp: 3288, level: 9, xp: 1033, need: 1340, wallet_coins: 25000, pass_xp: 2069, box: 1 }), 900));
        } else {
          NET.endRun = () => Promise.resolve(null);
          const ck = LOOK.checkUnlocks;
          // força uma roupa rara liberada nesta partida
          LOOT._t = rar[0];
        }
        S.unlockedNow = 1;
        return [leg[0], rar[0]];
      }, mode);
      await p.waitForTimeout(400);
      await p.evaluate(() => { UI.over(true); if (LOOT._t) LOOT.items([LOOT._t]); });
      const shots = vp === 'pc' && mode === 'servidor' ? [[300, '1-abrindo'], [1500, '2-comuns'], [4300, '3-raro-virando'], [7200, '4-lendario'], [9800, '5-tudo']] : [[12500, 'tudo']];
      let t = 0;
      for (const [ms, name] of shots) { await p.waitForTimeout(ms - t); t = ms; await p.screenshot({ path: `${OUT}/${vp}-${mode}-${name}.png` }); }
      // toque: fecha e mostra o relatório
      await p.click('#ltGo');
      await p.waitForTimeout(700);
      await p.screenshot({ path: `${OUT}/${vp}-${mode}-relatorio.png` });
      const st = await p.evaluate(() => ({ on: LOOT.on, cls: document.getElementById('lootFx').className, over: !document.getElementById('over').classList.contains('hidden') }));
      console.log(vp, mode, ids, st);
      // pular: outra partida, toque no meio da animação mostra tudo
      if (vp === 'celular') {
        await p.evaluate(() => { S.mode = 'play'; S.loot = [{ k: 'chip', a: 1 }]; UI.over(false); });
        await p.waitForTimeout(1400);
        await p.mouse.click(size.width / 2, 40);
        await p.waitForTimeout(500);
        await p.screenshot({ path: `${OUT}/${vp}-pulou.png` });
        console.log('pulou', await p.evaluate(() => ({ done: document.getElementById('lootFx').classList.contains('done'), n: document.getElementById('ltRow').children.length })));
      }
      await ctx.close();
    }
  }
  await b.close();
})();
