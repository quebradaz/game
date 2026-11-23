import React from "react";
import {
  AbsoluteFill, Audio, Easing, Img, OffthreadVideo, Sequence, interpolate, staticFile, useCurrentFrame,
  useVideoConfig, continueRender, delayRender, random,
} from "remotion";

// Trailer de divulgação (v29): partidas de verdade gravadas por tools/trailer/capture.mjs, telas reais do jogo,
// textos, trilha e efeitos sintetizados (tools/trailer/sfx.py). As falas do ElevenLabs (public/trailer/vo/voNN.mp3)
// entram nos tempos do roteiro (VO abaixo) se existirem; sem elas o trailer funciona só com os textos.
export const FPS = 30;
export const DUR = 106; // segundos
const T = "trailer/";
const f = (s: number) => Math.round(s * FPS);

// ---------- fontes ----------
const FONTS: [string, string][] = [["Anton", "Anton.ttf"], ["Pixelzone", "Pixelzone.ttf"], ["Elite", "SpecialElite.ttf"], ["Yoster", "Yoster.ttf"]];
let fontsReady = false;
const useFonts = () => {
  const [h] = React.useState(() => (fontsReady ? null : delayRender("fontes")));
  React.useEffect(() => {
    if (!h) return;
    Promise.all(FONTS.map(([n, file]) => new FontFace(n, `url(${staticFile(T + "fonts/" + file)})`, n === "Pixelzone" ? { sizeAdjust: "150%" } as FontFaceDescriptors : {}).load().then((ff) => document.fonts.add(ff))))
      .then(() => { fontsReady = true; continueRender(h); });
  }, [h]);
};

// ---------- paleta ----------
const C = { ink: "#f4efe6", yel: "#ffc21a", red: "#e0322b", blood: "#8a0f14", night: "#07050b", green: "#59ff7a" };

// ---------- clipes ----------
// gravações 1920x1080: o jogo ocupa os 960 px de cima; abaixo é preto. CONT corrige isso.
const CONT = 960 / 1080;
type ClipP = {
  src: string; vx?: number; at?: number; rate?: number; vol?: number; z0?: number; z1?: number; fx?: number; fy?: number;
  filter?: string; img?: boolean; game?: boolean; dx0?: number; dx1?: number; dy0?: number; dy1?: number;
};
const Clip: React.FC<ClipP & { dur: number }> = ({ src, at = 0, rate = 1, vol = 0, z0 = 1, z1 = 1.06, fx = 0.5, fy = 0.5, filter, img, game = true, dx0 = 0, dx1 = 0, dy0 = 0, dy1 = 0, dur }) => {
  const fr = useCurrentFrame();
  const u = Math.min(1, fr / Math.max(1, f(dur)));
  const z = interpolate(u, [0, 1], [z0, z1], { easing: Easing.inOut(Easing.sin) });
  const dx = interpolate(u, [0, 1], [dx0, dx1], { easing: Easing.inOut(Easing.sin) });
  const dy = interpolate(u, [0, 1], [dy0, dy1], { easing: Easing.inOut(Easing.sin) });
  const k = game && !img ? 1 / CONT : 1;
  const st: React.CSSProperties = {
    position: "absolute", width: `${k * 100}%`, height: `${k * 100}%`, left: `${-(k * 100 - 100) / 2}%`, top: 0,
    objectFit: "cover", imageRendering: img ? "auto" : "pixelated", filter,
    transform: `translate(${dx}%, ${dy}%) scale(${z})`, transformOrigin: `${fx * 100}% ${fy * 100}%`,
  };
  if (img) return <AbsoluteFill style={{ overflow: "hidden" }}><Img src={staticFile(T + src)} style={st} /></AbsoluteFill>;
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <OffthreadVideo src={staticFile(T + "clips/" + src)} startFrom={f(at)} playbackRate={rate} volume={vol} muted={!vol} style={st} />
    </AbsoluteFill>
  );
};

