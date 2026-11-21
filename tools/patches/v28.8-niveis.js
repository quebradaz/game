// v28.8: curva de nível nova (quadrática, teto 50) e cada nível libera algo: roupa exclusiva, nó da árvore,
// título ou moedas. Os 5 nós "em breve" ganham efeito e pedem nível do personagem; abrem quando o servidor
// tiver o custo deles (migração supabase/migrations/v28_8_niveis.sql). Tabela: design/progressao-niveis.md
// Uso: node tools/patches/v28.8-niveis.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

// ---------- 1. valores (CONFIG.meta) ----------
rep(`    levelBase: 300,
    levelGrow: 1.22,
`, `    // v28.8: XP pro próximo nível = base + lin*(n-1) + quad*(n-1)^2, até o nível levelMax (design/progressao-niveis.md)
    levelBase: 300,
    levelLin: 90,
    levelQuad: 5,
    levelMax: 50,
    // o que cada nível libera: [nível, tipo, valor]. tipo: coins (moedas) | item (roupa com unlock.level) | skill (nó da árvore com lvl) | title
    road: [
      [2, "coins", 150], [3, "item", "lv_bone_cria"], [4, "item", "lv_chinelo_laje"], [5, "title", "Cria da quebrada"],
      [6, "item", "lv_bermuda_tactel"], [7, "skill", "folego"], [8, "coins", 250], [9, "item", "lv_regata_bloco"],
      [10, "title", "Sobrevivente"], [11, "item", "lv_bandana_morro"], [12, "skill", "labia"], [13, "item", "lv_tenis_corre"],
      [14, "coins", 350], [15, "title", "Linha de frente"], [16, "item", "lv_camisa_varzea"], [17, "skill", "mira"],
      [18, "coins", 400], [19, "item", "lv_mochila_sobrev"], [20, "title", "Casca grossa"], [21, "item", "lv_cargo_urbana"],
      [22, "skill", "chute"], [23, "coins", 500], [24, "item", "lv_corta_madrugada"], [25, "title", "Terror dos podres"],
      [26, "item", "lv_coturno_patrulha"], [27, "coins", 600], [28, "item", "lv_cordao_vila"], [29, "coins", 650],
      [30, "title", "Dono do morro"], [31, "item", "lv_capacete_obra"], [32, "skill", "segunda"], [33, "coins", 750],
      [34, "item", "lv_moletom_baile"], [35, "title", "Veterano do apocalipse"], [36, "item", "lv_oculos_solda"], [37, "coins", 850],
      [38, "item", "lv_calca_surrada"], [39, "coins", 900], [40, "title", "Lenda da favela"], [41, "item", "lv_jaqueta_cobra"],
      [42, "coins", 1000], [43, "item", "lv_chuteira_craque"], [44, "coins", 1000], [45, "title", "Mito do Rio"],
      [46, "item", "lv_capa_sobrev"], [47, "coins", 1200], [48, "item", "lv_panama_velho"], [49, "coins", 1500],
      [50, "title", "Rei da Quebrada Z"], [50, "item", "lv_jaqueta_rei"]
    ],
`);
// efeitos dos nós novos (por nível do nó)
rep(`tabua: { base: 80, fx: 0.08 } },`, `tabua: { base: 80, fx: 0.08 }, folego: { fx: 0.12 }, labia: { fx: 0.06 }, mira: { fx: 0.1 }, chute: { fx: 0.15 }, segunda: { hp: 0.35, iT: 2 } },`);

