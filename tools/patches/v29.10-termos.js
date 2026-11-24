// v29.10: termos de uso e proteção legal.
//   - Janela de aceite (#tmOv) antes de entrar no jogo, uma vez por versão dos termos (TERMS.V). Pede duas
//     confirmações: leu e aceita os Termos e a Privacidade; tem 18+ ou autorização do responsável.
//     Fica no aparelho (localStorage qz_terms) e, com login, no servidor (terms_accept, com a hora do servidor).
//   - Links para Termos de Uso e Privacidade no login, em Ajustes e embaixo da vitrine de Z-Coin.
//   - Baú de sorteio só para 18+: o servidor recusa (BAU_SO_ADULTO / IDADE_PENDENTE_BAU) e o jogo explica
//     ou pergunta a idade (a mesma pergunta da primeira compra de Z-Coin, ZLIM.askAge).
// Servidor: supabase/migrations/v29_10_termos.sql. Jogo funciona sem ela (só não grava o aceite no servidor).
// Uso: node tools/patches/v29.10-termos.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

// ---------- CSS
rep('#zhOv.hidden{display:none}',
  '#zhOv.hidden{display:none}\n' +
  '/* v29.10: termos de uso */\n' +
  '#tmOv{position:fixed;inset:0;z-index:90;display:flex;align-items:center;justify-content:center;background:rgba(6,4,12,.92);padding:12px}\n' +
  '#tmOv.hidden{display:none}\n' +
  '#tmOv .tmBox{width:min(560px,100%);max-height:100%;display:flex;flex-direction:column;box-sizing:border-box;background:linear-gradient(#221b31,#141019);border:2px solid #000;box-shadow:inset 0 0 0 2px #5b3a8a,0 0 40px rgba(176,74,255,.35);border-radius:10px;overflow:hidden}\n' +
  '#tmOv .tmHead{padding:12px 14px 4px;font-family:var(--fy);font-size:21px;color:#fff;letter-spacing:1px;text-align:center}\n' +
  '#tmOv .tmBody{overflow-y:auto;padding:0 14px 6px;font:14px/1.4 system-ui,sans-serif;color:#d9d3e6;scrollbar-width:thin;scrollbar-color:#6a3aa8 transparent}\n' +
  '#tmOv .tmBody p{margin:4px 0 8px}#tmOv .tmBody ul{margin:4px 0 8px;padding-left:20px}#tmOv .tmBody li{margin:2px 0}\n' +
  '#tmOv .tmBody b{color:#fff}\n' +
  '#tmOv .tmRead{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:6px 0 10px}\n' +
  '#tmOv .tmRead a,.tmLink{display:inline-flex;align-items:center;min-height:34px;padding:4px 12px;background:#24202d;color:#e9e4d8;border:2px solid #000;box-shadow:inset 0 0 0 1px #4a4458;font:600 14px system-ui,sans-serif;text-decoration:none}\n' +
  '#tmOv label{display:flex;gap:10px;align-items:center;padding:7px 10px;margin:0;font:14px/1.3 system-ui,sans-serif;background:rgba(0,0,0,.28);border:1px solid #3a2f4c;cursor:pointer;color:#fff}\n' +
  '#tmOv label input{width:22px;height:22px;flex:none;margin:0;accent-color:#7dff6a}\n' +
  '#tmOv .tmFoot{padding:8px 14px 12px;display:flex;flex-direction:column;gap:6px;border-top:1px solid #3a2f4c;background:rgba(0,0,0,.18)}\n' +
  '#tmOv .tmFoot .btn{width:100%}#tmOv .tmFoot .btn:disabled{opacity:.35;filter:grayscale(1);cursor:not-allowed}\n' +
  '#tmOv .tmMsg:empty{display:none}#tmOv .tmMsg{text-align:center;font:12px system-ui,sans-serif;color:#ffb0b0}\n' +
  '.tmLegal{margin:8px 0 0;font:12px/1.4 system-ui,sans-serif;color:#b8b0c8;text-align:center}.tmLegal a{color:#7dff6a}\n' +
  '.tmRow{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:8px 0}\n' +
  '.zcLegal{flex-basis:100%;text-align:center;font:12px system-ui,sans-serif}.zcLegal a{color:#cfc4e0}\n' +
  '@media (max-height:500px){#tmOv{padding:6px}#tmOv .tmHead{font-size:18px;padding-top:8px}#tmOv .tmBody{font-size:13px}#tmOv label{padding:5px 8px;font-size:13px}#tmOv label input{width:20px;height:20px}#tmOv .tmFoot{padding:6px 10px 8px;gap:5px}#tmOv .tmFoot .btn{min-height:38px;padding:4px 10px}}');

