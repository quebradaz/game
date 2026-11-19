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
