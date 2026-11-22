// v29: trava a tela deitada durante a partida. O iPhone não deixa o site travar a rotação (screen.orientation.lock
// não existe no Safari e o "orientation" do manifest é ignorado), então: se o celular for para em pé no meio da
// partida, o jogo inteiro é girado por CSS de volta para o lado em que estava deitado e a partida segue sem cortar.
// O toque é convertido para o sistema girado (sticks, mira livre, botões funcionam sozinhos pelo navegador).
// No menu continua o aviso "GIRA O CELULAR". No Android o lock de verdade (tela cheia) segue sendo tentado.
// Uso: node tools/patches/v29-trava-tela.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

// ---------- CSS ----------
rep(`@media (orientation:portrait) and (pointer:coarse){#rotate{display:flex}}`,
`@media (orientation:portrait) and (pointer:coarse){#rotate{display:flex}}
/* v29: partida travada deitada mesmo com o celular em pé (ver ROTL) */
body.rotL{position:fixed!important;top:0;left:0;transform-origin:0 0;overflow:hidden}
body.rotL.r90{transform:rotate(90deg) translateY(-100%)}
body.rotL.r270{transform:rotate(-90deg) translateX(-100%)}
body.rotL #rotate{display:none!important}`);

// ---------- JS: estado e conversão de coordenadas ----------
rep(`const VIEW = { sc: 1, ch: 1, off: 0, maxOff: 0, set: null };
function resize() {
  const r = cv.parentNode.getBoundingClientRect(), cw = r.width || innerWidth, ch = r.height || innerHeight,`,
`const VIEW = { sc: 1, ch: 1, off: 0, maxOff: 0, set: null };
// v29: trava deitada. a = 90 ou -90 enquanto o corpo da página está girado; last = último lado deitado visto.
const ROTL = { a: 0, last: 90 };
function rotlAng() {
  if (typeof window.orientation === "number") return window.orientation;
  const o = screen.orientation;
  if (o && typeof o.angle === "number") return o.angle === 270 ? -90 : o.angle;
  return innerWidth > innerHeight ? 90 : 0;
}
function rotlApply() {
  const b = document.body;
  if (!b) return;
  const land = innerWidth > innerHeight;
  if (land) {
    const a = rotlAng();
    if (a === 90 || a === -90) ROTL.last = a;
  }
  const want = !land && b.classList.contains("playing") && matchMedia("(pointer:coarse)").matches ? ROTL.last : 0;
  if (want === ROTL.a) return;
  ROTL.a = want;
  b.classList.toggle("rotL", !!want);
  b.classList.toggle("r90", want === 90);
  b.classList.toggle("r270", want === -90);
  b.style.width = want ? innerHeight + "px" : "";
  b.style.height = want ? innerWidth + "px" : "";
  try {
    sticksReset();
  } catch (e) {
  }
  try {
    HUDL.apply && HUDL.apply();
  } catch (e) {
  }
}
// largura/altura da área do jogo (girada ou não)
function LW() {
  return ROTL.a ? innerHeight : innerWidth;
}
function LH() {
  return ROTL.a ? innerWidth : innerHeight;
}
// ponto da tela (clientX/Y) -> ponto na área do jogo
function rotPt(x, y) {
  if (!ROTL.a) return [x, y];
  return ROTL.a === 90 ? [y, innerWidth - x] : [innerHeight - y, x];
}
// retângulo de um elemento na área do jogo
function rectL(el) {
  const r = el.getBoundingClientRect();
  if (!ROTL.a) return r;
  const [x0, y0] = rotPt(r.left, r.top), [x1, y1] = rotPt(r.right, r.bottom), left = Math.min(x0, x1), top = Math.min(y0, y1), w = Math.abs(x1 - x0), h = Math.abs(y1 - y0);
  return { left, top, width: w, height: h, right: left + w, bottom: top + h };
}
function resize() {
  rotlApply();
  const r = ROTL.a ? { width: cv.parentNode.offsetWidth, height: cv.parentNode.offsetHeight } : cv.parentNode.getBoundingClientRect(), cw = r.width || LW(), ch = r.height || LH(),`);

// entrar/sair da partida muda a trava
rep(`  document.body.classList.add("playing");
  resize();
  S.shopBuys = {};`, `  document.body.classList.add("playing");
  resize();
  S.shopBuys = {};`); // (resize já chama rotlApply)
rep(`  document.body.classList.remove("playing");
  resize();`, `  document.body.classList.remove("playing");
  resize();`);

// ---------- toque ----------
rep(`function calibrate(x, y, el) {
  if (!el || !el.getBoundingClientRect) return;`, `function calibrate(x, y, el) {
  if (!el || !el.getBoundingClientRect || ROTL.a) return;`);
rep(`function mapPt(x, y) {
  if (!CAL.rot) return [x, y];`, `function mapPt(x, y) {
  if (!CAL.rot || ROTL.a) return [x, y];`);
rep(`function stickGeom(s) {
  const b = s.el.getBoundingClientRect();`, `function stickGeom(s) {
  const b = rectL(s.el);`);
rep(`    if (CAL.rot) [dx, dy] = rotA(dx, dy);`, `    if (CAL.rot && !ROTL.a) [dx, dy] = rotA(dx, dy);`);
rep(`function tcDown(id, x, y, target) {
  S.input.touch = true;`, `function tcDown(id, x, y, target) {
  [x, y] = rotPt(x, y);
  S.input.touch = true;`);
rep(`side = mx < innerWidth * 0.5 ? "L" : "R"`, `side = mx < LW() * 0.5 ? "L" : "R"`);
rep(`  const ok = s.el.getBoundingClientRect().width > 0,`, `  const ok = rectL(s.el).width > 0,`);
rep(`  s.rel = !(d <= R * 1.4) || !!CAL.rot;`, `  s.rel = !(d <= R * 1.4) || !!(CAL.rot && !ROTL.a);`);
rep(`function tcMove(id, x, y) {
  const P_ = S.input.ptr;`, `function tcMove(id, x, y) {
  [x, y] = rotPt(x, y);
  const P_ = S.input.ptr;`);
// mira livre e mouse: canvas em coordenadas da área do jogo
rep(`function toLow(cx_, cy_) {
  const r = cv.getBoundingClientRect();`, `function toLow(cx_, cy_) {
  const r = rectL(cv);`);
// layout salvo do HUD: posições em fração da área do jogo
rep(`      const r = e.getBoundingClientRect();
      if (!r.width) continue;
      out[id] = { x: (r.left + r.width / 2) / innerWidth, y: (r.top + r.height / 2) / innerHeight, s: 1, o: 1 };`,
`      const r = rectL(e);
      if (!r.width) continue;
      out[id] = { x: (r.left + r.width / 2) / LW(), y: (r.top + r.height / 2) / LH(), s: 1, o: 1 };`);
rep(`    st.setProperty("left", Math.round(v.x * innerWidth) + "px", imp);
    st.setProperty("top", Math.round(v.y * innerHeight) + "px", imp);`,
`    st.setProperty("left", Math.round(v.x * LW()) + "px", imp);
    st.setProperty("top", Math.round(v.y * LH()) + "px", imp);`);

fs.writeFileSync(F, s);
console.log('ok v29-trava-tela');
