// v29.11: co-op online — sala com código, convite de amigo, perfil do jogador e partida com gente de verdade (sem bots).
//
// O que muda:
//  - Menu: botão ONLINE (com conta). A sala ("rádio da quebrada") mostra os personagens de quem entrou, o código
//    de 5 letras (qualquer jogador logado entra com ele), amigos on com CHAMAR, campanha e fase (o anfitrião escolhe),
//    PRONTO de cada um, frases rápidas e a contagem antes da roleta do horário (mesma semente para todos).
//  - Convite chega como faixa "RÁDIO DA QUEBRADA · FULANO tá te chamando" no menu, com ENTRAR / AGORA NÃO.
//  - AMIGOS: bolinha verde de quem está on agora; tocar no amigo abre o perfil dele (personagem, estatísticas,
//    melhores quebradas e itens mais raros com % de jogadores que têm e chance de sair no baú) e CHAMAR PRA JOGAR.
//  - Partida online: sem bots. Os parceiros são S.bots com kind "remote" (bonecos movidos pela rede); o anfitrião
//    manda nos zumbis, ondas e barricadas; cada um manda no próprio personagem, na própria grana e nas compras.
//    Caiu de vez: assiste a tropa e volta na próxima onda; acaba quando ninguém fica de pé.
// Módulo: tools/patches/v29.11-online-modulo.js (ONL e PROFILE). Servidor: supabase/migrations/v29_11_coop_online.sql
// Uso: node tools/patches/v29.11-coop-online.js index.html
const fs = require('fs');
const path = require('path');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 90));
  s = s.split(a).join(b);
};

