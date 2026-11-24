# Proteção legal do Quebrada Z (v29.9)

**Rascunho escrito por IA, não é parecer jurídico.** Antes de publicar, um advogado (consumidor + LGPD + ECA Digital)
deve revisar `termos.html` e `privacidade.html`. A lista abaixo é o que ele e o dono precisam fechar.

## O que existe

| Peça | Onde |
|---|---|
| Termos de Uso (conta, conduta, Z-Coin, devolução 7 dias, limite de gasto, baús, passe, saúde, PI, foro) | `termos.html` |
| Política de Privacidade (LGPD: dados, bases legais, operadores, retenção, direitos, menores) | `privacidade.html` |
| Aceite no primeiro acesso e a cada versão nova (`TERMS.V` no jogo = `legal_cfg.terms_version` no banco) | `tools/patches/v29.9-termos.js` |
| Registro do aceite no servidor, com hora do servidor | `terms_accept` em `supabase/migrations/v29_9_termos.sql` |
| Baú de sorteio pago só para 18+ (ECA Digital) | gatilho `chest_minor_guard` (desligável em `legal_cfg.chest_minor_block`) |
| Conta excluída pelo jogador some do CRM (nome, e-mail, notas) | gatilho `crm_lead_forget` |
| Licença "todos os direitos reservados" | `LICENSE` |

Testes: `sh tests/integration/termos/run.sh` (SQL) e `node tools/qa/termos.js <saida>` (jogo).

## Para mudar os termos depois

1. Editar `termos.html` / `privacidade.html` e a data da versão no topo (e em "Versões anteriores").
2. Trocar `TERMS.V` no jogo **e** `update public.legal_cfg set terms_version = 'AAAA-MM-DD';` no banco, juntos.
   Todo mundo vê "TERMOS ATUALIZADOS" e aceita de novo.

## Pendências do dono

- [ ] Razão social, CNPJ e endereço da Amplitude Lab (obrigatórios pelo Decreto 7.962/2013 em quem vende online). Estão como `[CNPJ]` etc. nas duas páginas.
- [ ] Nome do encarregado de dados (DPO). Pode ser o próprio dono em empresa pequena.
- [ ] Emitir nota fiscal das vendas de Z-Coin (a InfinitePay não emite por você).
- [ ] Classificação indicativa: jogos distribuídos no Brasil precisam de autoclassificação no ClassInd (Ministério da Justiça). Violência + sangue costuma dar 14 ou 16 anos.
- [ ] Registrar a marca "Quebrada Z" no INPI.
- [ ] Promessas de prazo que entraram no texto e precisam ser cumpridas: devolução analisada em até 5 dias úteis; atendimento em até 5 dias úteis; pedidos LGPD em até 15 dias; aviso de 30 dias antes de encerrar o jogo; feedback guardado até 2 anos.

## Riscos que o texto não resolve sozinho

1. **ECA Digital (Lei 15.211/2025)** pede verificação de idade "confiável"; hoje a idade é autodeclarada (um botão). Um advogado deve dizer se basta.
   A trava do baú de sorteio para menor reduz o maior risco, mas um adulto que mente a idade passa.
2. **Registros de compra somem quando a conta é excluída** (`zc_orders.user_id ... on delete cascade`). A lei fiscal pede guardar por até 5 anos
   e isso também protege contra chargeback. Sugestão: trocar para `on delete set null` (exige tirar o `not null`) numa migração própria.
   Se mudar, atualizar a seção 5 da Política (hoje ela diz que só fica um resumo sem nome e sem e-mail).
3. **Devolução parcial**: o servidor só devolve se a Z-Coin da compra estiver inteira na carteira. A versão antiga dos termos prometia devolver
   a parte que sobrou. O advogado deve avaliar se o art. 49 do CDC exige mais.
4. **Encerramento do jogo**: o texto promete aviso de 30 dias e explicar como pedir o valor da Z-Coin não usada, sem fixar a regra.
