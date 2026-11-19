// site v28.5: iOS no lugar de iPhone, ranking com carrossel por quebrada, pódio com foto e opção de foto na conta.
// Uso: node tools/patches/site-v28.5-ranking.js site-repo/index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const r = (a, b) => { const n = s.split(a).length - 1; if (n < 1) throw new Error('miss ' + a.slice(0, 60)); s = s.split(a).join(b); };
r('Grátis no navegador do PC, iPhone e Android.', 'Grátis no navegador do PC, Android e iOS.');
r('no navegador, no PC, iPhone e Android.', 'no navegador, no PC, Android e iOS.');
r('<h3>iPhone</h3>', '<h3>iOS</h3>');
r('</style>', `.rkNav{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.rkNav>button{background:var(--card);color:#fff;border:1px solid var(--line);border-radius:10px;width:40px;height:40px;font-size:20px;cursor:pointer;flex:0 0 auto}
.rkTabs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;flex:1}
.rkTabs::-webkit-scrollbar,.rkTrack::-webkit-scrollbar{display:none}
.rkTabs button{background:var(--card);color:#fff;border:1px solid var(--line);border-radius:10px;padding:8px 12px;font-family:"Pixelify Sans";font-size:15px;white-space:nowrap;cursor:pointer}
.rkTabs button.on{border-color:var(--gold);color:var(--gold)}
.rkTrack{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;border-radius:16px}
.rkSlide{flex:0 0 100%;scroll-snap-align:center;box-sizing:border-box;border:1px solid var(--line);border-radius:16px;overflow:hidden;background:var(--card)}
.rkHero{position:relative;padding:22px 14px 0;background-size:cover;background-position:center;min-height:250px}
.rkHero::before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(13,10,20,.55),rgba(13,10,20,.94) 85%)}
.rkHero h3{position:relative;font-family:"Pixelify Sans";margin:0 0 30px;font-size:24px;text-align:center;text-shadow:2px 2px 0 #000}
.pod{position:relative;display:grid;grid-template-columns:1fr 1.2fr 1fr;align-items:end;gap:10px;max-width:640px;margin:0 auto}
.pd{display:flex;flex-direction:column;align-items:center;text-align:center;gap:4px;min-width:0;position:relative}
.pd .av{width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid var(--pc);box-shadow:0 0 22px var(--pc),0 0 0 3px #000;background:#2a2638;display:flex;align-items:center;justify-content:center;font:700 28px "Pixelify Sans";color:#fff}
.pd.p1 .av{width:100px;height:100px;animation:glow 2.4s ease-in-out infinite}
.pd .nm{font-family:"Pixelify Sans";font-size:18px;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pd .st{font-size:13px;color:#cfc8dd}
.pd .bl{width:100%;border-radius:10px 10px 0 0;background:linear-gradient(180deg,var(--pc),rgba(0,0,0,.35));display:flex;justify-content:center;padding-top:6px;font:700 30px "Pixelify Sans";color:#140d00;box-shadow:inset 0 2px 0 rgba(255,255,255,.45)}
.pd.p1{--pc:#ffc21a}.pd.p2{--pc:#c8d0dc}.pd.p3{--pc:#d0803a}
.pd.p1 .bl{height:86px}.pd.p2 .bl{height:62px}.pd.p3 .bl{height:44px}
.pd.p1::before{content:"\\2605";position:absolute;top:-28px;color:#ffc21a;font-size:26px;text-shadow:0 0 12px #ffc21a}
.pd.me .nm{color:#7dff6a}
@keyframes glow{50%{box-shadow:0 0 36px var(--pc),0 0 0 3px #000}}
.rkRest{padding:8px 14px 14px}
.rkRest .r{display:grid;grid-template-columns:42px 34px minmax(0,1fr) 70px 80px 60px;gap:8px;align-items:center;padding:8px 4px;border-bottom:1px solid var(--line)}
.rkRest .r.me{background:rgba(125,255,106,.1)}
.rkRest .r b{color:var(--gold)}
.rkRest .a{width:30px;height:30px;border-radius:50%;object-fit:cover;background:#2a2638;display:flex;align-items:center;justify-content:center;font-size:13px}
.rkDots{display:flex;justify-content:center;gap:7px;padding:10px}
.rkDots i{width:8px;height:8px;border-radius:50%;background:var(--line)}.rkDots i.on{background:var(--gold)}
@media (max-width:560px){.pd .av{width:54px;height:54px}.pd.p1 .av{width:72px;height:72px}.pd .nm{font-size:15px}.rkRest .r{grid-template-columns:34px 30px minmax(0,1fr) 56px 64px;font-size:14px}.rkRest .r span:last-child{display:none}}
</style>`);
r(`  <div class="row" style="margin-bottom:12px"><label for="rkMap" class="muted">Quebrada</label><select id="rkMap"></select></div>
  <div class="card"><table><thead><tr><th>#</th><th>Nome</th><th>Onda</th><th>Abates</th><th>Tempo</th></tr></thead><tbody id="rkBody"><tr><td colspan="5" class="muted">Carregando...</td></tr></tbody></table></div>`,
`  <div class="rkNav"><button id="rkPrev" aria-label="Quebrada anterior">&lsaquo;</button><div class="rkTabs" id="rkTabs"></div><button id="rkNext" aria-label="Próxima quebrada">&rsaquo;</button></div>
  <div class="rkTrack" id="rkTrack"></div>
  <div class="rkDots" id="rkDots"></div>`);
