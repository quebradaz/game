// Gravação de vídeos do site com o jogo de verdade: um bot que joga com dano real (sem vida infinita),
// mira só no zumbi do mesmo andar, mantém distância pela arma, troca entre arma curta e longa, joga granada
// em grupo, usa a RPG na horda e prega tábua entre as ondas. O vídeo leva o HUD (desenhado a partir do DOM)
// e o som do jogo. Uso no console da página do jogo (servida em localhost):
//   await import('/tools/video/bot.js'); QZV.bot(true); ... QZV.record(ms, 'video/nome.webm')
(function () {
  const Q = (window.QZV = window.QZV || {});
  const rnd = (a, b) => a + Math.random() * (b - a);
  const cls = (id) => {
    const k = (WEAP[id] || {}).kind || "";
    if (id === "rocket") return "rocket";
    if (k === "shotgun" || id === "shotgun" || id === "spas") return "short";
    if (id === "awp" || id === "barrett") return "sniper";
    if (id === "smg" || id === "uzi" || id === "p90" || k === "pistol") return "mid";
    return "long";
  };
  const want = { short: 75, mid: 130, long: 175, sniper: 250, rocket: 210 };
  const range = { short: 175, mid: 330, long: 370, sniper: 380, rocket: 360 };
  const B = { aim: 0, swapT: 0, nadeT: 3, jumpT: 0, burst: 0, rest: 0, mode: "", lockT: 0, stuckT: 0 };
  Q.B = B;
  function sameFloor(z, p) { return Math.abs(z.y - p.y) < 22; }
  function alive(z) { return z.state !== "dead" && !(z.hp <= 0); }
  // mira na cabeça (dano crítico), no chefe mira no meio do corpo
  function center(z) { const h = typeof zH === "function" ? zH(z) : z.h || 54; return z.boss ? z.y - h * 0.5 : z.y - h + (z.headH || 12) * 0.5; }
  // ângulo de arremesso que faz a granada cair perto de x+D (simula a mesma física de updateNades)
  function throwAng(p, D, dir) {
    let best = -0.6, bd = 1e9;
    for (let a = -1.25; a <= 0.05; a += 0.05) {
      const ang = dir > 0 ? a : Math.PI - a;
      let x = 0, y = -34, vx = Math.cos(ang) * 340, vy = Math.sin(ang) * 340 - 120, t = 0;
      while (t < 2) { vy += 700 / 60; x += vx / 60; y += vy / 60; t += 1 / 60; if (y >= 0 && vy > 0) break; }
      const e = Math.abs(Math.abs(x) - D);
      if (e < bd) { bd = e; best = ang; }
    }
    return best;
  }
  function cluster(list, p, dir) {
    let best = null;
    for (const z of list) {
      const dx = (z.x - p.x) * dir;
      if (dx < 100 || dx > 260) continue;
      const n = list.filter((o) => Math.abs(o.x - z.x) < 55).length;
      if (!best || n > best.n) best = { z, n, dx };
    }
    return best;
  }
  function slotOf(p, c) { for (let i = 0; i < 2; i++) if (p.ws[i] && cls(p.ws[i].id) === c) return i; return -1; }
  function tick() {
    const I = S.input, p = S.player;
    if (!p || p.dead || !S.zs) return;
    const m = M(), dt = 0.033;
    I.touch = true;
    B.swapT -= dt; B.nadeT -= dt; B.jumpT -= dt; B.lockT -= dt;
    // zumbi do lado de fora da janela (state out) não toma tiro: a parede segura
    const zs = S.zs.filter((z) => alive(z) && z.state === "in"), here = zs.filter((z) => sameFloor(z, p));
    let t = null, td = 1e9;
    const onS = (z) => { const sx = z.x - S.cam.x; return sx > 10 && sx < VW - 10; };
    for (const z of here) { if (!onS(z) && Math.abs(z.x - p.x) > 340) continue; const d = Math.abs(z.x - p.x) - (z.boss ? 30 : 0); if (d < td) { td = d; t = z; } }
    if (t && td > 380) t = null;
    // chefe na mira, a não ser que um zumbi esteja colado
    const bz = here.find((z) => z.boss && Math.abs(z.x - p.x) < 380);
    if (bz && (!t || t === bz || td > 45)) { t = bz; td = Math.abs(bz.x - p.x); }
    const w = curW && curW(), c = w ? cls(w.id) : "mid";
    // sem alvo no andar: prega tábua na janela mais perto ou só anda olhando pra frente
    if (!t) {
      I.fire = false; I.aimMag = 0; I.runEdge = false;
      const bar = S.near && S.near.k === "bar";
      if (bar && !zs.some((z) => Math.abs(z.x - p.x) < 160 && sameFloor(z, p))) { I.move = 0; I.act = true; return; }
      I.act = false;
      let goal = null, gd = 1e9;
      for (const b of S.bars) if (b.planks < b.max && Math.abs(b.y - p.y) < 10 && (typeof opened !== "function" || opened(b.req))) { const d = Math.abs(b.x - p.x); if (d < gd && d < 420) { gd = d; goal = b; } }
      // zumbi no mesmo andar mas fora da tela: vai atrás dele
      let hz = null, hd = 1e9;
      for (const z of here) { const d = Math.abs(z.x - p.x); if (d < hd) { hd = d; hz = z; } }
      if (hz && hd < (B.chase || 1400)) { I.move = Math.sign(hz.x - p.x) * 0.7; B.aim = hz.x > p.x ? 0 : Math.PI; I.aimMag = 1; I.aimAng = B.aim; return; }
      if (goal && gd > 14) I.move = Math.sign(goal.x - p.x) * 0.8;
      else I.move = 0;
      return;
    }
    I.act = false;
    const dx = t.x - p.x, dir = Math.sign(dx) || p.face, dist = Math.abs(dx);
    // escolhe a arma pela situação: espingarda de perto, fuzil/sniper de longe, RPG na horda ou no chefe
    if (B.swapT <= 0 && p.relT <= 0 && p.melT <= 0) {
      const ahead = here.filter((z) => Math.sign(z.x - p.x) === dir);
      const cl = cluster(ahead, p, dir);
      const rk = slotOf(p, "rocket"), sh = slotOf(p, "short");
      const lg = [slotOf(p, "sniper"), slotOf(p, "long"), slotOf(p, "mid")].find((i) => i >= 0) ?? -1;
      let pickS = -1;
      if (rk >= 0 && p.ws[rk].mag + p.ws[rk].res > 0 && dist > 150 && (cl && cl.n >= (B.rocketMin || 4) || t.boss)) pickS = rk;
      else if (c === "sniper" && dist < 120 && p.ws[p.cur ^ 1] && p.ws[p.cur ^ 1].mag > 0) pickS = p.cur ^ 1;
      else if (sh >= 0 && dist < 110 && (B.preferShort || p.ws[p.cur ^ 1] && p.ws[p.cur ^ 1].mag === 0 || p.relT > 0)) pickS = sh;
      else if (lg >= 0 && dist > 170) pickS = lg;
      else if (rk === p.cur && dist <= 150) pickS = sh >= 0 ? sh : lg;
      if (pickS >= 0 && pickS !== p.cur && p.ws[pickS]) { I.slot = pickS; B.swapT = 1.4; }
      // granada: 3+ zumbis juntos a meia distância
      const nd = (p.nades.frag || 0) + (p.nades.molotov || 0);
      if (nd && B.nadeT <= 0 && cl && cl.n >= (B.nadeMin || 3) && !t.boss) {
        B.aim = throwAng(p, cl.dx, dir); I.aimAng = B.aim; I.aimMag = 1;
        B.nadeT = B.nadeEvery ? rnd(B.nadeEvery, B.nadeEvery + 2) : rnd(4, 7); B.lockT = 0.35; I.fire = false;
        setTimeout(() => { I.nade = true; }, 120);
        return;
      }
    }
    // pente vazio: troca pra outra arma se ela tem bala e o zumbi está perto, senão solta o gatilho e recarrega
    if (w && w.mag === 0 && p.relT <= 0) {
      const o = p.ws[p.cur ^ 1];
      if (p.cur < 2 && o && o.mag > 0 && dist < 140 && B.swapT <= 0) { I.slot = p.cur ^ 1; B.swapT = 1.2; }
      else if (w.res > 0) I.reload = true;
      I.fire = false;
    }
    if (B.lockT > 0) { I.aimMag = 1; I.aimAng = B.aim; I.fire = false; return; }
    // mira suave com um pouco de erro humano
    const sh0 = [p.x, p.y - 34], ty = dist < 70 || (WEAP[w.id].spread || 0) > 0.035 && c !== "short" ? t.y - (typeof zH === "function" ? zH(t) : 54) * 0.62 : center(t) + rnd(-2, 2), tgtA = Math.atan2(ty - sh0[1], dx);
    let da = Math.atan2(Math.sin(tgtA - B.aim), Math.cos(tgtA - B.aim));
    B.aim += da * 0.45;
    B.aim = Math.atan2(Math.sin(B.aim), Math.cos(B.aim));
    I.aimMag = 1; I.aimAng = B.aim;
    const facing = dist < 24 || Math.cos(B.aim) * dir > 0.3;
    // tiro em rajadas (solta o gatilho de vez em quando, como gente)
    if (B.rest > 0) { B.rest -= dt; I.fire = false; }
    else {
      I.fire = facing && w && w.mag > 0 && p.relT <= 0 && dist < range[c] && !(c === "rocket" && dist < 120);
      B.burst += I.fire ? dt : 0;
      if (B.burst > rnd(0.9, 2.2) && c !== "short" && c !== "sniper") { B.burst = 0; B.rest = rnd(0.12, 0.3); }
    }
    // distância: recua pro lado mais livre quando chegam perto; espera a horda vir em vez de entrar nela
    const d0 = want[c] * (p.hp < p.maxHp * 0.45 ? 1.5 : 1);
    const near = (sd) => { let d = 1e9; for (const z of here) if (Math.sign(z.x - p.x) === sd) d = Math.min(d, Math.abs(z.x - p.x)); return d; };
    const L = near(-1), R = near(1);
    const room = (sd) => sd < 0 ? p.x - m.inner[0] : m.inner[1] - p.x;
    // parede invisível (portão fechado): andou e não saiu do lugar
    if (Math.abs(I.move) > 0.3 && Math.abs(p.x - (B.lastX || 0)) < 0.5) B.stuckT += dt; else B.stuckT = 0;
    B.lastX = p.x;
    if (B.stuckT > 0.4) B.blocked = { sd: Math.sign(I.move), t: 2 };
    if (B.blocked) { B.blocked.t -= dt; if (B.blocked.t <= 0) B.blocked = null; }
    const canGo = (sd) => room(sd) > 40 && !(B.blocked && B.blocked.sd === sd);
    const away = -dir;
    I.runEdge = false;
    if (dist < d0 - 20) {
      if (canGo(away) && (away < 0 ? L : R) > 90) { I.move = away; if (dist < Math.min(80, d0 * 0.5) && p.sta > 25) { I.runEdge = true; I.fire = false; } }
      else I.move = 0;
    } else if (dist > d0 + 150 && here.length < 3) I.move = dir * 0.5;
    else I.move = 0;
    // encurralado ou cercado: chute, faca, esquiva ou pulo por cima do lado mais fraco
    const close = Math.min(L, R);
    if (close < 38) {
      if (w && w.mag === 0 && w.res === 0) I.melee = true;
      else if (p.relT <= 0 && !(p.kickCd > 0) && close < 26 && Math.random() < 0.3) I.kick = true;
      const trapped = !canGo(away) || (away < 0 ? L : R) < 70;
      if (trapped && B.jumpT <= 0) {
        const sd = here.filter((z) => Math.sign(z.x - p.x) === 1 && Math.abs(z.x - p.x) < 120).length <= here.filter((z) => Math.sign(z.x - p.x) === -1 && Math.abs(z.x - p.x) < 120).length ? 1 : -1;
        I.move = canGo(sd) ? sd : -sd;
        if (Math.random() < 0.6) I.dodge = true;
        else { I.jump = true; I.jumpEdge = true; setTimeout(() => { I.jump = false; }, 160); }
        B.jumpT = 0.9;
      }
    }
    if (p.hp < p.maxHp * 0.3 && p.syr > 0 && !(p.syrCd > 0)) I.syr = true;
  }
  Q.bot = (on) => {
    clearInterval(Q._bot);
    const I = S.input;
    if (!on) { I.fire = false; I.move = 0; I.aimMag = 0; I.act = false; return; }
    B.aim = S.player ? S.player.aim : 0;
    Q._bot = setInterval(() => { try { tick(); } catch (e) { console.warn("bot", e); } }, 33);
  };

  // ---------- vídeo: espelha o canvas 2x, pinta o HUD do DOM por cima e mistura o som ----------
  function rgbaList(s) { return (s.match(/rgba?\([^)]*\)/g) || []); }
  function paintDom(c, root, alpha) {
    const els = root.querySelectorAll("*");
    const all = [root, ...els].map((e, i) => [e, parseInt(getComputedStyle(e).zIndex) || 0, i]).sort((x, y) => x[1] - y[1] || x[2] - y[2]).map((x) => x[0]);
    for (const e of all) {
      const r = e.getBoundingClientRect();
      if (r.width < 1 || r.height < 1 || r.bottom < 0 || r.top > innerHeight) continue;
      const cs = getComputedStyle(e);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      let op = 1;
      for (let n = e; n && n !== document.body; n = n.parentElement) { const o = +getComputedStyle(n).opacity; op *= isNaN(o) ? 1 : o; if (op <= 0.01) break; }
      if (op <= 0.01) continue;
      c.globalAlpha = op * alpha;
      const bg = cs.backgroundColor, gi = rgbaList(cs.backgroundImage);
      if (gi.length > 1) {
        const g = c.createLinearGradient(0, r.top, 0, r.bottom);
        gi.forEach((col, i) => g.addColorStop(i / (gi.length - 1), col));
        c.fillStyle = g; c.fillRect(r.left, r.top, r.width, r.height);
      } else if (bg && bg !== "rgba(0, 0, 0, 0)" && bg !== "transparent") { c.fillStyle = bg; c.fillRect(r.left, r.top, r.width, r.height); }
      const bw = parseFloat(cs.borderTopWidth);
      if (bw > 0 && cs.borderTopStyle !== "none") { c.strokeStyle = cs.borderTopColor; c.lineWidth = bw; c.strokeRect(r.left + bw / 2, r.top + bw / 2, r.width - bw, r.height - bw); }
      if (e.tagName === "CANVAS" && e.width) { try { c.drawImage(e, r.left, r.top, r.width, r.height); } catch (x) {} }
      if (e.tagName === "IMG" && e.complete) { try { c.drawImage(e, r.left, r.top, r.width, r.height); } catch (x) {} }
      for (const n of e.childNodes) {
        if (n.nodeType !== 3 || !n.textContent.trim()) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        const rr = rg.getClientRects();
        if (!rr.length) continue;
        c.font = cs.font || cs.fontSize + " " + cs.fontFamily;
        c.textBaseline = "middle"; c.textAlign = "left";
        const txt = cs.textTransform === "uppercase" ? n.textContent.trim().toUpperCase() : n.textContent.trim();
        const q = rr[0], y = q.top + q.height / 2;
        if (cs.textShadow && cs.textShadow !== "none") { c.fillStyle = "rgba(0,0,0,.85)"; c.fillText(txt, q.left + 2, y + 2); }
        if (parseFloat(cs.webkitTextStrokeWidth) > 0) { c.strokeStyle = cs.webkitTextStrokeColor; c.lineWidth = parseFloat(cs.webkitTextStrokeWidth) * 2; c.strokeText(txt, q.left, y); }
        c.fillStyle = cs.color; c.fillText(txt, q.left, y);
      }
    }
    c.globalAlpha = 1;
  }
  Q.card = null; // { t: "título", s: "subtítulo", a: 0..1 }
  Q.mirror = () => {
    const big = document.createElement("canvas");
    big.width = 1280; big.height = 720;
    const bx = big.getContext("2d");
    let on = 1;
    (function f() {
      if (!on) return;
      bx.imageSmoothingEnabled = false;
      const k = Q.card;
      if (!k || k.a < 1) {
        const gc = document.querySelector("#gameWrap canvas") || cv, r = gc.getBoundingClientRect();
        bx.fillStyle = "#000"; bx.fillRect(0, 0, 1280, 720);
        const sx = 1280 / innerWidth, sy = 720 / innerHeight;
        bx.drawImage(gc, r.left * sx, r.top * sy, r.width * sx, r.height * sy);
        bx.save(); bx.scale(sx, sy);
        for (const id of ["vignette", "flash", "hud"]) { const el = document.getElementById(id); if (el && !el.classList.contains("hidden")) paintDom(bx, el, 1); }
        bx.restore();
      }
      if (k && k.a > 0) {
        bx.globalAlpha = k.a; bx.fillStyle = "#07050b"; bx.fillRect(0, 0, 1280, 720); bx.globalAlpha = 1;
      }
      if (k && k.t) {
        bx.globalAlpha = Math.min(1, k.ta == null ? 1 : k.ta);
        bx.textAlign = "center"; bx.textBaseline = "middle";
        const y0 = k.low ? 610 : 330;
        if (k.low) { bx.fillStyle = "rgba(7,5,11,.72)"; bx.fillRect(0, y0 - 62, 1280, 110); }
        bx.font = (k.low ? "54px" : "86px") + " Yoster, 'Pixelify Sans', monospace";
        bx.fillStyle = "#000"; bx.fillText(k.t, 643, y0 - 12 + 4);
        bx.fillStyle = "#ffc21a"; bx.fillText(k.t, 640, y0 - 12);
        if (k.s) { bx.font = (k.low ? "24px" : "30px") + " system-ui, sans-serif"; bx.fillStyle = "#ece8f4"; bx.fillText(k.s, 640, y0 + (k.low ? 32 : 58)); }
        bx.globalAlpha = 1;
      }
      requestAnimationFrame(f);
    })();
    big.stop = () => (on = 0);
    return big;
  };
  Q.fade = (to, ms) => new Promise((ok) => {
    Q.card = Q.card || { a: 0 };
    const from = Q.card.a, t0 = performance.now();
    (function f() { const u = Math.min(1, (performance.now() - t0) / ms); Q.card.a = from + (to - from) * u; if (u < 1) requestAnimationFrame(f); else ok(); })();
  });
  Q.wait = (ms) => new Promise((r) => setTimeout(r, ms));
  // grava o canvas espelhado com o som do jogo e manda pro servidor local de gravação (porta 8379)
  Q.start = (big) => {
    const st = big.captureStream(30);
    if (window.__aud) for (const tr of window.__aud.stream.getAudioTracks()) st.addTrack(tr);
    const mt = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus") ? "video/webm;codecs=vp9,opus" : "video/webm";
    const mr = new MediaRecorder(st, { mimeType: mt, videoBitsPerSecond: 2.4e6, audioBitsPerSecond: 96e3 }), ch = [];
    mr.ondataavailable = (e) => e.data.size && ch.push(e.data);
    mr.start(500);
    Q.mr = mr;
    return (name) => new Promise((res) => {
      mr.onstop = () => {
        const bl = new Blob(ch, { type: "video/webm" }), fr = new FileReader();
        fr.onload = () => fetch("http://127.0.0.1:8379/?name=" + encodeURIComponent(name), { method: "POST", body: fr.result }).then((r) => r.text()).then(res, (e) => res("erro " + e));
        fr.readAsDataURL(bl);
      };
      mr.stop();
    });
  };
  // ---------- roteiro: cada trecho é uma partida de verdade num mapa e onda, com a arma que o jogador teria ali ----------
  Q.go = async (mi, wave, load, opts) => {
    Q.bot(false);
    try { toMenu(); } catch (e) {}
    await Q.wait(700);
    S.mi = mi; SAVE.d.tutDone = 1; startGame();
    await Q.wait(2600);
    const p = S.player;
    devKillAll(); S.boss = null; S.bossSpawned = 0;
    if (S.buyPhase) S.buyPhase.active = false;
    S.inter = 0; S.endT = 0;
    for (const d of M().doors) S.opened[d.id] = 1;
    load && load(p);
    p.hp = p.maxHp;
    Object.assign(B, { preferShort: 0, rocketMin: 0, nadeEvery: 0, nadeMin: 0, nadeT: 2 }, opts || {});
    startRound(wave);
    Q.bot(true);
  };
  // grava uma lista de trechos num vídeo só: cartela preta com título enquanto carrega, legenda embaixo no começo
  Q.film = async (name, segs, intro, outro) => {
    const big = Q.mirror();
    Q.card = { a: 1, t: intro ? intro.t : '', s: intro ? intro.s : '' };
    await Q.wait(400);
    const stop = Q.start(big);
    const log = [];
    if (intro) await Q.wait(intro.ms || 2600);
    for (const g of segs) {
      // carregamento fora do vídeo: pausa a gravação, monta a partida e espera a horda aparecer na tela
      Q.card = { a: 1, t: '', s: '' };
      await Q.wait(150);
      Q.mr.pause();
      await Q.go(g.mi, g.wave, g.load, g.opts);
      const t9 = performance.now();
      while (performance.now() - t9 < (g.maxLead || 9000)) {
        const n = S.zs.filter((z) => z.state === 'in' && Math.abs(z.y - S.player.y) < 22 && Math.abs(z.x - S.cam.x - VW / 2) < VW / 2).length;
        if (n >= (g.minZ || 3) && performance.now() - t9 > (g.lead || 1500)) break;
        await Q.wait(100);
      }
      Q.card = { a: 1, t: g.big ? g.t : '', s: g.big ? g.s : '' };
      Q.mr.resume();
      await Q.wait(g.big ? 1700 : 200);
      Q.card = { a: 1, t: '', s: '' };
      await Q.fade(0, 450);
      const p = S.player, k0 = S.stats.kills, t0 = performance.now();
      if (g.t && !g.big) { Q.card = { a: 0, t: g.t, s: g.s, low: 1, ta: 1 }; setTimeout(() => { if (Q.card && Q.card.low) { const c0 = Q.card; const t1 = performance.now(); (function f() { const u = (performance.now() - t1) / 500; c0.ta = Math.max(0, 1 - u); if (u < 1) requestAnimationFrame(f); else c0.t = ''; })(); } }, 3200); }
      let mn = p.hp;
      while (performance.now() - t0 < g.ms) {
        await Q.wait(100);
        mn = Math.min(mn, p.hp);
        if (p.dead || p.hp < p.maxHp * 0.18) break;
        if (g.until && g.until()) { await Q.wait(g.after || 2500); break; }
      }
      log.push({ seg: g.t, wave: g.wave, kills: S.stats.kills - k0, minHp: mn | 0, hp: p.hp | 0, dead: p.dead, sec: ((performance.now() - t0) / 1000) | 0 });
      if (Q.card) Q.card.t = "";
      await Q.fade(1, 450);
      Q.bot(false);
    }
    if (outro) { Q.card = { a: 1, t: outro.t, s: outro.s }; try { toMenu(); } catch (e) {} await Q.wait(outro.ms || 3000); }
    const r = await stop(name);
    big.stop(); Q.card = null;
    return { r, log };
  };

  // um trecho por arquivo: monta a partida fora do vídeo, grava título + jogo, e devolve como foi
  Q.take = async (g, name) => {
    Q.card = { a: 1, t: '', s: '' };
    await Q.go(g.mi, g.wave, g.load, g.opts);
    const t9 = performance.now();
    while (performance.now() - t9 < (g.maxLead || 9000)) {
      const n = S.zs.filter((z) => z.state === 'in' && Math.abs(z.y - S.player.y) < 22 && Math.abs(z.x - S.cam.x - VW / 2) < VW / 2).length;
      if (n >= (g.minZ || 3) && performance.now() - t9 > (g.lead || 1500)) break;
      await Q.wait(100);
    }
    const big = Q.mirror();
    Q.card = { a: 1, t: g.t, s: g.s };
    await Q.wait(300);
    const stop = Q.start(big);
    await Q.wait(1600);
    Q.card.t = '';
    await Q.fade(0, 450);
    const p = S.player, k0 = S.stats.kills, t0 = performance.now(), h0 = p.hp;
    let mn = p.hp, low = 0;
    while (performance.now() - t0 < g.ms) {
      await Q.wait(100);
      mn = Math.min(mn, p.hp);
      if (p.dead || p.hp < p.maxHp * 0.18) { low = 1; break; }
      if (g.until && g.until()) { await Q.wait(g.after || 2500); break; }
    }
    const res = { seg: g.t, kills: S.stats.kills - k0, minHp: mn | 0, h0: h0 | 0, low, sec: ((performance.now() - t0) / 1000) | 0, boss: g.until ? !!g.until() : null };
    await Q.fade(1, 400);
    Q.bot(false);
    res.r = await stop(name);
    big.stop(); Q.card = null;
    return res;
  };
  // junta os trechos escolhidos num vídeo só, tocando cada um num canvas e gravando de novo com o som
  Q.compose = async (urls, name, intro, outro) => {
    const big = document.createElement('canvas'); big.width = 1280; big.height = 720;
    const bx = big.getContext('2d');
    const ac = new AudioContext(), dst = ac.createMediaStreamDestination();
    const st = big.captureStream(30); for (const tr of dst.stream.getAudioTracks()) st.addTrack(tr);
    const mr = new MediaRecorder(st, { mimeType: 'video/webm;codecs=vp9,opus', videoBitsPerSecond: 2.4e6, audioBitsPerSecond: 96e3 }), ch = [];
    mr.ondataavailable = (e) => e.data.size && ch.push(e.data);
    let cur = null, card = null;
    let on = 1;
    (function f() {
      if (!on) return;
      bx.fillStyle = '#07050b'; bx.fillRect(0, 0, 1280, 720);
      if (cur) bx.drawImage(cur, 0, 0, 1280, 720);
      if (card) {
        bx.globalAlpha = card.a == null ? 1 : card.a; bx.textAlign = 'center'; bx.textBaseline = 'middle';
        bx.font = "86px Yoster, monospace"; bx.fillStyle = '#000'; bx.fillText(card.t, 643, 322); bx.fillStyle = '#ffc21a'; bx.fillText(card.t, 640, 318);
        bx.font = '30px system-ui, sans-serif'; bx.fillStyle = '#ece8f4'; bx.fillText(card.s, 640, 388); bx.globalAlpha = 1;
      }
      requestAnimationFrame(f);
    })();
    mr.start(500);
    if (intro) { card = intro; await Q.wait(intro.ms || 2600); card = null; }
    for (const u of urls) {
      const v = document.createElement('video'); v.src = u; v.preload = 'auto';
      await new Promise((ok) => (v.oncanplaythrough = ok));
      const srcN = ac.createMediaElementSource(v); srcN.connect(dst);
      cur = v; await v.play();
      await new Promise((ok) => (v.onended = ok));
      srcN.disconnect(); cur = null;
    }
    if (outro) { card = outro; await Q.wait(outro.ms || 3500); }
    await new Promise((ok) => { mr.onstop = ok; mr.stop(); });
    on = 0;
    const bl = new Blob(ch, { type: 'video/webm' }), fr = new FileReader();
    return new Promise((res) => { fr.onload = () => fetch('http://127.0.0.1:8379/?name=' + encodeURIComponent(name), { method: 'POST', body: fr.result }).then((r) => r.text()).then(res); fr.readAsDataURL(bl); });
  };
})();
