// v29.9: co-op etapa 1 — parceiros bot, cair e levantar, tela do mapa com zoom e lore.
//
// O que muda:
//  - S.players[] é a lista de quem está na partida: [jogador local, bot 1, bot 2]. S.player continua sendo o jogador
//    deste aparelho (o resto do jogo não muda). Cada ator tem { id, kind: "local" | "bot" | "remote" }; na etapa online
//    o host troca os bots por "remote" e manda o mesmo estado pela rede (host autoritativo).
//  - Zumbi mira o ator de pé mais perto (zTarget), revisto a cada 0,35 s, não só o S.player.
//  - Cair e levantar: com parceiro de pé você CAI em vez de morrer (30 s sangrando); o parceiro vem te levantar.
//    Parceiro caído: segure AÇÃO perto dele. Quem sangra até o fim fica fora até a próxima onda.
//  - Bots (0 a 2, escolhidos no mapa): sempre seguem o seu personagem, atiram com reação e mira humanas,
//    dano reduzido, não compram nada; abate deles derruba metade da grana e não conta nos seus abates.
//  - Dificuldade proporcional ao grupo + um nível acima quando há parceiro (CONFIG.coop).
//  - Tela do mapa: tocar no card dá zoom no cenário, mostra a lore, o horário (sorteado) e a escolha de bots.
// Uso: node tools/patches/v29.9-coop-bots.js index.html
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
rep(`  maxAlive: 24,
`, `  maxAlive: 24,
  // v29.7: co-op. n = tamanho do grupo (você + bots escolhidos no mapa). Os números valem por parceiro.
  coop: {
    maxBots: 2,
    // dificuldade: zumbis por onda, vida, chance de elite, intervalo de spawn e "lvl" = ondas a mais no patamar (um nível acima)
    count: 0.25, hp: 0.16, elite: 0.04, gap: 0.2, lvl: 2,
    // vivos ao mesmo tempo: + por parceiro, por qualidade (alta, média, baixa) — o celular fraco não ganha horda maior
    alive: [2, 1, 0],
    // cair e levantar
    bleed: 30, reviveT: 3, botReviveT: 3.4, reviveHp: 0.5, reviveIT: 2,
    // bots: vida, dano que causam e que levam, reação, mira, alcance, cadência, grana dos abates deles
    botHp: 0.9, botDmg: 0.5, botBossDmg: 0.35, botTaken: 0.8, react: [0.28, 0.55], acc: [0.78, 0.42], range: 330, rateMul: 1.45,
    cashMul: 0.5, headP: 0.14, regen: 45, regenDelay: 4,
    // seguir: distância atrás de você (bot 1, bot 2), folga antes de andar, e quando teleporta pra perto (perdido)
    slots: [36, 72], slack: 14, lostT: 6, farScreens: 1.15
  },
`);

// ---------------------------------------------------------------- dificuldade
rep(`  return Math.round(v * (periodCfg().zMult || 1));
}`, `  return Math.round(v * (periodCfg().zMult || 1) * COOP.mul("count"));
}`);
rep(`function tierOf(n2) {
  const T = CONFIG.waves.tiers;`, `function tierOf(n2) {
  const T = CONFIG.waves.tiers;
  n2 += COOP.lvl();`);
rep(`  z.hp *= TQ.hp;
  z.spd *= TQ.spd;`, `  z.hp *= TQ.hp * COOP.mul("hp");
  z.spd *= TQ.spd;`);
rep(`TQ.elite > 0 && Math.random() < TQ.elite) {`, `TQ.elite + COOP.add("elite") > 0 && Math.random() < TQ.elite + COOP.add("elite")) {`);
rep(`* tierOf(n2).gap * rnd(0.7, 1.2);`, `* tierOf(n2).gap * rnd(0.7, 1.2) / COOP.mul("gap");`);
rep(`  return Math.min(CONFIG.maxAlive, QUAL.alive[QUAL.tier], tierOf(S.round || 1).alive | 0);`,
`  const ad = COOP.party() > 1 ? (CONFIG.coop.alive[QUAL.tier] || 0) * (COOP.party() - 1) : 0;
  return Math.min(CONFIG.maxAlive + ad, QUAL.alive[QUAL.tier] + ad, (tierOf(S.round || 1).alive | 0) + ad);`);

