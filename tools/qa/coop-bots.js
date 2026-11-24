// QA do co-op etapa 1 (v29.9): tela do mapa com zoom/lore/parceiros, partida com 2 bots, cair e levantar.
// Serve o index.html em http://localhost/ (trava de domínio). Uso: node tools/qa/coop-bots.js <pasta-saida> [index.html]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || 'out', HTML = process.argv[3] || 'index.html';
fs.mkdirSync(OUT, { recursive: true });
const VPS = { pc: { width: 1366, height: 768 }, celular: { width: 844, height: 390 } };
const html = fs.readFileSync(HTML), ROOT = path.dirname(path.resolve(HTML));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await chromium.launch();
  let bad = 0;
  const ok = (cond, msg) => { console.log((cond ? 'ok  ' : 'FALHOU ') + msg); if (!cond) bad++; };
  for (const [vp, size] of Object.entries(VPS)) {
    const ctx = await b.newContext({ viewport: size, deviceScaleFactor: 2, hasTouch: vp !== 'pc', isMobile: vp !== 'pc' });
    await ctx.addInitScript(() => {
      try {
        const d = JSON.parse(localStorage.getItem('qz_save') || '{}');
        Object.assign(d, { created: 1, matches: 5, level: 10, tut: 1, won: { adega: 1, lava: 1, quadra: 1, laje: 1, cristo: 1, copa: 1 } });
        localStorage.setItem('qz_save', JSON.stringify(d));
      } catch (e) {}
      try { navigator.serviceWorker && (navigator.serviceWorker.register = () => Promise.reject()); } catch (e) {}
    });
    await ctx.route('http://localhost/**', (r) => { const u = new URL(r.request().url()); if (u.pathname === '/' || u.pathname === '/index.html') return r.fulfill({ body: html, contentType: 'text/html' }); const f = path.join(ROOT, decodeURIComponent(u.pathname)); return fs.existsSync(f) ? r.fulfill({ path: f }) : r.fulfill({ status: 404 }); });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => { bad++; console.log(vp, 'ERR', e.message); });
    await p.goto('http://localhost/', { waitUntil: 'load' });
    await p.waitForTimeout(2500);
    await p.evaluate(() => { try { SAVE.unlink && SAVE.unlink(); } catch (e) {} try { acctHome(); } catch (e) {} try { TUT.on = 0; TUT.start = () => {}; } catch (e) {} buildCampaign(); UI.show('campaign'); });
    await p.waitForTimeout(400);
    await p.click('#cpList .cpCard');
    await p.waitForTimeout(700);
    // card da Lapa (último)
    await p.evaluate(() => { const c = [...document.querySelectorAll('#mapCards .card')].pop(); c.scrollIntoView(); });
    await p.waitForTimeout(500);
    await p.evaluate(() => { [...document.querySelectorAll('#mapCards .card')].pop().click(); });
    await p.waitForTimeout(250);
    await p.screenshot({ path: `${OUT}/${vp}-1-zoom-meio.png` });
    await p.waitForTimeout(900);
    await p.click('#mzBots button[data-n="2"]');
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${vp}-2-mapa-lore-bots.png` });
    const mz = await p.evaluate(() => ({ name: $('mzName').textContent, lore: $('mzLore').textContent.length, want: COOP.want(), diff: $('mzDiff').textContent, over: (() => { const r = document.querySelector('#mapZoom .mzPanel').getBoundingClientRect(); return r.bottom <= innerHeight + 1 && r.top >= -1; })() }));
    console.log(vp, JSON.stringify(mz));
    ok(mz.want === 2 && mz.lore > 60 && mz.over, vp + ' tela do mapa');
    // VOLTAR fecha, BORA abre de novo pelo rodapé
    await p.click('#mzBack');
    await p.waitForTimeout(200);
    ok(await p.evaluate(() => $('mapZoom').classList.contains('hidden')), vp + ' voltar fecha o zoom');
    await p.click('#bStart');
    await p.waitForTimeout(900);
    await p.click('#mzGo');
    await p.waitForFunction(() => S.mode === 'play', null, { timeout: 15000 });
    await p.waitForTimeout(800);
    const st = await p.evaluate(() => ({ n: S.players.length, kinds: S.players.map((a) => a.kind + ':' + a.name), period: S.period }));
    console.log(vp, JSON.stringify(st));
    ok(st.n === 3, vp + ' partida com 3 atores');
    // começa a onda 6 já com horda
    await p.evaluate(() => { hurtPlayer = ((h) => function (d, kb) { if (window.__god) return; return h(d, kb); })(hurtPlayer); window.__god = 1; skipPause(); startRound(6); S.spawnT = 0; });
    await p.waitForTimeout(9000);
    await p.screenshot({ path: `${OUT}/${vp}-3-partida-bots.png` });
    const fight = await p.evaluate(() => ({ botKills: S.stats.botKills || 0, kills: S.stats.kills, pos: S.bots.map((b) => Math.round(b.x - S.player.x)), alive: S.zs.filter((z) => z.state !== 'dead').length }));
    console.log(vp, JSON.stringify(fight));
    ok(fight.pos.every((d) => Math.abs(d) < 200), vp + ' bots seguem o jogador');
    // andar pra direita: bots vêm junto
    await p.evaluate(() => { S.input.move = 1; });
    await p.waitForTimeout(2500);
    await p.evaluate(() => { S.input.move = 0; });
    await p.waitForTimeout(1500);
    const fol = await p.evaluate(() => S.bots.map((b) => Math.round(b.x - S.player.x)));
    console.log(vp, 'depois de andar', JSON.stringify(fol));
    ok(fol.every((d) => Math.abs(d) < 200), vp + ' bots acompanham ao andar');
    // cair: zumbis param de mirar em você, bot vem levantar
    await p.evaluate(() => { window.__god = 0; S.player.iT = 0; S.player.revive = 0; S.secondUsed = true; S.reviveUsed = true; hurtPlayer(9999); window.__god = 1; for (const b of S.bots) b.iT = 99; });
    await p.waitForTimeout(600);
    const dn = await p.evaluate(() => ({ down: S.player.down, dead: S.player.dead }));
    ok(dn.down > 0 && !dn.dead, vp + ' jogador cai em vez de morrer');
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/${vp}-4-caido.png` });
    await p.waitForFunction(() => !(S.player.down > 0), null, { timeout: 25000 }).catch(() => {});
    const up = await p.evaluate(() => ({ down: S.player.down, dead: S.player.dead, hp: Math.round(S.player.hp) }));
    console.log(vp, 'levantou', JSON.stringify(up));
    ok(!up.dead && !(up.down > 0) && up.hp > 0, vp + ' bot levantou o jogador');
    // bot cai: você segura AÇÃO perto dele
    await p.evaluate(() => { for (const b of S.bots) b.iT = 0; const b = S.bots[0]; COOP.hurt(b, 9999); S.player.x = b.x + 6; S.player.y = S.player.gy = b.y; S.player.plat = b.plat; });
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${OUT}/${vp}-5-parceiro-caido.png` });
    const near = await p.evaluate(() => S.near && S.near.k);
    ok(near === 'revive', vp + ' item de levantar aparece');
    await p.evaluate(() => { S.input.act = true; });
    // segura AÇÃO parado do lado dele (empurrões da horda não tiram o jogador do lugar no teste)
    for (let k = 0; k < 12; k++) { await p.evaluate(() => { const b = S.bots[0]; S.player.x = b.x + 6; S.player.vx = 0; S.input.move = 0; }); await p.waitForTimeout(300); }
    await p.evaluate(() => { S.input.act = false; });
    const bu = await p.evaluate(() => ({ down: S.bots[0].down, out: S.bots[0].out }));
    console.log(vp, "parceiro", JSON.stringify(bu), await p.evaluate(() => JSON.stringify({ rev: S.bots[0].rev, near: S.near && S.near.k, px: Math.round(S.player.x), bx: Math.round(S.bots[0].x), dy: Math.round(S.player.y - S.bots[0].y) })));
    ok(!(bu.down > 0) && !bu.out, vp + ' você levantou o parceiro');
    // dificuldade: com 2 bots a onda tem mais zumbis
    const df = await p.evaluate(() => { const a = zCount(10), sb = S.bots; S.bots = []; const b2 = zCount(10); S.bots = sb; return [a, b2]; });
    console.log(vp, 'zumbis onda 10 com 2 bots / sozinho', df);
    ok(df[0] > df[1], vp + ' dificuldade sobe com bots');
    await ctx.close();
  }
  await b.close();
  console.log(bad ? 'FALHAS: ' + bad : 'tudo ok');
  process.exit(bad ? 1 : 0);
})();
