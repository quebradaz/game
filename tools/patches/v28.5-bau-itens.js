// v28.5: baú animado com raridade, 120 itens novos das caixas, temporada 1 (5 lendários + 2 raros no passe e na loja),
// boné/chapéu com cabelo curto (personagem e zumbis), zumbi sem corte de sombra na escada, feedback na tela inicial
// e ranking com pódio, foto e rolagem lateral entre mapas. Uso: node tools/patches/v28.5-bau-itens.js index.html
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
const LIST = require('./v28.5-itens.js');

// ---------- versão ----------
s = s.replace(/const QZ_VERSION='[^']*';/, "const QZ_VERSION='28.5';");
s = s.replace(/const QZ_NOTE='[^']*';/, "const QZ_NOTE='Bau animado com raridade, 120 roupas novas, ranking com podio e foto, feedback e bone sem cabelo vazando';");

// ---------- CSS ----------
const i = s.indexOf('</style>');
s = s.slice(0, i) + nl(`/* v28.5: feedback, baú, ranking com pódio */
#bFeed{position:absolute;right:max(12px,var(--sar));top:calc(max(10px,var(--sat)) + 40px);font-family:var(--fy);font-size:12px;padding:8px 12px;background:rgba(10,8,16,.82);color:#7dff6a;border:2px solid #000;box-shadow:inset 0 0 0 1px #4a4458,3px 3px 0 rgba(0,0,0,.5);zoom:var(--ui)}
@media (max-height:500px){#bFeed{zoom:calc(.8*var(--ui))}}
.fbKinds{display:flex;gap:6px;flex-wrap:wrap}
#fbText{width:100%;box-sizing:border-box;min-height:110px;resize:vertical;background:#0e0c14;color:#fff;border:2px solid var(--line);border-radius:8px;padding:8px;font:14px/1.4 system-ui,sans-serif}
#fbMsg{min-height:18px}
#chestFx{position:fixed;inset:0;z-index:60;background:radial-gradient(ellipse at 50% 60%,#1e1432,#000 75%);display:flex;align-items:center;justify-content:center;flex-direction:column;cursor:pointer;touch-action:manipulation}
#chestFx.hidden{display:none}
#chestFx canvas{width:min(92vw,128vh);height:auto;image-rendering:pixelated;aspect-ratio:16/10}
#chestFx .cfPrize{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%) scale(.2);opacity:0;transition:transform .5s cubic-bezier(.2,1.6,.4,1),opacity .3s;display:flex;flex-direction:column;align-items:center;gap:6px;pointer-events:none}
#chestFx.rev .cfPrize{transform:translate(-50%,-70%) scale(1);opacity:1}
#chestFx .cfPrize canvas,#chestFx .cfPrize img{width:min(26vh,160px);height:min(26vh,160px);aspect-ratio:1;image-rendering:pixelated;filter:drop-shadow(0 0 14px var(--cf))}
#chestFx .cfTier{font-family:system-ui,sans-serif;font-weight:900;font-size:clamp(14px,3.4vh,22px);letter-spacing:3px;color:var(--cf);text-shadow:0 0 12px var(--cf),2px 2px 0 #000}
#chestFx .cfName{font-family:system-ui,sans-serif;font-weight:800;font-size:clamp(16px,4.6vh,30px);color:#fff;text-shadow:2px 2px 0 #000;text-align:center;max-width:90vw}
#chestFx .cfTap{position:absolute;bottom:max(14px,var(--sab));font-size:13px;color:#a59fb4;opacity:0;transition:opacity .4s}
#chestFx.done .cfTap{opacity:1}
.rkTrack{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;width:100%;gap:0}
.rkTrack::-webkit-scrollbar{display:none}
.rkSlide{flex:0 0 100%;scroll-snap-align:center;box-sizing:border-box;padding:0 2px}
.rkPod{display:grid;grid-template-columns:1fr 1.15fr 1fr;align-items:end;gap:8px;padding:14px 4px 6px}
.rkP{display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;position:relative;min-width:0}
.rkP .av{width:64px;height:64px;border-radius:50%;object-fit:cover;border:3px solid var(--pc);box-shadow:0 0 18px var(--pc),0 0 0 3px #000;background:#2a2638;display:flex;align-items:center;justify-content:center;font-family:var(--fy);font-size:26px;color:#fff}
.rkP.p1 .av{width:84px;height:84px;animation:rkGlow 2.4s ease-in-out infinite}
.rkP .nm{font-family:var(--fy);font-size:15px;color:#fff;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rkP .st{font-size:12px;color:#c8c2d8}
.rkP .bl{width:100%;border-radius:8px 8px 0 0;background:linear-gradient(180deg,var(--pc),rgba(0,0,0,.4));display:flex;align-items:flex-start;justify-content:center;font-family:var(--fy);font-size:24px;color:#000;padding-top:4px;box-shadow:inset 0 2px 0 rgba(255,255,255,.4)}
.rkP.p1{--pc:#ffc21a}.rkP.p2{--pc:#c8d0dc}.rkP.p3{--pc:#d0803a}
.rkP.p1 .bl{height:70px}.rkP.p2 .bl{height:50px}.rkP.p3 .bl{height:36px}
.rkP.p1::before{content:'\\2605';position:absolute;top:-16px;color:#ffc21a;font-size:22px;text-shadow:0 0 10px #ffc21a}
.rkP.me .nm{color:#7dff6a}
@keyframes rkGlow{50%{box-shadow:0 0 30px var(--pc),0 0 0 3px #000}}
.rkList .rkRow{grid-template-columns:40px 30px minmax(0,1fr) 64px 80px 50px}
.rkRow .ava{width:26px;height:26px;border-radius:50%;object-fit:cover;background:#2a2638;display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff}
.rkDots{display:flex;justify-content:center;gap:6px;padding:4px}
.rkDots i{width:7px;height:7px;border-radius:50%;background:#4a4458}.rkDots i.on{background:var(--red)}
`) + s.slice(i);