// ---------------------------------------------------------------- CSS
rep('#bFriends{position:relative}', `/* v29.11: co-op online */
#lobbyScr{padding:0;overflow:hidden;background:#07050c}
#lobbyScr .lbBg{position:absolute;inset:0;background-size:cover;background-position:center;image-rendering:pixelated;animation:mzKen 16s ease-in-out infinite alternate;filter:saturate(.85)}
#lobbyScr .lbShade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(7,5,12,.95) 0%,rgba(7,5,12,.86) 52%,rgba(7,5,12,.55) 100%)}
#lobbyScr .lbShade::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(255,255,255,.025) 0 1px,transparent 1px 3px);pointer-events:none}
.lbWrap{position:relative;display:flex;flex-direction:column;gap:6px;width:min(1040px,100%);height:100%;box-sizing:border-box;padding:max(8px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left));margin:0 auto;overflow:auto}
.lbHead{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
.lbTitle{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}.lbTitle small{color:#7dff3a;letter-spacing:2px;font-size:12px}
.lbTitle b{font-size:clamp(24px,4vw,36px);color:#ffd84a;letter-spacing:6px;text-shadow:3px 3px 0 #3a2400}
.lbTitle .btn{padding:5px 9px;font-size:12px}
.lbMain{display:grid;grid-template-columns:minmax(0,1fr) minmax(200px,280px);gap:12px;min-height:0}
.lbLeft{display:flex;flex-direction:column;gap:6px;min-width:0}
.lbMapBox small{color:#7dff3a;letter-spacing:2px;font-size:11px}.lbMapBox b{display:block;font-size:clamp(20px,3.4vw,30px);color:#ff9a3c;line-height:1;text-shadow:3px 3px 0 #3a1a00}
.lbMapBox p{margin:4px 0 0;color:#d8d2c4;font-size:13px;line-height:1.3;max-width:60ch;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.lbRow{display:flex;align-items:center;gap:8px;margin:2px 0}
.lbChips{display:flex;gap:5px;flex-wrap:wrap}
.lbChip{font-family:var(--fz);font-size:12px;padding:5px 9px;background:#17141e;border:2px solid #000;box-shadow:inset 0 0 0 1px #3a3446;color:#e8e4d8;min-height:32px}
.lbChip.sel{border-color:#ff9a3c;color:#ffd84a;box-shadow:inset 0 0 0 1px #ffd9a8,0 0 10px rgba(255,154,60,.35)}
.lbChip.lock,.lbChip:disabled{opacity:.45}
.lbNote{margin:0;color:#9a93a8;font-size:12px}
.lbSlots{display:flex;gap:8px;align-items:stretch;min-height:150px}
.lbSlot{position:relative;flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;padding:6px 6px 8px;background:linear-gradient(180deg,rgba(23,20,30,.35),rgba(23,20,30,.92));border:2px solid #000;box-shadow:inset 0 0 0 1px #3a3446,inset 0 -3px 0 var(--pc);cursor:pointer;text-align:center}
.lbSlot.me{box-shadow:inset 0 0 0 1px var(--pc),inset 0 -3px 0 var(--pc),0 0 14px rgba(255,216,74,.15)}
.lbSlot.empty{cursor:default;justify-content:center;opacity:.7;border-style:dashed}
.lbSlot.empty b{color:#9a93a8}.lbSlot b{font-family:var(--fy);color:var(--pc);font-size:14px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.lbSlot small{color:#c9c2d4;font-size:11px}
.lbChar{width:80px;height:128px;image-rendering:pixelated;animation:lbBob 2.4s ease-in-out infinite}
.lbSlot:nth-child(2) .lbChar{animation-delay:-.8s}.lbSlot:nth-child(3) .lbChar{animation-delay:-1.6s}
@keyframes lbBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
.lbRdy{font-style:normal;font-family:var(--fz);font-size:11px;padding:2px 7px;background:#2a2638;color:#9a93a8;border:1px solid #000}
.lbRdy.on{background:#2a6a1a;color:#d8ffc8;box-shadow:0 0 10px rgba(125,255,106,.45)}
.lbNet{font-style:normal;font-size:10px;color:#7a7488;letter-spacing:1px}
.lbKick{position:absolute;top:4px;right:4px;font-size:10px;padding:2px 5px;background:#3a1418;color:#ffb0a8;border:1px solid #000}
.lbBub{position:absolute;top:8px;left:50%;transform:translateX(-50%);background:#f4f0e4;color:#120e1a;font-family:var(--fz);font-size:12px;padding:3px 7px;border:2px solid #000;white-space:nowrap;opacity:0;pointer-events:none}
.lbBub.pop{animation:lbPop 2.6s ease-out forwards}
@keyframes lbPop{0%{opacity:0;transform:translate(-50%,6px)}8%{opacity:1;transform:translate(-50%,0)}85%{opacity:1}100%{opacity:0}}
.lbSay{display:flex;gap:5px;flex-wrap:wrap}.lbSay button{font-family:var(--fz);font-size:11px;padding:4px 8px;background:#1d1a26;border:2px solid #000;color:#e8e4d8;min-height:30px}
.lbFoot{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.lbMsg{margin:0;min-height:0}.lbMsg:empty{display:none}.lbFoot .btn{min-width:170px}
.lbSide{display:flex;flex-direction:column;gap:4px;min-width:0}
.lbFriends{display:flex;flex-direction:column;gap:3px;max-height:44vh;overflow:auto}.lbFriends p{font-size:12px;color:#9a93a8;margin:2px 0}
.lbF{display:grid;grid-template-columns:10px minmax(0,1fr) auto;gap:6px;align-items:center;padding:4px;background:rgba(23,20,30,.75);border:1px solid #2a2638}
.lbF i{width:8px;height:8px;border-radius:50%;background:#4a4458}.lbF.on i{background:#7dff6a;box-shadow:0 0 6px #7dff6a}
.lbF span{font-family:var(--fy);color:#fff;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.lbF span small{display:block;font-family:inherit;color:#9a93a8;font-size:11px}
.lbF .btn{padding:4px 8px;font-size:11px}.lbF em{font-style:normal;font-size:10px;color:#7dff6a}
.lbSide .fdAdd input{text-transform:uppercase;letter-spacing:3px;flex:1 1 90px}
.lbHub{display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:14px;background:rgba(23,20,30,.8);border:2px solid #000;box-shadow:inset 0 0 0 1px #3a3446;flex:1}
.lbHub p{margin:0;color:#e8e4d8;font-size:14px;line-height:1.35;max-width:52ch}.lbHub .btn{min-width:180px}
#lbCount{position:fixed;inset:0;z-index:60;display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(7,5,12,.78);pointer-events:none}
#lbCount.hidden{display:none}#lbCount b{font-size:min(28vh,160px);color:#ffd84a;text-shadow:6px 6px 0 #3a2400;animation:lbNum .8s ease-out}
#lbCount small{font-family:var(--fz);color:#7dff3a;letter-spacing:3px;font-size:14px}
@keyframes lbNum{from{transform:scale(1.6);opacity:0}to{transform:none;opacity:1}}
#onInv{position:fixed;left:50%;top:max(10px,env(safe-area-inset-top));transform:translateX(-50%);z-index:55;display:flex;align-items:center;gap:10px;padding:8px 10px;background:#120e1a;border:2px solid #000;box-shadow:inset 0 0 0 1px #ff9a3c,0 6px 22px rgba(0,0,0,.6);max-width:calc(100% - 32px);animation:onIn .35s ease-out}
#onInv.hidden{display:none}#onInv div{min-width:0}#onInv small{display:block;color:#7dff3a;font-size:10px;letter-spacing:2px}#onInv b{display:block;color:#ffd84a;font-family:var(--fy);font-size:15px}#onInv span{display:block;color:#d8d2c4;font-size:12px}
#onInv .btn{padding:6px 10px;font-size:12px;white-space:nowrap}
.onRadio{width:26px;height:26px;flex:none;background:radial-gradient(circle at 50% 60%,#ff9a3c 0 4px,transparent 5px),repeating-radial-gradient(circle at 50% 60%,transparent 0 6px,rgba(255,154,60,.6) 7px 8px);animation:onPulse 1.2s ease-in-out infinite}
@keyframes onPulse{50%{opacity:.5}}@keyframes onIn{from{transform:translate(-50%,-20px);opacity:0}}
#onToast{position:fixed;left:50%;bottom:max(14px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:56;background:#120e1a;color:#ffd84a;border:2px solid #000;box-shadow:inset 0 0 0 1px #3a3446;padding:8px 12px;font-family:var(--fz);font-size:13px;max-width:calc(100% - 32px);text-align:center}
#onToast.hidden{display:none}
#pfOther{position:fixed;inset:0;z-index:50;display:flex;align-items:center;justify-content:center;background:rgba(7,5,12,.82);padding:max(10px,env(safe-area-inset-top)) 16px max(10px,env(safe-area-inset-bottom))}
#pfOther.hidden{display:none}
.poCard{position:relative;width:min(760px,100%);max-height:100%;overflow:auto;background:#120e1a;border:2px solid #000;box-shadow:inset 0 0 0 1px #3a3446,0 10px 40px rgba(0,0,0,.6);padding:12px;box-sizing:border-box}
.poX{position:absolute;top:8px;right:8px}
.poWait{color:#c9c2d4;font-size:13px}
.poHero{display:flex;gap:12px;align-items:flex-end}
.poChar canvas{width:120px;height:192px;image-rendering:pixelated;display:block}
.poChar{flex:none;background:radial-gradient(ellipse at 50% 92%,rgba(255,154,60,.25),transparent 60%)}
.poId{display:flex;flex-direction:column;gap:3px;min-width:0;padding-bottom:6px}.poId b{font-size:clamp(22px,4vw,32px);color:#ffd84a;text-shadow:3px 3px 0 #3a2400;overflow:hidden;text-overflow:ellipsis}
.poId span{color:#e8e4d8;font-size:13px}.poId small{color:#9a93a8;font-size:12px}
.poOn{display:inline-block;width:8px;height:8px;border-radius:50%;background:#7dff6a;box-shadow:0 0 6px #7dff6a;margin-right:5px}
.poBtns{display:flex;gap:6px;margin-top:6px;flex-wrap:wrap}
.poGrid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:10px}
.poSt{background:#1b1724;border:1px solid #2a2638;padding:6px;text-align:center}.poSt b{display:block;color:#fff;font-family:var(--fy);font-size:16px}.poSt small{color:#9a93a8;font-size:11px}
.poSec{font-family:var(--fy);color:var(--gold);font-size:13px;letter-spacing:1px;margin:12px 0 5px}.poSec small{font-family:inherit;color:#7a7488;font-size:11px;letter-spacing:0;margin-left:6px}
.poMaps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px}.poMaps li{display:flex;gap:8px;align-items:baseline;background:#1b1724;padding:5px 7px;font-size:12px;color:#c9c2d4}.poMaps b{color:#ff9a3c}.poMaps span{flex:1;color:#fff}
.poItems{display:flex;gap:8px;overflow-x:auto;padding-bottom:6px;scroll-snap-type:x mandatory}
.poIt{flex:none;width:118px;scroll-snap-align:start;display:flex;flex-direction:column;align-items:center;gap:2px;padding:7px 6px;background:#1b1724;border:2px solid #000;box-shadow:inset 0 0 0 1px var(--rc,#3a3446);text-align:center;--rc:#5a5468}
.poIt.r2{--rc:#b05ae0}.poIt.r3{--rc:#ffb02a;background:linear-gradient(180deg,#2a1d0e,#1b1724)}
.poIt canvas{width:64px;height:64px;image-rendering:pixelated}
.poIt i{font-style:normal;font-family:var(--fz);font-size:10px;padding:1px 5px;background:var(--rc);color:#120e1a}
.poIt b{color:#fff;font-size:12px;line-height:1.15;min-height:28px;display:flex;align-items:center}
.poIt .pp{font-family:var(--fy);color:var(--rc);font-size:20px;line-height:1}.poIt small{color:#9a93a8;font-size:10px}.poIt em{font-style:normal;color:#ffd84a;font-size:10px}
.fdRow .nm.pk{cursor:pointer}.fdRow .nm.pk:hover{color:var(--gold)}
#onSay{position:absolute;left:max(16px,env(safe-area-inset-left));top:calc(max(8px,env(safe-area-inset-top)) + 124px);z-index:6;display:flex;flex-direction:column;gap:4px;align-items:flex-start;pointer-events:auto}
#onSay.hidden{display:none}#onSay>button{width:38px;height:38px;background:#120e1a;border:2px solid #000;box-shadow:inset 0 0 0 1px #ff9a3c;color:#ffd84a;font-family:var(--fz);font-size:11px}
#onSayL{display:flex;flex-direction:column;gap:3px}#onSayL.hidden{display:none}#onSayL button{font-family:var(--fz);font-size:11px;padding:6px 8px;background:#120e1a;border:2px solid #000;color:#fff}
@media (max-width:760px){.lbMain{grid-template-columns:minmax(0,1fr)}.lbSide{order:2}.lbFriends{max-height:none}}
@media (max-height:430px){.lbChar{width:48px;height:77px}.lbSlots{min-height:0}.lbMapBox p{display:none}.lbMapBox b{font-size:20px}.lbWrap{gap:4px}.lbSlot{padding:4px 4px 5px}.lbSlot small{font-size:10px}.lbChip{min-height:28px;padding:3px 7px;font-size:11px}.lbFoot .btn{min-width:150px;padding-top:6px;padding-bottom:6px}.poChar canvas{width:90px;height:144px}.poGrid{grid-template-columns:repeat(8,minmax(0,1fr))}.poSt b{font-size:13px}}
@media (max-width:520px){.poGrid{grid-template-columns:repeat(2,minmax(0,1fr))}.poMaps{grid-template-columns:minmax(0,1fr)}}
@media (prefers-reduced-motion:reduce){#lobbyScr .lbBg,.lbChar,.onRadio{animation:none}}
#bFriends{position:relative}`);

