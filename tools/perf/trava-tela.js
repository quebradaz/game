// Teste da trava deitada: começa a partida deitado, gira o "celular" para em pé e confere que o jogo continua
// deitado e que o stick esquerdo empurrado para a direita do jogo anda para a direita. Uso: node tools/perf/trava-tela.js [index.html] [print.png]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const FILE = path.resolve(process.argv[2] || path.join(__dirname, '../../index.html')), OUT = process.argv[3], ROOT = path.resolve(__dirname, '../..');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 896, height: 414 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  await ctx.route('**/*', (r) => { const u = new URL(r.request().url()); if (u.hostname !== 'localhost') return r.abort();
    const p = decodeURIComponent(u.pathname); if (p === '/' || p === '/index.html') return r.fulfill({ body: fs.readFileSync(FILE), contentType: 'text/html' });
    const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: '' }); r.fulfill({ body: fs.readFileSync(f) }); });
  await ctx.addInitScript(() => { Element.prototype.requestFullscreen = function () { return Promise.reject(new Error('x')); }; Object.defineProperty(window, 'orientation', { get: () => window.__ori ?? -90, configurable: true });
    try { const d = JSON.parse(localStorage.getItem('qz_save') || '{}'); d.created = 1; d.matches = 5; d.level = 10; d.tut = 1; d.iosTip = 1; localStorage.setItem('qz_save', JSON.stringify(d)); } catch (e) {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost/', { waitUntil: 'load' }); await p.waitForTimeout(2500);
  await p.evaluate(() => { try { acctHome(); } catch (e) {} try { TUT.on = 0; TUT.start = () => {}; } catch (e) {} hurtPlayer = () => {}; S.mi = 0; startGame(); skipPause(); });
  await p.waitForTimeout(800);
  const before = await p.evaluate(() => ({ vw: VW, rot: ROTL.a }));
  // celular vai para em pé
  await p.evaluate(() => { window.__ori = 0; });
  await p.setViewportSize({ width: 414, height: 896 });
  await p.waitForTimeout(1200);
  const st = await p.evaluate(() => { const r = $('stickL').getBoundingClientRect(); return { rot: ROTL.a, cls: document.body.className, vw: VW, cvw: cv.width, rotateOverlay: getComputedStyle($('rotate')).display, stick: [r.left + r.width / 2, r.top + r.height / 2], mode: S.mode, x0: S.player.x }; });
  // arrasta o stick esquerdo 40 px para a "direita do jogo": com -90 a direita do jogo é para CIMA na tela
  const cdp = await ctx.newCDPSession(p), [sx, sy] = st.stick, dir = st.rot === -90 ? [0, -40] : [0, 40];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy, id: 1 }] });
  for (let k = 1; k <= 8; k++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx + dir[0] * k / 8, y: sy + dir[1] * k / 8, id: 1 }] }); await p.waitForTimeout(30); }
  const mv = await p.evaluate(() => S.input.move);
  await p.waitForTimeout(700);
  const x1 = await p.evaluate(() => S.player.x);
  if (OUT) await p.screenshot({ path: OUT });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  // volta a deitar
  await p.evaluate(() => { window.__ori = -90; }); await p.setViewportSize({ width: 896, height: 414 }); await p.waitForTimeout(800);
  const after = await p.evaluate(() => ({ rot: ROTL.a, vw: VW, cls: document.body.className }));
  console.log(JSON.stringify({ before, st, move: mv, walked: +(x1 - st.x0).toFixed(1), after, errs }, null, 1));
  await b.close();
})();