// ---------- 2. curva e módulo LEVEL ----------
rep(`function lvlNeed(l) {
  const C = CONFIG.meta;
  return Math.round(C.levelBase * Math.pow(C.levelGrow, l - 1) / 10) * 10;
}`, `/** XP que falta do nível l pro l+1 (v28.8: quadrática, sem a parede exponencial da 1,22^n). */
function lvlNeed(l) {
  const C = CONFIG.meta, n = Math.max(0, Math.min(l, C.levelMax - 1) - 1);
  return Math.round((C.levelBase + C.levelLin * n + C.levelQuad * n * n) / 10) * 10;
}
// =====================================================================
//  LEVEL (v28.8): o caminho do nível. Cada nível de 2 a 50 libera algo (CONFIG.meta.road).
//  Roupas: item com unlock.level, entra no inventário pelo LOOK.sanitize. Nós: SKILLS[id].lvl. Moedas: pagas uma vez (d.lvPaid).
// =====================================================================
const LEVEL = {
  max: () => CONFIG.meta.levelMax,
  /** prêmios de um nível: [[tipo, valor], ...] */
  at(l) {
    return CONFIG.meta.road.filter((r) => r[0] === l).map((r) => [r[1], r[2]]);
  },
  /** título atual: o último título liberado até o nível */
  title(l) {
    let t = "Sobrevivente da quebrada";
    for (const r of CONFIG.meta.road) if (r[1] === "title" && r[0] <= l) t = r[2];
    return t;
  },
  label(t, v) {
    if (t === "coins") return "+" + v + " moedas";
    if (t === "title") return "Título: " + v;
    if (t === "skill") return "Habilidade: " + (SKILLS[v] ? SKILLS[v].name : v);
    if (t === "item") { const it = typeof LOOK !== "undefined" && LOOK.ITEMS[v]; return it ? it.name : v; }
    return "" + v;
  },
  /** paga as moedas dos níveis já alcançados e ainda não pagos; devolve os textos do que foi liberado de lvA+1 até d.level */
  pay(d, lvA) {
    const out = [];
    d.lvPaid = Math.max(1, d.lvPaid | 0);
    for (let l = lvA + 1; l <= d.level; l++) for (const [t, v] of this.at(l)) {
      if (t === "coins") { if (l > d.lvPaid) d.coins = (d.coins | 0) + v; } else if (t !== "item") out.push(this.label(t, v));
    }
    d.lvPaid = Math.max(d.lvPaid, d.level);
    return out;
  },
  /** soma XP, sobe quantos níveis couberem (até o teto) e entrega os prêmios. {ups, msg} */
  gain(d, xp) {
    const lvA = d.level = Math.max(1, d.level | 0);
    d.xp = Math.max(0, (d.xp | 0) + (xp | 0));
    while (d.level < this.max() && d.xp >= lvlNeed(d.level)) { d.xp -= lvlNeed(d.level); d.level++; }
    if (d.level >= this.max()) d.xp = Math.min(d.xp, lvlNeed(d.level));
    return { ups: d.level - lvA, msg: this.pay(d, lvA) };
  },
  /** save antigo (curva 1,22^n): mantém o nível, reaplica a curva nova ao XP guardado e paga as moedas atrasadas */
  settle(d) {
    if (!d || typeof d !== "object") return d;
    if (d.lvV !== 288) {
      d.lvV = 288;
      d.lvPaid = 1;
      this.pay(d, 1);
    }
    this.gain(d, 0);
    return d;
  },
  /** desenha o caminho (rolagem lateral) no elemento R */
  road(R) {
    const d = SAVE.d, lv = d.level | 0, h = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
    R.innerHTML = "";
    let cur = null;
    for (let l = 2; l <= this.max(); l++) {
      const got = l <= lv, card = h("div", "lvCard" + (got ? " got" : l === lv + 1 ? " next" : ""));
      card.append(h("b", "lvN", "NÍVEL " + l));
      for (const [t, v] of this.at(l)) {
        const ic = h("div", "lvI " + t);
        if (t === "item") { const cv = h("canvas"); ic.append(cv); try { LOOK.thumb(cv, [v]); } catch (e) {} }
        else if (t === "coins") ic.innerHTML = '<i class="ic" style="background-image:url(' + ICON_COIN + ')"></i>';
        else ic.textContent = t === "skill" ? SKILLS[v] && SKILLS[v].icon || "?" : "★";
        card.append(ic);
        card.append(h("small", "", this.label(t, v)));
      }
      card.append(h("i", "lvS", got ? "LIBERADO" : l === lv + 1 ? "PRÓXIMO" : "TRANCADO"));
      R.append(card);
      if (l === lv + 1 || (l === this.max() && got)) cur = card;
    }
    if (cur) requestAnimationFrame(() => { R.scrollLeft = Math.max(0, cur.offsetLeft - R.offsetLeft - 8); });
  }
};`);
rep(`  try {
    if (typeof SKILLS_MIGRATE === "function") SKILLS_MIGRATE(d);
  } catch (e) {
  }
  return d;`, `  try {
    if (typeof SKILLS_MIGRATE === "function") SKILLS_MIGRATE(d);
  } catch (e) {
  }
  try {
    if (typeof LEVEL !== "undefined") LEVEL.settle(d);
  } catch (e) {
  }
  return d;`);

