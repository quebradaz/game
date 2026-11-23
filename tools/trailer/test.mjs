import { open, rec } from "./lib.mjs";
const { browser, page } = await open({});
page.on("console", (m) => console.log("[pg]", m.text()));
const maps = await page.evaluate(() => MAPS.map((m, i) => i + ":" + m.id));
console.log(maps.join(" "));
await page.evaluate(async () => { await QZV.go(3, 10, (p) => { p.maxHp = 500; giveWeapon("m249", "gold", 0); }); S.period = "noite"; try { FXV.set("storm"); } catch (e) {} });
await page.waitForTimeout(4000);
await rec(page, "teste", 6000);
await browser.close();
