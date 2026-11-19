// site v28.6: vídeos gravados do jogo, bestiário animado e guia de sobrevivência; novidades da 28.6.
// Uso: node tools/patches/site-v28.6-midia.js site-repo/index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const r = (a, b) => { const n = s.split(a).length - 1; if (n !== 1) throw new Error('count ' + n + ' ' + a.slice(0, 60)); s = s.split(a).join(b); };

// [arquivo, quadros, tamanho do quadro, nome, ameaça 1-5, o que faz, como lidar]
const BEST = [
  ['ze', 16, 80, 'Zé', 1, 'O morador comum que virou zumbi. Lento, mas nunca vem sozinho.', 'Tiro na cabeça economiza bala.'],
  ['torcedor', 16, 80, 'Torcedor', 1, 'Não largou a camisa do time nem depois de morto. Anda em bando.', 'Junte vários na mesma linha e varra com a metralhadora.'],
  ['civil', 16, 80, 'Civil', 1, 'Um pouco mais rápido que o Zé.', 'Mesma receita: cabeça.'],
  ['corredor', 16, 80, 'Corredor', 2, 'O mais rápido da quebrada, com pouca vida.', 'Não deixe ele colar: atire assim que aparecer.'],
  ['rastejante', 16, 80, 'Rastejante', 2, 'Se arrasta pelo chão e passa por baixo da sua mira.', 'Mire baixo ou use faca.'],
  ['cao', 16, 80, 'Cão zumbi', 3, 'Baixo, rápido e dá o bote de longe.', 'Pule por cima do salto e atire na volta.'],
  ['selvagem', 20, 80, 'Selvagem', 3, 'Agachado e ligeiro, salta em cima de você.', 'Recue quando ele se preparar e atire no ar.'],
  ['pixador', 20, 80, 'Pixador', 3, 'Mesmo bote do Selvagem, de boné e lata na mão.', 'Mesma tática do Selvagem.'],
  ['vovo', 14, 80, 'Vovó', 2, 'Joga o chinelo de longe. Fraquinha, mas não erra.', 'Feche a distância ou derrube antes do arremesso.'],
  ['gari', 16, 80, 'Gari', 2, 'Arremessa lixo de longe.', 'Atire primeiro; ele para pra arremessar.'],
  ['cuspidor', 16, 80, 'Cuspidor', 3, 'Cospe ácido à distância e chia antes.', 'Ouviu o chiado, saia da frente.'],
  ['grita', 14, 80, 'Gritadeira', 4, 'O grito deixa os zumbis por perto mais fortes e rápidos.', 'Prioridade máxima: mate antes de ela gritar.'],
  ['pedreiro', 16, 80, 'Pedreiro', 3, 'O capacete de obra segura os primeiros tiros. Tem 35% mais vida.', 'Quebre o capacete e depois mire na cabeça.'],
  ['motoboy', 16, 80, 'Motoboy', 4, 'De capacete, para piscando e arranca em linha reta.', 'Quando ele piscar, pule ou saia da linha.'],
  ['choque', 16, 80, 'Choque', 4, 'Capacete, arrancada e quase o dobro de vida.', 'Mesma tática do Motoboy, com mais bala.'],
  ['mutante', 16, 92, 'Mutante', 4, 'Maior que os outros e recupera a vida se você der tempo.', 'Concentre o fogo até ele cair.'],
  ['botijao', 20, 80, 'Botijão', 5, 'Carrega um botijão nas costas e explode quando chega perto.', 'Mate de longe: a explosão leva os zumbis em volta.'],
  ['hazmat', 16, 80, 'Hazmat', 5, 'Traje químico que explode quando encosta.', 'Nunca deixe chegar perto.'],
  ['bruta', 16, 112, 'Bruta', 4, 'Enorme e lenta, com mais de 3 vezes a vida. Empurra forte.', 'Granada e tiro contínuo. Mantenha distância.'],
  ['brutao', 16, 100, 'Segurança', 5, 'O brutamontes do baile: muita vida e soco que derruba.', 'Molotov no caminho e recue atirando.'],
  ['bombeiro', 16, 80, 'Bombeiro', 4, 'Roupa grossa: mais de 2 vezes a vida e golpe pesado.', 'Arma forte e mira na cabeça.'],
  ['cap1', 8, 176, 'Capitão Caveira', 5, 'Chefe da onda 7, volta em fúria na onda 20. Atira, joga granada e chama reforço. Tem três fases: blindado, rachado e em fúria.', 'Use cobertura, guarde granada para quando ele chamar reforço e não pare de se mexer.'],
  ['observador', 16, 100, 'O Observador', 5, 'Chefe da onda 14. Gigante, com um olho vermelho que nunca perde você de vista.', 'Mantenha distância e gaste as perks antes de ele chegar.']
];
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const card = (b) => {
  const sc = b[2] > 120 ? 1.1 : 2, w = Math.round(b[2] * sc);
  return '<div class="card bz"><div class="bzSp" style="--w:' + w * b[1] + 'px;--n:' + b[1] + ';width:' + w + 'px;height:' + w + 'px;background-image:url(bestiario/' + b[0] + '.png);background-size:' + w * b[1] + 'px ' + w + 'px"></div>' +
    '<div><h3>' + esc(b[3]) + '</h3><div class="thr" title="Ameaça ' + b[4] + ' de 5">' + '<i class="on"></i>'.repeat(b[4]) + '<i></i>'.repeat(5 - b[4]) + '</div><p>' + esc(b[5]) + '</p><p class="tip"><b>Como lidar:</b> ' + esc(b[6]) + '</p></div></div>';
};

