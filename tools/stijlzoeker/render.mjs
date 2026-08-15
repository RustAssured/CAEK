/* CAEK — renderbank voor de stijlzoeker.
 *
 * Leest een JSON met kandidaat-stijlen, opent het verflab één keer, en rendert
 * elke kandidaat op elk gevraagd standpunt. Eén browser voor alles: opstarten
 * en het model laden kost meer tijd dan honderd renders.
 *
 * Gebruik:
 *   node tools/stijlzoeker/render.mjs kandidaten.json uitmap [uitsnedes] [breedte] [hoogte]
 *
 * kandidaten.json:  [{ "id": "k000", "stijl": { ... } }, ...]
 * Uitvoer:          uitmap/k000__totaal.png, uitmap/k000__karakter.png, ...
 */

import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const [, , kandidatenPad, uitMap, uitsnedenArg, breedteArg, hoogteArg] = process.argv;
if (!kandidatenPad || !uitMap) {
  console.error('gebruik: render.mjs kandidaten.json uitmap [uitsnedes] [breedte] [hoogte]');
  process.exit(1);
}

const UITSNEDES = (uitsnedenArg || 'totaal,karakter,lucht').split(',');
const BREEDTE = Number(breedteArg || 800);
const HOOGTE = Number(hoogteArg || 450);
const URL = process.env.CAEK_URL || 'http://127.0.0.1:8712/lab.html';
const CHROME = process.env.CAEK_CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const kandidaten = JSON.parse(fs.readFileSync(kandidatenPad, 'utf8'));
fs.mkdirSync(uitMap, { recursive: true });

const browser = await chromium.launch({
  executablePath: CHROME,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: BREEDTE, height: HOOGTE } });
page.setDefaultTimeout(180000);

const fouten = [];
page.on('pageerror', (e) => fouten.push(e.message));

await page.goto(URL, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => !!window.LAB?.pasStijlToe, { timeout: 180000 });
// paneel weg: het mag niet in de meting terechtkomen
await page.evaluate(() => { document.querySelector('#paneel').style.display = 'none'; });
await page.waitForTimeout(1500);

const begin = Date.now();
let gedaan = 0;

for (const kandidaat of kandidaten) {
  await page.evaluate((stijl) => window.LAB.pasStijlToe(stijl), kandidaat.stijl);

  for (const uitsnede of UITSNEDES) {
    await page.evaluate((u) => {
      window.LAB.zetCamera(u);
      // twee keer renderen: de eerste vult de tussenbuffers waar de streken
      // hun kleur uit halen, de tweede is het beeld dat klopt
      window.LAB.renderNu();
      window.LAB.renderNu();
    }, uitsnede);
    await page.screenshot({ path: path.join(uitMap, `${kandidaat.id}__${uitsnede}.png`) });
    gedaan++;
  }

  const perRender = (Date.now() - begin) / gedaan / 1000;
  process.stdout.write(`${kandidaat.id} klaar (${gedaan} renders, ${perRender.toFixed(1)}s per stuk)\n`);
}

if (fouten.length) console.error('paginafouten:', [...new Set(fouten)].join('\n'));
await browser.close();
console.log(`klaar: ${gedaan} renders in ${((Date.now() - begin) / 1000).toFixed(0)}s`);
