// v28 fase C: conta Google (Supabase Auth + REST direto, sem biblioteca), nome do personagem, save na nuvem,
// estatísticas e ranking por mapa; o protagonista passa a ser o personagem do jogador (sai o "Marcus" dos textos).
// Uso: node tools/patches/v28-fase-c-contas.js index.html
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
const URL = 'https://wjjuuqvdttjuzsgqueuj.supabase.co';
const KEY = 'sb_publishable_4qQQ9BLb8BsTwPv9kHa1RQ_diKNRwvY'; // chave pública (feita para ficar no cliente; o que protege os dados é o RLS)

// ---------- NET: sessão e chamadas ao Supabase
rep('const SAVE = (() => {', String.raw`// ===== NET (v28.2): conta Google pelo Supabase. Auth e REST chamados direto com fetch (sem biblioteca),
// para rodar em iPhone e Android antigos. A chave abaixo é pública; o que protege os dados é o RLS do banco.
// Sessão em localStorage "qz_auth". Com o modo de teste ligado, nada vai para o servidor.
const NET = (() => {
  const URL = "${URL}", KEY = "${KEY}", LS = "qz_auth";
  let ses = null;
  try {
    ses = JSON.parse(localStorage.getItem(LS) || "null");
  } catch (e) {
  }
  const st = { profile: null, name: null, offline: 0, run: null, t0: 0, err: "" };
  function store(v) {
    ses = v;
    try {
      if (v) localStorage.setItem(LS, JSON.stringify(v));
      else localStorage.removeItem(LS);
    } catch (e) {
    }
  }
  function clearHash() {
    try {
      history.replaceState(null, "", location.pathname + location.search);
    } catch (e) {
    }
  }
  // volta do login do Google: os tokens chegam no #hash do endereço
  function fromHash() {
    const h = location.hash || "";
    if (h.indexOf("access_token=") >= 0) {
      const q = {};
      h.slice(1).split("&").forEach((p) => {
        const i = p.indexOf("=");
        if (i > 0) q[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1).replace(/\+/g, " "));
      });
      store({ at: q.access_token, rt: q.refresh_token, exp: Date.now() + (+q.expires_in || 3600) * 1e3 });
      clearHash();
    } else if (h.indexOf("error") >= 0) {
      const m = h.match(/error_description=([^&]*)/);
      st.err = m ? decodeURIComponent(m[1].replace(/\+/g, " ")) : "Não deu para entrar";
      clearHash();
    }
  }
  function hdr(auth) {
    const h = { apikey: KEY, "Content-Type": "application/json" };
    if (auth && ses) h.Authorization = "Bearer " + ses.at;
    return h;
  }
  function fail(code, status) {
    const e = new Error(code);
    e.status = status || 0;
    return e;
  }
  function refresh() {
    if (!ses || !ses.rt) return Promise.reject(fail("SEM_LOGIN", 401));
    return fetch(URL + "/auth/v1/token?grant_type=refresh_token", { method: "POST", headers: hdr(false), body: JSON.stringify({ refresh_token: ses.rt }) }).then((r) => {
      if (r.status === 400 || r.status === 401) {
        store(null);
        throw fail("SEM_LOGIN", 401);
      }
      if (!r.ok) throw fail("REDE", r.status);
      return r.json();
    }).then((j) => {
      store({ at: j.access_token, rt: j.refresh_token, exp: Date.now() + (j.expires_in || 3600) * 1e3 });
      return ses;
    });
  }
  function fresh() {
    if (!ses) return Promise.reject(fail("SEM_LOGIN", 401));
    return ses.exp - Date.now() < 6e4 ? refresh() : Promise.resolve(ses);
  }
  function call(path, opt) {
    opt = opt || {};
    return fresh().then(() => fetch(URL + path, { method: opt.method || "GET", headers: Object.assign(hdr(true), opt.headers || {}), body: opt.body != null ? JSON.stringify(opt.body) : void 0 })).then((r) => r.text().then((t) => {
      let j = null;
      try {
        j = t ? JSON.parse(t) : null;
      } catch (e) {
      }
      if (r.status === 401) throw fail("SEM_LOGIN", 401);
      if (!r.ok) throw fail(j && (j.message || j.msg || j.error) || "HTTP " + r.status, r.status);
      return j;
    }), (e) => {
      throw e && e.status ? e : fail(e && e.message === "SEM_LOGIN" ? "SEM_LOGIN" : "REDE", e && e.status);
    });
  }
  const rpc = (fn, args) => call("/rest/v1/rpc/" + fn, { method: "POST", body: args || {} });
  const one = (a) => a && a[0] || null;
  return {
    st,
    get logged() {
      return !!ses;
    },
    fromHash,
    login() {
      location.href = URL + "/auth/v1/authorize?provider=google&redirect_to=" + encodeURIComponent(location.origin + location.pathname);
    },
    logout() {
      const at = ses && ses.at;
      store(null);
      st.profile = st.name = null;
      if (at) fetch(URL + "/auth/v1/logout", { method: "POST", headers: { apikey: KEY, Authorization: "Bearer " + at } }).catch(() => {
      });
    },
    me() {
      return call("/rest/v1/profiles?select=id,name,name_changes,name_changed_at&limit=1").then((a) => {
        st.profile = one(a);
        st.name = st.profile && st.profile.name;
        st.offline = 0;
        return st.profile;
      });
    },
    claimName(n) {
      return rpc("claim_name", { new_name: n }).then((v) => {
        st.name = v;
        if (st.profile) st.profile.name = v;
        return v;
      });
    },
    getSave() {
      return call("/rest/v1/progress?select=data,ts,imported_local&limit=1").then(one);
    },
    putSave(d, ts, imported) {
      if (DEV.on || !st.profile) return Promise.resolve();
      const b = { data: d, ts: ts || Date.now(), updated_at: new Date().toISOString() };
      if (imported != null) b.imported_local = !!imported;
      return call("/rest/v1/progress?user_id=eq." + st.profile.id, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: b });
    },
    stats() {
      return call("/rest/v1/player_stats?select=*&limit=1").then(one);
    },
    board(map) {
      return rpc("get_leaderboard", { p_map: map, p_limit: 20 });
    },
    // uma partida por vez: o servidor anota a hora de início e confere o resultado no fim
    startRun(map) {
      st.run = null;
      st.t0 = performance.now();
      if (DEV.on || !ses || !st.profile) return;
      rpc("start_run", { p_map: map }).then((id) => st.run = id, () => {
      });
    },
    endRun(o) {
      const id = st.run;
      st.run = null;
      if (DEV.on || !ses || !id) return Promise.resolve(null);
      return rpc("submit_run", { p_run: id, p_wave: o.wave | 0, p_kills: o.kills | 0, p_seconds: Math.round((performance.now() - st.t0) / 1e3), p_shots: o.shots | 0, p_hits: o.hits | 0, p_bosses: o.bosses | 0, p_won: !!o.won }).catch(() => null);
    },
    deleteAccount() {
      return fresh().then(() => fetch(URL + "/functions/v1/delete-account", { method: "POST", headers: hdr(true) })).then((r) => {
        if (!r.ok) throw fail("FALHOU", r.status);
        store(null);
        st.profile = st.name = null;
      });
    }
  };
})();
NET.fromHash();
const SAVE = (() => {`);