// ---------------------------------------------------------------- HTML
rep('<button class="btn alt yo hidden" id="bFriends">AMIGOS<i class="fdBadge hidden" id="fdBadge">0</i></button>',
  '<button class="btn alt yo hidden" id="bFriends">AMIGOS<i class="fdBadge hidden" id="fdBadge">0</i></button><button class="btn alt yo hidden" id="bOnline">ONLINE</button>');
rep('<div id="friendScr" class="screen shadeFull hidden">',
  `<div id="lobbyScr" class="screen hidden">
  <div class="lbBg" id="lbBg"></div><div class="lbShade"></div>
  <div class="lbWrap">
    <div class="lbHead"><div class="lbTitle"><small class="yo">RÁDIO DA QUEBRADA · SALA</small><b class="yo" id="lbCode">·····</b><button class="btn alt yo" id="lbCopy">COPIAR CÓDIGO</button></div><button class="btn alt yo" id="lbBack">SAIR DA SALA</button></div>
    <div class="lbMain">
      <div class="lbLeft">
        <div class="lbMapBox"><small id="lbCamp">HELL DE JANEIRO</small><b class="yo" id="lbMap">ADEGA</b><p id="lbLore"></p></div>
        <div id="lbPick"><div class="lbRow"><span class="mzK">CAMPANHA</span><div id="lbCamps" class="lbChips"></div></div><div class="lbRow"><span class="mzK">FASE</span><div id="lbMaps" class="lbChips"></div></div></div>
        <p id="lbHostNote" class="lbNote hidden">O anfitrião escolhe a campanha e a fase. O horário sai na roleta, igual para todos.</p>
        <div class="lbSlots" id="lbSlots"></div>
        <p class="mzDiff" id="lbDiff"></p>
        <p class="segNote lbMsg" id="lbMsg"></p>
        <div class="lbFoot"><button class="btn yo" id="lbGo">TÔ PRONTO</button><div class="lbSay" id="lbSay"></div></div>
      </div>
      <div class="lbSide">
        <div class="fdSec">CHAMAR AMIGO</div><div id="lbFriends" class="lbFriends"></div>
        <div class="fdSec">ENTRAR COM CÓDIGO</div><div class="fdAdd"><input id="lbIn" type="text" maxlength="5" autocomplete="off" spellcheck="false" placeholder="CÓDIGO" aria-label="Código da sala"><button class="btn yo" id="lbJoin">ENTRAR</button></div>
        <p class="lbNote">Qualquer jogador com conta entra pelo código. Convite pelo nome é só para amigos.</p>
      </div>
    </div>
  </div>
</div>
<div id="lbCount" class="hidden" aria-live="assertive"></div>
<div id="onInv" class="hidden" role="alert"></div>
<div id="onToast" class="hidden" role="status"></div>
<div id="pfOther" class="hidden" role="dialog" aria-modal="true" aria-label="Perfil do jogador"><div class="poCard"><button class="btn alt yo poX" id="poX">FECHAR</button><div id="poBody"></div></div></div>
<div id="friendScr" class="screen shadeFull hidden">`);
rep('<div class="selHead"><div class="h2 yo"><small>SUA TROPA</small>AMIGOS</div><button class="btn alt yo" id="bFriendsBack">VOLTAR</button></div>',
  '<div class="selHead"><div class="h2 yo"><small>SUA TROPA</small>AMIGOS</div><div class="row" style="gap:6px"><button class="btn yo" id="bFdOnline">SALA ONLINE</button><button class="btn alt yo" id="bFriendsBack">VOLTAR</button></div></div>');