// ---------- HTML: botão de feedback, tela de feedback e camada do baú ----------
rep('  <button id="bHelp" class="yo">AJUDA</button>', '  <button id="bHelp" class="yo">AJUDA</button>\n  <button id="bFeed" class="yo">FEEDBACK</button>');
rep('<div id="rankScr" class="screen shadeFull hidden">', `<div id="feedScr" class="screen shadeFull hidden">
  <div class="rkWrap">
  <div class="selHead"><div class="h2 yo"><small>CONTE PRA GENTE</small>FEEDBACK</div><button class="btn alt yo" id="bFeedBack">VOLTAR</button></div>
  <div class="panel wide rkBox">
    <p>Achou um bug, tem uma ideia ou quer elogiar? Escreva aqui. A versão do jogo e o tipo de aparelho vão junto, para ajudar a achar o problema.</p>
    <div class="seg fbKinds" id="fbKinds"><button data-k="bug" class="on">BUG</button><button data-k="ideia">IDEIA</button><button data-k="elogio">ELOGIO</button><button data-k="outro">OUTRO</button></div>
    <textarea id="fbText" maxlength="1000" placeholder="O que aconteceu? Em qual mapa e onda?"></textarea>
    <p id="fbMsg" class="ecNote"></p>
    <button class="btn yo" id="bFeedSend">ENVIAR</button>
  </div>
  </div>
</div>
<div id="chestFx" class="hidden"><canvas id="cfCv" width="320" height="200"></canvas><div class="cfPrize"><div id="cfIcon"></div><b class="cfTier" id="cfTier"></b><b class="cfName" id="cfName"></b></div><span class="cfTap">Toque para continuar</span></div>
<div id="rankScr" class="screen shadeFull hidden">`);
rep('  <div class="rkTabs" id="rkTabs"></div>\n  <div class="panel wide rkBox"><div id="rkList" class="rkList"></div></div>',
  '  <div class="rkTabs" id="rkTabs"></div>\n  <div class="panel wide rkBox"><div id="rkList" class="rkTrack"></div><div class="rkDots" id="rkDots"></div></div>');

