# Quebrada Z — Curva de nível e caminho de recompensas (v28.8, proposta)

Status: primeira versão para aprovação. Código em `tools/patches/v28.8-niveis.js` (já aplicado no `index.html` deste branch).
Valores marcados com **(chute)** são estimativas sem dado real de jogadores; ajustar depois de ver partidas no Supabase.

## O problema

A curva antiga era `300 × 1,22^(n-1)`. Ela é suave até o nível 10, mas depois explode: o nível 20→21 pedia 13 mil XP,
o 30→31 pedia 96 mil e o 49→50 pedia 4,2 milhões. Na prática ninguém passa do nível ~25, e subir de nível não liberava nada.

## A curva nova

`XP pro próximo nível = 300 + 90 × (n-1) + 5 × (n-1)²`, arredondado de 10 em 10, com teto no nível 50.
Os quatro números ficam em `CONFIG.meta` (`levelBase`, `levelLin`, `levelQuad`, `levelMax`).

- Começo rápido: os 5 primeiros níveis saem em 1 partida cada.
- Meio constante: do 10 ao 30, um nível a cada 2 a 4 partidas.
- Fim lento, sem parede: do 40 ao 50, um nível a cada 4 a 6 partidas.
- Do 1 ao 50: cerca de 310 mil XP, umas **150 partidas (chute)**. Jogando 4 por dia, umas 5 a 6 semanas: nada sai do dia pra noite, e cabe numa temporada do passe (8 semanas).

XP por partida não mudou (`onda × 45 + abates × 2`, +250 na vitória). Medido no modelo de hordas do jogo:
onda 6 ≈ 480 XP, onda 10 ≈ 1.100, onda 14 ≈ 2.050, vitória na 20 ≈ 3.970.

**(chute)** A coluna "XP/partida" supõe que o jogador melhora com o tempo: 400 XP por partida nos níveis 1–3,
750 até o 8, 1.100 até o 15, 1.550 até o 25, 2.050 até o 35 e 2.600 depois.

## O que cada nível libera

Todo nível de 2 a 50 libera alguma coisa, e tudo aparece antes no perfil (**CAMINHO DO NÍVEL**, rolagem lateral, com o próximo prêmio destacado).

- **21 roupas exclusivas de nível** (raridade "exclusivo"; a do nível 50 é lendária). Não estão à venda: entram no inventário sozinhas quando o nível chega.
- **5 nós da árvore** que estavam "em breve", agora com efeito e nível mínimo do personagem: Fôlego (7), Lábia (12), Olho de águia (17), Pé de pedreiro (22), Segunda chance (32). Continuam custando chip.
- **10 títulos** (a cada 5 níveis), mostrados no perfil no lugar de "Sobrevivente da quebrada".
- **Moedas** nos níveis que sobram: 150 a 1.500, somando 10.100 até o 50 **(chute: perto de 1/4 das moedas que o jogador ganha nas ~150 partidas; dá pra baixar se a loja ficar fácil)**.

