// Renderiza o trailer de divulgação.
// Antes: node tools/trailer/capture.mjs (cenas) e python3 tools/trailer/sfx.py tools/remotion/public/trailer/sfx (efeitos)
// Uso: node render-trailer.mjs [h|v|ambos] [saida-dir]   ·  falas do ElevenLabs em public/trailer/vo/vo01.mp3 ... (opcional)
//      node render-trailer.mjs stills   -> quadros de conferência em out/stills
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(HERE, "../trailer/out");
const PUB = path.join(HERE, "public/trailer");
const ff = (...a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a], { stdio: "inherit" });
// 1) gravações webm -> mp4 30 fps com quadro-chave a cada 6 (o Remotion busca rápido); som em AAC
for (const f of fs.readdirSync(SRC).filter((f) => /^s\d\d.*\.webm$/.test(f))) {
  const mp4 = path.join(PUB, "clips", f.replace(/\.webm$/, ".mp4"));
  if (fs.existsSync(mp4) && fs.statSync(mp4).mtimeMs > fs.statSync(path.join(SRC, f)).mtimeMs) continue;
  ff("-i", path.join(SRC, f), "-r", "30", "-c:v", "libx264", "-crf", "12", "-preset", "fast", "-g", "6", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", mp4);
  console.log("clip", f);
}
const vo = fs.existsSync(path.join(PUB, "vo")) ? fs.readdirSync(path.join(PUB, "vo")).filter((f) => /^vo\d\d\.mp3$/.test(f)).map((f) => f.slice(0, 4)).sort() : [];
const voDur = Object.fromEntries(vo.map((id) => [id, +execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.join(PUB, "vo", id + ".mp3")]).toString().trim()]));
console.log("falas:", vo.length ? vo.join(" ") : "nenhuma (só textos)");
const mode = process.argv[2] || "h";
const outDir = process.argv[3] || path.join(HERE, "out");
fs.mkdirSync(outDir, { recursive: true });
const browserExecutable = ["/opt/pw-browsers/chromium_headless_shell"].find((p) => fs.existsSync(p)) || null;
const serveUrl = await bundle({ entryPoint: path.join(HERE, "src/index.ts") });
if (mode === "stills") {
  const at = (process.argv[3] || "1,6,13,18,23,29,35,41,46,49,52,55,58,60,62,64,66,68,70,74,79,82,86,90,94,99,104").split(",").map(Number);
  for (const id of ["Trailer", "TrailerVertical"]) {
    const composition = await selectComposition({ serveUrl, id, inputProps: { vertical: id !== "Trailer", vo, voDur }, browserExecutable });
    fs.mkdirSync(path.join(HERE, "out/stills"), { recursive: true });
    for (const s of at) await renderStill({ serveUrl, composition, frame: Math.round(s * 30), output: path.join(HERE, `out/stills/${id}-${String(s).padStart(3, "0")}.png`), inputProps: { vertical: id !== "Trailer", vo, voDur }, browserExecutable, scale: id === "Trailer" ? 0.5 : 0.4 });
    console.log("stills", id);
  }
  process.exit(0);
}
for (const id of mode === "ambos" ? ["Trailer", "TrailerVertical"] : [mode === "v" ? "TrailerVertical" : "Trailer"]) {
  const inputProps = { vertical: id !== "Trailer", vo, voDur };
  const composition = await selectComposition({ serveUrl, id, inputProps, browserExecutable });
  const out = path.join(outDir, id === "Trailer" ? "quebrada-z-trailer-16x9.mp4" : "quebrada-z-trailer-9x16.mp4");
  const t0 = Date.now();
  await renderMedia({
    serveUrl, composition, inputProps, codec: "h264", crf: 17, audioBitrate: "256k", outputLocation: out, browserExecutable,
    concurrency: Math.max(2, Math.min(8, (await import("node:os")).cpus().length)), x264Preset: "slow", pixelFormat: "yuv420p",
    onProgress: ({ progress }) => process.stdout.write(`\r${id} ${(progress * 100) | 0}%   `),
  });
  console.log(`\n${out} ${(fs.statSync(out).size / 1e6).toFixed(1)} MB em ${((Date.now() - t0) / 1000) | 0}s`);
}
