// v29.10: bots do co-op como jogadores independentes.
//  - Cada bot escolhe a própria posição na área onde você está (não anda colado atrás de você como pet),
//    troca de posição de tempos em tempos e fica mais perto do grupo quando a horda aperta.
//  - Repara barricada danificada da sua área (na pausa sempre; na onda quando não tem zumbi em cima dele).
//  - Dinheiro individual: acerto, abate e tábua pregada pelo bot vão pra carteira DELE (b.cash), nada cai pra você.
//    Com o dinheiro dele o bot compra arma melhor no começo da onda (acompanha o seu progresso).
//    Na etapa online cada jogador "remote" terá a carteira dele do mesmo jeito.
//  - Você abriu porta e mudou de área: os bots replanejam na hora e vão pra lá; longe demais, reaparecem perto.
// Uso: node tools/patches/v29.10-bots-independentes.js index.html
const fs = require('fs');
const path = require('path');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 90));
  s = s.split(a).join(b);
};

// ---------------------------------------------------------------- CONFIG
rep(`    slots: [36, 72], slack: 14, lostT: 6, farScreens: 1.15`,
`    slots: [36, 72], slack: 14, lostT: 6, farScreens: 1.15,
    // v29.10: posição própria na sua área (fração da tela pra cada lado), mais perto quando a horda aperta;
    // tempo pra trocar de posição; reparo (s por tábua) e teto de grana por barricada pro bot
    spread: 0.36, tight: 0.2, postT: [4, 8], repT: 0.8, plankCap: 40, cash0: 500`);

// ---------------------------------------------------------------- dinheiro individual
rep(`    if (S.player && !S.byBot) addCash(CONFIG.pts.hit);`,
`    if (S.byBot) S.byBot.cash += CONFIG.pts.hit;
    else if (S.player) addCash(CONFIG.pts.hit);`);
rep(`    if (src === "nuke" || z.boss) addCash(val, true);
    else {`, `    if (S.byBot) {
      // v29.10: abate do bot vai pra carteira dele (dinheiro é individual por jogador)
      const D = CONFIG.drops, zv = ZV[z.v], mul = z.boss || src === "nuke" ? 1 : z.ab === "brute" ? D.bruteMul : zv && (zv.ab || zv.acc) ? D.abMul : 1;
      S.byBot.cash += Math.round(val * mul);
    } else if (src === "nuke" || z.boss) addCash(val, true);
    else {`);
rep(`scaleCash(val * mul * (S.byBot ? CONFIG.coop.cashMul : 1))`, `scaleCash(val * mul)`);
rep(`      S.byBot = 1;
      S.hitA = a;`, `      S.byBot = b;
      S.hitA = a;`);

// ---------------------------------------------------------------- bot nasce com carteira própria
rep(`      x: m.start[0] - (i + 1) * 28, hp: Math.round(CONFIG.player.hp * C().botHp), cash: 0,`,
`      x: m.start[0] - (i + 1) * 28, hp: Math.round(CONFIG.player.hp * C().botHp), cash: C().cash0, job: null, pRoom: -1, repT: 0, spdK: 0.94 + i * 0.07,`);

// ---------------------------------------------------------------- arma: o bot compra com o dinheiro dele
rep(`      const B = BOTS[b.idx], id = gunFor(B, n2);`, `      const B = BOTS[b.idx], id = gunFor(B, n2);
      b.job = null;`);
rep(`      if (b.ws[1].id !== id) giveGun(b, id);
    }`, `      if (b.ws[1].id !== id && !(b.out || b.down > 0)) {
        const pr = WEAP[id].price || 0;
        if (b.cash >= pr) {
          b.cash -= pr;
          giveGun(b, id);
          UI.toast(b.name + " COMPROU " + WEAP[id].name, "#9ad8ff");
        }
      }
    }`);

