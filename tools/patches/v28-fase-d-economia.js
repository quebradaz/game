// v28 fase D: chip de tecnologia, Z-Coin, habilidades por chip, queda no chefe (sorteio no servidor),
// passe de batalha, missões semanais, caixas grátis e loja Z-Coin. Uso: node tools/patches/v28-fase-d-economia.js index.html
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
const ICO_G = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAACHklEQVR4AeSTr3LcMBjEt0UBfYDOQcE+QUBAgfDBAwGFgp1Cgz7AwU6gQWFBYbFAYR+gUyjY6RQHHEv2Z8UzztmyQ4Li8Y400n673x/7tZ75eaEGb99c3D21s5stQuwc+8udxrMto1UDRD5dn3Tz9YP+/ARXXnc6Junm807762q0ZtI0qOI7pZQUQ1HJuaJnX4YzjPaXp6GalsmiwSDuDNMxyqrKfVbwdoCzZ7Wfr4qOx+Bq2iYzg0HcpacYpBxUSpFC0rv3f5VLqlB14aq4InurVcnMgFKDtVlz7m0gxVjc+yu3JVdEV+S2yd5+nQAcIuZYNFAw0ekh7J36Lqs/ZHWdO1Z8adXszLmjUFb8WM+xbGCBkYhAcg9CCkqeSbBS35ngN/qcKkRG9h1jpuuywcCwgl9i3RCFEBXkSqbi8BrCXIGGAcpuhxl8LQHxkMWebIPLKuIDMKdSzaQcL2fvokHJleUxDEMOFmfD/5CS/wEPnQ+Be6qDnas720dYNMjOiuDoTGEfDkUHD3iK/mHIzKU4wC/UGWYG/25Pr37/v1Dfw3W2DNd9/u5PfwrMo4cO0f+hiCGWqClmBlxC/DGauJRo8eKe2M4fTRT74cxt6ZwIXGKIPceiASQCvvyqlVjnYZoMx7Ap/wFVromj0zTgEhMEPn6rRgiO4Iw7OHBbWDUgCAGA2BScAThr2DQYgxGbYjzfWp9ssCXUun92g3sAAAD//1o1arIAAAAGSURBVAMABqkWQC/kphoAAAAASUVORK5CYII=';
const ICO_Z = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAYAAADgdz34AAACRUlEQVR4AeRULXMbMRTcFmUyhzOZQuH8gIBA4cCCAkPBTuGBgsLgQIECw0BPoKB/gqdQ8CZjfOMpS3ffRU1iyReToNje09d7u+/j5M94588HEzjvTh4Ljq3smyUqhBofxi8o0LpgTmxWQAQiPCWxSM67AR7Ovtqbzq4gO523cFBATiIR6Y7E998G3F4OCO6OIsEgKc9Zi7jsNQUKuRH/HMw2pghDjsj8wvLwWHW/MAVy8miGe49KQOQX4wIiN9sM3J6tGadn9IpXRfIm4Z3D9bh+tjWH149KQMdThMD97wE5Mdbg4G8IjuHOIWjugZQzqIGLUVm0e1EJPIx/P+26NVTz1Cc4EsWY0PcRPUdyQh+RawRzUS/kI99p7/lZCfw/Ymn4swyQHbcdVtsFR1gv8pOS2VDkdDwyA+vB2UREPxgP+UWukvWxR0osDZsMg2kefLQzYFjqQ8Fqe4U/7AeLjs12iZvARlNUrM49TbRooBJQHTfdkpFnEgUmkXF9uYT6oLr/4NyyEpmzSDjjSEtOql8loBLpvY563/kGeTY5p8S6JyuNyhO5VnbBeyalmQQqbtuoBJTBjjdXb0efp3p7F+B9KQXrzylvhWW16RbshLO7IF9jffGoBHQmwyKy4U1NzMZlXjJHWokhMPIEnSnbDKYqxwaaArKbRNb2NyCCmL8iMqPvbLjGjGhnCkSQvfz2cVBAhnKSs6C1yqaINWqtfdkIWrcwKyAHOQsi24f2ZTOHNwWKs8j2Uc7mxqMF5kjmzt5d4B8AAAD//zWjDfwAAAAGSURBVAMAUKg/QIQGA7gAAAAASUVORK5CYII=';

