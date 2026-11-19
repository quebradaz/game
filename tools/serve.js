// Servidor local para testar o jogo: node tools/serve.js [pasta] [porta]. Sem cache, só leitura, só 127.0.0.1.
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..')), port = +process.argv[3] || 8377;
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mp3': 'audio/mpeg', '.png': 'image/png', '.webp': 'image/webp', '.json': 'application/json' };
http.createServer((q, r) => {
  let p = decodeURIComponent(q.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root)) { r.writeHead(403); return r.end(); }
  fs.readFile(f, (e, d) => {
    if (e) { r.writeHead(404); return r.end('404'); }
    r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    r.end(d);
  });
}).listen(port, '127.0.0.1', () => console.log('serving', root, port));
