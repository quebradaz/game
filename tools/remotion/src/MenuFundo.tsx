import React from "react";
import { AbsoluteFill, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, Easing } from "remotion";

// Fundo do menu: passa pelas quebradas com partidas de verdade (gravadas por capture.mjs), um trecho por mapa,
// com aproximação lenta e fusão entre um e outro. O fim funde de volta no começo, então o vídeo roda em loop sem corte.
export const MENU_FPS = 24;
// ordem das quebradas e o ponto (em segundos) de cada gravação de onde o trecho sai
export const TRECHOS: { id: string; de: number; foco: [number, number] }[] = [
  { id: "adega", de: 1.5, foco: [0.5, 0.62] },
  { id: "lava", de: 1.5, foco: [0.45, 0.6] },
  { id: "quadra", de: 1.5, foco: [0.55, 0.6] },
  { id: "laje", de: 1.5, foco: [0.5, 0.55] },
  { id: "cristo", de: 1.5, foco: [0.5, 0.55] },
  { id: "copa", de: 1.5, foco: [0.5, 0.62] },
  { id: "lapa", de: 1.5, foco: [0.5, 0.58] },
];
// altura útil das gravações 1280x720 (abaixo disso é preto)
const CONTEUDO = 640;
const SEG = 5.5 * MENU_FPS; // quanto cada quebrada fica na tela (com a fusão)
const FUS = 1.25 * MENU_FPS; // fusão entre duas quebradas
const PASSO = SEG - FUS;
export const menuFundoDuracao = () => TRECHOS.length * PASSO;

// um trecho entra por cima do anterior (só o de cima funde, para a imagem não escurecer no meio da troca):
// vídeo com zoom lento e deslize (o mesmo relógio local, para o pedaço do loop casar com o começo)
const Trecho: React.FC<{ id: string; de: number; foco: [number, number]; desloc: number; entra: boolean }> = ({ id, de, foco, desloc, entra }) => {
  const f = useCurrentFrame() + desloc;
  const u = f / SEG;
  const zoom = interpolate(u, [0, 1], [1.04, 1.14], { easing: Easing.inOut(Easing.sin) });
  const dx = interpolate(u, [0, 1], [1.5, -1.5]);
  let op = 1;
  if (entra) op = Math.min(op, interpolate(f, [0, FUS], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) }));
  return (
    <AbsoluteFill style={{ opacity: op }}>
      <OffthreadVideo
        src={staticFile(`clips/${id}.mp4`)}
        startFrom={Math.round(de * MENU_FPS) + desloc}
        muted
        style={{
          // a gravação tem uma faixa preta embaixo (o jogo não ocupa os 720 px): só os 640 de cima entram
          position: "absolute",
          height: `${(720 / CONTEUDO) * 100}%`,
          width: `${(720 / CONTEUDO) * 100}%`,
          left: `${-((720 / CONTEUDO) * 100 - 100) / 2}%`,
          top: 0,
          objectFit: "fill",
          imageRendering: "pixelated",
          transform: `translateX(${dx}%) scale(${zoom})`,
          transformOrigin: `${foco[0] * 100}% ${foco[1] * 100}%`,
        }}
      />
    </AbsoluteFill>
  );
};

export const MenuFundo: React.FC = () => {
  const total = menuFundoDuracao();
  return (
    <AbsoluteFill style={{ backgroundColor: "#07050b" }}>
      {TRECHOS.map((q, i) => {
        // a primeira quebrada começa já no meio da fusão: o pedaço que falta é o que fecha o loop no fim
        const ini = i * PASSO;
        if (i === 0)
          return (
            <Sequence key={q.id} from={0} durationInFrames={SEG - FUS}>
              <Trecho {...q} desloc={FUS} entra={false} />
            </Sequence>
          );
        return (
          <Sequence key={q.id} from={ini - FUS} durationInFrames={SEG}>
            <Trecho {...q} desloc={0} entra={true} />
          </Sequence>
        );
      })}
      {/* fecho do loop: a primeira quebrada volta por cima da última durante a fusão final */}
      <Sequence from={total - FUS} durationInFrames={FUS}>
        <Trecho {...TRECHOS[0]} desloc={0} entra={true} />
      </Sequence>
      {/* bordas um pouco mais escuras; o menu já põe por cima o degradê de cima/baixo e as linhas de varredura (#tFx) */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 75% at 50% 50%, rgba(7,5,11,0) 55%, rgba(7,5,11,.5) 100%)" }} />
    </AbsoluteFill>
  );
};
