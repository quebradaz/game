// QA do co-op online (v29.11): 2 ou 3 navegadores jogando juntos contra um Supabase falso (em memória, aqui no Node).
// - RPCs da sala/convite/perfil imitam supabase/migrations/v29_11_coop_online.sql (as regras de verdade são testadas
//   em tests/integration/coop/run.sh);
// - Realtime falso (WebSocket do Phoenix) repassa o broadcast entre as páginas;
// - a conexão direta (WebRTC) é de verdade, entre as páginas do Chromium. Com --relay o WebRTC é desligado e tudo
//   passa pelo Realtime falso.
// Uso: node tools/qa/coop-online.js <pasta-saida> [index.html] [--relay] [--three]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const args = process.argv.slice(2).filter((a) => !a.startsWith('--')), flags = process.argv.slice(2).filter((a) => a.startsWith('--'));
const OUT = args[0] || 'out', HTML = args[1] || 'index.html', RELAY = flags.includes('--relay'), THREE = flags.includes('--three');
fs.mkdirSync(OUT, { recursive: true });
const html = fs.readFileSync(HTML), ROOT = path.dirname(path.resolve(HTML));
const SUPA = 'https://wjjuuqvdttjuzsgqueuj.supabase.co';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------ Supabase falso
const U = {
  alfa: { name: 'Alfa', look: { skin: 2, eyes: 1, hairStyle: 3, hairColor: 1, body: 0 }, eq: { chest: 'moletom_capuz', legs: 'calca_moletom', feet: 'tenis_preto' }, level: 12, stats: { matches: 40, wins: 2, kills: 2300, deaths: 38, shots: 9000, hits: 5200, bosses: 3, best_wave: 17, play_seconds: 50000 } },
  bravo: { name: 'Bravo', look: { skin: 6, eyes: 0, hairStyle: 1, hairColor: 0, body: 1 }, eq: { chest: 'jaqueta_jeans', legs: 'jeans_claro', feet: 'tenis_branco' }, level: 7, stats: { matches: 12, wins: 0, kills: 640, deaths: 12, shots: 3000, hits: 1500, bosses: 0, best_wave: 9, play_seconds: 12000 } },
  charlie: { name: 'Charlie', look: { skin: 4, eyes: 2, hairStyle: 5, hairColor: 3, body: 0 }, eq: { chest: 'camisa_time', legs: 'bermuda', feet: 'chinelo' }, level: 3, stats: { matches: 3, kills: 90, best_wave: 5 } }
};
const FRIENDS = [['alfa', 'bravo']];
const areFriends = (a, b) => FRIENDS.some((f) => f.includes(a) && f.includes(b));
const lobbies = {}, invites = [], online = {};
let invN = 0;
const byName = (n) => Object.keys(U).find((k) => U[k].name.toLowerCase() === String(n || '').trim().toLowerCase());
const memberOf = (uid) => Object.values(lobbies).find((l) => l.state !== 'closed' && l.members.some((m) => m.uid === uid));
function E(code) { const e = new Error(code); e.code = code; throw e; }
const RPC = {
  online_ping(uid, a) {
    online[uid] = { at: Date.now(), state: a.p_state };
    const inv = invites.filter((i) => i.to === uid && i.status === 'pending' && lobbies[i.lobby].state === 'open' && !lobbies[i.lobby].members.some((m) => m.uid === uid))
      .map((i) => ({ id: i.id, from: U[i.from].name, map: lobbies[i.lobby].map, camp: 0, n: lobbies[i.lobby].members.length, max: 3 }));
    const l = memberOf(uid);
    return { invites: inv, lobby: l ? { id: l.id, code: l.code, state: l.state, gen: l.gen } : null };
  },
  friends_online(uid) {
    return Object.keys(U).filter((k) => k !== uid && areFriends(uid, k)).map((k) => ({ name: U[k].name, online: !!online[k] && Date.now() - online[k].at < 50000, state: online[k] && online[k].state }));
  },
  get_friends(uid) {
    return Object.keys(U).filter((k) => k !== uid && areFriends(uid, k)).map((k) => ({ name: U[k].name, kind: 'amigo', best_wave: U[k].stats.best_wave, kills: U[k].stats.kills, matches: U[k].stats.matches, played_ago_days: 0 }));
  },
  player_profile(uid, a) {
    const o = byName(a.p_name);
    if (!o) E('JOGADOR_NAO_ENCONTRADO');
    const l = memberOf(uid);
    if (o !== uid && !areFriends(uid, o) && !(l && l.members.some((m) => m.uid === o))) E('PERFIL_FECHADO');
    const u = U[o];
    return { name: u.name, me: o === uid, friend: areFriends(uid, o), since: '2026-11-20T12:00:00Z', online: true, state: 'sala', level: u.level, look: u.look, eq: u.eq, stats: u.stats, players: 7,
      maps: [{ map: 'adega', best_wave: u.stats.best_wave, best_kills: 410, matches: 20, wins: 1 }, { map: 'lava', best_wave: 11, best_kills: 220, matches: 8, wins: 0 }],
      items: [{ id: 'moletom_capuz', r: null, k: null, own: 71.4, drop: null }, { id: 'jaqueta_jeans', r: null, k: null, own: 42.9, drop: null }, { id: 'tenis_preto', r: null, k: null, own: 85.7, drop: null }, { id: 'bone_vermelho', r: null, k: null, own: 28.6, drop: null }] };
  },
  lobby_create(uid, a) {
    leaveAll(uid);
    const id = 'L' + Math.random().toString(16).slice(2, 10), code = Math.random().toString(36).slice(2, 7).toUpperCase().replace(/[0O1IL]/g, 'X');
    lobbies[id] = { id, code, secret: 's' + id, host: uid, map: a.p_map, camp: a.p_camp | 0, state: 'open', gen: 0, seed: null, members: [{ uid, slot: 0, ready: true, seen: Date.now() }], signals: [] };
    return { id, code };
  },
  lobby_join(uid, a) {
    const l = Object.values(lobbies).find((x) => x.state !== 'closed' && x.code === String(a.p_code).toUpperCase());
    if (!l) E('SALA_NAO_ENCONTRADA');
    return { id: l.id, code: l.code, slot: add(l, uid) };
  },
  lobby_invite(uid, a) {
    const l = lobbies[a.p_lobby], o = byName(a.p_name);
    if (!l || !l.members.some((m) => m.uid === uid)) E('FORA_DA_SALA');
    if (!o) E('JOGADOR_NAO_ENCONTRADO');
    if (!areFriends(uid, o)) E('NAO_E_AMIGO');
    invites.push({ id: ++invN, lobby: l.id, from: uid, to: o, status: 'pending' });
    return 'CONVIDADO';
  },
  lobby_answer(uid, a) {
    const i = invites.find((x) => x.id === a.p_invite && x.to === uid);
    if (!i || i.status !== 'pending') E('CONVITE_VENCIDO');
    if (!a.p_accept) { i.status = 'declined'; return { ok: false }; }
    const l = lobbies[i.lobby], s = add(l, uid);
    i.status = 'accepted';
    return { id: l.id, code: l.code, slot: s };
  },
  lobby_state(uid, a) {
    const l = lobbies[a.p_lobby];
    if (!l || l.state === 'closed') return { state: 'closed' };
    const me = l.members.find((m) => m.uid === uid);
    if (!me) return { state: 'closed', kicked: true };
    me.seen = Date.now();
    const sig = l.signals.filter((s) => s.to === me.slot);
    l.signals = l.signals.filter((s) => s.to !== me.slot);
    return { id: l.id, code: l.code, secret: l.secret, state: l.state, map: l.map, camp: l.camp, seed: l.seed, gen: l.gen, max: 3, me: me.slot,
      members: l.members.map((m) => ({ slot: m.slot, name: U[m.uid].name, ready: m.ready, me: m.uid === uid, friend: areFriends(uid, m.uid), look: U[m.uid].look, eq: U[m.uid].eq, level: U[m.uid].level, best: U[m.uid].stats.best_wave, kills: U[m.uid].stats.kills, lag: 0 })),
      signals: sig.map((s) => ({ from: s.from, kind: s.kind, body: s.body })) };
  },
  lobby_update(uid, a) { const l = lobbies[a.p_lobby]; if (!l || l.host !== uid || l.state !== 'open') E('SO_ANFITRIAO'); l.map = a.p_map; l.camp = a.p_camp | 0; l.members.forEach((m) => m.ready = m.slot === 0); return 'OK'; },
  lobby_ready(uid, a) { const l = lobbies[a.p_lobby], m = l && l.members.find((x) => x.uid === uid); if (!m) E('FORA_DA_SALA'); m.ready = !!a.p_ready; return 'OK'; },
  lobby_start(uid, a) {
    const l = lobbies[a.p_lobby];
    if (!l || l.host !== uid || l.state !== 'open') E('SO_ANFITRIAO');
    if (l.members.length < 2) E('SALA_SOZINHO');
    if (l.members.some((m) => !m.ready)) E('FALTA_PRONTO');
    l.state = 'playing'; l.gen++; l.seed = a.p_seed;
    return l.gen;
  },
  lobby_end(uid, a) { const l = lobbies[a.p_lobby]; if (l && l.host === uid && l.state === 'playing') { l.state = 'open'; l.members.forEach((m) => m.ready = m.slot === 0); } return 'OK'; },
  lobby_leave(uid, a) { const l = lobbies[a.p_lobby]; if (!l) return 'OK'; if (l.host === uid) { l.state = 'closed'; l.members = []; } else l.members = l.members.filter((m) => m.uid !== uid); return 'OK'; },
  lobby_kick(uid, a) { const l = lobbies[a.p_lobby]; if (!l || l.host !== uid) E('SO_ANFITRIAO'); l.members = l.members.filter((m) => m.slot !== a.p_slot || m.slot === 0); return 'OK'; },
  lobby_signal(uid, a) {
    const l = lobbies[a.p_lobby], me = l && l.members.find((m) => m.uid === uid);
    if (!me) E('FORA_DA_SALA');
    if (a.p_to === me.slot || !l.members.some((m) => m.slot === a.p_to)) E('SEM_DESTINO');
    l.signals.push({ from: me.slot, to: a.p_to, kind: a.p_kind, body: a.p_body });
    return 'OK';
  }
};
function leaveAll(uid) {
  for (const l of Object.values(lobbies)) {
    if (l.state === 'closed' || !l.members.some((m) => m.uid === uid)) continue;
    if (l.host === uid) { l.state = 'closed'; l.members = []; } else l.members = l.members.filter((m) => m.uid !== uid);
  }
}
function add(l, uid) {
  const m = l.members.find((x) => x.uid === uid);
  if (m) return m.slot;
  if (l.state === 'playing') E('SALA_JOGANDO');
  if (l.members.length >= 3) E('SALA_CHEIA');
  leaveAll(uid);
  const s = [1, 2].find((g) => !l.members.some((x) => x.slot === g));
  l.members.push({ uid, slot: s, ready: false, seen: Date.now() });
  return s;
}
const calls = {};
async function supa(route, uid) {
  const req = route.request(), u = new URL(req.url());
  const J = (b, st = 200) => route.fulfill({ status: st, contentType: 'application/json', body: JSON.stringify(b) });
  if (u.pathname.startsWith('/rest/v1/rpc/')) {
    const fn = u.pathname.slice(13);
    calls[fn] = (calls[fn] || 0) + 1;
    let a = {};
    try { a = JSON.parse(req.postData() || '{}'); } catch (e) {}
    if (RPC[fn]) {
      try { return J(RPC[fn](uid, a)); } catch (e) { return J({ message: e.code || e.message }, 400); }
    }
    return J(null);
  }
  if (u.pathname.startsWith('/rest/v1/profiles')) return J([{ id: 'id-' + uid, name: U[uid].name, show_photo: false }]);
  if (u.pathname.startsWith('/rest/v1/progress')) return J(req.method() === 'GET' ? [] : null);
  if (u.pathname.startsWith('/rest/v1/')) return J([]);
  if (u.pathname.startsWith('/auth/v1/')) return J({});
  if (u.pathname.startsWith('/functions/v1/')) return J({});
  return route.fulfill({ status: 404, body: '' });
}