// ---------- SAVE: nuvem pelo Supabase (troca o antigo "claude.use"), com adotar, mesclar e zerar
rep(`  let d = { best: {}, unlockAll: false, coins: 0, kills: 0, bestWave: 0, matches: 0, xp: 0, level: 1, up: {}, skin: "padrao", skins: ["padrao"], ts: 0 };
  try {`, `  let d = { best: {}, unlockAll: false, coins: 0, kills: 0, bestWave: 0, matches: 0, xp: 0, level: 1, up: {}, skin: "padrao", skins: ["padrao"], ts: 0 };
  const DEF = JSON.stringify(d);
  try {`);
{
  const a = s.indexOf(nl('    cloud() {\n      return __async(this, null, function* () {\n        try {\n          if (!window.claude || !claude.use) return;'));
  const b = s.indexOf(nl('  return api;\n})();\nsetTimeout(() => SAVE.cloud(), 0);'), a);
  if (a < 0 || b < 0) throw new Error('cloud markers');
  s = s.slice(0, a) + nl(`    // liga o envio automático para a conta (cada save sobe 1,5 s depois)
    link() {
      ref = { set: () => NET.putSave(d, d.ts || Date.now()) };
      status = "nuvem";
    },
    unlink() {
      ref = null;
      status = "local";
    },
    // troca o save inteiro (mesmo objeto, para quem guardou referência a SAVE.d)
    adopt(o) {
      for (const k of Object.keys(d)) if (!(k in o)) delete d[k];
      Object.assign(d, JSON.parse(JSON.stringify(o)));
      try {
        migrateSave(d);
      } catch (e) {
      }
      try {
        LOOK.sanitize(d);
        LOOK.apply();
      } catch (e) {
      }
      try {
        localStorage.setItem("qz_save", JSON.stringify(d));
      } catch (e) {
      }
      try {
        TITLE.refresh();
        HUDL.apply();
      } catch (e) {
      }
    },
    reset() {
      api.adopt(JSON.parse(DEF));
    },
    backup() {
      try {
        localStorage.setItem("qz_save_bak", JSON.stringify(d));
      } catch (e) {
      }
    }
  };
`) + nl('  return api;\n})();') + s.slice(b + nl('  return api;\n})();\nsetTimeout(() => SAVE.cloud(), 0);').length);
}

