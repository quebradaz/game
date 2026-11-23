import { open } from "./lib.mjs";
import fs from "node:fs";
const { browser, page } = await open({});
const arts = await page.evaluate(() => ({ logo: ART.logo, dia: ART.dia, tarde: ART.tarde, noite: ART.noite, camp: CAMPAIGNS[0].art }));
fs.mkdirSync("out/art", { recursive: true });
for (const [k, v] of Object.entries(arts)) { if (!v) continue; const m = /^data:image\/(\w+);base64,(.*)$/.exec(v); fs.writeFileSync(`out/art/${k}.${m[1]}`, Buffer.from(m[2], "base64")); console.log(k, m[1]); }
await browser.close();