// ---------- textos ----------
const shadow = "0 4px 0 #000, 0 0 30px rgba(0,0,0,.85)";
// legenda de recurso: barra vermelha, título grande, linha pequena (entra deslizando, sai sumindo)
const Feature: React.FC<{ t: string; s?: string; dur: number; v: boolean }> = ({ t, s, dur, v }) => {
  const fr = useCurrentFrame();
  const a = interpolate(fr, [0, 6, f(dur) - 6, f(dur)], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const x = interpolate(fr, [0, 9], [-60, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const w = interpolate(fr, [2, 12], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const box: React.CSSProperties = v
    ? { position: "absolute", left: 60, right: 60, bottom: 300, textAlign: "center" }
    : { position: "absolute", left: 110, bottom: 130 };
  return (
    <div style={{ ...box, opacity: a, transform: `translateX(${v ? 0 : x}px)` }}>
      <div style={{ height: 8, width: `${w}%`, maxWidth: v ? "100%" : 520, background: C.red, marginBottom: 14, marginLeft: v ? "auto" : 0, marginRight: v ? "auto" : 0, boxShadow: "0 0 18px rgba(224,50,43,.7)" }} />
      <div style={{ fontFamily: "Anton", fontSize: v ? 92 : 84, lineHeight: 1.02, color: C.ink, textShadow: shadow, letterSpacing: 1, textTransform: "uppercase" }}>{t}</div>
      {s ? <div style={{ fontFamily: "Pixelzone", fontSize: v ? 40 : 34, color: C.yel, marginTop: 10, textShadow: "0 3px 0 #000" }}>{s}</div> : null}
    </div>
  );
};
// frase grande no centro (ato 1 e final)
const Center: React.FC<{ t: string; s?: string; dur: number; size?: number; col?: string; font?: string; v: boolean; type?: boolean }> = ({ t, s, dur, size = 96, col = C.ink, font = "Anton", v, type }) => {
  const fr = useCurrentFrame();
  const a = interpolate(fr, [0, 8, f(dur) - 8, f(dur)], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const sc = interpolate(fr, [0, f(dur)], [1.0, 1.05]);
  const n = type ? Math.floor(interpolate(fr, [0, Math.min(f(dur) * 0.6, t.length * 1.6)], [0, t.length], { extrapolateRight: "clamp" })) : t.length;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: a }}>
      <div style={{ transform: `scale(${sc})`, textAlign: "center", padding: v ? "0 70px" : "0 160px" }}>
        <div style={{ fontFamily: font, fontSize: v ? size * 1.05 : size, lineHeight: 1.05, color: col, textShadow: shadow, whiteSpace: "pre-line", letterSpacing: font === "Anton" ? 2 : 0 }}>{t.slice(0, n)}</div>
        {s ? <div style={{ fontFamily: "Pixelzone", fontSize: v ? 44 : 38, color: C.yel, marginTop: 18, textShadow: "0 3px 0 #000" }}>{s}</div> : null}
      </div>
    </AbsoluteFill>
  );
};
// rótulo de máquina de escrever (abertura)
const Stamp: React.FC<{ t: string; s?: string; dur: number; v: boolean }> = ({ t, s, dur, v }) => {
  const fr = useCurrentFrame();
  const n = Math.floor(interpolate(fr, [0, t.length * 2], [0, t.length], { extrapolateRight: "clamp" }));
  const a = interpolate(fr, [f(dur) - 8, f(dur)], [1, 0], { extrapolateLeft: "clamp" });
  const cur = Math.floor(fr / 8) % 2 ? "▌" : " ";
  return (
    <div style={{ position: "absolute", left: v ? 70 : 140, top: v ? 520 : 200, opacity: a, fontFamily: "Elite", color: C.ink }}>
      <div style={{ fontSize: v ? 58 : 54, textShadow: "0 0 12px rgba(255,255,255,.25)" }}>{t.slice(0, n)}{cur}</div>
      {s ? <div style={{ fontSize: v ? 34 : 30, color: "#c9b8a8", marginTop: 8, opacity: n >= t.length ? 1 : 0 }}>{s}</div> : null}
    </div>
  );
};
// palavra de impacto (HORDA. CHEFE. ...)
const Slam: React.FC<{ t: string; dur: number; v: boolean }> = ({ t, dur, v }) => {
  const fr = useCurrentFrame();
  const sc = interpolate(fr, [0, 4], [1.6, 1], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const a = interpolate(fr, [0, 2, f(dur) - 3, f(dur)], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: a }}>
      <div style={{ fontFamily: "Anton", fontSize: v ? 190 : 230, color: C.ink, transform: `scale(${sc})`, textShadow: `0 0 40px ${C.red}, 0 8px 0 #000`, letterSpacing: 4 }}>{t}</div>
    </AbsoluteFill>
  );
};

// ---------- logo ----------
const Logo: React.FC<{ dur: number; v: boolean; sub?: string; small?: boolean }> = ({ dur, v, sub, small }) => {
  const fr = useCurrentFrame();
  const a = interpolate(fr, [0, 2, f(dur) - 10, f(dur)], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const sc = interpolate(fr, [0, 5, f(dur)], [1.25, 1, 1.06], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const sh = fr < 10 ? (random("lg" + fr) - 0.5) * 22 : 0;
  const gl = fr < 8 || (fr % 37 === 0) ? 1 : 0; // tremida de sinal
  const w = (v ? 900 : 1040) * (small ? 0.72 : 1);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: a }}>
      <div style={{ position: "relative", transform: `translate(${sh}px, ${sh * 0.4}px) scale(${sc})`, marginTop: small ? (v ? -380 : -170) : 0 }}>
        {gl ? <Img src={staticFile(T + "art/logo.png")} style={{ position: "absolute", width: w, left: 10, top: 0, opacity: 0.6, filter: "hue-rotate(-60deg) saturate(3)", mixBlendMode: "screen" }} /> : null}
        <Img src={staticFile(T + "art/logo.png")} style={{ width: w, filter: "drop-shadow(0 12px 0 rgba(0,0,0,.55)) drop-shadow(0 0 40px rgba(224,50,43,.45))" }} />
        {sub ? <div style={{ textAlign: "center", fontFamily: "Pixelzone", fontSize: v ? 40 : 38, color: C.ink, marginTop: 6, textShadow: "0 3px 0 #000", letterSpacing: 2 }}>{sub}</div> : null}
      </div>
    </AbsoluteFill>
  );
};

