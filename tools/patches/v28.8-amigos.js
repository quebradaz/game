// v28.8: área de amigos. Botão AMIGOS no menu (só com conta), tela com adicionar pelo nome, pedidos recebidos,
// amigos e pedidos enviados; no RANKING, chave GERAL / AMIGOS (ranking do mapa só entre você e seus amigos).
// Servidor: supabase/migrations/v28_8_amigos.sql (funções friend_request, friend_respond, friend_remove,
// get_friends, get_friends_leaderboard). Uso: node tools/patches/v28.8-amigos.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

// ----- CSS
rep('.rkDots{display:flex;justify-content:center;gap:6px;padding:4px}',
  '.rkDots{display:flex;justify-content:center;gap:6px;padding:4px}\n' +
  '#bFriends{position:relative}#bFriends .fdBadge{position:absolute;top:-7px;right:-7px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:var(--red);color:#fff;font-size:11px;line-height:18px;box-shadow:0 0 0 2px #000}\n' +
  '.rkMode{display:flex;gap:0;border:2px solid var(--line);border-radius:9px;overflow:hidden}.rkMode button{font-family:var(--fy);padding:6px 10px;background:transparent;border:0;color:#fff}.rkMode button.sel{background:var(--red)}\n' +
  '.fdWrap{display:flex;flex-direction:column;align-items:center;gap:8px;width:min(980px,100%);max-height:100%}\n' +
  '.fdBox{width:100%;box-sizing:border-box;max-height:64vh;overflow:auto}\n' +
  '.fdAdd{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin-bottom:4px}.fdAdd input{min-width:0;flex:1 1 160px;max-width:260px}\n' +
  '.fdSec{font-family:var(--fy);color:var(--gold);font-size:13px;letter-spacing:1px;margin:12px 0 4px}\n' +
  '.fdRow{display:grid;grid-template-columns:34px minmax(0,1fr) auto;gap:8px;align-items:center;padding:6px 4px;border-bottom:1px solid #2a2638}\n' +
  '.fdRow .ava{width:30px;height:30px;border-radius:50%;object-fit:cover;background:#2a2638;display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff}\n' +
  '.fdRow .nm{font-family:var(--fy);color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.fdRow small{display:block;color:var(--mute);font-family:inherit;font-size:12px}\n' +
  '.fdRow .ac{display:flex;gap:4px}.fdRow .ac .btn{padding:6px 10px;font-size:12px}\n' +
  '.fdRow .on{display:inline-block;width:8px;height:8px;border-radius:50%;background:#7dff6a;margin-right:5px;box-shadow:0 0 6px #7dff6a}');

// ----- botão no menu
rep('<button class="btn alt yo" id="bRank">RANKING</button>',
  '<button class="btn alt yo" id="bRank">RANKING</button><button class="btn alt yo hidden" id="bFriends">AMIGOS<i class="fdBadge hidden" id="fdBadge">0</i></button>');

// ----- chave GERAL / AMIGOS no ranking
rep('<small id="rkCamp">HELL DE JANEIRO</small>RANKING</div><button class="btn alt yo" id="bRankBack">VOLTAR</button></div>',
  '<small id="rkCamp">HELL DE JANEIRO</small>RANKING</div><div class="rkMode" id="rkMode"><button class="sel" data-m="0">GERAL</button><button data-m="1">AMIGOS</button></div><button class="btn alt yo" id="bRankBack">VOLTAR</button></div>');

// ----- tela de amigos
rep('<div id="profile" class="screen shadeFull hidden">',
  '<div id="friendScr" class="screen shadeFull hidden">\n' +
  '  <div class="fdWrap">\n' +
  '  <div class="selHead"><div class="h2 yo"><small>SUA TROPA</small>AMIGOS</div><button class="btn alt yo" id="bFriendsBack">VOLTAR</button></div>\n' +
  '  <div class="panel wide fdBox">\n' +
  '    <div class="fdAdd"><input id="fdIn" type="text" maxlength="16" autocomplete="off" spellcheck="false" placeholder="Nome do personagem" aria-label="Nome do amigo"><button class="btn yo" id="fdAddOk">ADICIONAR</button></div>\n' +
  '    <p class="segNote" id="fdMsg">Digite o nome exato do personagem do seu amigo.</p>\n' +
  '    <div id="fdList"></div>\n' +
  '  </div>\n' +
  '  </div>\n' +
  '</div>\n' +
  '<div id="profile" class="screen shadeFull hidden">');

rep('"rankScr", "ecoScr", "feedScr"]) $(s).classList.toggle(', '"rankScr", "ecoScr", "feedScr", "friendScr"]) $(s).classList.toggle(');

