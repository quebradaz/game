// v28.9: menu de HABILIDADES novo. A árvore vira um mapa de medalhões ligados por linhas (acendem quando o
// pré-requisito está cumprido) e um painel de detalhe com efeito AGORA › PRÓXIMO, checklist do que falta e
// um botão grande de melhorar. Toque seleciona (não compra), setas/Enter no PC. Texto corrido em fonte de
// sistema pra ler em tela pequena; nomes e números seguem na fonte pixel, grandes.
// Feito em cima da v28.8 (tools/patches/v28.8-niveis.js): usa skillSoon/skillLvOk/SKILLS[id].lvl.
// Uso: node tools/patches/v28.9-habilidades.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};
const cut = (from, to, b) => {
  const i = s.indexOf(from), j = s.indexOf(to, i);
  if (i < 0 || j < 0 || s.indexOf(from, i + 1) >= 0) throw new Error('cut ' + from.slice(0, 60));
  s = s.slice(0, i) + b + s.slice(j);
};

// ---------- 1. CSS: troca o bloco .sk* antigo ----------
cut(`.skHead{display:flex;`, `@media (max-height:440px){.skNode .skT small{font-size:11px}.skNode{padding:4px 4px 4px 7px}.skHead p{font-size:11px}}\n`, `/* ==== HABILIDADES (v28.9): mapa de medalhões + painel de detalhe ==== */
.lkPanel.skMode{max-width:min(1080px,98vw)}
.lkPanel.skMode .lkLeft{display:none}
.lkPanel.skMode .lkRight{overflow:hidden}
.skWrap{--skt:600 14px/1.3 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;display:flex;gap:12px;min-height:0;flex:1 1 auto}
.skMap{flex:1 1 auto;min-width:0;overflow:auto;padding:2px 4px 6px;position:relative;background:radial-gradient(ellipse at 50% 0,rgba(255,216,74,.06),transparent 70%)}
.skGrid{--d:50px;display:grid;gap:20px 8px;align-items:start}
.skBr{display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--bc);padding-bottom:2px}
.skBr b{font-family:var(--fz);font-size:20px;letter-spacing:2px;font-weight:400}
.skBr .bar{width:72%;height:4px;background:#2a2433;border:1px solid #000}.skBr .bar i{display:block;height:100%;background:var(--bc)}
.skCell{position:relative;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0}
.skCell.child::before{content:"";position:absolute;left:50%;bottom:100%;width:4px;height:22px;margin-left:-2px;background:repeating-linear-gradient(#3a3446 0 4px,transparent 4px 7px)}
.skCell.child.lit::before{background:var(--bc);box-shadow:0 0 6px var(--bc)}
.skN{position:relative;width:calc(var(--d)*1.42);height:calc(var(--d)*1.42);padding:0;display:grid;place-items:center;background:none;border:0;cursor:pointer;color:var(--bc)}
.skN .dm{width:var(--d);height:var(--d);display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,#2e2838,#16131c 75%);border:3px solid #000;box-shadow:inset 0 0 0 2px var(--bc),3px 3px 0 rgba(0,0,0,.5);transform:rotate(45deg);transition:transform .12s}
.skN .ic{transform:rotate(-45deg);font-size:calc(var(--d)*.46);line-height:1;font-family:system-ui,sans-serif}
.skN .lv{position:absolute;left:50%;bottom:-6px;transform:translateX(-50%);font:700 12px/1 system-ui,sans-serif;background:#0c0a10;color:#e9e4d8;border:2px solid #000;padding:2px 5px;line-height:1;white-space:nowrap}
.skN .lk{position:absolute;right:-4px;top:2px;font:700 11px/1 system-ui,sans-serif;background:#0c0a10;border:2px solid #000;padding:2px 4px;color:#e9e4d8;white-space:nowrap}
.skCell .nm{font-family:var(--fz);font-size:20px;color:#e9e4d8;text-align:center;line-height:1;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:6px}
.skCell.max .dm{background:radial-gradient(circle at 50% 35%,#5a4a18,#231c08 75%);box-shadow:inset 0 0 0 2px #ffd84a,0 0 10px rgba(255,216,74,.45),3px 3px 0 rgba(0,0,0,.5);color:#ffd84a}
.skCell.max .lv{color:#ffd84a}
.skCell.buy .dm{animation:skGlow 1.4s ease-in-out infinite}
.skCell.buy .nm{color:#ffd84a}
.skCell.lvl .dm,.skCell.req .dm,.skCell.soon .dm{filter:grayscale(.85) brightness(.6)}
.skCell.lvl .nm,.skCell.req .nm,.skCell.soon .nm{color:#a59fb4}
.skCell.soon .dm{background:repeating-linear-gradient(135deg,#17141e 0 6px,#211c2a 6px 12px)}
.skCell.sel .dm{outline:3px solid #fff;outline-offset:3px}
.skCell.sel .nm{color:#fff}
.skN:hover .dm{transform:rotate(45deg) scale(1.06)}
.skCell.skJust .dm{animation:skPop .5s ease-out}
.skBurst{position:absolute;left:50%;top:calc(var(--d)*.71);width:7px;height:7px;margin:-3px;background:#ffd84a;box-shadow:0 0 4px #ffd84a;pointer-events:none;animation:skBurst .6s ease-out forwards}
@keyframes skGlow{0%,100%{box-shadow:inset 0 0 0 2px var(--bc),0 0 0 rgba(255,216,74,0),3px 3px 0 rgba(0,0,0,.5)}50%{box-shadow:inset 0 0 0 2px var(--bc),0 0 14px rgba(255,216,74,.8),3px 3px 0 rgba(0,0,0,.5)}}
@keyframes skPop{0%{transform:rotate(45deg) scale(1)}35%{transform:rotate(45deg) scale(1.3)}100%{transform:rotate(45deg) scale(1)}}
@keyframes skBurst{to{transform:translate(var(--dx),var(--dy)) scale(.2);opacity:0}}
.skNext{margin-top:12px;font:var(--skt);color:#bdb6cc;text-align:center}.skNext b{color:#ffd84a;font-weight:700}
.skInfo{flex:0 0 300px;display:flex;flex-direction:column;gap:8px;min-height:0;overflow:hidden;background:#1a1622;border:2px solid #000;box-shadow:inset 0 0 0 1px #3a3446,inset 0 3px 0 var(--bc);padding:10px 12px}
.skInfoB{flex:1 1 auto;min-height:0;overflow:auto;display:flex;flex-direction:column;gap:8px}
.skSum{margin-top:auto;border-top:1px solid #3a3446;padding-top:6px;font:var(--skt);font-size:13px;color:#bdb6cc}.skSum b{display:block;font-family:var(--fz);font-weight:400;font-size:18px;letter-spacing:1px;color:var(--bc);margin-bottom:2px}.skSum div{display:flex;justify-content:space-between;gap:8px}.skSum span{color:#7dff6a}.skSum .z span{color:#6a6478}
.skBal{display:flex;gap:6px;flex-wrap:wrap}
.skBal .chip{font-size:22px;gap:5px;padding:3px 8px 3px 4px}.skBal .chip small{font:var(--skt);font-size:12px;color:#a59fb4}
.skIH{display:flex;align-items:center;gap:10px}
.skIH .big{flex:0 0 auto;width:46px;height:46px;display:grid;place-items:center;font:28px/1 system-ui,sans-serif;color:var(--bc);background:#100d16;border:2px solid #000;box-shadow:inset 0 0 0 2px var(--bc)}
.skIH small{display:block;font-family:var(--fz);font-size:18px;letter-spacing:2px;color:var(--bc)}
.skIH b{display:block;font-family:var(--fz);font-size:30px;color:#ffd84a;font-weight:400;line-height:1.05}
.skDesc{margin:0;font:var(--skt);font-size:15px;color:#f0ecf6}
.skLore{margin:0;font:italic 500 13px/1.3 system-ui,-apple-system,sans-serif;color:#9a93aa}
.skFx{display:flex;align-items:stretch;gap:6px}
.skFx>div{flex:1 1 0;background:#100d16;border:2px solid #000;padding:5px 8px;min-width:0}
.skFx small{display:block;font:var(--skt);font-size:11px;letter-spacing:1px;color:#8a8494}
.skFx b{display:block;font-family:var(--fz);font-size:28px;font-weight:400;color:#e9e4d8;line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.skFx .nx b{color:#7dff6a}.skFx>i{align-self:center;font-style:normal;color:#ffd84a;font-size:20px}
.skPips{display:flex;align-items:center;gap:4px;font:var(--skt);font-size:13px;color:#a59fb4}
.skPips i{flex:0 0 auto;width:18px;height:8px;background:#2a2433;border:1px solid #000}.skPips i.on{background:var(--bc);box-shadow:0 0 4px var(--bc)}.skPips span{margin-left:4px}
.skReq{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:3px;font:var(--skt);font-size:13px}
.skReq li{display:flex;gap:6px;color:#ff8a7a}.skReq li.ok{color:#7dff6a}.skReq li::before{content:"\\2717";flex:0 0 auto}.skReq li.ok::before{content:"\\2713"}
.skBuy{flex:0 0 auto;display:flex;align-items:center;justify-content:center;gap:8px;font-family:var(--fy);font-size:20px;padding:9px 10px;background:linear-gradient(#ffb15a,#e8862a);color:#1a0d00;border:2px solid #000;box-shadow:inset 0 -3px 0 #a85a12,3px 3px 0 rgba(0,0,0,.5);cursor:pointer}
.skBuy .ic{width:22px;height:22px}
.skBuy:disabled{background:#2a2433;color:#a59fb4;box-shadow:inset 0 0 0 1px #3a3446;cursor:default}
.skBuy.poor{background:#3a2a1a;color:#e8b07a}
.skBuy.max:disabled{background:#1f5a28;color:#ffd84a}
.skHint{margin:0;font:var(--skt);font-size:12px;color:#8a8494;text-align:center}
@media (min-width:1000px) and (min-height:600px){.skGrid{--d:64px;gap:30px 12px}.skInfo{flex-basis:340px}.skCell.child::before{height:32px}.skCell .nm{font-size:22px}.skN .lv{font-size:13px}}
@media (max-height:520px){.skSum{display:none}}
@media (max-height:440px){.lkPanel.skMode h3{display:none}.lkPanel.skMode #lkTabs{margin:0 0 6px}.lkPanel.skMode .lkFoot{margin-top:4px}.lkPanel.skMode .lkFoot .btn{font-size:18px;padding:4px 18px}
  .skGrid{--d:34px;gap:12px 6px}.skN .dm{border-width:2px}.skN .lv{font-size:12px;bottom:-5px;padding:1px 4px}.skCell .nm{font-size:17px;margin-top:5px}.skCell.child::before{height:16px}.skBr b{font-size:17px}.skNext{margin-top:6px;font-size:12.5px}
  .skInfo{flex-basis:250px;padding:6px 8px;gap:5px}.skInfoB{gap:5px}.skIH .big{width:34px;height:34px;font-size:20px}.skIH b{font-size:24px}.skIH small{font-size:15px}.skDesc{font-size:13.5px}.skLore{display:none}.skFx>div{padding:3px 6px}.skFx b{font-size:22px}.skPips{font-size:12px}.skReq{font-size:12.5px}.skBuy{font-size:17px;padding:6px 8px}.skBal{flex-wrap:nowrap}.skBal .chip{font-size:17px;padding:2px 5px 2px 3px;gap:3px}.skBal .chip small{font-size:11px}.skBal .chip:not(.lvc) small{display:none}}
@media (max-height:380px){.skHint,.skPips,.skReq li.ok{display:none}.skFx b{font-size:19px}.skDesc{font-size:13px}.skGrid{--d:32px;gap:10px 6px}.skCell.child::before{height:14px}.skCell .nm{font-size:16px;margin-top:4px}}
@media (max-width:700px){.skInfo{flex-basis:220px}}
@media (prefers-reduced-motion:reduce){.skCell.buy .dm,.skCell.skJust .dm,.skBurst{animation:none!important}}
`);

