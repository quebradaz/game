// Recorte dos grafites para o atlas GRAF do jogo. Roda no console do navegador, com o jogo aberto
// (usa GRAF.im e GRAF.r já carregados) e um servidor local entregando as imagens originais em /img/N
// e gravando o resultado em /save. Devolve o atlas novo = peças já existentes + peças novas.
//
// Método: reduz cada recorte para até 46 px de altura, marca o que é tinta (claro ou saturado),
// remove rabisco fino do fundo (abertura), engorda 3 px, fecha os buracos e fica só com a mancha
// principal. O resultado é a peça inteira com uma margem escura fina, sem o retângulo de parede em volta.
// Não incluir recorte que copie personagem ou marca conhecida.
window.GRAF_CUT = async function (JOBS, HOST) {
  const load = (n) => new Promise((ok, no) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => ok(im);
    im.onerror = () => no(new Error('img ' + n));
    im.src = HOST + '/img/' + n;
  });
  const parts = [];
  GRAF.r.forEach((g) => {
    const c = document.createElement('canvas');
    c.width = g[2];
    c.height = g[3];
    c.getContext('2d').drawImage(GRAF.im, g[0], g[1], g[2], g[3], 0, 0, g[2], g[3]);
    parts.push(c);
  });
  const old = parts.length;
  let dropped = 0;
  for (const job of JOBS) {
    const im = await load(job.img), TH = job.th, TS = job.ts, k = job.scale || 1;
    for (const r0 of job.crops) {
      const r = r0.slice(0, 4).map((v) => Math.round(v * k)), er = r0[4];
      const sc = Math.min((r[2] < 200 * k ? 32 : 46) / r[3], 160 / r[2]);
      const w = Math.max(8, Math.round(r[2] * sc)), h = Math.max(8, Math.round(r[3] * sc)), W = w + 10, H = h + 10, N = W * H;
      const c = document.createElement('canvas');
      c.width = W;
      c.height = H;
      const x = c.getContext('2d');
      x.imageSmoothingEnabled = true;
      x.imageSmoothingQuality = 'high';
      x.drawImage(im, r[0], r[1], r[2], r[3], 5, 5, w, h);
      const id = x.getImageData(0, 0, W, H), d = id.data;
      let m = new Uint8Array(N);
      for (let i = 0; i < N; i++) {
        const px = i % W, py = i / W | 0, mx = Math.max(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]), mn = Math.min(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
        m[i] = px >= 5 && py >= 5 && px < W - 5 && py < H - 5 && (mx >= TH || mx - mn >= TS) ? 1 : 0;
      }
      const morph = (a, grow) => {
        const o = new Uint8Array(N);
        for (let i = 0; i < N; i++) {
          const px = i % W, l = px > 0 ? a[i - 1] : 0, rr = px < W - 1 ? a[i + 1] : 0, u = i >= W ? a[i - W] : 0, dn = i < N - W ? a[i + W] : 0;
          o[i] = grow ? a[i] | l | rr | u | dn : a[i] & l & rr & u & dn;
        }
        return o;
      };
      if (er) m = morph(morph(m, 0), 1);
      for (let t = 0; t < 3; t++) m = morph(m, 1);
      // fecha buracos: o que o fundo não alcança a partir da borda vira peça
      const out = new Uint8Array(N);
      let st = [];
      for (let px = 0; px < W; px++) st.push(px, (H - 1) * W + px);
      for (let py = 0; py < H; py++) st.push(py * W, py * W + W - 1);
      while (st.length) {
        const i = st.pop();
        if (out[i] || m[i]) continue;
        out[i] = 1;
        const px = i % W;
        if (px > 0) st.push(i - 1);
        if (px < W - 1) st.push(i + 1);
        if (i >= W) st.push(i - W);
        if (i < N - W) st.push(i + W);
      }
      const lab = new Int32Array(N), sizes = [0];
      for (let s0 = 0; s0 < N; s0++) {
        if (out[s0] || lab[s0]) continue;
        let cnt = 0;
        st = [s0];
        while (st.length) {
          const i = st.pop();
          if (out[i] || lab[i]) continue;
          lab[i] = sizes.length;
          cnt++;
          const px = i % W;
          if (px > 0) st.push(i - 1);
          if (px < W - 1) st.push(i + 1);
          if (i >= W) st.push(i - W);
          if (i < N - W) st.push(i + W);
        }
        sizes.push(cnt);
      }
      const big = Math.max.apply(null, sizes);
      let keep = new Uint8Array(N);
      for (let i = 0; i < N; i++) keep[i] = !out[i] && sizes[lab[i]] >= big * 0.16 ? 1 : 0;
      keep = morph(keep, 0);
      const f = (v) => Math.max(0, Math.min(255, Math.round(((v - 128) * 1.22 + 134) / 30) * 30));
      let cov = 0, x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (let i = 0; i < N; i++) {
        if (keep[i]) {
          d[i * 4] = f(d[i * 4]);
          d[i * 4 + 1] = f(d[i * 4 + 1]);
          d[i * 4 + 2] = f(d[i * 4 + 2]);
          d[i * 4 + 3] = 255;
          cov++;
          const px = i % W, py = i / W | 0;
          if (px < x0) x0 = px;
          if (px > x1) x1 = px;
          if (py < y0) y0 = py;
          if (py > y1) y1 = py;
        } else d[i * 4 + 3] = 0;
      }
      x.putImageData(id, 0, 0);
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      if (cov < (job.minArea || 60) || bw < 12 || bh < 10 || cov / (bw * bh) < (job.gate || 0.3)) {
        dropped++;
        continue;
      }
      const c2 = document.createElement('canvas');
      c2.width = bw;
      c2.height = bh;
      c2.getContext('2d').drawImage(c, x0, y0, bw, bh, 0, 0, bw, bh);
      parts.push(c2);
    }
  }
  const AW = 760, rects = [];
  let X = 0, Y = 0, rowH = 0;
  parts.forEach((c) => {
    if (X + c.width > AW) {
      X = 0;
      Y += rowH + 1;
      rowH = 0;
    }
    rects.push([X, Y, c.width, c.height]);
    X += c.width + 1;
    rowH = Math.max(rowH, c.height);
  });
  const at = document.createElement('canvas');
  at.width = AW;
  at.height = Y + rowH;
  const ax = at.getContext('2d');
  parts.forEach((c, i) => ax.drawImage(c, rects[i][0], rects[i][1]));
  const src = at.toDataURL('image/png');
  const res = await fetch(HOST + '/save?name=graf.json', { method: 'POST', body: JSON.stringify({ src, r: rects }) });
  window.GRAF_AT = at;
  return parts.length + ' pecas (' + old + ' antigas, ' + dropped + ' descartadas) atlas ' + AW + 'x' + at.height + ' ' + Math.round(src.length / 1024) + ' KB ' + (await res.text());
};
