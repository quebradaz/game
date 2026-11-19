// Grava a duração no cabeçalho de um .webm feito pelo MediaRecorder (que sai sem Duration, e aí o player
// não mostra o tempo total nem deixa pular direito). Lê o tempo do último bloco e insere o campo Duration no
// Segment Info. Uso: node tools/video/fix-duration.js arquivo.webm [outro.webm ...]
const fs = require("fs");

function vint(b, i) {
  const f = b[i];
  let n = 1, m = 0x80;
  while (n <= 8 && !(f & m)) { n++; m >>= 1; }
  let v = f & (m - 1);
  for (let k = 1; k < n; k++) v = v * 256 + b[i + k];
  const unk = v === Math.pow(2, 7 * n) - 1;
  return { v, n, unk };
}
function idAt(b, i) {
  const f = b[i];
  let n = 1, m = 0x80;
  while (n <= 4 && !(f & m)) { n++; m >>= 1; }
  let v = 0;
  for (let k = 0; k < n; k++) v = v * 256 + b[i + k];
  return { id: v, n };
}
function sizeBytes(v) {
  // tamanho em vint de 8 bytes (sempre cabe)
  const o = Buffer.alloc(8);
  let x = v;
  for (let k = 7; k >= 1; k--) { o[k] = x % 256; x = Math.floor(x / 256); }
  o[0] = 0x01;
  return o;
}
const SEG = 0x18538067, INFO = 0x1549a966, CLUSTER = 0x1f43b675, TC = 0xe7, SBLOCK = 0xa3, BGROUP = 0xa0, BLOCK = 0xa1, SCALE = 0x2ad7b1, DUR = 0x4489;

function fix(file) {
  const b = fs.readFileSync(file);
  let i = 0;
  const h = idAt(b, i); i += h.n; const hs = vint(b, i); i += hs.n + hs.v; // EBML header
  const s = idAt(b, i);
  if (s.id !== SEG) throw new Error("sem Segment");
  i += s.n; const ss = vint(b, i); i += ss.n;
  const segStart = i;
  let info = null, scale = 1e6, lastMs = 0, clusterTc = 0;
  // percorre o segmento; clusters de tamanho desconhecido são lidos por dentro
  const end = b.length;
  while (i < end) {
    const e = idAt(b, i); const sz = vint(b, i + e.n); const body = i + e.n + sz.n;
    if (e.id === INFO) {
      info = { at: i, body, size: sz.v, hdr: e.n + sz.n };
      let j = body;
      while (j < body + sz.v) {
        const c = idAt(b, j); const cs = vint(b, j + c.n); const cb = j + c.n + cs.n;
        if (c.id === SCALE) { let v = 0; for (let k = 0; k < cs.v; k++) v = v * 256 + b[cb + k]; scale = v; }
        if (c.id === DUR) return file + ": já tem duração";
        j = cb + cs.v;
      }
      i = body + sz.v;
    } else if (e.id === CLUSTER) {
      i = body; // entra no cluster
    } else if (e.id === TC) {
      let v = 0; for (let k = 0; k < sz.v; k++) v = v * 256 + b[body + k]; clusterTc = v; i = body + sz.v;
    } else if (e.id === SBLOCK || e.id === BLOCK) {
      const tn = vint(b, body); const rel = b.readInt16BE(body + tn.n);
      lastMs = Math.max(lastMs, (clusterTc + rel) * scale / 1e6);
      i = body + sz.v;
    } else if (e.id === BGROUP) {
      i = body;
    } else {
      if (sz.unk) break;
      i = body + sz.v;
    }
  }
  if (!info) throw new Error("sem Info");
  const durMs = lastMs + 33;
  const d = Buffer.alloc(11); d[0] = 0x44; d[1] = 0x89; d[2] = 0x88; d.writeDoubleBE(durMs * 1e6 / scale, 3);
  const newSize = info.size + d.length;
  const head = Buffer.concat([b.subarray(info.at, info.at + idAt(b, info.at).n), sizeBytes(newSize)]);
  const out = Buffer.concat([b.subarray(0, info.at), head, b.subarray(info.body, info.body + info.size), d, b.subarray(info.body + info.size)]);
  fs.writeFileSync(file, out);
  return file + ": " + (durMs / 1000).toFixed(1) + " s";
}
for (const f of process.argv.slice(2)) console.log(fix(f));