r('</style>', `.vids{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px}
.vid{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.vid video{width:100%;aspect-ratio:16/9;background:#000;image-rendering:pixelated;display:block}
.vid div{padding:10px 14px}.vid h3{font-family:"Pixelify Sans";margin:0;font-size:19px}.vid p{margin:2px 0 0;color:var(--mute);font-size:14px}
.best{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.bz{display:flex;gap:12px;align-items:center;padding:12px}
.bzSp{flex:0 0 auto;image-rendering:pixelated;background-repeat:no-repeat;animation:bzWalk 1.4s steps(var(--n)) infinite;filter:drop-shadow(0 4px 0 rgba(0,0,0,.4))}
@keyframes bzWalk{to{background-position-x:calc(var(--w) * -1)}}
.bz h3{margin:0;font-size:20px}.bz p{font-size:14px;margin:4px 0 0}.bz .tip{color:#cfc8dd}.bz .tip b{color:var(--gold)}
.thr{display:flex;gap:3px;margin-top:2px}.thr i{width:14px;height:6px;border-radius:2px;background:var(--line)}.thr i.on{background:var(--red)}
.guide{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.guide ul{margin:6px 0 0;padding-left:18px;color:#cfc8dd}.guide li{margin:4px 0}
@media (prefers-reduced-motion:reduce){.bzSp{animation:none}}
</style>`);

r(`  <p class="sub">Gravado direto do jogo. Trailer e cortes para as redes chegam em breve.</p>
  <div class="grid g2">
    <div class="video"><video src="video/gameplay.webm" controls muted loop playsinline preload="metadata" poster="img/favela-noite.webp"></video></div>`,
`  <p class="sub">Tudo gravado direto do jogo, sem edição.</p>
  <div class="vids" style="margin-bottom:16px">
    <div class="vid"><video src="video/ondas-17-lapa.webm" controls muted loop playsinline preload="metadata" poster="img/lapa-noite.webp"></video><div><h3>Onda 17 nos Arcos da Lapa</h3><p>A horda inteira em cima, de M60 dourada.</p></div></div>
    <div class="vid"><video src="video/onda-18-copacabana.webm" controls muted loop playsinline preload="metadata" poster="img/praia-dia.webp"></video><div><h3>Onda 18 em Copacabana</h3><p>Duas ondas do fim, com a M249.</p></div></div>
    <div class="vid"><video src="video/chefe-capitao.webm" controls muted loop playsinline preload="metadata" poster="img/cristo-tarde.webp"></video><div><h3>Chefe: Capitão Caveira</h3><p>A chegada e a luta no Cristo Redentor.</p></div></div>
    <div class="vid"><video src="video/guarda-roupa.webm" controls muted loop playsinline preload="metadata"></video><div><h3>Guarda-roupa</h3><p>Roupas comuns, raras e lendárias no seu personagem.</p></div></div>
    <div class="vid"><video src="video/bau-raridades.webm" controls muted loop playsinline preload="metadata"></video><div><h3>Baú de raridades</h3><p>Branco é comum, roxo é raro, dourado é lendário.</p></div></div>
    <div class="vid"><video src="video/gameplay.webm" controls muted loop playsinline preload="metadata" poster="img/favela-noite.webp"></video><div><h3>Uma noite na favela</h3><p>O começo de uma partida.</p></div></div>
  </div>
  <div class="grid g2">`);

