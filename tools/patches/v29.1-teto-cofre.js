// v29.1: teto de dinheiro na partida e munição da arma diamante.
//  1. Teto de dinheiro no bolso passa de R$20 mil para R$35 mil (CONFIG.pts.cap).
//  2. Habilidade nova "Cofre do barraco" (ramo GRANA, 3ª linha) aumenta o teto em +15% / +25% / +50%
//     (R$40.250 / R$43.750 / R$52.500). Difícil de abrir: Lábia no 3, personagem no nível 27,
//     ter chegado na onda 20 numa quebrada e 8 / 12 / 18 chips. O servidor confere tudo isso
//     (supabase/migrations/v29_1_cofre.sql); enquanto a migração não roda, o nó fica "em breve".
//  3. Mesa de upgrade: com arma DIAMANTE na mão, a mesa vende munição cheia dela.
//     Preço = preço da arma × 1,6 (mínimo R$3.000; Gambiarra R$8.000) e sobe 30% a cada recarga
//     da mesma arma na partida.
// Uso: node tools/patches/v29.1-teto-cofre.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

// ---------- 1. CONFIG ----------
rep(`plankCapPerBar: 40, double: 2, cap: 2e4 },`,
  `plankCapPerBar: 40, double: 2, cap: 35e3, capUp: [0.15, 0.25, 0.5] },`);
rep(`pap: { price: 18e3, bossKeep: 1.5 / 1.8 },`,
  `pap: { price: 18e3, bossKeep: 1.5 / 1.8, ammoMult: 1.6, ammoMin: 3e3, ammoFixed: { ray: 8e3 }, ammoGrow: 1.3 },`);

// ---------- 2. teto com a habilidade ----------
rep(`function gainCash(v) {
  const p = S.player;
  if (!p || v <= 0) return 0;
  const got = Math.max(0, Math.min(v, CONFIG.pts.cap - p.cash));
  p.cash += got;
  if (got < v && !S.capWarn) {
    S.capWarn = 1;
    UI.toast("LIMITE DE R$" + CONFIG.pts.cap + " \\xB7 GASTA A\\xCD!", "#ffd84a");
  }
  if (p.cash < CONFIG.pts.cap) S.capWarn = 0;
  return got;
}
function cashFull() {
  const p = S.player;
  return !!p && p.cash >= CONFIG.pts.cap;
}`, `/** v29.1: teto do bolso = CONFIG.pts.cap, +15/25/50% com a habilidade Cofre do barraco */
function cashMax(lv = metaLvl("cofre")) {
  const up = CONFIG.pts.capUp[Math.min(CONFIG.pts.capUp.length, lv | 0) - 1] || 0;
  return Math.round(CONFIG.pts.cap * (1 + up) / 10) * 10;
}
function gainCash(v) {
  const p = S.player;
  if (!p || v <= 0) return 0;
  const cap = cashMax();
  const got = Math.max(0, Math.min(v, cap - p.cash));
  p.cash += got;
  if (got < v && !S.capWarn) {
    S.capWarn = 1;
    UI.toast("LIMITE DE R$" + cap.toLocaleString("pt-BR") + " \\xB7 GASTA A\\xCD!", "#ffd84a");
  }
  if (p.cash < cap) S.capWarn = 0;
  return got;
}
function cashFull() {
  const p = S.player;
  return !!p && p.cash >= cashMax();
}`);
rep(`$("cash").classList.toggle("max", cash >= CONFIG.pts.cap);`, `$("cash").classList.toggle("max", cash >= cashMax());`);

// ---------- 3. nó novo na árvore ----------
rep(`  segunda: { branch: "corpo", name: "Segunda chance",`,
  `  // v29.1: aumenta o teto do bolso na partida. Efeito não é linear (15 / 25 / 50%), por isso fxAt.
  cofre: { branch: "grana", name: "Cofre do barraco", desc: "Aumenta o limite de dinheiro no bolso", icon: "▣", pos: { col: 1, row: 2 }, requires: [{ id: "labia", lv: 3 }], lvl: 27, wave: 20, max: () => CONFIG.pts.capUp.length, cost: () => 0, fxAt: (lv) => "R$" + cashMax(lv).toLocaleString("pt-BR"), soon: 1 },
  segunda: { branch: "corpo", name: "Segunda chance",`);
