// Bench da horda: roda uma partida com muitos zumbis num celular simulado (CPU lenta) e mede o tempo de cada quadro.
// Uso: node tools/perf/bench-horda.js [index.html] [--cpu 4] [--q alta|media|baixa] [--secs 20] [--prof saida.cpuprofile] [--out res.json]
// Nada sai da máquina: o jogo é servido por page.route em http://localhost/ (a trava de domínio libera localhost).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const FILE = path.resolve(args[0] && !args[0].startsWith('--') ? args[0] : path.join(__dirname, '../../index.html'));
const ROOT = path.resolve(__dirname, '../..');
const ALIVE = +opt('alive', 0), COUNT = args.includes('--count'), CPU = +opt('cpu', 4), Q = opt('q', 'media'), SECS = +opt('secs', 20), PROF = opt('prof', ''), OUT = opt('out', ''), WARM = +opt('warm', 8);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.mp3': 'audio/mpeg', '.webmanifest': 'application/json', '.json': 'application/json', '.webp': 'image/webp' };
(async () => {
  const b = await chromium.launch({ args: process.env.GPU ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--enable-accelerated-2d-canvas'] : [] });
  // iPhone 11 deitado: 896x414 CSS px, DPR 2, toque
  const ctx = await b.newContext({ viewport: { width: 896, height: 414 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  await ctx.route('**/*', async (r) => {
    const u = new URL(r.request().url());
    if (u.hostname !== 'localhost') return r.abort();
    let p = decodeURIComponent(u.pathname); if (p === '/' || p === '/index.html') return r.fulfill({ body: fs.readFileSync(FILE), contentType: 'text/html' });
    const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ body: fs.readFileSync(f), contentType: TYPES[path.extname(f)] || 'application/octet-stream' });
  });
  await ctx.addInitScript(() => {
    // aleatório com semente: as duas versões veem a mesma horda
    let s = 1234567; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; };
    try { const d = JSON.parse(localStorage.getItem('qz_save') || '{}'); d.created = 1; d.matches = 5; d.level = 10; d.tut = 1; localStorage.setItem('qz_save', JSON.stringify(d)); } catch (e) {}
    try { navigator.serviceWorker && (navigator.serviceWorker.register = () => Promise.reject()); } catch (e) {}
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost/', { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  await p.evaluate(([q, A, C, opt]) => {
    try { SAVE.unlink && SAVE.unlink(); } catch (e) {}
    try { acctHome(); } catch (e) {}
    try { TUT.on = 0; TUT.start = () => {}; } catch (e) {}
    hurtPlayer = () => {};
    S.mi = 0; startGame(); setQuality(q); skipPause();
    let n = +opt.round || 16; while (bossLevel(n) || n % CONFIG.waves.specialEvery === 0) n++;
    try { giveWeapon(opt.gun || 'm249', 'gold', 0); } catch (e) { console.log('gun', e.message); }
    startRound(n); S.toSpawn = 1e6; S.spawnT = 0;
    // atira sempre no zumbi vivo mais perto e derruba um a cada 0,45 s (cadáveres, sangue, partículas como numa horda de verdade)
    const W = window.__B = { up: [], rd: [], hud: [], fr: [], alive: [], parts: [], kt: 0, rec: 0, lastTs: 0 };
    const U = update, R = render, H = UI.hud.bind(UI);
    update = function (dt) { const t0 = performance.now(); const p = S.player;
      if (p) { let best = null, bd = 1e9; for (const z of S.zs) if (z.state !== 'dead') { const d = Math.abs(z.x - p.x); if (d < bd) { bd = d; best = z; } }
        if (best) { p.aim = Math.atan2(best.y - best.h / 2 - (p.y - 30), best.x - p.x); S.input.aimMag = 1; S.input.fire = true; } p.hp = p.maxHp; const w = p.ws[p.cur]; if (w) w.res = 999; }
      W.kt += dt; if (W.kt > 0.45) { W.kt = 0; const L = S.zs.filter((z) => z.state === 'in' && z.emerge <= 0); if (L.length > 6) killZ(L[0], true, 'gun'); }
      U(dt); if (W.rec) W.up.push(performance.now() - t0); };
    render = function () { const t0 = performance.now(); R(); if (W.rec) { W.rd.push(performance.now() - t0); W.alive.push(S.zs.filter((z) => z.state !== 'dead').length); W.parts.push(S.parts.length); } };
    UI.hud = function () { const t0 = performance.now(); H(); if (W.rec) W.hud.push(performance.now() - t0); };
    W.tiers = []; setInterval(() => W.tiers.push(QUAL.tier + (QUAL.fps30 ? 'L' : '')), 1000);
    const tick = (ts) => { if (W.rec && W.lastTs) W.fr.push(ts - W.lastTs); W.lastTs = ts; requestAnimationFrame(tick); }; requestAnimationFrame(tick);
    if (A) maxAliveNow = () => A;
    // --off a,b: desliga partes do quadro para ver quanto cada uma custa (só para investigar)
    for (const k of (opt.off || '').split(',').filter(Boolean)) {
      if (k === 'ground') FXV.ground = () => {}; else if (k === 'post') FXV.post = () => {}; else if (k === 'sky') FXV.sky = () => {};
      else if (k === 'scn') SCN.draw = () => {}; else if (k === 'dect') { const d = drawTiles; drawTiles = (c, T2, x) => { if (T2 !== LAYERS[S.mi].decT) d(c, T2, x); }; }
      else if (k === 'zs') { const d = drawZ; drawZ = () => {}; } else window[k] = () => {};
    }
    if (C) { const P = CanvasRenderingContext2D.prototype; W.calls = {}; W.cf = 0;
      for (const k of ['drawImage', 'fillRect', 'save', 'restore', 'getImageData', 'putImageData', 'createLinearGradient', 'createRadialGradient', 'fill', 'clip', 'fillText', 'measureText']) { const o = P[k]; P[k] = function () { if (W.rec) W.calls[k] = (W.calls[k] || 0) + 1; return o.apply(this, arguments); }; }
      // "snapshot": desenhar um canvas que mudou desde a última vez que serviu de fonte. No Safari (canvas na GPU) cada um
      // força descarregar e copiar aquele canvas; é o custo que mais cresce por zumbi no iPhone.
      const ver = new WeakMap(), used = new WeakMap(), bump = (c) => ver.set(c, (ver.get(c) || 0) + 1);
      for (const k of ['fillRect', 'clearRect', 'fill', 'fillText', 'putImageData', 'stroke']) { const o = P[k]; P[k] = function () { bump(this.canvas); return o.apply(this, arguments); }; }
      const di = P.drawImage; P.drawImage = function (src) { bump(this.canvas); if (W.rec && src instanceof HTMLCanvasElement) { const v = ver.get(src) || 0; if (used.get(src) !== v) { used.set(src, v); W.calls.snapshot = (W.calls.snapshot || 0) + 1; W.calls.snapPx = (W.calls.snapPx || 0) + src.width * src.height; } } return di.apply(this, arguments); };
      for (const k of ['filter', 'globalCompositeOperation', 'shadowBlur']) { const d = Object.getOwnPropertyDescriptor(P, k); Object.defineProperty(P, k, { get: d.get, set(v) { if (W.rec) W.calls['set.' + k] = (W.calls['set.' + k] || 0) + 1; d.set.call(this, v); } }); }
      const mk = document.createElement.bind(document); document.createElement = function (t) { if (W.rec && String(t).toLowerCase() === 'canvas') W.calls.newCanvas = (W.calls.newCanvas || 0) + 1; return mk.apply(document, arguments); }; }
  }, [Q, ALIVE, COUNT, { gun: opt('gun', 'm249'), round: opt('round', 16), off: opt('off', '') }]);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await p.waitForTimeout(WARM * 1000);
  if (PROF) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start'); }
  await p.evaluate(() => { __B.rec = 1; });
  await p.waitForTimeout(SECS * 1000);
  const res = await p.evaluate(() => {
    __B.rec = 0;
    const st = (a) => { const s = [...a].sort((x, y) => x - y), m = s.reduce((x, y) => x + y, 0) / (s.length || 1); return { n: s.length, med: +s[s.length >> 1].toFixed(2), mean: +m.toFixed(2), p95: +s[Math.floor(s.length * 0.95)].toFixed(2), max: +s[s.length - 1].toFixed(2) }; };
    const B = __B, tot = B.up.map((u, i) => u + (B.rd[i] || 0) + (B.hud[i] || 0));
    return { update: st(B.up), render: st(B.rd), hud: st(B.hud), work: st(tot), frame: st(B.fr), fps: +(1000 / (B.fr.reduce((a, b) => a + b, 0) / B.fr.length)).toFixed(1), aliveAvg: +(B.alive.reduce((a, b) => a + b, 0) / B.alive.length).toFixed(1), partsAvg: Math.round(B.parts.reduce((a, b) => a + b, 0) / B.parts.length), drops: DRP.filter((d) => d.on).length, gun: S.player.ws.map((w) => w && w.id), corpses: S.zs.filter((z) => z.state === 'dead').length, tier: QUAL.tier, fps30: QUAL.fps30, gameFps: +FPSW.ema.toFixed(1), tiers: B.tiers.join(''), round: S.round, kills: S.stats.kills, perFrame: B.calls ? Object.fromEntries(Object.entries(B.calls).map(([k, v]) => [k, Math.round(v / B.rd.length)])) : undefined };
  });
  if (opt('shot', '')) { await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }); await p.screenshot({ path: opt('shot', '') }); }
  if (PROF) { const { profile } = await cdp.send('Profiler.stop'); fs.writeFileSync(PROF, JSON.stringify(profile)); }
  res.errors = errs.slice(0, 5); res.cpu = CPU; res.q = Q; res.file = path.basename(FILE);
  console.log(JSON.stringify(res, null, 1));
  if (OUT) fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
  await b.close();
})();