// ---------- telas: login, nome, ranking; perfil com conta
rep('<div id="profile" class="screen shadeFull hidden">', `<div id="login" class="screen shadeFull hidden">
  <div class="panel acPanel">
    <h3 class="yo">QUEBRADA Z</h3>
    <p>Entre com sua conta Google. Seu personagem, seu progresso e seu lugar no ranking ficam salvos nela, no celular, no PC e no iPhone.</p>
    <button class="btn yo" id="bLogin">ENTRAR COM GOOGLE</button>
    <p class="segNote" id="loginMsg"></p>
    <button class="btn alt hidden" id="bOffline">JOGAR OFFLINE</button>
  </div>
</div>
<div id="nameScr" class="screen shadeFull hidden">
  <div class="panel acPanel">
    <h3 class="yo">NOME DO PERSONAGEM</h3>
    <p id="nameHint">De 3 a 16 caracteres. É o nome que aparece no ranking.</p>
    <div class="row codeRow"><input id="nameIn" type="text" maxlength="16" autocomplete="off" spellcheck="false" aria-label="Nome do personagem"><button class="btn yo" id="bNameOk">CONFIRMAR</button></div>
    <p class="segNote" id="nameMsg"></p>
    <button class="btn alt hidden" id="bNameBack">VOLTAR</button>
  </div>
</div>
<div id="rankScr" class="screen shadeFull hidden">
  <div class="selHead"><div class="h2 yo"><small id="rkCamp">HELL DE JANEIRO</small>RANKING</div><button class="btn alt yo" id="bRankBack">VOLTAR</button></div>
  <div class="rkTabs" id="rkTabs"></div>
  <div class="panel wide rkBox"><div id="rkList" class="rkList"></div></div>
</div>
<div id="profile" class="screen shadeFull hidden">`);
rep('<div class="pfTx"><b class="yo">MARCUS</b><p>Sobrevivente da quebrada</p>', '<div class="pfTx"><b class="yo" id="pfName">VOCÊ</b><p>Sobrevivente da quebrada</p>');
rep(`    <div id="pfMaps"></div>
    <div class="row" style="justify-content:center;margin-top:10px">`, `    <div id="pfMaps"></div>
    <div class="row acRow" id="pfAcct"><button class="btn alt" id="bPfName">TROCAR NOME</button><button class="btn alt" id="bLogout">SAIR DA CONTA</button><button class="btn alt acDel" id="bDelAcc">EXCLUIR MINHA CONTA</button></div>
    <p class="segNote" id="pfAcctMsg"></p>
    <div class="row" style="justify-content:center;margin-top:10px">`);