// frases rápidas na partida
rep('<div id="hud" class="layer hidden">', '<div id="hud" class="layer hidden">\n  <div id="onSay" class="hidden"><button id="onSayB" aria-label="Frases rápidas">RÁDIO</button><div id="onSayL" class="hidden"></div></div>');
rep('"rankScr", "ecoScr", "feedScr", "friendScr"]) $(s).classList.toggle(', '"rankScr", "ecoScr", "feedScr", "friendScr", "lobbyScr"]) $(s).classList.toggle(');
rep('    if (id === "title") { TITLE.refresh(); try { NOTIF.badge(); } catch (e) {} }',
  '    if (id === "title") { TITLE.refresh(); try { NOTIF.badge(); } catch (e) {} }\n    try { ONL.banner(); } catch (e) {}');

// ---------------------------------------------------------------- erros do servidor
rep('const ACCT_ERR = {\n', `const ACCT_ERR = {
  SALA_NAO_ENCONTRADA: "Nenhuma sala aberta com esse código.",
  SALA_CHEIA: "A sala já está cheia (3 jogadores).",
  SALA_JOGANDO: "Essa sala já está no meio de uma partida. Espera acabar.",
  SALA_FECHADA: "Essa sala fechou.",
  SALA_SOZINHO: "Precisa de mais alguém na sala.",
  FALTA_PRONTO: "Espera todo mundo ficar pronto.",
  SO_ANFITRIAO: "Só o anfitrião pode fazer isso.",
  FORA_DA_SALA: "Você não está mais nessa sala.",
  NAO_E_AMIGO: "Chamado pelo nome é só para amigos. Passe o código da sala.",
  JA_NA_SALA: "Essa pessoa já está na sala.",
  MUITOS_CONVITES: "Muitos chamados seguidos. Espera um pouco.",
  CONVITE_VENCIDO: "Esse chamado venceu.",
  PERFIL_FECHADO: "Só dá pra ver o perfil de amigos ou de quem está na sua sala.",
  MAPA_INVALIDO: "Fase inválida.",
`);