// ---------- sombra: zumbi atravessando a linha do teto (escada, abertura) recebe a luz de fora até entrar ----------
rep(`    if (x1 > x0) lx.drawImage(L.skyLift, 0, 0, 1, a.y1, x0, 0, x1 - x0, a.y1);
  }
  const lampK`, `    if (x1 > x0) lx.drawImage(L.skyLift, 0, 0, 1, a.y1, x0, 0, x1 - x0, a.y1);
  }
  if (m.ambZ) try { zLift(m, camX); } catch (e) {}
  const lampK`);
rep('function lights(c, m, L, camX) {', `// v28.5: a zona de fora clareia só acima do teto da sala (a.y1). Um zumbi que desce a escada fica metade claro e
// metade escuro, cortado por uma linha reta. Aqui a parte dele abaixo da linha recebe a mesma luz de cima,
// sumindo aos poucos conforme ele entra (proporção do corpo que já passou da linha).
let ZL_C = null;
const zLiftA = (y) => y < 200 ? 0.78 - y / 200 * 0.28 : 0.5 - (y - 200) / 160 * 0.32;
function zLift(m, camX) {
  for (const z of S.zs) {
    if (z.state === "dead" || !z._fk) continue;
    const a = m.ambZ.find((q) => z.x >= q.x0 && z.x < q.x1);
    if (!a || a.y1 >= 300) continue;
    const sc = z.sc || 1, h = (z.h || 50) * sc, top = z.y - h;
    if (a.y1 <= top || a.y1 >= z.y) continue;
    const f = clamp((a.y1 - top) / h * 1.6, 0, 1), al = zLiftA(Math.max(0, a.y1 - 1)) * f;
    if (al < 0.02) continue;
    if (!ZL_C || ZL_C[0].width !== lc.width || ZL_C[0].height !== lc.height) ZL_C = mkCanvas(lc.width, lc.height);
    const [cv2, x2] = ZL_C;
    x2.setTransform(1, 0, 0, 1, 0, 0);
    x2.globalCompositeOperation = "source-over";
    x2.clearRect(0, 0, cv2.width, cv2.height);
    x2.setTransform(LQ, 0, 0, LQ, -camX * LQ, 0);
    drawZimg(x2, VIMG[z.v + ":" + z._fk] || IMG[z._fk], z._fk, z._fr | 0, z.x, z.y, z.face, 1, sc);
    x2.setTransform(LQ, 0, 0, LQ, 0, 0);
    x2.globalCompositeOperation = "source-in";
    x2.fillStyle = "rgba(0,0,0," + al.toFixed(3) + ")";
    x2.fillRect(0, a.y1, VW, VH - a.y1);
    lx.save();
    lx.setTransform(1, 0, 0, 1, 0, 0);
    lx.drawImage(cv2, 0, 0);
    lx.restore();
  }
}
function lights(c, m, L, camX) {`);

// ---------- boné e chapéu: cabelo curto por baixo (nada vaza por fora) ----------
rep('  const A = rigSkel(po);\n  for (const ly of RIG_ORDER) {', '  const A = rigSkel(po);\n  L.hatOn = !!E.hat;\n  for (const ly of RIG_ORDER) {');
rep('    const st = rigHairRows(HAIR_STYLES[look.hair] || HAIR_STYLES[0]);',
  '    const st = look.hatOn && !(HAIR_STYLES[look.hair] || HAIR_STYLES[0]).skinHair ? rigHairUnder() : rigHairRows(HAIR_STYLES[look.hair] || HAIR_STYLES[0]);');
rep('const RIG_DEFAULT_LOOK = { skin: 0, eyes: 0, hair: 0, hairC: 0 };', `/* v28.5: com boné ou chapéu, qualquer cabelo vira o curto, só abaixo da aba (costeleta e nuca): nenhum fio por cima nem por fora */
let RIG_HAIR_UNDER = null;
function rigHairUnder() {
  if (RIG_HAIR_UNDER) return RIG_HAIR_UNDER;
  const b = HAIR_STYLES[0].rows.map((r, y) => y < 4 ? ".".repeat(r.length) : r);
  return RIG_HAIR_UNDER = { name: "Sob o bon\\xE9", rows: b, ox: 0, oy: 0 };
}
/* bonés dos zumbis: desenhados no rig (acompanham a cabeça em todo quadro) no lugar do retângulo por cima */
const ZHAT = {
  cap: { id: "bone", pal: { base: "#c0392b", shade: "#8e1611", light: "#e05a4a" } },
  garicap: { id: "bone", pal: { base: "#ff9a3c", shade: "#c25a1c", light: "#ffe27a" } }
};
const RIG_DEFAULT_LOOK = { skin: 0, eyes: 0, hair: 0, hairC: 0 };`);
rep('      feet: g2("feet"), belt: null, face: null, hat: null, back: null, front: null',
  '      feet: g2("feet"), belt: null, face: null, hat: ZHAT[v.acc] || null, back: null, front: null');
