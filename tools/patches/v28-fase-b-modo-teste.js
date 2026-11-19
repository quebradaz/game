// v28 fase B: resgate de código em Ajustes e modo de teste com mod menu (F9 no PC, botão único no toque).
// O código não aparece aqui nem no jogo: só o SHA-256 de "qz-v1|" + código em minúsculas.
// Uso: node tools/patches/v28-fase-b-modo-teste.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const E = s.indexOf('\r\n') >= 0 ? '\r\n' : '\n';
const nl = (t) => t.split('\n').join(E);
const rep = (a, b) => {
  a = nl(a); b = nl(b);
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};
const HASH = 'e480bf13a472ca2344304c8db63cbb8981a478178805271998a2aa72a7203a71';

// ---------- estado do modo de teste, cedo no script (usado por unlocked, SAVE, loja de visual)
rep(`// v28: modo de teste (liberado por código em Ajustes, só na sessão). Fase B preenche o resto.
const DEV = { on: 0 };
function mapWon(id) {`, 'function mapWon(id) {');
{
  const m = s.match(/const QZ_NOTE='[^']*';\r?\n/);
  if (!m) throw new Error('QZ_NOTE');
  s = s.replace(m[0], m[0] + nl(`// Modo de teste: ligado e desligado pelo código em Ajustes › Resgatar código, só nesta sessão (some ao recarregar).
// REGRA: com o modo ligado nada é salvo (local ou nuvem) e nada conta para ranking, missões ou passe.
// Ao desligar, o save volta a ser exatamente o de antes de ligar (DEV.bak).
const DEV = { on: 0, menu: 0, hit: 0, god: 0, fps: 0, bak: null, H: "${HASH}" };
`));
}
rep(`    save() {
      d.ts = Date.now();`, `    save() {
      if (DEV.on) return;
      d.ts = Date.now();`);
rep(`    push() {
      if (!ref) return;`, `    push() {
      if (!ref || DEV.on) return;`);
rep('  function owns(k) { return D().inv.indexOf(k) >= 0; }', '  function owns(k) { return DEV.on || D().inv.indexOf(k) >= 0; }');

// ---------- atalhos antigos de debug saem (F9 e crase ligavam os slots; 5 toques no número da onda também)
rep(`addEventListener("keydown", (e) => {
  if (e.code === "Backquote" || e.code === "F9") {
    S.debugBars = !S.debugBars;
  }
});`, `// v28: F9 só abre e fecha o mod menu, e só com o modo de teste ligado
addEventListener("keydown", (e) => {
  if (e.code === "F9" && DEV.on) {
    e.preventDefault();
    devMenu(!DEV.menu);
  }
});`);
{
  const a = s.indexOf(nl('dbgSync();\n{\n  let taps = [];\n  $("roundBox").addEventListener("pointerdown"'));
  const b = s.indexOf(nl('let helpBack = "title";'), a);
  if (a < 0 || b < 0) throw new Error('taps block');
  s = s.slice(0, a) + nl('dbgSync();\n') + s.slice(b);
}

// ---------- Ajustes: Lab/Simular/Slots saem daqui (vão para o mod menu); entra Resgatar código
rep('<button class="btn alt" id="bHow">Ajuda</button><button class="btn alt" id="bLab">Lab do sangue</button><button class="btn alt" id="bSim">Simular economia</button><button class="btn alt" id="bDbg">Slots de barricada</button></div>',
  `<button class="btn alt" id="bHow">Ajuda</button></div>
    <p style="margin:10px 0 6px">Resgatar código</p>
    <div class="row codeRow"><input id="codeIn" type="text" maxlength="32" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Digite o código" aria-label="Código"><button class="btn alt" id="codeOk">Resgatar</button></div>
    <p class="segNote" id="codeMsg"></p>`);

