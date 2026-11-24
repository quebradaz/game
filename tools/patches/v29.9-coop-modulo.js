// =====================================================================
//  v29.9 CO-OP (etapa 1): S.players[], parceiros bot, cair e levantar, tela do mapa.
//  S.players = [jogador local, ...bots]. Cada ator: { id, kind: "local" | "bot" | "remote" }.
//  Na etapa online o host simula tudo (zumbis, bots, quedas) e os outros aparelhos entram como "remote":
//  o que hoje é lido de S.input passa a chegar pela rede; zTarget, fall/revStep e hurt já tratam a lista.
// =====================================================================
const COOP = (function () {
  const C = () => CONFIG.coop;
  // parceiros: gente da quebrada (o Juninho é o do lava-rápido)
  const BOTS = [
    { id: "juninho", name: "JUNINHO", look: { skin: 5, eyes: 1, hair: 1, hairC: 1, body: 0 }, eq: { hat: "bone_vermelho", chest: "camisa_time", legs: "bermuda", feet: "tenis_branco", belt: "cinto" }, guns: ["pistol", "uzi", "rifle", "aug"] },
    { id: "luana", name: "LUANA", look: { skin: 3, eyes: 0, hair: 9, hairC: 0, body: 1 }, eq: { chest: "jaqueta_jeans", legs: "jeans_claro", feet: "tenis_preto", belt: "cinto" }, guns: ["glock", "smg", "m4", "scar"] }
  ];
  // lore curta de cada quebrada (a mesma voz da rádio pirata do trailer)
  const LORE = {
    adega: "Foi da adega do Marcão que a rádio pirata mandou o primeiro chamado. Onze cômodos ligados por beco e laje, e a horda subindo o morro pela porta dos fundos. Aqui a quebrada aprendeu cedo: ninguém vem salvar ninguém.",
    lava: "O lava-rápido do Juninho virou trincheira: mangueira de pressão, cera e chumbo. Os primeiros infectados vieram pela avenida, e o Juninho jura que viu farda preta no meio deles.",
    quadra: "Era final de campeonato quando o apagão chegou. A torcida não foi embora: virou horda. Segura a quadra até o apito final, porque ninguém mais vai apitar.",
    laje: "O paredão do baile nunca desligou. O gerador segura o som, e o som chama eles. Da laje dá pra ver o morro inteiro queimando, e foi aqui que o Observador abriu o olho pela primeira vez.",
    cristo: "No alto do Corcovado, onde a cidade inteira vinha rezar, a neblina não levanta mais. Quem subiu pra pedir proteção não desceu. Os braços do Cristo seguem abertos, mas o Capitão Caveira chegou primeiro.",
    copa: "Na praia mais famosa do mundo não sobrou turista, só o que a maré devolve. Hotel, calçadão e areia viraram linha de frente. Dizem que os helicópteros só passaram por Copacabana pra ir embora.",
    lapa: "Nos Arcos a noite nunca acaba: o bonde parou lotado e o samba virou grito. É daqui que a rádio pirata manda o último aviso: o Hell de Janeiro foi só o começo."
  };
  let want = null;
  const getWant = () => {
    if (want == null) want = clamp((SAVE.d && SAVE.d.coopBots) | 0, 0, CONFIG.coop.maxBots);
    return want;
  };
  const setWant = (n) => {
    want = clamp(n | 0, 0, C().maxBots);
    try { SAVE.d.coopBots = want; SAVE.save && SAVE.save(); } catch (e) {}
  };
  const bots = () => S.bots || [];
  const party = () => S.mode === "play" && !S.attract && S.bots ? 1 + S.bots.length : 1;
  const mul = (k) => 1 + (C()[k] || 0) * (party() - 1);
  const add = (k) => (C()[k] || 0) * (party() - 1);
  const lvl = () => party() > 1 ? C().lvl : 0;
  const standing = () => bots().filter((b) => !b.out && !(b.down > 0));
  const pan = (x) => clamp((x - S.cam.x) / VW * 2 - 1, -1, 1);

  // ---------- visual dos bots: folhas do rig próprias (sem as variações de mira), montadas aos poucos ----------
  const LK = {};
  let pumping = 0;
  function look(i) {
    const B = BOTS[i];
    if (LK[B.id]) return LK[B.id];
    if (typeof rigBuildSheet !== "function" || typeof RIG_ANIMS === "undefined") return null;
    const L = rigNormLook(B.look), E = rigNormEq(B.eq);
    const c = { sheets: {}, img: {}, L, E, key: "bot:" + B.id, pending: Object.keys(RIG_ANIMS).map((n) => [n, 0]) };
    const up = rigArmCols(E.chest, L, false);
    c.arm = { up: up.up.base, upD: up.up.shade, fore: up.fore.base, foreD: up.fore.shade, sl: up.sl, cuff: up.cuff || null, skin: L.skinP.base, skinD: L.skinP.shade };
    LK[B.id] = c;
    if (!pumping) { pumping = 1; setTimeout(pump, 0); }
    return c;
  }
  function pump() {
    const t0 = performance.now();
    let left = 0;
    for (const k in LK) {
      const c = LK[k];
      while (c.pending.length && performance.now() - t0 < 7) {
        const j = c.pending.shift();
        try { rigBuildSheet(c, j[0], j[1]); } catch (e) { console.warn("bot look", e); }
      }
      left += c.pending.length;
    }
    if (left) setTimeout(pump, 24);
    else pumping = 0;
  }
  // desenha o bot com as folhas dele: troca as folhas do rig e as cores do braço só durante o desenho
  let RK = null, RKk = "", RKt = -9;
  function rigKeys() {
    const k = RIG_CUR ? RIG_CUR.key : "";
    if (RK && k === RKk && S.t - RKt < 2) return RK;
    RK = [];
    for (const n in SHEETS) if (SHEETS[n] && SHEETS[n].rig) RK.push(n);
    RKk = k;
    RKt = S.t;
    return RK;
  }
  const SV = [], ARM = {};
  function withLook(b, fn) {
    const c = b.lk;
    if (!c || !c.sheets[Object.keys(c.sheets)[0]]) return fn();
    const ks = rigKeys(), A = CHARS[S.ci].arm;
    for (let i = 0; i < ks.length; i++) {
      const k = ks[i];
      SV[i] = SHEETS[k];
      SV[i + ks.length] = IMG[k];
      SHEETS[k] = c.sheets[k];
      IMG[k] = c.img[k];
    }
    for (const k in c.arm) { ARM[k] = A[k]; A[k] = c.arm[k]; }
    try { fn(); } finally {
      for (let i = 0; i < ks.length; i++) {
        SHEETS[ks[i]] = SV[i];
        IMG[ks[i]] = SV[i + ks.length];
      }
      for (const k in c.arm) A[k] = ARM[k];
    }
  }

  // ---------- partida ----------
  function gunFor(B, n2) {
    const g = B.guns, id = n2 < 4 ? g[0] : n2 < 8 ? g[1] : n2 < 12 ? g[2] : g[3];
    return WEAP[id] ? id : "pistol";
  }
  function giveGun(b, id) {
    const w = { id, rk: "white", mag: 0, res: 9999 };
    w.mag = wst(w).mag;
    b.ws = [null, w];
    b.cur = 1;
  }
  function makeBot(i) {
    const B = BOTS[i], m = M(), b = newPlayer();
    Object.assign(b, {
      bot: 1, kind: "bot", id: "bot" + (i + 1), idx: i, name: B.name,
      x: m.start[0] - (i + 1) * 28, hp: Math.round(CONFIG.player.hp * C().botHp), cash: 0,
      react: 0, tgt: null, thinkT: rnd(0, 0.15), lost: 0, rev: 0, revAt: -9, down: 0, out: 0, runT: 0, kite: 0, hurtT: 0, iT: 0, relMax: 1
    });
    b.maxHp = b.hp;
    giveGun(b, gunFor(B, 1));
    b.lk = look(i);
    return b;
  }
  function reset(attract) {
    S.bots = [];
    S.players = S.player ? [S.player] : [];
    if (!S.player) return;
    Object.assign(S.player, { id: "p1", kind: "local", name: (SAVE.d && SAVE.d.name) || "VOCÊ" });
    if (attract) return;
    const n = getWant();
    for (let i = 0; i < n; i++) S.bots.push(makeBot(i));
    S.players.push(...S.bots);
  }
  function place(b, p) {
    b.x = p.x - (p.face || 1) * (C().slots[b.idx] || 40);
    b.y = b.gy = p.onGround ? p.y : p.gy != null ? p.gy : p.y;
    b.plat = p.plat;
    b.vx = b.vy = 0;
    b.onGround = true;
    b.dropT = 0;
    // não cai do outro lado de uma parede
    if (wallBetween(b.x, p.x, b.y)) b.x = p.x;
  }
  function puff(b) {
    for (let i = 0; i < 10; i++) S.parts.push({ x: b.x + rnd(-8, 8), y: b.y - rnd(4, 40), vx: rnd(-40, 40), vy: rnd(-60, -10), life: 0.5, max: 0.5, col: "#8a8378", sz: 2, g: -20, smoke: 1 });
  }
  function round(n2) {
    if (!bots().length || !S.player) return;
    for (const b of bots()) {
      const B = BOTS[b.idx], id = gunFor(B, n2);
      if (b.out) {
        b.out = 0;
        b.down = 0;
        b.dead = false;
        b.hp = Math.round(b.maxHp * 0.5);
        b.anim = "Idle";
        b.at = 0;
        b.iT = 1.5;
        place(b, S.player);
        puff(b);
        UI.toast(b.name + " VOLTOU", "#7dff6a");
      } else if (!(b.down > 0)) b.hp = Math.min(b.maxHp, b.hp + b.maxHp * 0.25);
      if (b.ws[1].id !== id) giveGun(b, id);
    }
  }

  // ---------- cair e levantar ----------
  function fall(p) {
    if (!standing().length) return false;
    p.hp = 0;
    p.down = C().bleed;
    p.rev = 0;
    p.revAt = -9;
    p.anim = "Dead";
    p.at = 0;
    p.vx = 0;
    p.relT = 0;
    S.input.fire = false;
    S.cam.shake = Math.max(S.cam.shake, 7);
    UI.toast("VOCÊ CAIU! AGUENTA QUE O PARCEIRO TE LEVANTA", "#ff6a4a");
    SFX.hurt();
    vibe(60);
    return true;
  }
  function die(p) {
    p.down = 0;
    p.hp = 0;
    p.dead = true;
    p.anim = "Dead";
    p.at = Math.max(p.at, 4);
    p.deadT = 0;
    SFX.over();
  }
  function downTick(p, dt) {
    p.at = Math.min(4.9, p.at + dt * 8);
    p.vx = 0;
    phys(p, dt);
    p.down -= dt * (S.t - p.revAt < 0.15 ? 0.25 : 1);
    if (S.t - p.revAt > 0.15) p.rev = Math.max(0, p.rev - dt * 0.6);
    if (p.down <= 0 || !standing().length && S.t - p.revAt > 0.15) die(p);
  }
  // quem levanta segura o tempo inteiro; soltar perde o progresso aos poucos
  function revStep(t, dt, who) {
    if (!(t.down > 0)) return;
    t.revAt = S.t;
    t.rev += dt;
    who.revving = t;
    const need = who.bot ? C().botReviveT : C().reviveT;
    t.revNeed = need;
    if (t.rev >= need) {
      t.down = 0;
      t.rev = 0;
      t.hp = Math.round(t.maxHp * C().reviveHp);
      t.iT = C().reviveIT;
      t.anim = "Idle";
      t.at = 0;
      t.hurtT = 0;
      t.regenT = 1;
      SFX.power && SFX.power();
      for (let i = 0; i < 12; i++) S.parts.push({ x: t.x + rnd(-10, 10), y: t.y - rnd(4, 40), vx: rnd(-30, 30), vy: rnd(-90, -30), life: 0.6, max: 0.6, col: "#7dff6a", sz: 1, g: -30 });
      if (t === S.player) UI.toast(who.name + " TE LEVANTOU!", "#7dff6a");
      else UI.toast(t.name + " LEVANTOU!", "#7dff6a");
    }
  }
  function reviveNear(p) {
    for (const b of bots()) if (b.down > 0 && Math.abs(b.x - p.x) < 30 && Math.abs(b.y - p.y) < 14) return b;
    return null;
  }
  function hurt(b, d, kb) {
    if (b.out || b.down > 0 || b.iT > 0) return;
    b.hp -= d * C().botTaken;
    b.hurtT = 0.3;
    b.iT = 0.35;
    b.regenT = C().regenDelay;
    if (kb) {
      b.vx = kb;
      b.vy = Math.min(b.vy, -120);
      b.onGround = false;
      b.kbT = 0.3;
    }
    if (b.hp <= 0) {
      b.hp = 0;
      b.down = C().bleed;
      b.rev = 0;
      b.revAt = -9;
      b.anim = "Dead";
      b.at = 0;
      b.relT = 0;
      UI.toast(b.name + " CAIU! SEGURE AÇÃO PERTO PRA LEVANTAR", "#ff9a3c");
    }
  }

  // ---------- IA: segue você, atira com reação humana, levanta quem cai ----------
  // mesma navegação dos zumbis (plataformas, escadas, links); se ficar perdido, reaparece atrás de você
  function nav(b, t, spd) {
    let wantX = t.x;
    const same = (Math.abs((t.onGround ? t.y : t.gy != null ? t.gy : t.y) - b.y) < 8 || b.onGround && b.plat && b.plat === t.plat) && !wallBetween(b.x, t.x, b.y);
    if (same || !b.onGround) return [wantX, same];
    if (t.onGround && t.y < b.y && b.y - t.y < 74 && Math.abs(t.x - b.x) < 46 && b.jumpCd <= 0 && !(t.plat && t.plat.st)) {
      b.vy = -Math.sqrt(2 * GRAV * (b.gy - t.y + 12));
      b.vx = Math.sign(t.x - b.x) * Math.max(40, spd);
      b.onGround = false;
      b.jumpCd = 0.8;
      b.navJ = 0.5;
      return [wantX, false];
    }
    let ST = null;
    if (b.y < G0 - 10 && t.y > b.y + 20 && !(b.plat && b.plat.st) && (ST = zStairTop(b))) {
      if (Math.abs(ST[0] - b.x) > 5) return [ST[0], false];
      b.plat = ST[2];
      b.y = b.gy = surfY(ST[2], b.x);
      b.vy = 0;
      return [ST[1], false];
    }
    const st = navNext(b, t);
    if (st) {
      const L = st.e.l;
      if (L.walk) return [L.x + (st.up ? L.dir : -L.dir) * 18, false];
      if (L.mount) {
        if (st.up) {
          if (Math.abs(b.x - L.x) < 7) {
            const s2 = st.e.hi;
            b.y = b.gy = surfY(s2, b.x);
            b.vy = 0;
            b.plat = s2;
          }
          return [L.x, false];
        }
        return [L.x - L.dir * 30, false];
      }
      if (Math.abs(b.x - L.x) < 6) {
        if (st.up) {
          const hp = st.e.hi;
          b.vy = -Math.sqrt(2 * GRAV * (b.gy - L.hi + 14));
          b.vx = (L.dir != null ? L.dir : Math.sign((hp.x1 + hp.x2) / 2 - b.x) || 1) * Math.max(34, spd * 0.6);
          b.onGround = false;
          b.navJ = 0.6;
        } else if (b.plat && b.plat.ow) b.dropT = 0.25;
      }
      return [L.x, false];
    }
    if (t.y > b.y && b.plat && b.plat.ow && Math.abs(t.x - b.x) < 24) b.dropT = 0.25;
    return [wantX, false];
  }
  function los(x0, y0, x1, y1) {
    const dx = x1 - x0, dy = y1 - y0, d = Math.hypot(dx, dy) || 1;
    return wallT(x0, y0, dx / d, dy / d) >= d - 4;
  }
  function think(b) {
    const p = S.player, R = C().range;
    let best = null, bs = 1e9;
    for (const z of S.zs) {
      if (z.state === "dead" || z.emerge > 0.2 || z.lab) continue;
      if (z.state === "out" && Math.abs(z.x - b.x) > 120) continue;
      const dx = Math.abs(z.x - b.x), dy = Math.abs(z.y - b.y);
      if (dx > R || dy > 120) continue;
      // protege você: zumbi perto do jogador pesa mais
      const sc = dx + dy * 1.5 + Math.abs(z.x - p.x) * 0.5 - (z === b.tgt ? 40 : 0);
      if (sc < bs && los(b.x + b.face * 10, b.y - 40, z.x, z.y - z.h * 0.55)) { bs = sc; best = z; }
    }
    if (best !== b.tgt) {
      b.tgt = best;
      const [r0, r1] = C().react;
      b.react = rnd(r0, r1) * (S.period === "noite" ? 1.2 : 1);
    }
  }
  function shoot(b, z) {
    const w = b.ws[b.cur], W = WEAP[w.id], st = wst(w);
    if (w.mag <= 0) {
      b.relT = b.relMax = st.rel * 1.25;
      b.relSnd = 0;
      return;
    }
    w.mag--;
    b.fireT = st.rate * C().rateMul * rnd(0.9, 1.3);
    const mx = b.x + b.face * 16, my = b.y - 40, head = Math.random() < C().headP;
    const hy = head ? z.y - z.h + z.headH * 0.5 : z.y - z.h * rnd(0.35, 0.7);
    const d = Math.hypot(z.x - mx, hy - my), [a0, a1] = C().acc;
    const hitP = (a0 - (a0 - a1) * Math.min(1, d / C().range)) * (S.period === "noite" ? 0.9 : 1) * (b.hurtT > 0 ? 0.7 : 1);
    let a = Math.atan2(hy - my, z.x - mx);
    const hit = Math.random() < hitP;
    if (!hit) a += (Math.random() < 0.5 ? -1 : 1) * rnd(0.06, 0.16);
    b.aim = a;
    b.kick = GUNKICK[W.kind] || 2;
    b.flashT = 0.05;
    const dx = Math.cos(a), dy = Math.sin(a), end = Math.min(W.range || 720, wallT(mx, my, dx, dy));
    let stop = end;
    if (hit) {
      stop = Math.min(end, d);
      let dmg = st.dmg * W.pellets * C().botDmg * (head ? critMul(W.kind) * 0.8 : 1) * (z.boss ? C().botBossDmg : 1);
      S.byBot = 1;
      S.hitA = a;
      try { hurtZ(z, dmg, head, "gun", dx, z.x, hy); } finally {
        S.byBot = 0;
        S.hitA = void 0;
      }
    }
    // som um pouco mais baixo que o seu; o tiro continua com a cara da arma
    if (Math.random() < 0.85) SFX.shot(w.id, pan(mx) * 0.9);
    muzzleFlash(w.id, W.kind, mx, my, a);
    S.tracers.push({ x0: mx, y0: my, x1: mx + dx * stop, y1: my + dy * stop, life: 0.05, laser: 0, col: "#ffe08a" });
  }
  function setAnim(b, a) {
    if (b.anim === a) return;
    const o = RIG_ANIMS[b.anim], nA = RIG_ANIMS[a];
    b.at = o && o.cyc && nA && nA.cyc ? ((b.at / o.n % 1 + 1) % 1) * nA.n : 0;
    b.anim = a;
  }
  function tickBot(b, dt) {
    const p = S.player, K = C();
    b.fireT -= dt;
    if (b.iT > 0) b.iT -= dt;
    if (b.hurtT > 0) b.hurtT -= dt;
    if (b.jumpCd > 0) b.jumpCd -= dt;
    if (b.kbT > 0) b.kbT -= dt;
    if (b.flashT > 0) b.flashT -= dt;
    b.kick = Math.max(0, b.kick - dt * 30);
    b.revving = null;
    if (b.out) return;
    if (b.down > 0) {
      b.at = Math.min(4.9, b.at + dt * 8);
      b.vx = 0;
      phys(b, dt);
      b.down -= dt * (S.t - b.revAt < 0.15 ? 0.25 : 1);
      if (S.t - b.revAt > 0.15) b.rev = Math.max(0, b.rev - dt * 0.6);
      if (b.down <= 0) {
        b.down = 0;
        b.out = 1;
        puff(b);
        UI.toast(b.name + " FICOU PRA TRÁS · VOLTA NA PRÓXIMA ONDA", "#c9a0ff");
      }
      return;
    }
    b.regenT -= dt;
    if (b.regenT <= 0 && b.hp < b.maxHp) b.hp = Math.min(b.maxHp, b.hp + K.regen * dt);
    if (b.relT > 0) {
      b.relT -= dt;
      if (b.relT <= 0) {
        b.relT = 0;
        const w = b.ws[b.cur];
        w.mag = wst(w).mag;
      }
    }
    // 1) levantar quem caiu (você primeiro); o outro bot só se estiver perto de você
    let rv = null;
    if (p.down > 0) rv = p;
    else for (const o of bots()) if (o !== b && o.down > 0 && Math.abs(o.x - p.x) < VW * 0.6) rv = o;
    const spd = CONFIG.player.speed;
    let goal, tgtObj, run = false;
    if (rv) {
      goal = rv.x - (rv.x > b.x ? 10 : -10);
      tgtObj = { x: goal, y: rv.y, gy: rv.gy != null ? rv.gy : rv.y, plat: rv.plat, onGround: true };
      run = Math.abs(rv.x - b.x) > 40;
    } else {
      // 2) seguir você: fica atrás de você, no lado oposto pra onde você olha; não grudado
      const side = -(p.face || 1), slot = K.slots[b.idx] || 40;
      goal = p.x + side * slot;
      tgtObj = { x: goal, y: p.y, gy: p.gy, plat: p.plat, onGround: p.onGround };
      run = Math.abs(p.x - b.x) > 110 || p.running;
    }
    // perdido (outro andar sem caminho, preso atrás de porta) ou longe demais: reaparece atrás de você
    const far = Math.abs(p.x - b.x) + Math.abs(p.y - b.y) * 2;
    if (far > 150) b.lost += dt;
    else b.lost = Math.max(0, b.lost - dt * 2);
    if (p.onGround && !(p.down > 0 && rv !== p) && (far > VW * K.farScreens || b.lost > K.lostT && (!onScreen(b.x, b.y, 20) || b.lost > K.lostT * 1.6))) {
      puff(b);
      place(b, p);
      puff(b);
      b.lost = 0;
    }
    // 3) mira e tiro
    b.thinkT -= dt;
    if (b.thinkT <= 0) {
      b.thinkT = 0.15;
      if (!rv || Math.abs(rv.x - b.x) > 60) think(b);
      else b.tgt = null;
    }
    const z = b.tgt && b.tgt.state !== "dead" ? b.tgt : null;
    if (!z) b.tgt = null;
    if (b.react > 0) b.react -= dt;
    // zumbi colado: dá um passo pra trás (pra perto de você)
    let near = null;
    for (const q of S.zs) if (q.state === "in" && Math.abs(q.x - b.x) < 26 && Math.abs(q.y - b.y) < 12) { near = q; break; }
    const [wx, same] = nav(b, tgtObj, spd);
    let vx = 0;
    if (b.onGround && !(b.navJ > 0) && !(b.kbT > 0)) {
      const dx = wx - b.x, close = Math.abs(goal - b.x) < (rv ? 6 : K.slack) && (same || rv);
      // recua só se o passo pra trás não o afasta de você (senão a horda arrasta o bot pra longe)
      const back = near && -Math.sign(near.x - b.x);
      if (near && !rv && (Math.abs(p.x - b.x) < 70 || Math.sign(p.x - b.x) === back)) vx = back * spd * 0.9;
      else if (!close && Math.abs(dx) > 3) vx = Math.sign(dx) * spd * (run ? CONFIG.player.runMult : 1);
      // os dois bots não ficam um em cima do outro: o segundo dá um passo pro lado de fora
      if (!vx && !rv) for (const o of bots()) if (o !== b && o.idx < b.idx && !o.out && !(o.down > 0) && Math.abs(o.x - b.x) < 16 && Math.abs(o.y - b.y) < 8) vx = (Math.sign(b.x - p.x) || -1) * spd * 0.6;
      b.vx = vx;
    }
    if (b.navJ > 0) {
      b.navJ -= dt;
      if (b.onGround && b.navJ < 0.45) b.navJ = 0;
    }
    b.running = Math.abs(b.vx) > spd * 1.1;
    if (rv && Math.abs(rv.x - b.x) < 16 && Math.abs(rv.y - b.y) < 14 && b.onGround) {
      b.vx = 0;
      b.face = Math.sign(rv.x - b.x) || b.face;
      revStep(rv, dt, b);
    } else if (z) {
      b.face = Math.sign(z.x - b.x) || b.face;
      const ta = Math.atan2(z.y - z.h * 0.55 - (b.y - 40), z.x - b.x);
      let da = ta - b.aim;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      b.aim += da * Math.min(1, dt * 10);
      if (b.react <= 0 && b.fireT <= 0 && b.relT <= 0 && b.onGround) shoot(b, z);
    } else {
      if (Math.abs(b.vx) > 1) b.face = Math.sign(b.vx);
      const ta = b.face > 0 ? 0.12 : Math.PI - 0.12;
      let da = ta - b.aim;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      b.aim += da * Math.min(1, dt * 5);
      const w = b.ws[b.cur];
      if (b.relT <= 0 && w.mag < wst(w).mag * 0.5) {
        b.relT = b.relMax = wst(w).rel * 1.25;
        b.relSnd = 0;
      }
    }
    phys(b, dt);
    {
      const i = M().inner;
      b.x = clamp(b.x, i[0] - 40, i[1] + 40);
    }
    if (!b.onGround) setAnim(b, "Idle");
    else if (Math.abs(b.vx) > 12) {
      const a = b.running ? "Run" : "Walk", RA = RIG_ANIMS[a];
      setAnim(b, a);
      b.at += dt * RA.n * Math.abs(b.vx) / RA.stride * (Math.sign(b.vx) === b.face ? 1 : -1);
    } else {
      setAnim(b, "Idle");
      b.at += dt * 1e3 / RIG_ANIMS.Idle.ms;
    }
    if (b.hurtT > 0.18 && b.onGround) {
      b.anim = "Hurt";
      b.at = (0.3 - b.hurtT) * 20;
    }
  }
  function update(dt) {
    if (!S.bots || !S.bots.length || !S.player) return;
    for (const b of S.bots) tickBot(b, dt);
  }

  // ---------- desenho ----------
  function draw(g) {
    if (!S.bots || !S.bots.length) return;
    const x0 = S.cam.x - 60, x1 = S.cam.x + VW + 60;
    for (const b of S.bots) {
      if (b.out || b.x < x0 || b.x > x1) continue;
      withLook(b, () => drawPlayer(g, b));
    }
  }
  function bar(g, x, y, w, f, col) {
    g.fillStyle = "rgba(0,0,0,.65)";
    g.fillRect(Math.round(x - w / 2) - 1, Math.round(y) - 1, w + 2, 4);
    g.fillStyle = col;
    g.fillRect(Math.round(x - w / 2), Math.round(y), Math.max(0, Math.round(w * f)), 2);
  }
  function ring(g, x, y, f, col) {
    g.strokeStyle = "rgba(0,0,0,.6)";
    g.lineWidth = 4;
    g.beginPath();
    g.arc(Math.round(x), Math.round(y), 9, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = col;
    g.lineWidth = 2;
    g.beginPath();
    g.arc(Math.round(x), Math.round(y), 9, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * clamp(f, 0, 1));
    g.stroke();
  }
  function drawTags(g) {
    const L = S.players;
    if (!L || L.length < 2) return;
    const x0 = S.cam.x - 40, x1 = S.cam.x + VW + 40;
    for (const a of L) {
      if (a.out || a.dead || a.x < x0 || a.x > x1) continue;
      const top = a.y - 86;
      if (a.down > 0) {
        const f = a.rev / (a.revNeed || C().reviveT);
        const t = a.rev > 0 ? "LEVANTANDO" : "CAIDO " + Math.ceil(a.down);
        const oy = a.bot ? a.idx * 12 + 12 : 0;
        drawTxt(g, t, a.x - textW(t) / 2, a.y - 52 - oy, a.rev > 0 ? "#7dff6a" : (S.t * 3 | 0) % 2 ? "#ff6a4a" : "#ffd84a", "#000");
        ring(g, a.x, a.y - 30, a.rev > 0 ? f : a.down / C().bleed, a.rev > 0 ? "#7dff6a" : "#ff6a4a");
        if (a.bot && S.player && !(S.player.down > 0) && Math.abs(S.player.x - a.x) < 30 && Math.abs(S.player.y - a.y) < 14 && !(a.rev > 0)) drawTxt(g, "SEGURE ACAO", a.x - textW("SEGURE ACAO") / 2, a.y - 64, "#fff", "#000");
        continue;
      }
      if (!a.bot) continue;
      const ty = top - a.idx * 11;
      drawTxt(g, a.name, a.x - textW(a.name) / 2, ty, "#9ad8ff", "#000");
      if (a.hp < a.maxHp) bar(g, a.x, ty + 10, 22, a.hp / a.maxHp, a.hp / a.maxHp < 0.35 ? "#ff4a4a" : "#7dff6a");
    }
    // seta na borda: parceiro caído fora da tela
    for (const b of bots()) if (b.down > 0 && (b.x < S.cam.x || b.x > S.cam.x + VW)) {
      const l = b.x < S.cam.x, x = l ? S.cam.x + 10 : S.cam.x + VW - 10, y = clamp(b.y - 40, 30, G0 - 20);
      g.fillStyle = (S.t * 3 | 0) % 2 ? "#ff6a4a" : "#ffd84a";
      g.beginPath();
      g.moveTo(x + (l ? -6 : 6), y);
      g.lineTo(x + (l ? 4 : -4), y - 6);
      g.lineTo(x + (l ? 4 : -4), y + 6);
      g.fill();
    }
  }

  // ---------- tela do mapa: zoom + lore + parceiros ----------
  let mzOpen = false;
  function botBtn(n) {
    const b = document.createElement("button");
    b.setAttribute("role", "radio");
    b.dataset.n = n;
    b.setAttribute("aria-label", n === 0 ? "Sozinho" : n === 1 ? "Um parceiro" : "Dois parceiros");
    for (let i = 0; i < n; i++) {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 48;
      try {
        const x = cv.getContext("2d"), B = BOTS[i];
        x.imageSmoothingEnabled = false;
        rigDrawFrame(x, 22, 84, rigNormLook(B.look), rigNormEq(B.eq), "Idle", 0, 1, { aura: false });
      } catch (e) {}
      b.append(cv);
    }
    b.append(document.createTextNode(n === 0 ? "SÓ EU" : n === 1 ? "+1" : "+2"));
    b.onclick = () => {
      setWant(n);
      paintBots();
      SFX.swap && SFX.swap();
      if (n) for (let i = 0; i < n; i++) look(i);
    };
    return b;
  }
  function diffText(n) {
    if (!n) return "Sozinho: dificuldade normal.";
    const K = C(), names = BOTS.slice(0, n).map((b) => b.name).join(" e ");
    return `Com ${names}: horda +${Math.round(K.count * n * 100)}%, zumbis +${Math.round(K.hp * n * 100)}% de vida e um nível de pressão acima.`;
  }
  function paintBots() {
    const box = $("mzBots"), n = getWant();
    if (!box.children.length) for (let i = 0; i <= C().maxBots; i++) box.append(botBtn(i));
    [...box.children].forEach((e) => e.setAttribute("aria-checked", +e.dataset.n === n ? "true" : "false"));
    $("mzDiff").textContent = diffText(n);
  }
  function openMap(i, card) {
    const m = MAPS[i];
    if (!m || !unlocked(i)) return;
    S.mi = i;
    const ov = $("mapZoom"), im = $("mzImg"), host = $("select");
    $("mzCamp").textContent = (CAMPAIGNS[curCamp] || CAMPAIGNS[0]).name;
    $("mzName").textContent = m.name;
    $("mzSub").textContent = m.sub || "";
    $("mzLore").textContent = LORE[m.id] || m.sub || "";
    paintBots();
    // imagem grande do cenário (a mesma prévia do card, em 640x360)
    let url = "";
    try { url = scenePreview(i, 640, 360).toDataURL("image/jpeg", 0.82); } catch (e) {}
    im.style.backgroundImage = url ? `url(${url})` : "";
    const hr = host.getBoundingClientRect(), src = card && card.querySelector("canvas");
    const r = src ? src.getBoundingClientRect() : { left: hr.left + hr.width * 0.3, top: hr.top + hr.height * 0.3, width: hr.width * 0.4, height: hr.height * 0.4 };
    ov.classList.remove("hidden", "in", "live");
    Object.assign(im.style, { left: r.left - hr.left + "px", top: r.top - hr.top + "px", width: r.width + "px", height: r.height + "px" });
    mzOpen = true;
    void ov.offsetWidth;
    ov.classList.add("in");
    requestAnimationFrame(() => {
      Object.assign(im.style, { left: "0px", top: "0px", width: hr.width + "px", height: hr.height + "px" });
      setTimeout(() => { if (mzOpen) ov.classList.add("live"); }, 380);
    });
    SFX.swap && SFX.swap();
    for (let k = 0; k < getWant(); k++) look(k);
    setTimeout(() => { try { $("mzGo").focus({ preventScroll: true }); } catch (e) {} }, 520);
  }
  function closeMap(now) {
    const ov = $("mapZoom");
    if (!ov || !mzOpen) return;
    mzOpen = false;
    ov.classList.remove("live", "in");
    ov.classList.add("hidden");
  }
  function prepare() {
    for (let k = 0; k < getWant(); k++) look(k);
  }
  addEventListener("keydown", (e) => {
    if (!mzOpen) return;
    if (e.code === "Escape") { e.preventDefault(); closeMap(); }
  });

  return { BOTS, LORE, party, mul, add, lvl, reset, round, fall, downTick, revStep, reviveNear, hurt, update, draw, drawTags, openMap, closeMap, prepare, want: getWant, setWant, standing, look };
})();