rep('<div class="tmTx"><b class="yo">MARCUS</b>', '<div class="tmTx"><b class="yo" id="tName">VOCÊ</b>');
rep('<button class="btn alt yo" id="bProfile">PERFIL</button>', '<button class="btn alt yo" id="bProfile">PERFIL</button><button class="btn alt yo" id="bRank">RANKING</button>');
rep('    for (const s of ["title", "campaign", "select", "how", "pause", "over", "settings", "roulette", "profile", "mshop", "sim", "creator"]) $(s).classList.toggle("hidden", s !== id);',
  '    for (const s of ["title", "campaign", "select", "how", "pause", "over", "settings", "roulette", "profile", "mshop", "sim", "creator", "login", "nameScr", "rankScr"]) $(s).classList.toggle("hidden", s !== id);');
{
  const i = s.indexOf('</style>');
  s = s.slice(0, i) + nl(`/* v28: conta, nome e ranking */
.acPanel{text-align:center;max-width:440px}
.acPanel p{margin:8px 0}
.acRow{justify-content:center;gap:6px;flex-wrap:wrap;margin-top:10px}
.acDel{color:#ff8a8a!important}
.rkTabs{display:flex;gap:6px;width:min(980px,100%);overflow-x:auto;padding:4px 2px;scrollbar-width:none}
.rkTabs button{flex:0 0 auto;font-family:var(--fy);padding:6px 10px;border-radius:8px;border:2px solid var(--line);background:var(--panel);color:#fff}
.rkTabs button.sel{border-color:var(--red)}
.rkBox{width:min(980px,100%);max-height:60vh;overflow:auto}
.rkList .rkRow{display:grid;grid-template-columns:44px 1fr 70px 70px 64px;gap:6px;padding:6px 8px;border-bottom:1px solid #2a2638;align-items:center}
.rkList .rkRow.hd{color:var(--mute);font-size:12px}
.rkList .rkRow.me{background:rgba(125,255,106,.12)}
.rkList .rkRow b{color:var(--gold)}
`) + s.slice(i);
}