// ---------- mod menu e botão flutuante
rep('<div id="labPanel" class="hidden">', `<button id="devBtn" class="hidden" aria-label="Menu do modo de teste">DEV</button>
<div id="devMenu" class="hidden" role="dialog" aria-label="Modo de teste">
  <div class="dvHead"><b>MODO DE TESTE</b><span>F9 abre e fecha</span><button id="dvClose" aria-label="Fechar">X</button></div>
  <div class="dvSec"><b>Partida</b>
    <label>Mapa <select id="dvMap"></select></label>
    <label>Período <select id="dvPer"><option value="dia">Dia</option><option value="tarde">Tarde</option><option value="noite">Noite</option></select></label>
    <label>Clima <select id="dvWx"><option value="clear">Limpo</option><option value="rain">Chuva</option><option value="storm">Tempestade</option><option value="sand">Areia (praia)</option></select></label>
    <div class="dvRow"><button id="dvGo">Jogar aqui</button><button id="dvWxNow">Trocar clima agora</button></div>
  </div>
  <div class="dvSec"><b>Ondas e chefes</b>
    <div class="dvRow"><label>Onda <input id="dvWave" type="number" min="1" max="20" value="7"></label><button id="dvWaveGo">Ir</button></div>
    <div class="dvRow"><button id="dvCap">Capitão</button><button id="dvObs">Observador</button><button id="dvFury">Capitão em fúria</button></div>
  </div>
  <div class="dvSec"><b>Zumbis</b>
    <div class="dvRow"><select id="dvZ"></select><button id="dvZGo">Nascer 1</button><button id="dvZ10">Nascer 10</button><button id="dvKill">Matar todos</button></div>
  </div>
  <div class="dvSec"><b>Ligar e desligar</b>
    <div class="dvRow"><button id="dvHit">Hitboxes</button><button id="dvGod">Vida infinita</button><button id="dvFps">FPS e qualidade</button><button class="btn alt" id="bDbg">Slots de barricada</button></div>
    <p class="dvNote">Dinheiro infinito, todos os mapas e todas as roupas ficam liberados enquanto o modo estiver ligado.</p>
  </div>
  <div class="dvSec"><b>Ferramentas</b>
    <div class="dvRow"><button class="btn alt" id="bLab">Lab do sangue</button><button class="btn alt" id="bSim">Simular economia</button></div>
  </div>
</div>
<div id="labPanel" class="hidden">`);
// CSS
{
  const i = s.indexOf('</style>');
  if (i < 0) throw new Error('style');
  s = s.slice(0, i) + nl(`/* v28: resgate de código e modo de teste */
.codeRow{justify-content:center;gap:6px;flex-wrap:wrap}
#codeIn{font:inherit;padding:8px 10px;border-radius:8px;border:2px solid var(--line);background:#120e1a;color:#fff;width:min(220px,60vw)}
#codeMsg.ok{color:#7dff6a}#codeMsg.bad{color:#ff5a5a}
#devBtn{position:fixed;right:calc(max(10px,var(--sar,0px)) + 4px);top:42%;z-index:60;width:46px;height:46px;border-radius:50%;border:2px solid #7dff6a;background:rgba(10,14,10,.86);color:#7dff6a;font-family:var(--fs,monospace);font-weight:800;font-size:12px;pointer-events:auto}
#devMenu{position:fixed;inset:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) auto;width:min(420px,calc(100vw - 16px));z-index:70;overflow:auto;background:rgba(10,8,16,.95);border:2px solid #7dff6a;border-radius:12px;padding:10px;color:#e8e4f0;font-size:13px;pointer-events:auto}
#devMenu .dvHead{display:flex;align-items:center;gap:8px;margin-bottom:6px}#devMenu .dvHead b{color:#7dff6a}#devMenu .dvHead span{flex:1;color:#8a8698;font-size:11px}
#devMenu .dvSec{border-top:1px solid #2a2638;padding:8px 0}#devMenu .dvSec>b{display:block;margin-bottom:6px;color:#ffd84a}
#devMenu label{display:flex;align-items:center;gap:6px;margin:4px 0}
#devMenu select,#devMenu input{font:inherit;background:#1a1626;color:#fff;border:1px solid #3a3650;border-radius:6px;padding:5px}
#devMenu .dvRow{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
#devMenu button{font:inherit;min-height:34px;padding:6px 10px;border-radius:8px;border:1px solid #3a3650;background:#221e30;color:#fff}
#devMenu button.on{background:#1f4a1a;border-color:#7dff6a;color:#c8ffb8}
#devMenu .dvNote{color:#8a8698;font-size:11px;margin:6px 0 0}
`) + s.slice(i);
}
// lógica
rep('let helpBack = "title";', `// ===== v28: resgate de código e modo de teste =====
function devHash(v) {
  if (!(window.crypto && crypto.subtle && window.TextEncoder)) return Promise.reject(new Error("sem crypto"));
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode("qz-v1|" + v)).then((b) => Array.prototype.map.call(new Uint8Array(b), (x) => ("0" + x.toString(16)).slice(-2)).join(""));
}
function devSet(on) {
  if (on && !DEV.on) {
    DEV.bak = JSON.stringify(SAVE.d);
    DEV.on = 1;
    SAVE.d.coins = 9999999;
  } else if (!on && DEV.on) {
    DEV.on = 0;
    DEV.hit = DEV.god = DEV.fps = 0;
    const d = SAVE.d, b = JSON.parse(DEV.bak || "{}");
    for (const k of Object.keys(d)) delete d[k];
    Object.assign(d, b);
    DEV.bak = null;
    devMenu(false);
    try {
      LOOK.apply();
    } catch (e) {
    }
  }
  $("devBtn").classList.toggle("hidden", !DEV.on);
  try {
    if (S.mode === "menu") TITLE.refresh();
    if (!$("select").classList.contains("hidden")) buildSelect();
  } catch (e) {
  }
}
function devMenu(open) {
  DEV.menu = open && DEV.on ? 1 : 0;
  $("devMenu").classList.toggle("hidden", !DEV.menu);
  if (DEV.menu) devSync();
}
function devSync() {
  const mp = $("dvMap");
  if (!mp.options.length) {
    MAPS.forEach((m, i) => mp.add(new Option(m.name, i)));
    Object.keys(ZV).forEach((v) => $("dvZ").add(new Option(ZV[v].name || v, v)));
  }
  mp.value = S.mi;
  $("dvPer").value = S.period || "noite";
  $("dvWx").value = FXV.st.wx || "clear";
  $("dvHit").classList.toggle("on", !!DEV.hit);
  $("dvGod").classList.toggle("on", !!DEV.god);
  $("dvFps").classList.toggle("on", !!DEV.fps);
}
function devTick() {
  const p = S.player;
  if (!p) return;
  p.cash = 999999;
  if (DEV.god && !p.dead) p.hp = p.maxHp;
}
function devPlaying() {
  if (S.mode === "play" && S.player) return true;
  UI.toast && UI.toast("COMECE UMA PARTIDA", "#ffd84a");
  return false;
}
function devKillAll() {
  for (const z of S.zs.slice()) if (z.state !== "dead") {
    z.hp = 0;
    try {
      killZ(z, false, "nuke");
    } catch (e) {
    }
  }
}
// hitboxes: corpo (verde), cabeça (vermelho), jogador (ciano). Coordenadas do mundo.
function devDrawHit(c) {
  c.lineWidth = 1;
  for (const z of S.zs) {
    if (z.state === "dead") continue;
    const sc = z.sc || 1, w = (z.w || 20) * sc, h = (z.h || 56) * sc, hh = ((ZT[z.type] || {}).head || 14) * sc;
    c.strokeStyle = "#7dff6a";
    c.strokeRect(Math.round(z.x - w / 2) + 0.5, Math.round(z.y - h) + 0.5, Math.round(w), Math.round(h));
    c.strokeStyle = "#ff4a4a";
    c.strokeRect(Math.round(z.x - w * 0.35) + 0.5, Math.round(z.y - h) + 0.5, Math.round(w * 0.7), Math.round(hh));
  }
  const p = S.player;
  if (p) {
    c.strokeStyle = "#3ee6ff";
    const w = p.w || 18, h = p.h || 60;
    c.strokeRect(Math.round(p.x - w / 2) + 0.5, Math.round(p.y - h) + 0.5, w, h);
  }
}
$("codeOk").onclick = () => {
  const b = $("codeOk"), msg = $("codeMsg"), v = ($("codeIn").value || "").trim().toLowerCase();
  if (b.disabled || !v) return;
  devHash(v).then((h) => {
    if (h === DEV.H) {
      devSet(!DEV.on);
      msg.className = "segNote ok";
      msg.textContent = DEV.on ? "Código resgatado! Modo de teste ligado. F9 ou o botão DEV abrem o menu." : "Modo de teste desligado. Seu progresso voltou como estava.";
      $("codeIn").value = "";
    } else {
      msg.className = "segNote bad";
      msg.textContent = "Código inválido";
      b.disabled = true;
      setTimeout(() => b.disabled = false, 1500);
    }
  }).catch(() => {
    msg.className = "segNote bad";
    msg.textContent = "Resgate indisponível neste navegador";
  });
};
$("codeIn").addEventListener("keydown", (e) => {
  e.stopPropagation();
  if (e.key === "Enter") $("codeOk").click();
});
$("devBtn").onclick = (e) => {
  e.stopPropagation();
  devMenu(!DEV.menu);
};
$("dvClose").onclick = () => devMenu(false);
$("devMenu").addEventListener("pointerdown", (e) => e.stopPropagation());
$("devMenu").addEventListener("keydown", (e) => {
  if (e.code !== "F9") e.stopPropagation();
});
$("dvGo").onclick = () => {
  S.mi = +$("dvMap").value;
  S.period = $("dvPer").value;
  FXV.st.force = $("dvWx").value;
  devMenu(false);
  UI.show("none");
  startGame();
};
$("dvWxNow").onclick = () => {
  FXV.set($("dvWx").value);
};
$("dvWaveGo").onclick = () => {
  if (!devPlaying()) return;
  const n = clamp(+$("dvWave").value | 0, 1, CONFIG.boss.final);
  devKillAll();
  S.boss = null;
  S.bossSpawned = 0;
  S.buyPhase.active = false;
  S.inter = 0;
  S.endT = 0;
  startRound(n);
};
$("dvCap").onclick = () => {
  if (!devPlaying()) return;
  S.round = CONFIG.cap.wave;
  spawnCapitao();
  devMenu(false);
};
$("dvObs").onclick = () => {
  if (!devPlaying()) return;
  S.round = CONFIG.boss.unlock;
  spawnBoss();
  devMenu(false);
};
$("dvFury").onclick = () => {
  if (!devPlaying()) return;
  S.round = CONFIG.boss.final;
  spawnCapitao();
  devMenu(false);
};
const devSpawn = (n) => {
  if (!devPlaying()) return;
  const p = S.player, v = $("dvZ").value;
  for (let i = 0; i < n; i++) spawnZombie({ x: p.x + (p.face || 1) * (90 + i * 14), y: p.gy != null ? p.gy : G0 }, "in", v);
};
$("dvZGo").onclick = () => devSpawn(1);
$("dvZ10").onclick = () => devSpawn(10);
$("dvKill").onclick = () => {
  if (devPlaying()) devKillAll();
};
$("dvHit").onclick = () => {
  DEV.hit = DEV.hit ? 0 : 1;
  devSync();
};
$("dvGod").onclick = () => {
  DEV.god = DEV.god ? 0 : 1;
  devSync();
};
$("dvFps").onclick = () => {
  DEV.fps = DEV.fps ? 0 : 1;
  devSync();
};
let helpBack = "title";`);
// ganchos no laço do jogo
rep('function update(dt) {\n  if (CUT.on) return cutUpdate(dt);', 'function update(dt) {\n  if (DEV.on) devTick();\n  if (CUT.on) return cutUpdate(dt);');
rep('  if (S.debugBars) drawSlotDebug(g);', '  if (S.debugBars) drawSlotDebug(g);\n  if (DEV.on && DEV.hit) devDrawHit(g);');
rep('  drawReticle(g, camX);', `  drawReticle(g, camX);
  if (DEV.on && DEV.fps) {
    const q = ["ALTA", "MEDIA", "BAIXA"][QUAL.tier] + (QUAL.mode === "auto" ? " AUTO" : "");
    T(g, "FPS " + Math.round(FPSW.ema) + " Q " + q + " ONDA " + S.round + " Z " + S.zs.filter((z) => z.state !== "dead").length, 4, VH - 12, "#7dff6a", 1, "#000");
  }`);
fs.writeFileSync(F, s);
console.log('ok');
