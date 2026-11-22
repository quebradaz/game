// Renderiza o fundo animado do menu e gera os arquivos que o jogo usa:
//   media/menu/menu-fundo.mp4  (H.264 960x540, 24 fps, sem som, leve para celular)
//   media/menu/menu-fundo.webm (VP9, mesma coisa, para navegador sem H.264)
// Antes: node tools/remotion/capture.mjs  (grava as partidas em public/clips/*.webm)
// Uso: cd tools/remotion && npm run render:menu
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, ensureBrowser } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const CLIPS = path.join(HERE, "public/clips");
const OUT = path.join(ROOT, "media/menu");
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.join(HERE, "out"), { recursive: true });
const ff = (...a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a], { stdio: "inherit" });

// 1) gravações do navegador (webm sem índice) -> mp4 com quadros-chave frequentes, para o Remotion buscar rápido
for (const f of fs.readdirSync(CLIPS).filter((f) => f.endsWith(".webm"))) {
  const mp4 = path.join(CLIPS, f.replace(/\.webm$/, ".mp4"));
  if (fs.existsSync(mp4) && fs.statSync(mp4).mtimeMs > fs.statSync(path.join(CLIPS, f)).mtimeMs) continue;
  ff("-i", path.join(CLIPS, f), "-r", "24", "-c:v", "libx264", "-crf", "14", "-preset", "fast", "-g", "12", "-pix_fmt", "yuv420p", "-an", mp4);
  console.log("clip", f);
}

// 2) Remotion: usa o Chrome headless do sistema se houver, senão baixa o dele
const sys = ["/opt/pw-browsers/chromium_headless_shell", process.env.REMOTION_CHROME].find((p) => p && fs.existsSync(p));
if (!sys) await ensureBrowser();
const serveUrl = await bundle({ entryPoint: path.join(HERE, "src/index.ts") });
const composition = await selectComposition({ serveUrl, id: "MenuFundo", browserExecutable: sys || null });
const master = path.join(HERE, "out/menu-fundo-master.mp4");
await renderMedia({
  serveUrl, composition, codec: "h264", crf: 12, outputLocation: master, muted: true, browserExecutable: sys || null,
  onProgress: ({ progress }) => process.stdout.write(`\rrender ${(progress * 100) | 0}%   `),
});
console.log("\nmaster", master);

// 3) versão do jogo: 960x540, perfil main (abre em qualquer celular), teto de bitrate para caber em ~3 MB, moov no começo
const mp4 = path.join(OUT, "menu-fundo.mp4");
ff("-i", master, "-an", "-c:v", "libx264", "-profile:v", "main", "-level", "3.1", "-preset", "veryslow", "-crf", "27",
  "-maxrate", "900k", "-bufsize", "1800k", "-g", "48", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4);
// VP9 para navegador sem H.264 (Chromium aberto, alguns Linux); o jogo escolhe pelo canPlayType
ff("-i", master, "-an", "-c:v", "libvpx-vp9", "-b:v", "750k", "-maxrate", "1000k", "-crf", "36", "-row-mt", "1", "-deadline", "good", "-cpu-used", "2", "-g", "48", path.join(OUT, "menu-fundo.webm"));
for (const f of ["menu-fundo.mp4", "menu-fundo.webm"]) console.log(f, (fs.statSync(path.join(OUT, f)).size / 1e6).toFixed(2) + " MB");