rep('hair: (o.hair !== void 0 ? o.hair : vid ? d.hair + hsh % 2 : d.hair) % hairN,',
  'hair: v.acc === "hardhat" || v.acc === "moto" ? 1 % hairN : (o.hair !== void 0 ? o.hair : vid ? d.hair + hsh % 2 : d.hair) % hairN,');
rep('  if (!v.acc || z.armor === 0 && (v.acc === "hardhat" || v.acc === "moto")) return;',
  '  if (!v.acc || ZHAT[v.acc] || z.armor === 0 && (v.acc === "hardhat" || v.acc === "moto")) return;');

// ---------- itens novos ----------
const data = LIST.map((it) => [it.id, it.slot, it.kind, it.name, it.base, it.d, it.rar, it.src, it.spot || 0]);
rep('const LOOK = (function () {', '// v28.5: itens das caixas (cx_c comuns, cx_r raros, cx_l lendários) e lendários novos da temporada 1. Gerado de tools/patches/v28.5-itens.js\n// [id, slot, tipo, nome, cor base, detalhe, raridade, origem, ponto do acessório]\nconst V285_ITEMS = ' + JSON.stringify(data) + ';\nconst LOOK = (function () {');
rep('  for (const k in ITEMS) ITEMS[k].id = k;\n', `  V285_ITEMS.forEach((q) => {
    const b = q[4], x = { d: q[5], unlock: { src: q[7] } };
    if (q[8]) x.spot = q[8];
    if (q[1] === "head") x.hideHair = 1;
    if (q[2] === "capacete") x.hideFace = 1;
    if (q[2] === "jaqueta") x.in = [q[5], shade(q[5], -0.4)];
    ITEMS[q[0]] = I(q[1], q[2], q[3], 0, q[6], [b, shade(b, -0.4), shade(b, 0.28)], x);
  });
  for (const k in ITEMS) ITEMS[k].id = k;
`);

// ---------- caixas: chances novas e baú animado ----------
rep(`<div class="ecOdds"><b>Chances de cada caixa</b><span></span><span>200 a 600 moedas</span><b>80%</b><span>Roupa rara ou lendária que você não tem</span><b>12%</b><span>1 chip de tecnologia</span><b>6%</b><span>25 Z-Coin</span><b>2%</b></div><p class="ecNote">Skins de arma entram nas caixas numa atualização futura.</p>`,
  `<div class="ecOdds"><b>Chances de cada caixa</b><span></span><span style="color:#ffc21a">Roupa lendária que você não tem</span><b>3%</b><span style="color:#ffc21a">25 Z-Coin</span><b>1%</b><span style="color:#c86aff">Roupa rara que você não tem</span><b>11%</b><span style="color:#c86aff">1 chip de tecnologia</span><b>3%</b><span>Roupa comum que você não tem</span><b>45%</b><span>200 a 600 moedas</span><b>37%</b></div><p class="ecNote">São 40 roupas de cada raridade. Se você já tiver todas de uma raridade, vem o prêmio dela no lugar (moedas, chip ou Z-Coin). Skins de arma entram numa atualização futura.</p>`);
rep(`.then((r) => this.got(r).then(() => {
      this.show("box");
      const el = $("ecBoxRes");
      if (el) el.textContent = "Você ganhou: " + this.prize(r.kind, r.amount, r.item) + "!";
    }), fail);`, `.then((r) => {
      CHEST.play(r, this.prize(r.kind, r.amount, r.item));
      return this.got(r).then(() => this.show("box"));
    }, fail);`);
