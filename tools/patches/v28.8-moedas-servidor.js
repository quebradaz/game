// v28.8: com conta, moedas comuns, nível e XP do personagem passam a vir do servidor.
// - fim de partida: o jogo não soma mais moedas e XP no aparelho; usa o que submit_run devolve
//   (partida recusada ou sem conexão não paga nada, e o jogo avisa);
// - loja do menu (roupas e kits com moedas): compra pelo servidor (buy_look / buy_kit);
// - prêmios de missão, passe e caixa em moedas: o servidor já credita, o aparelho só espelha;
// - primeira vez com a versão nova: import_meta traz o saldo antigo do save, com teto.
// Sem conta (jogar offline) ou no modo de teste, tudo continua como antes, só no aparelho.
// Se a migração v28_8 ainda não estiver no servidor, get_economy não traz `coins` e o jogo segue no modo antigo.
// Uso: node tools/patches/v28.8-moedas-servidor.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

// ---------- fim de partida ----------
rep(`    D.coins += coins;
    D.kills += S.stats.kills;`,
`    const srv = typeof ECO !== "undefined" && ECO.srvOn() && !S.lab;
    if (!srv) D.coins += coins;
    D.kills += S.stats.kills;`);
rep(`night: S.period === "noite" }).then((r) => {
      if (!r || !r.ok) return;`,
`night: S.period === "noite" }).then((r) => {
      if (srv) ECO.runMeta(r);
      if (!r || !r.ok) return;`);
rep(`    D.xp += xp;
    let ups = 0;
    while (D.xp >= lvlNeed(D.level)) {`,
`    let ups = 0;
    if (!srv) D.xp += xp;
    while (!srv && D.xp >= lvlNeed(D.level)) {`);

// ---------- ECO: espelho do servidor ----------
rep(`  ready: 0, chips: 0, zcoin: 0, data: null, items: [], tab: "pass",`,
`  ready: 0, chips: 0, zcoin: 0, data: null, items: [], tab: "pass", srvMeta: 0,
  // moedas, nível e XP moram no servidor (com conta e com a migração v28_8 aplicada)
  srvOn() {
    return !!(this.ready && this.srvMeta && !DEV.on);
  },
  // copia moedas, nível e XP do servidor para o save do aparelho (que vira só espelho)
  mirror(c, lv, xp) {
    const D = SAVE.d;
    if (c != null) D.coins = c | 0;
    if (lv != null) D.level = Math.max(1, lv | 0);
    if (xp != null) D.xp = Math.max(0, xp | 0);
    SAVE.save();
    try {
      TITLE.refresh();
    } catch (e) {
    }
  },
  // resposta de submit_run na tela de fim de partida
  runMeta(r) {
    const um = $("unlockMsg"), add = (t) => um && (um.textContent = (um.textContent ? um.textContent + " · " : "") + t);
    if (!r) return add("Sem conexão com o servidor: moedas e XP desta partida não contaram");
    if (!r.ok) return add("Partida recusada pelo servidor (" + (r.reason || "?") + "): sem moedas e XP");
    const D = SAVE.d, lv0 = D.level;
    this.mirror(r.wallet_coins, r.level, r.xp);
    $("sCoins").textContent = "+" + (r.coins | 0);
    $("sXp").textContent = "+" + (r.char_xp | 0);
    $("ovLvl").textContent = D.level;
    $("ovXp").style.width = D.xp / lvlNeed(D.level) * 100 + "%";
    $("ovXpTx").textContent = (D.level > lv0 ? \`Subiu pro n\\xEDvel \${D.level}! \` : "") + \`\${D.xp} / \${lvlNeed(D.level)} XP\`;
  },`);
rep(`    const first = !this.imported ? NET.rpc("import_skills", {}).then(() => this.imported = 1, () => {
    }) : Promise.resolve();`,
`    const first = !this.imported ? Promise.all([NET.rpc("import_skills", {}), NET.rpc("import_meta", {}).catch(() => null)]).then(() => this.imported = 1, () => {
    }) : Promise.resolve();`);
rep(`      const D = SAVE.d;
      D.skills = Object.assign({}, d.skills || {});`,
`      const D = SAVE.d;
      D.skills = Object.assign({}, d.skills || {});
      this.srvMeta = d.wallet.coins != null ? 1 : 0;
      if (this.srvMeta) this.mirror(d.wallet.coins, d.wallet.level, d.wallet.xp);`);
rep(`    if (r && r.coins) SAVE.d.coins += r.coins;
    if (r && r.kind === "coins") SAVE.d.coins += r.amount;`,
`    if (!this.srvMeta && r && r.coins) SAVE.d.coins += r.coins;
    if (!this.srvMeta && r && r.kind === "coins") SAVE.d.coins += r.amount;`);
rep(`const ECO_ERR = { CHIPS_INSUFICIENTES: "Chips insuficientes",`,
`const ECO_ERR = { MOEDAS_INSUFICIENTES: "Moedas insuficientes", ITEM_INVALIDO: "Item indisponível", CHIPS_INSUFICIENTES: "Chips insuficientes",`);

// ---------- loja do menu: compra com moedas pelo servidor ----------
rep(`    const buyFx = (b) => { SFX.deny(); b.animate([{ transform: "translateX(-3px)" }, { transform: "translateX(3px)" }, { transform: "none" }], { duration: 160 }); };`,
`    const buyFx = (b) => { SFX.deny(); b.animate([{ transform: "translateX(-3px)" }, { transform: "translateX(3px)" }, { transform: "none" }], { duration: 160 }); };
    // com conta: o servidor confere o saldo, desconta e guarda a roupa; o aparelho só espelha
    const srvBuy = (fn, args, b, items, wear) => {
      b.disabled = true;
      NET.rpc(fn, args).then((r) => {
        items.forEach((k) => { if (d.inv.indexOf(k) < 0) d.inv.push(k); });
        ECO.items = Array.from(new Set(ECO.items.concat(items)));
        wear();
        SFX.buy();
        sanitize(d);
        ECO.mirror(r.coins);
        AVA_CLEAR();
        apply();
        showMShop();
      }, (e) => {
        b.disabled = false;
        buyFx(b);
        UI.toast && UI.toast(ecoErr(e), "#ff5a5a");
      });
    };`);
rep(`            if (d.coins < pr.price) return buyFx(b);
            d.coins -= pr.price;`,
`            if (d.coins < pr.price) return buyFx(b);
            if (ECO.srvOn()) return srvBuy("buy_kit", { p_kit: id }, b, kit.items, () => kit.items.forEach((k) => equipInto(d.eq, k)));
            d.coins -= pr.price;`);
rep(`            if (d.coins < it.price) return buyFx(b);
            d.coins -= it.price;`,
`            if (d.coins < it.price) return buyFx(b);
            if (ECO.srvOn()) return srvBuy("buy_look", { p_item: k }, b, [k], () => equipInto(d.eq, k));
            d.coins -= it.price;`);

// A versão (QZ_VERSION) fica para quem juntar os patches da 28.8, para não brigar com as outras mudanças.
fs.writeFileSync(F, s);
console.log('ok');
