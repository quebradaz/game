import React from "react";
import { Composition } from "remotion";
import { MenuFundo, menuFundoDuracao, MENU_FPS } from "./MenuFundo";

// Composições do estúdio. "MenuFundo" é o vídeo que roda atrás do menu inicial do jogo.
export const Root: React.FC = () => (
  <>
    <Composition id="MenuFundo" component={MenuFundo} durationInFrames={menuFundoDuracao()} fps={MENU_FPS} width={960} height={540} />
  </>
);