rep('const ECO_ERR = {', `// v28.5: baú que treme, abre e solta feixes de luz da cor da raridade (branco comum, roxo raro, dourado lendário)
const CHEST = {
  C: ["#ffffff", "#ffffff", "#b04aff", "#ffc21a"],
  N: ["", "COMUM", "RARO", "LENDÁRIO"],
  tier(r) {
    if (r.tier) return r.tier;
    if (r.kind === "item") { const it = LOOK.ITEMS[r.item]; return it && it.rar >= 4 ? 3 : it && it.rar >= 2 ? 2 : 1; }
    return r.kind === "zcoin" ? 3 : r.kind === "chip" ? 2 : 1;
  },
  play(r, label) {
    const el = $("chestFx"), cv = $("cfCv"), x = cv.getContext("2d"), t = this.tier(r), col = this.C[t], ic = $("cfIcon");
    this.r = r; this.t = t; this.col = col; this.t0 = performance.now(); this.skip = 0; this.parts = []; this.snd = 0;
    el.style.setProperty("--cf", col);
    el.className = "";
    $("cfTier").textContent = this.N[t];
    $("cfName").textContent = label;
    ic.innerHTML = "";
    if (r.kind === "item" && LOOK.ITEMS[r.item]) { const c = document.createElement("canvas"); LOOK.thumb(c, [r.item]); ic.append(c); }
    else { const im = new Image(); im.src = r.kind === "zcoin" ? ICON_ZC : r.kind === "chip" ? ICON_CHIP : ICON_GOLD; ic.append(im); }
    x.imageSmoothingEnabled = false;
    const loop = () => {
      if (el.classList.contains("hidden")) return;
      this.draw(x, (performance.now() - this.t0) / 1e3);
      requestAnimationFrame(loop);
    };
    el.onclick = () => {
      const k = (performance.now() - this.t0) / 1e3;
      if (k < 2.1) this.t0 = performance.now() - 2.1e3;
      else el.classList.add("hidden");
    };
    requestAnimationFrame(loop);
  },
  draw(x, k) {
    const W = 320, H = 200, t = this.t, col = this.col, cx = 160, by = 168, open = k > 1.5, el = $("chestFx");
    x.clearRect(0, 0, W, H);
    const sh = k < 1.5 ? Math.sin(k * (30 + k * 30)) * Math.min(3, k * 2.4) : 0, ox = Math.round(cx + sh);
    if (open) {
      const q = Math.min(1, (k - 1.5) / 0.4), n = t === 3 ? 14 : t === 2 ? 10 : 7;
      x.save();
      x.translate(cx, by - 26);
      x.globalCompositeOperation = "lighter";
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (i / n - 0.5) * 2.6 + Math.sin(k * 0.8 + i) * 0.06, L = (110 + (i % 3) * 20) * q, w = 0.06 + (i % 2) * 0.04;
        x.globalAlpha = (0.45 + 0.25 * Math.sin(k * 3 + i * 1.7)) * q;
        const bg = x.createRadialGradient(0, 0, 0, 0, 0, Math.max(1, L));
        bg.addColorStop(0, col); bg.addColorStop(0.55, col); bg.addColorStop(1, "rgba(0,0,0,0)");
        x.fillStyle = bg;
        x.beginPath();
        x.moveTo(0, 0);
        x.lineTo(Math.cos(a - w) * L, Math.sin(a - w) * L);
        x.lineTo(Math.cos(a + w) * L, Math.sin(a + w) * L);
        x.fill();
      }
      x.globalAlpha = 0.5 * q;
      const g2 = x.createRadialGradient(0, 0, 2, 0, 0, 70);
      g2.addColorStop(0, col); g2.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = g2;
      x.fillRect(-80, -80, 160, 160);
      x.restore();
      if (this.parts.length < (t === 3 ? 90 : t === 2 ? 60 : 35) && Math.random() < 0.9) this.parts.push({ x: cx + (Math.random() - 0.5) * 50, y: by - 24, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 90, l: 0 });
      if (!this.snd) {
        this.snd = 1;
        try { (t >= 2 ? SFX.buy : SFX.swap)(); } catch (e) {}
        el.classList.add("rev");
        setTimeout(() => el.classList.add("done"), 700);
      }
    } else if (k > 1.15 && Math.random() < 0.5) this.parts.push({ x: ox + (Math.random() - 0.5) * 44, y: by - 27, vx: (Math.random() - 0.5) * 20, vy: -20 - Math.random() * 30, l: 0 });
    // baú: corpo de madeira com cintas de metal, tampa que sobe ao abrir
    const P = (X, Y, w, h, c) => { x.fillStyle = c; x.fillRect(Math.round(X), Math.round(Y), w, h); };
    const bx = ox - 26;
    P(bx - 2, by + 2, 56, 4, "rgba(0,0,0,.5)");
    if (open) {
      // tampa aberta, tombada pra trás (aparece por trás do corpo)
      const q = Math.min(1, (k - 1.5) / 0.25), lh = Math.round(4 + 12 * q);
      P(bx - 1, by - 26 - lh, 54, lh + 1, "#0a0608");
      P(bx, by - 25 - lh, 52, lh, "#4a2a12");
      P(bx + 6, by - 25 - lh, 4, lh, "#6a645a"); P(bx + 42, by - 25 - lh, 4, lh, "#6a645a");
    }
    P(bx, by - 26, 52, 28, "#0a0608");
    P(bx + 1, by - 25, 50, 26, "#7a4a24");
    P(bx + 1, by - 25, 50, 3, "#9a6232");
    for (let i = 0; i < 4; i++) P(bx + 1, by - 18 + i * 5, 50, 1, "#5a3418");
    P(bx + 6, by - 25, 4, 26, "#8a8478"); P(bx + 42, by - 25, 4, 26, "#8a8478");
    P(bx + 6, by - 25, 1, 26, "#c8c2b4"); P(bx + 42, by - 25, 1, 26, "#c8c2b4");
    if (open) {
      const q = Math.min(1, (k - 1.5) / 0.25);
      P(bx + 2, by - 27, 48, 3, col);
      x.globalAlpha = 0.85;
      P(bx + 3, by - 26, 46, 2, "#fff");
      x.globalAlpha = 1;
    } else {
      P(bx, by - 42, 52, 17, "#0a0608");
      P(bx + 1, by - 41, 50, 15, "#6a3e1e");
      P(bx + 1, by - 41, 50, 2, "#8a5630");
      P(bx + 6, by - 41, 4, 15, "#8a8478"); P(bx + 42, by - 41, 4, 15, "#8a8478");
      P(bx + 6, by - 41, 1, 15, "#c8c2b4"); P(bx + 42, by - 41, 1, 15, "#c8c2b4");
      // fresta brilhando cada vez mais
      const gl = Math.min(1, k / 1.3);
      x.globalAlpha = 0.4 + 0.6 * gl * (0.7 + 0.3 * Math.sin(k * 25));
      P(bx + 1, by - 26, 50, 1, "#fff8d8");
      x.globalAlpha = 1;
      P(bx + 22, by - 30, 8, 9, "#0a0608");
      P(bx + 23, by - 29, 6, 7, "#d8a820");
      P(bx + 25, by - 27, 2, 3, "#2a1a08");
    }
    // faíscas
    for (const p of this.parts) {
      p.l += 1 / 60; p.x += p.vx / 60; p.y += p.vy / 60; p.vy += 30 / 60;
      const a = Math.max(0, 1 - p.l / 1.6);
      if (a <= 0) continue;
      x.globalAlpha = a;
      P(p.x, p.y, p.l < 0.3 ? 2 : 1, p.l < 0.3 ? 2 : 1, open ? col : "#fff8d8");
    }
    x.globalAlpha = 1;
    if (open && k < 1.75) { x.globalAlpha = 1 - (k - 1.5) / 0.25; P(0, 0, W, H, col); x.globalAlpha = 1; }
  }
};
const ECO_ERR = {`);