// ---------------------------------------------------------------- NET: token e endereço para o Realtime
rep('    fromHash,\n    rpc,\n', '    fromHash,\n    rpc,\n    URL, KEY,\n    token: () => fresh().then((v) => v.at),\n');

// ---------------------------------------------------------------- COOP: parceiros da rede
rep(`  function look(i) {
    const B = BOTS[i];
    if (LK[B.id]) return LK[B.id];
    if (typeof rigBuildSheet !== "function" || typeof RIG_ANIMS === "undefined") return null;
    const L = rigNormLook(B.look), E = rigNormEq(B.eq);
    const c = { sheets: {}, img: {}, L, E, key: "bot:" + B.id, pending: Object.keys(RIG_ANIMS).map((n) => [n, 0]) };`,
`  function look(i) {
    const B = BOTS[i];
    return lookAs(B.id, B.look, B.eq);
  }
  // v29.11: o mesmo visual para qualquer boneco (bot ou parceiro online): id, visual e roupas no formato do rig
  function lookAs(id, lk, eq) {
    if (LK[id]) return LK[id];
    if (typeof rigBuildSheet !== "function" || typeof RIG_ANIMS === "undefined") return null;
    const L = rigNormLook(lk), E = rigNormEq(eq);
    const c = { sheets: {}, img: {}, L, E, key: "bot:" + id, pending: Object.keys(RIG_ANIMS).map((n) => [n, 0]) };`);
