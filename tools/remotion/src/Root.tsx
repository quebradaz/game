import React from "react";
import { Composition } from "remotion";
import { MenuFundo, menuFundoDuracao, MENU_FPS } from "./MenuFundo";
import { Trailer, FPS, DUR } from "./Trailer";

// Composições do estúdio. "MenuFundo" é o vídeo que roda atrás do menu inicial do jogo.
// "Trailer" e "TrailerVertical" são o trailer de divulgação v29 (tools/trailer/).
export const Root: React.FC = () => (
  <>
    <Composition id="MenuFundo" component={MenuFundo} durationInFrames={menuFundoDuracao()} fps={MENU_FPS} width={960} height={540} />
    <Composition id="Trailer" component={Trailer} durationInFrames={DUR * FPS} fps={FPS} width={1920} height={1080} defaultProps={{ vertical: false, vo: [] as string[] }} />
    <Composition id="TrailerVertical" component={Trailer} durationInFrames={DUR * FPS} fps={FPS} width={1080} height={1920} defaultProps={{ vertical: true, vo: [] as string[] }} />
  </>
);