// ---------------------------------------------------------------- planejar posição / reparo
rep(`  function los(x0, y0, x1, y1) {`, `  // v29.10: onde o bot quer estar. Barricada danificada da sua área primeiro; senão um ponto próprio no seu andar,
  // dentro da sala onde você está, longe de você e do outro bot. Com horda perto o raio encolhe (fecha com o grupo).
  function barFree(bar, b) {
    return !bots().some((o) => o !== b && o.job && o.job.bar === bar);
  }
  function plan(b, p) {
    const m = M(), K = C(), pr = roomIdx(m, p.x), lvlY = p.onGround ? p.y : p.gy != null ? p.gy : p.y;
    let hot = 0;
    for (const z of S.zs) if (z.state === "in" && Math.abs(z.x - p.x) < 220 && Math.abs(z.y - p.y) < 60) hot++;
    // 1) barricada pra pregar
    let best = null, bd = 1e9;
    for (let i = 0; i < S.bars.length; i++) {
      const bar = S.bars[i];
      if (!opened(bar.req) || bar.planks >= bar.max || !barFree(bar, b)) continue;
      const ix = bar.dir === 0 ? bar.x : bar.x + bar.dir * 24, d = Math.abs(ix - p.x) + Math.abs(bar.y - p.y) * 2;
      if (d > VW * (S.buyPhase.active ? 0.75 : 0.45) || wallBetween(ix, p.x, bar.y)) continue;
      // na onda só vai se não tem zumbi rasgando ela agora (aí o certo é atirar)
      if (!S.buyPhase.active && (hot > 2 || S.zs.some((z) => z.state === "out" && z.bar === i && Math.abs(z.x - bar.x) < 30))) continue;
      if (d < bd) { bd = d; best = { k: "bar", bar, x: ix, y: bar.y }; }
    }
    if (best) {
      best.t = 12;
      best.plat = platOf(best.x, best.y, 4);
      return best;
    }
    // 2) posição própria
    const room = m.rooms.find((r) => r.i === pr), R = VW * (hot > 1 ? K.tight : K.spread);
    let lo = p.x - R, hi = p.x + R;
    if (room) { lo = Math.max(lo, room.x0 + 16); hi = Math.min(hi, room.x1 - 16); }
    const other = bots().find((o) => o !== b && o.job);
    for (let k = 0; k < 10; k++) {
      const x = rnd(lo, hi), pl = platOf(x, lvlY, 2);
      if (!pl || Math.abs(x - p.x) < 34 || other && Math.abs(other.job.x - x) < 46 || wallBetween(x, p.x, lvlY)) continue;
      return { k: "post", x, y: lvlY, plat: pl, t: rnd(K.postT[0], K.postT[1]) * (hot > 1 ? 0.6 : 1) };
    }
    // sala apertada: fica do lado de você
    const side = b.idx ? 1 : -1;
    return { k: "post", x: p.x + side * (K.slots[b.idx] || 40) * (p.face || 1), y: lvlY, plat: p.plat, t: 2 };
  }
  function los(x0, y0, x1, y1) {`);

rep(`    } else {
      // 2) seguir você: fica atrás de você, no lado oposto pra onde você olha; não grudado
      const side = -(p.face || 1), slot = K.slots[b.idx] || 40;
      goal = p.x + side * slot;
      tgtObj = { x: goal, y: p.y, gy: p.gy, plat: p.plat, onGround: p.onGround };
      run = Math.abs(p.x - b.x) > 110 || p.running;
    }`, `    } else {
      // 2) posição própria (ou barricada). Replaneja quando o tempo acaba, quando você muda de sala (abriu porta,
      //    foi pra área nova) ou quando você se afastou da posição dele.
      const pr = roomIdx(M(), p.x);
      if (b.job) b.job.t -= dt;
      if (!b.job || b.job.t <= 0 || b.pRoom !== pr || Math.abs(b.job.x - p.x) > VW * 0.55 || Math.abs(b.job.y - p.y) > 40 && b.job.k === "post" || b.job.k === "bar" && b.job.bar.planks >= b.job.bar.max) {
        b.job = plan(b, p);
        b.pRoom = pr;
      }
      goal = b.job.x;
      tgtObj = { x: goal, y: b.job.y, gy: b.job.y, plat: b.job.plat || platOf(goal, b.job.y, 4), onGround: true };
      run = Math.abs(goal - b.x) > 110 || b.pRoom !== roomIdx(M(), b.x);
    }`);