// ----- mensagens de erro do servidor
rep('const ACCT_ERR = {\n', 'const ACCT_ERR = {\n' +
  '  SEM_NOME: "Escolha o nome do seu personagem primeiro.",\n' +
  '  JOGADOR_NAO_ENCONTRADO: "Ninguém com esse nome. Confere a escrita.",\n' +
  '  VOCE_MESMO: "Esse é você, parceiro.",\n' +
  '  JA_AMIGOS: "Vocês já são amigos.",\n' +
  '  JA_PEDIU: "Você já mandou pedido para essa pessoa.",\n' +
  '  RECUSADO_ESPERA: "Essa pessoa recusou seu pedido. Dá para pedir de novo 7 dias depois.",\n' +
  '  LIMITE_PEDIDOS: "Muitos pedidos esperando resposta. Espera alguns aceitarem.",\n' +
  '  LIMITE_AMIGOS: "Sua lista está cheia (100 amigos).",\n' +
  '  LIMITE_AMIGOS_DELE: "A lista dessa pessoa está cheia.",\n' +
  '  SEM_PEDIDO: "Esse pedido não existe mais.",\n' +
  '  SEM_AMIZADE: "Vocês não são mais amigos.",\n');

// ----- botão só com conta
rep('  $("bRank").classList.toggle("hidden", !NET.logged);\n  $("pfAcct")',
  '  $("bRank").classList.toggle("hidden", !NET.logged);\n  $("bFriends").classList.toggle("hidden", !NET.logged);\n  if (NET.logged) setTimeout(() => FRIENDS.badge(), 0);\n  $("pfAcct")');

// ----- ranking: GERAL usa get_leaderboard, AMIGOS usa get_friends_leaderboard
rep('let rankOrd = [], rankSeen = {};', 'let rankOrd = [], rankSeen = {}, rankFriends = 0;');
rep('  NET.board(MAPS[mi].id).then((a) => {\n    box.innerHTML = !a || !a.length ? rankPod([]) + "<p>Ninguém no ranking deste mapa ainda. Seja o primeiro.</p>"',
  '  (rankFriends ? NET.rpc("get_friends_leaderboard", { p_map: MAPS[mi].id }) : NET.board(MAPS[mi].id)).then((a) => {\n    box.innerHTML = !a || !a.length ? rankPod([]) + (rankFriends ? "<p>Nem você nem seus amigos jogaram este mapa ainda. Chama a tropa em AMIGOS.</p>" : "<p>Ninguém no ranking deste mapa ainda. Seja o primeiro.</p>")');