| Nível | XP antigo | XP novo | XP total (novo) | XP/partida (chute) | Partidas pro nível | Partidas acumuladas (novo) | Partidas acumuladas (antigo) | Libera ao chegar |
|---|---|---|---|---|---|---|---|---|
| 1→2 | 300 | 300 | 300 | 400 | 0,8 | 1 | 1 | +150 moedas |
| 2→3 | 370 | 400 | 700 | 400 | 1,0 | 2 | 2 | Roupa “Boné da cria” |
| 3→4 | 450 | 500 | 1.200 | 400 | 1,3 | 3 | 3 | Roupa “Chinelo da laje” |
| 4→5 | 540 | 620 | 1.820 | 750 | 0,8 | 4 | 4 | Título “Cria da quebrada” |
| 5→6 | 660 | 740 | 2.560 | 750 | 1,0 | 5 | 4 | Roupa “Bermuda tactel” |
| 6→7 | 810 | 880 | 3.440 | 750 | 1,2 | 6 | 5 | Nó “Fôlego” |
| 7→8 | 990 | 1.020 | 4.460 | 750 | 1,4 | 7 | 7 | +250 moedas |
| 8→9 | 1.210 | 1.180 | 5.640 | 750 | 1,6 | 9 | 8 | Roupa “Regata do bloco” |
| 9→10 | 1.470 | 1.340 | 6.980 | 1.100 | 1,2 | 10 | 10 | Título “Sobrevivente” |
| 10→11 | 1.800 | 1.520 | 8.500 | 1.100 | 1,4 | 12 | 11 | Roupa “Bandana do morro” |
| 11→12 | 2.190 | 1.700 | 10.200 | 1.100 | 1,5 | 13 | 13 | Nó “Lábia” |
| 12→13 | 2.670 | 1.900 | 12.100 | 1.100 | 1,7 | 15 | 16 | Roupa “Tênis de corrida” |
| 13→14 | 3.260 | 2.100 | 14.200 | 1.100 | 1,9 | 17 | 19 | +350 moedas |
| 14→15 | 3.980 | 2.320 | 16.520 | 1.100 | 2,1 | 19 | 22 | Título “Linha de frente” |
| 15→16 | 4.850 | 2.540 | 19.060 | 1.100 | 2,3 | 21 | 27 | Roupa “Camisa da várzea” |
| 16→17 | 5.920 | 2.780 | 21.840 | 1.550 | 1,8 | 23 | 31 | Nó “Olho de águia” |
| 17→18 | 7.230 | 3.020 | 24.860 | 1.550 | 1,9 | 25 | 35 | +400 moedas |
| 18→19 | 8.820 | 3.280 | 28.140 | 1.550 | 2,1 | 27 | 41 | Roupa “Mochila de sobrevivente” |
| 19→20 | 10.750 | 3.540 | 31.680 | 1.550 | 2,3 | 29 | 48 | Título “Casca grossa” |
| 20→21 | 13.120 | 3.820 | 35.500 | 1.550 | 2,5 | 32 | 56 | Roupa “Calça cargo urbana” |
| 21→22 | 16.010 | 4.100 | 39.600 | 1.550 | 2,6 | 34 | 67 | Nó “Pé de pedreiro” |
| 22→23 | 19.530 | 4.400 | 44.000 | 1.550 | 2,8 | 37 | 79 | +500 moedas |
| 23→24 | 23.830 | 4.700 | 48.700 | 1.550 | 3,0 | 40 | 95 | Roupa “Corta-vento da madrugada” |
| 24→25 | 29.070 | 5.020 | 53.720 | 1.550 | 3,2 | 43 | 113 | Título “Terror dos podres” |
| 25→26 | 35.460 | 5.340 | 59.060 | 1.550 | 3,4 | 47 | 136 | Roupa “Coturno de patrulha” |
| 26→27 | 43.260 | 5.680 | 64.740 | 2.050 | 2,8 | 50 | 157 | +600 moedas |
| 27→28 | 52.780 | 6.020 | 70.760 | 2.050 | 2,9 | 53 | 183 | Roupa “Cordão da vila” |
| 28→29 | 64.390 | 6.380 | 77.140 | 2.050 | 3,1 | 56 | 215 | +650 moedas |
| 29→30 | 78.560 | 6.740 | 83.880 | 2.050 | 3,3 | 59 | 253 | Título “Dono do morro” |
| 30→31 | 95.840 | 7.120 | 91.000 | 2.050 | 3,5 | 63 | 300 | Roupa “Capacete de obra” |
| 31→32 | 116.930 | 7.500 | 98.500 | 2.050 | 3,7 | 66 | 357 | Nó “Segunda chance” |
| 32→33 | 142.650 | 7.900 | 106.400 | 2.050 | 3,9 | 70 | 426 | +750 moedas |
| 33→34 | 174.030 | 8.300 | 114.700 | 2.050 | 4,0 | 74 | 511 | Roupa “Moletom do baile” |
| 34→35 | 212.320 | 8.720 | 123.420 | 2.050 | 4,3 | 78 | 615 | Título “Veterano do apocalipse” |
| 35→36 | 259.030 | 9.140 | 132.560 | 2.050 | 4,5 | 83 | 741 | Roupa “Óculos de solda” |
| 36→37 | 316.020 | 9.580 | 142.140 | 2.600 | 3,7 | 86 | 863 | +850 moedas |
| 37→38 | 385.550 | 10.020 | 152.160 | 2.600 | 3,9 | 90 | 1011 | Roupa “Calça de couro surrada” |
| 38→39 | 470.360 | 10.480 | 162.640 | 2.600 | 4,0 | 94 | 1192 | +900 moedas |
| 39→40 | 573.850 | 10.940 | 173.580 | 2.600 | 4,2 | 99 | 1413 | Título “Lenda da favela” |
| 40→41 | 700.090 | 11.420 | 185.000 | 2.600 | 4,4 | 103 | 1682 | Roupa “Jaqueta pele de cobra” |
| 41→42 | 854.110 | 11.900 | 196.900 | 2.600 | 4,6 | 108 | 2010 | +1000 moedas |
| 42→43 | 1,0 mi | 12.400 | 209.300 | 2.600 | 4,8 | 112 | 2411 | Roupa “Chuteira de craque” |
| 43→44 | 1,3 mi | 12.900 | 222.200 | 2.600 | 5,0 | 117 | 2900 | +1000 moedas |
| 44→45 | 1,6 mi | 13.420 | 235.620 | 2.600 | 5,2 | 122 | 3497 | Título “Mito do Rio” |
| 45→46 | 1,9 mi | 13.940 | 249.560 | 2.600 | 5,4 | 128 | 4224 | Roupa “Capa do sobrevivente” |
| 46→47 | 2,3 mi | 14.480 | 264.040 | 2.600 | 5,6 | 133 | 5112 | +1200 moedas |
| 47→48 | 2,8 mi | 15.020 | 279.060 | 2.600 | 5,8 | 139 | 6195 | Roupa “Panamá do malandro velho” |
| 48→49 | 3,4 mi | 15.580 | 294.640 | 2.600 | 6,0 | 145 | 7517 | +1500 moedas |
| 49→50 | 4,2 mi | 16.140 | 310.780 | 2.600 | 6,2 | 151 | 9129 | Título “Rei da Quebrada Z” + Roupa “Jaqueta do Rei da Quebrada” |

