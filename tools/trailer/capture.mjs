// Grava as cenas de jogo do trailer (partidas de verdade, o bot de tools/video/bot.js jogando).
// Uso: node tools/trailer/capture.mjs [cena ...]   saída: tools/trailer/out/<cena>.webm (1920x1080, com o som do jogo)
import { open, rec } from "./lib.mjs";
const ONLY = process.argv.slice(2);
// mapa: 0 adega, 1 lava, 2 quadra, 3 laje, 4 cristo, 5 copa, 6 lapa
const SHOTS = [
  // abertura: rua quase vazia, chuva, poucos zumbis chegando
  { id: "s01-rua", mi: 0, wave: 2, period: "noite", fx: "rain", ms: 9000, bot: false, wait: 2500 },
  { id: "s02-horda-adega", mi: 0, wave: 9, period: "noite", fx: "storm", gun: ["m249", "gold"], ms: 9000 },
  { id: "s03-lava", mi: 1, wave: 8, period: "tarde", gun: ["spas", "purple"], ms: 8000, opts: { preferShort: 1 } },
  { id: "s04-quadra", mi: 2, wave: 10, period: "dia", gun: ["scar", "gold"], ms: 8000 },
  { id: "s05-laje-diamante", mi: 3, wave: 12, period: "noite", fx: "rain", gun: ["m4", "diamond"], ms: 9000 },
  { id: "s06-capitao", mi: 4, wave: 7, period: "tarde", gun: ["aug", "gold"], ms: 15000, wait: 300 },
  { id: "s07-observador", mi: 6, wave: 14, period: "noite", fx: "storm", gun: ["m249", "diamond"], ms: 15000, wait: 300 },
  { id: "s08-copa-rpg", mi: 5, wave: 12, period: "dia", fx: "sand", gun: ["rocket", "gold"], gun2: ["m4", "gold"], ms: 9000, opts: { rocketMin: 2 } },
  { id: "s09-sniper", mi: 4, wave: 9, period: "noite", gun: ["barrett", "gold"], ms: 8000 },
  { id: "s10-lapa-hud", mi: 6, wave: 13, period: "noite", gun: ["scar", "diamond"], ms: 9000, hud: true },
  { id: "s11-duda", mi: 5, wave: 9, period: "tarde", gun: ["aug", "gold"], ms: 9000, duda: true },
  { id: "s12-duda-noite", mi: 3, wave: 11, period: "noite", fx: "storm", gun: ["spas", "gold"], ms: 9000, duda: true, opts: { preferShort: 1 } },
];
const DUDA = {
  look: { body: 1, skin: 3, eyes: 1, hairStyle: 9, hairColor: 0 },
  inv: ["zc_coroa_fogo", "zc_bomber_ouro", "zc_calca_camo_ouro", "zc_tenis_cromado", "zc_asas_fenix"],
  eq: { head: "zc_coroa_fogo", chest: "zc_bomber_ouro", legs: "zc_calca_camo_ouro", feet: "zc_tenis_cromado", acc1: "zc_asas_fenix", acc2: null, acc3: null, acc4: null },
};
const groups = [SHOTS.filter((s) => !s.duda), SHOTS.filter((s) => s.duda)];
for (const g of groups) {
  const list = g.filter((s) => !ONLY.length || ONLY.includes(s.id));
  if (!list.length) continue;
  const { browser, page } = await open({ save: list[0].duda ? DUDA : {} });
  page.on("console", (m) => { const t = m.text(); if (/^fps|^cena/.test(t)) console.log("   ", t); });
  if (list[0].duda) console.log("look", await page.evaluate(() => JSON.stringify(SAVE.d.look) + " " + JSON.stringify(SAVE.d.eq)));
  for (const s of list) {
    await page.evaluate(async (s) => {
      const Q = window.QZV;
      await Q.go(s.mi, s.wave, (p) => {
        p.maxHp = Math.max(p.maxHp, 500);
        if (s.gun) giveWeapon(s.gun[0], s.gun[1], 0);
        if (s.gun2) giveWeapon(s.gun2[0], s.gun2[1], 1);
      }, s.opts || { preferShort: 0 });
      try { S.period = s.period; } catch (e) {}
      try { FXV.set(s.fx); } catch (e) {}
      if (s.bot === false) Q.bot(false);
      $("hud").classList.add("hidden"); $("touch").classList.add("hidden");
      if (s.hud) $("hud").classList.remove("hidden");
      const t9 = performance.now();
      if (s.wait != null) { await Q.wait(s.wait); return; }
      while (performance.now() - t9 < 9000) {
        const n = S.zs.filter((z) => z.state === "in" && Math.abs(z.x - S.cam.x - VW / 2) < VW / 2).length;
        if (n >= 4 && performance.now() - t9 > 1500) break;
        await Q.wait(100);
      }
    }, s);
    await rec(page, s.id, s.ms, { hud: !!s.hud });
  }
  await browser.close();
}