r('<section id="ranking">', `<section id="bestiario"><div class="wrap">
  <h2>Bestiário</h2>
  <p class="sub">Todo zumbi que você vai encontrar na quebrada, do mais fraco aos chefes, e como derrubar cada um.</p>
  <div class="best">${BEST.map(card).join('\n')}</div>
</div></section>

<section id="guia"><div class="wrap">
  <h2>Como sobreviver</h2>
  <p class="sub">O que separa quem cai na onda 5 de quem fecha a 20.</p>
  <div class="guide">
    <div class="card"><h3>Primeiras ondas</h3><ul><li>Prenda tábua nas janelas entre uma onda e outra: cada tábua dá R$.</li><li>Use a faca nos zumbis das ondas 1 e 2: vale mais ponto e guarda bala.</li><li>Tiro na cabeça mata mais rápido e paga mais.</li></ul></div>
    <div class="card"><h3>Dinheiro</h3><ul><li>Compre a primeira arma da parede cedo; a pistola inicial não segura a onda 6.</li><li>Abra portas só quando precisar de espaço ou de uma perk nova.</li><li>Guarde para o Mercador: ele vende colete, seringa e kit de reviver.</li></ul></div>
    <div class="card"><h3>Posição</h3><ul><li>Lute num corredor com uma janela só, assim os zumbis chegam em fila.</li><li>Nunca fique entre duas janelas abertas.</li><li>Use a escada: quem sobe vem um de cada vez.</li></ul></div>
    <div class="card"><h3>Prioridades</h3><ul><li>Gritadeira primeiro: o grito deixa a horda mais forte.</li><li>Botijão e Hazmat de longe: a explosão limpa a fila inteira.</li><li>Motoboy piscou: saia da linha da arrancada.</li></ul></div>
    <div class="card"><h3>Chefes</h3><ul><li>Onda 7: Capitão Caveira. Guarde granada para quando ele chamar reforço.</li><li>Onda 14: o Observador. Chegar nela libera o próximo mapa.</li><li>Onda 20: o Capitão em fúria. Vencer dá uma caixa grátis.</li></ul></div>
    <div class="card"><h3>Ondas altas (15 a 20)</h3><ul><li>Metralhadora ou fuzil com perk de recarga rápida.</li><li>Colete sempre cheio e uma seringa guardada.</li><li>Use o Adiantar só quando estiver com tudo pronto.</li></ul></div>
    <div class="card"><h3>Jogo mais leve no celular</h3><ul><li>Ajustes › Qualidade: deixe em Automática ou Baixa se travar.</li><li>Ajustes › Tamanho da interface: Pequeno libera mais tela.</li><li>Instale como app: abre em tela cheia e carrega na hora.</li></ul></div>
    <div class="card"><h3>Progresso</h3><ul><li>Chefes podem soltar chip de tecnologia: ele compra habilidades.</li><li>Missões da semana dão XP do passe, moedas e Z-Coin.</li><li>Fique de olho nos eventos de XP em dobro.</li></ul></div>
  </div>
</div></section>

<section id="ranking">`);

r('<a href="#videos">Vídeos</a>', '<a href="#videos">Vídeos</a><a href="#bestiario">Bestiário</a><a href="#guia">Guia</a>');

r('["28.6", "Pronto pra instalar", [', '["28.6", "Pronto pra instalar", ["Botijão, capacetes e bobes dos zumbis agora presos no corpo, sem flutuar", "Capacete do zumbi some quando quebra", ');

fs.writeFileSync(F, s);
console.log('ok');