"—" na curva antiga = mais de 10 mil partidas.

## Os nós novos da árvore

| Nó | Ramo | Pede | Nível do personagem | Efeito por nível | Custo (chips) |
|---|---|---|---|---|---|
| Fôlego | Corpo | Couro grosso 3 | 7 | gasta 12% menos fôlego correndo | 2 / 3 / 4 |
| Lábia | Grana | Pé-de-meia 3 | 12 | mercante cobra 6% menos | 2 / 3 / 4 |
| Olho de águia | Armas | Mão leve 3 | 17 | tiro na cabeça +10% de dano | 2 / 3 / 4 |
| Pé de pedreiro | Obra | Martelo bom 3 | 22 | chute empurra 15% mais longe | 2 / 3 / 4 |
| Segunda chance | Corpo | Fôlego 3 | 32 | uma vez por partida, levanta com 35% de vida e 2 s invencível (depois do kit, se tiver) | 6 |

Os efeitos por nível estão em `CONFIG.meta.up` (**chute** os números; ajustar com teste). Olho de águia virou "mais dano no tiro na cabeça" em vez de "mais chance", porque a mira do jogo é manual e não existe chance a mexer.

## Servidor

- Os nós só abrem quando o servidor tem o custo deles. A migração `supabase/migrations/v28_8_niveis.sql` coloca os custos e **ainda não foi aplicada**. Até lá os nós mostram "EM BREVE", então o jogo pode ir para o ar antes.
- **Risco:** o nível do personagem fica no save do jogador, não no servidor. Quem mexer no save consegue o nível e libera roupas de nível e os nós (ainda pagando chip). Para fechar isso, o próximo passo é o servidor somar o XP em `submit_run` e devolver o nível em `get_economy`.

## Quem já joga

- Ninguém perde nível. O XP guardado é reaplicado na curva nova: quem estava travado sobe na hora (um save no nível 15 com 4.000 XP vira nível 16).
- As moedas dos níveis já alcançados são pagas uma vez (marca `lvV` / `lvPaid` no save), e as roupas desses níveis entram no inventário.

## Mapas

Não coloquei nível mínimo nos mapas: eles já abrem por vitória no chefe, e uma segunda trava atrasaria quem joga bem. Fica para decidir se o nível deve liberar alguma coisa de mapa (por exemplo, jogar à noite de propósito).

## Testes feitos (navegador sem tela, Playwright)

- `lvlNeed`: 300, 400, 1.520, 3.820, 7.120, 16.140 nos níveis 1, 2, 10, 20, 30, 49; teto no 50.
- Save antigo (nível 15, 4.000 XP, 100 moedas) vira nível 16 e 850 moedas; rodar de novo não paga duas vezes.
- Fim de partida: nível 6 + onda 8 sobe pro 7 e mostra "Nível novo: Habilidade: Fôlego".
- Telas: `production/qa/evidence/v28.8-niveis/` (perfil, árvore com nós trancados por nível, fim de partida).
