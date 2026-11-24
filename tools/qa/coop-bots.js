// QA do co-op etapa 1 (v29.9): tela do mapa com zoom/lore/parceiros, partida com 2 bots, cair e levantar.
// Serve o index.html em http://localhost/ (trava de domínio). Uso: node tools/qa/coop-bots.js <pasta-saida> [index.html]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const OUT = process.argv[2] || 'out', HTML = process.argv[3] || 'index.html';
fs.mkdirSync(OUT, { recursive: true });
const VPS = { pc: { width: 1366, height: 768 }, celular: { width: 844, height: 390 } };
const html = fs.readFileSync(HTML), ROOT = path.dirname(path.resolve(HTML));
const VWq = (vp) => vp === 'pc' ? 360 : 300;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const __TV__ = (/TERMS = \{\s*V: "([^"]+)"/.exec(require('fs').readFileSync(process.argv[3] || 'index.html', 'utf8')) || [])[1] || '';
(async () => {
  const b = await chromium.launch();
  let bad = 0;
  const ok = (cond, msg) => { console.log((cond ? 'ok  ' : 'FALHOU ') + msg); if (!cond) bad++; };
  for (const [vp, size] of Object.entries(VPS)) {
    const ctx = await b.newContext({ viewport: size, deviceScaleFactor: 2, hasTouch: vp !== 'pc', isMobile: vp !== 'pc' });
    await ctx.addInitScript((v) => { try { localStorage.setItem('qz_terms', JSON.stringify({ v })); } catch (e) {} }, __TV__); // termos já aceitos (v29.11)
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
    await p.evaluate(() => { hurtPlayer = ((h) => function (d, kb) { if (window.__god) return; return h(d, kb); })(hurtPlayer); window.__god = 1; for (const b of S.bots) b.iT = 1e9; skipPause(); startRound(6); S.spawnT = 0; });
    // no teste ninguém atira por você: os bots ficam imunes até a parte de cair, senão a horda derruba os dois
    await p.waitForTimeout(9000);
    await p.screenshot({ path: `${OUT}/${vp}-3-partida-bots.png` });
    const fight = await p.evaluate(() => ({ botKills: S.stats.botKills || 0, kills: S.stats.kills, pos: S.bots.map((b) => Math.round(b.x - S.player.x)), alive: S.zs.filter((z) => z.state !== 'dead').length }));
    console.log(vp, JSON.stringify(fight));
    ok(fight.pos.every((d) => Math.abs(d) < 320), vp + ' bots seguem o jogador');
    // andar pra direita: bots vêm junto
    await p.evaluate(() => { S.input.move = 1; });
    await p.waitForTimeout(2500);
    await p.evaluate(() => { S.input.move = 0; });
    await p.waitForTimeout(1500);
    const fol = await p.evaluate(() => S.bots.map((b) => Math.round(b.x - S.player.x)));
    console.log(vp, 'depois de andar', JSON.stringify(fol));
    const vw = await p.evaluate(() => VW);
    ok(fol.every((d) => Math.abs(d) < vw * 0.7), vp + ' bots acompanham ao andar (perto de você, sem grudar)');
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
    // bots de volta, imunes, pro resto do teste
    await p.evaluate(() => { for (const b of S.bots) { b.down = 0; b.out = 0; b.dead = false; b.hp = b.maxHp; b.iT = 1e9; b.anim = 'Idle'; } });
    // v29.10: dinheiro individual — abate do bot vai pra carteira dele, nada cai pra você
    const cash = await p.evaluate(() => {
      const b = S.bots[0], z = spawnZombie({ x: S.player.x + 80, y: G0 }, 'in', 'ze'), pc = S.player.cash, bc = b.cash, drops = (S.cashD || []).length;
      S.byBot = b; try { hurtZ(z, 1e6, false, 'gun', 1); } finally { S.byBot = 0; }
      return { player: S.player.cash - pc, bot: b.cash - bc, drops: (S.cashD || []).length - drops };
    });
    console.log(vp, 'grana do abate do bot', JSON.stringify(cash));
    ok(cash.player === 0 && cash.bot > 0 && cash.drops === 0, vp + ' dinheiro do bot é dele');
    // limpa a horda e vai pra pausa de compra: bot prega a barricada da sua área
    await p.evaluate(() => { for (const z of S.zs) z.state = 'dead'; S.toSpawn = S.spawned; S.endT = 0; beginPause(); for (const b of S.bots) { b.job = null; b.iT = 1e9; } });
    const bar = await p.evaluate(() => {
      const p0 = S.player; let bi = -1, bd = 1e9;
      const ixOf = (b) => b.dir === 0 ? b.x : b.x + b.dir * 24;
      S.bars.forEach((b, i) => { if (b.y !== G0 || b.kind === 'portao') return; const d = Math.abs(ixOf(b) - p0.x); if (d < bd) { bd = d; bi = i; } });
      if (bi < 0) return null;
      const b = S.bars[bi], side = b.dir === 0 ? 1 : b.dir;
      // você fica na sala, a uns 70 px da barricada (do lado de dentro)
      const x = ixOf(b) + side * 70; S.player.x = x; S.player.y = S.player.gy = G0; S.player.plat = platOf(x, G0, 4) || S.player.plat; S.player.vx = 0;
      for (const d of M().doors) S.opened[d.id] = 1;
      b.planks = 1; window.__bar = bi; window.__c0 = S.bots.map((x) => x.cash);
      return { i: bi, d: Math.round(bd) };
    });
    await p.waitForTimeout(12000);
    await p.screenshot({ path: `${OUT}/${vp}-6-bot-pregando.png` });
    const rb = await p.evaluate(() => ({ planks: S.bars[window.__bar].planks, gain: S.bots.map((x, i) => x.cash - window.__c0[i]), jobs: S.bots.map((x) => x.job && x.job.k) }));
    console.log(vp, 'barricada', JSON.stringify(bar), JSON.stringify(rb));
    ok(bar && rb.planks > 1 && rb.gain.some((g) => g > 0), vp + ' bot prega a barricada e ganha a grana dele');
    // posição própria: os dois bots não ficam no mesmo lugar nem grudados em você
    await p.evaluate(() => { const b = S.bars[window.__bar]; b.planks = b.max; for (const x of S.bots) x.job = null; });
    const sp = [];
    for (let k = 0; k < 6; k++) { await p.waitForTimeout(1000); sp.push(await p.evaluate(() => S.bots.map((b) => Math.round(b.x - S.player.x)))); }
    console.log(vp, 'posições', JSON.stringify(sp));
    const last = sp[sp.length - 1];
    ok(Math.abs(last[0] - last[1]) > 25 && last.every((d) => Math.abs(d) < 320), vp + ' bots com posição própria');
    // mudar de área: abre as portas e você vai pra outra sala longe; os bots chegam (andando ou reaparecendo)
    const go = await p.evaluate(() => {
      const m = M(); for (const d of m.doors) S.opened[d.id] = 1;
      const r0 = roomIdx(m, S.player.x), far = m.rooms.filter((r) => r.i !== r0 && Math.abs((r.x0 + r.x1) / 2 - S.player.x) > VW * 0.8).sort((a, b) => Math.abs((a.x0 + a.x1) / 2 - S.player.x) - Math.abs((b.x0 + b.x1) / 2 - S.player.x))[0];
      if (!far) return null;
      const x = (far.x0 + far.x1) / 2, pl = platOf(x, G0, 4);
      if (!pl) return null;
      S.player.x = x; S.player.y = S.player.gy = G0; S.player.plat = pl; S.player.vx = 0; S.cam.x = clamp(x - VW / 2, 0, m.w - VW);
      return { from: r0, to: far.i };
    });
    await p.waitForTimeout(7000);
    await p.screenshot({ path: `${OUT}/${vp}-7-area-nova.png` });
    const ar = await p.evaluate(() => ({ d: S.bots.map((b) => Math.round(b.x - S.player.x)), rooms: S.bots.map((b) => roomIdx(M(), b.x)), me: roomIdx(M(), S.player.x) }));
    console.log(vp, 'área nova', JSON.stringify(go), JSON.stringify(ar));
    ok(!go || ar.d.every((d) => Math.abs(d) < 300), vp + ' bots vão pra área nova');
    await ctx.close();
  }
  await b.close();
  console.log(bad ? 'FALHAS: ' + bad : 'tudo ok');
  process.exit(bad ? 1 : 0);
})();
