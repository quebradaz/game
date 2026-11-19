// v28.6: preparação de lançamento — tela de carregamento com barra, app instalável e offline (manifesto + service worker),
// tutorial curto na primeira partida, zumbi do mezanino desce pela escada, evento de XP no passe e trava de domínio
// (o jogo só roda no site oficial). Uso: node tools/patches/v28.6-lancamento.js index.html
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

s = s.replace(/const QZ_VERSION='[^']*';/, "const QZ_VERSION='28.6';");
s = s.replace(/const QZ_NOTE='[^']*';/, "const QZ_NOTE='Tela de carregamento, instalar como app, jogar offline, tutorial e zumbis descendo pela escada na Lapa';");

// ---------- cabeçalho: trava de domínio, manifesto, ícones, direitos ----------
rep('<title>Quebrada Z</title>', `<title>Quebrada Z</title>
<meta name="copyright" content="Quebrada Z. Todos os direitos reservados.">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" type="image/png" sizes="192x192" href="icons/icon-192.png">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<script>
/* Quebrada Z. Todos os direitos reservados. Cópia, redistribuição ou hospedagem em outro endereço não são permitidas.
   Trava de domínio: fora do site oficial o jogo não carrega (o resto da página nem é lido). */
(function(){var h=location.hostname;if(/^(quebradaz\\.github\\.io|localhost|127\\.0\\.0\\.1|([a-z0-9-]+\\.)?quebradaz\\.com(\\.br)?)$/.test(h))return;
window.__qzBlocked=1;document.write('<div style="position:fixed;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:#0d0b14;color:#fff;font:16px system-ui,sans-serif;text-align:center;padding:20px"><b style="font-size:26px;color:#ffd84a">QUEBRADA Z</b><p>Este jogo só roda no site oficial.</p><a style="color:#7dff6a;font-size:18px" href="https://quebradaz.github.io/game/">quebradaz.github.io/game</a></div><plaintext style="display:none">');})();
</script>`);

// ---------- tela de carregamento (aparece enquanto o arquivo ainda está baixando) ----------
rep('<body>\n<noscript>', `<body>
<div id="qzLoad" style="position:fixed;inset:0;z-index:9500;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:radial-gradient(ellipse at 50% 40%,#1e1432,#0d0b14 70%);color:#fff;font:14px system-ui,sans-serif;transition:opacity .4s">
<b style="font:900 clamp(28px,7vw,54px)/1 system-ui,sans-serif;letter-spacing:2px;color:#e8e4d8;text-shadow:3px 3px 0 #000,0 0 18px #3a8a3a">QUEBRADA <span style="color:#c0262a">Z</span></b>
<div style="width:min(70vw,360px);height:12px;background:#1a1626;border:2px solid #000;box-shadow:inset 0 0 0 1px #4a4458"><i id="qlFill" style="display:block;height:100%;width:2%;background:linear-gradient(90deg,#3a8a3a,#7dff6a);transition:width .25s"></i></div>
<span id="qlTx">Baixando o jogo...</span><small style="color:#a59fb4">Na primeira vez baixa uns 3 MB. Depois abre na hora, até sem internet.</small></div>
<script>(function(){var f=document.getElementById('qlFill'),p=2;window.__qlT=setInterval(function(){if(p<60){p+=(60-p)*0.035;f.style.width=p+'%'}},100);
window.qzLoadStep=function(v,t){clearInterval(window.__qlT);f.style.width=v+'%';if(t)document.getElementById('qlTx').textContent=t};})();</script>
<noscript>`);
rep(`  const done = () => {
    if (--n2 === 0) {`, `  const n0 = n2, done = () => {
    try {
      qzLoadStep(60 + 35 * (1 - n2 / n0), "Preparando a quebrada...");
    } catch (e) {
    }
    if (--n2 === 0) {`);
rep(`loadSprites(() => {
  S.mode = "menu";`, `loadSprites(() => {
  try {
    qzLoadStep(100, "Pronto!");
    const ql = $("qzLoad");
    ql.style.opacity = 0;
    setTimeout(() => ql.remove(), 450);
  } catch (e) {
  }
  S.mode = "menu";`);

// ---------- app instalável + offline ----------
rep('let fbKind = "bug";', `// v28.6: service worker (guarda o jogo no aparelho: abre sem baixar de novo e funciona offline)
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {
}));
let fbKind = "bug";`);