rep(`/** nó ainda "em breve": marcado soon`, `/** v29.1: onda que o nó pede (melhor onda em qualquer quebrada) */
function skillBestWave() {
  const b = SAVE.d && SAVE.d.best || {};
  return Math.max(0, ...Object.values(b).map((v) => v | 0));
}
function skillWaveOk(id) {
  return !SKILLS[id].wave || skillBestWave() >= SKILLS[id].wave;
}
/** nó ainda "em breve": marcado soon`);
rep(`if (!n || skillSoon(id) || lv >= n.max() || !skillReqOk(id) || !skillLvOk(id)) return false;`,
  `if (!n || skillSoon(id) || lv >= n.max() || !skillReqOk(id) || !skillLvOk(id) || !skillWaveOk(id)) return false;`);
rep(`  if (!skillLvOk(id)) return "lvl";
  if (!skillReqOk(id)) return "req";`, `  if (!skillLvOk(id)) return "lvl";
  if (!skillReqOk(id)) return "req";
  if (!skillWaveOk(id)) return "wave";`);
rep(`function skillFxAt(id, lv) {
  const n = SKILLS[id];`, `function skillFxAt(id, lv) {
  const n = SKILLS[id];
  if (n.fxAt) return n.fxAt(lv);`);
rep(`mira: "Um tiro, um podre a menos.",`, `mira: "Um tiro, um podre a menos.", cofre: "Dinheiro guardado no tijolo solto da parede. Ningu\\xE9m acha.",`);
rep(`.skCell.lvl .dm,.skCell.req .dm,.skCell.soon .dm{`, `.skCell.lvl .dm,.skCell.req .dm,.skCell.soon .dm,.skCell.wave .dm{`);
rep(`.skCell.lvl .nm,.skCell.req .nm,.skCell.soon .nm{`, `.skCell.lvl .nm,.skCell.req .nm,.skCell.soon .nm,.skCell.wave .nm{`);
rep(`const lock = st === "lvl" ? "NV " + n.lvl : st === "req"`, `const lock = st === "lvl" ? "NV " + n.lvl : st === "wave" ? "ONDA " + n.wave : st === "req"`);
rep(`ib.append(el("p", "skDesc", n.desc + (n.fx ? \` (\${n.fx()} por n\\xEDvel)\` : "")));`,
  `ib.append(el("p", "skDesc", n.desc + (id === "cofre" ? \` (\${CONFIG.pts.capUp.map((u) => "+" + Math.round(u * 100) + "%").join(" / ")} sobre R$\${CONFIG.pts.cap.toLocaleString("pt-BR")})\` : n.fxAt ? "" : n.fx ? \` (\${n.fx()} por n\\xEDvel)\` : "")));`);
rep(`  if (n.lvl) req.push([skillLvOk(id), \`Personagem no n\\xEDvel \${n.lvl}\` + (skillLvOk(id) ? "" : \` (est\\xE1 no \${D.level | 0})\`)]);`,
  `  if (n.lvl) req.push([skillLvOk(id), \`Personagem no n\\xEDvel \${n.lvl}\` + (skillLvOk(id) ? "" : \` (est\\xE1 no \${D.level | 0})\`)]);
  if (n.wave) req.push([skillWaveOk(id), \`Chegar na onda \${n.wave} numa quebrada\` + (skillWaveOk(id) ? "" : \` (recorde: \${skillBestWave()})\`)]);`);
rep(`  else if (st === "req") buy.textContent = "TRANCADO", buy.disabled = true, hint = "Melhore o n\\xF3 de cima primeiro.";`,
  `  else if (st === "req") buy.textContent = "TRANCADO", buy.disabled = true, hint = "Melhore o n\\xF3 de cima primeiro.";
  else if (st === "wave") buy.textContent = "ONDA " + n.wave, buy.disabled = true, hint = "Sobreviva at\\xE9 a onda " + n.wave + " em qualquer quebrada.";`);

