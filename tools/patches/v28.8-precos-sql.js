// v28.8: imprime o SQL dos preços em moedas comuns (roupas e kits da loja do menu) para o servidor.
// Item grátis (preço 0) dentro de um kit entra no kit sem custo.
// Fonte única: os preços continuam em LOOK.ITEMS / LOOK.KITS no index.html; este script lê de lá.
// Uso: node tools/serve.js . 8377 &  e depois  node tools/patches/v28.8-precos-sql.js [http://127.0.0.1:8377/]
const { chromium } = require('playwright');
const url = process.argv[2] || 'http://127.0.0.1:8377/';
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await p.goto(url);
  await p.waitForFunction(() => typeof LOOK !== 'undefined' && LOOK.ITEMS, null, { timeout: 30000 });
  const r = await p.evaluate(() => {
    const I = LOOK.ITEMS, K = LOOK.KITS, items = {}, free = {}, kits = {};
    for (const k in I) if (!I[k].unlock && I[k].price > 0) items[k] = I[k].price; else if (!I[k].unlock) free[k] = 1;
    for (const k in K) kits[k] = K[k].items;
    return { items, free, kits };
  });
  await b.close();
  const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
  for (const k in r.kits) for (const it of r.kits[k]) if (!(it in r.items) && !(it in r.free)) throw new Error('kit ' + k + ' tem item sem preço: ' + it);
  const L = [];
  L.push('insert into public.coin_prices (item_id, price) values');
  L.push(Object.entries(r.items).map(([k, v]) => '(' + q(k) + ',' + (v | 0) + ')').join(',\n'));
  L.push('on conflict (item_id) do update set price = excluded.price, active = true;');
  L.push('insert into public.coin_kits (kit_id, items) values');
  L.push(Object.entries(r.kits).map(([k, v]) => '(' + q(k) + ',array[' + v.map(q).join(',') + '])').join(',\n'));
  L.push('on conflict (kit_id) do update set items = excluded.items, active = true;');
  console.log(L.join('\n'));
})().catch((e) => { console.error(e); process.exit(1); });