const a0 = s.indexOf('  $("rkMap").innerHTML'), a1 = s.indexOf('  rank();\n') + '  rank();\n'.length;
if (a0 < 0 || a1 < a0) throw new Error('rank js');
s = s.slice(0, a0) + `  function av(r, c) {
    var ini = esc(String(r.name || "?").charAt(0).toUpperCase());
    return r.photo && /^https:\\/\\//.test(r.photo) ? '<img class="' + c + '" src="' + esc(r.photo) + '" referrerpolicy="no-referrer" loading="lazy" alt="">' : '<span class="' + c + '">' + ini + "</span>";
  }
  function pod(a) {
    var top = a.filter(function (r) { return r.pos <= 3; });
    function p(r, n) { return r ? '<div class="pd p' + n + (r.me ? " me" : "") + '">' + av(r, "av") + '<span class="nm">' + esc(r.name) + '</span><span class="st">onda ' + r.best_wave + " · " + fmt(r.best_kills) + ' abates</span><div class="bl">' + n + "</div></div>"
      : '<div class="pd p' + n + '"><span class="av">?</span><span class="nm">—</span><span class="st">vaga aberta</span><div class="bl">' + n + "</div></div>"; }
    return '<div class="pod">' + p(top[1], 2) + p(top[0], 1) + p(top[2], 3) + "</div>";
  }
  var seen = {}, cur = 0, tr = $("rkTrack");
  tr.innerHTML = MAPS.map(function (m, i) { return '<div class="rkSlide"><div class="rkHero" style="background-image:url(img/' + m[3] + '.webp)"><h3>' + esc(m[1]) + '</h3><div id="pd' + i + '">' + pod([]) + '</div></div><div class="rkRest" id="rr' + i + '"><p class="muted">Carregando...</p></div></div>'; }).join("");
  $("rkTabs").innerHTML = MAPS.map(function (m, i) { return '<button data-i="' + i + '">' + esc(m[1]) + "</button>"; }).join("");
  $("rkDots").innerHTML = MAPS.map(function () { return "<i></i>"; }).join("");
  function load(i) {
    if (seen[i]) return;
    seen[i] = 1;
    var q = { p_map: MAPS[i][0], p_limit: 20 };
    rpc("get_leaderboard", q, !!ses).catch(function () { return rpc("get_leaderboard", q, false); }).then(function (a) {
      a = a || [];
      $("pd" + i).innerHTML = pod(a);
      var rest = a.filter(function (r) { return r.pos > 3; });
      $("rr" + i).innerHTML = !a.length ? '<p class="muted">Ninguém no ranking desta quebrada ainda. Seja o primeiro.</p>' : !rest.length ? '<p class="muted">Só tem gente no pódio por enquanto. Do 4º lugar pra baixo aparece aqui.</p>' :
        rest.map(function (r) { return '<div class="r' + (r.me ? " me" : "") + '"><b>' + r.pos + "º</b>" + av(r, "a") + "<span>" + esc(r.name) + "</span><span>onda " + r.best_wave + "</span><span>" + fmt(r.best_kills) + " abates</span><span>" + mmss(r.best_seconds) + "</span></div>"; }).join("");
    }).catch(function () { seen[i] = 0; $("rr" + i).innerHTML = '<p class="muted">Não deu para carregar o ranking agora.</p>'; });
  }
  function mark(i) {
    cur = i;
    [].forEach.call($("rkTabs").children, function (b, k) { b.classList.toggle("on", k === i); if (k === i) $("rkTabs").scrollTo({ left: b.offsetLeft - $("rkTabs").clientWidth / 2 + b.clientWidth / 2, behavior: "smooth" }); });
    [].forEach.call($("rkDots").children, function (d, k) { d.classList.toggle("on", k === i); });
    load(i);
  }
  function go(i) { i = (i + MAPS.length) % MAPS.length; tr.scrollTo({ left: i * tr.clientWidth, behavior: "smooth" }); mark(i); }
  $("rkTabs").onclick = function (e) { var b = e.target.closest("button"); if (b) go(+b.dataset.i); };
  $("rkPrev").onclick = function () { go(cur - 1); };
  $("rkNext").onclick = function () { go(cur + 1); };
  var tmo = 0;
  tr.onscroll = function () { clearTimeout(tmo); tmo = setTimeout(function () { var i = Math.round(tr.scrollLeft / Math.max(1, tr.clientWidth)); if (i !== cur) mark(i); }, 90); };
  mark(0);
` + s.slice(a1);
r(`      call("/rest/v1/profiles?select=name,created_at&limit=1", null, true),`, `      call("/rest/v1/profiles?select=name,created_at,show_photo&limit=1", null, true),`);
r(`'<div class="row" style="margin-top:16px"><a class="btn" href="/game/">▶ JOGAR</a>`, `'<label class="row" style="margin-top:14px;gap:8px;cursor:pointer"><input type="checkbox" id="cPhoto"' + (p.show_photo !== false ? " checked" : "") + '> Mostrar a foto da minha conta Google no ranking</label>' +
        '<div class="row" style="margin-top:16px"><a class="btn" href="/game/">▶ JOGAR</a>`);
r(`      $("bOut").onclick = logout;
      $("bDel").onclick = del;`, `      $("bOut").onclick = logout;
      $("bDel").onclick = del;
      $("cPhoto").onchange = function () { var on = this.checked, el = this; rpc("set_show_photo", { p_on: on }, true).then(function () { seen = {}; mark(cur); }).catch(function () { el.checked = !on; alert("Não deu para salvar agora."); }); };`);
fs.writeFileSync(F, s);
console.log('ok');