// ---------- feedback ----------
rep('$("bHelp").onclick = () => {', `// v28.5: feedback dos jogadores (bug, ideia, elogio). Vai para a tabela feedback do Supabase; funciona sem conta.
let fbKind = "bug";
$("bFeed").onclick = () => {
  SFX.swap && SFX.swap();
  $("fbMsg").textContent = "";
  UI.show("feedScr");
};
$("bFeedBack").onclick = () => UI.show("title");
$("fbKinds").onclick = (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  fbKind = b.dataset.k;
  [...$("fbKinds").children].forEach((x) => x.classList.toggle("on", x === b));
};
$("bFeedSend").onclick = () => {
  const t = $("fbText").value.trim(), m = $("fbMsg"), b = $("bFeedSend");
  if (t.length < 3) return m.textContent = "Escreva um pouco mais.";
  const dev = (/iPhone|iPad|iPod/.test(navigator.userAgent) ? "iOS" : /Android/.test(navigator.userAgent) ? "Android" : "PC") + " " + innerWidth + "x" + innerHeight + (matchMedia("(pointer:coarse)").matches ? " toque" : "");
  const args = { p_kind: fbKind, p_body: t, p_ver: QZ_VERSION, p_dev: dev };
  b.disabled = true;
  m.textContent = "Enviando...";
  const go = NET.logged ? NET.rpc("send_feedback", { p_kind: args.p_kind, p_body: args.p_body, p_ver: args.p_ver, p_device: dev }) : fetch("https://wjjuuqvdttjuzsgqueuj.supabase.co/rest/v1/rpc/send_feedback", { method: "POST", headers: { apikey: "sb_publishable_4qQQ9BLb8BsTwPv9kHa1RQ_diKNRwvY", "Content-Type": "application/json" }, body: JSON.stringify({ p_kind: args.p_kind, p_body: args.p_body, p_ver: args.p_ver, p_device: dev }) }).then((r) => r.ok ? null : r.text().then((x) => { throw new Error(x); }));
  go.then(() => {
    $("fbText").value = "";
    m.textContent = "Recebido. Valeu por ajudar a melhorar a quebrada!";
  }).catch((e) => {
    m.textContent = String(e && e.message || "").indexOf("LIMITE") >= 0 ? "Muitos envios hoje. Tente amanhã." : "Não deu para enviar. Confira a internet e tente de novo.";
  }).then(() => b.disabled = false);
};
$("bHelp").onclick = () => {`);

