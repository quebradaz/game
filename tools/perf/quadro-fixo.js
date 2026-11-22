// Mesmo quadro nas duas versões: passo fixo de 1/60 s e aleatório com semente, para comparar a imagem pixel a pixel.
// Uso: node tools/perf/quadro-fixo.js <index.html> <saida.png> [quadros=600]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const FILE = path.resolve(process.argv[2]), OUT = process.argv[3], N = +process.argv[4] || 600, ROOT = path.resolve(__dirname, '../..');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 896, height: 414 }, deviceScaleFactor: 1, hasTouch: true, isMobile: true });
  await ctx.route('**/*', (r) => { const u = new URL(r.request().url()); if (u.hostname !== 'localhost') return r.abort();
    const p = decodeURIComponent(u.pathname); if (p === '/' || p === '/index.html') return r.fulfill({ body: fs.readFileSync(FILE), contentType: 'text/html' });
    const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: '' }); r.fulfill({ body: fs.readFileSync(f) }); });
  await ctx.addInitScript(() => { try { const d = JSON.parse(localStorage.getItem('qz_save') || '{}'); d.created = 1; d.matches = 5; d.level = 10; d.tut = 1; localStorage.setItem('qz_save', JSON.stringify(d)); } catch (e) {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost/', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  const r = await p.evaluate((N) => {
    try { SAVE.unlink && SAVE.unlink(); } catch (e) {} try { acctHome(); } catch (e) {} try { TUT.on = 0; TUT.start = () => {}; } catch (e) {}
    loop = () => {}; hurtPlayer = () => {};
    let s = 42; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; };
    S.mi = 0; startGame(); setQuality('media'); skipPause(); giveWeapon('m249', 'gold', 0); startRound(22); S.toSpawn = 1e6; S.spawnT = 0;
    for (let i = 0; i < N; i++) { const pl = S.player; let best = null, bd = 1e9; for (const z of S.zs) if (z.state !== 'dead') { const d = Math.abs(z.x - pl.x); if (d < bd) { bd = d; best = z; } }
      if (best) { pl.aim = Math.atan2(best.y - best.h / 2 - (pl.y - 30), best.x - pl.x); S.input.aimMag = 1; S.input.fire = true; } pl.ws[pl.cur].res = 999;
      update(1 / 60); render(); }
    // dois quadros parados no fim: a fila de manchas e o reflexo alcançam o estado atual
    const t = S.t; for (let i = 0; i < 3; i++) { render(); }
    return { kills: S.stats.kills, alive: S.zs.filter((z) => z.state !== 'dead').length };
  }, N);
  await p.locator('canvas').first().screenshot({ path: OUT });
  console.log(JSON.stringify({ ...r, errs }));
  await b.close();
})();