// ---------------------------------------------------------------- mundo: lista de jogadores
rep(`  S.player = attract ? null : newPlayer();
  S.stall = null;`, `  S.player = attract ? null : newPlayer();
  COOP.reset(attract);
  S.stall = null;`);
rep(`  if (n2 > 1 && n2 % 2 === 1) restoreDynp();`, `  if (n2 > 1 && n2 % 2 === 1) restoreDynp();
  COOP.round(n2);`);

// ---------------------------------------------------------------- zumbi mira o ator mais perto
{
  const a = s.indexOf('function updateZ(z, dt) {'), b = s.indexOf('function updatePlayer(dt) {');
  if (a < 0 || b < a) throw new Error('updateZ');
  let body = s.slice(a, b);
  const n0 = body.split('hurtPlayer(').length - 1;
  if (n0 !== 4) throw new Error('updateZ hurtPlayer ' + n0);
  body = body.replace('  const m = M(), p = S.player;\n', '  const m = M(), p = zTarget(z);\n');
  body = body.split('hurtPlayer(').join('hurtActor(p, ');
  body = body.replace('    if (!p || p.dead) {\n      if (p && p.dead &&', '    if (!p || p.dead || p.down > 0) {\n      if (p && p.dead &&');
  s = s.slice(0, a) + body + s.slice(b);
}
rep(`function zNear(z) {`, `// v29.7: alvo do zumbi = ator de pé mais perto (mesmo andar pesa menos), revisto a cada 0,35 s; sem parceiro é sempre o S.player
function zTarget(z) {
  const L = S.players;
  if (!L || L.length < 2 || !S.player) return S.player;
  if (z.tg && S.t - z.tgT < 0.35 && !(z.tg.down > 0) && !z.tg.out && !z.tg.dead) return z.tg;
  let best = null, bd = 1e9;
  for (const a of L) {
    if (a.dead || a.out || a.down > 0) continue;
    const d = Math.abs(a.x - z.x) + Math.abs(a.y - z.y) * 2.2 + (a === z.tg ? -30 : 0);
    if (d < bd) { bd = d; best = a; }
  }
  z.tg = best || S.player;
  z.tgT = S.t;
  return z.tg;
}
function hurtActor(a, d, kb) {
  if (a && a.bot) return COOP.hurt(a, d, kb);
  return hurtPlayer(d, kb);
}
function zNear(z) {`);

// ---------------------------------------------------------------- jogador: cair em vez de morrer
rep(`function hurtPlayer(d, kb = 0) {
  var _a;
  const p = S.player;
  if (!p || p.dead || p.iT > 0) return;`, `function hurtPlayer(d, kb = 0) {
  var _a;
  const p = S.player;
  if (!p || p.dead || p.down > 0 || p.iT > 0) return;`);
rep(`  if (p.hp <= 0 && trySecond(p)) return;
  if (p.hp <= 0) {`, `  if (p.hp <= 0 && trySecond(p)) return;
  if (p.hp <= 0 && COOP.fall(p)) return;
  if (p.hp <= 0) {`);
rep(`function updatePlayer(dt) {
  const p = S.player, I = S.input, ch = CHARS[S.ci], m = M();
  if (p.dead) {`, `function updatePlayer(dt) {
  const p = S.player, I = S.input, ch = CHARS[S.ci], m = M();
  if (p.down > 0) {
    COOP.downTick(p, dt);
    I.actEdge = false;
    I.jumpEdge = false;
    I.downEdge = false;
    return;
  }
  if (p.dead) {`);
rep(`function bodyState(p) {
  let a = "Idle", f = 0;
  if (p.dead) {`, `function bodyState(p) {
  let a = "Idle", f = 0;
  if (p.dead || p.down > 0 || p.out) {`);
rep(`  if (p.dead) {
    drawSheet(c, bodyKey(p), bodyFrame(p), p.x, p.y, p.face);
    return;
  }
  AURA.drawPlayer(c, p, bodyKey(p), bodyFrame(p));`, `  if (p.dead || p.down > 0) {
    drawSheet(c, bodyKey(p), bodyFrame(p), p.x, p.y, p.face);
    return;
  }
  if (!p.bot) AURA.drawPlayer(c, p, bodyKey(p), bodyFrame(p));`);