// ---------- janela de aceite
rep('<div id="zhOv" class="hidden"',
  '<div id="tmOv" class="hidden" role="dialog" aria-modal="true" aria-labelledby="tmT"><div class="tmBox"><div class="tmHead" id="tmT">TERMOS E PRIVACIDADE</div><div class="tmBody">' +
  '<p id="tmLead">Antes de jogar, leia e aceite as regras do Quebrada Z. O mais importante:</p><ul>' +
  '<li>O jogo tem <b>violência e sangue</b> e não é feito para crianças. Menor de 18 só joga com autorização do responsável.</li>' +
  '<li>Moedas, Z-Coin e itens <b>não valem dinheiro</b> e não podem ser vendidos nem passados para outra conta.</li>' +
  '<li>Z-Coin pode ser devolvida em <b>até 7 dias</b> se ainda estiver na carteira. Menor tem limite de gasto e não compra baú de sorteio.</li>' +
  '<li>Trapaça, ofensa e venda de conta dão suspensão ou exclusão.</li>' +
  '<li>Tem epilepsia ou sensibilidade a luz? Ligue <b>Ajustes › Reduzir efeitos</b>.</li>' +
  '<li>Usamos seus dados para salvar o jogo, o ranking, os amigos e as compras. Não vendemos dados e não mostramos anúncios.</li></ul>' +
  '<div class="tmRead"><a href="termos.html" target="_blank" rel="noopener">LER TERMOS DE USO</a><a href="privacidade.html" target="_blank" rel="noopener">LER PRIVACIDADE</a></div>' +
  '</div><div class="tmFoot">' +
  '<label><input type="checkbox" id="tmC1"><span>Li e aceito os <b>Termos de Uso</b> e a <b>Política de Privacidade</b>.</span></label>' +
  '<label><input type="checkbox" id="tmC2"><span>Tenho <b>18 anos ou mais</b>, ou meu pai, mãe ou responsável autorizou e está de acordo.</span></label>' +
  '<p class="tmMsg" id="tmMsg"></p><button class="btn yo" id="tmOk" disabled>ACEITAR E JOGAR</button></div></div></div>\n' +
  '<div id="zhOv" class="hidden"');

// ---------- links no login, em Ajustes e embaixo da vitrine
rep('<p class="segNote" id="loginMsg"></p>',
  '<p class="segNote" id="loginMsg"></p>\n    <p class="tmLegal">Ao entrar você concorda com os <a href="termos.html" target="_blank" rel="noopener">Termos de Uso</a> e a <a href="privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a>.</p>');
rep('<div class="credits">',
  '<div class="tmRow"><a class="tmLink" href="termos.html" target="_blank" rel="noopener">Termos de Uso</a><a class="tmLink" href="privacidade.html" target="_blank" rel="noopener">Privacidade</a><a class="tmLink" href="mailto:amplitudelabb@gmail.com">Atendimento</a></div>\n    <div class="credits">');
rep('<span class="zcMo"></span></div>\'; },',
  '<span class="zcMo"></span><span class="zcLegal"><a href="termos.html#compras" target="_blank" rel="noopener">Regras de compra, limite e devolução</a></span></div>\'; },');

// ---------- baú de sorteio só para 18+
rep('"<small>Sorteio na compra, feito pelo servidor. Faltam para você "',
  '"<small>Sorteio na compra, feito pelo servidor. Só para maiores de 18 anos. Faltam para você "');
