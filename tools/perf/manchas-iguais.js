// Confere que as manchas de sangue no cenário saem idênticas: mesmas manchas, camada de manchas comparada pixel a pixel.
// Uso: node tools/perf/manchas-iguais.js <index.html> <saida.png>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const FILE = path.resolve(process.argv[2]), OUT = process.argv[3], ROOT = path.resolve(__dirname, '../..');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 896, height: 414 } });
  await ctx.route('**/*', (r) => { const u = new URL(r.request().url()); if (u.hostname !== 'localhost') return r.abort();
    const p = decodeURIComponent(u.pathname); if (p === '/' || p === '/index.html') return r.fulfill({ body: fs.readFileSync(FILE), contentType: 'text/html' });
    const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: '' }); r.fulfill({ body: fs.readFileSync(f) }); });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost/', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  const url = await p.evaluate(() => {
    try { acctHome(); } catch (e) {} loop = () => {};
    S.mi = 0; startGame(); skipPause(); decalClear(); S.decalFade = 0;
    let s = 7; const R = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; };
    const m = M();
    for (let i = 0; i < 3000; i++) decal(R() * m.w, R() * VH, 1 + (R() * 3 | 0), 1 + (R() * 2 | 0), ['#7a0606', '#c00c0c', '#5a0508'][i % 3], R() < 0.3 ? 0.6 : 1);
    S.cam.x = 0; render(); render(); render();
    const L = LAYERS[S.mi], [c, x] = mkCanvas(m.w, VH);
    for (const t of L.decT) x.drawImage(t.c, t.x, 0);
    return c.toDataURL();
  });
  fs.writeFileSync(OUT, Buffer.from(url.split(',')[1], 'base64'));
  console.log(JSON.stringify({ errs }));
  await b.close();
})();