// ---------- ícones: moeda comum = arte dourada; Z-Coin = arte roxa; chip desenhado em pixel art
rep('document.querySelectorAll(".ic.coin").forEach((e) => e.style.backgroundImage = `url(${ICON_COIN})`);',
  `// v28: moeda comum e Z-Coin com as artes do dono do projeto (recortadas e reduzidas a 24 px); chip em pixel art
const ICON_GOLD = "${ICO_G}", ICON_ZC = "${ICO_Z}";
const ICON_CHIP = pixIcon(["..a.a.a.", ".bbbbbbb", "abcccccb", ".bcdddcb", "abcdedcb", ".bcdddcb", "abcccccb", ".bbbbbbb"], { a: "#9aa4b0", b: "#0e2a26", c: "#1f6a5a", d: "#3ee6c8", e: "#e8fff8" });
document.querySelectorAll(".ic.coin").forEach((e) => e.style.backgroundImage = \`url(\${ICON_GOLD})\`);
document.querySelectorAll(".ic.zc").forEach((e) => e.style.backgroundImage = \`url(\${ICON_ZC})\`);
document.querySelectorAll(".ic.chipi").forEach((e) => e.style.backgroundImage = \`url(\${ICON_CHIP})\`);`);
rep('<div class="tChips"><span class="chip"><i class="ic coin"></i><b id="tCoins" class="num">0</b></span>',
  '<div class="tChips"><span class="chip"><i class="ic coin"></i><b id="tCoins" class="num">0</b></span><span class="chip ecoOn"><i class="ic chipi"></i><b id="tChipN" class="num">0</b></span><span class="chip ecoOn"><i class="ic zc"></i><b id="tZN" class="num">0</b></span>');
rep('<button class="btn alt yo" id="bRank">RANKING</button>', '<button class="btn alt yo" id="bRank">RANKING</button><button class="btn alt yo ecoOn" id="bEco">PASSE</button>');

// ---------- itens novos (temporada 1 e loja Z-Coin). Só liberam quando o servidor diz que você tem (unlock.src)
rep('  const RAR = ["comum", "incomum", "raro", "exclusivo"];', '  const RAR = ["comum", "incomum", "raro", "exclusivo", "lendário"];');
rep(`    chapeu_malandro: I("head", "panama", "Chap\\xE9u de malandro", 0, 3, ["#f0ece0", "#b0a890", "#ffffff"], { d: "#c0262a", hideHair: 1, unlock: { map: "lapa", wave: 10 } })`,
  `    chapeu_malandro: I("head", "panama", "Chap\\xE9u de malandro", 0, 3, ["#f0ece0", "#b0a890", "#ffffff"], { d: "#c0262a", hideHair: 1, unlock: { map: "lapa", wave: 10 } }),
    // v28: temporada 1 (passe) — raros (2) e lendários (4)
    s1_jaqueta_vinho: I("chest", "jaqueta", "Jaqueta vinho", 0, 2, ["#5a1420", "#2e0a10", "#7a2a34"], { in: ["#16141c", "#0a0a0e"], d: "#c9cdd4", unlock: { src: "passe" } }),
    s1_camisa_tatica_noite: I("chest", "tatica", "Tática noturna", 0, 2, ["#1e2230", "#10121a", "#343a4e"], { d: "#7dff6a", unlock: { src: "passe" } }),
    s1_calca_couro_vinho: I("legs", "calca", "Calça de couro vinho", 0, 2, ["#3a0e16", "#1e060a", "#5a1a24"], { unlock: { src: "passe" } }),
    s1_capacete_neon: I("head", "capacete", "Capacete neon", 0, 2, ["#16141c", "#0a080c", "#3a3848"], { d: "#ff3d8b", hideHair: 1, hideFace: 1, unlock: { src: "passe" } }),
    s1_cordao_prata: I("acc", "cordao", "Cordão de prata", 0, 2, ["#c8ccd4", "#7a808a", "#ffffff"], { spot: "neck", unlock: { src: "passe" } }),
    s1_coturno_neve: I("feet", "bota", "Coturno branco", 0, 2, ["#e8e4d8", "#a8a498", "#ffffff"], { unlock: { src: "passe" } }),
    s1_jaqueta_ouro: I("chest", "jaqueta", "Jaqueta de ouro", 0, 4, ["#c9a227", "#7a5a10", "#ffe070"], { in: ["#16141c", "#0a0a0e"], d: "#16141c", unlock: { src: "passe" } }),
    s1_capacete_caveira: I("head", "capacete", "Capacete caveira", 0, 4, ["#e8e4d8", "#8a8478", "#ffffff"], { d: "#c0262a", hideHair: 1, hideFace: 1, unlock: { src: "passe" } }),
    s1_cordao_diamante: I("acc", "cordao", "Cordão de diamante", 0, 4, ["#9ff4ff", "#3e9aa8", "#ffffff"], { spot: "neck", unlock: { src: "passe" } }),
    s1_tatica_sangue: I("chest", "tatica", "Tática sangue", 0, 4, ["#6a0a10", "#3a0408", "#a8141c"], { d: "#16141c", unlock: { src: "passe" } }),
    // v28: loja Z-Coin
    z_jaqueta_neon: I("chest", "jaqueta", "Jaqueta neon", 0, 2, ["#1a1626", "#0c0a12", "#2e2840"], { in: ["#ff3d8b", "#a8246a"], d: "#3ee6ff", unlock: { src: "loja" } }),
    z_moletom_roxo: I("chest", "capuz", "Moletom roxo", 0, 2, ["#5a2a8a", "#34145a", "#7a4aae"], { unlock: { src: "loja" } }),
    z_bone_ouro: I("head", "bone", "Boné de ouro", 0, 2, ["#c9a227", "#7a5a10", "#ffe070"], { d: "#16141c", hideHair: 1, unlock: { src: "loja" } }),
    z_capacete_ouro: I("head", "capacete", "Capacete de ouro", 0, 4, ["#c9a227", "#7a5a10", "#ffe070"], { d: "#16141c", hideHair: 1, hideFace: 1, unlock: { src: "loja" } }),
    z_jaqueta_zumbi: I("chest", "jaqueta", "Jaqueta zumbi", 0, 4, ["#4a6a3a", "#2a3a20", "#6a8a50"], { in: ["#8e0f16", "#5c0a10"], d: "#e8e4d8", unlock: { src: "loja" } })`);