// ------------------------------------------------------------ Realtime falso
const rtSubs = {};
function rtMock(ws) {
  let topic = null;
  ws.onMessage((raw) => {
    let m;
    try { m = JSON.parse(raw); } catch (e) { return; }
    if (m.event === 'phx_join') {
      topic = m.topic;
      (rtSubs[topic] = rtSubs[topic] || new Set()).add(ws);
      ws.send(JSON.stringify({ topic, event: 'phx_reply', ref: m.ref, payload: { status: 'ok', response: {} } }));
    } else if (m.event === 'heartbeat') ws.send(JSON.stringify({ topic: 'phoenix', event: 'phx_reply', ref: m.ref, payload: { status: 'ok' } }));
    else if (m.event === 'broadcast' && topic) {
      rtCount++;
      for (const o of rtSubs[topic] || []) if (o !== ws) o.send(JSON.stringify({ topic, event: 'broadcast', payload: m.payload }));
    }
  });
  ws.onClose && ws.onClose(() => { if (topic && rtSubs[topic]) rtSubs[topic].delete(ws); });
}
let rtCount = 0;

// ------------------------------------------------------------ páginas
async function player(b, uid, size, mobile) {
  const ctx = await b.newContext({ viewport: size, deviceScaleFactor: 1, hasTouch: !!mobile, isMobile: !!mobile });
  await ctx.addInitScript((v) => { try { localStorage.setItem('qz_terms', JSON.stringify({ v })); } catch (e) {} }, __TV__); // termos já aceitos (v29.12)
  await ctx.addInitScript(([uid, relay]) => {
    try {
      const d = JSON.parse(localStorage.getItem('qz_save') || '{}');
      Object.assign(d, { created: 1, matches: 5, level: 10, tut: 1, tutDone: 1, name: uid.toUpperCase(), won: { adega: 1, lava: 1, quadra: 1, laje: 1 } });
      localStorage.setItem('qz_save', JSON.stringify(d));
      localStorage.setItem('qz_auth', JSON.stringify({ at: 'tok-' + uid, rt: 'r', exp: Date.now() + 864e5 }));
    } catch (e) {}
    try { navigator.serviceWorker && (navigator.serviceWorker.register = () => Promise.reject()); } catch (e) {}
    if (relay) window.RTCPeerConnection = undefined;
  }, [uid, RELAY]);
  await ctx.route('http://localhost/**', (r) => { const u = new URL(r.request().url()); if (u.pathname === '/' || u.pathname === '/index.html') return r.fulfill({ body: html, contentType: 'text/html' }); const f = path.join(ROOT, decodeURIComponent(u.pathname)); return fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ path: f }) : r.fulfill({ status: 404 }); });
  await ctx.route(SUPA + '/**', (r) => supa(r, uid));
  await ctx.routeWebSocket(/realtime\/v1\/websocket/, rtMock);
  const p = await ctx.newPage();
  p.errs = 0;
  p.on('pageerror', (e) => { p.errs++; console.log(uid, 'ERR', e.message, (e.stack || '').split('\n')[1]); });
  p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) console.log(uid, 'console:', m.text().slice(0, 200)); });
  await p.goto('http://localhost/', { waitUntil: 'load' });
  await p.waitForTimeout(2500);
  await p.evaluate(() => { try { TUT.on = 0; TUT.start = () => {}; } catch (e) {} try { UI.show('title'); } catch (e) {} });
  return p;
}