rep(`    LK[B.id] = c;
    if (!pumping) { pumping = 1; setTimeout(pump, 0); }`, `    LK[id] = c;
    if (!pumping) { pumping = 1; setTimeout(pump, 0); }`);
rep(`    if (attract) return;
    const n = getWant();`, `    if (attract) return;
    // v29.11: partida online não tem bot: os parceiros são gente de verdade
    if (ONL.live()) {
      S.bots = ONL.puppets();
      S.players.push(...S.bots);
      ONL.begin();
      return;
    }
    const n = getWant();`);
rep(`  function round(n2) {
    if (!bots().length || !S.player) return;
    for (const b of bots()) {`, `  function round(n2) {
    if (!bots().length || !S.player) return;
    for (const b of bots()) {
      if (b.remote) continue;`);
rep(`  function hurt(b, d, kb) {
    if (b.out`, `  function hurt(b, d, kb) {
    if (b.remote) return ONL.hurtRemote(b, d, kb);
    if (b.out`);
rep(`  function revStep(t, dt, who) {
    if (!(t.down > 0)) return;`, `  function revStep(t, dt, who) {
    if (!(t.down > 0)) return;
    if (t.remote) return ONL.revOut(t, dt, who);`);
rep(`  function tickBot(b, dt) {
    const p = S.player, K = C();`, `  function tickBot(b, dt) {
    if (b.remote) return ONL.tickRemote(b, dt);
    const p = S.player, K = C();`);
rep('drawTxt(g, a.name, a.x - textW(a.name) / 2, ty, "#9ad8ff", "#000");', 'drawTxt(g, a.name, a.x - textW(a.name) / 2, ty, a.col || "#9ad8ff", "#000");');
rep('openMap, closeMap, prepare, want: getWant, setWant, standing, look };\n})();',
  'openMap, closeMap, prepare, want: getWant, setWant, standing, look, lookAs };\n})();\n' + fs.readFileSync(path.join(__dirname, 'v29.11-online-modulo.js'), 'utf8'));

// ---------------------------------------------------------------- zumbis: numerados no anfitrião, acerto do convidado vai pela rede
rep(`  z.maxHp = z.hp;
  S.zs.push(z);
  return z;`, `  z.maxHp = z.hp;
  S.zs.push(z);
  ONL.zNew(z);
  return z;`);
rep(`function hurtZ(z, dmg, head, src, dirx = 0, hx = z.x, hy = z.y - 30) {
  if (z.state === "dead") return;`, `function hurtZ(z, dmg, head, src, dirx = 0, hx = z.x, hy = z.y - 30) {
  if (z.state === "dead") return;
  if (z.nid) ONL.hitOut(z, dmg, head, src, dirx, hx, hy);`);
rep(`function killZ(z, head, src) {`, `function killZ(z, head, src) {
  if (z.nid) ONL.killOut(z, head, src);`);

// ---------------------------------------------------------------- laço da partida
rep(`    COOP.update(dt);
    if (!S.player.dead) updateRounds(dt);`, `    COOP.update(dt);
    if (ONL.guest()) ONL.guestRounds(dt);
    else if (!S.player.dead || ONL.anyUp()) updateRounds(dt);`);
rep(`  if (S.mode === "play") {
    updatePlayer(dt);`, `  if (S.mode === "play" || S.mode === "pause" && ONL.live()) {
    updatePlayer(dt);`);
rep(`  for (const z of S.zs) updateZ(z, dt);`, `  if (ONL.guest()) for (const z of S.zs) ONL.zTick(z, dt);
  else for (const z of S.zs) updateZ(z, dt);`);
rep(`    const L = S.zs.filter((z) => z.state === "in" && z.onGround);`, `    const L = ONL.guest() ? [] : S.zs.filter((z) => z.state === "in" && z.onGround);`);
rep(`  if (S.player) {
    const p = S.player, I = S.input, A = CONFIG.aim,`, `  if (S.player) {
    const p = ONL.camP() || S.player, I = S.input, A = CONFIG.aim,`);
rep(`    if (p.deadT > 2.6 && S.mode === "play") UI.over();`, `    if (p.deadT > 2.6 && S.mode === "play" && !ONL.keepWatching()) UI.over();`);
rep(`  if (S.bossLvl && !S.bossSpawned && S.player && !S.player.dead) {`, `  if (S.bossLvl && !S.bossSpawned && S.player && (!S.player.dead || ONL.anyUp())) {`);
rep(`  COOP.round(n2);
  if (n2 === CONFIG.shop.firstWave`, `  COOP.round(n2);
  ONL.round(n2);
  if (n2 === CONFIG.shop.firstWave`);
