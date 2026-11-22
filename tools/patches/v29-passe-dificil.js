// v29: passe mais difícil de subir (par com supabase/migrations/v29_passe_dificil.sql).
// Nível com custo crescente (xp_per + xp_step × (n-1)), barra e "falta X XP" seguem a curva,
// a tela mostra o ritmo do dia (XP de partida inteiro até o limite, metade depois) e o fim de partida avisa
// quando a partida caiu na metade. Sem xp_step (servidor antigo) tudo continua como antes.
// Uso: node tools/patches/v29-passe-dificil.js index.html
const fs = require('fs');
const F = process.argv[2];
let s = fs.readFileSync(F, 'utf8');
const rep = (a, b) => {
  const c = s.split(a).length - 1;
  if (c !== 1) throw new Error('count ' + c + ' ' + a.slice(0, 80));
  s = s.split(a).join(b);
};

// 1. curva do passe no cliente (mesma conta de public.pass_xp_for)
rep(`  passState(P, lv, l, t) {`, `  nf(n) { return Math.round(n).toLocaleString("pt-BR"); },
  // v29: XP total para chegar ao nível l, e nível/progresso atuais
  passAt(P, l) {
    l = Math.max(0, l);
    return P.xp_per * l + (P.xp_step || 0) * l * (l - 1) / 2;
  },
  passLv(P) {
    let lv = 0;
    while (lv < P.levels && this.passAt(P, lv + 1) <= P.xp) lv++;
    const base = this.passAt(P, lv), need = lv >= P.levels ? 0 : this.passAt(P, lv + 1) - base;
    return { lv, inLv: P.xp - base, need };
  },
  passState(P, lv, l, t) {`);
rep(`const lv = Math.min(P.levels, Math.floor(P.xp / P.xp_per)), inLv = P.xp % P.xp_per, ends`,
  `const PL = this.passLv(P), lv = PL.lv, inLv = PL.inLv, need = PL.need, ends`);
rep(`inLv + " / " + P.xp_per + " XP") + " · termina em "`, `this.nf(inLv) + " / " + this.nf(need) + " XP") + " · termina em "`);
rep(`(max ? 100 : inLv / P.xp_per * 100) + '%"></i></div></div>'`,
  `(max ? 100 : inLv / need * 100) + '%"></i></div>' + this.passDay(P) + "</div>"`);
rep(`(l === lv + 1 ? inLv / P.xp_per * 100 : 0)`, `(l === lv + 1 ? inLv / need * 100 : 0)`);
rep(`"Falta " + Math.max(0, l * P.xp_per - P.xp) + " XP para o nível " + l + "."`,
  `"Falta " + this.nf(Math.max(0, this.passAt(P, l) - P.xp)) + " XP para o nível " + l + "."`);

// 2. ritmo do dia e regra escrita na tela
rep(`  passState(P, lv, l, t) {`, `  passDay(P) {
    if (!P.day_full) return "";
    const d = Math.min(P.day_xp || 0, P.day_full), full = d >= P.day_full;
    return '<div class="bpDay' + (full ? " full" : "") + '"><span>Hoje: ' + this.nf(d) + " / " + this.nf(P.day_full) + " XP de partida" + (full ? " · agora conta metade, volta amanhã" : "") + '</span><div class="ecPb"><i style="width:' + d / P.day_full * 100 + '%"></i></div></div>';
  },
  passState(P, lv, l, t) {`);
rep(`'<p class="ecNote">XP de passe por partida: onda × 20 + abates + 200 por chefe. Missões dão mais. Toque num prêmio para ver.</p>'`,
  `'<p class="ecNote">' + (P.match ? "Partida: onda × " + P.match.wave + " + abates ÷ " + P.match.kill_div + " + " + P.match.boss + " por chefe · " + this.nf(P.day_full) + " XP por dia inteiros, depois metade · missões dão mais." : "XP de passe por partida: onda × 20 + abates + 200 por chefe. Missões dão mais. Toque num prêmio para ver.") + "</p>"`);
rep(`.bpCol.on .bpN{color:#fff}`, `.bpDay{margin-top:5px;font-size:11px;color:var(--mute)}.bpDay .ecPb{height:4px;margin-top:2px}.bpDay .ecPb i{background:#4ad0ff}.bpDay.full span{color:#ffb84a}.bpDay.full .ecPb i{background:#ffb84a}
.bpCol.on .bpN{color:#fff}`);

// 3. fim de partida: avisa quando a partida passou do limite do dia
rep(`"+" + r.pass_xp + " XP de passe" + (r.box`, `"+" + r.pass_xp + " XP de passe" + (r.pass_base > r.pass_xp ? " (limite do dia: metade)" : "") + (r.box`);

fs.writeFileSync(F, s);
console.log('ok v29-passe-dificil');
