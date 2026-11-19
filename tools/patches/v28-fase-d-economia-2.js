// v28 fase D, parte 2: módulo ECO (carteira, passe, missões, caixas, loja), ganchos de chefe e fim de partida, tela PASSE.
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
rep('  return false;\n}\n// desenha a árvore', '  return "pending";\n}\n// desenha a árvore');
rep(`      const pr = n.cost(lv);
      btn.textContent = pr + " moedas";
      btn.classList.toggle("poor", D.coins < pr);
      btn.onclick = () => {
        if (buySkill(id)) {
          SFX.buy && SFX.buy();
          onChange && onChange();
        } else {`, `      const pr = ECO.cost(id, lv + 1);
      btn.textContent = pr + (pr === 1 ? " chip" : " chips");
      btn.classList.toggle("poor", !ECO.ready || ECO.chips < pr);
      btn.onclick = () => {
        const r = buySkill(id, () => {
          SFX.buy && SFX.buy();
          onChange && onChange();
        });
        if (r === "pending") {
          btn.disabled = true;
          btn.textContent = "...";
        } else {`);

// ---------- partida: sorteio do chefe no servidor; fim manda cabeça e noite
rep(`function bossDefeated(z) {
  if (z.cap) return capDefeated(z);`, `function bossDefeated(z) {
  if (z.cap) return capDefeated(z);
  ECO.bossDrop("observador", z);`);
rep(`function capDefeated(z) {
  const C = CONFIG.cap, p = S.player;`, `function capDefeated(z) {
  const C = CONFIG.cap, p = S.player;
  ECO.bossDrop(z.fury ? "furia" : "capitao", z);`);
rep(`      return rpc("submit_run", { p_run: id, p_wave: o.wave | 0, p_kills: o.kills | 0, p_seconds: Math.round((performance.now() - st.t0) / 1e3), p_shots: o.shots | 0, p_hits: o.hits | 0, p_bosses: o.bosses | 0, p_won: !!o.won }).catch(() => null);`,
  `      return rpc("submit_run", { p_run: id, p_wave: o.wave | 0, p_kills: o.kills | 0, p_seconds: Math.round((performance.now() - st.t0) / 1e3), p_shots: o.shots | 0, p_hits: o.hits | 0, p_bosses: o.bosses | 0, p_won: !!o.won, p_heads: o.heads | 0, p_night: !!o.night }).catch(() => null);`);
rep('    if (!S.lab) NET.endRun({ wave: S.round, kills: S.stats.kills, shots: S.stats.shots, hits: S.stats.hitShots, bosses: S.stats.boss || 0, won: win });',
  `    if (!S.lab) NET.endRun({ wave: S.round, kills: S.stats.kills, shots: S.stats.shots, hits: S.stats.hitShots, bosses: S.stats.boss || 0, won: win, heads: S.stats.head, night: S.period === "noite" }).then((r) => {
      if (!r || !r.ok) return;
      ECO.refresh();
      const um = $("unlockMsg");
      if (um) um.textContent = (um.textContent ? um.textContent + " · " : "") + "+" + r.pass_xp + " XP de passe" + (r.box ? " · ganhou uma CAIXA (abra em PASSE › CAIXAS)" : "");
    });`);

