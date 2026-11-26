// =====================================================================
//  v29.11 CO-OP ONLINE: sala (lobby) com código, convite de amigo, partida com jogadores reais (sem bots).
//  Rede: o anfitrião (vaga 0) manda nos zumbis, nas ondas e nas barricadas; cada aparelho manda no próprio
//  personagem (anda, atira, cai, compra, pega grana). Tiros de quem não é anfitrião viram "acertei o zumbi N"
//  e o anfitrião aplica. Conexão direta entre aparelhos (WebRTC DataChannel); se a rede não deixar, a mesma
//  conversa passa pelo Supabase Realtime (broadcast num tópico secreto da sala) com menos mensagens por segundo.
//  Sala, convites e o aperto de mão da conexão passam pelo banco (supabase/migrations/v29_11_coop_online.sql).
// =====================================================================
const ONL = (function () {
  const T = {
    poll: 1000, pollPlay: 4000, ping: 15000, pingFast: 5000,
    snapHz: 15, snapHzRelay: 8, stateHz: 15, stateHzRelay: 8,
    dcWait: 9000, lostWarn: 5, lostEnd: 25,
    ice: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }, { urls: "stun:stun.cloudflare.com:3478" }]
  };
  // frases rápidas (balão em cima do personagem, na sala e na partida)
  const SAY = ["BORA!", "ESPERA AÍ", "ME AJUDA!", "VALEU!", "SEGURA A JANELA", "TÔ SEM BALA"];
  const COLS = ["#ffd84a", "#7ad8ff", "#ff8ad0"];
  const st = {
    L: null, id: null, me: -1, gen: 0, busy: 0, pollT: 0, pingT: 0, invites: [], seenInv: {}, open: false,
    match: 0, role: null, links: {}, rt: null, said: {}, lastSnapAt: 0, lostT: 0, warned: 0, started: {}, err: ""
  };
  const isHost = () => st.me === 0;
  const live = () => !!st.match && S.mode !== "menu";
  const guest = () => live() && st.role === "guest";
  const host = () => live() && st.role === "host";
  const esc = (t) => String(t == null ? "" : t).replace(/[<>&"]/g, "");
  const err = (e) => { try { return acctErr(e); } catch (x) { return "Sem conexão. Tenta de novo."; } };
  const now = () => performance.now();

  // ================================================================ transporte
  // ---------- Realtime (reserva + avisos instantâneos da sala) ----------
  function RT(secret) {
    const o = { ws: null, ok: 0, ref: 1, topic: "realtime:qz-" + secret, hb: 0, q: [], sent: [], dead: 0, onmsg: null };
    o.open = () => {
      if (o.dead) return;
      NET.token().then((tok) => {
        if (o.dead) return;
        const u = NET.URL.replace(/^http/, "ws") + "/realtime/v1/websocket?apikey=" + encodeURIComponent(NET.KEY) + "&vsn=1.0.0";
        let ws;
        try { ws = new WebSocket(u); } catch (e) { return; }
        o.ws = ws;
        ws.onopen = () => {
          ws.send(JSON.stringify({ topic: o.topic, event: "phx_join", ref: String(o.ref++), join_ref: "1",
            payload: { config: { broadcast: { self: false, ack: false }, presence: { key: "" }, private: false }, access_token: tok } }));
          clearInterval(o.hb);
          o.hb = setInterval(() => { try { ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: String(o.ref++) })); } catch (e) {} }, 25000);
        };
        ws.onmessage = (ev) => {
          let m;
          try { m = JSON.parse(ev.data); } catch (e) { return; }
          if (m.topic !== o.topic) return;
          if (m.event === "phx_reply" && m.payload && m.payload.status === "ok" && !o.ok) {
            o.ok = 1;
            const q = o.q; o.q = [];
            q.forEach(o.send);
          } else if (m.event === "broadcast" && m.payload && o.onmsg) o.onmsg(m.payload.payload);
        };
        ws.onclose = () => {
          o.ok = 0;
          clearInterval(o.hb);
          if (!o.dead) setTimeout(o.open, 3000);
        };
        ws.onerror = () => {};
      }, () => {});
    };
    // até ~20 mensagens por segundo por aparelho (o plano grátis do Supabase conta cada envio e cada recebimento)
    o.send = (msg) => {
      if (!o.ok || !o.ws || o.ws.readyState !== 1) { if (o.q.length < 30 && msg.k !== "S" && msg.k !== "P") o.q.push(msg); return false; }
      const t = now();
      while (o.sent.length && t - o.sent[0] > 1000) o.sent.shift();
      if (o.sent.length >= 20 && (msg.k === "S" || msg.k === "P")) return false;
      o.sent.push(t);
      try { o.ws.send(JSON.stringify({ topic: o.topic, event: "broadcast", ref: String(o.ref++), join_ref: "1", payload: { type: "broadcast", event: "m", payload: msg } })); } catch (e) { return false; }
      return true;
    };
    o.close = () => { o.dead = 1; clearInterval(o.hb); try { o.ws && o.ws.close(); } catch (e) {} };
    o.open();
    return o;
  }

  // ---------- conexão direta com um parceiro (o anfitrião chama, o convidado atende) ----------
  function Link(slot) {
    const l = { slot, pc: null, u: null, r: null, try: 0, t0: now(), rtt: 0, pingAt: 0, lastIn: now(), via: "..." };
    l.ok = () => !!(l.r && l.r.readyState === "open");
    l.close = () => { try { l.pc && l.pc.close(); } catch (e) {} l.pc = l.u = l.r = null; };
    function wire(ch) {
      ch.onmessage = (e) => { l.lastIn = now(); let m; try { m = JSON.parse(e.data); } catch (x) { return; } recv(m, slot); };
      ch.onopen = () => { if (ch.label === "r") { l.via = "direto"; paint(); } };
    }
    function waitIce(pc) {
      return new Promise((res) => {
        if (pc.iceGatheringState === "complete") return res();
        const t = setTimeout(res, 2500);
        pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete") { clearTimeout(t); res(); } });
      });
    }
    function mk() {
      l.close();
      let pc;
      try { pc = new RTCPeerConnection({ iceServers: T.ice }); } catch (e) { l.via = "servidor"; return null; }
      l.pc = pc;
      pc.ondatachannel = (e) => { if (e.channel.label === "u") l.u = e.channel; else l.r = e.channel; wire(e.channel); };
      pc.onconnectionstatechange = () => { if (pc.connectionState === "failed" && l.pc === pc) { l.via = "servidor"; paint(); } };
      return pc;
    }
    l.call = () => {
      const pc = mk();
      if (!pc) return;
      l.try++;
      l.t0 = now();
      l.u = pc.createDataChannel("u", { ordered: false, maxRetransmits: 0 });
      l.r = pc.createDataChannel("r", { ordered: true });
      wire(l.u); wire(l.r);
      const n = l.try;
      pc.createOffer().then((o) => pc.setLocalDescription(o)).then(() => waitIce(pc)).then(() => {
        if (l.pc !== pc) return;
        signal(slot, "offer", JSON.stringify({ n, sdp: pc.localDescription.sdp }));
      }).catch(() => { l.via = "servidor"; });
    };
    l.answer = (b) => {
      const pc = mk();
      if (!pc) return;
      l.t0 = now();
      pc.setRemoteDescription({ type: "offer", sdp: b.sdp }).then(() => pc.createAnswer()).then((a) => pc.setLocalDescription(a)).then(() => waitIce(pc)).then(() => {
        if (l.pc !== pc) return;
        signal(slot, "answer", JSON.stringify({ n: b.n, sdp: pc.localDescription.sdp }));
      }).catch(() => { l.via = "servidor"; });
    };
    l.got = (b) => {
      if (l.pc && b.n === l.try && l.pc.signalingState === "have-local-offer") l.pc.setRemoteDescription({ type: "answer", sdp: b.sdp }).catch(() => {});
    };
    l.send = (msg, unrel) => {
      const ch = unrel && l.u && l.u.readyState === "open" ? l.u : l.r;
      if (ch && ch.readyState === "open") {
        try { ch.send(JSON.stringify(msg)); return true; } catch (e) {}
      }
      // reserva: pelo Realtime, marcado com destino
      if (st.rt) { msg.to = slot; msg.fr = st.me; return st.rt.send(msg); }
      return false;
    };
    return l;
  }
  function signal(to, kind, body) {
    NET.rpc("lobby_signal", { p_lobby: st.id, p_to: to, p_kind: kind, p_body: body }).catch(() => {});
  }
  function onSignals(list) {
    for (const s of list || []) {
      let b = null;
      try { b = JSON.parse(s.body); } catch (e) { continue; }
      if (s.kind === "offer" && !isHost() && s.from === 0) link(0).answer(b);
      else if (s.kind === "answer" && isHost()) { const l = st.links[s.from]; if (l) l.got(b); }
    }
  }
  function link(slot) {
    return st.links[slot] || (st.links[slot] = Link(slot));
  }
  // o anfitrião abre conexão com cada convidado; se não abrir em ~9 s tenta de novo (até 3 vezes)
  function keepLinks() {
    if (!st.L) return;
    const slots = st.L.members.map((m) => m.slot).filter((s) => s !== st.me);
    for (const k in st.links) if (!slots.includes(+k)) { st.links[k].close(); delete st.links[k]; }
    if (!isHost()) { if (slots.includes(0)) link(0); return; }
    for (const s of slots) {
      const l = link(s);
      if (!l.pc && l.try === 0) l.call();
      else if (!l.ok() && l.try < 3 && now() - l.t0 > T.dcWait) l.call();
      else if (!l.ok() && l.try >= 3) l.via = "servidor";
    }
  }
  // manda pra um parceiro (ou pra todos com to = -1). O convidado só fala com o anfitrião; o anfitrião repassa.
  function send(to, msg, unrel) {
    if (to === -1) {
      if (isHost()) { for (const k in st.links) st.links[k].send(Object.assign({}, msg), unrel); }
      else link(0).send(Object.assign({}, msg, { fw: -1 }), unrel);
      return;
    }
    if (isHost()) { const l = st.links[to]; if (l) l.send(msg, unrel); }
    else link(0).send(to === 0 ? msg : Object.assign({}, msg, { fw: to }), unrel);
  }
  function viaRelay() {
    for (const k in st.links) if (!st.links[k].ok()) return true;
    return false;
  }
  function onRT(m) {
    if (!m || m.to !== st.me) return;
    if (m.fr == null || m.fr === st.me) return;
    const l = st.links[m.fr] || (isHost() ? null : link(0));
    if (l) l.lastIn = now();
    recv(m, m.fr);
  }

  // ================================================================ mensagens
  function recv(m, from) {
    // repasse do anfitrião (convidado -> outro convidado)
    if (isHost() && m.fw != null) {
      const fw = m.fw; delete m.fw;
      if (fw === -1) { for (const k in st.links) if (+k !== from) st.links[k].send(Object.assign({}, m, { src: from }), m.k === "P"); }
      else if (st.links[fw]) st.links[fw].send(Object.assign({}, m, { src: from }), m.k === "P");
      if (fw !== -1) return;
    }
    const who = m.src != null ? m.src : from;
    switch (m.k) {
      case "ping": send(from, { k: "pong", d: m.d }); break;
      case "pong": { const l = st.links[from]; if (l) l.rtt = Math.round(now() - m.d); paint(); break; }
      case "say": showSay(who, m.d); break;
      case "rdy": pollSoon(); break;
      case "go": if (!isHost()) goMatch(m.d); break;
      case "S": if (guest()) applySnap(m.d); break;
      case "P": if (host()) applyPeer(from, m.d); break;
      case "E": for (const e of m.d || []) onEv(e, who); break;
    }
  }

  // ================================================================ sala
  function pollSoon() { st.pollT = Math.min(st.pollT, now() + 120); }
  function enter(L, quiet) {
    st.id = L.id;
    st.code = L.code;
    st.L = null;
    if (!quiet) UI.show("lobbyScr");
    st.open = true;
    refresh(true);
  }
  function refresh(force) {
    if (!st.id || st.busy) return Promise.resolve();
    st.busy = 1;
    return NET.rpc("lobby_state", { p_lobby: st.id }).then((L) => {
      st.busy = 0;
      if (!L || L.state === "closed") {
        const was = !!st.L;
        reset();
        if (S.mode === "menu" && $("lobbyScr") && !$("lobbyScr").classList.contains("hidden")) UI.show("title");
        if (was) UI.toast && toastMenu(L && L.kicked ? "O anfitrião te tirou da sala." : "A sala fechou.");
        return;
      }
      const prevSecret = st.L && st.L.secret;
      st.L = L;
      st.me = L.me;
      if (!st.rt || prevSecret !== L.secret) { if (st.rt) st.rt.close(); st.rt = RT(L.secret); st.rt.onmsg = onRT; }
      onSignals(L.signals);
      keepLinks();
      if (L.state === "playing" && L.gen > (st.started[st.id] || 0) && !isHost()) goMatch({ seed: L.seed, map: L.map, camp: L.camp, gen: L.gen });
      paint();
    }, (e) => {
      st.busy = 0;
      st.err = err(e);
      paint();
    });
  }
  function reset() {
    for (const k in st.links) st.links[k].close();
    st.links = {};
    if (st.rt) st.rt.close();
    st.rt = null;
    st.L = null; st.id = null; st.me = -1; st.open = false; st.match = 0; st.role = null;
  }
  function create() {
    if (!NET.logged) return toastMenu("Entre com sua conta para jogar online.");
    const m = MAPS[S.mi] || MAPS[0];
    return NET.rpc("lobby_create", { p_map: m.id, p_camp: curCamp }).then((r) => enter(r), (e) => toastMenu(err(e)));
  }
  function join(code) {
    code = String(code || "").trim().toUpperCase();
    if (code.length < 5) { lobbyMsg("O código tem 5 letras."); return; }
    NET.rpc("lobby_join", { p_code: code }).then((r) => { SFX.swap && SFX.swap(); enter(r); }, (e) => lobbyMsg(err(e)));
  }
  function leave() {
    if (st.id) NET.rpc("lobby_leave", { p_lobby: st.id }).catch(() => {});
    send(-1, { k: "E", d: [["bye"]] });
    reset();
  }
  function invite(name) {
    const go = () => NET.rpc("lobby_invite", { p_lobby: st.id, p_name: name }).then(() => {
      lobbyMsg("Chamado enviado pra " + name + ". Assim que aceitar, aparece aqui.");
      SFX.swap && SFX.swap();
    }, (e) => lobbyMsg(err(e)));
    if (st.id) return go();
    const m = MAPS[S.mi] || MAPS[0];
    return NET.rpc("lobby_create", { p_map: m.id, p_camp: curCamp }).then((r) => { enter(r); return go(); }, (e) => toastMenu(err(e)));
  }
  function answer(inv, yes) {
    st.seenInv[inv.id] = 1;
    banner();
    NET.rpc("lobby_answer", { p_invite: inv.id, p_accept: !!yes }).then((r) => {
      if (yes && r && r.id) { SFX.swap && SFX.swap(); if (S.mode !== "menu") return; enter(r); }
    }, (e) => toastMenu(err(e)));
  }
  function setReady(v) {
    if (!st.id) return;
    NET.rpc("lobby_ready", { p_lobby: st.id, p_ready: v }).then(() => { send(0, { k: "rdy" }); refresh(); }, (e) => lobbyMsg(err(e)));
  }
  function setMap(mi, camp) {
    if (!isHost() || !st.id) return;
    const m = MAPS[mi];
    if (!m) return;
    NET.rpc("lobby_update", { p_lobby: st.id, p_map: m.id, p_camp: camp }).then(() => { send(-1, { k: "rdy" }); refresh(); }, (e) => lobbyMsg(err(e)));
  }
  function start() {
    if (!isHost() || !st.L) return;
    const seed = (Math.random() * 2147483646 | 0) + 1;
    $("lbGo").disabled = true;
    NET.rpc("lobby_start", { p_lobby: st.id, p_seed: seed }).then((gen) => {
      const d = { seed, map: st.L.map, camp: st.L.camp, gen };
      send(-1, { k: "go", d });
      goMatch(d);
    }, (e) => { $("lbGo").disabled = false; lobbyMsg(err(e)); });
  }
  // contagem da rádio e roleta do horário (a mesma semente em todos os aparelhos)
  function goMatch(d) {
    if (!d || (st.started[st.id] || 0) >= d.gen) return;
    st.started[st.id] = d.gen;
    const mi = MAPS.findIndex((m) => m.id === d.map);
    if (mi < 0) return toastMenu("Esse mapa não existe nesta versão do jogo. Atualiza o jogo.");
    st.seed = d.seed;
    st.role = isHost() ? "host" : "guest";
    st.members = (st.L ? st.L.members : []).slice();
    curCamp = d.camp | 0;
    S.mi = mi;
    countdown(() => {
      st.match = d.gen;
      st.nid = 0; st.zq = []; st.zmap = {}; st.votes = {}; st.ev = {}; st.snapT = 0; st.stateT = 0; st.lastSnapAt = now(); st.lostT = 0; st.warned = 0; st.shot0 = 0; st.over = 0;
      try { SFX.init(); SFX.resume(); } catch (e) {}
      roulette();
    });
  }
  function countdown(done) {
    const ov = $("lbCount");
    const say = ["A RÁDIO TÁ CHAMANDO", "A HORDA TÁ SUBINDO O MORRO", "SEGURA A QUEBRADA"];
    let n = 3;
    ov.classList.remove("hidden");
    const tick = () => {
      if (n <= 0) { ov.classList.add("hidden"); return done(); }
      ov.innerHTML = '<b class="yo">' + n + "</b><small>" + say[3 - n] + "</small>";
      try { SFX.swap && SFX.swap(); } catch (e) {}
      n--;
      setTimeout(tick, 800);
    };
    tick();
  }

  // ---------- presença + convites (no menu) ----------
  function ping(state) {
    if (!NET.logged || DEV.on) return;
    NET.rpc("online_ping", { p_state: state }).then((r) => {
      st.invites = (r && r.invites || []).filter((i) => !st.seenInv[i.id]);
      banner();
      // voltou pro jogo e ainda está numa sala aberta (fechou a aba sem querer): reaparece nela
      if (r && r.lobby && !st.id && r.lobby.state === "open" && S.mode === "menu") { st.id = r.lobby.id; refresh(true); }
    }, () => {});
  }
  function banner() {
    const b = $("onInv");
    if (!b) return;
    const i = st.invites.find((x) => !st.seenInv[x.id]);
    if (!i || S.mode !== "menu" || st.id) { b.classList.add("hidden"); return; }
    const m = MAPS.find((q) => q.id === i.map);
    b.innerHTML = '<i class="onRadio" aria-hidden="true"></i><div><small>RÁDIO DA QUEBRADA</small><b>' + esc(i.from) + " tá te chamando</b><span>pra segurar " + esc(m ? m.name : i.map) + " · " + i.n + "/" + i.max + ' na sala</span></div><button class="btn yo" data-a="y">ENTRAR</button><button class="btn alt yo" data-a="n">AGORA NÃO</button>';
    b.onclick = (e) => { const t = e.target.closest("button[data-a]"); if (t) answer(i, t.dataset.a === "y"); };
    if (b.classList.contains("hidden")) { try { SFX.power && SFX.power(); } catch (e) {} }
    b.classList.remove("hidden");
  }
  function toastMenu(t) {
    const e = $("onToast");
    if (!e) return;
    e.textContent = t;
    e.classList.remove("hidden");
    clearTimeout(e._t);
    e._t = setTimeout(() => e.classList.add("hidden"), 3800);
  }
  function lobbyMsg(t) { const e = $("lbMsg"); if (e) e.textContent = t; }

  // ---------- desenho da sala ----------
  const LKC = {};
  function lookR(m) {
    let L = {}, E = {};
    try {
      const l = m.look || {}, q = (v, n) => clamp(v | 0, 0, n);
      const sl = { skin: q(l.skin, 15), eyes: q(l.eyes, 15), hairStyle: q(l.hairStyle, 40), hairColor: q(l.hairColor, 15), body: l.body === 1 ? 1 : 0 };
      const eq = {};
      for (const k in m.eq || {}) { const v = m.eq[k]; if (typeof v === "string" && LOOK.ITEMS[v]) eq[k] = v; }
      L = LOOK.rigLook(sl);
      E = LOOK.eqItems(eq, sl);
    } catch (e) {}
    return [L, E];
  }
  function charCanvas(m, scale) {
    const key = (m.name || "?") + "|" + JSON.stringify(m.look || {}) + JSON.stringify(m.eq || {}) + "|" + scale;
    if (LKC[key]) return LKC[key];
    const cv = document.createElement("canvas");
    cv.width = 40 * scale; cv.height = 64 * scale;
    cv.className = "lbChar";
    try {
      const x = cv.getContext("2d"), [L, E] = lookR(m);
      x.imageSmoothingEnabled = false;
      rigDrawFrame(x, 20 * scale, 62 * scale, L, E, "Idle", 0, scale, { aura: false });
    } catch (e) {}
    return (LKC[key] = cv);
  }
  function paintMap() {
    const L = st.L;
    if (!L) return;
    const mi = MAPS.findIndex((m) => m.id === L.map), m = MAPS[mi];
    if (!m) return;
    if (st.bgFor !== L.map) {
      st.bgFor = L.map;
      let url = "";
      try { url = scenePreview(mi, 640, 360).toDataURL("image/jpeg", 0.8); } catch (e) {}
      $("lbBg").style.backgroundImage = url ? "url(" + url + ")" : "";
    }
    const C = CAMPAIGNS[L.camp] || CAMPAIGNS[0];
    $("lbCamp").textContent = C.name;
    $("lbMap").textContent = m.name;
    $("lbLore").textContent = (COOP.LORE && COOP.LORE[m.id]) || m.sub || "";
  }
  function paint() {
    const scr = $("lobbyScr");
    if (!scr || scr.classList.contains("hidden")) return;
    const L = st.L;
    $("lbCode").textContent = L ? L.code : st.code || "·····";
    if (!L) { $("lbSlots").innerHTML = '<p class="lbWait">Abrindo a sala...</p>'; return; }
    paintMap();
    const box = $("lbSlots");
    box.innerHTML = "";
    for (let s = 0; s < L.max; s++) {
      const mb = L.members.find((x) => x.slot === s), d = document.createElement("div");
      d.className = "lbSlot" + (mb ? "" : " empty") + (mb && mb.me ? " me" : "");
      d.style.setProperty("--pc", COLS[s]);
      if (mb) {
        const l = st.links[s], net = mb.me ? "VOCÊ" : !l ? (s === 0 ? "ANFITRIÃO" : "") : l.ok() ? "DIRETO" + (l.rtt ? " · " + l.rtt + " ms" : "") : l.via === "servidor" ? "PELO SERVIDOR" : "CONECTANDO";
        d.append(charCanvas(mb, 2));
        d.insertAdjacentHTML("beforeend", '<div class="lbBub" id="lbBub' + s + '"></div><b>' + esc(mb.name) + "</b><small>" + (s === 0 ? "ANFITRIÃO · " : "") + "NÍVEL " + (mb.level || 1) + " · recorde " + (mb.best || 0) + "</small>" +
          '<i class="lbRdy' + (mb.ready ? " on" : "") + '">' + (mb.ready ? "PRONTO" : "ESPERANDO") + '</i><em class="lbNet">' + net + "</em>");
        d.onclick = () => { if (!mb.me) PROFILE.open(mb.name); };
        if (isHost() && !mb.me) {
          const k = document.createElement("button");
          k.className = "lbKick"; k.textContent = "TIRAR"; k.title = "Tirar da sala";
          k.onclick = (e) => { e.stopPropagation(); NET.rpc("lobby_kick", { p_lobby: st.id, p_slot: s }).then(() => refresh(), (x) => lobbyMsg(err(x))); };
          d.append(k);
        }
      } else d.innerHTML = "<b>VAGA LIVRE</b><small>chame um amigo ou passe o código " + esc(L.code) + "</small>";
      box.append(d);
    }
    const me = L.members.find((x) => x.me), n = L.members.length, allR = L.members.every((x) => x.ready);
    const K = CONFIG.coop, extra = n - 1;
    $("lbDiff").textContent = n < 2 ? "Sozinho não dá: chame alguém. Partida online não tem bot, só gente de verdade." :
      "Com " + n + " na sala: horda +" + Math.round(K.count * extra * 100) + "%, zumbis +" + Math.round(K.hp * extra * 100) + "% de vida, um nível de pressão acima. Dinheiro é de cada um.";
    const go = $("lbGo");
    if (isHost()) {
      go.textContent = "COMEÇAR";
      go.disabled = n < 2 || !allR;
      go.title = n < 2 ? "Espere alguém entrar" : !allR ? "Espere todo mundo ficar pronto" : "";
    } else {
      go.textContent = me && me.ready ? "NÃO TÔ PRONTO" : "TÔ PRONTO";
      go.disabled = false;
    }
    $("lbPick").classList.toggle("hidden", !isHost());
    $("lbHostNote").classList.toggle("hidden", isHost());
    if (isHost()) paintPick();
    paintFriends();
  }
  function paintPick() {
    const L = st.L, cb = $("lbCamps"), mb = $("lbMaps");
    cb.innerHTML = "";
    CAMPAIGNS.forEach((C, ci) => {
      const ms = campMaps(ci);
      if (!ms.length) return;
      const b = document.createElement("button");
      b.className = "lbChip" + (L.camp === ci ? " sel" : "");
      b.textContent = C.name;
      b.onclick = () => { const c0 = curCamp; curCamp = ci; const ok = campMaps(ci).filter((i) => unlocked(i)); curCamp = c0; if (ok.length) setMap(ok[0], ci); };
      cb.append(b);
    });
    mb.innerHTML = "";
    const c0 = curCamp;
    curCamp = L.camp;
    campMaps(L.camp).forEach((i) => {
      const m = MAPS[i], ok = unlocked(i), b = document.createElement("button");
      b.className = "lbChip" + (m.id === L.map ? " sel" : "") + (ok ? "" : " lock");
      b.textContent = m.name;
      b.disabled = !ok;
      b.title = ok ? m.sub || "" : "Você ainda não liberou essa fase";
      b.onclick = () => setMap(i, L.camp);
      mb.append(b);
    });
    curCamp = c0;
  }
  let fon = [], fonT = 0;
  function paintFriends() {
    const box = $("lbFriends");
    if (!box) return;
    if (now() - fonT > 8000) {
      fonT = now();
      NET.rpc("friends_online", {}).then((a) => { fon = (a || []).sort((x, y) => (y.online - x.online) || String(x.name).localeCompare(y.name)); drawF(); }, () => {});
    }
    drawF();
    function drawF() {
      const inRoom = st.L ? st.L.members.map((m) => String(m.name).toLowerCase()) : [];
      box.innerHTML = fon.length ? fon.map((f) => '<div class="lbF' + (f.online ? " on" : "") + '"><i></i><span>' + esc(f.name) + "<small>" + (f.online ? f.state === "partida" ? "jogando agora" : f.state === "sala" ? "numa sala" : "no menu" : "fora do jogo") + "</small></span>" +
        (inRoom.includes(String(f.name).toLowerCase()) ? "<em>NA SALA</em>" : '<button class="btn yo" data-n="' + esc(f.name) + '">CHAMAR</button>') + "</div>").join("") : "<p>Sem amigos ainda. Adicione em AMIGOS, ou passe o código da sala.</p>";
    }
  }
  function showSay(slot, i) {
    const t = SAY[i | 0];
    if (!t) return;
    st.said[slot] = { t, at: S.t, wall: now() };
    const b = $("lbBub" + slot);
    if (b) { b.textContent = t; b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); }
    if (live() && slot !== st.me) { try { SFX.swap && SFX.swap(); } catch (e) {} }
  }
  function say(i) {
    if (now() - (st.sayAt || 0) < 900) return;
    st.sayAt = now();
    showSay(st.me, i);
    send(-1, { k: "say", d: i });
  }

  // ================================================================ partida
  // ---------- parceiros (bonecos controlados pela rede) ----------
  function puppets() {
    const out = [];
    let k = 0;
    for (const m of st.members || []) {
      if (m.slot === st.me) continue;
      const b = newPlayer(), [L, E] = lookR(m);
      Object.assign(b, {
        bot: 1, remote: 1, kind: "remote", id: "p" + m.slot, slot: m.slot, idx: k++, name: String(m.name || "PARCEIRO").toUpperCase(), cash: 0,
        down: 0, out: 0, rev: 0, revAt: -9, revNeed: CONFIG.coop.reviveT, hurtT: 0, iT: 0, lastIn: now(), nx: null, atR: 0, col: COLS[m.slot]
      });
      b.ws = [null, { id: "pistol", rk: "white", mag: 99, res: 999 }];
      b.cur = 1;
      b.maxHp = b.hp;
      try { b.lk = COOP.lookAs("net:" + m.slot + ":" + m.name, L, E); } catch (e) {}
      out.push(b);
    }
    return out;
  }
  const pup = (slot) => (S.bots || []).find((b) => b.slot === slot);
  function tickRemote(b, dt) {
    if (b.flashT > 0) b.flashT -= dt;
    if (b.hurtT > 0) b.hurtT -= dt;
    b.kick = Math.max(0, (b.kick || 0) - dt * 30);
    if (b.relT > 0) b.relT -= dt;
    if (b.melT > 0) b.melT -= dt;
    const n = b.nx;
    if (!n) return;
    const dx = n.x - b.x, dy = n.y - b.y;
    if (Math.abs(dx) > 140 || Math.abs(dy) > 90) { b.x = n.x; b.y = n.y; }
    else { const k = Math.min(1, dt * 14); b.x += dx * k; b.y += dy * k; }
    b.gy = n.gy;
    b.at += dt * b.atR;
    // sem sinal: fica parado e os zumbis param de mirar nele
    const quiet = (now() - b.lastIn) / 1e3;
    b.lag = quiet > T.lostWarn;
  }
  const r1 = (v) => Math.round(v * 10) / 10, r2 = (v) => Math.round(v * 100) / 100;
  function actorOut(p, slot) {
    const w = curW(p) || {};
    return [slot, Math.round(p.x), Math.round(p.y), Math.round(p.gy != null ? p.gy : p.y), p.face | 0 || 1, r2(p.aim || 0), p.anim || "Idle", r1(p.at || 0),
      Math.round(p.hp), Math.round(p.maxHp), r1(p.down || 0), r1(p.rev || 0), p.dead || p.out ? 1 : 0, w.id || "pistol", w.rk || "white",
      r2(p.melT || 0), r2(p.relT || 0), r2(p.relMax || 1), p.onGround ? 1 : 0, Math.round(p.armor || 0), r2(p.hurtT || 0), r2(p.pumpT || 0), r2(p.boltT || 0), p.running ? 1 : 0];
  }
  function actorIn(b, a) {
    if (!b) return;
    const t = now(), at = a[7];
    if (b.nx && b.anim === a[6] && t > b.nxT) b.atR = clamp((at - b.nx.at) / ((t - b.nxT) / 1e3), 0, 40);
    else b.atR = 8;
    b.nx = { x: a[1], y: a[2], gy: a[3], at };
    b.nxT = t;
    b.lastIn = t;
    if (b.anim !== a[6]) b.at = at;
    else if (Math.abs(b.at - at) > 2) b.at = at;
    b.face = a[4]; b.aim = a[5]; b.anim = a[6];
    b.hp = a[8]; b.maxHp = a[9] || b.maxHp; b.down = a[10]; b.rev = a[11];
    const dead = !!a[12];
    if (dead && !b.out) { b.out = 1; puff(b); UI.toast(b.name + " CAIU DE VEZ · VOLTA NA PRÓXIMA ONDA SE VOCÊS AGUENTAREM", "#c9a0ff"); }
    else if (!dead && b.out) { b.out = 0; b.x = a[1]; b.y = a[2]; puff(b); }
    b.dead = false;
    const w = b.ws[1];
    if (w.id !== a[13] && WEAP[a[13]]) w.id = a[13];
    w.rk = a[14];
    b.melT = a[15]; b.relT = a[16]; b.relMax = a[17] || 1; b.onGround = !!a[18]; b.armor = a[19]; b.hurtT = a[20]; b.pumpT = a[21]; b.boltT = a[22]; b.running = !!a[23];
  }
  function puff(b) {
    for (let i = 0; i < 10; i++) S.parts.push({ x: b.x + rnd(-8, 8), y: b.y - rnd(4, 40), vx: rnd(-40, 40), vy: rnd(-60, -10), life: 0.5, max: 0.5, col: "#8a8378", sz: 2, g: -20, smoke: 1 });
  }
  // tiros dos parceiros: rastro, clarão e som (o dano chega pela rede como "acertei o zumbi N")
  function shotFx(b, sh) {
    if (!b || b.out) return;
    const w = WEAP[sh[1]] || WEAP.pistol, a = sh[0];
    let mx = b.x + b.face * 16, my = b.y - 40;
    try { const gp = gunPoints(b); if (gp && gp.muz) { mx = gp.muz[0]; my = gp.muz[1]; } } catch (e) {}
    const dx = Math.cos(a), dy = Math.sin(a), end = Math.min(w.range || 720, wallT(mx, my, dx, dy));
    S.tracers.push({ x0: mx, y0: my, x1: mx + dx * end, y1: my + dy * end, life: 0.05, laser: 0, col: "#ffe08a" });
    S.dyn.push({ x: mx, y: my, r: 40, c: "#ffc46a", i: 1, life: 0.06 });
    b.flashT = 0.05;
    b.kick = GUNKICK[w.kind] || 2;
    if (Math.abs(mx - S.cam.x - VW / 2) < VW) try { SFX.shot(sh[1], clamp((mx - S.cam.x) / VW * 2 - 1, -1, 1) * 0.9); } catch (e) {}
  }

  // ---------- zumbis: o anfitrião numera e manda; o convidado só desenha ----------
  const ZDYN = ["x", "y", "gy", "face", "anim", "at", "state", "hp", "maxHp", "onGround", "duck", "block", "wind", "fuse", "buff", "armor", "emerge", "flashT", "hurtT", "cap", "immune", "bs", "dash", "elite"];
  const ZSKIP = { tg: 1, tgT: 1, plat: 1, wounds: 1, nid: 1, _fk: 1, _fr: 1, lk: 1 };
  function zNew(z) {
    if (!host()) return;
    z.nid = ++st.nid;
    st.zq.push(z);
  }
  function zFull(z) {
    const o = {};
    for (const k in z) {
      if (ZSKIP[k]) continue;
      const v = z[k], t = typeof v;
      if (t === "number") o[k] = Math.round(v * 100) / 100;
      else if (t === "string" || t === "boolean") o[k] = v;
    }
    o.nid = z.nid;
    return o;
  }
  function zRow(z) {
    const r = [z.nid];
    for (const k of ZDYN) {
      const v = z[k];
      r.push(typeof v === "number" ? Math.round(v * 10) / 10 : v === void 0 ? null : v);
    }
    return r;
  }
  function zMirror(o) {
    if (st.zmap[o.nid]) return st.zmap[o.nid];
    const z = Object.assign({ wounds: [], tx: o.x, ty: o.y, vx: 0, vy: 0 }, o);
    st.zmap[o.nid] = z;
    S.zs.push(z);
    try { if (z.v && ZV_SND[z.v]) SFX.zPre(ZV_SND[z.v]); } catch (e) {}
    return z;
  }
  function zTick(z, dt) {
    if (!z.nid) return updateZ(z, dt);
    if (z.state === "dead") {
      z.deadT = (z.deadT || 0) + dt;
      z.at = Math.min(4.9, z.at + dt * 10);
      return;
    }
    const dx = z.tx - z.x, dy = z.ty - z.y;
    if (Math.abs(dx) > 120 || Math.abs(dy) > 120) { z.x = z.tx; z.y = z.ty; }
    else { const k = Math.min(1, dt * 12); z.x += dx * k; z.y += dy * k; }
    try { z.at += dt * (zAnimFps(z) || 8) * (z.anim === "Hurt" ? 1.5 : 1); } catch (e) { z.at += dt * 8; }
    if (z.flashT > 0) z.flashT -= dt;
    if (z.hurtT > 0) z.hurtT -= dt;
    zBleedTick && zBleedTick(z, dt);
  }
  function zDie(z, head) {
    if (z.state === "dead") return;
    z.state = "dead"; z.anim = "Dead"; z.at = 0; z.deadT = 0; z.vx = 0;
    const pan = clamp((z.x - S.cam.x) / VW * 2 - 1, -1, 1);
    try { goreDeath(z, false); } catch (e) {}
    try { head ? SFX.head(pan) : SFX.zdie(pan); } catch (e) {}
    if (z.boss) try { bossDefeated(z); } catch (e) { console.warn(e); }
  }
  function applySnap(d) {
    st.lastSnapAt = now();
    if (st.warned) { st.warned = 0; UI.toast("ANFITRIÃO VOLTOU", "#7dff6a"); }
    const seen = {};
    for (const r of d.z || []) {
      const z = st.zmap[r[0]];
      if (!z) continue;
      seen[r[0]] = 1;
      const wasDead = z.state === "dead";
      for (let i = 0; i < ZDYN.length; i++) {
        const k = ZDYN[i], v = r[i + 1];
        if (k === "x") z.tx = v;
        else if (k === "y") z.ty = v;
        else if (k === "state") { if (v === "dead") { if (!wasDead) zDie(z); } else if (!wasDead) z.state = v; }
        else if (k === "at") { if (z.anim !== r[ZDYN.indexOf("anim") + 1] || Math.abs(z.at - v) > 1.5) z.at = v; }
        else if (wasDead && (k === "anim" || k === "hp")) continue;
        else if (v === null) delete z[k];
        else z[k] = v;
      }
    }
    // o anfitrião tirou (morreu há tempo ou sumiu): tira também
    for (const k in st.zmap) {
      const z = st.zmap[k];
      if (!seen[k] && (z.state !== "dead" || z.deadT > 4.5)) {
        if (z.state !== "dead" && !(now() - (z.bornAt || 0) < 1500)) { S.zs.splice(S.zs.indexOf(z) >>> 0, 1); delete st.zmap[k]; }
        else if (z.state === "dead" && z.deadT > 4.5) delete st.zmap[k];
      }
    }
    for (const a of d.a || []) if (a[0] !== st.me) actorIn(pup(a[0]), a);
    for (const f of d.fx || []) if (f[0] !== st.me) for (const sh of f[1]) shotFx(pup(f[0]), sh);
    if (d.b) for (let i = 0; i < d.b.length && i < S.bars.length; i++) {
      const b = S.bars[i];
      if (b.fixAt && now() - b.fixAt < 600) b.planks = Math.max(b.planks, d.b[i]);
      else b.planks = d.b[i];
    }
    if (d.bp && S.buyPhase.active) { S.buyPhase.t = d.bp[0]; S.buyPhase.duration = d.bp[1]; }
    if (d.o) for (const id of d.o) if (!S.opened[id]) openDoor(id);
    st.hostRound = d.r;
  }
  function openDoor(id) {
    if (S.opened[id]) return;
    S.opened[id] = 1;
    st.doors[id] = 1;
    const d = (M().doors || []).find((x) => x.id === id);
    if (d) {
      S.cam.shake = Math.max(S.cam.shake, 2);
      for (let i = 0; i < 14; i++) S.parts.push({ x: d.x + rnd(-30, 30), y: d.y - rnd(0, 60), vx: rnd(-100, 100), vy: rnd(-150, 0), life: 0.6, max: 0.6, col: "#9a9488", sz: 2, g: 500 });
    }
  }
  function applyPeer(from, d) {
    const b = pup(from);
    if (!b) return;
    if (d.a) actorIn(b, d.a);
    if (d.sh && d.sh.length) { for (const sh of d.sh) shotFx(b, sh); (st.fxq[from] = st.fxq[from] || []).push(...d.sh); }
  }

  // ---------- eventos (confiáveis) ----------
  function ev(to, e) {
    (st.ev[to] = st.ev[to] || []).push(e);
  }
  function onEv(e, who) {
    const k = e[0];
    if (host()) {
      if (k === "h" || k === "k") {
        const z = S.zs.find((q) => q.nid === e[1]);
        if (!z || z.state === "dead") return;
        const b = pup(who) || { cash: 0 };
        S.byBot = b; S.netApply = 1;
        try {
          if (k === "h") { S.hitA = e[5] >= 0 ? 0 : Math.PI; hurtZ(z, +e[2] || 0, !!e[3], e[4] || "gun", e[5] || 0, e[6], e[7]); }
          else killZ(z, !!e[2], e[3] || "gun");
        } finally { S.byBot = 0; S.netApply = 0; S.hitA = void 0; }
        return;
      }
      if (k === "bar") { const b = S.bars[e[1]]; if (b) b.planks = Math.min(b.max, b.planks + (e[2] | 0 || 1)); return; }
      if (k === "door") { openDoor(e[1]); return; }
      if (k === "skip") { st.votes[who] = 1; voteToast(); skipPause(); return; }
      if (k === "rv") { if (e[1] === 0) revIn(e); else ev(e[1], e); return; }
      if (k === "bye") { const b = pup(who); if (b) { b.out = 1; b.gone = 1; UI.toast(b.name + " SAIU DA PARTIDA", "#c9a0ff"); } return; }
    } else {
      if (k === "z") { for (const o of e[1]) { const z = zMirror(o); z.bornAt = now(); } return; }
      if (k === "hurt") { if (S.player && !S.player.dead) hurtPlayer(e[1], e[2]); return; }
      if (k === "rv") { revIn(e); return; }
      if (k === "round") { guestRound(e[1]); return; }
      if (k === "clear") { try { roundCleared(); } catch (x) {} return; }
      if (k === "pause") { if (!S.buyPhase.active) { try { beginPause(); } catch (x) {} } return; }
      if (k === "door") { openDoor(e[1]); return; }
      if (k === "end") { endFromHost(e[1], e[2]); return; }
      if (k === "bye") return;
    }
  }
  function revIn(e) {
    const p = S.player;
    if (!p || !(p.down > 0)) return;
    p.revAt = S.t + 0.1;
    p.rev = Math.max(p.rev, +e[2] || 0);
    if (p.rev >= (+e[3] || CONFIG.coop.reviveT)) COOP.revStep(p, 0, { name: String(e[4] || "PARCEIRO"), bot: 0 });
  }
  function guestRound(n) {
    if (n <= S.round) return;
    S.buyPhase.active = false;
    S.buyPhase.t = 0;
    S.inter = 0;
    S.endT = 0;
    if (S.shopOpen) {
      S.shopOpen = false;
      try { equipLastBought(); } catch (x) {}
      UI.shopClose(() => startRound(n));
    } else startRound(n);
  }
  function endFromHost(win, why) {
    if (st.over) return;
    if (why === "quit") UI.toast("O ANFITRIÃO SAIU DA PARTIDA", "#ff9a3c");
    finish(win);
  }
  function finish(win) {
    if (st.over) return;
    st.over = 1;
    if (S.mode === "pause") { S.mode = "play"; UI.show(null); }
    if (S.mode === "play") UI.over(!!win);
  }

  // ---------- ganchos chamados pelo jogo ----------
  // tiro/explosão do convidado num zumbi: mostra na hora aqui e avisa o anfitrião
  function hitOut(z, dmg, head, src, dirx, hx, hy) {
    if (!guest() || S.netApply || !z.nid) return;
    ev(0, ["h", z.nid, Math.round(dmg * 10) / 10, head ? 1 : 0, src, Math.sign(dirx) || 0, Math.round(hx), Math.round(hy)]);
  }
  function killOut(z, head, src) {
    if (!guest() || S.netApply || !z.nid || z.state === "dead") return;
    ev(0, ["k", z.nid, head ? 1 : 0, src]);
  }
  function hurtRemote(b, d, kb) {
    if (!host() || b.out || b.down > 0) return;
    ev(b.slot, ["hurt", Math.round(d * 10) / 10, Math.round(kb || 0)]);
  }
  function revOut(t, dt, who) {
    t.revAt = S.t;
    t.rev = (t.rev || 0) + dt;
    who.revving = t;
    t.revNeed = CONFIG.coop.reviveT;
    if (now() - (t.rvAt || 0) > 90) {
      t.rvAt = now();
      const e = ["rv", t.slot, Math.round(t.rev * 100) / 100, CONFIG.coop.reviveT, (SAVE.d && SAVE.d.name) || "PARCEIRO"];
      if (host()) ev(t.slot, e); else ev(0, e);
    }
  }
  function barFix(b, k) {
    if (!live()) return;
    b.fixAt = now();
    if (guest()) ev(0, ["bar", S.bars.indexOf(b), k]);
  }
  function round(n2) {
    if (!live()) return;
    if (host()) { ev(-1, ["round", n2]); st.votes = {}; }
    st.myVote = 0;
    const p = S.player;
    // quem caiu de vez volta na onda seguinte, perto de quem segurou
    if (p && p.dead && !st.over) {
      const a = (S.bots || []).find((b) => !b.out && !(b.down > 0)) || null;
      p.dead = false; p.down = 0; p.hp = Math.round(p.maxHp * 0.5); p.anim = "Idle"; p.at = 0; p.deadT = 0; p.iT = 1.5; p.vx = p.vy = 0;
      if (a) { p.x = a.x - (a.face || 1) * 30; p.y = p.gy = a.onGround ? a.y : a.gy; p.plat = null; p.onGround = true; }
      puff(p);
      UI.toast("VOCÊ VOLTOU! A TROPA SEGUROU", "#7dff6a");
    }
  }
  function cleared() { if (host()) ev(-1, ["clear"]); }
  function paused() { if (host()) ev(-1, ["pause", S.buyPhase.duration]); }
  function skipOk() {
    if (!live()) return true;
    if (guest()) {
      if (!st.myVote) { st.myVote = 1; ev(0, ["skip"]); UI.toast("PRONTO! ESPERANDO A TROPA", "#7dff6a"); }
      return false;
    }
    st.votes[0] = 1;
    const need = (S.bots || []).filter((b) => !b.gone).length + 1, got = 1 + (S.bots || []).filter((b) => !b.gone && st.votes[b.slot]).length;
    if (got >= need || S.buyPhase.t >= S.buyPhase.duration - 0.05) return true;
    voteToast();
    return false;
  }
  function voteToast() {
    if (!host()) return;
    const need = (S.bots || []).filter((b) => !b.gone).length + 1, got = 1 + (S.bots || []).filter((b) => !b.gone && st.votes[b.slot]).length;
    if (st.votes[0]) UI.toast("PRONTOS " + got + "/" + need, "#7dff6a");
  }
  function anyUp() {
    return live() && (S.bots || []).some((b) => !b.out && !b.gone);
  }
  // morreu mas a tropa segue: assiste e volta na próxima onda; ninguém de pé = fim
  function keepWatching() {
    if (!live() || st.over) return false;
    if (anyUp()) {
      if (!st.watchMsg) { st.watchMsg = 1; UI.toast("VOCÊ CAIU DE VEZ · VOLTA NA PRÓXIMA ONDA SE A TROPA AGUENTAR", "#c9a0ff"); }
      return true;
    }
    return false;
  }
  function camP() {
    const p = S.player;
    if (!live() || !p || !p.dead) return null;
    return (S.bots || []).find((b) => !b.out && !b.gone) || null;
  }
  function over(win) {
    if (!live()) return;
    st.over = 1;
    if (host()) { ev(-1, ["end", win ? 1 : 0]); flush(); setTimeout(() => NET.rpc("lobby_end", { p_lobby: st.id }).catch(() => {}), 400); }
    const b = $("bAgain");
    if (b) b.textContent = "VOLTAR PRA SALA";
  }
  function quit() {
    if (!st.match) return;
    if (host() && !st.over) { ev(-1, ["end", 0, "quit"]); flush(); NET.rpc("lobby_end", { p_lobby: st.id }).catch(() => {}); }
    else if (!st.over) { ev(0, ["bye"]); flush(); }
    st.match = 0;
    st.role = null;
    const b = $("bAgain");
    if (b) b.textContent = "DE NOVO";
  }
  function backToLobby() {
    st.match = 0;
    st.role = null;
    st.myVote = 0;
    st.watchMsg = 0;
    const b = $("bAgain");
    if (b) b.textContent = "DE NOVO";
    toMenu();
    st.pollT = 0;
    if (st.id) { UI.show("lobbyScr"); paint(); }
  }
  function guestRounds(dt) {
    if (S.won) {
      S.winT -= dt;
      if (S.winT <= 0 && S.mode === "play") UI.over(true);
    }
  }

  // ---------- por quadro ----------
  function myShots() {
    const p = S.player;
    if (!p) return [];
    const n = S.shotN - (st.shot0 || 0);
    st.shot0 = S.shotN;
    if (n <= 0 || n > 8 || p.dead) return [];
    const w = curW(p) || {}, out = [];
    for (let i = 0; i < n; i++) out.push([Math.round(p.aim * 100) / 100, w.id || "pistol"]);
    return out;
  }
  function flush() {
    for (const to in st.ev) {
      const L = st.ev[to];
      if (!L.length) continue;
      st.ev[to] = [];
      send(+to, { k: "E", d: L });
    }
  }
  function tick(rdt) {
    const t = now();
    // menu: presença e convites
    if (!st.match) {
      if (NET.logged && S.mode === "menu" && t > st.pingT) {
        st.pingT = t + (st.id || !$("friendScr").classList.contains("hidden") ? T.pingFast : T.ping);
        ping(st.id ? "sala" : "menu");
      }
      if (st.id && t > st.pollT) { st.pollT = t + T.poll; refresh(); }
      if (st.id && t > (st.pingRtt || 0)) { st.pingRtt = t + 3000; for (const k in st.links) if (st.links[k].ok()) st.links[k].send({ k: "ping", d: now() }); }
      return;
    }
    if (st.id && t > st.pollT) { st.pollT = t + T.pollPlay; refresh(); }
    if (S.mode !== "play" && S.mode !== "pause" && S.mode !== "over") return;
    if (!S.player) return;
    // pausa no online não congela o mundo: só larga os controles
    if (S.mode === "pause") { const I = S.input; I.move = 0; I.fire = false; I.jump = false; I.act = false; }
    const relay = viaRelay();
    if (host()) {
      if (st.zq.length) { ev(-1, ["z", st.zq.splice(0).map(zFull)]); }
      st.snapT -= rdt;
      if (st.snapT <= 0) {
        st.snapT = 1 / (relay ? T.snapHzRelay : T.snapHz);
        const fx = [];
        const me = myShots();
        if (me.length) fx.push([0, me]);
        for (const k in st.fxq) if (st.fxq[k].length) fx.push([+k, st.fxq[k].splice(0)]);
        const a = [actorOut(S.player, 0)];
        for (const b of S.bots || []) if (!b.gone) a.push(actorOut(b, b.slot));
        const snap = { r: S.round, z: S.zs.filter((z) => z.nid).map(zRow), a, fx, b: S.bars.map((b) => b.planks), o: Object.keys(S.opened) };
        if (S.buyPhase.active) snap.bp = [Math.round(S.buyPhase.t * 10) / 10, S.buyPhase.duration];
        send(-1, { k: "S", d: snap }, true);
      }
      // sem notícia de um convidado: avisa; muito tempo: tira da partida
      for (const b of S.bots || []) {
        if (b.gone) continue;
        const q = (t - b.lastIn) / 1e3;
        if (q > T.lostEnd) { b.gone = 1; b.out = 1; UI.toast(b.name + " CAIU DA CONEXÃO", "#ff9a3c"); }
        else if (q > T.lostWarn && !b.warnLag) { b.warnLag = 1; UI.toast(b.name + " SEM SINAL...", "#ff9a3c"); }
        else if (q < 1) b.warnLag = 0;
      }
    } else if (guest()) {
      st.stateT -= rdt;
      if (st.stateT <= 0) {
        st.stateT = 1 / (relay ? T.stateHzRelay : T.stateHz);
        send(0, { k: "P", d: { a: actorOut(S.player, st.me), sh: myShots() } }, true);
      }
      const q = (t - st.lastSnapAt) / 1e3;
      if (q > T.lostEnd && !st.over) { UI.toast("O ANFITRIÃO CAIU DA CONEXÃO", "#ff6a4a"); finish(false); }
      else if (q > T.lostWarn && !st.warned) { st.warned = 1; UI.toast("ANFITRIÃO SEM SINAL...", "#ff9a3c"); }
      // porta aberta aqui vai pro anfitrião
      for (const id in S.opened) if (S.opened[id] && !st.doors[id]) { st.doors[id] = 1; ev(0, ["door", id]); }
    }
    if (host()) for (const id in S.opened) if (S.opened[id] && !st.doors[id]) st.doors[id] = 1;
    flush();
  }
  function begin() {
    // chamado no resetWorld da partida online (depois de startGame)
    st.doors = {};
    st.fxq = {};
    st.myVote = 0;
    st.watchMsg = 0;
    st.shot0 = S.shotN;
  }
  // balão da frase em cima do personagem na partida
  function drawSays(g) {
    if (!live()) return;
    for (const k in st.said) {
      const s = st.said[k], age = (now() - s.wall) / 1e3;
      if (age > 2.6) { delete st.said[k]; continue; }
      const a = +k === st.me ? S.player : pup(+k);
      if (!a || a.out) continue;
      const w = textW(s.t) + 8, x = Math.round(a.x - w / 2), y = Math.round(a.y - 104 - Math.min(1, age * 6) * 4);
      g.globalAlpha = age > 2.2 ? (2.6 - age) / 0.4 : 1;
      g.fillStyle = "#000"; g.fillRect(x - 1, y - 1, w + 2, 15);
      g.fillStyle = "#f4f0e4"; g.fillRect(x, y, w, 13);
      g.fillStyle = COLS[+k] || "#ffd84a"; g.fillRect(x, y + 13, w, 1);
      drawTxt(g, s.t, x + 4, y + 2, "#120e1a");
      g.globalAlpha = 1;
    }
  }

  return {
    T, SAY, st, live, guest, host, isHost, create, join, leave, invite, answer, setReady, setMap, start, say, paint, refresh, ping, banner,
    puppets, tickRemote, zNew, zTick, hitOut, killOut, hurtRemote, revOut, barFix, round, cleared, paused, skipOk, anyUp, keepWatching, camP,
    over, quit, backToLobby, guestRounds, tick, begin, drawSays, toastMenu, lobbyMsg,
    inLobby: () => !!st.id, seed: () => st.match ? st.seed : 0, myName: () => (SAVE.d && SAVE.d.name) || ""
  };
})();

