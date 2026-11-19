# Quebrada Z — mudanças 28.4 a 28.6

Nada disto está no ar ainda. O jogo publicado é a 28.3. Tudo entra no ar quando você disser "Publique".

| Versão | Onde está |
|---|---|
| 28.4 | PR 10 de quebradaz/game |
| 28.5 | PR 11 de quebradaz/game (já inclui a 28.4) |
| 28.6 | PR 12 de quebradaz/game (vai depois do 11) |
| Site | 4 commits locais em `site-repo`, ainda não enviados |

O servidor (Supabase) já está atualizado e funciona com a versão publicada.

## Patch notes para o site (já estão na seção Novidades)

### 28.6 · Pronto pra instalar
- Botijão, capacetes e bobes dos zumbis agora presos no corpo, sem flutuar.
- Capacete do zumbi some quando quebra.
- Instale o jogo como app:
  - no Android, Chrome › Instalar app;
  - no iOS, Safari › Compartilhar › Adicionar à Tela de Início.
- Depois da primeira vez, o jogo abre na hora, até sem internet.
- Tela de carregamento com barra.
- Dicas na primeira partida.
- Zumbis do andar de cima descem pela escada.
- Eventos de XP em dobro no passe.

### 28.5 · Baú, roupas novas e pódio
- Baú animado nas caixas:
  - luz branca no comum;
  - roxa no raro;
  - dourada no lendário.
- 120 roupas novas nas caixas: 40 comuns, 40 raras e 40 lendárias.
- Temporada 1:
  - 5 lendárias e 2 raras no passe;
  - 5 lendárias e 2 raras na loja Z-Coin.
- Ranking com pódio, foto da conta e rolagem lateral entre as quebradas.
- Botão de feedback na tela inicial.
- Boné e chapéu deixam o cabelo curto por baixo, sem vazar.
- O boné dos zumbis acompanha a cabeça.
- Zumbi descendo a escada não fica mais cortado pela sombra.

### 28.4 · Interface no celular
- Tela inicial cabe no celular deitado.
- Textos dos menus maiores.
- Ajustes › Tamanho da interface: pequeno, médio ou grande.

## Tudo que mudou

### Jogo
- **Celular:** a tela inicial cabe com o celular deitado, os textos ficaram maiores e Ajustes ganhou três tamanhos de interface.
- **Caixas:**
  - baú que treme, abre e solta feixes de luz da cor da raridade;
  - chances: lendário 4%, raro 14%, comum 82%, mostradas na tela antes de abrir.
- **Roupas:**
  - 120 novas nas caixas;
  - 4 lendárias novas da temporada: Moletom da Quebrada (passe), Boné de diamante, Tênis de ouro e Mochila do dragão (loja).
- **Bonés e chapéus:** o cabelo vira curto por baixo da aba.
- **Acessórios dos zumbis:** boné, capacete de obra, capacete de moto, bobes e botijão agora são desenhados no corpo e acompanham cada passo. O capacete some quando quebra.
- **Escada:**
  - a sombra não corta mais o zumbi que desce;
  - os zumbis do andar de cima descem pela escada em vez de atravessar o piso.
- **Ranking no jogo:** pódio com foto, lista do 4º lugar em diante e deslizar para o lado para trocar de mapa.
- **Feedback:** botão na tela inicial, com tipo bug, ideia, elogio ou outro. Funciona sem conta.
- **Primeira partida:** 5 dicas que aparecem na hora certa e não voltam depois de vistas.
- **Carregamento:** tela com barra enquanto o jogo baixa.
- **App:**
  - instalável, com ícone, nome e tela cheia;
  - funciona offline depois da primeira visita;
  - quem volta ao jogo não baixa tudo de novo.
- **Passe:** mostra o aviso quando houver evento de XP.

### Proteção contra cópia e segurança
- **Trava de domínio:** o jogo só roda em quebradaz.github.io, num domínio quebradaz.com ou quebradaz.com.br, e no seu computador para testes. Em qualquer outro endereço, ou aberto como arquivo, ele mostra o link oficial e o código do jogo nem é lido.
- **Direitos:** `LICENSE` com todos os direitos reservados, os termos atualizados e o aviso no rodapé do site.
- **Código embaralhado:** o comando `node tools/build/build.js index.html dist/index.html` gera a versão minificada. Ela foi testada com uma partida inteira.
- **Servidor:** conferi o Supabase de novo. Cada jogador só lê os próprios dados, e as funções administrativas estão fechadas ao público.

### Servidor
- Feedback.
- Foto no ranking (o jogador pode desligar em Minha conta).
- Novo sorteio da caixa.
- Itens da temporada.
- Eventos de XP (tabela `xp_events`).
- Painel de acompanhamento: `select * from admin_stats(14)` no SQL Editor.

### Site
- iOS no lugar de iPhone.
- Ranking com carrossel por quebrada, pódio e foto.
- Opção de foto em Minha conta.
- Kit de imprensa em `imprensa.html`.
- **Vídeos gravados do jogo:**
  - onda 17 na Lapa;
  - onda 18 em Copacabana;
  - Capitão Caveira;
  - guarda-roupa;
  - baú de raridades.
- **Bestiário:** 23 zumbis e chefes animados, com nível de ameaça e como lidar com cada um.
- **Guia "Como sobreviver":** 8 blocos de dicas.

### Lançamento (`docs/LANCAMENTO.md` atualizado)
- Ficha da Play Store, imagens e app Android (TWA) preparados em `store/`.
- Termos com reembolso de Z-Coin (direito de arrependimento de 7 dias).

## Para o próximo update (depende de você)
- **Esconder o código de vez:** mover o código para um repositório privado e publicar só a versão minificada. Hoje o repositório `game` é público, então quem souber procurar ainda vê o código-fonte.
- **Contas e serviços pagos:**
  - Supabase Pro;
  - domínio e Cloudflare;
  - conta Google Play;
  - link da InfinitePay;
  - e-mail oficial;
  - redes sociais.
- **Empresa e lei:** MEI ou CNPJ, e advogado para as caixas.
- **Teste:** um iPhone e um Android barato.
- **Precisam do seu sim:**
  - desligar o login por e-mail;
  - apagar o projeto antigo do Supabase;
  - a data do evento de lançamento.

## Não testado
- Zumbis do mezanino da Lapa descendo pela escada: o código foi corrigido, mas não vi a cena na Lapa.
- Instalação como app e modo offline no celular de verdade: só testei no navegador do PC.