// ---------- tela PASSE (passe, missões, caixas, Z-Coin)
rep('<div id="rankScr" class="screen shadeFull hidden">', `<div id="ecoScr" class="screen shadeFull hidden">
  <div class="rkWrap">
  <div class="selHead"><div class="h2 yo"><small id="ecSeason">TEMPORADA</small>PASSE E LOJA</div><button class="btn alt yo" id="bEcoBack">VOLTAR</button></div>
  <div class="ecBar"><span class="chip"><i class="ic chipi"></i><b id="ecChips" class="num">0</b></span><span class="chip"><i class="ic zc"></i><b id="ecZ" class="num">0</b></span><div class="seg" id="ecTabs"><button data-t="pass">PASSE</button><button data-t="mis">MISSÕES</button><button data-t="box">CAIXAS</button><button data-t="shop">Z-COIN</button></div></div>
  <div class="panel wide rkBox"><div id="ecBody"></div></div>
  </div>
</div>
<div id="rankScr" class="screen shadeFull hidden">`);
rep('"login", "nameScr", "rankScr"]) $(s).classList.toggle("hidden", s !== id);', '"login", "nameScr", "rankScr", "ecoScr"]) $(s).classList.toggle("hidden", s !== id);');
{
  const i = s.indexOf('</style>');
  s = s.slice(0, i) + nl(`/* v28: passe, missões, caixas e loja */
.ic.chipi,.ic.zc{width:20px;height:20px}
.ecBar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;width:100%}
.ecBar .seg{margin-left:auto}
.ecRow{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:center;padding:8px;border-bottom:1px solid #2a2638}
.ecRow b{color:var(--gold)}.ecRow small{color:var(--mute);display:block}
.ecPb{height:6px;background:#2a2638;border-radius:3px;overflow:hidden;margin-top:4px}.ecPb i{display:block;height:100%;background:#7dff6a}
.ecLv{display:grid;grid-template-columns:44px minmax(0,1fr) minmax(0,1fr);gap:6px;align-items:center;padding:6px;border-bottom:1px solid #2a2638}
.ecLv.got{opacity:.55}.ecLv .pr{font-size:12px}.ecLv button,.ecRow button{min-height:32px;padding:4px 10px}
.ecOdds{display:grid;grid-template-columns:1fr auto;gap:4px 12px;max-width:360px;margin:8px auto}
.ecNote{color:var(--mute);font-size:12px;margin:8px 0}
`) + s.slice(i);
}
rep('let helpBack = "title";', String.raw`// ===== ECO (v28.3): chip de tecnologia, Z-Coin, passe, missões, caixas e loja. O servidor é a fonte da verdade;
// aqui só se guarda a última leitura (get_economy) para desenhar. Sem conta ou com modo de teste: nada disso aparece.
const ECO = {
  ready: 0, chips: 0, zcoin: 0, data: null, items: [], tab: "pass",
  // pacotes de Z-Coin: venda pelo link de checkout da InfinitePay (crédito manual pelo administrador).
  // link: o endereço do checkout; enquanto for null, o botão mostra "em breve".
  packs: [{ n: "Punhado", z: 100, b: 0, p: "R$ 4,90" }, { n: "Saco", z: 300, b: 30, p: "R$ 12,90" }, { n: "Mochila", z: 650, b: 100, p: "R$ 24,90" }, { n: "Cofre", z: 1400, b: 300, p: "R$ 49,90" }],
  link: null,
  // a venda por link externo não pode aparecer no app Android da Play Store (Google Play Billing obrigatório)
  storeApp: /QuebradaZApp/i.test(navigator.userAgent),
  cost(id, lv) {
    const c = this.data && this.data.costs;
    return c && c[id + ":" + lv] != null ? c[id + ":" + lv] : lv;
  },
  refresh() {
    if (DEV.on || !NET.logged || !NET.st.profile) {
      this.ready = 0;
      this.paint();
      return Promise.resolve(null);
    }
    const first = !this.imported ? NET.rpc("import_skills", {}).then(() => this.imported = 1, () => {
    }) : Promise.resolve();
    return first.then(() => NET.rpc("get_economy", {})).then((d) => {
      this.data = d;
      this.ready = 1;
      this.chips = d.wallet.chips;
      this.zcoin = d.wallet.zcoin;
      this.items = (d.items || []).filter((k) => k !== "pacote_s1");
      const D = SAVE.d;
      D.skills = Object.assign({}, d.skills || {});
      D.up = Object.assign({}, D.skills);
      try {
        LOOK.checkUnlocks();
      } catch (e) {
      }
      this.paint();
      if (!$("ecoScr").classList.contains("hidden")) this.show(this.tab);
      return d;
    }).catch(() => {
      this.ready = 0;
      this.paint();
      return null;
    });
  },
  paint() {
    const on = !!this.ready;
    document.querySelectorAll(".ecoOn").forEach((e) => e.classList.toggle("hidden", !on));
    $("tChipN").textContent = this.chips;
    $("tZN").textContent = this.zcoin;
    $("ecChips").textContent = this.chips;
    $("ecZ").textContent = this.zcoin;
  },
  bossDrop(kind, z) {
    if (!this.ready || !NET.st.run || S.lab) return;
    const x = z ? z.x : S.player.x, y = z ? z.y - 40 : G0 - 40;
    NET.rpc("boss_drop", { p_run: NET.st.run, p_boss: kind }).then((r) => {
      if (r.chip) {
        this.chips++;
        UI.toast && UI.toast("+1 CHIP DE TECNOLOGIA", "#3ee6c8");
        S.dyn.push({ x, y, r: 70, c: "#3ee6c8", i: 1, life: 1.2 });
      }
      if (r.zcoin) {
        this.zcoin += r.zcoin;
        setTimeout(() => UI.toast && UI.toast("+" + r.zcoin + " Z-COIN", "#c86aff"), 900);
      }
      this.paint();
    }).catch(() => {
    });
  },
  name(id) {
    const it = LOOK.ITEMS[id];
    return it ? it.name : id === "pacote_s1" ? "Pacote da temporada" : id;
  },
  prize(k, a, it) {
    return k === "coins" ? a + " moedas" : k === "chip" ? a + (a === 1 ? " chip" : " chips") : k === "zcoin" ? a + " Z-Coin" : k === "item" ? this.name(it) : "—";
  },
  // moedas comuns de prêmio somam no save do aparelho (não valem dinheiro); o resto já está no servidor
  got(r) {
    if (r && r.coins) SAVE.d.coins += r.coins;
    if (r && r.kind === "coins") SAVE.d.coins += r.amount;
    SAVE.save();
    try {
      TITLE.refresh();
    } catch (e) {
    }
    return this.refresh();
  },
  show(tab) {
    this.tab = tab || this.tab;
    [...$("ecTabs").children].forEach((b) => b.classList.toggle("on", b.dataset.t === this.tab));
    const B = $("ecBody"), d = this.data;
    if (!this.ready || !d) {
      B.innerHTML = '<p class="ecNote">' + (DEV.on ? "Modo de teste ligado: passe, missões e loja ficam desligados." : "Entre na sua conta para ver o passe, as missões, as caixas e a loja.") + "</p>";
      return;
    }
    const P = d.pass, esc = (t) => String(t).replace(/[<>&]/g, "");
    $("ecSeason").textContent = P ? P.name : "SEM TEMPORADA";
    if (this.tab === "pass") {
      if (!P) return B.innerHTML = '<p class="ecNote">Nenhuma temporada ativa agora.</p>';
      const lv = Math.min(P.levels, Math.floor(P.xp / P.xp_per)), inLv = P.xp % P.xp_per, ends = new Date(P.ends);
      let h = '<div class="ecRow"><div><b>Nível ' + lv + " de " + P.levels + "</b><small>" + inLv + " / " + P.xp_per + " XP · termina em " + ends.toLocaleDateString("pt-BR") + '</small><div class="ecPb"><i style="width:' + (lv >= P.levels ? 100 : inLv / P.xp_per * 100) + '%"></i></div></div>' + (P.premium ? "<b>PREMIUM</b>" : '<button class="btn yo" data-act="buypass">PREMIUM · ' + P.price + " Z</button>") + "</div>";
      const byL = {};
      (P.rewards || []).forEach((r) => (byL[r.l] = byL[r.l] || {})[r.t] = r);
      for (let l = 1; l <= P.levels; l++) {
        const R = byL[l] || {}, cell = (t) => {
          const r = R[t];
          if (!r) return "<span></span>";
          const done = (t === "free" ? P.free : P.prem).indexOf(l) >= 0, can = lv >= l && !done && (t === "free" || P.premium);
          return '<span class="pr">' + (t === "prem" ? "★ " : "") + esc(this.prize(r.k, r.a, r.i)) + (done ? " ✓" : can ? ' <button data-act="claim" data-l="' + l + '" data-t="' + t + '">PEGAR</button>' : "") + "</span>";
        };
        h += '<div class="ecLv' + (l > lv ? "" : "") + '"><b>' + l + "</b>" + cell("free") + cell("prem") + "</div>";
      }
      h += '<p class="ecNote">XP de passe por partida: onda × 20 + abates + 200 por chefe. Missões dão mais. ★ = trilha premium.</p>';
      B.innerHTML = h;
    } else if (this.tab === "mis") {
      let h = '<p class="ecNote">Renovam toda segunda às 00:00 (Brasília). Contam só partidas aceitas pelo servidor.</p>';
      (d.missions || []).forEach((m) => {
        const done = m.progress >= m.target, pz = [m.coins + " moedas", m.xp + " XP"].concat(m.zcoin ? [m.zcoin + " Z-Coin"] : [], m.chips ? [m.chips + " chip"] : []).join(" + ");
        h += '<div class="ecRow"><div><b>' + esc(m.text) + "</b><small>" + Math.min(m.progress, m.target) + " / " + m.target + " · " + pz + '</small><div class="ecPb"><i style="width:' + Math.min(100, m.progress / m.target * 100) + '%"></i></div></div>' + (m.claimed ? "<b>✓</b>" : done ? '<button class="btn yo" data-act="mis" data-s="' + m.slot + '">PEGAR</button>' : "<span></span>") + "</div>";
      });
      B.innerHTML = h;
    } else if (this.tab === "box") {
      B.innerHTML = '<div class="ecRow"><div><b>Caixas fechadas: ' + d.boxes + "</b><small>Você ganha uma caixa grátis cada vez que completa um mapa (vence a onda 20). Caixas não são vendidas.</small></div>" + (d.boxes > 0 ? '<button class="btn yo" data-act="box">ABRIR</button>' : "<span></span>") + '</div><p id="ecBoxRes" class="ecNote"></p><div class="ecOdds"><b>Chances de cada caixa</b><span></span><span>200 a 600 moedas</span><b>80%</b><span>Roupa rara ou lendária que você não tem</span><b>12%</b><span>1 chip de tecnologia</span><b>6%</b><span>25 Z-Coin</span><b>2%</b></div><p class="ecNote">Skins de arma entram nas caixas numa atualização futura.</p>';
    } else {
      let h = '<p class="ecNote">Seu código para a compra: <b>' + esc(NET.st.name || "") + "</b>. Informe esse nome no pagamento; a Z-Coin entra na conta quando o pagamento for confirmado.</p>";
      if (!this.storeApp) this.packs.forEach((p, i) => h += '<div class="ecRow"><div><b>' + p.n + " · " + p.z + (p.b ? " + " + p.b + " de bônus" : "") + " Z-Coin</b><small>" + p.p + ' no Pix</small></div><button class="btn alt" data-act="pack" data-i="' + i + '">' + (this.link ? "COMPRAR" : "EM BREVE") + "</button></div>");
      (d.shop || []).forEach((it) => {
        const own = this.items.indexOf(it.id) >= 0 || (d.items || []).indexOf(it.id) >= 0;
        h += '<div class="ecRow"><div><b>' + esc(this.name(it.id)) + "</b><small>" + (it.kind === "pack" ? "Jaqueta zumbi (lendária) + jaqueta neon + moletom roxo + 50 Z-Coin" : it.rarity >= 3 ? "Lendária" : "Rara") + "</small></div>" + (own ? "<b>✓ SUA</b>" : '<button class="btn yo" data-act="item" data-id="' + it.id + '">' + it.price + " Z</button>") + "</div>";
      });
      B.innerHTML = h;
    }
  },
  act(b) {
    const a = b.dataset.act, done = (r) => this.got(r).then(() => this.show());
    const fail = (e) => {
      b.disabled = false;
      UI.toast && UI.toast(ecoErr(e), "#ff5a5a");
    };
    b.disabled = true;
    if (a === "buypass") NET.rpc("buy_pass", {}).then(done, fail);
    else if (a === "claim") NET.rpc("claim_pass", { p_level: +b.dataset.l, p_track: b.dataset.t }).then(done, fail);
    else if (a === "mis") NET.rpc("claim_mission", { p_slot: +b.dataset.s }).then(done, fail);
    else if (a === "item") NET.rpc("buy_item", { p_item: b.dataset.id }).then(done, fail);
    else if (a === "box") NET.rpc("next_box", {}).then((id) => id ? NET.rpc("open_box", { p_box: id }) : Promise.reject(new Error("SEM_CAIXA"))).then((r) => this.got(r).then(() => {
      this.show("box");
      const el = $("ecBoxRes");
      if (el) el.textContent = "Você ganhou: " + this.prize(r.kind, r.amount, r.item) + "!";
    }), fail);
    else if (a === "pack") {
      b.disabled = false;
      if (this.link) window.open(this.link, "_blank", "noopener");
      else UI.toast && UI.toast("VENDA DE Z-COIN EM BREVE", "#c86aff");
    }
  }
};
const ECO_ERR = { CHIPS_INSUFICIENTES: "Chips insuficientes", ZCOIN_INSUFICIENTE: "Z-Coin insuficiente", JA_TEM: "Você já tem", JA_RESGATADO: "Já pegou esse prêmio", NIVEL_NAO_ALCANCADO: "Nível ainda não alcançado", SEM_PASSE: "Precisa do passe premium", MISSAO_INCOMPLETA: "Missão ainda não completa", NIVEL_MAXIMO: "Já está no máximo", SEM_CAIXA: "Nenhuma caixa para abrir" };
const ecoErr = (e) => {
  const m = e && e.message || "";
  for (const k in ECO_ERR) if (m.indexOf(k) >= 0) return ECO_ERR[k];
  return acctErr(e);
};
$("ecTabs").onclick = (e) => {
  const b = e.target.closest("button");
  if (b) ECO.show(b.dataset.t);
};
$("ecBody").onclick = (e) => {
  const b = e.target.closest("button[data-act]");
  if (b) ECO.act(b);
};
$("bEco").onclick = () => {
  SFX.swap && SFX.swap();
  UI.show("ecoScr");
  ECO.show(ECO.tab);
  ECO.refresh();
};
$("bEcoBack").onclick = () => UI.show("title");
ECO.paint();
let helpBack = "title";`);
// carteira carrega depois de entrar na conta e some/volta com o modo de teste
rep(`function acctHome() {
  acctUI();`, `function acctHome() {
  ECO.refresh();
  acctUI();`);
rep('  $("devBtn").classList.toggle("hidden", !DEV.on);', '  $("devBtn").classList.toggle("hidden", !DEV.on);\n  try {\n    ECO.refresh();\n  } catch (e) {\n  }');
rep('const LOOK = (function () {', 'const LOOK = (function () {');
s = s.replace(/const QZ_VERSION='28\.2';/, "const QZ_VERSION='28.3';").replace(/const QZ_NOTE='[^']*';/, "const QZ_NOTE='Chip de tecnologia, Z-Coin, passe de batalha, missoes semanais e caixas gratis ao completar um mapa';");
fs.writeFileSync(F, s);
console.log('ok parte 2');