rep(`function roundCleared() {
  const sp = S.special;`, `function roundCleared() {
  const sp = S.special;
  ONL.cleared();`);
rep(`  if (S.stall) S.stall.target = 1;
  UI.pauseStart();
}`, `  if (S.stall) S.stall.target = 1;
  UI.pauseStart();
  ONL.paused();
}`);
rep(`function skipPause() {
  if (!S.buyPhase.active || S.wait) return;`, `function skipPause() {
  if (!S.buyPhase.active || S.wait) return;
  if (!ONL.skipOk()) return;`);
rep(`      b.planks += k;
      p.repT = 0.55`, `      b.planks += k;
      ONL.barFix(b, k);
      p.repT = 0.55`);
rep(`  over(win) {
    if (S.mode !== "play") return;
    S.mode = "over";`, `  over(win) {
    if (S.mode !== "play") return;
    S.mode = "over";
    ONL.over(win);`);
rep(`    else if (S.mode === "play" || S.mode === "over") update(dt);`, `    else if (S.mode === "play" || S.mode === "over" || S.mode === "pause" && ONL.live()) update(dt);
    ONL.tick(rdt);`);
rep(`    if (S.mode === "pause" && S.pauseDrawn) {`, `    if (S.mode === "pause" && S.pauseDrawn && !ONL.live()) {`);
rep(`  COOP.drawTags(g);`, `  COOP.drawTags(g);
  ONL.drawSays(g);`);
rep(`function toMenu() {
  labEnd();`, `function toMenu() {
  ONL.quit();
  labEnd();`);
rep(`$("bAgain").onclick = () => {
  $("hud").classList.add("hidden");`, `$("bAgain").onclick = () => {
  if (ONL.inLobby() && ONL.st.match) return ONL.backToLobby();
  $("hud").classList.add("hidden");`);
rep(`  S.matchSeed = (Math.random() * 2147483646 | 0) + 1;
  const per = drawPeriod(S.matchSeed)`, `  S.matchSeed = ONL.seed() || (Math.random() * 2147483646 | 0) + 1;
  const per = drawPeriod(S.matchSeed)`);
// frases rápidas aparecem só no online
rep(`  $("hud").classList.remove("hidden");
  if (TOUCH_DEV) S.input.touch = true;`, `  $("hud").classList.remove("hidden");
  $("onSay").classList.toggle("hidden", !ONL.live());
  $("onSayL").classList.add("hidden");
  if (TOUCH_DEV) S.input.touch = true;`);

// ---------------------------------------------------------------- menu, amigos, sala
rep('  $("bFriends").classList.toggle("hidden", !NET.logged);', '  $("bFriends").classList.toggle("hidden", !NET.logged);\n  $("bOnline").classList.toggle("hidden", !NET.logged);');
rep(`  load() {
    $("fdList").innerHTML = "<p>Carregando...</p>";
    return NET.rpc("get_friends", {}).then((a) => { FRIENDS.list = a || []; FRIENDS.draw(); }`, `  on: {},
  load() {
    $("fdList").innerHTML = "<p>Carregando...</p>";
    // v29.11: quem está on agora (bolinha verde) vem junto
    NET.rpc("friends_online", {}).then((a) => { FRIENDS.on = {}; for (const f of a || []) if (f.online) FRIENDS.on[String(f.name).toLowerCase()] = f.state || "menu"; if (FRIENDS.list.length) FRIENDS.draw(); }, () => {});
    return NET.rpc("get_friends", {}).then((a) => { FRIENDS.list = a || []; FRIENDS.draw(); }`);
rep(`      sub = (f.played_ago_days === 0 ? '<i class="on"></i>' : "") + "recorde onda " + (f.best_wave | 0) + " · " + (f.kills | 0) + " abates · " + FRIENDS.ago(f.played_ago_days);
      ac = b("rm", "DESFAZER", 1);`, `      const on = FRIENDS.on[String(f.name).toLowerCase()];
      sub = (on ? '<i class="on"></i>' + (on === "partida" ? "jogando agora · " : on === "sala" ? "numa sala · " : "on agora · ") : "") + "recorde onda " + (f.best_wave | 0) + " · " + (f.kills | 0) + " abates" + (on ? "" : " · " + FRIENDS.ago(f.played_ago_days));
      ac = b("pf", "PERFIL") + b("cv", "CHAMAR") + b("rm", "DESFAZER", 1);`);
