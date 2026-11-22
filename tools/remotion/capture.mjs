// Grava trechos de partidas de verdade (o bot de tools/video/bot.js jogando) em cada quebrada, só o canvas do
// jogo, sem HUD, para o vídeo de fundo do menu. Saída: tools/remotion/public/clips/<mapa>.webm (não vai pro git).
// Uso: node tools/remotion/capture.mjs [segundos=12] [mapa ...]
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
// o Playwright vem instalado globalmente (ou no projeto); require acha os dois
const { chromium } = createRequire(import.meta.url)("playwright");
const ROOT = path.resolve(HERE, "../..");
const OUT = path.join(HERE, "public/clips");
fs.mkdirSync(OUT, { recursive: true });
const SECS = +process.argv[2] || 12;
const ONLY = process.argv.slice(3);
// onda e período de cada quebrada: ondas altas = mais zumbi na tela; períodos variados para o vídeo não ficar todo escuro
const PLAN = {
  adega: { wave: 6, period: "noite" },
  lava: { wave: 8, period: "tarde" },
  quadra: { wave: 9, period: "dia" },
  laje: { wave: 10, period: "noite" },
  cristo: { wave: 11, period: "tarde" },
  copa: { wave: 12, period: "dia" },
  lapa: { wave: 13, period: "noite" },
};
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mp3": "audio/mpeg", ".png": "image/png", ".webp": "image/webp", ".json": "application/json", ".webmanifest": "application/manifest+json" };

const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, serviceWorkers: "block" });
// a trava de domínio do jogo só libera localhost: serve os arquivos do repo como se fosse http://localhost/
await ctx.route("http://localhost/**", (route) => {
  let p = decodeURIComponent(new URL(route.request().url()).pathname);
  if (p === "/") p = "/index.html";
  const f = path.join(ROOT, p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f)) return route.fulfill({ status: 404, body: "404" });
  route.fulfill({ status: 200, body: fs.readFileSync(f), headers: { "content-type": TYPES[path.extname(f)] || "application/octet-stream" } });
});
// nada de rede de verdade (Supabase, fontes externas): o jogo cai no modo offline
await ctx.route(/^https?:\/\/(?!localhost\/)/, (r) => r.abort());
const page = await ctx.newPage();
page.on("pageerror", (e) => console.warn("pageerror", e.message));
await page.addInitScript(() => {
  try {
    const d = JSON.parse(localStorage.getItem("qz_save") || "{}");
    localStorage.setItem("qz_save", JSON.stringify(Object.assign(d, { created: 1, tutDone: 1 })));
  } catch (e) {}
});
await page.goto("http://localhost/");
await page.waitForFunction(() => typeof S !== "undefined" && typeof MAPS !== "undefined" && typeof startGame === "function", null, { timeout: 60000 });
await page.waitForTimeout(2500);
await page.addScriptTag({ url: "http://localhost/tools/video/bot.js" });
const maps = await page.evaluate(() => {
  SAVE.d.created = 1; SAVE.d.tutDone = 1;
  try { setQuality("alta"); } catch (e) {}
  return MAPS.map((m, i) => ({ i, id: m.id, name: m.name }));
});
console.log("mapas:", maps.map((m) => m.i + ":" + m.id).join(" "));

const seen = new Set();
for (const m of maps) {
  if (seen.has(m.id) || !PLAN[m.id] || (ONLY.length && !ONLY.includes(m.id))) continue;
  seen.add(m.id);
  const g = PLAN[m.id];
  const b64 = await page.evaluate(async ({ mi, wave, period, ms }) => {
    const Q = window.QZV;
    // arma boa para a onda, sem morrer no meio do trecho
    await Q.go(mi, wave, (p) => { p.maxHp = Math.max(p.maxHp, 400); }, { preferShort: 0 });
    try { S.period = period; } catch (e) {}
    // espera a horda chegar na tela
    const t9 = performance.now();
    while (performance.now() - t9 < 9000) {
      const n = S.zs.filter((z) => z.state === "in" && Math.abs(z.x - S.cam.x - VW / 2) < VW / 2).length;
      if (n >= 4 && performance.now() - t9 > 1500) break;
      await Q.wait(100);
    }
    $("hud").classList.add("hidden");
    $("touch").classList.add("hidden");
    const gc = document.querySelector("#gameWrap canvas") || document.querySelector("canvas#c") || document.querySelector("canvas");
    // copia o canvas do jogo para 1280x720 sem suavizar (pixel art nítida) e grava
    const big = document.createElement("canvas"); big.width = 1280; big.height = 720;
    const bx = big.getContext("2d");
    let on = 1;
    (function f() {
      if (!on) return;
      bx.imageSmoothingEnabled = false;
      bx.fillStyle = "#000"; bx.fillRect(0, 0, 1280, 720);
      const r = gc.getBoundingClientRect(), sx = 1280 / innerWidth, sy = 720 / innerHeight;
      bx.drawImage(gc, r.left * sx, r.top * sy, r.width * sx, r.height * sy);
      for (const id of ["vignette", "flash"]) {
        const el = document.getElementById(id);
        if (el && !el.classList.contains("hidden")) { const o = +getComputedStyle(el).opacity || 0; if (o > 0.01 && id === "flash") { bx.globalAlpha = o; bx.fillStyle = getComputedStyle(el).backgroundColor; bx.fillRect(0, 0, 1280, 720); bx.globalAlpha = 1; } }
      }
      requestAnimationFrame(f);
    })();
    const st = big.captureStream(30);
    const mr = new MediaRecorder(st, { mimeType: "video/webm;codecs=vp9", videoBitsPerSecond: 8e6 }), ch = [];
    mr.ondataavailable = (e) => e.data.size && ch.push(e.data);
    mr.start(500);
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      await Q.wait(200);
      const p = S.player;
      if (p) p.hp = Math.max(p.hp, p.maxHp * 0.6);
    }
    await new Promise((ok) => { mr.onstop = ok; mr.stop(); });
    on = 0;
    Q.bot(false);
    const bl = new Blob(ch, { type: "video/webm" });
    const buf = new Uint8Array(await bl.arrayBuffer());
    let s = "";
    for (let i = 0; i < buf.length; i += 32768) s += String.fromCharCode.apply(null, buf.subarray(i, i + 32768));
    return btoa(s);
  }, { mi: m.i, wave: g.wave, period: g.period, ms: SECS * 1000 });
  const f = path.join(OUT, m.id + ".webm");
  fs.writeFileSync(f, Buffer.from(b64, "base64"));
  console.log("gravado", m.id, (fs.statSync(f).size / 1e6).toFixed(1) + " MB");
}
await browser.close();
