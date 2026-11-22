// v29.1: teto de dinheiro (35 mil + Cofre do barraco), nó novo na árvore e munição diamante na mesa.
// Uso: node tests/integration/economia/v29_1_teto_cofre.js <pasta-de-prints>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../../..'), OUT = process.argv[2] || '.';
const route = (p) => p.route('http://localhost/**', (r) => {
  let u = new URL(r.request().url()).pathname; if (u === '/') u = '/index.html';
  const f = path.join(ROOT, u);
  if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
  r.fulfill({ body: fs.readFileSync(f), contentType: u.endsWith('.html') ? 'text/html' : u.endsWith('.js') ? 'text/javascript' : undefined });
});
(async () => {
  const b = await chromium.launch();
  const fails = [], ok = (c, m) => { if (!c) fails.push(m); console.log((c ? 'ok   ' : 'FALHA') + ' ' + m); };
  for (const vp of [{ n: 'pc', width: 1280, height: 640 }, { n: 'celular', width: 844, height: 390 }]) {
    const p = await b.newPage({ viewport: vp, deviceScaleFactor: 2 });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await route(p);
    await p.goto('http://localhost/');
    await p.waitForFunction(() => typeof SKILLS !== 'undefined' && typeof ECO !== 'undefined', null, { timeout: 60000 });
    await p.waitForTimeout(1200);
    // ---- árvore: servidor simulado com o custo do cofre ----
    const tree = async (lvl, best, skills, file) => {
      await p.evaluate(([lvl, best, skills]) => {
        Object.defineProperty(ECO, 'ready', { get: () => true, configurable: true });
        ECO.chips = 40; ECO.data = ECO.data || {}; ECO.data.costs = Object.assign({}, ECO.data.costs, { 'folego:1': 2, 'labia:1': 2, 'labia:2': 3, 'labia:3': 4, 'mira:1': 2, 'chute:1': 2, 'segunda:1': 6, 'cofre:1': 8, 'cofre:2': 12, 'cofre:3': 18 });
        ECO.cost = (id, l) => ECO.data.costs[id + ':' + l] || 1;
        SAVE.d.level = lvl; SAVE.d.best = best; SAVE.d.skills = skills; SK_SEL = 'cofre';
        document.querySelectorAll('.lkPanel,#creator').forEach(() => 0);
        const R = document.createElement('div'); R.id = 'skTest'; R.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0c0a10;display:flex;padding:10px';
        document.getElementById('skTest') && document.getElementById('skTest').remove();
        document.body.append(R);
        const draw = () => { R.innerHTML = ''; renderSkillTree(R, draw); }; draw();
      }, [lvl, best, skills]);
      await p.waitForTimeout(300);
      await p.screenshot({ path: path.join(OUT, `${vp.n}-${file}.png`) });
      return p.evaluate(() => ({ st: skillState('cofre'), btn: document.querySelector('.skBuy').textContent, req: [...document.querySelectorAll('.skReq li')].map((l) => l.className + ':' + l.textContent), fx: document.querySelector('.skFx').textContent, desc: document.querySelector('.skDesc').textContent }));
    };
    let r = await tree(20, { lapa: 12 }, { grana: 3, labia: 1 }, 'cofre-trancado');
    ok(r.st === 'lvl' && r.req.length === 3 && r.req.every((x) => !x.startsWith('ok')), vp.n + ' cofre trancado com 3 requisitos ' + JSON.stringify(r.req));
    ok(/\+15% \/ \+25% \/ \+50%/.test(r.desc), vp.n + ' descrição ' + r.desc);
    r = await tree(30, { lapa: 20 }, { grana: 3, labia: 3 }, 'cofre-liberado');
    ok(r.st === 'buy' && /MELHORAR.*8/.test(r.btn), vp.n + ' cofre compra por 8 chips: ' + r.btn);
    ok(/R\$35\.000.*R\$40\.250/.test(r.fx), vp.n + ' agora › próximo ' + r.fx);
    r = await tree(30, { lapa: 19 }, { grana: 3, labia: 3 }, 'cofre-falta-onda');
    ok(r.st === 'wave' && /ONDA 20/.test(r.btn), vp.n + ' falta onda ' + r.btn);
    await p.evaluate(() => document.getElementById('skTest').remove());
    // ---- partida ----
    await p.evaluate(() => { SAVE.d.skills = {}; SAVE.d.tutDone = 1; startGame(); });
    await p.waitForFunction(() => S.player && S.zs, null, { timeout: 20000 });
    await p.waitForTimeout(800);
    const cap = await p.evaluate(() => {
      const o = {}; const pl = S.player;
      pl.cash = 0; gainCash(50000); o.c0 = pl.cash;
      for (const [lv, want] of [[1, 40250], [2, 43750], [3, 52500]]) { SAVE.d.skills = { cofre: lv }; gainCash(99999); o['c' + lv] = pl.cash; o['w' + lv] = want; }
      SAVE.d.skills = {}; pl.cash = 35000; UI.hud(); o.max = document.getElementById('cash').classList.contains('max');
      return o;
    });
    ok(cap.c0 === 35000, vp.n + ' teto base 35000: ' + cap.c0);
    ok(cap.c1 === 40250 && cap.c2 === 43750 && cap.c3 === 52500, vp.n + ' teto com cofre ' + [cap.c1, cap.c2, cap.c3]);
    ok(cap.max, vp.n + ' HUD marca máximo');
    // ---- mesa de upgrade com arma diamante ----
    const am = await p.evaluate(() => {
      const pl = S.player, o = {};
      giveWeapon('m4', 'diamond'); pl.cur = pl.ws.findIndex((w) => w && w.id === 'm4');
      const w = curW(); o.id = w.id; o.rk = w.rk;
      pl.x = papX() + 28; pl.y = M().floors ? pl.y : pl.y;
      w.mag = 3; w.res = 10; pl.cash = 30000;
      o.full0 = papAmmoFull(w); o.price = papAmmoPrice(w);
      o.info = actInfo({ k: 'pap' }); o.hint = (typeof actHint === 'function') ? '' : '';
      doInteract({ k: 'pap' }, 'edge', 0.016);
      const st = wst(w); o.after = [w.mag === st.mag, w.res === st.res, pl.cash]; o.price2 = papAmmoPrice(w);
      doInteract({ k: 'pap' }, 'edge', 0.016); o.cash2 = pl.cash;
      o.barrett = papAmmoPrice({ id: 'barrett' }); o.pistol = papAmmoPrice({ id: 'pistol' }); o.ray = papAmmoPrice({ id: 'ray' });
      // dourada continua indo para diamante
      giveWeapon('aug', 'gold'); pl.cur = pl.ws.findIndex((x) => x && x.id === 'aug'); pl.cash = 30000;
      o.goldInfo = actInfo({ k: 'pap' }).main; doInteract({ k: 'pap' }, 'edge', 0.016); o.goldRk = curW().rk; o.goldCash = pl.cash;
      giveWeapon('m4', 'diamond'); pl.cur = pl.ws.findIndex((x) => x && x.id === 'm4'); curW().res = 0;
      return o;
    });
    ok(am.rk === 'diamond' && am.price === 4950 && am.info.main === 'RECARREGAR M4A1', vp.n + ' mesa oferece munição M4 por 4950 ' + JSON.stringify(am.info));
    ok(am.after[0] && am.after[1] && am.after[2] === 30000 - 4950, vp.n + ' recarregou e cobrou ' + am.after);
    ok(am.price2 === 6450 && am.cash2 === 30000 - 4950, vp.n + ' segunda vez mais cara (6450) e cheia não cobra ' + am.cash2);
    ok(am.barrett === 10400 && am.pistol === 3000 && am.ray === 8000, vp.n + ' preços por arma ' + [am.barrett, am.pistol, am.ray]);
    ok(am.goldInfo === 'EVOLUIR AUG' && am.goldRk === 'diamond' && am.goldCash === 12000, vp.n + ' dourada ainda evolui ' + [am.goldInfo, am.goldRk, am.goldCash]);
    // print perto da mesa
    await p.evaluate(() => { if (!S.stall) S.stall = pickStall(CONFIG.shop.firstWave); S.stall.open = 1; const pl = S.player; pl.x = papX() + 28; pl.y = G0; pl.vx = 0; S.zs.length = 0; });
    await p.waitForTimeout(900);
    console.log('perto:', await p.evaluate(() => JSON.stringify([S.near && S.near.k, papX(), !!S.stall, S.player.x, S.player.y, S.mode, S.paused])));
    await p.screenshot({ path: path.join(OUT, `${vp.n}-mesa-municao-diamante.png`) });
    ok(!errs.length, vp.n + ' sem erro de página ' + errs.slice(0, 3).join(' | '));
    await p.close();
  }
  await b.close();
  console.log(fails.length ? fails.length + ' FALHAS' : 'TUDO OK');
  process.exit(fails.length ? 1 : 0);
})();
