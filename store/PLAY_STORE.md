# Quebrada Z — Ficha da Play Store e app Android

Tudo que a loja pede, pronto para colar. Imagens nesta pasta (`store/`).

## Imagens

| Pedido da loja | Arquivo |
|---|---|
| Ícone 512 × 512 | `icone-512.png` |
| Imagem de destaque 1024 × 500 | `destaque-1024x500.png` |
| Capturas de tela (16:9, 1920 × 1080) | `captura-*.png` (6 arquivos) |

## Textos

**Nome do app (até 30):** Quebrada Z

**Descrição curta (até 80):** Sobreviva às ondas de zumbis nas quebradas do Rio. De graça, no celular.

**Descrição completa:**

A quebrada virou ponto de zumbi. Segura a laje, prega tábua na janela e aguenta onda atrás de onda.

• 7 quebradas do Rio: favela, praça, Cristo, Copacabana, Lapa, baile e quadra
• Dia, tarde e noite de verdade, com chuva e tempestade de areia
• Chefes com cena própria: Capitão Caveira e o Observador
• 20 armas de fogo, armas brancas, perks, granadas e molotov
• Monte seu personagem com quase 200 roupas
• Passe de temporada, missões semanais e caixas grátis ao completar um mapa
• Ranking por quebrada com pódio
• Conta Google: o mesmo progresso no celular e no PC

Jogue com o celular deitado. Controles na tela com analógico duplo.

**Categoria:** Jogos › Ação
**Classificação esperada:** 16 anos (violência e sangue contra zumbis). Responder o questionário IARC com: violência fantasiosa intensa, sangue, sem linguagem imprópria, sem apostas com dinheiro.
**Contato:** o e-mail oficial do jogo.
**Política de privacidade:** https://quebradaz.github.io/game/privacidade.html
**Excluir conta pela web:** https://quebradaz.github.io/#conta

## Segurança dos dados (formulário da loja)

- Coleta: e-mail e nome (conta Google), foto da conta (opcional no ranking), estatísticas de jogo, feedback enviado.
- Finalidade: funcionamento do jogo, conta, ranking. Sem anúncios e sem venda de dados (até a fase de anúncios).
- Dados criptografados em trânsito: sim (HTTPS).
- O usuário pode pedir a exclusão: sim, no jogo e no site.

## App Android (TWA)

O app é o próprio site aberto em tela cheia pelo Chrome do aparelho (Trusted Web Activity). Atualiza junto com o site.
O jogo já tem o que o TWA exige: manifesto, ícones, service worker e HTTPS.

Passos (dependem da conta de desenvolvedor Google Play):

1. Instalar o Bubblewrap: `npm i -g @bubblewrap/cli`
2. Na pasta `store/twa/`: `bubblewrap init --manifest https://quebradaz.github.io/game/manifest.webmanifest`
   (o arquivo `twa-manifest.json` desta pasta já tem as respostas)
3. `bubblewrap build` gera o `.aab` e a chave de assinatura. **Guarde a chave e a senha**: sem elas não dá para atualizar o app.
4. `bubblewrap fingerprint` mostra o SHA-256 da chave. Ele vai em `https://quebradaz.github.io/.well-known/assetlinks.json`
   (repositório do site), para o Android abrir sem a barra do navegador.
5. Enviar o `.aab` no Play Console.

Antes de publicar na loja: esconder a compra de Z-Coin por link externo dentro do app (regra da Google) até ligar o Google Play Billing.