// ---------- fluxo: entrar, escolher nome, sincronizar, ranking, perfil
rep('let helpBack = "title";', String.raw`// ===== v28.2: conta Google, nome, save na nuvem e ranking =====
const ACCT_ERR = {
  NOME_EM_USO: "Esse nome já tem dono. Tenta outro.",
  NOME_PROIBIDO: "Esse nome não pode. Tenta outro.",
  NOME_INVALIDO: "Use de 3 a 16 letras, números, espaço, ponto, traço ou _.",
  TROCA_EM_ESPERA: "Você já trocou de nome. A próxima troca libera 30 dias depois da última.",
  SEM_LOGIN: "Sua sessão acabou. Entre de novo.",
  REDE: "Sem conexão com o servidor. Tenta de novo daqui a pouco."
};
const acctErr = (e) => ACCT_ERR[e && e.message] || ACCT_ERR[(e && e.message || "").replace(/^.*?([A-Z_]{6,}).*$/, "$1")] || "Deu ruim: " + (e && e.message || "erro");
function acctUI() {
  const n = (NET.st.name || "VOCÊ").toUpperCase();
  $("tName").textContent = n;
  $("pfName").textContent = n;
  $("bRank").classList.toggle("hidden", !NET.logged);
  $("pfAcct").classList.toggle("hidden", !NET.logged || !NET.st.profile);
}
function acctLoginScreen(msg, offline) {
  $("loginMsg").textContent = msg || "";
  $("bLogin").classList.remove("hidden");
  $("bOffline").classList.toggle("hidden", !offline);
  UI.show("login");
}
// progresso deste aparelho que ainda não é de nenhuma conta?
function acctLocalProgress(d) {
  return (d.matches | 0) > 0 || (d.level | 0) > 1 || !!d.created;
}
// junta o save do aparelho com o da conta: o mais novo vale, mas nada de progresso se perde
function acctMerge(local, remote, rts) {
  const L = JSON.parse(JSON.stringify(local)), Rm = JSON.parse(JSON.stringify(remote)), localNewer = (L.ts || 0) > (rts || Rm.ts || 0), A = localNewer ? L : Rm, B = localNewer ? Rm : L;
  for (const k of ["won", "legacy"]) A[k] = Object.assign({}, B[k] || {}, A[k] || {});
  A.best = A.best || {};
  for (const k in B.best || {}) A.best[k] = Math.max(A.best[k] || 0, B.best[k] || 0);
  for (const k of ["inv", "skins"]) if (Array.isArray(B[k])) A[k] = Array.from(new Set((A[k] || []).concat(B[k])));
  if ((B.level | 0) > (A.level | 0) || B.level === A.level && (B.xp | 0) > (A.xp | 0)) {
    A.level = B.level;
    A.xp = B.xp;
  }
  for (const k of ["kills", "matches", "bestWave", "wins"]) A[k] = Math.max(A[k] | 0, B[k] | 0);
  return A;
}
function acctSync() {
  const uid = NET.st.profile.id, d = SAVE.d;
  return NET.getSave().then((r) => {
    const remote = r && r.data && Object.keys(r.data).length ? r.data : null;
    let imported = null;
    if (remote && d.owner === uid) SAVE.adopt(acctMerge(d, remote, r.ts));
    else if (remote) {
      SAVE.backup();
      SAVE.adopt(remote);
    } else if (d.owner !== uid && acctLocalProgress(d) && !(r && r.imported_local)) {
      imported = window.confirm("Achamos progresso salvo neste aparelho (nível " + (d.level || 1) + ", " + (d.matches || 0) + " partidas). Levar para a sua conta? Isso só é perguntado uma vez.");
      if (!imported) {
        SAVE.backup();
        SAVE.reset();
      }
    } else if (d.owner !== uid) {
      SAVE.backup();
      SAVE.reset();
    }
    SAVE.d.owner = uid;
    SAVE.link();
    SAVE.save();
    return NET.putSave(SAVE.d, SAVE.d.ts, imported == null ? void 0 : true).catch(() => {
    });
  });
}
function acctHome() {
  acctUI();
  UI.show("title");
  if (!SAVE.d.created) LOOK.open("create", "title");
}
function acctBoot() {
  if (DEV.on) return acctHome();
  if (NET.st.err) {
    const m = NET.st.err;
    NET.st.err = "";
    return acctLoginScreen("Não deu para entrar: " + m);
  }
  if (!NET.logged) return acctLoginScreen("");
  acctLoginScreen("Conectando...");
  $("bLogin").classList.add("hidden");
  NET.me().then((p) => {
    if (!p) throw new Error("SEM_LOGIN");
    if (!p.name) return acctName("first");
    return acctSync().then(acctHome);
  }).catch((e) => {
    if (e && e.message === "SEM_LOGIN") {
      NET.logout();
      acctLoginScreen(ACCT_ERR.SEM_LOGIN);
    } else {
      NET.st.offline = 1;
      acctLoginScreen("Sem conexão. Dá para jogar offline; o progresso sobe para a conta quando a conexão voltar.", true);
    }
  });
}
let nameBack = null;
function acctName(mode) {
  nameBack = mode === "change" ? "profile" : null;
  $("nameIn").value = mode === "change" ? NET.st.name || "" : "";
  $("nameMsg").textContent = "";
  $("nameHint").textContent = mode === "change" ? "A primeira troca é livre; depois, uma a cada 30 dias." : "De 3 a 16 caracteres. É o nome que aparece no ranking.";
  $("bNameBack").classList.toggle("hidden", !nameBack);
  UI.show("nameScr");
  setTimeout(() => $("nameIn").focus(), 50);
}
$("bLogin").onclick = () => {
  $("loginMsg").textContent = "Abrindo o Google...";
  NET.login();
};
$("bOffline").onclick = () => {
  SAVE.unlink();
  acctHome();
};
$("nameIn").addEventListener("keydown", (e) => {
  e.stopPropagation();
  if (e.key === "Enter") $("bNameOk").click();
});
$("bNameOk").onclick = () => {
  const b = $("bNameOk"), v = ($("nameIn").value || "").trim();
  if (b.disabled) return;
  b.disabled = true;
  $("nameMsg").textContent = "Conferindo...";
  NET.claimName(v).then(() => {
    b.disabled = false;
    acctUI();
    if (nameBack) return showProfile();
    return acctSync().then(acctHome);
  }).catch((e) => {
    b.disabled = false;
    $("nameMsg").textContent = acctErr(e);
  });
};
$("bNameBack").onclick = () => showProfile();
$("bPfName").onclick = () => acctName("change");
$("bLogout").onclick = () => {
  if (!window.confirm("Sair da conta neste aparelho?")) return;
  SAVE.save();
  SAVE.unlink();
  NET.logout();
  acctUI();
  acctLoginScreen("Você saiu da conta.");
};
$("bDelAcc").onclick = () => {
  if (!window.confirm("Excluir a conta apaga o personagem, o progresso, as estatísticas e o seu lugar no ranking. Não dá para desfazer. Continuar?")) return;
  if (!window.confirm("Tem certeza? Essa é a última confirmação.")) return;
  $("pfAcctMsg").textContent = "Excluindo...";
  NET.deleteAccount().then(() => {
    SAVE.unlink();
    SAVE.reset();
    SAVE.save();
    acctUI();
    acctLoginScreen("Conta excluída.");
  }).catch((e) => $("pfAcctMsg").textContent = acctErr(e));
};
addEventListener("online", () => {
  if (NET.logged && NET.st.offline && !DEV.on) NET.me().then((p) => p && p.name ? acctSync().then(acctUI) : null).catch(() => {
  });
});
// ranking por mapa da campanha
let rankMap = null;
function rankRow(r) {
  const t = r.best_seconds | 0;
  return '<div class="rkRow' + (r.me ? " me" : "") + '"><b>' + r.pos + "º</b><span>" + String(r.name).replace(/[<>&]/g, "") + "</span><span>onda " + r.best_wave + "</span><span>" + r.best_kills + " abates</span><span>" + Math.floor(t / 60) + ":" + String(t % 60).padStart(2, "0") + "</span></div>";
}
function rankLoad(mi) {
  rankMap = mi;
  [...$("rkTabs").children].forEach((b) => b.classList.toggle("sel", +b.dataset.mi === mi));
  const box = $("rkList");
  box.innerHTML = "<p>Carregando...</p>";
  NET.board(MAPS[mi].id).then((a) => {
    if (rankMap !== mi) return;
    box.innerHTML = !a || !a.length ? "<p>Ninguém no ranking deste mapa ainda. Seja o primeiro.</p>" : '<div class="rkRow hd"><span>#</span><span>NOME</span><span>ONDA</span><span>ABATES</span><span>TEMPO</span></div>' + a.map(rankRow).join("");
  }).catch((e) => box.innerHTML = "<p>" + acctErr(e) + "</p>");
}
function showRank() {
  const tabs = $("rkTabs"), ord = campMaps(curCamp);
  $("rkCamp").textContent = (CAMPAIGNS[curCamp] || CAMPAIGNS[0]).name;
  tabs.innerHTML = "";
  ord.forEach((i) => {
    const b = document.createElement("button");
    b.textContent = MAPS[i].name;
    b.dataset.mi = i;
    b.onclick = () => rankLoad(i);
    tabs.append(b);
  });
  UI.show("rankScr");
  rankLoad(ord.indexOf(S.mi) >= 0 ? S.mi : ord[0]);
}
$("bRank").onclick = () => {
  SFX.swap && SFX.swap();
  showRank();
};
$("bRankBack").onclick = () => UI.show("title");
let helpBack = "title";`);

