# Quebrada Z — Guia de estilo visual (v27+)

Vale para todos os mapas atuais e para as próximas campanhas. Quem criar mapa, personagem ou efeito novo segue este guia.

## Direção de arte

- Pixel art sempre. Nada de borda suavizada em sprite ou cenário; suavização só em brilho (halo, bloom, raios).
- Alvo: as três referências do dono do projeto (noite, manhã, tarde): céu dramático, cidade em camadas, luz colorida forte, chão que reflete.
- Três períodos, cada um com identidade fixa:
  - **Dia**: céu azul limpo, sol alto, sombra fria, luz quente no topo.
  - **Tarde**: sol baixo laranja, nuvens rosadas, raios de luz fortes, sombra roxa.
  - **Noite**: lua de sangue, céu vinho/roxo, neon magenta e ciano, chão molhado.
- Objetos grandes à frente do personagem (camada `FRONT`, parallax 1,25) dão sensação de profundidade. Todo mapa novo tem pelo menos três.
- Grafite, placa e desenho de parede contam a história do lugar: gíria de quebrada, PT-BR, nada genérico.
- Personagens novos partem do Marcus (mesma proporção, mesmo contorno, mesma paleta de pele/sombra) para o elenco parecer um jogo só.

## Camadas (do fundo para a frente)

| Camada | Parallax | Onde |
|---|---|---|
| Céu pintado (`ART`) + `skyDraw` do mapa | ~0,05 | `buildMap` |
| Astro, nuvens, relâmpago | 0,015 a 0,08 | `FXV.sky` |
| Fundo da sala (`BD_THEMES`) | 0,30 | `drawRoomBackdrops` |
| Cidade próxima | 0,45 | `nearLayer` |
| Cenário, personagens, efeitos | 1,00 | `render` |
| Luz ambiente e lâmpadas | 1,00 | `lights` |
| Reflexo no chão, raios de luz | tela | `FXV.ground` |
| Objetos à frente | 1,25 | `drawFront` |
| Areia, clima, gradação, bloom, vinheta | tela | `FXV.post` |

## Módulo `FXV` (atmosfera)

- Tudo em `index.html`, bloco `const FXV`. Só visual: não muda regra de jogo.
- Paleta por período em `FXV.SKY` (astro, nuvem, raio, gradação, bloom, vinheta). Mudar o clima de um período é mudar essa tabela.
- Clima sorteado por partida em `FXV.reset`: `clear`, `rain`, `storm` (raio + trovão), `sand` (só mapa de praia, `id: "copa"`).
- Teste rápido no console: `FXV.set("storm")`, `FXV.set("sand")`, `FXV.set()` para limpar.
- Mapa de praia novo: incluir o `id` na checagem `st.beach` de `FXV.reset`.
- Raios de luz só aparecem em área a céu aberto (`m.ambZ` ou sala com `T.out`).

## Personagens (`ZRIG` e `rigPolish`)

- Todo humanoide usa o esqueleto do Marcus (`rigRender`): mesma proporção, mesmo contorno, mesma paleta de sombra.
- Zumbi humanoide novo: uma linha em `ZRIG.BASE` (roupa, cores, cabelo, pele) ou em `ZRIG.VO` para variação de um tipo existente. Nada de folha de sprite externa.
- Pele de zumbi: tons doentes de `SK` (verde, cinza, azulado, amarelado). Cor de pele definida em `ZV` é misturada com verde.
- Poses de zumbi em `pose()`: tronco inclinado, cabeça caída, braços à frente. Animação cíclica sai com o dobro de quadros (`s.sub = 2`).
- `rigPolish`: luz de cima. O contorno do topo vira a cor interna escurecida e a linha logo abaixo ganha brilho. Aplicado a todo sprite do rig.
- Corpo que não cabe no esqueleto humano (cão) é desenhado em função própria dentro de `ZRIG` (`dog`), com o mesmo contorno (`RIG_O`) e passando por `rigPolish`.
- Sangue na boca e mancha na roupa são aplicados por cima, por variação.

## Regras técnicas

- JavaScript ES2015 apenas (sem `?.`, `??`).
- `VW` nunca varia por qualidade.
- Efeito novo respeita `QUAL.tier` (0 alto, 1 médio, 2 baixo) e `fxReduced()`. Hoje: bloom só no tier 0; reflexo, raios e gradação nos tiers 0 e 1; tier 2 fica com astro, nuvens e vinheta.
- Clarão de relâmpago desliga com efeitos reduzidos (fotossensibilidade).
- Sprite gerado por código fica em cache; nada de criar canvas por quadro.

## Fases do remake visual

1. **Luz e clima** — feito na v27.0.
2. **Chefes** — cutscene de 4 a 5 s na chegada do chefe (jogo pausado, sem spawn, sem dano). Progressão já feita na v27.1: chegar na onda 14 libera a próxima quebrada da fila; a partida continua até a onda 20.
3. **Personagens** — feito na v27.1: zumbis humanoides, selvagem, rastejante e Observador no rig do Marcus (`ZRIG`); cão zumbi desenhado por código no mesmo traço; contorno seletivo e sombra inferior (`rigPolish`); caminhada e corrida com mais quadros. Falta: rosto/roupa do Marcus e Capitão Caveira (arte própria da v26.8).
4. **Cenário** — placas, grafites, desenhos de parede, fundos e objetos à frente refeitos em todos os mapas.