rep('.lkShopItem.r1 .rar{background:#2a5a8a}', '.lkShopItem.r4 .rar{background:#ff8a1a;color:#1a0d00}.lkShopItem.r4{box-shadow:0 0 0 1px #ff8a1a inset}.lkShopItem.r1 .rar{background:#2a5a8a}');
// itens ganhos no servidor entram no inventário
rep('    const fresh = d.inv.filter((k) => before.indexOf(k) < 0 && ITEMS[k].unlock);', `    if (typeof ECO !== "undefined" && ECO.items) for (const k of ECO.items) if (ITEMS[k] && d.inv.indexOf(k) < 0) d.inv.push(k);
    const fresh = d.inv.filter((k) => before.indexOf(k) < 0 && ITEMS[k].unlock);`);

// ---------- habilidades custam chips (compra no servidor)
rep(`function buySkill(id) {
  const D = SAVE.d, n = SKILLS[id], lv = skillLvl(id);
  if (!n || n.soon || lv >= n.max() || !skillReqOk(id)) return false;
  const pr = n.cost(lv);
  if (D.coins < pr) return false;
  D.coins -= pr;
  D.skills = D.skills || {};
  D.skills[id] = lv + 1;
  D.up = Object.assign({}, D.skills);
  SAVE.save();
  return true;
}`, `// v28: habilidade custa chip de tecnologia e a compra é feita no servidor (custo em skill_costs).
// Responde na hora com false; quando o servidor confirma, aplica o nível e redesenha (onDone).
function buySkill(id, onDone) {
  const D = SAVE.d, n = SKILLS[id], lv = skillLvl(id);
  if (!n || n.soon || lv >= n.max() || !skillReqOk(id)) return false;
  if (!ECO.ready) {
    UI.toast && UI.toast(DEV.on ? "MODO DE TESTE: SEM COMPRA" : "ENTRE NA CONTA PARA USAR CHIPS", "#ffd84a");
    return false;
  }
  if (ECO.chips < ECO.cost(id, lv + 1)) {
    UI.toast && UI.toast("CHIPS INSUFICIENTES", "#ff5a5a");
    return false;
  }
  NET.rpc("buy_skill", { p_skill: id }).then((r) => {
    ECO.chips = r.chips;
    D.skills = D.skills || {};
    D.skills[id] = r.level;
    D.up = Object.assign({}, D.skills);
    SAVE.save();
    ECO.paint();
    onDone && onDone();
  }).catch((e) => UI.toast && UI.toast(ecoErr(e), "#ff5a5a"));
  return false;
}`);
rep('  head.innerHTML = `<span class="chip"><i class="ic coin"></i><b class="num">${D.coins}</b></span><p>Suas habilidades.',
  '  head.innerHTML = `<span class="chip"><i class="ic chipi" style="background-image:url(${ICON_CHIP})"></i><b class="num">${ECO.ready ? ECO.chips : "\\u2014"}</b></span><p>Suas habilidades custam chip de tecnologia (chefes têm 50% de chance de soltar um).');
fs.writeFileSync(F, s);
console.log('ok parte 1');
