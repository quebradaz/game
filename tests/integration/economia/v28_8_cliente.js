// Teste do cliente v28.8 com servidor simulado (NET.rpc falso). Uso: node tools/serve.js . 8377 &  node tests/integration/economia/v28_8_cliente.js saida.png
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 640 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://127.0.0.1:8377/');
  await p.waitForFunction(() => typeof LOOK !== 'undefined' && typeof ECO !== 'undefined', null, { timeout: 30000 });
  await p.waitForTimeout(1500);
  const out = await p.evaluate(async () => {
    const calls = [], R = {};
    let wallet = { chips: 0, zcoin: 0, coins: 1234, level: 5, xp: 77, need: 660 };
    Object.defineProperty(NET, 'logged', { get: () => true, configurable: true });
    NET.st.profile = { id: 'u1', name: 'Teste' }; NET.st.name = 'Teste';
    NET.rpc = (fn, a) => { calls.push(fn); 
      if (fn === 'get_economy') return Promise.resolve({ wallet: Object.assign({}, wallet), skills: {}, costs: {}, items: [], shop: [], missions: [], pass: null, boxes: 0 });
      if (fn === 'buy_look') { wallet.coins -= 150; return Promise.resolve({ items: [a.p_item], coins: wallet.coins }); }
      if (fn === 'buy_kit') { wallet.coins -= 430; return Promise.resolve({ items: [], coins: wallet.coins }); }
      return Promise.resolve({}); };
    await ECO.refresh();
    R.mirror = [SAVE.d.coins, SAVE.d.level, SAVE.d.xp, ECO.srvOn()];
    R.importCalled = calls.includes('import_meta');
    showMShop();
    // aba de cabeça, item de 150 moedas
    const btn = [...document.querySelectorAll('#msGrid button')].find(x => /^[0-9]+ moedas$/.test(x.textContent) && !x.classList.contains('poor'));
    R.btnTxt = btn && btn.textContent; const bought = btn && btn.closest('.msItem').querySelector('.n').textContent;
    btn.click();
    await new Promise(r => setTimeout(r, 300));
    R.buy = [calls.includes('buy_look'), SAVE.d.coins, bought, btn.textContent];
    // fim de partida com conta: aparelho não soma
    const before = [SAVE.d.coins, SAVE.d.xp, SAVE.d.level];
    try {
      S.mode = 'play'; S.round = 10; S.stats.kills = 100;
      UI.over(false);
    } catch (e) { R.overErr = e.message; }
    R.afterOverSync = [SAVE.d.coins, SAVE.d.xp, SAVE.d.level, before];
    await new Promise(r => setTimeout(r, 300));
    R.msgNoRun = document.getElementById('unlockMsg').textContent;
    ECO.runMeta({ ok: true, wallet_coins: 2000, coins: 100, char_xp: 650, level: 6, xp: 10, ups: 1 });
    R.runMeta = [SAVE.d.coins, SAVE.d.level, SAVE.d.xp, document.getElementById('ovXpTx').textContent, document.getElementById('sCoins').textContent];
    document.getElementById('unlockMsg').textContent = 'Partida aceita pelo servidor';
    return R; });
  await p.screenshot({ path: process.argv[2] });
  const out2 = await p.evaluate(async () => { const R = {};
    ECO.runMeta({ ok: false, reason: 'rapido demais' });
    R.msgRejected = document.getElementById('unlockMsg').textContent;
    // modo sem conta: soma no aparelho como antes
    ECO.ready = 0; const c0 = SAVE.d.coins;
    S.mode = 'play'; S.round = 10; S.stats.kills = 100; UI.over(false);
    R.guest = [c0, SAVE.d.coins];
    return R;
  });
  console.log(JSON.stringify(Object.assign(out, out2))); console.log('pageerrors', errs.slice(0, 5));
  await b.close();
})();
