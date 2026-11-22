// Teste do tiro na cabeça: para cada tipo de zumbi, cada animação (menos Dead) e cada quadro, virado para o jogador e de
// costas, atira de verdade (fire()) no centro da cabeça desenhada e depois no pé. Conta quantos tiros na cabeça viraram
// headshot e quantos no pé ficaram no corpo. Mira compensada só para o cano e o coice do próprio jogo.
// Uso: node tools/hitbox/testar.js [index.html]   (sai com erro se a cabeça pegar menos de 95%)
// Nada sai da máquina: o jogo é servido por page.route em http://localhost/.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const FILE = path.resolve(process.argv[2] || path.join(__dirname, '../../index.html')), ROOT = path.resolve(__dirname, '../..');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.route('**/*', (r) => {
    const u = new URL(r.request().url());
    if (u.hostname !== 'localhost') return r.abort();
    const p = decodeURIComponent(u.pathname);
    if (p === '/' || p === '/index.html') return r.fulfill({ body: fs.readFileSync(FILE), contentType: 'text/html' });
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ body: fs.readFileSync(f) });
  });
  await ctx.addInitScript(() => {
    let s = 1234567; Math.random = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x80000000; };
    try { const d = JSON.parse(localStorage.getItem('qz_save') || '{}'); d.created = 1; d.matches = 5; d.level = 10; d.tut = 1; localStorage.setItem('qz_save', JSON.stringify(d)); } catch (e) {}
    try { navigator.serviceWorker && (navigator.serviceWorker.register = () => Promise.reject()); } catch (e) {}
  });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.goto('http://localhost/', { waitUntil: 'load' });
  await p.waitForTimeout(3000);
  const r = await p.evaluate(() => {
    try { SAVE.unlink && SAVE.unlink(); } catch (e) {}
    try { acctHome(); } catch (e) {}
    try { TUT.on = 0; TUT.start = () => {}; } catch (e) {}
    S.mi = 0; startGame(); skipPause(); S.toSpawn = 0; S.zs.length = 0;
    const P = S.player, w = P.ws[P.cur], W = WEAP[w.id];
    W.spread = 0; W.pellets = 1;
    let rec = [];
    const H = hurtZ; hurtZ = (z, dmg, head) => { rec.push(head); };
    const ids = {};
    for (const v in ZV) if (!ids[ZV[v].base] && !ZV[v].scale && !ZV[v].acc) ids[ZV[v].base] = v;
    for (const v in ZV) if (!ids[ZV[v].base]) ids[ZV[v].base] = v;
    const shoot = (tx, ty) => {
      P.face = 1; P.kick = GUNKICK[W.kind] || 2; P.recA = 0;
      for (let k = 0; k < 12; k++) { const g = gunPoints(P); P.aim += Math.atan2(ty - g.muz[1], tx - g.muz[0]) - g.a; }
      P.fireT = P.relT = P.melT = P.swapT = P.butT = P.kickT = 0; w.mag = 5; rec = [];
      fire();
      return rec.length ? (rec[0] ? 'H' : 'B') : '-';
    };
    const res = {};
    for (const t in ids) {
      const z = spawnZombie({ x: P.x + 110, y: P.y, b: 0 }, 'in', ids[t]);
      S.zs.length = 0; S.zs.push(z);
      Object.assign(z, { x: P.x + 110, y: P.y, emerge: 0, duck: 0, armor: 0 });
      if (t[1] === 'k') Object.assign(z, { type: t, sc: 1, h: ZT[t].h, headH: ZT[t].head, w: ZT[t].w * 1.35 });
      const R = res[t] = { cab: 0, n: 0, pe: 0, falhas: [] };
      for (const k in SHEETS) {
        if (k.split('_')[0] !== t || k.endsWith('_Dead')) continue;
        const anim = k.slice(t.length + 1), s = SHEETS[k];
        for (let f = 0; f < s.n; f++) for (const face of [-1, 1]) {
          z.anim = anim; z.face = face;
          z.at = anim === 'Hurt' || anim === 'Jump' ? f : f / (s.sub || 1) + 1e-3;
          const [kk, fr] = zFrame(z);
          if (kk !== k || fr !== f) continue;
          const hb = zHead(z), lado = face < 0 ? 'frente' : 'costas';
          const a = shoot((hb[0] + hb[2]) / 2, (hb[1] + hb[3]) / 2);
          R.n++;
          if (a === 'H') R.cab++; else R.falhas.push(`${anim}:${f}:${lado}:${a}`);
          // pé: só no que fica em pé (no rastejante e no cachorro a cabeça vem antes do pé na linha do tiro)
          if (!ZT[t].low) { if (shoot(z.x, z.y - 6 * (z.sc || 1)) === 'B') R.pe++; else R.falhas.push(`${anim}:${f}:${lado}:pé`); }
          else R.pe++;
        }
      }
    }
    hurtZ = H;
    return res;
  });
  let c = 0, n = 0, pe = 0;
  for (const t in r) {
    c += r[t].cab; n += r[t].n; pe += r[t].pe;
    console.log(t.padEnd(4), 'cabeça', `${r[t].cab}/${r[t].n}`.padEnd(8), 'pé no corpo', `${r[t].pe}/${r[t].n}`.padEnd(8), r[t].falhas.slice(0, 6).join(' '));
  }
  console.log(`total: cabeça ${c}/${n} (${(100 * c / n).toFixed(1)}%), pé no corpo ${pe}/${n}`, errs.length ? 'ERROS: ' + errs.join(' | ') : '');
  await b.close();
  if (errs.length || c / n < 0.95 || pe < n) process.exit(1);
})();
