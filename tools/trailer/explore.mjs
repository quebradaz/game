import { open } from "./lib.mjs";
const { browser, page } = await open({ dsf: 1, save: { level: 18, xp: 500, matches: 40 } });
await page.screenshot({ path: "out/ui-0-menu.png" });
const btns = await page.evaluate(() => [...document.querySelectorAll("button")].filter(b => b.offsetParent).map(b => b.id + ":" + b.textContent.trim().slice(0, 20)));
console.log(btns.join(" | "));
for (const id of ["bEco", "bChar", "bFriends", "bRank", "bLab", "bPlay"]) {
  await page.evaluate((id) => { const b = document.getElementById(id); b && b.click(); }, id);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `out/ui-${id}.png` });
  const vis = await page.evaluate(() => [...document.querySelectorAll("button")].filter(b => b.offsetParent).map(b => b.id + ":" + b.textContent.trim().slice(0, 16)).slice(0, 30));
  console.log(id, "->", vis.join(" | "));
  await page.keyboard.press("Escape"); await page.waitForTimeout(400);
  await page.evaluate(() => { try { toMenu(); } catch (e) {} for (const id of ["bEcoBack","bFriendsBack","bRankBack","bBackC"]) { const b = document.getElementById(id); if (b && b.offsetParent) b.click(); } });
  await page.waitForTimeout(600);
}
await browser.close();