// ---------- 3. fim de partida ----------
rep(`    D.xp += xp;
    let ups = 0;
    while (D.xp >= lvlNeed(D.level)) {
      D.xp -= lvlNeed(D.level);
      D.level++;
      ups++;
    }
    SAVE.save();`, `    const lvR = LEVEL.gain(D, xp), ups = lvR.ups;
    SAVE.save();`);
rep("$(\"ovXpTx\").textContent = (ups ? `Subiu pro n\\xEDvel ${D.level}! ` : \"\") + `${D.xp} / ${lvlNeed(D.level)} XP`;",
  "$(\"ovXpTx\").textContent = (ups ? `Subiu pro n\\xEDvel ${D.level}! ` : \"\") + (D.level >= LEVEL.max() ? \"N\\xEDvel m\\xE1ximo\" : `${D.xp} / ${lvlNeed(D.level)} XP`);");
rep(`      if (nw.length) um.textContent = (um.textContent ? um.textContent + " \\xB7 " : "") + "Item exclusivo liberado: " + nw.join(", ");
    } catch (e) {
    }`, `      if (nw.length) um.textContent = (um.textContent ? um.textContent + " \\xB7 " : "") + "Item exclusivo liberado: " + nw.join(", ");
      if (lvR.msg.length) um.textContent = (um.textContent ? um.textContent + " \\xB7 " : "") + "Nível novo: " + lvR.msg.join(", ");
    } catch (e) {
    }`);

// ---------- 4. perfil: título e caminho do nível ----------
rep(`<p>Sobrevivente da quebrada</p><span class="lvl yo">NIVEL <i id="pfLvl">`, `<p id="pfTitle">Sobrevivente da quebrada</p><span class="lvl yo">NIVEL <i id="pfLvl">`);
rep(`    <div class="stats" id="pfStats"></div>
    <div id="pfMaps"></div>`, `    <div class="lvRoadH">CAMINHO DO NÍVEL <small>cada nível libera algo</small></div>
    <div class="lvRoad" id="pfRoad"></div>
    <div class="stats" id="pfStats"></div>
    <div id="pfMaps"></div>`);
rep("  $(\"pfXpTx\").textContent = `${D.xp} / ${lvlNeed(D.level)} XP pro n\\xEDvel ${D.level + 1}`;",
  "  $(\"pfXpTx\").textContent = D.level >= LEVEL.max() ? \"N\\xEDvel m\\xE1ximo\" : `${D.xp} / ${lvlNeed(D.level)} XP pro n\\xEDvel ${D.level + 1}`;\n  $(\"pfTitle\").textContent = LEVEL.title(D.level);\n  LEVEL.road($(\"pfRoad\"));");
rep(`#pfMaps div b{color:#ffd84a;font-weight:400}`, `#pfMaps div b{color:#ffd84a;font-weight:400}
.lvRoadH{font-size:15px;color:#ffd84a;margin:8px 0 4px;letter-spacing:1px}.lvRoadH small{color:#9a94a8;font-size:12px;letter-spacing:0;margin-left:6px}
.lvRoad{display:flex;flex:0 0 auto;align-items:flex-start;gap:8px;overflow-x:auto;scroll-snap-type:x proximity;padding:2px 2px 8px;margin-bottom:8px;-webkit-overflow-scrolling:touch}
.lvCard{flex:0 0 112px;scroll-snap-align:start;display:flex;flex-direction:column;align-items:center;gap:3px;background:#1f1b27;border:2px solid #000;box-shadow:inset 0 0 0 1px #3a3446;padding:6px 4px;text-align:center;opacity:.6}
.lvCard.got{opacity:1;box-shadow:inset 0 0 0 1px #3a3446,inset 0 -3px 0 #7dff6a}.lvCard.next{opacity:1;box-shadow:inset 0 0 0 2px #ffd84a}
.lvCard .lvN{font-size:13px;color:#ffd84a;font-weight:400}.lvCard small{font-size:12px;line-height:1.15;color:#e8e4d8}
.lvI{height:46px;display:flex;align-items:center;justify-content:center;font-size:28px;color:#ffd84a}.lvI canvas{image-rendering:pixelated;max-height:46px}.lvI .ic{width:28px;height:28px;background-size:contain;image-rendering:pixelated}
.lvS{font-style:normal;font-size:11px;color:#9a94a8}.lvCard.got .lvS{color:#7dff6a}.lvCard.next .lvS{color:#ffd84a}`);

