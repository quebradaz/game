# Quebrada Z — Revisão e checklist de lançamento

Estado em 19/11/2026, versão 28.3 no ar em https://quebradaz.github.io/game/.

Legenda: **[BLOQUEIA]** precisa estar resolvido antes de divulgar · **[IMPORTANTE]** resolver nas primeiras semanas · **[DEPOIS]** pode esperar.

## Resumo

O jogo está jogável no navegador (PC, iPhone e Android), com conta Google, save na nuvem, ranking, passe, missões e loja. O que falta para divulgar com segurança está mais em **estrutura** (hospedagem que aguente gente, backup, servidor que não dorme), **formalidade** (empresa, impostos, lei das caixas) e **acabamento no celular** do que em conteúdo.

Os cinco itens que mais travam o lançamento:

1. O Supabase grátis **pausa o projeto depois de 7 dias sem uso** e não tem backup: um fim de semana parado e ninguém entra.
2. O login aceita **e-mail e senha** além do Google: dá para criar conta sem Google, contra a regra do jogo.
3. O GitHub Pages aguenta cerca de **12 mil primeiras visitas por mês** (limite de 100 GB; cada visita nova baixa uns 8 MB).
4. **Nunca foi testado em celular real** (desempenho, toque, áudio, login no Safari do iPhone).
5. **Vender Z-Coin** exige definir a parte fiscal (MEI ou CNPJ, nota) e, na Play Store, a cobrança da Google.

## 1. Servidor e dados (Supabase)

- [ ] **[BLOQUEIA]** Passar o projeto `quebrada-z-br` para o plano Pro (US$ 25/mês): não pausa, tem backup diário de 7 dias e mais limites. Sem isso, o projeto dorme depois de 7 dias parado.
- [ ] **[BLOQUEIA]** Desligar o login por e-mail em Authentication › Sign In / Providers › Email (deixar só Google).
- [ ] **[IMPORTANTE]** Apagar o projeto antigo `quebrada-z` (EUA, pausado) quando tiver certeza de que não precisa dele.
- [ ] **[IMPORTANTE]** Domínio próprio no Supabase (complemento pago): a tela do Google passa a mostrar "Quebrada Z" em vez de `wjjuuqvdttjuzsgqueuj.supabase.co`, o que passa mais confiança.
- [ ] **[IMPORTANTE]** Painel de acompanhamento: quantas contas por dia, partidas, erros de partida recusada (tabela `runs`, coluna `reason`).
- [ ] **[DEPOIS]** Alertas de uso perto do limite (Supabase avisa por e-mail no Pro).
- [x] Cada jogador só lê os próprios dados (RLS conferido); estatística, ranking, chip e Z-Coin só mudam por função do servidor.
- [x] Livro de transações de chip e Z-Coin, e crédito manual de compra sem duplicar pagamento.
- [x] Ranking por mapa aberto para leitura (só nome e números), usado pelo site.

## 2. Hospedagem do jogo

- [ ] **[BLOQUEIA]** Colocar um CDN na frente (Cloudflare grátis com domínio próprio) ou migrar para Cloudflare Pages. O GitHub Pages tem limite de 100 GB/mês e cache de só 10 minutos.
- [ ] **[IMPORTANTE]** Domínio próprio (ex.: `quebradaz.com.br`, cerca de R$ 40/ano). Também resolve o endereço longo nos anúncios e vídeos.
- [ ] **[IMPORTANTE]** Avisar antes de trocar de endereço: o save fica no endereço do site; quem tem conta não perde nada (está na nuvem), quem joga offline perde.
- [ ] **[DEPOIS]** Separar sprites e sons do `index.html` (hoje 5,5 MB, 3,4 MB comprimido) para o celular carregar mais rápido e guardar em cache.

## 3. Celular e instalação

- [ ] **[BLOQUEIA]** Testar em pelo menos um Android barato e um iPhone: FPS em onda cheia, toque, áudio, login Google no Safari, rotação.
- [ ] **[IMPORTANTE]** Manifesto de app (PWA) e ícones: no iPhone e no Android, "Adicionar à tela de início" abre em tela cheia, com ícone e nome.
- [ ] **[IMPORTANTE]** Tela de carregamento com barra (o primeiro acesso baixa vários MB).
- [ ] **[DEPOIS]** Funcionar offline depois do primeiro acesso (service worker).