// ---------- partida: abre no servidor ao começar, envia o resultado no fim
rep(`function startGame() {
  labEnd();
  SFX.init();`, `function startGame() {
  labEnd();
  try {
    NET.startRun(MAPS[S.mi].id);
  } catch (e) {
  }
  SFX.init();`);
rep(`    D.bestWave = Math.max(D.bestWave, S.round);
    D.xp += xp;`, `    D.bestWave = Math.max(D.bestWave, S.round);
    if (!S.lab) NET.endRun({ wave: S.round, kills: S.stats.kills, shots: S.stats.shots, hits: S.stats.hitShots, bosses: S.stats.boss || 0, won: win });
    D.xp += xp;`);
// perfil mostra estatísticas da conta quando houver
rep(`  const st = [["partidas", D.matches], ["mortos", D.kills], ["recorde", D.bestWave], ["moedas", D.coins]];
  $("pfStats").innerHTML = st.map(([l, v]) => \`<div class="stat"><div class="v num">\${v}</div><div class="l">\${l}</div></div>\`).join("");`,
`  const st = [["partidas", D.matches], ["mortos", D.kills], ["recorde", D.bestWave], ["moedas", D.coins]];
  const paint = (a) => $("pfStats").innerHTML = a.map(([l, v]) => \`<div class="stat"><div class="v num">\${v}</div><div class="l">\${l}</div></div>\`).join("");
  paint(st);
  acctUI();
  $("pfAcctMsg").textContent = "";
  if (NET.logged && NET.st.profile && !DEV.on) NET.stats().then((x) => {
    if (!x) return;
    const acc = x.shots > 0 ? Math.round(x.hits / x.shots * 100) + "%" : "\\u2014";
    paint([["partidas", x.matches], ["vitórias", x.wins], ["abates", x.kills], ["mortes", x.deaths], ["chefes", x.bosses], ["recorde", x.best_wave], ["precisão", acc], ["tempo", Math.round(x.play_seconds / 60) + " min"], ["moedas", D.coins]]);
  }).catch(() => {
  });`);