// ---------- ranking: pódio com foto + lista, rolagem lateral entre mapas ----------
const a0 = s.indexOf(nl('function rankRow(r) {')), a1 = s.indexOf(nl('$("bRank").onclick = () => {'));
if (a0 < 0 || a1 < a0) throw new Error('rank block');
s = s.slice(0, a0) + nl(`const rkEsc = (t) => String(t == null ? "" : t).replace(/[<>&"]/g, "");
function rkAv(r, cls) {
  const ini = rkEsc(String(r.name || "?").charAt(0).toUpperCase());
  return r.photo && /^https:\\/\\//.test(r.photo) ? '<img class="' + cls + '" src="' + rkEsc(r.photo) + '" referrerpolicy="no-referrer" alt="" onerror="this.outerHTML=\\'<span class=&quot;' + cls + '&quot;>' + ini + '</span>\\'">' : '<span class="' + cls + '">' + ini + "</span>";
}
const rkTime = (t) => Math.floor((t | 0) / 60) + ":" + String((t | 0) % 60).padStart(2, "0");
function rankRow(r) {
  return '<div class="rkRow' + (r.me ? " me" : "") + '"><b>' + r.pos + "º</b>" + rkAv(r, "ava") + "<span>" + rkEsc(r.name) + "</span><span>onda " + r.best_wave + "</span><span>" + r.best_kills + " abates</span><span>" + rkTime(r.best_seconds) + "</span></div>";
}
function rankPod(a) {
  const p = (r, n) => r ? '<div class="rkP p' + n + (r.me ? " me" : "") + '">' + rkAv(r, "av") + '<span class="nm">' + rkEsc(r.name) + '</span><span class="st">onda ' + r.best_wave + " · " + r.best_kills + ' abates</span><div class="bl">' + n + "</div></div>" : '<div class="rkP p' + n + '"><span class="av">?</span><span class="nm">—</span><span class="st">vaga aberta</span><div class="bl">' + n + "</div></div>";
  const t = a.filter((r) => r.pos <= 3);
  return '<div class="rkPod">' + p(t[1], 2) + p(t[0], 1) + p(t[2], 3) + "</div>";
}
let rankOrd = [], rankSeen = {};
function rankFill(mi) {
  const box = $("rk_" + mi);
  if (!box || rankSeen[mi]) return;
  rankSeen[mi] = 1;
  box.innerHTML = "<p>Carregando...</p>";
  NET.board(MAPS[mi].id).then((a) => {
    box.innerHTML = !a || !a.length ? rankPod([]) + "<p>Ninguém no ranking deste mapa ainda. Seja o primeiro.</p>" : rankPod(a) + '<div class="rkList">' + (a.some((r) => r.pos > 3) ? '<div class="rkRow hd"><span>#</span><span></span><span>NOME</span><span>ONDA</span><span>ABATES</span><span>TEMPO</span></div>' + a.filter((r) => r.pos > 3).map(rankRow).join("") : "") + "</div>";
  }).catch((e) => {
    rankSeen[mi] = 0;
    box.innerHTML = "<p>" + acctErr(e) + "</p>";
  });
}
function rankLoad(mi, noScroll) {
  rankMap = mi;
  const k = rankOrd.indexOf(mi);
  [...$("rkTabs").children].forEach((b) => b.classList.toggle("sel", +b.dataset.mi === mi));
  [...$("rkDots").children].forEach((d, i) => d.classList.toggle("on", i === k));
  const tb = $("rkTabs").children[k];
  if (tb && tb.scrollIntoView) try { tb.scrollIntoView({ block: "nearest", inline: "center" }); } catch (e) {}
  if (!noScroll) { const tr = $("rkList"); tr.scrollTo({ left: k * tr.clientWidth, behavior: "smooth" }); }
  rankFill(mi);
}
function showRank() {
  const tabs = $("rkTabs"), ord = campMaps(curCamp), tr = $("rkList");
  $("rkCamp").textContent = (CAMPAIGNS[curCamp] || CAMPAIGNS[0]).name;
  tabs.innerHTML = "";
  rankOrd = ord;
  rankSeen = {};
  tr.innerHTML = ord.map((i) => '<div class="rkSlide" id="rk_' + i + '"></div>').join("");
  $("rkDots").innerHTML = ord.map(() => "<i></i>").join("");
  ord.forEach((i) => {
    const b = document.createElement("button");
    b.textContent = MAPS[i].name;
    b.dataset.mi = i;
    b.onclick = () => rankLoad(i);
    tabs.append(b);
  });
  let st = 0;
  tr.onscroll = () => {
    clearTimeout(st);
    st = setTimeout(() => {
      const k = Math.round(tr.scrollLeft / Math.max(1, tr.clientWidth)), mi = rankOrd[k];
      if (mi != null && mi !== rankMap) rankLoad(mi, 1);
    }, 90);
  };
  UI.show("rankScr");
  const mi = ord.indexOf(S.mi) >= 0 ? S.mi : ord[0];
  requestAnimationFrame(() => { tr.scrollLeft = ord.indexOf(mi) * tr.clientWidth; rankLoad(mi, 1); });
}
`) + s.slice(a1);

fs.writeFileSync(F, s);
console.log('ok', s.length);
// iPhone -> iOS nos textos
{
  let t = fs.readFileSync(F, 'utf8');
  t = t.split('no celular, no PC e no iPhone.').join('no PC, no Android e no iOS.');
  fs.writeFileSync(F, t);
}
// a tela de feedback entra na lista de telas do UI.show
{
  let t = fs.readFileSync(F, 'utf8');
  const a = '"login", "nameScr", "rankScr", "ecoScr"]) $(s)';
  if (t.split(a).length !== 2) throw new Error('ui list');
  t = t.split(a).join('"login", "nameScr", "rankScr", "ecoScr", "feedScr"]) $(s)');
  fs.writeFileSync(F, t);
}
// variante que só muda o boné também ganha folha própria
{
  let t = fs.readFileSync(F, 'utf8');
  const a = 'if (v.shirt || v.pants || v.skin || v.hair || VO[vid]) pending.push';
  if (t.split(a).length !== 2) throw new Error('zrig pend');
  t = t.split(a).join('if (v.shirt || v.pants || v.skin || v.hair || VO[vid] || ZHAT[v.acc]) pending.push');
  fs.writeFileSync(F, t);
}