// =====================================================================
//  PERFIL DE OUTRO JOGADOR (amigo ou alguém da sala): personagem, estatísticas e itens mais raros
// =====================================================================
const PROFILE = (function () {
  const esc = (t) => String(t == null ? "" : t).replace(/[<>&"]/g, "");
  const RN = ["COMUM", "COMUM", "RARO", "LENDÁRIO"];
  let cur = null;
  function rarOf(it) {
    if (it.r) return it.r;
    const L = LOOK.ITEMS[it.id];
    return !L ? 1 : L.rar >= 4 ? 3 : L.rar >= 2 ? 2 : 1;
  }
  function pct(v) {
    if (v == null) return "";
    return (v >= 10 ? Math.round(v) : String(Math.round(v * 10) / 10).replace(".", ",")) + "%";
  }
  function open(name) {
    const ov = $("pfOther");
    cur = name;
    ov.classList.remove("hidden");
    $("poBody").innerHTML = '<p class="poWait">Carregando o perfil de ' + esc(name) + "...</p>";
    SFX.swap && SFX.swap();
    NET.rpc("player_profile", { p_name: name }).then((r) => { if (cur === name) draw(r); }, (e) => {
      if (cur !== name) return;
      $("poBody").innerHTML = "<p class='poWait'>" + (String(e && e.message) === "PERFIL_FECHADO" ? "Só dá pra ver o perfil de amigos ou de quem está na sua sala." : acctErr(e)) + "</p>";
    });
  }
  function close() {
    cur = null;
    $("pfOther").classList.add("hidden");
  }
  function draw(r) {
    const s = r.stats || {}, acc = s.shots ? Math.round(100 * (s.hits || 0) / s.shots) + "%" : "—", hrs = Math.round((s.play_seconds || 0) / 360) / 10;
    const items = (r.items || []).filter((it) => LOOK.ITEMS[it.id]).map((it) => Object.assign({}, it, { rr: rarOf(it) }));
    items.sort((a, b) => b.rr - a.rr || (a.own != null ? a.own : 100) - (b.own != null ? b.own : 100) || (a.drop != null ? a.drop : 101) - (b.drop != null ? b.drop : 101));
    const top = items.slice(0, 8);
    const box = $("poBody");
    const on = r.online ? '<i class="poOn"></i>' + (r.state === "partida" ? "jogando agora" : r.state === "sala" ? "numa sala" : "on agora") :
      r.played_ago_days == null ? "ainda não jogou" : r.played_ago_days === 0 ? "jogou hoje" : "jogou há " + r.played_ago_days + (r.played_ago_days === 1 ? " dia" : " dias");
    const stat = (l, v) => '<div class="poSt"><b>' + v + "</b><small>" + l + "</small></div>";
    const maps = (r.maps || []).slice(0, 4).map((m) => { const M_ = MAPS.find((q) => q.id === m.map); return "<li><span>" + esc(M_ ? M_.name : m.map) + "</span><b>onda " + (m.best_wave | 0) + "</b><small>" + (m.best_kills | 0) + " abates</small></li>"; }).join("");
    box.innerHTML = '<div class="poHero"><div class="poChar" id="poChar"></div><div class="poId"><b class="yo">' + esc(r.name) + "</b><span>NÍVEL " + (r.level || 1) + " · " + on + "</span>" +
      (r.friend && r.since ? "<small>amigos desde " + new Date(r.since).toLocaleDateString("pt-BR") + "</small>" : "") + '<div class="poBtns" id="poBtns"></div></div></div>' +
      '<div class="poGrid">' + stat("recorde", "onda " + (s.best_wave | 0)) + stat("abates", (s.kills | 0).toLocaleString("pt-BR")) + stat("partidas", s.matches | 0) + stat("vitórias", s.wins | 0) +
      stat("chefes", s.bosses | 0) + stat("precisão", acc) + stat("horas", String(hrs).replace(".", ",")) + stat("itens", items.length) + "</div>" +
      (maps ? '<div class="poSec">MELHORES QUEBRADAS</div><ul class="poMaps">' + maps + "</ul>" : "") +
      '<div class="poSec">ITENS MAIS RAROS <small>% = quantos jogadores também têm · chance = de sair num baú</small></div>' +
      (top.length ? '<div class="poItems" id="poItems"></div>' : "<p class='poWait'>Nenhum item ainda.</p>");
    // personagem grande, com o que está vestindo
    const l = r.look || {}, eq = {}, q = (v, n) => clamp(v | 0, 0, n);
    const sl = { skin: q(l.skin, 15), eyes: q(l.eyes, 15), hairStyle: q(l.hairStyle, 40), hairColor: q(l.hairColor, 15), body: l.body === 1 ? 1 : 0 };
    for (const k in r.eq || {}) if (typeof r.eq[k] === "string" && LOOK.ITEMS[r.eq[k]]) eq[k] = r.eq[k];
    try {
      const cv = document.createElement("canvas"), sc = 3;
      cv.width = 40 * sc; cv.height = 64 * sc;
      const x = cv.getContext("2d");
      x.imageSmoothingEnabled = false;
      rigDrawFrame(x, 20 * sc, 62 * sc, LOOK.rigLook(sl), LOOK.eqItems(eq, sl), "Idle", 0, sc, {});
      $("poChar").append(cv);
    } catch (e) {}
    const ib = $("poItems");
    if (ib) for (const it of top) {
      const L = LOOK.ITEMS[it.id], d = document.createElement("div");
      d.className = "poIt r" + it.rr;
      const cv = document.createElement("canvas");
      try { LOOK.thumb(cv, [it.id], { look: sl }); } catch (e) {}
      d.append(cv);
      d.insertAdjacentHTML("beforeend", "<i>" + RN[it.rr] + "</i><b>" + esc(L.name) + '</b><span class="pp">' + pct(it.own) + "</span><small>dos jogadores têm</small>" +
        (it.drop != null ? "<em>chance " + pct(it.drop) + " por baú</em>" : it.k === "pass" ? "<em>só no passe</em>" : it.k === "item" ? "<em>loja Z-Coin</em>" : ""));
      ib.append(d);
    }
    const bb = $("poBtns");
    if (!r.me) {
      const b = document.createElement("button");
      b.className = "btn yo";
      const inRoom = ONL.st.L && ONL.st.L.members.some((m) => String(m.name).toLowerCase() === String(r.name).toLowerCase());
      b.textContent = inRoom ? "ESTÁ NA SUA SALA" : r.friend ? "CHAMAR PRA JOGAR" : "SÓ AMIGOS RECEBEM CHAMADO";
      b.disabled = inRoom || !r.friend;
      b.onclick = () => { b.disabled = true; ONL.invite(r.name); close(); };
      bb.append(b);
    }
  }
  return { open, close };
})();