rep('$("bRankBack").onclick = () => UI.show("title");',
  '$("bRankBack").onclick = () => UI.show("title");\n' +
  '[...$("rkMode").children].forEach((b) => b.onclick = () => {\n' +
  '  rankFriends = +b.dataset.m;\n' +
  '  [...$("rkMode").children].forEach((x) => x.classList.toggle("sel", x === b));\n' +
  '  rankSeen = {};\n' +
  '  if (rankMap != null) rankFill(rankMap);\n' +
  '});\n' +
  '// ===== AMIGOS (v28.8): tudo no servidor (friend_*), o jogo só desenha. Ninguém vê o id de outro jogador.\n' +
  'const FRIENDS = {\n' +
  '  list: [], busy: 0,\n' +
  '  ago(d) {\n' +
  '    return d == null ? "ainda não jogou" : d === 0 ? "jogou hoje" : d === 1 ? "jogou ontem" : "jogou há " + d + " dias";\n' +
  '  },\n' +
  '  row(f) {\n' +
  '    const n = rkEsc(f.name), b = (a, t, alt) => \'<button class="btn\' + (alt ? " alt" : "") + \'" data-a="\' + a + \'" data-n="\' + n + \'">\' + t + "</button>";\n' +
  '    let sub = "", ac = "";\n' +
  '    if (f.kind === "amigo") {\n' +
  '      sub = (f.played_ago_days === 0 ? \'<i class="on"></i>\' : "") + "recorde onda " + (f.best_wave | 0) + " · " + (f.kills | 0) + " abates · " + FRIENDS.ago(f.played_ago_days);\n' +
  '      ac = b("rm", "DESFAZER", 1);\n' +
  '    } else if (f.kind === "recebido") {\n' +
  '      sub = "quer ser seu amigo";\n' +
  '      ac = b("ok", "ACEITAR") + b("no", "RECUSAR", 1);\n' +
  '    } else {\n' +
  '      sub = "esperando resposta";\n' +
  '      ac = b("rm", "CANCELAR", 1);\n' +
  '    }\n' +
  '    return \'<div class="fdRow">\' + rkAv(f, "ava") + \'<div class="nm">\' + n + "<small>" + sub + \'</small></div><div class="ac">\' + ac + "</div></div>";\n' +
  '  },\n' +
  '  draw() {\n' +
  '    const g = (k) => FRIENDS.list.filter((f) => f.kind === k), rec = g("recebido"), am = g("amigo"), env = g("enviado");\n' +
  '    let h = "";\n' +
  '    if (rec.length) h += \'<div class="fdSec">PEDIDOS PARA VOCÊ (\' + rec.length + ")</div>" + rec.map(FRIENDS.row).join("");\n' +
  '    h += \'<div class="fdSec">AMIGOS (\' + am.length + ")</div>" + (am.length ? am.map(FRIENDS.row).join("") : "<p>Ninguém ainda. Adicione alguém pelo nome do personagem e vejam quem aguenta mais ondas no RANKING > AMIGOS.</p>");\n' +
  '    if (env.length) h += \'<div class="fdSec">PEDIDOS ENVIADOS (\' + env.length + ")</div>" + env.map(FRIENDS.row).join("");\n' +
  '    $("fdList").innerHTML = h;\n' +
  '    FRIENDS.setBadge(rec.length);\n' +
  '  },\n' +
  '  setBadge(n) {\n' +
  '    const e = $("fdBadge");\n' +
  '    e.textContent = n > 9 ? "9+" : n;\n' +
  '    e.classList.toggle("hidden", !n);\n' +
  '  },\n' +
  '  badge() {\n' +
  '    if (DEV.on) return;\n' +
  '    NET.rpc("get_friends", {}).then((a) => { FRIENDS.list = a || []; FRIENDS.setBadge(FRIENDS.list.filter((f) => f.kind === "recebido").length); }, () => {});\n' +
  '  },\n' +
  '  load() {\n' +
  '    $("fdList").innerHTML = "<p>Carregando...</p>";\n' +
  '    return NET.rpc("get_friends", {}).then((a) => { FRIENDS.list = a || []; FRIENDS.draw(); }, (e) => { $("fdList").innerHTML = "<p>" + acctErr(e) + "</p>"; });\n' +
  '  },\n' +
  '  act(p, okMsg) {\n' +
  '    if (FRIENDS.busy) return;\n' +
  '    FRIENDS.busy = 1;\n' +
  '    p.then((r) => { $("fdMsg").textContent = okMsg(r); SFX.swap && SFX.swap(); return FRIENDS.load(); }, (e) => { $("fdMsg").textContent = acctErr(e); }).then(() => FRIENDS.busy = 0, () => FRIENDS.busy = 0);\n' +
  '  },\n' +
  '  add() {\n' +
  '    const n = $("fdIn").value.trim();\n' +
  '    if (n.length < 3) { $("fdMsg").textContent = "Digite o nome do personagem (3 a 16 letras)."; return; }\n' +
  '    FRIENDS.act(NET.rpc("friend_request", { p_name: n }), (r) => { $("fdIn").value = ""; return r === "ACEITO" ? "Vocês agora são amigos!" : "Pedido enviado para " + n + "."; });\n' +
  '  },\n' +
  '  show() {\n' +
  '    $("fdMsg").textContent = "Digite o nome exato do personagem do seu amigo.";\n' +
  '    UI.show("friendScr");\n' +
  '    FRIENDS.load();\n' +
  '  }\n' +
  '};\n' +
  '$("bFriends").onclick = () => { SFX.swap && SFX.swap(); FRIENDS.show(); };\n' +
  '$("bFriendsBack").onclick = () => UI.show("title");\n' +
  '$("fdAddOk").onclick = () => FRIENDS.add();\n' +
  '$("fdIn").onkeydown = (e) => { if (e.key === "Enter") FRIENDS.add(); };\n' +
  '$("fdList").onclick = (e) => {\n' +
  '  const b = e.target.closest("button[data-a]");\n' +
  '  if (!b) return;\n' +
  '  const n = b.dataset.n, a = b.dataset.a;\n' +
  '  if (a === "ok") FRIENDS.act(NET.rpc("friend_respond", { p_name: n, p_accept: true }), () => "Agora você e " + n + " são amigos.");\n' +
  '  else if (a === "no") FRIENDS.act(NET.rpc("friend_respond", { p_name: n, p_accept: false }), () => "Pedido recusado.");\n' +
  '  else if (a === "rm") {\n' +
  '    if (b.dataset.sure !== "1") { b.dataset.sure = "1"; b.textContent = "CERTEZA?"; return; }\n' +
  '    FRIENDS.act(NET.rpc("friend_remove", { p_name: n }), () => "Pronto, " + n + " saiu da lista.");\n' +
  '  }\n' +
  '};');

rep("QZ_VERSION='28.7'", "QZ_VERSION='28.8'");
rep("QZ_NOTE='Roupas lendárias agora só no baú (0,5%) ou na loja Z-Coin; o passe premium dá Z-Coin no lugar'",
  "QZ_NOTE='Área de amigos: adicione pelo nome, aceite pedidos e veja o ranking só da sua tropa'");
fs.writeFileSync(F, s);
console.log('ok');