// parceiro caído vira um item de "segure AÇÃO"
rep(`  const p = S.player, m = M();
  if (!p || p.dead) return null;
  const lvl = (y) => Math.abs(p.y - y) < 10;`, `  const p = S.player, m = M();
  if (!p || p.dead || p.down > 0) return null;
  const lvl = (y) => Math.abs(p.y - y) < 10;
  {
    const r = COOP.reviveNear(p);
    if (r) return { k: "revive", b: r };
  }`);
rep(`  if (it.k === "bar") return \`Segure a <b>A\\xC7\\xC3O</b> pra pregar t\\xE1bua <b>+R$10</b>\`;`,
`  if (it.k === "bar") return \`Segure a <b>A\\xC7\\xC3O</b> pra pregar t\\xE1bua <b>+R$10</b>\`;
  if (it.k === "revive") return \`Segure a <b>A\\xC7\\xC3O</b> pra levantar <b>\${it.b.name}</b>\`;`);
rep(`  if (it.k === "bar") return { icon: "hammer", top: "BARRICADA", main: "SEGURE PRA PREGAR", price: "+R$10", hold: 1 };`,
`  if (it.k === "bar") return { icon: "hammer", top: "BARRICADA", main: "SEGURE PRA PREGAR", price: "+R$10", hold: 1 };
  if (it.k === "revive") return { icon: "hammer", top: it.b.name + " CAIU \\xB7 " + Math.ceil(it.b.down) + " s", main: "SEGURE PRA LEVANTAR", price: null, hold: 1 };`);
rep(`function doInteract(it, held, dt) {
  const p = S.player;
  if (!it) return;`, `function doInteract(it, held, dt) {
  const p = S.player;
  if (!it) return;
  if (it.k === "revive") {
    if (held) COOP.revStep(it.b, dt, p);
    return;
  }`);

// ---------------------------------------------------------------- tiros dos bots: sem grana de acerto, sem estatística sua
rep(`  if (S.player && !S.attract && !z.lab) {
    const T_ = S.stats;`, `  if (S.player && !S.attract && !z.lab && !S.byBot) {
    const T_ = S.stats;`);
rep(`    if (S.player) addCash(CONFIG.pts.hit);
    SFX.hit(pan);`, `    if (S.player && !S.byBot) addCash(CONFIG.pts.hit);
    SFX.hit(pan);`);
rep(`  S.stats.kills++;
  if (head) S.stats.head++;
  if (S.player && !S.attract) {
    S.roundKills`, `  if (S.byBot) S.stats.botKills = (S.stats.botKills || 0) + 1;
  else {
    S.stats.kills++;
    if (head) S.stats.head++;
  }
  if (S.player && !S.attract && !S.byBot) {
    S.roundKills`);
rep(`      dropCash(z.x, z.y - z.h * 0.55, scaleCash(val * mul), {`, `      dropCash(z.x, z.y - z.h * 0.55, scaleCash(val * mul * (S.byBot ? CONFIG.coop.cashMul : 1)), {`);

// zumbi-bomba derrubado por bot: a explosão também é do bot (não conta como abate seu)
rep(`  if (z.ab === "bomb" && !z.boomed) {
    z.boomed = 1;
    setTimeout(() => {
      if (S.zs.includes(z)) {
        const B = CONFIG.explosives.bomb;
        explode(z.x, z.y - 14, B.r, B.dmg, B.player);
      }`, `  if (z.ab === "bomb" && !z.boomed) {
    z.boomed = 1;
    const byBot = S.byBot;
    setTimeout(() => {
      if (S.zs.includes(z)) {
        const B = CONFIG.explosives.bomb;
        S.byBot = byBot;
        try { explode(z.x, z.y - 14, B.r, B.dmg, B.player); } finally { S.byBot = 0; }
      }`);