// ---------- 4. munição da arma diamante na mesa de upgrade ----------
rep(`function papOk() {`, `/** v29.1: com arma diamante na mão a mesa vende munição cheia dela; preço depende da arma e sobe a cada recarga */
function papAmmoW() {
  const p = S.player;
  if (!p || melEq(p)) return null;
  const w3 = curW();
  return w3 && w3.rk === "diamond" ? w3 : null;
}
function papAmmoPrice(w3) {
  const P = CONFIG.pap, n2 = (S.papAmmo || {})[w3.id] || 0;
  const base = P.ammoFixed[w3.id] || Math.max(P.ammoMin, WEAP[w3.id].price * P.ammoMult);
  return Math.round(base * Math.pow(P.ammoGrow, n2) / 50) * 50;
}
function papAmmoFull(w3) {
  const st2 = wst(w3);
  return w3.mag >= st2.mag && w3.res >= st2.res;
}
function papOk() {`);
rep(`  if (it.k === "pap") return papOk() ? \`Mesa de upgrade \\xB7 <b>R$\${CONFIG.pap.price}</b> \\xB7 dourada vira diamante\` : papMsg();`,
  `  if (it.k === "pap") {
    const wa = papAmmoW();
    if (wa) return papAmmoFull(wa) ? \`Muni\\xE7\\xE3o diamante \\xB7 \${WEAP[wa.id].name} j\\xE1 est\\xE1 cheia\` : \`Muni\\xE7\\xE3o diamante \${WEAP[wa.id].name} \\xB7 <b>R$\${papAmmoPrice(wa)}</b>\`;
    return papOk() ? \`Mesa de upgrade \\xB7 <b>R$\${CONFIG.pap.price}</b> \\xB7 dourada vira diamante\` : papMsg();
  }`);
rep(`  if (it.k === "pap") {
    const w3 = papOk() ? curW() : null;`, `  if (it.k === "pap") {
    const wa = papAmmoW();
    if (wa) return papAmmoFull(wa) ? { icon: wa.id, top: "MESA \\xB7 MUNI\\xC7\\xC3O DIAMANTE", main: "MUNI\\xC7\\xC3O CHEIA", price: null, rk: "diamond" } : { icon: wa.id, top: "MESA \\xB7 MUNI\\xC7\\xC3O DIAMANTE", main: "RECARREGAR " + WEAP[wa.id].name, price: papAmmoPrice(wa), rk: "diamond" };
    const w3 = papOk() ? curW() : null;`);
rep(`  if (it.k === "pap") {
    if (!papOk()) {`, `  if (it.k === "pap" && papAmmoW()) {
    const wa = papAmmoW();
    if (papAmmoFull(wa)) {
      SFX.deny();
      UI.toast("MUNI\\xC7\\xC3O J\\xC1 EST\\xC1 CHEIA", RANKS.diamond.c);
      return;
    }
    if (pay(papAmmoPrice(wa))) {
      const st2 = wst(wa);
      wa.mag = st2.mag;
      wa.res = st2.res;
      S.papAmmo = S.papAmmo || {};
      S.papAmmo[wa.id] = (S.papAmmo[wa.id] || 0) + 1;
      S.pap = { until: S.t + 1.2 };
      SFX.power();
      UI.toast("MUNI\\xC7\\xC3O DIAMANTE \\xB7 " + WEAP[wa.id].name, RANKS.diamond.c);
      UI.slots && UI.slots();
    }
    return;
  }
  if (it.k === "pap") {
    if (!papOk()) {`);

rep(`  S.pap = null;\n`, `  S.pap = null;\n  S.papAmmo = {};\n`);

rep(`SEM_CAIXA: "Nenhuma caixa para abrir" };`, `SEM_CAIXA: "Nenhuma caixa para abrir", NIVEL_PERSONAGEM: "Personagem ainda sem n\u00edvel pra isso", ONDA_INSUFICIENTE: "Chegue mais longe nas ondas primeiro", REQUISITO: "Falta melhorar o n\u00f3 de cima" };`);

fs.writeFileSync(F, s);
console.log('v29.1 teto/cofre/munição diamante aplicado');