// chegada mais justa na posição; velocidade própria de cada bot
rep(`      const dx = wx - b.x, close = Math.abs(goal - b.x) < (rv ? 6 : K.slack) && (same || rv);`,
`      const dx = wx - b.x, close = Math.abs(goal - b.x) < (rv ? 6 : b.job && b.job.k === "bar" ? 5 : K.slack) && (same || rv);`);
rep(`      else if (!close && Math.abs(dx) > 3) vx = Math.sign(dx) * spd * (run ? CONFIG.player.runMult : 1);`,
`      else if (!close && Math.abs(dx) > 3) vx = Math.sign(dx) * spd * (b.spdK || 1) * (run ? CONFIG.player.runMult : 1);`);

// prioridade: levantar > atirar (zumbi perto ou não está pregando) > pregar tábua
rep(`    } else if (z) {
      b.face = Math.sign(z.x - b.x) || b.face;`, `    } else if (z && !(atBar(b) && Math.abs(z.x - b.x) > 150)) {
      b.face = Math.sign(z.x - b.x) || b.face;`);
rep(`    } else {
      if (Math.abs(b.vx) > 1) b.face = Math.sign(b.vx);
      const ta = b.face > 0 ? 0.12 : Math.PI - 0.12;`, `    } else if (atBar(b)) {
      repair(b, dt);
    } else {
      if (Math.abs(b.vx) > 1) b.face = Math.sign(b.vx);
      // parado na posição: olha pro lado de onde a horda vem (o lado contrário ao seu), não pro mesmo lado que você
      else if (b.job && b.job.k === "post" && Math.abs(b.x - p.x) > 20) b.face = Math.sign(b.x - p.x);
      const ta = b.face > 0 ? 0.12 : Math.PI - 0.12;`);
rep(`  function setAnim(b, a) {`, `  function atBar(b) {
    const j = b.job;
    return !!(j && j.k === "bar" && b.onGround && Math.abs(b.x - j.x) < 10 && Math.abs(b.y - j.bar.y) < 10 && j.bar.planks < j.bar.max);
  }
  // prega tábua igual a você: mesma tábua, mesmo som; a grana vai pra carteira do bot
  function repair(b, dt) {
    const bar = b.job.bar, K = C();
    b.vx = 0;
    b.face = bar.dir === 0 ? b.face : -bar.dir;
    b.repT -= dt;
    if (b.repT > 0) return;
    b.repT = K.repT * rnd(0.9, 1.2);
    bar.planks = Math.min(bar.max, bar.planks + 1);
    SFX.nail();
    for (let i = 0; i < 5; i++) S.parts.push({ x: bar.x + rnd(-8, 8), y: bar.y - rnd(10, bar.h), vx: rnd(-40, 40), vy: rnd(-60, 0), life: 0.4, max: 0.4, col: "#c9a46a", sz: 1, g: 400 });
    if ((bar.botPaid || 0) < K.plankCap) {
      b.cash += CONFIG.pts.plank;
      bar.botPaid = (bar.botPaid || 0) + 1;
    }
  }
  function setAnim(b, a) {`);

// grana do bot aparece embaixo do nome na pausa de compra
rep(`      drawTxt(g, a.name, a.x - textW(a.name) / 2, ty, "#9ad8ff", "#000");`,
`      drawTxt(g, a.name, a.x - textW(a.name) / 2, ty, "#9ad8ff", "#000");
      if (S.buyPhase && S.buyPhase.active) {
        const c = "R$" + a.cash;
        drawTxt(g, c, a.x - textW(c) / 2, ty - 10, "#ffd84a", "#000");
      }`);

// ---------------------------------------------------------------- versão
rep(`const QZ_VERSION='29.9';`, `const QZ_VERSION='29.10';`);
s = s.replace(/const QZ_NOTE='[^']*';/, `const QZ_NOTE='Parceiros bot mais vivos: posição própria, pregam barricada e têm o próprio dinheiro';`);
fs.writeFileSync(F, s);

const SW = path.join(path.dirname(F), 'sw.js');
let w = fs.readFileSync(SW, 'utf8');
if (!w.includes('const CACHE = "qz-v29.9";')) throw new Error('sw CACHE');
fs.writeFileSync(SW, w.replace('const CACHE = "qz-v29.9";', 'const CACHE = "qz-v29.10";'));
console.log('ok');