// cuspe e lixo acertam bot também
rep(`    if (p && !p.dead && Math.abs(q.x - p.x) < 10 && q.y > p.y - 62 && q.y < p.y) {
      hurtPlayer(q.dmg, Math.sign(q.vx) * 90);
      q.dead = 1;
    }`, `    if (p && !p.dead && Math.abs(q.x - p.x) < 10 && q.y > p.y - 62 && q.y < p.y) {
      hurtPlayer(q.dmg, Math.sign(q.vx) * 90);
      q.dead = 1;
    }
    if (!q.dead && S.bots && S.bots.length) for (const b of S.bots) if (!b.out && !(b.down > 0) && Math.abs(q.x - b.x) < 10 && q.y > b.y - 62 && q.y < b.y) {
      COOP.hurt(b, q.dmg, Math.sign(q.vx) * 90);
      q.dead = 1;
      break;
    }`);

// ---------------------------------------------------------------- laço e desenho
rep(`    updatePlayer(dt);
    if (!S.player.dead) updateRounds(dt);`, `    updatePlayer(dt);
    COOP.update(dt);
    if (!S.player.dead) updateRounds(dt);`);
rep(`  drawBossFx(g);
  if (S.player) drawPlayer(g, S.player);`, `  drawBossFx(g);
  COOP.draw(g);
  if (S.player) drawPlayer(g, S.player);
  COOP.drawTags(g);`);

// ---------------------------------------------------------------- módulo COOP
const COOP_JS = fs.readFileSync(path.join(__dirname, 'v29.9-coop-modulo.js'), 'utf8');
rep(`function updatePlayer(dt) {
  const p = S.player, I = S.input`, COOP_JS + `\nfunction updatePlayer(dt) {
  const p = S.player, I = S.input`);

// ---------------------------------------------------------------- tela do mapa: zoom, lore, bots
rep(`  <div class="selFoot">
    <button class="btn yo" id="bStart">BORA</button>
  </div>
</div>`, `  <div class="selFoot">
    <button class="btn yo" id="bStart">BORA</button>
  </div>
  <div id="mapZoom" class="hidden" role="dialog" aria-modal="true" aria-labelledby="mzName">
    <div class="mzImg" id="mzImg"></div>
    <div class="mzShade"></div>
    <div class="mzPanel">
      <div class="mzTop"><small class="yo" id="mzCamp">HELL DE JANEIRO</small><b class="yo" id="mzName">ADEGA</b><i id="mzSub"></i></div>
      <p class="mzLore" id="mzLore"></p>
      <div class="mzRow"><span class="mzK">HORÁRIO</span><span class="mzV">Sorteado na hora: dia, tarde ou noite</span></div>
      <div class="mzRow mzBotsRow"><span class="mzK">PARCEIROS</span><div class="mzBots" id="mzBots" role="radiogroup" aria-label="Parceiros bot"></div></div>
      <div class="mzDiff" id="mzDiff"></div>
      <div class="mzFoot"><button class="btn alt yo" id="mzBack">VOLTAR</button><button class="btn yo" id="mzGo">BORA</button></div>
    </div>
  </div>
</div>`);
rep(`#select{flex-direction:column;gap:10px;justify-content:center}`, `#select{flex-direction:column;gap:10px;justify-content:center}
/* v29.7: tela do mapa (zoom + lore + parceiros) */
#select>#mapZoom{position:absolute;inset:0;z-index:5;overflow:hidden;background:#07050c}
#mapZoom.hidden{display:none}
#mapZoom .mzImg{position:absolute;background-size:cover;background-position:center;image-rendering:pixelated;transform-origin:50% 50%;will-change:left,top,width,height}
#mapZoom.in .mzImg{transition:left .5s cubic-bezier(.2,.8,.2,1),top .5s cubic-bezier(.2,.8,.2,1),width .5s cubic-bezier(.2,.8,.2,1),height .5s cubic-bezier(.2,.8,.2,1)}
#mapZoom.live .mzImg{animation:mzKen 14s ease-in-out infinite alternate}
@keyframes mzKen{from{transform:scale(1.04)}to{transform:scale(1.16) translateX(-2%)}}
#mapZoom .mzShade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,5,12,.94) 0%,rgba(7,5,12,.82) 44%,rgba(7,5,12,.15) 78%,rgba(7,5,12,0) 100%);opacity:0;transition:opacity .35s .25s}
#mapZoom .mzPanel{position:absolute;left:max(16px,env(safe-area-inset-left));top:0;bottom:0;width:min(470px,58%);display:flex;flex-direction:column;justify-content:center;gap:9px;opacity:0;transform:translateX(-14px);transition:opacity .35s .3s,transform .35s .3s;padding:12px 0}
#mapZoom.live .mzShade,#mapZoom.live .mzPanel{opacity:1;transform:none}
.mzTop small{display:block;color:#7dff3a;letter-spacing:2px;font-size:12px}
.mzTop b{display:block;font-size:clamp(22px,4.2vw,38px);color:#ff9a3c;line-height:1;text-shadow:3px 3px 0 #3a1a00}
.mzTop i{display:block;font-style:normal;color:#ffd84a;font-size:13px;margin-top:4px}
.mzLore{margin:0;color:#e8e4d8;font-size:14px;line-height:1.35;max-width:46ch}
.mzRow{display:flex;align-items:center;gap:10px;font-size:13px}
.mzK{font-family:var(--fz);color:#9a93a8;min-width:84px;font-size:12px;letter-spacing:1px}
.mzV{color:#e8e4d8}
.mzBots{display:flex;gap:6px}
.mzBots button{min-width:52px;min-height:40px;padding:4px 8px;background:#17141e;border:2px solid #000;box-shadow:inset 0 0 0 1px #3a3446;color:#e8e4d8;font-family:var(--fz);font-size:13px;display:flex;align-items:center;gap:4px}
.mzBots button canvas{width:24px;height:24px;image-rendering:pixelated}
.mzBots button[aria-checked="true"]{border-color:#ff9a3c;box-shadow:inset 0 0 0 1px #ffd9a8,0 0 12px rgba(255,154,60,.35);color:#ffd84a}
.mzDiff{font-size:12px;color:#ff9a8a;min-height:16px}
.mzFoot{display:flex;gap:10px;margin-top:4px}
.mzFoot .btn{min-width:120px}
@media (max-height:420px){.mzLore{font-size:13px;line-height:1.28}.mzPanel{gap:6px}.mzTop b{font-size:26px}.mzBots button{min-height:36px}}
@media (max-width:700px){#mapZoom .mzPanel{width:min(440px,66%)}}
@media (prefers-reduced-motion:reduce){#mapZoom.live .mzImg{animation:none}#mapZoom.in .mzImg{transition:none}}`);