// ---------- 2. painel ganha classe skMode na aba de habilidades ----------
rep(`    if (ui.tab === "look" || ui.mode === "create") renderLookTab(R);`, `    const pn = $$("lkRight").closest(".lkPanel");
    if (pn) pn.classList.toggle("skMode", ui.tab === "skill" && ui.mode !== "create");
    if (ui.tab === "look" || ui.mode === "create") renderLookTab(R);`);

// ---------- 3. renderSkillTree novo ----------
cut(`// desenha a árvore: colunas = ramos`, `let msTab = "skin";`, `// v28.9: textos de ambientação dos ramos e dos nós (só visual)
const SKILL_LORE = {
  corpo: "Aguentar mais", grana: "Dinheiro e pre\\xE7o", armas: "Atirar melhor", obra: "Barricada e chute",
  vida: "Quem cresce no morro aguenta pancada.", grana_n: "Todo mundo guarda um trocado debaixo do colch\\xE3o.",
  recarga: "M\\xE3o treinada n\\xE3o treme na hora H.", tabua: "Laje se bate em mutir\\xE3o. Barricada tamb\\xE9m.",
  folego: "Subir escadaria todo dia tem suas vantagens.", labia: "Papo bom abre porta e baixa pre\\xE7o.",
  mira: "Um tiro, um podre a menos.", chute: "Chute de pedreiro derruba at\\xE9 parede.", segunda: "Cair faz parte. Ficar no ch\\xE3o, n\\xE3o."
};
let SK_SEL = null, SK_POP = null;
/** estado de um nó: max | soon | lvl (falta nível do personagem) | req (falta nó anterior) | buy | poor */
function skillState(id) {
  const n = SKILLS[id], lv = skillLvl(id);
  if (lv >= n.max()) return "max";
  if (skillSoon(id)) return "soon";
  if (!skillLvOk(id)) return "lvl";
  if (!skillReqOk(id)) return "req";
  return ECO.ready && ECO.chips >= ECO.cost(id, lv + 1) ? "buy" : "poor";
}
/** efeito somado com lv níveis, a partir do texto "por nível" do nó (+8% vira +24% no nível 3) */
function skillFxAt(id, lv) {
  const n = SKILLS[id];
  if (!n.fx) return lv > 0 ? "Ligado" : "Desligado";
  if (lv <= 0) return "\\u2014";
  return n.fx().replace(/\\d+(?:[.,]\\d+)?/, (m) => String(Math.round(parseFloat(m.replace(",", ".")) * lv * 10) / 10).replace(".", ","));
}
// desenha o menu: mapa (colunas = ramos, linhas = profundidade, lê pos/requires) + painel do nó selecionado
function renderSkillTree(R, onChange) {
  const D = SAVE.d, el = (t, c, x) => {
    const e = document.createElement(t);
    if (c) e.className = c;
    if (x != null) e.innerHTML = x;
    return e;
  };
  const ids = Object.keys(SKILLS), brOf = (n) => SKILL_BRANCHES.find((b) => b.id === n.branch) || SKILL_BRANCHES[0];
  if (!SK_SEL || !SKILLS[SK_SEL]) SK_SEL = ids.find((k) => skillState(k) === "buy") || ids.find((k) => skillState(k) === "poor") || ids[0];
  const wrap = el("div", "skWrap"), map = el("div", "skMap"), grid = el("div", "skGrid"), info = el("div", "skInfo");
  const rows = Math.max(...ids.map((k) => SKILLS[k].pos.row)) + 1;
  grid.style.gridTemplateColumns = \`repeat(\${SKILL_BRANCHES.length},minmax(0,1fr))\`;
  grid.style.gridTemplateRows = \`auto repeat(\${rows},auto)\`;
  SKILL_BRANCHES.forEach((b, c) => {
    let lv = 0, mx = 0;
    ids.forEach((k) => {
      if (SKILLS[k].branch === b.id) lv += skillLvl(k), mx += SKILLS[k].max();
    });
    const h = el("div", "skBr", \`<b>\${b.name}</b><span class="bar"><i style="width:\${mx ? lv / mx * 100 : 0}%"></i></span>\`);
    h.style.gridColumn = c + 1;
    h.style.setProperty("--bc", b.col);
    h.title = SKILL_LORE[b.id] || "";
    grid.append(h);
  });
  ids.forEach((id) => {
    const n = SKILLS[id], lv = skillLvl(id), st = skillState(id), br = brOf(n);
    const par = n.requires.find((r) => SKILLS[r.id] && SKILLS[r.id].pos.col === n.pos.col && SKILLS[r.id].pos.row === n.pos.row - 1);
    const cell = el("div", "skCell " + st + (id === SK_SEL ? " sel" : "") + (par ? " child" : "") + (par && skillLvl(par.id) >= par.lv ? " lit" : ""));
    cell.style.gridColumn = n.pos.col + 1;
    cell.style.gridRow = n.pos.row + 2;
    cell.style.setProperty("--bc", br.col);
    cell.dataset.id = id;
    const lock = st === "lvl" ? "NV " + n.lvl : st === "req" ? "\\u{1F512}" : st === "soon" ? "EM BREVE" : "";
    const b = el("button", "skN", \`<span class="dm"><span class="ic">\${n.icon}</span></span><span class="lv">\${lv}/\${n.max()}</span>\${lock ? \`<span class="lk">\${lock}</span>\` : ""}\`);
    b.setAttribute("aria-label", \`\${n.name}, n\\xEDvel \${lv} de \${n.max()}\`);
    b.onclick = () => {
      if (SK_SEL === id) return;
      SK_SEL = id;
      SFX.swap && SFX.swap();
      onChange && onChange();
    };
    cell.append(b, el("span", "nm", n.name));
    if (SK_POP === id) {
      cell.classList.add("skJust");
      for (let i = 0; i < 10; i++) {
        const p = el("i", "skBurst"), a = i / 10 * Math.PI * 2;
        p.style.setProperty("--dx", Math.cos(a) * 46 + "px");
        p.style.setProperty("--dy", Math.sin(a) * 46 + "px");
        cell.append(p);
      }
    }
    grid.append(cell);
  });
  SK_POP = null;
  map.append(grid);
  // próximo nó que o nível do personagem libera
  const nx = ids.filter((k) => SKILLS[k].lvl && (D.level | 0) < SKILLS[k].lvl).sort((a, b) => SKILLS[a].lvl - SKILLS[b].lvl)[0];
  if (nx) map.append(el("p", "skNext", \`Pr\\xF3ximo: <b>\${SKILLS[nx].name}</b> abre no n\\xEDvel \${SKILLS[nx].lvl} do personagem (voc\\xEA est\\xE1 no \${D.level | 0}).\`));
  // ---- painel do nó selecionado ----
  const id = SK_SEL, n = SKILLS[id], lv = skillLvl(id), max = n.max(), st = skillState(id), br = brOf(n);
  info.style.setProperty("--bc", br.col);
  const ib = el("div", "skInfoB");
  let tot = 0, totMax = 0;
  ids.forEach((k) => (tot += skillLvl(k), totMax += SKILLS[k].max()));
  ib.append(el("div", "skBal", \`<span class="chip" title="Chips de tecnologia"><i class="ic chipi" style="background-image:url(\${ICON_CHIP})"></i><b class="num">\${ECO.ready ? ECO.chips : "\\u2014"}</b><small>chips</small></span><span class="chip lvc" title="N\\xEDvel do personagem"><small>n\\xEDvel</small><b class="num">\${D.level | 0}</b></span><span class="chip" title="N\\xEDveis comprados na \\xE1rvore"><b class="num">\${tot}/\${totMax}</b><small>pontos</small></span>\`));
  ib.append(el("div", "skIH", \`<div class="big">\${n.icon}</div><div><small>\${br.name}</small><b>\${n.name}</b></div>\`));
  ib.append(el("p", "skDesc", n.desc + (n.fx ? \` (\${n.fx()} por n\\xEDvel)\` : "")));
  const lore = SKILL_LORE[id === "grana" ? "grana_n" : id];
  if (lore) ib.append(el("p", "skLore", "\\u201C" + lore + "\\u201D"));
  ib.append(el("div", "skFx", lv >= max ? \`<div><small>AGORA (M\\xC1XIMO)</small><b>\${skillFxAt(id, lv)}</b></div>\` : \`<div><small>AGORA</small><b>\${skillFxAt(id, lv)}</b></div><i>\\u203A</i><div class="nx"><small>N\\xCDVEL \${lv + 1}</small><b>\${skillFxAt(id, lv + 1)}</b></div>\`));
  ib.append(el("div", "skPips", Array.from({ length: max }, (_, i) => \`<i class="\${i < lv ? "on" : ""}"></i>\`).join("") + \`<span>n\\xEDvel \${lv} de \${max}</span>\`));
  const req = n.requires.map((r) => [skillLvl(r.id) >= r.lv, \`\${SKILLS[r.id].name} no n\\xEDvel \${r.lv}\` + (skillLvl(r.id) >= r.lv ? "" : \` (tem \${skillLvl(r.id)})\`)]);
  if (n.lvl) req.push([skillLvOk(id), \`Personagem no n\\xEDvel \${n.lvl}\` + (skillLvOk(id) ? "" : \` (est\\xE1 no \${D.level | 0})\`)]);
  if (req.length && lv < max) {
    const ul = el("ul", "skReq");
    req.forEach(([ok, t]) => ul.append(el("li", ok ? "ok" : "", t)));
    ib.append(ul);
  }
  // resumo do ramo: o que já está valendo
  const sum = el("div", "skSum", \`<b>\${br.name}: O QUE J\\xC1 VALE</b>\`);
  ids.filter((k) => SKILLS[k].branch === n.branch).forEach((k) => {
    const l = skillLvl(k), r = el("div", l ? "" : "z");
    r.append(el("em", null, SKILLS[k].name), el("span", null, skillFxAt(k, l)));
    r.firstChild.style.fontStyle = "normal";
    sum.append(r);
  });
  ib.append(sum);
  const buy = el("button", "skBuy"), price = lv < max ? ECO.cost(id, lv + 1) : 0, chip = \`<i class="ic chipi" style="background-image:url(\${ICON_CHIP})"></i>\`;
  let hint = "";
  if (st === "max") buy.textContent = "NO M\\xC1XIMO", buy.disabled = true, buy.classList.add("max");
  else if (st === "soon") buy.textContent = "EM BREVE", buy.disabled = true, hint = "Esse n\\xF3 ainda est\\xE1 chegando no servidor.";
  else if (st === "lvl") buy.textContent = "N\\xCDVEL " + n.lvl, buy.disabled = true, hint = "Suba o personagem jogando partidas.";
  else if (st === "req") buy.textContent = "TRANCADO", buy.disabled = true, hint = "Melhore o n\\xF3 de cima primeiro.";
  else {
    buy.innerHTML = \`MELHORAR \${chip}\${price}\`;
    if (st === "poor") {
      buy.classList.add("poor");
      hint = ECO.ready ? \`Faltam \${price - ECO.chips} chip\${price - ECO.chips === 1 ? "" : "s"}. Chefes t\\xEAm 50% de chance de soltar um.\` : DEV.on ? "Modo de teste: sem compra." : "Entre na conta pra usar chips.";
    }
    buy.onclick = () => {
      const r = buySkill(id, () => {
        SFX.buy && SFX.buy();
        SK_POP = id;
        onChange && onChange();
      });
      if (r === "pending") {
        buy.disabled = true;
        buy.textContent = "...";
      } else {
        SFX.deny && SFX.deny();
        buy.animate([{ transform: "translateX(-4px)" }, { transform: "translateX(4px)" }, { transform: "none" }], { duration: 160 });
      }
    };
  }
  info.append(ib, buy);
  if (hint) info.append(el("p", "skHint", hint));
  wrap.append(map, info);
  R.append(wrap);
  wrap._skMove = (dx, dy) => {
    const c = SKILLS[SK_SEL].pos;
    let best = null, bd = 1e9;
    ids.forEach((k) => {
      const p = SKILLS[k].pos, ex = p.col - c.col, ey = p.row - c.row;
      if (dx && Math.sign(ex) !== dx || dy && Math.sign(ey) !== dy || !ex && !ey) return;
      const d2 = dx ? Math.abs(ex) * 10 + Math.abs(ey) : Math.abs(ey) * 10 + Math.abs(ex);
      if (d2 < bd) bd = d2, best = k;
    });
    if (best) {
      SK_SEL = best;
      SFX.swap && SFX.swap();
      onChange && onChange();
    }
  };
  wrap._skBuy = () => buy.disabled || buy.click();
  const sel = grid.querySelector(".skCell.sel");
  if (sel && sel.scrollIntoView) requestAnimationFrame(() => sel.scrollIntoView({ block: "nearest", inline: "nearest" }));
}
// setas escolhem o nó, Enter/Espaço melhora (PC e controle via teclado)
addEventListener("keydown", (e) => {
  const w = document.querySelector("#creator:not(.hidden) .skWrap");
  if (!w) return;
  const k = e.code, mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[k];
  if (mv) w._skMove(mv[0], mv[1]);
  else if (k === "Enter" || k === "Space") {
    const a = document.activeElement;
    if (a && a.tagName === "BUTTON" && !w.contains(a)) return;
    w._skBuy();
  }
  else return;
  e.preventDefault();
  e.stopPropagation();
});
`);

fs.writeFileSync(F, s);
console.log('ok');