## 4. Play Store (fase E)

- [ ] **[BLOQUEIA para a loja]** Conta de desenvolvedor Google Play (US$ 25, uma vez).
- [ ] **[BLOQUEIA para a loja]** Empacotar o jogo como app (TWA recomendado: usa o Chrome do aparelho, o login Google funciona e o app atualiza junto com o site).
- [ ] **[BLOQUEIA para a loja]** Venda de Z-Coin pelo Google Play Billing dentro do app (link externo é proibido no app). Até lá, esconder a compra no app.
- [ ] **[BLOQUEIA para a loja]** Classificação indicativa (questionário IARC: violência e sangue tendem a dar 16 ou 18 anos), formulário de segurança de dados, política de privacidade no ar (pronta), link para excluir conta pela web (o site tem).
- [ ] **[BLOQUEIA para a loja]** Ícone 512 px, imagem de destaque 1024×500, de 4 a 8 capturas de tela, vídeo curto, textos da loja.
- [ ] **[IMPORTANTE]** Anúncios: AdMob no app e anúncio para jogos HTML5 do Google no site, só nos momentos combinados (entrar numa campanha, terminar mapa, voltar ao menu). Atualizar a política de privacidade antes de ligar.

## 5. Dinheiro, empresa e lei

- [ ] **[BLOQUEIA para vender]** Formalizar: MEI ou empresa para receber pela venda de Z-Coin e emitir nota. Conversar com um contador.
- [ ] **[BLOQUEIA para vender]** Link de checkout da InfinitePay para os pacotes (o jogo já tem os botões).
- [ ] **[BLOQUEIA para a loja]** Caixas grátis com sorteio: confirmar com um advogado se o ECA Digital (Lei 15.211/2025) as alcança. Se sim, trocar por prêmio fixo.
- [ ] **[IMPORTANTE]** Termos de Uso com regras de reembolso de Z-Coin (Código de Defesa do Consumidor: direito de arrependimento em compra online).
- [ ] **[IMPORTANTE]** E-mail de contato oficial do jogo (hoje é o `amplitudelabb@gmail.com`).
- [ ] **[IMPORTANTE]** O projeto do Google Cloud do login está na conta `amplitudelabb@gmail.com`; garantir que essa conta não se perca (é dela que depende o login de todos).
- [x] Política de Privacidade e Termos de Uso publicados.
- [x] Excluir a conta pelo jogo e pelo site.

## 6. Jogo

- [ ] **[IMPORTANTE]** Bugs conhecidos: zumbis do mezanino da Lapa pulam em vez de usar a escada; colisão das máquinas de perk barrando tiros (nunca reproduzido).
- [ ] **[IMPORTANTE]** Primeira partida guiada (tutorial curto) para quem chega pela divulgação.
- [ ] **[IMPORTANTE]** Equilíbrio da economia depois de uma semana de dados reais (chips por semana, quantos completam o passe).
- [ ] **[DEPOIS]** Skins de arma para as caixas; Capitão Caveira e rosto/roupa do personagem no traço novo; céu redesenhado.
- [x] Quatro fases do remake visual, cutscene de chefe, progressão por mapa, conta, ranking, passe, missões, caixas, loja.

## 7. Divulgação e comunidade

- [ ] **[BLOQUEIA]** Site oficial com como jogar em cada aparelho, novidades e conta (feito nesta entrega: https://quebradaz.github.io/).
- [ ] **[IMPORTANTE]** Perfis oficiais (Instagram, TikTok, YouTube) e um canal de comunidade (Discord ou grupo de WhatsApp) para suporte e bugs.
- [ ] **[IMPORTANTE]** Trailer de 30 a 60 s e cortes verticais para Reels/TikTok (há gravações curtas do jogo no site).
- [ ] **[IMPORTANTE]** Kit de imprensa: logo, capturas, descrição curta e longa, contato.
- [ ] **[DEPOIS]** Evento de lançamento (fim de semana com XP de passe em dobro).

## 8. Antes de cada atualização

- [ ] Subir `QZ_VERSION` e `QZ_NOTE`.
- [ ] Testar login, uma partida inteira e a tela PASSE no site publicado.
- [ ] Registrar a nota em `site/novidades` (o site lê a lista de versões).
- [ ] Nunca citar o modo de teste em notas, PRs ou no site.
