// Base comum das gravações do trailer: abre o jogo de verdade servido como http://localhost/ (trava de domínio),
// sem rede externa (modo offline), com o som do jogo desviado para um MediaStreamDestination (window.__aud).
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, "../..");
export const OUT = path.join(HERE, "out");
fs.mkdirSync(OUT, { recursive: true });
const { chromium } = createRequire(import.meta.url)("playwright");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mp3": "audio/mpeg", ".mp4": "video/mp4", ".webm": "video/webm", ".png": "image/png", ".webp": "image/webp", ".json": "application/json", ".webmanifest": "application/manifest+json" };
export async function open({ w = 1280, h = 720, dsf = 1, save = {}, touch = false } = {}) {
  const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling", "--disable-renderer-backgrounding"] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf, serviceWorkers: "block", hasTouch: touch });
  await ctx.route("http://localhost/**", (route) => {
    let p = decodeURIComponent(new URL(route.request().url()).pathname);
    if (p === "/") p = "/index.html";
    const f = path.join(ROOT, p);
    if (!f.startsWith(ROOT) || !fs.existsSync(f)) return route.fulfill({ status: 404, body: "404" });
    route.fulfill({ status: 200, body: fs.readFileSync(f), headers: { "content-type": TYPES[path.extname(f)] || "application/octet-stream" } });
  });
  await ctx.route(/^https?:\/\/(?!localhost\/)/, (r) => r.abort());
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.warn("pageerror", e.message));
  await page.addInitScript((save) => {
    try {
      const d = JSON.parse(localStorage.getItem("qz_save") || "{}");
      localStorage.setItem("qz_save", JSON.stringify(Object.assign(d, { created: 1, tutDone: 1 }, save)));
    } catch (e) {}
    // som do jogo: tudo que vai para os alto-falantes também vai para window.__aud (gravável)
    const con = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (t, ...r) {
      const out = con.call(this, t, ...r);
      try {
        if (t && t === this.context.destination && this.context.constructor.name === "AudioContext") {
          if (!window.__aud || window.__aud.context !== this.context) window.__aud = this.context.createMediaStreamDestination();
          con.call(this, window.__aud);
        }
      } catch (e) {}
      return out;
    };
  }, save);
  await page.goto("http://localhost/");
  await page.waitForFunction(() => typeof S !== "undefined" && typeof MAPS !== "undefined" && typeof startGame === "function", null, { timeout: 60000 });
  await page.waitForTimeout(2500);
  await page.addScriptTag({ url: "http://localhost/tools/video/bot.js" });
  await page.evaluate(() => { SAVE.d.created = 1; SAVE.d.tutDone = 1; try { setQuality("alta"); } catch (e) {} });
  return { browser, ctx, page };
}
// grava ms milissegundos do canvas do jogo (sem HUD, ou com HUD pintado do DOM) + som, e salva em out/<nome>.webm
export async function rec(page, name, ms, { hud = false, W = 1920, H = 1080, during } = {}) {
  const b64 = await page.evaluate(async ({ ms, hud, W, H, during }) => {
    const big = document.createElement("canvas"); big.width = W; big.height = H;
    const bx = big.getContext("2d");
    let on = 1, frames = 0;
    const gc = hud ? window.QZV.mirror() : (document.querySelector("#gameWrap canvas") || document.querySelector("canvas"));
    (function f() {
      if (!on) return;
      bx.imageSmoothingEnabled = false;
      bx.fillStyle = "#000"; bx.fillRect(0, 0, W, H);
      const sx = W / innerWidth, sy = H / innerHeight;
      if (hud) { bx.imageSmoothingEnabled = true; bx.drawImage(gc, 0, 0, W, H); } else { const r = gc.getBoundingClientRect(); bx.drawImage(gc, r.left * sx, r.top * sy, r.width * sx, r.height * sy); }
      const fl = document.getElementById("flash");
      if (fl && !fl.classList.contains("hidden")) { const o = +getComputedStyle(fl).opacity || 0; if (o > 0.01) { bx.globalAlpha = o; bx.fillStyle = getComputedStyle(fl).backgroundColor; bx.fillRect(0, 0, W, H); bx.globalAlpha = 1; } }
      frames++;
      requestAnimationFrame(f);
    })();
    const st = big.captureStream(30);
    if (window.__aud) for (const tr of window.__aud.stream.getAudioTracks()) st.addTrack(tr);
    const mr = new MediaRecorder(st, { mimeType: "video/webm;codecs=vp9,opus", videoBitsPerSecond: 14e6, audioBitsPerSecond: 160e3 }), ch = [];
    mr.ondataavailable = (e) => e.data.size && ch.push(e.data);
    mr.start(500);
    const t0 = performance.now();
    if (during) await (new Function("return (" + during + ")")())();
    while (performance.now() - t0 < ms) {
      await new Promise((r) => setTimeout(r, 200));
      const p = S.player; if (p && !p.dead) p.hp = Math.max(p.hp, p.maxHp * 0.55);
    }
    await new Promise((ok) => { mr.onstop = ok; mr.stop(); });
    on = 0; if (hud) gc.stop();
    console.log("fps", (frames / (ms / 1000)).toFixed(1));
    const buf = new Uint8Array(await new Blob(ch).arrayBuffer());
    let s = "";
    for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
    return btoa(s);
  }, { ms, hud, W, H, during: during ? during.toString() : null });
  const f = path.join(OUT, name + ".webm");
  fs.writeFileSync(f, Buffer.from(b64, "base64"));
  console.log("gravado", name, (fs.statSync(f).size / 1e6).toFixed(1) + " MB");
  return f;
}
