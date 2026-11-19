// Quebrada Z — build de publicação: minifica e embaralha os scripts do index.html (nomes locais trocados,
// comentários e espaços removidos). O jogo fica igual; o código fica difícil de ler e de reaproveitar.
// Uso: node tools/build/build.js index.html dist/index.html
// Os arquivos de apoio (sw.js, manifesto, ícones, áudio, privacidade, termos) são copiados para a mesma pasta.
const fs = require('fs'), path = require('path');
const { minify } = require('terser');
const [src, out] = process.argv.slice(2);
if (!src || !out) throw new Error('uso: build.js entrada.html saida.html');
(async () => {
  let s = fs.readFileSync(src, 'utf8');
  const parts = [], re = /<script>([\s\S]*?)<\/script>/g;
  let m, last = 0, n = 0;
  while ((m = re.exec(s))) {
    parts.push(s.slice(last, m.index));
    const r = await minify(m[1], {
      ecma: 2015, compress: { passes: 2, keep_fargs: true }, mangle: true, toplevel: false,
      format: { comments: false, ascii_only: false }
    });
    if (r.code == null) throw new Error('script ' + n);
    parts.push('<script>' + r.code + '</script>');
    last = m.index + m[0].length;
    n++;
  }
  parts.push(s.slice(last));
  s = parts.join('').replace(/<!--[\s\S]*?-->/g, '');
  s = '<!-- Quebrada Z. Todos os direitos reservados. Copia e redistribuicao proibidas. -->\n' + s;
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, s);
  const dir = path.dirname(src), od = path.dirname(out);
  for (const f of ['sw.js', 'manifest.webmanifest', 'privacidade.html', 'termos.html', 'LICENSE']) if (fs.existsSync(path.join(dir, f))) fs.copyFileSync(path.join(dir, f), path.join(od, f));
  for (const d of ['icons', 'audio']) if (fs.existsSync(path.join(dir, d))) fs.cpSync(path.join(dir, d), path.join(od, d), { recursive: true });
  console.log('ok', n, 'scripts', (fs.statSync(src).size / 1e6).toFixed(2) + ' MB ->', (fs.statSync(out).size / 1e6).toFixed(2) + ' MB');
})().catch((e) => { console.error(e); process.exit(1); });