// clicar no card abre o zoom; BORA do rodapé também (com o card escolhido)
rep(`      S.mi = i;
      [...mc.children].forEach((e) => e.classList.toggle("sel", +e.dataset.mi === i));
      SFX.swap();
    };
    mc.append(d);`, `      S.mi = i;
      [...mc.children].forEach((e) => e.classList.toggle("sel", +e.dataset.mi === i));
      SFX.swap();
      COOP.openMap(i, d);
    };
    mc.append(d);`);
rep(`$("bStart").onclick = () => {
  SFX.init();
  SFX.resume();
  roulette();
};`, `$("bStart").onclick = () => {
  SFX.init();
  SFX.resume();
  COOP.openMap(S.mi, document.querySelector('#mapCards .card.sel'));
};
$("mzBack").onclick = () => COOP.closeMap();
$("mzGo").onclick = () => {
  SFX.init();
  SFX.resume();
  COOP.closeMap(true);
  COOP.prepare();
  roulette();
};
$("bBack1").addEventListener("click", () => COOP.closeMap(true));`);

// fim de partida: abates do grupo
rep(`function toMenu() {
  labEnd();`, `function toMenu() {
  labEnd();
  COOP.closeMap(true);`);

// ---------------------------------------------------------------- versão
rep(`const QZ_VERSION='29.8';`, `const QZ_VERSION='29.9';`);
s = s.replace(/const QZ_NOTE='[^']*';/, `const QZ_NOTE='Parceiros bot na campanha (até 2), cair e levantar, e mapa com zoom e história';`);
fs.writeFileSync(F, s);

const SW = path.join(path.dirname(F), 'sw.js');
let w = fs.readFileSync(SW, 'utf8');
if (!w.includes('const CACHE = "qz-v29.8";')) throw new Error('sw CACHE');
fs.writeFileSync(SW, w.replace('const CACHE = "qz-v29.8";', 'const CACHE = "qz-v29.9";'));
console.log('ok');