// ---------- entrada do jogo passa pela conta
rep(`    LOOK.apply();
    if (!SAVE.d.created) LOOK.open("create", "title");
  } catch (e) {
    console.warn("look", e);
  }`, `    LOOK.apply();
  } catch (e) {
    console.warn("look", e);
  }
  acctBoot();`);

// ---------- sai o "Marcus": o protagonista é o personagem do jogador
rep('Quando o Marcus cai, a partida acaba.', 'Quando seu personagem cai, a partida acaba.');
rep('(o anel fica laranja): o Marcus corre.', '(o anel fica laranja): o personagem corre.');
rep('`Marcus caiu na ${m.name}', '`${NET.st.name || "Você"} caiu na ${m.name}');
rep('Habilidades do Marcus.', 'Suas habilidades.');
rep('"CRIE SEU MARCUS"', '"CRIE SEU PERSONAGEM"');
rep('"Segura a adega, Marcus!"', '"Segura a adega, cria!"');
rep('const CHARS = [{ n: 3, name: "MARCUS",', 'const CHARS = [{ n: 3, name: "SOBREVIVENTE",');
s = s.replace(/const QZ_VERSION='28\.1';/, "const QZ_VERSION='28.2';").replace(/const QZ_NOTE='[^']*';/, "const QZ_NOTE='Conta Google: seu personagem com nome proprio, progresso salvo na conta e ranking por mapa';");
fs.writeFileSync(F, s);
console.log('ok');
