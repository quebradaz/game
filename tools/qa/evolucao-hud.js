// QA da v29.12: evolução de arma na LOJA DA QUEBRADA (R$ 20 mil por nível) e HUD da partida.
// Serve o index.html em http://localhost/ (trava de domínio). Uso: node tools/qa/evolucao-hud.js <pasta-saida> [index.html] [--so-prints]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || 'out', HTML = process.argv[3] || 'index.html', ONLY = process.argv.includes('--so-prints');
fs.mkdirSync(OUT, { recursive: true });
const VPS = { pc: { width: 1366, height: 768 }, celular: { width: 844, height: 390 }, 'celular-pequeno': { width: 667, height: 375 } };
const html = fs.readFileSync(HTML), ROOT = path.dirname(path.resolve(HTML));
(async () => {
  const b = await chromium.launch();
  let bad = 0;
  const ok = (cond, msg) => { console.log((cond ? 'ok  ' : 'FALHOU ') + msg); if (!cond) bad++; };
  for (const [vp, size] of Object.entries(VPS)) {
    const mob = vp !== 'pc';
    const ctx = await b.newContext({ viewport: size, deviceScaleFactor: 2, hasTouch: mob, isMobile: mob });
    await ctx.addInitScript(() => {
      try {
        const d = JSON.parse(localStorage.getItem('qz_save') || '{}');
        Object.assign(d, { created: 1, matches: 5, level: 10, tut: 1 });
        localStorage.setItem('qz_save', JSON.stringify(d));
      } catch (e) {}
      try { navigator.serviceWorker && (navigator.serviceWorker.register = () => Promise.reject()); } catch (e) {}
    });
    await ctx.route('http://localhost/**', (r) => { const u = new URL(r.request().url()); if (u.pathname === '/' || u.pathname === '/index.html') return r.fulfill({ body: html, contentType: 'text/html' }); const f = path.join(ROOT, decodeURIComponent(u.pathname)); return fs.existsSync(f) ? r.fulfill({ path: f }) : r.fulfill({ status: 404 }); });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => { bad++; console.log(vp, 'ERR', e.message); });
    await p.goto('http://localhost/', { waitUntil: 'load' });
    await p.waitForTimeout(2500);
    await p.evaluate(() => { try { TUT.on = 0; TUT.start = () => {}; } catch (e) {} startGame(); });
    await p.waitForFunction(() => S.mode === 'play', null, { timeout: 15000 });
    await p.waitForTimeout(800);
    await p.evaluate(() => { hurtPlayer = ((h) => function (d, kb) { if (window.__god) return; return h(d, kb); })(hurtPlayer); window.__god = 1; skipPause(); startRound(6); S.spawnT = 0; S.player.cash = 24350; S.player.hp = Math.round(S.player.maxHp * 0.62); S.player.armor = 40; S.player.maxArmor = 100; giveAndDrop('m4', 'purple'); });
    await p.waitForTimeout(6000);
    await p.screenshot({ path: `${OUT}/${vp}-1-hud.png` });
    if (ONLY) { await ctx.close(); continue; }
    // HUD: vida em 62%, recarregando, pouca bala na secundária
    await p.evaluate(() => { const P = S.player; P.hp = Math.round(P.maxHp * 0.62); P.ws[1].mag = 1; P.cur = 0; P.ws[0].mag = 3; reload(); });
    await p.waitForTimeout(350);
    await p.screenshot({ path: `${OUT}/${vp}-2-hud-recarga.png` });
    const hud = await p.evaluate(() => ({ sk: $('slot0').querySelector('.sk').textContent, hp: $('hpTxt').textContent, cash: $('cashV').textContent, cashOk: $('cashV').textContent === fmtR(S.player.cash) && /\./.test($('cashV').textContent), rel: $('slot0').classList.contains('rel'), nt: getComputedStyle($('ntPop')).visibility }));
    console.log(vp, JSON.stringify(hud));
    ok(/M4/.test(hud.sk), vp + ' slot mostra o nome da arma');
    ok(/^\d+\/150$/.test(hud.hp), vp + ' vida com máximo');
    ok(hud.cashOk, vp + ' dinheiro com ponto de milhar');
    ok(hud.rel, vp + ' barra de recarga no slot');
    ok(hud.nt === 'hidden', vp + ' aviso de notificação escondido de verdade');
    // loja: evoluir a M4 roxa
    await p.evaluate(() => { const P = S.player; P.relT = 0; P.cash = 34e3; S.buyPhase.active = true; S.shopOpen = true; UI.shopOpen(); });
    await p.waitForFunction(() => $('shutter').classList.contains('hidden') || getComputedStyle($('shutter')).display === 'none', null, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(600);
    await p.evaluate(() => { UI.shopTab = 'primary'; UI.shopSel = shopItems(WEAP.m4.cat).find((x) => x.id === 'm4'); UI.shopTab = WEAP.m4.cat; UI.shopRender(); });
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${vp}-3-loja-evoluir.png` });
    const d0 = await p.evaluate(() => wst(S.player.ws[0]).dmg);
    // clique e conferência no mesmo quadro: o dinheiro do chão não entra na conta
    const e1 = await p.evaluate(() => { S.player.cash = 34e3; $('shEvoBtn').click(); return { ev: S.player.ws[0].ev, cash: S.player.cash, dmg: wst(S.player.ws[0]).dmg }; });
    console.log(vp, JSON.stringify(e1), d0);
    ok(e1.ev === 1 && e1.cash === 14e3 && Math.abs(e1.dmg / d0 - 1.2) < 1e-6, vp + ' evoluir cobra R$ 20 mil e dá +20% de dano');
    ok(await p.evaluate(() => { S.player.cash = 14e3; UI.shopRender(); $('shEvoBtn').click(); return S.player.ws[0].ev === 1 && S.player.cash === 14e3 && $('shEvoBtn').classList.contains('poor'); }), vp + ' sem dinheiro não evolui');
    await p.evaluate(() => { S.player.cash = 35e3; });
    await p.click('#shEvoBtn');
    await p.waitForTimeout(200);
    await p.evaluate(() => { S.player.cash = 35e3; UI.shopRender(); });
    await p.waitForTimeout(150);
    await p.click('#shEvoBtn');
    await p.waitForTimeout(250);
    await p.screenshot({ path: `${OUT}/${vp}-4-loja-maximo.png` });
    const e3 = await p.evaluate(() => { const w = S.player.ws[0], s = wst(w), b = wst({ id: w.id, rk: w.rk }); return { ev: w.ev, k: s.dmg / b.dmg, mag: s.mag / b.mag, pierce: s.pierce - b.pierce, dis: $('shEvoBtn').disabled }; });
    console.log(vp, JSON.stringify(e3));
    ok(e3.ev === 3 && Math.abs(e3.k - 1.6) < 1e-6 && e3.pierce === 1 && e3.dis, vp + ' nível 3 é o máximo (+60% dano, +1 perfura)');
    await p.evaluate(() => { S.shopOpen = false; $('shop').classList.add('hidden'); UI.last = {}; });
    // largar e pegar de volta: a evolução vai junto
    const dr = await p.evaluate(() => { giveAndDrop('scar', 'blue'); const it = S.items.find((q) => q.id === 'm4'); it.np = 0; const ev = it.ev; takeItem(it); return { drop: ev, back: (S.player.ws.find((w) => w && w.id === 'm4') || {}).ev }; });
    console.log(vp, JSON.stringify(dr));
    ok(dr.drop === 3 && dr.back === 3, vp + ' arma largada e pegada mantém a evolução');
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/${vp}-5-hud-estrelas.png` });
    await ctx.close();
  }
  await b.close();
  console.log(bad ? bad + ' FALHA(S)' : 'TUDO OK');
  process.exit(bad ? 1 : 0);
})();