rep('      if (/OFERTA_MUDOU|LIMITE_BAU_DIA|TUDO_COLETADO/.test(e && e.message || "")) this.refresh().then(() => this.show("box"));\n    });\n  },',
  '      if (/OFERTA_MUDOU|LIMITE_BAU_DIA|TUDO_COLETADO/.test(e && e.message || "")) this.refresh().then(() => this.show("box"));\n' +
  '      // v29.10: idade ainda não informada -> mesma pergunta da primeira compra de Z-Coin\n' +
  '      if (/IDADE_PENDENTE_BAU/.test(e && e.message || "") && typeof ZLIM !== "undefined") ZLIM.askAge().then((go) => go && UI.toast && UI.toast(ZLIM.info && ZLIM.info.age === "adult" ? "Pronto. Toque em COMPRAR de novo." : ECO_ERR.BAU_SO_ADULTO, "#c86aff"), () => {});\n' +
  '    });\n  },');
rep('Object.assign(ECO_ERR, {',
  'Object.assign(ECO_ERR, { BAU_SO_ADULTO: "Baú com sorteio é só para maiores de 18 anos.", IDADE_PENDENTE_BAU: "Antes, diga sua idade." });\nObject.assign(ECO_ERR, {');

// ---------- aceite
rep('function acctHome() {',
  `// v29.10: aceite dos Termos de Uso e da Privacidade, uma vez por versão (TERMS.V = data da versão em termos.html)
var TERMS = {
  V: "2026-11-24",
  K: "qz_terms",
  get() { try { return JSON.parse(localStorage.getItem(this.K) || "null") || {}; } catch (e) { return {}; } },
  put(o) { try { localStorage.setItem(this.K, JSON.stringify(o)); } catch (e) {} },
  ok() { return this.get().v === this.V; },
  // grava no servidor o aceite feito neste aparelho (uma vez por conta); sem a migração, tenta de novo depois
  sync() {
    const d = this.get();
    if (DEV.on || !NET.logged || d.v !== this.V || !NET.st.profile || d.srv === NET.st.profile.id) return;
    NET.rpc("terms_accept", { p_version: this.V, p_age_ok: true }).then(() => { d.srv = NET.st.profile.id; this.put(d); }, () => {});
  },
  open() {
    return new Promise((res) => {
      const prev = this.get().v;
      $("tmT").textContent = prev ? "TERMOS ATUALIZADOS" : "TERMOS E PRIVACIDADE";
      $("tmLead").textContent = prev ? "As regras do Quebrada Z mudaram. Leia e aceite para continuar. O mais importante:" : "Antes de jogar, leia e aceite as regras do Quebrada Z. O mais importante:";
      $("tmC1").checked = $("tmC2").checked = false;
      $("tmOk").disabled = true;
      $("tmMsg").textContent = "";
      $("tmOv").classList.remove("hidden");
      const upd = () => { $("tmOk").disabled = !($("tmC1").checked && $("tmC2").checked); };
      $("tmC1").onchange = $("tmC2").onchange = upd;
      $("tmOk").onclick = () => {
        if (!($("tmC1").checked && $("tmC2").checked)) return;
        this.put({ v: this.V, at: new Date().toISOString() });
        $("tmOv").classList.add("hidden");
        this.sync();
        res();
      };
    });
  }
};
// teclas do jogo não podem fechar nem atravessar a janela de aceite
addEventListener("keydown", (e) => { if (!$("tmOv").classList.contains("hidden") && e.key !== "Tab" && e.key !== " " && e.key !== "Enter") e.stopPropagation(); }, true);
function acctHome() {
  if (!TERMS.ok()) return TERMS.open().then(acctHome);
  TERMS.sync();`);

// versão
rep("const QZ_VERSION='29.9';", "const QZ_VERSION='29.10';");
s = s.replace(/const QZ_NOTE='[^']*';/, "const QZ_NOTE='Termos de Uso e Política de Privacidade novos, aceite no primeiro acesso e baú de sorteio só para maiores de 18';");
fs.writeFileSync(F, s);
const sw = require('path').join(require('path').dirname(F), 'sw.js');
if (fs.existsSync(sw)) fs.writeFileSync(sw, fs.readFileSync(sw, 'utf8').replace(/qz-v29\.9\b/, 'qz-v29.10'));
console.log('v29.10 termos aplicado');
