// v28.7: lendário só sai do baú (0,5%) ou da loja Z-Coin. Atualiza a tabela de chances e a versão.
// Uso: node tools/patches/v28.7-lendarios.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};
rep('<span style="color:#ffc21a">Roupa lendária que você não tem</span><b>3%</b><span style="color:#ffc21a">25 Z-Coin</span><b>1%</b>',
  '<span style="color:#ffc21a">Roupa lendária que você não tem</span><b>0,5%</b><span style="color:#c86aff">25 Z-Coin</span><b>1%</b>');
rep('<span>200 a 600 moedas</span><b>37%</b>', '<span>200 a 600 moedas</span><b>39,5%</b>');
rep('Se você já tiver todas de uma raridade, vem o prêmio dela no lugar (moedas, chip ou Z-Coin).',
  'Roupa lendária só sai do baú ou da loja Z-Coin. Se você já tiver todas de uma raridade, vem o prêmio dela no lugar (moedas, chip ou Z-Coin).');
rep("QZ_VERSION='28.6'", "QZ_VERSION='28.7'");
rep("QZ_NOTE='Tela de carregamento, instalar como app, jogar offline, tutorial e zumbis descendo pela escada na Lapa'",
  "QZ_NOTE='Roupas lendárias agora só no baú (0,5%) ou na loja Z-Coin; o passe premium dá Z-Coin no lugar'");
fs.writeFileSync(F, s);
console.log('ok');