// ---------- 5. árvore: nós novos com efeito e nível do personagem ----------
rep(`  folego: { branch: "corpo", name: "F\\xF4lego", desc: "Corre mais antes de cansar", icon: "➿", pos: { col: 0, row: 1 }, requires: [{ id: "vida", lv: 3 }], max: () => 3, cost: () => 0, soon: 1 },
  labia: { branch: "grana", name: "L\\xE1bia", desc: "Mercante cobra menos", icon: "⚖", pos: { col: 1, row: 1 }, requires: [{ id: "grana", lv: 3 }], max: () => 3, cost: () => 0, soon: 1 },
  mira: { branch: "armas", name: "Olho de \\xE1guia", desc: "Mais chance de tiro na cabe\\xE7a", icon: "⌖", pos: { col: 2, row: 1 }, requires: [{ id: "recarga", lv: 3 }], max: () => 3, cost: () => 0, soon: 1 },
  chute: { branch: "obra", name: "P\\xE9 de pedreiro", desc: "Chute empurra mais longe", icon: "✵", pos: { col: 3, row: 1 }, requires: [{ id: "tabua", lv: 3 }], max: () => 3, cost: () => 0, soon: 1 },
  segunda: { branch: "corpo", name: "Segunda chance", desc: "Levanta uma vez por partida", icon: "✚", pos: { col: 0, row: 2 }, requires: [{ id: "folego", lv: 3 }], max: () => 1, cost: () => 0, soon: 1 }`,
`  // v28.8: nós da 2ª linha pedem nível do personagem (lvl) e só abrem quando o servidor tem o custo (soon = depende do servidor)
  folego: { branch: "corpo", name: "F\\xF4lego", desc: "Cansa menos correndo", icon: "➿", pos: { col: 0, row: 1 }, requires: [{ id: "vida", lv: 3 }], lvl: 7, max: () => 3, cost: () => 0, fx: () => \`-\${Math.round(skUp("folego").fx * 100)}%\`, soon: 1 },
  labia: { branch: "grana", name: "L\\xE1bia", desc: "Mercante cobra menos", icon: "⚖", pos: { col: 1, row: 1 }, requires: [{ id: "grana", lv: 3 }], lvl: 12, max: () => 3, cost: () => 0, fx: () => \`-\${Math.round(skUp("labia").fx * 100)}%\`, soon: 1 },
  mira: { branch: "armas", name: "Olho de \\xE1guia", desc: "Tiro na cabe\\xE7a d\\xE1 mais dano", icon: "⌖", pos: { col: 2, row: 1 }, requires: [{ id: "recarga", lv: 3 }], lvl: 17, max: () => 3, cost: () => 0, fx: () => \`+\${Math.round(skUp("mira").fx * 100)}%\`, soon: 1 },
  chute: { branch: "obra", name: "P\\xE9 de pedreiro", desc: "Chute empurra mais longe", icon: "✵", pos: { col: 3, row: 1 }, requires: [{ id: "tabua", lv: 3 }], lvl: 22, max: () => 3, cost: () => 0, fx: () => \`+\${Math.round(skUp("chute").fx * 100)}%\`, soon: 1 },
  segunda: { branch: "corpo", name: "Segunda chance", desc: "Levanta uma vez por partida com 35% de vida", icon: "✚", pos: { col: 0, row: 2 }, requires: [{ id: "folego", lv: 3 }], lvl: 32, max: () => 1, cost: () => 0, soon: 1 }`);
