// Monta um vídeo a partir de vídeos prontos do site e de cartelas de texto (patch notes, divulgação), tocando
// tudo num canvas e gravando de novo com o som. Sem ffmpeg. Uso na página do jogo (precisa da fonte Yoster):
//   eval(await (await fetch('/tools/video/reel.js')).text()); await QZR.make({ w, h, vertical, mime, vbps, items, name })
// items: { src, t0, t1, ver, cap, sub } mostra um trecho de vídeo com legenda; { card: { ver, t, lines[] }, ms } mostra uma cartela.
(function () {
  const R = (window.QZR = {});
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const plain = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
  R.make = async (o) => {
    const W = o.w, H = o.h, V = !!o.vertical;
    const big = document.createElement("canvas"); big.width = W; big.height = H;
    const bx = big.getContext("2d");
    const ac = new AudioContext(), dst = ac.createMediaStreamDestination();
    // um <video> por arquivo, carregado como blob para poder pular para qualquer ponto
    const vids = {};
    for (const it of o.items) if (it.src && !vids[it.src]) {
      const bl = await (await fetch(it.src)).blob();
      const v = document.createElement("video"); v.src = URL.createObjectURL(bl); v.preload = "auto"; v.playsInline = true;
      await new Promise((ok) => (v.oncanplaythrough = ok));
      ac.createMediaElementSource(v).connect(dst);
      vids[it.src] = v;
    }
    const st = big.captureStream(30); for (const tr of dst.stream.getAudioTracks()) st.addTrack(tr);
    const mt = o.mime || "video/mp4;codecs=avc1.640028,mp4a.40.2";
    const mr = new MediaRecorder(st, { mimeType: mt, videoBitsPerSecond: o.vbps || 6e6, audioBitsPerSecond: 128e3 }), ch = [];
    mr.ondataavailable = (e) => e.data.size && ch.push(e.data);
    let cur = null, it = null, t0 = 0, on = 1;
    const k = V ? W / 1080 : W / 1280;
    function txt(t, x, y, font, col, sh) {
      bx.font = font;
      if (sh) { bx.fillStyle = "#000"; bx.fillText(t, x + sh, y + sh); }
      bx.fillStyle = col; bx.fillText(t, x, y);
    }
    function wrap(t, maxW, font) {
      bx.font = font;
      const out = []; let line = "";
      for (const w of String(t).split(" ")) { const tt = line ? line + " " + w : w; if (bx.measureText(tt).width > maxW && line) { out.push(line); line = w; } else line = tt; }
      if (line) out.push(line);
      return out;
    }
    function frame() {
      if (!on) return;
      const now = performance.now(), u = Math.min(1, (now - t0) / 350);
      bx.fillStyle = "#07050b"; bx.fillRect(0, 0, W, H);
      bx.textAlign = "center"; bx.textBaseline = "middle";
      if (it && it.card) {
        // cartela de patch note: versão em destaque, título e as novidades em tópicos
        const g = bx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1c0f22"); g.addColorStop(1, "#07050b");
        bx.fillStyle = g; bx.fillRect(0, 0, W, H);
        bx.globalAlpha = u;
        const c = it.card, top = V ? 560 * k : 120 * k;
        if (c.ver) {
          bx.fillStyle = "#e0322b"; const vw = (V ? 300 : 220) * k, vh = (V ? 84 : 58) * k;
          bx.fillRect(W / 2 - vw / 2, top - vh / 2, vw, vh);
          txt("v" + c.ver, W / 2, top + 2 * k, Math.round((V ? 64 : 44) * k) + "px Yoster, monospace", "#fff", 0);
        }
        const tf = Math.round((V ? 92 : 70) * k) + "px Yoster, monospace";
        const tl = wrap(plain(c.t), W * 0.9, tf);
        let y = top + (V ? 150 : 100) * k;
        for (const l of tl) { txt(l, W / 2, y, tf, "#ffc21a", 5 * k); y += (V ? 104 : 78) * k; }
        y += (V ? 30 : 14) * k;
        const lf = "600 " + Math.round((V ? 44 : (c.lines || []).length > 5 ? 26 : 29) * k) + "px system-ui, sans-serif";
        bx.textAlign = "left";
        const lx = V ? 90 * k : 150 * k, lw = W - lx * 2;
        (c.lines || []).forEach((ln, i) => {
          const a = Math.max(0, Math.min(1, ((now - t0) - 250 - i * 180) / 300));
          bx.globalAlpha = a;
          const ls = wrap(ln, lw - 40 * k, lf);
          bx.fillStyle = "#e0322b"; bx.fillRect(lx, y - 9 * k, 16 * k, 16 * k);
          for (const l of ls) { txt(l, lx + 40 * k, y, lf, "#ece8f4", 0); y += (V ? 58 : 36) * k; }
          y += (V ? 18 : 10) * k;
        });
        bx.textAlign = "center"; bx.globalAlpha = 1;
      } else if (cur) {
        if (V) {
          const g = bx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#1a0c1e"); g.addColorStop(0.5, "#07050b"); g.addColorStop(1, "#1a0c1e");
          bx.fillStyle = g; bx.fillRect(0, 0, W, H);
          const cw = 810, sx = (1280 - cw) / 2, dh = 720 * W / cw, dy = (H - dh) / 2;
          bx.drawImage(cur, sx, 0, cw, 720, 0, dy, W, dh);
          txt("QUEBRADA Z", W / 2, 250 * k, Math.round(110 * k) + "px Yoster, monospace", "#ffc21a", 6 * k);
          if (it.ver) txt("ATUALIZACAO " + it.ver, W / 2, 345 * k, Math.round(48 * k) + "px Yoster, monospace", "#fff", 3 * k);
          if (it.cap) {
            const cf = Math.round(76 * k) + "px Yoster, monospace";
            let y = dy + dh + 110 * k;
            for (const l of wrap(plain(it.cap), W * 0.92, cf)) { txt(l, W / 2, y, cf, "#fff", 5 * k); y += 84 * k; }
            if (it.sub) txt(it.sub, W / 2, y + 10 * k, "600 " + Math.round(40 * k) + "px system-ui, sans-serif", "#ffc21a", 0);
          }
        } else {
          bx.drawImage(cur, 0, 0, W, H);
          if (it.cap) {
            bx.globalAlpha = u;
            bx.fillStyle = "rgba(7,5,11,.78)"; bx.fillRect(0, H - 150 * k, W, 112 * k);
            if (it.ver) { bx.fillStyle = "#e0322b"; bx.fillRect(40 * k, H - 132 * k, 130 * k, 40 * k); txt("v" + it.ver, 105 * k, H - 111 * k, Math.round(30 * k) + "px Yoster, monospace", "#fff", 0); }
            bx.textAlign = "left";
            txt(plain(it.cap), 196 * k, H - 112 * k, Math.round(44 * k) + "px Yoster, monospace", "#ffc21a", 3 * k);
            if (it.sub) txt(it.sub, 196 * k, H - 66 * k, Math.round(26 * k) + "px system-ui, sans-serif", "#ece8f4", 0);
            bx.textAlign = "center"; bx.globalAlpha = 1;
          }
        }
      }
      requestAnimationFrame(frame);
    }
    frame();
    mr.start(500);
    for (const x of o.items) {
      if (x.card) { cur = null; it = x; t0 = performance.now(); await wait(x.ms || 3500); continue; }
      const v = vids[x.src];
      v.currentTime = x.t0;
      await new Promise((ok) => { v.onseeked = ok; setTimeout(ok, 3000); });
      cur = v; it = x; t0 = performance.now();
      await v.play();
      await new Promise((ok) => { const f = () => (v.ended || v.currentTime >= x.t1 ? ok() : requestAnimationFrame(f)); f(); });
      v.pause();
    }
    await new Promise((ok) => { mr.onstop = ok; mr.stop(); });
    on = 0; ac.close();
    for (const v of Object.values(vids)) { URL.revokeObjectURL(v.src); v.removeAttribute("src"); v.load(); }
    const bl = new Blob(ch, { type: mt.split(";")[0] }), fr = new FileReader();
    return new Promise((res) => { fr.onload = () => fetch("http://127.0.0.1:8379/?name=" + encodeURIComponent(o.name), { method: "POST", body: fr.result }).then((r) => r.text()).then(res); fr.readAsDataURL(bl); });
  };
})();