const __TV__ = (/TERMS = \{\s*V: "([^"]+)"/.exec(String(html)) || [])[1] || '';
(async () => {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream'] });
  let bad = 0;
  const ok = (cond, msg) => { console.log((cond ? 'ok  ' : 'FALHOU ') + msg); if (!cond) bad++; };
  const A = await player(b, 'alfa', { width: 1366, height: 768 });
  const B = await player(b, 'bravo', { width: 844, height: 390 }, true);
  const C = THREE ? await player(b, 'charlie', { width: 844, height: 390 }, true) : null;
  const all = [A, B].concat(C ? [C] : []);
  ok(await A.evaluate(() => !$('bOnline').classList.contains('hidden')), 'botão ONLINE aparece com conta');

  // perfil do amigo
  await A.evaluate(() => FRIENDS.show());
  await A.waitForTimeout(800);
  await A.screenshot({ path: `${OUT}/pc-1-amigos.png` });
  await A.evaluate(() => PROFILE.open('Bravo'));
  await A.waitForTimeout(1200);
  await A.screenshot({ path: `${OUT}/pc-2-perfil-amigo.png` });
  const pf = await A.evaluate(() => ({ n: document.querySelectorAll('#poItems .poIt').length, first: (document.querySelector('#poItems .poIt .pp') || {}).textContent, btn: (document.querySelector('#poBtns .btn') || {}).textContent }));
  console.log('perfil', JSON.stringify(pf));
  ok(pf.n >= 3 && pf.btn === 'CHAMAR PRA JOGAR', 'perfil mostra itens e botão de chamar');
  // B abre o perfil no celular (de A)
  await B.evaluate(() => PROFILE.open('Alfa'));
  await B.waitForTimeout(1200);
  await B.screenshot({ path: `${OUT}/celular-2-perfil-amigo.png` });
  await B.evaluate(() => PROFILE.close());

  // A chama B pelo perfil: cria sala e convida
  await A.click('#poBtns .btn');
  await A.waitForTimeout(600);
  await A.evaluate(() => UI.show('lobbyScr'));
  await A.waitForTimeout(1500);
  const code = await A.evaluate(() => $('lbCode').textContent);
  ok(/^[A-Z0-9]{5}$/.test(code), 'sala criada com código ' + code);
  // B recebe a faixa do convite
  await B.evaluate(() => { ONL.st.pingT = 0; });
  await B.waitForFunction(() => !$('onInv').classList.contains('hidden'), null, { timeout: 20000 });
  await B.waitForTimeout(600);
  await B.screenshot({ path: `${OUT}/celular-3-convite.png` });
  await B.click('#onInv button[data-a="y"]');
  await B.waitForFunction(() => ONL.st.L && ONL.st.L.members.length === 2, null, { timeout: 10000 });
  if (C) {
    await C.evaluate((c) => { UI.show('lobbyScr'); ONL.paint(); ONL.join(c); }, code);
    await C.waitForFunction(() => ONL.st.L && ONL.st.L.members.length === 3, null, { timeout: 10000 });
  }
  // conexão: direta (WebRTC) ou pelo servidor
  await wait(RELAY ? 3000 : 6000);
  const net = await A.evaluate(() => Object.values(ONL.st.links).map((l) => l.ok() ? 'direto' : l.via));
  console.log('links do anfitrião', JSON.stringify(net));
  if (!RELAY) ok(net.every((v) => v === 'direto'), 'conexão direta entre os aparelhos');
  // frase rápida e pronto
  await B.evaluate(() => ONL.say(0));
  await B.click('#lbGo');
  if (C) await C.click('#lbGo');
  await A.waitForFunction(() => !$('lbGo').disabled, null, { timeout: 10000 });
  await A.waitForTimeout(300);
  await A.screenshot({ path: `${OUT}/pc-3-sala.png` });
  await B.screenshot({ path: `${OUT}/celular-4-sala.png` });
  // anfitrião troca a fase: todo mundo precisa confirmar de novo
  await A.evaluate(() => ONL.setMap(MAPS.findIndex((m) => m.id === 'lava'), 0));
  await wait(2500);
  const r2 = await B.evaluate(() => ({ map: ONL.st.L.map, ready: ONL.st.L.members.find((m) => m.me).ready, txt: $('lbMap').textContent }));
  ok(r2.map === 'lava' && !r2.ready, 'fase trocada chega no convidado e tira o pronto (' + r2.txt + ')');
  await B.click('#lbGo');
  if (C) await C.click('#lbGo');
  await A.waitForFunction(() => !$('lbGo').disabled, null, { timeout: 10000 });
  await A.click('#lbGo');
  // contagem + roleta + partida em todos
  for (const p of all) await p.waitForFunction(() => S.mode === 'play', null, { timeout: 30000 });
  await wait(1500);
  const mt = await Promise.all(all.map((p) => p.evaluate(() => ({ role: ONL.st.role, map: M().id, per: S.period, seed: S.matchSeed, actors: S.players.map((a) => a.kind + ':' + a.name), bots: S.bots.filter((b) => !b.remote).length }))));
  console.log('partida', JSON.stringify(mt));
  ok(mt.every((m) => m.map === 'lava' && m.seed === mt[0].seed && m.per === mt[0].per), 'mesma fase, semente e horário em todos');
  ok(mt.every((m) => m.bots === 0 && m.actors.length === all.length), 'sem bots: só os jogadores');
  // ninguém morre no teste; começa a onda 3 (o anfitrião manda)
  for (const p of all) await p.evaluate(() => { hurtPlayer = ((h) => function (d, kb) { window.__hits = (window.__hits || 0) + 1; if (window.__god) return; return h(d, kb); })(hurtPlayer); window.__god = 1; });
  await A.evaluate(() => { skipPause(); });
  await wait(600);
  ok(await A.evaluate(() => S.buyPhase.active), 'anfitrião espera os parceiros ficarem prontos');
  for (const p of all.slice(1)) await p.evaluate(() => skipPause());
  await A.waitForFunction(() => S.round >= 1 && !S.buyPhase.active, null, { timeout: 8000 });
  await A.evaluate(() => { startRound(4); S.spawnT = 0; });
  await wait(9000);
  // convidado anda pra direita e atira
  await B.evaluate(() => { S.input.move = 1; });
  await wait(1200);
  await B.evaluate(() => { S.input.move = 0; });
  const kill0 = await B.evaluate(() => S.stats.kills);
  await B.evaluate(() => {
    // mira no zumbi vivo mais perto e atira por 4 s
    window.__aim = setInterval(() => {
      const p = S.player, z = S.zs.filter((q) => q.state !== 'dead' && q.state !== 'out').sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
      if (!z) { S.input.fire = false; return; }
      p.face = Math.sign(z.x - p.x) || 1;
      p.aim = S.input.aimAng = Math.atan2(z.y - z.h * 0.6 - (p.y - 40), z.x - p.x);
      S.input.fire = true;
      const w = curW(); if (w && w.mag <= 1) w.mag = 30;
    }, 50);
  });
  await wait(4500);
  await B.evaluate(() => { clearInterval(window.__aim); S.input.fire = false; });
  await wait(800);
  await A.screenshot({ path: `${OUT}/pc-4-partida-anfitriao.png` });
  await B.screenshot({ path: `${OUT}/celular-5-partida-convidado.png` });
  const sync = await Promise.all(all.map((p) => p.evaluate(() => ({
    role: ONL.st.role, round: S.round, zs: S.zs.filter((z) => z.state !== 'dead').length, nids: S.zs.filter((z) => z.nid).length,
    me: [Math.round(S.player.x), Math.round(S.player.y)], others: S.bots.map((b) => [b.name, Math.round(b.x), Math.round(b.y)]), kills: S.stats.kills, botKills: S.stats.botKills || 0, hits: window.__hits || 0, cash: S.player.cash
  }))));
  console.log('sincronia', JSON.stringify(sync, null, 0));
  const hA = sync[0], hB = sync[1];
  ok(hB.round === hA.round && hA.round >= 4, 'onda igual no convidado (' + hB.round + ')');
  ok(Math.abs(hB.zs - hA.zs) <= 3 && hA.zs > 0, 'mesmos zumbis vivos (anfitrião ' + hA.zs + ', convidado ' + hB.zs + ')');
  const bOnA = hA.others.find((o) => o[0] === 'BRAVO');
  ok(bOnA && Math.abs(bOnA[1] - hB.me[0]) < 40, 'anfitrião vê o convidado onde ele está (' + (bOnA && bOnA[1]) + ' x ' + hB.me[0] + ')');
  const aOnB = hB.others.find((o) => o[0] === 'ALFA');
  ok(aOnB && Math.abs(aOnB[1] - hA.me[0]) < 40, 'convidado vê o anfitrião');
  ok(hB.cash > 500, 'tiros do convidado acertam e dão grana pra ele (R$' + hB.cash + ')');
  // dano do convidado chega no zumbi do anfitrião
  const tz = await B.evaluate(() => { const z = S.zs.find((q) => q.nid && q.state !== 'dead' && q.hp > 80); return z ? z.nid : 0; });
  const hp0 = await A.evaluate((n) => { const z = S.zs.find((q) => q.nid === n); return z ? z.hp : -1; }, tz);
  await B.evaluate((n) => { const z = S.zs.find((q) => q.nid === n); hurtZ(z, 40, false, 'gun', 1); }, tz);
  await wait(500);
  const hp1 = await A.evaluate((n) => { const z = S.zs.find((q) => q.nid === n); return z ? z.hp : -1; }, tz);
  ok(hp0 - hp1 > 39 && hp0 - hp1 < 41.5, 'dano do convidado chega no zumbi do anfitrião (' + Math.round(hp0) + ' -> ' + Math.round(hp1) + ')');
  // abate do convidado: conta pra ele e o zumbi morre no anfitrião
  const k0 = await B.evaluate(() => S.stats.kills), bk0 = await A.evaluate(() => S.stats.botKills || 0);
  await B.evaluate((n) => { const z = S.zs.find((q) => q.nid === n); hurtZ(z, 1e6, true, 'gun', 1); }, tz);
  await wait(600);
  const k1 = await B.evaluate(() => S.stats.kills), dz = await A.evaluate((n) => { const z = S.zs.find((q) => q.nid === n); return !z || z.state === 'dead'; }, tz), bk1 = await A.evaluate(() => S.stats.botKills || 0);
  ok(k1 === k0 + 1, 'abate do convidado conta pra ele (' + k0 + ' -> ' + k1 + ')');
  ok(dz && bk1 === bk0 + 1, 'zumbi morre no anfitrião e não conta como abate do anfitrião');
  if (C) { const dc = await C.evaluate((n) => { const z = S.zs.find((q) => q.nid === n); return !z || z.state === 'dead'; }, tz); ok(dc, 'terceiro jogador vê o zumbi morrer'); }
  // golpe de zumbi no boneco do convidado (no anfitrião) chega no aparelho do convidado
  const h0 = await B.evaluate(() => window.__hits || 0);
  await A.evaluate(() => { const b = S.bots[0]; b.iT = 0; hurtActor(b, 5, 0); });
  await wait(700);
  const h1 = await B.evaluate(() => window.__hits || 0);
  ok(h1 > h0, 'golpe no boneco do convidado chega nele (' + h0 + ' -> ' + h1 + ')');
  // convidado cai: anfitrião levanta
  await B.evaluate(() => { window.__god = 0; S.player.iT = 0; S.player.revive = 0; S.secondUsed = true; S.reviveUsed = true; S.player.armor = 0; hurtPlayer(9999); window.__god = 1; });
  await wait(800);
  const dB = await B.evaluate(() => ({ down: S.player.down, dead: S.player.dead }));
  ok(dB.down > 0 && !dB.dead, 'convidado cai (não morre) com parceiro de pé');
  const seen = await A.evaluate(() => { const b = S.bots.find((x) => x.name === 'BRAVO'); return b && b.down; });
  ok(seen > 0, 'anfitrião vê o convidado caído');
  await A.evaluate(() => { const b = S.bots.find((x) => x.name === 'BRAVO'); S.player.x = b.x + 6; S.player.y = b.y; S.player.gy = b.gy; S.player.plat = b.plat || null; for (const z of S.zs) if (z.state !== 'dead') z.hp = 1e9, z.spd = 0; });
  await A.evaluate(() => { window.__rev = setInterval(() => { const it = nearInteract(); if (it && it.k === 'revive') doInteract(it, true, 0.05); }, 50); });
  await wait(4500);
  await A.evaluate(() => clearInterval(window.__rev));
  await wait(600);
  const up = await B.evaluate(() => ({ down: S.player.down, hp: S.player.hp }));
  ok(!(up.down > 0) && up.hp > 0, 'anfitrião levantou o convidado pela rede');
  await A.screenshot({ path: `${OUT}/pc-5-depois-de-levantar.png` });
  // fim: todo mundo cai de vez
  for (const p of all) await p.evaluate(() => { window.__god = 0; S.player.iT = 0; S.player.revive = 0; S.secondUsed = true; S.reviveUsed = true; S.player.armor = 0; for (const z of S.zs) z.spd = 30; });
  for (const p of all) await p.evaluate(() => { hurtPlayer(9999); S.player.down = 0.05; });
  for (const p of all) await p.waitForFunction(() => S.mode === 'over', null, { timeout: 25000 }).catch(() => {});
  const end = await Promise.all(all.map((p) => p.evaluate(() => ({ mode: S.mode, again: $('bAgain').textContent }))));
  console.log('fim', JSON.stringify(end));
  ok(end.every((e) => e.mode === 'over'), 'partida acaba pra todos quando ninguém fica de pé');
  await B.screenshot({ path: `${OUT}/celular-6-fim.png` });
  // voltar pra sala
  for (const p of all) await p.evaluate(() => $('bAgain').click());
  await wait(3500);
  const back = await Promise.all(all.map((p) => p.evaluate(() => ({ scr: !$('lobbyScr').classList.contains('hidden'), state: ONL.st.L && ONL.st.L.state }))));
  console.log('sala de novo', JSON.stringify(back));
  ok(back.every((x) => x.scr && x.state === 'open'), 'todos voltam pra sala aberta');
  console.log('chamadas', JSON.stringify(calls), 'realtime msgs', rtCount);
  for (const p of all) ok(p.errs === 0, 'sem erro de página');
  await b.close();
  console.log(bad ? bad + ' FALHAS' : 'TUDO OK');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