rep(`function skillReqOk(id) {
  return SKILLS[id].requires.every((r) => skillLvl(r.id) >= r.lv);
}`, `function skillReqOk(id) {
  return SKILLS[id].requires.every((r) => skillLvl(r.id) >= r.lv);
}
/** nível do personagem pedido pelo nó (v28.8) */
function skillLvOk(id) {
  return !SKILLS[id].lvl || (SAVE.d.level | 0) >= SKILLS[id].lvl;
}
/** nó ainda "em breve": marcado soon e o servidor ainda não tem o custo dele */
function skillSoon(id) {
  const c = typeof ECO !== "undefined" && ECO.data && ECO.data.costs;
  return !!SKILLS[id].soon && !(c && c[id + ":1"] != null);
}`);
rep(`  for (const k in d.skills) if (!SKILLS[k] || SKILLS[k].soon) delete d.skills[k];`, `  for (const k in d.skills) if (!SKILLS[k]) delete d.skills[k];`);
rep(`  if (!n || n.soon || lv >= n.max() || !skillReqOk(id)) return false;`, `  if (!n || skillSoon(id) || lv >= n.max() || !skillReqOk(id) || !skillLvOk(id)) return false;`);
rep(`A \\xE1rvore ainda est\\xE1 crescendo: os n\\xF3s trancados chegam nas pr\\xF3ximas vers\\xF5es.</p>`, `Os n\\xF3s de baixo tamb\\xE9m pedem n\\xEDvel do personagem: suba jogando.</p>`);
rep(`    const n = SKILLS[id], lv = skillLvl(id), max = n.max(), req = skillReqOk(id), br =`, `    const n = SKILLS[id], lv = skillLvl(id), max = n.max(), soon = skillSoon(id), lvOk = skillLvOk(id), req = skillReqOk(id) && lvOk, br =`);
rep(`    e.className = "skNode" + (n.soon ? " soon" : !req ? " lock" : lv >= max ? " max" : "") + (n.requires.length ? " child" : "");`, `    e.className = "skNode" + (soon ? " soon" : !req ? " lock" : lv >= max ? " max" : "") + (n.requires.length ? " child" : "");`);
rep(`    const reqTx = n.requires.map((r) => \`\${SKILLS[r.id].name} \${r.lv}\`).join(", ");`, `    const reqTx = n.requires.map((r) => \`\${SKILLS[r.id].name} \${r.lv}\`).join(", ") + (n.lvl ? (n.requires.length ? ", " : "") + "n\\xEDvel " + n.lvl : "");`);
rep(`    if (n.soon) {
      btn.textContent = "EM BREVE";
      btn.disabled = true;
      e.title = "Precisa: " + reqTx;
    } else if (!req) {
      btn.textContent = "PRECISA " + reqTx;`, `    if (soon) {
      btn.textContent = "EM BREVE";
      btn.disabled = true;
      e.title = "Precisa: " + reqTx;
    } else if (!lvOk) {
      btn.textContent = "N\\xCDVEL " + n.lvl;
      btn.disabled = true;
      e.title = "Precisa: " + reqTx;
    } else if (!req) {
      btn.textContent = "PRECISA " + reqTx;`);

// efeitos em jogo
rep(`    p.sta = Math.max(0, p.sta - ST.drain * dt);`, `    p.sta = Math.max(0, p.sta - ST.drain * (1 - CONFIG.meta.up.folego.fx * metaLvl("folego")) * dt);`);
rep(`function critMul(kind) {
  const C = CONFIG.crit;
  return C[kind] || C.mul;
}`, `function critMul(kind) {
  const C = CONFIG.crit;
  return (C[kind] || C.mul) * (1 + CONFIG.meta.up.mira.fx * metaLvl("mira"));
}`);
rep(`      z.kbv = p.face * K2.knock * (big ? K2.big : 1);`, `      z.kbv = p.face * K2.knock * (1 + CONFIG.meta.up.chute.fx * metaLvl("chute")) * (big ? K2.big : 1);`);
rep(`  if (n2 && st.price) st.price = Math.round(st.price * Math.pow(CONFIG.merchantGrowth, n2) / 50) * 50;
  return st;`, `  if (n2 && st.price) st.price = Math.round(st.price * Math.pow(CONFIG.merchantGrowth, n2) / 50) * 50;
  const lb = metaLvl("labia");
  if (lb && st.price) st.price = Math.round(st.price * (1 - CONFIG.meta.up.labia.fx * lb) / 10) * 10;
  return st;`);
