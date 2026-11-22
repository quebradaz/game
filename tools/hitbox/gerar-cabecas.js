// Gera tools/hitbox/cabecas.json: onde está a cabeça de cada zumbi em cada quadro de cada animação.
// Como: para cada tipo, a cabeça do quadro 0 do Idle (retângulo MOLDE abaixo, em pixels do sprite) vira um molde,
// e em cada quadro procura-se a posição em que o molde mais se parece com o desenho (soma das diferenças de cor;
// pixel do molde caindo em fundo transparente pesa muito). Quando a melhor nota é ruim (cabeça girada no Hurt,
// corrida), a busca se limita a posições que contêm o ponto mais alto da silhueta, onde a cabeça quase sempre está.
// FIXO corrige à mão os poucos quadros em que nem isso acerta (conferidos nas imagens de tools/hitbox/conferir.js).
// Rodar de novo só se a arte dos zumbis mudar: node tools/hitbox/gerar-cabecas.js [index.html]
// Nada sai da máquina: o jogo é servido por page.route em http://localhost/ (a trava de domínio libera localhost).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const FILE = path.resolve(process.argv[2] || path.join(__dirname, '../../index.html'));
// [x0, y0, x1, y1) da cabeça no quadro 0 do <tipo>_Idle, contando o contorno
const MOLDE = {
  zm: [44, 15, 58, 30], zw: [44, 15, 58, 30], zx: [55, 28, 66, 41], zr: [44, 16, 59, 30], zc: [63, 54, 77, 69],
  zd: [53, 45, 67, 58], zb: [43, 15, 56, 30], zs: [39, 11, 58, 30], zf: [43, 15, 56, 30], zq: [39, 15, 50, 28],
  zv: [44, 15, 58, 30], zh: [44, 15, 58, 30], zk1: [68, 86, 86, 106], zk2: [66, 89, 86, 108], zk3: [77, 83, 96, 104]
};
// quadros em que a cabeça muda demais para o molde (zx comendo: cabeça abaixada na frente do corpo)
const FIXO = { zx_Eating: { 1: [64, 44], 4: [64, 44] } };
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1280, height: 720 } });
  await ctx.route('**/*', (r) => {
    const u = new URL(r.request().url());
    if (u.hostname !== 'localhost') return r.abort();
    if (u.pathname === '/' || u.pathname === '/index.html') return r.fulfill({ body: fs.readFileSync(FILE), contentType: 'text/html' });
    r.fulfill({ status: 404, body: '' });
  });
  await ctx.addInitScript(() => { try { navigator.serviceWorker && (navigator.serviceWorker.register = () => Promise.reject()); } catch (e) {} });
  const p = await ctx.newPage();
  await p.goto('http://localhost/', { waitUntil: 'load' });
  await p.waitForFunction(() => typeof SHEETS === 'object' && typeof IMG === 'object' && IMG.zm_Idle && IMG.zm_Idle.width > 0, null, { timeout: 30000 });
  await p.waitForTimeout(1500);
  const r = await p.evaluate(([MOLDE, FIXO]) => {
    const out = { tam: {}, q: {} }, nota = {};
    const px = (k) => { const im = IMG[k], c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return { d: x.getImageData(0, 0, im.width, im.height).data, W: im.width }; };
    for (const t in MOLDE) {
      const [x0, y0, x1, y1] = MOLDE[t], tw = x1 - x0, th = y1 - y0, R = px(t + '_Idle'), tp = [];
      out.tam[t] = [tw, th];
      for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) { const q = ((y0 + y) * R.W + x0 + x) * 4; tp.push(R.d[q + 3] > 100 ? [R.d[q], R.d[q + 1], R.d[q + 2]] : null); }
      const nOp = tp.filter(Boolean).length;
      for (const k in SHEETS) if (k.split('_')[0] === t) {
        const s = SHEETS[k], D = px(k), Q = out.q[k] = []; nota[k] = [];
        for (let f = 0; f < s.n; f++) {
          const op = (x, y) => D.d[(y * D.W + f * s.f + x) * 4 + 3] > 100;
          let top = -1, sx = 0, cnt = 0;
          for (let y = 0; y < s.f && top < 0; y++) for (let i = 0; i < s.f; i++) if (op(i, y)) { top = y; break; }
          for (let y = top; y < top + 6; y++) for (let i = 0; i < s.f; i++) if (op(i, y)) { sx += i; cnt++; }
          const tx = cnt ? sx / cnt : s.f / 2;
          const busca = (perto) => {
            let best = 1e18, bx = 0, by = 0;
            for (let oy = 0; oy <= s.f - th; oy++) for (let ox = 0; ox <= s.f - tw; ox++) {
              if (perto && !(oy <= top + 3 && oy + th >= top + 4 && ox <= tx && ox + tw >= tx)) continue;
              let c = 0;
              for (let y = 0; y < th && c < best; y++) for (let x = 0; x < tw; x++) {
                const q = ((oy + y) * D.W + f * s.f + ox + x) * 4, T = tp[y * tw + x], o = D.d[q + 3] > 100;
                if (T) c += o ? Math.abs(D.d[q] - T[0]) + Math.abs(D.d[q + 1] - T[1]) + Math.abs(D.d[q + 2] - T[2]) : 600;
                else if (o) c += 150;
              }
              if (c < best) { best = c; bx = ox; by = oy; }
            }
            return [Math.round(best / nOp), bx, by];
          };
          let [n, bx, by] = busca(false);
          if (n > 100) { const c = busca(true); if (c[0] <= n + 40) [n, bx, by] = c; }
          const fx = FIXO[k] && FIXO[k][f];
          if (fx) [bx, by] = fx;
          Q.push(bx, by); nota[k].push(n);
        }
      }
    }
    return { out, nota };
  }, [MOLDE, FIXO]);
  const dst = path.join(__dirname, 'cabecas.json');
  fs.writeFileSync(dst, JSON.stringify(r.out) + '\n');
  const nq = Object.values(r.out.q).reduce((a, q) => a + q.length / 2, 0);
  console.log('ok', Object.keys(r.out.q).length, 'animações,', nq, 'quadros ->', path.relative(process.cwd(), dst));
  await b.close();
})();