// ---------- tutorial curto na primeira partida ----------
rep('</style>', `#tutTip{position:fixed;left:50%;top:calc(var(--sat,0px) + 64px);transform:translateX(-50%);z-index:40;max-width:min(560px,90vw);padding:10px 14px 10px 12px;background:rgba(10,8,16,.92);border:2px solid #000;box-shadow:inset 0 0 0 1px #ffd84a,4px 4px 0 rgba(0,0,0,.5);color:#fff;font:600 15px/1.35 system-ui,sans-serif;display:flex;gap:10px;align-items:flex-start;pointer-events:auto}
#tutTip.hidden{display:none}#tutTip b{color:#ffd84a;font-family:var(--fy);white-space:nowrap}#tutTip button{margin-left:auto;background:#ffd84a;color:#1a0d00;border:0;font:800 12px system-ui,sans-serif;padding:6px 10px;cursor:pointer}
</style>`);
rep('<div id="chestFx" class="hidden">', '<div id="tutTip" class="hidden"></div>\n<div id="chestFx" class="hidden">');
rep('$("bHelp").onclick = () => {', `// v28.6: tutorial curto — dicas na primeira partida, uma de cada vez, nos momentos certos. Some sozinho depois de visto.
const TUT = {
  on: 0,
  seen: {},
  T: {
    move: () => TOUCH_DEV ? "Arraste o lado esquerdo da tela pra andar e o direito pra mirar. Empurrou o direito até a borda, atira." : "A e D andam, W pula, o mouse mira e o clique atira. R recarrega, Q troca de arma.",
    kill: () => "Cada zumbi abatido dá R$. Tiro na cabeça e golpe de faca valem mais.",
    buy: () => "Com R$ você compra armas na parede, abre portas e usa as máquinas de perk. Chegue perto e " + (TOUCH_DEV ? "toque no botão de ação que aparece no topo." : "aperte E."),
    bar: () => "Os zumbis entram pelas janelas. Perto de uma janela quebrada, " + (TOUCH_DEV ? "segure o botão de ação" : "segure E") + " pra pregar tábuas e ganhar R$.",
    round: () => "Cada onda fica mais forte. Na onda 7 vem o primeiro chefe, e chegar na onda 14 libera o próximo mapa."
  },
  start() {
    this.on = !SAVE.d.tutDone && !S.lab && !DEV.on ? 1 : 0;
    this.seen = {};
    if (this.on) setTimeout(() => this.show("move"), 1500);
  },
  show(k) {
    if (!this.on || this.seen[k] || S.mode !== "play") return;
    this.seen[k] = 1;
    const el = $("tutTip");
    el.innerHTML = "<b>DICA</b><span>" + this.T[k]() + "</span><button>OK</button>";
    el.classList.remove("hidden");
    el.querySelector("button").onclick = () => el.classList.add("hidden");
    clearTimeout(this.t);
    this.t = setTimeout(() => el.classList.add("hidden"), 8000);
    if (Object.keys(this.seen).length >= 5) {
      this.on = 0;
      SAVE.d.tutDone = 1;
      SAVE.save();
    }
  },
  kill() {
    if (!this.on || this.seen.kill) return;
    setTimeout(() => this.show("kill"), 300);
    setTimeout(() => this.show("buy"), 11000);
  },
  round(n) {
    if (this.on && n === 2) setTimeout(() => this.show("bar"), 1200);
    if (this.on && n === 3) setTimeout(() => this.show("round"), 1200);
  }
};
$("bHelp").onclick = () => {`);
rep(`function startGame() {
  labEnd();`, `function startGame() {
  labEnd();
  try {
    TUT.start();
  } catch (e) {
  }`);
rep('function killZ(z, head, src) {', `function killZ(z, head, src) {
  if (typeof TUT !== "undefined" && TUT.on) TUT.kill();`);
rep('function startRound(n2) {', `function startRound(n2) {
  if (typeof TUT !== "undefined" && TUT.on) TUT.round(n2);`);

// ---------- zumbi num andar de cima (mezanino) desce pela escada em vez de se jogar ----------
rep('function surfY(p, x) {', `// v28.6: ponta de cima da escada mais perto no andar do zumbi (sem parede no meio): [x de cima, x de baixo, escada]
function zStairTop(z) {
  let best = null, bd = 1e9;
  for (const s2 of M().plats) {
    if (!s2.st) continue;
    const ya = surfY(s2, s2.x1), yb = surfY(s2, s2.x2), top = ya < yb ? s2.x1 : s2.x2, bot = ya < yb ? s2.x2 : s2.x1;
    if (Math.abs(Math.min(ya, yb) - z.y) > 8) continue;
    const d = Math.abs(top - z.x);
    if (d < bd && !wallBetween(z.x, top, z.y, z.thruDoors)) {
      bd = d;
      best = [top, bot, s2];
    }
  }
  return best;
}
let ZST = null;
function surfY(p, x) {`);
rep(`        z.navJ = 0.5;
      } else if (z.onGround) {
        const st = navNext(z, p)`, `        z.navJ = 0.5;
      } else if (z.onGround && z.y < G0 - 10 && p.y > z.y + 20 && !(z.plat && z.plat.st) && (ZST = zStairTop(z))) {
        if (Math.abs(ZST[0] - z.x) > 5) wantX = ZST[0];
        else {
          z.plat = ZST[2];
          z.y = z.gy = surfY(ZST[2], z.x);
          z.vy = 0;
          wantX = ZST[1];
        }
      } else if (z.onGround) {
        const st = navNext(z, p)`);

// ---------- passe: aviso de evento de XP ----------
rep('    $("ecSeason").textContent = P ? P.name : "SEM TEMPORADA";', `    $("ecSeason").textContent = P ? P.name : "SEM TEMPORADA";
    const evH = d.event ? '<p class="ecNote" style="color:#ffd84a;font-weight:800">EVENTO ' + esc(d.event.name) + ": XP do passe x" + d.event.mult + " até " + new Date(d.event.ends).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) + "</p>" : "";`);
rep(`      let h = '<div class="ecRow"><div><b>Nível ' + lv`, `      let h = evH + '<div class="ecRow"><div><b>Nível ' + lv`);

fs.writeFileSync(F, s);
console.log('ok', s.length);