rep(`  if (p.hp <= 0 && tryRevive(p)) return;`, `  if (p.hp <= 0 && tryRevive(p)) return;
  if (p.hp <= 0 && trySecond(p)) return;`);
rep(`function tryRevive(p) {`, `// v28.8: habilidade "Segunda chance": uma vez por partida, depois do kit (se tiver)
function trySecond(p) {
  if (!p || p.dead || S.secondUsed || metaLvl("segunda") < 1) return false;
  const R = CONFIG.meta.up.segunda;
  S.secondUsed = true;
  p.hp = Math.round(p.maxHp * R.hp);
  p.hurtT = 0;
  p.iT = R.iT;
  UI.toast("SEGUNDA CHANCE!", "#7dff6a");
  SFX.power();
  S.cam.shake = Math.max(S.cam.shake, 6);
  for (const z of S.zs) if (z.state !== "dead") {
    z.vx = Math.sign(z.x - p.x) * 220;
    z.hurtT = 0.6;
  }
  return true;
}
function tryRevive(p) {`);
rep(`  S.reviveUsed = false;
  S.player = attract ? null : newPlayer();`, `  S.reviveUsed = false;
  S.secondUsed = false;
  S.player = attract ? null : newPlayer();`);

// ---------- 6. roupas exclusivas de nível ----------
rep(`unlock: { src: "loja" } })
  };
  V285_ITEMS.forEach((q) => {`, `unlock: { src: "loja" } }),
    // v28.8: exclusivas do caminho do nível (CONFIG.meta.road)
    lv_bone_cria: I("head", "bone", "Bon\\xE9 da cria", 0, 3, ["#1e6a5a", "#0e3a30", "#2e8a7a"], { d: "#ffd84a", hideHair: 1, unlock: { level: 3 } }),
    lv_chinelo_laje: I("feet", "chinelo", "Chinelo da laje", 0, 3, ["#2a8a3a", "#145020", "#4ab05a"], { d: "#ffd84a", unlock: { level: 4 } }),
    lv_bermuda_tactel: I("legs", "bermuda", "Bermuda tactel", 0, 3, ["#3a2a8a", "#1e144e", "#5a4ab0"], { d: "#3ee6ff", unlock: { level: 6 } }),
    lv_regata_bloco: I("chest", "regata", "Regata do bloco", 0, 3, ["#e8b020", "#8a6a10", "#ffd860"], { unlock: { level: 9 } }),
    lv_bandana_morro: I("head", "bandana", "Bandana do morro", 0, 3, ["#2a2a6a", "#14143a", "#4a4a9a"], { d: "#e8e4d8", hideHair: 1, unlock: { level: 11 } }),
    lv_tenis_corre: I("feet", "tenis", "T\\xEAnis de corrida", 0, 3, ["#ff6a1a", "#a03a0a", "#ff9a4a"], { d: "#16141c", unlock: { level: 13 } }),
    lv_camisa_varzea: I("chest", "time", "Camisa da v\\xE1rzea", 0, 3, ["#1a6a2a", "#0a3a14", "#2a8a3a"], { d: "#ffffff", unlock: { level: 16 } }),
    lv_mochila_sobrev: I("acc", "mochila", "Mochila de sobrevivente", 0, 3, ["#5a4a2a", "#3a2a14", "#7a6a3a"], { spot: "back", d: "#c0262a", unlock: { level: 19 } }),
    lv_cargo_urbana: I("legs", "cargo", "Cal\\xE7a cargo urbana", 0, 3, ["#4a4a52", "#2a2a30", "#6a6a74"], { d: "#16141c", unlock: { level: 21 } }),
    lv_corta_madrugada: I("chest", "jaqueta", "Corta-vento da madrugada", 0, 3, ["#141a3a", "#0a0e20", "#2a3460"], { in: ["#3ee6ff", "#1a8aa8"], unlock: { level: 24 } }),
    lv_coturno_patrulha: I("feet", "bota", "Coturno de patrulha", 0, 3, ["#2a2a1e", "#16160e", "#4a4a30"], { unlock: { level: 26 } }),
    lv_cordao_vila: I("acc", "cordao", "Cord\\xE3o da vila", 0, 3, ["#d8d0b0", "#8a8470", "#ffffff"], { spot: "neck", unlock: { level: 28 } }),
    lv_capacete_obra: I("head", "capacete", "Capacete de obra", 0, 3, ["#f2c230", "#a07a10", "#ffe070"], { d: "#16141c", hideHair: 1, unlock: { level: 31 } }),
    lv_moletom_baile: I("chest", "moletom", "Moletom do baile", 0, 3, ["#8a1a6a", "#4a0a3a", "#b03a8a"], { in: ["#16141c", "#0a0a0e"], unlock: { level: 34 } }),
    lv_oculos_solda: I("acc", "aviador", "\\xD3culos de solda", 0, 3, ["#3a3a3a", "#1a1a1a", "#7dff3a"], { spot: "face", unlock: { level: 36 } }),
    lv_calca_surrada: I("legs", "calca", "Cal\\xE7a de couro surrada", 0, 3, ["#4a3020", "#2a1a10", "#6a4a30"], { unlock: { level: 38 } }),
    lv_jaqueta_cobra: I("chest", "jaqueta", "Jaqueta pele de cobra", 0, 3, ["#4a5a1a", "#2a340a", "#7a8a2a"], { in: ["#16141c", "#0a0a0e"], d: "#d8c060", unlock: { level: 41 } }),
    lv_chuteira_craque: I("feet", "chuteira", "Chuteira de craque", 0, 3, ["#e8e4d8", "#a8a498", "#ffffff"], { d: "#d8a820", unlock: { level: 43 } }),
    lv_capa_sobrev: I("acc", "capa", "Capa do sobrevivente", 0, 3, ["#3a2a2a", "#1e1414", "#5a4040"], { spot: "back", unlock: { level: 46 } }),
    lv_panama_velho: I("head", "panama", "Panam\\xE1 do malandro velho", 0, 3, ["#2a2420", "#16120e", "#4a4038"], { d: "#d8a820", hideHair: 1, unlock: { level: 48 } }),
    lv_jaqueta_rei: I("chest", "jaqueta", "Jaqueta do Rei da Quebrada", 0, 4, ["#d8a820", "#8a6a10", "#ffe070"], { in: ["#8e0f16", "#5c0a10"], d: "#16141c", unlock: { level: 50 } })
  };
  V285_ITEMS.forEach((q) => {`);