rep(`    return '<div class="fdRow">' + rkAv(f, "ava") + '<div class="nm">' + n + "<small>"`, `    return '<div class="fdRow">' + rkAv(f, "ava") + '<div class="nm' + (f.kind === "amigo" ? ' pk" data-p="' + n : "") + '">' + n + "<small>"`);
rep(`$("fdList").onclick = (e) => {
  const b = e.target.closest("button[data-a]");
  if (!b) return;
  const n = b.dataset.n, a = b.dataset.a;`, `$("fdList").onclick = (e) => {
  const pk = e.target.closest("[data-p]");
  if (pk && !e.target.closest("button")) return PROFILE.open(pk.dataset.p);
  const b = e.target.closest("button[data-a]");
  if (!b) return;
  const n = b.dataset.n, a = b.dataset.a;
  if (a === "pf") return PROFILE.open(n);
  if (a === "cv") { b.disabled = true; b.textContent = "CHAMADO"; ONL.invite(n); setTimeout(() => { if (!$("friendScr").classList.contains("hidden")) UI.show("lobbyScr"), ONL.paint(); }, 500); return; }`);
// fiação da sala (no fim do script, depois do resto da interface)
rep(`$("bAgain").onclick = () => {`, `// ===== v29.11: sala online
$("bOnline").onclick = () => { SFX.swap && SFX.swap(); UI.show("lobbyScr"); if (!ONL.inLobby()) ONL.create(); else ONL.paint(); };
$("bFdOnline").onclick = () => { SFX.swap && SFX.swap(); UI.show("lobbyScr"); if (!ONL.inLobby()) ONL.create(); else ONL.paint(); };
$("lbBack").onclick = () => { ONL.leave(); UI.show("title"); };
$("lbCopy").onclick = () => {
  const c = $("lbCode").textContent;
  try { navigator.clipboard.writeText(c).then(() => ONL.lobbyMsg("Código " + c + " copiado. Manda pro parceiro!"), () => ONL.lobbyMsg("Código da sala: " + c)); } catch (e) { ONL.lobbyMsg("Código da sala: " + c); }
};
$("lbGo").onclick = () => {
  const L = ONL.st.L;
  if (!L) return;
  if (ONL.isHost()) return ONL.start();
  const me = L.members.find((m) => m.me);
  ONL.setReady(!(me && me.ready));
};
$("lbJoin").onclick = () => ONL.join($("lbIn").value);
$("lbIn").onkeydown = (e) => { if (e.key === "Enter") ONL.join($("lbIn").value); };
$("lbFriends").onclick = (e) => { const b = e.target.closest("button[data-n]"); if (b) { b.disabled = true; b.textContent = "CHAMADO"; ONL.invite(b.dataset.n); } };
ONL.SAY.slice(0, 4).forEach((t, i) => {
  const b = document.createElement("button");
  b.textContent = t;
  b.onclick = () => ONL.say(i);
  $("lbSay").append(b);
  const c = b.cloneNode(true);
  c.onclick = () => { ONL.say(i); $("onSayL").classList.add("hidden"); };
  $("onSayL").append(c);
});
$("onSayB").onclick = (e) => { e.stopPropagation(); $("onSayL").classList.toggle("hidden"); };
$("poX").onclick = () => PROFILE.close();
$("pfOther").onclick = (e) => { if (e.target.id === "pfOther") PROFILE.close(); };
addEventListener("keydown", (e) => {
  if (e.code === "Escape" && !$("pfOther").classList.contains("hidden")) { e.preventDefault(); PROFILE.close(); }
  if (ONL.live() && S.mode === "play" && e.code === "KeyT" && !e.repeat) $("onSayL").classList.toggle("hidden");
});
$("bAgain").onclick = () => {`);

// ---------------------------------------------------------------- versão
rep(`const QZ_VERSION='29.10';`, `const QZ_VERSION='29.11';`);
rep(/const QZ_NOTE='[^']*';/.exec(s)[0], `const QZ_NOTE='Co-op online: crie uma sala, chame amigos ou passe o código e joguem juntos (sem bots). Perfil dos amigos com os itens mais raros';`);
fs.writeFileSync(F, s);
const SW = path.join(path.dirname(F), 'sw.js');
let w = fs.readFileSync(SW, 'utf8');
if (!w.includes('const CACHE = "qz-v29.10";')) throw new Error('sw CACHE');
fs.writeFileSync(SW, w.replace('const CACHE = "qz-v29.10";', 'const CACHE = "qz-v29.11";'));
console.log('ok');