// ---------- campanhas ----------
const Camp: React.FC<{ n: string; t: string; tag: string; p: string; dur: number; v: boolean; col: string; on?: boolean }> = ({ n, t, tag, p, dur, v, col, on }) => {
  const fr = useCurrentFrame();
  const a = interpolate(fr, [0, 6, f(dur) - 6, f(dur)], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const y = interpolate(fr, [0, 12], [30, 0], { extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
  const tw = Math.floor(interpolate(fr, [8, 8 + p.length * 0.55], [0, p.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <div style={{ position: "absolute", left: v ? 70 : 140, right: v ? 70 : undefined, bottom: v ? 330 : 150, maxWidth: v ? undefined : 1150, opacity: a, transform: `translateY(${y}px)` }}>
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontFamily: "Pixelzone", fontSize: v ? 34 : 30, color: "#000", background: on ? C.green : col, padding: "4px 14px" }}>{on ? "DISPONÍVEL AGORA" : "EM BREVE"}</span>
        <span style={{ fontFamily: "Pixelzone", fontSize: v ? 34 : 30, color: C.ink, textShadow: "0 3px 0 #000" }}>{n}</span>
      </div>
      <div style={{ fontFamily: "Anton", fontSize: v ? 120 : 136, lineHeight: 1, color: C.ink, textShadow: `0 6px 0 #000, 0 0 40px ${col}` }}>{t}</div>
      <div style={{ fontFamily: "Pixelzone", fontSize: v ? 38 : 34, color: col, marginTop: 8, textShadow: "0 3px 0 #000", letterSpacing: 1 }}>{tag}</div>
      <div style={{ fontFamily: "Elite", fontSize: v ? 40 : 36, color: C.ink, marginTop: 14, lineHeight: 1.3, textShadow: "0 2px 6px #000", minHeight: v ? 160 : 100 }}>{p.slice(0, tw)}</div>
    </div>
  );
};

// ---------- tratamento da imagem ----------
const Grain: React.FC = () => {
  const fr = useCurrentFrame();
  const x = Math.floor(random("gx" + fr) * 512), y = Math.floor(random("gy" + fr) * 512);
  return <AbsoluteFill style={{ backgroundImage: `url(${staticFile(T + "img/grain.png")})`, backgroundPosition: `${x}px ${y}px`, opacity: 0.1, mixBlendMode: "overlay", pointerEvents: "none" }} />;
};
const Vignette: React.FC<{ k?: number }> = ({ k = 0.75 }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${k}) 100%)`, pointerEvents: "none" }} />
);
const Bars: React.FC<{ h: number }> = ({ h }) => (
  <>
    <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: h, background: "#000" }} />
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: h, background: "#000" }} />
  </>
);
const Flash: React.FC<{ dur: number; col?: string }> = ({ dur, col = "#fff" }) => {
  const fr = useCurrentFrame();
  return <AbsoluteFill style={{ background: col, opacity: interpolate(fr, [0, f(dur)], [0.9, 0], { extrapolateRight: "clamp" }) }} />;
};
const Fade: React.FC<{ dur: number; inv?: boolean }> = ({ dur, inv }) => {
  const fr = useCurrentFrame();
  const o = interpolate(fr, [0, f(dur)], inv ? [1, 0] : [0, 1], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ background: "#000", opacity: o }} />;
};
// confete para o carnaval
const Confetti: React.FC = () => {
  const fr = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const cols = ["#ff3d8b", "#ffd81a", "#3effa8", "#1ec8e8", "#ff6a1a"];
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: 70 }, (_, i) => {
        const x = random("cx" + i) * width + Math.sin((fr + i * 7) / 12) * 30;
        const y = ((random("cy" + i) * height + fr * (3 + random("cs" + i) * 5)) % (height + 40)) - 20;
        return <div key={i} style={{ position: "absolute", left: x, top: y, width: 10, height: 6, background: cols[i % 5], transform: `rotate(${fr * 9 + i * 40}deg)`, opacity: 0.85 }} />;
      })}
    </AbsoluteFill>
  );
};
// lanterna no escuro (Sampa Apagão)
const Lantern: React.FC = () => {
  const fr = useCurrentFrame();
  const x = 50 + Math.sin(fr / 18) * 14, y = 52 + Math.cos(fr / 23) * 8;
  return <AbsoluteFill style={{ background: `radial-gradient(circle at ${x}% ${y}%, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 14%, rgba(0,0,0,.93) 34%)` }} />;
};

// ---------- linha do tempo ----------
type Shot = { t: number; d: number; c?: ClipP; el?: (v: boolean, d: number) => React.ReactNode; z?: number };
const G = (src: string, o: Partial<ClipP> = {}): ClipP => ({ src: src + ".mp4", vol: 0.32, ...o });
const I = (src: string, o: Partial<ClipP> = {}): ClipP => ({ src: "img/" + src + ".png", img: true, ...o });

// imagem (por tempo de início): o que está na tela
const SHOTS: Shot[] = [
  // ATO 1 · A noite
  { t: 3, d: 6.5, c: G("s01-rua", { at: 0.5, z0: 1.7, z1: 2.05, fx: 0.47, fy: 0.62, vol: 0.55, filter: "saturate(.55) contrast(1.15) brightness(.85)" }) },
  { t: 9.5, d: 0.45, c: G("s02-horda-adega", { at: 3, z0: 2.2, z1: 2.4, fx: 0.7, fy: 0.7, vol: 0.5, filter: "saturate(.4) contrast(1.4)" }) },
  { t: 10.15, d: 0.4, c: G("s07-observador", { at: 6.5, z0: 1.8, z1: 2, fx: 0.5, fy: 0.5, vol: 0.5, filter: "saturate(.4) contrast(1.4)" }) },
  { t: 10.8, d: 0.5, c: G("s01-rua", { at: 7.5, z0: 2.6, z1: 2.8, fx: 0.78, fy: 0.68, vol: 0.5, filter: "saturate(.4) contrast(1.4)" }) },
  { t: 11.5, d: 0.35, c: G("s12-duda-noite", { at: 4, z0: 2, z1: 2.2, fx: 0.6, fy: 0.6, vol: 0.5, filter: "saturate(.4) contrast(1.4)" }) },
  { t: 12, d: 5, c: G("s02-horda-adega", { at: 1, rate: 0.5, z0: 1.35, z1: 1.55, fx: 0.55, fy: 0.62, vol: 0, filter: "saturate(.5) brightness(.4)" }) },
  // ATO 2 · Segurar a rua
  { t: 20, d: 2.0, c: G("s03-lava", { at: 1, z0: 1.15, z1: 1.3, fx: 0.45, fy: 0.6 }) },
  { t: 22, d: 2.2, c: G("s02-horda-adega", { at: 4, z0: 1.05, z1: 1.18, fx: 0.55, fy: 0.6 }) },
  { t: 24.2, d: 2.0, c: G("s04-quadra", { at: 2, z0: 1.2, z1: 1.1, fx: 0.5, fy: 0.6 }) },
  { t: 26.2, d: 2.2, c: G("s03-lava", { at: 4, z0: 1.4, z1: 1.55, fx: 0.5, fy: 0.62 }) },
  { t: 28.4, d: 2.3, c: G("s10-lapa-hud", { at: 2, z0: 1.0, z1: 1.04, game: false }) },
  { t: 30.7, d: 2.3, c: G("s05-laje-diamante", { at: 1.5, z0: 1.1, z1: 1.25, fx: 0.5, fy: 0.55 }) },
  // chefes
  { t: 33, d: 4.2, c: G("s06-capitao", { at: 2.4, z0: 1.0, z1: 1.04, fx: 0.5, fy: 0.45, vol: 0.45, game: false, vx: 0.3 }) },
  { t: 37.2, d: 2.0, c: G("s06-capitao", { at: 8.5, z0: 1.45, z1: 1.6, fx: 0.35, fy: 0.62 }) },
  { t: 39.2, d: 3.8, c: G("s07-observador", { at: 2.4, z0: 1.0, z1: 1.04, fx: 0.5, fy: 0.45, vol: 0.45, game: false, vx: 0.3 }) },
  { t: 43, d: 2.0, c: G("s07-observador", { at: 9, z0: 1.3, z1: 1.45, fx: 0.5, fy: 0.62 }) },
  // armas
  { t: 45, d: 3.0, c: G("s05-laje-diamante", { at: 4, z0: 1.5, z1: 1.7, fx: 0.5, fy: 0.62 }) },
  { t: 48, d: 2.5, c: G("s09-sniper", { at: 2.5, z0: 1.35, z1: 1.5, fx: 0.5, fy: 0.6 }) },
  { t: 50.5, d: 3.5, c: G("s08-copa-rpg", { at: 2, z0: 1.15, z1: 1.3, fx: 0.5, fy: 0.6 }) },
  // ATO 3 · Teu cria
  { t: 54, d: 2.6, c: I("criacao", { z0: 1.45, z1: 1.6, fx: 0.22, fy: 0.45 }) },
  { t: 56.6, d: 2.6, c: G("s11-duda", { at: 2, z0: 1.9, z1: 2.15, fx: 0.47, fy: 0.62 }) },
  { t: 59.2, d: 2.0, c: I("lendario", { z0: 1.7, z1: 1.9, fx: 0.08, fy: 0.3 }) },
  { t: 61.2, d: 2.4, c: I("passe", { z0: 1.6, z1: 1.6, fx: 0.5, fy: 0.45, dx0: 10, dx1: -10 }) },
  { t: 63.6, d: 1.6, c: I("bau", { z0: 1.25, z1: 1.45, fx: 0.5, fy: 0.45 }) },
  { t: 65.2, d: 2.3, c: { src: "itens.mp4", at: 4.2, rate: 1.6, game: false, z0: 1.5, z1: 1.55, fx: 0.5, fy: 0.42 } },
  { t: 67.5, d: 2.2, c: I("amigos", { z0: 1.3, z1: 1.45, fx: 0.55, fy: 0.6 }) },
  { t: 69.7, d: 2.0, c: I("ranking", { z0: 1.3, z1: 1.4, fx: 0.5, fy: 0.55 }) },
  { t: 71.7, d: 1.8, c: G("s12-duda-noite", { at: 3, z0: 1.6, z1: 1.8, fx: 0.47, fy: 0.62 }) },
  // ATO 3b · a mistura
  { t: 73.5, d: 0.9, c: G("s02-horda-adega", { at: 6, z0: 1.4, z1: 1.5, fx: 0.6, fy: 0.62, filter: "brightness(.45)" }) },
  { t: 74.4, d: 0.9, c: G("s07-observador", { at: 4, z0: 1.0, z1: 1.05, fx: 0.5, fy: 0.45, game: false, vx: 0.7, filter: "brightness(.45)" }) },
  { t: 75.3, d: 0.9, c: { src: "itens.mp4", at: 9.5, game: false, z0: 1.5, z1: 1.55, fx: 0.5, fy: 0.42, filter: "brightness(.45)" } },
  { t: 76.2, d: 0.9, c: G("s01-rua", { at: 2, z0: 2.0, z1: 2.1, fx: 0.47, fy: 0.62, filter: "brightness(.45)" }) },
  { t: 77.1, d: 1.0, c: G("s08-copa-rpg", { at: 5, z0: 1.3, z1: 1.4, fx: 0.5, fy: 0.6, filter: "brightness(.5)" }) },
  { t: 78.1, d: 1.0, c: G("s04-quadra", { at: 5, z0: 1.4, z1: 1.5, fx: 0.5, fy: 0.6, filter: "brightness(.5)" }) },
  { t: 79.1, d: 1.9, c: G("s12-duda-noite", { at: 6, z0: 1.3, z1: 1.5, fx: 0.5, fy: 0.6, filter: "brightness(.5)" }) },
  // ATO 4 · campanhas
  { t: 81, d: 3.5, c: I("../art/camp", { z0: 1.05, z1: 1.18, fx: 0.5, fy: 0.4, filter: "brightness(.8)" }) },
  { t: 84.5, d: 4, c: G("s01-rua", { at: 3, z0: 2.1, z1: 2.4, fx: 0.47, fy: 0.62, vol: 0.4, filter: "grayscale(.7) sepia(.2) hue-rotate(170deg) saturate(1.6) brightness(.6) contrast(1.3)" }), z: 1 },
  { t: 88.5, d: 4, c: G("s02-horda-adega", { at: 5, z0: 1.3, z1: 1.45, fx: 0.55, fy: 0.62, vol: 0.4, filter: "sepia(.6) hue-rotate(-30deg) saturate(2.2) brightness(.6) contrast(1.2)" }), z: 2 },
  { t: 92.5, d: 4, c: G("s04-quadra", { at: 4, z0: 1.4, z1: 1.6, fx: 0.5, fy: 0.62, vol: 0.4, filter: "sepia(.5) hue-rotate(55deg) saturate(1.6) brightness(.5) contrast(1.25) blur(1px)" }), z: 3 },
  // ATO 5 · chamada
  { t: 96.5, d: 9.5, c: G("s10-lapa-hud", { at: 4, z0: 1.1, z1: 1.25, game: false, vol: 0.15, filter: "blur(6px) brightness(.35) saturate(.7)" }) },
];

// textos por cima
const TEXTS: Shot[] = [
  { t: 0.6, d: 2.4, el: (v, d) => <Stamp t="RIO DE JANEIRO · 03:17" s="transmissão pirata · canal 7" dur={d} v={v} /> },
  { t: 12.4, d: 4.4, el: (v, d) => <Center t={"NA QUEBRADA,\nNINGUÉM VEM TE SALVAR."} dur={d} size={110} v={v} type /> },
  { t: 17, d: 3.0, el: (v, d) => <Logo dur={d} v={v} sub="SOBREVIVÊNCIA ZUMBI NAS QUEBRADAS DO RIO" /> },
  { t: 22.3, d: 2.0, el: (v, d) => <Feature t="7 quebradas do Rio" s="da Adega do Marcão aos Arcos da Lapa" dur={d} v={v} /> },
  { t: 26.4, d: 2.0, el: (v, d) => <Feature t="Hordas até a onda 20" s="cada onda mais braba que a anterior" dur={d} v={v} /> },
  { t: 30.8, d: 2.1, el: (v, d) => <Feature t="Dia, tarde e noite" s="chuva, tempestade e lua de sangue" dur={d} v={v} /> },
  { t: 37.3, d: 1.8, el: (v, d) => <Feature t="Chefes com cutscene" s="Capitão Caveira" dur={d} v={v} /> },
  { t: 43.1, d: 1.8, el: (v, d) => <Feature t="O Observador" s="chefe da onda 14" dur={d} v={v} /> },
  { t: 45.2, d: 2.7, el: (v, d) => <Feature t="Mesa de upgrade" s="arma dourada vira DIAMANTE" dur={d} v={v} /> },
  { t: 48.2, d: 2.2, el: (v, d) => <Feature t="Tiro na cabeça" s="a cabeça segue a animação, quadro a quadro" dur={d} v={v} /> },
  { t: 50.7, d: 3.2, el: (v, d) => <Feature t="Bazuca, granada e +30 armas" s="compra na parede, na loja ou na geladeira" dur={d} v={v} /> },
  { t: 54.2, d: 2.3, el: (v, d) => <Feature t="Marcus ou Duda" s="crie seu personagem" dur={d} v={v} /> },
  { t: 56.8, d: 2.3, el: (v, d) => <Feature t="+200 roupas" s="lendária brilha com aura até na partida" dur={d} v={v} /> },
  { t: 61.3, d: 2.2, el: (v, d) => <Feature t="Passe de batalha" s="40 níveis, sobe jogando, sem atalho" dur={d} v={v} /> },
  { t: 63.7, d: 3.7, el: (v, d) => <Feature t="Baús e itens" s="cada partida rende alguma coisa" dur={d} v={v} /> },
  { t: 67.6, d: 2.0, el: (v, d) => <Feature t="Chama a tropa" s="área de amigos" dur={d} v={v} /> },
  { t: 69.8, d: 1.8, el: (v, d) => <Feature t="Ranking" s="por quebrada e entre amigos" dur={d} v={v} /> },
  { t: 73.5, d: 0.9, el: (v, d) => <Slam t="HORDA." dur={d} v={v} /> },
  { t: 74.4, d: 0.9, el: (v, d) => <Slam t="CHEFE." dur={d} v={v} /> },
  { t: 75.3, d: 0.9, el: (v, d) => <Slam t="SAQUE." dur={d} v={v} /> },
  { t: 76.2, d: 0.9, el: (v, d) => <Slam t="SOBREVIVÊNCIA." dur={d} v={v} /> },
  { t: 77.1, d: 3.9, el: () => <AbsoluteFill style={{ background: "rgba(0,0,0,.45)" }} /> },
  { t: 77.2, d: 3.7, el: (v, d) => <Center t={"TUDO QUE VOCÊ CURTE\nEM JOGO DE ZUMBI"} s="AGORA COM A CARA DA FAVELA" dur={d} size={104} v={v} /> },
  { t: 81.2, d: 3.2, el: (v, d) => <Camp n="CAMPANHA 1" t="HELL DE JANEIRO" tag="SOBREVIVÊNCIA POR ONDAS · 7 QUEBRADAS" p="Segure a quebrada onda por onda." col={C.red} on dur={d} v={v} /> },
  { t: 84.7, d: 3.7, el: (v, d) => <Camp n="CAMPANHA 2" t="SAMPA APAGÃO" tag="TERROR NO ESCURO · METRÔ E MARGINAL" p="A cidade apagou. Lanterna, silêncio e munição contada: eles caçam pelo barulho." col="#5ab8ff" dur={d} v={v} /> },
  { t: 88.7, d: 3.7, el: (v, d) => <Camp n="CAMPANHA 3" t="CARNAVAL DOS MORTOS" tag="HORDA EM MOVIMENTO · SALVADOR" p="Um milhão de foliões, e a horda veio junto. Proteja o trio blindado até o fim do circuito." col="#ff3d8b" dur={d} v={v} /> },
  { t: 92.7, d: 3.7, el: (v, d) => <Camp n="CAMPANHA 4" t="MARCO ZERO" tag="MUNDO ABERTO · AMAZÔNIA" p="Onde tudo começou. Construa o abrigo e descubra quem está criando os mortos." col="#59ff7a" dur={d} v={v} /> },
  { t: 96.6, d: 7.2, el: (v, d) => <Logo dur={d} v={v} small /> },
  { t: 97.4, d: 6.4, el: (v, d) => <Cta dur={d} v={v} /> },
  { t: 103.6, d: 2.2, el: (v, d) => <Center t="NÃO OLHA PRA TRÁS." dur={d} size={86} col={C.red} v={v} /> },
];

// cabeçalho do vertical: logo pequeno em cima da janela de jogo
const VHead: React.FC = () => (
  <div style={{ position: "absolute", top: 110, left: 0, right: 0, textAlign: "center" }}>
    <Img src={staticFile(T + "art/logo.png")} style={{ width: 420, filter: "drop-shadow(0 8px 0 rgba(0,0,0,.5))" }} />
  </div>
);
const Cta: React.FC<{ dur: number; v: boolean }> = ({ dur, v }) => {
  const fr = useCurrentFrame();
  const a = interpolate(fr, [0, 10, f(dur) - 10, f(dur)], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const p = 1 + Math.sin(fr / 6) * 0.025;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: a }}>
      <div style={{ marginTop: v ? 420 : 330, textAlign: "center" }}>
        <div style={{ display: "inline-block", fontFamily: "Anton", fontSize: v ? 96 : 92, color: "#1b0a00", background: C.yel, padding: "6px 46px", transform: `scale(${p})`, boxShadow: "0 8px 0 #7a4a00, 0 0 40px rgba(255,194,26,.45)" }}>JOGUE GRÁTIS</div>
        <div style={{ fontFamily: "Pixelzone", fontSize: v ? 44 : 40, color: C.ink, marginTop: 30, textShadow: "0 3px 0 #000" }}>no navegador · celular ou PC · sem instalar</div>
        <div style={{ fontFamily: "Anton", fontSize: v ? 64 : 60, color: C.yel, marginTop: 14, letterSpacing: 2, textShadow: "0 4px 0 #000" }}>quebradaz.github.io/game</div>
        <div style={{ fontFamily: "Pixelzone", fontSize: v ? 34 : 30, color: "#cbbfd8", marginTop: 16, textShadow: "0 3px 0 #000" }}>teste, sobreviva e manda tua opinião no jogo</div>
      </div>
    </AbsoluteFill>
  );
};

// ---------- som ----------
// falas (roteiro-elevenlabs.md): quando cada voNN entra
export const VO: [string, number][] = [
  ["vo01", 1], ["vo02", 4.5], ["vo03", 10], ["vo04", 12.5], ["vo05", 20], ["vo06", 22], ["vo07", 34], ["vo08", 45.5],
  ["vo09", 54.5], ["vo10", 67.5], ["vo11", 73.5], ["vo12", 81.5], ["vo13", 84.5], ["vo14", 88.5], ["vo15", 92.5], ["vo16", 96.5], ["vo17", 100.5],
];
type Sfx = [string, number, number?];
const SFX: Sfx[] = [
  ["radio", 0, 0.5], ["heart", 9.4, 0.9], ["glitch", 9.5, 0.6], ["glitch", 10.15, 0.5], ["heart", 10.6, 0.9], ["glitch", 10.8, 0.5], ["glitch", 11.5, 0.6],
  ["drone", 0, 0.55], ["reverse", 15.4, 0.8], ["riser", 13, 0.5], ["braam", 17, 1], ["impact", 17, 0.9],
  ["whoosh", 19.8, 0.6], ["impact", 33, 0.7], ["braam_low", 33, 0.6], ["whoosh", 37.1, 0.5], ["impact", 39.2, 0.7], ["whoosh", 42.9, 0.5],
  ["whoosh", 44.9, 0.5], ["whoosh", 53.9, 0.5], ["whoosh", 67.4, 0.4],
  ["impact", 73.5, 0.8], ["impact", 74.4, 0.8], ["impact", 75.3, 0.8], ["impact", 76.2, 0.9], ["riser", 77.0, 0.45], ["braam", 81, 0.9],
  ["glitch", 84.5, 0.5], ["braam_low", 84.5, 0.6], ["glitch", 88.5, 0.5], ["impact", 88.5, 0.6], ["glitch", 92.5, 0.5], ["braam_low", 92.5, 0.6],
  ["drone", 84.5, 0.5], ["reverse", 95.9, 0.8], ["braam", 96.5, 1], ["impact", 96.5, 1], ["heart", 101, 0.8], ["heart", 102.2, 0.8], ["reverse", 103, 0.7], ["impact", 103.6, 1],
];
// trilha: trecho de trilha.mp3 (a música das partidas) do ato 2 até as campanhas
const MUS_IN = 20, MUS_OUT = 84.5, MUS_FROM = 99;

const Track: React.FC<{ vo: string[] }> = ({ vo }) => {
  const has = new Set(vo);
  const voOn = (s: number) => VO.some(([id, t]) => has.has(id) && s >= t - 0.1 && s <= t + 4.2);
  return (
    <>
      {SFX.map(([id, t, vol], i) => (
        <Sequence key={"s" + i} from={f(t)} layout="none"><Audio src={staticFile(T + "sfx/" + id + ".wav")} volume={vol ?? 1} /></Sequence>
      ))}
      <Sequence from={f(MUS_IN)} durationInFrames={f(MUS_OUT - MUS_IN)} layout="none">
        <Audio src={staticFile(T + "music/trilha.mp3")} startFrom={f(MUS_FROM)} volume={(fr) => {
          const s = MUS_IN + fr / FPS;
          const env = interpolate(s, [MUS_IN, MUS_IN + 1.2, 72.8, 73.5, 77, 78, MUS_OUT - 1.5, MUS_OUT], [0, 0.85, 0.85, 0.15, 0.15, 0.9, 0.9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return env * (voOn(s) ? 0.5 : 1);
        }} />
      </Sequence>
      {VO.filter(([id]) => has.has(id)).map(([id, t]) => (
        <Sequence key={id} from={f(t)} layout="none"><Audio src={staticFile(T + "vo/" + id + ".mp3")} volume={1} /></Sequence>
      ))}
    </>
  );
};

// ---------- composição ----------
export type TrailerProps = { vertical: boolean; vo: string[] };
export const Trailer: React.FC<TrailerProps> = ({ vertical, vo }) => {
  useFonts();
  const fr = useCurrentFrame();
  const s = fr / FPS;
  const v = vertical;
  // barras de cinema no ato 1 e no fim
  const bars = s < 17 ? 130 : s >= 103.4 ? 130 : 0;
  // a imagem horizontal (palco 1920x1080); no vertical cada cena é recortada numa janela quadrada no ponto que importa (vx)
  const VT = 420;
  const stage = (
    <AbsoluteFill style={{ background: C.night }}>
      {SHOTS.map((sh, i) => {
        const inner = (
          <>
            <Clip {...sh.c!} dur={sh.d} />
            {sh.z === 1 ? <Lantern /> : sh.z === 2 ? <Confetti /> : null}
            {sh.z ? <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(0,0,0,.85) 0%, rgba(0,0,0,0) 55%)" }} /> : null}
          </>
        );
        const left = -Math.max(0, Math.min(840, (sh.c!.vx ?? sh.c!.fx ?? 0.5) * 1920 - 540));
        return (
          <Sequence key={i} from={f(sh.t)} durationInFrames={f(sh.d)}>
            {v ? (
              <div style={{ position: "absolute", left: 0, top: VT, width: 1080, height: 1080, overflow: "hidden" }}>
                <div style={{ position: "absolute", left, top: 0, width: 1920, height: 1080 }}>{inner}</div>
              </div>
            ) : inner}
          </Sequence>
        );
      })}
      {/* escurece embaixo onde entram as legendas */}
      {s >= 20 && s < 73.5 ? <AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(0,0,0,.6) 0%, rgba(0,0,0,0) 40%)" }} /> : null}
      <Sequence from={f(81)} durationInFrames={f(3.5)}><AbsoluteFill style={{ background: "linear-gradient(0deg, rgba(0,0,0,.9) 0%, rgba(0,0,0,0) 60%)" }} /></Sequence>
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {v ? <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 50%, #2a0a10 0%, #07050b 70%)" }} /> : null}
      {stage}
      {v && s >= 20 && s < 96.4 ? <VHead /> : null}
      <Vignette k={s < 20 ? 0.9 : 0.6} />
      {TEXTS.map((tx, i) => (
        <Sequence key={"t" + i} from={f(tx.t)} durationInFrames={f(tx.d)}>{tx.el!(v, tx.d)}</Sequence>
      ))}
      {/* cortes: clarão no logo, nos chefes e na chamada; fade no fim */}
      <Sequence from={f(17)} durationInFrames={f(0.4)}><Flash dur={0.4} col="#ffd0c0" /></Sequence>
      <Sequence from={f(33)} durationInFrames={f(0.3)}><Flash dur={0.3} /></Sequence>
      <Sequence from={f(39.2)} durationInFrames={f(0.3)}><Flash dur={0.3} /></Sequence>
      <Sequence from={f(81)} durationInFrames={f(0.35)}><Flash dur={0.35} col="#ff5a3a" /></Sequence>
      <Sequence from={f(96.5)} durationInFrames={f(0.4)}><Flash dur={0.4} col="#ffd0c0" /></Sequence>
      <Sequence from={f(19.5)} durationInFrames={f(0.5)}><Fade dur={0.5} inv /></Sequence>
      <Sequence from={f(105.2)} durationInFrames={f(0.8)}><Fade dur={0.8} /></Sequence>
      {!v ? <Bars h={bars} /> : null}
      <Grain />
      <Track vo={vo} />
    </AbsoluteFill>
  );
};
