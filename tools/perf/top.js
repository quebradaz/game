// Resume um .cpuprofile: tempo próprio e total por função (top N). Uso: node tools/perf/top.js perfil.cpuprofile [N]
const fs = require('fs');
const P = JSON.parse(fs.readFileSync(process.argv[2])), N = +process.argv[3] || 30;
const byId = new Map(P.nodes.map((n) => [n.id, n])), self = new Map(), dt = P.timeDeltas, cnt = new Map();
P.samples.forEach((id, i) => cnt.set(id, (cnt.get(id) || 0) + (dt[i] || 0)));
const parent = new Map(); for (const n of P.nodes) for (const c of n.children || []) parent.set(c, n.id);
const key = (n) => `${n.callFrame.functionName || '(anon)'}:${n.callFrame.lineNumber + 1}`;
const tot = new Map(); let all = 0;
for (const [id, t] of cnt) { all += t; const n = byId.get(id); const k = key(n); self.set(k, (self.get(k) || 0) + t);
  const seen = new Set(); let c = id; while (c != null) { const kk = key(byId.get(c)); if (!seen.has(kk)) { seen.add(kk); tot.set(kk, (tot.get(kk) || 0) + t); } c = parent.get(c); } }
const pr = (m, title) => { console.log('== ' + title); [...m].sort((a, b) => b[1] - a[1]).slice(0, N).forEach(([k, t]) => console.log((t / all * 100).toFixed(1).padStart(5) + '%  ' + k)); };
pr(self, 'proprio'); pr(tot, 'total');
