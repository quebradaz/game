# Quebrada Z — Economia da fase D (proposta para aprovação)

Três moedas. Chip e Z-Coin ficam no servidor (Supabase): o jogo só mostra o saldo. Toda entrada e saída vai para um livro de transações (quem, quanto, motivo, partida).

| Moeda | Cor | Para que serve | De onde vem | Compra com dinheiro? |
|---|---|---|---|---|
| Moeda comum | dourada | loja de visual comum, upgrades atuais da loja do menu | partidas (como hoje: onda × 6 + abates × 0,4; vitória +400) | não |
| Chip de tecnologia | verde-ciano | **habilidades da árvore** (no lugar das moedas) | chefes (50% cada), missões semanais, passe | **não** (proposta) |
| Z-Coin | roxa | passe premium, roupas raras e lendárias | compra (InfinitePay), chefes (chance pequena), missões, passe | sim |

## Chip de tecnologia

- **Queda:** cada chefe derrotado tem 50% de chance de soltar 1 chip. Capitão na onda 7, Observador na 14, Capitão em fúria na 20: uma partida completa rende em média 1,5 chip.
- **Quem sorteia é o servidor.** Quando o chefe morre, o jogo pergunta ao servidor; o servidor confere a partida aberta (mapa, tempo real, um sorteio por chefe por partida) e responde. Se saiu, o chip cai na tela e já entra no saldo. Sem internet, chefe não solta chip.
- **Custo das habilidades:** nível 1 = 1 chip, nível 2 = 2 chips, nível 3 = 3 chips nas habilidades da primeira linha (vida, pé-de-meia, mão leve, martelo bom). Segunda linha: 2 / 3 / 4. "Segunda chance": 6. A primeira linha inteira custa 24 chips ≈ 16 partidas que passam da onda 20, ou umas 30 que chegam na 14.
- **Quem já comprou habilidades com moedas fica com os níveis.** Nada é tirado.

## Z-Coin

- **Pacotes (venda pelo link da InfinitePay, crédito manual por enquanto):**

| Pacote | Z-Coin | Preço |
|---|---|---|
| Punhado | 300 | R$ 4,90 |
| Saco | 600 + 100 de bônus | R$ 20,00 |
| Mochila de dinheiro | 900 + 150 de bônus | R$ 35,00 |
| Cofre | 1.200 + 200 de bônus | R$ 65,00 |

(Valores de 2026-11-22, v29.5. O preço que vale é o da tabela `zc_packs` no Supabase.)

- **De graça jogando:** chefe tem 10% de chance de soltar 5 Z-Coin (mesmo sorteio do chip, no servidor); missões semanais dão até 30 Z-Coin por semana; o passe grátis dá 200 por temporada.
- **Gastos:** passe premium 600 Z-Coin; roupa rara 200; roupa lendária 600; conjunto lendário da temporada 900.

## Missões semanais

- 5 por semana, renovam toda segunda às 00:00 (horário de Brasília). Sorteadas de uma lista, iguais para todo mundo na semana.
- Exemplos: matar 500 zumbis; chegar na onda 10 em qualquer mapa à noite; derrotar 2 chefes; 80 tiros na cabeça; jogar 5 partidas no mapa da semana.
- Recompensa de cada uma: 300 a 1.000 moedas + 2.000 a 4.000 XP de passe. Uma por semana dá 15 Z-Coin, outra dá 1 chip.
- O progresso é contado pelo servidor a partir das partidas aceitas (as mesmas que valem para o ranking).

## Passe de batalha

- Temporada de 8 semanas, 40 níveis, 1.000 XP por nível.
- XP de passe por partida (v29): onda × 12 + abates ÷ 5 (até 40 por onda) + 80 por chefe; vitória típica ≈ 640. Os primeiros 2.000 XP de partida do dia contam inteiros, o resto pela metade. Missões dão 1.000 a 2.000. Cada nível custa 1.000 + 100 × (nível − 1) (o 40 custa 4.900; passe inteiro 118.000). Quem joga ~3 partidas por dia e faz as missões fecha na semana 7 de 8; 1 partida por dia chega perto do nível 20. Ver `supabase/migrations/v29_passe_dificil.sql`.
- **Trilha grátis:** a cada 2 níveis, moedas; nos níveis 10, 20, 30 e 40, 1 chip e 50 Z-Coin; 2 roupas raras da temporada.
- **Trilha premium (600 Z-Coin):** um prêmio por nível — 6 roupas raras e 3 lendárias exclusivas da temporada, 1 conjunto lendário no nível 40, 5 chips no total e 700 Z-Coin no total (quem completa recupera mais do que pagou, o que faz comprar o passe seguinte).
- Tudo que cada nível dá aparece antes, na tela do passe.

## Caixas de recompensa (aprovado)

- **Grátis (baú de madeira):** completar um mapa dá 1 baú com sorteio.
- **À venda por Z-Coin (v28.10, preços chutados):** baú raro 150 Z (sempre roupa rara que você não tem, até 5 por dia) e baú lendário de ouro 600 Z (sempre lendária que você não tem, até 2 por dia). Modo padrão "à mostra": a roupa aparece antes de pagar, sem sorteio pago. Ver `supabase/migrations/v28_10_baus.sql`.
- **Como ganha:** completar um mapa (vencer a onda 20) dá 1 caixa. O sorteio é feito no servidor.
- **Conteúdo e chances (mostradas na tela antes de abrir):**

| Prêmio | Chance |
|---|---|
| 200 a 600 moedas comuns | 80% |
| Roupa rara ou lendária (que você ainda não tem) | 12% |
| 1 chip de tecnologia | 6% |
| 25 Z-Coin | 2% |

- Skins de arma entram no sorteio quando existirem (atualização futura); até lá a fatia delas fica nas moedas.
- **Aviso:** mesmo grátis, uma caixa com sorteio pode ser enquadrada pelo ECA Digital (Lei 15.211/2025). Vale confirmar com um advogado antes de lançar na Play Store.

## Passe e pacotes

Passe e pacote da temporada têm conteúdo fixo, mostrado antes. Chip não é vendido por Z-Coin.

## O que entra no servidor

- Tabelas: carteira (chips e Z-Coin por jogador), livro de transações, sorteios de chefe por partida, missões da semana e progresso, temporada do passe e progresso, itens comprados com Z-Coin.
- Funções: `boss_drop` (sorteio do chefe), `buy_skill` (gasta chip), `buy_item` (gasta Z-Coin), `claim_mission`, `claim_pass`, e uma função só para o administrador creditar Z-Coin de compra pela InfinitePay com o identificador do pagamento.
- O modo de teste não mexe em nada disso.

## O que fica para a fase E

Anúncios, venda pela loja do Android (Google Play Billing), crédito automático pelo webhook da InfinitePay (feito na v29, ver `supabase/README.md`).