rep(`    for (const k in ITEMS) { const u = ITEMS[k].unlock; if (u && ((d.best || {})[u.map] || 0) >= u.wave && inv.indexOf(k) < 0) inv.push(k); }`,
  `    for (const k in ITEMS) { const u = ITEMS[k].unlock; if (u && (u.level ? (d.level | 0) >= u.level : u.map && ((d.best || {})[u.map] || 0) >= u.wave) && inv.indexOf(k) < 0) inv.push(k); }`);
rep(`      else if (it.unlock) { const m = MAPS.find((z) => z.id === it.unlock.map); b.textContent = "Onda " + it.unlock.wave + (m ? " em " + m.name : ""); b.disabled = true; }`,
  `      else if (it.unlock) { const u = it.unlock, m = MAPS.find((z) => z.id === u.map); b.textContent = u.level ? "N\\xEDvel " + u.level : u.map ? "Onda " + u.wave + (m ? " em " + m.name : "") : u.src === "passe" ? "Passe" : u.src === "loja" ? "Loja Z-Coin" : "Caixa"; b.disabled = true; }`);

// ---------- 7. versão ----------
rep("QZ_VERSION='28.7'", "QZ_VERSION='28.8'");
rep("QZ_NOTE='Roupas lendárias agora só no baú (0,5%) ou na loja Z-Coin; o passe premium dá Z-Coin no lugar'",
  "QZ_NOTE='Níveis novos: curva mais suave até o 50 e cada nível libera roupa, habilidade, título ou moedas'");
fs.writeFileSync(F, s);
console.log('ok');
