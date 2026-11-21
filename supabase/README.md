# Supabase do Quebrada Z

Projeto `quebrada-z-br` (id `wjjuuqvdttjuzsgqueuj`, região `sa-east-1`, São Paulo). O projeto antigo `quebrada-z` (EUA) está pausado e não é usado.

## Banco (migração `v28_contas_ranking`, versão `20261119025338`)

A migração está no histórico do projeto. Para trazer o SQL para cá: `supabase db pull` com o projeto ligado, ou a consulta `select statements from supabase_migrations.schema_migrations where version = '20261119025338'`.

| Tabela | O que guarda | Quem lê | Quem escreve |
|---|---|---|---|
| `profiles` | nome único (`citext`, 3 a 16), trocas de nome | o próprio jogador | só `claim_name` |
| `progress` | o save do jogo (`qz_save`) em `data`, carimbo `ts` | o próprio jogador | o próprio jogador (colunas `data`, `ts`, `imported_local`, `updated_at`) |
| `player_stats` | totais do personagem | o próprio jogador | só `submit_run` |
| `map_stats` | totais e melhor resultado por mapa | o próprio jogador (ranking via função) | só `submit_run` |
| `runs` | cada partida (início no servidor, resultado, aceita ou não e por quê) | ninguém pelo cliente | `start_run`, `submit_run` |
| `name_blocklist` | termos proibidos em nome | ninguém pelo cliente | só pelo painel |

Funções chamadas pelo jogo (todas exigem login e usam `auth.uid()`):

- `claim_name(new_name)`: escolhe ou troca o nome. Escolher é livre; a primeira troca é livre; depois, uma a cada 30 dias. Erros: `NOME_INVALIDO`, `NOME_PROIBIDO`, `NOME_EM_USO`, `TROCA_EM_ESPERA`.
- `start_run(map)`: abre uma partida (a aberta anterior é encerrada como abandonada).
- `submit_run(run, wave, kills, seconds, shots, hits, bosses, won)`: confere se o resultado é plausível (tempo não maior que o real no servidor, onda não rápida demais, abates, tiros, chefes, vitória só na onda 20) e só então soma nas estatísticas e no ranking.
- `get_leaderboard(map, limit)`: ranking do mapa (melhor onda, desempate por abates e por menos tempo); devolve só nome e números, e a linha do próprio jogador mesmo fora do top.

Um gatilho em `auth.users` cria perfil, progresso e estatísticas no primeiro login.

O que isso protege: ninguém lê ou altera dado de outro jogador; estatística e ranking não aceitam escrita direta; partida mais rápida que o tempo real não conta. O que não protege: num jogo de navegador, quem mexe no código pode enviar resultados inventados dentro dos limites plausíveis.

## Edge Function `delete-account`

Fonte em `functions/delete-account/index.ts`. Apaga o usuário do Auth; perfil, progresso, estatísticas, partidas e ranking saem em cascata. Exige login (`verify_jwt`).

## Economia (migrações `v28_economia` e `v28_economia_import_seguro`)

Nenhuma tabela é lida ou escrita direto pelo jogo; tudo passa por funções (exigem login):

- `get_economy()`: carteira, habilidades, itens, loja, missões da semana, passe e caixas, numa chamada.
- `boss_drop(run, chefe)`: o servidor sorteia o chip (50%) e a Z-Coin (10%, 5 Z), um sorteio por chefe por partida, com tempo mínimo de partida.
- `buy_skill(skill)`, `buy_item(item)`, `buy_pass()`, `claim_pass(nivel, trilha)`, `claim_mission(slot)`, `open_box(id)`, `next_box()`.
- `import_skills()`: uma vez, traz as habilidades compradas com moedas antes da fase D (lê do save da conta; só contas criadas antes da mudança).
- `submit_run` (v2): além do ranking, soma XP do passe, avança missões e dá uma caixa a quem vence o mapa.

Tabelas: `wallets`, `ledger` (livro de toda entrada e saída de chip e Z-Coin), `boss_rolls`, `skill_costs`, `skill_levels`, `shop_items`, `items_owned`, `mission_pool`, `mission_week`, `mission_progress`, `seasons`, `pass_rewards`, `pass_progress`, `boxes`.

### Creditar Z-Coin de uma compra pela InfinitePay

No painel do Supabase, em SQL Editor:

```sql
select public.admin_credit_zcoin('NomeDoPersonagem', 330, 'infinitepay 12345');
```

O terceiro valor é o identificador do pagamento: o mesmo pagamento não é creditado duas vezes. Nenhum jogador consegue chamar essa função.

## Feedback dos jogadores (v28.5)

No SQL Editor:

```sql
select created_at, kind, body, ver, device from public.feedback order by id desc limit 50;
```

## Caixas (v28.5)

Lendário 4% (roupa 3%, 25 Z-Coin 1%), raro 14% (roupa 11%, chip 3%), comum 82% (roupa 45%, moedas 37%). Itens das caixas: `shop_items.kind = 'box'`, lista em `tools/patches/v28.5-itens.js`.

## Painel e eventos (v28.6)

Painel dos últimos 14 dias no SQL Editor:

```sql
select * from public.admin_stats(14);
```

Evento de XP do passe (ex.: fim de semana de lançamento com XP em dobro). O jogo mostra o aviso na tela PASSE enquanto durar:

```sql
insert into public.xp_events (name, starts_at, ends_at, mult)
values ('de lançamento', '2026-12-05 00:00-03', '2026-12-08 00:00-03', 2);
```

## Moedas, nível e XP no servidor (v28.8, migração `v28_8_moedas_nivel_servidor`)

Com conta, moedas comuns, nível e XP do personagem moram em `wallets` (`coins`, `char_level`, `char_xp`). O save do aparelho (`progress.data`) passa a ser só espelho desses três campos.

- `submit_run`: se a partida for aceita, paga moedas (onda × 6 + abates × 0,4, vitória +400) e XP (onda × 45 + abates × 2, vitória +250) e sobe o nível. Partida recusada não paga nada.
- `claim_mission` e `grant_prize` (passe e caixa) creditam as moedas no servidor.
- `buy_look(item)` e `buy_kit(kit)`: loja do menu. Preços em `coin_prices` e `coin_kits`, gerados do jogo por `tools/patches/v28.8-precos-sql.js`. Erros: `MOEDAS_INSUFICIENTES`, `JA_TEM`, `ITEM_INVALIDO`.
- `import_meta()`: uma vez por conta, traz moedas, nível, XP e roupas de moeda do save antigo, com teto por partida aceita (`meta_config`). Contas novas já nascem importadas.
- Toda moeda entra no `ledger` com `currency = 'coin'`. Os valores ficam em `meta_config` (uma linha).
- Curva de nível (migração `v28_8b_curva_nivel`): `lvl_need(n) = 300 + 90(n-1) + 5(n-1)²`, teto no nível 50, igual à nova curva do jogo. Com `meta_config.level_quad` nulo, volta para a curva antiga `300 × 1,22^(n-1)`.
- Moedas de nível (migração `v28_8c_moedas_de_nivel`): `level_rewards` com as moedas de `CONFIG.meta.road` (PR #16); `char_xp_add` paga uma vez por nível (`wallets.lv_paid`) e lança no `ledger` como `nivel N`.

Sem conta ou no modo de teste, o jogo continua somando só no aparelho.
